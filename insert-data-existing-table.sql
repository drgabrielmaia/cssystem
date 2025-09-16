-- ===================================
-- 🧪 INSERIR DADOS DE TESTE NA TABELA EXISTENTE
-- ===================================

-- Verificar mentorados disponíveis
SELECT 'Mentorados disponíveis:' as info;
SELECT id, nome_completo FROM mentorados LIMIT 3;

-- Inserir dados de teste usando os valores corretos da tabela
INSERT INTO formularios_respostas (mentorado_id, formulario, resposta_json, data_envio) 
SELECT 
    id as mentorado_id,
    'nps' as formulario,
    '{"respostas": {"nota_nps": 9, "o_que_surpreendeu_positivamente": "A qualidade do conteúdo é excepcional", "depoimento": "Recomendo para todos!", "autoriza_depoimento": true}}' as resposta_json,
    NOW() - INTERVAL '1 day' as data_envio
FROM mentorados 
LIMIT 1;

INSERT INTO formularios_respostas (mentorado_id, formulario, resposta_json, data_envio) 
SELECT 
    id as mentorado_id,
    'vendas' as formulario,
    '{"respostas": {"qualificacao_pacientes": 4, "spin_selling": "sim", "nps": 8}}' as resposta_json,
    NOW() - INTERVAL '2 hours' as data_envio
FROM mentorados 
LIMIT 1;

INSERT INTO formularios_respostas (mentorado_id, formulario, resposta_json, data_envio) 
SELECT 
    id as mentorado_id,
    'nps' as formulario,
    '{"respostas": {"nota_nps": 7, "o_que_faltou_para_9_10": "Mais exemplos práticos"}}' as resposta_json,
    NOW() - INTERVAL '30 minutes' as data_envio
FROM mentorados 
LIMIT 1;

-- Verificar se os dados foram inseridos
SELECT 'Dados inseridos:' as info;
SELECT formulario, COUNT(*) as total 
FROM formularios_respostas 
GROUP BY formulario;

SELECT 'Exemplos:' as info;
SELECT f.formulario, m.nome_completo, f.data_envio
FROM formularios_respostas f
JOIN mentorados m ON f.mentorado_id = m.id
ORDER BY f.data_envio DESC;