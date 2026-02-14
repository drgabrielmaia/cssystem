require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function verificarSchema() {
  console.log('🔍 VERIFICANDO SCHEMA DA TABELA ORGANIZATION_USERS\n');

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Tentar buscar um registro existente para ver a estrutura
    console.log('📋 Buscando registros existentes...');
    const { data, error } = await supabaseAdmin
      .from('organization_users')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Erro:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Estrutura da tabela organization_users:');
      console.log('Colunas encontradas:', Object.keys(data[0]));
      console.log('\nExemplo de registro:', data[0]);
    } else {
      console.log('📋 Tabela vazia, tentando inserir registro simples...');
      
      // Tentar inserir com campos mínimos
      const email = 'iachelps@gmail.com';
      
      // Buscar usuário e organização
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = users.users.find(u => u.email === email);
      
      const { data: orgData } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('owner_email', email)
        .single();

      if (authUser && orgData) {
        console.log('👤 User ID:', authUser.id);
        console.log('🏢 Org ID:', orgData.id);

        const { data: insertData, error: insertError } = await supabaseAdmin
          .from('organization_users')
          .insert({
            user_id: authUser.id,
            organization_id: orgData.id,
            email: email,
            role: 'owner'
          })
          .select();

        if (insertError) {
          console.log('❌ Erro ao inserir:', insertError);
        } else {
          console.log('✅ Registro inserido com sucesso!');
          console.log('Estrutura final:', insertData[0]);
        }
      }
    }

  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

verificarSchema();