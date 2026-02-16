require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function queryIacheLeads() {
  console.log('📊 BUSCANDO LEADS DO IACHE\n');

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Buscar organização do Iache
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('owner_email', 'iachelps@gmail.com')
      .single();

    if (!orgData) {
      console.log('❌ Organização do Iache não encontrada');
      return;
    }

    console.log('✅ Organização:', orgData.name, '(ID:', orgData.id + ')');

    // Buscar leads da organização
    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('organization_id', orgData.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('❌ Erro ao buscar leads:', error);
      return;
    }

    console.log('\n📋 LEADS ENCONTRADOS:', leads.length);
    console.log('================================\n');

    leads.forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.nome || 'Sem nome'}`);
      console.log(`   📧 Email: ${lead.email || 'N/A'}`);
      console.log(`   📱 Telefone: ${lead.telefone || 'N/A'}`);
      console.log(`   📊 Status: ${lead.status || 'N/A'}`);
      console.log(`   💰 Valor: R$ ${lead.valor_proposta || 'N/A'}`);
      console.log(`   📅 Criado em: ${lead.created_at || 'N/A'}`);
      console.log(`   🆔 ID: ${lead.id}`);
      console.log('');
    });

    // Estatísticas rápidas
    const statusCount = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});

    console.log('📈 ESTATÍSTICAS POR STATUS:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} leads`);
    });

  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

queryIacheLeads();