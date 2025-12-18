import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Buscar todas as comissões pagas que ainda não foram sincronizadas
    const { data: comissoesPagas, error: comissoesError } = await supabase
      .from('comissoes')
      .select(`
        id,
        valor_comissao,
        data_pagamento,
        mentorados:mentorados!inner(nome)
      `)
      .eq('status_pagamento', 'pago')
      .not('data_pagamento', 'is', null)

    if (comissoesError) {
      console.error('Erro ao buscar comissões:', comissoesError)
      return NextResponse.json({ error: 'Erro ao buscar comissões' }, { status: 500 })
    }

    if (!comissoesPagas || comissoesPagas.length === 0) {
      return NextResponse.json({ message: 'Nenhuma comissão para sincronizar' })
    }

    let sincronizadas = 0

    for (const comissao of comissoesPagas) {
      // Verificar se já existe uma transação financeira para esta comissão
      const { data: transacaoExistente } = await supabase
        .from('transacoes_financeiras')
        .select('id')
        .eq('referencia_id', comissao.id)
        .eq('referencia_tipo', 'comissao')
        .single()

      if (transacaoExistente) {
        continue // Já sincronizada
      }

      // Criar transação financeira como saída (pagamento de comissão)
      const { error: insertError } = await supabase
        .from('transacoes_financeiras')
        .insert({
          tipo: 'saida',
          valor: comissao.valor_comissao,
          descricao: `Comissão paga - ${(comissao.mentorados as any)?.nome}`,
          categoria: 'Comissões',
          data_transacao: comissao.data_pagamento,
          status: 'pago',
          fornecedor: (comissao.mentorados as any)?.nome,
          referencia_id: comissao.id,
          referencia_tipo: 'comissao'
        })

      if (insertError) {
        console.error(`Erro ao sincronizar comissão ${comissao.id}:`, insertError)
        continue
      }

      sincronizadas++
    }

    return NextResponse.json({
      message: `${sincronizadas} comissões sincronizadas com sucesso`,
      sincronizadas
    })

  } catch (error) {
    console.error('Erro na sincronização:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function GET() {
  // Endpoint para verificar o status da sincronização
  try {
    const { data: totalComissoes } = await supabase
      .from('comissoes')
      .select('id', { count: 'exact' })
      .eq('status_pagamento', 'pago')

    const { data: comissoesSincronizadas } = await supabase
      .from('transacoes_financeiras')
      .select('id', { count: 'exact' })
      .eq('referencia_tipo', 'comissao')

    return NextResponse.json({
      total_comissoes_pagas: totalComissoes?.length || 0,
      comissoes_sincronizadas: comissoesSincronizadas?.length || 0,
      pendentes: (totalComissoes?.length || 0) - (comissoesSincronizadas?.length || 0)
    })

  } catch (error) {
    console.error('Erro ao verificar status:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}