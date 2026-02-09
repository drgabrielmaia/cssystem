-- =====================================================
-- COMPLETE COMMISSION SYSTEM MIGRATION
-- Based on ACTUAL database schema analysis
-- Date: 2026-02-09
-- =====================================================

-- Note: This migration assumes you're using Supabase Auth (auth.users)
-- If not, uncomment the users table creation below

-- =====================================================
-- 1. USER SYSTEM (if not using Supabase Auth)
-- =====================================================

-- Uncomment if you need a custom users table:
/*
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
*/

-- Profiles table (needed even with Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT,
  telefone TEXT,
  cpf TEXT UNIQUE,
  pix_key TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  tipo_usuario TEXT CHECK (tipo_usuario IN ('admin', 'closer', 'sdr', 'social_seller', 'mentorado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);

-- =====================================================
-- 2. SALES TEAM TABLES (Missing)
-- =====================================================

-- Social Sellers table
CREATE TABLE IF NOT EXISTS social_sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  instagram_handle TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
  total_indicacoes INTEGER DEFAULT 0,
  total_vendas_geradas INTEGER DEFAULT 0,
  valor_total_gerado BIGINT DEFAULT 0, -- in cents
  comissao_total_recebida BIGINT DEFAULT 0, -- in cents
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_sellers_organization_id ON social_sellers(organization_id);
CREATE INDEX IF NOT EXISTS idx_social_sellers_profile_id ON social_sellers(profile_id);

-- SDRs table
CREATE TABLE IF NOT EXISTS sdrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
  meta_qualificacao_mensal INTEGER DEFAULT 50,
  total_leads_qualificados INTEGER DEFAULT 0,
  taxa_qualificacao DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sdrs_organization_id ON sdrs(organization_id);
CREATE INDEX IF NOT EXISTS idx_sdrs_profile_id ON sdrs(profile_id);

-- =====================================================
-- 3. REFERRAL SYSTEM
-- =====================================================

-- Referrals table (tracking who referred whom)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Who made the referral
  referred_lead_id UUID REFERENCES leads(id) ON DELETE CASCADE, -- The lead that was referred
  referral_code TEXT UNIQUE,
  referral_source TEXT CHECK (referral_source IN ('social_seller', 'closer', 'sdr', 'direct', 'other')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'converted', 'rejected', 'expired')),
  qualification_date TIMESTAMPTZ,
  conversion_date TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_organization_id ON referrals(organization_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_lead_id ON referrals(referred_lead_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Referral links for tracking
CREATE TABLE IF NOT EXISTS referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_links_profile_id ON referral_links(profile_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_code ON referral_links(code);

-- =====================================================
-- 4. COMMISSION SYSTEM
-- =====================================================

-- Commission rules configuration
CREATE TABLE IF NOT EXISTS commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_type TEXT CHECK (rule_type IN ('fixed', 'percentage', 'tiered')),
  base_value BIGINT, -- For fixed: amount in cents, for percentage: percentage * 100
  conditions JSONB, -- Flexible conditions
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_rules_organization_id ON commission_rules(organization_id);

-- Main commissions table
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Who earned the commission
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE, -- Related referral
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL, -- Related lead
  commission_type TEXT CHECK (commission_type IN ('referral', 'sale', 'bonus', 'adjustment')),
  calculation_method TEXT CHECK (calculation_method IN ('fixed', 'percentage')),
  base_amount BIGINT NOT NULL, -- Sale amount in cents
  commission_rate DECIMAL(5,2), -- Percentage rate (if applicable)
  commission_amount BIGINT NOT NULL, -- Commission amount in cents
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  approval_date TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  payment_date TIMESTAMPTZ,
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_organization_id ON commissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_commissions_profile_id ON commissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_commissions_referral_id ON commissions(referral_id);
CREATE INDEX IF NOT EXISTS idx_commissions_lead_id ON commissions(lead_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON commissions(created_at DESC);

-- =====================================================
-- 5. WITHDRAWAL SYSTEM
-- =====================================================

-- General withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  withdrawal_type TEXT CHECK (withdrawal_type IN ('commission', 'bonus', 'refund', 'other')),
  amount BIGINT NOT NULL, -- Amount in cents
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('pix', 'bank_transfer', 'other')),
  payment_details JSONB, -- Store PIX key, bank details, etc.
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_reason TEXT,
  transaction_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_organization_id ON withdrawals(organization_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_profile_id ON withdrawals(profile_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- Commission withdrawals (links commissions to withdrawals)
CREATE TABLE IF NOT EXISTS commission_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID REFERENCES commissions(id) ON DELETE CASCADE,
  withdrawal_id UUID REFERENCES withdrawals(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL, -- Amount from this commission
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(commission_id, withdrawal_id)
);

CREATE INDEX IF NOT EXISTS idx_commission_withdrawals_commission_id ON commission_withdrawals(commission_id);
CREATE INDEX IF NOT EXISTS idx_commission_withdrawals_withdrawal_id ON commission_withdrawals(withdrawal_id);

-- =====================================================
-- 6. WALLET SYSTEM (Optional but recommended)
-- =====================================================

-- Wallet transactions for complete financial tracking
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_type TEXT CHECK (transaction_type IN ('credit', 'debit')),
  transaction_category TEXT CHECK (transaction_category IN ('commission', 'withdrawal', 'bonus', 'adjustment', 'refund')),
  amount BIGINT NOT NULL, -- Amount in cents
  balance_before BIGINT NOT NULL, -- Balance before transaction
  balance_after BIGINT NOT NULL, -- Balance after transaction
  reference_type TEXT, -- 'commission', 'withdrawal', etc.
  reference_id UUID, -- ID of related record
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_organization_id ON wallet_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_profile_id ON wallet_transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- =====================================================
-- 7. UPDATE EXISTING TABLES
-- =====================================================

-- Add missing columns to leads table if they don't exist
DO $$
BEGIN
  -- Add referral_id to leads if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'referral_id') THEN
    ALTER TABLE leads ADD COLUMN referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL;
  END IF;
  
  -- Add commission_paid flag if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'commission_paid') THEN
    ALTER TABLE leads ADD COLUMN commission_paid BOOLEAN DEFAULT false;
  END IF;
END $$;

-- =====================================================
-- 8. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables (not views) that have it
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT c.table_name 
    FROM information_schema.columns c
    INNER JOIN information_schema.tables t 
      ON c.table_name = t.table_name 
      AND c.table_schema = t.table_schema
    WHERE c.column_name = 'updated_at' 
    AND c.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'  -- Only actual tables, not views
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I 
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- Function to calculate commission
CREATE OR REPLACE FUNCTION calculate_commission(
  p_sale_amount BIGINT,
  p_organization_id UUID,
  p_commission_type TEXT
) RETURNS BIGINT AS $$
DECLARE
  v_commission BIGINT;
  v_fixed_rate BIGINT;
BEGIN
  -- Get organization's fixed commission rate
  SELECT comissao_fixa_indicacao INTO v_fixed_rate
  FROM organizations
  WHERE id = p_organization_id;
  
  -- If no specific rate, use default
  IF v_fixed_rate IS NULL THEN
    v_fixed_rate := 2000; -- R$ 20,00 default
  END IF;
  
  -- For now, return fixed rate
  -- This can be enhanced to use commission_rules table
  RETURN v_fixed_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to process referral conversion
CREATE OR REPLACE FUNCTION process_referral_conversion(
  p_lead_id UUID,
  p_sale_amount BIGINT
) RETURNS UUID AS $$
DECLARE
  v_referral RECORD;
  v_commission_id UUID;
  v_commission_amount BIGINT;
BEGIN
  -- Find the referral for this lead
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_lead_id = p_lead_id
  AND status = 'qualified';
  
  IF v_referral IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Update referral status
  UPDATE referrals
  SET status = 'converted',
      conversion_date = NOW(),
      updated_at = NOW()
  WHERE id = v_referral.id;
  
  -- Calculate commission
  v_commission_amount := calculate_commission(
    p_sale_amount,
    v_referral.organization_id,
    'referral'
  );
  
  -- Create commission record
  INSERT INTO commissions (
    organization_id,
    profile_id,
    referral_id,
    lead_id,
    commission_type,
    calculation_method,
    base_amount,
    commission_amount,
    status
  ) VALUES (
    v_referral.organization_id,
    v_referral.referrer_id,
    v_referral.id,
    p_lead_id,
    'referral',
    'fixed',
    p_sale_amount,
    v_commission_amount,
    'pending'
  ) RETURNING id INTO v_commission_id;
  
  -- Update lead
  UPDATE leads
  SET comissao_id = v_commission_id,
      possui_comissao = true
  WHERE id = p_lead_id;
  
  RETURN v_commission_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Organization-based policies for other tables
CREATE POLICY "Organization members can view referrals" ON referrals
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Organization members can view commissions" ON commissions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Users can view their own withdrawals
CREATE POLICY "Users can view own withdrawals" ON withdrawals
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 10. INITIAL DATA & MIGRATIONS
-- =====================================================

-- Migrate existing data from leads to referrals if needed
INSERT INTO referrals (
  organization_id,
  referrer_id,
  referred_lead_id,
  referral_source,
  status,
  created_at
)
SELECT 
  l.organization_id,
  p.id as referrer_id,
  l.id as referred_lead_id,
  'direct' as referral_source,
  CASE 
    WHEN l.status = 'vendido' THEN 'converted'
    WHEN l.status IN ('qualificado', 'em_negociacao') THEN 'qualified'
    ELSE 'pending'
  END as status,
  l.created_at
FROM leads l
LEFT JOIN profiles p ON p.user_id::text = l.mentorado_indicador_id::text
WHERE l.mentorado_indicador_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM referrals r 
    WHERE r.referred_lead_id = l.id
  );

-- =====================================================
-- 11. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verification query to check if all tables were created
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'profiles', 'social_sellers', 'sdrs', 'referrals', 
    'referral_links', 'commission_rules', 'commissions',
    'withdrawals', 'commission_withdrawals', 'wallet_transactions'
  );
  
  RAISE NOTICE 'Commission system tables created: % of 10', v_count;
END $$;