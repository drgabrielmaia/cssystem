-- ============================================================
-- COMPREHENSIVE RLS SECURITY FIX
-- Date: February 13, 2026
-- Purpose: Implement complete Row Level Security with organization isolation
-- ============================================================

-- ============================================================
-- PART 1: HELPER FUNCTIONS
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

-- Function to check if user belongs to organization
CREATE OR REPLACE FUNCTION auth.user_in_organization(org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_users
    WHERE user_id = auth.uid()
      AND organization_id = org_id
      AND is_active = true
  );
$$;

-- Function to get user's role in organization
CREATE OR REPLACE FUNCTION auth.get_user_role(org_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role
  FROM public.organization_users
  WHERE user_id = auth.uid()
    AND (org_id IS NULL OR organization_id = org_id)
    AND is_active = true
  LIMIT 1;
$$;

-- Function to check if user is admin or owner
CREATE OR REPLACE FUNCTION auth.is_admin_or_owner(org_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_users
    WHERE user_id = auth.uid()
      AND (org_id IS NULL OR organization_id = org_id)
      AND role IN ('admin', 'owner')
      AND is_active = true
  );
$$;

-- ============================================================
-- PART 2: ORGANIZATIONS TABLE POLICIES
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organization" ON organizations;

-- Users can only see their own organization
CREATE POLICY "Users can view their organization"
ON organizations FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = auth.uid() 
      AND is_active = true
  )
);

-- Only owners can update organization settings
CREATE POLICY "Owners can update their organization"
ON organizations FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = auth.uid() 
      AND role = 'owner'
      AND is_active = true
  )
);

-- ============================================================
-- PART 3: ORGANIZATION_USERS TABLE POLICIES
-- ============================================================

ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view organization members" ON organization_users;
DROP POLICY IF EXISTS "Admins can manage organization users" ON organization_users;

-- Users can see other members of their organization
CREATE POLICY "Users can view organization members"
ON organization_users FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = auth.uid()
      AND is_active = true
  )
);

-- Only admins and owners can add/update/delete users
CREATE POLICY "Admins can insert organization users"
ON organization_users FOR INSERT
TO authenticated
WITH CHECK (
  auth.is_admin_or_owner(organization_id)
);

CREATE POLICY "Admins can update organization users"
ON organization_users FOR UPDATE
TO authenticated
USING (auth.is_admin_or_owner(organization_id))
WITH CHECK (auth.is_admin_or_owner(organization_id));

CREATE POLICY "Admins can delete organization users"
ON organization_users FOR DELETE
TO authenticated
USING (auth.is_admin_or_owner(organization_id));

-- ============================================================
-- PART 4: MENTORADOS TABLE POLICIES
-- ============================================================

ALTER TABLE mentorados ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Organization members can view mentorados" ON mentorados;
DROP POLICY IF EXISTS "Organization members can manage mentorados" ON mentorados;

-- View policy - all organization members can view
CREATE POLICY "Organization members can view mentorados"
ON mentorados FOR SELECT
TO authenticated
USING (
  auth.user_in_organization(organization_id)
);

-- Insert policy - managers and above can create
CREATE POLICY "Managers can create mentorados"
ON mentorados FOR INSERT
TO authenticated
WITH CHECK (
  auth.user_in_organization(organization_id)
  AND auth.get_user_role(organization_id) IN ('owner', 'admin', 'manager')
);

-- Update policy - managers and above can update
CREATE POLICY "Managers can update mentorados"
ON mentorados FOR UPDATE
TO authenticated
USING (
  auth.user_in_organization(organization_id)
  AND auth.get_user_role(organization_id) IN ('owner', 'admin', 'manager')
)
WITH CHECK (
  auth.user_in_organization(organization_id)
  AND auth.get_user_role(organization_id) IN ('owner', 'admin', 'manager')
);

-- Delete policy - only admins and owners
CREATE POLICY "Admins can delete mentorados"
ON mentorados FOR DELETE
TO authenticated
USING (
  auth.is_admin_or_owner(organization_id)
);

-- ============================================================
-- PART 5: CLOSERS TABLE POLICIES
-- ============================================================

ALTER TABLE closers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Organization members can view closers" ON closers;
DROP POLICY IF EXISTS "Admins can manage closers" ON closers;

-- View policy
CREATE POLICY "Organization members can view closers"
ON closers FOR SELECT
TO authenticated
USING (
  auth.user_in_organization(organization_id)
);

-- Insert policy - only admins
CREATE POLICY "Admins can create closers"
ON closers FOR INSERT
TO authenticated
WITH CHECK (
  auth.is_admin_or_owner(organization_id)
);

-- Update policy - admins or the closer themselves
CREATE POLICY "Admins or self can update closers"
ON closers FOR UPDATE
TO authenticated
USING (
  auth.is_admin_or_owner(organization_id)
  OR (email = auth.jwt()->>'email' AND auth.user_in_organization(organization_id))
)
WITH CHECK (
  auth.is_admin_or_owner(organization_id)
  OR (email = auth.jwt()->>'email' AND auth.user_in_organization(organization_id))
);

-- Delete policy - only admins
CREATE POLICY "Admins can delete closers"
ON closers FOR DELETE
TO authenticated
USING (
  auth.is_admin_or_owner(organization_id)
);

-- ============================================================
-- PART 6: LEADS TABLE POLICIES
-- ============================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Organization members can view leads" ON leads;
DROP POLICY IF EXISTS "Organization members can manage leads" ON leads;

-- View policy - all members can view
CREATE POLICY "Organization members can view leads"
ON leads FOR SELECT
TO authenticated
USING (
  auth.user_in_organization(organization_id)
);

-- Insert policy - all members can create leads
CREATE POLICY "Organization members can create leads"
ON leads FOR INSERT
TO authenticated
WITH CHECK (
  auth.user_in_organization(organization_id)
);

-- Update policy - all members can update
CREATE POLICY "Organization members can update leads"
ON leads FOR UPDATE
TO authenticated
USING (
  auth.user_in_organization(organization_id)
)
WITH CHECK (
  auth.user_in_organization(organization_id)
);

-- Delete policy - only managers and above
CREATE POLICY "Managers can delete leads"
ON leads FOR DELETE
TO authenticated
USING (
  auth.user_in_organization(organization_id)
  AND auth.get_user_role(organization_id) IN ('owner', 'admin', 'manager')
);

-- ============================================================
-- PART 7: CALENDAR_EVENTS TABLE POLICIES
-- ============================================================

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Organization members can view calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Organization members can manage calendar events" ON calendar_events;

-- View policy
CREATE POLICY "Organization members can view calendar events"
ON calendar_events FOR SELECT
TO authenticated
USING (
  auth.user_in_organization(organization_id)
);

-- Insert policy
CREATE POLICY "Organization members can create calendar events"
ON calendar_events FOR INSERT
TO authenticated
WITH CHECK (
  auth.user_in_organization(organization_id)
);

-- Update policy - creator or admins can update
CREATE POLICY "Creator or admins can update calendar events"
ON calendar_events FOR UPDATE
TO authenticated
USING (
  auth.user_in_organization(organization_id)
  AND (
    created_by = auth.uid()
    OR auth.is_admin_or_owner(organization_id)
  )
)
WITH CHECK (
  auth.user_in_organization(organization_id)
);

-- Delete policy - creator or admins can delete
CREATE POLICY "Creator or admins can delete calendar events"
ON calendar_events FOR DELETE
TO authenticated
USING (
  auth.user_in_organization(organization_id)
  AND (
    created_by = auth.uid()
    OR auth.is_admin_or_owner(organization_id)
  )
);

-- ============================================================
-- PART 8: APPOINTMENTS TABLE POLICIES
-- ============================================================

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Organization members can view appointments" ON appointments;
DROP POLICY IF EXISTS "Organization members can manage appointments" ON appointments;

-- View policy
CREATE POLICY "Organization members can view appointments"
ON appointments FOR SELECT
TO authenticated
USING (
  auth.user_in_organization(organization_id)
);

-- Insert policy
CREATE POLICY "Organization members can create appointments"
ON appointments FOR INSERT
TO authenticated
WITH CHECK (
  auth.user_in_organization(organization_id)
);

-- Update policy
CREATE POLICY "Assigned or admins can update appointments"
ON appointments FOR UPDATE
TO authenticated
USING (
  auth.user_in_organization(organization_id)
  AND (
    assigned_to IN (
      SELECT id FROM closers 
      WHERE email = auth.jwt()->>'email'
        AND organization_id = appointments.organization_id
    )
    OR auth.is_admin_or_owner(organization_id)
  )
)
WITH CHECK (
  auth.user_in_organization(organization_id)
);

-- Delete policy - only admins
CREATE POLICY "Admins can delete appointments"
ON appointments FOR DELETE
TO authenticated
USING (
  auth.is_admin_or_owner(organization_id)
);

-- ============================================================
-- PART 9: FINANCIAL TABLES POLICIES
-- ============================================================

-- Comissoes table
ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view comissoes"
ON comissoes FOR SELECT
TO authenticated
USING (
  auth.user_in_organization(organization_id)
);

CREATE POLICY "Admins can manage comissoes"
ON comissoes FOR ALL
TO authenticated
USING (auth.is_admin_or_owner(organization_id))
WITH CHECK (auth.is_admin_or_owner(organization_id));

-- Vendas table
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view vendas"
ON vendas FOR SELECT
TO authenticated
USING (
  auth.user_in_organization(organization_id)
);

CREATE POLICY "Managers can manage vendas"
ON vendas FOR ALL
TO authenticated
USING (
  auth.user_in_organization(organization_id)
  AND auth.get_user_role(organization_id) IN ('owner', 'admin', 'manager')
)
WITH CHECK (
  auth.user_in_organization(organization_id)
  AND auth.get_user_role(organization_id) IN ('owner', 'admin', 'manager')
);

-- ============================================================
-- PART 10: FORM AND RESPONSE TABLES
-- ============================================================

-- Form templates
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view form templates"
ON form_templates FOR SELECT
TO authenticated
USING (
  auth.user_in_organization(organization_id)
);

CREATE POLICY "Admins can manage form templates"
ON form_templates FOR ALL
TO authenticated
USING (auth.is_admin_or_owner(organization_id))
WITH CHECK (auth.is_admin_or_owner(organization_id));

-- Form submissions
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view form submissions"
ON form_submissions FOR SELECT
TO authenticated
USING (
  auth.user_in_organization(organization_id)
);

CREATE POLICY "Public can create form submissions"
ON form_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (true); -- Forms can be submitted publicly

-- ============================================================
-- PART 11: VIDEO MODULE TABLES
-- ============================================================

-- Video modules
ALTER TABLE video_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view video modules"
ON video_modules FOR SELECT
TO authenticated
USING (
  auth.user_in_organization(organization_id)
);

CREATE POLICY "Admins can manage video modules"
ON video_modules FOR ALL
TO authenticated
USING (auth.is_admin_or_owner(organization_id))
WITH CHECK (auth.is_admin_or_owner(organization_id));

-- Video lessons
ALTER TABLE video_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view video lessons"
ON video_lessons FOR SELECT
TO authenticated
USING (
  module_id IN (
    SELECT id FROM video_modules 
    WHERE organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid()
        AND is_active = true
    )
  )
);

-- ============================================================
-- PART 12: CREATE INDEXES FOR PERFORMANCE
-- ============================================================

-- Organization users indexes
CREATE INDEX IF NOT EXISTS idx_org_users_user_org 
ON organization_users(user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_org_users_email_org 
ON organization_users(email, organization_id);

-- Mentorados indexes
CREATE INDEX IF NOT EXISTS idx_mentorados_org 
ON mentorados(organization_id);

CREATE INDEX IF NOT EXISTS idx_mentorados_email_org 
ON mentorados(email, organization_id);

-- Closers indexes
CREATE INDEX IF NOT EXISTS idx_closers_org 
ON closers(organization_id);

CREATE INDEX IF NOT EXISTS idx_closers_email_org 
ON closers(email, organization_id);

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_org 
ON leads(organization_id);

CREATE INDEX IF NOT EXISTS idx_leads_org_status 
ON leads(organization_id, status);

-- Calendar events indexes
CREATE INDEX IF NOT EXISTS idx_calendar_org 
ON calendar_events(organization_id);

CREATE INDEX IF NOT EXISTS idx_calendar_org_date 
ON calendar_events(organization_id, start_time);

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_org 
ON appointments(organization_id);

CREATE INDEX IF NOT EXISTS idx_appointments_org_status 
ON appointments(organization_id, status);

-- ============================================================
-- PART 13: AUDIT LOG TABLE
-- ============================================================

-- Create audit log table for security tracking
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
ON security_audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org 
ON security_audit_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
ON security_audit_logs(action, created_at DESC);

-- Enable RLS on audit logs
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs from their organization
CREATE POLICY "Admins can view audit logs"
ON security_audit_logs FOR SELECT
TO authenticated
USING (
  auth.is_admin_or_owner(organization_id)
);

-- System can insert audit logs
CREATE POLICY "System can create audit logs"
ON security_audit_logs FOR INSERT
TO authenticated
WITH CHECK (
  auth.user_in_organization(organization_id)
);

-- ============================================================
-- PART 14: VERIFICATION QUERIES
-- ============================================================

-- Query to verify RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'organizations', 'organization_users', 'mentorados', 
    'closers', 'leads', 'calendar_events', 'appointments',
    'comissoes', 'vendas', 'form_templates', 'form_submissions',
    'video_modules', 'video_lessons', 'security_audit_logs'
  )
ORDER BY tablename;

-- Query to count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================
-- PART 15: GRANT NECESSARY PERMISSIONS
-- ============================================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION auth.get_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.user_in_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auth.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_admin_or_owner(UUID) TO authenticated;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'RLS Security policies have been successfully applied!';
  RAISE NOTICE 'All tables now have organization-level isolation.';
  RAISE NOTICE 'Run the verification queries to confirm RLS status.';
END $$;