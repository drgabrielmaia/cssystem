-- ====================================
-- CREATE LEADS TABLE IF NOT EXISTS
-- ====================================
-- This script creates the leads table with proper structure
-- Author: System
-- Date: 2026-02-09
-- ====================================

-- Create leads table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic Information
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    
    -- Lead Source and Type
    fonte VARCHAR(100) DEFAULT 'website' CHECK (fonte IN ('website', 'instagram', 'whatsapp', 'facebook', 'indicacao', 'google', 'tiktok', 'youtube', 'outro')),
    tipo_lead VARCHAR(50) DEFAULT 'potencial' CHECK (tipo_lead IN ('potencial', 'qualificado', 'quente', 'frio', 'nurturing')),
    
    -- Status and Stage
    status VARCHAR(50) DEFAULT 'novo' CHECK (status IN (
        'novo', 'contactado', 'qualificado', 'proposta', 'negociacao', 
        'vendido', 'perdido', 'vazado', 'proposta_enviada', 'agendado', 
        'no-show', 'quente', 'call_agendada'
    )),
    
    -- Lead Scoring and Value
    score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    valor_estimado DECIMAL(10,2) DEFAULT 0,
    temperatura VARCHAR(20) DEFAULT 'frio' CHECK (temperatura IN ('frio', 'morno', 'quente')),
    
    -- Assignment and Tracking
    responsavel_id UUID, -- Can be a closer_id, sdr_id or user_id
    data_ultimo_contato TIMESTAMP WITH TIME ZONE,
    data_proxima_acao DATE,
    proxima_acao TEXT,
    
    -- Campaign and Marketing
    campanha VARCHAR(255),
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    
    -- Additional Information
    observacoes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    dados_adicionais JSONB DEFAULT '{}'::jsonb,
    
    -- Location
    cidade VARCHAR(100),
    estado VARCHAR(2),
    pais VARCHAR(100) DEFAULT 'Brasil',
    
    -- Conversion Tracking
    convertido BOOLEAN DEFAULT false,
    data_conversao TIMESTAMP WITH TIME ZONE,
    motivo_perda TEXT,
    
    -- Multi-tenancy
    organization_id UUID REFERENCES public.organizations(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_telefone ON public.leads(telefone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_fonte ON public.leads(fonte);
CREATE INDEX IF NOT EXISTS idx_leads_responsavel ON public.leads(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_leads_organization ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_temperatura ON public.leads(temperatura);
CREATE INDEX IF NOT EXISTS idx_leads_tipo ON public.leads(tipo_lead);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_leads_updated_at_trigger ON public.leads;
CREATE TRIGGER update_leads_updated_at_trigger
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION update_leads_updated_at();

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
-- Policy: Users can see leads from their organization
CREATE POLICY IF NOT EXISTS leads_select_policy ON public.leads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.organization_id = leads.organization_id
            AND ou.user_id::text = auth.uid()::text
        ) OR
        -- Closers can see their assigned leads
        responsavel_id::text = auth.uid()::text
    );

-- Policy: Users can insert leads in their organization
CREATE POLICY IF NOT EXISTS leads_insert_policy ON public.leads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.organization_id = leads.organization_id
            AND ou.user_id::text = auth.uid()::text
        )
    );

-- Policy: Users can update leads in their organization
CREATE POLICY IF NOT EXISTS leads_update_policy ON public.leads
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.organization_id = leads.organization_id
            AND ou.user_id::text = auth.uid()::text
        ) OR
        -- Assigned user can update their leads
        responsavel_id::text = auth.uid()::text
    );

-- Policy: Only managers and owners can delete leads
CREATE POLICY IF NOT EXISTS leads_delete_policy ON public.leads
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.organization_id = leads.organization_id
            AND ou.user_id::text = auth.uid()::text
            AND ou.role IN ('owner', 'manager')
        )
    );

-- Grant permissions
GRANT ALL ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

-- Add comments for documentation
COMMENT ON TABLE public.leads IS 'Central table for managing all sales leads';
COMMENT ON COLUMN public.leads.score IS 'Lead score from 0-100 based on qualification criteria';
COMMENT ON COLUMN public.leads.temperatura IS 'Lead temperature: frio (cold), morno (warm), quente (hot)';
COMMENT ON COLUMN public.leads.responsavel_id IS 'ID of the responsible person (closer, SDR, or user)';

-- Insert sample leads (optional)
DO $$
DECLARE
    v_org_id uuid;
    v_closer_id uuid;
BEGIN
    -- Get first organization
    SELECT id INTO v_org_id FROM organizations LIMIT 1;
    
    -- Get a random closer as responsible
    SELECT id INTO v_closer_id FROM closers WHERE status_contrato = 'ativo' LIMIT 1;
    
    IF v_org_id IS NOT NULL THEN
        -- Insert sample leads
        INSERT INTO public.leads (
            nome, email, telefone, fonte, tipo_lead, status, 
            score, temperatura, responsavel_id, organization_id,
            observacoes, campanha, valor_estimado
        ) VALUES 
        (
            'Carlos Alberto Silva',
            'carlos.silva@example.com',
            '(11) 91234-5678',
            'instagram',
            'qualificado',
            'contactado',
            75,
            'quente',
            v_closer_id,
            v_org_id,
            'Lead interessado em mentoria de vendas',
            'Black Friday 2024',
            25000.00
        ),
        (
            'Mariana Costa',
            'mariana.costa@example.com',
            '(21) 98765-4321',
            'whatsapp',
            'potencial',
            'novo',
            50,
            'morno',
            v_closer_id,
            v_org_id,
            'Entrou em contato via WhatsApp Business',
            'Lancamento Q1 2024',
            15000.00
        ),
        (
            'Roberto Ferreira',
            'roberto.f@example.com',
            '(31) 99988-7766',
            'google',
            'qualificado',
            'proposta_enviada',
            85,
            'quente',
            v_closer_id,
            v_org_id,
            'Proposta de consultoria enviada, aguardando resposta',
            'Google Ads - Consultoria',
            50000.00
        ),
        (
            'Ana Paula Mendes',
            'ana.mendes@example.com',
            '(41) 93333-2222',
            'indicacao',
            'quente',
            'agendado',
            90,
            'quente',
            v_closer_id,
            v_org_id,
            'Indicação do cliente João Santos - Call agendada para segunda',
            null,
            35000.00
        ),
        (
            'Felipe Oliveira',
            'felipe.oliv@example.com',
            '(51) 94444-5555',
            'facebook',
            'potencial',
            'contactado',
            40,
            'frio',
            null,
            v_org_id,
            'Lead do Facebook Ads - ainda avaliando opções',
            'FB - Awareness',
            10000.00
        )
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Sample leads inserted successfully!';
    END IF;
END $$;

-- Show leads summary
SELECT 
    'Total Leads:' as metric,
    COUNT(*) as value
FROM public.leads
UNION ALL
SELECT 
    'Hot Leads:' as metric,
    COUNT(*) as value
FROM public.leads
WHERE temperatura = 'quente'
UNION ALL
SELECT 
    'Qualified Leads:' as metric,
    COUNT(*) as value
FROM public.leads
WHERE tipo_lead = 'qualificado'
UNION ALL
SELECT 
    'Total Estimated Value:' as metric,
    SUM(valor_estimado) as value
FROM public.leads;