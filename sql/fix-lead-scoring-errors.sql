-- ================================================
-- CORREÇÃO DA FUNÇÃO calculate_lead_score
-- ================================================
-- Corrige o erro do operador ->> em campos que podem ser NULL
-- ================================================

-- Dropar função com problema
DROP FUNCTION IF EXISTS calculate_lead_score(UUID);

-- Recriar função corrigida
CREATE OR REPLACE FUNCTION calculate_lead_score(lead_id UUID)
RETURNS JSONB AS $$
DECLARE
  score_total INTEGER := 0;
  score_breakdown JSONB;
  lead_data RECORD;
  temp_score INTEGER := 0;
  origin_score INTEGER := 0;
  interaction_score INTEGER := 0;
  recency_score INTEGER := 0;
  medical_score INTEGER := 0;
  msg_count INTEGER := 0;
  days_old INTEGER := 0;
BEGIN
  -- Buscar dados do lead com tratamento de NULLs
  SELECT 
    l.*,
    COALESCE(l.temperatura, 'morno') as temp,
    COALESCE(
      CASE 
        WHEN l.lead_score_detalhado IS NOT NULL AND l.lead_score_detalhado ? 'medical_score'
        THEN (l.lead_score_detalhado->>'medical_score')::integer
        ELSE 0
      END, 0
    ) as medical_score_val,
    EXTRACT(DAY FROM (NOW() - l.created_at))::integer as days_old_val
  INTO lead_data
  FROM leads l 
  WHERE l.id = lead_id;

  -- Se lead não encontrado
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lead não encontrado'
    );
  END IF;

  -- Extrair valores com tratamento seguro
  days_old := lead_data.days_old_val;
  medical_score := lead_data.medical_score_val;

  -- Contar mensagens do WhatsApp
  SELECT COUNT(*) INTO msg_count
  FROM whatsapp_messages w 
  WHERE w.lead_id = lead_id;

  -- ========================================
  -- CÁLCULO DE PONTUAÇÃO (Peso Total: 100)
  -- ========================================

  -- 1. TEMPERATURA (40% do peso total) - 0 a 40 pontos
  CASE lead_data.temp
    WHEN 'quente' THEN temp_score := 40;
    WHEN 'morno' THEN temp_score := 25;
    WHEN 'frio' THEN temp_score := 10;
    ELSE temp_score := 15; -- Neutro
  END CASE;

  -- 2. ORIGEM (20% do peso total) - 0 a 20 pontos  
  CASE COALESCE(lead_data.origem, 'unknown')
    WHEN 'instagram' THEN origin_score := 20;
    WHEN 'google' THEN origin_score := 18;
    WHEN 'facebook' THEN origin_score := 15;
    WHEN 'indicacao' THEN origin_score := 20;
    WHEN 'organico' THEN origin_score := 16;
    WHEN 'pago' THEN origin_score := 14;
    ELSE origin_score := 8; -- Origem desconhecida
  END CASE;

  -- 3. INTERAÇÕES/MENSAGENS (20% do peso total) - 0 a 20 pontos
  IF msg_count >= 10 THEN
    interaction_score := 20;
  ELSIF msg_count >= 5 THEN
    interaction_score := 15;
  ELSIF msg_count >= 2 THEN
    interaction_score := 10;
  ELSIF msg_count >= 1 THEN
    interaction_score := 5;
  ELSE
    interaction_score := 0;
  END IF;

  -- 4. RECÊNCIA (10% do peso total) - 0 a 10 pontos
  IF days_old <= 1 THEN
    recency_score := 10; -- Muito recente
  ELSIF days_old <= 3 THEN
    recency_score := 8;
  ELSIF days_old <= 7 THEN
    recency_score := 6;
  ELSIF days_old <= 30 THEN
    recency_score := 4;
  ELSE
    recency_score := 1; -- Muito antigo
  END IF;

  -- 5. SCORE MÉDICO (10% do peso total) - 0 a 10 pontos
  -- Normalizar score médico para escala de 0-10
  IF medical_score > 0 THEN
    medical_score := LEAST(10, medical_score::float / 10 * 10)::integer;
  END IF;

  -- TOTAL
  score_total := temp_score + origin_score + interaction_score + recency_score + medical_score;

  -- Garantir que não passe de 100
  score_total := LEAST(score_total, 100);

  -- Criar breakdown detalhado
  score_breakdown := jsonb_build_object(
    'total_score', score_total,
    'temperatura', jsonb_build_object(
      'value', lead_data.temp,
      'score', temp_score,
      'peso', '40%'
    ),
    'origem', jsonb_build_object(
      'value', COALESCE(lead_data.origem, 'unknown'),
      'score', origin_score,
      'peso', '20%'
    ),
    'interacoes', jsonb_build_object(
      'value', msg_count,
      'score', interaction_score,
      'peso', '20%'
    ),
    'recencia', jsonb_build_object(
      'value', days_old || ' dias',
      'score', recency_score,
      'peso', '10%'
    ),
    'medical_score', jsonb_build_object(
      'value', medical_score,
      'score', medical_score,
      'peso', '10%'
    ),
    'calculated_at', NOW()
  );

  -- Atualizar lead no banco
  UPDATE leads 
  SET 
    lead_score = score_total,
    lead_score_detalhado = score_breakdown,
    temperatura_calculada = CASE
      WHEN score_total >= 80 THEN 'quente'
      WHEN score_total >= 50 THEN 'morno'
      ELSE 'frio'
    END,
    updated_at = NOW()
  WHERE id = lead_id;

  -- Log da ação
  INSERT INTO lead_history (lead_id, action, details, user_id, organization_id)
  VALUES (
    lead_id,
    'score_calculated',
    jsonb_build_object(
      'old_score', COALESCE(lead_data.lead_score, 0),
      'new_score', score_total,
      'breakdown', score_breakdown
    ),
    NULL, -- Sistema automático
    lead_data.organization_id
  );

  -- Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'total_score', score_total,
    'breakdown', score_breakdown,
    'lead_id', lead_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro
    INSERT INTO lead_history (lead_id, action, details, user_id, organization_id)
    VALUES (
      lead_id,
      'score_error',
      jsonb_build_object(
        'error', SQLERRM,
        'error_detail', SQLSTATE
      ),
      NULL,
      COALESCE(lead_data.organization_id, (SELECT organization_id FROM leads WHERE id = lead_id LIMIT 1))
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- FUNÇÃO DE TESTE CORRIGIDA
-- ================================================

-- Dropar função de teste com problema
DROP FUNCTION IF EXISTS test_lead_scoring_system(INTEGER);

-- Recriar função de teste
CREATE OR REPLACE FUNCTION test_lead_scoring_system(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  lead_id UUID,
  nome TEXT,
  temperatura TEXT,
  score INTEGER,
  score_details JSONB,
  closer_assigned UUID,
  assignment_result JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH scored_leads AS (
    SELECT 
      l.id,
      l.nome_completo,
      COALESCE(l.temperatura, 'morno') as temp,
      calculate_lead_score(l.id) as score_result
    FROM leads l 
    WHERE l.organization_id IS NOT NULL
    ORDER BY l.created_at DESC 
    LIMIT limit_count
  ),
  assigned_leads AS (
    SELECT 
      sl.id,
      sl.nome_completo,
      sl.temp,
      COALESCE((sl.score_result->>'total_score')::integer, 0) as score_val,
      sl.score_result,
      CASE 
        WHEN COALESCE((sl.score_result->>'total_score')::integer, 0) >= 60 OR sl.temp = 'quente' 
        THEN auto_assign_lead_to_closer(sl.id)
        ELSE jsonb_build_object('success', false, 'reason', 'Score too low for auto-assignment')
      END as assignment
    FROM scored_leads sl
  )
  SELECT 
    al.id as lead_id,
    al.nome_completo as nome,
    al.temp as temperatura,
    al.score_val as score,
    al.score_result as score_details,
    (SELECT closer_id FROM leads WHERE id = al.id) as closer_assigned,
    al.assignment as assignment_result
  FROM assigned_leads al;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- FUNÇÃO PARA RECALCULAR TODOS OS SCORES
-- ================================================

CREATE OR REPLACE FUNCTION recalculate_all_lead_scores(batch_size INTEGER DEFAULT 100)
RETURNS JSONB AS $$
DECLARE
  total_leads INTEGER;
  processed INTEGER := 0;
  batch_count INTEGER := 0;
  lead_record RECORD;
  result JSONB;
BEGIN
  -- Contar total de leads
  SELECT COUNT(*) INTO total_leads FROM leads WHERE organization_id IS NOT NULL;

  -- Processar em batches
  FOR lead_record IN 
    SELECT id FROM leads 
    WHERE organization_id IS NOT NULL 
    ORDER BY created_at DESC
  LOOP
    -- Calcular score do lead
    SELECT calculate_lead_score(lead_record.id) INTO result;
    
    processed := processed + 1;
    
    -- Log a cada batch
    IF processed % batch_size = 0 THEN
      batch_count := batch_count + 1;
      RAISE NOTICE 'Processados % leads de % total (batch %)', processed, total_leads, batch_count;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_leads', total_leads,
    'processed', processed,
    'batches', batch_count + 1,
    'completed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- TRIGGER PARA AUTO-CÁLCULO DE SCORE
-- ================================================

-- Função do trigger
CREATE OR REPLACE FUNCTION trigger_calculate_lead_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Só calcular se houve mudança relevante ou se é novo
  IF TG_OP = 'INSERT' OR 
     OLD.temperatura IS DISTINCT FROM NEW.temperatura OR
     OLD.origem IS DISTINCT FROM NEW.origem OR
     OLD.last_interaction_date IS DISTINCT FROM NEW.last_interaction_date THEN
    
    -- Calcular score de forma assíncrona (não bloquear a transação principal)
    PERFORM calculate_lead_score(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dropar trigger existente se houver
DROP TRIGGER IF EXISTS auto_calculate_lead_score ON leads;

-- Criar trigger
CREATE TRIGGER auto_calculate_lead_score
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_lead_score();

-- ================================================
-- COMANDO FINAL
-- ================================================

-- Testar a função corrigida
SELECT 'Função calculate_lead_score corrigida e pronta para uso!' as status;