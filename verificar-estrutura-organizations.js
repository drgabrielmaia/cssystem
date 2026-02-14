require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verificarEstrutura() {
  console.log('🔍 VERIFICANDO ESTRUTURA DA TABELA ORGANIZATIONS\n');
  
  try {
    // Tentar buscar uma organização existente para ver a estrutura
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao consultar organizations:', error);
      return;
    }
    
    if (orgs && orgs.length > 0) {
      console.log('📊 Estrutura da tabela organizations:');
      const org = orgs[0];
      Object.keys(org).forEach(key => {
        console.log(`   ${key}: ${typeof org[key]} (${org[key]})`);
      });
    } else {
      console.log('📊 Tabela organizations está vazia');
    }
    
    // Também verificar estrutura da tabela mentorados
    console.log('\n🔍 VERIFICANDO ESTRUTURA DA TABELA MENTORADOS\n');
    
    const { data: mentorados, error: mentError } = await supabase
      .from('mentorados')
      .select('*')
      .limit(1);
    
    if (mentError) {
      console.error('❌ Erro ao consultar mentorados:', mentError);
      return;
    }
    
    if (mentorados && mentorados.length > 0) {
      console.log('📊 Estrutura da tabela mentorados:');
      const ment = mentorados[0];
      Object.keys(ment).forEach(key => {
        console.log(`   ${key}: ${typeof ment[key]}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

verificarEstrutura();