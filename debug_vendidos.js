// Debug dos leads vendidos para verificar inconsistência
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Variáveis de ambiente não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugVendidos() {
  try {
    console.log('🔍 DEBUG DOS LEADS VENDIDOS')
    console.log('=' .repeat(60))

    // Buscar todos os leads vendidos
    const { data: vendidos, error } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'vendido')
      .order('data_primeiro_contato', { ascending: false })

    if (error) {
      console.log('❌ Erro ao buscar leads:', error)
      return
    }

    console.log(`📊 Total de leads vendidos: ${vendidos.length}`)
    console.log('')

    // Analisar cada lead vendido
    vendidos.forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.nome_completo}`)
      console.log(`   📧 Email: ${lead.email || 'N/A'}`)
      console.log(`   📱 Telefone: ${lead.telefone}`)
      console.log(`   🏢 Empresa: ${lead.empresa || 'N/A'}`)
      console.log(`   💰 Valor Vendido: R$ ${lead.valor_vendido || 0}`)
      console.log(`   📅 Data Primeiro Contato: ${lead.data_primeiro_contato}`)
      console.log(`   🎯 Convertido Em: ${lead.convertido_em || 'N/A'}`)
      console.log(`   📝 Observações: ${lead.observacoes || 'N/A'}`)

      // Verificar qual data seria usada no filtro
      const dataParaFiltro = lead.convertido_em || lead.data_primeiro_contato
      console.log(`   🔍 Data usada no filtro: ${dataParaFiltro}`)

      if (dataParaFiltro) {
        const dataObj = new Date(dataParaFiltro)
        console.log(`   📆 Mês/Ano da conversão: ${dataObj.getMonth() + 1}/${dataObj.getFullYear()}`)
      }

      console.log('')
    })

    // Verificar quantos são do mês atual
    const hoje = new Date()
    const mesAtual = hoje.getMonth()
    const anoAtual = hoje.getFullYear()

    const vendidosMesAtual = vendidos.filter(lead => {
      const dataParaFiltro = lead.convertido_em || lead.data_primeiro_contato
      if (!dataParaFiltro) return false

      const dataObj = new Date(dataParaFiltro)
      return dataObj.getMonth() === mesAtual && dataObj.getFullYear() === anoAtual
    })

    console.log('📊 RESUMO DO MÊS ATUAL:')
    console.log(`   Mês/Ano: ${mesAtual + 1}/${anoAtual}`)
    console.log(`   Vendidos no mês: ${vendidosMesAtual.length}`)
    console.log('')

    if (vendidosMesAtual.length > 0) {
      console.log('📋 Vendidos do mês atual:')
      vendidosMesAtual.forEach(lead => {
        const dataParaFiltro = lead.convertido_em || lead.data_primeiro_contato
        console.log(`   • ${lead.nome_completo} - ${dataParaFiltro}`)
      })
    }

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

debugVendidos()