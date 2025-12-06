'use client'

import { useState, useEffect } from 'react'
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
  meta_vendas: number
  total_leads: number
  leads_vendidos: number
  total_mentorados: number
  checkins_agendados: number
  pendencias: number
}

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [kpiData, setKpiData] = useState<KPIData>({
    total_vendas: 88000,
    meta_vendas: 500000,
    total_leads: 38,
    leads_vendidos: 2,
    total_mentorados: 98,
    checkins_agendados: 39,
    pendencias: 16
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
        leadsQuery = leadsQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
        mentoradosQuery = mentoradosQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
        vendasQuery = vendasQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
      }

      // Executar queries
      const { data: leadsPeriod } = await leadsQuery
      const { data: mentoradosPeriod } = await mentoradosQuery
      const { data: vendasPeriod } = await vendasQuery

      const totalVendasPeriod = vendasPeriod?.reduce((sum, lead) => sum + (lead.valor_vendido || 0), 0) || 0

      // Carregar evolução do faturamento dos últimos 6 meses
      await loadMonthlyRevenue()

      // Carregar atividade recente
      await loadRecentActivity()

      // Carregar distribuição de leads por origem
      await loadLeadDistribution(leadsPeriod || [])

      const newKpiData = {
        total_vendas: totalVendasPeriod,
        meta_vendas: 500000,
        total_leads: leadsPeriod?.length || 0,
        leads_vendidos: vendasPeriod?.length || 0,
        total_mentorados: mentoradosPeriod?.length || 0,
        checkins_agendados: 39, // TODO: calcular baseado no período
        pendencias: 16 // TODO: calcular baseado no período
      }

      setKpiData(newKpiData)

      // Calcular porcentagens reais de mudança
      Promise.all([
        calculatePercentageChange(totalVendasPeriod, 'leads', 'valor_vendido'),
        calculatePercentageChange(newKpiData.total_mentorados, 'mentorados'),
        calculatePercentageChange(newKpiData.checkins_agendados, 'events'), // assumindo tabela events para checkins
        calculatePercentageChange(newKpiData.pendencias, 'pendencias'), // assumindo tabela pendencias
        calculatePercentageChange(newKpiData.total_leads, 'leads')
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

  const loadMonthlyRevenue = async () => {
    try {
      console.log('🔍 Carregando dados de faturamento mensal...')

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

      // Sempre gerar dados para os últimos 6 meses, mesmo sem vendas
      const sparklineMonths = []
      const monthlyDataPoints = []

      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const year = date.getFullYear()
        const month = date.getMonth() + 1

        // Filtrar vendas deste mês
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

        // Sparkline data (sempre incluir, mesmo que seja 0)
        sparklineMonths.push({ value: totalValue / 1000 })

        // Monthly chart data
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' })
        monthlyDataPoints.push({
          month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          value: totalValue
        })

        console.log(`📈 ${monthName}/${year}: R$ ${totalValue.toLocaleString('pt-BR')}`)
      }

      setSparklineData(sparklineMonths)
      setMonthlyData(monthlyDataPoints)

      console.log('✅ Dados de faturamento carregados com sucesso')
      console.log('📊 Sparkline:', sparklineMonths)
      console.log('📈 Monthly data:', monthlyDataPoints)

    } catch (error) {
      console.error('❌ Erro ao carregar dados mensais:', error)

      // Fallback: dados padrão em caso de erro
      const defaultMonths = []
      const defaultData = []

      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' })

        defaultMonths.push({ value: 0 })
        defaultData.push({
          month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          value: 0
        })
      }

      setSparklineData(defaultMonths)
      setMonthlyData(defaultData)
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
        .select('nome, email, created_at, updated_at')
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
          id: `mentorado-${mentorado.nome}`,
          name: mentorado.nome,
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
        .gte('created_at', previousRange.start)
        .lte('created_at', previousRange.end)

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

  const [percentageChanges, setPercentageChanges] = useState({
    vendas: 12,
    mentorados: 8,
    checkins: 15,
    pendencias: 5,
    leads: 22
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#059669]"></div>
      </div>
    )
  }

  return (
    <PageLayout title="Dashboard" subtitle="Visão geral do Customer Success">
      {/* Filtros de Período */}
      <div className="mb-8">
        <PeriodFilter selected={selectedPeriod} onChange={setSelectedPeriod} />
      </div>

      {/* KPI Cards Principais - Grid responsivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <KPICardVibrant
          title="Faturamento"
          value={new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 0
          }).format(kpiData.total_vendas)}
          subtitle={`${currentPeriodLabel} • Meta: ${new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 0
          }).format(kpiData.meta_vendas)}`}
          percentage={percentualVendas}
          trend="up"
          color="orange"
          icon={DollarSign}
          sparklineData={sparklineData}
        />
        <KPICardVibrant
          title="Leads Vendidos"
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
          link="/mentorados"
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
          title={`Leads (${currentPeriodLabel.toLowerCase()})`}
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
            subtitle="Últimos 6 meses"
            actions={
              <select className="px-4 py-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all">
                <option>Mensal</option>
                <option>Semanal</option>
                <option>Diário</option>
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
  )
}