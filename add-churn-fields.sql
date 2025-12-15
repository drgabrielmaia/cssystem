-- SQL para adicionar campos de churn e data de venda na tabela leads

-- Adicionar campo desistiu (boolean para indicar se o lead desistiu da mentoria)
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS desistiu BOOLEAN DEFAULT FALSE;

-- Adicionar campo data_venda (para registrar quando a mentoria foi vendida)
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS data_venda DATE;

-- Comentários para documentação
COMMENT ON COLUMN leads.desistiu IS 'Indica se o lead entrou na mentoria mas desistiu (para cálculo de churn)';
COMMENT ON COLUMN leads.data_venda IS 'Data em que a mentoria foi vendida para o lead';

-- Verificar se os campos foram criados
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'leads'
AND column_name IN ('desistiu', 'data_venda')
ORDER BY column_name;