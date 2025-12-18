const { createClient } = require('@supabase/supabase-js')

// Using anon key from the config files
const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, anonKey)

async function listAllTables() {
  try {
    console.log('🗄️  LISTING ALL TABLES IN SUPABASE DATABASE\n')

    // List of known tables from the schema files and app usage
    const knownTables = [
      'mentorados',
      'formularios_respostas',
      'checkins',
      'despesas_mensais',
      'metas_objetivos',
      'metricas_negocio',
      'notificacoes',
      'documentos',
      'nps_respostas',
      'modulo_iv_vendas_respostas',
      'modulo_iii_gestao_marketing_respostas',
      'modulo_ii_posicionamento_digital_respostas',
      'modulo_capacitacao_tecnica_respostas',
      'leads',
      'form_submissions',
      'form_templates',
      'user_settings',
      'calendar_events',
      'social_seller_calls',
      'lead_status_tracking',
      'lead_stages',
      'video_modules',
      'video_lessons',
      'lesson_progress',
      'video_access_control',
      'instagram_automations',
      'instagram_funnels',
      'instagram_funnel_steps',
      'instagram_webhook_logs',
      'chat_history'
    ]

    console.log('🔍 CHECKING FOR KNOWN TABLES:\n')

    const existingTables = []
    const nonExistingTables = []

    // Check each known table
    for (const tableName of knownTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        if (error) {
          nonExistingTables.push(tableName)
          console.log(`❌ ${tableName}: ${error.message}`)
        } else {
          existingTables.push(tableName)
          console.log(`✅ ${tableName}: ${count} rows`)
        }
      } catch (e) {
        nonExistingTables.push(tableName)
        console.log(`❌ ${tableName}: ${e.message}`)
      }
    }

    console.log('\n📊 SUMMARY:')
    console.log('============')
    console.log(`✅ Existing tables: ${existingTables.length}`)
    console.log(`❌ Non-existing tables: ${nonExistingTables.length}`)

    console.log('\n📋 EXISTING TABLES:')
    console.log('===================')
    existingTables.forEach((table, index) => {
      console.log(`${index + 1}. ${table}`)
    })

    if (nonExistingTables.length > 0) {
      console.log('\n❌ NON-EXISTING TABLES:')
      console.log('========================')
      nonExistingTables.forEach((table, index) => {
        console.log(`${index + 1}. ${table}`)
      })
    }

    // Get some sample data from key tables
    console.log('\n🔍 SAMPLE DATA FROM KEY TABLES:')
    console.log('===============================')

    const keyTables = ['mentorados', 'leads', 'formularios_respostas', 'form_submissions', 'checkins', 'despesas_mensais']

    for (const tableName of keyTables) {
      if (existingTables.includes(tableName)) {
        console.log(`\n📋 ${tableName.toUpperCase()} (Sample Data):`)
        console.log('-'.repeat(tableName.length + 15))

        try {
          const { data } = await supabase
            .from(tableName)
            .select('*')
            .limit(3)

          if (data && data.length > 0) {
            console.log(`First ${data.length} records:`)
            data.forEach((record, index) => {
              const keys = Object.keys(record).slice(0, 4) // Show first 4 columns
              const preview = keys.map(key => `${key}: ${record[key]}`).join(', ')
              console.log(`  ${index + 1}. ${preview}...`)
            })
          } else {
            console.log('  No data found')
          }
        } catch (e) {
          console.log(`  Error fetching data: ${e.message}`)
        }
      }
    }

    console.log('\n✅ Database analysis complete!')

  } catch (err) {
    console.error('❌ General error:', err.message)
  }
}

listAllTables()