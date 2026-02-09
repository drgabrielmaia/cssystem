const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeDatabase() {
  console.log('=== ANALYZING DATABASE STRUCTURE ===\n');
  
  try {
    // 1. Get mentorados table structure
    console.log('1. MENTORADOS TABLE:');
    const { data: mentoradosSample, error: mentoradosError } = await supabase
      .from('mentorados')
      .select('*')
      .limit(1);
    
    if (mentoradosSample && mentoradosSample.length > 0) {
      console.log('Columns:', Object.keys(mentoradosSample[0]));
    } else if (mentoradosError) {
      console.log('Error:', mentoradosError.message);
    }

    // 2. Get organizations table structure
    console.log('\n2. ORGANIZATIONS TABLE:');
    const { data: orgSample, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);
    
    if (orgSample && orgSample.length > 0) {
      console.log('Columns:', Object.keys(orgSample[0]));
    } else if (orgError) {
      console.log('Error:', orgError.message);
    }

    // 3. Get users table structure
    console.log('\n3. USERS TABLE:');
    const { data: usersSample, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersSample && usersSample.length > 0) {
      console.log('Columns:', Object.keys(usersSample[0]));
    } else if (usersError) {
      console.log('Error:', usersError.message);
    }

    // 4. Check if closers table exists
    console.log('\n4. CHECKING FOR CLOSERS TABLE:');
    const { data: closersSample, error: closersError } = await supabase
      .from('closers')
      .select('*')
      .limit(1);
    
    if (closersSample) {
      console.log('Table exists! Columns:', closersSample.length > 0 ? Object.keys(closersSample[0]) : 'Empty table');
    } else if (closersError) {
      console.log('Table does not exist or error:', closersError.message);
    }

    // 5. Check organization_users table
    console.log('\n5. ORGANIZATION_USERS TABLE:');
    const { data: orgUsersSample, error: orgUsersError } = await supabase
      .from('organization_users')
      .select('*')
      .limit(1);
    
    if (orgUsersSample && orgUsersSample.length > 0) {
      console.log('Columns:', Object.keys(orgUsersSample[0]));
    } else if (orgUsersError) {
      console.log('Error:', orgUsersError.message);
    }

    // 6. Get all table names from database
    console.log('\n6. ALL AVAILABLE TABLES:');
    // This query shows all tables in the public schema
    const { data: tables, error: tablesError } = await supabase.rpc('get_tables_list', {});
    
    if (tables) {
      console.log('Tables:', tables);
    } else if (tablesError) {
      // Try alternative approach - list by attempting common table names
      const commonTables = [
        'mentorados', 'organizations', 'users', 'organization_users',
        'leads', 'closers', 'sdrs', 'comissoes', 'vendas', 'metas',
        'video_modules', 'formularios', 'respostas'
      ];
      
      console.log('Checking common tables:');
      for (const table of commonTables) {
        const { error } = await supabase.from(table).select('*').limit(0);
        if (!error) {
          console.log(`  ✓ ${table}`);
        }
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

analyzeDatabase();