import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function fetchOrganizationsAndMessages() {
  console.log('🔍 BUSCANDO ORGANIZAÇÕES ATIVAS E MENSAGENS DO DIA');
  console.log('=' .repeat(80));

  // 1. Buscar todas as organizações ativas
  console.log('\n📋 1. BUSCANDO ORGANIZAÇÕES ATIVAS:');
  console.log('-' .repeat(50));

  try {
    const orgResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/organizations?select=id,name,owner_email&limit=100`,
      { headers }
    );

    if (orgResponse.status === 200) {
      const organizations = await orgResponse.json();
      console.log(`✅ Encontradas ${organizations.length} organizações:`);

      if (organizations.length > 0) {
        console.log('\n📊 Lista de Organizações:');
        organizations.forEach((org, index) => {
          console.log(`${index + 1}. ID: ${org.id}`);
          console.log(`   Nome: ${org.name}`);
          console.log(`   Email Admin: ${org.owner_email}`);
          console.log(`   Para API: users/${org.id}/send`);
          console.log('   ---');
        });

        // Buscar usuários de cada organização para obter telefones dos admins
        console.log('\n📞 BUSCANDO TELEFONES DOS ADMINISTRADORES:');
        console.log('-' .repeat(50));

        for (const org of organizations) {
          try {
            const usersResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/organization_users?select=*&organization_id=eq.${org.id}&role=eq.owner`,
              { headers }
            );

            if (usersResponse.status === 200) {
              const users = await usersResponse.json();
              console.log(`\nOrganização: ${org.name} (ID: ${org.id})`);
              console.log(`Usuários admin encontrados: ${users.length}`);

              if (users.length > 0) {
                users.forEach(user => {
                  console.log(`- Email: ${user.email}`);
                  console.log(`- User ID: ${user.user_id || 'Pendente'}`);
                });
              }
            } else {
              console.log(`❌ Erro ao buscar usuários da org ${org.id}: ${usersResponse.status}`);
            }
          } catch (error) {
            console.log(`❌ Erro ao buscar usuários da org ${org.id}:`, error.message);
          }
        }

      } else {
        console.log('⚠️ Nenhuma organização encontrada');
      }
    } else {
      console.log(`❌ Erro ao buscar organizações: ${orgResponse.status}`);
      const errorText = await orgResponse.text();
      console.log('Detalhes do erro:', errorText);
    }
  } catch (error) {
    console.log('❌ Erro ao conectar com Supabase para organizações:', error.message);
  }

  // 2. Buscar mensagens do dia
  console.log('\n📨 2. BUSCANDO MENSAGENS DO DIA:');
  console.log('-' .repeat(50));

  const messageTables = [
    'daily_messages',
    'notifications',
    'admin_messages',
    'system_messages',
    'messages',
    'daily_notifications'
  ];

  for (const tableName of messageTables) {
    console.log(`\nTestando tabela: ${tableName}`);

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=10`,
        { headers }
      );

      if (response.status === 200) {
        const messages = await response.json();
        console.log(`✅ Tabela ${tableName} existe e tem ${messages.length} registros`);

        if (messages.length > 0) {
          console.log('📝 Primeiros registros:');
          messages.slice(0, 3).forEach((msg, index) => {
            console.log(`   ${index + 1}. ${JSON.stringify(msg, null, 2)}`);
          });
        }
      } else if (response.status === 404) {
        console.log(`❌ Tabela ${tableName} não existe`);
      } else {
        console.log(`⚠️ Erro ${response.status} na tabela ${tableName}`);
      }
    } catch (error) {
      console.log(`❌ Erro ao acessar ${tableName}:`, error.message);
    }
  }

  // 3. Verificar se há tabelas de configurações ou settings
  console.log('\n⚙️ 3. BUSCANDO CONFIGURAÇÕES/SETTINGS:');
  console.log('-' .repeat(50));

  const settingsTables = [
    'settings',
    'configurations',
    'app_settings',
    'daily_config',
    'message_config'
  ];

  for (const tableName of settingsTables) {
    console.log(`\nTestando tabela: ${tableName}`);

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=10`,
        { headers }
      );

      if (response.status === 200) {
        const settings = await response.json();
        console.log(`✅ Tabela ${tableName} existe e tem ${settings.length} registros`);

        if (settings.length > 0) {
          console.log('📝 Configurações encontradas:');
          settings.slice(0, 3).forEach((setting, index) => {
            console.log(`   ${index + 1}. ${JSON.stringify(setting, null, 2)}`);
          });
        }
      } else if (response.status === 404) {
        console.log(`❌ Tabela ${tableName} não existe`);
      } else {
        console.log(`⚠️ Erro ${response.status} na tabela ${tableName}`);
      }
    } catch (error) {
      console.log(`❌ Erro ao acessar ${tableName}:`, error.message);
    }
  }

  console.log('\n' + '=' .repeat(80));
  console.log('📋 RESUMO PARA USO NA API:');
  console.log('=' .repeat(80));

  try {
    // Buscar organizações novamente para o resumo
    const orgResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/organizations?select=id,name,owner_email`,
      { headers }
    );

    if (orgResponse.status === 200) {
      const organizations = await orgResponse.json();

      console.log('\n🎯 IDs das organizações para usar na API:');
      organizations.forEach((org, index) => {
        console.log(`${index + 1}. Endpoint: users/${org.id}/send`);
        console.log(`   Organização: ${org.name}`);
        console.log(`   Admin: ${org.owner_email}`);
        console.log('');
      });

      console.log('\n🚀 Comando curl de exemplo:');
      if (organizations.length > 0) {
        const firstOrgId = organizations[0].id;
        console.log(`curl -X POST "https://api.medicosderesultado.com.br/users/${firstOrgId}/send" \\`);
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -d '{"message": "Mensagem do dia aqui"}'`);
      }
    }
  } catch (error) {
    console.log('❌ Erro no resumo:', error.message);
  }

  console.log('\n✅ Busca completa finalizada!');
}

// Executar o script
fetchOrganizationsAndMessages().catch(console.error);