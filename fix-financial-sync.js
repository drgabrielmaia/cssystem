const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables
const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
const env = {};
lines.forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    env[key] = values.join('=');
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fixFinancialSync() {
  console.log('🔧 Fixing financial sync errors...');

  // 1. Check if referral_payments table exists
  console.log('📋 Checking tables...');
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['referral_payments', 'mentorship_payments', 'transacoes_financeiras', 'categorias_financeiras']);

  if (tablesError) {
    console.error('❌ Error checking tables:', tablesError);
    return;
  }

  console.log('📊 Found tables:', tables?.map(t => t.table_name));

  // 2. Check if the tables have organization_id column
  try {
    // Test basic queries to see what works
    console.log('🧪 Testing basic queries...');

    // Test transacoes_financeiras
    const { data: transacoes, error: transacoesError } = await supabase
      .from('transacoes_financeiras')
      .select('*')
      .limit(1);

    if (transacoesError) {
      console.error('❌ transacoes_financeiras error:', transacoesError.message);
    } else {
      console.log('✅ transacoes_financeiras: OK');
    }

    // Test categorias_financeiras  
    const { data: categorias, error: categoriasError } = await supabase
      .from('categorias_financeiras')
      .select('*')
      .limit(1);

    if (categoriasError) {
      console.error('❌ categorias_financeiras error:', categoriasError.message);
      
      // Try to create default categories if table is empty
      console.log('🔧 Attempting to create default categories...');
      const { error: insertError } = await supabase
        .from('categorias_financeiras')
        .insert([
          {
            nome: 'Mentoria',
            tipo: 'entrada', 
            cor: '#10B981',
            ativo: true
          },
          {
            nome: 'Comissões Pagas',
            tipo: 'saida',
            cor: '#EF4444', 
            ativo: true
          }
        ]);
        
      if (insertError) {
        console.error('❌ Insert categories error:', insertError.message);
      } else {
        console.log('✅ Default categories created');
      }
    } else {
      console.log('✅ categorias_financeiras: OK');
    }

    // Test commissions
    const { data: commissions, error: commissionsError } = await supabase
      .from('commissions')
      .select('*')
      .limit(1);

    if (commissionsError) {
      console.error('❌ commissions error:', commissionsError.message);
    } else {
      console.log('✅ commissions: OK');
    }

    // Test if referral_payments exists
    const { data: payments, error: paymentsError } = await supabase
      .from('referral_payments')
      .select('*')
      .limit(1);

    if (paymentsError) {
      console.error('❌ referral_payments error:', paymentsError.message);
      
      // Check if mentorship_payments exists instead
      const { data: mentorshipPayments, error: mentorshipError } = await supabase
        .from('mentorship_payments')
        .select('*')
        .limit(1);
        
      if (mentorshipError) {
        console.error('❌ mentorship_payments also not found:', mentorshipError.message);
      } else {
        console.log('ℹ️  Found mentorship_payments table instead of referral_payments');
      }
    } else {
      console.log('✅ referral_payments: OK');
    }

  } catch (error) {
    console.error('❌ General error:', error.message);
  }

  console.log('🎯 Financial sync diagnostic complete');
}

fixFinancialSync().catch(console.error);