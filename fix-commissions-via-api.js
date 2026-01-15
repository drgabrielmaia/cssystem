const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixCommissionSystem() {
  console.log('🔧 Iniciando correção do sistema de comissões...')

  try {
    // 1. Primeiro, buscar comissões que precisam ser atualizadas
    const { data: comissoesParaAtualizar, error: fetchError } = await supabase
      .from('comissoes')
      .select('id, valor_comissao, percentual_comissao, organization_id')
      .eq('status_pagamento', 'pendente')
      .eq('percentual_comissao', 10)

    if (fetchError) {
      throw fetchError
    }

    console.log(`📊 Encontradas ${comissoesParaAtualizar?.length || 0} comissões para atualizar`)

    // 2. Buscar valor fixo da organização
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, comissao_fixa_indicacao')
      .not('comissao_fixa_indicacao', 'is', null)

    if (orgError) {
      throw orgError
    }

    console.log('🏢 Organizações com comissão fixa configurada:', organizations)

    // 3. Atualizar cada comissão para valor fixo
    let atualizadas = 0

    for (const comissao of comissoesParaAtualizar || []) {
      // Buscar valor fixo da organização desta comissão
      const org = organizations?.find(o => o.id === comissao.organization_id)
      const valorFixo = org?.comissao_fixa_indicacao || 2000.00

      const { error: updateError } = await supabase
        .from('comissoes')
        .update({
          valor_comissao: valorFixo,
          percentual_comissao: 0,
          observacoes: `Comissão fixa atualizada para R$ ${valorFixo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por indicação`,
          updated_at: new Date().toISOString()
        })
        .eq('id', comissao.id)

      if (updateError) {
        console.error(`❌ Erro ao atualizar comissão ${comissao.id}:`, updateError)
        continue
      }

      console.log(`✅ Comissão ${comissao.id} atualizada: R$ ${comissao.valor_comissao} → R$ ${valorFixo}`)
      atualizadas++
    }

    // 4. Verificar resultado final
    const { data: comissoesAtualizadas, error: finalError } = await supabase
      .from('comissoes')
      .select(`
        id,
        valor_comissao,
        percentual_comissao,
        status_pagamento,
        mentorados:mentorados!inner(nome)
      `)
      .eq('status_pagamento', 'pendente')
      .order('created_at', { ascending: false })

    if (finalError) {
      throw finalError
    }

    console.log('\n📈 RESULTADO FINAL:')
    console.log(`✅ ${atualizadas} comissões atualizadas com sucesso`)
    console.log('\n📋 Comissões pendentes após atualização:')

    comissoesAtualizadas?.forEach((c, index) => {
      console.log(`${index + 1}. ${c.mentorados?.nome}: R$ ${c.valor_comissao} (${c.percentual_comissao}%)`)
    })

    console.log(`\n💰 Total em comissões pendentes: R$ ${(comissoesAtualizadas?.reduce((acc, c) => acc + c.valor_comissao, 0) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)

  } catch (error) {
    console.error('❌ Erro na correção do sistema:', error)
    process.exit(1)
  }
}

// Executar correção
fixCommissionSystem()
  .then(() => {
    console.log('\n🎉 Sistema de comissões corrigido com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Falha na execução:', error)
    process.exit(1)
  })