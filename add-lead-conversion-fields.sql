-- SQL para adicionar campo de relacionamento lead → mentorado

-- Adicionar campo lead_id na tabela mentorados para rastrear conversão
ALTER TABLE mentorados
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id);

-- Comentário para documentação
COMMENT ON COLUMN mentorados.lead_id IS 'ID do lead que foi convertido neste mentorado';

-- Verificar se o campo foi criado
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'mentorados'
AND column_name = 'lead_id';

-- Exemplo de uso:
-- Quando converter lead em mentorado:
-- 1. Criar mentorado com lead_id preenchido
-- 2. Quando houver churn por reembolso:
--    a) Marcar mentorado como excluído
--    b) Zerar valor_vendido e valor_arrecadado do lead original