const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExistingStudyTables() {
    console.log('========================================');
    console.log('CHECKING EXISTING STUDY MATERIALS TABLES');
    console.log('========================================\n');
    
    try {
        // Check which closer/SDR tables actually exist with data
        const closerTables = [
            'closers', 'sdr', 'closers_sdr', 'sdr_closers',
            'closer_materials', 'sdr_materials', 'closer_progress',
            'sdr_progress', 'closer_study_materials', 'sdr_study_materials',
            'closer_videos', 'sdr_videos', 'closer_pdfs', 'sdr_pdfs',
            'closer_categories', 'sdr_categories'
        ];
        
        console.log('Checking which closer/SDR tables actually exist...');
        console.log('--------------------------------------------------');
        
        const existingTables = [];
        const nonExistingTables = [];
        
        for (const tableName of closerTables) {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);
            
            if (!error) {
                existingTables.push(tableName);
                console.log(`✅ ${tableName} - EXISTS`);
                
                // Get detailed schema for existing tables
                if (data && data.length > 0) {
                    const columns = Object.keys(data[0]);
                    console.log(`   Columns: ${columns.join(', ')}`);
                } else {
                    console.log(`   (Empty table)`);
                }
            } else {
                nonExistingTables.push(tableName);
                console.log(`❌ ${tableName} - DOES NOT EXIST`);
            }
        }
        
        console.log('\n\nChecking generic study materials tables...');
        console.log('--------------------------------------------------');
        
        const studyTables = [
            'materials', 'study_materials', 'resources', 'documents',
            'videos', 'pdfs', 'links', 'training_materials',
            'learning_resources', 'content', 'media'
        ];
        
        for (const tableName of studyTables) {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);
            
            if (!error) {
                console.log(`\n📚 Table: ${tableName} - EXISTS`);
                
                if (data && data.length > 0) {
                    const columns = Object.keys(data[0]);
                    console.log(`Columns: ${columns.join(', ')}`);
                    
                    // Show sample data structure
                    console.log('Sample data:');
                    for (const [key, value] of Object.entries(data[0])) {
                        const displayValue = value === null ? 'NULL' :
                                           typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' :
                                           String(value).substring(0, 50);
                        console.log(`  ${key}: ${displayValue}`);
                    }
                } else {
                    console.log('(Empty table)');
                }
                
                // Get row count
                const { count } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true });
                console.log(`Total rows: ${count || 0}`);
            }
        }
        
        console.log('\n\n========================================');
        console.log('SUMMARY');
        console.log('========================================\n');
        
        console.log('Existing closer/SDR tables:');
        existingTables.forEach(t => console.log(`  ✅ ${t}`));
        
        console.log('\nTables that need to be created:');
        nonExistingTables.forEach(t => console.log(`  ❌ ${t}`));
        
        console.log('\n\n========================================');
        console.log('SQL TO CREATE MISSING TABLES');
        console.log('========================================\n');
        
        // Generate SQL for creating the study materials tables
        console.log(`
-- 1. Create closer_study_materials table (main table for materials)
CREATE TABLE IF NOT EXISTS closer_study_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    material_type TEXT CHECK (material_type IN ('video', 'pdf', 'link', 'document')) NOT NULL,
    url TEXT,
    file_path TEXT,
    category_id UUID REFERENCES closer_material_categories(id) ON DELETE SET NULL,
    created_by UUID REFERENCES closers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT url_or_file CHECK (url IS NOT NULL OR file_path IS NOT NULL)
);

-- 2. Create categories table
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

-- 3. Create progress tracking table
CREATE TABLE IF NOT EXISTS closer_material_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES closers(id) ON DELETE CASCADE,
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
    user_id UUID REFERENCES closers(id) ON DELETE CASCADE,
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
    role_value TEXT,
    can_view BOOLEAN DEFAULT true,
    can_download BOOLEAN DEFAULT false,
    can_share BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_closer_study_materials_category ON closer_study_materials(category_id);
CREATE INDEX idx_closer_study_materials_type ON closer_study_materials(material_type);
CREATE INDEX idx_closer_study_materials_created_by ON closer_study_materials(created_by);
CREATE INDEX idx_closer_material_progress_user_material ON closer_material_progress(user_id, material_id);
CREATE INDEX idx_closer_material_progress_status ON closer_material_progress(status);
CREATE INDEX idx_closer_material_interactions_user_time ON closer_material_interactions(user_id, action_timestamp);
CREATE INDEX idx_closer_material_permissions_material ON closer_material_permissions(material_id);

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_closer_study_materials_updated_at BEFORE UPDATE ON closer_study_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_closer_material_categories_updated_at BEFORE UPDATE ON closer_material_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_closer_material_progress_updated_at BEFORE UPDATE ON closer_material_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`);
        
        console.log('\n\n========================================');
        console.log('RLS POLICIES SQL');
        console.log('========================================\n');
        
        console.log(`
-- Enable RLS on all tables
ALTER TABLE closer_study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE closer_material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE closer_material_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE closer_material_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE closer_material_permissions ENABLE ROW LEVEL SECURITY;

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
            WHERE id = auth.uid()
            AND tipo_closer = 'admin'
        )
    );

-- Policies for categories (read-only for closers, write for admins)
CREATE POLICY "Everyone can view categories" ON closer_material_categories
    FOR SELECT
    USING (true);

CREATE POLICY "Only admins can manage categories" ON closer_material_categories
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM closers
            WHERE id = auth.uid()
            AND tipo_closer = 'admin'
        )
    );

-- Policies for progress (users can only see/update their own)
CREATE POLICY "Users can view own progress" ON closer_material_progress
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own progress" ON closer_material_progress
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own progress records" ON closer_material_progress
    FOR UPDATE
    USING (user_id = auth.uid());

-- Policies for interactions (write-only for own, read for admins)
CREATE POLICY "Users can log own interactions" ON closer_material_interactions
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all interactions" ON closer_material_interactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM closers
            WHERE id = auth.uid()
            AND tipo_closer = 'admin'
        )
    );

-- Policies for permissions (admin only)
CREATE POLICY "Only admins can manage permissions" ON closer_material_permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM closers
            WHERE id = auth.uid()
            AND tipo_closer = 'admin'
        )
    );
`);
        
    } catch (error) {
        console.error('Error during analysis:', error);
    }
}

checkExistingStudyTables();