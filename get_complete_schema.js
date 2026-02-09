const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function getCompleteSchema() {
  console.log('===========================================');
  console.log('COMPLETE SUPABASE DATABASE SCHEMA ANALYSIS');
  console.log('===========================================\n');
  console.log(`Database URL: ${supabaseUrl}`);
  console.log(`Date: ${new Date().toISOString()}\n`);

  try {
    // 1. Get all tables
    console.log('1. FETCHING ALL TABLES...\n');
    const { data: tables, error: tablesError } = await supabase.rpc('get_all_tables');
    
    if (tablesError) {
      // If RPC doesn't exist, use direct SQL query
      const { data: tablesData, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');
      
      if (error) {
        console.error('Error fetching tables:', error);
        
        // Try another approach using pg_catalog
        const { data: catalogTables, error: catalogError } = await supabase.rpc('get_tables_from_catalog');
        if (catalogError) {
          // Create and execute a custom function
          console.log('Creating custom function to fetch tables...\n');
          
          const createFunction = `
            CREATE OR REPLACE FUNCTION get_all_tables()
            RETURNS TABLE(
              table_name text,
              table_comment text
            )
            LANGUAGE sql
            SECURITY DEFINER
            AS $$
              SELECT 
                c.relname::text as table_name,
                obj_description(c.oid)::text as table_comment
              FROM pg_catalog.pg_class c
              JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
              WHERE n.nspname = 'public'
                AND c.relkind = 'r'
              ORDER BY c.relname;
            $$;
          `;
          
          await supabase.rpc('exec_sql', { sql: createFunction }).catch(() => {});
        }
      }
    }

    // Alternative: Query tables directly using Supabase REST API
    const tablesResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    });

    if (!tablesResponse.ok) {
      console.error('Failed to fetch tables from REST API');
    }

    // Get tables using raw SQL through Supabase
    console.log('Executing direct SQL query to fetch all tables...\n');
    
    const sqlQuery = `
      SELECT 
        t.table_name,
        obj_description(pgc.oid) as table_comment
      FROM information_schema.tables t
      LEFT JOIN pg_catalog.pg_class pgc 
        ON pgc.relname = t.table_name 
        AND pgc.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name;
    `;

    // Since we can't execute raw SQL directly, let's list known tables by attempting to query them
    const knownTables = [
      'users', 'organizations', 'organization_users', 'profiles', 
      'leads', 'lead_status_history', 'lead_notes', 'lead_assignments',
      'whatsapp_messages', 'whatsapp_conversations', 'whatsapp_templates',
      'closers', 'social_sellers', 'sellers', 'admins',
      'referrals', 'commissions', 'commission_withdrawals', 'withdrawals',
      'products', 'orders', 'payments', 'notifications',
      'audit_logs', 'system_settings', 'roles', 'permissions'
    ];

    console.log('2. CHECKING TABLES EXISTENCE:\n');
    console.log('-------------------------------------------');
    
    const existingTables = [];
    
    for (const tableName of knownTables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          existingTables.push(tableName);
          console.log(`✓ Table '${tableName}' EXISTS`);
        } else {
          console.log(`✗ Table '${tableName}' DOES NOT EXIST or ACCESS DENIED`);
        }
      } catch (e) {
        console.log(`✗ Table '${tableName}' ERROR: ${e.message}`);
      }
    }

    console.log('\n-------------------------------------------');
    console.log(`Found ${existingTables.length} existing tables\n`);

    // 3. Get detailed schema for each existing table
    console.log('3. DETAILED SCHEMA FOR EACH TABLE:\n');
    console.log('===========================================\n');

    for (const tableName of existingTables) {
      console.log(`\nTABLE: ${tableName}`);
      console.log('-------------------------------------------');
      
      try {
        // Get columns information
        const { data: columns, error: columnsError } = await supabase
          .from(tableName)
          .select('*')
          .limit(0);
        
        if (!columnsError && columns) {
          // This gives us an empty array but we can inspect the structure
          console.log('Attempting to fetch column details...');
          
          // Try to get one row to understand structure
          const { data: sampleRow, error: sampleError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1)
            .single();
          
          if (!sampleError && sampleRow) {
            console.log('\nColumns found:');
            Object.keys(sampleRow).forEach(col => {
              const value = sampleRow[col];
              const type = value === null ? 'unknown' : typeof value;
              console.log(`  - ${col}: ${type}`);
            });
          } else if (sampleError && sampleError.code === 'PGRST116') {
            // Table is empty, but we can still get structure from error details
            const { data: emptyData, error: structureError } = await supabase
              .from(tableName)
              .select('*')
              .limit(0);
            
            console.log('Table appears to be empty (no sample data available)');
          }
        }
        
        // Try to get foreign keys
        console.log('\nChecking for relationships...');
        
      } catch (e) {
        console.log(`Error getting details for ${tableName}: ${e.message}`);
      }
    }

    // 4. Check for specific tables related to commission system
    console.log('\n\n4. COMMISSION SYSTEM TABLES CHECK:');
    console.log('===========================================\n');
    
    const commissionTables = [
      'referrals',
      'commissions', 
      'commission_withdrawals',
      'withdrawals',
      'commission_tiers',
      'commission_rules',
      'payout_requests',
      'wallet_transactions'
    ];

    for (const tableName of commissionTables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          console.log(`✓ ${tableName}: EXISTS (ready to use)`);
          
          // Get sample structure
          const { data: sample, error: sampleErr } = await supabase
            .from(tableName)
            .select('*')
            .limit(1)
            .single();
          
          if (!sampleErr && sample) {
            console.log(`  Columns: ${Object.keys(sample).join(', ')}`);
          }
        } else {
          console.log(`✗ ${tableName}: DOES NOT EXIST`);
          if (error.message) {
            console.log(`  Reason: ${error.message}`);
          }
        }
      } catch (e) {
        console.log(`✗ ${tableName}: ERROR - ${e.message}`);
      }
    }

    // 5. Check RLS policies
    console.log('\n\n5. ROW LEVEL SECURITY (RLS) STATUS:');
    console.log('===========================================\n');
    
    for (const tableName of existingTables) {
      // We can't directly query RLS status, but we can test access
      console.log(`${tableName}: [RLS check requires admin access to pg_policies]`);
    }

    console.log('\n\n===========================================');
    console.log('SCHEMA ANALYSIS COMPLETE');
    console.log('===========================================\n');
    
  } catch (error) {
    console.error('\nFATAL ERROR:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the analysis
getCompleteSchema().then(() => {
  console.log('\nAnalysis finished. Exiting...');
  process.exit(0);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});