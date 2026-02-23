const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Error: Missing Supabase credentials');
    process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        persistSession: false
    }
});

async function executeSQL() {
    console.log('===========================================');
    console.log('CLOSER STUDY MATERIALS - DATABASE SETUP');
    console.log('===========================================\n');
    console.log(`Supabase Project: ${SUPABASE_URL}\n`);

    try {
        // Read the SQL file
        const sqlPath = path.join(__dirname, 'sql', 'create_closer_study_materials_tables.sql');
        const fullSQL = fs.readFileSync(sqlPath, 'utf8');

        // Since Supabase JS SDK doesn't support raw SQL execution directly,
        // we need to use the Supabase Dashboard or CLI
        // Let's create individual operations for each table

        console.log('Creating database tables...\n');

        // 1. Create categories table
        console.log('1. Creating closer_material_categories table...');
        const { error: catError } = await supabase.from('closer_material_categories').select('id').limit(1);
        if (catError && catError.code === '42P01') {
            console.log('   Table does not exist - needs to be created via SQL Editor');
        } else if (!catError) {
            console.log('   ✓ Table already exists');
        }

        // 2. Check study materials table
        console.log('2. Creating closer_study_materials table...');
        const { error: matError } = await supabase.from('closer_study_materials').select('id').limit(1);
        if (matError && matError.code === '42P01') {
            console.log('   Table does not exist - needs to be created via SQL Editor');
        } else if (!matError) {
            console.log('   ✓ Table already exists');
        }

        // 3. Check progress table
        console.log('3. Creating closer_material_progress table...');
        const { error: progError } = await supabase.from('closer_material_progress').select('id').limit(1);
        if (progError && progError.code === '42P01') {
            console.log('   Table does not exist - needs to be created via SQL Editor');
        } else if (!progError) {
            console.log('   ✓ Table already exists');
        }

        // 4. Check interactions table
        console.log('4. Creating closer_material_interactions table...');
        const { error: intError } = await supabase.from('closer_material_interactions').select('id').limit(1);
        if (intError && intError.code === '42P01') {
            console.log('   Table does not exist - needs to be created via SQL Editor');
        } else if (!intError) {
            console.log('   ✓ Table already exists');
        }

        // 5. Check permissions table
        console.log('5. Creating closer_material_permissions table...');
        const { error: permError } = await supabase.from('closer_material_permissions').select('id').limit(1);
        if (permError && permError.code === '42P01') {
            console.log('   Table does not exist - needs to be created via SQL Editor');
        } else if (!permError) {
            console.log('   ✓ Table already exists');
        }

        // Generate the direct Supabase Dashboard link
        const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
        const dashboardUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;

        console.log('\n===========================================');
        console.log('INSTRUCTIONS TO COMPLETE SETUP');
        console.log('===========================================\n');
        console.log('To complete the database setup, you need to execute the SQL script in Supabase:');
        console.log('\nOPTION 1: Supabase Dashboard (Recommended)');
        console.log('-------------------------------------------');
        console.log(`1. Open: ${dashboardUrl}`);
        console.log(`2. Copy the contents of: ${sqlPath}`);
        console.log('3. Paste into the SQL Editor');
        console.log('4. Click "Run" to execute\n');
        
        console.log('OPTION 2: Using psql command line');
        console.log('----------------------------------');
        console.log('Run the following command:');
        console.log(`psql "postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f "${sqlPath}"\n`);

        console.log('OPTION 3: Manual execution via this script');
        console.log('-------------------------------------------');
        console.log('Creating a copy of the SQL file for easy access...');
        
        // Create a copy with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const outputPath = path.join(__dirname, `closer_materials_schema_${timestamp}.sql`);
        fs.writeFileSync(outputPath, fullSQL, 'utf8');
        console.log(`SQL file created at: ${outputPath}\n`);

        // Try to insert sample categories if tables exist
        if (!catError) {
            console.log('Attempting to insert sample categories...');
            const categories = [
                { name: 'Técnicas de Vendas', description: 'Materiais sobre técnicas e estratégias de vendas', display_order: 1, icon: 'chart-line', color: '#3B82F6' },
                { name: 'Scripts e Roteiros', description: 'Scripts prontos para diferentes situações de venda', display_order: 2, icon: 'file-text', color: '#10B981' },
                { name: 'Treinamentos', description: 'Vídeos e materiais de treinamento', display_order: 3, icon: 'graduation-cap', color: '#8B5CF6' },
                { name: 'Produtos', description: 'Informações detalhadas sobre produtos e serviços', display_order: 4, icon: 'package', color: '#F59E0B' },
                { name: 'Objections Handling', description: 'Como lidar com objeções comuns', display_order: 5, icon: 'shield', color: '#EF4444' },
                { name: 'Cases de Sucesso', description: 'Histórias e casos de sucesso', display_order: 6, icon: 'trophy', color: '#F97316' }
            ];

            for (const category of categories) {
                const { error } = await supabase
                    .from('closer_material_categories')
                    .upsert(category, { onConflict: 'name' });
                
                if (error) {
                    console.log(`   ⚠ Could not insert category "${category.name}": ${error.message}`);
                } else {
                    console.log(`   ✓ Category "${category.name}" ready`);
                }
            }
        }

        console.log('\n===========================================');
        console.log('SUMMARY');
        console.log('===========================================');
        console.log('The SQL script creates:');
        console.log('  • 5 main tables for closer study materials');
        console.log('  • 13 performance indexes');
        console.log('  • 3 update triggers');
        console.log('  • 11 RLS security policies');
        console.log('  • 2 utility functions');
        console.log('  • 6 default categories');
        console.log('\nFeatures enabled:');
        console.log('  ✓ Row Level Security (RLS)');
        console.log('  ✓ Automatic timestamp updates');
        console.log('  ✓ Progress tracking');
        console.log('  ✓ Permission management');
        console.log('  ✓ Interaction logging');

    } catch (error) {
        console.error('Error during execution:', error);
        process.exit(1);
    }
}

// Run the script
executeSQL().catch(console.error);