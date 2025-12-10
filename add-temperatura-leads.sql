-- ========================================
-- ADICIONAR CAMPO TEMPERATURA AOS LEADS
-- ========================================

-- Adicionar coluna temperatura aos leads
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS temperatura VARCHAR(20) DEFAULT 'morno' CHECK (
  temperatura IN ('quente', 'morno', 'frio')
);

-- Atualizar status constraint para incluir 'agendado'
ALTER TABLE leads
DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE leads
ADD CONSTRAINT leads_status_check CHECK (
  status IN ('novo', 'contactado', 'agendado', 'quente', 'call_agendada', 'proposta_enviada', 'vendido', 'perdido', 'no-show')
);

-- Adicionar outros campos úteis que podem estar faltando
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS valor_vendido DECIMAL(10,2) DEFAULT 0;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS valor_arrecadado DECIMAL(10,2) DEFAULT 0;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS convertido_em TIMESTAMP WITH TIME ZONE;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS next_followup_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS prioridade VARCHAR(20) DEFAULT 'media' CHECK (
  prioridade IN ('alta', 'media', 'baixa')
);

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;

-- Criar índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_leads_temperatura ON leads(temperatura);
CREATE INDEX IF NOT EXISTS idx_leads_prioridade ON leads(prioridade);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON leads(lead_score);
CREATE INDEX IF NOT EXISTS idx_leads_valor_vendido ON leads(valor_vendido);
CREATE INDEX IF NOT EXISTS idx_leads_status_updated_at ON leads(status_updated_at);

-- Atualizar função de trigger para incluir status_updated_at
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Se o status mudou, atualizar status_updated_at
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_updated_at = NOW();

    -- Se vendido, atualizar convertido_em
    IF NEW.status = 'vendido' AND OLD.status != 'vendido' THEN
      NEW.convertido_em = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Atualizar view de estatísticas para incluir temperatura
CREATE OR REPLACE VIEW leads_stats_extended AS
SELECT
  status,
  temperatura,
  COUNT(*) as quantidade,
  SUM(valor_potencial) as valor_total_potencial,
  SUM(valor_vendido) as valor_total_vendido,
  AVG(valor_potencial) as valor_medio_potencial,
  AVG(lead_score) as score_medio
FROM leads
GROUP BY status, temperatura
ORDER BY
  CASE status
    WHEN 'novo' THEN 1
    WHEN 'contactado' THEN 2
    WHEN 'agendado' THEN 3
    WHEN 'quente' THEN 4
    WHEN 'call_agendada' THEN 5
    WHEN 'proposta_enviada' THEN 6
    WHEN 'vendido' THEN 7
    WHEN 'perdido' THEN 8
    WHEN 'no-show' THEN 9
  END,
  CASE temperatura
    WHEN 'quente' THEN 1
    WHEN 'morno' THEN 2
    WHEN 'frio' THEN 3
  END;

-- Atualizar leads existentes com temperaturas baseadas no status
UPDATE leads SET temperatura =
  CASE
    WHEN status IN ('vendido', 'call_agendada', 'proposta_enviada') THEN 'quente'
    WHEN status IN ('qualificado', 'agendado', 'contactado') THEN 'morno'
    ELSE 'frio'
  END
WHERE temperatura = 'morno'; -- só atualizar os que ainda estão com o default

-- Comentários
COMMENT ON COLUMN leads.temperatura IS 'Temperatura do lead: quente, morno ou frio';
COMMENT ON COLUMN leads.valor_vendido IS 'Valor efetivamente vendido para este lead';
COMMENT ON COLUMN leads.valor_arrecadado IS 'Valor já recebido/arrecadado deste lead';
COMMENT ON COLUMN leads.convertido_em IS 'Data e hora da conversão/venda';
COMMENT ON COLUMN leads.status_updated_at IS 'Última vez que o status foi atualizado';
COMMENT ON COLUMN leads.next_followup_date IS 'Próxima data de follow-up agendada';
COMMENT ON COLUMN leads.prioridade IS 'Prioridade do lead: alta, media, baixa';
COMMENT ON COLUMN leads.lead_score IS 'Score do lead (0-100)';

SELECT 'Campo temperatura e melhorias adicionadas aos leads com sucesso!' as status;