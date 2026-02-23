const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeClosersSDRSchema() {
    console.log('========================================');
    console.log('ANALYZING CLOSERS/SDR DATABASE SCHEMA');
    console.log('========================================\n');
    
    try {
        // Step 1: Find all tables related to closers/SDR
        console.log('Step 1: Finding all tables with "closer" or "sdr" in the name...');
        console.log('--------------------------------------------------');
        
        // Try to get tables using RPC function
        let allTables = [];
        let tablesError = null;
        
        try {
            const { data: tables, error } = await supabase.rpc('get_tables_info', {
                schema_name: 'public'
            });
            
            if (!error && tables) {
                allTables = tables.map(t => t.table_name);
            } else {
                tablesError = error;
            }
        } catch (e) {
            tablesError = e;
        }
        
        // If RPC doesn't exist, try direct query
        if (tablesError || allTables.length === 0) {
            try {
                const { data, error } = await supabase
                    .from('information_schema.tables')
                    .select('table_name')
                    .eq('table_schema', 'public');
                
                if (data && !error) {
                    allTables = data.map(t => t.table_name);
                }
            } catch (e) {
                // Direct query failed
            }
        }
        
        // If still no tables, try alternative approach - query known tables
        if (allTables.length === 0) {
            console.log('Using alternative approach to find tables...\n');
            const possibleTables = [
                'closers', 'sdr', 'closers_sdr', 'sdr_closers', 
                'closer_materials', 'sdr_materials', 'closer_progress',
                'sdr_progress', 'study_materials', 'closer_study_materials',
                'sdr_study_materials', 'closer_videos', 'sdr_videos',
                'closer_pdfs', 'sdr_pdfs', 'closer_categories', 'sdr_categories',
                'users', 'profiles', 'mentorados', 'lessons', 'modules'
            ];
            
            for (const tableName of possibleTables) {
                try {
                    const { count, error } = await supabase
                        .from(tableName)
                        .select('*', { count: 'exact', head: true });
                    
                    if (!error) {
                        allTables.push(tableName);
                    }
                } catch (e) {
                    // Table doesn't exist, continue
                }
            }
        }
        
        // Filter tables containing closer or sdr
        const relevantTables = allTables.filter(t => 
            t.toLowerCase().includes('closer') || 
            t.toLowerCase().includes('sdr')
        );
        
        if (relevantTables.length > 0) {
            console.log('Found tables with closer/sdr in name:');
            relevantTables.forEach(t => console.log(`  - ${t}`));
        } else {
            console.log('No tables found with "closer" or "sdr" in the name.');
        }
        
        // Step 2: Check for user-related tables that might store closer/SDR data
        console.log('\nStep 2: Checking user-related tables for closer/SDR columns...');
        console.log('--------------------------------------------------');
        
        const userTables = ['users', 'profiles', 'employees', 'team_members', 'staff'];
        const foundUserTables = [];
        
        for (const tableName of userTables) {
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(0);
                
                if (!error) {
                    foundUserTables.push(tableName);
                }
            } catch (e) {
                // Table doesn't exist
            }
        }
        
        if (foundUserTables.length > 0) {
            console.log('Found user-related tables:');
            foundUserTables.forEach(t => console.log(`  - ${t}`));
        }
        
        // Step 3: Get detailed schema for relevant tables
        console.log('\nStep 3: Detailed schema for relevant tables...');
        console.log('--------------------------------------------------');
        
        const allRelevantTables = [...relevantTables, ...foundUserTables];
        
        for (const tableName of allRelevantTables) {
            console.log(`\n📋 Table: ${tableName}`);
            console.log('------------------------');
            
            try {
                // Get a sample row to understand structure
                const { data: sample, error: sampleError } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(1);
                
                if (!sampleError && sample && sample.length > 0) {
                    const columns = Object.keys(sample[0]);
                    console.log('Columns:');
                    columns.forEach(col => {
                        const value = sample[0][col];
                        const type = value === null ? 'NULL' : 
                                   typeof value === 'object' ? 'object/json' :
                                   typeof value;
                        console.log(`  - ${col}: ${type}`);
                    });
                    
                    // Get row count
                    const { count } = await supabase
                        .from(tableName)
                        .select('*', { count: 'exact', head: true });
                    console.log(`Row count: ${count || 0}`);
                } else {
                    console.log('  (Empty table or unable to get schema)');
                }
            } catch (e) {
                console.log(`  Error reading table: ${e.message}`);
            }
        }
        
        // Step 4: Check for study materials related tables
        console.log('\n\nStep 4: Checking for existing study materials tables...');
        console.log('--------------------------------------------------');
        
        const studyTables = [
            'materials', 'study_materials', 'resources', 'documents',
            'videos', 'pdfs', 'links', 'training_materials',
            'learning_resources', 'content', 'media'
        ];
        
        const foundStudyTables = [];
        
        for (const tableName of studyTables) {
            try {
                const { count, error } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true });
                
                if (!error) {
                    foundStudyTables.push(tableName);
                }
            } catch (e) {
                // Table doesn't exist
            }
        }
        
        if (foundStudyTables.length > 0) {
            console.log('Found study/materials related tables:');
            for (const tableName of foundStudyTables) {
                console.log(`\n📚 Table: ${tableName}`);
                const { data: sample } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(1);
                
                if (sample && sample.length > 0) {
                    const columns = Object.keys(sample[0]);
                    console.log('Columns:', columns.join(', '));
                }
            }
        } else {
            console.log('No study materials tables found.');
        }
        
        // Step 5: Recommendations for new tables
        console.log('\n\n========================================');
        console.log('RECOMMENDATIONS FOR STUDY MATERIALS FEATURE');
        console.log('========================================\n');
        
        console.log('Based on the analysis, here are the recommended tables for the study materials feature:\n');
        
        console.log('1️⃣  closer_study_materials');
        console.log('   Purpose: Main table for storing study materials');
        console.log('   Columns:');
        console.log('   - id (uuid, primary key)');
        console.log('   - title (text, not null)');
        console.log('   - description (text)');
        console.log('   - material_type (enum: video, pdf, link, document)');
        console.log('   - url (text) - For YouTube/PandaVideo links or file URLs');
        console.log('   - file_path (text) - For uploaded files');
        console.log('   - category_id (uuid, foreign key)');
        console.log('   - created_by (uuid, foreign key to users)');
        console.log('   - created_at (timestamp)');
        console.log('   - updated_at (timestamp)');
        console.log('   - is_active (boolean, default true)');
        console.log('   - tags (text[])');
        console.log('   - metadata (jsonb) - For storing video duration, file size, etc.');
        
        console.log('\n2️⃣  closer_material_categories');
        console.log('   Purpose: Categories for organizing materials');
        console.log('   Columns:');
        console.log('   - id (uuid, primary key)');
        console.log('   - name (text, not null, unique)');
        console.log('   - description (text)');
        console.log('   - parent_category_id (uuid, self-reference for sub-categories)');
        console.log('   - display_order (integer)');
        console.log('   - icon (text)');
        console.log('   - color (text)');
        console.log('   - created_at (timestamp)');
        console.log('   - updated_at (timestamp)');
        
        console.log('\n3️⃣  closer_material_progress');
        console.log('   Purpose: Track user progress on materials');
        console.log('   Columns:');
        console.log('   - id (uuid, primary key)');
        console.log('   - user_id (uuid, foreign key)');
        console.log('   - material_id (uuid, foreign key)');
        console.log('   - status (enum: not_started, in_progress, completed)');
        console.log('   - progress_percentage (integer, 0-100)');
        console.log('   - last_accessed_at (timestamp)');
        console.log('   - completed_at (timestamp)');
        console.log('   - notes (text)');
        console.log('   - time_spent_seconds (integer)');
        console.log('   - created_at (timestamp)');
        console.log('   - updated_at (timestamp)');
        console.log('   - UNIQUE(user_id, material_id)');
        
        console.log('\n4️⃣  closer_material_interactions');
        console.log('   Purpose: Track detailed interactions (views, downloads, etc.)');
        console.log('   Columns:');
        console.log('   - id (uuid, primary key)');
        console.log('   - user_id (uuid, foreign key)');
        console.log('   - material_id (uuid, foreign key)');
        console.log('   - action_type (enum: view, download, share, bookmark, like)');
        console.log('   - action_timestamp (timestamp)');
        console.log('   - session_duration (integer) - For videos');
        console.log('   - ip_address (inet)');
        console.log('   - user_agent (text)');
        
        console.log('\n5️⃣  closer_material_permissions');
        console.log('   Purpose: Control access to materials based on roles/teams');
        console.log('   Columns:');
        console.log('   - id (uuid, primary key)');
        console.log('   - material_id (uuid, foreign key)');
        console.log('   - role_type (enum: all_closers, specific_team, specific_user)');
        console.log('   - role_value (text) - team_id or user_id depending on role_type');
        console.log('   - can_view (boolean, default true)');
        console.log('   - can_download (boolean, default false)');
        console.log('   - can_share (boolean, default false)');
        console.log('   - created_at (timestamp)');
        
        console.log('\n\n🔐 RECOMMENDED RLS POLICIES:');
        console.log('--------------------------------');
        console.log('1. Materials: Closers can view materials they have permission for');
        console.log('2. Progress: Users can only view/update their own progress');
        console.log('3. Categories: Read-only for all closers, write for admins');
        console.log('4. Interactions: Write-only for own interactions, read for admins');
        console.log('5. Permissions: Admin-only access');
        
        console.log('\n\n📊 RECOMMENDED INDEXES:');
        console.log('--------------------------------');
        console.log('- closer_study_materials(category_id)');
        console.log('- closer_study_materials(material_type)');
        console.log('- closer_study_materials(created_by)');
        console.log('- closer_material_progress(user_id, material_id)');
        console.log('- closer_material_progress(status)');
        console.log('- closer_material_interactions(user_id, action_timestamp)');
        console.log('- closer_material_permissions(material_id)');
        
        console.log('\n\n✅ ANALYSIS COMPLETE!');
        
    } catch (error) {
        console.error('Error during analysis:', error);
    }
}

analyzeClosersSDRSchema();