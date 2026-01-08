const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testMultiTenantSystem() {
  log('\n════════════════════════════════════════════════════════════', 'bright');
  log('           TESTE DO SISTEMA MULTI-TENANT', 'cyan');
  log('════════════════════════════════════════════════════════════\n', 'bright');

  // 1. CRIAR USUÁRIOS DE TESTE
  log('👥 1. CRIANDO USUÁRIOS DE TESTE', 'blue');
  log('─'.repeat(50));

  const testUsers = [
    {
      email: 'owner1@teste.com',
      password: 'Teste123!',
      role: 'owner',
      orgName: 'Empresa Teste 1'
    },
    {
      email: 'manager1@teste.com',
      password: 'Teste123!',
      role: 'manager',
      belongsTo: 'owner1@teste.com'
    },
    {
      email: 'viewer1@teste.com',
      password: 'Teste123!',
      role: 'viewer',
      belongsTo: 'owner1@teste.com'
    },
    {
      email: 'owner2@teste.com',
      password: 'Teste123!',
      role: 'owner',
      orgName: 'Empresa Teste 2'
    }
  ];

  const createdUsers = [];

  for (const user of testUsers) {
    try {
      if (user.role === 'owner') {
        // Criar usuário owner (cria organização automaticamente via trigger)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: user.email,
          password: user.password,
          options: {
            data: {
              company_name: user.orgName
            }
          }
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            log(`  ⚠️  ${user.email} já existe`, 'yellow');

            // Tentar fazer login
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: user.email,
              password: user.password
            });

            if (!signInError) {
              createdUsers.push({
                ...user,
                userId: signInData.user.id,
                existing: true
              });
              log(`     ✓ Login realizado com sucesso`, 'green');
            } else {
              log(`     ❌ Erro no login: ${signInError.message}`, 'red');
            }
          } else {
            log(`  ❌ Erro ao criar ${user.email}: ${authError.message}`, 'red');
          }
        } else {
          log(`  ✅ Owner criado: ${user.email}`, 'green');
          log(`     Organização "${user.orgName}" criada automaticamente`, 'cyan');
          createdUsers.push({
            ...user,
            userId: authData.user?.id
          });
        }
      } else {
        // Para outros roles, precisamos adicionar via organization_users
        log(`  ℹ️  ${user.email} (${user.role}) - será adicionado à organização`, 'cyan');

        // Primeiro, obter a organização do owner
        const ownerOrg = createdUsers.find(u => u.email === user.belongsTo);

        if (ownerOrg) {
          // Buscar organization_id do owner
          const { data: orgData } = await supabase
            .from('organizations')
            .select('id')
            .eq('owner_email', user.belongsTo)
            .single();

          if (orgData) {
            // Adicionar usuário à organização
            const { error: addError } = await supabase
              .from('organization_users')
              .insert({
                organization_id: orgData.id,
                email: user.email,
                role: user.role,
                user_id: null // Será preenchido quando o usuário fizer login
              });

            if (!addError) {
              log(`     ✓ Pré-cadastrado na organização`, 'green');
            } else if (addError.message.includes('duplicate')) {
              log(`     ⚠️  Já cadastrado na organização`, 'yellow');
            } else {
              log(`     ❌ Erro: ${addError.message}`, 'red');
            }
          }
        }
      }

      // Fazer logout para próximo teste
      await supabase.auth.signOut();

    } catch (err) {
      log(`  ❌ Erro: ${err.message}`, 'red');
    }
  }

  // 2. TESTAR ISOLAMENTO DE DADOS
  log('\n🔒 2. TESTANDO ISOLAMENTO DE DADOS', 'blue');
  log('─'.repeat(50));

  // Fazer login como owner1
  const { data: owner1Auth, error: owner1Error } = await supabase.auth.signInWithPassword({
    email: 'owner1@teste.com',
    password: 'Teste123!'
  });

  if (!owner1Error && owner1Auth.user) {
    log(`  ✅ Logado como owner1@teste.com`, 'green');

    // Criar dados de teste para owner1
    const { data: lead1, error: leadError1 } = await supabase
      .from('leads')
      .insert({
        name: 'Lead da Empresa 1',
        phone: '11999999999',
        organization_id: await getOrgId(owner1Auth.user.id)
      })
      .select()
      .single();

    if (!leadError1) {
      log(`     ✓ Lead criado para Empresa 1`, 'green');
    } else {
      log(`     ❌ Erro ao criar lead: ${leadError1.message}`, 'red');
    }

    // Verificar quantos leads consegue ver
    const { data: visibleLeads1, error: leadsError1 } = await supabase
      .from('leads')
      .select('*');

    log(`     📊 Leads visíveis: ${visibleLeads1?.length || 0}`, 'cyan');

    await supabase.auth.signOut();
  }

  // Fazer login como owner2
  const { data: owner2Auth, error: owner2Error } = await supabase.auth.signInWithPassword({
    email: 'owner2@teste.com',
    password: 'Teste123!'
  });

  if (!owner2Error && owner2Auth.user) {
    log(`\n  ✅ Logado como owner2@teste.com`, 'green');

    // Criar dados de teste para owner2
    const { data: lead2, error: leadError2 } = await supabase
      .from('leads')
      .insert({
        name: 'Lead da Empresa 2',
        phone: '11888888888',
        organization_id: await getOrgId(owner2Auth.user.id)
      })
      .select()
      .single();

    if (!leadError2) {
      log(`     ✓ Lead criado para Empresa 2`, 'green');
    } else {
      log(`     ❌ Erro ao criar lead: ${leadError2.message}`, 'red');
    }

    // Verificar quantos leads consegue ver
    const { data: visibleLeads2, error: leadsError2 } = await supabase
      .from('leads')
      .select('*');

    log(`     📊 Leads visíveis: ${visibleLeads2?.length || 0}`, 'cyan');

    // Tentar ver lead da outra organização (não deveria conseguir se RLS estiver ativo)
    if (visibleLeads2 && visibleLeads2.length > 0) {
      const hasOtherOrgData = visibleLeads2.some(l => l.name === 'Lead da Empresa 1');
      if (hasOtherOrgData) {
        log(`     ⚠️  ALERTA: Consegue ver dados de outra organização!`, 'red');
        log(`        RLS provavelmente não está ativo`, 'red');
      } else {
        log(`     ✅ Não consegue ver dados de outra organização`, 'green');
      }
    }

    await supabase.auth.signOut();
  }

  // 3. TESTAR FUNÇÕES ADMINISTRATIVAS
  log('\n⚙️  3. TESTANDO FUNÇÕES ADMINISTRATIVAS', 'blue');
  log('─'.repeat(50));

  // Fazer login como owner1 novamente
  await supabase.auth.signInWithPassword({
    email: 'owner1@teste.com',
    password: 'Teste123!'
  });

  // Tentar criar usuário para organização
  try {
    const { data: newUser, error: newUserError } = await supabase
      .rpc('create_user_for_organization', {
        p_email: 'novo.colaborador@teste.com',
        p_password: 'Senha123!',
        p_role: 'viewer',
        p_full_name: 'Novo Colaborador'
      });

    if (!newUserError) {
      log(`  ✅ Função create_user_for_organization funcionando`, 'green');
      if (newUser?.success) {
        log(`     ✓ ${newUser.message}`, 'green');
      }
    } else {
      if (newUserError.message.includes('does not exist')) {
        log(`  ⚠️  Função create_user_for_organization não existe`, 'yellow');
        log(`     Execute o script SQL para criar as funções`, 'yellow');
      } else {
        log(`  ❌ Erro: ${newUserError.message}`, 'red');
      }
    }
  } catch (err) {
    log(`  ❌ Erro ao testar função: ${err.message}`, 'red');
  }

  // Tentar obter estatísticas da organização
  try {
    const { data: stats, error: statsError } = await supabase
      .rpc('get_organization_stats');

    if (!statsError && stats) {
      log(`  ✅ Função get_organization_stats funcionando`, 'green');
      log(`     📊 Estatísticas:`, 'cyan');
      log(`        • Total de usuários: ${stats.total_users || 0}`);
      log(`        • Total de leads: ${stats.total_leads || 0}`);
      log(`        • Total de mentorados: ${stats.total_mentorados || 0}`);
    } else if (statsError?.message.includes('does not exist')) {
      log(`  ⚠️  Função get_organization_stats não existe`, 'yellow');
    } else {
      log(`  ❌ Erro: ${statsError?.message}`, 'red');
    }
  } catch (err) {
    log(`  ❌ Erro ao testar função: ${err.message}`, 'red');
  }

  await supabase.auth.signOut();

  // 4. RESUMO DOS TESTES
  log('\n📊 4. RESUMO DOS TESTES', 'blue');
  log('═'.repeat(50));

  log('\n  ✅ Testes Realizados:', 'green');
  log('     • Criação de usuários com diferentes roles');
  log('     • Criação automática de organizações');
  log('     • Inserção de dados em diferentes organizações');
  log('     • Verificação de isolamento de dados');
  log('     • Teste de funções administrativas');

  log('\n  ⚠️  Próximos Passos:', 'yellow');
  log('     1. Execute o script SQL completo no Supabase Dashboard');
  log('     2. Ative RLS em todas as tabelas');
  log('     3. Crie os triggers para automação');
  log('     4. Execute este teste novamente para validar');

  log('\n' + '═'.repeat(50) + '\n', 'bright');
}

// Função auxiliar para obter organization_id
async function getOrgId(userId) {
  const { data } = await supabase
    .from('organization_users')
    .select('organization_id')
    .eq('user_id', userId)
    .single();

  if (data) return data.organization_id;

  // Se não encontrar em organization_users, buscar direto em organizations
  const { data: orgData } = await supabase
    .from('organizations')
    .select('id')
    .limit(1)
    .single();

  return orgData?.id;
}

// Executar testes
if (require.main === module) {
  testMultiTenantSystem().catch(console.error);
}

module.exports = { testMultiTenantSystem };