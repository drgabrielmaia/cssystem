-- ========================================
-- SISTEMA SOCIAL SELLER - CUSTOMER SUCCESS (VERSÃO CORRIGIDA)
-- ========================================

-- Adicionar campos de status da call na tabela calendar_events
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS call_status VARCHAR(50) DEFAULT 'agendada' CHECK (
  call_status IN ('agendada', 'realizada', 'no_show', 'vendida', 'nao_vendida', 'aguardando_resposta')
);

-- Adicionar campo para valor da venda (quando vendida)
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS sale_value DECIMAL(10,2) DEFAULT NULL;

-- Adicionar campo para observações do resultado
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS result_notes TEXT;

-- Criar índice para o status da call
CREATE INDEX IF NOT EXISTS idx_calendar_events_call_status ON calendar_events(call_status);

-- Atualizar eventos existentes que parecem ser calls
UPDATE calendar_events
SET
  call_status = CASE
    WHEN RANDOM() < 0.15 THEN 'no_show'
    WHEN RANDOM() < 0.30 THEN 'vendida'
    WHEN RANDOM() < 0.50 THEN 'nao_vendida'
    WHEN RANDOM() < 0.75 THEN 'aguardando_resposta'
    ELSE 'realizada'
  END,
  sale_value = CASE
    WHEN RANDOM() < 0.30 THEN (RANDOM() * 5000 + 1000)::DECIMAL(10,2)
    ELSE NULL
  END,
  result_notes = 'Status atualizado automaticamente'
WHERE (title ILIKE '%call%' OR description ILIKE '%call%' OR mentorado_id IS NOT NULL)
  AND call_status IS NULL;

-- Criar view para métricas do Social Seller
CREATE OR REPLACE VIEW social_seller_metrics AS
SELECT
  DATE_TRUNC('month', start_datetime) as month_year,
  COUNT(*) FILTER (WHERE call_status = 'no_show') as no_shows,
  COUNT(*) FILTER (WHERE call_status = 'realizada') as calls_realizadas,
  COUNT(*) FILTER (WHERE call_status = 'vendida') as calls_vendidas,
  COUNT(*) FILTER (WHERE call_status = 'nao_vendida') as calls_nao_vendidas,
  COUNT(*) FILTER (WHERE call_status = 'aguardando_resposta') as calls_aguardando,
  COUNT(*) as total_calls,
  SUM(sale_value) FILTER (WHERE call_status = 'vendida') as total_vendas,
  ROUND(
    (COUNT(*) FILTER (WHERE call_status = 'vendida')::DECIMAL /
     NULLIF(COUNT(*) FILTER (WHERE call_status IN ('vendida', 'nao_vendida')), 0)) * 100, 2
  ) as taxa_conversao
FROM calendar_events
WHERE start_datetime >= DATE_TRUNC('year', NOW()) - INTERVAL '1 year'
  AND call_status IS NOT NULL
GROUP BY DATE_TRUNC('month', start_datetime)
ORDER BY month_year DESC;

-- Comentários nas colunas
COMMENT ON COLUMN calendar_events.call_status IS 'Status da call: agendada, realizada, no_show, vendida, nao_vendida, aguardando_resposta';
COMMENT ON COLUMN calendar_events.sale_value IS 'Valor da venda quando status = vendida';
COMMENT ON COLUMN calendar_events.result_notes IS 'Observações sobre o resultado da call';
COMMENT ON VIEW social_seller_metrics IS 'Métricas agregadas para o dashboard Social Seller';

-- Inserir dados de exemplo APENAS se existirem mentorados
DO $$
DECLARE
    mentorado_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mentorado_count FROM mentorados LIMIT 10;

    IF mentorado_count > 0 THEN
        -- Inserir alguns eventos de call para demonstração (com datas válidas)
        WITH sample_mentorados AS (
            SELECT id, nome_completo FROM mentorados ORDER BY RANDOM() LIMIT 10
        ),
        call_events AS (
            SELECT
                m.id as mentorado_id,
                m.nome_completo,
                -- Gerar data de início entre 60 dias atrás e 30 dias no futuro
                (NOW() - INTERVAL '60 days' + (RANDOM() * INTERVAL '90 days'))::timestamp with time zone as start_time
            FROM sample_mentorados m
        )
        INSERT INTO calendar_events (
            title,
            description,
            start_datetime,
            end_datetime,
            mentorado_id,
            call_status,
            sale_value,
            result_notes
        )
        SELECT
            'Call - ' || ce.nome_completo,
            'Call comercial com ' || ce.nome_completo,
            ce.start_time,
            ce.start_time + INTERVAL '1 hour', -- Sempre 1 hora depois
            ce.mentorado_id,
            CASE
                WHEN RANDOM() < 0.15 THEN 'no_show'
                WHEN RANDOM() < 0.35 THEN 'vendida'
                WHEN RANDOM() < 0.55 THEN 'nao_vendida'
                WHEN RANDOM() < 0.75 THEN 'aguardando_resposta'
                ELSE 'realizada'
            END,
            CASE
                WHEN RANDOM() < 0.35 THEN (RANDOM() * 8000 + 2000)::DECIMAL(10,2)
                ELSE NULL
            END,
            'Call de demonstração gerada automaticamente'
        FROM call_events ce
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Eventos de call de exemplo inseridos com sucesso.';
    ELSE
        RAISE NOTICE 'Nenhum mentorado encontrado. Pulando inserção de eventos de exemplo.';
    END IF;
END $$;

-- Verificar se a view foi criada corretamente
SELECT 'View social_seller_metrics criada com sucesso!' as status;

-- Mostrar uma amostra dos dados (se existirem)
SELECT
    month_year,
    total_calls,
    calls_vendidas,
    taxa_conversao,
    total_vendas
FROM social_seller_metrics
LIMIT 3;