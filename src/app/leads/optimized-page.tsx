'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { KPICardVibrant } from '@/components/ui/kpi-card-vibrant'
import { MetricCard } from '@/components/ui/metric-card'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { ChartCard } from '@/components/ui/chart-card'
import { ChurnRateCard } from '@/components/churn-rate-card'
import { OptimizedTableSkeleton, TableLoadingSkeleton } from '@/components/ui/optimized-table-skeleton'
import { useOptimizedLeads } from '@/hooks/use-optimized-leads'
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
  UserPlus,
  AlertCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts'

// Import types from the original file
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
  observacoes: string | null
  valor_vendido: number | null
  valor_arrecadado: number | null
  data_primeiro_contato: string
  data_venda: string | null
  created_at: string
  updated_at: string
  mentorado_indicador_id?: string | null
  fonte_referencia?: string | null
}

const origemColors = {
  'Instagram': '#F59E0B',
  'WhatsApp': '#059669',
  'Indicação': '#3B82F6',
  'Site': '#EF4444',
  'LinkedIn': '#8B5CF6',
  'Facebook': '#1877F2',
  'Google': '#EA4335',
  'TikTok': '#FF0050',
  'YouTube': '#FF0000',
  'Tráfego': '#6366F1',
  'Social Seller': '#EC4899',
  'Eventos Próprios': '#8B5CF6',
  'Parcerias': '#10B981',
  'Sessão Fechada': '#F59E0B',
  'Outros': '#94A3B8'
}

const statusMap = {
  novo: 'new',
  contactado: 'contacted',
  agendado: 'scheduled',
  quente: 'hot',
  vendido: 'converted',
  perdido: 'lost',
  vazado: 'leaked'
}

export default function OptimizedLeadsPage() {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    status: 'todos',
    origem: 'todas',
    dateFilter: 'mes_atual',
    customStartDate: '',
    customEndDate: ''
  })

  // UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedOrigem, setSelectedOrigem] = useState<any>(null)
  const [showOrigemModal, setShowOrigemModal] = useState(false)

  // Use optimized hook
  const {
    leads,
    stats,
    origemData,
    conversionData,
    pagination,
    loading,
    error,
    loadMore,
    refetch,
    searchLeads,
    isStale
  } = useOptimizedLeads(filters, 25)

  // Filter leads by search term on client side for instant feedback
  const filteredLeads = searchLeads(searchTerm)

  // Utility functions
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }, [])

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }, [])

  // Handle filter changes with debouncing
  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
        if (scrollHeight - scrollTop <= clientHeight * 1.5) {
          loadMore()
        }
      }
    }

    const scrollElement = scrollRef.current
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll)
      return () => scrollElement.removeEventListener('scroll', handleScroll)
    }
  }, [loadMore])

  // Handle actions
  const handleViewDetails = useCallback((lead: Lead) => {
    router.push(`/leads/${lead.id}`)
  }, [router])

  const handleEditLead = useCallback((lead: Lead) => {
    // TODO: Implement edit modal
    console.log('Edit lead:', lead.id)
  }, [])

  const handleDeleteLead = useCallback(async (leadId: string) => {
    if (confirm('Tem certeza que deseja excluir este lead?')) {
      // TODO: Implement delete functionality
      console.log('Delete lead:', leadId)
      refetch()
    }
  }, [refetch])

  const handleConvertToMentorado = useCallback(async (lead: Lead) => {
    if (!lead.email) {
      alert('Não é possível converter lead sem email. Por favor, adicione um email ao lead primeiro.')
      return
    }
    if (!confirm(`Converter "${lead.nome_completo}" em mentorado?`)) {
      return
    }
    // TODO: Implement conversion logic
    console.log('Convert to mentorado:', lead.id)
  }, [])

  // Loading state
  if (loading && leads.length === 0) {
    return (
      <PageLayout title="Leads" subtitle="Gestão completa de leads e oportunidades">
        <OptimizedTableSkeleton
          title="Lista de Leads"
          rows={10}
          columns={6}
          showActions={true}
          showStats={true}
        />
      </PageLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <PageLayout title="Leads" subtitle="Gestão completa de leads e oportunidades">
        <div className="flex flex-col items-center justify-center h-96">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Erro ao carregar leads</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Tentar Novamente
          </button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Leads" subtitle="Gestão completa de leads e oportunidades">
      <div ref={scrollRef} className="h-screen overflow-y-auto">
        {/* Stale data indicator */}
        {isStale && (
          <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />
              <span className="text-sm text-orange-500">Dados podem estar desatualizados. Atualizando em segundo plano...</span>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICardVibrant
            title="Total de Leads"
            value={stats.total_leads.toString()}
            subtitle="Este período"
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
            value={formatCurrency(stats.valor_total_arrecadado)}
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Conversion Chart */}
          <div className="lg:col-span-2">
            <ChartCard title="Evolução da Taxa de Conversão e Volume de Leads" subtitle="Últimos 6 meses">
              <div className="flex items-center justify-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#059669] rounded"></div>
                  <span className="text-sm text-muted-foreground">Taxa de Conversão (%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#3B82F6] rounded"></div>
                  <span className="text-sm text-muted-foreground">Volume de Leads</span>
                </div>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={conversionData}>
                    <defs>
                      <linearGradient id="colorConversion" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="stroke-muted-foreground" fontSize={12} />
                    <YAxis
                      yAxisId="taxa"
                      orientation="left"
                      className="stroke-muted-foreground"
                      fontSize={12}
                      label={{ value: 'Taxa (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis
                      yAxisId="leads"
                      orientation="right"
                      className="stroke-muted-foreground"
                      fontSize={12}
                      label={{ value: 'Leads', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.08)'
                      }}
                      formatter={(value, name) => [
                        name === 'taxa' ? `${Number(value).toFixed(1)}%` : `${value} leads`,
                        name === 'taxa' ? 'Taxa de Conversão' : 'Total de Leads'
                      ]}
                    />
                    <Area
                      yAxisId="leads"
                      type="monotone"
                      dataKey="leads"
                      stroke="#3B82F6"
                      fillOpacity={1}
                      fill="url(#colorLeads)"
                      strokeWidth={2}
                    />
                    <Area
                      yAxisId="taxa"
                      type="monotone"
                      dataKey="taxa"
                      stroke="#059669"
                      fillOpacity={1}
                      fill="url(#colorConversion)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Origins Chart */}
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
                    formatter={(value) => [value, 'Leads']}
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

        {/* Actions and Search */}
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
              {(filters.status !== 'todos' || filters.origem !== 'todas' || filters.dateFilter !== 'mes_atual') && (
                <span className="ml-1 px-2 py-0.5 bg-destructive text-destructive-foreground text-xs rounded-full">
                  {[filters.status !== 'todos', filters.origem !== 'todas', filters.dateFilter !== 'mes_atual'].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={refetch}
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
              onClick={() => console.log('New lead')}
              className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Lead
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => updateFilters({ status: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="novo">Novo</option>
                  <option value="contactado">Contactado</option>
                  <option value="agendado">Agendado</option>
                  <option value="quente">Quente</option>
                  <option value="vendido">Vendido</option>
                  <option value="perdido">Perdido</option>
                  <option value="vazado">Vazado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">Origem</label>
                <select
                  value={filters.origem}
                  onChange={(e) => updateFilters({ origem: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
                >
                  <option value="todas">Todas as Origens</option>
                  <option value="Instagram">Instagram</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Indicação">Indicação</option>
                  <option value="Site">Site</option>
                  <option value="LinkedIn">LinkedIn</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">Período</label>
                <select
                  value={filters.dateFilter}
                  onChange={(e) => updateFilters({ dateFilter: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
                >
                  <option value="mes_atual">Mês Atual</option>
                  <option value="ano_atual">Ano Atual</option>
                  <option value="semana_atual">Semana Atual</option>
                  <option value="todos">Todas as Datas</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>

              {filters.dateFilter === 'personalizado' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-2">Data Início</label>
                    <input
                      type="date"
                      value={filters.customStartDate}
                      onChange={(e) => updateFilters({ customStartDate: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-2">Data Fim</label>
                    <input
                      type="date"
                      value={filters.customEndDate}
                      onChange={(e) => updateFilters({ customEndDate: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-600">
              <button
                onClick={() => {
                  updateFilters({
                    status: 'todos',
                    origem: 'todas',
                    dateFilter: 'mes_atual',
                    customStartDate: '',
                    customEndDate: ''
                  })
                }}
                className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                Limpar filtros
              </button>
              <div className="text-xs text-gray-400">
                {filteredLeads.length} resultado{filteredLeads.length !== 1 ? 's' : ''} encontrado{filteredLeads.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <DataTable
          title="Lista de Leads"
          columns={[
            {
              header: 'Lead',
              render: (lead: Lead) => (
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
              render: (lead: Lead) => (
                <div>
                  <p className="font-medium text-foreground">{lead.empresa || '-'}</p>
                  <p className="text-sm text-muted-foreground">{lead.cargo || '-'}</p>
                </div>
              )
            },
            {
              header: 'Origem',
              render: (lead: Lead) => {
                const origem = lead.origem || 'Outros'
                const cor = origemColors[origem as keyof typeof origemColors] || '#94A3B8'
                return (
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: cor }}
                  >
                    {origem}
                  </span>
                )
              }
            },
            {
              header: 'Status',
              render: (lead: Lead) => (
                <StatusBadge status={(statusMap as any)[lead.status] || 'pending'} />
              )
            },
            {
              header: 'Valor',
              render: (lead: Lead) => (
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
              header: 'Ações',
              render: (lead: Lead) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewDetails(lead)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors group"
                    title="Ver detalhes"
                  >
                    <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </button>
                  <button
                    onClick={() => handleEditLead(lead)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors group"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </button>
                  {lead.status === 'vendido' && (
                    <button
                      onClick={() => handleConvertToMentorado(lead)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors group"
                      title="Converter em Mentorado"
                    >
                      <UserPlus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
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

        {/* Load More */}
        {pagination.hasMore && (
          <TableLoadingSkeleton />
        )}

        {/* Total counter */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Mostrando {leads.length} de {pagination.total} leads
          {pagination.hasMore && ' (carregando mais automaticamente)'}
        </div>
      </div>
    </PageLayout>
  )
}