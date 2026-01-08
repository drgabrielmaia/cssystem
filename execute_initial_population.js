const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configure as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeInitialPopulation() {
  console.log('🚀 INICIANDO POPULAÇÃO DO BANCO DE DADOS');
  console.log('=' .repeat(60));
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Data: ${new Date().toLocaleString('pt-BR')}\n`);

  try {
    // 1. Criar usuários diretamente (simulando criação via auth)
    console.log('1️⃣ CRIANDO USUÁRIOS...\n');

    // Nota: Como não temos service_role_key, vamos criar os registros nas tabelas públicas
    // Em produção, os usuários seriam criados via auth.signUp()

    // Criar profiles e users
    const usersData = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'admin@admin.com',
        full_name: 'Administrador',
        role: 'admin'
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'kellybsantoss@icloud.com',
        full_name: 'Kelly Santos',
        role: 'admin'
      }
    ];

    // Inserir em profiles
    for (const userData of usersData) {
      console.log(`Criando profile para ${userData.email}...`);
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.log(`  ⚠️ Erro ao criar profile: ${profileError.message}`);
      } else {
        console.log(`  ✅ Profile criado/atualizado`);
      }

      // Inserir em users
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (userError) {
        console.log(`  ⚠️ Erro ao criar user: ${userError.message}`);
      } else {
        console.log(`  ✅ User criado/atualizado`);
      }
    }

    // 2. Criar organizações
    console.log('\n2️⃣ CRIANDO ORGANIZAÇÕES...\n');

    const orgsData = [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Administração Geral',
        slug: 'admin-geral',
        description: 'Organização principal do sistema',
        created_by: '11111111-1111-1111-1111-111111111111'
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        name: 'Kelly Santos Org',
        slug: 'kelly-santos-org',
        description: 'Organização da Kelly Santos',
        created_by: '22222222-2222-2222-2222-222222222222'
      }
    ];

    for (const orgData of orgsData) {
      console.log(`Criando organização ${orgData.name}...`);
      const { error } = await supabase
        .from('organizations')
        .upsert({
          ...orgData,
          settings: {},
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.log(`  ⚠️ Erro: ${error.message}`);

        // Se a tabela não existir, tentar criar
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('  📝 Tabela organizations não existe. Precisa ser criada via SQL Editor do Supabase.');
        }
      } else {
        console.log(`  ✅ Organização criada/atualizada`);
      }
    }

    // 3. Vincular usuários às organizações
    console.log('\n3️⃣ VINCULANDO USUÁRIOS ÀS ORGANIZAÇÕES...\n');

    const orgUsersData = [
      {
        organization_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        user_id: '11111111-1111-1111-1111-111111111111',
        role: 'owner'
      },
      {
        organization_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        user_id: '22222222-2222-2222-2222-222222222222',
        role: 'owner'
      },
      {
        organization_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        user_id: '22222222-2222-2222-2222-222222222222',
        role: 'admin',
        invited_by: '11111111-1111-1111-1111-111111111111'
      }
    ];

    for (const linkData of orgUsersData) {
      console.log(`Vinculando usuário ${linkData.user_id} à organização...`);
      const { error } = await supabase
        .from('organization_users')
        .upsert({
          ...linkData,
          is_active: true,
          permissions: {},
          joined_at: new Date().toISOString()
        }, {
          onConflict: 'organization_id,user_id'
        });

      if (error) {
        console.log(`  ⚠️ Erro: ${error.message}`);

        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('  📝 Tabela organization_users não existe. Precisa ser criada via SQL Editor do Supabase.');
        }
      } else {
        console.log(`  ✅ Vínculo criado/atualizado`);
      }
    }

    // 4. Criar categorias financeiras
    console.log('\n4️⃣ CRIANDO CATEGORIAS FINANCEIRAS...\n');

    const categories = [
      { name: 'Vendas', type: 'income' },
      { name: 'Serviços', type: 'income' },
      { name: 'Outros Recebimentos', type: 'income' },
      { name: 'Aluguel', type: 'expense' },
      { name: 'Folha de Pagamento', type: 'expense' },
      { name: 'Material de Escritório', type: 'expense' },
      { name: 'Marketing', type: 'expense' },
      { name: 'Outras Despesas', type: 'expense' }
    ];

    for (const category of categories) {
      const { error } = await supabase
        .from('finance_categories')
        .insert({
          name: category.name,
          type: category.type,
          created_at: new Date().toISOString()
        });

      if (error && !error.message.includes('duplicate')) {
        console.log(`  ⚠️ Erro ao criar categoria ${category.name}: ${error.message}`);
      } else {
        console.log(`  ✅ Categoria ${category.name} criada`);
      }
    }

    // 5. Criar métodos de pagamento
    console.log('\n5️⃣ CRIANDO MÉTODOS DE PAGAMENTO...\n');

    const paymentMethods = [
      'Dinheiro',
      'Cartão de Crédito',
      'Cartão de Débito',
      'PIX',
      'Boleto',
      'Transferência Bancária'
    ];

    for (const method of paymentMethods) {
      const { error } = await supabase
        .from('finance_payment_methods')
        .insert({
          name: method,
          created_at: new Date().toISOString()
        });

      if (error && !error.message.includes('duplicate')) {
        console.log(`  ⚠️ Erro ao criar método ${method}: ${error.message}`);
      } else {
        console.log(`  ✅ Método ${method} criado`);
      }
    }

    // 6. Verificação final
    console.log('\n6️⃣ VERIFICAÇÃO FINAL...\n');

    // Verificar usuários
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');

    console.log(`Usuários criados: ${users?.length || 0}`);
    if (users && users.length > 0) {
      users.forEach(u => {
        console.log(`  - ${u.email} (${u.full_name})`);
      });
    }

    // Verificar organizações
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*');

    if (!orgsError) {
      console.log(`\nOrganizações criadas: ${orgs?.length || 0}`);
      if (orgs && orgs.length > 0) {
        orgs.forEach(o => {
          console.log(`  - ${o.name} (${o.slug})`);
        });
      }
    }

    // Verificar vínculos
    const { data: links, error: linksError } = await supabase
      .from('organization_users')
      .select('*');

    if (!linksError) {
      console.log(`\nVínculos usuário-organização: ${links?.length || 0}`);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✅ POPULAÇÃO INICIAL CONCLUÍDA!');
    console.log('\n📝 NOTAS IMPORTANTES:');
    console.log('1. Se as tabelas organizations e organization_users não existirem,');
    console.log('   execute o arquivo populate_initial_data.sql no SQL Editor do Supabase');
    console.log('2. Os usuários foram criados apenas nas tabelas públicas.');
    console.log('   Para autenticação real, crie-os via Dashboard do Supabase.');
    console.log('3. Senhas sugeridas: admin123 e kelly123 (alterar no primeiro acesso)');

  } catch (error) {
    console.error('❌ Erro durante execução:', error);
  }
}

// Executar população
executeInitialPopulation();