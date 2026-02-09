const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseStructure() {
  console.log('=== CHECKING DATABASE STRUCTURE ===\n');

  try {
    // Check leads table structure
    console.log('1. LEADS TABLE STRUCTURE:');
    console.log('-------------------------');
    const { data: leadsColumns, error: leadsError } = await supabase
      .rpc('get_table_columns', { table_name: 'leads' });
    
    if (leadsError) {
      // Try alternative method
      const { data: leadsSchema, error: leadsSchemaError } = await supabase
        .from('leads')
        .select('*')
        .limit(0);
      
      if (!leadsSchemaError) {
        // Get column info from information_schema
        const { data: columnInfo, error: columnError } = await supabase
          .rpc('get_columns_info', { p_table_name: 'leads' });
        
        if (columnError) {
          // Direct query to information_schema
          const { data, error } = await supabase
            .rpc('query_columns', { 
              query: `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'leads'
                ORDER BY ordinal_position
              `
            });
          
          if (error) {
            console.log('Could not get leads columns:', error.message);
            // Try a simple select to see what we get
            const { data: sampleLead, error: sampleError } = await supabase
              .from('leads')
              .select('*')
              .limit(1);
            
            if (!sampleError && sampleLead && sampleLead.length > 0) {
              console.log('Sample lead columns:', Object.keys(sampleLead[0]));
            } else {
              console.log('Error getting sample lead:', sampleError?.message);
            }
          } else {
            console.log(data);
          }
        } else {
          console.log(columnInfo);
        }
      }
    } else {
      console.log(leadsColumns);
    }

    // Check mentorados table structure
    console.log('\n2. MENTORADOS TABLE STRUCTURE:');
    console.log('-------------------------------');
    const { data: sampleMentorado, error: mentoradoError } = await supabase
      .from('mentorados')
      .select('*')
      .limit(1);
    
    if (!mentoradoError) {
      if (sampleMentorado && sampleMentorado.length > 0) {
        console.log('Mentorados columns:', Object.keys(sampleMentorado[0]));
        console.log('\nSample data structure:');
        Object.entries(sampleMentorado[0]).forEach(([key, value]) => {
          console.log(`  ${key}: ${typeof value} (${value === null ? 'null' : 'has value'})`);
        });
      } else {
        console.log('No mentorados found in table');
      }
    } else {
      console.log('Error accessing mentorados:', mentoradoError.message);
    }

    // Check organizations table structure
    console.log('\n3. ORGANIZATIONS TABLE STRUCTURE:');
    console.log('----------------------------------');
    const { data: sampleOrg, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);
    
    if (!orgError) {
      if (sampleOrg && sampleOrg.length > 0) {
        console.log('Organizations columns:', Object.keys(sampleOrg[0]));
        console.log('\nSample data structure:');
        Object.entries(sampleOrg[0]).forEach(([key, value]) => {
          console.log(`  ${key}: ${typeof value} (${value === null ? 'null' : 'has value'})`);
        });
      } else {
        console.log('No organizations found in table');
      }
    } else {
      console.log('Error accessing organizations:', orgError.message);
    }

    // Check closers table structure
    console.log('\n4. CLOSERS TABLE STRUCTURE:');
    console.log('----------------------------');
    const { data: sampleCloser, error: closerError } = await supabase
      .from('closers')
      .select('*')
      .limit(1);
    
    if (!closerError) {
      if (sampleCloser && sampleCloser.length > 0) {
        console.log('Closers columns:', Object.keys(sampleCloser[0]));
        console.log('\nSample data structure:');
        Object.entries(sampleCloser[0]).forEach(([key, value]) => {
          console.log(`  ${key}: ${typeof value} (${value === null ? 'null' : 'has value'})`);
        });
      } else {
        console.log('No closers found in table');
      }
    } else {
      console.log('Error accessing closers:', closerError.message);
    }

    // Check sdrs table structure
    console.log('\n5. SDRS TABLE STRUCTURE:');
    console.log('-------------------------');
    const { data: sampleSdr, error: sdrError } = await supabase
      .from('sdrs')
      .select('*')
      .limit(1);
    
    if (!sdrError) {
      if (sampleSdr && sampleSdr.length > 0) {
        console.log('SDRs columns:', Object.keys(sampleSdr[0]));
        console.log('\nSample data structure:');
        Object.entries(sampleSdr[0]).forEach(([key, value]) => {
          console.log(`  ${key}: ${typeof value} (${value === null ? 'null' : 'has value'})`);
        });
      } else {
        console.log('No SDRs found in table');
      }
    } else {
      console.log('Error accessing sdrs:', sdrError.message);
    }

    // Check lead_qualification_rules table
    console.log('\n6. LEAD_QUALIFICATION_RULES TABLE:');
    console.log('------------------------------------');
    const { data: sampleRule, error: ruleError } = await supabase
      .from('lead_qualification_rules')
      .select('*')
      .limit(1);
    
    if (!ruleError) {
      if (sampleRule && sampleRule.length > 0) {
        console.log('Lead qualification rules columns:', Object.keys(sampleRule[0]));
      } else {
        console.log('Table exists but is empty or not accessible');
      }
    } else {
      console.log('Table does not exist or error:', ruleError.message);
    }

    // Check commission_rules table
    console.log('\n7. COMMISSION_RULES TABLE:');
    console.log('---------------------------');
    const { data: sampleCommission, error: commissionError } = await supabase
      .from('commission_rules')
      .select('*')
      .limit(1);
    
    if (!commissionError) {
      if (sampleCommission && sampleCommission.length > 0) {
        console.log('Commission rules columns:', Object.keys(sampleCommission[0]));
      } else {
        console.log('Table exists but is empty or not accessible');
      }
    } else {
      console.log('Table does not exist or error:', commissionError.message);
    }

    // List all public tables
    console.log('\n8. ALL PUBLIC TABLES:');
    console.log('----------------------');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_all_tables');
    
    if (!tablesError && tables) {
      console.log('Available tables:', tables);
    } else {
      // Try alternative method
      const { data: tableList, error: tableListError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (!tableListError && tableList) {
        console.log('Available tables:', tableList);
      } else {
        console.log('Could not retrieve table list');
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkDatabaseStructure();