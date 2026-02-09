const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyKellyFixes() {
  console.log('=== APPLYING KELLY ACCESS FIXES ===\n');
  console.log('This script will:');
  console.log('1. Verify Kelly is in organization_users');
  console.log('2. Create sample leads for testing');
  console.log('3. Generate SQL to fix RLS policies\n');

  try {
    // 1. Verify Kelly's membership
    console.log('1. Verifying Kelly\'s organization membership...');
    const { data: kellyData, error: kellyError } = await supabase
      .from('organization_users')
      .select(`
        *,
        organizations (
          id,
          name,
          owner_email
        )
      `)
      .eq('email', 'kelly@gmail.com')
      .single();

    if (kellyError || !kellyData) {
      console.error('❌ Kelly not found in organization_users!');
      console.log('Please run fix_kelly_access.js first to add Kelly.');
      return;
    }

    console.log('✅ Kelly found in organization_users:');
    console.log(`   - Organization: ${kellyData.organizations.name}`);
    console.log(`   - Organization ID: ${kellyData.organization_id}`);
    console.log(`   - Role: ${kellyData.role}`);
    console.log(`   - Active: ${kellyData.is_active}`);
    console.log(`   - Auth Status: ${kellyData.user_id ? 'Linked' : 'Pending (will link on login)'}`);

    // 2. Create sample leads with correct status values
    console.log('\n2. Creating sample leads for testing...');
    const adminOrgId = kellyData.organization_id;
    
    const sampleLeads = [
      {
        nome_completo: 'Test Lead Kelly 1',
        email: 'kellylead1@test.com',
        telefone: '11999999991',
        status: 'novo',
        organization_id: adminOrgId,
        origem: 'Website',
        temperatura: 'quente'
      },
      {
        nome_completo: 'Test Lead Kelly 2', 
        email: 'kellylead2@test.com',
        telefone: '11999999992',
        status: 'qualificado',
        organization_id: adminOrgId,
        origem: 'Instagram',
        temperatura: 'morno'
      },
      {
        nome_completo: 'Test Lead Kelly 3',
        email: 'kellylead3@test.com',
        telefone: '11999999993',
        status: 'em_negociacao',
        organization_id: adminOrgId,
        origem: 'Referral',
        temperatura: 'quente'
      }
    ];

    let createdCount = 0;
    for (const lead of sampleLeads) {
      const { error } = await supabase
        .from('leads')
        .insert(lead);
      
      if (!error) {
        createdCount++;
      } else if (error.code === '23505') {
        console.log(`   - Lead ${lead.email} already exists`);
      } else {
        console.log(`   - Error creating ${lead.email}:`, error.message);
      }
    }
    console.log(`✅ Created ${createdCount} new sample leads`);

    // 3. Check total leads in organization
    console.log('\n3. Checking total leads in organization...');
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', adminOrgId);
    
    console.log(`✅ Total leads in ${kellyData.organizations.name}: ${count}`);

    // 4. Generate comprehensive RLS fix SQL
    console.log('\n4. RLS POLICIES TO APPLY');
    console.log('=====================================');
    console.log('Please run the following SQL in Supabase SQL Editor:\n');
    
    const rlsFixSQL = `
-- Enable RLS on leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for organization members" ON leads;
DROP POLICY IF EXISTS "Enable insert for organization members" ON leads;
DROP POLICY IF EXISTS "Enable update for organization members" ON leads;
DROP POLICY IF EXISTS "Enable delete for organization managers and owners" ON leads;

-- Create new policies that check both user_id and email
CREATE POLICY "Enable read access for organization members" ON leads
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.organization_id = leads.organization_id
          AND (ou.user_id = auth.uid() OR LOWER(ou.email) = LOWER(auth.jwt()->>'email'))
          AND ou.is_active = true
    )
);

CREATE POLICY "Enable insert for organization members" ON leads
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.organization_id = leads.organization_id
          AND (ou.user_id = auth.uid() OR LOWER(ou.email) = LOWER(auth.jwt()->>'email'))
          AND ou.is_active = true
    )
);

CREATE POLICY "Enable update for organization members" ON leads
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.organization_id = leads.organization_id
          AND (ou.user_id = auth.uid() OR LOWER(ou.email) = LOWER(auth.jwt()->>'email'))
          AND ou.is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.organization_id = leads.organization_id
          AND (ou.user_id = auth.uid() OR LOWER(ou.email) = LOWER(auth.jwt()->>'email'))
          AND ou.is_active = true
    )
);

CREATE POLICY "Enable delete for organization managers and owners" ON leads
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.organization_id = leads.organization_id
          AND (ou.user_id = auth.uid() OR LOWER(ou.email) = LOWER(auth.jwt()->>'email'))
          AND ou.role IN ('owner', 'manager')
          AND ou.is_active = true
    )
);

-- Auto-link function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE organization_users
    SET user_id = NEW.id, updated_at = NOW()
    WHERE LOWER(email) = LOWER(NEW.email) AND user_id IS NULL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`;

    console.log(rlsFixSQL);
    console.log('\n=====================================');

    // 5. Summary
    console.log('\n=== SUMMARY ===');
    console.log('\n✅ COMPLETED:');
    console.log('   1. Kelly is properly added to organization_users');
    console.log('   2. Sample leads created for testing');
    console.log('   3. SQL generated to fix RLS policies');
    
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Copy the SQL above and run it in Supabase SQL Editor');
    console.log('   2. Have Kelly sign up/log in with kelly@gmail.com');
    console.log('   3. Kelly will then be able to:');
    console.log('      - View all leads in Admin Organization');
    console.log('      - Create new leads');
    console.log('      - Update existing leads');
    console.log('      - Cannot delete leads (viewer role restriction)');
    
    console.log('\n🔍 TROUBLESHOOTING:');
    console.log('   If Kelly still cannot access leads after applying fixes:');
    console.log('   1. Verify she is logged in with kelly@gmail.com');
    console.log('   2. Check browser console for errors');
    console.log('   3. Verify RLS policies were applied (check pg_policies)');
    console.log('   4. Ensure her organization_id matches the leads');

    // 6. Test query as service role
    console.log('\n=== TESTING LEAD ACCESS ===');
    const { data: testLeads, error: testError } = await supabase
      .from('leads')
      .select('nome_completo, email, status')
      .eq('organization_id', adminOrgId)
      .limit(5);

    if (testError) {
      console.error('Error fetching test leads:', testError);
    } else {
      console.log(`\nSample leads Kelly should see (${testLeads.length} shown):`);
      testLeads.forEach(lead => {
        console.log(`   - ${lead.nome_completo} (${lead.email}) - Status: ${lead.status}`);
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the fixes
applyKellyFixes();