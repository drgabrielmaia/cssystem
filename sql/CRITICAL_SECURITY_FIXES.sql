-- ============================================================
-- CRITICAL SECURITY FIXES - APPLY IMMEDIATELY
-- Date: February 13, 2026
-- Priority: CRITICAL - Apply within 24 hours
-- ============================================================

-- ============================================================
-- PART 1: ENABLE RLS ON UNPROTECTED TABLES
-- ============================================================

-- Enable RLS on critical tables that are currently unprotected
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE closers_dashboard_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE closers_activities ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 2: CREATE HELPER FUNCTIONS FOR RLS
-- ============================================================

-- Function to get current user's organization_id
CREATE OR REPLACE FUNCTION auth.get_user_organization_id()
RETURNS UUID
LANGUAGE SQL 
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id
  FROM public.organization_users
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

-- Function to check if user is admin or owner
CREATE OR REPLACE FUNCTION auth.is_admin_or_owner()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_users
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
      AND is_active = true
  );
$$;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION auth.has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_users
    WHERE user_id = auth.uid()
      AND role = required_role
      AND is_active = true
  );
$$;

-- ============================================================
-- PART 3: RLS POLICIES FOR lead_history
-- ============================================================

DROP POLICY IF EXISTS "Organization members can view lead history" ON lead_history;
DROP POLICY IF EXISTS "Organization members can create lead history" ON lead_history;

CREATE POLICY "Organization members can view lead history"
ON lead_history FOR SELECT
TO authenticated
USING (
  organization_id = auth.get_user_organization_id()
);

CREATE POLICY "Organization members can create lead history"
ON lead_history FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = auth.get_user_organization_id()
);

CREATE POLICY "Organization members can update lead history"
ON lead_history FOR UPDATE
TO authenticated
USING (
  organization_id = auth.get_user_organization_id()
  AND created_by = auth.uid()
)
WITH CHECK (
  organization_id = auth.get_user_organization_id()
);

-- ============================================================
-- PART 4: RLS POLICIES FOR scoring_configurations
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage scoring configurations" ON scoring_configurations;
DROP POLICY IF EXISTS "Organization members can view scoring configurations" ON scoring_configurations;

CREATE POLICY "Organization members can view scoring configurations"
ON scoring_configurations FOR SELECT
TO authenticated
USING (
  organization_id = auth.get_user_organization_id()
);

CREATE POLICY "Admins can create scoring configurations"
ON scoring_configurations FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = auth.get_user_organization_id()
  AND auth.is_admin_or_owner()
);

CREATE POLICY "Admins can update scoring configurations"
ON scoring_configurations FOR UPDATE
TO authenticated
USING (
  organization_id = auth.get_user_organization_id()
  AND auth.is_admin_or_owner()
)
WITH CHECK (
  organization_id = auth.get_user_organization_id()
  AND auth.is_admin_or_owner()
);

CREATE POLICY "Admins can delete scoring configurations"
ON scoring_configurations FOR DELETE
TO authenticated
USING (
  organization_id = auth.get_user_organization_id()
  AND auth.is_admin_or_owner()
);

-- ============================================================
-- PART 5: RLS POLICIES FOR form_questions
-- ============================================================

DROP POLICY IF EXISTS "Organization members can view form questions" ON form_questions;
DROP POLICY IF EXISTS "Admins can manage form questions" ON form_questions;

CREATE POLICY "Organization members can view form questions"
ON form_questions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM form_templates ft
    WHERE ft.id = form_questions.form_template_id
      AND ft.organization_id = auth.get_user_organization_id()
  )
);

CREATE POLICY "Admins can manage form questions"
ON form_questions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM form_templates ft
    WHERE ft.id = form_questions.form_template_id
      AND ft.organization_id = auth.get_user_organization_id()
      AND auth.is_admin_or_owner()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM form_templates ft
    WHERE ft.id = form_questions.form_template_id
      AND ft.organization_id = auth.get_user_organization_id()
      AND auth.is_admin_or_owner()
  )
);

-- ============================================================
-- PART 6: RLS POLICIES FOR closers_dashboard_access
-- ============================================================

DROP POLICY IF EXISTS "Closers can view their own access logs" ON closers_dashboard_access;
DROP POLICY IF EXISTS "System can create access logs" ON closers_dashboard_access;

CREATE POLICY "Closers can view their own access logs"
ON closers_dashboard_access FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM closers c
    WHERE c.id = closers_dashboard_access.closer_id
      AND c.organization_id = auth.get_user_organization_id()
      AND (
        c.email = auth.jwt()->>'email'
        OR auth.is_admin_or_owner()
      )
  )
);

CREATE POLICY "System can create access logs"
ON closers_dashboard_access FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM closers c
    WHERE c.id = closers_dashboard_access.closer_id
      AND c.organization_id = auth.get_user_organization_id()
  )
);

-- ============================================================
-- PART 7: RLS POLICIES FOR closers_activities
-- ============================================================

DROP POLICY IF EXISTS "Organization members can view closer activities" ON closers_activities;
DROP POLICY IF EXISTS "Closers can manage their activities" ON closers_activities;

CREATE POLICY "Organization members can view closer activities"
ON closers_activities FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM closers c
    WHERE c.id = closers_activities.closer_id
      AND c.organization_id = auth.get_user_organization_id()
  )
);

CREATE POLICY "Closers can manage their activities"
ON closers_activities FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM closers c
    WHERE c.id = closers_activities.closer_id
      AND c.organization_id = auth.get_user_organization_id()
      AND (
        c.email = auth.jwt()->>'email'
        OR auth.is_admin_or_owner()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM closers c
    WHERE c.id = closers_activities.closer_id
      AND c.organization_id = auth.get_user_organization_id()
  )
);

-- ============================================================
-- PART 8: STRENGTHEN EXISTING POLICIES
-- ============================================================

-- Strengthen leads table policies
DROP POLICY IF EXISTS "Organization members can view leads" ON leads;
CREATE POLICY "Organization members can view leads"
ON leads FOR SELECT
TO authenticated
USING (
  organization_id = auth.get_user_organization_id()
);

DROP POLICY IF EXISTS "Organization members can create leads" ON leads;
CREATE POLICY "Organization members can create leads"
ON leads FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = auth.get_user_organization_id()
);

DROP POLICY IF EXISTS "Organization members can update leads" ON leads;
CREATE POLICY "Organization members can update leads"
ON leads FOR UPDATE
TO authenticated
USING (
  organization_id = auth.get_user_organization_id()
)
WITH CHECK (
  organization_id = auth.get_user_organization_id()
);

-- Strengthen mentorados table policies
DROP POLICY IF EXISTS "Organization members can view mentorados" ON mentorados;
CREATE POLICY "Organization members can view mentorados"
ON mentorados FOR SELECT
TO authenticated
USING (
  organization_id = auth.get_user_organization_id()
);

DROP POLICY IF EXISTS "Admins can manage mentorados" ON mentorados;
CREATE POLICY "Admins can manage mentorados"
ON mentorados FOR ALL
TO authenticated
USING (
  organization_id = auth.get_user_organization_id()
  AND auth.is_admin_or_owner()
)
WITH CHECK (
  organization_id = auth.get_user_organization_id()
  AND auth.is_admin_or_owner()
);

-- Strengthen closers table policies  
DROP POLICY IF EXISTS "Organization members can view closers" ON closers;
CREATE POLICY "Organization members can view closers"
ON closers FOR SELECT
TO authenticated
USING (
  organization_id = auth.get_user_organization_id()
);

DROP POLICY IF EXISTS "Admins can manage closers" ON closers;
CREATE POLICY "Admins can manage closers"
ON closers FOR ALL
TO authenticated
USING (
  organization_id = auth.get_user_organization_id()
  AND auth.is_admin_or_owner()
)
WITH CHECK (
  organization_id = auth.get_user_organization_id()
  AND auth.is_admin_or_owner()
);

-- ============================================================
-- PART 9: CREATE SECURITY AUDIT TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_severity TEXT CHECK (event_severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  user_id UUID,
  organization_id UUID,
  ip_address INET,
  user_agent TEXT,
  request_path TEXT,
  request_method TEXT,
  response_status INT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_audit_log_organization ON security_audit_log(organization_id);
CREATE INDEX idx_security_audit_log_user ON security_audit_log(user_id);
CREATE INDEX idx_security_audit_log_created_at ON security_audit_log(created_at);
CREATE INDEX idx_security_audit_log_event_type ON security_audit_log(event_type);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security logs"
ON security_audit_log FOR SELECT
TO authenticated
USING (
  organization_id = auth.get_user_organization_id()
  AND auth.is_admin_or_owner()
);

-- ============================================================
-- PART 10: PASSWORD SECURITY MIGRATION
-- ============================================================

-- Add new secure password columns
ALTER TABLE mentorados 
ADD COLUMN IF NOT EXISTS password_hash_bcrypt TEXT,
ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ;

ALTER TABLE closers
ADD COLUMN IF NOT EXISTS password_hash_bcrypt TEXT,
ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ;

ALTER TABLE organization_users
ADD COLUMN IF NOT EXISTS password_hash_bcrypt TEXT,
ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mfa_secret TEXT;

-- ============================================================
-- PART 11: CREATE FUNCTION TO LOG SECURITY EVENTS
-- ============================================================

CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_event_severity TEXT,
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO security_audit_log (
    event_type,
    event_severity,
    user_id,
    organization_id,
    metadata,
    created_at
  ) VALUES (
    p_event_type,
    p_event_severity,
    COALESCE(p_user_id, auth.uid()),
    COALESCE(p_organization_id, auth.get_user_organization_id()),
    p_metadata,
    NOW()
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- ============================================================
-- PART 12: CREATE TRIGGERS FOR SECURITY EVENTS
-- ============================================================

-- Trigger for failed login attempts
CREATE OR REPLACE FUNCTION track_failed_login()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log the failed attempt
  PERFORM log_security_event(
    'FAILED_LOGIN',
    'MEDIUM',
    NULL,
    NEW.organization_id,
    jsonb_build_object(
      'email', NEW.email,
      'attempt_number', NEW.failed_login_attempts
    )
  );
  
  -- Lock account after 5 failed attempts
  IF NEW.failed_login_attempts >= 5 THEN
    NEW.account_locked_until := NOW() + INTERVAL '30 minutes';
    
    PERFORM log_security_event(
      'ACCOUNT_LOCKED',
      'HIGH',
      NULL,
      NEW.organization_id,
      jsonb_build_object(
        'email', NEW.email,
        'locked_until', NEW.account_locked_until
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to mentorados
CREATE TRIGGER track_mentorado_failed_login
AFTER UPDATE OF failed_login_attempts ON mentorados
FOR EACH ROW
WHEN (NEW.failed_login_attempts > OLD.failed_login_attempts)
EXECUTE FUNCTION track_failed_login();

-- Apply trigger to closers
CREATE TRIGGER track_closer_failed_login
AFTER UPDATE OF failed_login_attempts ON closers
FOR EACH ROW
WHEN (NEW.failed_login_attempts > OLD.failed_login_attempts)
EXECUTE FUNCTION track_failed_login();

-- ============================================================
-- PART 13: VALIDATE ALL RLS IS ENABLED
-- ============================================================

DO $$
DECLARE
  r RECORD;
  v_count INT := 0;
BEGIN
  -- Check all tables and report RLS status
  FOR r IN 
    SELECT 
      c.relname as table_name,
      c.relrowsecurity as rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname NOT IN ('schema_migrations', 'ar_internal_metadata')
    ORDER BY c.relname
  LOOP
    IF NOT r.rls_enabled THEN
      RAISE WARNING 'Table % does not have RLS enabled!', r.table_name;
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  IF v_count > 0 THEN
    RAISE WARNING '⚠️ % tables found without RLS enabled', v_count;
  ELSE
    RAISE NOTICE '✅ All tables have RLS enabled';
  END IF;
END $$;

-- ============================================================
-- PART 14: GRANT MINIMAL PERMISSIONS
-- ============================================================

-- Revoke all permissions from public
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Grant specific permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Run these queries to verify security is properly configured:

-- 1. Check tables without RLS
SELECT 
  schemaname,
  tablename,
  'ALTER TABLE ' || schemaname || '.' || tablename || ' ENABLE ROW LEVEL SECURITY;' as fix_command
FROM pg_tables t
WHERE schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace  
    WHERE n.nspname = t.schemaname
      AND c.relname = t.tablename
      AND c.relrowsecurity = true
  )
ORDER BY tablename;

-- 2. Check policies per table
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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Check user permissions
SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee NOT IN ('postgres', 'supabase_admin')
ORDER BY grantee, table_name, privilege_type;

-- ============================================================
-- END OF CRITICAL SECURITY FIXES
-- ============================================================

-- IMPORTANT: After applying these fixes:
-- 1. Test all application functionality
-- 2. Monitor security_audit_log for suspicious activity
-- 3. Implement password migration for existing users
-- 4. Update application code to use bcrypt passwords
-- 5. Enable MFA for admin accounts
-- 6. Schedule regular security audits