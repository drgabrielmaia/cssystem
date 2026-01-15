-- Script SQL para corrigir valores de comissões zeradas
-- Este script deve ser executado diretamente no Supabase SQL Editor

-- 1. Primeiro, verificar o estado atual
SELECT
    id,
    mentorado_id,
    valor_comissao,
    status_pagamento,
    observacoes,
    created_at,
    updated_at
FROM comissoes
WHERE status_pagamento = 'pendente'
ORDER BY created_at DESC;

-- 2. Atualizar todas as comissões pendentes que têm valor zerado
UPDATE comissoes
SET
    valor_comissao = 2000.00,
    observacoes = COALESCE(observacoes, '') || ' [CORREÇÃO MANUAL SQL] Valor atualizado para R$ 2.000,00 em ' || NOW()::text,
    updated_at = NOW()
WHERE
    status_pagamento = 'pendente'
    AND (valor_comissao = 0 OR valor_comissao IS NULL);

-- 3. Verificar o resultado da atualização
SELECT
    id,
    mentorado_id,
    valor_comissao,
    status_pagamento,
    observacoes,
    updated_at
FROM comissoes
WHERE status_pagamento = 'pendente'
ORDER BY updated_at DESC;

-- 4. Calcular total em comissões pendentes
SELECT
    COUNT(*) as total_comissoes,
    SUM(valor_comissao) as total_valor,
    COUNT(CASE WHEN valor_comissao = 2000 THEN 1 END) as comissoes_corretas,
    COUNT(CASE WHEN valor_comissao = 0 THEN 1 END) as comissoes_zeradas
FROM comissoes
WHERE status_pagamento = 'pendente';

-- 5. Relatório por mentorado
SELECT
    m.nome as mentorado_nome,
    COUNT(c.id) as quantidade_comissoes,
    SUM(c.valor_comissao) as total_comissoes
FROM comissoes c
JOIN mentorados m ON c.mentorado_id = m.id
WHERE c.status_pagamento = 'pendente'
GROUP BY m.id, m.nome
ORDER BY total_comissoes DESC;