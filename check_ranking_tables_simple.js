import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
};

// Tabelas específicas do sistema de ranking
const targetTables = [
  'comissoes',
  'comissoes_configuracoes',
  'leads'
];

// Tabelas conhecidas para contexto
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

// Views específicas do sistema de ranking
const targetViews = [
  'view_dashboard_comissoes_mentorado'
];

async function checkTableExists(tableName) {
  try {
    console.log(`\n🔍 Verificando: ${tableName}`);

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=1`,
      { headers }
    );

    if (response.status === 200) {
      const data = await response.json();
      console.log(`  ✅ EXISTE - ${data.length} registros na amostra`);

      if (data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log(`  📋 Colunas: ${columns.join(', ')}`);

        // Verificar campos específicos para tabelas de ranking
        if (tableName === 'leads') {
          const hasMenutoradoIndicador = columns.includes('mentorado_indicador_id');
          const hasDataVenda = columns.includes('data_venda');
          console.log(`  🎯 mentorado_indicador_id: ${hasMenutoradoIndicador ? '✅ SIM' : '❌ NÃO'}`);
          console.log(`  🎯 data_venda: ${hasDataVenda ? '✅ SIM' : '❌ NÃO'}`);

          return {
            exists: true,
            columns,
            hasRequiredFields: hasMenutoradoIndicador && hasDataVenda,
            missingFields: [
              ...(!hasMenutoradoIndicador ? ['mentorado_indicador_id'] : []),
              ...(!hasDataVenda ? ['data_venda'] : [])
            ]
          };
        }

        return { exists: true, columns };
      } else {
        console.log(`  📝 Existe mas está vazia`);
        return { exists: true, isEmpty: true };
      }

    } else if (response.status === 401) {
      console.log(`  🔒 EXISTE mas protegida por RLS (401)`);
      return { exists: true, protected: true };

    } else if (response.status === 404) {
      console.log(`  ❌ NÃO EXISTE (404)`);
      return { exists: false };

    } else {
      const responseText = await response.text();
      console.log(`  ⚠️ Status ${response.status}: ${responseText.substring(0, 100)}`);
      return { exists: false, error: `Status ${response.status}` };
    }

  } catch (error) {
    console.log(`  ❌ Erro: ${error.message}`);
    return { exists: false, error: error.message };
  }
}

async function checkViewExists(viewName) {
  try {
    console.log(`\n👁️ Verificando view: ${viewName}`);

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${viewName}?select=*&limit=1`,
      { headers }
    );

    if (response.status === 200) {
      const data = await response.json();
      console.log(`  ✅ VIEW EXISTE - ${data.length} registros na amostra`);

      if (data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log(`  📋 Colunas: ${columns.join(', ')}`);
      }

      return { exists: true };

    } else if (response.status === 401) {
      console.log(`  🔒 VIEW EXISTE mas protegida por RLS (401)`);
      return { exists: true, protected: true };

    } else if (response.status === 404) {
      console.log(`  ❌ VIEW NÃO EXISTE (404)`);
      return { exists: false };

    } else {
      console.log(`  ⚠️ Status ${response.status}`);
      return { exists: false, error: `Status ${response.status}` };
    }

  } catch (error) {
    console.log(`  ❌ Erro: ${error.message}`);
    return { exists: false, error: error.message };
  }
}

async function listAllTables() {
  try {
    console.log('\n📋 Tentando listar todas as tabelas...');

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/information_schema.tables?select=table_name&table_schema=eq.public&table_type=eq.BASE%20TABLE`,
      { headers }
    );

    if (response.status === 200) {
      const tables = await response.json();
      console.log(`✅ Encontradas ${tables.length} tabelas:`);
      tables.forEach((table, index) => {
        console.log(`  ${index + 1}. ${table.table_name}`);
      });
      return tables.map(t => t.table_name);
    } else {
      console.log(`❌ Não foi possível listar tabelas: ${response.status}`);
      return [];
    }
  } catch (error) {
    console.log(`❌ Erro ao listar tabelas: ${error.message}`);
    return [];
  }
}

async function analyzeRankingSystem() {
  console.log('🎯 ANÁLISE DO SISTEMA DE RANKING');
  console.log('=' .repeat(60));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log('=' .repeat(60));

  const report = {
    timestamp: new Date().toISOString(),
    ranking: {
      tables: {},
      views: {}
    },
    context: {
      knownTables: {},
      allTables: []
    }
  };

  // 1. Verificar tabelas específicas do ranking
  console.log('\n🎯 1. VERIFICANDO TABELAS DO SISTEMA DE RANKING...');
  for (const tableName of targetTables) {
    report.ranking.tables[tableName] = await checkTableExists(tableName);
  }

  // 2. Verificar views do ranking
  console.log('\n👁️ 2. VERIFICANDO VIEWS DO SISTEMA DE RANKING...');
  for (const viewName of targetViews) {
    report.ranking.views[viewName] = await checkViewExists(viewName);
  }

  // 3. Verificar algumas tabelas conhecidas para contexto
  console.log('\n📊 3. VERIFICANDO TABELAS CONHECIDAS (CONTEXTO)...');
  const contextTables = ['mentorados', 'organizations', 'form_submissions'];
  for (const tableName of contextTables) {
    report.context.knownTables[tableName] = await checkTableExists(tableName);
  }

  // 4. Tentar listar todas as tabelas
  console.log('\n📋 4. LISTANDO TODAS AS TABELAS DISPONÍVEIS...');
  report.context.allTables = await listAllTables();

  // 5. Gerar relatório final
  console.log('\n' + '='.repeat(80));
  console.log('📊 RELATÓRIO FINAL - SISTEMA DE RANKING');
  console.log('='.repeat(80));

  console.log('\n🎯 TABELAS OBRIGATÓRIAS DO RANKING:');
  targetTables.forEach(tableName => {
    const status = report.ranking.tables[tableName];
    if (status.exists) {
      console.log(`  ✅ ${tableName} - EXISTE`);
      if (tableName === 'leads' && status.hasRequiredFields !== undefined) {
        console.log(`     - Campos obrigatórios: ${status.hasRequiredFields ? '✅ COMPLETOS' : '❌ INCOMPLETOS'}`);
        if (status.missingFields && status.missingFields.length > 0) {
          console.log(`     - Campos faltando: ${status.missingFields.join(', ')}`);
        }
      }
    } else {
      console.log(`  ❌ ${tableName} - NÃO EXISTE`);
    }
  });

  console.log('\n👁️ VIEWS OBRIGATÓRIAS DO RANKING:');
  targetViews.forEach(viewName => {
    const status = report.ranking.views[viewName];
    if (status.exists) {
      console.log(`  ✅ ${viewName} - EXISTE`);
    } else {
      console.log(`  ❌ ${viewName} - NÃO EXISTE`);
    }
  });

  console.log('\n📈 SITUAÇÃO GERAL:');
  const existingTables = targetTables.filter(t => report.ranking.tables[t].exists);
  const existingViews = targetViews.filter(v => report.ranking.views[v].exists);

  console.log(`  Tabelas obrigatórias: ${existingTables.length}/${targetTables.length}`);
  console.log(`  Views obrigatórias: ${existingViews.length}/${targetViews.length}`);

  // Verificar campos específicos da tabela leads
  if (report.ranking.tables.leads?.exists) {
    const leadsStatus = report.ranking.tables.leads;
    if (leadsStatus.hasRequiredFields) {
      console.log(`  Campos da tabela leads: ✅ COMPLETOS`);
    } else {
      console.log(`  Campos da tabela leads: ❌ INCOMPLETOS`);
    }
  }

  console.log('\n🚨 PROBLEMAS ENCONTRADOS:');
  const problems = [];

  targetTables.forEach(tableName => {
    if (!report.ranking.tables[tableName].exists) {
      problems.push(`❌ Tabela '${tableName}' não existe`);
    }
  });

  targetViews.forEach(viewName => {
    if (!report.ranking.views[viewName].exists) {
      problems.push(`❌ View '${viewName}' não existe`);
    }
  });

  if (report.ranking.tables.leads?.exists && !report.ranking.tables.leads.hasRequiredFields) {
    problems.push(`❌ Tabela 'leads' existe mas está faltando campos: ${report.ranking.tables.leads.missingFields.join(', ')}`);
  }

  if (problems.length === 0) {
    console.log('✅ Nenhum problema encontrado! Sistema de ranking parece estar completo.');
  } else {
    problems.forEach(problem => console.log(problem));
  }

  console.log('\n📋 PRÓXIMOS PASSOS:');
  if (problems.length > 0) {
    console.log('1. 🔧 Criar as tabelas e views faltantes');
    console.log('2. 🗃️ Adicionar os campos faltantes nas tabelas existentes');
    console.log('3. 🔄 Verificar novamente após as correções');
  } else {
    console.log('1. ✅ Sistema aparenta estar completo');
    console.log('2. 🧪 Testar funcionalidades do ranking');
  }

  console.log(`\n📊 Total de tabelas no banco: ${report.context.allTables.length}`);

  return report;
}

// Executar a análise
analyzeRankingSystem()
  .then(report => {
    console.log('\n✨ Análise concluída!');
  })
  .catch(error => {
    console.error('❌ Erro na análise:', error.message);
  });