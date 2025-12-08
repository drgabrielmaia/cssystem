-- ========================================
-- SISTEMA DE METAS - CUSTOMER SUCCESS
-- Mentoria Médica High Ticket - Meta anual R$ 10.000.000
-- Ticket médio referência: R$ 47.952
-- Margem líquida: ~75%
-- ========================================

-- 1. CRIAR TABELA DE METAS ANUAIS
CREATE TABLE IF NOT EXISTS metas_anuais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ano INTEGER UNIQUE NOT NULL,
    meta_faturamento_bruto DECIMAL(12,2) NOT NULL,
    meta_faturamento_liquido DECIMAL(12,2),
    ticket_medio_referencia DECIMAL(10,2) NOT NULL,
    margem_liquida_target DECIMAL(5,2) DEFAULT 75.00, -- 75%
    ativo BOOLEAN DEFAULT true,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CRIAR TABELA DE METAS MENSAIS
CREATE TABLE IF NOT EXISTS metas_mensais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fk_meta_anual UUID REFERENCES metas_anuais(id) ON DELETE CASCADE,
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    meta_faturamento_bruto DECIMAL(12,2) NOT NULL,
    meta_faturamento_liquido DECIMAL(12,2),
    meta_vendas INTEGER NOT NULL, -- número de contratos/vendas esperados
    meta_leads_gerados INTEGER,
    meta_ticket_medio DECIMAL(10,2),
    meta_conversao_percent DECIMAL(5,2), -- taxa de conversão esperada
    ativo BOOLEAN DEFAULT true,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ano, mes)
);

-- 3. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_metas_anuais_ano ON metas_anuais(ano);
CREATE INDEX IF NOT EXISTS idx_metas_anuais_ativo ON metas_anuais(ativo);
CREATE INDEX IF NOT EXISTS idx_metas_mensais_ano_mes ON metas_mensais(ano, mes);
CREATE INDEX IF NOT EXISTS idx_metas_mensais_ativo ON metas_mensais(ativo);
CREATE INDEX IF NOT EXISTS idx_metas_mensais_fk_anual ON metas_mensais(fk_meta_anual);

-- 4. TRIGGER PARA UPDATED_AT AUTOMÁTICO
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_metas_anuais_updated_at
    BEFORE UPDATE ON metas_anuais
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metas_mensais_updated_at
    BEFORE UPDATE ON metas_mensais
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- INSERIR DADOS DAS METAS - 2026
-- ========================================

-- 5. INSERIR META ANUAL 2026
INSERT INTO metas_anuais (
    ano,
    meta_faturamento_bruto,
    meta_faturamento_liquido,
    ticket_medio_referencia,
    margem_liquida_target,
    observacoes
) VALUES (
    2026,
    10000000.00, -- R$ 10.000.000
    9500000.00,  -- R$ 9.500.000 (considerando 95% de conversão de vendido para arrecadado)
    47952.00,    -- R$ 47.952
    75.00,       -- 75% margem líquida
    'Meta anual 2026 - R$ 10M de faturamento com 75% de margem líquida'
) ON CONFLICT (ano) DO UPDATE SET
    meta_faturamento_bruto = EXCLUDED.meta_faturamento_bruto,
    meta_faturamento_liquido = EXCLUDED.meta_faturamento_liquido,
    ticket_medio_referencia = EXCLUDED.ticket_medio_referencia,
    margem_liquida_target = EXCLUDED.margem_liquida_target,
    observacoes = EXCLUDED.observacoes,
    updated_at = NOW();

-- 6. INSERIR METAS MENSAIS 2026
INSERT INTO metas_mensais (
    fk_meta_anual,
    ano,
    mes,
    meta_faturamento_bruto,
    meta_faturamento_liquido,
    meta_vendas,
    meta_leads_gerados,
    meta_ticket_medio,
    meta_conversao_percent
) VALUES
-- JANEIRO
((SELECT id FROM metas_anuais WHERE ano = 2026), 2026, 1, 500000.00, 475000.00, 11, 220, 45454.55, 5.00),
-- FEVEREIRO
((SELECT id FROM metas_anuais WHERE ano = 2026), 2026, 2, 600000.00, 570000.00, 13, 260, 46153.85, 5.00),
-- MARÇO
((SELECT id FROM metas_anuais WHERE ano = 2026), 2026, 3, 700000.00, 665000.00, 15, 300, 46666.67, 5.00),
-- ABRIL
((SELECT id FROM metas_anuais WHERE ano = 2026), 2026, 4, 800000.00, 760000.00, 17, 340, 47058.82, 5.00),
-- MAIO
((SELECT id FROM metas_anuais WHERE ano = 2026), 2026, 5, 900000.00, 855000.00, 19, 380, 47368.42, 5.00),
-- JUNHO
((SELECT id FROM metas_anuais WHERE ano = 2026), 2026, 6, 1000000.00, 950000.00, 21, 420, 47619.05, 5.00),
-- JULHO
((SELECT id FROM metas_anuais WHERE ano = 2026), 2026, 7, 850000.00, 807500.00, 18, 360, 47222.22, 5.00),
-- AGOSTO
((SELECT id FROM metas_anuais WHERE ano = 2026), 2026, 8, 900000.00, 855000.00, 19, 380, 47368.42, 5.00),
-- SETEMBRO
((SELECT id FROM metas_anuais WHERE ano = 2026), 2026, 9, 950000.00, 902500.00, 20, 400, 47500.00, 5.00),
-- OUTUBRO
((SELECT id FROM metas_anuais WHERE ano = 2026), 2026, 10, 1000000.00, 950000.00, 21, 420, 47619.05, 5.00),
-- NOVEMBRO
((SELECT id FROM metas_anuais WHERE ano = 2026), 2026, 11, 1100000.00, 1045000.00, 23, 460, 47826.09, 5.00),
-- DEZEMBRO
((SELECT id FROM metas_anuais WHERE ano = 2026), 2026, 12, 1200000.00, 1140000.00, 25, 500, 48000.00, 5.00)
ON CONFLICT (ano, mes) DO UPDATE SET
    meta_faturamento_bruto = EXCLUDED.meta_faturamento_bruto,
    meta_faturamento_liquido = EXCLUDED.meta_faturamento_liquido,
    meta_vendas = EXCLUDED.meta_vendas,
    meta_leads_gerados = EXCLUDED.meta_leads_gerados,
    meta_ticket_medio = EXCLUDED.meta_ticket_medio,
    meta_conversao_percent = EXCLUDED.meta_conversao_percent,
    updated_at = NOW();

-- ========================================
-- VIEWS PARA DASHBOARD E RELATÓRIOS
-- ========================================

-- 7. VIEW: PERFORMANCE vs METAS MENSAL
CREATE OR REPLACE VIEW vw_performance_vs_meta AS
WITH faturamento_real AS (
    SELECT
        EXTRACT(YEAR FROM data_venda)::INTEGER as ano,
        EXTRACT(MONTH FROM data_venda)::INTEGER as mes,
        SUM(CASE WHEN status = 'vendido' THEN valor_vendido ELSE 0 END) as faturamento_real_bruto,
        SUM(CASE WHEN status = 'vendido' THEN COALESCE(valor_arrecadado, 0) ELSE 0 END) as faturamento_real_liquido,
        COUNT(*) FILTER (WHERE status = 'vendido') as vendas_realizadas,
        COUNT(*) as leads_gerados,
        CASE
            WHEN COUNT(*) FILTER (WHERE status = 'vendido') > 0
            THEN SUM(CASE WHEN status = 'vendido' THEN valor_vendido ELSE 0 END) / COUNT(*) FILTER (WHERE status = 'vendido')
            ELSE 0
        END as ticket_medio_real,
        CASE
            WHEN COUNT(*) > 0
            THEN ROUND((COUNT(*) FILTER (WHERE status = 'vendido')::DECIMAL / COUNT(*) * 100), 2)
            ELSE 0
        END as conversao_real_percent
    FROM leads
    WHERE data_venda IS NOT NULL
        OR created_at >= '2024-01-01' -- Para incluir leads gerados mesmo sem venda
    GROUP BY EXTRACT(YEAR FROM data_venda), EXTRACT(MONTH FROM data_venda)
),
custos_real AS (
    SELECT
        EXTRACT(YEAR FROM data_venda)::INTEGER as ano,
        EXTRACT(MONTH FROM data_venda)::INTEGER as mes,
        SUM(valor_comissao) as total_comissoes
    FROM comissoes
    WHERE status_pagamento IN ('pago', 'pendente')
    GROUP BY EXTRACT(YEAR FROM data_venda), EXTRACT(MONTH FROM data_venda)
)
SELECT
    m.ano,
    m.mes,
    to_char(make_date(m.ano, m.mes, 1), 'Month YYYY') as mes_nome,

    -- METAS
    m.meta_faturamento_bruto,
    m.meta_faturamento_liquido,
    m.meta_vendas,
    m.meta_leads_gerados,
    m.meta_ticket_medio,
    m.meta_conversao_percent,

    -- REALIZADO
    COALESCE(fr.faturamento_real_bruto, 0) as faturamento_real_bruto,
    COALESCE(fr.faturamento_real_liquido, 0) as faturamento_real_liquido,
    COALESCE(fr.vendas_realizadas, 0) as vendas_realizadas,
    COALESCE(fr.leads_gerados, 0) as leads_gerados,
    COALESCE(fr.ticket_medio_real, 0) as ticket_medio_real,
    COALESCE(fr.conversao_real_percent, 0) as conversao_real_percent,

    -- CUSTOS
    COALESCE(cr.total_comissoes, 0) as total_comissoes,

    -- PERFORMANCE vs META (%)
    CASE
        WHEN m.meta_faturamento_bruto > 0
        THEN ROUND((COALESCE(fr.faturamento_real_bruto, 0) / m.meta_faturamento_bruto * 100), 2)
        ELSE 0
    END as percent_meta_faturamento,

    CASE
        WHEN m.meta_vendas > 0
        THEN ROUND((COALESCE(fr.vendas_realizadas, 0)::DECIMAL / m.meta_vendas * 100), 2)
        ELSE 0
    END as percent_meta_vendas,

    CASE
        WHEN m.meta_leads_gerados > 0
        THEN ROUND((COALESCE(fr.leads_gerados, 0)::DECIMAL / m.meta_leads_gerados * 100), 2)
        ELSE 0
    END as percent_meta_leads,

    -- MARGEM LÍQUIDA REAL
    COALESCE(fr.faturamento_real_liquido, 0) - COALESCE(cr.total_comissoes, 0) as margem_liquida_real,

    -- STATUS DA META
    CASE
        WHEN COALESCE(fr.faturamento_real_bruto, 0) >= m.meta_faturamento_bruto THEN 'ATINGIDA'
        WHEN COALESCE(fr.faturamento_real_bruto, 0) >= (m.meta_faturamento_bruto * 0.8) THEN 'PRÓXIMA'
        ELSE 'DISTANTE'
    END as status_meta

FROM metas_mensais m
LEFT JOIN faturamento_real fr ON m.ano = fr.ano AND m.mes = fr.mes
LEFT JOIN custos_real cr ON m.ano = cr.ano AND m.mes = cr.mes
WHERE m.ativo = true
ORDER BY m.ano DESC, m.mes DESC;

-- 8. VIEW: RESUMO ANUAL DE PERFORMANCE
CREATE OR REPLACE VIEW vw_performance_anual AS
SELECT
    ano,

    -- METAS ANUAIS
    SUM(meta_faturamento_bruto) as meta_faturamento_anual,
    SUM(meta_vendas) as meta_vendas_anual,

    -- REALIZADOS
    SUM(faturamento_real_bruto) as faturamento_real_anual,
    SUM(vendas_realizadas) as vendas_real_anual,

    -- PERFORMANCE vs META (%)
    CASE
        WHEN SUM(meta_faturamento_bruto) > 0
        THEN ROUND((SUM(faturamento_real_bruto) / SUM(meta_faturamento_bruto) * 100), 2)
        ELSE 0
    END as percent_meta_anual_faturamento,

    CASE
        WHEN SUM(meta_vendas) > 0
        THEN ROUND((SUM(vendas_realizadas)::DECIMAL / SUM(meta_vendas) * 100), 2)
        ELSE 0
    END as percent_meta_anual_vendas,

    -- MARGEM E CUSTOS
    SUM(total_comissoes) as total_comissoes_anual,
    SUM(margem_liquida_real) as margem_liquida_anual,

    -- TICKET MÉDIO ANUAL
    CASE
        WHEN SUM(vendas_realizadas) > 0
        THEN SUM(faturamento_real_bruto) / SUM(vendas_realizadas)
        ELSE 0
    END as ticket_medio_anual,

    -- STATUS GERAL DO ANO
    CASE
        WHEN SUM(faturamento_real_bruto) >= SUM(meta_faturamento_bruto) THEN 'ATINGIDA'
        WHEN SUM(faturamento_real_bruto) >= (SUM(meta_faturamento_bruto) * 0.8) THEN 'PRÓXIMA'
        ELSE 'DISTANTE'
    END as status_meta_anual

FROM vw_performance_vs_meta
GROUP BY ano
ORDER BY ano DESC;

-- ========================================
-- FUNÇÕES RPC PARA FRONTEND
-- ========================================

-- 9. FUNÇÃO: Obter dados mensais para dashboard
CREATE OR REPLACE FUNCTION get_dashboard_metas_mensais(p_ano INTEGER DEFAULT NULL)
RETURNS TABLE (
    ano INTEGER,
    mes INTEGER,
    mes_nome TEXT,
    meta_faturamento DECIMAL,
    faturamento_real DECIMAL,
    meta_vendas INTEGER,
    vendas_real INTEGER,
    percent_faturamento DECIMAL,
    percent_vendas DECIMAL,
    status_meta TEXT,
    ticket_medio_real DECIMAL,
    margem_liquida DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.ano,
        v.mes,
        v.mes_nome,
        v.meta_faturamento_bruto,
        v.faturamento_real_bruto,
        v.meta_vendas,
        v.vendas_realizadas,
        v.percent_meta_faturamento,
        v.percent_meta_vendas,
        v.status_meta,
        v.ticket_medio_real,
        v.margem_liquida_real
    FROM vw_performance_vs_meta v
    WHERE (p_ano IS NULL OR v.ano = p_ano)
    ORDER BY v.ano DESC, v.mes ASC;
END;
$$;

-- 10. FUNÇÃO: Obter resumo anual para dashboard
CREATE OR REPLACE FUNCTION get_dashboard_resumo_anual(p_ano INTEGER DEFAULT NULL)
RETURNS TABLE (
    ano INTEGER,
    meta_anual DECIMAL,
    realizado_anual DECIMAL,
    percent_anual DECIMAL,
    status_anual TEXT,
    ticket_medio DECIMAL,
    margem_liquida DECIMAL,
    total_comissoes DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.ano,
        v.meta_faturamento_anual,
        v.faturamento_real_anual,
        v.percent_meta_anual_faturamento,
        v.status_meta_anual,
        v.ticket_medio_anual,
        v.margem_liquida_anual,
        v.total_comissoes_anual
    FROM vw_performance_anual v
    WHERE (p_ano IS NULL OR v.ano = p_ano)
    ORDER BY v.ano DESC;
END;
$$;

-- ========================================
-- POLÍTICAS RLS (Row Level Security)
-- ========================================

-- 11. Habilitar RLS nas tabelas de metas (se necessário)
-- ALTER TABLE metas_anuais ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE metas_mensais ENABLE ROW LEVEL SECURITY;

-- 12. Políticas básicas (ajustar conforme necessário)
-- CREATE POLICY "metas_read_policy" ON metas_anuais FOR SELECT USING (true);
-- CREATE POLICY "metas_mensais_read_policy" ON metas_mensais FOR SELECT USING (true);

-- Política para admin (se necessário implementar controle)
-- CREATE POLICY "metas_admin_full" ON metas_anuais FOR ALL USING (auth.role() = 'admin');

-- ========================================
-- CONSULTAS DE EXEMPLO PARA DASHBOARD
-- ========================================

-- EXEMPLO 1: Dados para dashboard principal (ano atual)
/*
SELECT * FROM get_dashboard_metas_mensais(2026);
*/

-- EXEMPLO 2: Resumo anual
/*
SELECT * FROM get_dashboard_resumo_anual(2026);
*/

-- EXEMPLO 3: Performance do mês atual
/*
SELECT
    mes_nome,
    meta_faturamento_bruto,
    faturamento_real_bruto,
    percent_meta_faturamento,
    status_meta
FROM vw_performance_vs_meta
WHERE ano = EXTRACT(YEAR FROM NOW())
    AND mes = EXTRACT(MONTH FROM NOW());
*/

-- EXEMPLO 4: Top 3 melhores meses do ano
/*
SELECT
    mes_nome,
    percent_meta_faturamento,
    faturamento_real_bruto,
    status_meta
FROM vw_performance_vs_meta
WHERE ano = 2026
ORDER BY percent_meta_faturamento DESC
LIMIT 3;
*/

-- EXEMPLO 5: Projeção para final do ano
/*
WITH media_mensal AS (
    SELECT AVG(faturamento_real_bruto) as media_faturamento
    FROM vw_performance_vs_meta
    WHERE ano = 2026 AND faturamento_real_bruto > 0
),
meses_restantes AS (
    SELECT COUNT(*) as meses
    FROM metas_mensais
    WHERE ano = 2026 AND mes > EXTRACT(MONTH FROM NOW())
)
SELECT
    (SELECT SUM(faturamento_real_bruto) FROM vw_performance_vs_meta WHERE ano = 2026) +
    (media_mensal.media_faturamento * meses_restantes.meses) as projecao_anual,
    (SELECT meta_faturamento_anual FROM vw_performance_anual WHERE ano = 2026) as meta_anual
FROM media_mensal, meses_restantes;
*/

-- FIM DO SCRIPT DE METAS