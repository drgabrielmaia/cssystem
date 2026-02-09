require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔗 Conectando com Supabase...')
console.log('URL:', supabaseUrl ? 'Configurada' : 'Não encontrada')

const supabase = createClient(supabaseUrl, supabaseKey)

async function getAgendaAdmin() {
  try {
    console.log('🔍 Buscando organização com admin_phone 83921485650...')
    
    // 1. Buscar organização pelo admin_phone
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, admin_phone')
      .ilike('admin_phone', '%83921485650%')
      .single()
    
    if (orgError || !org) {
      console.log('❌ Organização não encontrada:', orgError?.message || 'Não existe')
      return
    }
    
    console.log('✅ Organização encontrada:', org.name, 'ID:', org.id)
    
    // 2. Primeiro verificar estrutura da tabela
    console.log('📋 Verificando estrutura da tabela calendar_events...')
    const { data: structure, error: structError } = await supabase
      .from('calendar_events')
      .select('*')
      .limit(1)
      
    if (structError) {
      console.log('❌ Erro ao verificar estrutura:', structError.message)
    } else {
      console.log('🔍 Primeira linha encontrada:', structure?.[0] ? Object.keys(structure[0]) : 'Tabela vazia')
    }
    
    // Buscar eventos (sem filtro de organização pois coluna não existe)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    
    const { data: events, error: eventsError } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_datetime', hoje.toISOString())
      .order('start_datetime', { ascending: true })
      .limit(50)
    
    if (eventsError) {
      console.log('❌ Erro ao buscar eventos:', eventsError.message)
      return
    }
    
    console.log(`\n📅 AGENDA - ${org.name}`)
    console.log('=' * 50)
    
    if (!events || events.length === 0) {
      console.log('📭 Nenhum evento agendado')
      return
    }
    
    events.forEach(event => {
      const startTime = new Date(event.start_datetime)
      const endTime = new Date(event.end_datetime)
      
      console.log(`\n🗓️  ${event.title || 'Sem título'}`)
      console.log(`📅 Data: ${startTime.toLocaleDateString('pt-BR')}`)
      console.log(`⏰ Horário: ${startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`)
      console.log(`📊 Status: ${event.call_status || 'pending'}`)
      
      if (event.nome_contato) console.log(`👤 Contato: ${event.nome_contato}`)
      if (event.telefone_contato) console.log(`📱 Telefone: ${event.telefone_contato}`)
      if (event.email_contato) console.log(`📧 Email: ${event.email_contato}`)
      if (event.description) console.log(`📝 Descrição: ${event.description}`)
      if (event.objetivo_call) console.log(`🎯 Objetivo: ${event.objetivo_call}`)
      if (event.tipo_call) console.log(`📞 Tipo: ${event.tipo_call}`)
      if (event.sale_value) console.log(`💰 Valor vendido: R$ ${event.sale_value}`)
      if (event.link_meet) console.log(`🔗 Link: ${event.link_meet}`)
      
      console.log('─'.repeat(30))
    })
    
    console.log(`\n📊 Total de eventos: ${events.length}`)
    
    // 3. Estatísticas adicionais
    const eventsHoje = events.filter(e => {
      const eventDate = new Date(e.start_datetime).toDateString()
      return eventDate === new Date().toDateString()
    })
    
    const eventsPendentes = events.filter(e => e.call_status === 'pending' || !e.call_status)
    const eventsCompletados = events.filter(e => e.call_status === 'completed')
    const eventsVendidos = events.filter(e => e.sale_value && e.sale_value > 0)
    
    console.log(`📅 Eventos hoje: ${eventsHoje.length}`)
    console.log(`⏳ Pendentes: ${eventsPendentes.length}`)
    console.log(`✅ Completados: ${eventsCompletados.length}`)
    console.log(`💰 Com vendas: ${eventsVendidos.length}`)
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

getAgendaAdmin()