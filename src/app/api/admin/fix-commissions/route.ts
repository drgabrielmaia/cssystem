import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Iniciando correção das comissões zeradas...')

    // 1. Buscar comissões pendentes com valor zero ou nulo
    const { data: comissoesZeradas, error: fetchError } = await supabase
      .from('comissoes')
      .select(`
        id,
        valor_comissao,
        status_pagamento,
        mentorados!inner(nome)
      `)
      .eq('status_pagamento', 'pendente')
      .or('valor_comissao.is.null,valor_comissao.eq.0')

    if (fetchError) {
      console.error('❌ Erro ao buscar comissões:', fetchError)
      return NextResponse.json({ error: 'Erro ao buscar comissões' }, { status: 500 })
    }

    if (!comissoesZeradas || comissoesZeradas.length === 0) {
      return NextResponse.json({
        message: 'Nenhuma comissão zerada encontrada',
        corrigidas: 0
      })
    }

    console.log(`📊 Encontradas ${comissoesZeradas.length} comissões zeradas`)

    // 2. Corrigir cada comissão para R$ 2.000
    let corrigidas = 0
    const valorCorreto = 2000.00

    for (const comissao of comissoesZeradas) {
      try {
        const { error: updateError } = await supabase
          .from('comissoes')
          .update({
            valor_comissao: valorCorreto,
            observacoes: `Comissão corrigida para valor fixo de R$ 2.000,00 - ${new Date().toLocaleDateString('pt-BR')}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', comissao.id)

        if (updateError) {
          console.error(`❌ Erro ao atualizar comissão ${comissao.id}:`, updateError)
          continue
        }

        console.log(`✅ Comissão corrigida: ${(comissao.mentorados as any)?.nome}`)
        corrigidas++
      } catch (error) {
        console.error(`❌ Erro na atualização individual:`, error)
      }
    }

    // 3. Verificar resultado final
    const { data: comissoesVerificacao, error: verifyError } = await supabase
      .from('comissoes')
      .select(`
        id,
        valor_comissao,
        status_pagamento,
        mentorados!inner(nome)
      `)
      .eq('status_pagamento', 'pendente')
      .order('created_at', { ascending: false })

    if (verifyError) {
      console.error('❌ Erro na verificação:', verifyError)
    }

    const totalPendente = comissoesVerificacao?.reduce((acc, c) => acc + (c.valor_comissao || 0), 0) || 0
    const comissoesAindaZeradas = comissoesVerificacao?.filter(c => (c.valor_comissao || 0) === 0) || []

    return NextResponse.json({
      message: `${corrigidas} comissões corrigidas com sucesso`,
      corrigidas,
      total_comissoes_encontradas: comissoesZeradas.length,
      total_pendente_valor: totalPendente,
      comissoes_ainda_zeradas: comissoesAindaZeradas.length,
      resultado: comissoesVerificacao?.map(c => ({
        nome: (c.mentorados as any)?.nome,
        valor: c.valor_comissao
      }))
    })

  } catch (error) {
    console.error('❌ Erro na correção de comissões:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Endpoint para verificar status das comissões
    const { data: comissoes, error } = await supabase
      .from('comissoes')
      .select(`
        id,
        valor_comissao,
        status_pagamento,
        mentorados!inner(nome)
      `)
      .eq('status_pagamento', 'pendente')

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar comissões' }, { status: 500 })
    }

    const totalPendente = comissoes?.reduce((acc, c) => acc + (c.valor_comissao || 0), 0) || 0
    const zeradas = comissoes?.filter(c => (c.valor_comissao || 0) === 0) || []

    return NextResponse.json({
      total_comissoes: comissoes?.length || 0,
      total_valor_pendente: totalPendente,
      comissoes_zeradas: zeradas.length,
      comissoes: comissoes?.map(c => ({
        nome: (c.mentorados as any)?.nome,
        valor: c.valor_comissao,
        status: c.status_pagamento
      }))
    })

  } catch (error) {
    console.error('❌ Erro ao verificar status:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}