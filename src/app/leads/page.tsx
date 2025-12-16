'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { KPICardVibrant } from '@/components/ui/kpi-card-vibrant'
import { MetricCard } from '@/components/ui/metric-card'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { ChartCard } from '@/components/ui/chart-card'
import { ChurnRateCard } from '@/components/churn-rate-card'
import { supabase } from '@/lib/supabase'
import {
  DollarSign,
  Users,
  Target,
  TrendingUp,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  Building,
  MoreVertical,
  Download,
  RefreshCw,
  BarChart3,
  Calendar,
  UserPlus
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts'

interface Lead {
  id: string
  nome_completo: string
  email: string | null
  telefone: string | null
  empresa: string | null
  cargo: string | null
  origem: string | null
  status: string
  temperatura?: string | null
  prioridade?: string | null
  observacoes: string | null
  valor_potencial?: number | null
  valor_vendido: number | null
  valor_arrecadado: number | null
  data_primeiro_contato: string
  data_venda: string | null
  desistiu?: boolean | null
  lead_score?: number | null
  convertido_em?: string | null
  status_updated_at?: string | null
  next_followup_date?: string | null
  created_at: string
  updated_at: string
  mentorado_indicador_id?: string | null
  fonte_referencia?: string | null
}

interface LeadStats {
  total_leads: number
  leads_convertidos: number
  valor_total_vendas: number
  valor_total_arrecadado: number
  taxa_conversao: number
  ticket_medio: number
}

interface Mentorado {
  id: string
  nome_completo: string
  email: string
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<LeadStats>({
    total_leads: 0,
    leads_convertidos: 0,
    valor_total_vendas: 0,
    valor_total_arrecadado: 0,
    taxa_conversao: 0,
    ticket_medio: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [origemFilter, setOrigemFilter] = useState('todas')
  const [dateFilter, setDateFilter] = useState('mes_atual')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Função para obter range de datas
  const getDateRange = (filter: string) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    switch (filter) {
      case 'mes_atual':
        return {
          start: new Date(year, month, 1).toISOString(),
          end: new Date(year, month + 1, 0, 23, 59, 59).toISOString()
        }
      case 'semana_atual':
        // Semana atual: Segunda a Domingo desta semana
        const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay() // Domingo = 7, Segunda = 1
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - (currentDayOfWeek - 1))
        startOfWeek.setHours(0, 0, 0, 0)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)
        return {
          start: startOfWeek.toISOString(),
          end: endOfWeek.toISOString()
        }
      case 'semana_passada':
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
          end: endOfLastWeek.toISOString()
        }
      case 'mes_passado':
        return {
          start: new Date(year, month - 1, 1).toISOString(),
          end: new Date(year, month, 0, 23, 59, 59).toISOString()
        }
      case 'personalizado':
        if (customStartDate && customEndDate) {
          return {
            start: new Date(customStartDate).toISOString(),
            end: new Date(customEndDate + 'T23:59:59').toISOString()
          }
        }
        return null
      case 'todos':
      default:
        return null
    }
  }
  const [origemData, setOrigemData] = useState<Array<{name: string, value: number, color: string, valorPago: number, taxaConversao: number}>>([])
  const [selectedOrigem, setSelectedOrigem] = useState<{name: string, value: number, color: string, valorPago: number, taxaConversao: number} | null>(null)
  const [showOrigemModal, setShowOrigemModal] = useState(false)

  const statusMap = {
    novo: 'new',
    contactado: 'contacted',
    agendado: 'scheduled',
    quente: 'hot',
    vendido: 'converted',
    perdido: 'lost'
  }

  const origemColors = {
    'Instagram': '#F59E0B',
    'WhatsApp': '#059669',
    'Indicação': '#3B82F6',
    'Site': '#EF4444',
    'LinkedIn': '#8B5CF6',
    'Facebook': '#3B82F6',
    'Google': '#EF4444',
    'Outros': '#94A3B8'
  }

  const conversionData = [
    { month: 'Jul', leads: 25, vendas: 3, taxa: 12 },
    { month: 'Ago', leads: 32, vendas: 5, taxa: 15.6 },
    { month: 'Set', leads: 28, vendas: 4, taxa: 14.3 },
    { month: 'Out', leads: 38, vendas: 7, taxa: 18.4 },
    { month: 'Nov', leads: 42, vendas: 8, taxa: 19.0 },
    { month: 'Dez', leads: 35, vendas: 6, taxa: 17.1 }
  ]

  useEffect(() => {
    loadLeads()
    loadStats()
    loadOrigemData()
  }, [])

  // Recarregar dados quando filtros mudarem
  useEffect(() => {
    if (!loading) { // Só recarrega se não está no loading inicial
      setIsLoadingData(true)
      loadLeads()
      loadStats()
      loadOrigemData()
    }
  }, [statusFilter, origemFilter, dateFilter, customStartDate, customEndDate])

  const loadLeads = async () => {
    try {
      let query = supabase
        .from('leads')
        .select('*')

      // Aplicar filtros no servidor se não for "todos"
      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter)
      }

      if (origemFilter !== 'todas') {
        query = query.eq('origem', origemFilter)
      }


      // Aplicar filtro de data
      const dateRange = getDateRange(dateFilter)
      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
    } finally {
      setLoading(false)
      setIsLoadingData(false)
    }
  }

  const loadStats = async () => {
    try {
      let query = supabase.from('leads').select('*')

      // Aplicar filtros de data nas estatísticas também
      const dateRange = getDateRange(dateFilter)
      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end)
      }

      // Aplicar filtros de status e origem se selecionados
      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter)
      }

      if (origemFilter !== 'todas') {
        query = query.eq('origem', origemFilter)
      }


      const { data: leads } = await query

      if (leads) {
        const convertedLeads = leads.filter(lead => lead.status === 'vendido')
        const totalVendas = convertedLeads.reduce((sum, lead) => sum + (lead.valor_vendido || 0), 0)
        const totalArrecadado = convertedLeads.reduce((sum, lead) => sum + (lead.valor_arrecadado || 0), 0)

        setStats({
          total_leads: leads.length,
          leads_convertidos: convertedLeads.length,
          valor_total_vendas: totalVendas,
          valor_total_arrecadado: totalArrecadado,
          taxa_conversao: leads.length > 0 ? (convertedLeads.length / leads.length) * 100 : 0,
          ticket_medio: convertedLeads.length > 0 ? totalVendas / convertedLeads.length : 0
        })
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const loadOrigemData = async () => {
    try {
      const { data: leads } = await supabase.from('leads').select('origem, status, valor_arrecadado')

      if (leads) {
        const origemStats = leads.reduce((acc, lead) => {
          const origem = lead.origem || 'Outros'

          if (!acc[origem]) {
            acc[origem] = {
              total: 0,
              convertidos: 0,
              valorPago: 0
            }
          }

          acc[origem].total += 1
          if (lead.status === 'vendido') {
            acc[origem].convertidos += 1
            acc[origem].valorPago += lead.valor_arrecadado || 0
          }

          return acc
        }, {} as Record<string, {total: number, convertidos: number, valorPago: number}>)

        const origemArray = Object.entries(origemStats).map(([name, stats]) => ({
          name,
          value: stats.total,
          valorPago: stats.valorPago,
          taxaConversao: stats.total > 0 ? (stats.convertidos / stats.total) * 100 : 0,
          color: origemColors[name as keyof typeof origemColors] || '#94A3B8'
        })).sort((a, b) => b.value - a.value)

        setOrigemData(origemArray)
      }
    } catch (error) {
      console.error('Erro ao carregar dados de origem:', error)
    }
  }

  // Busca só no cliente (instantânea) - filtros já aplicados no servidor
  const filteredLeads = leads.filter(lead => {
    return searchTerm === '' ||
      lead.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.telefone?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Obter listas para os filtros
  const availableStatuses = Array.from(new Set(leads.map(lead => lead.status).filter(Boolean)))
  const availableOrigens = Array.from(new Set(leads.map(lead => lead.origem).filter((origem): origem is string => Boolean(origem))))

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const handleNewLead = () => {
    setEditingLead(null)
    setIsModalOpen(true)
  }

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead)
    setIsModalOpen(true)
  }

  const handleDeleteLead = async (leadId: string) => {
    if (confirm('Tem certeza que deseja excluir este lead?')) {
      try {
        setIsLoadingData(true)
        const { error } = await supabase
          .from('leads')
          .delete()
          .eq('id', leadId)

        if (error) throw error

        // Recarregar dados em vez de filtrar localmente
        await loadLeads()
        await loadStats()
        await loadOrigemData()
      } catch (error) {
        console.error('Erro ao excluir lead:', error)
        setIsLoadingData(false)
      }
    }
  }

  const handleViewDetails = (lead: Lead) => {
    router.push(`/leads/${lead.id}`)
  }

  const handleConvertToMentorado = async (lead: Lead) => {
    if (!confirm(`Converter "${lead.nome_completo}" em mentorado?`)) {
      return
    }

    try {
      setIsLoadingData(true)

      // 1. Criar mentorado com dados do lead
      const mentoradoData = {
        nome_completo: lead.nome_completo,
        email: lead.email,
        telefone: lead.telefone,
        data_entrada: lead.data_venda || new Date().toISOString().split('T')[0],
        estado_atual: 'ativo',
        lead_id: lead.id,
        excluido: false
      }

      const { data: mentorado, error: mentoradoError } = await supabase
        .from('mentorados')
        .insert(mentoradoData)
        .select()
        .single()

      if (mentoradoError) throw mentoradoError

      // 2. Atualizar lead como convertido
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          convertido_em: new Date().toISOString(),
          status_updated_at: new Date().toISOString()
        })
        .eq('id', lead.id)

      if (leadError) throw leadError

      alert(`Lead convertido em mentorado com sucesso!\nMentorado ID: ${mentorado.id}`)
      loadLeads()
    } catch (error) {
      console.error('Erro ao converter lead:', error)
      alert('Erro ao converter lead em mentorado')
    } finally {
      setIsLoadingData(false)
    }
  }

  if (loading) {
    return (
      <PageLayout title="Leads" subtitle="Carregando...">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#059669]"></div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Leads" subtitle="Gestão completa de leads e oportunidades">
      {/* KPI Cards - Grid responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICardVibrant
          title="Total de Leads"
          value={stats.total_leads.toString()}
          subtitle="Este mês"
          percentage={15}
          trend="up"
          color="blue"
          icon={Users}
          sparklineData={[
            { value: 20 }, { value: 25 }, { value: 30 }, { value: 28 },
            { value: 35 }, { value: 38 }, { value: 42 }, { value: stats.total_leads }
          ]}
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${stats.taxa_conversao.toFixed(1)}%`}
          change={2.5}
          changeType="increase"
          icon={Target}
          iconColor="green"
        />
        <MetricCard
          title="Valor em Vendas"
          value={formatCurrency(stats.valor_total_vendas)}
          change={18}
          changeType="increase"
          icon={DollarSign}
          iconColor="orange"
        />
        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(stats.ticket_medio)}
          change={8}
          changeType="increase"
          icon={TrendingUp}
          iconColor="purple"
        />
        <ChurnRateCard />
      </div>

      {/* Gráficos - Grid responsivo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Gráfico de Taxa de Conversão */}
        <div className="lg:col-span-2">
          <ChartCard title="Evolução da Taxa de Conversão" subtitle="Últimos 6 meses">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={conversionData}>
                  <defs>
                    <linearGradient id="colorConversion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="stroke-muted-foreground" fontSize={12} />
                  <YAxis className="stroke-muted-foreground" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.08)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="taxa"
stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorConversion)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Gráfico de Origem dos Leads */}
        <ChartCard title="Origem dos Leads" subtitle="Performance por canal">
          <div className="h-80 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="60%">
              <PieChart>
                <Pie
                  data={origemData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  onClick={(data) => {
                    setSelectedOrigem(data)
                    setShowOrigemModal(true)
                  }}
                >
                  {origemData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.color}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, 'Leads']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.08)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-1 gap-1 w-full mt-2 max-h-32 overflow-y-auto">
              {origemData.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-foreground font-medium">
                      {entry.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-foreground font-semibold">
                      {entry.value} leads
                    </div>
                    <div className="text-xs text-primary">
                      {formatCurrency(entry.valorPago)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.taxaConversao.toFixed(1)}% conv.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Ações e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all w-full sm:w-80"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium transition-colors ${
              showFilters
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:bg-muted'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {(statusFilter !== 'todos' || origemFilter !== 'todas' || dateFilter !== 'mes_atual') && (
              <span className="ml-1 px-2 py-0.5 bg-destructive text-destructive-foreground text-xs rounded-full">
                {[statusFilter !== 'todos', origemFilter !== 'todas', dateFilter !== 'mes_atual'].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={loadLeads}
            className="flex items-center gap-2 px-4 py-2 text-foreground hover:bg-muted rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-foreground hover:bg-muted rounded-xl transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={handleNewLead}
            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Filtros Expandíveis */}
      {showFilters && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
              >
                <option value="todos">Todos os Status</option>
                {availableStatuses.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Origem</label>
              <select
                value={origemFilter}
                onChange={(e) => setOrigemFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
              >
                <option value="todas">Todas as Origens</option>
                {availableOrigens.map((origem) => (
                  <option key={origem} value={origem}>{origem}</option>
                ))}
              </select>
            </div>


            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Período</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
              >
                <option value="mes_atual">Mês Atual</option>
                <option value="semana_atual">Semana Atual</option>
                <option value="semana_passada">Última Semana</option>
                <option value="mes_passado">Mês Passado</option>
                <option value="personalizado">Personalizado</option>
                <option value="todos">Todas as Datas</option>
              </select>
            </div>

            {dateFilter === 'personalizado' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Data Início</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Data Fim</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
                  />
                </div>
              </>
            )}
          </div>

          {/* Botões de ação dos filtros */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#F1F5F9]">
            <button
              onClick={() => {
                setStatusFilter('todos')
                setOrigemFilter('todas')
                setDateFilter('mes_atual')
                setCustomStartDate('')
                setCustomEndDate('')
              }}
              className="text-sm text-muted-foreground hover:text-muted-foreground transition-colors"
            >
              Limpar filtros
            </button>
            <div className="text-xs text-muted-foreground">
              {filteredLeads.length} resultado{filteredLeads.length !== 1 ? 's' : ''} encontrado{filteredLeads.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator para filtros */}
      {isLoadingData && (
        <div className="flex items-center justify-center py-4 mb-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-sm border border-[#E2E8F0]">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#059669]"></div>
            <span className="text-sm text-muted-foreground">Atualizando filtros...</span>
          </div>
        </div>
      )}

      {/* Tabela de Leads */}
      <DataTable
        title="Lista de Leads"
        columns={[
          {
            header: 'Lead',
            render: (lead) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center text-white font-semibold text-sm">
                  {lead.nome_completo.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{lead.nome_completo}</p>
                  <p className="text-sm text-muted-foreground">{lead.email || 'Sem email'}</p>
                </div>
              </div>
            )
          },
          {
            header: 'Empresa',
            render: (lead) => (
              <div>
                <p className="font-medium text-foreground">{lead.empresa || '-'}</p>
                <p className="text-sm text-muted-foreground">{lead.cargo || '-'}</p>
              </div>
            )
          },
          {
            header: 'Origem',
            render: (lead) => (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                {lead.origem || 'Não informado'}
              </span>
            )
          },
          {
            header: 'Status',
            render: (lead) => (
              <div className="flex flex-col gap-1">
                <StatusBadge status={(statusMap as any)[lead.status] || 'pending'} />
                {lead.data_venda && (
                  <div className="flex items-center gap-1">
                    {lead.desistiu ? (
                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                        Desistiu
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                        Ativo
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          },
          {
            header: 'Valor',
            render: (lead) => (
              <div className="text-right">
                {lead.valor_vendido ? (
                  <div>
                    <p className="font-semibold text-primary">{formatCurrency(lead.valor_vendido)}</p>
                    {lead.data_venda && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Vendido em {formatDate(lead.data_venda)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">-</p>
                )}
              </div>
            )
          },
          {
            header: 'Data',
            render: (lead) => (
              <span className="text-sm text-muted-foreground">{formatDate(lead.created_at)}</span>
            )
          },
          {
            header: 'Ações',
            render: (lead) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewDetails(lead)}
className="p-2 hover:bg-muted rounded-lg transition-colors group"
                  title="Ver detalhes"
                >
                  <Eye className="w-4 h-4 text-muted-foreground group-hover:text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleViewDetails(lead)}
className="p-2 hover:bg-muted rounded-lg transition-colors group"
                  title="Análise detalhada"
                >
                  <BarChart3 className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </button>
                <button
                  onClick={() => router.push(`/agendar/lead/${lead.id}`)}
className="p-2 hover:bg-muted rounded-lg transition-colors group"
                  title="Agendar call"
                >
                  <Calendar className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </button>
                <button
                  onClick={() => handleEditLead(lead)}
className="p-2 hover:bg-muted rounded-lg transition-colors group"
                  title="Editar"
                >
                  <Edit className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </button>
                {lead.status === 'vendido' && !lead.convertido_em && (
                  <button
                    onClick={() => handleConvertToMentorado(lead)}
  className="p-2 hover:bg-muted rounded-lg transition-colors group"
                    title="Converter em Mentorado"
                  >
                    <UserPlus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </button>
                )}
                {lead.telefone && (
                  <button
  className="p-2 hover:bg-muted rounded-lg transition-colors group"
                    title="Ligar"
                  >
                    <Phone className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </button>
                )}
                {lead.email && (
                  <button
  className="p-2 hover:bg-muted rounded-lg transition-colors group"
                    title="Enviar email"
                  >
                    <Mail className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteLead(lead.id)}
className="p-2 hover:bg-muted rounded-lg transition-colors group"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground group-hover:text-destructive" />
                </button>
              </div>
            )
          }
        ]}
        data={filteredLeads}
      />

      {/* Modal de Detalhes da Origem */}
      {showOrigemModal && selectedOrigem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                Detalhes da Origem: {selectedOrigem.name}
              </h2>
              <button
                onClick={() => setShowOrigemModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedOrigem.color }}
                  />
                  <h3 className="font-semibold text-foreground">Total de Leads</h3>
                </div>
                <p className="text-3xl font-bold text-blue-600">{selectedOrigem.value}</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6">
                <h3 className="font-semibold text-foreground mb-2">Taxa de Conversão</h3>
                <p className="text-3xl font-bold text-green-600">{selectedOrigem.taxaConversao.toFixed(1)}%</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6">
                <h3 className="font-semibold text-foreground mb-2">Valor Arrecadado</h3>
                <p className="text-3xl font-bold text-orange-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(selectedOrigem.valorPago)}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="font-semibold text-foreground mb-4">Performance Detalhada</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ticket Médio</span>
                  <span className="font-semibold">
                    {selectedOrigem.value > 0
                      ? new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(selectedOrigem.valorPago / (selectedOrigem.value * selectedOrigem.taxaConversao / 100))
                      : 'R$ 0,00'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Leads Convertidos</span>
                  <span className="font-semibold">
                    {Math.round(selectedOrigem.value * selectedOrigem.taxaConversao / 100)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ROI Estimado</span>
                  <span className="font-semibold text-green-600">
                    {selectedOrigem.valorPago > 0 ? '+' : ''}
                    {((selectedOrigem.valorPago / Math.max(selectedOrigem.value * 50, 1) - 1) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setOrigemFilter(selectedOrigem.name.toLowerCase())
                  setShowOrigemModal(false)
                }}
className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-medium transition-colors"
              >
                Filtrar por esta origem
              </button>
              <button
                onClick={() => setShowOrigemModal(false)}
                className="px-6 py-3 border border-gray-300 hover:bg-gray-50 rounded-xl font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição/Criação de Lead */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                {editingLead ? `Editar Lead: ${editingLead.nome_completo}` : 'Criar Novo Lead'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingLead(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <EditLeadForm
              lead={editingLead}
              onSave={async (leadData) => {
                try {
                  if (editingLead) {
                    // Editar lead existente
                    const { error } = await supabase
                      .from('leads')
                      .update(leadData)
                      .eq('id', editingLead.id)

                    if (error) throw error
                  } else {
                    // Criar novo lead
                    const { error } = await supabase
                      .from('leads')
                      .insert(leadData)

                    if (error) throw error
                  }

                  setIsModalOpen(false)
                  setEditingLead(null)
                  await loadLeads() // Recarregar dados
                } catch (error) {
                  console.error('Erro ao salvar lead:', error)
                  alert(editingLead ? 'Erro ao salvar alterações' : 'Erro ao criar lead')
                }
              }}
              onCancel={() => {
                setIsModalOpen(false)
                setEditingLead(null)
              }}
            />
          </div>
        </div>
      )}
    </PageLayout>
  )
}

// Componente de formulário de edição/criação
function EditLeadForm({ lead, onSave, onCancel }: {
  lead: Lead | null
  onSave: (lead: Partial<Lead>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    nome_completo: lead?.nome_completo || '',
    email: lead?.email || '',
    telefone: lead?.telefone || '',
    empresa: lead?.empresa || '',
    cargo: lead?.cargo || '',
    origem: lead?.origem || '',
    status: lead?.status || 'novo',
    temperatura: lead?.temperatura || 'morno',
    // prioridade: lead?.prioridade || 'media', // Temporariamente removido - aguardando campo no Supabase
    observacoes: lead?.observacoes || '',
    valor_vendido: lead?.valor_vendido || '',
    valor_arrecadado: lead?.valor_arrecadado || '',
    data_venda: lead?.data_venda || '',
    mentorado_indicador_id: lead?.mentorado_indicador_id || '',
    fonte_referencia: lead?.fonte_referencia || '',
    valor_potencial: lead?.valor_potencial || '',
    lead_score: lead?.lead_score || 0
  })

  const [mentorados, setMentorados] = useState<Mentorado[]>([])

  // Carregar lista de mentorados
  useEffect(() => {
    async function loadMentorados() {
      try {
        const { data, error } = await supabase
          .from('mentorados')
          .select('id, nome_completo, email')
          .order('nome_completo')

        if (error) throw error
        setMentorados(data || [])
      } catch (error) {
        console.error('Erro ao carregar mentorados:', error)
      }
    }

    loadMentorados()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData: any = {
      ...formData,
      // Converter campos numéricos corretamente
      valor_vendido: formData.valor_vendido ? parseFloat(formData.valor_vendido as string) : null,
      valor_arrecadado: formData.valor_arrecadado ? parseFloat(formData.valor_arrecadado as string) : null,
      valor_potencial: formData.valor_potencial ? parseFloat(formData.valor_potencial as string) : null,
      lead_score: formData.lead_score || 0,
      // Campos de data e relacionamento
      data_venda: formData.data_venda || null,
      mentorado_indicador_id: formData.mentorado_indicador_id || null,
      fonte_referencia: formData.fonte_referencia || null,
      // Garantir que campos de texto vazios sejam null
      email: formData.email?.trim() || null,
      telefone: formData.telefone?.trim() || null,
      empresa: formData.empresa?.trim() || null,
      cargo: formData.cargo?.trim() || null,
      observacoes: formData.observacoes?.trim() || null,
    }

    // Se for um novo lead (não está editando), adicionar data_primeiro_contato
    if (!lead) {
      submitData.data_primeiro_contato = new Date().toISOString()
    }

    onSave(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome Completo *
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={formData.nome_completo}
              onChange={(e) => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
              className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gradient-to-r from-white to-gray-50"
              placeholder="Ex: João da Silva"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Users className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <div className="relative">
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gradient-to-r from-white to-gray-50"
              placeholder="Ex: joao@empresa.com"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Mail className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefone
          </label>
          <div className="relative">
            <input
              type="tel"
              value={formData.telefone}
              onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
              className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gradient-to-r from-white to-gray-50"
              placeholder="Ex: (11) 99999-9999"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Phone className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Empresa
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.empresa}
              onChange={(e) => setFormData(prev => ({ ...prev, empresa: e.target.value }))}
              className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gradient-to-r from-white to-gray-50"
              placeholder="Ex: Tech Solutions Ltda"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Building className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cargo
          </label>
          <input
            type="text"
            value={formData.cargo}
            onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gradient-to-r from-white to-gray-50"
            placeholder="Ex: CEO, Gerente, Analista"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Origem
          </label>
          <select
            value={formData.origem}
            onChange={(e) => setFormData(prev => ({ ...prev, origem: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gradient-to-r from-white to-gray-50"
          >
            <option value="">Selecione uma origem</option>
            <option value="eventos-proprios">Eventos Próprios</option>
            <option value="parcerias">Parcerias</option>
            <option value="sessao-fechada">Sessão Fechada</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="trafego">Tráfego</option>
            <option value="social-seller">Social Seller</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
            <option value="indicacao">Indicação</option>
            <option value="google">Google</option>
            <option value="site">Site</option>
            <option value="outros">Outros</option>
          </select>
        </div>

        {/* Campos de Indicação - aparecem quando origem for indicação */}
        {formData.origem === 'indicacao' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mentorado que Indicou *
              </label>
              <select
                value={formData.mentorado_indicador_id}
                onChange={(e) => setFormData(prev => ({ ...prev, mentorado_indicador_id: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gradient-to-r from-white to-gray-50"
                required
              >
                <option value="">Selecione quem indicou</option>
                {mentorados.map((mentorado) => (
                  <option key={mentorado.id} value={mentorado.id}>
                    {mentorado.nome_completo} ({mentorado.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detalhes da Indicação
              </label>
              <input
                type="text"
                value={formData.fonte_referencia}
                onChange={(e) => setFormData(prev => ({ ...prev, fonte_referencia: e.target.value }))}
                placeholder="Como foi feita a indicação? (ex: WhatsApp, conversa pessoal, etc.)"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gradient-to-r from-white to-gray-50"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gradient-to-r from-white to-gray-50"
          >
            <option value="novo">Novo</option>
            <option value="contactado">Contactado</option>
            <option value="qualificado">Qualificado</option>
            <option value="agendado">Agendado</option>
            <option value="no-show">No-show</option>
            <option value="vendido">Vendido</option>
            <option value="quente">Quente</option>
            <option value="call_agendada">Call Agendada</option>
            <option value="proposta_enviada">Proposta Enviada</option>
            <option value="perdido">Perdido</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-gradient-to-br from-red-50 to-orange-100 p-4 rounded-xl border border-orange-200">
            <label className="block text-sm font-medium text-orange-700 mb-2 flex items-center gap-2">
              <span className="text-lg">🌡️</span>
              Temperatura
            </label>
            <div className="relative">
              <select
                value={formData.temperatura}
                onChange={(e) => setFormData(prev => ({ ...prev, temperatura: e.target.value }))}
                className="w-full px-4 py-3 pr-10 border border-orange-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-white"
              >
                <option value="quente">🔥 Quente - Alta probabilidade</option>
                <option value="morno">🌟 Morno - Média probabilidade</option>
                <option value="frio">❄️ Frio - Baixa probabilidade</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <div className={`w-3 h-3 rounded-full ${formData.temperatura === 'quente' ? 'bg-red-500 animate-pulse' : formData.temperatura === 'morno' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
              </div>
            </div>
          </div>

          {/* Campo Prioridade temporariamente desabilitado - aguardando adição no Supabase */}
          {/*
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
            <label className="block text-sm font-medium text-purple-700 mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Prioridade
            </label>
            <div className="relative">
              <select
                value={formData.prioridade}
                onChange={(e) => setFormData(prev => ({ ...prev, prioridade: e.target.value }))}
                className="w-full px-4 py-3 pr-10 border border-purple-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-white"
              >
                <option value="alta">🚨 Alta</option>
                <option value="media">⭐ Média</option>
                <option value="baixa">📝 Baixa</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <div className={`w-3 h-3 rounded-full ${formData.prioridade === 'alta' ? 'bg-red-500 animate-pulse' : formData.prioridade === 'media' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
              </div>
            </div>
          </div>
          */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
            <label className="block text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              💰 Valor Potencial (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.valor_potencial}
              onChange={(e) => setFormData(prev => ({ ...prev, valor_potencial: e.target.value }))}
              className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-white"
              placeholder="Valor estimado da venda"
            />
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
            <label className="block text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              ✅ Valor Vendido (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.valor_vendido}
              onChange={(e) => setFormData(prev => ({ ...prev, valor_vendido: e.target.value }))}
              className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-white"
              placeholder="Valor efetivamente vendido"
            />
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
            <label className="block text-sm font-medium text-purple-700 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              💳 Valor Arrecadado (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.valor_arrecadado}
              onChange={(e) => setFormData(prev => ({ ...prev, valor_arrecadado: e.target.value }))}
              className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-white"
              placeholder="Valor já recebido"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
            <label className="block text-sm font-medium text-orange-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              📅 Data de Venda
            </label>
            <input
              type="date"
              value={formData.data_venda}
              onChange={(e) => setFormData(prev => ({ ...prev, data_venda: e.target.value }))}
              className="w-full px-4 py-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-white"
            />
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
            <label className="block text-sm font-medium text-indigo-700 mb-2 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              📊 Lead Score (0-100)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                value={formData.lead_score}
                onChange={(e) => setFormData(prev => ({ ...prev, lead_score: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 pr-10 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-white"
                placeholder="Score do lead (0-100)"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <div className={`w-3 h-3 rounded-full ${
                  formData.lead_score >= 80 ? 'bg-green-500 animate-pulse' :
                  formData.lead_score >= 60 ? 'bg-yellow-500' :
                  formData.lead_score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                }`}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          📝 Observações
        </label>
        <textarea
          rows={4}
          value={formData.observacoes}
          onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md resize-none bg-white"
          placeholder="Adicione observações detalhadas sobre este lead... Ex: Demonstrou interesse em pacote premium, tem orçamento aprovado, decisor principal."
        />
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-3 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-2"
        >
          ✖️ Cancelar
        </button>
        <button
          type="submit"
          className="px-8 py-3 bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#065f46] text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
        >
          {lead ? '💾 Salvar Alterações' : '✨ Criar Lead'}
        </button>
      </div>
    </form>
  )
}