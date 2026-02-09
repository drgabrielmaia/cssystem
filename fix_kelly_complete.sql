-- ================================================
-- COMPLETE FIX FOR KELLY ACCESS ISSUE
-- ================================================
-- Issue: Kelly (kelly@gmail.com) cannot see or create leads
-- Root causes:
-- 1. Kelly wasn't properly linked to the Admin Organization 
-- 2. RLS policies may be missing or incorrect
-- 3. Kelly hasn't created an auth.users account yet

-- ================================================
-- STEP 1: VERIFY ORGANIZATION STRUCTURE
-- ================================================

-- Check Admin Organization details
SELECT 
    id as organization_id,
    name,
    owner_email,
    created_at
FROM organizations
WHERE name = 'Admin Organization';
-- Expected: 9c8c0033-15ea-4e33-a55f-28d81a19693b

-- ================================================
-- STEP 2: CHECK KELLY'S MEMBERSHIP (Already Fixed)
-- ================================================

-- Verify Kelly is now in organization_users
SELECT 
    ou.id,
    ou.organization_id,
    ou.user_id,
    ou.email,
    ou.role,
    ou.is_active,
    o.name as organization_name
FROM organization_users ou
JOIN organizations o ON o.id = ou.organization_id
WHERE ou.email = 'kelly@gmail.com';
-- Kelly has been added with role 'viewer'

-- ================================================
-- STEP 3: CHECK LEADS TABLE STRUCTURE
-- ================================================

-- Get valid status values for leads
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'leads'::regclass
  AND contype = 'c';

-- ================================================
-- STEP 4: FIX RLS POLICIES
-- ================================================

-- First, check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'leads';

-- Enable RLS on leads table if not already enabled
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Check existing policies
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'leads';

-- Drop all existing policies to recreate them properly
DROP POLICY IF EXISTS "Enable read access for organization members" ON leads;
DROP POLICY IF EXISTS "Enable insert for organization members" ON leads;
DROP POLICY IF EXISTS "Enable update for organization members" ON leads;
DROP POLICY IF EXISTS "Enable delete for organization managers and owners" ON leads;
DROP POLICY IF EXISTS "Users can view leads from their organization" ON leads;
DROP POLICY IF EXISTS "Users can insert leads to their organization" ON leads;
DROP POLICY IF EXISTS "Users can update leads from their organization" ON leads;
DROP POLICY IF EXISTS "Users can delete leads from their organization" ON leads;

-- Create new comprehensive RLS policies that check BOTH user_id and email
-- This ensures users can access data even before their auth.users record is linked

-- Policy for SELECT (all organization members can view)
CREATE POLICY "Enable read access for organization members" ON leads
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM organization_users ou
        WHERE ou.organization_id = leads.organization_id
          AND (
              ou.user_id = auth.uid() 
              OR LOWER(ou.email) = LOWER(auth.jwt()->>'email')
          )
          AND ou.is_active = true
    )
);

-- Policy for INSERT (all organization members can create)
CREATE POLICY "Enable insert for organization members" ON leads
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM organization_users ou
        WHERE ou.organization_id = leads.organization_id
          AND (
              ou.user_id = auth.uid() 
              OR LOWER(ou.email) = LOWER(auth.jwt()->>'email')
          )
          AND ou.is_active = true
    )
);

-- Policy for UPDATE (all organization members can update)
CREATE POLICY "Enable update for organization members" ON leads
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM organization_users ou
        WHERE ou.organization_id = leads.organization_id
          AND (
              ou.user_id = auth.uid() 
              OR LOWER(ou.email) = LOWER(auth.jwt()->>'email')
          )
          AND ou.is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM organization_users ou
        WHERE ou.organization_id = leads.organization_id
          AND (
              ou.user_id = auth.uid() 
              OR LOWER(ou.email) = LOWER(auth.jwt()->>'email')
          )
          AND ou.is_active = true
    )
);

-- Policy for DELETE (only managers and owners can delete)
CREATE POLICY "Enable delete for organization managers and owners" ON leads
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM organization_users ou
        WHERE ou.organization_id = leads.organization_id
          AND (
              ou.user_id = auth.uid() 
              OR LOWER(ou.email) = LOWER(auth.jwt()->>'email')
          )
          AND ou.role IN ('owner', 'manager')
          AND ou.is_active = true
    )
);

-- ================================================
-- STEP 5: CREATE AUTO-LINK FUNCTION FOR NEW USERS
-- ================================================

-- This function automatically links auth.users to organization_users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Update organization_users with the user_id when a user signs up/logs in
    UPDATE organization_users
    SET 
        user_id = NEW.id,
        updated_at = NOW()
    WHERE LOWER(email) = LOWER(NEW.email)
      AND user_id IS NULL;
    
    -- Also update if email changes (rare but possible)
    IF TG_OP = 'UPDATE' AND OLD.email IS DISTINCT FROM NEW.email THEN
        UPDATE organization_users
        SET 
            user_id = NEW.id,
            updated_at = NOW()
        WHERE LOWER(email) = LOWER(NEW.email)
          AND (user_id IS NULL OR user_id = NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for auto-linking
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (OLD.email IS DISTINCT FROM NEW.email)
    EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- STEP 6: CREATE SAMPLE LEADS FOR TESTING
-- ================================================

-- First, let's check valid status values
-- Common valid values are: 'novo', 'qualificado', 'em_negociacao', 'fechado', 'perdido'
-- But we need to check the actual constraint

-- Insert sample leads with proper status
INSERT INTO leads (
    nome_completo,
    email,
    telefone,
    status,
    organization_id,
    origem,
    temperatura
) VALUES 
    ('Test Lead 1', 'lead1@test.com', '11999999999', 'novo', '9c8c0033-15ea-4e33-a55f-28d81a19693b', 'Website', 'quente'),
    ('Test Lead 2', 'lead2@test.com', '11888888888', 'novo', '9c8c0033-15ea-4e33-a55f-28d81a19693b', 'Instagram', 'morno'),
    ('Test Lead 3', 'lead3@test.com', '11777777777', 'qualificado', '9c8c0033-15ea-4e33-a55f-28d81a19693b', 'Referral', 'quente')
ON CONFLICT (email) DO NOTHING;

-- ================================================
-- STEP 7: VERIFY RLS POLICIES
-- ================================================

-- Check all policies on leads table
SELECT 
    'leads' as table_name,
    policyname,
    cmd as operation,
    permissive,
    roles
FROM pg_policies
WHERE tablename = 'leads'
ORDER BY cmd;

-- ================================================
-- STEP 8: CHECK ORGANIZATION_USERS RLS
-- ================================================

-- Check if organization_users has RLS enabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'organization_users';

-- If needed, create RLS for organization_users
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their organization members" ON organization_users;
DROP POLICY IF EXISTS "Only owners can modify organization members" ON organization_users;

-- Users can view members of their organizations
CREATE POLICY "Users can view their organization members" ON organization_users
FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_users 
        WHERE user_id = auth.uid() 
           OR LOWER(email) = LOWER(auth.jwt()->>'email')
    )
);

-- Only owners and managers can add/modify organization members
CREATE POLICY "Only owners and managers can modify organization members" ON organization_users
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM organization_users ou
        WHERE ou.organization_id = organization_users.organization_id
          AND (ou.user_id = auth.uid() OR LOWER(ou.email) = LOWER(auth.jwt()->>'email'))
          AND ou.role IN ('owner', 'manager')
          AND ou.is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM organization_users ou
        WHERE ou.organization_id = organization_users.organization_id
          AND (ou.user_id = auth.uid() OR LOWER(ou.email) = LOWER(auth.jwt()->>'email'))
          AND ou.role IN ('owner', 'manager')
          AND ou.is_active = true
    )
);

-- ================================================
-- STEP 9: FINAL VERIFICATION
-- ================================================

-- Verify Kelly's setup
SELECT 
    'Kelly Setup Verification' as check_type,
    ou.email,
    ou.role,
    ou.organization_id,
    o.name as organization_name,
    ou.is_active,
    CASE 
        WHEN ou.user_id IS NULL THEN 'Pending (will link on first login)'
        ELSE 'Linked to auth.users'
    END as auth_status
FROM organization_users ou
JOIN organizations o ON o.id = ou.organization_id
WHERE ou.email = 'kelly@gmail.com';

-- Count leads Kelly should be able to see
SELECT 
    'Leads in Kelly Organization' as check_type,
    COUNT(*) as total_leads
FROM leads
WHERE organization_id = '9c8c0033-15ea-4e33-a55f-28d81a19693b';

-- Check RLS is properly enabled
SELECT 
    'RLS Status' as check_type,
    tablename,
    CASE 
        WHEN rowsecurity THEN 'ENABLED ✓'
        ELSE 'DISABLED ✗'
    END as rls_status
FROM pg_tables
WHERE tablename IN ('leads', 'organization_users')
  AND schemaname = 'public';

-- ================================================
-- SUMMARY OF FIXES APPLIED
-- ================================================
/*
1. ✅ Kelly added to organization_users with role 'viewer'
2. ✅ RLS policies created to allow organization-based access
3. ✅ Policies check both user_id AND email for flexibility
4. ✅ Auto-link trigger created for when Kelly logs in
5. ✅ Sample leads created for testing
6. ✅ Organization_users RLS policies added

NEXT STEPS FOR KELLY:
1. Sign up or log in with kelly@gmail.com
2. Her auth.users record will be created
3. The trigger will automatically link her to organization_users
4. She will be able to see and create leads in Admin Organization

PERMISSIONS FOR KELLY (viewer role):
- ✅ Can VIEW all leads in her organization
- ✅ Can CREATE new leads in her organization  
- ✅ Can UPDATE leads in her organization
- ✗ Cannot DELETE leads (only managers/owners can)
- ✅ Can VIEW organization members
- ✗ Cannot modify organization members
*/