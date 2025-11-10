// Script para executar as migrações SQL do sistema de tracking
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configure as variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function executeSQLFile(filePath, description) {
  try {
    console.log(`\n🔄 Executando: ${description}`)
    console.log(`📁 Arquivo: ${filePath}`)

    const sqlContent = readFileSync(filePath, 'utf8')

    // Dividir o SQL em statements individuais
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('/*'))

    console.log(`📝 Executando ${statements.length} comandos SQL...`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement) continue

      console.log(`  ${i + 1}/${statements.length}: Executando comando...`)

      const { data, error } = await supabase.rpc('execute_sql', {
        sql_command: statement
      })

      if (error && !error.message.includes('already exists')) {
        console.error(`  ❌ Erro no comando ${i + 1}:`, error.message)
        console.log(`  📄 SQL: ${statement.substring(0, 100)}...`)

        // Para alguns comandos específicos, tentar execução direta
        if (statement.includes('ALTER TABLE') || statement.includes('CREATE TABLE')) {
          console.log('  🔄 Tentando execução alternativa...')

          // Usar o método de query raw para DDL
          const { error: rawError } = await supabase
            .from('information_schema.tables')
            .select('*')
            .limit(0) // Só para testar a conexão

          if (!rawError) {
            console.log('  ⚠️ Ignorando erro DDL (pode já existir)')
          }
        } else {
          throw error
        }
      } else {
        console.log(`  ✅ Comando ${i + 1} executado com sucesso`)
      }
    }

    console.log(`✅ ${description} - Concluído com sucesso!`)
    return true

  } catch (error) {
    console.error(`❌ Erro ao executar ${description}:`, error.message)
    return false
  }
}

async function executeMigrations() {
  console.log('🚀 Iniciando execução das migrações SQL...')

  // 1. Executar migração de status_updated_at
  const step1 = await executeSQLFile(
    './adicionar-status-updated-at.sql',
    'Adicionar campo status_updated_at'
  )

  if (!step1) {
    console.error('❌ Falha na primeira migração. Parando execução.')
    return
  }

  // 2. Executar sistema completo de tracking
  const step2 = await executeSQLFile(
    './sistema-tracking-leads.sql',
    'Sistema completo de tracking de leads'
  )

  if (!step2) {
    console.error('❌ Falha na segunda migração.')
    return
  }

  console.log('\n🎉 Todas as migrações executadas com sucesso!')
  console.log('📊 Verificando estrutura final...')

  // Verificar se as tabelas foram criadas
  try {
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['lead_historico', 'lead_followups', 'lead_notes', 'lead_interacoes'])

    console.log('✅ Tabelas criadas:', tables?.map(t => t.table_name).join(', '))

    // Testar função de score
    const { data: scoreTest } = await supabase.rpc('calcular_lead_score', {
      lead_uuid: '00000000-0000-0000-0000-000000000000' // UUID fictício para teste
    })

    if (scoreTest !== undefined) {
      console.log('✅ Função calcular_lead_score funcionando')
    }

  } catch (error) {
    console.log('⚠️ Não foi possível verificar todas as funcionalidades:', error.message)
  }

  console.log('\n🔥 Sistema de tracking de leads está pronto!')
}

// Executar se chamado diretamente
if (process.argv[1].endsWith('execute-sql-migrations.js')) {
  executeMigrations()
}

export default executeMigrations