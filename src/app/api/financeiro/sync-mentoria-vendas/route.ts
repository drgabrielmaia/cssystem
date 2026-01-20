import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando sincronização de vendas de mentoria...')

    // Executar a função de sincronização no banco
    const { data: syncResult, error: syncError } = await supabase
      .rpc('sync_mentoria_vendas_to_financeiro')

    if (syncError) {
      console.error('❌ Erro na sincronização:', syncError)
      return NextResponse.json({
        error: 'Erro ao sincronizar vendas de mentoria',
        details: syncError.message
      }, { status: 500 })
    }

    console.log('✅ Resultado da sincronização:', syncResult)

    // Buscar estatísticas atualizadas
    const { data: stats, error: statsError } = await supabase
      .from('mentoria_vendas')
      .select(`
        id,
        valor_mentoria,
        status_pagamento,
        organization_id
      `)

    const { data: syncedTransactions, error: transactionsError } = await supabase
      .from('transacoes_financeiras')
      .select('valor')
      .eq('referencia_tipo', 'mentoria_venda')

    if (statsError || transactionsError) {
      console.warn('⚠️ Erro ao buscar estatísticas:', { statsError, transactionsError })
    }

    const totalVendas = stats?.length || 0
    const vendasPagas = stats?.filter(v => v.status_pagamento === 'pago').length || 0
    const receituTotal = stats?.reduce((acc, v) => acc + (v.status_pagamento === 'pago' ? v.valor_mentoria : 0), 0) || 0
    const transacoesSincronizadas = syncedTransactions?.length || 0
    const valorSincronizado = syncedTransactions?.reduce((acc, t) => acc + t.valor, 0) || 0

    return NextResponse.json({
      message: syncResult || 'Sincronização concluída',
      statistics: {
        total_vendas_mentoria: totalVendas,
        vendas_pagas: vendasPagas,
        receita_total: receituTotal,
        transacoes_sincronizadas: transacoesSincronizadas,
        valor_sincronizado: valorSincronizado,
        organizacoes_com_vendas: Array.from(new Set(stats?.map(s => s.organization_id) || []))
      }
    })

  } catch (error: any) {
    console.error('💥 Erro crítico na sincronização:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar status da sincronização sem executar
    const { data: vendasMentoria, error: vendasError } = await supabase
      .from('mentoria_vendas')
      .select(`
        id,
        valor_mentoria,
        status_pagamento,
        data_venda,
        organization_id,
        plano_mentoria,
        mentorados:mentorados!inner(nome_completo, organization_id)
      `)
      .eq('status_pagamento', 'pago')
      .order('data_venda', { ascending: false })
      .limit(50)

    if (vendasError) {
      return NextResponse.json({ error: 'Erro ao buscar vendas de mentoria' }, { status: 500 })
    }

    const { data: transacoesSincronizadas, error: transacoesError } = await supabase
      .from('transacoes_financeiras')
      .select(`
        id,
        valor,
        data_transacao,
        organization_id,
        descricao,
        referencia_id
      `)
      .eq('referencia_tipo', 'mentoria_venda')
      .order('data_transacao', { ascending: false })
      .limit(50)

    if (transacoesError) {
      return NextResponse.json({ error: 'Erro ao buscar transações sincronizadas' }, { status: 500 })
    }

    // Calcular estatísticas por organização
    const orgStats = vendasMentoria?.reduce((acc, venda) => {
      const orgId = venda.organization_id
      if (!acc[orgId]) {
        acc[orgId] = {
          total_vendas: 0,
          receita_total: 0,
          vendas_sincronizadas: 0
        }
      }

      acc[orgId].total_vendas += 1
      acc[orgId].receita_total += venda.valor_mentoria

      // Verificar se está sincronizada
      const sincronizada = transacoesSincronizadas?.find(t => t.referencia_id === venda.id)
      if (sincronizada) {
        acc[orgId].vendas_sincronizadas += 1
      }

      return acc
    }, {} as Record<string, any>) || {}

    return NextResponse.json({
      status: 'ok',
      vendas_mentoria: vendasMentoria || [],
      transacoes_sincronizadas: transacoesSincronizadas || [],
      estatisticas_por_organizacao: orgStats,
      resumo: {
        total_vendas: vendasMentoria?.length || 0,
        total_transacoes_sincronizadas: transacoesSincronizadas?.length || 0,
        receita_total_vendas: vendasMentoria?.reduce((acc, v) => acc + v.valor_mentoria, 0) || 0,
        receita_total_sincronizada: transacoesSincronizadas?.reduce((acc, t) => acc + t.valor, 0) || 0
      }
    })

  } catch (error: any) {
    console.error('Erro ao verificar status:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}