-- ==============================================
-- FIX ALL COLUMN REFERENCE ISSUES IN DATABASE
-- ==============================================

-- 1. First, ensure SDRs table exists with correct structure
CREATE TABLE IF NOT EXISTS sdrs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    nome_completo VARCHAR(255) NOT NULL,  -- Changed from 'nome' to match other tables
    email VARCHAR(255) NOT NULL UNIQUE,
    telefone VARCHAR(20),
    meta_qualificacao INTEGER DEFAULT 50,
    ativo BOOLEAN DEFAULT true,
    data_admissao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_leads_atribuidos INTEGER DEFAULT 0,
    total_leads_qualificados INTEGER DEFAULT 0,
    total_leads_convertidos INTEGER DEFAULT 0,
    taxa_qualificacao DECIMAL(5,2) DEFAULT 0,
    tempo_medio_qualificacao INTEGER DEFAULT 0,
    UNIQUE(email, organization_id)
);

-- 2. Create indexes for SDRs table
CREATE INDEX IF NOT EXISTS idx_sdrs_organization_id ON sdrs(organization_id);
CREATE INDEX IF NOT EXISTS idx_sdrs_user_id ON sdrs(user_id);
CREATE INDEX IF NOT EXISTS idx_sdrs_email ON sdrs(email);
CREATE INDEX IF NOT EXISTS idx_sdrs_ativo ON sdrs(ativo);

-- 3. Add missing columns to organizations table if needed
DO $$ 
BEGIN
    -- Check if owner_id column exists, if not we'll use owner_email
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'owner_id'
    ) THEN
        -- Add owner_id column if it doesn't exist
        ALTER TABLE organizations 
        ADD COLUMN owner_id UUID REFERENCES auth.users(id);
        
        -- Try to populate owner_id from owner_email
        UPDATE organizations o
        SET owner_id = u.id
        FROM auth.users u
        WHERE o.owner_email = u.email;
    END IF;
END $$;

-- 4. Fix commission-related views (correcting column references)
CREATE OR REPLACE VIEW referral_commissions AS
SELECT 
    r.id as referral_id,
    r.mentorado_id,
    m.nome_completo as mentorado_nome,  -- Correct column name
    r.lead_id,
    l.nome_completo as lead_nome,  -- Changed from l.nome to l.nome_completo
    l.email as lead_email,
    l.telefone as lead_telefone,
    r.referral_date,
    r.status,
    r.contract_value,
    r.conversion_date,
    r.organization_id,
    COALESCE(SUM(rp.amount), 0) as total_paid,
    CASE 
        WHEN r.status = 'converted' THEN r.contract_value * 0.10  -- 10% commission
        ELSE 0 
    END as commission_due,
    CASE 
        WHEN r.status = 'converted' THEN r.contract_value * 0.10 - COALESCE(SUM(rp.amount), 0)
        ELSE 0 
    END as pending_amount
FROM referrals r
INNER JOIN mentorados m ON m.id = r.mentorado_id
INNER JOIN leads l ON l.id = r.lead_id
LEFT JOIN referral_payments rp ON rp.referral_id = r.id AND rp.status = 'confirmed'
GROUP BY r.id, r.mentorado_id, m.nome_completo, r.lead_id, l.nome_completo, l.email, l.telefone, 
         r.referral_date, r.status, r.contract_value, r.conversion_date, r.organization_id;

-- 5. Fix commission eligibility view
CREATE OR REPLACE VIEW commission_eligibility AS
SELECT 
    c.id,
    c.mentorado_id,
    m.nome_completo as mentorado_nome,
    c.commission_type,
    c.amount,
    c.status,
    c.eligible_date,
    r.lead_id,
    l.nome_completo as lead_nome,  -- Changed from l.nome to l.nome_completo
    c.organization_id
FROM commissions c
LEFT JOIN mentorados m ON m.id = c.mentorado_id
LEFT JOIN referrals r ON r.id = c.referral_id
LEFT JOIN leads l ON l.id = r.lead_id
WHERE c.status = 'pending' 
AND c.eligible_date <= CURRENT_DATE;

-- 6. Fix SDR performance view
CREATE OR REPLACE VIEW sdr_performance AS
SELECT 
    s.id,
    s.nome_completo,  -- Changed from s.nome
    s.email,
    s.organization_id,
    o.name as organization_nome,  -- Changed from o.nome to o.name
    COUNT(DISTINCT l.id) as total_leads,
    COUNT(DISTINCT CASE WHEN l.sdr_qualificado_em IS NOT NULL THEN l.id END) as leads_qualificados,
    COUNT(DISTINCT CASE WHEN l.status = 'vendido' THEN l.id END) as leads_convertidos,
    COALESCE(AVG(EXTRACT(EPOCH FROM (l.sdr_qualificado_em - l.sdr_atribuido_em))/3600)::numeric(10,2), 0) as tempo_medio_qualificacao_horas,
    CASE 
        WHEN COUNT(DISTINCT l.id) > 0 
        THEN (COUNT(DISTINCT CASE WHEN l.sdr_qualificado_em IS NOT NULL THEN l.id END)::numeric / COUNT(DISTINCT l.id) * 100)::numeric(5,2)
        ELSE 0 
    END as taxa_qualificacao,
    DATE_TRUNC('month', CURRENT_DATE) as mes_atual
FROM sdrs s
LEFT JOIN organizations o ON s.organization_id = o.id
LEFT JOIN leads l ON s.id = l.sdr_id 
    AND l.sdr_atribuido_em >= DATE_TRUNC('month', CURRENT_DATE)
WHERE s.ativo = true
GROUP BY s.id, s.nome_completo, s.email, s.organization_id, o.name;

-- 7. Fix leads funil view
CREATE OR REPLACE VIEW leads_funil AS
SELECT 
    l.organization_id,
    o.name as organization_nome,  -- Changed from o.nome to o.name
    l.status,
    l.temperatura,
    l.prioridade,
    COUNT(*) as total,
    AVG(l.lead_score) as score_medio,
    l.sdr_id,
    s.nome_completo as sdr_nome,  -- Changed from s.nome
    l.closer_id,
    c.nome_completo as closer_nome  -- Changed from c.nome
FROM leads l
LEFT JOIN organizations o ON l.organization_id = o.id
LEFT JOIN sdrs s ON l.sdr_id = s.id
LEFT JOIN closers c ON l.closer_id = c.id
GROUP BY 
    l.organization_id, 
    o.name,
    l.status, 
    l.temperatura, 
    l.prioridade,
    l.sdr_id,
    s.nome_completo,
    l.closer_id,
    c.nome_completo;

-- 8. Update RLS policies to use correct column
ALTER TABLE sdrs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "SDRs podem ver apenas sua organização" ON sdrs;
DROP POLICY IF EXISTS "Apenas admins podem criar SDRs" ON sdrs;
DROP POLICY IF EXISTS "Admins podem atualizar SDRs de sua organização" ON sdrs;
DROP POLICY IF EXISTS "Admins podem deletar SDRs de sua organização" ON sdrs;

-- Recreate policies with correct column references
CREATE POLICY "SDRs podem ver apenas sua organização" ON sdrs
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM sdrs 
            WHERE user_id = auth.uid()
        )
        OR
        organization_id IN (
            SELECT organization_id 
            FROM closers 
            WHERE user_id = auth.uid()
        )
        OR
        organization_id IN (
            SELECT id 
            FROM organizations 
            WHERE owner_id = auth.uid() OR owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Apenas admins podem criar SDRs" ON sdrs
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT id 
            FROM organizations 
            WHERE owner_id = auth.uid() OR owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Admins podem atualizar SDRs de sua organização" ON sdrs
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT id 
            FROM organizations 
            WHERE owner_id = auth.uid() OR owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Admins podem deletar SDRs de sua organização" ON sdrs
    FOR DELETE
    USING (
        organization_id IN (
            SELECT id 
            FROM organizations 
            WHERE owner_id = auth.uid() OR owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- 9. Fix lead attribution function
CREATE OR REPLACE FUNCTION atribuir_lead_sdr(
    p_lead_id UUID,
    p_organization_id UUID
) RETURNS UUID AS $$
DECLARE
    v_sdr_id UUID;
BEGIN
    -- Select SDR with least leads assigned in current month
    SELECT id INTO v_sdr_id
    FROM sdrs
    WHERE organization_id = p_organization_id
        AND ativo = true
    ORDER BY (
        SELECT COUNT(*) 
        FROM leads 
        WHERE sdr_id = sdrs.id 
        AND sdr_atribuido_em >= DATE_TRUNC('month', CURRENT_DATE)
    ) ASC
    LIMIT 1;
    
    IF v_sdr_id IS NOT NULL THEN
        UPDATE leads
        SET 
            sdr_id = v_sdr_id,
            sdr_atribuido_em = NOW()
        WHERE id = p_lead_id;
        
        -- Update SDR counter
        UPDATE sdrs
        SET total_leads_atribuidos = total_leads_atribuidos + 1
        WHERE id = v_sdr_id;
    END IF;
    
    RETURN v_sdr_id;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- END OF FIX SCRIPT
-- =============================================="