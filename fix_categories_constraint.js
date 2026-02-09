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

async function fixCategoriesConstraint() {
  console.log('🔧 Fixing categories constraint and creating default categories...');

  try {
    // 1. Check current constraint values
    console.log('📋 Checking current categorias_financeiras constraint...');
    
    // 2. Try to create categories with the correct values
    console.log('🏷️ Creating default categories...');
    
    // First, let's see what tipo values are accepted
    const { data: existingCategories, error: queryError } = await supabase
      .from('categorias_financeiras')
      .select('tipo')
      .limit(5);

    if (queryError) {
      console.error('❌ Error querying categories:', queryError.message);
    } else {
      console.log('✅ Existing category types:', [...new Set(existingCategories?.map(c => c.tipo))]);
    }

    // Try different variations for the tipo field
    const categoryVariations = [
      { nome: 'Comissões Pagas', tipo: 'saida', cor: '#EF4444' },
      { nome: 'Comissões Pagas', tipo: 'despesa', cor: '#EF4444' },
      { nome: 'Comissões Pagas', tipo: 'gasto', cor: '#EF4444' },
      { nome: 'Comissões Pagas', tipo: 'expense', cor: '#EF4444' },
    ];

    let successfulCategory = null;

    for (const category of categoryVariations) {
      try {
        const { data, error } = await supabase
          .from('categorias_financeiras')
          .insert([{
            ...category,
            ativo: true
          }])
          .select()
          .single();

        if (!error) {
          console.log('✅ Successfully created category with tipo:', category.tipo);
          successfulCategory = category;
          break;
        } else {
          console.log('❌ Failed with tipo:', category.tipo, '-', error.message);
        }
      } catch (err) {
        console.log('❌ Exception with tipo:', category.tipo, '-', err.message);
      }
    }

    // Try the same for entrada/receita
    const incomeVariations = [
      { nome: 'Mentoria', tipo: 'entrada', cor: '#10B981' },
      { nome: 'Mentoria', tipo: 'receita', cor: '#10B981' },
      { nome: 'Mentoria', tipo: 'renda', cor: '#10B981' },
      { nome: 'Mentoria', tipo: 'income', cor: '#10B981' },
    ];

    let successfulIncome = null;

    for (const category of incomeVariations) {
      try {
        const { data, error } = await supabase
          .from('categorias_financeiras')
          .insert([{
            ...category,
            ativo: true
          }])
          .select()
          .single();

        if (!error) {
          console.log('✅ Successfully created income category with tipo:', category.tipo);
          successfulIncome = category;
          break;
        } else {
          console.log('❌ Failed income with tipo:', category.tipo, '-', error.message);
        }
      } catch (err) {
        console.log('❌ Exception income with tipo:', category.tipo, '-', err.message);
      }
    }

    if (successfulCategory || successfulIncome) {
      console.log('✅ Default categories created successfully');
    } else {
      console.log('⚠️  Could not create default categories - constraint might be too restrictive');
      
      // Let's check what the actual constraint allows
      console.log('🔍 Let me try to find out what tipo values are allowed...');
      
      // Try to get constraint info (this might not work due to RLS)
      try {
        const { data: constraints } = await supabase
          .rpc('get_table_constraints', { table_name: 'categorias_financeiras' });
        console.log('📋 Constraints:', constraints);
      } catch (err) {
        console.log('❌ Could not fetch constraints');
      }
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }

  console.log('🎯 Categories constraint fix attempt complete');
}

fixCategoriesConstraint().catch(console.error);