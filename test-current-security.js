import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

async function testCurrentSecurity() {
  console.log('========================================');
  console.log('TESTANDO SEGURANÇA ATUAL DO SUPABASE');
  console.log('========================================\n');

  const headers = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  const allTables = [
    'organizations',
    'organization_users',
    'mentorados',
    'formularios_respostas',
    'form_submissions',
    'nps_respostas',
    'modulo_iv_vendas_respostas',
    'modulo_iii_gestao_marketing_respostas',
    'video_modules',
    'video_lessons',
    'lesson_progress',
    'metas',
    'notifications'
  ];

  const securityReport = {
    accessibleTables: [],
    deniedTables: [],
    emptyTables: [],
    errorTables: [],
    tablesWithData: [],
    organizationIdStatus: {}
  };

  console.log('🔍 TESTANDO ACESSO ÀS TABELAS SEM AUTENTICAÇÃO');
  console.log('-'.repeat(60));

  for (const tableName of allTables) {
    try {
      console.log(`\nTestando: ${tableName}`);

      // Test basic read access
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=5`,
        { headers }
      );

      if (response.status === 200) {
        const data = await response.json();
        console.log(`  ✅ ACESSO PERMITIDO - ${data.length} registros`);

        if (data.length > 0) {
          securityReport.tablesWithData.push(tableName);
          const columns = Object.keys(data[0]);
          const hasOrgId = columns.includes('organization_id');

          console.log(`  📋 Colunas: ${columns.join(', ')}`);
          console.log(`  🏢 organization_id: ${hasOrgId ? 'SIM' : 'NÃO'}`);

          securityReport.organizationIdStatus[tableName] = hasOrgId;
        } else {
          securityReport.emptyTables.push(tableName);
          console.log(`  📝 Tabela vazia`);
        }
        securityReport.accessibleTables.push(tableName);
      } else if (response.status === 401) {
        console.log(`  🔒 ACESSO NEGADO (401) - RLS funcionando`);
        securityReport.deniedTables.push(tableName);
      } else if (response.status === 404) {
        console.log(`  ❌ TABELA NÃO ENCONTRADA (404)`);
        securityReport.errorTables.push(tableName);
      } else {
        const responseText = await response.text();
        console.log(`  ⚠️ ERRO ${response.status}: ${responseText.substring(0, 100)}`);

        if (responseText.includes('infinite recursion')) {
          console.log(`  🔄 PROBLEMA: Recursão infinita detectada!`);
        }
        securityReport.errorTables.push(tableName);
      }

      // Test write access
      const writeResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/${tableName}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({})
        }
      );

      if (writeResponse.status === 401) {
        console.log(`  🔒 ESCRITA NEGADA (401) - RLS funcionando`);
      } else if (writeResponse.status === 400 || writeResponse.status === 422) {
        console.log(`  ⚠️ ESCRITA POSSÍVEL (${writeResponse.status}) - Falha de validação apenas`);
      } else {
        console.log(`  ⚠️ ESCRITA: Status ${writeResponse.status}`);
      }

    } catch (error) {
      console.log(`  ❌ ERRO: ${error.message}`);
      securityReport.errorTables.push(tableName);
    }
  }

  // Test specific security scenarios
  console.log('\n' + '='.repeat(80));
  console.log('TESTANDO CENÁRIOS DE SEGURANÇA');
  console.log('='.repeat(80));

  // Test if we can access user information
  try {
    console.log('\n🔍 Testando acesso a informações de usuário...');
    const userResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      { headers }
    );
    console.log(`Status de acesso ao usuário: ${userResponse.status}`);
  } catch (error) {
    console.log(`Erro ao testar acesso de usuário: ${error.message}`);
  }

  // Test if we can get database metadata
  try {
    console.log('\n🔍 Testando acesso a metadados do banco...');
    const metaResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/information_schema.tables?select=table_name&table_schema=eq.public`,
      { headers }
    );

    if (metaResponse.status === 200) {
      const tables = await metaResponse.json();
      console.log(`✅ Conseguimos listar ${tables.length} tabelas do schema`);
    } else {
      console.log(`❌ Não conseguimos acessar metadados: ${metaResponse.status}`);
    }
  } catch (error) {
    console.log(`Erro ao testar metadados: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('RELATÓRIO DE SEGURANÇA');
  console.log('='.repeat(80));

  console.log(`\n📊 RESUMO:`);
  console.log(`  Total de tabelas testadas: ${allTables.length}`);
  console.log(`  Tabelas acessíveis: ${securityReport.accessibleTables.length}`);
  console.log(`  Tabelas protegidas: ${securityReport.deniedTables.length}`);
  console.log(`  Tabelas com erro: ${securityReport.errorTables.length}`);

  console.log(`\n✅ TABELAS ACESSÍVEIS (${securityReport.accessibleTables.length}):`);
  securityReport.accessibleTables.forEach(table => {
    const hasOrgId = securityReport.organizationIdStatus[table] ? '🏢' : '❌';
    const hasData = securityReport.tablesWithData.includes(table) ? '📊' : '📝';
    console.log(`  ${hasData} ${hasOrgId} ${table}`);
  });

  if (securityReport.deniedTables.length > 0) {
    console.log(`\n🔒 TABELAS PROTEGIDAS (${securityReport.deniedTables.length}):`);
    securityReport.deniedTables.forEach(table => {
      console.log(`  ✅ ${table}`);
    });
  }

  if (securityReport.errorTables.length > 0) {
    console.log(`\n⚠️ TABELAS COM ERRO (${securityReport.errorTables.length}):`);
    securityReport.errorTables.forEach(table => {
      console.log(`  ❌ ${table}`);
    });
  }

  console.log('\n🔍 ANÁLISE DE RISCO:');

  if (securityReport.accessibleTables.length === allTables.length) {
    console.log('  🚨 CRÍTICO: Todas as tabelas estão acessíveis sem autenticação!');
    console.log('  🔧 AÇÃO REQUERIDA: Implementar RLS imediatamente');
  } else if (securityReport.accessibleTables.length > securityReport.deniedTables.length) {
    console.log('  ⚠️ ALTO: Muitas tabelas ainda acessíveis');
    console.log('  🔧 AÇÃO REQUERIDA: Revisar e corrigir políticas RLS');
  } else if (securityReport.accessibleTables.length > 0) {
    console.log('  ⚠️ MÉDIO: Algumas tabelas ainda acessíveis');
    console.log('  🔧 AÇÃO REQUERIDA: Verificar se é intencional');
  } else {
    console.log('  ✅ BOM: Todas as tabelas estão protegidas');
  }

  // Check for organization_id implementation
  const tablesWithOrgId = Object.entries(securityReport.organizationIdStatus)
    .filter(([table, hasOrgId]) => hasOrgId)
    .map(([table]) => table);

  const tablesWithoutOrgId = Object.entries(securityReport.organizationIdStatus)
    .filter(([table, hasOrgId]) => !hasOrgId)
    .map(([table]) => table);

  console.log('\n🏢 IMPLEMENTAÇÃO MULTI-TENANT:');
  console.log(`  Tabelas COM organization_id: ${tablesWithOrgId.length}`);
  console.log(`  Tabelas SEM organization_id: ${tablesWithoutOrgId.length}`);

  if (tablesWithoutOrgId.length > 0) {
    console.log('\n❌ TABELAS SEM ORGANIZATION_ID:');
    tablesWithoutOrgId.forEach(table => {
      console.log(`  - ${table}`);
    });
    console.log('\n🔧 ESSAS TABELAS PRECISAM DE:');
    console.log('  1. Adicionar coluna organization_id');
    console.log('  2. Criar políticas RLS baseadas em organização');
  }

  return securityReport;
}

console.log('🚀 Iniciando teste de segurança...\n');

testCurrentSecurity()
  .then(report => {
    console.log('\n' + '='.repeat(80));
    console.log('PRÓXIMOS PASSOS');
    console.log('='.repeat(80));

    console.log('\n1. 📋 PARA APLICAR AS CORREÇÕES:');
    console.log('   - Acesse: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/sql');
    console.log('   - Copie e cole o conteúdo do arquivo: fix-rls-security.sql');
    console.log('   - Execute o script completo');

    console.log('\n2. 🔍 PARA VERIFICAR:');
    console.log('   - Policies: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/auth/policies');
    console.log('   - Tables: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/editor');

    console.log('\n3. ✅ CRITÉRIOS DE SUCESSO:');
    console.log('   - Todas as tabelas devem retornar 401 (não autenticado)');
    console.log('   - Usuários autenticados devem ver apenas dados da sua organização');
    console.log('   - Não deve haver recursão infinita nas políticas');

    console.log('\n✨ Teste de segurança concluído!');
  })
  .catch(error => {
    console.error('❌ Erro no teste de segurança:', error.message);
  });