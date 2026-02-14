require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verificarAcessoAdmin() {
  console.log('🔍 VERIFICANDO COMO FUNCIONA O ACESSO ADMIN\n');
  
  try {
    const email = 'iachelps@gmail.com';
    
    // 1. Verificar valores permitidos para status_login
    console.log('📋 Verificando valores de status_login existentes...');
    
    const { data: statusExamples } = await supabase
      .from('mentorados')
      .select('status_login')
      .not('status_login', 'is', null)
      .limit(10);
    
    const statusUnicos = [...new Set(statusExamples?.map(s => s.status_login) || [])];
    console.log('✅ Valores de status_login encontrados:', statusUnicos);
    
    // 2. Verificar como outros admins são identificados
    console.log('\n🔍 Verificando como admins existentes são identificados...');
    
    // Buscar organizações e seus owners
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, owner_email')
      .limit(5);
    
    console.log('🏢 Organizações e owners:');
    orgs?.forEach(org => {
      console.log(`   ${org.name}: ${org.owner_email}`);
    });
    
    // 3. Buscar mentorados que são owners de organizações
    if (orgs && orgs.length > 0) {
      console.log('\n👤 Verificando mentorados que são owners...');
      
      const ownerEmails = orgs.map(org => org.owner_email);
      const { data: ownerMentorados } = await supabase
        .from('mentorados')
        .select('nome_completo, email, status_login, organization_id')
        .in('email', ownerEmails);
      
      console.log('👑 Mentorados que são owners:');
      ownerMentorados?.forEach(owner => {
        console.log(`   ${owner.nome_completo} (${owner.email})`);
        console.log(`   Status: ${owner.status_login}`);
        console.log(`   Org: ${owner.organization_id}`);
      });
    }
    
    // 4. Testar acesso admin via owner_email
    console.log('\n🔐 Verificando acesso admin atual da conta iachelps...');
    
    const { data: iacOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_email', email)
      .single();
    
    const { data: iacMentorado } = await supabase
      .from('mentorados')
      .select('*')
      .eq('email', email)
      .single();
    
    console.log('🏢 Organização IAC Helps:');
    console.log(`   Nome: ${iacOrg?.name}`);
    console.log(`   Owner: ${iacOrg?.owner_email}`);
    console.log(`   ID: ${iacOrg?.id}`);
    
    console.log('\n👤 Mentorado IAC Helps:');
    console.log(`   Nome: ${iacMentorado?.nome_completo}`);
    console.log(`   Email: ${iacMentorado?.email}`);
    console.log(`   Status: ${iacMentorado?.status_login}`);
    console.log(`   Org ID: ${iacMentorado?.organization_id}`);
    
    // 5. Verificar se já pode acessar admin
    const isOwner = iacOrg?.owner_email === email;
    const sameOrg = iacOrg?.id === iacMentorado?.organization_id;
    
    console.log('\n🎯 ANÁLISE DE ACESSO ADMIN:');
    console.log(`✅ É owner da organização: ${isOwner ? 'SIM' : 'NÃO'}`);
    console.log(`✅ Mesma organização: ${sameOrg ? 'SIM' : 'NÃO'}`);
    console.log(`✅ Pode acessar admin: ${isOwner && sameOrg ? 'SIM' : 'NÃO'}`);
    
    // 6. Verificar rota de login admin
    console.log('\n🔗 URLs de teste:');
    console.log('📧 Email: iachelps@gmail.com');
    console.log('🔑 Senha: iache123');
    console.log('🔗 Login Admin: http://localhost:3000/admin/login');
    console.log('🔗 Dashboard: http://localhost:3000/admin/dashboard');
    console.log('👥 Leads: http://localhost:3000/admin/leads');
    
    if (isOwner && sameOrg) {
      console.log('\n🎉 PERFEITO! A conta já está configurada como ADMIN!');
      console.log('✅ Pode fazer login na área administrativa');
      console.log('✅ Tem acesso total às funcionalidades de owner');
      
      console.log('\n📋 FUNCIONALIDADES DISPONÍVEIS:');
      console.log('✅ Gerenciar leads da organização');
      console.log('✅ Cadastrar novos mentorados');
      console.log('✅ Acompanhar vendas e comissões');
      console.log('✅ Gerenciar módulos de vídeo');
      console.log('✅ Acessar relatórios financeiros');
      console.log('✅ Configurar organização');
      
    } else {
      console.log('\n⚠️ Precisa ajustar a configuração de admin');
    }
    
  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

verificarAcessoAdmin();