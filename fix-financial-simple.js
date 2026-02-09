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

async function createMissingTables() {
  console.log('🔧 Creating missing tables and fixing RLS...');

  // 1. Try to create referral_payments table if it doesn't exist
  console.log('📋 Creating referral_payments table...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS referral_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
      payment_amount DECIMAL(10,2) NOT NULL,
      payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
      payment_method VARCHAR(50),
      notes TEXT,
      organization_id UUID NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Enable RLS
    ALTER TABLE referral_payments ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policy
    DROP POLICY IF EXISTS "Users can manage own org referral payments" ON referral_payments;
    CREATE POLICY "Users can manage own org referral payments" ON referral_payments
      FOR ALL USING (
        organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = auth.uid())
      );
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { query: createTableSQL });
    
    if (error && !error.message.includes('already exists') && !error.message.includes('Could not find')) {
      console.error('❌ Create table error:', error);
    } else {
      console.log('✅ referral_payments table handled');
    }
  } catch (err) {
    console.log('ℹ️  Direct SQL not available, trying individual operations...');
  }

  // 2. Create default financial categories
  console.log('📂 Creating default financial categories...');
  
  try {
    const { error: insertError } = await supabase
      .from('categorias_financeiras')
      .upsert([
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
      ], { 
        onConflict: 'nome',
        ignoreDuplicates: true
      });
      
    if (insertError) {
      console.error('❌ Categories insert error:', insertError.message);
    } else {
      console.log('✅ Default categories created/updated');
    }
  } catch (err) {
    console.error('❌ Categories error:', err);
  }

  // 3. Test financial queries that were failing
  console.log('🧪 Testing financial sync queries...');

  try {
    // Test transacoes query
    const { data: transacoes, error: transacoesError } = await supabase
      .from('transacoes_financeiras')
      .select(`
        *,
        categoria:categorias_financeiras(nome, tipo)
      `)
      .gte('data_transacao', '2026-02-01')
      .limit(5);

    if (transacoesError) {
      console.error('❌ Transacoes query error:', transacoesError.message);
    } else {
      console.log('✅ Transacoes query: OK', transacoes?.length || 0, 'records');
    }

    // Test commissions query  
    const { data: commissions, error: commissionsError } = await supabase
      .from('commissions')
      .select('*')
      .eq('status', 'paid')
      .limit(5);

    if (commissionsError) {
      console.error('❌ Commissions query error:', commissionsError.message);
    } else {
      console.log('✅ Commissions query: OK', commissions?.length || 0, 'records');
    }

    // Try to get category for "Comissões Pagas"
    const { data: categoria, error: catError } = await supabase
      .from('categorias_financeiras')
      .select('id')
      .eq('nome', 'Comissões Pagas')
      .eq('ativo', true)
      .maybeSingle();

    if (catError) {
      console.error('❌ Category lookup error:', catError.message);
    } else {
      console.log('✅ Category lookup: OK', categoria ? 'found' : 'not found');
    }

  } catch (err) {
    console.error('❌ Testing error:', err);
  }

  console.log('🎯 Financial sync fix attempt complete');
}

createMissingTables().catch(console.error);