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

async function analyzeDatabase() {
  console.log('===========================================');
  console.log('COMPLETE SUPABASE DATABASE SCHEMA ANALYSIS');
  console.log('===========================================\n');
  console.log(`Database URL: ${supabaseUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // List of all possible tables to check
  const tablesToCheck = [
    // User and organization tables
    'users', 'profiles', 'organizations', 'organization_users',
    
    // Lead management tables
    'leads', 'lead_status_history', 'lead_notes', 'lead_assignments', 
    'lead_qualification_checklist', 'lead_qualification_responses',
    
    // Sales team tables
    'closers', 'social_sellers', 'sellers', 'admins', 'sdrs',
    
    // Commission and referral tables
    'referrals', 'commissions', 'commission_withdrawals', 'withdrawals',
    'commission_tiers', 'commission_rules', 'payout_requests', 
    'wallet_transactions', 'referral_links', 'referral_stats',
    
    // WhatsApp tables
    'whatsapp_messages', 'whatsapp_conversations', 'whatsapp_templates',
    'whatsapp_contacts', 'whatsapp_instances', 'whatsapp_queue',
    
    // Product and order tables
    'products', 'orders', 'order_items', 'payments', 'invoices',
    
    // System tables
    'notifications', 'audit_logs', 'system_settings', 'roles', 
    'permissions', 'role_permissions', 'user_permissions',
    
    // Form and workflow tables
    'forms', 'form_templates', 'form_responses', 'workflows', 
    'workflow_steps', 'campaigns',
    
    // Analytics tables
    'analytics_events', 'page_views', 'user_sessions', 'metrics'
  ];

  const existingTables = [];
  const missingTables = [];
  const tableDetails = {};

  console.log('PHASE 1: CHECKING TABLE EXISTENCE');
  console.log('=====================================\n');

  for (const tableName of tablesToCheck) {
    try {
      // Try to query the table with a limit of 0 to check if it exists
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (!error) {
        existingTables.push(tableName);
        console.log(`✓ ${tableName.padEnd(30)} EXISTS`);
        
        // If we got data, analyze the structure
        if (data && data.length > 0) {
          const columns = Object.keys(data[0]);
          tableDetails[tableName] = {
            columns: columns,
            sampleData: data[0]
          };
        } else {
          // Table exists but is empty, try to get structure anyway
          tableDetails[tableName] = {
            columns: [],
            sampleData: null,
            note: 'Table is empty'
          };
        }
      } else {
        if (error.code === 'PGRST204') {
          // Table exists but has no rows
          existingTables.push(tableName);
          console.log(`✓ ${tableName.padEnd(30)} EXISTS (empty)`);
          tableDetails[tableName] = {
            columns: [],
            sampleData: null,
            note: 'Table exists but is empty'
          };
        } else {
          missingTables.push(tableName);
          console.log(`✗ ${tableName.padEnd(30)} NOT FOUND`);
        }
      }
    } catch (e) {
      missingTables.push(tableName);
      console.log(`✗ ${tableName.padEnd(30)} ERROR: ${e.message}`);
    }
  }

  console.log('\n=====================================');
  console.log('SUMMARY:');
  console.log(`Total tables checked: ${tablesToCheck.length}`);
  console.log(`Tables found: ${existingTables.length}`);
  console.log(`Tables missing: ${missingTables.length}`);
  console.log('=====================================\n');

  console.log('\nPHASE 2: DETAILED SCHEMA FOR EXISTING TABLES');
  console.log('================================================\n');

  for (const tableName of existingTables) {
    console.log(`\n📊 TABLE: ${tableName}`);
    console.log('─'.repeat(50));
    
    const details = tableDetails[tableName];
    
    if (details) {
      if (details.columns && details.columns.length > 0) {
        console.log('\nColumns found:');
        details.columns.forEach(col => {
          const value = details.sampleData ? details.sampleData[col] : null;
          let type = 'unknown';
          
          if (value !== null && value !== undefined) {
            if (typeof value === 'string' && !isNaN(Date.parse(value)) && value.includes('-')) {
              type = 'timestamp/date';
            } else if (typeof value === 'boolean') {
              type = 'boolean';
            } else if (typeof value === 'number') {
              type = Number.isInteger(value) ? 'integer' : 'numeric';
            } else if (typeof value === 'string') {
              if (value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                type = 'uuid';
              } else {
                type = 'text/varchar';
              }
            } else if (typeof value === 'object') {
              type = 'jsonb/json';
            }
          }
          
          console.log(`  • ${col.padEnd(25)} (${type})`);
        });
        
        if (details.note) {
          console.log(`\nNote: ${details.note}`);
        }
      } else {
        console.log('\nNo column information available (table might be empty)');
      }
    }
  }

  console.log('\n\nPHASE 3: COMMISSION SYSTEM TABLES STATUS');
  console.log('============================================\n');
  
  const commissionSystemTables = {
    'referrals': 'Stores referral relationships between users',
    'commissions': 'Tracks commission earnings',
    'commission_withdrawals': 'Withdrawal requests for commissions',
    'withdrawals': 'General withdrawal tracking',
    'commission_tiers': 'Commission tier configurations',
    'commission_rules': 'Business rules for commissions',
    'payout_requests': 'Payout request tracking',
    'wallet_transactions': 'Wallet transaction history',
    'referral_links': 'Unique referral links',
    'referral_stats': 'Referral performance statistics'
  };

  console.log('Required tables for commission system:\n');
  
  for (const [table, description] of Object.entries(commissionSystemTables)) {
    const exists = existingTables.includes(table);
    const status = exists ? '✓ EXISTS' : '✗ MISSING';
    const color = exists ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    
    console.log(`${color}${status}${reset} ${table.padEnd(25)} - ${description}`);
    
    if (exists && tableDetails[table] && tableDetails[table].columns.length > 0) {
      console.log(`         Columns: ${tableDetails[table].columns.slice(0, 5).join(', ')}${tableDetails[table].columns.length > 5 ? '...' : ''}`);
    }
  }

  console.log('\n\nPHASE 4: CRITICAL FINDINGS');
  console.log('==============================\n');

  // Check for critical tables
  const criticalTables = ['users', 'profiles', 'organizations', 'leads'];
  const missingCritical = criticalTables.filter(t => !existingTables.includes(t));
  
  if (missingCritical.length > 0) {
    console.log('⚠️  CRITICAL TABLES MISSING:');
    missingCritical.forEach(t => console.log(`   - ${t}`));
  } else {
    console.log('✓ All critical tables are present');
  }

  // Check commission system
  console.log('\n📊 COMMISSION SYSTEM STATUS:');
  const commissionTables = ['referrals', 'commissions', 'commission_withdrawals', 'withdrawals'];
  const existingCommission = commissionTables.filter(t => existingTables.includes(t));
  const missingCommission = commissionTables.filter(t => !existingTables.includes(t));
  
  if (missingCommission.length === 0) {
    console.log('✓ All commission tables exist - System is READY');
  } else if (existingCommission.length > 0) {
    console.log(`⚠️  Partial implementation - ${existingCommission.length}/${commissionTables.length} tables exist`);
    console.log('   Missing:', missingCommission.join(', '));
  } else {
    console.log('✗ Commission system NOT IMPLEMENTED - All tables missing');
  }

  console.log('\n\n=====================================');
  console.log('ANALYSIS COMPLETE');
  console.log('=====================================\n');

  // Export findings to a JSON file
  const findings = {
    timestamp: new Date().toISOString(),
    database: supabaseUrl,
    summary: {
      totalChecked: tablesToCheck.length,
      found: existingTables.length,
      missing: missingTables.length
    },
    existingTables,
    missingTables,
    tableDetails,
    commissionSystemStatus: {
      required: Object.keys(commissionSystemTables),
      existing: existingCommission,
      missing: missingCommission
    }
  };

  const fs = require('fs');
  fs.writeFileSync('database_schema_analysis.json', JSON.stringify(findings, null, 2));
  console.log('📁 Full analysis exported to: database_schema_analysis.json\n');

  return findings;
}

// Run the analysis
analyzeDatabase().then(() => {
  console.log('✅ Analysis completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});