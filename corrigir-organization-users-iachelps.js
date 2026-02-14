require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function corrigirOrganizationUsers() {
  console.log('🔧 CORRIGINDO ORGANIZATION_USERS PARA IACHELPS\n');

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const email = 'iachelps@gmail.com';

    // Buscar o usuário no Supabase Auth
    console.log('👤 Buscando usuário no Supabase Auth...');
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (listError) {
      console.log('❌ Erro ao listar usuários:', listError);
      return;
    }

    const authUser = users.users.find(u => u.email === email);
    if (!authUser) {
      console.log('❌ Usuário não encontrado no Supabase Auth');
      return;
    }

    console.log('✅ Usuário encontrado:', authUser.id);

    // Buscar a organização
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('owner_email', email)
      .single();

    if (orgError || !orgData) {
      console.log('❌ Organização não encontrada:', orgError?.message);
      return;
    }

    console.log('🏢 Organização encontrada:', orgData.name);

    // Inserir ou atualizar na organization_users com email
    console.log('➕ Inserindo registro completo em organization_users...');
    
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('organization_users')
      .upsert({
        user_id: authUser.id,
        organization_id: orgData.id,
        email: email, // Incluir email obrigatório
        role: 'owner',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,organization_id'
      })
      .select();

    if (insertError) {
      console.log('❌ Erro ao inserir organization_users:', insertError);
      return;
    }

    console.log('✅ Organization_users configurado com sucesso!');
    console.log('Dados inseridos:', insertData);

    console.log('\n🎉 TUDO PRONTO!');
    console.log('✅ Usuário no Supabase Auth: ' + authUser.id);
    console.log('✅ Permissões de owner configuradas');
    console.log('✅ Pode fazer login em: http://localhost:3000/login');
    console.log('📧 Email: iachelps@gmail.com');
    console.log('🔑 Senha: iache123');

  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

corrigirOrganizationUsers();