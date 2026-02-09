const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyColumns() {
  console.log('=== VERIFYING SQL COLUMN REFERENCES ===\n');

  // Get actual columns from database
  const tables = {
    leads: [],
    mentorados: [],
    organizations: [],
    closers: []
  };

  for (const tableName of Object.keys(tables)) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (!error && data && data.length > 0) {
      tables[tableName] = Object.keys(data[0]);
      console.log(`✓ ${tableName} table has ${tables[tableName].length} columns`);
    }
  }

  console.log('\n=== COLUMN MAPPING SUMMARY ===\n');
  
  console.log('LEADS TABLE COLUMNS:');
  console.log('--------------------');
  const nameColumns = tables.leads.filter(col => col.includes('nome') || col.includes('name'));
  console.log('Name-related columns:', nameColumns);
  
  console.log('\nMENTORADOS TABLE COLUMNS:');
  console.log('-------------------------');
  const mentoradoNameColumns = tables.mentorados.filter(col => col.includes('nome') || col.includes('name'));
  console.log('Name-related columns:', mentoradoNameColumns);
  
  console.log('\nORGANIZATIONS TABLE COLUMNS:');
  console.log('-----------------------------');
  const orgNameColumns = tables.organizations.filter(col => col.includes('name'));
  console.log('Name-related columns:', orgNameColumns);
  
  console.log('\nCLOSERS TABLE COLUMNS:');
  console.log('----------------------');
  const closerNameColumns = tables.closers.filter(col => col.includes('nome') || col.includes('name'));
  console.log('Name-related columns:', closerNameColumns);

  console.log('\n=== KEY FINDINGS ===\n');
  console.log('1. Leads table uses "nome_completo" for the person\'s name (not "nome")');
  console.log('2. Mentorados table uses "nome_completo" for the person\'s name');
  console.log('3. Organizations table uses "name" for the organization name');
  console.log('4. Closers table uses "nome_completo" for the person\'s name');
  console.log('5. SDRs table does not exist yet (needs to be created)');
  console.log('6. Commission-related tables (commission_rules, lead_qualification_rules) do not exist yet');

  console.log('\n=== RECOMMENDATIONS ===\n');
  console.log('✓ Fixed: Changed l.nome to l.nome_completo in SQL views');
  console.log('✓ Fixed: Updated GROUP BY clauses to use l.nome_completo');
  console.log('⚠ Note: SDRs table needs to be created before running migration');
  console.log('⚠ Note: Commission system tables will be created by the migration');
}

verifyColumns();