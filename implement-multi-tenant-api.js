const fetch = require('node-fetch')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key')
  process.exit(1)
}

// Parse project ID from URL
const projectId = supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)[1]

async function executeSql(sql) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql })
    })

    if (!response.ok) {
      // If exec_sql doesn't exist, return null
      return null
    }

    return await response.json()
  } catch (error) {
    return null
  }
}

async function implementMultiTenant() {
  console.log('🚀 Starting Multi-Tenant Implementation via Direct SQL...\n')
  console.log('Project ID:', projectId)
  console.log('URL:', supabaseUrl)

  // Create SQL file with all commands
  const sqlCommands = `
-- =================================================================
-- MULTI-TENANT IMPLEMENTATION SCRIPT
-- =================================================================

-- 1. CREATE ORGANIZATIONS TABLE
-- =================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for owner_email
CREATE INDEX IF NOT EXISTS idx_organizations_owner_email ON organizations(owner_email);

-- 2. CREATE ORGANIZATION_USERS TABLE
-- =================================================================
CREATE TABLE IF NOT EXISTS organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id),
  UNIQUE(organization_id, email)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organization_users_org_id ON organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_user_id ON organization_users(user_id);

-- 3. ADD ORGANIZATION_ID TO EXISTING TABLES
-- =================================================================

-- mentorados
ALTER TABLE mentorados ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_mentorados_organization_id ON mentorados(organization_id);

-- video_modules
ALTER TABLE video_modules ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_video_modules_organization_id ON video_modules(organization_id);

-- video_lessons
ALTER TABLE video_lessons ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_video_lessons_organization_id ON video_lessons(organization_id);

-- lesson_progress
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_organization_id ON lesson_progress(organization_id);

-- form_submissions
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_organization_id ON form_submissions(organization_id);

-- formularios_respostas
ALTER TABLE formularios_respostas ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_formularios_respostas_organization_id ON formularios_respostas(organization_id);

-- whatsapp_conversations
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_organization_id ON whatsapp_conversations(organization_id);

-- comissoes
ALTER TABLE comissoes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_comissoes_organization_id ON comissoes(organization_id);

-- 4. CREATE FINANCIAL TABLES WITH MULTI-TENANCY
-- =================================================================

-- vendas
CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  mentorado_id UUID REFERENCES mentorados(id),
  valor DECIMAL(10,2) NOT NULL,
  data_venda DATE NOT NULL,
  status TEXT DEFAULT 'pendente',
  forma_pagamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vendas_organization_id ON vendas(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendas_mentorado_id ON vendas(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data_venda ON vendas(data_venda);

-- despesas
CREATE TABLE IF NOT EXISTS despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data_despesa DATE NOT NULL,
  categoria TEXT,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_despesas_organization_id ON despesas(organization_id);
CREATE INDEX IF NOT EXISTS idx_despesas_data_despesa ON despesas(data_despesa);

-- metas
CREATE TABLE IF NOT EXISTS metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  mentorado_id UUID REFERENCES mentorados(id),
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_inicio DATE,
  data_fim DATE,
  status TEXT DEFAULT 'pendente',
  progresso INTEGER DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_metas_organization_id ON metas(organization_id);
CREATE INDEX IF NOT EXISTS idx_metas_mentorado_id ON metas(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_metas_status ON metas(status);

-- faturas
CREATE TABLE IF NOT EXISTS faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  numero TEXT NOT NULL,
  cliente TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data_emissao DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_faturas_organization_id ON faturas(organization_id);
CREATE INDEX IF NOT EXISTS idx_faturas_numero ON faturas(numero);
CREATE INDEX IF NOT EXISTS idx_faturas_data_vencimento ON faturas(data_vencimento);

-- pix_payments
CREATE TABLE IF NOT EXISTS pix_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  chave_pix TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  pagador TEXT,
  data_pagamento TIMESTAMP WITH TIME ZONE NOT NULL,
  txid TEXT,
  status TEXT DEFAULT 'confirmado',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pix_payments_organization_id ON pix_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_pix_payments_txid ON pix_payments(txid);

-- contas_bancarias
CREATE TABLE IF NOT EXISTS contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  nome TEXT NOT NULL,
  banco TEXT NOT NULL,
  agencia TEXT,
  conta TEXT,
  tipo TEXT DEFAULT 'corrente' CHECK (tipo IN ('corrente', 'poupanca', 'investimento')),
  saldo_atual DECIMAL(10,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_organization_id ON contas_bancarias(organization_id);

-- categorias_financeiras
CREATE TABLE IF NOT EXISTS categorias_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  cor TEXT,
  icone TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, nome, tipo)
);
CREATE INDEX IF NOT EXISTS idx_categorias_financeiras_organization_id ON categorias_financeiras(organization_id);

-- transacoes
CREATE TABLE IF NOT EXISTS transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  categoria_id UUID REFERENCES categorias_financeiras(id),
  conta_id UUID REFERENCES contas_bancarias(id),
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data_transacao DATE NOT NULL,
  status TEXT DEFAULT 'confirmado',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transacoes_organization_id ON transacoes(organization_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_categoria_id ON transacoes(categoria_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_conta_id ON transacoes(conta_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_data_transacao ON transacoes(data_transacao);

-- 5. CREATE INITIAL ORGANIZATIONS
-- =================================================================

-- Insert Admin Organization (if not exists)
INSERT INTO organizations (name, owner_email)
VALUES ('Admin Organization', 'admin@admin.com')
ON CONFLICT (owner_email) DO NOTHING;

-- Insert Kelly Organization (if not exists)
INSERT INTO organizations (name, owner_email)
VALUES ('Kelly Organization', 'kellybsantoss@icloud.com')
ON CONFLICT (owner_email) DO NOTHING;

-- 6. MIGRATE EXISTING DATA TO ADMIN ORGANIZATION
-- =================================================================

-- Get admin org ID and update all existing data
DO $$
DECLARE
  admin_org_id UUID;
BEGIN
  -- Get admin organization ID
  SELECT id INTO admin_org_id FROM organizations WHERE owner_email = 'admin@admin.com';

  IF admin_org_id IS NOT NULL THEN
    -- Update mentorados
    UPDATE mentorados SET organization_id = admin_org_id WHERE organization_id IS NULL;

    -- Update video_modules
    UPDATE video_modules SET organization_id = admin_org_id WHERE organization_id IS NULL;

    -- Update video_lessons
    UPDATE video_lessons SET organization_id = admin_org_id WHERE organization_id IS NULL;

    -- Update lesson_progress
    UPDATE lesson_progress SET organization_id = admin_org_id WHERE organization_id IS NULL;

    -- Update form_submissions
    UPDATE form_submissions SET organization_id = admin_org_id WHERE organization_id IS NULL;

    -- Update formularios_respostas
    UPDATE formularios_respostas SET organization_id = admin_org_id WHERE organization_id IS NULL;

    -- Update whatsapp_conversations
    UPDATE whatsapp_conversations SET organization_id = admin_org_id WHERE organization_id IS NULL;

    -- Update comissoes
    UPDATE comissoes SET organization_id = admin_org_id WHERE organization_id IS NULL;
  END IF;
END $$;

-- 7. CREATE HELPER FUNCTIONS
-- =================================================================

-- Function to get user's organization ID
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id
    FROM organization_users
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user belongs to organization
CREATE OR REPLACE FUNCTION user_belongs_to_organization(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organization_users
    WHERE user_id = auth.uid()
    AND organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in organization
CREATE OR REPLACE FUNCTION get_user_role_in_organization(org_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role
    FROM organization_users
    WHERE user_id = auth.uid()
    AND organization_id = org_id
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ENABLE ROW LEVEL SECURITY
-- =================================================================

-- Enable RLS on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on organization_users table
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on existing tables
ALTER TABLE mentorados ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE formularios_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on financial tables
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pix_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;

-- 9. CREATE RLS POLICIES
-- =================================================================

-- Policy for organizations table
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
CREATE POLICY "Owners can update their organizations" ON organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- Policy for organization_users table
DROP POLICY IF EXISTS "Users can view organization members" ON organization_users;
CREATE POLICY "Users can view organization members" ON organization_users
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners and managers can manage members" ON organization_users;
CREATE POLICY "Owners and managers can manage members" ON organization_users
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'manager')
    )
  );

-- Create generic organization isolation policy for all data tables
DO $$
DECLARE
  table_name TEXT;
  tables TEXT[] := ARRAY[
    'mentorados',
    'video_modules',
    'video_lessons',
    'lesson_progress',
    'form_submissions',
    'formularios_respostas',
    'whatsapp_conversations',
    'comissoes',
    'vendas',
    'despesas',
    'metas',
    'faturas',
    'pix_payments',
    'contas_bancarias',
    'categorias_financeiras',
    'transacoes'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Organization isolation" ON %I', table_name);
    EXECUTE format('
      CREATE POLICY "Organization isolation" ON %I
        FOR ALL
        USING (
          organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
          )
        )', table_name);
  END LOOP;
END $$;

-- 10. CREATE TRIGGERS FOR UPDATED_AT
-- =================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for tables with updated_at column
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON vendas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_despesas_updated_at BEFORE UPDATE ON despesas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metas_updated_at BEFORE UPDATE ON metas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faturas_updated_at BEFORE UPDATE ON faturas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contas_bancarias_updated_at BEFORE UPDATE ON contas_bancarias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categorias_financeiras_updated_at BEFORE UPDATE ON categorias_financeiras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transacoes_updated_at BEFORE UPDATE ON transacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =================================================================
-- IMPLEMENTATION COMPLETE
-- =================================================================
`;

  // Save SQL file
  const fs = require('fs')
  fs.writeFileSync('multi-tenant-implementation.sql', sqlCommands)

  console.log('✅ SQL script generated: multi-tenant-implementation.sql')
  console.log('\n📋 To complete the implementation, please:')
  console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/' + projectId)
  console.log('2. Navigate to the SQL Editor')
  console.log('3. Copy and paste the contents of multi-tenant-implementation.sql')
  console.log('4. Execute the script')
  console.log('\nThe script will:')
  console.log('- Create organizations and organization_users tables')
  console.log('- Add organization_id to all existing tables')
  console.log('- Create all financial tables with multi-tenancy')
  console.log('- Create two initial organizations (Admin and Kelly)')
  console.log('- Migrate all existing data to Admin organization')
  console.log('- Enable Row Level Security on all tables')
  console.log('- Create security policies for organization isolation')
  console.log('- Create helper functions for organization management')

  // Also create a verification script
  const verificationScript = `
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyImplementation() {
  console.log('🔍 Verifying Multi-Tenant Implementation...\\n')

  try {
    // Check organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')

    if (orgsError) {
      console.log('❌ Error fetching organizations:', orgsError.message)
    } else {
      console.log('✅ Organizations table exists')
      console.log('   Found', orgs.length, 'organizations:')
      orgs.forEach(org => {
        console.log('   -', org.name, '(' + org.owner_email + ')')
      })
    }

    // Check modified tables
    const tablesToCheck = [
      'mentorados',
      'video_modules',
      'video_lessons',
      'vendas',
      'despesas',
      'metas',
      'contas_bancarias',
      'categorias_financeiras',
      'transacoes'
    ]

    console.log('\\n📊 Checking table modifications:')
    for (const table of tablesToCheck) {
      const { data, error, count } = await supabase
        .from(table)
        .select('organization_id', { count: 'exact', head: true })

      if (error) {
        console.log('  ❌', table + ':', error.message)
      } else {
        console.log('  ✅', table + ': has organization_id column')
      }
    }

    // Check data migration
    console.log('\\n📈 Data migration summary:')
    const adminOrg = orgs?.find(o => o.owner_email === 'admin@admin.com')

    if (adminOrg) {
      for (const table of ['mentorados', 'video_modules', 'video_lessons']) {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', adminOrg.id)

        console.log('  -', table + ':', count || 0, 'records in Admin org')
      }
    }

    console.log('\\n✅ Verification complete!')

  } catch (error) {
    console.error('❌ Verification error:', error)
  }
}

verifyImplementation()
`;

  fs.writeFileSync('verify-multi-tenant.js', verificationScript)
  console.log('\n✅ Verification script created: verify-multi-tenant.js')
  console.log('   Run "node verify-multi-tenant.js" after executing the SQL script to verify the implementation')
}

implementMultiTenant()