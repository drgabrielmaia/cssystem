const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configure as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeSupabaseStructure() {
  console.log('🔍 ANÁLISE COMPLETA DO BANCO DE DADOS SUPABASE');
  console.log('=' .repeat(60));
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Data: ${new Date().toLocaleString('pt-BR')}\n`);

  const report = {
    tablesFound: [],
    tablesNotFound: [],
    tablesWithRLSError: [],
    tablesWithOtherErrors: [],
    usersFound: [],
    organizationStatus: null
  };

  // Lista expandida de tabelas possíveis baseada no contexto do projeto
  const tablesToCheck = [
    // Tabelas de usuários possíveis
    'auth.users',
    'public.users',
    'public.profiles',
    'public.usuarios',

    // Tabelas de organização
    'public.organizations',
    'public.organization_users',
    'public.teams',
    'public.team_members',

    // Tabelas do sistema médico/mentoria
    'public.patients',
    'public.mentees',
    'public.mentors',
    'public.consultas',
    'public.consultations',
    'public.messages',
    'public.follow_ups',
    'public.followups',

    // Tabelas de metas
    'public.goals',
    'public.goal_responses',
    'public.mentee_goals',

    // Tabelas financeiras
    'public.finances',
    'public.finance_categories',
    'public.finance_payment_methods',
    'public.comissoes',
    'public.commissions',

    // Tabelas de portal
    'public.portals',
    'public.portal_access',

    // Outras tabelas possíveis
    'public.settings',
    'public.configurations',
    'public.roles',
    'public.permissions'
  ];

  console.log('1️⃣ VERIFICANDO EXISTÊNCIA DAS TABELAS:\n');

  for (const table of tablesToCheck) {
    process.stdout.write(`Verificando ${table}... `);

    try {
      const { data, error, count } = await supabase
        .from(table.replace('public.', '').replace('auth.', ''))
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`✅ EXISTE (${count || 0} registros)`);
        report.tablesFound.push({ table, count: count || 0 });
      } else if (error.code === 'PGRST205' || error.code === '42P01') {
        console.log('❌ NÃO EXISTE');
        report.tablesNotFound.push(table);
      } else if (error.code === '42P17') {
        console.log('⚠️ EXISTE mas com erro de RLS');
        report.tablesWithRLSError.push({ table, error: error.message });
      } else {
        console.log(`⁉️ Erro: ${error.code}`);
        report.tablesWithOtherErrors.push({ table, error: error.message, code: error.code });
      }
    } catch (e) {
      console.log(`💥 Exceção: ${e.message}`);
    }

    // Pequeno delay para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 2. Tentar acessar dados de usuários de tabelas encontradas
  console.log('\n2️⃣ BUSCANDO DADOS DE USUÁRIOS:\n');

  const userTables = report.tablesFound.filter(t =>
    t.table.includes('user') ||
    t.table.includes('profile') ||
    t.table.includes('usuario')
  );

  for (const { table, count } of userTables) {
    if (count > 0) {
      console.log(`\nTentando acessar dados de ${table}:`);
      try {
        const tableName = table.replace('public.', '').replace('auth.', '');
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(5);

        if (!error && data) {
          console.log(`✅ ${data.length} registros acessados`);
          if (data.length > 0) {
            // Mostrar estrutura da primeira entrada
            console.log('Estrutura dos campos:', Object.keys(data[0]).join(', '));

            // Procurar por emails específicos
            const emailField = Object.keys(data[0]).find(k => k.includes('email') || k.includes('mail'));
            if (emailField) {
              data.forEach(user => {
                const email = user[emailField];
                if (email) {
                  report.usersFound.push({
                    table,
                    id: user.id,
                    email,
                    name: user.full_name || user.name || user.nome || 'N/A'
                  });
                }
              });
            }
          }
        } else if (error) {
          console.log(`❌ Erro ao acessar dados: ${error.message}`);
        }
      } catch (e) {
        console.log(`💥 Exceção ao acessar dados: ${e.message}`);
      }
    }
  }

  // 3. Verificar status específico de organizations
  console.log('\n3️⃣ STATUS DAS ORGANIZAÇÕES:\n');

  const orgTable = report.tablesFound.find(t => t.table.includes('organization'));
  const orgUsersTable = report.tablesWithRLSError.find(t => t.table.includes('organization_users'));

  if (orgTable) {
    console.log('✅ Tabela organizations EXISTE');
    report.organizationStatus = 'exists';
  } else if (report.tablesNotFound.includes('public.organizations')) {
    console.log('❌ Tabela organizations NÃO EXISTE - precisa ser criada');
    report.organizationStatus = 'not_exists';
  }

  if (orgUsersTable) {
    console.log('⚠️ Tabela organization_users EXISTE mas tem problema de RLS recursivo');
    console.log('   Isso precisa ser corrigido removendo ou ajustando as políticas RLS');
  }

  // 4. Resumo final
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESUMO FINAL:\n');

  console.log('TABELAS ENCONTRADAS:', report.tablesFound.length);
  report.tablesFound.forEach(t => {
    console.log(`  ✅ ${t.table} (${t.count} registros)`);
  });

  console.log('\nTABELAS COM ERRO DE RLS:', report.tablesWithRLSError.length);
  report.tablesWithRLSError.forEach(t => {
    console.log(`  ⚠️ ${t.table}`);
  });

  console.log('\nTABELAS NÃO ENCONTRADAS:', report.tablesNotFound.length);
  if (report.tablesNotFound.length > 0 && report.tablesNotFound.length <= 10) {
    report.tablesNotFound.forEach(t => {
      console.log(`  ❌ ${t}`);
    });
  }

  console.log('\nUSUÁRIOS ENCONTRADOS:', report.usersFound.length);
  report.usersFound.forEach(u => {
    console.log(`  👤 ${u.email} (${u.name}) - Tabela: ${u.table}`);
  });

  // 5. Recomendações
  console.log('\n' + '=' .repeat(60));
  console.log('🔧 RECOMENDAÇÕES:\n');

  if (report.organizationStatus === 'not_exists') {
    console.log('1. CRIAR tabela organizations e organization_users');
    console.log('2. Configurar políticas RLS apropriadas');
    console.log('3. Popular com dados iniciais');
  }

  if (report.tablesWithRLSError.length > 0) {
    console.log('1. CORRIGIR políticas RLS recursivas em:');
    report.tablesWithRLSError.forEach(t => {
      console.log(`   - ${t.table}`);
    });
  }

  if (report.usersFound.length === 0) {
    console.log('1. VERIFICAR se existem usuários no sistema');
    console.log('2. Criar usuários de teste se necessário');
  }

  return report;
}

// Executar análise
analyzeSupabaseStructure()
  .then(report => {
    console.log('\n✅ Análise concluída');
  })
  .catch(error => {
    console.error('\n❌ Erro na análise:', error);
  });