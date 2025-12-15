-- SQL para adicionar campos de churn e controle de exclusão na tabela mentorados

-- Adicionar campo data_entrada (se não existir) - para rastrear quando o mentorado entrou na mentoria
ALTER TABLE mentorados
ADD COLUMN IF NOT EXISTS data_entrada DATE DEFAULT CURRENT_DATE;

-- Adicionar campo motivo_exclusao (enum para controlar o tipo de saída)
ALTER TABLE mentorados
ADD COLUMN IF NOT EXISTS motivo_exclusao VARCHAR(50) CHECK (motivo_exclusao IN ('erro', 'reembolso', 'conclusao', 'abandono'));

-- Adicionar campo data_exclusao (para registrar quando foi excluído)
ALTER TABLE mentorados
ADD COLUMN IF NOT EXISTS data_exclusao DATE;

-- Adicionar campo excluido (boolean para soft delete)
ALTER TABLE mentorados
ADD COLUMN IF NOT EXISTS excluido BOOLEAN DEFAULT FALSE;

-- Comentários para documentação
COMMENT ON COLUMN mentorados.data_entrada IS 'Data em que o mentorado entrou na mentoria (para cálculo de churn)';
COMMENT ON COLUMN mentorados.motivo_exclusao IS 'Motivo da exclusão: erro (não conta como churn), reembolso (conta como churn), conclusao, abandono';
COMMENT ON COLUMN mentorados.data_exclusao IS 'Data em que o mentorado foi excluído/removido';
COMMENT ON COLUMN mentorados.excluido IS 'Indica se o mentorado foi excluído (soft delete)';

-- Verificar se os campos foram criados
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'mentorados'
AND column_name IN ('data_entrada', 'motivo_exclusao', 'data_exclusao', 'excluido')
ORDER BY column_name;

-- Exemplo de como calcular churn:
-- Mentorados que entraram na mentoria mas saíram por reembolso = churn
-- Mentorados que saíram por erro = não conta como churn
-- Taxa de churn = (exclusões por reembolso / total que entraram) * 100