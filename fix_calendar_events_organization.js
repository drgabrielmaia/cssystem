require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixCalendarEventsOrganization() {
  try {
    console.log('🔧 URGENTE: Adicionando organization_id na tabela calendar_events...')
    
    // 1. Buscar o ID da Admin Organization
    console.log('🔍 Buscando Admin Organization...')
    const { data: adminOrg, error: adminError } = await supabase
      .from('organizations')
      .select('id, name')
      .ilike('admin_phone', '%83921485650%')
      .single()
    
    if (adminError || !adminOrg) {
      console.error('❌ Admin Organization não encontrada:', adminError?.message)
      return
    }
    
    const adminOrgId = adminOrg.id
    console.log('✅ Admin Organization ID:', adminOrgId, '- Nome:', adminOrg.name)
    
    // 2. Adicionar coluna organization_id na tabela calendar_events (usando SQL direto)
    console.log('🏗️ Adicionando coluna organization_id...')
    
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE calendar_events 
        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
      `
    })
    
    if (alterError) {
      console.log('⚠️ Erro ao adicionar coluna (pode já existir):', alterError.message)
    } else {
      console.log('✅ Coluna organization_id adicionada com sucesso!')
    }
    
    // 3. Buscar todos os eventos que não têm organization_id
    console.log('📋 Buscando eventos sem organization_id...')
    const { data: events, error: eventsError } = await supabase
      .from('calendar_events')
      .select('id, title, organization_id')
      .is('organization_id', null)
    
    if (eventsError) {
      console.error('❌ Erro ao buscar eventos:', eventsError.message)
      return
    }
    
    console.log(`📊 Encontrados ${events?.length || 0} eventos sem organization_id`)
    
    if (!events || events.length === 0) {
      console.log('✅ Todos os eventos já têm organization_id!')
      return
    }
    
    // 4. Atualizar todos os eventos com o Admin Organization ID
    console.log('🔄 Atualizando todos os eventos para Admin Organization...')
    
    const { error: updateError } = await supabase
      .from('calendar_events')
      .update({ organization_id: adminOrgId })
      .is('organization_id', null)
    
    if (updateError) {
      console.error('❌ Erro ao atualizar eventos:', updateError.message)
      return
    }
    
    console.log('✅ SUCESSO! Todos os eventos foram atualizados com organization_id')
    
    // 5. Verificar resultado
    const { data: updatedEvents, error: verifyError } = await supabase
      .from('calendar_events')
      .select('id, title, organization_id')
      .eq('organization_id', adminOrgId)
    
    if (verifyError) {
      console.warn('⚠️ Erro na verificação:', verifyError.message)
    } else {
      console.log(`📊 Total de eventos com Admin Organization: ${updatedEvents?.length || 0}`)
    }
    
    // 6. Criar índice para performance
    console.log('🚀 Criando índice para performance...')
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_calendar_events_organization_id 
        ON calendar_events(organization_id);
      `
    })
    
    if (indexError) {
      console.warn('⚠️ Erro ao criar índice:', indexError.message)
    } else {
      console.log('✅ Índice criado com sucesso!')
    }
    
    console.log('\n🎉 PROCESSO CONCLUÍDO COM SUCESSO!')
    console.log('📋 Próximos passos: Atualizar o código para filtrar por organization_id')
    
  } catch (error) {
    console.error('💥 ERRO CRÍTICO:', error)
  }
}

// Função alternativa usando SQL direto se a primeira não funcionar
async function fixWithDirectSQL() {
  try {
    console.log('🔧 Tentativa alternativa com SQL direto...')
    
    // Buscar Admin Organization
    const { data: adminOrg, error: adminError } = await supabase
      .from('organizations')
      .select('id')
      .ilike('admin_phone', '%83921485650%')
      .single()
    
    if (adminError || !adminOrg) {
      console.error('❌ Admin Organization não encontrada')
      return
    }
    
    const adminOrgId = adminOrg.id
    console.log('✅ Admin Organization ID:', adminOrgId)
    
    // Executar SQL diretamente
    const queries = [
      // Adicionar coluna
      `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);`,
      
      // Atualizar eventos existentes
      `UPDATE calendar_events SET organization_id = '${adminOrgId}' WHERE organization_id IS NULL;`,
      
      // Criar índice
      `CREATE INDEX IF NOT EXISTS idx_calendar_events_organization_id ON calendar_events(organization_id);`
    ]
    
    for (const query of queries) {
      console.log('🔄 Executando:', query.substring(0, 50) + '...')
      const { error } = await supabase.rpc('exec_sql', { sql: query })
      
      if (error) {
        console.warn('⚠️ Erro:', error.message)
      } else {
        console.log('✅ Sucesso!')
      }
    }
    
    console.log('\n🎉 SQL DIRETO CONCLUÍDO!')
    
  } catch (error) {
    console.error('💥 ERRO SQL DIRETO:', error)
  }
}

// Executar ambas as funções
async function main() {
  console.log('🚨 URGENTE: Corrigindo calendar_events...\n')
  
  await fixCalendarEventsOrganization()
  
  console.log('\n' + '='.repeat(50))
  
  await fixWithDirectSQL()
}

main()