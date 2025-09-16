-- ===================================
-- 🛠️ CRIAR TABELA FORMULARIOS_RESPOSTAS
-- ===================================

-- Criar a tabela principal para respostas de formulários
CREATE TABLE IF NOT EXISTS formularios_respostas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    formulario VARCHAR(100) NOT NULL,
    resposta_json JSONB NOT NULL,
    data_envio TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_formularios_respostas_mentorado_id 
ON formularios_respostas(mentorado_id);

CREATE INDEX IF NOT EXISTS idx_formularios_respostas_formulario 
ON formularios_respostas(formulario);

CREATE INDEX IF NOT EXISTS idx_formularios_respostas_data_envio 
ON formularios_respostas(data_envio);

-- Permitir acesso público (desabilitar RLS temporariamente para desenvolvimento)
ALTER TABLE formularios_respostas DISABLE ROW LEVEL SECURITY;

-- Inserir alguns dados de teste se há mentorados
DO $$
DECLARE 
    mentorado_uuid UUID;
    mentorado_count INT;
BEGIN
    SELECT COUNT(*) INTO mentorado_count FROM mentorados;
    
    IF mentorado_count > 0 THEN
        -- Pegar o primeiro mentorado
        SELECT id INTO mentorado_uuid FROM mentorados LIMIT 1;
        
        -- Inserir dados de teste
        INSERT INTO formularios_respostas (mentorado_id, formulario, resposta_json, data_envio) VALUES 
        (mentorado_uuid, 'nps_geral', '{"respostas": {"nota_nps": 9, "o_que_surpreendeu_positivamente": "A qualidade do conteúdo é excepcional", "depoimento": "Recomendo para todos os médicos!", "autoriza_depoimento": true, "pode_contatar": true}}', NOW() - INTERVAL '2 days'),
        (mentorado_uuid, 'nps_geral', '{"respostas": {"nota_nps": 7, "o_que_faltou_para_9_10": "Mais exemplos práticos e cases reais do consultório"}}', NOW() - INTERVAL '1 day'),
        (mentorado_uuid, 'nps_geral', '{"respostas": {"nota_nps": 10, "o_que_surpreendeu_positivamente": "A metodologia de vendas transformou meu consultório", "depoimento": "Aumentei 300% meu faturamento!", "autoriza_depoimento": true}}', NOW() - INTERVAL '3 hours'),
        (mentorado_uuid, 'modulo_iv_vendas', '{"respostas": {"qualificacao_pacientes": 5, "spin_selling": "sim", "venda_consultiva": "sim", "taxa_fechamento": 4, "feedback_preco": "Muito válido o investimento", "nps": 8}}', NOW() - INTERVAL '1 day'),
        (mentorado_uuid, 'modulo_iii_marketing', '{"respostas": {"jornada_paciente": "sim", "modelo_disney": "parcialmente", "neuromarketing": "sim", "reduzir_noshow": 4, "estruturar_processos": "sim", "nps": 7}}', NOW() - INTERVAL '6 hours');
        
        RAISE NOTICE 'Tabela criada e dados de teste inseridos com sucesso!';
    ELSE 
        RAISE NOTICE 'Tabela criada, mas nenhum mentorado encontrado para dados de teste.';
    END IF;
END $$;

-- Verificar se foi criada corretamente
SELECT 'Verificação final:' as info;
SELECT formulario, COUNT(*) as total, MAX(data_envio) as ultima_resposta
FROM formularios_respostas 
GROUP BY formulario;

-- Ver dados de exemplo
SELECT 'Dados inseridos:' as info;
SELECT f.formulario, m.nome_completo, f.data_envio
FROM formularios_respostas f
JOIN mentorados m ON f.mentorado_id = m.id
ORDER BY f.data_envio DESC
LIMIT 5;