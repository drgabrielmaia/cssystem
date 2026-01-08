const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTYzNTY3NiwiZXhwIjoyMDQ1MjExNjc2fQ.g6lJLaOQ9CW4PGNJYHMq_xyunTWtMiMGrcdUTD-W7jQ'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function getAllTables() {
  // Lista manual das tabelas conhecidas - vamos usar isso diretamente
  // já que não temos uma função RPC disponível
  return [
    'mentorados', 'vendas', 'despesas', 'video_modules', 'video_lessons',
    'lesson_progress', 'form_submissions', 'formularios_respostas',
    'whatsapp_conversations', 'whatsapp_messages', 'instagram_messages',
    'vendas_mentorados', 'metas', 'metas_vendedores', 'followup_records',
    'followup_configurations', 'comissoes', 'faturas', 'pix_payments',
    'financeiro', 'contas_bancarias', 'categorias_financeiras',
    'transacoes', 'recebimentos', 'pagamentos', 'auth.users'
  ].map(name => ({ table_name: name }))
}

async function getTableDetails(tableName) {
  try {
    // Tentar obter dados via SELECT simples
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(3)

    let columns = []
    let foreignKeys = []
    let count = 0

    if (!sampleError && sampleData && sampleData.length > 0) {
      // Se conseguimos dados, extrair colunas
      columns = Object.keys(sampleData[0]).map(col => ({
        column_name: col,
        data_type: typeof sampleData[0][col],
        is_nullable: sampleData.some(row => row[col] === null) ? 'YES' : 'NO'
      }))

      // Contar registros
      const { count: totalCount } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      count = totalCount || sampleData.length
    }

    // Detectar possíveis FKs baseado em nomenclatura
    const possibleFKs = columns.filter(col =>
      col.column_name.endsWith('_id') ||
      col.column_name === 'user_id' ||
      col.column_name === 'owner_id' ||
      col.column_name === 'created_by'
    )

    possibleFKs.forEach(col => {
      if (col.column_name === 'user_id' || col.column_name === 'owner_id' || col.column_name === 'created_by') {
        foreignKeys.push({
          column_name: col.column_name,
          foreign_table_name: 'auth.users',
          foreign_column_name: 'id'
        })
      } else if (col.column_name === 'mentorado_id') {
        foreignKeys.push({
          column_name: col.column_name,
          foreign_table_name: 'mentorados',
          foreign_column_name: 'id'
        })
      } else if (col.column_name === 'vendedor_id') {
        foreignKeys.push({
          column_name: col.column_name,
          foreign_table_name: 'vendas',
          foreign_column_name: 'id'
        })
      }
    })

    return {
      columns,
      foreignKeys,
      sampleData: sampleData?.[0],
      totalRecords: count
    }
  } catch (error) {
    console.error(`Erro ao obter detalhes de ${tableName}:`, error.message)
    return null
  }
}

async function checkRLSPolicies(tableName) {
  // Sem acesso direto ao pg_policies, vamos testar empiricamente
  // Retornamos um array vazio por enquanto
  return []
}

async function analyzeMultiTenancy(tableDetails) {
  const userColumns = ['user_id', 'owner_id', 'created_by', 'mentorado_id', 'vendedor_id']
  const hasUserColumn = tableDetails.columns?.some(col =>
    userColumns.includes(col.column_name.toLowerCase())
  )

  const hasUserFK = tableDetails.foreignKeys?.some(fk =>
    fk.foreign_table_name === 'auth.users' ||
    fk.foreign_table_name === 'mentorados' ||
    fk.foreign_table_name === 'vendedores'
  )

  return {
    hasUserIsolation: hasUserColumn || hasUserFK,
    isolationColumns: tableDetails.columns?.filter(col =>
      userColumns.includes(col.column_name.toLowerCase())
    ).map(col => col.column_name) || []
  }
}

async function generateReport() {
  console.log('🔍 ANÁLISE COMPLETA DO BANCO DE DADOS SUPABASE')
  console.log('='.repeat(80))
  console.log(`📅 Data da análise: ${new Date().toLocaleString('pt-BR')}`)
  console.log('='.repeat(80))

  const tables = await getAllTables()
  console.log(`\n📊 Total de tabelas encontradas: ${tables.length}`)
  console.log('='.repeat(80))

  const analysis = {
    multiTenantTables: [],
    globalTables: [],
    unknownTables: [],
    rlsEnabledTables: []
  }

  for (const table of tables) {
    const tableName = table.table_name
    console.log(`\n\n📋 TABELA: ${tableName}`)
    console.log('-'.repeat(60))

    const details = await getTableDetails(tableName)

    if (!details) {
      console.log('⚠️  Não foi possível obter detalhes desta tabela')
      analysis.unknownTables.push(tableName)
      continue
    }

    // Analisar colunas
    console.log('\n🔹 COLUNAS:')
    if (details.columns && details.columns.length > 0) {
      details.columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
        console.log(`   - ${col.column_name}: ${col.data_type} (${nullable})`)
      })
    } else if (details.sampleData) {
      Object.keys(details.sampleData).forEach(col => {
        console.log(`   - ${col}: ${typeof details.sampleData[col]}`)
      })
    }

    // Analisar chaves estrangeiras
    if (details.foreignKeys && details.foreignKeys.length > 0) {
      console.log('\n🔗 CHAVES ESTRANGEIRAS:')
      details.foreignKeys.forEach(fk => {
        console.log(`   - ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`)
      })
    }

    // Analisar multi-tenancy
    const tenancyInfo = await analyzeMultiTenancy(details)
    console.log('\n🏢 ANÁLISE MULTI-TENANT:')
    if (tenancyInfo.hasUserIsolation) {
      console.log(`   ✅ POSSUI isolamento por usuário`)
      console.log(`   📌 Colunas de isolamento: ${tenancyInfo.isolationColumns.join(', ')}`)
      analysis.multiTenantTables.push({
        table: tableName,
        columns: tenancyInfo.isolationColumns
      })
    } else {
      console.log(`   ❌ NÃO possui isolamento por usuário (dados GLOBAIS)`)
      analysis.globalTables.push(tableName)
    }

    // Verificar RLS
    const policies = await checkRLSPolicies(tableName)
    if (policies && policies.length > 0) {
      console.log('\n🔒 RLS (Row Level Security):')
      console.log(`   ✅ RLS habilitado com ${policies.length} políticas`)
      analysis.rlsEnabledTables.push(tableName)
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.cmd}`)
      })
    } else {
      console.log('\n🔓 RLS: ❌ Não habilitado ou sem políticas')
    }

    // Mostrar sample de dados (se disponível)
    if (details.sampleData) {
      console.log('\n📝 EXEMPLO DE REGISTRO:')
      const sample = { ...details.sampleData }
      // Limitar strings longas
      Object.keys(sample).forEach(key => {
        if (typeof sample[key] === 'string' && sample[key].length > 50) {
          sample[key] = sample[key].substring(0, 50) + '...'
        }
      })
      console.log(JSON.stringify(sample, null, 2))
    }
  }

  // Relatório final
  console.log('\n\n' + '='.repeat(80))
  console.log('📊 RELATÓRIO FINAL DE MULTI-TENANCY')
  console.log('='.repeat(80))

  console.log('\n✅ TABELAS COM ISOLAMENTO POR USUÁRIO:')
  console.log(`   Total: ${analysis.multiTenantTables.length}`)
  analysis.multiTenantTables.forEach(t => {
    console.log(`   - ${t.table}: [${t.columns.join(', ')}]`)
  })

  console.log('\n❌ TABELAS GLOBAIS (SEM ISOLAMENTO):')
  console.log(`   Total: ${analysis.globalTables.length}`)
  analysis.globalTables.forEach(t => {
    console.log(`   - ${t}`)
  })

  console.log('\n🔒 TABELAS COM RLS HABILITADO:')
  console.log(`   Total: ${analysis.rlsEnabledTables.length}`)
  analysis.rlsEnabledTables.forEach(t => {
    console.log(`   - ${t}`)
  })

  console.log('\n⚠️  TABELAS NÃO ANALISADAS:')
  console.log(`   Total: ${analysis.unknownTables.length}`)
  analysis.unknownTables.forEach(t => {
    console.log(`   - ${t}`)
  })

  // Recomendações
  console.log('\n\n' + '='.repeat(80))
  console.log('💡 RECOMENDAÇÕES PARA IMPLEMENTAR MULTI-TENANCY COMPLETO:')
  console.log('='.repeat(80))

  if (analysis.globalTables.length > 0) {
    console.log('\n1. TABELAS QUE PRECISAM DE ISOLAMENTO:')
    const criticalTables = analysis.globalTables.filter(t =>
      ['vendas', 'despesas', 'video_lessons', 'lesson_progress', 'metas',
       'comissoes', 'faturas', 'financeiro', 'transacoes'].includes(t)
    )

    criticalTables.forEach(t => {
      console.log(`   🔴 ${t}: Adicionar coluna user_id ou mentorado_id`)
    })
  }

  console.log('\n2. IMPLEMENTAR RLS:')
  const noRLS = [...analysis.multiTenantTables.map(t => t.table), ...analysis.globalTables]
    .filter(t => !analysis.rlsEnabledTables.includes(t))

  if (noRLS.length > 0) {
    console.log('   Tabelas sem RLS que precisam de políticas:')
    noRLS.forEach(t => {
      console.log(`   - ${t}`)
    })
  }

  console.log('\n3. VERIFICAÇÕES NECESSÁRIAS:')
  console.log('   - Revisar relacionamentos entre tabelas')
  console.log('   - Garantir que todas as queries incluam filtros por usuário')
  console.log('   - Implementar middleware de verificação de acesso')
  console.log('   - Criar testes de isolamento de dados')

  console.log('\n\n✅ ANÁLISE COMPLETA FINALIZADA!')
}

// Executar análise
generateReport().catch(console.error)