
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
