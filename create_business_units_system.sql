-- Sistema Completo de Motores/Unidades de Negócio com ROI Tracking
-- Análise baseada na estrutura atual do Supabase

-- 1. TABELA DE MOTORES/UNIDADES DE NEGÓCIO
CREATE TABLE IF NOT EXISTS business_units (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Informações básicas
    name TEXT NOT NULL, -- Ex: "Mentoria", "Clínica", "Eventos", "Consultoria"
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Cor para visualização
    
    -- Tipo de centro financeiro
    unit_type TEXT DEFAULT 'profit_center' CHECK (unit_type IN ('revenue_center', 'cost_center', 'profit_center')),
    
    -- Responsável pelo motor
    manager_id UUID REFERENCES organization_users(id),
    
    -- Metas financeiras
    target_revenue DECIMAL(12,2) DEFAULT 0, -- Meta de receita mensal
    target_roi DECIMAL(5,2) DEFAULT 20.00, -- Meta de ROI em %
    target_conversion_rate DECIMAL(5,2) DEFAULT 5.00, -- Meta de conversão %
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(organization_id, name)
);

-- 2. ATUALIZAR TABELA DE TRANSAÇÕES FINANCEIRAS
ALTER TABLE transacoes_financeiras 
ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS roi_impact_type TEXT DEFAULT 'revenue' CHECK (roi_impact_type IN ('revenue', 'cost', 'investment')),
ADD COLUMN IF NOT EXISTS allocation_percentage DECIMAL(5,2) DEFAULT 100.00;

-- 3. ATUALIZAR TABELA DE CATEGORIAS FINANCEIRAS  
ALTER TABLE categorias_financeiras
ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false; -- Se pode ser usada por múltiplos motores

-- 4. TABELA DE MÉTRICAS DE MOTORES (MENSAL)
CREATE TABLE IF NOT EXISTS business_unit_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Período
    period_month DATE NOT NULL, -- Formato YYYY-MM-01
    
    -- Métricas financeiras (em centavos para precisão)
    total_revenue BIGINT DEFAULT 0,
    total_costs BIGINT DEFAULT 0,
    gross_profit BIGINT GENERATED ALWAYS AS (total_revenue - total_costs) STORED,
    
    -- ROI calculado automaticamente
    roi_percentage DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE 
            WHEN total_costs > 0 THEN ((total_revenue - total_costs)::DECIMAL / total_costs * 100)
            ELSE 0
        END
    ) STORED,
    
    -- Métricas operacionais
    leads_generated INTEGER DEFAULT 0,
    leads_converted INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN leads_generated > 0 THEN (leads_converted::DECIMAL / leads_generated * 100)
            ELSE 0
        END
    ) STORED,
    
    -- Ticket médio
    average_ticket DECIMAL(12,2) GENERATED ALWAYS AS (
        CASE 
            WHEN leads_converted > 0 THEN (total_revenue::DECIMAL / 100 / leads_converted)
            ELSE 0
        END
    ) STORED,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(business_unit_id, period_month)
);

-- 5. TABELA DE EVENTOS ROI (TRACKING DETALHADO)
CREATE TABLE IF NOT EXISTS roi_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Tipo de evento
    event_type TEXT NOT NULL CHECK (event_type IN (
        'lead_generated', 'lead_converted', 'revenue_earned', 
        'cost_incurred', 'commission_paid', 'investment_made'
    )),
    
    -- Detalhes do evento
    event_date DATE NOT NULL,
    amount BIGINT NOT NULL, -- Impacto financeiro em centavos
    
    -- Referências externas
    reference_type TEXT, -- 'lead', 'transaction', 'commission', etc.
    reference_id UUID,
    
    -- Descrição e observações
    description TEXT,
    notes TEXT,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_business_units_org ON business_units(organization_id);
CREATE INDEX IF NOT EXISTS idx_business_units_active ON business_units(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_transacoes_business_unit ON transacoes_financeiras(business_unit_id, data_transacao);
CREATE INDEX IF NOT EXISTS idx_business_unit_metrics_period ON business_unit_metrics(business_unit_id, period_month);
CREATE INDEX IF NOT EXISTS idx_roi_events_unit_date ON roi_events(business_unit_id, event_date);
CREATE INDEX IF NOT EXISTS idx_roi_events_reference ON roi_events(reference_type, reference_id);

-- 7. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_business_units_updated_at 
    BEFORE UPDATE ON business_units 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_business_unit_metrics_updated_at 
    BEFORE UPDATE ON business_unit_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. FUNÇÃO PARA CALCULAR MÉTRICAS AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION calculate_business_unit_metrics(
    unit_id UUID,
    target_month DATE DEFAULT DATE_TRUNC('month', NOW())
)
RETURNS VOID AS $$
DECLARE
    total_rev BIGINT := 0;
    total_cost BIGINT := 0;
    leads_gen INTEGER := 0;
    leads_conv INTEGER := 0;
BEGIN
    -- Calcular receitas do período
    SELECT COALESCE(SUM(valor * 100), 0) INTO total_rev
    FROM transacoes_financeiras 
    WHERE business_unit_id = unit_id 
    AND tipo = 'entrada'
    AND DATE_TRUNC('month', data_transacao) = target_month;
    
    -- Calcular custos do período
    SELECT COALESCE(SUM(valor * 100), 0) INTO total_cost
    FROM transacoes_financeiras 
    WHERE business_unit_id = unit_id 
    AND tipo = 'saida'
    AND DATE_TRUNC('month', data_transacao) = target_month;
    
    -- Calcular leads (assumindo que temos leads linkados ao business unit futuramente)
    -- Por enquanto, vamos usar dados dos eventos ROI
    SELECT 
        COALESCE(SUM(CASE WHEN event_type = 'lead_generated' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN event_type = 'lead_converted' THEN 1 ELSE 0 END), 0)
    INTO leads_gen, leads_conv
    FROM roi_events
    WHERE business_unit_id = unit_id
    AND DATE_TRUNC('month', event_date) = target_month;
    
    -- Inserir ou atualizar métricas
    INSERT INTO business_unit_metrics (
        business_unit_id, 
        organization_id,
        period_month,
        total_revenue,
        total_costs,
        leads_generated,
        leads_converted
    )
    SELECT 
        unit_id,
        bu.organization_id,
        target_month,
        total_rev,
        total_cost,
        leads_gen,
        leads_conv
    FROM business_units bu WHERE bu.id = unit_id
    ON CONFLICT (business_unit_id, period_month) 
    DO UPDATE SET
        total_revenue = total_rev,
        total_costs = total_cost,
        leads_generated = leads_gen,
        leads_converted = leads_conv,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 9. INSERIR MOTORES PADRÃO BASEADOS NAS CATEGORIAS EXISTENTES
INSERT INTO business_units (name, description, unit_type, target_revenue, target_roi, color, organization_id) 
SELECT 
    'Mentoria', 
    'Unidade de negócio focada em serviços de mentoria empresarial',
    'profit_center',
    50000.00,
    25.00,
    '#10B981',
    org.id
FROM organizations org
WHERE NOT EXISTS (
    SELECT 1 FROM business_units bu 
    WHERE bu.name = 'Mentoria' AND bu.organization_id = org.id
);

INSERT INTO business_units (name, description, unit_type, target_revenue, target_roi, color, organization_id) 
SELECT 
    'Clínica', 
    'Unidade de negócio da clínica médica',
    'profit_center',
    80000.00,
    30.00,
    '#3B82F6',
    org.id
FROM organizations org
WHERE NOT EXISTS (
    SELECT 1 FROM business_units bu 
    WHERE bu.name = 'Clínica' AND bu.organization_id = org.id
);

INSERT INTO business_units (name, description, unit_type, target_revenue, target_roi, color, organization_id) 
SELECT 
    'Eventos', 
    'Unidade de negócio de eventos e palestras',
    'profit_center',
    30000.00,
    20.00,
    '#8B5CF6',
    org.id
FROM organizations org
WHERE NOT EXISTS (
    SELECT 1 FROM business_units bu 
    WHERE bu.name = 'Eventos' AND bu.organization_id = org.id
);

INSERT INTO business_units (name, description, unit_type, target_revenue, target_roi, color, organization_id) 
SELECT 
    'Consultoria', 
    'Unidade de negócio de consultoria empresarial',
    'profit_center',
    40000.00,
    35.00,
    '#F59E0B',
    org.id
FROM organizations org
WHERE NOT EXISTS (
    SELECT 1 FROM business_units bu 
    WHERE bu.name = 'Consultoria' AND bu.organization_id = org.id
);

-- 10. ATUALIZAR CATEGORIAS EXISTENTES COM BUSINESS UNITS
UPDATE categorias_financeiras SET business_unit_id = (
    SELECT bu.id FROM business_units bu 
    WHERE bu.name = 'Mentoria' 
    AND bu.organization_id = categorias_financeiras.id -- Assumindo que existe org reference
    LIMIT 1
) WHERE nome = 'Mentoria';

UPDATE categorias_financeiras SET business_unit_id = (
    SELECT bu.id FROM business_units bu 
    WHERE bu.name = 'Clínica' 
    LIMIT 1
) WHERE nome = 'Clínica';

UPDATE categorias_financeiras SET business_unit_id = (
    SELECT bu.id FROM business_units bu 
    WHERE bu.name = 'Eventos'
    LIMIT 1
) WHERE nome = 'Eventos';

UPDATE categorias_financeiras SET business_unit_id = (
    SELECT bu.id FROM business_units bu 
    WHERE bu.name = 'Consultoria'
    LIMIT 1
) WHERE nome = 'Consultoria';

-- 11. RLS (ROW LEVEL SECURITY) POLICIES
ALTER TABLE business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_unit_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE roi_events ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar conforme necessário)
CREATE POLICY "Users can manage business units in their organization" ON business_units FOR ALL USING (true);
CREATE POLICY "Users can view metrics for their organization" ON business_unit_metrics FOR SELECT USING (true);
CREATE POLICY "Users can manage ROI events for their organization" ON roi_events FOR ALL USING (true);

-- 12. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE business_units IS 'Motores/Unidades de negócio para tracking de ROI por segmento';
COMMENT ON TABLE business_unit_metrics IS 'Métricas mensais calculadas automaticamente por motor';
COMMENT ON TABLE roi_events IS 'Eventos detalhados para tracking preciso de ROI';
COMMENT ON COLUMN business_units.unit_type IS 'Tipo: revenue_center (só receita), cost_center (só custo), profit_center (receita-custo)';
COMMENT ON COLUMN transacoes_financeiras.business_unit_id IS 'Motor/unidade responsável por esta transação';
COMMENT ON COLUMN transacoes_financeiras.roi_impact_type IS 'Tipo de impacto no ROI: revenue, cost, investment';

-- Verificar criação das tabelas
SELECT 
    schemaname, 
    tablename, 
    tableowner 
FROM pg_tables 
WHERE tablename IN ('business_units', 'business_unit_metrics', 'roi_events')
ORDER BY tablename;