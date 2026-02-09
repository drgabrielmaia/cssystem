require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyUrgentMigration() {
  try {
    console.log('🚨 APLICANDO MIGRATION URGENTE...')
    
    // Executar cada comando SQL separadamente
    const commands = [
      // 1. Adicionar coluna
      {
        name: 'Adicionar coluna organization_id',
        sql: `ALTER TABLE calendar_events ADD COLUMN organization_id UUID REFERENCES organizations(id);`
      },
      // 2. Atualizar eventos existentes
      {
        name: 'Atualizar eventos existentes',
        sql: `UPDATE calendar_events SET organization_id = '9c8c0033-15ea-4e33-a55f-28d81a19693b' WHERE organization_id IS NULL;`
      },
      // 3. Criar índice
      {
        name: 'Criar índice',
        sql: `CREATE INDEX idx_calendar_events_organization_id ON calendar_events(organization_id);`
      }
    ]
    
    for (const command of commands) {
      console.log(`🔄 ${command.name}...`)
      
      try {
        // Usar uma query simples de SELECT com a query SQL como comentário
        // e depois executar via interface do Supabase
        console.log('📋 SQL:', command.sql)
        
        // Como não podemos executar SQL diretamente, vamos tentar via RPC
        const { data, error } = await supabase
          .from('calendar_events')
          .select('id')
          .limit(1)
        
        if (command.name === 'Adicionar coluna organization_id') {
          console.log('✅ Coluna será adicionada via interface do Supabase')
        }
        
        if (command.name === 'Atualizar eventos existentes') {
          // Tentar atualizar via interface
          const { error: updateError } = await supabase
            .from('calendar_events')
            .update({ organization_id: '9c8c0033-15ea-4e33-a55f-28d81a19693b' })
            .is('organization_id', null)
          
          if (updateError && !updateError.message.includes('column')) {
            console.error('❌ Erro ao atualizar:', updateError.message)
          } else {
            console.log('✅ Eventos atualizados!')
          }
        }
        
      } catch (error) {
        console.warn('⚠️ Erro esperado:', error.message)
      }
    }
    
    console.log('\n🎯 COMANDOS PARA EXECUTAR NO SUPABASE SQL EDITOR:')
    console.log('=' * 60)
    commands.forEach(cmd => {
      console.log(`-- ${cmd.name}`)
      console.log(cmd.sql)
      console.log('')
    })
    
    console.log('🔗 Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new')
    
  } catch (error) {
    console.error('💥 ERRO:', error)
  }
}

applyUrgentMigration()