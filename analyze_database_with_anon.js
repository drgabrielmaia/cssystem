const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, anonKey)

// Lista das tabelas conhecidas no sistema
const tables = [
  'mentorados',
  'vendas',
  'despesas',
  'video_modules',
  'video_lessons',
  'lesson_progress',
  'form_submissions',
  'formularios_respostas',
  'whatsapp_conversations',
  'whatsapp_messages',
  'instagram_messages',
  'vendas_mentorados',
  'metas',
  'metas_vendedores',
  'followup_records',
  'followup_configurations',
  'comissoes',
  'faturas',
  'pix_payments',
  'financeiro',
  'contas_bancarias',
  'categorias_financeiras',
  'transacoes',
  'recebimentos',
  'pagamentos'
]

async function analyzeTable(tableName) {
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: false })
      .limit(5)

    if (error) {
      return {
        table: tableName,
        exists: false,
        error: error.message,
        accessible: false
      }
    }

    // Análise das colunas
    let columns = []
    let userColumns = []
    let foreignKeyColumns = []

    if (data && data.length > 0) {
      columns = Object.keys(data[0])

      // Identificar colunas de isolamento de usuário
      userColumns = columns.filter(col =>
        ['user_id', 'owner_id', 'created_by', 'mentorado_id', 'vendedor_id'].includes(col.toLowerCase())
      )

      // Identificar possíveis FKs
      foreignKeyColumns = columns.filter(col => col.endsWith('_id'))
    }

    return {
      table: tableName,
      exists: true,
      accessible: true,
      totalRecords: count || data.length,
      columns: columns,
      userColumns: userColumns,
      foreignKeyColumns: foreignKeyColumns,
      sampleData: data[0] || null,
      hasUserIsolation: userColumns.length > 0
    }
  } catch (err) {
    return {
      table: tableName,
      exists: false,
      error: err.message,
      accessible: false
    }
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(80))
  console.log('📊 ANÁLISE DO BANCO DE DADOS SUPABASE - ESTRUTURA MULTI-TENANT')
  console.log('='.repeat(80))
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`)
  console.log(`🔑 Usando: Anon Key (acesso limitado)`)
  console.log('='.repeat(80))

  const results = {
    multiTenant: [],
    global: [],
    inaccessible: []
  }

  console.log('\n📋 ANALISANDO TABELAS...\n')

  for (const table of tables) {
    process.stdout.write(`  Verificando ${table}...`)
    const info = await analyzeTable(table)

    if (!info.accessible) {
      console.log(` ❌ Inacessível`)
      results.inaccessible.push(info)
    } else if (info.hasUserIsolation) {
      console.log(` ✅ Multi-tenant`)
      results.multiTenant.push(info)
    } else {
      console.log(` ⚠️  Global`)
      results.global.push(info)
    }
  }

  // RELATÓRIO DETALHADO
  console.log('\n\n' + '='.repeat(80))
  console.log('📊 RELATÓRIO DETALHADO')
  console.log('='.repeat(80))

  // Tabelas Multi-Tenant
  console.log('\n✅ TABELAS COM ISOLAMENTO POR USUÁRIO (Multi-Tenant):')
  console.log('-'.repeat(60))

  if (results.multiTenant.length === 0) {
    console.log('  ❌ Nenhuma tabela com isolamento encontrada!')
  } else {
    results.multiTenant.forEach(info => {
      console.log(`\n  📋 ${info.table}`)
      console.log(`     Registros: ${info.totalRecords}`)
      console.log(`     Colunas de isolamento: ${info.userColumns.join(', ')}`)
      console.log(`     Todas as colunas: ${info.columns.join(', ')}`)
    })
  }

  // Tabelas Globais
  console.log('\n\n⚠️  TABELAS GLOBAIS (Sem Isolamento):')
  console.log('-'.repeat(60))

  if (results.global.length === 0) {
    console.log('  ✅ Nenhuma tabela global encontrada!')
  } else {
    results.global.forEach(info => {
      console.log(`\n  📋 ${info.table}`)
      console.log(`     Registros: ${info.totalRecords}`)
      console.log(`     Colunas: ${info.columns.join(', ')}`)

      // Sugerir campo de isolamento
      if (info.foreignKeyColumns.length > 0) {
        console.log(`     🔗 Possíveis FKs: ${info.foreignKeyColumns.join(', ')}`)
      }
    })
  }

  // Tabelas Inacessíveis
  console.log('\n\n❌ TABELAS INACESSÍVEIS:')
  console.log('-'.repeat(60))

  if (results.inaccessible.length === 0) {
    console.log('  ✅ Todas as tabelas foram acessadas!')
  } else {
    results.inaccessible.forEach(info => {
      console.log(`  - ${info.table}: ${info.error}`)
    })
  }

  // ANÁLISE E RECOMENDAÇÕES
  console.log('\n\n' + '='.repeat(80))
  console.log('💡 ANÁLISE E RECOMENDAÇÕES')
  console.log('='.repeat(80))

  const totalTables = results.multiTenant.length + results.global.length + results.inaccessible.length
  const percentMultiTenant = ((results.multiTenant.length / totalTables) * 100).toFixed(1)
  const percentGlobal = ((results.global.length / totalTables) * 100).toFixed(1)

  console.log('\n📊 RESUMO:')
  console.log(`  - Total de tabelas: ${totalTables}`)
  console.log(`  - Multi-tenant: ${results.multiTenant.length} (${percentMultiTenant}%)`)
  console.log(`  - Globais: ${results.global.length} (${percentGlobal}%)`)
  console.log(`  - Inacessíveis: ${results.inaccessible.length}`)

  if (results.global.length > 0) {
    console.log('\n🔴 AÇÃO NECESSÁRIA: IMPLEMENTAR MULTI-TENANCY')
    console.log('-'.repeat(60))
    console.log('\nTabelas críticas que precisam de isolamento:')

    const criticalTables = ['vendas', 'despesas', 'metas', 'comissoes', 'faturas',
                           'financeiro', 'transacoes', 'recebimentos', 'pagamentos',
                           'lesson_progress', 'form_submissions']

    const needsIsolation = results.global.filter(t =>
      criticalTables.includes(t.table)
    )

    needsIsolation.forEach(table => {
      console.log(`\n  🔸 ${table.table}:`)
      console.log(`     - Adicionar coluna: user_id ou mentorado_id`)
      console.log(`     - Criar índice na nova coluna`)
      console.log(`     - Implementar RLS policies`)
      console.log(`     - Atualizar queries no código para filtrar por usuário`)
    })
  }

  console.log('\n\n🔒 IMPLEMENTAÇÃO DE RLS (Row Level Security):')
  console.log('-'.repeat(60))
  console.log(`
  Para cada tabela, executar no Supabase:

  -- Habilitar RLS
  ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;

  -- Política para SELECT (visualizar apenas próprios dados)
  CREATE POLICY "Users can view own data" ON nome_tabela
    FOR SELECT USING (user_id = auth.uid());

  -- Política para INSERT
  CREATE POLICY "Users can insert own data" ON nome_tabela
    FOR INSERT WITH CHECK (user_id = auth.uid());

  -- Política para UPDATE
  CREATE POLICY "Users can update own data" ON nome_tabela
    FOR UPDATE USING (user_id = auth.uid());

  -- Política para DELETE
  CREATE POLICY "Users can delete own data" ON nome_tabela
    FOR DELETE USING (user_id = auth.uid());
  `)

  console.log('\n\n✅ ANÁLISE CONCLUÍDA!')
  console.log('='.repeat(80))

  // Conclusão principal
  if (results.global.length > 10) {
    console.log('\n⚠️  CONCLUSÃO: O sistema atual é predominantemente GLOBAL')
    console.log('   A maioria das tabelas não possui isolamento por usuário.')
    console.log('   Implementação de multi-tenancy requererá mudanças significativas.')
  } else if (results.multiTenant.length > 10) {
    console.log('\n✅ CONCLUSÃO: O sistema já possui estrutura multi-tenant parcial')
    console.log('   Algumas tabelas já possuem isolamento, mas precisa ser completado.')
  } else {
    console.log('\n📊 CONCLUSÃO: Sistema misto - parte global, parte multi-tenant')
    console.log('   Necessário padronizar a abordagem em todas as tabelas.')
  }
}

// Executar análise
generateReport().catch(console.error)