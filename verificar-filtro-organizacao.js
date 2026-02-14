require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function verificarFiltroOrganizacao() {
  console.log('🔍 VERIFICANDO FILTRO DE ORGANIZAÇÃO NOS LEADS\n');

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const iacHelpsOrgId = '1689ece2-a066-4bca-9262-c3bf66a15d43';
    const adminOrgId = '9c8c0033-15ea-4e33-a55f-28d81a19693b';

    console.log('🏢 Testando filtros de organização...');

    // 1. Contar leads da IAC Helps
    const { count: iacLeadsCount, error: iacError } = await supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', iacHelpsOrgId);

    if (iacError) {
      console.log('❌ Erro ao contar leads IAC Helps:', iacError);
    } else {
      console.log('📊 Leads da IAC Helps:', iacLeadsCount);
    }

    // 2. Contar leads da Admin Organization
    const { count: adminLeadsCount, error: adminError } = await supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', adminOrgId);

    if (adminError) {
      console.log('❌ Erro ao contar leads Admin Org:', adminError);
    } else {
      console.log('📊 Leads da Admin Organization:', adminLeadsCount);
    }

    // 3. Buscar dados dos leads da IAC Helps
    const { data: iacLeads, error: iacDataError } = await supabaseAdmin
      .from('leads')
      .select('id, nome_completo, status, organization_id')
      .eq('organization_id', iacHelpsOrgId)
      .limit(10);

    if (iacDataError) {
      console.log('❌ Erro ao buscar dados IAC Helps:', iacDataError);
    } else {
      console.log('\n📋 Leads da IAC Helps encontrados:');
      iacLeads?.forEach((lead, index) => {
        console.log(`${index + 1}. ${lead.nome_completo} (${lead.status}) - Org: ${lead.organization_id}`);
      });
    }

    // 4. Verificar qual organização o iachelps@gmail.com pertence
    console.log('\n👤 Verificando organização do iachelps@gmail.com...');
    
    const { data: userOrgs, error: userError } = await supabaseAdmin
      .from('organization_users')
      .select(`
        id,
        organization_id,
        role,
        organizations (
          id,
          name,
          owner_email
        )
      `)
      .eq('email', 'iachelps@gmail.com');

    if (userError) {
      console.log('❌ Erro ao buscar organizações do usuário:', userError);
    } else {
      console.log('🏢 Organizações do iachelps@gmail.com:');
      userOrgs?.forEach((org, index) => {
        console.log(`${index + 1}. ${org.organizations.name} (${org.role}) - ID: ${org.organization_id}`);
      });
    }

    console.log('\n💡 CONCLUSÃO:');
    if (iacLeadsCount && iacLeadsCount > 0) {
      console.log('✅ IAC Helps TEM leads próprios');
      console.log('✅ Filtro por organização deve funcionar');
      console.log('✅ iachelps@gmail.com deve ver', iacLeadsCount, 'leads');
    } else {
      console.log('⚠️ IAC Helps NÃO tem leads');
      console.log('⚠️ iachelps@gmail.com verá uma lista vazia');
    }

    if (adminLeadsCount && adminLeadsCount > 0) {
      console.log('ℹ️ Admin Organization tem', adminLeadsCount, 'leads (não visíveis para iachelps)');
    }

  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

verificarFiltroOrganizacao();