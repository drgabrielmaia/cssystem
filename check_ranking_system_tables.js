const fetch = require('node-fetch')

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
}

async function getAllTables() {
  console.log('\n📋 LISTANDO TODAS AS TABELAS NO BANCO...\n')

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/information_schema.tables?select=table_name&table_schema=eq.public&table_type=eq.BASE%20TABLE&order=table_name`,
      { headers }
    )

    if (!response.ok) {
      console.log(`❌ Erro ao listar tabelas: ${response.status} - ${response.statusText}`)
      return []
    }

    const tables = await response.json()
    console.log(`✅ Encontradas ${tables.length} tabelas:`)
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table.table_name}`)
    })

    return tables.map(t => t.table_name)
  } catch (err) {
    console.log(`❌ Erro geral ao listar tabelas:`, err.message)
    return []
  }
}

async function getAllViews() {
  console.log('\n👁️ LISTANDO TODAS AS VIEWS NO BANCO...\n')

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/information_schema.tables?select=table_name&table_schema=eq.public&table_type=eq.VIEW&order=table_name`,
      { headers }
    )

    if (!response.ok) {
      console.log(`❌ Erro ao listar views: ${response.status} - ${response.statusText}`)
      return []
    }

    const views = await response.json()
    console.log(`✅ Encontradas ${views.length} views:`)
    views.forEach((view, index) => {
      console.log(`  ${index + 1}. ${view.table_name}`)
    })

    return views.map(v => v.table_name)
  } catch (err) {
    console.log(`❌ Erro geral ao listar views:`, err.message)
    return []
  }
}

async function getTableSchema(tableName) {
  try {
    console.log(`\n🔍 Verificando estrutura da tabela: ${tableName}`)

    // Usar information_schema para obter detalhes das colunas
    const columnsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/information_schema.columns?select=column_name,data_type,is_nullable,column_default,character_maximum_length&table_name=eq.${tableName}&table_schema=eq.public&order=ordinal_position`,
      { headers }
    )

    if (!columnsResponse.ok) {
      console.log(`❌ Erro ao obter schema: ${columnsResponse.status} - ${columnsResponse.statusText}`)

      // Tentar uma query simples para ver se a tabela existe
      try {
        const testResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=1`,
          { headers }
        )

        if (testResponse.status === 404) {
          console.log(`❌ Tabela ${tableName} NÃO EXISTE`)
        } else if (testResponse.ok) {
          const testData = await testResponse.json()
          console.log(`✅ Tabela ${tableName} existe, mas não conseguimos obter o schema detalhado`)
          if (testData && testData.length > 0) {
            console.log(`📊 Colunas encontradas:`, Object.keys(testData[0]).join(', '))
            // Retornar um schema básico com base nos dados
            return Object.keys(testData[0]).map(key => ({ column_name: key }))
          }
        } else {
          console.log(`❌ Erro ao acessar ${tableName}: ${testResponse.status}`)
        }
      } catch (e) {
        console.log(`❌ Tabela ${tableName} provavelmente não existe`)
      }
      return null
    }

    const columns = await columnsResponse.json()

    if (columns.length === 0) {
      console.log(`❌ Nenhuma coluna encontrada para ${tableName} - tabela pode não existir`)
      return null
    }

    console.log(`✅ Tabela ${tableName} encontrada com ${columns.length} colunas:`)
    columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)'
      const defaultVal = col.column_default ? ` [default: ${col.column_default}]` : ''
      const maxLength = col.character_maximum_length ? ` (max: ${col.character_maximum_length})` : ''
      console.log(`  📋 ${col.column_name}: ${col.data_type}${maxLength} ${nullable}${defaultVal}`)
    })

    return columns
  } catch (err) {
    console.log(`❌ Erro geral ao verificar ${tableName}:`, err.message)
    return null
  }
}

async function checkSpecificTable(tableName, requiredFields = []) {
  console.log(`\n🎯 VERIFICAÇÃO ESPECÍFICA: ${tableName.toUpperCase()}`)

  const columns = await getTableSchema(tableName)

  if (!columns) {
    console.log(`❌ ${tableName} não existe ou não foi possível acessar`)
    return { exists: false, missingFields: requiredFields }
  }

  const existingColumns = columns.map(c => c.column_name)
  const missingFields = requiredFields.filter(field => !existingColumns.includes(field))

  if (requiredFields.length > 0) {
    console.log(`\n🔍 Verificando campos obrigatórios:`)
    requiredFields.forEach(field => {
      if (existingColumns.includes(field)) {
        console.log(`  ✅ ${field} - EXISTE`)
      } else {
        console.log(`  ❌ ${field} - NÃO EXISTE`)
      }
    })
  }

  // Tentar buscar dados de exemplo
  try {
    const sampleResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=3`,
      { headers }
    )

    if (sampleResponse.ok) {
      const sampleData = await sampleResponse.json()
      console.log(`📊 Registros encontrados: ${sampleData.length}`)
    } else {
      console.log(`❌ Erro ao buscar dados de exemplo: ${sampleResponse.status}`)
    }
  } catch (err) {
    console.log(`❌ Erro ao buscar dados: ${err.message}`)
  }

  return {
    exists: true,
    columns: existingColumns,
    missingFields,
    totalColumns: columns.length
  }
}

async function checkView(viewName) {
  console.log(`\n👁️ VERIFICAÇÃO DE VIEW: ${viewName.toUpperCase()}`)

  try {
    // Verificar se a view existe
    const viewResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/information_schema.views?select=table_name,view_definition&table_name=eq.${viewName}&table_schema=eq.public`,
      { headers }
    )

    if (!viewResponse.ok) {
      console.log(`❌ Erro ao verificar view no information_schema: ${viewResponse.status}`)

      // Tentar acessar diretamente para confirmar
      try {
        const testResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/${viewName}?select=*&limit=1`,
          { headers }
        )

        if (testResponse.status === 404) {
          console.log(`❌ Confirmado: ${viewName} não existe`)
        } else if (testResponse.ok) {
          console.log(`⚠️ View existe mas não aparece no information_schema`)
          return { exists: true, accessibleDirectly: true }
        } else {
          console.log(`❌ Confirmado: ${viewName} não existe`)
        }
      } catch (e) {
        console.log(`❌ Confirmado: ${viewName} não existe`)
      }

      return { exists: false }
    }

    const viewInfo = await viewResponse.json()

    if (viewInfo.length === 0) {
      console.log(`❌ View ${viewName} NÃO EXISTE no information_schema`)

      // Tentar acessar diretamente para confirmar
      try {
        const testResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/${viewName}?select=*&limit=1`,
          { headers }
        )

        if (testResponse.ok) {
          console.log(`⚠️ View existe mas não aparece no information_schema`)
          return { exists: true, accessibleDirectly: true }
        } else {
          console.log(`❌ Confirmado: ${viewName} não existe`)
          return { exists: false }
        }
      } catch (e) {
        console.log(`❌ Confirmado: ${viewName} não existe`)
        return { exists: false }
      }
    }

    console.log(`✅ View ${viewName} existe`)

    // Obter colunas da view
    const columns = await getTableSchema(viewName)

    // Tentar executar a view
    try {
      const sampleResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/${viewName}?select=*&limit=3`,
        { headers }
      )

      if (sampleResponse.ok) {
        const sampleData = await sampleResponse.json()
        console.log(`📊 View executada com sucesso! ${sampleData.length} registros retornados`)
      } else {
        console.log(`❌ Erro ao executar view: ${sampleResponse.status}`)
      }
    } catch (err) {
      console.log(`❌ Erro ao executar view: ${err.message}`)
    }

    return { exists: true, columns: columns }
  } catch (err) {
    console.log(`❌ Erro ao verificar view ${viewName}:`, err.message)
    return { exists: false }
  }
}

async function generateReport() {
  console.log('🎯 RELATÓRIO DE VERIFICAÇÃO DO SISTEMA DE RANKING')
  console.log('=' .repeat(60))
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`)
  console.log(`🗄️ Banco: Supabase`)
  console.log('=' .repeat(60))

  const report = {
    timestamp: new Date().toISOString(),
    tables: {},
    views: {},
    summary: {}
  }

  // 1. Verificar tabela comissoes
  console.log('\n1️⃣ VERIFICANDO TABELA COMISSOES...')
  report.tables.comissoes = await checkSpecificTable('comissoes')

  // 2. Verificar tabela comissoes_configuracoes
  console.log('\n2️⃣ VERIFICANDO TABELA COMISSOES_CONFIGURACOES...')
  report.tables.comissoes_configuracoes = await checkSpecificTable('comissoes_configuracoes')

  // 3. Verificar tabela leads com campos específicos
  console.log('\n3️⃣ VERIFICANDO TABELA LEADS...')
  report.tables.leads = await checkSpecificTable('leads', ['mentorado_indicador_id', 'data_venda'])

  // 4. Verificar view dashboard comissões
  console.log('\n4️⃣ VERIFICANDO VIEW DASHBOARD COMISSÕES...')
  report.views.view_dashboard_comissoes_mentorado = await checkView('view_dashboard_comissoes_mentorado')

  // 5. Listar todas as tabelas e views
  const allTables = await getAllTables()
  const allViews = await getAllViews()

  report.summary = {
    totalTables: allTables.length,
    totalViews: allViews.length,
    comissoesExists: report.tables.comissoes.exists,
    comissoesConfigExists: report.tables.comissoes_configuracoes.exists,
    leadsExists: report.tables.leads.exists,
    leadsHasRequiredFields: report.tables.leads.missingFields?.length === 0,
    dashboardViewExists: report.views.view_dashboard_comissoes_mentorado.exists,
    allTables: allTables,
    allViews: allViews
  }

  // Gerar resumo final
  console.log('\n📋 RESUMO FINAL:')
  console.log('=' .repeat(40))
  console.log(`✅ Total de tabelas: ${report.summary.totalTables}`)
  console.log(`✅ Total de views: ${report.summary.totalViews}`)
  console.log('')
  console.log('🎯 Verificação do Sistema de Ranking:')
  console.log(`   📊 Tabela 'comissoes': ${report.summary.comissoesExists ? '✅ EXISTE' : '❌ NÃO EXISTE'}`)
  console.log(`   ⚙️  Tabela 'comissoes_configuracoes': ${report.summary.comissoesConfigExists ? '✅ EXISTE' : '❌ NÃO EXISTE'}`)
  console.log(`   👥 Tabela 'leads': ${report.summary.leadsExists ? '✅ EXISTE' : '❌ NÃO EXISTE'}`)

  if (report.summary.leadsExists) {
    console.log(`       - Campo 'mentorado_indicador_id': ${!report.tables.leads.missingFields?.includes('mentorado_indicador_id') ? '✅ EXISTE' : '❌ NÃO EXISTE'}`)
    console.log(`       - Campo 'data_venda': ${!report.tables.leads.missingFields?.includes('data_venda') ? '✅ EXISTE' : '❌ NÃO EXISTE'}`)
  }

  console.log(`   📈 View 'view_dashboard_comissoes_mentorado': ${report.summary.dashboardViewExists ? '✅ EXISTE' : '❌ NÃO EXISTE'}`)

  console.log('\n🚨 PROBLEMAS ENCONTRADOS:')
  const problems = []

  if (!report.summary.comissoesExists) {
    problems.push("❌ Tabela 'comissoes' não existe")
  }

  if (!report.summary.comissoesConfigExists) {
    problems.push("❌ Tabela 'comissoes_configuracoes' não existe")
  }

  if (!report.summary.leadsExists) {
    problems.push("❌ Tabela 'leads' não existe")
  } else if (!report.summary.leadsHasRequiredFields) {
    problems.push(`❌ Tabela 'leads' está faltando campos: ${report.tables.leads.missingFields.join(', ')}`)
  }

  if (!report.summary.dashboardViewExists) {
    problems.push("❌ View 'view_dashboard_comissoes_mentorado' não existe")
  }

  if (problems.length === 0) {
    console.log('✅ Nenhum problema encontrado! Sistema de ranking está completo.')
  } else {
    problems.forEach(problem => console.log(problem))
  }

  // Salvar relatório em arquivo JSON
  const fs = require('fs')
  const reportFileName = `/Users/gabrielmaia/Desktop/cs/frontend/ranking_system_report_${Date.now()}.json`
  fs.writeFileSync(reportFileName, JSON.stringify(report, null, 2))
  console.log(`\n💾 Relatório detalhado salvo em: ${reportFileName}`)

  return report
}

async function main() {
  try {
    await generateReport()
    console.log('\n✅ VERIFICAÇÃO COMPLETA FINALIZADA!')
  } catch (err) {
    console.error('❌ Erro geral:', err)
  }
}

main()