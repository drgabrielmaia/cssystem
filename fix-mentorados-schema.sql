-- ========================================
-- CORREÇÃO DO SCHEMA DA TABELA MENTORADOS
-- ========================================

-- Adicionar coluna origem_conhecimento que está faltando
ALTER TABLE mentorados
ADD COLUMN IF NOT EXISTS origem_conhecimento TEXT;

-- Verificar se todas as colunas esperadas existem
-- (o comando abaixo é só para verificação - pode ser executado para debug)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'mentorados'
ORDER BY column_name;