-- ========================================
-- ADICIONAR SEPARAÇÃO POR PROJETOS FINANCEIROS
-- ========================================
-- Permitir que uma organização tenha múltiplos projetos
-- (mentoria, club, clínica) com controle financeiro separado

-- 1. Criar tabela de projetos por organização
CREATE TABLE IF NOT EXISTS projetos_organizacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL, -- 'MENTORIA', 'CLUB', 'CLINICA'
    nome VARCHAR(100) NOT NULL, -- 'Mentoria Individual', 'Club Premium', 'Clínica Médica'
    descricao TEXT,
    cor_tema VARCHAR(7) DEFAULT '#3B82F6', -- Para identificação visual
    ativo BOOLEAN DEFAULT true,
    configuracoes JSONB DEFAULT '{}', -- Para configurações específicas do projeto
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, codigo)
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_projetos_organizacao_org_id ON projetos_organizacao(organization_id);
CREATE INDEX IF NOT EXISTS idx_projetos_organizacao_ativo ON projetos_organizacao(ativo);
CREATE INDEX IF NOT EXISTS idx_projetos_organizacao_codigo ON projetos_organizacao(codigo);

-- 3. Adicionar campo projeto_id na tabela de transações financeiras
ALTER TABLE transacoes_financeiras
ADD COLUMN IF NOT EXISTS projeto_id UUID REFERENCES projetos_organizacao(id);

-- 4. Criar índice para o novo campo
CREATE INDEX IF NOT EXISTS idx_transacoes_financeiras_projeto_id ON transacoes_financeiras(projeto_id);

-- 5. Adicionar comentários para documentação
COMMENT ON TABLE projetos_organizacao IS 'Projetos financeiros dentro de cada organização (mentoria, club, clínica, etc.)';
COMMENT ON COLUMN transacoes_financeiras.projeto_id IS 'Projeto específico dentro da organização para separação financeira';

-- 6. Inserir projetos padrão para todas as organizações ativas
-- Projeto MENTORIA
INSERT INTO projetos_organizacao (organization_id, codigo, nome, descricao, cor_tema)
SELECT
    id as organization_id,
    'MENTORIA' as codigo,
    'Programa de Mentoria' as nome,
    'Sistema de mentoria individual e em grupo' as descricao,
    '#10B981' as cor_tema
FROM organizations
WHERE is_active = true
ON CONFLICT (organization_id, codigo) DO NOTHING;

-- Projeto CLUB
INSERT INTO projetos_organizacao (organization_id, codigo, nome, descricao, cor_tema)
SELECT
    id as organization_id,
    'CLUB' as codigo,
    'Club Premium' as nome,
    'Programa de membership e conteúdos exclusivos' as descricao,
    '#8B5CF6' as cor_tema
FROM organizations
WHERE is_active = true
ON CONFLICT (organization_id, codigo) DO NOTHING;

-- Projeto CLÍNICA
INSERT INTO projetos_organizacao (organization_id, codigo, nome, descricao, cor_tema)
SELECT
    id as organization_id,
    'CLINICA' as codigo,
    'Clínica/Consultório' as nome,
    'Atendimentos médicos e consultas presenciais' as descricao,
    '#F59E0B' as cor_tema
FROM organizations
WHERE is_active = true
ON CONFLICT (organization_id, codigo) DO NOTHING;

-- Projeto GERAL (para transações não específicas)
INSERT INTO projetos_organizacao (organization_id, codigo, nome, descricao, cor_tema)
SELECT
    id as organization_id,
    'GERAL' as codigo,
    'Administrativo Geral' as nome,
    'Transações administrativas e operacionais gerais' as descricao,
    '#6B7280' as cor_tema
FROM organizations
WHERE is_active = true
ON CONFLICT (organization_id, codigo) DO NOTHING;

-- 7. Migrar transações existentes baseado na categoria e tipo
-- Transações de MENTORIA
UPDATE transacoes_financeiras
SET projeto_id = (
    SELECT p.id
    FROM projetos_organizacao p
    WHERE p.organization_id = transacoes_financeiras.organization_id
    AND p.codigo = 'MENTORIA'
)
WHERE projeto_id IS NULL
AND (
    categoria ILIKE '%mentoria%'
    OR referencia_tipo = 'mentorado_receita'
    OR descricao ILIKE '%mentoria%'
    OR descricao ILIKE '%mentorado%'
);

-- Transações GERAIS (restantes)
UPDATE transacoes_financeiras
SET projeto_id = (
    SELECT p.id
    FROM projetos_organizacao p
    WHERE p.organization_id = transacoes_financeiras.organization_id
    AND p.codigo = 'GERAL'
)
WHERE projeto_id IS NULL;

-- 8. Verificação dos resultados
SELECT
    'PROJETOS CRIADOS' as status,
    COUNT(*) as total_projetos,
    COUNT(DISTINCT organization_id) as organizacoes_com_projetos
FROM projetos_organizacao;

SELECT
    'TRANSAÇÕES POR PROJETO' as status,
    p.codigo as projeto,
    p.nome as nome_projeto,
    COUNT(t.id) as total_transacoes,
    SUM(CASE WHEN t.tipo = 'entrada' THEN t.valor ELSE 0 END) as total_entradas,
    SUM(CASE WHEN t.tipo = 'saida' THEN t.valor ELSE 0 END) as total_saidas
FROM projetos_organizacao p
LEFT JOIN transacoes_financeiras t ON t.projeto_id = p.id
GROUP BY p.codigo, p.nome, p.id
ORDER BY p.codigo;

-- 9. Função para obter transações por projeto e organização
CREATE OR REPLACE FUNCTION get_transacoes_por_projeto(
    org_id UUID,
    projeto_codigo VARCHAR DEFAULT NULL
)
RETURNS TABLE(
    projeto_nome VARCHAR,
    projeto_codigo VARCHAR,
    total_entradas DECIMAL,
    total_saidas DECIMAL,
    saldo_liquido DECIMAL,
    total_transacoes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.nome::VARCHAR as projeto_nome,
        p.codigo::VARCHAR as projeto_codigo,
        COALESCE(SUM(CASE WHEN t.tipo = 'entrada' THEN t.valor ELSE 0 END), 0) as total_entradas,
        COALESCE(SUM(CASE WHEN t.tipo = 'saida' THEN t.valor ELSE 0 END), 0) as total_saidas,
        COALESCE(SUM(CASE WHEN t.tipo = 'entrada' THEN t.valor ELSE -t.valor END), 0) as saldo_liquido,
        COUNT(t.id) as total_transacoes
    FROM projetos_organizacao p
    LEFT JOIN transacoes_financeiras t ON t.projeto_id = p.id
    WHERE p.organization_id = org_id
    AND p.ativo = true
    AND (projeto_codigo IS NULL OR p.codigo = projeto_codigo)
    GROUP BY p.id, p.nome, p.codigo
    ORDER BY p.codigo;
END;
$$ LANGUAGE plpgsql;

-- 10. Exemplo de uso da função
-- SELECT * FROM get_transacoes_por_projeto('9c8c0033-15ea-4e33-a55f-28d81a19693b');

-- ========================================
-- INSTRUÇÕES:
-- 1. Execute este script no Supabase
-- 2. Verifique os resultados das consultas de verificação
-- 3. Teste a função get_transacoes_por_projeto
-- 4. Atualize o frontend para incluir filtros por projeto
-- ========================================