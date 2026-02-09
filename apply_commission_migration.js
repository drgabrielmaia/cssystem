const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
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

async function applyMigration() {
  console.log('========================================');
  console.log('APPLYING COMMISSION SYSTEM MIGRATION');
  console.log('========================================\n');
  console.log('Database:', supabaseUrl);
  console.log('Timestamp:', new Date().toISOString());
  console.log('\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20260209_complete_commission_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');
    console.log('Size:', (migrationSQL.length / 1024).toFixed(2), 'KB');
    console.log('\n');

    // Split the migration into individual statements
    // This is a simplified approach - for production, use a proper SQL parser
    const statements = migrationSQL
      .split(/;\s*$/gm)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Since Supabase doesn't allow direct SQL execution via the JS client,
    // we need to use the SQL Editor in Supabase Dashboard or use migrations via CLI
    
    console.log('⚠️  IMPORTANT: Direct SQL execution is not available via Supabase JS client.');
    console.log('\n');
    console.log('To apply this migration, you have 3 options:\n');
    console.log('OPTION 1: Supabase Dashboard (Recommended)');
    console.log('=========================================');
    console.log('1. Go to: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/sql/new');
    console.log('2. Copy the contents of: supabase/migrations/20260209_complete_commission_system.sql');
    console.log('3. Paste and run the migration in the SQL Editor');
    console.log('\n');
    
    console.log('OPTION 2: Supabase CLI');
    console.log('======================');
    console.log('1. Install Supabase CLI: npm install -g supabase');
    console.log('2. Link your project: supabase link --project-ref udzmlnnztzzwrphhizol');
    console.log('3. Run migration: supabase db push');
    console.log('\n');
    
    console.log('OPTION 3: Using psql (Advanced)');
    console.log('===============================');
    console.log('1. Get connection string from Supabase Dashboard > Settings > Database');
    console.log('2. Run: psql "YOUR_CONNECTION_STRING" -f supabase/migrations/20260209_complete_commission_system.sql');
    console.log('\n');

    // Let's verify what tables will be created
    console.log('📋 TABLES TO BE CREATED:');
    console.log('========================');
    const tablesToCreate = [
      'profiles - User profiles linked to auth.users',
      'social_sellers - Social media sellers/influencers',
      'sdrs - Sales Development Representatives',
      'referrals - Referral relationships',
      'referral_links - Trackable referral links',
      'commission_rules - Commission calculation rules',
      'commissions - Commission records',
      'withdrawals - Withdrawal requests',
      'commission_withdrawals - Links commissions to withdrawals',
      'wallet_transactions - Complete transaction history'
    ];
    
    tablesToCreate.forEach(table => {
      console.log(`  ✓ ${table}`);
    });
    
    console.log('\n');
    console.log('🔧 FUNCTIONS TO BE CREATED:');
    console.log('===========================');
    console.log('  ✓ update_updated_at_column() - Auto-update timestamps');
    console.log('  ✓ calculate_commission() - Calculate commission amounts');
    console.log('  ✓ process_referral_conversion() - Handle referral conversions');
    
    console.log('\n');
    console.log('🔒 SECURITY FEATURES:');
    console.log('====================');
    console.log('  ✓ Row Level Security (RLS) enabled on all tables');
    console.log('  ✓ Organization-based access control');
    console.log('  ✓ User-specific policies for sensitive data');
    
    console.log('\n');
    console.log('✅ MIGRATION FILE IS READY!');
    console.log('\n');
    console.log('The migration file includes:');
    console.log('- Complete table definitions with proper data types');
    console.log('- All necessary indexes for performance');
    console.log('- Foreign key relationships');
    console.log('- RLS policies for security');
    console.log('- Helper functions and triggers');
    console.log('- Data migration from existing leads table');
    
    console.log('\n');
    console.log('⚠️  BEFORE RUNNING THE MIGRATION:');
    console.log('==================================');
    console.log('1. BACKUP your database (Supabase Dashboard > Settings > Backups)');
    console.log('2. Review the migration file for any customizations needed');
    console.log('3. Test in a development environment if possible');
    console.log('4. Run the migration using one of the options above');
    
    console.log('\n');
    console.log('📝 AFTER RUNNING THE MIGRATION:');
    console.log('================================');
    console.log('1. Verify all tables were created successfully');
    console.log('2. Check that RLS policies are active');
    console.log('3. Test the commission calculation functions');
    console.log('4. Update your application code to use the new tables');

    // Save a verification script
    const verificationScript = `
-- Verification Script
-- Run this after migration to confirm everything was created

-- Check if all tables exist
SELECT table_name, 
       CASE 
         WHEN table_name IS NOT NULL THEN '✓ Created'
         ELSE '✗ Missing'
       END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'profiles', 'social_sellers', 'sdrs', 
  'referrals', 'referral_links', 'commission_rules',
  'commissions', 'withdrawals', 'commission_withdrawals',
  'wallet_transactions'
)
ORDER BY table_name;

-- Check if functions were created
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'update_updated_at_column',
  'calculate_commission',
  'process_referral_conversion'
);

-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'profiles', 'commissions', 'withdrawals', 'referrals'
);

-- Count migrated referrals (if any)
SELECT COUNT(*) as migrated_referrals
FROM referrals
WHERE referral_source = 'direct';
`;

    fs.writeFileSync('verify_migration.sql', verificationScript);
    console.log('\n');
    console.log('📄 Verification script saved to: verify_migration.sql');
    console.log('   Run this after migration to verify everything was created correctly.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the migration helper
applyMigration().then(() => {
  console.log('\n');
  console.log('========================================');
  console.log('MIGRATION PREPARATION COMPLETE');
  console.log('========================================');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});