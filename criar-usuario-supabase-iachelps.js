require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function criarUsuarioSupabase() {
  console.log('🔧 CRIANDO USUÁRIO NO SUPABASE AUTH PARA IACHELPS\n');

  try {
    // Usar service role key para criar usuário
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
    const password = 'iache123';

    console.log('👤 Criando usuário no Supabase Auth...');
    console.log('📧 Email:', email);
    console.log('🔑 Senha:', password);

    // Criar usuário no Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        nome_completo: 'IAC Helps Admin',
        role: 'admin',
        organization: 'IAC Helps'
      }
    });

    if (authError) {
      console.log('❌ Erro ao criar usuário no Supabase Auth:', authError);
      
      // Se usuário já existe, tentar resetar senha
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        console.log('🔄 Usuário já existe, tentando atualizar senha...');
        
        // Buscar usuário existente
        const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000
        });

        if (listError) {
          console.log('❌ Erro ao listar usuários:', listError);
          return;
        }

        const existingUser = existingUsers.users.find(u => u.email === email);
        
        if (existingUser) {
          console.log('👤 Usuário encontrado, atualizando senha...');
          
          const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.id,
            {
              password: password,
              email_confirm: true,
              user_metadata: {
                nome_completo: 'IAC Helps Admin',
                role: 'admin',
                organization: 'IAC Helps'
              }
            }
          );

          if (updateError) {
            console.log('❌ Erro ao atualizar usuário:', updateError);
            return;
          }

          console.log('✅ Senha atualizada com sucesso!');
          console.log('User ID:', updateData.user.id);
        }
      }
      return;
    }

    console.log('✅ Usuário criado no Supabase Auth com sucesso!');
    console.log('User ID:', authUser.user.id);
    console.log('Email confirmado:', authUser.user.email_confirmed_at ? 'Sim' : 'Não');

    // Agora vou criar/atualizar o usuário na tabela organization_users para dar permissões admin
    console.log('\n🏢 Criando permissões de administrador...');
    
    // Primeiro, buscar a organização IAC Helps
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

    // Verificar se já existe registro na organization_users
    const { data: existingOrgUser, error: checkError } = await supabaseAdmin
      .from('organization_users')
      .select('*')
      .eq('user_id', authUser.user.id)
      .eq('organization_id', orgData.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.log('❌ Erro ao verificar organization_users:', checkError);
      return;
    }

    if (existingOrgUser) {
      console.log('🔄 Atualizando permissões existentes...');
      
      const { error: updateError } = await supabaseAdmin
        .from('organization_users')
        .update({
          role: 'owner',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingOrgUser.id);

      if (updateError) {
        console.log('❌ Erro ao atualizar organization_users:', updateError);
        return;
      }

      console.log('✅ Permissões atualizadas!');
    } else {
      console.log('➕ Criando novo registro de permissões...');
      
      const { error: insertError } = await supabaseAdmin
        .from('organization_users')
        .insert({
          user_id: authUser.user.id,
          organization_id: orgData.id,
          role: 'owner',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.log('❌ Erro ao inserir organization_users:', insertError);
        return;
      }

      console.log('✅ Permissões criadas!');
    }

    console.log('\n🎉 CONFIGURAÇÃO COMPLETA!');
    console.log('✅ Usuário criado no Supabase Auth');
    console.log('✅ Permissões de owner configuradas');
    console.log('✅ Pode fazer login em: http://localhost:3000/login');
    console.log('📧 Email: iachelps@gmail.com');
    console.log('🔑 Senha: iache123');

  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

criarUsuarioSupabase();