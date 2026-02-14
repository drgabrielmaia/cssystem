require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function inserirIachelpsOrganizationUsers() {
  console.log('🔧 INSERINDO IACHELPS EM ORGANIZATION_USERS CORRETAMENTE\n');

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const email = 'iachelps@gmail.com';

    // Buscar usuário no Supabase Auth
    console.log('👤 Buscando usuário no Supabase Auth...');
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = users.users.find(u => u.email === email);

    if (!authUser) {
      console.log('❌ Usuário não encontrado no Supabase Auth');
      return;
    }

    console.log('✅ User ID:', authUser.id);

    // Buscar organização IAC Helps
    console.log('🏢 Buscando organização...');
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('owner_email', email)
      .single();

    if (!orgData) {
      console.log('❌ Organização não encontrada');
      return;
    }

    console.log('✅ Organization ID:', orgData.id, '(' + orgData.name + ')');

    // Verificar se já existe
    console.log('🔍 Verificando se já existe registro...');
    const { data: existing } = await supabaseAdmin
      .from('organization_users')
      .select('*')
      .eq('user_id', authUser.id)
      .eq('organization_id', orgData.id)
      .single();

    if (existing) {
      console.log('✅ Registro já existe:', existing.id);
      console.log('Role atual:', existing.role);
      
      // Atualizar se necessário
      if (existing.role !== 'owner') {
        const { error: updateError } = await supabaseAdmin
          .from('organization_users')
          .update({ 
            role: 'owner',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          console.log('❌ Erro ao atualizar:', updateError);
        } else {
          console.log('✅ Role atualizado para owner');
        }
      }
    } else {
      // Inserir novo registro
      console.log('➕ Inserindo novo registro...');
      
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('organization_users')
        .insert({
          user_id: authUser.id,
          organization_id: orgData.id,
          email: email,
          role: 'owner',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.log('❌ Erro ao inserir:', insertError);
        return;
      }

      console.log('✅ Registro inserido com sucesso!');
      console.log('ID:', insertData.id);
    }

    console.log('\n🎉 CONFIGURAÇÃO FINALIZADA!');
    console.log('✅ Usuário no Supabase Auth');
    console.log('✅ Permissões de owner na organização');
    console.log('✅ Pronto para login em: http://localhost:3000/login');
    console.log('📧 Email: iachelps@gmail.com');
    console.log('🔑 Senha: iache123');

  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

inserirIachelpsOrganizationUsers();