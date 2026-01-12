import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const knownTables = [
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

async function analyzeTableSchemas() {
  console.log('========================================');
  console.log('ANÁLISE DE SCHEMAS DAS TABELAS');
  console.log('========================================\n');

  const headers = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  const tablesWithOrgId = [];
  const tablesWithoutOrgId = [];
  const failedTables = [];

  for (const tableName of knownTables) {
    console.log(`\n📊 Analisando tabela: ${tableName}`);

    try {
      // Tentar obter dados para identificar colunas
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=1`,
        { headers }
      );

      if (response.status === 200) {
        const data = await response.json();

        if (data.length > 0) {
          const columns = Object.keys(data[0]);
          console.log(`  ✅ Colunas encontradas: ${columns.join(', ')}`);

          if (columns.includes('organization_id')) {
            console.log(`  🏢 TEM organization_id`);
            tablesWithOrgId.push(tableName);
          } else {
            console.log(`  ❌ SEM organization_id`);
            tablesWithoutOrgId.push(tableName);
          }
        } else {
          // Tabela vazia - vamos tentar uma consulta de schema direta
          console.log(`  📝 Tabela vazia - tentando obter schema...`);

          // Tentar inserir um registro vazio para ver quais campos são obrigatórios
          const insertResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/${tableName}`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({})
            }
          );

          const insertResult = await insertResponse.text();
          console.log(`  💡 Resultado da tentativa de inserção: ${insertResult.substring(0, 200)}...`);

          // Analisar se menciona organization_id no erro
          if (insertResult.includes('organization_id')) {
            console.log(`  🏢 TEM organization_id (detectado no erro)`);
            tablesWithOrgId.push(tableName);
          } else {
            console.log(`  ❓ Não foi possível determinar se tem organization_id`);
            tablesWithoutOrgId.push(tableName);
          }
        }
      } else {
        console.log(`  ❌ Erro ao acessar: ${response.status}`);
        failedTables.push(tableName);
      }
    } catch (error) {
      console.log(`  ❌ Erro: ${error.message}`);
      failedTables.push(tableName);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('RESUMO DA ANÁLISE');
  console.log('='.repeat(80));

  console.log(`\n🏢 TABELAS COM organization_id (${tablesWithOrgId.length}):`);
  tablesWithOrgId.forEach(table => console.log(`  - ${table}`));

  console.log(`\n❌ TABELAS SEM organization_id (${tablesWithoutOrgId.length}):`);
  tablesWithoutOrgId.forEach(table => console.log(`  - ${table}`));

  if (failedTables.length > 0) {
    console.log(`\n⚠️ TABELAS COM FALHA NA ANÁLISE (${failedTables.length}):`);
    failedTables.forEach(table => console.log(`  - ${table}`));
  }

  return {
    tablesWithOrgId,
    tablesWithoutOrgId,
    failedTables
  };
}

analyzeTableSchemas()
  .then(result => {
    console.log('\n✅ Análise concluída!');
    console.log('\nResultado:', JSON.stringify(result, null, 2));
  })
  .catch(console.error);