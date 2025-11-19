'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDateFilters } from '@/hooks/useDateFilters'
import { DateFilters } from '@/components/date-filters'
import { useSettings } from '@/contexts/settings'
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Target,
  UserPlus,
  CheckCircle,
  Filter,
  RefreshCw,
  FileText,
  CreditCard,
  BarChart3,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Phone,
  Clock,
  CheckSquare,
  X,
  UserX,
  Handshake
} from 'lucide-react'

export default function Dashboard() {
  const router = useRouter()
  const dateFilters = useDateFilters()
  const { settings } = useSettings()
  const [stats, setStats] = useState({
    totalMentorados: 0,
    totalCheckins: 0,
    totalFormularios: 0,
    npsMedia: 0
  })
  const [leadsStats, setLeadsStats] = useState({
    totalLeads: 0,
    valorVendido: 0,
    valorArrecadado: 0,
    leadsVendidos: 0
  })
  const [dividasStats, setDividasStats] = useState({
    totalDividas: 0,
    valorTotalPendente: 0,
    pessoasComDividas: 0
  })
  const [callsStats, setCallsStats] = useState({
    noShow: 0,
    rejeitadas: 0,
    vendidas: 0,
    totalCalls: 0,
    callsFeitas: 0
  })
  const [metasStats, setMetasStats] = useState({
    percentualFaturamento: 0,
    percentualLeads: 0
  })
  const [overdueCalls, setOverdueCalls] = useState<any[]>([])
  const [weekCalls, setWeekCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingCallStatus, setUpdatingCallStatus] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardStats()
    loadOverdueCalls()
  }, [dateFilters.filtroTempo, dateFilters.dataInicio, dateFilters.dataFim])

  const loadDashboardStats = async () => {
    try {
      const dateFilter = dateFilters.getDateFilter()

      // Buscar mentorados
      const { data: mentorados } = await supabase
        .from('mentorados')
        .select('id')

      // Buscar checkins agendados/pendentes (não realizados)
      const { data: checkins } = await supabase
        .from('checkins')
        .select('id')
        .eq('status', 'agendado')
      
      // Buscar pendências financeiras - MESMA LÓGICA DA PÁGINA DE PENDÊNCIAS
      const { data: mentoradosData } = await supabase
        .from('mentorados')
        .select('*')
        .order('nome_completo')

      const { data: despesasData } = await supabase
        .from('despesas_mensais')
        .select('*')

      let totalPendencias = 0
      let pessoasComPendencias = 0

      if (mentoradosData && despesasData) {
        const meses = [
          { key: 'agosto' }, { key: 'setembro' }, { key: 'outubro' }, { key: 'novembro' },
          { key: 'dezembro' }, { key: 'janeiro' }, { key: 'fevereiro' }, { key: 'marco' },
          { key: 'abril' }, { key: 'maio' }, { key: 'junho' }, { key: 'julho' }
        ]

        mentoradosData.forEach(mentorado => {
          const despesas = despesasData.find(d => d.nome === mentorado.nome_completo) || null
          let totalPendente = 0

          if (despesas) {
            meses.forEach(mes => {
              const valor = despesas[mes.key] || 0
              if (valor && valor > 0) {
                totalPendente += valor
              }
            })
          }

          if (totalPendente > 0) {
            totalPendencias += totalPendente
            pessoasComPendencias++
          }
        })
      }

      // Buscar todos os leads primeiro
      const { data: allLeads } = await supabase
        .from('leads')
        .select('id, status, valor_vendido, valor_arrecadado, data_primeiro_contato, convertido_em')

      let totalLeads = 0
      let valorVendido = 0
      let valorArrecadado = 0
      let leadsVendidos = 0

      if (allLeads) {
        // Filtrar leads por data_primeiro_contato para total de leads
        let leadsParaContar = allLeads
        if (dateFilter?.start || dateFilter?.end) {
          leadsParaContar = allLeads.filter(lead => {
            if (!lead.data_primeiro_contato) return false
            const leadDate = new Date(lead.data_primeiro_contato)

            if (dateFilter.start && dateFilter.end) {
              return leadDate >= new Date(dateFilter.start) && leadDate <= new Date(dateFilter.end)
            } else if (dateFilter.start) {
              return leadDate >= new Date(dateFilter.start)
            } else if (dateFilter.end) {
              return leadDate <= new Date(dateFilter.end)
            }
            return true
          })
        }
        totalLeads = leadsParaContar.length

        // Para leads vendidos, usar convertido_em se disponível, senão data_primeiro_contato
        let leadsVendidosParaContar = allLeads.filter(lead => lead.status === 'vendido')
        if (dateFilter?.start || dateFilter?.end) {
          leadsVendidosParaContar = leadsVendidosParaContar.filter(lead => {
            const dataConversao = lead.convertido_em || lead.data_primeiro_contato
            if (!dataConversao) return false
            const conversionDate = new Date(dataConversao)

            if (dateFilter.start && dateFilter.end) {
              return conversionDate >= new Date(dateFilter.start) && conversionDate <= new Date(dateFilter.end)
            } else if (dateFilter.start) {
              return conversionDate >= new Date(dateFilter.start)
            } else if (dateFilter.end) {
              return conversionDate <= new Date(dateFilter.end)
            }
            return true
          })
        }

        leadsVendidos = leadsVendidosParaContar.length
        valorVendido = leadsVendidosParaContar.reduce((sum, lead) => sum + (lead.valor_vendido || 0), 0)
        valorArrecadado = leadsVendidosParaContar.reduce((sum, lead) => sum + (lead.valor_arrecadado || 0), 0)
      }

      // Buscar calls por status (no-show, rejeitadas, vendidas)
      let noShow = 0
      let rejeitadas = 0
      let vendidas = 0
      let totalCalls = 0
      let callsFeitas = 0

      if (allLeads) {
        // Filtrar leads por data primeiro
        let leadsParaCall = allLeads
        if (dateFilter?.start || dateFilter?.end) {
          leadsParaCall = allLeads.filter(lead => {
            if (!lead.data_primeiro_contato) return false
            const leadDate = new Date(lead.data_primeiro_contato)

            if (dateFilter.start && dateFilter.end) {
              return leadDate >= new Date(dateFilter.start) && leadDate <= new Date(dateFilter.end)
            } else if (dateFilter.start) {
              return leadDate >= new Date(dateFilter.start)
            } else if (dateFilter.end) {
              return leadDate <= new Date(dateFilter.end)
            }
            return true
          })
        }

        // Contar calls por status
        leadsParaCall.forEach(lead => {
          if (lead.status === 'no-show') {
            noShow++
            // No-show NÃO conta como call realizada
          } else if (lead.status === 'rejeitado' || lead.status === 'rejeitada') {
            rejeitadas++
            totalCalls++
          } else if (lead.status === 'vendido') {
            vendidas++
            totalCalls++
            callsFeitas++
          } else if (lead.status === 'proposta_enviada') {
            // Proposta enviada conta como call feita, mas NÃO como vendida
            totalCalls++
            callsFeitas++
          } else if (lead.status === 'perdido') {
            // Perdido também conta como call já feita
            totalCalls++
            callsFeitas++
          }
        })
      }

      // Buscar pendências financeiras - MESMA LÓGICA DA PÁGINA DE PENDÊNCIAS
      const { data: mentoradosCompletos } = await supabase
        .from('mentorados')
        .select('*')
        .order('nome_completo')

      const { data: despesasDashboard } = await supabase
        .from('despesas_mensais')
        .select('*')

      let totalDividas = 0
      let valorTotalPendente = 0
      let pessoasComDividas = 0

      if (mentoradosCompletos && despesasDashboard) {
        const meses = [
          { key: 'agosto' }, { key: 'setembro' }, { key: 'outubro' }, { key: 'novembro' },
          { key: 'dezembro' }, { key: 'janeiro' }, { key: 'fevereiro' }, { key: 'marco' },
          { key: 'abril' }, { key: 'maio' }, { key: 'junho' }, { key: 'julho' }
        ]

        mentoradosCompletos.forEach(mentorado => {
          const despesas = despesasDashboard.find(d => d.nome === mentorado.nome_completo) || null
          let totalPendente = 0
          let qtdDividas = 0

          if (despesas) {
            meses.forEach(mes => {
              const valor = despesas[mes.key] || 0
              if (valor && valor > 0) {
                totalPendente += valor
                qtdDividas++
              }
            })
          }

          if (totalPendente > 0) {
            valorTotalPendente += totalPendente
            pessoasComDividas++
            totalDividas += qtdDividas
          }
        })
      }

      setStats({
        totalMentorados: mentorados?.length || 0,
        totalCheckins: checkins?.length || 0,
        totalFormularios: pessoasComPendencias,
        npsMedia: totalPendencias
      })

      setLeadsStats({
        totalLeads,
        valorVendido,
        valorArrecadado,
        leadsVendidos
      })

      setDividasStats({
        totalDividas,
        valorTotalPendente,
        pessoasComDividas
      })

      setCallsStats({
        noShow,
        rejeitadas,
        vendidas,
        totalCalls,
        callsFeitas
      })

      // Calcular percentuais das metas usando configurações
      const percentualFaturamento = settings.meta_faturamento_mes > 0
        ? Math.round((valorVendido / settings.meta_faturamento_mes) * 100)
        : 0
      const percentualLeads = settings.meta_vendas_mes > 0
        ? Math.round((leadsVendidos / settings.meta_vendas_mes) * 100)
        : 0

      setMetasStats(prev => ({
        ...prev,
        percentualFaturamento,
        percentualLeads
      }))

    } catch (error) {
      console.error('Erro ao carregar stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Carregar calls atrasadas
  const loadOverdueCalls = async () => {
    try {
      const today = new Date()
      today.setHours(23, 59, 59, 999) // Final do dia para comparação

      // Aplicar o mesmo filtro de período que está sendo usado no dashboard
      const dateFilter = dateFilters.getDateFilter()

      // Buscar leads com status 'call_agendada' no período filtrado
      let leadsQuery = supabase
        .from('leads')
        .select('*')
        .eq('status', 'call_agendada')
        .order('updated_at', { ascending: true })

      // Aplicar filtro de período se existir
      if (dateFilter?.start) {
        leadsQuery = leadsQuery.gte('created_at', dateFilter.start)
      }
      if (dateFilter?.end) {
        leadsQuery = leadsQuery.lte('created_at', dateFilter.end)
      }

      const { data: leadsCallAgendada, error } = await leadsQuery
      if (error) throw error

      // Buscar follow-ups de call que já passaram do prazo (independente do filtro de período)
      const { data: overdueFollowups, error: followupError } = await supabase
        .from('lead_followups')
        .select(`
          *,
          lead:leads (*)
        `)
        .eq('tipo', 'call')
        .eq('status', 'pendente')
        .lt('data_agendada', today.toISOString())
        .order('data_agendada', { ascending: true })

      if (followupError) throw followupError

      // Filtrar leads call_agendada que estão há mais de 2 dias OU que têm follow-ups atrasados
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      twoDaysAgo.setHours(23, 59, 59, 999)

      const overdueLeads = (leadsCallAgendada || []).filter(lead => {
        const updatedDate = new Date(lead.updated_at)
        return updatedDate < twoDaysAgo
      })

      // Combinar leads atrasados e follow-ups atrasados
      const combined = [
        ...overdueLeads.map(lead => ({
          ...lead,
          type: 'lead',
          overdueReason: `Call agendada em ${new Date(lead.updated_at).toLocaleDateString('pt-BR')} (há mais de 2 dias)`,
          daysOverdue: Math.floor((today.getTime() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24))
        })),
        ...(overdueFollowups || []).map(followup => ({
          ...followup.lead,
          type: 'followup',
          followupId: followup.id,
          overdueReason: `Call agendada para ${new Date(followup.data_agendada).toLocaleDateString('pt-BR')}`,
          daysOverdue: Math.floor((today.getTime() - new Date(followup.data_agendada).getTime()) / (1000 * 60 * 60 * 24))
        }))
      ]

      // Remover duplicatas por ID do lead e filtrar apenas calls realmente atrasadas
      const unique = combined
        .filter((item, index, self) => index === self.findIndex(t => t.id === item.id))
        .filter(item => item.daysOverdue > 0) // Garantir que está realmente atrasado

      // Debug: Log para verificar os dados
      console.log('📞 CALLS ATRASADAS DEBUG:')
      console.log(`- Leads com call_agendada no período: ${leadsCallAgendada?.length || 0}`)
      console.log(`- Leads call_agendada há mais de 2 dias: ${overdueLeads.length}`)
      console.log(`- Follow-ups atrasados: ${overdueFollowups?.length || 0}`)
      console.log(`- Total calls atrasadas (únicos): ${unique.length}`)
      console.log(`- Filtro de período ativo: ${dateFilter ? JSON.stringify({start: dateFilter.start?.substring(0,10), end: dateFilter.end?.substring(0,10)}) : 'Nenhum'}`)

      setOverdueCalls(unique)

      // Carregar calls da semana (segunda a domingo)
      const now = new Date()

      // Início da semana (segunda-feira)
      const startOfWeek = new Date(now)
      const dayOfWeek = startOfWeek.getDay() // 0 = domingo, 1 = segunda, etc
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Se domingo (0), volta 6 dias; senão, volta (dia - 1)
      startOfWeek.setDate(now.getDate() - daysToSubtract)
      startOfWeek.setHours(0, 0, 0, 0)

      // Fim da semana (domingo)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      // Buscar follow-ups de call desta semana
      const { data: weekFollowups, error: weekError } = await supabase
        .from('lead_followups')
        .select(`
          *,
          lead:leads (*)
        `)
        .eq('tipo', 'call')
        .gte('data_agendada', startOfWeek.toISOString())
        .lte('data_agendada', endOfWeek.toISOString())
        .order('data_agendada', { ascending: true })

      if (weekError) throw weekError

      // Buscar leads com call_agendada do período filtrado
      let weekLeadsQuery = supabase
        .from('leads')
        .select('*')
        .eq('status', 'call_agendada')

      // Aplicar filtro de período se existir
      if (dateFilter?.start) {
        weekLeadsQuery = weekLeadsQuery.gte('created_at', dateFilter.start)
      }
      if (dateFilter?.end) {
        weekLeadsQuery = weekLeadsQuery.lte('created_at', dateFilter.end)
      }

      const { data: weekLeadsCallAgendada, error: leadsError } = await weekLeadsQuery
      if (leadsError) throw leadsError

      const weekCombined = [
        ...(weekFollowups || []).map(followup => ({
          ...followup.lead,
          type: 'followup',
          followupId: followup.id,
          scheduledDate: followup.data_agendada,
          isScheduled: true
        })),
        ...(weekLeadsCallAgendada || []).map(lead => ({
          ...lead,
          type: 'lead',
          isScheduled: true,
          scheduledDate: lead.updated_at
        }))
      ]

      // Remover duplicatas por ID do lead
      const uniqueWeek = weekCombined.filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id)
      )

      // Debug: Log para verificar as calls da semana
      console.log('📅 CALLS DA SEMANA DEBUG:')
      console.log(`- Período da semana: ${startOfWeek.toLocaleDateString('pt-BR')} até ${endOfWeek.toLocaleDateString('pt-BR')}`)
      console.log(`- Follow-ups de call da semana: ${weekFollowups?.length || 0}`)
      console.log(`- Leads call_agendada: ${weekLeadsCallAgendada?.length || 0}`)
      console.log(`- Total calls da semana (únicos): ${uniqueWeek.length}`)

      setWeekCalls(uniqueWeek)

    } catch (error) {
      console.error('Erro ao carregar calls atrasadas:', error)
    }
  }

  // Atualizar status de call
  const updateCallStatus = async (leadId: string, newStatus: string, followupId: string | null = null) => {
    try {
      setUpdatingCallStatus(leadId)

      // Atualizar status do lead
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)

      if (leadError) throw leadError

      // Se houver follow-up associado, marcar como concluído
      if (followupId) {
        const { error: followupError } = await supabase
          .from('lead_followups')
          .update({
            status: 'concluido',
            resultado: `Status atualizado para: ${getStatusLabel(newStatus)}`
          })
          .eq('id', followupId)

        if (followupError) throw followupError
      }

      // Recarregar dados
      await loadOverdueCalls()
      await loadDashboardStats()

    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status da call')
    } finally {
      setUpdatingCallStatus(null)
    }
  }

  // Helper para obter label do status
  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'proposta_enviada': 'Proposta Enviada',
      'vendido': 'Vendido',
      'perdido': 'Perdido',
      'no_show': 'No Show'
    }
    return labels[status] || status
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Função para navegar para as páginas
  const navigateTo = (path: string) => {
    router.push(path)
  }

  // Componente Card Minimalista
  const MinimalStatsCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    onClick,
    loading,
    trend
  }: {
    title: string
    value: string | number
    subtitle?: string
    icon: any
    onClick: () => void
    loading: boolean
    trend?: 'up' | 'down' | 'neutral'
  }) => (
    <div
      className="premium-card p-6 cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium chrome-text uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold holographic-text">
              {loading ? (
                <div className="h-8 w-20 bg-gradient-to-r from-gray-700 to-gray-600 rounded animate-pulse"></div>
              ) : (
                typeof value === 'number' ? value.toLocaleString() : value
              )}
            </p>
            {subtitle && (
              <p className="text-sm chrome-text opacity-80">{subtitle}</p>
            )}
          </div>
          <div className="ml-6">
            <div className="w-14 h-14 bg-gradient-to-br from-neon-blue/20 to-electric-purple/20 rounded-xl flex items-center justify-center border border-neon-blue/30 group-hover:scale-110 transition-all duration-300 pulse-neon">
              <Icon className="h-7 w-7 text-neon-blue" />
            </div>
          </div>
        </div>

        {/* Linha de progresso premium */}
        <div className="w-full h-0.5 bg-gradient-to-r from-neon-blue via-electric-purple to-magenta-neon opacity-60 rounded-full"></div>
      </div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto min-h-screen relative">
      {/* Premium Grid Overlay */}
      <div className="absolute inset-0 premium-grid-overlay pointer-events-none z-0"></div>

      <Header
        title={<span className="holographic-text">NEURAL COMMAND CENTER</span>}
        subtitle={<span className="chrome-text">Sistema de Análise Avançada</span>}
      />

      <main className="relative z-10 flex-1 p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Filtros Avançados */}
        <DateFilters
          filtroTempo={dateFilters.filtroTempo}
          dataInicio={dateFilters.dataInicio}
          dataFim={dateFilters.dataFim}
          setFiltroTempo={dateFilters.setFiltroTempo}
          setDataInicio={dateFilters.setDataInicio}
          setDataFim={dateFilters.setDataFim}
          resetFilters={dateFilters.resetFilters}
        />

        {/* Dashboard Principal */}
        <div className="space-y-8">
          {/* Metas do Mês - Seção de Destaque */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold">🎯 Metas do Mês</h2>
                <p className="text-green-100 mt-1">Acompanhe nosso progresso em tempo real</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-green-100">Período</div>
                <div className="text-lg font-semibold">
                  {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Meta Faturamento */}
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <DollarSign className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Faturamento</h3>
                      <p className="text-sm text-green-100">Meta mensal</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{metasStats.percentualFaturamento}%</div>
                    <div className="text-sm text-green-100">da meta</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Realizado: {formatCurrency(leadsStats.valorVendido)}</span>
                    <span>Meta: {formatCurrency(settings.meta_faturamento_mes)}</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3">
                    <div
                      className="bg-yellow-400 h-3 rounded-full transition-all duration-500"
                      style={{width: `${Math.min(metasStats.percentualFaturamento, 100)}%`}}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Meta Leads */}
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Target className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Leads Vendidos</h3>
                      <p className="text-sm text-green-100">Meta mensal</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{metasStats.percentualLeads}%</div>
                    <div className="text-sm text-green-100">da meta</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Vendidos: {leadsStats.leadsVendidos}</span>
                    <span>Meta: {settings.meta_vendas_mes}</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3">
                    <div
                      className="bg-yellow-400 h-3 rounded-full transition-all duration-500"
                      style={{width: `${Math.min(metasStats.percentualLeads, 100)}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Métricas Principais */}
          <div className="space-y-6">
            <div className="border-b border-neon-blue/30 pb-6">
              <h2 className="text-3xl font-bold holographic-text">
                📊 MÉTRICAS NEURAIS
              </h2>
              <p className="chrome-text mt-2 uppercase tracking-wider text-sm">
                Indicadores-chave do sistema avançado
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <MinimalStatsCard
                title="Total Mentorados"
                value={stats.totalMentorados}
                subtitle="Gerenciar mentorados"
                icon={Users}
                onClick={() => navigateTo('/mentorados')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Check-ins Agendados"
                value={stats.totalCheckins}
                subtitle="Visualizar check-ins"
                icon={Calendar}
                onClick={() => navigateTo('/checkins')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Pessoas c/ Pendências"
                value={dividasStats.pessoasComDividas}
                subtitle="Ver pendências"
                icon={CreditCard}
                onClick={() => navigateTo('/pendencias')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Total de Leads"
                value={leadsStats.totalLeads}
                subtitle="Gerenciar leads"
                icon={Target}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />
            </div>
          </div>

          {/* Análise Financeira */}
          <div className="space-y-6">
            <div className="border-b border-electric-purple/30 pb-6">
              <h2 className="text-3xl font-bold holographic-text">
                💰 ANÁLISE FINANCEIRA NEURAL
              </h2>
              <p className="chrome-text mt-2 uppercase tracking-wider text-sm">
                Status financeiro e fluxo de pagamentos
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MinimalStatsCard
                title="Total de Dívidas"
                value={dividasStats.totalDividas}
                subtitle="Ver detalhes"
                icon={TrendingUp}
                onClick={() => navigateTo('/pendencias')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Valor Pendente"
                value={formatCurrency(dividasStats.valorTotalPendente)}
                subtitle="Total em aberto"
                icon={DollarSign}
                onClick={() => navigateTo('/pendencias')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Taxa de Pendências"
                value={stats.totalMentorados > 0 ? `${Math.round((dividasStats.pessoasComDividas / stats.totalMentorados) * 100)}%` : '0%'}
                subtitle="% com dívidas"
                icon={BarChart3}
                onClick={() => navigateTo('/pendencias')}
                loading={loading}
              />
            </div>
          </div>

          {/* Performance de Vendas */}
          <div className="space-y-6">
            <div className="border-b border-magenta-neon/30 pb-6">
              <h2 className="text-3xl font-bold holographic-text">
                🚀 PERFORMANCE DE VENDAS NEURAL
                {dateFilters.hasActiveFilter && (
                  <span className="text-lg chrome-text ml-3 font-normal opacity-80">
                    › FILTRO ATIVO
                  </span>
                )}
              </h2>
              <p className="chrome-text mt-2 uppercase tracking-wider text-sm">
                Conversões e análise de leads avançada
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <MinimalStatsCard
                title="Total de Leads"
                value={leadsStats.totalLeads}
                subtitle="Todos os prospects"
                icon={UserPlus}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Leads Convertidos"
                value={leadsStats.leadsVendidos}
                subtitle={
                  leadsStats.totalLeads > 0
                    ? `${Math.round((leadsStats.leadsVendidos / leadsStats.totalLeads) * 100)}% conversão`
                    : 'Taxa de conversão'
                }
                icon={CheckCircle}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Valor Vendido"
                value={formatCurrency(leadsStats.valorVendido)}
                subtitle="Receita total"
                icon={Target}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Valor Recebido"
                value={formatCurrency(leadsStats.valorArrecadado)}
                subtitle={
                  leadsStats.valorVendido > 0
                    ? `${Math.round((leadsStats.valorArrecadado / leadsStats.valorVendido) * 100)}% recebido`
                    : '% recebido'
                }
                icon={DollarSign}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />
            </div>
          </div>

          {/* Performance de Calls */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-semibold text-gray-900">
                Performance de Calls
                {dateFilters.hasActiveFilter && (
                  <span className="text-lg text-gray-500 ml-2 font-normal">
                    - Filtro aplicado
                  </span>
                )}
              </h2>
              <p className="text-gray-600 mt-1">
                Resultado das chamadas realizadas
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
              <MinimalStatsCard
                title="Calls Feitas"
                value={callsStats.callsFeitas}
                subtitle="Propostas + vendidas + perdidas"
                icon={TrendingUp}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />

              <MinimalStatsCard
                title="No-show"
                value={callsStats.noShow}
                subtitle="Não compareceram"
                icon={Users}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Rejeitadas"
                value={callsStats.rejeitadas}
                subtitle="Não interessados"
                icon={Target}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Vendidas"
                value={callsStats.vendidas}
                subtitle="Convertidas em venda"
                icon={CheckCircle}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Taxa de Conversão"
                value={callsStats.totalCalls > 0 ? `${Math.round((callsStats.vendidas / callsStats.totalCalls) * 100)}%` : '0%'}
                subtitle={`${callsStats.totalCalls} calls total`}
                icon={BarChart3}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />
            </div>
          </div>
        </div>

        {/* Calls Atrasadas */}
        {overdueCalls.length > 0 && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h2 className="text-2xl font-semibold text-red-700">
                  ⚠️ Calls Atrasadas ({overdueCalls.length})
                </h2>
              </div>
              <p className="text-gray-600 mt-1">
                Leads que passaram da data da call e precisam de atualização urgente
              </p>
            </div>

            <div className="space-y-3">
              {overdueCalls.map((call) => (
                <Card key={call.id} className="border-l-4 border-l-red-500 bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-red-600" />
                            <h3 className="font-semibold text-gray-900">{call.nome_completo}</h3>
                          </div>
                          <Badge variant="destructive" className="text-xs">
                            {call.daysOverdue} dias atrás
                          </Badge>
                        </div>

                        <div className="text-sm text-gray-600 mb-2">
                          {call.empresa && (
                            <span className="mr-4">🏢 {call.empresa}</span>
                          )}
                          {call.telefone && (
                            <span className="mr-4">📞 {call.telefone}</span>
                          )}
                        </div>

                        <div className="text-xs text-red-700 mb-3">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {call.overdueReason}
                        </div>

                        <div className="text-xs text-gray-500">
                          Como foi a call? Atualize o status:
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                          onClick={() => updateCallStatus(call.id, 'proposta_enviada', call.followupId)}
                          disabled={updatingCallStatus === call.id}
                        >
                          <Handshake className="h-3 w-3 mr-1" />
                          Proposta Enviada
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                          onClick={() => updateCallStatus(call.id, 'vendido', call.followupId)}
                          disabled={updatingCallStatus === call.id}
                        >
                          <CheckSquare className="h-3 w-3 mr-1" />
                          Vendido
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                          onClick={() => updateCallStatus(call.id, 'perdido', call.followupId)}
                          disabled={updatingCallStatus === call.id}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Perdido
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                          onClick={() => updateCallStatus(call.id, 'no_show', call.followupId)}
                          disabled={updatingCallStatus === call.id}
                        >
                          <UserX className="h-3 w-3 mr-1" />
                          No Show
                        </Button>

                        {updatingCallStatus === call.id && (
                          <div className="flex items-center">
                            <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Botão para ver todos os leads */}
            <div className="text-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => navigateTo('/leads')}
                className="hover:bg-gray-50"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver todos os leads
              </Button>
            </div>
          </div>
        )}

        {/* Calls desta Semana */}
        <div className="space-y-6">
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h2 className="text-2xl font-semibold text-blue-700">
                📅 Calls desta Semana ({weekCalls.length})
              </h2>
            </div>
            <p className="text-gray-600 mt-1">
              Todos os leads agendados para call até domingo
            </p>
          </div>

          {weekCalls.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {weekCalls.map((call) => (
                <Card key={call.id} className="border-l-4 border-l-blue-500 bg-blue-50/30">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-blue-600" />
                        <h3 className="font-semibold text-gray-900 text-sm">{call.nome_completo}</h3>
                      </div>

                      <div className="text-xs text-gray-600">
                        {call.empresa && (
                          <span className="block">🏢 {call.empresa}</span>
                        )}
                        {call.telefone && (
                          <span className="block">📞 {call.telefone}</span>
                        )}
                      </div>

                      {call.scheduledDate && (
                        <div className="text-xs text-blue-700">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {call.type === 'followup'
                            ? new Date(call.scheduledDate).toLocaleDateString('pt-BR', {
                                weekday: 'short', day: '2-digit', month: 'short',
                                hour: '2-digit', minute: '2-digit'
                              })
                            : 'Call agendada'
                          }
                        </div>
                      )}

                      <Badge variant="outline" className="text-xs">
                        Status: {call.status}
                      </Badge>

                      {/* Botões de ação rápida para calls desta semana também */}
                      <div className="flex gap-1 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-6 px-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                          onClick={() => updateCallStatus(call.id, 'vendido', call.followupId)}
                          disabled={updatingCallStatus === call.id}
                        >
                          ✓ Vendido
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-6 px-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                          onClick={() => updateCallStatus(call.id, 'proposta_enviada', call.followupId)}
                          disabled={updatingCallStatus === call.id}
                        >
                          📄 Proposta
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center p-8">
              <CardContent>
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma call agendada esta semana
                </h3>
                <p className="text-gray-500 mb-4">
                  Que tal agendar algumas calls para converter mais leads?
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigateTo('/leads')}
                  className="hover:bg-gray-50"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver leads disponíveis
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Estatísticas rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-blue-600">{weekCalls.length}</div>
              <div className="text-sm text-gray-600">Calls esta semana</div>
            </Card>
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-red-600">{overdueCalls.length}</div>
              <div className="text-sm text-gray-600">Calls atrasadas</div>
            </Card>
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-green-600">
                {callsStats.vendidas || 0}
              </div>
              <div className="text-sm text-gray-600">Calls vendidas (período)</div>
            </Card>
          </div>
        </div>

        {/* Navegação Rápida */}
        <div className="space-y-6">
          <div className="border-b border-gray-200 pb-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              Navegação Rápida
            </h2>
            <p className="text-gray-600 mt-1">
              Acesso direto às funcionalidades
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'Mentorados', path: '/mentorados' },
              { icon: Calendar, label: 'Check-ins', path: '/checkins' },
              { icon: CreditCard, label: 'Pendências', path: '/pendencias' },
              { icon: Target, label: 'Leads', path: '/leads' },
              { icon: FileText, label: 'Formulários', path: '/formularios' },
              { icon: BarChart3, label: 'Calendário', path: '/calendario' },
              { icon: DollarSign, label: 'Despesas', path: '/despesas' }
            ].map((item, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-20 flex-col space-y-2 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group"
                onClick={() => navigateTo(item.path)}
              >
                <item.icon className="h-5 w-5 text-gray-600 group-hover:text-gray-900 transition-colors duration-200" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                  {item.label}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}