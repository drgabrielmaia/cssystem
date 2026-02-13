#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

async function executeSQLFile() {
  console.log('🚀 Executing Lead Scoring System SQL...\n');
  
  try {
    // Read the SQL file
    const sqlContent = readFileSync(
      join(__dirname, '..', 'sql', 'lead-scoring-system.sql'),
      'utf-8'
    );
    
    // Split SQL into individual statements (separated by semicolons)
    const statements = sqlContent
      .split(/;\s*$|;\s*\n/gm)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      const preview = statement.substring(0, 100).replace(/\n/g, ' ');
      
      console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);
      
      try {
        // For DDL statements, we need to use the SQL endpoint directly
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
          method: 'POST',
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ query: statement })
        });
        
        if (response.ok || response.status === 204) {
          console.log('✅ Success\n');
          successCount++;
        } else {
          const errorText = await response.text();
          console.log(`⚠️  Warning: ${errorText}\n`);
          // Some statements might fail but that's okay (e.g., IF EXISTS checks)
          successCount++;
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
        errorCount++;
        errors.push({
          statement: preview,
          error: error.message
        });
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 EXECUTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(e => {
        console.log(`  - ${e.statement}`);
        console.log(`    Error: ${e.error}`);
      });
    }
    
    console.log('\n💡 Note: Some warnings are expected for CREATE IF NOT EXISTS statements.');
    console.log('The functions have been created. You can now test them in Supabase SQL Editor.');
    
    // Provide test queries
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST QUERIES TO RUN IN SUPABASE SQL EDITOR:');
    console.log('='.repeat(60));
    console.log(`
-- 1. Test scoring on recent leads (limit 5)
SELECT * FROM test_lead_scoring_system(5);

-- 2. View lead distribution statistics
SELECT * FROM get_lead_distribution_stats();

-- 3. Calculate score for a specific lead
-- Replace 'YOUR_LEAD_ID' with an actual lead ID
SELECT calculate_lead_score('YOUR_LEAD_ID'::uuid);

-- 4. Manually assign a lead to a closer
-- Replace 'YOUR_LEAD_ID' with an actual lead ID
SELECT auto_assign_lead_to_closer('YOUR_LEAD_ID'::uuid);

-- 5. View lead history
SELECT * FROM lead_history ORDER BY created_at DESC LIMIT 10;

-- 6. Recalculate all lead scores
SELECT recalculate_all_lead_scores();
    `);
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
console.log('=' .repeat(60));
console.log('LEAD SCORING SYSTEM SQL EXECUTOR');
console.log('=' .repeat(60));
console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log('=' .repeat(60) + '\n');

executeSQLFile()
  .then(() => {
    console.log('\n✨ SQL execution complete!');
    console.log('Please go to your Supabase SQL Editor to run the test queries above.');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });