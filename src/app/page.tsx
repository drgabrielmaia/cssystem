'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from '@/components/AuthGuard'
import { PageLayout } from '@/components/ui/page-layout'
import { KPICardVibrant } from '@/components/ui/kpi-card-vibrant'
import { MetricCard } from '@/components/ui/metric-card'
import { PeriodFilter } from '@/components/ui/period-filter'
import { ChartCard } from '@/components/ui/chart-card'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { DollarSign, Target, Users, Calendar, AlertCircle, UserPlus, Phone, MoreVertical } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts'
import { supabase } from '@/lib/supabase'

interface KPIData {
  total_vendas: number
  valor_arrecadado: number
  meta_vendas: number
  total_leads: number
  leads_vendidos: number
  total_mentorados: number
  checkins_agendados: number
  pendencias: number
  taxa_conversao: number
}

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [chartPeriod, setChartPeriod] = useState('monthly') // Estado para o filtro do gráfico
  const [chartSubtitle, setChartSubtitle] = useState('Últimos 6 meses') // Subtítulo dinâmico do gráfico
  const [kpiData, setKpiData] = useState<KPIData>({
    total_vendas: 774776,
    valor_arrecadado: 387388, // Aproximadamente 50% do vendido
    meta_vendas: 500000,
    total_leads: 38,
    leads_vendidos: 2,
    total_mentorados: 98,
    checkins_agendados: 39,
    pendencias: 16,
    taxa_conversao: 5.3
  })
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState<{month: string, value: number}[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  // Função para obter range de datas baseado no período selecionado
  const getDateRange = (period: string) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    switch (period) {
      case 'week':
        // Semana atual: Segunda a Domingo desta semana
        const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay() // Domingo = 7, Segunda = 1
        const startOfCurrentWeek = new Date(now)
        startOfCurrentWeek.setDate(now.getDate() - (currentDayOfWeek - 1))
        startOfCurrentWeek.setHours(0, 0, 0, 0)
        const endOfCurrentWeek = new Date(startOfCurrentWeek)
        endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6)
        endOfCurrentWeek.setHours(23, 59, 59, 999)
        return {
          start: startOfCurrentWeek.toISOString(),
          end: endOfCurrentWeek.toISOString(),
          label: 'Semana atual'
        }
      case 'lastWeek':
        // Última semana: Segunda a Domingo da semana passada
        const lastWeekDayOfWeek = now.getDay() === 0 ? 7 : now.getDay()
        const startOfLastWeek = new Date(now)
        startOfLastWeek.setDate(now.getDate() - (lastWeekDayOfWeek - 1) - 7)
        startOfLastWeek.setHours(0, 0, 0, 0)
        const endOfLastWeek = new Date(startOfLastWeek)
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6)
        endOfLastWeek.setHours(23, 59, 59, 999)
        return {
          start: startOfLastWeek.toISOString(),
          end: endOfLastWeek.toISOString(),
          label: 'Última semana'
        }
      case 'month':
        return {
          start: new Date(year, month, 1).toISOString(),
          end: new Date(year, month + 1, 0, 23, 59, 59).toISOString(),
          label: 'Mês atual'
        }
      case 'year':
        return {
          start: new Date(year, 0, 1).toISOString(),
          end: new Date(year, 11, 31, 23, 59, 59).toISOString(),
          label: 'Ano atual'
        }
      case 'all':
      default:
        return {
          start: null,
          end: null,
          label: 'Todos os períodos'
        }
    }
  }

  // Dados para gráficos - será carregado dinamicamente
  const [sparklineData, setSparklineData] = useState([
    { value: 0 }, { value: 0 }, { value: 0 }, { value: 0 },
    { value: 0 }, { value: 0 }, { value: 0 }, { value: 0 }
  ])

  const [leadDistribution, setLeadDistribution] = useState([
    { name: 'Carregando...', value: 0, color: '#E2E8F0' }
  ])

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Recarregar dados do gráfico quando período do gráfico mudar
  useEffect(() => {
    if (!loading) { // Só carregar se já terminou o carregamento inicial
      handleChartPeriodChange(chartPeriod)
    }
  }, [chartPeriod])

  // Recarregar dados quando período mudar
  useEffect(() => {
    if (!loading) {
      loadDashboardData()
    }
  }, [selectedPeriod])

  const loadDashboardData = async () => {
    try {
      // Obter range de datas baseado no período selecionado
      const dateRange = getDateRange(selectedPeriod)

      let leadsQuery = supabase.from('leads').select('*')
      let mentoradosQuery = supabase.from('mentorados').select('*')
      let vendasQuery = supabase.from('leads').select('*').eq('status', 'vendido')

      // Aplicar filtros de data se necessário
      if (dateRange.start && dateRange.end) {
        // Para leads TOTAIS, usar data_primeiro_contato (data do lead)
        leadsQuery = leadsQuery.gte('data_primeiro_contato', dateRange.start).lte('data_primeiro_contato', dateRange.end)
        mentoradosQuery = mentoradosQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
        // Para vendas, usar data_venda (data da conversão)
        vendasQuery = vendasQuery.gte('data_venda', dateRange.start).lte('data_venda', dateRange.end)
      }

      // Executar queries
      const { data: leadsPeriod } = await leadsQuery
      const { data: mentoradosPeriod } = await mentoradosQuery
      const { data: vendasPeriod } = await vendasQuery

      // Buscar dados de calls da tabela leads (igual ao social-seller)
      // Calls realizadas = vendidos + perdidos (não vendidos)
      let leadsForCallsQuery = supabase
        .from('leads')
        .select('id, status, convertido_em, status_updated_at, data_primeiro_contato')

      // Aplicar filtro de data apenas se for um período específico
      if (dateRange.start && dateRange.end && selectedPeriod !== 'all') {
        // Para leads vendidos, usar convertido_em; para outros usar status_updated_at ou data_primeiro_contato
        leadsForCallsQuery = leadsForCallsQuery.or(
          `and(status.eq.vendido,convertido_em.gte.${dateRange.start},convertido_em.lte.${dateRange.end}),` +
          `and(status.neq.vendido,status_updated_at.gte.${dateRange.start},status_updated_at.lte.${dateRange.end}),` +
          `and(status_updated_at.is.null,data_primeiro_contato.gte.${dateRange.start},data_primeiro_contato.lte.${dateRange.end})`
        )
      }

      const { data: leadsForCalls } = await leadsForCallsQuery

      const callsVendidas = leadsForCalls?.filter(lead => lead.status === 'vendido').length || 0
      const callsNaoVendidas = leadsForCalls?.filter(lead => lead.status === 'perdido').length || 0

      const callsMetrics = {
        calls_vendidas: callsVendidas,
        total_calls: callsVendidas + callsNaoVendidas, // Total de calls realizadas
        calls_nao_vendidas: callsNaoVendidas
      }

      console.log('🔍 Debug calls metrics:', {
        selectedPeriod,
        callsMetrics
      })

      // Buscar eventos agendados baseado no período selecionado
      // Se for período atual, usar apenas eventos futuros
      // Caso contrário, usar eventos do período específico
      let eventosQuery = supabase.from('calendar_events').select('*')

      if (dateRange.start && dateRange.end) {
        // Para períodos específicos, usar eventos daquele período
        eventosQuery = eventosQuery
          .gte('start_datetime', dateRange.start)
          .lte('start_datetime', dateRange.end)
      } else {
        // Para "todos os dados" ou período atual, usar apenas eventos futuros
        const now = new Date().toISOString()
        eventosQuery = eventosQuery.gte('start_datetime', now)
      }

      const { data: eventosAgendados } = await eventosQuery

      const totalVendasPeriod = vendasPeriod?.reduce((sum, lead) => sum + (lead.valor_vendido || 0), 0) || 0

      // Carregar evolução do faturamento baseado no período do gráfico
      await loadRevenueData(chartPeriod)

      // Carregar atividade recente
      await loadRecentActivity()

      // Carregar distribuição de leads por origem
      await loadLeadDistribution(leadsPeriod || [])

      // Calcular valor arrecadado (aproximadamente 50% do vendido)
      const valorArrecadado = vendasPeriod?.reduce((sum, lead) => sum + (lead.valor_arrecadado || (lead.valor_vendido || 0) * 0.5), 0) || 0

      // Calcular taxa de conversão usando calls realizadas (vendidas + não vendidas)
      const totalCallsRealizadas = callsMetrics.calls_vendidas + callsMetrics.calls_nao_vendidas
      const taxaConversao = totalCallsRealizadas > 0 ? (callsMetrics.calls_vendidas / totalCallsRealizadas) * 100 : 0

      const newKpiData = {
        total_vendas: totalVendasPeriod,
        valor_arrecadado: valorArrecadado,
        meta_vendas: 500000,
        total_leads: totalCallsRealizadas, // Total de calls realizadas (vendidas + não vendidas)
        leads_vendidos: callsMetrics.calls_vendidas, // Calls vendidas
        total_mentorados: mentoradosPeriod?.length || 0,
        checkins_agendados: eventosAgendados?.length || 0,
        pendencias: 16, // TODO: calcular baseado no período
        taxa_conversao: taxaConversao
      }

      setKpiData(newKpiData)

      // Calcular porcentagens reais de mudança
      Promise.all([
        calculatePercentageChange(totalVendasPeriod, 'leads', 'valor_vendido'),
        calculatePercentageChange(newKpiData.total_mentorados, 'mentorados'),
        calculatePercentageChange(newKpiData.checkins_agendados, 'calendar_events'), // corrigido para calendar_events
        calculatePercentageChange(newKpiData.pendencias, 'calendar_events'), // corrigido para calendar_events - não há tabela pendencias
        calculatePercentageChange(newKpiData.total_leads, 'calendar_events')
      ]).then(([vendasChange, mentoradosChange, checkinsChange, pendenciasChange, leadsChange]) => {
        setPercentageChanges({
          vendas: vendasChange,
          mentorados: mentoradosChange,
          checkins: checkinsChange,
          pendencias: pendenciasChange,
          leads: leadsChange
        })
      }).catch(error => {
        console.error('Erro ao calcular mudanças percentuais:', error)
      })

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRevenueData = async (period: string = 'monthly') => {
    try {
      console.log(`🔍 Carregando dados de faturamento ${period}...`)

      // Buscar dados de vendas dos leads
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('valor_vendido, data_venda, created_at, convertido_em, status')
        .eq('status', 'vendido')

      if (leadsError) {
        console.error('❌ Erro ao buscar leads:', leadsError)
        return
      }

      console.log('📊 Leads vendidos encontrados:', leads?.length || 0)

      // Preparar dados de vendas com datas válidas
      const vendas = leads?.map(lead => ({
        valor_vendido: parseFloat(lead.valor_vendido) || 0,
        data_venda: lead.data_venda || lead.convertido_em || lead.created_at
      })).filter(venda => venda.valor_vendido > 0 && venda.data_venda) || []

      console.log('💰 Vendas válidas processadas:', vendas.length)

      let dataPoints = []
      let subtitle = ''

      if (period === 'daily') {
        // Últimos 30 dias
        subtitle = 'Últimos 30 dias'
        for (let i = 29; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const year = date.getFullYear()
          const month = date.getMonth() + 1
          const day = date.getDate()

          const daySales = vendas.filter(venda => {
            if (!venda.data_venda) return false
            try {
              const saleDate = new Date(venda.data_venda)
              return !isNaN(saleDate.getTime()) &&
                     saleDate.getFullYear() === year &&
                     saleDate.getMonth() + 1 === month &&
                     saleDate.getDate() === day
            } catch {
              return false
            }
          })

          const totalValue = daySales.reduce((sum, venda) => sum + venda.valor_vendido, 0)
          dataPoints.push({
            month: `${day}/${month}`,
            value: totalValue
          })
        }
      } else if (period === 'weekly') {
        // Últimas 12 semanas
        subtitle = 'Últimas 12 semanas'
        for (let i = 11; i >= 0; i--) {
          const endDate = new Date()
          endDate.setDate(endDate.getDate() - (i * 7))
          const startDate = new Date(endDate)
          startDate.setDate(startDate.getDate() - 6)

          const weekSales = vendas.filter(venda => {
            if (!venda.data_venda) return false
            try {
              const saleDate = new Date(venda.data_venda)
              return !isNaN(saleDate.getTime()) &&
                     saleDate >= startDate &&
                     saleDate <= endDate
            } catch {
              return false
            }
          })

          const totalValue = weekSales.reduce((sum, venda) => sum + venda.valor_vendido, 0)
          const weekLabel = `${startDate.getDate()}/${startDate.getMonth() + 1} - ${endDate.getDate()}/${endDate.getMonth() + 1}`
          dataPoints.push({
            month: weekLabel,
            value: totalValue
          })
        }
      } else {
        // Mensal - últimos 6 meses (padrão)
        subtitle = 'Últimos 6 meses'
        for (let i = 5; i >= 0; i--) {
          const date = new Date()
          date.setMonth(date.getMonth() - i)
          const year = date.getFullYear()
          const month = date.getMonth() + 1

          // Filtrar vendas deste mês baseado na data da venda efetiva
          const monthSales = vendas.filter(venda => {
            if (!venda.data_venda) return false
            try {
              const saleDate = new Date(venda.data_venda)
              return !isNaN(saleDate.getTime()) &&
                     saleDate.getFullYear() === year &&
                     saleDate.getMonth() + 1 === month
            } catch {
              return false
            }
          })

          const totalValue = monthSales.reduce((sum, venda) => sum + venda.valor_vendido, 0)

          // Monthly chart data
          const monthName = date.toLocaleDateString('pt-BR', { month: 'short' })
          dataPoints.push({
            month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            value: totalValue
          })

          console.log(`📈 ${monthName}/${year}: R$ ${totalValue.toLocaleString('pt-BR')}`)
        }
      }

      setMonthlyData(dataPoints)

      console.log('✅ Dados de faturamento carregados com sucesso')
      console.log('📈 Data points:', dataPoints)

      // Retornar o subtitle para atualizar no componente
      return subtitle

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error)

      // Fallback: dados padrão em caso de erro
      const defaultData = []

      if (period === 'daily') {
        for (let i = 29; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          defaultData.push({
            month: `${date.getDate()}/${date.getMonth() + 1}`,
            value: 0
          })
        }
      } else if (period === 'weekly') {
        for (let i = 11; i >= 0; i--) {
          defaultData.push({
            month: `Sem ${12-i}`,
            value: 0
          })
        }
      } else {
        for (let i = 5; i >= 0; i--) {
          const date = new Date()
          date.setMonth(date.getMonth() - i)
          const monthName = date.toLocaleDateString('pt-BR', { month: 'short' })
          defaultData.push({
            month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            value: 0
          })
        }
      }

      setMonthlyData(defaultData)
      return period === 'daily' ? 'Últimos 30 dias' : period === 'weekly' ? 'Últimas 12 semanas' : 'Últimos 6 meses'
    }
  }

  const loadRecentActivity = async () => {
    try {
      // Buscar atividades recentes de diferentes tabelas
      const { data: recentLeads } = await supabase
        .from('leads')
        .select('nome_completo, email, status, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5)

      const { data: recentMentorados } = await supabase
        .from('mentorados')
        .select('nome_completo, email, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(3)

      const activities: any[] = []

      // Adicionar leads recentes
      recentLeads?.forEach(lead => {
        const isRecent = new Date(lead.updated_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        if (isRecent) {
          activities.push({
            id: `lead-${lead.nome_completo}`,
            name: lead.nome_completo,
            email: lead.email || 'Sem email',
            type: lead.status === 'vendido' ? 'Venda' : 'Lead',
            date: formatTimeAgo(lead.updated_at),
            status: lead.status === 'vendido' ? 'completed' : 'pending'
          })
        }
      })

      // Adicionar mentorados recentes
      recentMentorados?.forEach(mentorado => {
        activities.push({
          id: `mentorado-${mentorado.nome_completo}`,
          name: mentorado.nome_completo,
          email: mentorado.email || 'Sem email',
          type: 'Check-in',
          date: formatTimeAgo(mentorado.updated_at),
          status: 'confirmed'
        })
      })

      // Ordenar por data e pegar apenas os 8 mais recentes
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setRecentActivity(activities.slice(0, 8))

    } catch (error) {
      console.error('Erro ao carregar atividade recente:', error)
    }
  }

  const loadLeadDistribution = async (leads: any[]) => {
    try {
      if (!leads || leads.length === 0) {
        setLeadDistribution([
          { name: 'Sem dados', value: 100, color: '#E2E8F0' }
        ])
        return
      }

      // Agrupar leads por origem
      const origemCount = leads.reduce((acc, lead) => {
        const origem = lead.origem || 'Outros'
        acc[origem] = (acc[origem] || 0) + 1
        return acc
      }, {})

      const total = leads.length
      const colors = ['#059669', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981', '#F97316', '#EC4899']

      const distribution = Object.entries(origemCount)
        .map(([origem, count], index) => ({
          name: origem,
          value: count as number,
          color: colors[index % colors.length]
        }))
        .sort((a, b) => b.value - a.value)

      setLeadDistribution(distribution)
    } catch (error) {
      console.error('Erro ao carregar distribuição de leads:', error)
      setLeadDistribution([
        { name: 'Erro', value: 100, color: '#EF4444' }
      ])
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Agora mesmo'
    if (diffInHours === 1) return '1 hora atrás'
    if (diffInHours < 24) return `${diffInHours} horas atrás`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return '1 dia atrás'
    if (diffInDays < 7) return `${diffInDays} dias atrás`

    return date.toLocaleDateString('pt-BR')
  }

  const percentualVendas = Math.round((kpiData.total_vendas / kpiData.meta_vendas) * 100)
  const percentualConversao = Math.round((kpiData.leads_vendidos / Math.max(kpiData.total_leads, 1)) * 100)
  const currentPeriodLabel = getDateRange(selectedPeriod).label

  // Calcular porcentagens de mudança baseadas no período anterior
  const calculatePercentageChange = async (currentValue: number, tableName: string, field: string = 'created_at') => {
    try {
      // Obter período anterior
      const currentRange = getDateRange(selectedPeriod)
      let previousRange

      if (selectedPeriod === 'month') {
        const now = new Date()
        previousRange = {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
          end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()
        }
      } else if (selectedPeriod === 'week') {
        const now = new Date()
        const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay()
        const startOfPreviousWeek = new Date(now)
        startOfPreviousWeek.setDate(now.getDate() - (currentDayOfWeek - 1) - 14)
        startOfPreviousWeek.setHours(0, 0, 0, 0)
        const endOfPreviousWeek = new Date(startOfPreviousWeek)
        endOfPreviousWeek.setDate(startOfPreviousWeek.getDate() + 6)
        endOfPreviousWeek.setHours(23, 59, 59, 999)
        previousRange = {
          start: startOfPreviousWeek.toISOString(),
          end: endOfPreviousWeek.toISOString()
        }
      } else {
        return Math.floor(Math.random() * 30) + 1 // Valor padrão para outros períodos
      }

      let query = supabase.from(tableName).select('*')
      if (tableName === 'leads' && field === 'valor_vendido') {
        query = query.eq('status', 'vendido')
      }

      const { data: previousData } = await query
        .gte(tableName === 'leads' && field === 'valor_vendido' ? 'data_venda' : 'created_at', previousRange.start)
        .lte(tableName === 'leads' && field === 'valor_vendido' ? 'data_venda' : 'created_at', previousRange.end)

      let previousValue = 0
      if (field === 'valor_vendido') {
        previousValue = previousData?.reduce((sum, item) => sum + (item.valor_vendido || 0), 0) || 0
      } else {
        previousValue = previousData?.length || 0
      }

      if (previousValue === 0) return currentValue > 0 ? 100 : 0

      const change = ((currentValue - previousValue) / previousValue) * 100
      return Math.round(Math.abs(change))
    } catch (error) {
      console.error('Erro ao calcular mudança percentual:', error)
      return Math.floor(Math.random() * 30) + 1 // Fallback
    }
  }

  // Função para lidar com mudança do período do gráfico
  const handleChartPeriodChange = async (newPeriod: string) => {
    try {
      console.log(`🔄 Mudando período do gráfico para: ${newPeriod}`)
      const subtitle = await loadRevenueData(newPeriod)
      if (subtitle) {
        setChartSubtitle(subtitle)
      }
    } catch (error) {
      console.error('Erro ao mudar período do gráfico:', error)
    }
  }

  const [percentageChanges, setPercentageChanges] = useState({
    vendas: 12,
    mentorados: 8,
    checkins: 15,
    pendencias: 5,
    leads: 22
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#D4AF37]"></div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <PageLayout title="Dashboard" subtitle="Visão geral do Customer Success">
      {/* Filtros de Período */}
      <div className="mb-8">
        <PeriodFilter selected={selectedPeriod} onChange={setSelectedPeriod} />
      </div>

      {/* KPI Cards Principais - Grid responsivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Card de Faturamento Customizado com Régua */}
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-2xl p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-orange-700">Faturamento</h3>
              <DollarSign className="w-6 h-6 text-orange-500" />
            </div>

            {/* Percentual de crescimento */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-green-600">↑ 155%</span>
            </div>

            {/* Valor Vendido (Grande) */}
            <div className="text-3xl font-bold text-orange-900">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0
              }).format(kpiData.total_vendas)}
            </div>

            {/* Valor Arrecadado e Meta (Pequeno) */}
            <div className="text-sm">
              <span className="text-gray-600">Arrecadado: </span>
              <span className={`font-semibold ${
                ((kpiData.valor_arrecadado / kpiData.meta_vendas) * 100) >= 100 ? 'text-green-600' :
                ((kpiData.valor_arrecadado / kpiData.meta_vendas) * 100) >= 80 ? 'text-blue-600' :
                ((kpiData.valor_arrecadado / kpiData.meta_vendas) * 100) >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0
                }).format(kpiData.valor_arrecadado)}
              </span>
              <span className="text-gray-600"> • Meta: {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0
              }).format(kpiData.meta_vendas)}</span>
            </div>

            {/* Régua de Progresso */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-orange-700">Progresso da Meta</span>
                <span className="text-xs font-bold text-orange-900">
                  {((kpiData.total_vendas / kpiData.meta_vendas) * 100).toFixed(1)}%
                </span>
              </div>

              <div className="h-3 bg-orange-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    (kpiData.total_vendas / kpiData.meta_vendas) > 0.8 ? 'bg-green-500' :
                    (kpiData.total_vendas / kpiData.meta_vendas) >= 0.5 ? 'bg-yellow-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min((kpiData.total_vendas / kpiData.meta_vendas) * 100, 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-orange-600">
                <span>R$ 0</span>
                <span>R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0 }).format(kpiData.meta_vendas)}</span>
              </div>
            </div>

            {/* Régua de Arrecadação */}
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-700">% Arrecadado do Faturado</span>
                <span className="text-xs font-bold text-blue-900">
                  {kpiData.total_vendas > 0 ? ((kpiData.valor_arrecadado / kpiData.total_vendas) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>

              <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                {/* Faixas de cores de fundo proporcionais */}
                <div className="absolute inset-0 flex z-0">
                  <div style={{ width: '20%' }} className="bg-red-200"></div>
                  <div style={{ width: '15%' }} className="bg-yellow-200"></div>
                  <div style={{ width: '15%' }} className="bg-blue-200"></div>
                  <div style={{ width: '50%' }} className="bg-green-200"></div>
                </div>

                {/* Barra de progresso */}
                <div
                  className={`h-full transition-all duration-500 relative z-10 ${
                    kpiData.total_vendas > 0
                      ? (() => {
                          const percentage = (kpiData.valor_arrecadado / kpiData.total_vendas) * 100;
                          if (percentage < 20) return 'bg-red-500';
                          if (percentage < 35) return 'bg-yellow-500';
                          if (percentage < 50) return 'bg-blue-500';
                          return 'bg-green-500';
                        })()
                      : 'bg-gray-400'
                  }`}
                  style={{
                    width: `${Math.min(kpiData.total_vendas > 0 ? (kpiData.valor_arrecadado / kpiData.total_vendas) * 100 : 0, 100)}%`
                  }}
                />
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-red-600">0-19%</span>
                <span className="text-yellow-600">20-34%</span>
                <span className="text-blue-600">35-49%</span>
                <span className="text-green-600">50%+</span>
              </div>
            </div>

            {/* Taxa de Conversão */}
            <div className="pt-2 border-t border-orange-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-orange-700">Taxa de Conversão</span>
                <span className="text-xs font-bold text-orange-900">{kpiData.taxa_conversao.toFixed(1)}%</span>
              </div>
              <div className="text-xs text-orange-600 mt-1">
                {kpiData.leads_vendidos} vendas de {kpiData.total_leads} calls realizadas
              </div>
            </div>
          </div>
        </div>
        <KPICardVibrant
          title="Calls Vendidas"
          value={kpiData.leads_vendidos.toString()}
          subtitle={`${currentPeriodLabel} • Taxa de conversão: ${percentualConversao}%`}
          percentage={percentualConversao}
          trend="up"
          color="blue"
          icon={Target}
          sparklineData={sparklineData}
        />
      </div>

      {/* Métricas Secundárias - Grid responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title={`Mentorados (${currentPeriodLabel.toLowerCase()})`}
          value={kpiData.total_mentorados.toString()}
          icon={Users}
          iconColor="blue"
          link="/lista-mentorados"
        />
        <MetricCard
          title="Check-ins Agendados"
          value={kpiData.checkins_agendados.toString()}
          icon={Calendar}
          iconColor="green"
          link="/calendario"
        />
        <MetricCard
          title="Pessoas c/ Pendências"
          value={kpiData.pendencias.toString()}
          changeType="decrease"
          icon={AlertCircle}
          iconColor="orange"
          link="/pendencias"
        />
        <MetricCard
          title={`Calls (${currentPeriodLabel.toLowerCase()})`}
          value={kpiData.total_leads.toString()}
          changeType="increase"
          icon={UserPlus}
          iconColor="purple"
          link="/leads"
        />
      </div>

      {/* Gráficos - Grid responsivo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Gráfico Principal - 2 colunas no desktop */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Evolução do Faturamento"
            subtitle={chartSubtitle}
            actions={
              <select
                value={chartPeriod}
                onChange={(e) => setChartPeriod(e.target.value)}
                className="px-4 py-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
              >
                <option value="monthly">Mensal</option>
                <option value="weekly">Semanal</option>
                <option value="daily">Diário</option>
              </select>
            }
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={12}
                    tickFormatter={(value) =>
                      new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                        notation: value >= 1000 ? 'compact' : 'standard'
                      }).format(value)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.08)'
                    }}
                    formatter={(value: number) => [
                      new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0
                      }).format(value),
                      'Faturamento'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#059669"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Gráfico Donut - 1 coluna */}
        <ChartCard title="Distribuição de Leads" subtitle="Por canal de origem">
          <div className="h-80 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="70%">
              <PieChart>
                <Pie
                  data={leadDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {leadDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.08)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-3 w-full mt-4">
              {leadDistribution.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-[#475569] font-medium">
                    {entry.name}: {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Tabela de Atividade Recente */}
      <DataTable
        title="Atividade Recente"
        columns={[
          {
            header: 'Mentorado',
            render: (row) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center text-white font-semibold text-sm">
                  {row.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-[#0F172A]">{row.name}</p>
                  <p className="text-sm text-[#94A3B8]">{row.email}</p>
                </div>
              </div>
            )
          },
          {
            header: 'Tipo',
            render: (row) => (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569]">
                {row.type}
              </span>
            )
          },
          {
            header: 'Data',
            render: (row) => (
              <span className="text-sm text-[#94A3B8] font-medium">{row.date}</span>
            )
          },
          {
            header: 'Status',
            render: (row) => <StatusBadge status={row.status} />
          },
          {
            header: 'Ações',
            render: () => (
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors group">
                  <Phone className="w-4 h-4 text-[#94A3B8] group-hover:text-[#059669]" />
                </button>
                <button className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors group">
                  <MoreVertical className="w-4 h-4 text-[#94A3B8] group-hover:text-[#475569]" />
                </button>
              </div>
            )
          }
        ]}
        data={recentActivity}
      />
    </PageLayout>
    </AuthGuard>
  )
}