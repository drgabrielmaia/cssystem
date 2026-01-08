const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, anonKey)

// Lista de todas as tabelas conhecidas para testar
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
      .select('*', { count: 'exact' })
      .limit(5)

    if (error) {
      return {
        table: tableName,
        status: 'erro',
        error: error.message,
        accessible: false
      }
    }

    // Análise das colunas
    let columns = []
    let userColumns = []
    let foreignKeyColumns = []
    let hasUserIsolation = false

    if (data && data.length > 0) {
      columns = Object.keys(data[0])

      // Identificar colunas de isolamento
      const isolationColumns = ['user_id', 'owner_id', 'created_by', 'mentorado_id',
                               'vendedor_id', 'usuario_id', 'author_id']
      userColumns = columns.filter(col => isolationColumns.includes(col.toLowerCase()))
      hasUserIsolation = userColumns.length > 0

      // Identificar possíveis FKs
      foreignKeyColumns = columns.filter(col => col.endsWith('_id'))

      // Análise de dados sensíveis
      const sensitiveColumns = columns.filter(col =>
        ['cpf', 'rg', 'password', 'senha', 'token', 'key', 'secret'].some(term =>
          col.toLowerCase().includes(term)
        )
      )

      return {
        table: tableName,
        status: 'ok',
        accessible: true,
        totalRecords: count || data.length,
        columns: columns,
        userColumns: userColumns,
        foreignKeyColumns: foreignKeyColumns,
        sensitiveColumns: sensitiveColumns,
        hasUserIsolation: hasUserIsolation,
        sampleData: data[0]
      }
    }

    return {
      table: tableName,
      status: 'vazia',
      accessible: true,
      totalRecords: 0,
      columns: [],
      hasUserIsolation: false
    }

  } catch (err) {
    return {
      table: tableName,
      status: 'erro',
      error: err.message,
      accessible: false
    }
  }
}

async function generateComprehensiveReport() {
  console.log('\n' + '='.repeat(80))
  console.log('🔍 ANÁLISE COMPLETA DO BANCO DE DADOS SUPABASE')
  console.log('='.repeat(80))
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`)
  console.log(`🌐 URL: ${supabaseUrl}`)
  console.log(`🔑 Método: Cliente Supabase JS com Anon Key`)
  console.log('='.repeat(80))

  const results = {
    multiTenant: [],
    global: [],
    empty: [],
    error: []
  }

  console.log('\n📊 ANALISANDO TODAS AS TABELAS...\n')

  for (const table of tables) {
    process.stdout.write(`  ${table.padEnd(30)} ... `)
    const analysis = await analyzeTable(table)

    if (!analysis.accessible) {
      console.log(`❌ Erro: ${analysis.error}`)
      results.error.push(analysis)
    } else if (analysis.totalRecords === 0) {
      console.log(`📭 Vazia`)
      results.empty.push(analysis)
    } else if (analysis.hasUserIsolation) {
      console.log(`✅ Multi-tenant (${analysis.totalRecords} registros)`)
      results.multiTenant.push(analysis)
    } else {
      console.log(`⚠️  Global (${analysis.totalRecords} registros)`)
      results.global.push(analysis)
    }
  }

  // SEÇÃO 1: TABELAS COM DADOS
  console.log('\n\n' + '='.repeat(80))
  console.log('📋 TABELAS COM DADOS NO SISTEMA')
  console.log('='.repeat(80))

  // Multi-tenant
  if (results.multiTenant.length > 0) {
    console.log('\n✅ TABELAS MULTI-TENANT (com isolamento por usuário):')
    console.log('-'.repeat(60))
    results.multiTenant.forEach(t => {
      console.log(`\n  📁 ${t.table}`)
      console.log(`     Registros: ${t.totalRecords}`)
      console.log(`     Colunas de isolamento: ${t.userColumns.join(', ')}`)
      console.log(`     Total de colunas: ${t.columns.length}`)
      console.log(`     Colunas: ${t.columns.join(', ')}`)

      if (t.sensitiveColumns && t.sensitiveColumns.length > 0) {
        console.log(`     ⚠️  Dados sensíveis: ${t.sensitiveColumns.join(', ')}`)
      }
    })
  }

  // Globais
  if (results.global.length > 0) {
    console.log('\n\n❌ TABELAS GLOBAIS (sem isolamento):')
    console.log('-'.repeat(60))
    results.global.forEach(t => {
      console.log(`\n  📁 ${t.table}`)
      console.log(`     Registros: ${t.totalRecords}`)
      console.log(`     Total de colunas: ${t.columns.length}`)
      console.log(`     Colunas: ${t.columns.join(', ')}`)

      if (t.foreignKeyColumns && t.foreignKeyColumns.length > 0) {
        console.log(`     🔗 Possíveis FKs: ${t.foreignKeyColumns.join(', ')}`)
      }

      if (t.sensitiveColumns && t.sensitiveColumns.length > 0) {
        console.log(`     ⚠️  Dados sensíveis: ${t.sensitiveColumns.join(', ')}`)
      }
    })
  }

  // SEÇÃO 2: TABELAS VAZIAS OU COM ERRO
  console.log('\n\n' + '='.repeat(80))
  console.log('📭 TABELAS VAZIAS OU INACESSÍVEIS')
  console.log('='.repeat(80))

  if (results.empty.length > 0) {
    console.log('\n📭 Tabelas vazias (existem mas sem dados):')
    results.empty.forEach(t => {
      console.log(`  - ${t.table}`)
    })
  }

  if (results.error.length > 0) {
    console.log('\n❌ Tabelas com erro ou não existentes:')
    results.error.forEach(t => {
      console.log(`  - ${t.table}: ${t.error}`)
    })
  }

  // SEÇÃO 3: ANÁLISE E CONCLUSÕES
  console.log('\n\n' + '='.repeat(80))
  console.log('💡 ANÁLISE E CONCLUSÕES')
  console.log('='.repeat(80))

  const totalWithData = results.multiTenant.length + results.global.length
  const percentMultiTenant = totalWithData > 0
    ? ((results.multiTenant.length / totalWithData) * 100).toFixed(1)
    : 0

  console.log('\n📊 RESUMO ESTATÍSTICO:')
  console.log(`  Total de tabelas testadas: ${tables.length}`)
  console.log(`  Tabelas com dados: ${totalWithData}`)
  console.log(`  - Multi-tenant: ${results.multiTenant.length} (${percentMultiTenant}%)`)
  console.log(`  - Globais: ${results.global.length} (${100 - percentMultiTenant}%)`)
  console.log(`  Tabelas vazias: ${results.empty.length}`)
  console.log(`  Tabelas inacessíveis: ${results.error.length}`)

  // Diagnóstico do sistema
  console.log('\n🔍 DIAGNÓSTICO DO SISTEMA:')
  console.log('-'.repeat(60))

  if (percentMultiTenant === 0) {
    console.log('\n🔴 SISTEMA TOTALMENTE GLOBAL')
    console.log('   Nenhuma tabela possui isolamento por usuário.')
    console.log('   Todos os dados são compartilhados entre todos os usuários.')
    console.log('   URGENTE: Implementar multi-tenancy para segurança dos dados.')
  } else if (percentMultiTenant < 30) {
    console.log('\n🟡 SISTEMA PREDOMINANTEMENTE GLOBAL')
    console.log(`   Apenas ${percentMultiTenant}% das tabelas possuem isolamento.`)
    console.log('   A maioria dos dados é compartilhada entre usuários.')
    console.log('   RECOMENDADO: Expandir multi-tenancy para mais tabelas.')
  } else if (percentMultiTenant < 70) {
    console.log('\n🟡 SISTEMA PARCIALMENTE MULTI-TENANT')
    console.log(`   ${percentMultiTenant}% das tabelas possuem isolamento.`)
    console.log('   Sistema misto com áreas isoladas e áreas compartilhadas.')
    console.log('   RECOMENDADO: Completar implementação de multi-tenancy.')
  } else {
    console.log('\n🟢 SISTEMA PREDOMINANTEMENTE MULTI-TENANT')
    console.log(`   ${percentMultiTenant}% das tabelas possuem isolamento.`)
    console.log('   A maioria dos dados é isolada por usuário.')
    console.log('   BOM: Sistema bem configurado para multi-tenancy.')
  }

  // Tabelas críticas sem isolamento
  const criticalGlobalTables = results.global.filter(t =>
    ['vendas', 'despesas', 'financeiro', 'transacoes', 'pagamentos',
     'recebimentos', 'faturas', 'comissoes'].includes(t.table)
  )

  if (criticalGlobalTables.length > 0) {
    console.log('\n\n⚠️  ALERTA: TABELAS CRÍTICAS SEM ISOLAMENTO')
    console.log('-'.repeat(60))
    console.log('As seguintes tabelas contêm dados financeiros/sensíveis sem isolamento:')
    criticalGlobalTables.forEach(t => {
      console.log(`  🔴 ${t.table}: ${t.totalRecords} registros compartilhados`)
    })
  }

  // SEÇÃO 4: PLANO DE AÇÃO
  console.log('\n\n' + '='.repeat(80))
  console.log('📋 PLANO DE AÇÃO PARA IMPLEMENTAR MULTI-TENANCY')
  console.log('='.repeat(80))

  if (results.global.length > 0) {
    console.log('\n1️⃣  ADICIONAR COLUNAS DE ISOLAMENTO:')
    results.global.forEach(t => {
      console.log(`\n   ALTER TABLE ${t.table} ADD COLUMN user_id UUID;`)
      console.log(`   -- ou`)
      console.log(`   ALTER TABLE ${t.table} ADD COLUMN mentorado_id INTEGER REFERENCES mentorados(id);`)
    })

    console.log('\n2️⃣  CRIAR ÍNDICES PARA PERFORMANCE:')
    results.global.forEach(t => {
      console.log(`   CREATE INDEX idx_${t.table}_user_id ON ${t.table}(user_id);`)
    })

    console.log('\n3️⃣  IMPLEMENTAR ROW LEVEL SECURITY (RLS):')
    console.log('\n   -- Para cada tabela:')
    console.log('   ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;')
    console.log('\n   -- Criar políticas:')
    console.log('   CREATE POLICY "Users see own data" ON nome_tabela')
    console.log('     FOR SELECT USING (user_id = auth.uid());')
    console.log('\n   CREATE POLICY "Users insert own data" ON nome_tabela')
    console.log('     FOR INSERT WITH CHECK (user_id = auth.uid());')
    console.log('\n   CREATE POLICY "Users update own data" ON nome_tabela')
    console.log('     FOR UPDATE USING (user_id = auth.uid());')
    console.log('\n   CREATE POLICY "Users delete own data" ON nome_tabela')
    console.log('     FOR DELETE USING (user_id = auth.uid());')

    console.log('\n4️⃣  ATUALIZAR CÓDIGO DA APLICAÇÃO:')
    console.log('   - Adicionar user_id em todas as inserções')
    console.log('   - Filtrar queries por user_id')
    console.log('   - Validar permissões no backend')
  }

  // SEÇÃO 5: EXPORTAR RELATÓRIO
  console.log('\n\n' + '='.repeat(80))
  console.log('💾 EXPORTANDO RELATÓRIO')
  console.log('='.repeat(80))

  const report = {
    metadata: {
      date: new Date().toISOString(),
      url: supabaseUrl,
      totalTables: tables.length,
      tablesWithData: totalWithData,
      percentMultiTenant: parseFloat(percentMultiTenant)
    },
    analysis: {
      multiTenant: results.multiTenant.map(t => ({
        table: t.table,
        records: t.totalRecords,
        isolationColumns: t.userColumns,
        allColumns: t.columns
      })),
      global: results.global.map(t => ({
        table: t.table,
        records: t.totalRecords,
        columns: t.columns,
        needsIsolation: true
      })),
      empty: results.empty.map(t => t.table),
      errors: results.error.map(t => ({
        table: t.table,
        error: t.error
      }))
    },
    criticalIssues: criticalGlobalTables.map(t => t.table),
    recommendation: percentMultiTenant < 30 ? 'URGENT: Implement multi-tenancy' :
                   percentMultiTenant < 70 ? 'RECOMMENDED: Complete multi-tenancy' :
                   'GOOD: System is mostly multi-tenant'
  }

  const fs = require('fs')
  const filename = `database_analysis_${Date.now()}.json`
  fs.writeFileSync(filename, JSON.stringify(report, null, 2))

  console.log(`\n✅ Relatório completo salvo em: ${filename}`)
  console.log('\n🎯 CONCLUSÃO FINAL:')
  console.log('='.repeat(80))

  if (percentMultiTenant === 0) {
    console.log('❌ O SISTEMA NÃO É MULTI-TENANT')
    console.log('   Todos os dados são globais e compartilhados.')
    console.log('   Implementação de multi-tenancy é URGENTE para segurança.')
  } else if (percentMultiTenant < 50) {
    console.log('⚠️  O SISTEMA É PARCIALMENTE MULTI-TENANT')
    console.log('   Algumas tabelas têm isolamento, mas a maioria é global.')
    console.log('   Necessário expandir o isolamento para mais tabelas.')
  } else {
    console.log('✅ O SISTEMA TEM BOA BASE MULTI-TENANT')
    console.log('   Maioria das tabelas possui isolamento por usuário.')
    console.log('   Finalizar implementação nas tabelas restantes.')
  }

  console.log('\n' + '='.repeat(80))
  console.log('FIM DA ANÁLISE')
  console.log('='.repeat(80))
}

// Executar análise
generateComprehensiveReport().catch(console.error)