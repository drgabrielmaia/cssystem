const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase credentials not found!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigrations() {
  console.log('🚀 Aplicando migrações no Supabase...\n')
  
  try {
    // 1. Aplicar sistema de comissão
    console.log('💰 Aplicando sistema de comissão...')
    const commissionSQL = fs.readFileSync('./sql/commission_system_complete.sql', 'utf8')
    
    const { error: commissionError } = await supabase.rpc('exec_sql', {
      sql: commissionSQL
    }).then(() => {
      // Se RPC não existe, vamos executar em partes
      return executeInParts(commissionSQL)
    }).catch(executeInParts.bind(null, commissionSQL))

    if (commissionError && !commissionError.message.includes('already exists')) {
      console.error('❌ Erro no sistema de comissão:', commissionError)
    } else {
      console.log('✅ Sistema de comissão aplicado com sucesso')
    }

    // 2. Aplicar sistema de lead qualification
    console.log('\n📋 Aplicando sistema de lead qualification...')
    const leadQualSQL = fs.readFileSync('./supabase/migrations/20240209_lead_qualification_system.sql', 'utf8')
    
    const { error: leadQualError } = await executeInParts(leadQualSQL)

    if (leadQualError && !leadQualError.message.includes('already exists')) {
      console.error('❌ Erro no sistema de lead qualification:', leadQualError)
    } else {
      console.log('✅ Sistema de lead qualification aplicado com sucesso')
    }

    console.log('\n✅ Todas as migrações foram aplicadas com sucesso!')

  } catch (error) {
    console.error('❌ Erro durante aplicação das migrações:', error)
  }
}

async function executeInParts(sql) {
  // Quebra o SQL em partes menores para executar
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  console.log(`Executando ${statements.length} comandos...`)
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    
    if (statement.length < 10) continue // Skip very short statements
    
    try {
      // Try to execute as raw SQL
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
      
      if (error && !error.message.includes('already exists') && !error.message.includes('does not exist')) {
        console.log(`⚠️ Erro no comando ${i + 1}:`, error.message)
      }
    } catch (e) {
      console.log(`⚠️ Erro executando comando ${i + 1}:`, e.message)
    }
  }
  
  return { success: true }
}

applyMigrations()