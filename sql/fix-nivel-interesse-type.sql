-- ================================================
-- FIX NIVEL_INTERESSE TYPE ISSUE IN LEADS TABLE
-- ================================================
-- Corrige o tipo da coluna nivel_interesse para aceitar tanto text quanto integer
-- ================================================

-- Primeiro, vamos ver o estado atual da coluna
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'leads' AND column_name = 'nivel_interesse';

-- Alterar o tipo para TEXT para aceitar qualquer valor
ALTER TABLE leads 
ALTER COLUMN nivel_interesse TYPE TEXT;

-- Criar função para converter valores de texto para número
CREATE OR REPLACE FUNCTION normalize_nivel_interesse(input_value ANYELEMENT)
RETURNS INTEGER AS $$
BEGIN
  -- Se já é um número, retornar como está
  IF input_value IS NULL THEN
    RETURN 2; -- Default: medio
  END IF;
  
  -- Se é um texto, converter
  IF input_value::text IN ('alto', 'high', '3') THEN
    RETURN 3;
  ELSIF input_value::text IN ('medio', 'medium', '2') THEN
    RETURN 2;
  ELSIF input_value::text IN ('baixo', 'low', '1') THEN
    RETURN 1;
  ELSE
    -- Tentar converter diretamente para número
    BEGIN
      RETURN input_value::INTEGER;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN 2; -- Default: medio
    END;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Atualizar registros existentes para usar valores numéricos
UPDATE leads 
SET nivel_interesse = CASE 
  WHEN nivel_interesse IN ('alto', 'high') THEN '3'
  WHEN nivel_interesse IN ('baixo', 'low') THEN '1'
  ELSE '2'
END
WHERE nivel_interesse IS NOT NULL;

-- Verificar o estado após as mudanças
SELECT 
  nivel_interesse,
  COUNT(*) as quantidade
FROM leads 
WHERE nivel_interesse IS NOT NULL
GROUP BY nivel_interesse
ORDER BY nivel_interesse;

-- Teste da função de normalização
SELECT 
  normalize_nivel_interesse('alto') as texto_alto,
  normalize_nivel_interesse('medio') as texto_medio,
  normalize_nivel_interesse('baixo') as texto_baixo,
  normalize_nivel_interesse(3) as numero_3,
  normalize_nivel_interesse(2) as numero_2,
  normalize_nivel_interesse(1) as numero_1,
  normalize_nivel_interesse(NULL) as valor_null;

-- ================================================
-- Atualizar função process_lead_form_with_scheduling para usar normalização
-- ================================================

CREATE OR REPLACE FUNCTION process_lead_form_with_scheduling(
  p_nome_completo TEXT,
  p_email TEXT,
  p_telefone TEXT,
  p_empresa TEXT DEFAULT NULL,
  p_cargo TEXT DEFAULT NULL,
  p_temperatura TEXT DEFAULT 'morno',
  p_nivel_interesse ANYELEMENT DEFAULT 2,
  p_orcamento_disponivel INTEGER DEFAULT 0,
  p_decisor_principal BOOLEAN DEFAULT FALSE,
  p_dor_principal TEXT DEFAULT NULL,
  p_preferred_datetime TIMESTAMP DEFAULT NULL,
  p_primary_closer_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead_id UUID;
  v_score_result JSONB;
  v_assignment_result JSONB;
  v_appointment_result JSONB;
  v_normalized_nivel INTEGER;
BEGIN
  -- Log entrada da função
  RAISE NOTICE 'process_lead_form_with_scheduling iniciada para: % (%)', p_nome_completo, p_email;
  
  -- Normalizar nivel_interesse
  v_normalized_nivel := normalize_nivel_interesse(p_nivel_interesse);
  RAISE NOTICE 'nivel_interesse normalizado: % -> %', p_nivel_interesse, v_normalized_nivel;
  
  -- 1. Criar o lead
  INSERT INTO leads (
    nome_completo,
    email,
    telefone,
    empresa,
    cargo,
    temperatura,
    nivel_interesse,
    orcamento_disponivel,
    decisor_principal,
    dor_principal,
    organization_id,
    origem,
    status,
    data_primeiro_contato,
    created_at,
    updated_at
  ) VALUES (
    p_nome_completo,
    p_email,
    p_telefone,
    p_empresa,
    p_cargo,
    p_temperatura,
    v_normalized_nivel::TEXT, -- Salvar como texto normalizado
    p_orcamento_disponivel,
    p_decisor_principal,
    p_dor_principal,
    p_organization_id,
    'formulario_qualificacao',
    'novo',
    COALESCE(p_preferred_datetime, NOW()),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_lead_id;
  
  RAISE NOTICE 'Lead criado com ID: %', v_lead_id;
  
  -- 2. Calcular score do lead
  BEGIN
    SELECT calculate_lead_score(v_lead_id) INTO v_score_result;
    RAISE NOTICE 'Score calculado: %', v_score_result;
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE WARNING 'Erro ao calcular score: %', SQLERRM;
      v_score_result := jsonb_build_object(
        'success', false,
        'error', 'Falha no cálculo do score',
        'total_score', 0
      );
  END;
  
  -- 3. Tentar atribuir closer automaticamente
  BEGIN
    SELECT auto_assign_lead_to_closer(v_lead_id, p_primary_closer_id) INTO v_assignment_result;
    RAISE NOTICE 'Atribuição resultado: %', v_assignment_result;
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE WARNING 'Erro na atribuição: %', SQLERRM;
      v_assignment_result := jsonb_build_object(
        'success', false,
        'error', 'Falha na atribuição de closer'
      );
  END;
  
  -- 4. Tentar agendar automaticamente (se especificado)
  v_appointment_result := jsonb_build_object('appointment_scheduled', false);
  
  IF p_preferred_datetime IS NOT NULL AND (v_assignment_result->>'success')::boolean THEN
    BEGIN
      -- Tentar criar agendamento automático
      DECLARE
        v_closer_id UUID;
        v_appointment_token TEXT;
      BEGIN
        v_closer_id := (v_assignment_result->>'closer_id')::UUID;
        
        IF v_closer_id IS NOT NULL THEN
          -- Gerar token único
          v_appointment_token := 'auto-' || encode(gen_random_bytes(16), 'hex');
          
          -- Criar link de agendamento
          INSERT INTO agendamento_links (
            token_link,
            lead_id,
            closer_id,
            tipo_call_permitido,
            titulo_personalizado,
            descricao_personalizada,
            cor_tema,
            ativo,
            uso_unico,
            organization_id
          ) VALUES (
            v_appointment_token,
            v_lead_id,
            v_closer_id,
            'vendas',
            'Agendamento Automático - ' || p_nome_completo,
            'Link de agendamento gerado automaticamente após qualificação.',
            '#3b82f6',
            true,
            true,
            p_organization_id
          );
          
          v_appointment_result := jsonb_build_object(
            'appointment_scheduled', true,
            'appointment_token', v_appointment_token,
            'scheduled_date', p_preferred_datetime,
            'closer_id', v_closer_id
          );
          
          RAISE NOTICE 'Agendamento automático criado: %', v_appointment_token;
        END IF;
      EXCEPTION 
        WHEN OTHERS THEN
          RAISE WARNING 'Erro no agendamento automático: %', SQLERRM;
      END;
    END;
  END IF;
  
  -- 5. Retornar resultado completo
  RETURN jsonb_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'score_result', v_score_result,
    'assignment_result', v_assignment_result,
    'appointment_result', v_appointment_result,
    'message', 'Lead processado com sucesso'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro na função process_lead_form_with_scheduling: %', SQLERRM;
END;
$$;

-- Testar a função corrigida
SELECT 'Função process_lead_form_with_scheduling atualizada com sucesso!' as status;

-- Para testar:
-- SELECT * FROM process_lead_form_with_scheduling(
--   'Test User',
--   'test@example.com', 
--   '11999999999',
--   'Test Company',
--   'CEO',
--   'quente',
--   'alto', -- Testando com texto
--   5000,
--   true,
--   'Problema teste',
--   NOW() + INTERVAL '7 days'
-- );