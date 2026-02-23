const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Error: Missing Supabase credentials');
    process.exit(1);
}

// Extract project reference from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

// Function to execute SQL using Supabase Management API
async function executeSQLDirect(sql) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ query: sql });
        
        const options = {
            hostname: `${projectRef}.supabase.co`,
            port: 443,
            path: '/rest/v1/rpc',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Prefer': 'return=minimal'
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ success: true, data: responseData });
                } else {
                    resolve({ success: false, error: `HTTP ${res.statusCode}: ${responseData}` });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

// Split SQL into executable statements
function splitSQLStatements(sql) {
    const statements = [];
    const lines = sql.split('\n');
    let currentStatement = '';
    let inFunction = false;
    let inDollarQuote = false;

    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip comments
        if (trimmedLine.startsWith('--') || trimmedLine === '') {
            continue;
        }

        // Check for function start/end
        if (trimmedLine.includes('$$')) {
            inDollarQuote = !inDollarQuote;
        }
        if (trimmedLine.toUpperCase().includes('CREATE FUNCTION') || 
            trimmedLine.toUpperCase().includes('CREATE OR REPLACE FUNCTION')) {
            inFunction = true;
        }
        
        currentStatement += line + '\n';
        
        // Check for statement end
        if (!inDollarQuote && trimmedLine.endsWith(';')) {
            if (inFunction && trimmedLine.includes('$$;')) {
                inFunction = false;
            }
            if (!inFunction) {
                statements.push(currentStatement.trim());
                currentStatement = '';
            }
        }
    }

    if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
    }

    return statements;
}

async function main() {
    console.log('===========================================');
    console.log('EXECUTING CLOSER MATERIALS SCHEMA VIA API');
    console.log('===========================================\n');
    console.log(`Project: ${projectRef}\n`);

    try {
        // Read the SQL file
        const sqlPath = path.join(__dirname, 'sql', 'create_closer_study_materials_tables.sql');
        const fullSQL = fs.readFileSync(sqlPath, 'utf8');
        
        // Split into statements
        const statements = splitSQLStatements(fullSQL);
        console.log(`Found ${statements.length} SQL statements to execute.\n`);

        // Categorize statements
        const categorized = {
            tables: [],
            indexes: [],
            functions: [],
            triggers: [],
            policies: [],
            data: [],
            other: []
        };

        statements.forEach(stmt => {
            const upper = stmt.toUpperCase();
            if (upper.includes('CREATE TABLE')) {
                categorized.tables.push(stmt);
            } else if (upper.includes('CREATE INDEX')) {
                categorized.indexes.push(stmt);
            } else if (upper.includes('CREATE FUNCTION') || upper.includes('CREATE OR REPLACE FUNCTION')) {
                categorized.functions.push(stmt);
            } else if (upper.includes('CREATE TRIGGER') || upper.includes('DROP TRIGGER')) {
                categorized.triggers.push(stmt);
            } else if (upper.includes('CREATE POLICY') || upper.includes('DROP POLICY') || 
                      (upper.includes('ALTER TABLE') && upper.includes('ENABLE ROW LEVEL SECURITY'))) {
                categorized.policies.push(stmt);
            } else if (upper.includes('INSERT INTO')) {
                categorized.data.push(stmt);
            } else if (upper.includes('GRANT')) {
                categorized.other.push(stmt);
            } else {
                categorized.other.push(stmt);
            }
        });

        console.log('Statement Breakdown:');
        console.log(`  Tables: ${categorized.tables.length}`);
        console.log(`  Functions: ${categorized.functions.length}`);
        console.log(`  Indexes: ${categorized.indexes.length}`);
        console.log(`  Triggers: ${categorized.triggers.length}`);
        console.log(`  Policies: ${categorized.policies.length}`);
        console.log(`  Data: ${categorized.data.length}`);
        console.log(`  Other: ${categorized.other.length}`);

        // Since direct SQL execution requires special permissions,
        // let's create a consolidated approach
        console.log('\n===========================================');
        console.log('CREATING OPTIMIZED EXECUTION SCRIPT');
        console.log('===========================================\n');

        // Create an optimized version for direct execution
        const optimizedSQL = `
-- ========================================
-- CLOSER STUDY MATERIALS - COMPLETE SETUP
-- ========================================
-- Execute this entire script in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

${fullSQL}

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
`;

        const outputPath = path.join(__dirname, 'execute_closer_materials_complete.sql');
        fs.writeFileSync(outputPath, optimizedSQL, 'utf8');
        
        console.log(`✓ Complete SQL script created: ${outputPath}`);
        console.log('\n===========================================');
        console.log('EXECUTION INSTRUCTIONS');
        console.log('===========================================\n');
        console.log('To execute the schema creation:\n');
        console.log('METHOD 1: Supabase Dashboard (RECOMMENDED)');
        console.log('--------------------------------------------');
        console.log(`1. Open: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
        console.log(`2. Copy ALL contents from: ${outputPath}`);
        console.log('3. Paste into SQL Editor');
        console.log('4. Click "RUN" button\n');

        console.log('METHOD 2: Using Supabase CLI');
        console.log('-----------------------------');
        console.log('1. Install Supabase CLI if not already installed:');
        console.log('   npm install -g supabase');
        console.log('2. Link to your project:');
        console.log(`   supabase link --project-ref ${projectRef}`);
        console.log('3. Execute the SQL:');
        console.log(`   supabase db execute -f ${outputPath}`);

        console.log('\n===========================================');
        console.log('WHAT WILL BE CREATED');
        console.log('===========================================\n');
        console.log('📊 TABLES (5):');
        console.log('  • closer_material_categories - Organize materials by category');
        console.log('  • closer_study_materials - Store all study materials');
        console.log('  • closer_material_progress - Track user progress');
        console.log('  • closer_material_interactions - Log user interactions');
        console.log('  • closer_material_permissions - Manage access control\n');
        
        console.log('⚡ INDEXES (13):');
        console.log('  • Performance indexes on foreign keys and frequently queried columns\n');
        
        console.log('🔐 SECURITY (11 RLS Policies):');
        console.log('  • Row Level Security enabled on all tables');
        console.log('  • Users can only see their own progress');
        console.log('  • Admins have full access');
        console.log('  • Materials respect permission settings\n');
        
        console.log('⚙️ FUNCTIONS (3):');
        console.log('  • update_updated_at_column() - Auto-update timestamps');
        console.log('  • get_user_material_stats() - Get user statistics');
        console.log('  • get_popular_materials() - Find popular content\n');
        
        console.log('📝 SAMPLE DATA:');
        console.log('  • 6 default categories for organizing materials\n');
        
        console.log('✅ Ready to execute!');
        console.log(`   Open the SQL Editor and paste the contents of:\n   ${outputPath}`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main().catch(console.error);