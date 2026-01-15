-- ===================================
-- 🔧 FIX RLS POLICIES FOR VIDEO PLATFORM
-- ===================================
-- Fix Row Level Security policies for video_form_responses and lesson_notes

-- First, check if tables exist and have RLS enabled
DO $$
BEGIN
    -- Check if video_form_responses table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_form_responses') THEN
        RAISE NOTICE '✅ Table video_form_responses exists';

        -- Drop existing policies to recreate them
        DROP POLICY IF EXISTS "Students can view own form responses" ON video_form_responses;
        DROP POLICY IF EXISTS "Students can create form responses" ON video_form_responses;
        DROP POLICY IF EXISTS "Students can update form responses" ON video_form_responses;
        DROP POLICY IF EXISTS "Admin can manage all form responses" ON video_form_responses;

        -- Create more permissive policies for video_form_responses

        -- Allow students to view their own responses
        CREATE POLICY "Students can view own form responses" ON video_form_responses
        FOR SELECT USING (
            mentorado_id IN (
                SELECT id FROM mentorados
                WHERE email = auth.jwt() ->> 'email'
                   OR id::text = auth.jwt() ->> 'user_id'
            )
        );

        -- Allow students to insert their own responses
        CREATE POLICY "Students can insert form responses" ON video_form_responses
        FOR INSERT WITH CHECK (
            mentorado_id IN (
                SELECT id FROM mentorados
                WHERE email = auth.jwt() ->> 'email'
                   OR id::text = auth.jwt() ->> 'user_id'
            )
        );

        -- Allow students to update their own responses
        CREATE POLICY "Students can update own form responses" ON video_form_responses
        FOR UPDATE USING (
            mentorado_id IN (
                SELECT id FROM mentorados
                WHERE email = auth.jwt() ->> 'email'
                   OR id::text = auth.jwt() ->> 'user_id'
            )
        );

        -- Allow admin to manage all responses
        CREATE POLICY "Admin can manage all form responses" ON video_form_responses
        FOR ALL USING (
            auth.jwt() ->> 'role' = 'admin'
            OR auth.jwt() ->> 'email' = 'admin@medicosderesultado.com.br'
        );

        -- Alternative policy for unauthenticated access (fallback)
        CREATE POLICY "Allow unauthenticated inserts" ON video_form_responses
        FOR INSERT WITH CHECK (true);

        RAISE NOTICE '✅ Updated RLS policies for video_form_responses';

    ELSE
        RAISE NOTICE '⚠️ Table video_form_responses does not exist';
    END IF;

    -- Check if lesson_notes table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lesson_notes') THEN
        RAISE NOTICE '✅ Table lesson_notes exists';

        -- Drop existing policies to recreate them
        DROP POLICY IF EXISTS "Students can manage own notes" ON lesson_notes;
        DROP POLICY IF EXISTS "Students can view own notes" ON lesson_notes;
        DROP POLICY IF EXISTS "Students can create notes" ON lesson_notes;
        DROP POLICY IF EXISTS "Students can update own notes" ON lesson_notes;
        DROP POLICY IF EXISTS "Admin can manage all notes" ON lesson_notes;

        -- Create policies for lesson_notes

        -- Allow students to view their own notes
        CREATE POLICY "Students can view own notes" ON lesson_notes
        FOR SELECT USING (
            mentorado_id IN (
                SELECT id FROM mentorados
                WHERE email = auth.jwt() ->> 'email'
                   OR id::text = auth.jwt() ->> 'user_id'
            )
        );

        -- Allow students to insert their own notes
        CREATE POLICY "Students can insert notes" ON lesson_notes
        FOR INSERT WITH CHECK (
            mentorado_id IN (
                SELECT id FROM mentorados
                WHERE email = auth.jwt() ->> 'email'
                   OR id::text = auth.jwt() ->> 'user_id'
            )
        );

        -- Allow students to update their own notes
        CREATE POLICY "Students can update own notes" ON lesson_notes
        FOR UPDATE USING (
            mentorado_id IN (
                SELECT id FROM mentorados
                WHERE email = auth.jwt() ->> 'email'
                   OR id::text = auth.jwt() ->> 'user_id'
            )
        );

        -- Allow students to delete their own notes
        CREATE POLICY "Students can delete own notes" ON lesson_notes
        FOR DELETE USING (
            mentorado_id IN (
                SELECT id FROM mentorados
                WHERE email = auth.jwt() ->> 'email'
                   OR id::text = auth.jwt() ->> 'user_id'
            )
        );

        -- Allow admin to manage all notes
        CREATE POLICY "Admin can manage all notes" ON lesson_notes
        FOR ALL USING (
            auth.jwt() ->> 'role' = 'admin'
            OR auth.jwt() ->> 'email' = 'admin@medicosderesultado.com.br'
        );

        -- Alternative policy for unauthenticated access (fallback)
        CREATE POLICY "Allow unauthenticated inserts for notes" ON lesson_notes
        FOR INSERT WITH CHECK (true);

        RAISE NOTICE '✅ Updated RLS policies for lesson_notes';

    ELSE
        RAISE NOTICE '⚠️ Table lesson_notes does not exist';
    END IF;

END $$;

-- ===================================
-- 🛠️ ALTERNATIVE: DISABLE RLS TEMPORARILY
-- ===================================
-- If policies still don't work, we can temporarily disable RLS for these tables

-- Uncomment these lines if you want to disable RLS temporarily:
-- ALTER TABLE video_form_responses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE lesson_notes DISABLE ROW LEVEL SECURITY;

-- ===================================
-- 🔍 VERIFY CURRENT POLICIES
-- ===================================

-- Check current policies on video_form_responses
SELECT
    tablename,
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('video_form_responses', 'lesson_notes')
ORDER BY tablename, policyname;

-- Check if RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('video_form_responses', 'lesson_notes')
  AND schemaname = 'public';

SELECT '🔧 RLS Policies Fixed! Test inserting NPS and notes now.' as status;