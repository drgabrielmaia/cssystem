-- ========================================
-- SISTEMA SOCIAL SELLER - CUSTOMER SUCCESS
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

-- Inserir alguns dados de exemplo para testar eventos existentes
UPDATE calendar_events
SET
  call_status = status_random,
  sale_value = CASE
    WHEN status_random = 'vendida' THEN (RANDOM() * 5000 + 1000)::DECIMAL(10,2)
    ELSE NULL
  END
FROM (
  SELECT
    id,
    CASE
      WHEN RANDOM() < 0.2 THEN 'no_show'
      WHEN RANDOM() < 0.4 THEN 'vendida'
      WHEN RANDOM() < 0.6 THEN 'nao_vendida'
      WHEN RANDOM() < 0.8 THEN 'aguardando_resposta'
      ELSE 'realizada'
    END as status_random
  FROM calendar_events
  WHERE title ILIKE '%Call%' OR description ILIKE '%call%'
) random_status
WHERE calendar_events.id = random_status.id;

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
  AND (title ILIKE '%call%' OR title ILIKE '%vendas%' OR mentorado_id IS NOT NULL)
GROUP BY DATE_TRUNC('month', start_datetime)
ORDER BY month_year DESC;

-- Comentários
COMMENT ON COLUMN calendar_events.call_status IS 'Status da call: agendada, realizada, no_show, vendida, nao_vendida, aguardando_resposta';
COMMENT ON COLUMN calendar_events.sale_value IS 'Valor da venda quando status = vendida';
COMMENT ON COLUMN calendar_events.result_notes IS 'Observações sobre o resultado da call';
COMMENT ON VIEW social_seller_metrics IS 'Métricas agregadas para o dashboard Social Seller';

-- Inserir alguns eventos de call para demonstração
INSERT INTO calendar_events (title, description, start_datetime, end_datetime, mentorado_id, call_status, sale_value, result_notes)
SELECT
  'Call - ' || m.nome_completo,
  'Call comercial com ' || m.nome_completo,
  start_time,
  start_time + INTERVAL '1 hour', -- Sempre 1 hora depois do início
  m.id,
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
  'Call gerada automaticamente para demonstração'
FROM (
  SELECT
    m.*,
    NOW() - INTERVAL '60 days' + (RANDOM() * INTERVAL '90 days') as start_time
  FROM mentorados m
  WHERE RANDOM() < 0.3 -- Inserir para ~30% dos mentorados
  LIMIT 20
) m
ON CONFLICT DO NOTHING;