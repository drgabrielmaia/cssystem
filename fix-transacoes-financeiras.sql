-- ========================================
-- CORRIGIR TABELA TRANSACOES_FINANCEIRAS
-- ========================================
-- Adicionar colunas que faltam na estrutura

-- 1. Adicionar colunas de referência se não existirem
ALTER TABLE transacoes_financeiras
ADD COLUMN IF NOT EXISTS referencia_id UUID,
ADD COLUMN IF NOT EXISTS referencia_tipo VARCHAR(50),
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_transacoes_financeiras_referencia_id
ON transacoes_financeiras(referencia_id);

CREATE INDEX IF NOT EXISTS idx_transacoes_financeiras_referencia_tipo
ON transacoes_financeiras(referencia_tipo);

CREATE INDEX IF NOT EXISTS idx_transacoes_financeiras_organization_id
ON transacoes_financeiras(organization_id);

-- 3. Adicionar comentários para documentação
COMMENT ON COLUMN transacoes_financeiras.referencia_id IS 'ID de referência para vincular com comissões, vendas, etc';
COMMENT ON COLUMN transacoes_financeiras.referencia_tipo IS 'Tipo da referência: comissao, mentorado_receita, manual, etc';
COMMENT ON COLUMN transacoes_financeiras.organization_id IS 'Organização responsável pela transação';

-- 4. Verificar estrutura atualizada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transacoes_financeiras'
  AND column_name IN ('referencia_id', 'referencia_tipo', 'organization_id')
ORDER BY ordinal_position;

-- ========================================
-- EXECUTE ESTE SCRIPT PRIMEIRO
-- Depois execute o sync-mentoria-simples.sql
-- ========================================