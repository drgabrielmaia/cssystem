const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkLeadsComVendas() {
  console.log('Checking leads_com_vendas in database...\n');

  try {
    // Check if it's a view
    const { data: viewData, error: viewError } = await supabase
      .rpc('query_runner', {
        query: `
          SELECT 
            table_name,
            table_type
          FROM information_schema.tables
          WHERE table_name = 'leads_com_vendas'
          AND table_schema = 'public';
        `
      });

    if (viewError) {
      // If query_runner doesn't exist, try direct query
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_name', 'leads_com_vendas')
        .eq('table_schema', 'public');
      
      if (!error && data && data.length > 0) {
        console.log('Found leads_com_vendas:', data[0]);
        console.log(`Type: ${data[0].table_type}`);
      }
    } else if (viewData && viewData.length > 0) {
      console.log('Found leads_com_vendas:', viewData[0]);
      console.log(`Type: ${viewData[0].table_type}`);
    }

    // Check all tables/views with 'leads' in name
    console.log('\nAll tables/views containing "leads":');
    const { data: allLeads } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .ilike('table_name', '%leads%')
      .eq('table_schema', 'public');
    
    if (allLeads) {
      allLeads.forEach(table => {
        console.log(`- ${table.table_name}: ${table.table_type}`);
      });
    }

  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkLeadsComVendas();