const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configure as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseTables() {
  console.log('🔍 Verificando tabelas disponíveis no Supabase...\n');

  try {
    // 1. Buscar informações do schema usando rpc
    console.log('1️⃣ BUSCANDO INFORMAÇÕES DAS TABELAS:');
    console.log('=' .repeat(50));

    // Tentar listar tabelas disponíveis através de queries em tabelas conhecidas
    const tablesToCheck = [
      'users',
      'usuarios',
      'auth.users',
      'profiles',
      'organizations',
      'organization_users',
      'mentees',
      'mentors',
      'comissoes',
      'messages',
      'consultas',
      'patients',
      'follow_ups',
      'goals',
      'goal_responses',
      'mentee_goals',
      'portals',
      'finances',
      'finance_categories',
      'finance_payment_methods'
    ];

    console.log('Verificando tabelas conhecidas:\n');

    for (const table of tablesToCheck) {
      try {
        // Tentar fazer um select limitado para verificar se a tabela existe
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          console.log(`✅ ${table} - EXISTE`);
        } else if (error.code === 'PGRST205') {
          // Tabela não encontrada
          console.log(`❌ ${table} - NÃO EXISTE`);
        } else if (error.code === '42P17') {
          // Erro de recursão infinita em RLS
          console.log(`⚠️  ${table} - EXISTE mas tem erro de RLS: ${error.message}`);
        } else if (error.code === 'PGRST301') {
          // Sem permissão
          console.log(`🔒 ${table} - Sem permissão para acessar`);
        } else {
          // Outro erro
          console.log(`⁉️  ${table} - Erro: ${error.code} - ${error.message}`);
        }
      } catch (e) {
        console.log(`💥 ${table} - Erro ao verificar: ${e.message}`);
      }
    }

    // 2. Tentar buscar usuários de diferentes formas
    console.log('\n2️⃣ TENTANDO ACESSAR DADOS DE USUÁRIOS:');
    console.log('=' .repeat(50));

    // Tentar tabela usuarios
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*')
      .limit(5);

    if (!usuariosError && usuarios) {
      console.log(`\n✅ Tabela 'usuarios' acessível. Total de registros: ${usuarios.length}`);
      if (usuarios.length > 0) {
        console.log('\nPrimeiros usuários:');
        usuarios.forEach((user, index) => {
          console.log(`${index + 1}. Email: ${user.email || user.usuario || 'N/A'} | Nome: ${user.nome || user.full_name || 'N/A'}`);
        });
      }
    } else {
      console.log(`❌ Não foi possível acessar 'usuarios': ${usuariosError?.message}`);
    }

    // 3. Verificar estrutura de tabelas acessíveis
    console.log('\n3️⃣ VERIFICANDO ESTRUTURA DAS TABELAS ACESSÍVEIS:');
    console.log('=' .repeat(50));

    // Tentar acessar comissoes já que sabemos que existe
    const { data: comissoes, error: comissoesError } = await supabase
      .from('comissoes')
      .select('*')
      .limit(1);

    if (!comissoesError && comissoes) {
      console.log('\n✅ Estrutura da tabela comissoes:');
      if (comissoes.length > 0) {
        console.log('Colunas disponíveis:', Object.keys(comissoes[0]).join(', '));
      }
    }

    // Tentar acessar finances
    const { data: finances, error: financesError } = await supabase
      .from('finances')
      .select('*')
      .limit(1);

    if (!financesError && finances) {
      console.log('\n✅ Estrutura da tabela finances:');
      if (finances.length > 0) {
        console.log('Colunas disponíveis:', Object.keys(finances[0]).join(', '));
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar verificação
checkDatabaseTables();