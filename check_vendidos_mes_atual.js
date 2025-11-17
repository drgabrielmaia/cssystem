// Verificar leads vendidos no mês atual
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Variáveis de ambiente não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkVendidosMesAtual() {
  try {
    console.log('🔍 VERIFICANDO LEADS VENDIDOS NO MÊS ATUAL')
    console.log('=' .repeat(60))

    const hoje = new Date()
    const anoAtual = hoje.getFullYear()
    const mesAtual = hoje.getMonth() // 0-11

    // Primeiro dia do mês atual
    const primeiroDiaDoMes = new Date(anoAtual, mesAtual, 1)
    // Último dia do mês atual
    const ultimoDiaDoMes = new Date(anoAtual, mesAtual + 1, 0, 23, 59, 59)

    console.log(`📅 Período: ${primeiroDiaDoMes.toLocaleDateString('pt-BR')} até ${ultimoDiaDoMes.toLocaleDateString('pt-BR')}`)
    console.log(`📅 Mês/Ano: ${mesAtual + 1}/${anoAtual}`)
    console.log('')

    // Buscar todos os leads vendidos
    const { data: allVendidos, error } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'vendido')
      .order('data_primeiro_contato', { ascending: false })

    if (error) {
      console.log('❌ Erro ao buscar leads:', error)
      return
    }

    console.log(`📊 Total de leads vendidos (histórico): ${allVendidos.length}`)
    console.log('')

    // Filtrar por mês atual usando data_primeiro_contato
    const vendidosMesPorPrimeiroContato = allVendidos.filter(lead => {
      if (!lead.data_primeiro_contato) return false
      const dataContato = new Date(lead.data_primeiro_contato)
      return dataContato >= primeiroDiaDoMes && dataContato <= ultimoDiaDoMes
    })

    // Filtrar por mês atual usando convertido_em
    const vendidosMesPorConversao = allVendidos.filter(lead => {
      if (!lead.convertido_em) return false
      const dataConversao = new Date(lead.convertido_em)
      return dataConversao >= primeiroDiaDoMes && dataConversao <= ultimoDiaDoMes
    })

    // Filtrar usando a mesma lógica do dashboard (convertido_em se disponível, senão data_primeiro_contato)
    const vendidosMesLogicaDashboard = allVendidos.filter(lead => {
      const dataParaUsar = lead.convertido_em || lead.data_primeiro_contato
      if (!dataParaUsar) return false
      const dataObj = new Date(dataParaUsar)
      return dataObj >= primeiroDiaDoMes && dataObj <= ultimoDiaDoMes
    })

    console.log('📋 RESULTADOS POR CRITÉRIO:')
    console.log(`   📅 Por data_primeiro_contato: ${vendidosMesPorPrimeiroContato.length}`)
    console.log(`   🎯 Por convertido_em: ${vendidosMesPorConversao.length}`)
    console.log(`   🔄 Lógica dashboard (convertido_em || data_primeiro_contato): ${vendidosMesLogicaDashboard.length}`)
    console.log('')

    if (vendidosMesLogicaDashboard.length > 0) {
      console.log('📋 LEADS VENDIDOS NO MÊS ATUAL (lógica dashboard):')
      vendidosMesLogicaDashboard.forEach((lead, index) => {
        const dataUsada = lead.convertido_em || lead.data_primeiro_contato
        console.log(`${index + 1}. ${lead.nome_completo}`)
        console.log(`   📱 Telefone: ${lead.telefone}`)
        console.log(`   💰 Valor: R$ ${lead.valor_vendido || 0}`)
        console.log(`   📅 Data Primeiro Contato: ${lead.data_primeiro_contato}`)
        console.log(`   🎯 Convertido Em: ${lead.convertido_em || 'N/A'}`)
        console.log(`   🔍 Data usada no filtro: ${dataUsada}`)
        console.log(`   📝 Observações: ${lead.observacoes || 'N/A'}`)
        console.log('')
      })
    }

    console.log('🎯 CONCLUSÃO:')
    console.log(`   O sistema deveria mostrar: ${vendidosMesLogicaDashboard.length} vendidos`)
    console.log(`   Se está mostrando 3, há inconsistência no filtro de data`)

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

checkVendidosMesAtual()