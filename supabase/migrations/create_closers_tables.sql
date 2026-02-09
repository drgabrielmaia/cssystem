-- ====================================
-- CLOSERS/SDRs DATABASE MIGRATION
-- ====================================
-- This migration creates the closers/SDRs system similar to mentorados
-- Author: System
-- Date: 2026-02-09
-- ====================================

-- 1. Create closers table (similar to mentorados structure)
CREATE TABLE IF NOT EXISTS public.closers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic Information
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    cpf VARCHAR(14),
    rg VARCHAR(20),
    data_nascimento DATE,
    endereco TEXT,
    
    -- Authentication
    password_hash VARCHAR(255),
    status_login VARCHAR(20) DEFAULT 'ativo' CHECK (status_login IN ('ativo', 'inativo', 'bloqueado')),
    
    -- Role and Organization
    tipo_closer VARCHAR(50) DEFAULT 'sdr' CHECK (tipo_closer IN ('sdr', 'closer', 'closer_senior', 'manager')),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    -- Work Information
    data_contratacao DATE,
    data_desligamento DATE,
    status_contrato VARCHAR(20) DEFAULT 'ativo' CHECK (status_contrato IN ('ativo', 'inativo', 'ferias', 'desligado')),
    meta_mensal DECIMAL(10,2) DEFAULT 0,
    comissao_percentual DECIMAL(5,2) DEFAULT 5.00, -- Percentual de comissão padrão
    
    -- Performance Tracking
    total_vendas INTEGER DEFAULT 0,
    total_leads_atendidos INTEGER DEFAULT 0,
    conversao_rate DECIMAL(5,2) DEFAULT 0,
    pontuacao_total INTEGER DEFAULT 0,
    
    -- Additional Info
    observacoes TEXT,
    skills JSONB DEFAULT '[]'::jsonb, -- Array of skills/specializations
    horario_trabalho JSONB DEFAULT '{"inicio": "09:00", "fim": "18:00"}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create closers_vendas table (track sales by closers)
CREATE TABLE IF NOT EXISTS public.closers_vendas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    closer_id UUID NOT NULL REFERENCES public.closers(id) ON DELETE CASCADE,
    mentorado_id UUID REFERENCES public.mentorados(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    -- Sale Information
    data_venda DATE NOT NULL,
    valor_venda DECIMAL(10,2) NOT NULL,
    tipo_venda VARCHAR(50) DEFAULT 'mentoria' CHECK (tipo_venda IN ('mentoria', 'curso', 'consultoria', 'outro')),
    status_venda VARCHAR(20) DEFAULT 'confirmada' CHECK (status_venda IN ('pendente', 'confirmada', 'cancelada')),
    
    -- Commission Information
    comissao_percentual DECIMAL(5,2) NOT NULL,
    valor_comissao DECIMAL(10,2) NOT NULL,
    status_pagamento VARCHAR(20) DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'processando', 'pago', 'cancelado')),
    data_pagamento DATE,
    
    -- Additional Info
    observacoes TEXT,
    fonte_lead VARCHAR(100), -- Instagram, WhatsApp, etc.
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create closers_metas table (monthly targets)
CREATE TABLE IF NOT EXISTS public.closers_metas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    closer_id UUID NOT NULL REFERENCES public.closers(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    -- Period
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL CHECK (ano >= 2024),
    
    -- Targets
    meta_vendas_quantidade INTEGER DEFAULT 0,
    meta_vendas_valor DECIMAL(10,2) DEFAULT 0,
    meta_leads_atendidos INTEGER DEFAULT 0,
    meta_conversao_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Achieved
    vendas_realizadas INTEGER DEFAULT 0,
    valor_realizado DECIMAL(10,2) DEFAULT 0,
    leads_atendidos INTEGER DEFAULT 0,
    conversao_realizada DECIMAL(5,2) DEFAULT 0,
    
    -- Performance
    percentual_atingimento DECIMAL(5,2) DEFAULT 0,
    bonus_atingimento DECIMAL(10,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint for one meta per closer per month
    UNIQUE(closer_id, mes, ano)
);

-- 4. Create closers_atividades table (track daily activities)
CREATE TABLE IF NOT EXISTS public.closers_atividades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    closer_id UUID NOT NULL REFERENCES public.closers(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    -- Activity Information
    tipo_atividade VARCHAR(50) NOT NULL CHECK (tipo_atividade IN ('ligacao', 'whatsapp', 'email', 'reuniao', 'follow_up', 'proposta', 'outro')),
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    mentorado_id UUID REFERENCES public.mentorados(id) ON DELETE SET NULL,
    
    -- Details
    descricao TEXT,
    duracao_minutos INTEGER,
    resultado VARCHAR(50) CHECK (resultado IN ('contato_realizado', 'sem_resposta', 'agendamento', 'venda', 'recusa', 'follow_up_necessario')),
    proxima_acao VARCHAR(255),
    data_proxima_acao DATE,
    
    -- Timestamps
    data_atividade TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create closers_dashboard_access table (track dashboard access)
CREATE TABLE IF NOT EXISTS public.closers_dashboard_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    closer_id UUID NOT NULL REFERENCES public.closers(id) ON DELETE CASCADE,
    
    -- Access Information
    ip_address VARCHAR(45),
    user_agent TEXT,
    access_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_duration_minutes INTEGER,
    pages_visited JSONB DEFAULT '[]'::jsonb,
    
    -- Device Info
    device_type VARCHAR(20) CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    browser VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create indexes for better performance
CREATE INDEX idx_closers_email ON public.closers(email);
CREATE INDEX idx_closers_organization ON public.closers(organization_id);
CREATE INDEX idx_closers_status ON public.closers(status_login, status_contrato);
CREATE INDEX idx_closers_vendas_closer ON public.closers_vendas(closer_id);
CREATE INDEX idx_closers_vendas_date ON public.closers_vendas(data_venda);
CREATE INDEX idx_closers_metas_period ON public.closers_metas(closer_id, mes, ano);
CREATE INDEX idx_closers_atividades_closer ON public.closers_atividades(closer_id);
CREATE INDEX idx_closers_atividades_date ON public.closers_atividades(data_atividade);

-- 7. Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_closers_updated_at BEFORE UPDATE ON public.closers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_closers_vendas_updated_at BEFORE UPDATE ON public.closers_vendas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_closers_metas_updated_at BEFORE UPDATE ON public.closers_metas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Create RLS (Row Level Security) policies
ALTER TABLE public.closers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closers_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closers_metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closers_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closers_dashboard_access ENABLE ROW LEVEL SECURITY;

-- Policy for closers to see their own data
CREATE POLICY closers_view_own ON public.closers
    FOR SELECT USING (
        auth.uid()::text = id::text OR
        EXISTS (
            SELECT 1 FROM public.organization_users
            WHERE organization_id = closers.organization_id
            AND user_id::text = auth.uid()::text
            AND role IN ('owner', 'manager')
        )
    );

-- Policy for closers to update their own profile
CREATE POLICY closers_update_own ON public.closers
    FOR UPDATE USING (auth.uid()::text = id::text)
    WITH CHECK (auth.uid()::text = id::text);

-- Policy for closers_vendas
CREATE POLICY closers_vendas_view ON public.closers_vendas
    FOR SELECT USING (
        closer_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.organization_users
            WHERE organization_id = closers_vendas.organization_id
            AND user_id::text = auth.uid()::text
            AND role IN ('owner', 'manager')
        )
    );

-- Policy for closers_metas
CREATE POLICY closers_metas_view ON public.closers_metas
    FOR SELECT USING (
        closer_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.organization_users
            WHERE organization_id = closers_metas.organization_id
            AND user_id::text = auth.uid()::text
            AND role IN ('owner', 'manager')
        )
    );

-- Policy for closers_atividades
CREATE POLICY closers_atividades_manage ON public.closers_atividades
    FOR ALL USING (
        closer_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.organization_users
            WHERE organization_id = closers_atividades.organization_id
            AND user_id::text = auth.uid()::text
            AND role IN ('owner', 'manager')
        )
    );

-- 9. Insert sample data (optional - remove in production)
-- INSERT INTO public.closers (nome_completo, email, tipo_closer, organization_id, password_hash)
-- VALUES 
-- ('João Silva', 'joao.silva@example.com', 'sdr', (SELECT id FROM organizations LIMIT 1), '123456'),
-- ('Maria Santos', 'maria.santos@example.com', 'closer', (SELECT id FROM organizations LIMIT 1), '123456'),
-- ('Pedro Oliveira', 'pedro.oliveira@example.com', 'closer_senior', (SELECT id FROM organizations LIMIT 1), '123456');

-- 10. Create function to calculate closer metrics
CREATE OR REPLACE FUNCTION calculate_closer_metrics(p_closer_id UUID, p_month INTEGER DEFAULT NULL, p_year INTEGER DEFAULT NULL)
RETURNS TABLE(
    total_vendas BIGINT,
    valor_total DECIMAL,
    comissao_total DECIMAL,
    taxa_conversao DECIMAL,
    leads_atendidos BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT cv.id)::BIGINT as total_vendas,
        COALESCE(SUM(cv.valor_venda), 0)::DECIMAL as valor_total,
        COALESCE(SUM(cv.valor_comissao), 0)::DECIMAL as comissao_total,
        CASE 
            WHEN COUNT(DISTINCT ca.lead_id) > 0 
            THEN (COUNT(DISTINCT cv.id)::DECIMAL / COUNT(DISTINCT ca.lead_id)::DECIMAL * 100)
            ELSE 0
        END as taxa_conversao,
        COUNT(DISTINCT ca.lead_id)::BIGINT as leads_atendidos
    FROM public.closers c
    LEFT JOIN public.closers_vendas cv ON c.id = cv.closer_id
        AND cv.status_venda = 'confirmada'
        AND (p_month IS NULL OR EXTRACT(MONTH FROM cv.data_venda) = p_month)
        AND (p_year IS NULL OR EXTRACT(YEAR FROM cv.data_venda) = p_year)
    LEFT JOIN public.closers_atividades ca ON c.id = ca.closer_id
        AND (p_month IS NULL OR EXTRACT(MONTH FROM ca.data_atividade) = p_month)
        AND (p_year IS NULL OR EXTRACT(YEAR FROM ca.data_atividade) = p_year)
    WHERE c.id = p_closer_id;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions (adjust based on your needs)
GRANT ALL ON public.closers TO authenticated;
GRANT ALL ON public.closers_vendas TO authenticated;
GRANT ALL ON public.closers_metas TO authenticated;
GRANT ALL ON public.closers_atividades TO authenticated;
GRANT ALL ON public.closers_dashboard_access TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.closers IS 'Table to store SDRs and Closers information with authentication';
COMMENT ON TABLE public.closers_vendas IS 'Track sales made by each closer';
COMMENT ON TABLE public.closers_metas IS 'Monthly targets and achievements for closers';
COMMENT ON TABLE public.closers_atividades IS 'Daily activities log for closers';
COMMENT ON TABLE public.closers_dashboard_access IS 'Track dashboard access and usage by closers';