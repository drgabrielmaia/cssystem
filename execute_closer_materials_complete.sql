
-- ========================================
-- CLOSER STUDY MATERIALS - COMPLETE SETUP
-- ========================================
-- Execute this entire script in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- CLOSER STUDY MATERIALS DATABASE SCHEMA
-- ========================================
-- This script creates all necessary tables for the closer/SDR study materials feature
-- Including: materials storage, categories, progress tracking, and permissions

-- Note: The foreign key to closers table uses TEXT type for id since the existing 
-- closers table uses TEXT for id instead of UUID

-- 1. Create categories table first (referenced by materials)
CREATE TABLE IF NOT EXISTS closer_material_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_category_id UUID REFERENCES closer_material_categories(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create main study materials table
CREATE TABLE IF NOT EXISTS closer_study_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    material_type TEXT CHECK (material_type IN ('video', 'pdf', 'link', 'document')) NOT NULL,
    url TEXT,
    file_path TEXT,
    category_id UUID REFERENCES closer_material_categories(id) ON DELETE SET NULL,
    created_by TEXT REFERENCES closers(id) ON DELETE SET NULL, -- Using TEXT to match closers table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT url_or_file CHECK (url IS NOT NULL OR file_path IS NOT NULL)
);

-- 3. Create progress tracking table
CREATE TABLE IF NOT EXISTS closer_material_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT REFERENCES closers(id) ON DELETE CASCADE, -- Using TEXT to match closers table
    material_id UUID REFERENCES closer_study_materials(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'not_started',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    time_spent_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, material_id)
);

-- 4. Create interactions tracking table
CREATE TABLE IF NOT EXISTS closer_material_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT REFERENCES closers(id) ON DELETE CASCADE, -- Using TEXT to match closers table
    material_id UUID REFERENCES closer_study_materials(id) ON DELETE CASCADE,
    action_type TEXT CHECK (action_type IN ('view', 'download', 'share', 'bookmark', 'like')) NOT NULL,
    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_duration INTEGER,
    ip_address INET,
    user_agent TEXT
);

-- 5. Create permissions table
CREATE TABLE IF NOT EXISTS closer_material_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID REFERENCES closer_study_materials(id) ON DELETE CASCADE,
    role_type TEXT CHECK (role_type IN ('all_closers', 'specific_team', 'specific_user')) NOT NULL,
    role_value TEXT, -- Will store user_id or team_id depending on role_type
    can_view BOOLEAN DEFAULT true,
    can_download BOOLEAN DEFAULT false,
    can_share BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_closer_study_materials_category ON closer_study_materials(category_id);
CREATE INDEX IF NOT EXISTS idx_closer_study_materials_type ON closer_study_materials(material_type);
CREATE INDEX IF NOT EXISTS idx_closer_study_materials_created_by ON closer_study_materials(created_by);
CREATE INDEX IF NOT EXISTS idx_closer_study_materials_active ON closer_study_materials(is_active);
CREATE INDEX IF NOT EXISTS idx_closer_study_materials_tags ON closer_study_materials USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_closer_material_progress_user_material ON closer_material_progress(user_id, material_id);
CREATE INDEX IF NOT EXISTS idx_closer_material_progress_status ON closer_material_progress(status);
CREATE INDEX IF NOT EXISTS idx_closer_material_progress_user_status ON closer_material_progress(user_id, status);

CREATE INDEX IF NOT EXISTS idx_closer_material_interactions_user_time ON closer_material_interactions(user_id, action_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_closer_material_interactions_material ON closer_material_interactions(material_id);
CREATE INDEX IF NOT EXISTS idx_closer_material_interactions_action ON closer_material_interactions(action_type);

CREATE INDEX IF NOT EXISTS idx_closer_material_permissions_material ON closer_material_permissions(material_id);
CREATE INDEX IF NOT EXISTS idx_closer_material_permissions_role ON closer_material_permissions(role_type, role_value);

CREATE INDEX IF NOT EXISTS idx_closer_material_categories_parent ON closer_material_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_closer_material_categories_order ON closer_material_categories(display_order);

-- ========================================
-- CREATE UPDATE TRIGGERS
-- ========================================

-- Create or replace function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for tables with updated_at column
DROP TRIGGER IF EXISTS update_closer_study_materials_updated_at ON closer_study_materials;
CREATE TRIGGER update_closer_study_materials_updated_at 
    BEFORE UPDATE ON closer_study_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_closer_material_categories_updated_at ON closer_material_categories;
CREATE TRIGGER update_closer_material_categories_updated_at 
    BEFORE UPDATE ON closer_material_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_closer_material_progress_updated_at ON closer_material_progress;
CREATE TRIGGER update_closer_material_progress_updated_at 
    BEFORE UPDATE ON closer_material_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE closer_study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE closer_material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE closer_material_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE closer_material_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE closer_material_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Closers can view active materials" ON closer_study_materials;
DROP POLICY IF EXISTS "Admin can manage all materials" ON closer_study_materials;
DROP POLICY IF EXISTS "Everyone can view categories" ON closer_material_categories;
DROP POLICY IF EXISTS "Only admins can manage categories" ON closer_material_categories;
DROP POLICY IF EXISTS "Users can view own progress" ON closer_material_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON closer_material_progress;
DROP POLICY IF EXISTS "Users can update own progress records" ON closer_material_progress;
DROP POLICY IF EXISTS "Users can log own interactions" ON closer_material_interactions;
DROP POLICY IF EXISTS "Admins can view all interactions" ON closer_material_interactions;
DROP POLICY IF EXISTS "Only admins can manage permissions" ON closer_material_permissions;

-- Policies for closer_study_materials
CREATE POLICY "Closers can view active materials" ON closer_study_materials
    FOR SELECT
    USING (
        is_active = true 
        AND (
            -- Check if user has permission
            EXISTS (
                SELECT 1 FROM closer_material_permissions p
                WHERE p.material_id = closer_study_materials.id
                AND p.can_view = true
                AND (
                    p.role_type = 'all_closers'
                    OR (p.role_type = 'specific_user' AND p.role_value = auth.uid()::text)
                )
            )
            OR
            -- Or if no permissions set, allow all closers
            NOT EXISTS (
                SELECT 1 FROM closer_material_permissions
                WHERE material_id = closer_study_materials.id
            )
        )
    );

CREATE POLICY "Admin can manage all materials" ON closer_study_materials
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM closers
            WHERE id = auth.uid()::text
            AND tipo_closer = 'admin'
        )
    );

-- Policies for categories (read-only for closers, write for admins)
CREATE POLICY "Everyone can view categories" ON closer_material_categories
    FOR SELECT
    USING (true);

CREATE POLICY "Only admins can manage categories" ON closer_material_categories
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM closers
            WHERE id = auth.uid()::text
            AND tipo_closer = 'admin'
        )
    );

-- Policies for progress (users can only see/update their own)
CREATE POLICY "Users can view own progress" ON closer_material_progress
    FOR SELECT
    USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own progress" ON closer_material_progress
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own progress records" ON closer_material_progress
    FOR UPDATE
    USING (user_id = auth.uid()::text);

-- Policies for interactions (write-only for own, read for admins)
CREATE POLICY "Users can log own interactions" ON closer_material_interactions
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Admins can view all interactions" ON closer_material_interactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM closers
            WHERE id = auth.uid()::text
            AND tipo_closer = 'admin'
        )
    );

-- Policies for permissions (admin only)
CREATE POLICY "Only admins can manage permissions" ON closer_material_permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM closers
            WHERE id = auth.uid()::text
            AND tipo_closer = 'admin'
        )
    );

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================

-- Insert default categories
INSERT INTO closer_material_categories (name, description, display_order, icon, color) VALUES 
    ('Técnicas de Vendas', 'Materiais sobre técnicas e estratégias de vendas', 1, 'chart-line', '#3B82F6'),
    ('Scripts e Roteiros', 'Scripts prontos para diferentes situações de venda', 2, 'file-text', '#10B981'),
    ('Treinamentos', 'Vídeos e materiais de treinamento', 3, 'graduation-cap', '#8B5CF6'),
    ('Produtos', 'Informações detalhadas sobre produtos e serviços', 4, 'package', '#F59E0B'),
    ('Objections Handling', 'Como lidar com objeções comuns', 5, 'shield', '#EF4444'),
    ('Cases de Sucesso', 'Histórias e casos de sucesso', 6, 'trophy', '#F97316')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- UTILITY FUNCTIONS
-- ========================================

-- Function to get material statistics for a user
CREATE OR REPLACE FUNCTION get_user_material_stats(p_user_id TEXT)
RETURNS TABLE (
    total_materials BIGINT,
    completed_materials BIGINT,
    in_progress_materials BIGINT,
    total_time_spent_seconds BIGINT,
    completion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT m.id) as total_materials,
        COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN m.id END) as completed_materials,
        COUNT(DISTINCT CASE WHEN p.status = 'in_progress' THEN m.id END) as in_progress_materials,
        COALESCE(SUM(p.time_spent_seconds), 0) as total_time_spent_seconds,
        CASE 
            WHEN COUNT(DISTINCT m.id) > 0 
            THEN ROUND((COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN m.id END)::NUMERIC / COUNT(DISTINCT m.id)) * 100, 2)
            ELSE 0
        END as completion_rate
    FROM closer_study_materials m
    LEFT JOIN closer_material_progress p ON m.id = p.material_id AND p.user_id = p_user_id
    WHERE m.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to get popular materials
CREATE OR REPLACE FUNCTION get_popular_materials(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    material_id UUID,
    title TEXT,
    view_count BIGINT,
    avg_progress NUMERIC,
    completion_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id as material_id,
        m.title,
        COUNT(DISTINCT i.user_id) as view_count,
        ROUND(AVG(p.progress_percentage), 2) as avg_progress,
        COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.user_id END) as completion_count
    FROM closer_study_materials m
    LEFT JOIN closer_material_interactions i ON m.id = i.material_id AND i.action_type = 'view'
    LEFT JOIN closer_material_progress p ON m.id = p.material_id
    WHERE m.is_active = true
    GROUP BY m.id, m.title
    ORDER BY view_count DESC, completion_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Verify installation
SELECT 
    'Tables Created' as status,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_name IN (
    'closer_material_categories',
    'closer_study_materials',
    'closer_material_progress',
    'closer_material_interactions',
    'closer_material_permissions'
);
