// Atualizar comissão de todos os mentorados para 5%
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

async function updateComissao() {
  try {
    console.log('🔄 ATUALIZANDO COMISSÃO PARA 5% - TODOS OS MENTORADOS')
    console.log('=' .repeat(60))

    // Primeiro, verificar quantos mentorados têm comissão diferente de 5%
    const { data: mentorados, error: fetchError } = await supabase
      .from('mentorados')
      .select('id, nome_completo, porcentagem_comissao')
      .neq('porcentagem_comissao', 5)

    if (fetchError) {
      console.log('❌ Erro ao buscar mentorados:', fetchError)
      return
    }

    console.log(`📊 Encontrados ${mentorados.length} mentorados com comissão diferente de 5%`)

    if (mentorados.length === 0) {
      console.log('✅ Todos os mentorados já têm 5% de comissão!')
      return
    }

    console.log('')
    console.log('📋 Mentorados que serão atualizados:')
    mentorados.forEach(m => {
      console.log(`   • ${m.nome_completo}: ${m.porcentagem_comissao}% → 5%`)
    })

    console.log('')
    console.log('🔄 Atualizando...')

    // Atualizar todos para 5%
    const { data, error } = await supabase
      .from('mentorados')
      .update({ porcentagem_comissao: 5 })
      .neq('porcentagem_comissao', 5)

    if (error) {
      console.log('❌ Erro ao atualizar:', error)
      return
    }

    console.log('✅ Atualização concluída!')

    // Verificar resultado
    const { data: verificacao } = await supabase
      .from('mentorados')
      .select('count')
      .eq('porcentagem_comissao', 5)

    console.log('')
    console.log('📊 RESULTADO:')
    console.log(`   • ${mentorados.length} mentorados atualizados`)
    console.log(`   • Todos agora têm 5% de comissão`)
    console.log('')
    console.log('🎯 Padronização completa!')

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

updateComissao()