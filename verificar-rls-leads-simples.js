require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function verificarRLSLeads() {
  console.log('🔍 VERIFICANDO RLS DA TABELA LEADS\n');

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Contar leads total como admin
    console.log('📊 Contando leads como admin...');
    const { count: totalLeads, error: totalError } = await supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.log('❌ Erro ao contar leads:', totalError);
    } else {
      console.log('📊 Total de leads no sistema (admin):', totalLeads);
    }

    // Verificar como usuário normal (sem service role)
    console.log('\n👤 Testando como usuário normal...');
    const supabaseNormal = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { count: normalLeads, error: normalError } = await supabaseNormal
      .from('leads')
      .select('*', { count: 'exact', head: true });

    if (normalError) {
      console.log('❌ Erro como usuário normal:', normalError);
      console.log('🔒 Isso indica que RLS está ativo e bloqueia acesso anônimo');
    } else {
      console.log('📊 Leads visíveis como usuário anônimo:', normalLeads);
    }

    // Verificar amostra de dados
    console.log('\n🔍 Verificando amostra de leads...');
    
    const { data: leadsData, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('id, organization_id, nome_completo')
      .limit(10);

    if (leadsError) {
      console.log('❌ Erro ao buscar leads:', leadsError);
    } else {
      console.log('📋 Amostra de leads encontrados:');
      leadsData?.forEach((lead, index) => {
        console.log(`${index + 1}. ${lead.nome_completo} (Org: ${lead.organization_id})`);
      });

      // Verificar quais organizações existem
      const orgIds = [...new Set(leadsData?.map(l => l.organization_id))];
      console.log('\n🏢 Organizações nos leads:', orgIds);
    }

    // Verificar organizações existentes
    console.log('\n🏢 Verificando organizações...');
    const { data: orgs, error: orgsError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, owner_email');

    if (orgsError) {
      console.log('❌ Erro ao buscar organizações:', orgsError);
    } else {
      console.log('📋 Organizações existentes:');
      orgs?.forEach((org, index) => {
        console.log(`${index + 1}. ${org.name} (Owner: ${org.owner_email}) - ID: ${org.id}`);
      });
    }

    console.log('\n💡 DIAGNÓSTICO:');
    if (normalError && normalError.message.includes('RLS')) {
      console.log('🔒 RLS está ativo na tabela leads');
      console.log('✅ Para tornar global: precisa modificar políticas RLS');
    } else if (normalError) {
      console.log('❓ RLS pode estar ativo (erro ao acessar como anônimo)');
    } else {
      console.log('✅ Não há RLS ou está configurado para acesso público');
    }

  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

verificarRLSLeads();