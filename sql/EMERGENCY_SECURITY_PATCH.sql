-- ============================================================
-- EMERGENCY SECURITY PATCH
-- Date: February 13, 2026
-- Purpose: Fix critical security vulnerabilities immediately
-- ============================================================

-- Enable RLS on missing tables
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_questions ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization
CREATE OR REPLACE FUNCTION auth.get_user_org_id()
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

-- Helper function to check if user is admin/owner
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

-- RLS Policy for lead_history - organization isolation
CREATE POLICY "lead_history_select_policy" ON lead_history
    FOR SELECT USING (
        organization_id = auth.get_user_org_id()
    );

CREATE POLICY "lead_history_insert_policy" ON lead_history
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_org_id()
    );

CREATE POLICY "lead_history_update_policy" ON lead_history
    FOR UPDATE USING (
        organization_id = auth.get_user_org_id()
    );

-- RLS Policy for scoring_configurations - organization isolation
CREATE POLICY "scoring_configs_select_policy" ON scoring_configurations
    FOR SELECT USING (
        organization_id = auth.get_user_org_id()
    );

CREATE POLICY "scoring_configs_insert_policy" ON scoring_configurations
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_org_id() AND
        auth.is_admin_or_owner()
    );

CREATE POLICY "scoring_configs_update_policy" ON scoring_configurations
    FOR UPDATE USING (
        organization_id = auth.get_user_org_id() AND
        auth.is_admin_or_owner()
    );

CREATE POLICY "scoring_configs_delete_policy" ON scoring_configurations
    FOR DELETE USING (
        organization_id = auth.get_user_org_id() AND
        auth.is_admin_or_owner()
    );

-- RLS Policy for form_questions - organization isolation via config
CREATE POLICY "form_questions_select_policy" ON form_questions
    FOR SELECT USING (
        scoring_config_id IN (
            SELECT id FROM scoring_configurations 
            WHERE organization_id = auth.get_user_org_id()
        )
    );

CREATE POLICY "form_questions_insert_policy" ON form_questions
    FOR INSERT WITH CHECK (
        scoring_config_id IN (
            SELECT id FROM scoring_configurations 
            WHERE organization_id = auth.get_user_org_id()
        ) AND auth.is_admin_or_owner()
    );

CREATE POLICY "form_questions_update_policy" ON form_questions
    FOR UPDATE USING (
        scoring_config_id IN (
            SELECT id FROM scoring_configurations 
            WHERE organization_id = auth.get_user_org_id()
        ) AND auth.is_admin_or_owner()
    );

CREATE POLICY "form_questions_delete_policy" ON form_questions
    FOR DELETE USING (
        scoring_config_id IN (
            SELECT id FROM scoring_configurations 
            WHERE organization_id = auth.get_user_org_id()
        ) AND auth.is_admin_or_owner()
    );

-- Strengthen existing mentorados table policies
DROP POLICY IF EXISTS "mentorados_select_policy" ON mentorados;
CREATE POLICY "mentorados_select_policy" ON mentorados
    FOR SELECT USING (
        organization_id = auth.get_user_org_id()
    );

-- Strengthen existing leads table policies  
DROP POLICY IF EXISTS "leads_select_policy" ON leads;
CREATE POLICY "leads_select_policy" ON leads
    FOR SELECT USING (
        organization_id = auth.get_user_org_id()
    );

-- Strengthen existing closers table policies
DROP POLICY IF EXISTS "closers_select_policy" ON closers;
CREATE POLICY "closers_select_policy" ON closers
    FOR SELECT USING (
        organization_id = auth.get_user_org_id()
    );

-- Security audit logging
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID,
    organization_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_audit_admin_only" ON security_audit_log
    FOR ALL USING (auth.is_admin_or_owner());

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type VARCHAR(50),
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO security_audit_log (
        event_type,
        user_id,
        organization_id,
        details,
        ip_address,
        user_agent
    ) VALUES (
        p_event_type,
        auth.uid(),
        auth.get_user_org_id(),
        p_details,
        p_ip_address,
        p_user_agent
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION auth.get_user_org_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.is_admin_or_owner() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION log_security_event TO authenticated, anon;

-- Security event triggers
CREATE OR REPLACE FUNCTION trigger_security_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log high-risk operations
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.organization_id != NEW.organization_id) THEN
        PERFORM log_security_event(
            TG_TABLE_NAME || '_' || lower(TG_OP),
            jsonb_build_object(
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'old_org_id', CASE WHEN TG_OP = 'UPDATE' THEN OLD.organization_id ELSE NULL END,
                'new_org_id', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.organization_id ELSE NULL END
            )
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add security triggers to critical tables
DROP TRIGGER IF EXISTS security_audit_mentorados ON mentorados;
CREATE TRIGGER security_audit_mentorados
    AFTER INSERT OR UPDATE OR DELETE ON mentorados
    FOR EACH ROW EXECUTE FUNCTION trigger_security_audit();

DROP TRIGGER IF EXISTS security_audit_leads ON leads;
CREATE TRIGGER security_audit_leads
    AFTER INSERT OR UPDATE OR DELETE ON leads
    FOR EACH ROW EXECUTE FUNCTION trigger_security_audit();

DROP TRIGGER IF EXISTS security_audit_closers ON closers;
CREATE TRIGGER security_audit_closers
    AFTER INSERT OR UPDATE OR DELETE ON closers
    FOR EACH ROW EXECUTE FUNCTION trigger_security_audit();

-- Block dangerous operations in production
CREATE OR REPLACE FUNCTION prevent_org_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Prevent organization_id changes unless admin/owner
    IF TG_OP = 'UPDATE' AND OLD.organization_id != NEW.organization_id THEN
        IF NOT auth.is_admin_or_owner() THEN
            RAISE EXCEPTION 'Organization changes require admin privileges';
        END IF;
        
        -- Log the organization change
        PERFORM log_security_event(
            'organization_change',
            jsonb_build_object(
                'table', TG_TABLE_NAME,
                'old_org_id', OLD.organization_id,
                'new_org_id', NEW.organization_id
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Apply org change protection to critical tables
DROP TRIGGER IF EXISTS protect_org_mentorados ON mentorados;
CREATE TRIGGER protect_org_mentorados
    BEFORE UPDATE ON mentorados
    FOR EACH ROW EXECUTE FUNCTION prevent_org_change();

DROP TRIGGER IF EXISTS protect_org_leads ON leads;  
CREATE TRIGGER protect_org_leads
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION prevent_org_change();

DROP TRIGGER IF EXISTS protect_org_closers ON closers;
CREATE TRIGGER protect_org_closers
    BEFORE UPDATE ON closers
    FOR EACH ROW EXECUTE FUNCTION prevent_org_change();

COMMENT ON TABLE security_audit_log IS 'Security audit trail for tracking sensitive operations';
COMMENT ON FUNCTION log_security_event IS 'Logs security events for audit trail';
COMMENT ON FUNCTION trigger_security_audit IS 'Trigger function for automatic security logging';
COMMENT ON FUNCTION prevent_org_change IS 'Prevents unauthorized organization changes';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Emergency security patch applied successfully!';
    RAISE NOTICE 'RLS enabled on all missing tables';
    RAISE NOTICE 'Organization isolation enforced';
    RAISE NOTICE 'Security audit logging activated';
    RAISE NOTICE 'Organization change protection enabled';
END;
$$;