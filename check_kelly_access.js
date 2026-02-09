const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function investigateKellyIssue() {
  console.log('=== Investigating Kelly Access Issue ===\n');

  try {
    // 1. Check organizations
    console.log('1. Checking organizations for temp2@admin.com:');
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .or('owner_email.eq.temp2@admin.com,name.ilike.%admin%');
    
    if (orgsError) {
      console.error('Error fetching organizations:', orgsError);
    } else {
      console.log('Organizations found:', JSON.stringify(orgs, null, 2));
    }

    // 2. Check Kelly in auth.users
    console.log('\n2. Checking Kelly in auth.users:');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
    } else {
      const kelly = users.find(u => u.email === 'kelly@gmail.com');
      if (kelly) {
        console.log('Kelly found in auth.users:');
        console.log('- User ID:', kelly.id);
        console.log('- Email:', kelly.email);
        console.log('- Created:', kelly.created_at);
        console.log('- Last Sign In:', kelly.last_sign_in_at);
        console.log('- User Metadata:', JSON.stringify(kelly.user_metadata, null, 2));
      } else {
        console.log('Kelly NOT found in auth.users');
      }
    }

    // 3. Check organization_users
    console.log('\n3. Checking organization_users for Kelly:');
    const { data: orgUsers, error: orgUsersError } = await supabase
      .from('organization_users')
      .select(`
        *,
        organizations (
          id,
          name,
          owner_email
        )
      `)
      .or('email.eq.kelly@gmail.com,email.eq.temp2@admin.com');
    
    if (orgUsersError) {
      console.error('Error fetching organization_users:', orgUsersError);
    } else {
      console.log('Organization users found:', JSON.stringify(orgUsers, null, 2));
    }

    // 4. Check leads table structure
    console.log('\n4. Checking leads table columns:');
    const { data: leadsStructure, error: structError } = await supabase.rpc('get_table_columns', {
      table_name: 'leads'
    }).single();
    
    if (structError) {
      // Try alternative approach
      const { data: sampleLead, error: sampleError } = await supabase
        .from('leads')
        .select('*')
        .limit(1);
      
      if (!sampleError && sampleLead && sampleLead.length > 0) {
        console.log('Leads table columns (from sample):', Object.keys(sampleLead[0]));
      } else {
        console.log('Could not determine leads table structure');
      }
    } else {
      console.log('Leads table columns:', leadsStructure);
    }

    // 5. Check sample leads
    console.log('\n5. Checking sample leads with organizations:');
    const { data: sampleLeads, error: leadsError } = await supabase
      .from('leads')
      .select(`
        id,
        name,
        email,
        organization_id,
        created_at,
        organizations (
          name
        )
      `)
      .limit(5);
    
    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
    } else {
      console.log('Sample leads:', JSON.stringify(sampleLeads, null, 2));
    }

    // 6. Count leads Kelly should be able to see
    console.log('\n6. Checking leads Kelly should access:');
    
    // First get Kelly's organization
    const kellyOrgUser = orgUsers?.find(u => u.email === 'kelly@gmail.com');
    if (kellyOrgUser) {
      const { data: kellyLeads, error: kellyLeadsError, count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', kellyOrgUser.organization_id);
      
      if (kellyLeadsError) {
        console.error('Error counting Kelly leads:', kellyLeadsError);
      } else {
        console.log(`Leads in Kelly's organization (${kellyOrgUser.organization_id}): ${count}`);
      }

      // Check all users in Kelly's organization
      console.log('\n7. All users in Kelly\'s organization:');
      const { data: orgMembers, error: membersError } = await supabase
        .from('organization_users')
        .select('*')
        .eq('organization_id', kellyOrgUser.organization_id);
      
      if (membersError) {
        console.error('Error fetching org members:', membersError);
      } else {
        console.log('Organization members:', JSON.stringify(orgMembers, null, 2));
      }
    } else {
      console.log('Kelly not found in organization_users table!');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the investigation
investigateKellyIssue();