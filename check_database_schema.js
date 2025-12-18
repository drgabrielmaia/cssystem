const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTYzNTY3NiwiZXhwIjoyMDQ1MjExNjc2fQ.g6lJLaOQ9CW4PGNJYHMq_xyunTWtMiMGrcdUTD-W7jQ'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function getTableSchema(tableName) {
  try {
    console.log(`\n🔍 Verificando estrutura da tabela: ${tableName}`)

    // Query para obter informações sobre as colunas
    const { data: columns, error } = await supabase
      .rpc('get_table_columns', { table_name: tableName })
      .then(result => result)
      .catch(async () => {
        // Fallback: usar information_schema
        return await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default')
          .eq('table_name', tableName)
          .eq('table_schema', 'public')
          .order('ordinal_position')
      })

    if (error) {
      console.log(`❌ Erro ao obter schema: ${error.message}`)

      // Tentar uma query simples para ver se a tabela existe
      try {
        const { data: testData, error: testError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (testError) {
          if (testError.message.includes('relation') && testError.message.includes('does not exist')) {
            console.log(`❌ Tabela ${tableName} NÃO EXISTE`)
          } else {
            console.log(`❌ Erro ao acessar ${tableName}: ${testError.message}`)
          }
        } else {
          console.log(`✅ Tabela ${tableName} existe, mas não conseguimos obter o schema`)
          console.log(`📊 Exemplo de dados:`, JSON.stringify(testData[0], null, 2))
        }
      } catch (e) {
        console.log(`❌ Tabela ${tableName} provavelmente não existe`)
      }
      return null
    }

    console.log(`✅ Tabela ${tableName} encontrada com ${columns.length} colunas:`)
    columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(not null)'
      const defaultVal = col.column_default ? ` default: ${col.column_default}` : ''
      console.log(`  📋 ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`)
    })

    return columns
  } catch (err) {
    console.log(`❌ Erro geral ao verificar ${tableName}:`, err.message)
    return null
  }
}

async function testSpecificColumns() {
  console.log('\n🧪 TESTANDO COLUNAS ESPECÍFICAS MENCIONADAS NO ERRO...\n')

  const tablesToCheck = [
    'mentorados',
    'formularios_respostas',
    'video_modules',
    'video_lessons',
    'lesson_progress',
    'form_submissions'
  ]

  for (const table of tablesToCheck) {
    await getTableSchema(table)

    // Tentar fazer uma query simples para confirmar
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(3)

      if (error) {
        console.log(`  ❌ Erro na query: ${error.message}`)
      } else {
        console.log(`  ✅ Query funcionou! ${data.length} registros retornados`)
        if (data.length > 0) {
          console.log(`  📋 Colunas encontradas na primeira linha:`, Object.keys(data[0]).join(', '))
        }
      }
    } catch (e) {
      console.log(`  ❌ Erro na query: ${e.message}`)
    }
  }
}

async function checkSpecificColumnIssues() {
  console.log('\n🔍 VERIFICANDO PROBLEMA ESPECÍFICO: COLUNA "turma" EM MENTORADOS...\n')

  // Testar se a coluna 'turma' existe
  try {
    const { data, error } = await supabase
      .from('mentorados')
      .select('turma')
      .limit(1)

    if (error) {
      console.log('❌ Coluna "turma" NÃO EXISTE em mentorados!')
      console.log('🔍 Erro específico:', error.message)

      // Vamos ver que colunas existem realmente
      console.log('\n📋 Tentando descobrir as colunas reais...')
      const { data: realData, error: realError } = await supabase
        .from('mentorados')
        .select('*')
        .limit(1)

      if (realData && realData.length > 0) {
        console.log('✅ Colunas REAIS na tabela mentorados:')
        Object.keys(realData[0]).forEach(col => console.log(`  - ${col}`))
      }
    } else {
      console.log('✅ Coluna "turma" EXISTE em mentorados!')
    }
  } catch (err) {
    console.log('❌ Erro ao verificar coluna turma:', err.message)
  }
}

async function main() {
  console.log('🚀 VERIFICAÇÃO COMPLETA DO SCHEMA DO BANCO DE DADOS\n')
  console.log('📅 Data:', new Date().toLocaleString('pt-BR'))

  try {
    await testSpecificColumns()
    await checkSpecificColumnIssues()

    console.log('\n✅ VERIFICAÇÃO COMPLETA FINALIZADA!')

  } catch (err) {
    console.error('❌ Erro geral:', err)
  }
}

main()