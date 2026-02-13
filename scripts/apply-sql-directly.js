#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Parse Supabase connection string from URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Extract database connection details from Supabase URL
// Format: https://[project-ref].supabase.co
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('Could not extract project reference from Supabase URL');
  process.exit(1);
}

// Supabase database connection format
const dbConfig = {
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: supabaseKey.split('.')[1], // The password is in the service role key
  ssl: { rejectUnauthorized: false }
};

console.log('📦 Installing pg package if needed...');
console.log(`Connecting to: ${dbConfig.host}`);

async function executeSQLFile() {
  // For Supabase, we'll use the REST API with direct SQL execution
  const sqlContent = readFileSync(
    join(__dirname, '..', 'sql', 'lead-scoring-system.sql'),
    'utf-8'
  );

  console.log('\n🚀 Applying Lead Scoring System to Supabase...\n');
  console.log('Since direct database access requires additional setup,');
  console.log('please follow these steps:\n');
  console.log('=' .repeat(60));
  console.log('📋 MANUAL STEPS TO APPLY THE SQL:');
  console.log('=' .repeat(60));
  console.log('\n1. Go to your Supabase Dashboard:');
  console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql`);
  console.log('\n2. Click on "SQL Editor" in the left sidebar');
  console.log('\n3. Click "New Query"');
  console.log('\n4. Copy and paste the entire content of:');
  console.log(`   ${join(__dirname, '..', 'sql', 'lead-scoring-system.sql')}`);
  console.log('\n5. Click "Run" to execute the SQL');
  console.log('\n6. You should see success messages for each function created');
  console.log('\n' + '=' .repeat(60));
  console.log('🧪 AFTER APPLYING, TEST WITH THESE QUERIES:');
  console.log('=' .repeat(60));
  console.log(`
-- Test the scoring system on 5 recent leads
SELECT * FROM test_lead_scoring_system(5);

-- View closer workload distribution
SELECT * FROM get_lead_distribution_stats();

-- Calculate score for a specific lead (replace with actual ID)
SELECT calculate_lead_score('c9bf9db6-dfc5-4b0c-afe9-67747d8a26f5'::uuid);

-- Manually trigger auto-assignment for a lead
SELECT auto_assign_lead_to_closer('c9bf9db6-dfc5-4b0c-afe9-67747d8a26f5'::uuid);

-- Check recent lead history
SELECT * FROM lead_history ORDER BY created_at DESC LIMIT 10;
  `);

  // Save a simplified version for easier copying
  const simplifiedSQL = sqlContent
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  import('fs').then(fs => {
    fs.writeFileSync(
      join(__dirname, '..', 'sql', 'lead-scoring-system-clean.sql'),
      simplifiedSQL
    );
  });

  console.log('\n💡 TIP: A clean version without comments has been saved to:');
  console.log(`   sql/lead-scoring-system-clean.sql`);
  console.log('   This might be easier to copy/paste into Supabase.\n');
}

executeSQLFile();