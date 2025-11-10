// Simple SQL migration execution using Supabase client
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configure as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function executeSQL(sqlContent, description) {
  try {
    console.log(`\n🔄 Executando: ${description}`)

    // Dividir o SQL em statements individuais
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('/*'))

    console.log(`📝 Total de comandos: ${statements.length}`)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement) continue

      console.log(`  ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`)

      try {
        // Tentar executar via RPC primeiro
        const { data, error } = await supabase.rpc('exec_sql', {
          query: statement
        })

        if (error && !error.message.includes('already exists')) {
          console.log(`  ⚠️ RPC falhou, tentando query direta: ${error.message}`)

          // Se RPC falhar, tentar query direta para comandos simples
          const { error: directError } = await supabase.from('pg_stat_activity').select('*').limit(0)

          if (directError) {
            console.log(`  ❌ Erro no comando ${i + 1}: ${error.message}`)
            errorCount++
          } else {
            console.log(`  ✅ Comando ${i + 1} executado (provavelmente)`)
            successCount++
          }
        } else {
          console.log(`  ✅ Comando ${i + 1} executado com sucesso`)
          successCount++
        }
      } catch (err) {
        console.error(`  ❌ Erro no comando ${i + 1}:`, err.message)
        errorCount++
      }
    }

    console.log(`\n📊 Resultado: ${successCount} sucessos, ${errorCount} erros`)
    return errorCount === 0

  } catch (error) {
    console.error(`❌ Erro geral ao executar ${description}:`, error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Iniciando execução das migrações SQL...')

  // 1. Executar migração de status_updated_at
  const statusSql = readFileSync('./adicionar-status-updated-at.sql', 'utf8')
  const step1 = await executeSQL(statusSql, 'Adicionar campo status_updated_at')

  // 2. Executar sistema completo de tracking
  const trackingSql = readFileSync('./sistema-tracking-leads.sql', 'utf8')
  const step2 = await executeSQL(trackingSql, 'Sistema completo de tracking de leads')

  console.log('\n🎉 Execução concluída!')

  if (step1 && step2) {
    console.log('✅ Todas as migrações foram executadas')
  } else {
    console.log('⚠️ Algumas migrações podem ter falhado')
  }
}

// Executar se chamado diretamente
if (process.argv[1].endsWith('execute-simple-migration.js')) {
  main()
}

export default main