const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixKellyAccess() {
  console.log('=== Fixing Kelly Access Issue ===\n');

  try {
    // 1. First, let's check if Kelly exists in organization_users at all
    console.log('1. Checking if Kelly exists in organization_users:');
    const { data: kellyOrgUser, error: kellyCheckError } = await supabase
      .from('organization_users')
      .select('*')
      .eq('email', 'kelly@gmail.com');
    
    if (kellyCheckError) {
      console.error('Error checking Kelly:', kellyCheckError);
      return;
    }

    console.log('Kelly in organization_users:', JSON.stringify(kellyOrgUser, null, 2));

    // 2. Check if Kelly exists in auth.users
    console.log('\n2. Checking if Kelly exists in auth.users:');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return;
    }

    const kellyAuth = users.find(u => u.email === 'kelly@gmail.com');
    console.log('Kelly in auth.users:', kellyAuth ? `Found with ID: ${kellyAuth.id}` : 'NOT FOUND');

    // 3. Get the correct organization (Admin Organization)
    console.log('\n3. Getting Admin Organization details:');
    const { data: adminOrg, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('name', 'Admin Organization')
      .single();
    
    if (orgError) {
      console.error('Error fetching Admin Organization:', orgError);
      return;
    }

    console.log('Admin Organization:', JSON.stringify(adminOrg, null, 2));

    // 4. If Kelly doesn't exist in organization_users, add her
    if (!kellyOrgUser || kellyOrgUser.length === 0) {
      console.log('\n4. Kelly not found in organization_users. Adding her to Admin Organization...');
      
      const { data: newKellyOrgUser, error: insertError } = await supabase
        .from('organization_users')
        .insert({
          organization_id: adminOrg.id,
          email: 'kelly@gmail.com',
          role: 'viewer', // or 'manager' if she needs more permissions
          user_id: kellyAuth ? kellyAuth.id : null,
          is_active: true
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error adding Kelly to organization:', insertError);
        return;
      }

      console.log('Kelly added to organization:', JSON.stringify(newKellyOrgUser, null, 2));
    } else {
      // Update Kelly's organization if needed
      const currentKelly = kellyOrgUser[0];
      
      if (currentKelly.organization_id !== adminOrg.id) {
        console.log('\n4. Kelly is in wrong organization. Updating...');
        
        const { data: updatedKelly, error: updateError } = await supabase
          .from('organization_users')
          .update({
            organization_id: adminOrg.id,
            user_id: kellyAuth ? kellyAuth.id : currentKelly.user_id
          })
          .eq('id', currentKelly.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating Kelly organization:', updateError);
          return;
        }

        console.log('Kelly organization updated:', JSON.stringify(updatedKelly, null, 2));
      } else if (kellyAuth && currentKelly.user_id !== kellyAuth.id) {
        // Update user_id if it's different
        console.log('\n4. Updating Kelly user_id...');
        
        const { data: updatedKelly, error: updateError } = await supabase
          .from('organization_users')
          .update({
            user_id: kellyAuth.id
          })
          .eq('id', currentKelly.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating Kelly user_id:', updateError);
          return;
        }

        console.log('Kelly user_id updated:', JSON.stringify(updatedKelly, null, 2));
      } else {
        console.log('\n4. Kelly is already correctly configured in organization_users');
      }
    }

    // 5. Check leads in the Admin Organization
    console.log('\n5. Checking leads in Admin Organization:');
    const { data: orgLeads, error: leadsError, count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', adminOrg.id);
    
    if (leadsError) {
      console.error('Error counting organization leads:', leadsError);
    } else {
      console.log(`Total leads in Admin Organization: ${count}`);
    }

    // 6. Check RLS policies on leads table
    console.log('\n6. Checking if RLS is enabled on leads table...');
    // We'll need to use raw SQL for this
    const { data: rlsCheck, error: rlsError } = await supabase.rpc('check_rls_status', {
      table_name: 'leads'
    });

    if (rlsError) {
      // Try alternative approach - check if we can query without service role
      console.log('Could not check RLS status directly. Attempting to verify through query...');
    } else {
      console.log('RLS status:', rlsCheck);
    }

    // 7. Verify final setup
    console.log('\n7. Final verification - Kelly\'s access:');
    const { data: finalCheck, error: finalError } = await supabase
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
    
    if (finalError) {
      console.error('Error in final check:', finalError);
    } else {
      console.log('Kelly\'s final configuration:', JSON.stringify(finalCheck, null, 2));
      console.log('\n✅ Kelly should now be able to access leads from organization:', finalCheck.organizations.name);
      console.log('Organization ID:', finalCheck.organization_id);
      console.log('Role:', finalCheck.role);
      console.log('User ID:', finalCheck.user_id || 'Not linked to auth.users yet (will be linked on first login)');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the fix
fixKellyAccess();