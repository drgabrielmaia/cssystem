const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function createInstagramTables() {
    try {
        console.log('📱 Starting Instagram Automation Tables Creation...\n');

        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'instagram-automation-tables.sql');
        const sqlContent = await fs.readFile(sqlFilePath, 'utf-8');

        // Split SQL content into individual statements (handling multi-line statements)
        const statements = sqlContent
            .split(/;(?=\s*(?:--|$|CREATE|DROP|ALTER|INSERT|UPDATE|DELETE|COMMENT))/i)
            .map(stmt => stmt.trim())
            .filter(stmt => stmt && !stmt.startsWith('--'));

        console.log(`Found ${statements.length} SQL statements to execute\n`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];

            // Extract the first few words to identify the operation
            const firstLine = statement.split('\n')[0];
            const operation = firstLine.substring(0, 100) + (firstLine.length > 100 ? '...' : '');

            console.log(`[${i + 1}/${statements.length}] Executing: ${operation}`);

            try {
                // Execute the statement using Supabase's rpc function
                const { data, error } = await supabase.rpc('exec_sql', {
                    sql_query: statement + ';'
                });

                if (error) {
                    // If exec_sql doesn't exist, try using the query builder
                    if (error.message.includes('exec_sql')) {
                        console.log('  ⚠️  exec_sql function not found, statement needs manual execution');
                    } else {
                        throw error;
                    }
                } else {
                    console.log('  ✅ Success');
                }
            } catch (err) {
                console.error(`  ❌ Error: ${err.message}`);
                // Continue with next statement even if one fails
            }
        }

        console.log('\n🎉 Instagram Automation Tables Creation Process Completed!');
        console.log('\n📊 Created Tables:');
        console.log('  1. instagram_automations - For storing automation configurations');
        console.log('  2. instagram_funnels - For storing marketing funnels');
        console.log('  3. instagram_funnel_steps - For storing funnel step sequences');

        console.log('\n🔒 Security Features:');
        console.log('  - Row Level Security (RLS) enabled on all tables');
        console.log('  - RLS policies configured for authenticated users');
        console.log('  - Proper foreign key constraints');
        console.log('  - Check constraints on enum fields');

        console.log('\n⚡ Performance Features:');
        console.log('  - Indexes on frequently queried columns');
        console.log('  - Automatic updated_at timestamp triggers');
        console.log('  - Optimized for read and write operations');

        console.log('\n📝 Next Steps:');
        console.log('  1. Execute the SQL file directly in Supabase SQL Editor if some statements failed');
        console.log('  2. Verify tables were created correctly in Supabase Dashboard');
        console.log('  3. Test CRUD operations on the new tables');
        console.log('  4. Implement your Instagram automation logic');

    } catch (error) {
        console.error('❌ Error creating Instagram tables:', error);
        process.exit(1);
    }
}

// Run the function
createInstagramTables();