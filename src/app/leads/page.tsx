'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useStableMutation } from '@/hooks/use-stable-mutation'
import { useActiveOrganization } from '@/contexts/organization'
import { ChurnRateCard } from '@/components/churn-rate-card'
import EmbeddedAIChat from '@/components/embedded-ai-chat'
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
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt
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
  sdr_id?: string | null
  closer_id?: string | null
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

interface Closer {
  id: string
  nome_completo: string
  email: string
  tipo_closer: string
}

export default function LeadsPage() {
  const router = useRouter()
  const { activeOrganizationId, loading: orgLoading } = useActiveOrganization()

  // Estados locais simples (não precisam de hooks especiais)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [origemFilter, setOrigemFilter] = useState('todas')
  const [dateFilter, setDateFilter] = useState('mes_atual')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const leadsPerPage = 10
  const [stats, setStats] = useState<LeadStats>({
    total_leads: 0,
    leads_convertidos: 0,
    valor_total_vendas: 0,
    valor_total_arrecadado: 0,
    taxa_conversao: 0,
    ticket_medio: 0
  })

  // Server-side paginated leads
  const [leads, setLeads] = useState<Lead[]>([])
  const [totalLeadsCount, setTotalLeadsCount] = useState(0)
  const [totalServerPages, setTotalServerPages] = useState(1)
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [leadsError, setLeadsError] = useState<string | null>(null)
  const [isRefetchingLeads, setIsRefetchingLeads] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce search input (500ms)
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1) // Reset to page 1 on new search
    }, 500)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [searchTerm])

  // Load leads from server (paginated + filtered)
  const loadLeads = useCallback(async (isRefetch = false) => {
    if (!activeOrganizationId) return
    if (isRefetch) setIsRefetchingLeads(true)
    else setLeadsLoading(true)
    setLeadsError(null)

    try {
      // Build query via ApiQueryBuilder (goes through /api/query)
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('organization_id', activeOrganizationId)

      // Status filter
      if (statusFilter && statusFilter !== 'todos') {
        query = query.eq('status', statusFilter)
      }

      // Origem filter
      if (origemFilter && origemFilter !== 'todas') {
        query = query.eq('origem', origemFilter)
      }

      // Search filter (OR across multiple columns)
      if (debouncedSearch && debouncedSearch.trim()) {
        const term = `%${debouncedSearch.trim()}%`
        query = query.or(`nome_completo.ilike.${term},email.ilike.${term},telefone.ilike.${term},empresa.ilike.${term}`)
      }

      // Date filtering
      if (dateFilter && dateFilter !== 'todos') {
        const now = new Date()
        let startDate: Date | null = null
        let endDate: Date | null = null

        if (dateFilter === 'mes_atual') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          endDate = now
        } else if (dateFilter === 'ano_atual') {
          startDate = new Date(now.getFullYear(), 0, 1)
          endDate = now
        } else if (dateFilter === 'semana_atual') {
          const day = now.getDay()
          const diff = day === 0 ? 6 : day - 1
          startDate = new Date(now)
          startDate.setDate(now.getDate() - diff)
          startDate.setHours(0, 0, 0, 0)
          endDate = now
        } else if (dateFilter === 'semana_passada') {
          const day = now.getDay()
          const diff = day === 0 ? 6 : day - 1
          const thisMonday = new Date(now)
          thisMonday.setDate(now.getDate() - diff)
          thisMonday.setHours(0, 0, 0, 0)
          startDate = new Date(thisMonday)
          startDate.setDate(thisMonday.getDate() - 7)
          endDate = new Date(thisMonday)
          endDate.setSeconds(-1)
        } else if (dateFilter === 'mes_passado') {
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          endDate = new Date(now.getFullYear(), now.getMonth(), 0)
          endDate.setHours(23, 59, 59, 999)
        } else if (dateFilter === 'personalizado' && customStartDate && customEndDate) {
          startDate = new Date(customStartDate)
          endDate = new Date(customEndDate)
          endDate.setHours(23, 59, 59, 999)
        }

        if (startDate && endDate) {
          query = query.gte('created_at', startDate.toISOString())
          query = query.lte('created_at', endDate.toISOString())
        }
      }

      // Order and pagination
      query = query.order('created_at', { ascending: false })
      const from = (currentPage - 1) * leadsPerPage
      const to = from + leadsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw new Error(error.message || 'Erro ao carregar leads')
      setLeads(data || [])
      setTotalLeadsCount(count || 0)
      setTotalServerPages(Math.ceil((count || 0) / leadsPerPage))
    } catch (err: any) {
      console.error('Erro ao carregar leads:', err)
      setLeadsError(err.message)
    } finally {
      setLeadsLoading(false)
      setIsRefetchingLeads(false)
    }
  }, [activeOrganizationId, debouncedSearch, statusFilter, origemFilter, dateFilter, customStartDate, customEndDate, currentPage])

  // Reload when filters/page change
  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  // Reset page on filter changes (except page itself)
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, origemFilter, dateFilter, customStartDate, customEndDate])

  const refetchLeads = useCallback(() => loadLeads(true), [loadLeads])

  // Hook para mutações (criar/editar/deletar leads)
  const createLead = useStableMutation('leads', 'insert', {
    onSuccess: () => {
      refetchLeads()
      setIsModalOpen(false)
      setEditingLead(null)
    }
  })

  const updateLead = useStableMutation('leads', 'update', {
    onSuccess: () => {
      refetchLeads()
      setIsModalOpen(false)
      setEditingLead(null)
    }
  })

  const deleteLead = useStableMutation('leads', 'delete', {
    onSuccess: () => {
      refetchLeads()
    }
  })

  // Estado derivado
  const loading = leadsLoading || orgLoading
  const isLoadingData = isRefetchingLeads || createLead.isLoading || updateLead.isLoading || deleteLead.isLoading

  // Função para obter range de datas
  const getDateRange = (filter: string) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    switch (filter) {
      case 'mes_atual':
        // Janeiro de 2026 (estamos em janeiro)
        return {
          start: new Date(year, month, 1).toISOString(),
          end: new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString()
        }
      case 'ano_atual':
        // De 1º de janeiro a 31 de dezembro de 2026
        return {
          start: new Date(year, 0, 1).toISOString(),
          end: new Date(year, 11, 31, 23, 59, 59, 999).toISOString()
        }
      case 'semana_atual':
        // Semana atual: Domingo a Sábado desta semana
        const currentDay = now.getDay() // 0 = Domingo
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - currentDay)
        startOfWeek.setHours(0, 0, 0, 0)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)
        return {
          start: startOfWeek.toISOString(),
          end: endOfWeek.toISOString()
        }
      case 'semana_passada':
        // Última semana: Domingo a Sábado da semana passada
        const lastWeekDay = now.getDay()
        const startOfLastWeek = new Date(now)
        startOfLastWeek.setDate(now.getDate() - lastWeekDay - 7)
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
    perdido: 'lost',
    vazado: 'leaked',
    churn: 'churned',
    churnzinho: 'mini_churned'
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
    'instagram': '#F59E0B',
    'whatsapp': '#059669',
    'indicacao': '#3B82F6',
    'site': '#EF4444',
    'linkedin': '#8B5CF6',
    'facebook': '#1877F2',
    'google': '#EA4335',
    'tiktok': '#FF0050',
    'youtube': '#FF0000',
    'trafego': '#6366F1',
    'social-seller': '#EC4899',
    'eventos-proprios': '#8B5CF6',
    'parcerias': '#10B981',
    'sessao-fechada': '#F59E0B',
    'Outros': '#94A3B8'
  }

  const [conversionData, setConversionData] = useState<Array<{month: string, leads: number, vendas: number, taxa: number}>>([])
  const [conversionChartLoading, setConversionChartLoading] = useState(true)

  // Carregar stats quando leads mudarem
  useEffect(() => {
    loadStats()
    loadOrigemData()
    loadConversionData()
  }, [leads])


  const loadStats = async () => {
    try {
      // Query para leads totais (usar data inteligente baseada no status)
      let queryTotal = supabase.from('leads').select('*')

      // Filtrar por organização
      if (activeOrganizationId) {
        queryTotal = queryTotal.eq('organization_id', activeOrganizationId)
      }

      const dateRange = getDateRange(dateFilter)
      if (dateRange) {
        // Usar data_venda para vendidos e data_primeiro_contato para outros
        queryTotal = queryTotal.or(`and(status.eq.vendido,data_venda.gte.${dateRange.start},data_venda.lte.${dateRange.end}),and(status.neq.vendido,data_primeiro_contato.gte.${dateRange.start},data_primeiro_contato.lte.${dateRange.end})`)
      }

      // Query para vendas (usar data_venda para leads vendidos) - apenas com valor arrecadado
      let queryVendas = supabase.from('leads').select('*').eq('status', 'vendido').not('valor_arrecadado', 'is', null).gt('valor_arrecadado', 0)

      // Filtrar por organização
      if (activeOrganizationId) {
        queryVendas = queryVendas.eq('organization_id', activeOrganizationId)
      }

      if (dateRange) {
        queryVendas = queryVendas
          .gte('data_venda', dateRange.start)
          .lte('data_venda', dateRange.end)
      }

      // Aplicar filtros de status e origem nas queries
      if (statusFilter !== 'todos') {
        queryTotal = queryTotal.eq('status', statusFilter)
      }
      if (origemFilter !== 'todas') {
        queryTotal = queryTotal.eq('origem', origemFilter)
        queryVendas = queryVendas.eq('origem', origemFilter)
      }

      // Executar as duas queries
      const [{ data: leadsTotal }, { data: vendasData }] = await Promise.all([
        queryTotal,
        queryVendas
      ])

      if (leadsTotal && vendasData) {
        const totalVendas = vendasData.reduce((sum, lead) => sum + (Number(lead.valor_vendido) || 0), 0)
        const totalArrecadado = vendasData.reduce((sum, lead) => sum + (Number(lead.valor_arrecadado) || 0), 0)

        // Para performance (774K), usar o valor_arrecadado que é o que foi efetivamente pago
        const taxaConversao = leadsTotal.length > 0 ? (vendasData.length / leadsTotal.length) * 100 : 0
        const ticketMedio = vendasData.length > 0 ? totalArrecadado / vendasData.length : 0

        setStats({
          total_leads: leadsTotal.length,
          leads_convertidos: vendasData.length,
          valor_total_vendas: totalVendas, // Valor vendido (pode ser maior que o arrecadado)
          valor_total_arrecadado: totalArrecadado, // Valor efetivamente arrecadado (774K)
          taxa_conversao: Math.round(taxaConversao * 100) / 100, // 2 casas decimais
          ticket_medio: Math.round(ticketMedio * 100) / 100 // 2 casas decimais
        })
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const loadOrigemData = async () => {
    try {
      let query = supabase.from('leads').select('origem, status, valor_arrecadado')

      // Filtrar por organização
      if (activeOrganizationId) {
        query = query.eq('organization_id', activeOrganizationId)
      }

      const { data: leads } = await query

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
            acc[origem].valorPago += Number(lead.valor_arrecadado) || 0
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

  const loadConversionData = async () => {
    try {
      setConversionChartLoading(true)

      // Buscar dados dos últimos 6 meses
      const currentDate = new Date()
      const months = []

      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1)
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)

        // Buscar leads totais do mês
        let queryTotalLeads = supabase
          .from('leads')
          .select('id')
          .gte('data_primeiro_contato', startDate.toISOString())
          .lte('data_primeiro_contato', endDate.toISOString())

        if (activeOrganizationId) {
          queryTotalLeads = queryTotalLeads.eq('organization_id', activeOrganizationId)
        }

        const { data: totalLeads } = await queryTotalLeads

        // Buscar vendas do mês - apenas vendas com valor arrecadado
        let queryVendas = supabase
          .from('leads')
          .select('id')
          .eq('status', 'vendido')
          .not('valor_arrecadado', 'is', null)
          .gt('valor_arrecadado', 0)
          .gte('data_venda', startDate.toISOString())
          .lte('data_venda', endDate.toISOString())

        if (activeOrganizationId) {
          queryVendas = queryVendas.eq('organization_id', activeOrganizationId)
        }

        const { data: vendas } = await queryVendas

        const totalLeadsCount = totalLeads?.length || 0
        const vendasCount = vendas?.length || 0
        const taxaConversao = totalLeadsCount > 0 ? (vendasCount / totalLeadsCount) * 100 : 0

        months.push({
          month: date.toLocaleDateString('pt-BR', { month: 'short' }).slice(0, 3),
          leads: totalLeadsCount,
          vendas: vendasCount,
          taxa: Math.round(taxaConversao * 100) / 100 // Limitar a 2 casas decimais
        })
      }

      setConversionData(months)
    } catch (error) {
      console.error('Erro ao carregar dados de conversão:', error)
    } finally {
      setConversionChartLoading(false)
    }
  }

  // Server-side pagination - leads already filtered and paginated
  const filteredLeads = leads
  const totalPages = totalServerPages
  const paginatedLeads = leads

  // Obter listas para os filtros
  const availableStatuses = Array.from(new Set(leads.map(lead => lead.status).filter(Boolean)))
  const availableOrigens = Array.from(new Set(leads.map(lead => lead.origem).filter((origem): origem is string => Boolean(origem))))

  const formatCurrency = (value: number | null | undefined) => {
    const num = Number(value) || 0
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('pt-BR')
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
        const { error } = await supabase
          .from('leads')
          .delete()
          .eq('id', leadId)

        if (error) throw error

        // Recarregar dados em vez de filtrar localmente
        await refetchLeads()
        await loadStats()
        await loadOrigemData()
      } catch (error) {
        console.error('Erro ao excluir lead:', error)
      }
    }
  }

  const handleViewDetails = (lead: Lead) => {
    router.push(`/leads/${lead.id}`)
  }

  const handleConvertToMentorado = async (lead: Lead) => {
    // Validar dados obrigatórios antes de converter
    if (!lead.email) {
      alert('Não é possível converter lead sem email. Por favor, adicione um email ao lead primeiro.')
      return
    }

    // Verificar se existe contrato assinado para este lead
    const { data: signedContract, error: contractError } = await supabase
      .from('contracts')
      .select('id, status, signed_at')
      .eq('lead_id', lead.id)
      .eq('status', 'signed')
      .single()

    if (contractError && contractError.code !== 'PGRST116') {
      console.error('Erro ao verificar contrato:', contractError)
      alert('Erro ao verificar contrato do lead.')
      return
    }

    if (!signedContract) {
      alert(`❌ Não é possível converter "${lead.nome_completo}" em mentorado.\n\nMotivo: Nenhum contrato assinado encontrado.\n\nPara converter um lead em mentorado, é necessário que ele tenha assinado um contrato primeiro.\n\n📋 Vá para Admin > Contratos e crie um contrato para este lead.`)
      return
    }

    if (!confirm(`✅ Contrato assinado encontrado!\n\nConverter "${lead.nome_completo}" em mentorado?\n\nContrato ID: ${signedContract.id}\nAssinado em: ${new Date(signedContract.signed_at).toLocaleDateString('pt-BR')}`)) {
      return
    }

    try {
      const organizationId = activeOrganizationId
      if (!organizationId) {
        throw new Error('Organização não encontrada - faça login novamente')
      }

      // 1. Criar mentorado com dados do lead
      const defaultPwd = process.env.NEXT_PUBLIC_DEFAULT_MENTORADO_PWD || ''
      const mentoradoData = {
        nome_completo: lead.nome_completo,
        email: lead.email, // Já validado acima
        telefone: lead.telefone,
        data_entrada: lead.data_venda || new Date().toISOString().split('T')[0],
        estado_atual: 'ativo',
        lead_id: lead.id,
        turma: 'Turma 1', // Valor padrão para turma
        organization_id: organizationId, // Necessário para RLS
        password_hash: defaultPwd,
        status_login: 'ativo',
      }

      console.log('Dados do mentorado a ser criado:', mentoradoData) // Debug

      const { data: mentorado, error: mentoradoError } = await supabase
        .from('mentorados')
        .insert(mentoradoData)
        .select()
        .single()

      if (mentoradoError) throw mentoradoError

      // 🚀 LIBERAR TODOS OS MÓDULOS AUTOMATICAMENTE
      try {
        // Buscar todos os módulos ativos da organização
        const { data: modules, error: modulesError } = await supabase
          .from('video_modules')
          .select('id, title')
          .eq('is_active', true)

        if (!modulesError && modules && modules.length > 0) {
          // Criar acessos para TODOS os módulos
          const accessRecords = modules.map(module => ({
            mentorado_id: mentorado.id,
            module_id: module.id,
            has_access: true,
            granted_at: new Date().toISOString(),
            granted_by: 'auto_lead_conversion',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))

          const { error: accessError } = await supabase
            .from('video_access_control')
            .insert(accessRecords)

          if (accessError) {
            console.error('❌ Erro ao liberar módulos:', accessError)
          } else {
            console.log(`🎉 ${modules.length} módulos liberados automaticamente para ${mentorado.nome_completo}!`)
          }
        }
      } catch (autoError) {
        console.error('⚠️ Erro na liberação automática de módulos:', autoError)
      }

      // 2. Atualizar lead como convertido
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          convertido_em: new Date().toISOString(),
          status_updated_at: new Date().toISOString()
        })
        .eq('id', lead.id)

      if (leadError) throw leadError

      // 3. Enviar contrato automaticamente
      let contractSent = false
      try {
        // Buscar template padrão ativo
        const { data: defaultTemplate } = await supabase
          .from('contract_templates')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (defaultTemplate && mentorado.email) {
          // Criar contrato automaticamente
          const { data: contractId, error: contractError } = await supabase.rpc('create_contract_from_template', {
            p_template_id: defaultTemplate.id,
            p_recipient_name: mentorado.nome_completo,
            p_recipient_email: mentorado.email,
            p_recipient_phone: mentorado.telefone,
            p_organization_id: organizationId,
            p_created_by_email: 'auto_lead_conversion',
            p_mentorado_id: mentorado.id,
            p_placeholders: {}
          })

          if (!contractError && contractId) {
            // Importar e chamar função de envio de WhatsApp
            const { sendContractAfterCreation } = await import('@/lib/contract-whatsapp')

            if (mentorado.telefone) {
              const whatsappSent = await sendContractAfterCreation(contractId)
              if (whatsappSent) {
                contractSent = true
                console.log('📱 Contrato enviado automaticamente via WhatsApp')
              }
            }
          }
        }
      } catch (contractError) {
        console.error('Erro ao enviar contrato automaticamente:', contractError)
      }

      const successMessage = contractSent
        ? `Lead convertido em mentorado com sucesso!\nContrato enviado automaticamente via WhatsApp 📱\nMentorado ID: ${mentorado.id}`
        : `Lead convertido em mentorado com sucesso!\nMentorado ID: ${mentorado.id}\n⚠️ Contrato não foi enviado automaticamente - verifique se há template ativo`

      alert(successMessage)
      refetchLeads()
    } catch (error) {
      console.error('Erro ao converter lead:', error)
      alert('Erro ao converter lead em mentorado')
    } finally {
    }
  }

  // Status badge colors for dark theme
  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      novo: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
      contactado: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
      qualificado: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
      agendado: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
      'no-show': 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
      quente: 'bg-red-500/15 text-red-400 border border-red-500/20',
      vendido: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
      call_agendada: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20',
      proposta_enviada: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
      perdido: 'bg-gray-500/15 text-gray-400 border border-gray-500/20',
      vazado: 'bg-pink-500/15 text-pink-400 border border-pink-500/20',
      churn: 'bg-red-800/15 text-red-300 border border-red-800/20',
      churnzinho: 'bg-orange-800/15 text-orange-300 border border-orange-800/20',
    }
    return styles[status] || 'bg-gray-500/15 text-gray-400 border border-gray-500/20'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500/20 border-t-emerald-500"></div>
          <p className="text-sm text-white/40">Carregando leads...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0c]">
        {/* Loading Overlay */}
        {isLoadingData && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-[#1a1a1e] rounded-2xl p-6 shadow-2xl border border-white/[0.06] flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
              <span className="text-sm font-medium text-white/70">Sincronizando dados...</span>
            </div>
          </div>
        )}

        {/* Sticky Header */}
        <div className="sticky top-0 z-30 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Leads</h1>
                  <p className="text-xs text-white/40 mt-0.5">Gestão completa de leads e oportunidades</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => refetchLeads()}
                  disabled={isLoadingData}
                  className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isLoadingData ? 'Atualizando...' : 'Atualizar'}</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </button>
                <button
                  onClick={handleNewLead}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                >
                  <Plus className="w-4 h-4" />
                  Novo Lead
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total de Leads */}
            <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] hover:border-emerald-500/20 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-emerald-500/[0.1]" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Total de Leads</p>
                <p className="text-3xl font-bold text-white mt-1 tabular-nums">{stats.total_leads}</p>
              </div>
            </div>

            {/* Taxa de Conversão */}
            <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] hover:border-cyan-500/20 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-cyan-500/[0.1]" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Taxa de Conversão</p>
                <p className="text-3xl font-bold text-white mt-1 tabular-nums">{(Number(stats.taxa_conversao) || 0).toFixed(1)}%</p>
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  {stats.leads_convertidos} convertidos
                </p>
              </div>
            </div>

            {/* Valor Arrecadado */}
            <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] hover:border-amber-500/20 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-amber-500/[0.1]" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Valor Arrecadado</p>
                <p className="text-2xl font-bold text-white mt-1 tabular-nums">{formatCurrency(stats.valor_total_arrecadado)}</p>
              </div>
            </div>

            {/* Ticket Médio */}
            <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] hover:border-violet-500/20 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-violet-500/[0.1]" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <Receipt className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Ticket Médio</p>
                <p className="text-2xl font-bold text-white mt-1 tabular-nums">{formatCurrency(stats.ticket_medio)}</p>
              </div>
            </div>

            {/* Churn Rate Card */}
            <ChurnRateCard />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversion Rate Chart */}
            <div className="lg:col-span-2 bg-[#1a1a1e] rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.04]">
                <h3 className="text-sm font-semibold text-white">Evolução da Taxa de Conversão e Volume de Leads</h3>
                <p className="text-xs text-white/40 mt-0.5">Últimos 6 meses</p>
              </div>
              <div className="p-6">
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                    <span className="text-xs text-white/50">Taxa de Conversão (%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                    <span className="text-xs text-white/50">Volume de Leads</span>
                  </div>
                </div>

                <div className="h-80">
                  {conversionChartLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500/20 border-t-emerald-500"></div>
                    </div>
                  ) : (
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
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />

                        <YAxis
                          yAxisId="taxa"
                          orientation="left"
                          stroke="rgba(255,255,255,0.3)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          label={{ value: 'Taxa (%)', angle: -90, position: 'insideLeft', style: { fill: 'rgba(255,255,255,0.3)', fontSize: 11 } }}
                        />
                        <YAxis
                          yAxisId="leads"
                          orientation="right"
                          stroke="rgba(255,255,255,0.3)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          label={{ value: 'Leads', angle: 90, position: 'insideRight', style: { fill: 'rgba(255,255,255,0.3)', fontSize: 11 } }}
                        />

                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1a1a1e',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '12px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                            color: '#fff'
                          }}
                          itemStyle={{ color: '#fff' }}
                          labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
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
                  )}
                </div>
              </div>
            </div>

            {/* Origin Pie Chart */}
            <div className="bg-[#1a1a1e] rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.04]">
                <h3 className="text-sm font-semibold text-white">Origem dos Leads</h3>
                <p className="text-xs text-white/40 mt-0.5">Performance por canal</p>
              </div>
              <div className="p-6">
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
                          backgroundColor: '#1a1a1e',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                          color: '#fff'
                        }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-1 gap-1 w-full mt-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {origemData.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between p-2 hover:bg-white/[0.04] rounded-lg transition-colors cursor-pointer" onClick={() => { setSelectedOrigem(entry); setShowOrigemModal(true) }}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-xs text-white/70 font-medium">
                            {entry.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-white font-semibold">
                            {entry.value} leads
                          </div>
                          <div className="text-xs text-emerald-400">
                            {formatCurrency(entry.valorPago)}
                          </div>
                          <div className="text-xs text-white/30">
                            {(Number(entry.taxaConversao) || 0).toFixed(1)}% conv.
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filters Section */}
          <div className="bg-[#1a1a1e] rounded-2xl border border-white/[0.06] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/30 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all w-full sm:w-80"
                  />
                </div>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all ${
                    showFilters
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-white/[0.05] text-white/60 border-white/[0.08] hover:bg-white/[0.08] hover:text-white/80'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                  {(statusFilter !== 'todos' || origemFilter !== 'todas' || dateFilter !== 'mes_atual') && (
                    <span className="ml-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-semibold">
                      {[statusFilter !== 'todos', origemFilter !== 'todas', dateFilter !== 'mes_atual'].filter(Boolean).length}
                    </span>
                  )}
                </button>
              </div>

              <div className="text-xs text-white/30">
                {totalLeadsCount} lead{totalLeadsCount !== 1 ? 's' : ''} encontrado{totalLeadsCount !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-white/[0.04]">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
                      className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
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
                    <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Origem</label>
                    <select
                      value={origemFilter}
                      onChange={(e) => { setOrigemFilter(e.target.value); setCurrentPage(1) }}
                      className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
                    >
                      <option value="todas">Todas as Origens</option>
                      {availableOrigens.map((origem) => (
                        <option key={origem} value={origem}>{origem}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Período</label>
                    <select
                      value={dateFilter}
                      onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1) }}
                      className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
                    >
                      <option value="mes_atual">Mês Atual</option>
                      <option value="ano_atual">Ano Atual</option>
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
                        <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Data Início</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Data Fim</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/[0.04]">
                  <button
                    onClick={() => {
                      setStatusFilter('todos')
                      setOrigemFilter('todas')
                      setDateFilter('mes_atual')
                      setCustomStartDate('')
                      setCustomEndDate('')
                    }}
                    className="text-sm text-white/40 hover:text-white/60 transition-colors"
                  >
                    Limpar filtros
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Loading indicator for filters */}
          {isLoadingData && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-3 px-4 py-2 bg-[#1a1a1e] rounded-xl border border-white/[0.06]">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500/20 border-t-emerald-500"></div>
                <span className="text-sm text-white/40">Atualizando filtros...</span>
              </div>
            </div>
          )}

          {/* Leads Table */}
          <div className="bg-[#1a1a1e] rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Lista de Leads</h3>
                <p className="text-xs text-white/40 mt-0.5">{totalLeadsCount} registros</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Lead</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Empresa</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Origem</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Valor</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Data</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center">
                            <Users className="w-6 h-6 text-white/20" />
                          </div>
                          <p className="text-sm text-white/40">Nenhum lead encontrado</p>
                          <p className="text-xs text-white/20">Tente ajustar os filtros ou criar um novo lead</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedLeads.map((lead) => {
                      const origem = lead.origem || 'Outros'
                      const cor = origemColors[origem as keyof typeof origemColors] || '#94A3B8'
                      return (
                        <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors group">
                          {/* Lead */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                {lead.nome_completo.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate">{lead.nome_completo}</p>
                                <p className="text-xs text-white/40 truncate">{lead.email || 'Sem email'}</p>
                              </div>
                            </div>
                          </td>
                          {/* Empresa */}
                          <td className="px-6 py-4">
                            <p className="text-sm text-white/80">{lead.empresa || '-'}</p>
                            <p className="text-xs text-white/30">{lead.cargo || '-'}</p>
                          </td>
                          {/* Origem */}
                          <td className="px-6 py-4">
                            <span
                              className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                              style={{ backgroundColor: cor }}
                            >
                              {origem}
                            </span>
                          </td>
                          {/* Status */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium w-fit ${getStatusStyle(lead.status)}`}>
                                {lead.status.charAt(0).toUpperCase() + lead.status.slice(1).replace('_', ' ')}
                              </span>
                              {lead.data_venda && (
                                <div>
                                  {lead.desistiu ? (
                                    <span className="px-2 py-0.5 text-xs bg-red-500/15 text-red-400 rounded-full border border-red-500/20">
                                      Desistiu
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-xs bg-emerald-500/15 text-emerald-400 rounded-full border border-emerald-500/20">
                                      Ativo
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          {/* Valor */}
                          <td className="px-6 py-4 text-right">
                            {lead.valor_vendido ? (
                              <div>
                                <p className="text-sm font-semibold text-emerald-400">{formatCurrency(lead.valor_vendido)}</p>
                                {lead.data_venda && (
                                  <p className="text-xs text-white/30 mt-0.5">
                                    Vendido em {formatDate(lead.data_venda)}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-white/20">-</p>
                            )}
                          </td>
                          {/* Data */}
                          <td className="px-6 py-4">
                            <span className="text-xs text-white/40">{formatDate(lead.created_at)}</span>
                          </td>
                          {/* Ações */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleViewDetails(lead)}
                                className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
                                title="Ver detalhes"
                              >
                                <Eye className="w-4 h-4 text-white/30 hover:text-white/60" />
                              </button>
                              <button
                                onClick={() => handleViewDetails(lead)}
                                className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
                                title="Análise detalhada"
                              >
                                <BarChart3 className="w-4 h-4 text-white/30 hover:text-emerald-400" />
                              </button>
                              <button
                                onClick={() => router.push(`/agendar/lead/${lead.id}`)}
                                className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
                                title="Agendar call"
                              >
                                <Calendar className="w-4 h-4 text-white/30 hover:text-emerald-400" />
                              </button>
                              <button
                                onClick={() => handleEditLead(lead)}
                                className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4 text-white/30 hover:text-emerald-400" />
                              </button>
                              {lead.status === 'vendido' && !lead.convertido_em && (
                                <button
                                  onClick={() => handleConvertToMentorado(lead)}
                                  className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
                                  title="Converter em Mentorado"
                                >
                                  <UserPlus className="w-4 h-4 text-white/30 hover:text-emerald-400" />
                                </button>
                              )}
                              {lead.telefone && (
                                <button
                                  className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
                                  title="Ligar"
                                >
                                  <Phone className="w-4 h-4 text-white/30 hover:text-emerald-400" />
                                </button>
                              )}
                              {lead.email && (
                                <button
                                  className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
                                  title="Enviar email"
                                >
                                  <Mail className="w-4 h-4 text-white/30 hover:text-emerald-400" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4 text-white/30 hover:text-red-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-white/[0.04] flex items-center justify-between">
                <p className="text-xs text-white/40">
                  {(currentPage - 1) * leadsPerPage + 1}-{Math.min(currentPage * leadsPerPage, totalLeadsCount)} de {totalLeadsCount}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs rounded-lg border border-white/[0.08] text-white/60 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc, p, i, arr) => {
                      if (i > 0 && p - arr[i - 1] > 1) acc.push(-1)
                      acc.push(p)
                      return acc
                    }, [] as number[])
                    .map((p, i) =>
                      p === -1 ? (
                        <span key={`dots-${i}`} className="px-1 text-xs text-white/30">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                            currentPage === p
                              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 font-semibold'
                              : 'border-white/[0.08] text-white/60 hover:bg-white/[0.06]'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-xs rounded-lg border border-white/[0.08] text-white/60 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Embedded AI Chat */}
          <EmbeddedAIChat
            contextBuilder={() => {
              const statusCounts = filteredLeads.reduce((acc, l) => {
                acc[l.status] = (acc[l.status] || 0) + 1
                return acc
              }, {} as Record<string, number>)
              const statusList = Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(', ')

              return `
DADOS DOS LEADS:
- Total de leads: ${stats.total_leads}
- Leads convertidos: ${stats.leads_convertidos}
- Taxa de conversão: ${(Number(stats.taxa_conversao) || 0).toFixed(1)}%
- Valor total vendas: ${formatCurrency(stats.valor_total_vendas)}
- Valor arrecadado: ${formatCurrency(stats.valor_total_arrecadado)}
- Ticket médio: ${formatCurrency(stats.ticket_medio)}
- Leads filtrados exibidos: ${totalLeadsCount}

STATUS DOS LEADS:
${statusList}

ORIGENS:
${origemData.map(o => `${o.name}: ${o.value} leads, ${formatCurrency(o.valorPago)} faturado, ${(Number(o.taxaConversao) || 0).toFixed(1)}% conversão`).join('\n')}

CONVERSÃO MENSAL (últimos 6 meses):
${conversionData.map(c => `${c.month}: ${c.leads} leads, ${c.vendas} vendas, ${c.taxa}% taxa`).join('\n')}
`
            }}
            systemPrompt="Você é um ANALISTA DE VENDAS SÊNIOR especializado em leads e funil de vendas. Analise os dados de leads fornecidos e dê insights estratégicos. Identifique padrões, oportunidades e gargalos no funil. Sugira ações práticas para melhorar a conversão."
            title="Analista de Leads"
            subtitle="IA especializada em seu funil"
            accentColor="emerald"
            suggestions={[
              'Analise meu funil de leads atual',
              'Qual canal está performando melhor?',
              'Onde estou perdendo mais leads?',
              'Como posso melhorar a taxa de conversão?',
            ]}
          />

          {/* Origin Detail Modal */}
          {showOrigemModal && selectedOrigem && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-[#1a1a1e] rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/[0.08] shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Detalhes da Origem: {selectedOrigem.name}
                  </h2>
                  <button
                    onClick={() => setShowOrigemModal(false)}
                    className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors text-white/60 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/[0.06]">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: selectedOrigem.color }}
                      />
                      <h3 className="font-semibold text-white/60 text-sm">Total de Leads</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">{selectedOrigem.value}</p>
                  </div>

                  <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/[0.06]">
                    <h3 className="font-semibold text-white/60 text-sm mb-2">Taxa de Conversão</h3>
                    <p className="text-3xl font-bold text-emerald-400">{(Number(selectedOrigem.taxaConversao) || 0).toFixed(1)}%</p>
                  </div>

                  <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/[0.06]">
                    <h3 className="font-semibold text-white/60 text-sm mb-2">Valor Arrecadado</h3>
                    <p className="text-2xl font-bold text-amber-400">
                      {formatCurrency(Number(selectedOrigem.valorPago) || 0)}
                    </p>
                  </div>
                </div>

                <div className="bg-white/[0.04] rounded-2xl p-6 border border-white/[0.06]">
                  <h3 className="font-semibold text-white mb-4">Performance Detalhada</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-white/40 text-sm">Ticket Médio</span>
                      <span className="font-semibold text-white">
                        {(() => {
                          const convertidos = Math.round(selectedOrigem.value * (Number(selectedOrigem.taxaConversao) || 0) / 100)
                          return convertidos > 0
                            ? formatCurrency(selectedOrigem.valorPago / convertidos)
                            : 'R$ 0,00'
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40 text-sm">Leads Convertidos</span>
                      <span className="font-semibold text-white">
                        {Math.round(selectedOrigem.value * selectedOrigem.taxaConversao / 100)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40 text-sm">ROI Estimado</span>
                      <span className="font-semibold text-emerald-400">
                        {(Number(selectedOrigem.valorPago) || 0) > 0 ? '+' : ''}
                        {(((Number(selectedOrigem.valorPago) || 0) / Math.max(selectedOrigem.value * 50, 1) - 1) * 100).toFixed(1)}%
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
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Filtrar por esta origem
                  </button>
                  <button
                    onClick={() => setShowOrigemModal(false)}
                    className="px-6 py-3 border border-white/[0.08] hover:bg-white/[0.06] rounded-xl font-medium text-white/70 hover:text-white transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit/Create Lead Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-[#1a1a1e] rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/[0.08] shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {editingLead ? `Editar Lead: ${editingLead.nome_completo}` : 'Criar Novo Lead'}
                  </h2>
                  <button
                    onClick={() => {
                      setIsModalOpen(false)
                      setEditingLead(null)
                    }}
                    className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors text-white/60 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {(createLead.error || updateLead.error) && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">
                    Erro: {createLead.error || updateLead.error}
                  </div>
                )}

                <EditLeadForm
                  lead={editingLead}
                  activeOrganizationId={activeOrganizationId}
                  onSave={async (leadData) => {
                    console.log('🔍 Debug leadData antes de salvar:', leadData)

                    // Processar dados para garantir tipos corretos
                    const processedData = {
                      ...leadData,
                      // Converter empty strings para null em campos UUID
                      sdr_id: leadData.sdr_id?.trim() || null,
                      closer_id: leadData.closer_id?.trim() || null,
                      mentorado_indicador_id: leadData.mentorado_indicador_id?.trim() || null,
                    }

                    if (editingLead) {
                      // Editar lead existente
                      await updateLead.mutate({ id: editingLead.id, ...processedData })

                      // Verificar se lead foi marcado como vendido e tem indicador
                      await checkAndCreateCommission(editingLead.id, processedData, editingLead)

                      // Automação: se status mudou para "vendido", disparar boas-vindas + contrato
                      if (processedData.status === 'vendido' && editingLead.status !== 'vendido') {
                        try {
                          console.log('🚀 Lead convertido para vendido - disparando automação...')
                          const automationRes = await fetch('/api/lead-automation/on-converted', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              leadId: editingLead.id,
                              leadName: processedData.nome_completo || editingLead.nome_completo,
                              leadEmail: processedData.email || editingLead.email,
                              leadPhone: processedData.telefone || editingLead.telefone,
                              organizationId: activeOrganizationId
                            })
                          })
                          const automationData = await automationRes.json()
                          if (automationData.allStepsSucceeded) {
                            alert(`✅ Automação executada com sucesso!\n\n• Mensagem de boas-vindas enviada via WhatsApp\n• Contrato criado e enviado`)
                          } else {
                            const details = (automationData.results || [])
                              .map((r: any) => `${r.success ? '✅' : '❌'} ${r.step}${r.error ? ': ' + r.error : ''}`)
                              .join('\n')
                            alert(`⚠️ Automação parcial:\n\n${details}`)
                          }
                        } catch (autoErr) {
                          console.error('Erro na automação:', autoErr)
                        }
                      }
                    } else {
                      // Criar novo lead
                      await createLead.mutate(processedData)
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
        </div>
      </div>
    </ProtectedRoute>
  )
}

// Componente de formulário de edição/criação
// Função para verificar e criar comissão automaticamente
async function checkAndCreateCommission(leadId: string, leadData: any, originalLead?: Lead) {
  try {
    // Verificar se o lead foi marcado como vendido e tem indicador
    if (leadData.status === 'vendido' && leadData.mentorado_indicador_id && leadData.valor_vendido) {
      console.log('🎯 Lead vendido com indicador detectado, criando comissão...')

      // Verificar se já existe comissão para este lead
      const { data: existingCommission } = await supabase
        .from('comissoes')
        .select('id')
        .eq('lead_id', leadId)
        .single()

      if (existingCommission) {
        console.log('ℹ️ Comissão já existe para este lead')
        return
      }

      // Buscar dados do mentorado indicador e sua organização
      const { data: mentorado, error: mentoradoError } = await supabase
        .from('mentorados')
        .select(`
          id, nome_completo, email, organization_id,
          organizations:organization_id (
            comissao_fixa_indicacao
          )
        `)
        .eq('id', leadData.mentorado_indicador_id)
        .single()

      if (mentoradoError) {
        console.error('❌ Erro ao buscar mentorado:', mentoradoError)
        return
      }

      const comissaoFixa = mentorado.organizations?.[0]?.comissao_fixa_indicacao || 2000.00

      if (!comissaoFixa || comissaoFixa <= 0) {
        console.warn('⚠️ Organização não tem comissão fixa configurada')
        return
      }

      // Usar valor fixo da organização
      const valorComissao = comissaoFixa

      // Criar registro de comissão
      const comissaoData = {
        mentorado_id: leadData.mentorado_indicador_id,
        lead_id: leadId,
        valor_comissao: valorComissao,
        valor_venda: leadData.valor_vendido,
        data_venda: leadData.data_venda || new Date().toISOString(),
        observacoes: `Comissão fixa gerada automaticamente para indicação de ${mentorado.nome_completo} (R$ ${comissaoFixa.toFixed(2)})`
      }

      const { error: comissaoError } = await supabase
        .from('comissoes')
        .insert(comissaoData)

      if (comissaoError) {
        console.error('❌ Erro ao criar comissão:', comissaoError)
        // Mostrar alerta para o usuário mas não bloquear o salvamento do lead
        alert(`Lead salvo, mas houve erro ao gerar comissão automaticamente. Erro: ${comissaoError.message}`)
      } else {
        console.log(`✅ Comissão de R$ ${valorComissao.toFixed(2)} criada para ${mentorado.nome_completo}`)

        // Mostrar confirmação para o usuário
        alert(`✅ Lead salvo e comissão de R$ ${valorComissao.toFixed(2)} gerada automaticamente para ${mentorado.nome_completo}!`)
      }

    } else if (leadData.status === 'vendido' && leadData.mentorado_indicador_id && !leadData.valor_vendido) {
      console.warn('⚠️ Lead vendido com indicador mas sem valor de venda - comissão não pode ser calculada')
      alert('⚠️ Lead salvo, mas para gerar a comissão automaticamente é necessário informar o valor da venda.')
    }

  } catch (error) {
    console.error('❌ Erro na verificação de comissão:', error)
  }
}

function EditLeadForm({ lead, onSave, onCancel, activeOrganizationId }: {
  lead: Lead | null
  onSave: (lead: Partial<Lead>) => void
  onCancel: () => void
  activeOrganizationId?: string | null
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
    lead_score: lead?.lead_score || 0,
    sdr_id: lead?.sdr_id || '',
    closer_id: lead?.closer_id || ''
  })

  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [sdrs, setSdrs] = useState<Closer[]>([])
  const [closers, setClosers] = useState<Closer[]>([])
  const organizationId = activeOrganizationId || null

  // Carregar dados iniciais
  useEffect(() => {
    async function loadInitialData() {
      if (!organizationId) return

      try {
        // Carregar mentorados da organização
        const { data: mentoradosData, error: mentoradosError } = await supabase
          .from('mentorados')
          .select('id, nome_completo, email')
          .eq('organization_id', organizationId)
          .order('nome_completo')

        if (mentoradosError) {
          console.error('Erro ao carregar mentorados:', mentoradosError)
        } else {
          setMentorados(mentoradosData || [])
        }

        // Carregar SDRs da organização
        const { data: sdrsData, error: sdrsError } = await supabase
          .from('closers')
          .select('id, nome_completo, email, tipo_closer')
          .eq('organization_id', organizationId)
          .eq('tipo_closer', 'sdr')
          .eq('ativo', true)
          .order('nome_completo')

        if (sdrsError) {
          console.error('Erro ao carregar SDRs:', sdrsError)
        } else {
          setSdrs(sdrsData || [])
        }

        // Carregar Closers da organização
        const { data: closersData, error: closersError } = await supabase
          .from('closers')
          .select('id, nome_completo, email, tipo_closer')
          .eq('organization_id', organizationId)
          .eq('tipo_closer', 'closer')
          .eq('ativo', true)
          .order('nome_completo')

        if (closersError) {
          console.error('Erro ao carregar Closers:', closersError)
        } else {
          setClosers(closersData || [])
        }

      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error)
      }
    }

    loadInitialData()
  }, [organizationId])

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
      mentorado_indicador_id: formData.mentorado_indicador_id?.trim() || null,
      fonte_referencia: formData.fonte_referencia?.trim() || null,
      sdr_id: formData.sdr_id?.trim() || null,
      closer_id: formData.closer_id?.trim() || null,
      // Garantir que campos de texto vazios sejam null
      email: formData.email?.trim() || null,
      telefone: formData.telefone?.trim() || null,
      empresa: formData.empresa?.trim() || null,
      cargo: formData.cargo?.trim() || null,
      observacoes: formData.observacoes?.trim() || null,
    }

    // Se for um novo lead (não está editando), adicionar campos obrigatórios
    if (!lead) {
      submitData.data_primeiro_contato = new Date().toISOString()
      // Adicionar organization_id automaticamente
      submitData.organization_id = organizationId
    }

    onSave(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nome Completo *
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={formData.nome_completo}
              onChange={(e) => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
              className="w-full px-4 py-3 pr-10 border border-gray-600 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white placeholder:text-gray-400"
              placeholder="Ex: João da Silva"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Users className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email
          </label>
          <div className="relative">
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 pr-10 border border-gray-600 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white placeholder:text-gray-400"
              placeholder="Ex: joao@empresa.com"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Mail className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Telefone
          </label>
          <div className="relative">
            <input
              type="tel"
              value={formData.telefone}
              onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
              className="w-full px-4 py-3 pr-10 border border-gray-600 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white placeholder:text-gray-400"
              placeholder="Ex: (11) 99999-9999"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Phone className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Empresa
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.empresa}
              onChange={(e) => setFormData(prev => ({ ...prev, empresa: e.target.value }))}
              className="w-full px-4 py-3 pr-10 border border-gray-600 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white placeholder:text-gray-400"
              placeholder="Ex: Tech Solutions Ltda"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Building className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Cargo
          </label>
          <input
            type="text"
            value={formData.cargo}
            onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white placeholder:text-gray-400"
            placeholder="Ex: CEO, Gerente, Analista"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Origem
          </label>
          <select
            value={formData.origem}
            onChange={(e) => setFormData(prev => ({ ...prev, origem: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white placeholder:text-gray-400"
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mentorado que Indicou *
              </label>
              <select
                value={formData.mentorado_indicador_id}
                onChange={(e) => setFormData(prev => ({ ...prev, mentorado_indicador_id: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white placeholder:text-gray-400"
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Detalhes da Indicação
              </label>
              <input
                type="text"
                value={formData.fonte_referencia}
                onChange={(e) => setFormData(prev => ({ ...prev, fonte_referencia: e.target.value }))}
                placeholder="Como foi feita a indicação? (ex: WhatsApp, conversa pessoal, etc.)"
                className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white placeholder:text-gray-400"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white placeholder:text-gray-400"
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
            <option value="vazado">Vazado</option>
            <option value="churn">Churn</option>
            <option value="churnzinho">Churnzinho</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            SDR Responsável
          </label>
          <select
            value={formData.sdr_id}
            onChange={(e) => setFormData(prev => ({ ...prev, sdr_id: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white placeholder:text-gray-400"
          >
            <option value="">Selecionar SDR (opcional)</option>
            {sdrs.map((sdr) => (
              <option key={sdr.id} value={sdr.id}>
                {sdr.nome_completo} ({sdr.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Closer Responsável
          </label>
          <select
            value={formData.closer_id}
            onChange={(e) => setFormData(prev => ({ ...prev, closer_id: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white placeholder:text-gray-400"
          >
            <option value="">Selecionar Closer (opcional)</option>
            {closers.map((closer) => (
              <option key={closer.id} value={closer.id}>
                {closer.nome_completo} ({closer.email})
              </option>
            ))}
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
                className="w-full px-4 py-3 pr-10 border border-orange-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white"
              >
                <option value="elite">💎 Elite - Altíssima probabilidade</option>
                <option value="quente">🔥 Quente - Alta probabilidade</option>
                <option value="morno">🌟 Morno - Média probabilidade</option>
                <option value="frio">❄️ Frio - Baixa probabilidade</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <div className={`w-3 h-3 rounded-full ${formData.temperatura === 'elite' ? 'bg-purple-500 animate-pulse' : formData.temperatura === 'quente' ? 'bg-red-500 animate-pulse' : formData.temperatura === 'morno' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
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
                className="w-full px-4 py-3 pr-10 border border-purple-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white"
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
              className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white"
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
              className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white"
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
              className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white"
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
              className="w-full px-4 py-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white"
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
                className="w-full px-4 py-3 pr-10 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md bg-gray-700 text-white"
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

      <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-600">
        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
          📝 Observações
        </label>
        <textarea
          rows={4}
          value={formData.observacoes}
          onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
          className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-sm hover:shadow-md resize-none bg-gray-700 text-white"
          placeholder="Adicione observações detalhadas sobre este lead... Ex: Demonstrou interesse em pacote premium, tem orçamento aprovado, decisor principal."
        />
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-gray-600">
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-3 border-2 border-gray-600 hover:border-gray-500 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-2"
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
