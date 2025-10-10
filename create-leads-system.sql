-- ========================================
-- SISTEMA DE LEADS - CUSTOMER SUCCESS
-- ========================================

-- Criar tabela de leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20),
  empresa VARCHAR(255),
  cargo VARCHAR(255),
  origem VARCHAR(100), -- facebook, instagram, google, indicacao, etc.
  status VARCHAR(50) DEFAULT 'novo' CHECK (
    status IN ('novo', 'contactado', 'qualificado', 'call_agendada', 'proposta_enviada', 'cliente', 'perdido')
  ),
  observacoes TEXT,
  valor_potencial DECIMAL(10,2),
  data_primeiro_contato TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_origem ON leads(origem);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_telefone ON leads(telefone);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- Relacionar events com leads (adicionar campo lead_id)
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

-- Criar índice para o relacionamento
CREATE INDEX IF NOT EXISTS idx_calendar_events_lead_id ON calendar_events(lead_id);

-- Modificar a lógica de identificação de calls
-- Agora uma call é identificada se tem lead_id OU mentorado_id
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
  AND (lead_id IS NOT NULL OR mentorado_id IS NOT NULL) -- É uma call se tem lead OU mentorado
  AND call_status IS NOT NULL
GROUP BY DATE_TRUNC('month', start_datetime)
ORDER BY month_year DESC;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- Desabilitar RLS temporariamente para desenvolvimento
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;

-- Inserir alguns leads de exemplo
INSERT INTO leads (nome_completo, email, telefone, empresa, cargo, origem, status, observacoes, valor_potencial) VALUES
  ('João Silva', 'joao.silva@empresa.com', '(11) 99999-1111', 'Tech Solutions', 'CEO', 'facebook', 'novo', 'Interessado em mentoria empresarial', 5000.00),
  ('Maria Santos', 'maria@startup.com', '(11) 99999-2222', 'StartupX', 'Founder', 'indicacao', 'contactado', 'Precisa de ajuda com crescimento', 8000.00),
  ('Pedro Costa', 'pedro@gmail.com', '(11) 99999-3333', null, 'Autônomo', 'instagram', 'qualificado', 'Coach pessoal interessado', 3000.00),
  ('Ana Paula', 'ana@consultoria.com', '(11) 99999-4444', 'Consultoria ABC', 'Sócia', 'google', 'call_agendada', 'Call marcada para quinta', 12000.00),
  ('Carlos Mendes', 'carlos@email.com', '(11) 99999-5555', 'Freelancer', 'Designer', 'facebook', 'proposta_enviada', 'Proposta enviada ontem', 4500.00)
ON CONFLICT DO NOTHING;

-- Comentários
COMMENT ON TABLE leads IS 'Tabela para armazenar leads do pipeline de vendas';
COMMENT ON COLUMN leads.nome_completo IS 'Nome completo do lead';
COMMENT ON COLUMN leads.origem IS 'Canal de origem do lead (facebook, instagram, google, etc.)';
COMMENT ON COLUMN leads.status IS 'Status atual no pipeline de vendas';
COMMENT ON COLUMN leads.valor_potencial IS 'Valor potencial estimado da venda';
COMMENT ON COLUMN calendar_events.lead_id IS 'ID do lead relacionado ao evento (para calls)';

-- View para estatísticas de leads
CREATE OR REPLACE VIEW leads_stats AS
SELECT
  status,
  COUNT(*) as quantidade,
  SUM(valor_potencial) as valor_total_potencial,
  AVG(valor_potencial) as valor_medio
FROM leads
GROUP BY status
ORDER BY
  CASE status
    WHEN 'novo' THEN 1
    WHEN 'contactado' THEN 2
    WHEN 'qualificado' THEN 3
    WHEN 'call_agendada' THEN 4
    WHEN 'proposta_enviada' THEN 5
    WHEN 'cliente' THEN 6
    WHEN 'perdido' THEN 7
  END;

COMMENT ON VIEW leads_stats IS 'Estatísticas dos leads por status';

SELECT 'Sistema de leads criado com sucesso!' as status;