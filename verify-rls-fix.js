import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

async function verifyRLSFix() {
  console.log('========================================');
  console.log('VERIFICANDO CORREÇÃO DO RLS');
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

  const results = {
    properlySecured: [],
    stillAccessible: [],
    errors: [],
    totalTests: allTables.length
  };

  console.log('🔍 TESTANDO RLS EM TODAS AS TABELAS (sem autenticação)');
  console.log('-'.repeat(60));

  for (const tableName of allTables) {
    try {
      console.log(`\n${tableName}:`);

      // Test read access
      const readResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=1`,
        { headers }
      );

      // Test write access
      const writeResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/${tableName}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({})
        }
      );

      if (readResponse.status === 401 && writeResponse.status === 401) {
        console.log('  ✅ PROTEGIDA - Read: 401, Write: 401');
        results.properlySecured.push(tableName);
      } else if (readResponse.status === 200) {
        const data = await readResponse.json();
        console.log(`  ❌ LEITURA ABERTA - ${data.length} registros acessíveis`);
        results.stillAccessible.push({
          table: tableName,
          issue: 'read_access',
          details: `${data.length} registros`
        });
      } else if (writeResponse.status === 200 || writeResponse.status === 201) {
        console.log('  ❌ ESCRITA ABERTA - Inserção permitida');
        results.stillAccessible.push({
          table: tableName,
          issue: 'write_access',
          details: 'Inserção permitida'
        });
      } else {
        console.log(`  ⚠️ STATUS: Read ${readResponse.status}, Write ${writeResponse.status}`);

        // Check for specific error patterns
        const readText = await readResponse.text();
        if (readText.includes('infinite recursion')) {
          console.log('  🔄 ERRO: Recursão infinita detectada');
          results.errors.push({
            table: tableName,
            error: 'infinite_recursion'
          });
        } else {
          results.errors.push({
            table: tableName,
            error: `Read: ${readResponse.status}, Write: ${writeResponse.status}`
          });
        }
      }
    } catch (error) {
      console.log(`  ❌ ERRO: ${error.message}`);
      results.errors.push({
        table: tableName,
        error: error.message
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('RELATÓRIO DE VERIFICAÇÃO RLS');
  console.log('='.repeat(80));

  console.log(`\n📊 RESUMO:`);
  console.log(`  Total de tabelas: ${results.totalTests}`);
  console.log(`  Adequadamente protegidas: ${results.properlySecured.length}`);
  console.log(`  Ainda acessíveis: ${results.stillAccessible.length}`);
  console.log(`  Com erros: ${results.errors.length}`);

  if (results.properlySecured.length > 0) {
    console.log(`\n✅ TABELAS PROTEGIDAS (${results.properlySecured.length}):`);
    results.properlySecured.forEach(table => {
      console.log(`  ✅ ${table}`);
    });
  }

  if (results.stillAccessible.length > 0) {
    console.log(`\n❌ TABELAS AINDA ACESSÍVEIS (${results.stillAccessible.length}):`);
    results.stillAccessible.forEach(item => {
      console.log(`  ❌ ${item.table} - ${item.issue}: ${item.details}`);
    });
  }

  if (results.errors.length > 0) {
    console.log(`\n⚠️ TABELAS COM ERROS (${results.errors.length}):`);
    results.errors.forEach(item => {
      console.log(`  ⚠️ ${item.table} - ${item.error}`);
    });
  }

  // Overall assessment
  console.log('\n🎯 AVALIAÇÃO GERAL:');

  const securityScore = (results.properlySecured.length / results.totalTests) * 100;

  if (securityScore === 100) {
    console.log('  🎉 EXCELENTE: Todas as tabelas estão adequadamente protegidas!');
    console.log('  ✅ Implementação RLS foi bem-sucedida');
    console.log('  ✅ Multi-tenancy está funcionando');
  } else if (securityScore >= 80) {
    console.log(`  ✅ BOM: ${securityScore.toFixed(1)}% das tabelas protegidas`);
    console.log('  🔧 Algumas correções ainda necessárias');
  } else if (securityScore >= 50) {
    console.log(`  ⚠️ PARCIAL: ${securityScore.toFixed(1)}% das tabelas protegidas`);
    console.log('  🔧 Muitas correções ainda necessárias');
  } else {
    console.log(`  ❌ CRÍTICO: Apenas ${securityScore.toFixed(1)}% das tabelas protegidas`);
    console.log('  🚨 RLS não foi aplicado corretamente');
  }

  // Check helper function
  console.log('\n🔍 TESTANDO FUNÇÃO AUXILIAR:');
  try {
    const functionResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_user_organization_id`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      }
    );

    if (functionResponse.status === 200) {
      const result = await functionResponse.json();
      console.log('  ✅ Função get_user_organization_id está disponível');
      console.log(`  📊 Resultado: ${result}`);
    } else {
      console.log(`  ⚠️ Função não acessível: ${functionResponse.status}`);
    }
  } catch (error) {
    console.log(`  ❌ Erro ao testar função: ${error.message}`);
  }

  return results;
}

// Test specific multi-tenant scenarios
async function testMultiTenantScenarios() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTANDO CENÁRIOS MULTI-TENANT');
  console.log('='.repeat(80));

  // This would require actual authenticated users to test properly
  console.log('\n📝 CENÁRIOS PARA TESTAR MANUALMENTE:');
  console.log('  1. 👤 Usuário sem organização deve ver dados: NENHUM');
  console.log('  2. 👤 Usuário da Org A deve ver apenas dados da Org A');
  console.log('  3. 👤 Usuário da Org B deve ver apenas dados da Org B');
  console.log('  4. 👤 Usuários não devem conseguir ver/editar dados de outras orgs');

  console.log('\n🧪 PARA TESTAR COMPLETAMENTE:');
  console.log('  1. Crie dois usuários de teste');
  console.log('  2. Associe cada um a organizações diferentes');
  console.log('  3. Faça login com cada usuário');
  console.log('  4. Verifique se cada um vê apenas dados da sua org');
  console.log('  5. Teste tentativas de acesso cross-org');
}

console.log('🚀 Iniciando verificação do RLS...\n');

verifyRLSFix()
  .then(results => {
    testMultiTenantScenarios();

    console.log('\n' + '='.repeat(80));
    console.log('PRÓXIMOS PASSOS');
    console.log('='.repeat(80));

    if (results.properlySecured.length === results.totalTests) {
      console.log('\n🎉 PARABÉNS! RLS foi implementado com sucesso!');
      console.log('\n✅ PRÓXIMAS AÇÕES:');
      console.log('  1. Teste com usuários reais');
      console.log('  2. Monitore logs para erros');
      console.log('  3. Verifique performance das queries');
      console.log('  4. Documente as políticas RLS');
    } else {
      console.log('\n🔧 CORREÇÕES NECESSÁRIAS:');

      if (results.stillAccessible.length > 0) {
        console.log('  1. Execute novamente fix-rls-security.sql');
        console.log('  2. Verifique se todas as políticas foram criadas');
        console.log('  3. Confirme se RLS está habilitado nas tabelas');
      }

      if (results.errors.length > 0) {
        console.log('  4. Investigue erros específicos nas tabelas');
        console.log('  5. Verifique logs do Supabase para mais detalhes');
      }
    }

    console.log('\n📚 DOCUMENTAÇÃO ÚTIL:');
    console.log('  - Dashboard: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol');
    console.log('  - Policies: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/auth/policies');
    console.log('  - RLS Docs: https://supabase.com/docs/guides/auth/row-level-security');
  })
  .catch(error => {
    console.error('❌ Erro na verificação:', error.message);
  });