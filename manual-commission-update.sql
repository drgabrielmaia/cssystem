-- Atualização manual das comissões para valor fixo
-- Execute este SQL diretamente no Supabase

-- 1. Verificar comissões atuais
SELECT
    id,
    valor_comissao,
    percentual_comissao,
    observacoes
FROM comissoes
WHERE percentual_comissao = 0 AND valor_comissao = 0
ORDER BY created_at DESC;

-- 2. Atualizar todas as comissões com valor 0 para R$ 2000
UPDATE comissoes
SET
    valor_comissao = 2000.00,
    observacoes = CASE
        WHEN observacoes LIKE 'CORRIGIDO:%' THEN observacoes || ' | Valor corrigido para R$ 2000,00'
        ELSE 'Comissão fixa por indicação: R$ 2000,00'
    END
WHERE valor_comissao = 0 AND percentual_comissao = 0;

-- 3. Verificar resultado
SELECT
    COUNT(*) as total_comissoes,
    SUM(valor_comissao) as valor_total,
    AVG(valor_comissao) as valor_medio
FROM comissoes
WHERE percentual_comissao = 0;

-- 4. Listar primeiras 5 comissões após correção
SELECT
    id,
    valor_comissao,
    percentual_comissao,
    LEFT(observacoes, 50) as observacao_resumida
FROM comissoes
WHERE percentual_comissao = 0
ORDER BY created_at DESC
LIMIT 5;