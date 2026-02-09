-- ====================================
-- FIX CLOSERS RLS POLICIES
-- ====================================
-- This migration fixes RLS policies to allow admin insert/update operations
-- Author: System
-- Date: 2026-02-09
-- ====================================

-- Drop existing policies
DROP POLICY IF EXISTS closers_view_own ON public.closers;
DROP POLICY IF EXISTS closers_update_own ON public.closers;

-- Create comprehensive policies for closers table
-- Policy 1: Allow closers to view their own data + admins to view all in their org
CREATE POLICY closers_select_policy ON public.closers
    FOR SELECT USING (
        auth.uid()::text = id::text OR
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.organization_id = closers.organization_id
            AND ou.user_id::text = auth.uid()::text
            AND ou.role IN ('owner', 'manager')
        )
    );

-- Policy 2: Allow closers to update their own profile + admins to update any in their org
CREATE POLICY closers_update_policy ON public.closers
    FOR UPDATE USING (
        auth.uid()::text = id::text OR
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.organization_id = closers.organization_id
            AND ou.user_id::text = auth.uid()::text
            AND ou.role IN ('owner', 'manager')
        )
    );

-- Policy 3: Allow admins to insert new closers in their organization
CREATE POLICY closers_insert_policy ON public.closers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.organization_id = closers.organization_id
            AND ou.user_id::text = auth.uid()::text
            AND ou.role IN ('owner', 'manager')
        )
    );

-- Policy 4: Allow admins to delete closers in their organization
CREATE POLICY closers_delete_policy ON public.closers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.organization_id = closers.organization_id
            AND ou.user_id::text = auth.uid()::text
            AND ou.role IN ('owner', 'manager')
        )
    );

-- Update other tables policies to include INSERT permissions

-- Drop and recreate closers_vendas policies
DROP POLICY IF EXISTS closers_vendas_view ON public.closers_vendas;

CREATE POLICY closers_vendas_select_policy ON public.closers_vendas
    FOR SELECT USING (
        closer_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.closers c
            JOIN public.organization_users ou ON ou.organization_id = c.organization_id
            WHERE c.id = closers_vendas.closer_id
            AND ou.user_id::text = auth.uid()::text
            AND ou.role IN ('owner', 'manager')
        )
    );

CREATE POLICY closers_vendas_insert_policy ON public.closers_vendas
    FOR INSERT WITH CHECK (
        closer_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.closers c
            JOIN public.organization_users ou ON ou.organization_id = c.organization_id
            WHERE c.id = closers_vendas.closer_id
            AND ou.user_id::text = auth.uid()::text
            AND ou.role IN ('owner', 'manager')
        )
    );

-- Drop and recreate closers_metas policies
DROP POLICY IF EXISTS closers_metas_view ON public.closers_metas;

CREATE POLICY closers_metas_select_policy ON public.closers_metas
    FOR SELECT USING (
        closer_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.closers c
            JOIN public.organization_users ou ON ou.organization_id = c.organization_id
            WHERE c.id = closers_metas.closer_id
            AND ou.user_id::text = auth.uid()::text
            AND ou.role IN ('owner', 'manager')
        )
    );

CREATE POLICY closers_metas_insert_policy ON public.closers_metas
    FOR INSERT WITH CHECK (
        closer_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.closers c
            JOIN public.organization_users ou ON ou.organization_id = c.organization_id
            WHERE c.id = closers_metas.closer_id
            AND ou.user_id::text = auth.uid()::text
            AND ou.role IN ('owner', 'manager')
        )
    );

-- Drop and recreate closers_atividades policies
DROP POLICY IF EXISTS closers_atividades_manage ON public.closers_atividades;

CREATE POLICY closers_atividades_select_policy ON public.closers_atividades
    FOR SELECT USING (
        closer_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.closers c
            JOIN public.organization_users ou ON ou.organization_id = c.organization_id
            WHERE c.id = closers_atividades.closer_id
            AND ou.user_id::text = auth.uid()::text
            AND ou.role IN ('owner', 'manager')
        )
    );

CREATE POLICY closers_atividades_insert_policy ON public.closers_atividades
    FOR INSERT WITH CHECK (
        closer_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.closers c
            JOIN public.organization_users ou ON ou.organization_id = c.organization_id
            WHERE c.id = closers_atividades.closer_id
            AND ou.user_id::text = auth.uid()::text
            AND ou.role IN ('owner', 'manager')
        )
    );

-- Create closers_dashboard_access policies
CREATE POLICY closers_dashboard_access_select_policy ON public.closers_dashboard_access
    FOR SELECT USING (
        closer_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.closers c
            JOIN public.organization_users ou ON ou.organization_id = c.organization_id
            WHERE c.id = closers_dashboard_access.closer_id
            AND ou.user_id::text = auth.uid()::text
            AND ou.role IN ('owner', 'manager')
        )
    );

CREATE POLICY closers_dashboard_access_insert_policy ON public.closers_dashboard_access
    FOR INSERT WITH CHECK (
        closer_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.closers c
            JOIN public.organization_users ou ON ou.organization_id = c.organization_id
            WHERE c.id = closers_dashboard_access.closer_id
            AND ou.user_id::text = auth.uid()::text
            AND ou.role IN ('owner', 'manager')
        )
    );

-- Grant necessary permissions for service role (for admin operations)
GRANT ALL ON public.closers TO service_role;
GRANT ALL ON public.closers_vendas TO service_role;
GRANT ALL ON public.closers_metas TO service_role;
GRANT ALL ON public.closers_atividades TO service_role;
GRANT ALL ON public.closers_dashboard_access TO service_role;

-- Enable realtime for tables if needed
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.closers;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.closers_vendas;