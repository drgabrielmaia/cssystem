'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useDateFilters } from '@/hooks/useDateFilters'
import { DateFilters } from '@/components/date-filters'
import { useSettings } from '@/contexts/settings'
import { generateLeadsPDF, generateDetailedLeadsPDF, generateDashboardPDF } from '@/lib/pdfGenerator'
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import {
  useDroppable
} from '@dnd-kit/core'
import {
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  User,
  Phone,
  Mail,
  Building,
  Target,
  Calendar,
  Eye,
  Edit,
  Trash2,
  FileDown,
  Activity,
  Users,
  DollarSign,
  TrendingUp,
  FileText,
  Download,
  Search,
  Filter,
  PhoneCall,
  LayoutGrid,
  Table,
  BarChart3,
  PieChart
} from 'lucide-react'

interface Lead {
  id: string
  nome_completo: string
  email: string | null
  telefone: string | null
  empresa: string | null
  cargo: string | null
  origem: string | null
  status: string
  observacoes: string | null
  valor_vendido: number | null
  valor_arrecadado: number | null
  data_primeiro_contato: string
  convertido_em: string | null
  origem_detalhada: string | null
  lead_score: number | null
  temperatura: string | null
  probabilidade_compra: number | null
  valor_estimado: number | null
  created_at: string
  updated_at: string
}

interface LeadStats {
  status: string
  quantidade: number
  valor_total_vendido: number | null
  valor_total_arrecadado: number | null
  valor_medio_vendido: number | null
  valor_medio_arrecadado: number | null
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<LeadStats[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [origemFilter, setOrigemFilter] = useState('todas')
  const [temperaturaFilter, setTemperaturaFilter] = useState('todas')
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban')
  const [dashboardModalOpen, setDashboardModalOpen] = useState(false)
  const [reportPeriod, setReportPeriod] = useState('mes')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const dateFilters = useDateFilters()
  const { settings } = useSettings()

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Estados para paginação e otimização
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const leadsPerPage = 20 // Mostrar apenas 20 leads por vez

  // Estados do formulário
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    empresa: '',
    cargo: '',
    origem: '',
    status: 'novo',
    observacoes: '',
    valor_vendido: '',
    valor_arrecadado: '',
    origem_detalhada: '',
    lead_score: '',
    temperatura: 'frio',
    probabilidade_compra: '',
    valor_estimado: ''
  })

  // Cache das estatísticas para evitar recálculo
  const [statsCache, setStatsCache] = useState<{ [key: string]: LeadStats[] }>({})
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadLeads()
    loadStatsWithCache()
  }, [])

  // Atualizar estatísticas quando filtros mudarem
  useEffect(() => {
    loadStatsWithCache()
  }, [statusFilter, origemFilter, temperaturaFilter, dateFilters.dataInicio, dateFilters.dataFim, dateFilters.filtroTempo])

  // Debounce para busca
  useEffect(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }

    const timer = setTimeout(() => {
      if (searchTerm || statusFilter !== 'todos' || origemFilter !== 'todas' || temperaturaFilter !== 'todas' || dateFilters.hasActiveFilter) {
        loadLeads(1, false) // Recarregar da primeira página quando filtrar
      }
    }, 300)

    setSearchDebounceTimer(timer)

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [searchTerm, statusFilter, origemFilter, temperaturaFilter, dateFilters.dataInicio, dateFilters.dataFim, dateFilters.filtroTempo])

  const loadLeads = async (page = 1, append = false) => {
    try {
      setLoading(page === 1) // Só mostrar loading na primeira página

      const from = (page - 1) * leadsPerPage
      const to = from + leadsPerPage - 1

      // Construir query com filtros do servidor
      let query = supabase
        .from('leads')
        .select('id, nome_completo, email, telefone, empresa, cargo, status, origem, temperatura, observacoes, valor_vendido, valor_arrecadado, data_primeiro_contato, convertido_em, origem_detalhada, lead_score, probabilidade_compra, valor_estimado, created_at, updated_at', { count: 'exact' })

      // Aplicar filtros de texto
      if (searchTerm) {
        query = query.or(`nome_completo.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,empresa.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`)
      }

      // Aplicar filtros de status
      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter)
      }

      if (origemFilter !== 'todas') {
        query = query.eq('origem', origemFilter)
      }

      if (temperaturaFilter !== 'todas') {
        query = query.eq('temperatura', temperaturaFilter)
      }


      // Aplicar filtro de datas personalizadas usando o novo sistema
      const dateFilter = dateFilters.getDateFilter()
      let allLeads = []

      if (dateFilter?.start || dateFilter?.end) {
        // Para filtros de data, precisamos buscar todos os leads e filtrar no JavaScript
        // para usar a lógica correta (convertido_em vs data_primeiro_contato)
        const { data: allData, error: allError } = await query
        if (allError) throw allError

        // Filtrar no JavaScript usando a mesma lógica das estatísticas
        allLeads = allData?.filter(lead => {
          let dataParaFiltro

          if (lead.status === 'vendido') {
            // Para vendidos, usar convertido_em se disponível, senão data_primeiro_contato
            dataParaFiltro = lead.convertido_em || lead.data_primeiro_contato
          } else {
            // Para outros status, usar data_primeiro_contato
            dataParaFiltro = lead.data_primeiro_contato
          }

          if (dataParaFiltro) {
            const dataObj = new Date(dataParaFiltro)
            let incluirLead = true

            if (dateFilter.start && dateFilter.end) {
              incluirLead = dataObj >= new Date(dateFilter.start) && dataObj <= new Date(dateFilter.end)
            } else if (dateFilter.start) {
              incluirLead = dataObj >= new Date(dateFilter.start)
            } else if (dateFilter.end) {
              incluirLead = dataObj <= new Date(dateFilter.end)
            }

            return incluirLead
          }
          return false
        }) || []

        // Aplicar paginação manualmente
        const totalFiltered = allLeads.length
        const paginatedData = allLeads.slice(from, from + leadsPerPage)

        if (append) {
          setLeads(prev => [...prev, ...paginatedData])
        } else {
          setLeads(paginatedData)
        }

        setTotalCount(totalFiltered)
        setHasNextPage(from + leadsPerPage < totalFiltered)
        setCurrentPage(page)
        return
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      if (append) {
        setLeads(prev => [...prev, ...(data || [])])
      } else {
        setLeads(data || [])
      }

      setTotalCount(count || 0)
      setHasNextPage(data && data.length === leadsPerPage)
      setCurrentPage(page)
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
    } finally {
      setLoading(false)
    }
  }


  const loadStatsWithCache = async () => {
    // Criar chave de cache baseada nos filtros atuais
    const cacheKey = `stats_${statusFilter}_${origemFilter}_${temperaturaFilter}_${dateFilters.dataInicio}_${dateFilters.dataFim}_${dateFilters.filtroTempo}`

    // Verificar cache (válido por 2 minutos)
    if (statsCache[cacheKey]) {
      const cacheTime = parseInt(localStorage.getItem(`stats_cache_time_${cacheKey}`) || '0')
      if (Date.now() - cacheTime < 2 * 60 * 1000) {
        setStats(statsCache[cacheKey])
        return
      }
    }

    try {
      // Usar a mesma lógica de filtros que está sendo aplicada aos leads
      let query = supabase
        .from('leads')
        .select('status, valor_vendido, valor_arrecadado, data_primeiro_contato, convertido_em')

      // Aplicar os mesmos filtros
      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter)
      }
      if (origemFilter !== 'todas') {
        query = query.eq('origem', origemFilter)
      }
      if (temperaturaFilter !== 'todas') {
        query = query.eq('temperatura', temperaturaFilter)
      }


      // Aplicar filtro de datas personalizadas usando o novo sistema
      const dateFilter = dateFilters.getDateFilter()
      if (dateFilter?.start || dateFilter?.end) {
        // Para não vendidos, aplicar filtro no SQL normalmente
        if (statusFilter !== 'vendido' && statusFilter !== 'todos') {
          if (dateFilter.start) {
            query = query.gte('data_primeiro_contato', dateFilter.start)
          }
          if (dateFilter.end) {
            query = query.lte('data_primeiro_contato', dateFilter.end)
          }
        }
        // Para vendidos ou todos, vamos filtrar no JavaScript para usar a lógica correta
      }

      const { data, error } = await query

      if (error) throw error

      // Processar dados para criar estatísticas
      const statsMap: { [key: string]: LeadStats } = {}

      data?.forEach(lead => {
        // Aplicar filtro de data no JavaScript para todos os leads quando há filtro de data
        if (dateFilter?.start || dateFilter?.end) {
          let dataParaFiltro

          if (lead.status === 'vendido') {
            // Para vendidos, usar convertido_em se disponível, senão data_primeiro_contato
            dataParaFiltro = lead.convertido_em || lead.data_primeiro_contato
          } else {
            // Para outros status, usar data_primeiro_contato
            dataParaFiltro = lead.data_primeiro_contato
          }

          if (dataParaFiltro) {
            const dataObj = new Date(dataParaFiltro)
            let incluirLead = true

            if (dateFilter.start && dateFilter.end) {
              incluirLead = dataObj >= new Date(dateFilter.start) && dataObj <= new Date(dateFilter.end)
            } else if (dateFilter.start) {
              incluirLead = dataObj >= new Date(dateFilter.start)
            } else if (dateFilter.end) {
              incluirLead = dataObj <= new Date(dateFilter.end)
            }

            if (!incluirLead) return // Pular este lead se não atender ao filtro de data
          }
        }

        if (!statsMap[lead.status]) {
          statsMap[lead.status] = {
            status: lead.status,
            quantidade: 0,
            valor_total_vendido: 0,
            valor_total_arrecadado: 0,
            valor_medio_vendido: 0,
            valor_medio_arrecadado: 0
          }
        }

        statsMap[lead.status].quantidade += 1
        statsMap[lead.status].valor_total_vendido += lead.valor_vendido || 0
        statsMap[lead.status].valor_total_arrecadado += lead.valor_arrecadado || 0
      })

      // Calcular médias
      Object.values(statsMap).forEach(stat => {
        stat.valor_medio_vendido = stat.quantidade > 0 ? (stat.valor_total_vendido || 0) / stat.quantidade : 0
        stat.valor_medio_arrecadado = stat.quantidade > 0 ? (stat.valor_total_arrecadado || 0) / stat.quantidade : 0
      })

      const statsArray = Object.values(statsMap)

      // Salvar no cache
      setStatsCache(prev => ({ ...prev, [cacheKey]: statsArray }))
      localStorage.setItem(`stats_cache_time_${cacheKey}`, Date.now().toString())
      setStats(statsArray)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      // Tentar usar cache antigo se disponível
      if (statsCache[cacheKey]) {
        setStats(statsCache[cacheKey])
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const leadData = {
        ...formData,
        valor_vendido: formData.valor_vendido ? parseFloat(formData.valor_vendido) : null,
        valor_arrecadado: formData.valor_arrecadado ? parseFloat(formData.valor_arrecadado) : null,
        origem_detalhada: formData.origem_detalhada || null,
        lead_score: formData.lead_score ? parseInt(formData.lead_score) : null,
        temperatura: formData.temperatura,
        probabilidade_compra: formData.probabilidade_compra ? parseInt(formData.probabilidade_compra) : null,
        valor_estimado: formData.valor_estimado ? parseFloat(formData.valor_estimado) : null
      }

      if (editingLead) {
        const { error } = await supabase
          .from('leads')
          .update(leadData)
          .eq('id', editingLead.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('leads')
          .insert([leadData])

        if (error) throw error
      }

      await loadLeads()
      await loadStatsWithCache()
      resetForm()
      setIsModalOpen(false)

    } catch (error) {
      console.error('Erro ao salvar lead:', error)
      alert('Erro ao salvar lead')
    }
  }

  const resetForm = () => {
    setFormData({
      nome_completo: '',
      email: '',
      telefone: '',
      empresa: '',
      cargo: '',
      origem: '',
      status: 'novo',
      observacoes: '',
      valor_vendido: '',
      valor_arrecadado: '',
      origem_detalhada: '',
      lead_score: '',
      temperatura: 'frio',
      probabilidade_compra: '',
      valor_estimado: ''
    })
    setEditingLead(null)
  }

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead)
    setFormData({
      nome_completo: lead.nome_completo,
      email: lead.email || '',
      telefone: lead.telefone || '',
      empresa: lead.empresa || '',
      cargo: lead.cargo || '',
      origem: lead.origem || '',
      status: lead.status,
      observacoes: lead.observacoes || '',
      valor_vendido: lead.valor_vendido?.toString() || '',
      valor_arrecadado: lead.valor_arrecadado?.toString() || '',
      origem_detalhada: lead.origem_detalhada || '',
      lead_score: lead.lead_score?.toString() || '',
      temperatura: lead.temperatura || 'frio',
      probabilidade_compra: lead.probabilidade_compra?.toString() || '',
      valor_estimado: lead.valor_estimado?.toString() || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadLeads()
      await loadStatsWithCache()
    } catch (error) {
      console.error('Erro ao excluir lead:', error)
      alert('Erro ao excluir lead')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'novo': { label: 'Novo', className: 'bg-blue-500 text-white shadow-md' },
      'contactado': { label: 'Contactado', className: 'bg-purple-500 text-white shadow-md' },
      'qualificado': { label: 'Qualificado', className: 'bg-indigo-500 text-white shadow-md' },
      'call_agendada': { label: 'Call Agendada', className: 'bg-orange-500 text-white shadow-md' },
      'proposta_enviada': { label: 'Proposta Enviada', className: 'bg-amber-500 text-white shadow-md' },
      'vendido': { label: 'Vendido', className: 'bg-green-600 text-white shadow-md' },
      'perdido': { label: 'Perdido', className: 'bg-red-500 text-white shadow-md' },
      'no-show': { label: 'No-show', className: 'bg-yellow-500 text-white shadow-md' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.novo
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getTotalVendido = () => {
    return stats.reduce((total, stat) => total + (stat.valor_total_vendido || 0), 0)
  }

  const getTotalArrecadado = () => {
    return stats.reduce((total, stat) => total + (stat.valor_total_arrecadado || 0), 0)
  }

  const getTotalLeads = () => {
    return stats.reduce((total, stat) => total + stat.quantidade, 0)
  }

  const getCallsRealizadas = () => {
    // Calls realizadas: proposta_enviada, vendido, perdido, no_show
    const statusCallsRealizadas = ['proposta_enviada', 'vendido', 'perdido', 'no_show']
    return stats
      .filter(stat => statusCallsRealizadas.includes(stat.status))
      .reduce((total, stat) => total + stat.quantidade, 0)
  }

  const getTaxaConversaoCall = () => {
    const callsRealizadas = getCallsRealizadas()
    const vendidos = stats.find(s => s.status === 'vendido')?.quantidade || 0
    return callsRealizadas > 0 ? Math.round((vendidos / callsRealizadas) * 100) : 0
  }

  const getQualificados = () => {
    return stats.find(s => s.status === 'qualificado')?.quantidade || 0
  }

  const getCallsJaFeitas = () => {
    const statusCallsFeitas = ['proposta_enviada', 'vendido', 'perdido']
    return stats
      .filter(stat => statusCallsFeitas.includes(stat.status))
      .reduce((total, stat) => total + stat.quantidade, 0)
  }

  const getPercentualFaturamento = () => {
    const valorVendido = getTotalVendido()
    return settings.meta_faturamento_mes > 0
      ? Math.round((valorVendido / settings.meta_faturamento_mes) * 100)
      : 0
  }

  const getPercentualLeads = () => {
    const leadsVendidos = stats.find(s => s.status === 'vendido')?.quantidade || 0
    return settings.meta_vendas_mes > 0
      ? Math.round((leadsVendidos / settings.meta_vendas_mes) * 100)
      : 0
  }

  // Funções para exportar PDF
  const handleExportPDF = () => {
    try {
      const title = `Relatório de Leads - ${dateFilters.filtroTempo === 'todos' ? 'Todos' : dateFilters.filtroTempo}`
      generateLeadsPDF(filteredLeads, title)
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF. Tente novamente.')
    }
  }

  const handleExportDetailedPDF = () => {
    try {
      const title = `Relatório Detalhado de Leads - ${dateFilters.filtroTempo === 'todos' ? 'Todos' : dateFilters.filtroTempo}`
      generateDetailedLeadsPDF(filteredLeads, title)
    } catch (error) {
      console.error('Erro ao gerar PDF detalhado:', error)
      alert('Erro ao gerar PDF detalhado. Tente novamente.')
    }
  }

  const handleExportDashboardPDF = () => {
    try {
      const title = `Dashboard de Leads - ${dateFilters.filtroTempo === 'todos' ? 'Todos' : dateFilters.filtroTempo}`
      generateDashboardPDF(filteredLeads, stats, title)
    } catch (error) {
      console.error('Erro ao gerar PDF dashboard:', error)
      alert('Erro ao gerar PDF dashboard. Tente novamente.')
    }
  }

  // Função para atualizar status do lead
  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId)

      if (error) throw error

      // Recarregar leads e stats
      await loadLeads()
      await loadStatsWithCache()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status do lead')
    }
  }

  // Agrupar leads por status para kanban
  const getLeadsByStatus = () => {
    const statusColumns = [
      { key: 'novo', label: 'Novo', color: 'bg-blue-500' },
      { key: 'contactado', label: 'Contactado', color: 'bg-purple-500' },
      { key: 'qualificado', label: 'Qualificado', color: 'bg-indigo-500' },
      { key: 'call_agendada', label: 'Call Agendada', color: 'bg-orange-500' },
      { key: 'proposta_enviada', label: 'Proposta Enviada', color: 'bg-amber-500' },
      { key: 'vendido', label: 'Vendido', color: 'bg-green-600' },
      { key: 'perdido', label: 'Perdido', color: 'bg-red-500' },
      { key: 'no_show', label: 'No-show', color: 'bg-yellow-500' }
    ]

    return statusColumns.map(column => ({
      ...column,
      leads: leads.filter(lead => lead.status === column.key)
    }))
  }

  // Filtrar leads baseado na pesquisa e filtros
  // Como os filtros agora são aplicados no servidor, usamos leads diretamente
  const filteredLeads = leads

  // Obter listas únicas para filtros - usar todos os leads para não perder opções
  const allStatusOptions = [
    'todos',
    'novo',
    'contactado',
    'qualificado',
    'nao_qualificado',
    'aguardando_resposta',
    'call_agendada',
    'reagendamento',
    'proposta_enviada',
    'documentacao_pendente',
    'interesse_baixo',
    'orcamento_insuficiente',
    'vendido',
    'perdido',
    'no_show',
    'reativar'
  ]
  const statusOptions = allStatusOptions
  const origemOptions = ['todas', ...Array.from(new Set(leads.map(l => l.origem).filter(Boolean)))]
  const temperaturaOptions = ['todas', 'frio', 'morno', 'quente']

  // Função para obter badge de temperatura
  const getTemperaturaBadge = (temperatura: string | null) => {
    const tempConfig = {
      'frio': { label: '❄️ Frio', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      'morno': { label: '🔥 Morno', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      'quente': { label: '🚀 Quente', className: 'bg-red-100 text-red-700 border-red-200' }
    }

    const config = tempConfig[temperatura as keyof typeof tempConfig] || tempConfig.frio
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getChartData = () => {
    // Pie chart data for status distribution
    const statusData = stats.map(stat => ({
      name: stat.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: stat.quantidade,
      fill: getStatusColor(stat.status)
    }))

    // Bar chart data for revenue by status
    const revenueData = stats.map(stat => ({
      name: stat.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      vendido: stat.valor_total_vendido || 0,
      arrecadado: stat.valor_total_arrecadado || 0
    }))

    // Origin distribution
    const origemData = leads.reduce((acc, lead) => {
      const origem = lead.origem || 'Não informado'
      if (!acc[origem]) {
        acc[origem] = 0
      }
      acc[origem]++
      return acc
    }, {} as Record<string, number>)

    const origemChartData = Object.entries(origemData).map(([key, value]) => ({
      name: key,
      value,
      fill: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`
    }))

    return { statusData, revenueData, origemChartData }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'novo': '#3b82f6',
      'contactado': '#8b5cf6',
      'qualificado': '#06b6d4',
      'call_agendada': '#f59e0b',
      'proposta_enviada': '#eab308',
      'vendido': '#10b981',
      'no-show': '#f97316',
      'cancelado': '#ef4444'
    }
    return colors[status] || '#6b7280'
  }

  // Drag and drop functions
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const lead = leads.find(l => l.id === active.id)
    setActiveId(active.id as string)
    setDraggedLead(lead || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    setActiveId(null)
    setDraggedLead(null)

    if (!over) return

    const leadId = active.id as string
    const newStatus = over.id as string

    // Se o status não mudou, não faz nada
    const currentLead = leads.find(l => l.id === leadId)
    if (!currentLead || currentLead.status === newStatus) return

    try {
      // Atualizar o lead no banco de dados
      await updateLeadStatus(leadId, newStatus)
    } catch (error) {
      console.error('Erro ao atualizar status do lead:', error)
      alert('Erro ao atualizar status do lead')
    }
  }


  // Draggable Lead Card Component
  const DraggableLeadCard = ({ lead, column }: { lead: Lead, column: any }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: lead.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`bg-white border rounded-lg p-3 cursor-grab hover:shadow-md transition-all duration-200 relative ${
          isDragging ? 'shadow-lg rotate-3 scale-105' : ''
        } hover:border-blue-300`}
        onClick={(e) => {
          // Only open edit if not dragging
          if (!isDragging) {
            handleEdit(lead)
          }
        }}
      >
        {/* Drag indicator */}
        <div className="absolute top-2 right-2 text-gray-400 opacity-60 hover:opacity-100 transition-opacity">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 6H10V8H8V6ZM14 6H16V8H14V6ZM8 10H10V12H8V10ZM14 10H16V12H14V10ZM8 14H10V16H8V14ZM14 14H16V16H14V14Z" fill="currentColor"/>
          </svg>
        </div>
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-900 truncate">
            {lead.nome_completo}
          </h4>

          {lead.empresa && (
            <div className="flex items-center text-xs text-gray-600">
              <Building className="w-3 h-3 mr-1" />
              <span className="truncate">{lead.empresa}</span>
            </div>
          )}

          {lead.email && (
            <div className="flex items-center text-xs text-gray-600">
              <Mail className="w-3 h-3 mr-1" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}

          {lead.telefone && (
            <div className="flex items-center text-xs text-gray-600">
              <Phone className="w-3 h-3 mr-1" />
              <span className="truncate">{lead.telefone}</span>
            </div>
          )}

          {(lead.valor_vendido || lead.valor_arrecadado) && (
            <div className="text-xs space-y-1">
              {lead.valor_vendido && (
                <div className="text-green-600 font-semibold">
                  Vendido: {formatCurrency(lead.valor_vendido)}
                </div>
              )}
              {lead.valor_arrecadado && (
                <div className="text-blue-600">
                  Arrecadado: {formatCurrency(lead.valor_arrecadado)}
                </div>
              )}
            </div>
          )}

          {/* Quick Status Change */}
          <div className="flex gap-1 mt-2">
            {column.key !== 'vendido' && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-6 px-2"
                onClick={(e) => {
                  e.stopPropagation()
                  const nextStatus = column.key === 'novo' ? 'contactado'
                    : column.key === 'contactado' ? 'qualificado'
                    : column.key === 'qualificado' ? 'call_agendada'
                    : column.key === 'call_agendada' ? 'proposta_enviada'
                    : column.key === 'proposta_enviada' ? 'vendido'
                    : 'vendido'
                  updateLeadStatus(lead.id, nextStatus)
                }}
              >
                Avançar
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="Leads" subtitle="Carregando..." />
        <main className="flex-1 p-6">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title="Leads"
        subtitle={
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span>{getTotalLeads()} leads</span>
            <span className="hidden sm:inline">•</span>
            <span>Vendido: {formatCurrency(getTotalVendido())}</span>
            <span className="hidden sm:inline">•</span>
            <span>Arrecadado: {formatCurrency(getTotalArrecadado())}</span>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Metas do Mês - Seção de Destaque */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 text-white shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold">🎯 Metas do Mês</h2>
              <p className="text-blue-100 mt-1">Performance atual dos leads</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-100">Período</div>
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
                    <p className="text-sm text-blue-100">Meta mensal</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{getPercentualFaturamento()}%</div>
                  <div className="text-sm text-blue-100">da meta</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Realizado: {formatCurrency(getTotalVendido())}</span>
                  <span>Meta: {formatCurrency(settings.meta_faturamento_mes)}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3">
                  <div
                    className="bg-yellow-400 h-3 rounded-full transition-all duration-500"
                    style={{width: `${Math.min(getPercentualFaturamento(), 100)}%`}}
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
                    <p className="text-sm text-blue-100">Meta mensal</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{getPercentualLeads()}%</div>
                  <div className="text-sm text-blue-100">da meta</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Vendidos: {stats.find(s => s.status === 'vendido')?.quantidade || 0}</span>
                  <span>Meta: {settings.meta_vendas_mes}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3">
                  <div
                    className="bg-yellow-400 h-3 rounded-full transition-all duration-500"
                    style={{width: `${Math.min(getPercentualLeads(), 100)}%`}}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Leads</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {getTotalLeads()}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Qualificados</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {getQualificados()}
                  </p>
                </div>
                <Target className="h-8 w-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Calls Já Feitas</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {getCallsJaFeitas()}
                  </p>
                </div>
                <PhoneCall className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Calls Realizadas</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {getCallsRealizadas()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {getTaxaConversaoCall()}% conversão • Vendas/Calls
                  </p>
                </div>
                <PhoneCall className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Vendidos</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.find(s => s.status === 'vendido')?.quantidade || 0}
                  </p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Valor Vendido</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(getTotalVendido())}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Valor Arrecadado</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(getTotalArrecadado())}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controles de Visualização */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-semibold">Todos os Leads ({filteredLeads.length})</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Toggle Kanban/Tabela */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="flex items-center gap-2"
              >
                <Table className="w-4 h-4" />
                Tabela
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="flex items-center gap-2"
              >
                <LayoutGrid className="w-4 h-4" />
                Kanban
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => setDashboardModalOpen(true)}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>

            {/* Botões de Exportar PDF */}
            <Button
              onClick={handleExportDashboardPDF}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
            >
              <BarChart3 className="w-4 h-4" />
              PDF Dashboard
            </Button>
            <Button
              onClick={handleExportPDF}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              <FileDown className="w-4 h-4" />
              PDF Resumo
            </Button>
            <Button
              onClick={handleExportDetailedPDF}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              <FileDown className="w-4 h-4" />
              PDF Detalhado
            </Button>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Lead
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-green-50 to-yellow-50 border-2 border-green-200">
              <DialogHeader className="text-center pb-6">
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-700 to-yellow-600 bg-clip-text text-transparent">
                  {editingLead ? '✨ Editar Lead' : '🌟 Novo Lead'}
                </DialogTitle>
                <p className="text-sm text-green-600 mt-2">Informações essenciais do prospect</p>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nome Completo */}
                <div className="space-y-2">
                  <Label htmlFor="nome_completo" className="text-green-800 font-semibold">
                    👤 Nome Completo *
                  </Label>
                  <Input
                    id="nome_completo"
                    value={formData.nome_completo}
                    onChange={(e) => setFormData({...formData, nome_completo: e.target.value})}
                    required
                    className="border-2 border-green-200 focus:border-yellow-400 focus:ring-yellow-200 bg-white/70"
                    placeholder="Digite o nome completo..."
                  />
                </div>

                {/* Email e Telefone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-green-800 font-semibold">
                      📧 Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="border-2 border-green-200 focus:border-yellow-400 focus:ring-yellow-200 bg-white/70"
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone" className="text-green-800 font-semibold">
                      📞 Telefone
                    </Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                      className="border-2 border-green-200 focus:border-yellow-400 focus:ring-yellow-200 bg-white/70"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                {/* Empresa e Cargo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="empresa" className="text-green-800 font-semibold">
                      🏢 Empresa
                    </Label>
                    <Input
                      id="empresa"
                      value={formData.empresa}
                      onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                      className="border-2 border-green-200 focus:border-yellow-400 focus:ring-yellow-200 bg-white/70"
                      placeholder="Nome da empresa..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cargo" className="text-green-800 font-semibold">
                      👔 Cargo
                    </Label>
                    <Input
                      id="cargo"
                      value={formData.cargo}
                      onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                      className="border-2 border-green-200 focus:border-yellow-400 focus:ring-yellow-200 bg-white/70"
                      placeholder="Cargo/função..."
                    />
                  </div>
                </div>

                {/* Origem e Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="origem" className="text-green-800 font-semibold">
                      📍 Origem
                    </Label>
                    <Select value={formData.origem} onValueChange={(value) => setFormData({...formData, origem: value})}>
                      <SelectTrigger className="border-2 border-green-200 focus:border-yellow-400 bg-white/70">
                        <SelectValue placeholder="Selecione a origem..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-green-200">
                        <SelectItem value="facebook">📘 Facebook</SelectItem>
                        <SelectItem value="instagram">📸 Instagram</SelectItem>
                        <SelectItem value="google">🔍 Google</SelectItem>
                        <SelectItem value="indicacao">🤝 Indicação</SelectItem>
                        <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                        <SelectItem value="website">🌐 Website</SelectItem>
                        <SelectItem value="outros">📋 Outros</SelectItem>
                        <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                        <SelectItem value="youtube">📺 YouTube</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-green-800 font-semibold">
                      🎯 Status
                    </Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                      <SelectTrigger className="border-2 border-green-200 focus:border-yellow-400 bg-white/70">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-green-200">
                        <SelectItem value="novo">🔵 Novo</SelectItem>
                        <SelectItem value="contactado">🟣 Contactado</SelectItem>
                        <SelectItem value="qualificado">🟦 Qualificado</SelectItem>
                        <SelectItem value="call_agendada">🟠 Call Agendada</SelectItem>
                        <SelectItem value="proposta_enviada">🟡 Proposta Enviada</SelectItem>
                        <SelectItem value="vendido">🟢 Vendido</SelectItem>
                        <SelectItem value="perdido">🔴 Perdido</SelectItem>
                        <SelectItem value="no-show">🟨 No-show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="temperatura" className="text-sm font-semibold text-green-800 flex items-center gap-2">
                      🌡️ Temperatura
                    </Label>
                    <Select value={formData.temperatura} onValueChange={(value) => setFormData({...formData, temperatura: value})}>
                      <SelectTrigger className="border-2 border-green-200 focus:border-yellow-400 bg-white/70">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-green-200">
                        <SelectItem value="frio">❄️ Frio</SelectItem>
                        <SelectItem value="morno">🔥 Morno</SelectItem>
                        <SelectItem value="quente">🚀 Quente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Valores Financeiros */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valor_vendido" className="text-green-800 font-semibold">
                      💰 Valor Vendido
                    </Label>
                    <Input
                      id="valor_vendido"
                      type="number"
                      step="0.01"
                      value={formData.valor_vendido}
                      onChange={(e) => setFormData({...formData, valor_vendido: e.target.value})}
                      className="border-2 border-green-200 focus:border-yellow-400 focus:ring-yellow-200 bg-white/70"
                      placeholder="Ex: 1500.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valor_arrecadado" className="text-green-800 font-semibold">
                      💵 Valor Arrecadado
                    </Label>
                    <Input
                      id="valor_arrecadado"
                      type="number"
                      step="0.01"
                      value={formData.valor_arrecadado}
                      onChange={(e) => setFormData({...formData, valor_arrecadado: e.target.value})}
                      className="border-2 border-green-200 focus:border-yellow-400 focus:ring-yellow-200 bg-white/70"
                      placeholder="Ex: 750.00"
                    />
                  </div>
                </div>

                {/* Observações - Destaque especial */}
                <div className="space-y-2">
                  <Label htmlFor="observacoes" className="text-green-800 font-semibold flex items-center gap-2">
                    📝 Observações Importantes
                    <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                      Campo essencial
                    </span>
                  </Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    rows={4}
                    className="border-2 border-green-200 focus:border-yellow-400 focus:ring-yellow-200 bg-white/70 resize-none"
                    placeholder="Adicione observações sobre o lead, contexto da conversa, interesses, objeções, próximos passos..."
                  />
                  <p className="text-xs text-green-600">
                    💡 Dica: Detalhe o máximo possível para um melhor acompanhamento
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-green-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="border-2 border-gray-300 hover:border-red-300 hover:text-red-600"
                  >
                    ❌ Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white font-semibold shadow-lg"
                  >
                    {editingLead ? '✅ Atualizar Lead' : '🚀 Criar Lead'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Seção de Pesquisa e Filtros */}
        <div className="space-y-4">
          {/* Barra de Pesquisa */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, email, telefone, empresa ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros Avançados de Data */}
          <DateFilters
            filtroTempo={dateFilters.filtroTempo}
            dataInicio={dateFilters.dataInicio}
            dataFim={dateFilters.dataFim}
            setFiltroTempo={dateFilters.setFiltroTempo}
            setDataInicio={dateFilters.setDataInicio}
            setDataFim={dateFilters.setDataFim}
            resetFilters={dateFilters.resetFilters}
          />

          {/* Filtros */}
          <div className="flex flex-wrap gap-4">
            {/* Filtro por Status */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Status:</span>
              <div className="flex flex-wrap gap-1">
                {statusOptions.map(status => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className="capitalize text-xs"
                  >
                    {status === 'todos' ? 'Todos' : status.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filtro por Origem */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4"></div>
              <span className="text-sm text-gray-600">Origem:</span>
              <div className="flex flex-wrap gap-1">
                {origemOptions.map(origem => (
                  <Button
                    key={origem}
                    variant={origemFilter === origem ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOrigemFilter(origem || 'todas')}
                    className="capitalize text-xs"
                  >
                    {origem === 'todas' ? 'Todas' : origem}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filtro por Temperatura */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4"></div>
              <span className="text-sm text-gray-600">Temperatura:</span>
              <div className="flex flex-wrap gap-1">
                {temperaturaOptions.map(temp => (
                  <Button
                    key={temp}
                    variant={temperaturaFilter === temp ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTemperaturaFilter(temp)}
                    className="capitalize text-xs"
                  >
                    {temp === 'todas' ? 'Todas' : temp === 'frio' ? '❄️ Frio' : temp === 'morno' ? '🔥 Morno' : '🚀 Quente'}
                  </Button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Kanban Board */}
        {viewMode === 'kanban' && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                💡 <strong>Dica:</strong> Arraste os cards entre as colunas para alterar o status dos leads. Use o ícone ⋮⋮ no canto superior direito de cada card.
              </div>

              {/* Responsive horizontal scroll container */}
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-max">
                  {getLeadsByStatus().map(column => {
                    const DroppableCardContent = () => {
                      const { isOver, setNodeRef } = useDroppable({
                        id: column.key,
                      })

                      return (
                        <CardContent
                          ref={setNodeRef}
                          className={`p-2 space-y-2 min-h-[400px] transition-all duration-200 ${
                            isOver ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <SortableContext
                            items={column.leads.map(lead => lead.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {column.leads.map(lead => (
                              <DraggableLeadCard
                                key={lead.id}
                                lead={lead}
                                column={column}
                              />
                            ))}
                          </SortableContext>

                          {column.leads.length === 0 && (
                            <div className="text-center text-gray-400 text-sm py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                              Solte aqui
                            </div>
                          )}
                        </CardContent>
                      )
                    }

                    return (
                      <div key={column.key} className="w-80 flex-shrink-0">
                        <Card className="h-fit">
                          <CardHeader className={`${column.color} text-white rounded-t-lg py-3`}>
                            <CardTitle className="text-sm font-semibold flex items-center justify-between">
                              {column.label}
                              <Badge variant="secondary" className="bg-white/20 text-white">
                                {column.leads.length}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <DroppableCardContent />
                        </Card>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeId && draggedLead ? (
                <div className="bg-white border-2 border-blue-500 rounded-lg p-3 shadow-xl opacity-95 transform rotate-3 scale-105">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-900 truncate">
                      {draggedLead.nome_completo}
                    </h4>
                    {draggedLead.empresa && (
                      <div className="flex items-center text-xs text-gray-600">
                        <Building className="w-3 h-3 mr-1" />
                        <span className="truncate">{draggedLead.empresa}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Lista de Leads */}
        {viewMode === 'table' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-gradient-to-r from-green-100 to-yellow-100">
                  <tr>
                    <th className="text-left p-4 font-semibold text-green-800">👤 Lead</th>
                    <th className="text-left p-4 font-semibold text-green-800">📞 Contato</th>
                    <th className="text-left p-4 font-semibold text-green-800">🏢 Empresa</th>
                    <th className="text-left p-4 font-semibold text-green-800">📍 Origem</th>
                    <th className="text-left p-4 font-semibold text-green-800">🎯 Status</th>
                    <th className="text-right p-4 font-semibold text-green-800">💰 Valores</th>
                    <th className="text-left p-4 font-semibold text-green-800">📝 Observações</th>
                    <th className="text-center p-4 font-semibold text-green-800">⚙️ Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="border-t hover:bg-gradient-to-r hover:from-green-50 hover:to-yellow-50 transition-all duration-200">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-green-800">{lead.nome_completo}</p>
                          <p className="text-xs text-gray-500">{lead.cargo}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center text-xs">
                              <Mail className="w-3 h-3 mr-1 text-gray-400" />
                              <span className="text-gray-700">{lead.email}</span>
                            </div>
                          )}
                          {lead.telefone && (
                            <div className="flex items-center text-xs">
                              <Phone className="w-3 h-3 mr-1 text-gray-400" />
                              <span className="text-gray-700">{lead.telefone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {lead.empresa && (
                          <div className="flex items-center text-sm">
                            <Building className="w-3 h-3 mr-1 text-gray-400" />
                            <span className="text-gray-700">{lead.empresa}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-xs border-green-300 text-green-700 bg-green-50">
                          {lead.origem || 'Não informado'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(lead.status)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-green-600">
                            {lead.valor_vendido ? `Vendido: ${formatCurrency(lead.valor_vendido)}` : '-'}
                          </div>
                          <div className="text-xs text-blue-600">
                            {lead.valor_arrecadado ? `Arrecadado: ${formatCurrency(lead.valor_arrecadado)}` : '-'}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 max-w-xs">
                        {lead.observacoes ? (
                          <div className="relative group">
                            <p className="text-sm text-gray-700 line-clamp-2 cursor-help">
                              {lead.observacoes}
                            </p>
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 max-w-xs shadow-lg">
                              {lead.observacoes}
                              <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-800"></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Sem observações</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.location.href = `/leads/${lead.id}`}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            title="Tracking completo do lead"
                          >
                            <Activity className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(lead)}
                            className="border-green-300 text-green-700 hover:bg-green-50"
                            title="Editar lead"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(lead.id)}
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            title="Excluir lead"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Skeleton Loading */}
              {loading && (
                <div className="space-y-4 p-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex space-x-4">
                      <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Botão Carregar Mais */}
              {hasNextPage && !loading && (
                <div className="p-4 text-center">
                  <Button
                    onClick={() => loadLeads(currentPage + 1, true)}
                    variant="outline"
                    className="w-full"
                  >
                    Carregar Mais ({totalCount - leads.length} restantes)
                  </Button>
                </div>
              )}

              {/* Info de paginação */}
              <div className="p-4 text-sm text-gray-500 text-center border-t">
                Mostrando {leads.length} de {totalCount} leads
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Mensagem quando não há leads filtrados */}
        {filteredLeads.length === 0 && leads.length > 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum lead encontrado</h3>
            <p className="text-gray-500">
              Tente ajustar os filtros ou termo de pesquisa para encontrar leads.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('todos')
                setOrigemFilter('todas')
                setTemperaturaFilter('todas')
                dateFilters.resetFilters()
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        )}

        {/* Mensagem quando não há leads no sistema */}
        {leads.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum lead cadastrado</h3>
            <p className="text-gray-500">
              Comece adicionando seu primeiro lead no sistema.
            </p>
          </div>
        )}
      </main>

      {/* Dashboard Modal */}
      <Dialog open={dashboardModalOpen} onOpenChange={setDashboardModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Dashboard de Leads - Relatórios Visuais
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Period Selector */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Período:</span>
              <Select value={reportPeriod} onValueChange={setReportPeriod}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semana_atual">Esta Semana</SelectItem>
                  <SelectItem value="ultima_semana">Semana Passada</SelectItem>
                  <SelectItem value="mes">Este Mês</SelectItem>
                  <SelectItem value="ano">Este Ano</SelectItem>
                  <SelectItem value="todos">Todos os Dados</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto text-sm text-gray-600">
                Total de leads: {leads.length} • Data: {new Date().toLocaleDateString('pt-BR')}
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-purple-600" />
                    Distribuição por Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={getChartData().statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getChartData().statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Origin Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-green-600" />
                    Distribuição por Origem
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={getChartData().origemChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getChartData().origemChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Revenue Bar Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Faturamento por Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={getChartData().revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [
                          new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(Number(value)),
                          name === 'vendido' ? 'Valor Vendido' : 'Valor Arrecadado'
                        ]}
                      />
                      <Bar dataKey="vendido" fill="#10b981" name="vendido" />
                      <Bar dataKey="arrecadado" fill="#3b82f6" name="arrecadado" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Summary Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{leads.length}</div>
                  <div className="text-sm text-gray-600">Total Leads</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.find(s => s.status === 'vendido')?.quantidade || 0}
                  </div>
                  <div className="text-sm text-gray-600">Vendidos</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 0
                    }).format(getTotalVendido())}
                  </div>
                  <div className="text-sm text-gray-600">Faturamento</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 0
                    }).format(getTotalArrecadado())}
                  </div>
                  <div className="text-sm text-gray-600">Arrecadado</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}