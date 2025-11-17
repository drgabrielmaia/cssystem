// Debug específico para vendidos no dashboard
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Variáveis de ambiente não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugVendidosDashboard() {
  try {
    console.log('🔍 DEBUG VENDIDOS NO DASHBOARD')
    console.log('=' .repeat(60))

    // Simular a lógica exata do dashboard
    console.log('📅 Simulando filtro do mês atual...')

    const hoje = new Date()
    const anoAtual = hoje.getFullYear()
    const mesAtual = hoje.getMonth()
    const primeiroDia = new Date(anoAtual, mesAtual, 1)
    const ultimoDia = new Date(anoAtual, mesAtual + 1, 0, 23, 59, 59)

    console.log(`   Período: ${primeiroDia.toLocaleDateString('pt-BR')} até ${ultimoDia.toLocaleDateString('pt-BR')}`)

    // Buscar todos os leads
    console.log('\n1️⃣ Buscando todos os leads...')
    const { data: allLeads, error } = await supabase
      .from('leads')
      .select('*')

    if (error) {
      console.log('❌ Erro ao buscar leads:', error)
      return
    }

    console.log(`📊 Total de leads no banco: ${allLeads.length}`)

    // Filtrar vendidos
    const leadsVendidos = allLeads.filter(lead => lead.status === 'vendido')
    console.log(`💰 Total de leads vendidos (histórico): ${leadsVendidos.length}`)

    // Aplicar lógica de filtro do dashboard para vendidos
    console.log('\n2️⃣ Aplicando filtro de data para vendidos...')
    console.log('   Lógica: usar convertido_em se disponível, senão data_primeiro_contato')

    const leadsVendidosParaContar = leadsVendidos.filter(lead => {
      const dataConversao = lead.convertido_em || lead.data_primeiro_contato
      if (!dataConversao) return false

      const conversionDate = new Date(dataConversao)
      const incluir = conversionDate >= primeiroDia && conversionDate <= ultimoDia

      if (incluir) {
        console.log(`   ✅ ${lead.nome_completo}:`)
        console.log(`      - convertido_em: ${lead.convertido_em || 'NULL'}`)
        console.log(`      - data_primeiro_contato: ${lead.data_primeiro_contato}`)
        console.log(`      - data_usada: ${dataConversao}`)
        console.log(`      - data_objeto: ${conversionDate.toLocaleDateString('pt-BR')}`)
      }

      return incluir
    })

    console.log(`\n📈 RESULTADO FINAL: ${leadsVendidosParaContar.length} vendidos no mês atual`)

    if (leadsVendidosParaContar.length !== 4) {
      console.log('❌ PROBLEMA ENCONTRADO!')
      console.log('   Deveria ser 4, mas está retornando:', leadsVendidosParaContar.length)

      console.log('\n🔍 Analisando todos os vendidos por data de conversão:')
      leadsVendidos.forEach(lead => {
        const dataConversao = lead.convertido_em || lead.data_primeiro_contato
        const conversionDate = new Date(dataConversao)
        const noMes = conversionDate >= primeiroDia && conversionDate <= ultimoDia

        console.log(`   ${noMes ? '✅' : '❌'} ${lead.nome_completo}:`)
        console.log(`      - Data usada: ${dataConversao}`)
        console.log(`      - Data objeto: ${conversionDate.toLocaleDateString('pt-BR')}`)
        console.log(`      - No mês atual: ${noMes}`)
        console.log('')
      })
    } else {
      console.log('✅ Contagem correta!')
    }

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

debugVendidosDashboard()