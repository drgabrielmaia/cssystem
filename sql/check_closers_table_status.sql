-- ====================================
-- CLOSERS TABLE VERIFICATION SCRIPT
-- ====================================
-- This script checks the complete status of the closers table
-- Author: System
-- Date: 2026-02-09
-- ====================================

-- 1. CHECK IF CLOSERS TABLE EXISTS
SELECT 
    '1. Table Existence' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'closers'
        ) 
        THEN 'EXISTS' 
        ELSE 'NOT EXISTS' 
    END as status,
    'Checking if closers table exists in public schema' as description;

-- 2. CHECK CLOSERS TABLE STRUCTURE
SELECT 
    '2. Table Columns' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'closers'
ORDER BY ordinal_position;

-- 3. CHECK ORGANIZATION_ID COLUMN
SELECT 
    '3. Multi-tenancy Support' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'closers'
            AND column_name = 'organization_id'
        ) 
        THEN 'YES - organization_id exists' 
        ELSE 'NO - organization_id missing' 
    END as status,
    'Checking if table supports multi-tenancy' as description;

-- 4. CHECK REQUIRED COLUMNS
WITH required_columns AS (
    SELECT column_name FROM (VALUES 
        ('id'),
        ('nome_completo'),
        ('email'),
        ('tipo_closer'),
        ('status_contrato'),
        ('organization_id'),
        ('created_at'),
        ('updated_at')
    ) AS t(column_name)
),
existing_columns AS (
    SELECT column_name 
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'closers'
)
SELECT 
    '4. Required Columns Check' as check_type,
    rc.column_name,
    CASE 
        WHEN ec.column_name IS NOT NULL THEN 'EXISTS'
        ELSE 'MISSING'
    END as status
FROM required_columns rc
LEFT JOIN existing_columns ec ON rc.column_name = ec.column_name;

-- 5. CHECK INDEXES
SELECT 
    '5. Indexes' as check_type,
    indexname as index_name,
    indexdef as definition
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'closers';

-- 6. CHECK CONSTRAINTS
SELECT 
    '6. Constraints' as check_type,
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.closers'::regclass;

-- 7. CHECK RLS STATUS
SELECT 
    '7. Row Level Security' as check_type,
    CASE 
        WHEN relrowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END as status,
    'RLS status for closers table' as description
FROM pg_class
WHERE relname = 'closers' 
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 8. CHECK RLS POLICIES
SELECT 
    '8. RLS Policies' as check_type,
    polname as policy_name,
    CASE polcmd 
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END as operation,
    polroles::regrole[] as roles
FROM pg_policy
WHERE polrelid = 'public.closers'::regclass;

-- 9. CHECK FOREIGN KEY RELATIONSHIPS
SELECT 
    '9. Foreign Keys' as check_type,
    conname as constraint_name,
    'FROM: ' || a.attname as from_column,
    'TO: ' || cl2.relname || '.' || a2.attname as to_table_column
FROM pg_constraint con
JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
JOIN pg_class cl ON cl.oid = con.conrelid
LEFT JOIN pg_attribute a2 ON a2.attrelid = con.confrelid AND a2.attnum = ANY(con.confkey)
LEFT JOIN pg_class cl2 ON cl2.oid = con.confrelid
WHERE con.contype = 'f'
AND cl.relname = 'closers';

-- 10. CHECK TRIGGERS
SELECT 
    '10. Triggers' as check_type,
    tgname as trigger_name,
    proname as function_name,
    CASE 
        WHEN tgtype & 2 = 2 THEN 'BEFORE'
        ELSE 'AFTER'
    END || ' ' ||
    CASE 
        WHEN tgtype & 4 = 4 THEN 'INSERT'
        WHEN tgtype & 8 = 8 THEN 'DELETE'
        WHEN tgtype & 16 = 16 THEN 'UPDATE'
    END as trigger_event
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.closers'::regclass
AND NOT tgisinternal;

-- 11. CHECK SAMPLE DATA
SELECT 
    '11. Data Statistics' as check_type,
    'Total Records' as metric,
    COUNT(*) as value
FROM public.closers
UNION ALL
SELECT 
    '11. Data Statistics',
    'Active Closers',
    COUNT(*)
FROM public.closers
WHERE status_contrato = 'ativo'
UNION ALL
SELECT 
    '11. Data Statistics',
    'By Type - SDR',
    COUNT(*)
FROM public.closers
WHERE tipo_closer = 'sdr'
UNION ALL
SELECT 
    '11. Data Statistics',
    'By Type - Closer',
    COUNT(*)
FROM public.closers
WHERE tipo_closer = 'closer'
UNION ALL
SELECT 
    '11. Data Statistics',
    'By Type - Senior',
    COUNT(*)
FROM public.closers
WHERE tipo_closer = 'closer_senior'
UNION ALL
SELECT 
    '11. Data Statistics',
    'By Type - Manager',
    COUNT(*)
FROM public.closers
WHERE tipo_closer = 'manager';

-- 12. CHECK LEADS TABLE RELATIONSHIP
SELECT 
    '12. Leads Table Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'leads'
        ) 
        THEN 'EXISTS' 
        ELSE 'NOT EXISTS - Run create_leads_table_if_not_exists.sql' 
    END as status,
    'Checking if leads table exists for relationship' as description;

-- 13. SAMPLE CLOSERS DATA (if exists)
SELECT 
    '13. Sample Closers Data' as check_type,
    nome_completo,
    email,
    tipo_closer,
    status_contrato,
    organization_id
FROM public.closers
LIMIT 5;

-- 14. CHECK RELATED TABLES
SELECT 
    '14. Related Tables' as check_type,
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables t
            WHERE t.table_schema = 'public' 
            AND t.table_name = r.table_name
        ) 
        THEN 'EXISTS' 
        ELSE 'NOT EXISTS' 
    END as status
FROM (VALUES 
    ('closers_vendas'),
    ('closers_metas'),
    ('closers_atividades'),
    ('closers_dashboard_access'),
    ('organizations'),
    ('organization_users'),
    ('leads'),
    ('mentorados')
) AS r(table_name);

-- 15. FINAL SUMMARY
SELECT 
    '15. FINAL SUMMARY' as check_type,
    'Closers table is ' || 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'closers'
        ) 
        THEN 'CONFIGURED' 
        ELSE 'NOT CONFIGURED' 
    END || 
    ' - Total active closers: ' || 
    COALESCE((SELECT COUNT(*)::text FROM public.closers WHERE status_contrato = 'ativo'), '0') as status,
    'Run insert_closers_sample_data.sql to add test data' as next_steps;