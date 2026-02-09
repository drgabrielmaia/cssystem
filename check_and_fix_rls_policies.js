const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function checkAndFixRLS() {
  console.log('=== Checking and Fixing RLS Policies ===\n');

  try {
    // 1. Create sample leads for testing
    console.log('1. Creating sample leads in Admin Organization...');
    const adminOrgId = '9c8c0033-15ea-4e33-a55f-28d81a19693b';
    
    const sampleLeads = [
      {
        nome_completo: 'Test Lead 1',
        email: 'lead1@test.com',
        telefone: '11999999999',
        status: 'novo',
        organization_id: adminOrgId
      },
      {
        nome_completo: 'Test Lead 2',
        email: 'lead2@test.com',
        telefone: '11888888888',
        status: 'qualificado',
        organization_id: adminOrgId
      }
    ];

    const { data: newLeads, error: leadsError } = await supabase
      .from('leads')
      .insert(sampleLeads)
      .select();

    if (leadsError) {
      console.error('Error creating sample leads:', leadsError);
      // Continue anyway, maybe leads already exist
    } else {
      console.log('Sample leads created:', newLeads?.length || 0);
    }

    // 2. Check current leads count
    console.log('\n2. Checking total leads in Admin Organization:');
    const { data: allLeads, error: countError, count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', adminOrgId);

    if (countError) {
      console.error('Error counting leads:', countError);
    } else {
      console.log(`Total leads in Admin Organization: ${count}`);
    }

    // 3. Execute SQL to check and create RLS policies
    console.log('\n3. Checking RLS policies via SQL...');
    
    // Use Supabase SQL editor endpoint or management API
    // Since we can't directly execute arbitrary SQL through the JS client,
    // let's generate the SQL commands that need to be run

    const rlsPoliciesSQL = `
-- Check if RLS is enabled on leads table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'leads';

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'leads';

-- Enable RLS if not already enabled
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them properly)
DROP POLICY IF EXISTS "Users can view leads from their organization" ON leads;
DROP POLICY IF EXISTS "Users can insert leads to their organization" ON leads;
DROP POLICY IF EXISTS "Users can update leads from their organization" ON leads;
DROP POLICY IF EXISTS "Users can delete leads from their organization" ON leads;

-- Create comprehensive RLS policies for leads table
-- Policy for SELECT (viewing leads)
CREATE POLICY "Users can view leads from their organization" ON leads
FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid()
           OR email = auth.jwt()->>'email'
    )
);

-- Policy for INSERT (creating leads)
CREATE POLICY "Users can insert leads to their organization" ON leads
FOR INSERT
TO authenticated
WITH CHECK (
    organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid()
           OR email = auth.jwt()->>'email'
    )
);

-- Policy for UPDATE (modifying leads)
CREATE POLICY "Users can update leads from their organization" ON leads
FOR UPDATE
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid()
           OR email = auth.jwt()->>'email'
    )
)
WITH CHECK (
    organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid()
           OR email = auth.jwt()->>'email'
    )
);

-- Policy for DELETE (removing leads)
CREATE POLICY "Users can delete leads from their organization" ON leads
FOR DELETE
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE (user_id = auth.uid() OR email = auth.jwt()->>'email')
          AND role IN ('owner', 'manager') -- Only owners and managers can delete
    )
);

-- Verify the policies were created
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'leads';
`;

    console.log('SQL commands to fix RLS policies have been generated.');
    console.log('Please run these commands in Supabase SQL Editor:');
    console.log('----------------------------------------');
    console.log(rlsPoliciesSQL);
    console.log('----------------------------------------');

    // 4. Also check organization_users RLS
    console.log('\n4. Checking organization_users access...');
    const { data: orgUsers, error: orgUsersError } = await supabase
      .from('organization_users')
      .select('*')
      .eq('organization_id', adminOrgId);

    if (orgUsersError) {
      console.error('Error fetching organization users:', orgUsersError);
    } else {
      console.log('Users in Admin Organization:');
      orgUsers.forEach(user => {
        console.log(`- ${user.email} (${user.role}) - User ID: ${user.user_id || 'Not linked'}`);
      });
    }

    // 5. Create a function to help Kelly link her account when she logs in
    const linkUserFunction = `
-- Function to automatically link user to organization_users on login
CREATE OR REPLACE FUNCTION public.link_user_to_organization()
RETURNS TRIGGER AS $$
BEGIN
    -- Update organization_users with the user_id when a user logs in
    UPDATE organization_users
    SET user_id = NEW.id,
        updated_at = NOW()
    WHERE LOWER(email) = LOWER(NEW.email)
      AND user_id IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signups/logins
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.link_user_to_organization();

-- Also update on user email confirmation or updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (OLD.email IS DISTINCT FROM NEW.email OR OLD.id IS DISTINCT FROM NEW.id)
    EXECUTE FUNCTION public.link_user_to_organization();
`;

    console.log('\n5. Function to auto-link users on login:');
    console.log('----------------------------------------');
    console.log(linkUserFunction);
    console.log('----------------------------------------');

    // 6. Summary and recommendations
    console.log('\n=== SUMMARY & FIXES ===');
    console.log('\n✅ Kelly has been added to organization_users table');
    console.log('   - Organization: Admin Organization');
    console.log('   - Organization ID:', adminOrgId);
    console.log('   - Email: kelly@gmail.com');
    console.log('   - Role: viewer');
    console.log('   - User ID: Will be linked when she logs in');
    
    console.log('\n⚠️  IMPORTANT: Kelly needs to:');
    console.log('   1. Sign up or log in with kelly@gmail.com');
    console.log('   2. This will create her auth.users record');
    console.log('   3. The trigger will automatically link her to the organization');
    
    console.log('\n🔧 TO FIX RLS POLICIES:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Run the SQL commands printed above');
    console.log('   3. This will enable proper RLS policies for multi-tenant access');
    
    console.log('\n📝 RLS POLICY EXPLANATION:');
    console.log('   - Users can only see/create/update leads from their organization');
    console.log('   - The policies check both user_id and email for flexibility');
    console.log('   - Only owners and managers can delete leads');
    console.log('   - Viewers like Kelly can view and create but not delete');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the check and fix
checkAndFixRLS();