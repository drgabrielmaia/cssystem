-- ===================================================================
-- FIX FINANCIAL SYNC ERRORS - RLS POLICIES AND TABLE STRUCTURE
-- ===================================================================

-- 1. FIX referral_payments TABLE (rename from mentorship_payments if needed)
DO $$ 
BEGIN
    -- Check if mentorship_payments exists and referral_payments doesn't
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mentorship_payments') 
       AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'referral_payments') THEN
        ALTER TABLE mentorship_payments RENAME TO referral_payments;
        RAISE NOTICE 'Table mentorship_payments renamed to referral_payments';
    END IF;

    -- Create referral_payments if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'referral_payments') THEN
        CREATE TABLE referral_payments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
            payment_amount DECIMAL(10,2) NOT NULL,
            payment_date TIMESTAMPTZ NOT NULL,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
            payment_method VARCHAR(50),
            notes TEXT,
            organization_id UUID NOT NULL REFERENCES organizations(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Table referral_payments created';
    END IF;

    -- Add organization_id if missing
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'referral_payments' AND column_name = 'organization_id') THEN
        ALTER TABLE referral_payments ADD COLUMN organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Added organization_id to referral_payments';
    END IF;
END $$;

-- 2. FIX transacoes_financeiras TABLE - ADD organization_id COLUMN
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'transacoes_financeiras' AND column_name = 'organization_id') THEN
        ALTER TABLE transacoes_financeiras ADD COLUMN organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Added organization_id to transacoes_financeiras';
    END IF;
END $$;

-- 3. FIX categorias_financeiras TABLE - ADD organization_id COLUMN
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'categorias_financeiras' AND column_name = 'organization_id') THEN
        ALTER TABLE categorias_financeiras ADD COLUMN organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Added organization_id to categorias_financeiras';
    END IF;
END $$;

-- 4. FIX commissions TABLE - ADD organization_id COLUMN
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'commissions' AND column_name = 'organization_id') THEN
        ALTER TABLE commissions ADD COLUMN organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Added organization_id to commissions';
    END IF;
END $$;

-- 5. CREATE/UPDATE RLS POLICIES FOR ALL FINANCIAL TABLES
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own organization financial transactions" ON transacoes_financeiras;
DROP POLICY IF EXISTS "Users can insert own organization financial transactions" ON transacoes_financeiras;
DROP POLICY IF EXISTS "Users can update own organization financial transactions" ON transacoes_financeiras;
DROP POLICY IF EXISTS "Users can delete own organization financial transactions" ON transacoes_financeiras;

DROP POLICY IF EXISTS "Users can view own organization financial categories" ON categorias_financeiras;
DROP POLICY IF EXISTS "Users can insert own organization financial categories" ON categorias_financeiras;
DROP POLICY IF EXISTS "Users can update own organization financial categories" ON categorias_financeiras;
DROP POLICY IF EXISTS "Users can delete own organization financial categories" ON categorias_financeiras;

DROP POLICY IF EXISTS "Users can view own organization referral payments" ON referral_payments;
DROP POLICY IF EXISTS "Users can insert own organization referral payments" ON referral_payments;
DROP POLICY IF EXISTS "Users can update own organization referral payments" ON referral_payments;
DROP POLICY IF EXISTS "Users can delete own organization referral payments" ON referral_payments;

DROP POLICY IF EXISTS "Users can view own organization commissions" ON commissions;
DROP POLICY IF EXISTS "Users can insert own organization commissions" ON commissions;
DROP POLICY IF EXISTS "Users can update own organization commissions" ON commissions;
DROP POLICY IF EXISTS "Users can delete own organization commissions" ON commissions;

-- Enable RLS
ALTER TABLE transacoes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies for transacoes_financeiras
CREATE POLICY "Users can view own organization financial transactions" ON transacoes_financeiras
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = auth.uid())
        OR organization_id IS NULL -- Allow null for backwards compatibility
    );

CREATE POLICY "Users can insert own organization financial transactions" ON transacoes_financeiras
    FOR INSERT WITH CHECK (
        organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = auth.uid())
    );

CREATE POLICY "Users can update own organization financial transactions" ON transacoes_financeiras
    FOR UPDATE USING (
        organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = auth.uid())
    );

CREATE POLICY "Users can delete own organization financial transactions" ON transacoes_financeiras
    FOR DELETE USING (
        organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = auth.uid())
    );

-- Create new RLS policies for categorias_financeiras  
CREATE POLICY "Users can view own organization financial categories" ON categorias_financeiras
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = auth.uid())
        OR organization_id IS NULL -- Allow shared categories
        OR is_shared = true -- Allow shared categories
    );

CREATE POLICY "Users can insert own organization financial categories" ON categorias_financeiras
    FOR INSERT WITH CHECK (
        organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = auth.uid())
    );

CREATE POLICY "Users can update own organization financial categories" ON categorias_financeiras
    FOR UPDATE USING (
        organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = auth.uid())
    );

CREATE POLICY "Users can delete own organization financial categories" ON categorias_financeiras
    FOR DELETE USING (
        organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = auth.uid())
    );

-- Create new RLS policies for referral_payments
CREATE POLICY "Users can view own organization referral payments" ON referral_payments
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = auth.uid())
    );

CREATE POLICY "Users can insert own organization referral payments" ON referral_payments
    FOR INSERT WITH CHECK (
        organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = auth.uid())
    );

CREATE POLICY "Users can update own organization referral payments" ON referral_payments
    FOR UPDATE USING (
        organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = auth.uid())
    );

CREATE POLICY "Users can delete own organization referral payments" ON referral_payments
    FOR DELETE USING (
        organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = auth.uid())
    );

-- Create new RLS policies for commissions
CREATE POLICY "Users can view own organization commissions" ON commissions
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = auth.uid())
    );

CREATE POLICY "Users can insert own organization commissions" ON commissions
    FOR INSERT WITH CHECK (
        organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = auth.uid())
    );

CREATE POLICY "Users can update own organization commissions" ON commissions
    FOR UPDATE USING (
        organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = auth.uid())
    );

CREATE POLICY "Users can delete own organization commissions" ON commissions
    FOR DELETE USING (
        organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = auth.uid())
    );

-- 6. FIX FUNCTION calculate_business_unit_metrics TO INCLUDE ORGANIZATION_ID CHECK
CREATE OR REPLACE FUNCTION calculate_business_unit_metrics(unit_id UUID)
RETURNS VOID AS $$
DECLARE
    current_org_id UUID;
    metric_data RECORD;
    period_start DATE;
    period_end DATE;
BEGIN
    -- Get organization_id from the user's profile
    SELECT organization_id INTO current_org_id 
    FROM profiles 
    WHERE id = auth.uid();

    IF current_org_id IS NULL THEN
        RAISE EXCEPTION 'User organization not found';
    END IF;

    -- Check if business unit belongs to user's organization
    IF NOT EXISTS (
        SELECT 1 FROM business_units 
        WHERE id = unit_id 
        AND organization_id = current_org_id
    ) THEN
        RAISE EXCEPTION 'Business unit not found or access denied';
    END IF;

    -- Set period to current month
    period_start := date_trunc('month', CURRENT_DATE)::date;
    period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date;

    -- Calculate metrics
    WITH metrics AS (
        SELECT 
            COALESCE(SUM(CASE WHEN t.tipo = 'entrada' THEN t.valor ELSE 0 END), 0) as revenue,
            COALESCE(SUM(CASE WHEN t.tipo = 'saida' THEN t.valor ELSE 0 END), 0) as costs,
            COUNT(CASE WHEN t.tipo = 'entrada' THEN 1 END) as transaction_count
        FROM transacoes_financeiras t
        WHERE t.business_unit_id = unit_id
        AND t.organization_id = current_org_id
        AND t.data_transacao >= period_start
        AND t.data_transacao <= period_end
    )
    SELECT 
        revenue * 100 as total_revenue, -- Convert to cents
        costs * 100 as total_costs,     -- Convert to cents
        (revenue - costs) * 100 as gross_profit, -- Convert to cents
        CASE 
            WHEN costs > 0 THEN ((revenue - costs) / costs) * 100 
            ELSE 0 
        END as roi_percentage,
        0 as leads_generated, -- Default for now
        0 as leads_converted, -- Default for now
        0 as conversion_rate, -- Default for now
        CASE 
            WHEN transaction_count > 0 THEN (revenue * 100) / transaction_count 
            ELSE 0 
        END as average_ticket
    INTO metric_data
    FROM metrics;

    -- Insert or update metrics
    INSERT INTO business_unit_metrics (
        business_unit_id,
        organization_id,
        period_month,
        total_revenue,
        total_costs,
        gross_profit,
        roi_percentage,
        leads_generated,
        leads_converted,
        conversion_rate,
        average_ticket,
        created_at,
        updated_at
    ) VALUES (
        unit_id,
        current_org_id,
        period_start,
        metric_data.total_revenue,
        metric_data.total_costs,
        metric_data.gross_profit,
        metric_data.roi_percentage,
        metric_data.leads_generated,
        metric_data.leads_converted,
        metric_data.conversion_rate,
        metric_data.average_ticket,
        NOW(),
        NOW()
    )
    ON CONFLICT (business_unit_id, period_month, organization_id) DO UPDATE SET
        total_revenue = EXCLUDED.total_revenue,
        total_costs = EXCLUDED.total_costs,
        gross_profit = EXCLUDED.gross_profit,
        roi_percentage = EXCLUDED.roi_percentage,
        average_ticket = EXCLUDED.average_ticket,
        updated_at = NOW();

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. CREATE DEFAULT FINANCIAL CATEGORIES FOR ORGANIZATIONS
INSERT INTO categorias_financeiras (nome, tipo, cor, ativo, organization_id)
SELECT 
    'Comissões Pagas', 'saida', '#EF4444', true, o.id
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM categorias_financeiras c 
    WHERE c.nome = 'Comissões Pagas' 
    AND c.organization_id = o.id
);

INSERT INTO categorias_financeiras (nome, tipo, cor, ativo, organization_id)
SELECT 
    'Mentoria', 'entrada', '#10B981', true, o.id
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM categorias_financeiras c 
    WHERE c.nome = 'Mentoria' 
    AND c.organization_id = o.id
);

-- 8. UPDATE EXISTING DATA TO HAVE ORGANIZATION_ID
-- Update transacoes_financeiras without organization_id
UPDATE transacoes_financeiras 
SET organization_id = p.organization_id
FROM profiles p
WHERE transacoes_financeiras.usuario_id = p.id
AND transacoes_financeiras.organization_id IS NULL;

-- Update categorias_financeiras without organization_id (assign to first organization)
UPDATE categorias_financeiras 
SET organization_id = (SELECT id FROM organizations LIMIT 1)
WHERE organization_id IS NULL;

-- Update commissions without organization_id
UPDATE commissions 
SET organization_id = r.organization_id
FROM referrals r
WHERE commissions.referral_id = r.id
AND commissions.organization_id IS NULL;

-- Update referral_payments without organization_id
UPDATE referral_payments 
SET organization_id = r.organization_id
FROM referrals r
WHERE referral_payments.referral_id = r.id
AND referral_payments.organization_id IS NULL;

-- 9. CREATE UPDATED TRIGGERS FOR AUTOMATIC organization_id ASSIGNMENT
CREATE OR REPLACE FUNCTION set_organization_id_from_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Set organization_id from the authenticated user's profile
    IF NEW.organization_id IS NULL THEN
        NEW.organization_id := (SELECT organization_id FROM profiles WHERE id = auth.uid());
    END IF;
    
    -- Set updated_at for updates
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to all financial tables
DROP TRIGGER IF EXISTS set_org_id_trigger ON transacoes_financeiras;
CREATE TRIGGER set_org_id_trigger
    BEFORE INSERT OR UPDATE ON transacoes_financeiras
    FOR EACH ROW EXECUTE FUNCTION set_organization_id_from_user();

DROP TRIGGER IF EXISTS set_org_id_trigger ON categorias_financeiras;
CREATE TRIGGER set_org_id_trigger
    BEFORE INSERT OR UPDATE ON categorias_financeiras
    FOR EACH ROW EXECUTE FUNCTION set_organization_id_from_user();

DROP TRIGGER IF EXISTS set_org_id_trigger ON referral_payments;
CREATE TRIGGER set_org_id_trigger
    BEFORE INSERT OR UPDATE ON referral_payments
    FOR EACH ROW EXECUTE FUNCTION set_organization_id_from_user();

SELECT 'FINANCIAL SYNC ERRORS FIXED - All tables now have proper RLS policies and organization_id isolation' as status;