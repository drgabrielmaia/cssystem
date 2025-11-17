// Verificar estrutura atual de comissão dos mentorados
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('❌ Variáveis de ambiente não encontradas')
  console.log('Precisa: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkCommissionStructure() {
  try {
    console.log('🔍 VERIFICANDO ESTRUTURA DE COMISSÃO ATUAL')
    console.log('=' .repeat(60))

    // Verificar estrutura da tabela mentorados
    const { data: mentorados, error } = await supabase
      .from('mentorados')
      .select('id, nome_completo, porcentagem_comissao')
      .limit(5)

    if (error) {
      console.log('❌ Erro ao buscar mentorados:', error)
      return
    }

    console.log('📊 ESTRUTURA ATUAL:')
    mentorados.forEach(m => {
      console.log(`   • ${m.nome_completo}: ${m.porcentagem_comissao}%`)
    })

    // Contar vendas por mentorado
    console.log('\n🎯 VENDAS POR MENTORADO:')

    for (const mentorado of mentorados) {
      const { count: vendas } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('indicado_por', mentorado.id)
        .eq('status', 'vendido')

      const comissaoAtual = mentorado.porcentagem_comissao
      const novaComissao = calcularComissaoEscalonada(vendas || 0)

      console.log(`   • ${mentorado.nome_completo}:`)
      console.log(`     - Vendas: ${vendas || 0}`)
      console.log(`     - Comissão atual: ${comissaoAtual}%`)
      console.log(`     - Comissão escalonada: ${novaComissao}%`)
      console.log(`     - ${comissaoAtual === novaComissao ? '✅' : '⚠️'} ${comissaoAtual === novaComissao ? 'Correto' : 'Precisa atualizar'}`)
      console.log('')
    }

    console.log('📋 NOVA ESTRUTURA ESCALONADA:')
    console.log('   • 1-3 vendas: 5%')
    console.log('   • 4-5 vendas: 10%')
    console.log('   • 6-10 vendas: 15%')
    console.log('   • 11+ vendas: 20%')

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

function calcularComissaoEscalonada(vendas) {
  if (vendas >= 11) return 20
  if (vendas >= 6) return 15
  if (vendas >= 4) return 10
  if (vendas >= 1) return 5
  return 5 // padrão para quem ainda não vendeu
}

checkCommissionStructure()