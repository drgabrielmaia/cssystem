#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStructure() {
  console.log('🔍 Checking Database Structure\n');
  
  // Check leads table columns
  console.log('📊 Leads Table Structure:');
  console.log('-'.repeat(60));
  
  const { data: leadsColumns, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .limit(1);
  
  if (leadsError) {
    console.error('Error checking leads table:', leadsError);
  } else if (leadsColumns && leadsColumns.length > 0) {
    console.log('Available columns:', Object.keys(leadsColumns[0]).join(', '));
    console.log('\nSample lead data:');
    console.log(JSON.stringify(leadsColumns[0], null, 2));
  }
  
  // Check closers table
  console.log('\n\n📊 Closers Table Structure:');
  console.log('-'.repeat(60));
  
  const { data: closersColumns, error: closersError } = await supabase
    .from('closers')
    .select('*')
    .limit(1);
  
  if (closersError) {
    console.error('Error checking closers table:', closersError);
  } else if (closersColumns && closersColumns.length > 0) {
    console.log('Available columns:', Object.keys(closersColumns[0]).join(', '));
    console.log('\nSample closer data:');
    console.log(JSON.stringify(closersColumns[0], null, 2));
  }
  
  // Count records
  console.log('\n\n📈 Record Counts:');
  console.log('-'.repeat(60));
  
  const { count: leadCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });
  
  const { count: closerCount } = await supabase
    .from('closers')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total leads: ${leadCount || 0}`);
  console.log(`Total closers: ${closerCount || 0}`);
}

checkDatabaseStructure()
  .then(() => {
    console.log('\n✨ Structure check complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });