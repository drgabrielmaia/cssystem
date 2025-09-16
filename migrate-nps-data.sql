-- ===================================
-- 🔄 MIGRAR DADOS DO NPS PARA TABELA CORRETA
-- ===================================
-- Execute este script para mover os dados de NPS para a tabela correta

-- 1. Verificar se a tabela nps_geral_respostas existe e tem dados
SELECT 'Verificando nps_geral_respostas:' as status;
SELECT COUNT(*) as total_registros FROM nps_geral_respostas;

-- 2. Verificar se a tabela nps_respostas existe
SELECT 'Verificando nps_respostas:' as status;
SELECT COUNT(*) as total_registros FROM nps_respostas;

-- 3. Verificar tabela genérica
SELECT 'Verificando formularios_respostas (nps_geral):' as status;
SELECT COUNT(*) as total_registros FROM formularios_respostas WHERE formulario = 'nps_geral';

-- 4. Se a tabela nps_geral_respostas tem dados, copiar para nps_respostas
-- CUIDADO: Execute apenas se nps_geral_respostas tiver dados e nps_respostas existir

-- Primeiro, criar a tabela nps_respostas se não existir
CREATE TABLE IF NOT EXISTS nps_respostas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mentorado_id UUID REFERENCES mentorados(id),
    nota_nps INTEGER NOT NULL,
    o_que_surpreendeu_positivamente TEXT,
    depoimento TEXT,
    o_que_faltou_para_9_10 TEXT,
    o_que_impediu_experiencia_9_10 TEXT,
    o_que_mudar_para_melhorar TEXT,
    ajuste_simples_maior_impacto TEXT,
    autoriza_depoimento BOOLEAN,
    pode_contatar BOOLEAN,
    data_resposta TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir dados de nps_geral_respostas para nps_respostas (se existir)
-- DESCOMENTE apenas se a tabela nps_geral_respostas tiver dados:
-- INSERT INTO nps_respostas (
--     mentorado_id, 
--     nota_nps, 
--     o_que_surpreendeu_positivamente, 
--     depoimento, 
--     o_que_faltou_para_9_10,
--     o_que_impediu_experiencia_9_10,
--     o_que_mudar_para_melhorar,
--     ajuste_simples_maior_impacto,
--     autoriza_depoimento, 
--     pode_contatar, 
--     data_resposta
-- )
-- SELECT 
--     mentorado_id, 
--     nota_nps, 
--     o_que_surpreendeu_positivamente, 
--     depoimento, 
--     o_que_faltou_para_9_10,
--     o_que_impediu_experiencia_9_10,
--     o_que_mudar_para_melhorar,
--     ajuste_simples_maior_impacto,
--     autoriza_depoimento, 
--     pode_contatar, 
--     data_resposta
-- FROM nps_geral_respostas
-- WHERE NOT EXISTS (
--     SELECT 1 FROM nps_respostas WHERE nps_respostas.mentorado_id = nps_geral_respostas.mentorado_id 
--     AND nps_respostas.data_resposta = nps_geral_respostas.data_resposta
-- );

-- Verificar se a migração funcionou
SELECT 'Resultado final:' as status;
SELECT COUNT(*) as total_nps_respostas FROM nps_respostas;

-- ✅ Pronto! Agora os dados do NPS devem aparecer na aplicação