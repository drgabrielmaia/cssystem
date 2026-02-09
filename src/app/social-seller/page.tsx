'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useSettings } from '@/contexts/settings'
import { useDateFilters } from '@/hooks/useDateFilters'
import { DateFilters } from '@/components/date-filters'
import {
  TrendingUp,
  TrendingDown,
  Users,
  PhoneOff,
  DollarSign,
  CheckCircle,
  XCircle,
  Calendar,
  Target,
  UserPlus,
  RefreshCw,
  Filter,
  Plus,
  X
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface LeadsMetrics {
  total_leads: number
  leads_vendidos: number
  leads_nao_vendidos: number
  leads_vazados: number
  leads_no_show: number
  leads_qualificados: number
  leads_agendados: number
  leads_quentes: number
  valor_vendido: number
  valor_arrecadado: number
  taxa_conversao: number
}

interface Lead {
  id: string
  status: string
  valor_vendido?: number
  valor_arrecadado?: number
  data_primeiro_contato?: string
  data_venda?: string
  convertido_em?: string
  status_updated_at?: string
  nome_completo?: string
  email?: string
  telefone?: string
  origem?: string
  observacoes?: string
}


export default function SocialSellerPage() {
  const { settings } = useSettings()
  const dateFilters = useDateFilters()
  const [metrics, setMetrics] = useState<LeadsMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [allLeadsData, setAllLeadsData] = useState<Lead[]>([])
  const [showModal, setShowModal] = useState(false)
  const [modalData, setModalData] = useState<{title: string, leads: Lead[]}>({title: '', leads: []})


  useEffect(() => {
    loadSocialSellerData()

    // Configurar atualização automática a cada 30 segundos
    const interval = setInterval(() => {
      console.log('🔄 Atualizando dados do Social Seller automaticamente...')
      loadSocialSellerData()
    }, 30000)

    // Limpar interval ao desmontar componente
    return () => clearInterval(interval)
  }, [dateFilters.filtroTempo, dateFilters.dataInicio, dateFilters.dataFim])

  const loadSocialSellerData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      console.log('📊 Carregando métricas baseadas em leads...')

      // Carregar TODOS os leads primeiro, depois filtrar
      const { data: allLeads, error: leadsError } = await supabase
        .from('leads')
        .select('id, status, valor_vendido, valor_arrecadado, data_primeiro_contato, data_venda, convertido_em, status_updated_at, nome_completo, email, telefone, origem, observacoes')

      if (leadsError) {
        console.error('Erro ao carregar leads:', leadsError)
        throw leadsError
      }

      console.log('📊 Leads carregados:', allLeads)

      // Aplicar filtro de data se necessário
      const dateFilter = dateFilters.getDateFilter()
      let leadsParaContar = allLeads || []

      if (dateFilter && allLeads) {
        leadsParaContar = allLeads.filter(lead => {
          // Para cada tipo de lead, usar a data mais apropriada
          let dataReferencia: string | null = null
          
          switch(lead.status) {
            case 'vendido':
              // Para vendidos: priorizar data_venda, depois convertido_em, depois status_updated_at
              dataReferencia = lead.data_venda || lead.convertido_em || lead.status_updated_at || lead.data_primeiro_contato
              break
            case 'perdido':
            case 'vazado':
            case 'no-show':
              // Para finalizados: usar status_updated_at (quando mudou para esse status)
              dataReferencia = lead.status_updated_at || lead.data_primeiro_contato
              break
            case 'qualificado':
            case 'agendado':
            case 'quente':
            default:
              // Para em andamento: usar data_primeiro_contato (quando entrou)
              dataReferencia = lead.data_primeiro_contato
              break
          }

          if (!dataReferencia) return true

          const dataLead = new Date(dataReferencia)

          if (dateFilter.start && dateFilter.end) {
            const startDate = new Date(dateFilter.start)
            const endDate = new Date(dateFilter.end)
            return dataLead >= startDate && dataLead <= endDate
          } else if (dateFilter.start) {
            const startDate = new Date(dateFilter.start)
            return dataLead >= startDate
          } else if (dateFilter.end) {
            const endDate = new Date(dateFilter.end)
            return dataLead <= endDate
          }

          return true
        })
      }

      const totalLeads = leadsParaContar.length
      const leadsVendidos = leadsParaContar.filter(l => l.status === 'vendido').length
      const leadsNaoVendidos = leadsParaContar.filter(l => l.status === 'perdido').length
      const leadsVazados = leadsParaContar.filter(l => l.status === 'vazado').length
      const leadsNoShow = leadsParaContar.filter(l => l.status === 'no-show').length
      const leadsQualificados = leadsParaContar.filter(l => l.status === 'qualificado').length
      const leadsAgendados = leadsParaContar.filter(l => l.status === 'agendado').length
      const leadsQuentes = leadsParaContar.filter(l => l.status === 'quente').length

      // Armazenar todos os dados para uso nos modais
      setAllLeadsData(leadsParaContar)

      const valorVendido = leadsParaContar.filter(l => l.status === 'vendido').reduce((sum, lead) => sum + (lead.valor_vendido || 0), 0)
      const valorArrecadado = leadsParaContar.filter(l => l.status === 'vendido').reduce((sum, lead) => sum + (lead.valor_arrecadado || 0), 0)

      const taxaConversao = (leadsVendidos + leadsNaoVendidos) > 0
        ? Math.round((leadsVendidos / (leadsVendidos + leadsNaoVendidos)) * 100 * 100) / 100
        : 0

      const calculatedMetrics: LeadsMetrics = {
        total_leads: totalLeads,
        leads_vendidos: leadsVendidos,
        leads_nao_vendidos: leadsNaoVendidos,
        leads_vazados: leadsVazados,
        leads_no_show: leadsNoShow,
        leads_qualificados: leadsQualificados,
        leads_agendados: leadsAgendados,
        leads_quentes: leadsQuentes,
        valor_vendido: valorVendido,
        valor_arrecadado: valorArrecadado,
        taxa_conversao: taxaConversao
      }

      console.log('📈 Métricas calculadas:', calculatedMetrics)
      setMetrics(calculatedMetrics)

    } catch (error) {
      console.error('💥 Erro geral:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLastUpdate(new Date())
    }
  }

  // Função para refresh manual
  const handleManualRefresh = () => {
    loadSocialSellerData(true)
  }

  // Função para verificar se um lead tem eventos dentro do período dos filtros
  const hasEventInPeriod = async (leadId: string) => {
    try {
      const dateFilter = dateFilters.getDateFilter()
      if (!dateFilter || (!dateFilter.start && !dateFilter.end)) {
        return true // Se não há filtro de data, considera que está no período
      }

      const { data: events, error } = await supabase
        .from('calendar_events')
        .select('start_datetime')
        .eq('lead_id', leadId)

      if (error) {
        console.error('Erro ao buscar eventos do lead:', error)
        return true // Em caso de erro, assume que está no período
      }

      if (!events || events.length === 0) {
        return false // Se não tem eventos agendados, não está no período
      }

      // Verifica se algum evento está dentro do período
      return events.some(event => {
        const eventDate = new Date(event.start_datetime)

        if (dateFilter.start && dateFilter.end) {
          const startDate = new Date(dateFilter.start)
          const endDate = new Date(dateFilter.end)
          return eventDate >= startDate && eventDate <= endDate
        } else if (dateFilter.start) {
          const startDate = new Date(dateFilter.start)
          return eventDate >= startDate
        } else if (dateFilter.end) {
          const endDate = new Date(dateFilter.end)
          return eventDate <= endDate
        }

        return true
      })
    } catch (error) {
      console.error('Erro ao verificar eventos no período:', error)
      return true // Em caso de erro, assume que está no período
    }
  }

  // Funções para abrir modais com detalhes
  const handleShowLeads = async (status: string, title: string) => {
    let filteredLeads = allLeadsData.filter(lead => {
      switch(status) {
        case 'vendido':
          return lead.status === 'vendido'
        case 'nao-vendido':
          return lead.status === 'perdido'
        case 'vazado':
          return lead.status === 'vazado'
        case 'no-show':
          return lead.status === 'no-show'
        case 'qualificado':
          return lead.status === 'qualificado'  // Apenas status 'qualificado'
        case 'agendado':
          return lead.status === 'agendado' // Primeiro filtro por status
        case 'quente':
          return lead.status === 'quente'
        default:
          return false
      }
    })

    // Para agendado, aplicar filtro adicional por período de eventos
    if (status === 'agendado') {
      const leadsWithEventsInPeriod = []
      for (const lead of filteredLeads) {
        const hasEvent = await hasEventInPeriod(lead.id)
        if (hasEvent) {
          leadsWithEventsInPeriod.push(lead)
        }
      }
      filteredLeads = leadsWithEventsInPeriod
    }

    setModalData({ title, leads: filteredLeads })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setModalData({ title: '', leads: [] })
  }

  const getPieChartData = () => {
    if (!metrics) return []

    return [
      { name: 'Qualificados', value: metrics.leads_qualificados, color: '#3b82f6' },
      { name: 'Agendados', value: metrics.leads_agendados, color: '#8b5cf6' },
      { name: 'No-Show', value: metrics.leads_no_show, color: '#f97316' },
      { name: 'Vendidos', value: metrics.leads_vendidos, color: '#10b981' },
      { name: 'Quentes', value: metrics.leads_quentes, color: '#f59e0b' },
      { name: 'Não Vendidos', value: metrics.leads_nao_vendidos, color: '#ef4444' },
      { name: 'Vazados', value: metrics.leads_vazados, color: '#6366f1' },
    ].filter(item => item.value > 0)
  }


  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const pieData = getPieChartData()

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="Performance" subtitle="Carregando métricas..." />
        <main className="flex-1 p-6">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Se não há dados, mostrar mensagem
  if (!metrics) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="Performance" subtitle="Nenhum lead cadastrado ainda" />
        <main className="flex-1 p-6">
          <Card className="text-center py-12">
            <CardContent>
              <UserPlus className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum lead cadastrado
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Para ver as métricas, você precisa cadastrar leads:
              </p>
              <div className="space-y-2 text-left max-w-md mx-auto">
                <div className="flex items-center">
                  <UserPlus className="h-4 w-4 mr-2 text-blue-500" />
                  <span>1. Cadastrar leads na aba "Leads"</span>
                </div>
                <div className="flex items-center">
                  <Target className="h-4 w-4 mr-2 text-green-500" />
                  <span>2. Atualizar status dos leads (vendido, perdido, etc.)</span>
                </div>
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-purple-500" />
                  <span>3. Definir valores vendidos e arrecadados</span>
                </div>
              </div>
              <div className="mt-6">
                <Button onClick={() => window.location.href = '/leads'}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Cadastrar Leads
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance</h1>
          <p className="text-gray-600">
            {`${metrics?.total_leads || 0} leads totais • ${metrics?.leads_vendidos || 0} vendidos • Taxa de conversão: ${metrics?.taxa_conversao || 0}%`}
          </p>
          <p className="text-xs text-gray-400">
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      <main className="flex-1 p-6 space-y-6">
        {/* Filtros de Período */}
        <DateFilters
          filtroTempo={dateFilters.filtroTempo}
          dataInicio={dateFilters.dataInicio}
          dataFim={dateFilters.dataFim}
          setFiltroTempo={dateFilters.setFiltroTempo}
          setDataInicio={dateFilters.setDataInicio}
          setDataFim={dateFilters.setDataFim}
          resetFilters={dateFilters.resetFilters}
        />

        {/* Cards de Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. QUALIFICADO (primeiro) */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-200"
            onClick={() => handleShowLeads('qualificado', 'Leads Qualificados')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Qualificados</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {metrics?.leads_qualificados || 0}
                  </p>
                  <p className="text-xs text-blue-500 font-medium">
                    {metrics?.total_leads ? ((metrics.leads_qualificados / metrics.total_leads) * 100).toFixed(1) : 0}% do total
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          {/* 2. AGENDADO (segundo) */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-200"
            onClick={() => handleShowLeads('agendado', 'Leads Agendados')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Agendados</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {metrics?.leads_agendados || 0}
                  </p>
                  <p className="text-xs text-purple-500 font-medium">
                    {metrics?.total_leads ? ((metrics.leads_agendados / metrics.total_leads) * 100).toFixed(1) : 0}% do total
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          {/* 3. NO-SHOW (terceiro) */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-200"
            onClick={() => handleShowLeads('no-show', 'Leads No-Show')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">No-Shows</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {metrics?.leads_no_show || 0}
                  </p>
                  <p className="text-xs text-orange-500 font-medium">
                    {metrics?.total_leads ? ((metrics.leads_no_show / metrics.total_leads) * 100).toFixed(1) : 0}% do total
                  </p>
                </div>
                <PhoneOff className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          {/* 4. VENDIDO (quarto) */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-200"
            onClick={() => handleShowLeads('vendido', 'Leads Vendidos')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Vendidos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {metrics?.leads_vendidos || 0}
                  </p>
                  <p className="text-xs text-green-500 font-medium">
                    {metrics?.taxa_conversao || 0}% conversão
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          {/* 5. QUENTE (quinto) */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-200"
            onClick={() => handleShowLeads('quente', 'Leads Quentes')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Quentes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {metrics?.leads_quentes || 0}
                  </p>
                  <p className="text-xs text-yellow-500 font-medium">
                    {metrics?.total_leads ? ((metrics.leads_quentes / metrics.total_leads) * 100).toFixed(1) : 0}% do total
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-200"
            onClick={() => handleShowLeads('nao-vendido', 'Leads Não Vendidos')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Não Vendidos</p>
                  <p className="text-2xl font-bold text-red-600">
                    {metrics?.leads_nao_vendidos || 0}
                  </p>
                  <p className="text-xs text-red-500 font-medium">
                    {metrics?.total_leads ? ((metrics.leads_nao_vendidos / metrics.total_leads) * 100).toFixed(1) : 0}% do total
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-200 bg-indigo-50/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Vazados</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {metrics?.leads_vazados || 0}
                  </p>
                  <p className="text-xs text-indigo-500 font-medium">
                    {metrics?.total_leads ? ((metrics.leads_vazados / metrics.total_leads) * 100).toFixed(1) : 0}% do total
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards de Valores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-2">💰 Valor Vendido</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                  {formatCurrency(metrics?.valor_vendido || 0)}
                </p>
                <div className="mt-4 flex items-center">
                  <div className="flex-1 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full h-3 overflow-hidden">
                    <div
                      className="progress-bar h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                      style={{
                        width: `${Math.min((metrics?.valor_vendido || 0) / settings.meta_faturamento_mes * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                  <span className="ml-3 text-xs font-medium text-gray-500 bg-white/50 px-2 py-1 rounded-full">
                    Meta: {formatCurrency(settings.meta_faturamento_mes)}
                  </span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-2xl shadow-lg float-animation">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-2">💎 Valor Arrecadado</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  {formatCurrency(metrics?.valor_arrecadado || 0)}
                </p>
                <p className="text-xs font-medium bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent mt-1">
                  {metrics?.valor_vendido && metrics.valor_vendido > 0
                    ? `${((metrics.valor_arrecadado / metrics.valor_vendido) * 100).toFixed(1)}% recebido`
                    : '0% recebido'
                  }
                </p>
                <div className="mt-4 flex items-center">
                  <div className="flex-1 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full h-3 overflow-hidden">
                    <div
                      className="progress-bar h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                      style={{
                        width: `${Math.min((metrics?.valor_arrecadado || 0) / settings.meta_arrecadacao_mes * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                  <span className="ml-3 text-xs font-medium text-gray-500 bg-white/50 px-2 py-1 rounded-full">
                    Meta: {formatCurrency(settings.meta_arrecadacao_mes)}
                  </span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 rounded-2xl shadow-lg float-animation" style={{animationDelay: '2s'}}>
                <Target className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-2">📈 Taxa de Conversão</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                  {metrics?.taxa_conversao || 0}%
                </p>
                <div className="mt-4 flex items-center">
                  <div className="flex-1 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full h-3 overflow-hidden">
                    <div
                      className={`progress-bar h-3 rounded-full ${
                        (metrics?.taxa_conversao || 0) >= settings.taxa_conversao_ideal
                          ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                          : (metrics?.taxa_conversao || 0) >= (settings.taxa_conversao_ideal * 0.7)
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-400'
                            : 'bg-gradient-to-r from-red-500 to-pink-400'
                      }`}
                      style={{
                        width: `${Math.min((metrics?.taxa_conversao || 0) / settings.taxa_conversao_ideal * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                  <span className="ml-3 text-xs font-medium text-gray-500 bg-white/50 px-2 py-1 rounded-full">
                    Meta: {settings.taxa_conversao_ideal}%
                  </span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-2xl shadow-lg float-animation" style={{animationDelay: '4s'}}>
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Pizza - Distribuição de Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Distribuição de Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Área - Evolução das Vendas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Distribuição de Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {/* 1. Qualificados */}
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{metrics?.leads_qualificados || 0}</div>
                    <div className="text-sm text-gray-600">Qualificados</div>
                  </div>
                  {/* 2. Agendados */}
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{metrics?.leads_agendados || 0}</div>
                    <div className="text-sm text-gray-600">Agendados</div>
                  </div>
                  {/* 3. No-Show */}
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{metrics?.leads_no_show || 0}</div>
                    <div className="text-sm text-gray-600">No-Show</div>
                  </div>
                  {/* 4. Vendidos */}
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{metrics?.leads_vendidos || 0}</div>
                    <div className="text-sm text-gray-600">Vendidos</div>
                  </div>
                  {/* 5. Quentes */}
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{metrics?.leads_quentes || 0}</div>
                    <div className="text-sm text-gray-600">Quentes</div>
                  </div>
                  {/* 6. Não Vendidos */}
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{metrics?.leads_nao_vendidos || 0}</div>
                    <div className="text-sm text-gray-600">Não Vendidos</div>
                  </div>
                  {/* 7. Vazados */}
                  <div className="text-center p-4 bg-indigo-50 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-600">{metrics?.leads_vazados || 0}</div>
                    <div className="text-sm text-gray-600">Vazados</div>
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">{metrics?.taxa_conversao || 0}%</div>
                  <div className="text-sm text-gray-600">Taxa de Conversão</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </main>

      {/* Modal de Detalhes dos Leads */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#0F172A]">{modalData.title}</h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-[#F1F5F9] rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-[#94A3B8]" />
                </button>
              </div>

              <div className="space-y-4">
                {modalData.leads.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Nenhum lead encontrado nesta categoria.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {modalData.leads.map((lead, index) => (
                      <div
                        key={lead.id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-[#0F172A]">
                              {lead.nome_completo || `Lead #${index + 1}`}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {lead.email || 'Email não informado'}
                            </p>
                            {lead.telefone && (
                              <p className="text-sm text-gray-600">
                                {lead.telefone}
                              </p>
                            )}
                            {lead.origem && (
                              <p className="text-sm text-blue-600 mt-2">
                                Origem: {lead.origem}
                              </p>
                            )}
                            {lead.observacoes && (
                              <p className="text-sm text-gray-500 mt-2">
                                {lead.observacoes}
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              lead.status === 'vendido'
                                ? 'bg-green-100 text-green-800'
                                : lead.status === 'perdido'
                                ? 'bg-red-100 text-red-800'
                                : lead.status === 'vazado'
                                ? 'bg-blue-100 text-blue-800'
                                : lead.status === 'no-show'
                                ? 'bg-orange-100 text-orange-800'
                                : lead.status === 'quente'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {lead.status}
                            </span>
                            {lead.valor_vendido && (
                              <p className="text-sm text-green-600 font-medium mt-2">
                                R$ {lead.valor_vendido.toLocaleString('pt-BR')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}