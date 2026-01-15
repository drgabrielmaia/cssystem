const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixCommissionValues() {
  console.log('🔧 Corrigindo valores das comissões para R$ 2.000...')

  try {
    // 1. Buscar comissões pendentes zeradas
    const { data: comissoesZeradas, error: fetchError } = await supabase
      .from('comissoes')
      .select('id, mentorado_id, valor_comissao, status_pagamento, mentorados!inner(nome)')
      .eq('status_pagamento', 'pendente')
      .eq('valor_comissao', 0)

    if (fetchError) {
      throw fetchError
    }

    if (!comissoesZeradas || comissoesZeradas.length === 0) {
      console.log('✅ Nenhuma comissão zerada encontrada')
      return
    }

    console.log(`📊 Encontradas ${comissoesZeradas.length} comissões zeradas para corrigir:`)
    comissoesZeradas.forEach((c, i) => {
      console.log(`${i + 1}. ${c.mentorados?.nome}: R$ ${c.valor_comissao} → R$ 2.000,00`)
    })

    // 2. Atualizar cada comissão para R$ 2.000
    let corrigidas = 0
    const valorCorreto = 2000.00

    for (const comissao of comissoesZeradas) {
      const { error: updateError } = await supabase
        .from('comissoes')
        .update({
          valor_comissao: valorCorreto,
          observacoes: `Comissão corrigida para valor fixo de R$ ${valorCorreto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${new Date().toLocaleDateString('pt-BR')}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', comissao.id)

      if (updateError) {
        console.error(`❌ Erro ao corrigir comissão ${comissao.id}:`, updateError.message)
        continue
      }

      console.log(`✅ Comissão ${comissao.id} corrigida: ${comissao.mentorados?.nome}`)
      corrigidas++
    }

    // 3. Verificar resultado
    const { data: comissoesVerificacao, error: verifyError } = await supabase
      .from('comissoes')
      .select(`
        id,
        valor_comissao,
        status_pagamento,
        mentorados!inner(nome)
      `)
      .eq('status_pagamento', 'pendente')

    if (verifyError) {
      throw verifyError
    }

    console.log('\n📈 RESULTADO FINAL:')
    console.log(`✅ ${corrigidas} comissões corrigidas com sucesso`)
    console.log('\n📋 Comissões pendentes após correção:')

    let totalPendente = 0
    comissoesVerificacao?.forEach((c, index) => {
      console.log(`${index + 1}. ${c.mentorados?.nome}: R$ ${c.valor_comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
      totalPendente += c.valor_comissao
    })

    console.log(`\n💰 Total em comissões pendentes: R$ ${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)

    // 4. Verificar se ainda há comissões zeradas
    const comissoesZeradasRestantes = comissoesVerificacao?.filter(c => c.valor_comissao === 0) || []
    if (comissoesZeradasRestantes.length > 0) {
      console.log(`⚠️ ATENÇÃO: ${comissoesZeradasRestantes.length} comissões ainda estão zeradas`)
      console.log('Isso pode indicar proteção RLS ou trigger interferindo')
    } else {
      console.log('🎉 Todas as comissões foram corrigidas!')
    }

  } catch (error) {
    console.error('❌ Erro na correção:', error.message)
    process.exit(1)
  }
}

// Executar correção
fixCommissionValues()
  .then(() => {
    console.log('\n✨ Correção de comissões finalizada!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Falha na execução:', error.message)
    process.exit(1)
  })