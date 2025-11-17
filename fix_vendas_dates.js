// Corrigir datas das vendas - só os 5 de novembro são realmente de novembro
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('❌ Variáveis de ambiente não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixVendasDates() {
  try {
    console.log('🔄 CORRIGINDO DATAS DAS VENDAS')
    console.log('=' .repeat(60))

    // IDs dos 5 leads que realmente foram vendidos em novembro
    const leadsNovembro = [
      'a61f79ed-fcf7-4537-a6fe-0b1a498626e2', // Maria Vitoria Coutinho
      '8a1350b2-a04a-443a-b8e6-afaecd7d7a98', // Caio de Macena
      '21debc68-3bb0-455b-bfb6-39276dd7b3ec', // Daniella Alencar
      '4cb95c2f-faa7-4b64-941e-54dbcd547c85', // Mila Cruz
      'e2ee08ce-d852-4057-9fd8-1ae1d7f64d4a'  // Ruan Mathias Sousa Dias
    ]

    console.log(`📝 IDs dos leads de novembro: ${leadsNovembro.length}`)
    leadsNovembro.forEach(id => console.log(`   - ${id}`))

    // 1. Primeiro, buscar todas as vendas atuais
    const { data: todasVendas, error: fetchError } = await supabase
      .from('lead_vendas')
      .select(`
        *,
        leads (nome_completo)
      `)

    if (fetchError) throw fetchError

    console.log(`\n📊 Total de vendas na tabela: ${todasVendas.length}`)

    // 2. Separar vendas de novembro (os 5 corretos) das outras
    const vendasNovembro = todasVendas.filter(venda =>
      leadsNovembro.includes(venda.lead_id)
    )

    const vendasOutubro = todasVendas.filter(venda =>
      !leadsNovembro.includes(venda.lead_id)
    )

    console.log(`\n✅ Vendas que devem ficar em NOVEMBRO: ${vendasNovembro.length}`)
    vendasNovembro.forEach(venda => {
      console.log(`   • ${venda.leads?.nome_completo} - R$ ${venda.valor_vendido}`)
    })

    console.log(`\n📅 Vendas que serão movidas para OUTUBRO: ${vendasOutubro.length}`)

    // 3. Atualizar vendas de outubro para data correta
    if (vendasOutubro.length > 0) {
      console.log(`\n🔄 Atualizando ${vendasOutubro.length} vendas para outubro...`)

      for (const venda of vendasOutubro) {
        const { error: updateError } = await supabase
          .from('lead_vendas')
          .update({
            data_venda: '2025-10-15', // Data representativa de outubro
            data_arrecadacao: venda.data_arrecadacao ? '2025-10-15' : null,
            observacoes: 'Venda de outubro 2025 - data corrigida'
          })
          .eq('id', venda.id)

        if (updateError) {
          console.log(`❌ Erro ao atualizar venda ${venda.id}:`, updateError.message)
        } else {
          console.log(`   ✅ ${venda.leads?.nome_completo} movida para outubro`)
        }
      }
    }

    // 4. Verificar resultado final
    console.log(`\n🔍 VERIFICANDO RESULTADO FINAL...`)

    const { data: vendasNovembroFinal, error: novError } = await supabase
      .from('lead_vendas')
      .select(`
        *,
        leads (nome_completo)
      `)
      .gte('data_venda', '2025-11-01')
      .lt('data_venda', '2025-12-01')

    if (!novError) {
      console.log(`\n📊 VENDAS EM NOVEMBRO 2025: ${vendasNovembroFinal.length}`)

      let totalVendidoNov = 0
      let totalArrecadadoNov = 0

      vendasNovembroFinal.forEach(venda => {
        console.log(`   ✅ ${venda.leads?.nome_completo}: R$ ${venda.valor_vendido} vendido, R$ ${venda.valor_arrecadado} arrecadado`)
        totalVendidoNov += venda.valor_vendido || 0
        totalArrecadadoNov += venda.valor_arrecadado || 0
      })

      console.log(`\n💰 TOTAL NOVEMBRO:`)
      console.log(`   📈 Vendido: R$ ${totalVendidoNov.toLocaleString()}`)
      console.log(`   💵 Arrecadado: R$ ${totalArrecadadoNov.toLocaleString()}`)
    }

    const { data: vendasOutubroFinal, error: outError } = await supabase
      .from('lead_vendas')
      .select('*', { count: 'exact' })
      .gte('data_venda', '2025-10-01')
      .lt('data_venda', '2025-11-01')

    if (!outError) {
      console.log(`\n📊 VENDAS EM OUTUBRO 2025: ${vendasOutubroFinal?.length || 0}`)
    }

    console.log(`\n🎉 CORREÇÃO DE DATAS CONCLUÍDA!`)

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

fixVendasDates()