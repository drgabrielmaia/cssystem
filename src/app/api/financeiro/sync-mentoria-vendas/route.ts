import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando sincronização de vendas de mentoria...')

    // Executar a função de sincronização no banco
    const { data: syncResult, error: syncError } = await supabase
      .rpc('sync_mentorados_to_financeiro')

    if (syncError) {
      console.error('❌ Erro na sincronização:', syncError)
      return NextResponse.json({
        error: 'Erro ao sincronizar vendas de mentoria',
        details: syncError.message
      }, { status: 500 })
    }

    console.log('✅ Resultado da sincronização:', syncResult)

    // Buscar estatísticas atualizadas - mentorados ativos
    const { data: mentoradosAtivos, error: mentoradosError } = await supabase
      .from('mentorados')
      .select('id, organization_id, estado_atual')
      .in('estado_atual', ['ativo', 'engajado', 'pausado'])

    const { data: syncedTransactions, error: transactionsError } = await supabase
      .from('transacoes_financeiras')
      .select('valor')
      .eq('referencia_tipo', 'mentorado_receita')

    if (mentoradosError || transactionsError) {
      console.warn('⚠️ Erro ao buscar estatísticas:', { mentoradosError, transactionsError })
    }

    const totalMentorados = mentoradosAtivos?.length || 0
    const transacoesSincronizadas = syncedTransactions?.length || 0
    const valorSincronizado = syncedTransactions?.reduce((acc, t) => acc + t.valor, 0) || 0

    return NextResponse.json({
      message: syncResult || 'Sincronização concluída',
      statistics: {
        total_mentorados_ativos: totalMentorados,
        transacoes_sincronizadas: transacoesSincronizadas,
        valor_sincronizado: valorSincronizado,
        organizacoes_com_mentorados: Array.from(new Set(mentoradosAtivos?.map(m => m.organization_id) || []))
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
    // Verificar status da sincronização sem executar - usar mentorados diretamente
    const { data: mentoradosAtivos, error: mentoradosError } = await supabase
      .from('mentorados')
      .select(`
        id,
        nome_completo,
        turma,
        estado_atual,
        organization_id,
        data_entrada,
        created_at
      `)
      .in('estado_atual', ['ativo', 'engajado', 'pausado'])
      .order('created_at', { ascending: false })
      .limit(50)

    if (mentoradosError) {
      return NextResponse.json({ error: 'Erro ao buscar mentorados ativos' }, { status: 500 })
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
      .eq('referencia_tipo', 'mentorado_receita')
      .order('data_transacao', { ascending: false })
      .limit(50)

    if (transacoesError) {
      return NextResponse.json({ error: 'Erro ao buscar transações sincronizadas' }, { status: 500 })
    }

    // Calcular estatísticas por organização
    const orgStats = mentoradosAtivos?.reduce((acc, mentorado) => {
      const orgId = mentorado.organization_id
      if (!acc[orgId]) {
        acc[orgId] = {
          total_mentorados: 0,
          mentorados_sincronizados: 0
        }
      }

      acc[orgId].total_mentorados += 1

      // Verificar se está sincronizado
      const sincronizado = transacoesSincronizadas?.find(t => t.referencia_id === mentorado.id)
      if (sincronizado) {
        acc[orgId].mentorados_sincronizados += 1
      }

      return acc
    }, {} as Record<string, any>) || {}

    return NextResponse.json({
      status: 'ok',
      mentorados_ativos: mentoradosAtivos || [],
      transacoes_sincronizadas: transacoesSincronizadas || [],
      estatisticas_por_organizacao: orgStats,
      resumo: {
        total_mentorados: mentoradosAtivos?.length || 0,
        total_transacoes_sincronizadas: transacoesSincronizadas?.length || 0,
        receita_total_sincronizada: transacoesSincronizadas?.reduce((acc, t) => acc + t.valor, 0) || 0
      }
    })

  } catch (error: any) {
    console.error('Erro ao verificar status:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}