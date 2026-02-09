import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'

interface ChatBotMetrics {
  faturamentoHoje: number
  faturamentoMes: number
  faturamentoMesPassado: number
  leadsHoje: number
  leadsSemana: number
  callsAgendadas: number
  callsFechadas: number
  totalCalls: number
  ticketMedio: number
  metaDiaria: number
  metaSemanal: number
  crescimentoMensal: number
  totalEntradas: number
  totalSaidas: number
  saldoAtual: number
  receitaMentoria: number
  comissoesPagas: number
}

export function useChatBotData() {
  const [metrics, setMetrics] = useState<ChatBotMetrics>({
    faturamentoHoje: 0,
    faturamentoMes: 0,
    faturamentoMesPassado: 0,
    leadsHoje: 0,
    leadsSemana: 0,
    callsAgendadas: 0,
    callsFechadas: 0,
    totalCalls: 0,
    ticketMedio: 0,
    metaDiaria: 2000,
    metaSemanal: 150,
    crescimentoMensal: 0,
    totalEntradas: 0,
    totalSaidas: 0,
    saldoAtual: 0,
    receitaMentoria: 0,
    comissoesPagas: 0
  })
  const [loading, setLoading] = useState(false)
  const { organizationId } = useAuth()

  const fetchMetrics = async () => {
    if (!organizationId) return
    
    setLoading(true)
    try {
      const hoje = new Date()
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
      const fimMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
      const inicioSemana = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000)

      // DADOS FINANCEIROS REAIS - igual ao dashboard
      // TEMPORÁRIO: Sem filtro organization_id até executar migração
      // TODO: Após executar add_organization_to_financial_tables.sql, descomentar os .eq('organization_id', organizationId)
      
      // Transações do mês atual
      const { data: transacoesMes } = await supabase
        .from('transacoes_financeiras')
        .select(`
          tipo, 
          valor, 
          automatico,
          categoria:categorias_financeiras(nome, tipo)
        `)
        .eq('organization_id', organizationId) // Ativado após migração
        .gte('data_transacao', inicioMes.toISOString().split('T')[0])

      // Transações do mês passado
      const { data: transacoesMesPassado } = await supabase
        .from('transacoes_financeiras')
        .select('tipo, valor, automatico')
        .eq('organization_id', organizationId) // Ativado após migração
        .gte('data_transacao', mesPassado.toISOString().split('T')[0])
        .lte('data_transacao', fimMesPassado.toISOString().split('T')[0])

      // Transações de hoje
      const { data: transacoesHoje } = await supabase
        .from('transacoes_financeiras')
        .select('tipo, valor')
        .eq('organization_id', organizationId) // Ativado após migração
        .eq('data_transacao', hoje.toISOString().split('T')[0])

      // Buscar leads
      const { data: leadsHojeData } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', organizationId)
        .gte('created_at', inicioHoje.toISOString())

      const { data: leadsSemanaData } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', organizationId)
        .gte('created_at', inicioSemana.toISOString())

      // Buscar eventos de hoje (calls)
      const { data: eventsHoje } = await supabase
        .from('calendar_events')
        .select('id, call_status')
        .eq('organization_id', organizationId)
        .gte('start_datetime', inicioHoje.toISOString())
        .lt('start_datetime', new Date(inicioHoje.getTime() + 24 * 60 * 60 * 1000).toISOString())

      // CALCULAR MÉTRICAS FINANCEIRAS
      let totalEntradas = 0
      let totalSaidas = 0
      let entradasMesPassado = 0
      let saidasMesPassado = 0
      let receitaMentoria = 0
      let comissoesPagas = 0

      transacoesMes?.forEach(t => {
        if (t.tipo === 'entrada') {
          totalEntradas += t.valor
          if ((t.categoria as any)?.nome === 'Mentoria') {
            receitaMentoria += t.valor
          }
        } else {
          totalSaidas += t.valor
          if ((t.categoria as any)?.nome === 'Comissões Pagas') {
            comissoesPagas += t.valor
          }
        }
      })

      transacoesMesPassado?.forEach(t => {
        if (t.tipo === 'entrada') entradasMesPassado += t.valor
        else saidasMesPassado += t.valor
      })

      const faturamentoHoje = transacoesHoje?.filter(t => t.tipo === 'entrada').reduce((sum, t) => sum + t.valor, 0) || 0
      const faturamentoMes = totalEntradas
      const faturamentoMesPassado = entradasMesPassado
      const saldoAtual = totalEntradas - totalSaidas
      const saldoMesPassado = entradasMesPassado - saidasMesPassado
      const crescimentoMensal = saldoMesPassado > 0 ? ((saldoAtual - saldoMesPassado) / saldoMesPassado) * 100 : 0

      // Calcular calls
      const callsAgendadas = eventsHoje?.length || 0
      const callsFechadas = eventsHoje?.filter(e => e.call_status === 'completed').length || 0
      const ticketMedio = callsFechadas > 0 ? faturamentoHoje / callsFechadas : (totalEntradas / (transacoesMes?.filter(t => t.tipo === 'entrada').length || 1))

      setMetrics({
        faturamentoHoje,
        faturamentoMes,
        faturamentoMesPassado,
        leadsHoje: leadsHojeData?.length || 0,
        leadsSemana: leadsSemanaData?.length || 0,
        callsAgendadas,
        callsFechadas,
        totalCalls: callsAgendadas,
        ticketMedio,
        metaDiaria: 2000,
        metaSemanal: 150,
        crescimentoMensal,
        totalEntradas,
        totalSaidas,
        saldoAtual,
        receitaMentoria,
        comissoesPagas
      })

    } catch (error) {
      console.error('Erro ao buscar métricas do chatbot:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [organizationId])

  return {
    metrics,
    loading,
    refetch: fetchMetrics
  }
}