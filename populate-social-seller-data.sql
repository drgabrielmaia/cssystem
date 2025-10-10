-- ========================================
-- POPULAR DADOS PARA SOCIAL SELLER
-- ========================================

-- Primeiro, vamos verificar se existem leads e mentorados
DO $$
DECLARE
    total_leads INTEGER;
    total_mentorados INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_leads FROM leads;
    SELECT COUNT(*) INTO total_mentorados FROM mentorados;

    RAISE NOTICE 'Leads encontrados: %, Mentorados encontrados: %', total_leads, total_mentorados;

    -- Se não há leads, criar alguns de exemplo
    IF total_leads = 0 THEN
        INSERT INTO leads (nome_completo, email, telefone, empresa, cargo, origem, status, valor_potencial, observacoes) VALUES
        ('João Silva Santos', 'joao.silva@techcorp.com', '(11) 99999-1001', 'TechCorp Solutions', 'CEO', 'linkedin', 'cliente', 8500.00, 'Cliente fechado mês passado'),
        ('Maria Fernanda Costa', 'maria.costa@startup.com', '(11) 99999-1002', 'Startup Inovadora', 'Founder', 'instagram', 'proposta_enviada', 12000.00, 'Proposta de mentoria empresarial'),
        ('Pedro Henrique Oliveira', 'pedro@consulting.com', '(11) 99999-1003', 'PH Consulting', 'Consultor', 'google', 'cliente', 6500.00, 'Segundo ciclo de mentoria'),
        ('Ana Paula Rodrigues', 'ana.rodrigues@gmail.com', '(11) 99999-1004', null, 'Coach', 'facebook', 'call_agendada', 4500.00, 'Call marcada para esta semana'),
        ('Carlos Eduardo Mendes', 'carlos@designstudio.com', '(11) 99999-1005', 'Design Studio', 'Diretor', 'indicacao', 'cliente', 9200.00, 'Fechou pacote completo'),
        ('Juliana Alves Lima', 'juliana@ecommerce.com', '(11) 99999-1006', 'E-commerce Plus', 'CMO', 'linkedin', 'nao_vendida', 7800.00, 'Não fechou por questões de timing'),
        ('Roberto Carlos Silva', 'roberto@agency.com', '(11) 99999-1007', 'Digital Agency', 'Owner', 'google', 'cliente', 11500.00, 'Cliente VIP ativo'),
        ('Fernanda Santos Pereira', 'fernanda@health.com', '(11) 99999-1008', 'Health Tech', 'CEO', 'instagram', 'call_agendada', 15000.00, 'Interessada em mentoria executiva'),
        ('Marcos Antonio Costa', 'marcos@finance.com', '(11) 99999-1009', 'Finance Solutions', 'CFO', 'indicacao', 'cliente', 8900.00, 'Renovação automática'),
        ('Beatriz Oliveira Santos', 'beatriz@retail.com', '(11) 99999-1010', 'Retail Innovation', 'Gerente', 'facebook', 'qualificado', 5200.00, 'Em processo de qualificação');

        RAISE NOTICE 'Leads de exemplo criados!';
    END IF;
END $$;

-- Agora vamos criar eventos de call distribuídos pelos últimos 6 meses
-- Isso vai popular as métricas do Social Seller

WITH lead_sample AS (
    SELECT id, nome_completo FROM leads ORDER BY RANDOM() LIMIT 15
),
mentorado_sample AS (
    SELECT id, nome_completo FROM mentorados ORDER BY RANDOM() LIMIT 10
),
date_series AS (
    SELECT
        generate_series(
            NOW() - INTERVAL '6 months',
            NOW() + INTERVAL '1 month',
            INTERVAL '3 days'
        )::timestamp with time zone as call_date
),
call_events AS (
    -- Calls com leads
    SELECT
        l.id as lead_id,
        null::uuid as mentorado_id,
        'Call - ' || l.nome_completo as title,
        'Call comercial com ' || l.nome_completo as description,
        d.call_date as start_datetime,
        d.call_date + INTERVAL '1 hour' as end_datetime,
        CASE
            WHEN RANDOM() < 0.12 THEN 'no_show'
            WHEN RANDOM() < 0.35 THEN 'vendida'
            WHEN RANDOM() < 0.55 THEN 'nao_vendida'
            WHEN RANDOM() < 0.75 THEN 'aguardando_resposta'
            ELSE 'realizada'
        END as call_status,
        CASE
            WHEN RANDOM() < 0.35 THEN (RANDOM() * 10000 + 3000)::DECIMAL(10,2)
            ELSE NULL
        END as sale_value,
        'Call gerada automaticamente para métricas' as result_notes
    FROM lead_sample l
    CROSS JOIN (
        SELECT call_date FROM date_series
        WHERE RANDOM() < 0.15  -- 15% chance por data
        ORDER BY RANDOM()
        LIMIT 3
    ) d

    UNION ALL

    -- Calls com mentorados
    SELECT
        null::uuid as lead_id,
        m.id as mentorado_id,
        'Mentoria - ' || m.nome_completo as title,
        'Sessão de mentoria com ' || m.nome_completo as description,
        d.call_date as start_datetime,
        d.call_date + INTERVAL '1 hour' as end_datetime,
        CASE
            WHEN RANDOM() < 0.08 THEN 'no_show'
            WHEN RANDOM() < 0.25 THEN 'vendida'
            WHEN RANDOM() < 0.45 THEN 'nao_vendida'
            WHEN RANDOM() < 0.70 THEN 'aguardando_resposta'
            ELSE 'realizada'
        END as call_status,
        CASE
            WHEN RANDOM() < 0.25 THEN (RANDOM() * 8000 + 2000)::DECIMAL(10,2)
            ELSE NULL
        END as sale_value,
        'Mentoria gerada automaticamente para métricas' as result_notes
    FROM mentorado_sample m
    CROSS JOIN (
        SELECT call_date FROM date_series
        WHERE RANDOM() < 0.12  -- 12% chance por data
        ORDER BY RANDOM()
        LIMIT 2
    ) d
)
INSERT INTO calendar_events (
    title,
    description,
    start_datetime,
    end_datetime,
    lead_id,
    mentorado_id,
    call_status,
    sale_value,
    result_notes,
    all_day
)
SELECT
    title,
    description,
    start_datetime,
    end_datetime,
    lead_id,
    mentorado_id,
    call_status,
    -- Ajustar sale_value baseado no status
    CASE
        WHEN call_status = 'vendida' THEN COALESCE(sale_value, (RANDOM() * 8000 + 2000)::DECIMAL(10,2))
        ELSE NULL
    END,
    result_notes,
    false
FROM call_events
ON CONFLICT DO NOTHING;

-- Atualizar alguns eventos existentes que podem ser calls
UPDATE calendar_events
SET
    call_status = CASE
        WHEN RANDOM() < 0.15 THEN 'no_show'
        WHEN RANDOM() < 0.35 THEN 'vendida'
        WHEN RANDOM() < 0.55 THEN 'nao_vendida'
        WHEN RANDOM() < 0.75 THEN 'aguardando_resposta'
        ELSE 'realizada'
    END,
    sale_value = CASE
        WHEN RANDOM() < 0.30 THEN (RANDOM() * 6000 + 1500)::DECIMAL(10,2)
        ELSE NULL
    END,
    result_notes = 'Status atualizado automaticamente'
WHERE (
    title ILIKE '%call%' OR
    title ILIKE '%mentoria%' OR
    description ILIKE '%call%' OR
    mentorado_id IS NOT NULL
) AND call_status IS NULL;

-- Ajustar sale_value para calls marcadas como vendida
UPDATE calendar_events
SET sale_value = (RANDOM() * 8000 + 2000)::DECIMAL(10,2)
WHERE call_status = 'vendida' AND sale_value IS NULL;

-- Limpar sale_value para calls não vendidas
UPDATE calendar_events
SET sale_value = NULL
WHERE call_status IN ('nao_vendida', 'no_show', 'realizada', 'aguardando_resposta');

-- Mostrar estatísticas finais
SELECT
    'Dados populados com sucesso!' as status,
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE call_status = 'vendida') as vendidas,
    COUNT(*) FILTER (WHERE call_status = 'no_show') as no_shows,
    SUM(sale_value) as total_vendas
FROM calendar_events
WHERE call_status IS NOT NULL;

-- Verificar métricas por mês
SELECT
    TO_CHAR(month_year, 'YYYY-MM') as mes,
    total_calls,
    calls_vendidas,
    taxa_conversao,
    total_vendas
FROM social_seller_metrics
ORDER BY month_year DESC
LIMIT 6;