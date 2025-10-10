-- ========================================
-- ATUALIZAÇÃO DO SISTEMA DE LEADS
-- ========================================

-- 1. Atualizar leads com no-show baseado nos calendar_events
-- Primeiro, atualizamos leads que têm calls com status no_show
UPDATE leads
SET status = 'no-show'
WHERE id IN (
  SELECT DISTINCT l.id
  FROM leads l
  JOIN calendar_events ce ON ce.lead_id = l.id
  WHERE ce.call_status = 'no_show'
  AND l.status NOT IN ('vendido', 'perdido') -- Não sobrescrever vendidos/perdidos
);

-- 2. Atualizar leads que foram vendidos baseado nas calls
UPDATE leads
SET status = 'vendido'
WHERE id IN (
  SELECT DISTINCT l.id
  FROM leads l
  JOIN calendar_events ce ON ce.lead_id = l.id
  WHERE ce.call_status = 'vendida'
  AND l.status != 'vendido' -- Evitar updates desnecessários
);

-- 3. Adicionar novas colunas para valores
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS valor_vendido DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS valor_arrecadado DECIMAL(10,2);

-- 4. Migrar dados do valor_potencial para valor_vendido
UPDATE leads
SET valor_vendido = valor_potencial
WHERE valor_potencial IS NOT NULL AND valor_vendido IS NULL;

-- 5. Para leads vendidos, pegar o valor das calls
UPDATE leads
SET valor_vendido = (
  SELECT ce.sale_value
  FROM calendar_events ce
  WHERE ce.lead_id = leads.id
  AND ce.call_status = 'vendida'
  AND ce.sale_value IS NOT NULL
  ORDER BY ce.start_datetime DESC
  LIMIT 1
)
WHERE status = 'vendido'
AND EXISTS (
  SELECT 1 FROM calendar_events ce
  WHERE ce.lead_id = leads.id
  AND ce.call_status = 'vendida'
  AND ce.sale_value IS NOT NULL
);

-- 6. Recriar a view de estatísticas com os novos campos
CREATE OR REPLACE VIEW leads_stats AS
SELECT
  status,
  COUNT(*) as quantidade,
  SUM(valor_vendido) as valor_total_vendido,
  SUM(valor_arrecadado) as valor_total_arrecadado,
  AVG(valor_vendido) as valor_medio_vendido,
  AVG(valor_arrecadado) as valor_medio_arrecadado
FROM leads
GROUP BY status
ORDER BY
  CASE status
    WHEN 'novo' THEN 1
    WHEN 'contactado' THEN 2
    WHEN 'qualificado' THEN 3
    WHEN 'call_agendada' THEN 4
    WHEN 'proposta_enviada' THEN 5
    WHEN 'vendido' THEN 6
    WHEN 'perdido' THEN 7
    WHEN 'no-show' THEN 8
  END;

-- 7. Criar view para acompanhar status dos leads vs calls
CREATE OR REPLACE VIEW leads_calls_status AS
SELECT
  l.id as lead_id,
  l.nome_completo,
  l.status as lead_status,
  l.valor_vendido,
  l.valor_arrecadado,
  ce.id as call_id,
  ce.title as call_title,
  ce.start_datetime as call_date,
  ce.call_status,
  ce.sale_value as call_value,
  ce.result_notes,
  CASE
    WHEN ce.call_status = 'vendida' AND l.status != 'vendido' THEN 'DESATUALIZADO: Lead deveria ser vendido'
    WHEN ce.call_status = 'no_show' AND l.status != 'no-show' THEN 'DESATUALIZADO: Lead deveria ser no-show'
    WHEN ce.call_status IN ('nao_vendida', 'perdida') AND l.status NOT IN ('perdido', 'no-show') THEN 'VERIFICAR: Call não vendida'
    ELSE 'OK'
  END as sync_status
FROM leads l
LEFT JOIN calendar_events ce ON ce.lead_id = l.id
WHERE ce.call_status IS NOT NULL
ORDER BY l.updated_at DESC, ce.start_datetime DESC;

-- 8. Comentários nas novas colunas
COMMENT ON COLUMN leads.valor_vendido IS 'Valor total que o cliente irá pagar (pode ser parcelado)';
COMMENT ON COLUMN leads.valor_arrecadado IS 'Valor já recebido/arrecadado até o momento';
COMMENT ON VIEW leads_calls_status IS 'View para monitorar sincronização entre status de leads e calls';

SELECT 'Sistema de leads atualizado com sucesso!' as status;