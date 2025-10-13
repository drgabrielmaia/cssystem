-- ========================================
-- FORÇAR REFRESH DAS MÉTRICAS DO SOCIAL SELLER
-- ========================================

-- 1. Primeiro, verificar dados brutos
SELECT
    call_status,
    COUNT(*) as quantidade,
    SUM(CASE WHEN sale_value IS NOT NULL THEN sale_value ELSE 0 END) as total_vendas
FROM calendar_events
WHERE call_status IS NOT NULL
GROUP BY call_status
ORDER BY call_status;

-- 2. Verificar se a view existe e recriar se necessário
DROP VIEW IF EXISTS social_seller_metrics;

CREATE VIEW social_seller_metrics AS
SELECT
    DATE_TRUNC('month', start_datetime) as month_year,
    COUNT(CASE WHEN call_status = 'no_show' THEN 1 END) as no_shows,
    COUNT(CASE WHEN call_status IN ('realizada', 'vendida', 'nao_vendida') THEN 1 END) as calls_realizadas,
    COUNT(CASE WHEN call_status = 'vendida' THEN 1 END) as calls_vendidas,
    COUNT(CASE WHEN call_status = 'nao_vendida' THEN 1 END) as calls_nao_vendidas,
    COUNT(CASE WHEN call_status = 'aguardando_resposta' THEN 1 END) as calls_aguardando,
    COUNT(*) as total_calls,
    COALESCE(SUM(CASE WHEN call_status = 'vendida' THEN sale_value ELSE 0 END), 0) as total_vendas,
    CASE
        WHEN COUNT(CASE WHEN call_status IN ('vendida', 'nao_vendida') THEN 1 END) > 0
        THEN ROUND(
            (COUNT(CASE WHEN call_status = 'vendida' THEN 1 END) * 100.0) /
            COUNT(CASE WHEN call_status IN ('vendida', 'nao_vendida') THEN 1 END),
            2
        )
        ELSE 0
    END as taxa_conversao
FROM calendar_events
WHERE call_status IS NOT NULL
GROUP BY DATE_TRUNC('month', start_datetime)
ORDER BY month_year DESC;

-- 3. Verificar se a view foi criada corretamente
SELECT * FROM social_seller_metrics ORDER BY month_year DESC;

-- 4. Criar função para refresh manual (opcional)
CREATE OR REPLACE FUNCTION refresh_social_seller_metrics()
RETURNS TABLE(
    month_year timestamp with time zone,
    no_shows bigint,
    calls_realizadas bigint,
    calls_vendidas bigint,
    calls_nao_vendidas bigint,
    calls_aguardando bigint,
    total_calls bigint,
    total_vendas numeric,
    taxa_conversao numeric
) AS $$
BEGIN
    -- Forçar refresh da view retornando os dados recalculados
    RETURN QUERY
    SELECT
        DATE_TRUNC('month', ce.start_datetime) as month_year,
        COUNT(CASE WHEN ce.call_status = 'no_show' THEN 1 END) as no_shows,
        COUNT(CASE WHEN ce.call_status IN ('realizada', 'vendida', 'nao_vendida') THEN 1 END) as calls_realizadas,
        COUNT(CASE WHEN ce.call_status = 'vendida' THEN 1 END) as calls_vendidas,
        COUNT(CASE WHEN ce.call_status = 'nao_vendida' THEN 1 END) as calls_nao_vendidas,
        COUNT(CASE WHEN ce.call_status = 'aguardando_resposta' THEN 1 END) as calls_aguardando,
        COUNT(*) as total_calls,
        COALESCE(SUM(CASE WHEN ce.call_status = 'vendida' THEN ce.sale_value ELSE 0 END), 0) as total_vendas,
        CASE
            WHEN COUNT(CASE WHEN ce.call_status IN ('vendida', 'nao_vendida') THEN 1 END) > 0
            THEN ROUND(
                (COUNT(CASE WHEN ce.call_status = 'vendida' THEN 1 END) * 100.0) /
                COUNT(CASE WHEN ce.call_status IN ('vendida', 'nao_vendida') THEN 1 END),
                2
            )
            ELSE 0
        END as taxa_conversao
    FROM calendar_events ce
    WHERE ce.call_status IS NOT NULL
    GROUP BY DATE_TRUNC('month', ce.start_datetime)
    ORDER BY month_year DESC;
END;
$$ LANGUAGE plpgsql;