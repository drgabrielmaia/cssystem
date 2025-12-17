const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTableStructure() {
  try {
    // Tentar fazer uma query para ver a estrutura
    console.log('🔍 Testando se campo mentorado_id existe...')

    const { data, error } = await supabase
      .from('form_submissions')
      .select('id, mentorado_id, template_slug, created_at')
      .limit(1)

    if (error) {
      console.error('❌ Erro (campo mentorado_id provavelmente não existe):', error.message)

      // Tentar sem o campo mentorado_id
      console.log('\n🔍 Testando sem campo mentorado_id...')
      const { data: dataWithout, error: errorWithout } = await supabase
        .from('form_submissions')
        .select('id, template_slug, lead_id, created_at')
        .limit(5)

      if (errorWithout) {
        console.error('❌ Erro na tabela:', errorWithout)
      } else {
        console.log('✅ Tabela form_submissions existe!')
        console.log('📊 Primeiras 5 entries:')
        dataWithout.forEach((entry, i) => {
          console.log(`${i + 1}. ${entry.id} | ${entry.template_slug} | Lead: ${entry.lead_id} | ${entry.created_at}`)
        })
      }
    } else {
      console.log('✅ Campo mentorado_id existe!')
      console.log('📊 Dados:', data)
    }

  } catch (err) {
    console.error('❌ Erro geral:', err.message)
  }
}

checkTableStructure()