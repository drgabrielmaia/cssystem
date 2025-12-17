const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function runSQL() {
  try {
    // Ler o arquivo SQL
    const sql = fs.readFileSync('./fix-form-submissions-for-nps.sql', 'utf8')

    // Executar cada comando SQL individualmente
    const commands = sql.split(';').filter(cmd => cmd.trim())

    for (const command of commands) {
      if (command.trim()) {
        console.log('Executando:', command.trim())
        const { data, error } = await supabase.rpc('exec_raw_sql', { query: command.trim() })

        if (error) {
          console.error('Erro:', error)
          // Tentar método alternativo
          const { data: altData, error: altError } = await supabase.from('_').select('1').limit(0)
          console.log('Tentando método alternativo...')
        } else {
          console.log('Sucesso:', data)
        }
      }
    }

    if (error) {
      console.error('Erro ao executar SQL:', error)
      return
    }

    console.log('SQL executado com sucesso:', data)
  } catch (err) {
    console.error('Erro:', err.message)
  }
}

runSQL()