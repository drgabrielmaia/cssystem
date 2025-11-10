-- ========================================
-- MIGRAÇÃO: Separar valores vendidos/arrecadados dos leads
-- ========================================
-- Criar tabela secundária para histórico de vendas dos leads
-- Isso permite controle temporal e histórico completo

-- 1. Criar nova tabela de vendas dos leads
CREATE TABLE IF NOT EXISTS lead_vendas (
    id SERIAL PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    valor_vendido DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_arrecadado DECIMAL(10,2) NOT NULL DEFAULT 0,
    data_venda DATE NOT NULL,
    data_arrecadacao DATE,
    metodo_pagamento VARCHAR(50), -- pix, cartao, boleto, transferencia
    parcelas INTEGER DEFAULT 1,
    observacoes TEXT,
    tipo_venda VARCHAR(30) DEFAULT 'direta', -- direta, upsell, renovacao
    comissao_percentual DECIMAL(5,2) DEFAULT 0, -- % de comissão
    comissao_valor DECIMAL(10,2) DEFAULT 0, -- valor fixo da comissão
    vendedor_responsavel VARCHAR(100), -- quem fechou a venda
    status_pagamento VARCHAR(20) DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'pago', 'parcial', 'cancelado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_lead_vendas_lead_id ON lead_vendas(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_vendas_data_venda ON lead_vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_lead_vendas_status_pagamento ON lead_vendas(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_lead_vendas_vendedor ON lead_vendas(vendedor_responsavel);

-- 3. Migrar dados existentes dos leads para a nova tabela
-- Só migrar leads que têm valor_vendido > 0 ou valor_arrecadado > 0
INSERT INTO lead_vendas (
    lead_id,
    valor_vendido,
    valor_arrecadado,
    data_venda,
    data_arrecadacao,
    status_pagamento,
    observacoes
)
SELECT
    id as lead_id,
    COALESCE(valor_vendido, 0) as valor_vendido,
    COALESCE(valor_arrecadado, 0) as valor_arrecadado,
    -- Se não tem data_primeiro_contato, usar data de criação
    COALESCE(data_primeiro_contato::date, created_at::date) as data_venda,
    -- Data de arrecadação só se tem valor arrecadado
    CASE
        WHEN valor_arrecadado > 0 THEN COALESCE(data_primeiro_contato::date, created_at::date)
        ELSE NULL
    END as data_arrecadacao,
    -- Status baseado nos valores
    CASE
        WHEN COALESCE(valor_arrecadado, 0) >= COALESCE(valor_vendido, 0) AND valor_vendido > 0 THEN 'pago'
        WHEN valor_arrecadado > 0 AND valor_arrecadado < valor_vendido THEN 'parcial'
        WHEN valor_vendido > 0 AND COALESCE(valor_arrecadado, 0) = 0 THEN 'pendente'
        ELSE 'pendente'
    END as status_pagamento,
    'Migração automática dos dados existentes' as observacoes
FROM leads
WHERE (valor_vendido > 0 OR valor_arrecadado > 0)
ON CONFLICT DO NOTHING;

-- 4. Adicionar campos de controle temporal aos leads
-- Manter campos existentes por compatibilidade, mas adicionar novos
ALTER TABLE leads ADD COLUMN IF NOT EXISTS convertido_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS origem_detalhada TEXT; -- Facebook Ads, Google Ads, Indicação Nome X
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100); -- para tracking
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0; -- pontuação do lead
ALTER TABLE leads ADD COLUMN IF NOT EXISTS temperatura VARCHAR(20) DEFAULT 'frio' CHECK (temperatura IN ('frio', 'morno', 'quente'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS probabilidade_compra INTEGER DEFAULT 0 CHECK (probabilidade_compra >= 0 AND probabilidade_compra <= 100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS valor_estimado DECIMAL(10,2); -- valor estimado da venda

-- 5. Atualizar campo convertido_em para leads vendidos
UPDATE leads
SET convertido_em = data_primeiro_contato
WHERE status = 'vendido' AND convertido_em IS NULL;

-- 6. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_lead_vendas_updated_at ON lead_vendas;
CREATE TRIGGER update_lead_vendas_updated_at
    BEFORE UPDATE ON lead_vendas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. View para facilitar consultas dos totais por lead
CREATE OR REPLACE VIEW leads_com_vendas AS
SELECT
    l.*,
    COALESCE(v.total_vendido, 0) as total_vendido_historico,
    COALESCE(v.total_arrecadado, 0) as total_arrecadado_historico,
    COALESCE(v.quantidade_vendas, 0) as quantidade_vendas,
    v.ultima_venda,
    v.primeira_venda
FROM leads l
LEFT JOIN (
    SELECT
        lead_id,
        SUM(valor_vendido) as total_vendido,
        SUM(valor_arrecadado) as total_arrecadado,
        COUNT(*) as quantidade_vendas,
        MAX(data_venda) as ultima_venda,
        MIN(data_venda) as primeira_venda
    FROM lead_vendas
    GROUP BY lead_id
) v ON l.id = v.lead_id;

-- 8. View para dashboard com filtros de data
CREATE OR REPLACE VIEW leads_dashboard_stats AS
SELECT
    DATE_TRUNC('week', l.data_primeiro_contato::date) as semana,
    DATE_TRUNC('month', l.data_primeiro_contato::date) as mes,
    DATE_TRUNC('year', l.data_primeiro_contato::date) as ano,
    l.status,
    l.origem,
    l.temperatura,
    COUNT(*) as quantidade_leads,
    COUNT(CASE WHEN l.status = 'vendido' THEN 1 END) as leads_convertidos,
    COALESCE(SUM(lv.valor_vendido), 0) as valor_total_vendido,
    COALESCE(SUM(lv.valor_arrecadado), 0) as valor_total_arrecadado,
    ROUND(
        CASE
            WHEN COUNT(*) > 0 THEN
                (COUNT(CASE WHEN l.status = 'vendido' THEN 1 END)::decimal / COUNT(*)::decimal) * 100
            ELSE 0
        END, 2
    ) as taxa_conversao
FROM leads l
LEFT JOIN lead_vendas lv ON l.id = lv.lead_id
WHERE l.data_primeiro_contato IS NOT NULL
GROUP BY
    DATE_TRUNC('week', l.data_primeiro_contato::date),
    DATE_TRUNC('month', l.data_primeiro_contato::date),
    DATE_TRUNC('year', l.data_primeiro_contato::date),
    l.status, l.origem, l.temperatura;

-- 9. View para pendências financeiras (integração com dívidas)
CREATE OR REPLACE VIEW dashboard_financeiro AS
SELECT
    'leads' as tipo,
    'Vendas Pendentes' as categoria,
    SUM(CASE WHEN lv.status_pagamento = 'pendente' THEN lv.valor_vendido ELSE 0 END) as valor_pendente,
    COUNT(CASE WHEN lv.status_pagamento = 'pendente' THEN 1 END) as quantidade_pendente,
    DATE_TRUNC('month', lv.data_venda) as periodo
FROM lead_vendas lv
WHERE lv.data_venda >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', lv.data_venda)

UNION ALL

SELECT
    'dividas' as tipo,
    'Mensalidades Pendentes' as categoria,
    SUM(d.valor) as valor_pendente,
    COUNT(*) as quantidade_pendente,
    DATE_TRUNC('month', d.data_vencimento) as periodo
FROM dividas d
WHERE d.status = 'pendente'
  AND d.data_vencimento >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', d.data_vencimento);

-- 10. RLS (Row Level Security) para lead_vendas
ALTER TABLE lead_vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON lead_vendas
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON lead_vendas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON lead_vendas
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON lead_vendas
    FOR DELETE USING (true);

-- 11. Comentários para documentação
COMMENT ON TABLE lead_vendas IS 'Histórico de vendas e arrecadações dos leads - permite múltiplas vendas por lead';
COMMENT ON COLUMN lead_vendas.lead_id IS 'Referência ao lead que gerou esta venda';
COMMENT ON COLUMN lead_vendas.valor_vendido IS 'Valor total da venda';
COMMENT ON COLUMN lead_vendas.valor_arrecadado IS 'Valor efetivamente recebido';
COMMENT ON COLUMN lead_vendas.data_venda IS 'Data em que a venda foi fechada';
COMMENT ON COLUMN lead_vendas.data_arrecadacao IS 'Data em que o valor foi recebido';
COMMENT ON COLUMN lead_vendas.tipo_venda IS 'Tipo da venda: direta, upsell, renovação';
COMMENT ON COLUMN lead_vendas.comissao_percentual IS 'Percentual de comissão sobre a venda';
COMMENT ON COLUMN lead_vendas.status_pagamento IS 'Status do pagamento: pendente, pago, parcial, cancelado';

-- 12. Verificação final
SELECT
    'MIGRAÇÃO CONCLUÍDA' as status,
    (SELECT COUNT(*) FROM leads) as total_leads,
    (SELECT COUNT(*) FROM lead_vendas) as total_vendas_migradas,
    (SELECT SUM(valor_vendido) FROM lead_vendas) as valor_total_migrado,
    (SELECT COUNT(*) FROM leads WHERE status = 'vendido') as leads_vendidos,
    (SELECT COUNT(DISTINCT lead_id) FROM lead_vendas) as leads_com_vendas;

-- ========================================
-- NOTA IMPORTANTE:
-- Após verificar que tudo está funcionando,
-- você pode remover os campos valor_vendido e valor_arrecadado
-- da tabela leads, mantendo apenas na lead_vendas:
--
-- ALTER TABLE leads DROP COLUMN valor_vendido;
-- ALTER TABLE leads DROP COLUMN valor_arrecadado;
-- ========================================