import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'

interface ChatBotMetrics {
  faturamentoHoje: number
  faturamentoMes: number
  leadsHoje: number
  leadsSemana: number
  callsAgendadas: number
  callsFechadas: number
  totalCalls: number
  ticketMedio: number
  metaDiaria: number
  metaSemanal: number
}

export function useChatBotData() {
  const [metrics, setMetrics] = useState<ChatBotMetrics>({
    faturamentoHoje: 0,
    faturamentoMes: 0,
    leadsHoje: 0,
    leadsSemana: 0,
    callsAgendadas: 0,
    callsFechadas: 0,
    totalCalls: 0,
    ticketMedio: 0,
    metaDiaria: 2000,
    metaSemanal: 150
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
      const inicioSemana = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Buscar leads de hoje
      const { data: leadsHojeData } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', organizationId)
        .gte('created_at', inicioHoje.toISOString())

      // Buscar leads da semana
      const { data: leadsSemanaData } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', organizationId)
        .gte('created_at', inicioSemana.toISOString())

      // Buscar eventos de hoje (calls agendadas)
      const { data: eventsHoje } = await supabase
        .from('calendar_events')
        .select('id, status')
        .eq('organization_id', organizationId)
        .gte('start_time', inicioHoje.toISOString())
        .lt('start_time', new Date(inicioHoje.getTime() + 24 * 60 * 60 * 1000).toISOString())

      // Buscar vendas do mês (assumindo que vendas estão em uma tabela de vendas ou comissões)
      const { data: vendasMes } = await supabase
        .from('comissoes')
        .select('valor_venda')
        .eq('organization_id', organizationId)
        .gte('created_at', inicioMes.toISOString())
        .eq('status', 'pago')

      // Buscar vendas de hoje
      const { data: vendasHoje } = await supabase
        .from('comissoes')
        .select('valor_venda')
        .eq('organization_id', organizationId)
        .gte('created_at', inicioHoje.toISOString())
        .eq('status', 'pago')

      // Calcular métricas
      const callsAgendadas = eventsHoje?.length || 0
      const callsFechadas = eventsHoje?.filter(e => e.status === 'completed').length || 0
      
      const faturamentoMes = vendasMes?.reduce((sum, venda) => sum + (venda.valor_venda || 0), 0) || 0
      const faturamentoHoje = vendasHoje?.reduce((sum, venda) => sum + (venda.valor_venda || 0), 0) || 0
      
      const ticketMedio = callsFechadas > 0 ? faturamentoHoje / callsFechadas : 0

      setMetrics({
        faturamentoHoje,
        faturamentoMes,
        leadsHoje: leadsHojeData?.length || 0,
        leadsSemana: leadsSemanaData?.length || 0,
        callsAgendadas,
        callsFechadas,
        totalCalls: callsAgendadas,
        ticketMedio,
        metaDiaria: 2000,
        metaSemanal: 150
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