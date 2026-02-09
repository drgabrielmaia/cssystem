-- Investigation script for Kelly's access issue
-- kelly@gmail.com under temp2@admin.com organization

-- 1. Check organizations table to identify the correct organization_id for "admin" org
SELECT 
    id as organization_id,
    name,
    owner_email,
    created_at
FROM organizations
WHERE owner_email = 'temp2@admin.com'
   OR name ILIKE '%admin%'
ORDER BY created_at;

-- 2. Check if kelly@gmail.com exists in auth.users
SELECT 
    id as user_id,
    email,
    created_at,
    last_sign_in_at,
    raw_user_meta_data
FROM auth.users
WHERE email = 'kelly@gmail.com';

-- 3. Check organization_users table for Kelly's membership
SELECT 
    ou.id,
    ou.organization_id,
    ou.user_id,
    ou.email,
    ou.role,
    ou.created_at,
    o.name as organization_name,
    o.owner_email
FROM organization_users ou
LEFT JOIN organizations o ON o.id = ou.organization_id
WHERE ou.email = 'kelly@gmail.com'
   OR ou.email = 'temp2@admin.com';

-- 4. Check leads table structure and sample data
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'leads'
ORDER BY ordinal_position;

-- 5. Check RLS policies on leads table
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
WHERE tablename = 'leads';

-- 6. Check if RLS is enabled on leads table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'leads';

-- 7. Check sample leads data with organization info
SELECT 
    l.id,
    l.name,
    l.email,
    l.organization_id,
    l.created_at,
    o.name as organization_name
FROM leads l
LEFT JOIN organizations o ON o.id = l.organization_id
LIMIT 10;

-- 8. Test what Kelly can see (simulating her access)
-- First get Kelly's user_id from auth.users
WITH kelly_user AS (
    SELECT id FROM auth.users WHERE email = 'kelly@gmail.com' LIMIT 1
),
kelly_org AS (
    SELECT organization_id 
    FROM organization_users 
    WHERE email = 'kelly@gmail.com' 
    LIMIT 1
)
SELECT 
    'Leads Kelly should see' as query_type,
    COUNT(*) as count
FROM leads l
WHERE l.organization_id IN (SELECT organization_id FROM kelly_org);

-- 9. Check all users in Kelly's organization
WITH kelly_org AS (
    SELECT organization_id 
    FROM organization_users 
    WHERE email = 'kelly@gmail.com' 
    LIMIT 1
)
SELECT 
    ou.email,
    ou.role,
    ou.user_id,
    au.email as auth_email
FROM organization_users ou
LEFT JOIN auth.users au ON au.id = ou.user_id
WHERE ou.organization_id IN (SELECT organization_id FROM kelly_org)
ORDER BY ou.created_at;

-- 10. Check if there are any triggers or functions affecting lead access
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'leads';