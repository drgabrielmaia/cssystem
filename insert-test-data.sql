-- ===================================
-- 🧪 INSERIR DADOS DE TESTE PARA FORMULÁRIOS
-- ===================================

-- 1. Primeiro, verificar se há mentorados na base
SELECT 'Mentorados disponíveis:' as info;
SELECT id, nome_completo, email FROM mentorados LIMIT 5;

-- 2. Se houver mentorados, inserir alguns dados de teste
-- IMPORTANTE: Substitua os UUIDs pelos IDs reais dos seus mentorados

-- Exemplo de inserção (ADAPTE os UUIDs):
-- INSERT INTO formularios_respostas (mentorado_id, formulario, resposta_json, data_envio) VALUES 
-- ('UUID_DO_MENTORADO_1', 'nps_geral', '{"respostas": {"nota_nps": 9, "o_que_surpreendeu_positivamente": "A qualidade do conteúdo", "depoimento": "Excelente curso!", "autoriza_depoimento": true}}', NOW() - INTERVAL '2 days'),
-- ('UUID_DO_MENTORADO_2', 'nps_geral', '{"respostas": {"nota_nps": 7, "o_que_faltou_para_9_10": "Mais exemplos práticos"}}', NOW() - INTERVAL '1 day'),
-- ('UUID_DO_MENTORADO_3', 'modulo_iv_vendas', '{"respostas": {"qualificacao_pacientes": 4, "spin_selling": "sim", "nps": 8}}', NOW());

-- 3. OU criar dados de teste automaticamente (se os mentorados existem)
DO $$
DECLARE 
    mentorado_uuid UUID;
BEGIN
    -- Pegar o primeiro mentorado disponível
    SELECT id INTO mentorado_uuid FROM mentorados LIMIT 1;
    
    IF mentorado_uuid IS NOT NULL THEN
        -- Inserir dados de teste para NPS Geral
        INSERT INTO formularios_respostas (mentorado_id, formulario, resposta_json, data_envio) VALUES 
        (mentorado_uuid, 'nps_geral', '{"respostas": {"nota_nps": 9, "o_que_surpreendeu_positivamente": "A qualidade do conteúdo é excepcional", "depoimento": "Recomendo para todos!", "autoriza_depoimento": true, "pode_contatar": true}}', NOW() - INTERVAL '2 days'),
        (mentorado_uuid, 'nps_geral', '{"respostas": {"nota_nps": 7, "o_que_faltou_para_9_10": "Mais exemplos práticos e cases reais"}}', NOW() - INTERVAL '1 day'),
        (mentorado_uuid, 'modulo_iv_vendas', '{"respostas": {"qualificacao_pacientes": 4, "spin_selling": "sim", "venda_consultiva": "parcialmente", "taxa_fechamento": 3, "nps": 8}}', NOW());
        
        RAISE NOTICE 'Dados de teste inseridos com sucesso!';
    ELSE 
        RAISE NOTICE 'Nenhum mentorado encontrado. Crie mentorados primeiro.';
    END IF;
END $$;

-- 4. Verificar se os dados foram inseridos
SELECT 'Dados após inserção:' as info;
SELECT formulario, COUNT(*) as total 
FROM formularios_respostas 
GROUP BY formulario;