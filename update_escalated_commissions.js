// Atualizar comissões dos mentorados para sistema escalonado
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

function calcularComissaoEscalonada(vendas) {
  if (vendas >= 11) return 20
  if (vendas >= 6) return 15
  if (vendas >= 4) return 10
  if (vendas >= 1) return 5
  return 5 // padrão para quem ainda não vendeu
}

async function updateEscalatedCommissions() {
  try {
    console.log('🔄 ATUALIZANDO COMISSÕES ESCALONADAS')
    console.log('=' .repeat(60))

    // Buscar todos os mentorados
    const { data: mentorados, error: mentoradosError } = await supabase
      .from('mentorados')
      .select('id, nome_completo, porcentagem_comissao')

    if (mentoradosError) {
      console.log('❌ Erro ao buscar mentorados:', mentoradosError)
      return
    }

    console.log(`📊 Encontrados ${mentorados.length} mentorados`)
    console.log('')

    let atualizados = 0

    for (const mentorado of mentorados) {
      // Contar vendas do mentorado
      const { count: vendas } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('indicado_por', mentorado.id)
        .eq('status', 'vendido')

      const vendasCount = vendas || 0
      const comissaoAtual = mentorado.porcentagem_comissao
      const novaComissao = calcularComissaoEscalonada(vendasCount)

      console.log(`📋 ${mentorado.nome_completo}:`)
      console.log(`   • Vendas: ${vendasCount}`)
      console.log(`   • Comissão atual: ${comissaoAtual}%`)
      console.log(`   • Comissão escalonada: ${novaComissao}%`)

      if (comissaoAtual !== novaComissao) {
        // Atualizar comissão
        const { error: updateError } = await supabase
          .from('mentorados')
          .update({ porcentagem_comissao: novaComissao })
          .eq('id', mentorado.id)

        if (updateError) {
          console.log(`   ❌ Erro ao atualizar: ${updateError.message}`)
        } else {
          console.log(`   ✅ Atualizado para ${novaComissao}%`)
          atualizados++
        }
      } else {
        console.log(`   ✅ Já está correto`)
      }
      console.log('')
    }

    console.log('🎯 RESULTADO FINAL:')
    console.log(`   • Total de mentorados: ${mentorados.length}`)
    console.log(`   • Atualizados: ${atualizados}`)
    console.log(`   • Já estavam corretos: ${mentorados.length - atualizados}`)
    console.log('')
    console.log('📋 NOVA ESTRUTURA ESCALONADA:')
    console.log('   • 1-3 vendas: 5%')
    console.log('   • 4-5 vendas: 10%')
    console.log('   • 6-10 vendas: 15%')
    console.log('   • 11+ vendas: 20%')

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

updateEscalatedCommissions()