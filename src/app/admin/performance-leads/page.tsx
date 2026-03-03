'use client'

import { useState, useMemo, useCallback } from 'react'
import { useStableData } from '@/hooks/use-stable-data'
import { useStableMutation } from '@/hooks/use-stable-mutation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Filter,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Target,
  Activity,
  Brain,
  MessageCircle,
  Phone,
  Mail,
  Calendar,
  Star,
  Award,
  BarChart3,
  Eye,
  Plus,
  RefreshCw,
  Download,
  ArrowUp,
  ArrowDown,
  Minus,
  CheckCircle,
  AlertTriangle,
  XCircle,
  User,
  Building
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  LeadExtendido,
  LeadInteraction,
  LeadQualificationDetails,
  PerformanceMetrics,
  CloserPerformance,
  OrganizationLeadsOverview,
  CreateLeadInteractionData
} from '@/types/commission'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import EmbeddedAIChat from '@/components/embedded-ai-chat'

interface DashboardStats {
  totalLeads: number;
  leadsQualificados: number;
  leadsConvertidos: number;
  taxaQualificacao: number;
  taxaConversao: number;
  valorPipeline: number;
  valorFechado: number;
  ticketMedio: number;
  cicloVendasMedio: number;
}

interface LeadDetailed extends LeadExtendido {
  score_bant?: number;
  ultima_interacao?: LeadInteraction;
  total_interacoes: number;
  dias_no_pipeline: number;
  probabilidade_real: number;
}

interface CloserStats {
  id: string;
  nome_completo: string;
  tipo_closer: string;
  leads_ativos: number;
  conversoes_mes: number;
  taxa_conversao: number;
  atividade_media_dia: number;
  valor_pipeline: number;
  ultima_atividade: string;
}

export default function AdvancedPerformanceLeadsPage() {
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCloser, setSelectedCloser] = useState<string>('all')
  const [selectedTemperatura, setSelectedTemperatura] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('month')

  // Modal states
  const [selectedLead, setSelectedLead] = useState<LeadDetailed | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false)
  const [interactionForm, setInteractionForm] = useState<Partial<CreateLeadInteractionData>>({})

  // Tab state
  const [activeTab, setActiveTab] = useState('leads')

  // Calculate date filter for stable hooks
  const dateFilter = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    switch (dateRange) {
      case '7_days':
        const date = new Date()
        date.setDate(date.getDate() - 7)
        return date.toISOString()
      case '30_days':
        const date30 = new Date()
        date30.setDate(date30.getDate() - 30)
        return date30.toISOString()
      case '90_days':
        const date90 = new Date()
        date90.setDate(date90.getDate() - 90)
        return date90.toISOString()
      case 'month':
        return new Date(year, month, 1).toISOString()
      case 'quarter':
        const quarterStart = Math.floor(month / 3) * 3
        return new Date(year, quarterStart, 1).toISOString()
      case 'semester':
        const semesterStart = month >= 6 ? 6 : 0
        return new Date(year, semesterStart, 1).toISOString()
      case 'year':
        return new Date(year, 0, 1).toISOString()
      case 'ytd':
        return new Date(year, 0, 1).toISOString()
      default:
        return new Date().toISOString()
    }
  }, [dateRange])

  // Stable hooks for data loading
  const {
    data: rawLeads,
    loading: leadsLoading,
    error: leadsError,
    refetch: refetchLeads
  } = useStableData<any>({
    tableName: 'leads',
    select: `
      *,
      closer:closer_id(id, nome_completo, tipo_closer),
      sdr:sdr_id(id, nome_completo, tipo_closer),
      interactions:lead_interactions(
        id, tipo_interacao, data_interacao, resultado, interesse_manifestado,
        qualificacao_budget, qualificacao_autoridade, qualificacao_necessidade,
        qualificacao_timeline, sentimento_lead, nivel_interesse,
        probabilidade_fechamento_percebida, resumo
      ),
      qualification:lead_qualification_details(
        qualification_score, authority_nivel, budget_confirmado,
        need_urgencia_score, timeline_meta_implementacao,
        situacao_atual, empresa_nome
      )
    `,
    filters: selectedCloser !== 'all' ? {
      closer_id: selectedCloser,
      created_at: `gte.${dateFilter}`,
      status: `not.in.(excluido,vazado)`
    } : {
      created_at: `gte.${dateFilter}`,
      status: `not.in.(excluido,vazado)`
    },
    dependencies: [dateFilter, selectedCloser],
    autoLoad: true,
    debounceMs: 100
  })

  const {
    data: rawClosers,
    loading: closersLoading,
    error: closersError
  } = useStableData<any>({
    tableName: 'closers',
    select: `
      id, nome_completo, tipo_closer,
      leads:leads!inner(id, status, valor_potencial, created_at),
      interactions:lead_interactions(id, data_interacao)
    `,
    filters: {
      status_contrato: 'ativo'
    },
    dependencies: [],
    autoLoad: true,
    debounceMs: 300
  })

  // Memoized lead processing
  const leads = useMemo(() => {
    if (!rawLeads?.length) return []

    return rawLeads.map(lead => {
      const interactions = lead.interactions || []
      const qualification = lead.qualification?.[0]

      const createdDate = new Date(lead.created_at)
      const diasNoPipeline = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

      const scoreBant = qualification?.qualification_score || 0
      const ultimaInteracao = interactions.sort((a: any, b: any) =>
        new Date(b.data_interacao).getTime() - new Date(a.data_interacao).getTime()
      )[0]

      // Calculate real probability based on interactions and qualification
      let probabilidadeReal = lead.probabilidade_fechamento || 0
      if (ultimaInteracao?.probabilidade_fechamento_percebida) {
        probabilidadeReal = ultimaInteracao.probabilidade_fechamento_percebida
      }
      if (qualification?.qualification_score) {
        probabilidadeReal = Math.max(probabilidadeReal, qualification.qualification_score)
      }

      return {
        ...lead,
        total_interacoes: interactions.length,
        dias_no_pipeline: diasNoPipeline,
        score_bant: scoreBant,
        ultima_interacao: ultimaInteracao,
        probabilidade_real: probabilidadeReal
      }
    }) as LeadDetailed[]
  }, [rawLeads])

  // Memoized closer processing
  const closers = useMemo(() => {
    if (!rawClosers?.length) return []

    return rawClosers.map(closer => {
      const leads = (closer.leads || []).filter((l: any) => !['excluido', 'vazado'].includes(l.status))
      const interactions = closer.interactions || []

      const leadsAtivos = leads.filter((l: any) =>
        !['vendido', 'perdido', 'churn', 'cancelado', 'excluido', 'vazado'].includes(l.status)
      ).length

      const conversoesMes = leads.filter((l: any) => {
        const createdThisMonth = new Date(l.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        return l.status === 'vendido' && createdThisMonth
      }).length

      const taxaConversao = leads.length > 0 ?
        (leads.filter((l: any) => l.status === 'vendido').length / leads.length) * 100 : 0

      const valorPipeline = leads
        .filter((l: any) => !['vendido', 'perdido', 'churn', 'cancelado', 'excluido', 'vazado'].includes(l.status))
        .reduce((sum: number, l: any) => sum + (l.valor_potencial || 0), 0)

      const interacoesUltimos7Dias = interactions.filter((i: any) => {
        const interactionDate = new Date(i.data_interacao)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return interactionDate >= weekAgo
      }).length

      const atividadeMediaDia = interacoesUltimos7Dias / 7

      const ultimaInteracao = interactions.sort((a: any, b: any) =>
        new Date(b.data_interacao).getTime() - new Date(a.data_interacao).getTime()
      )[0]

      return {
        id: closer.id,
        nome_completo: closer.nome_completo,
        tipo_closer: closer.tipo_closer,
        leads_ativos: leadsAtivos,
        conversoes_mes: conversoesMes,
        taxa_conversao: taxaConversao,
        atividade_media_dia: atividadeMediaDia,
        valor_pipeline: valorPipeline,
        ultima_atividade: ultimaInteracao?.data_interacao || 'N/A'
      }
    }) as CloserStats[]
  }, [rawClosers])

  // Memoized stats calculation
  const stats = useMemo(() => {
    const totalLeads = leads.length
    const leadsQualificados = leads.filter(l => l.score_bant && l.score_bant > 50).length
    const leadsConvertidos = leads.filter(l => l.status === 'vendido').length
    const taxaQualificacao = totalLeads > 0 ? (leadsQualificados / totalLeads) * 100 : 0
    const taxaConversao = totalLeads > 0 ? (leadsConvertidos / totalLeads) * 100 : 0
    const valorPipeline = leads.reduce((sum, l) => sum + (l.valor_potencial || 0), 0)
    const valorFechado = leads
      .filter(l => l.status === 'vendido')
      .reduce((sum, l) => sum + (l.valor_potencial || 0), 0)
    const ticketMedio = leadsConvertidos > 0 ? valorFechado / leadsConvertidos : 0
    const cicloVendasMedio = leads
      .filter(l => l.status === 'vendido')
      .reduce((sum, l) => sum + l.dias_no_pipeline, 0) / (leadsConvertidos || 1)

    return {
      totalLeads,
      leadsQualificados,
      leadsConvertidos,
      taxaQualificacao,
      taxaConversao,
      valorPipeline,
      valorFechado,
      ticketMedio,
      cicloVendasMedio
    }
  }, [leads])

  // Combined loading state
  const loading = leadsLoading || closersLoading

  // Stable mutation for creating interactions
  const { mutate: mutateCreateInteraction, isLoading: isCreatingInteraction } = useStableMutation(
    'lead_interactions',
    'insert',
    {
      onSuccess: async () => {
        toast.success('Interacao registrada com sucesso!')
        setIsInteractionModalOpen(false)
        setInteractionForm({})
        await refetchLeads()
      },
      onError: (error: any) => {
        console.error('Error creating interaction:', error)
        toast.error('Erro ao registrar interacao')
      },
      debounceMs: 200
    }
  )

  const handleCreateInteraction = useCallback(async () => {
    if (!selectedLead || !interactionForm.resumo) {
      toast.error('Preencha os campos obrigatorios')
      return
    }

    await mutateCreateInteraction({
      ...interactionForm,
      lead_id: selectedLead.id,
      closer_id: selectedLead.closer_id,
      organization_id: selectedLead.organization_id,
      data_interacao: new Date().toISOString()
    })
  }, [selectedLead, interactionForm, mutateCreateInteraction])

  const openDetailModal = useCallback((lead: LeadDetailed) => {
    setSelectedLead(lead)
    setIsDetailModalOpen(true)
  }, [])

  const openInteractionModal = useCallback((lead: LeadDetailed) => {
    setSelectedLead(lead)
    setInteractionForm({
      tipo_interacao: 'ligacao',
      resultado: 'contato_realizado',
      resumo: '',
      nivel_interesse: 3,
      probabilidade_fechamento_percebida: lead.probabilidade_real
    })
    setIsInteractionModalOpen(true)
  }, [])

  const getTemperaturaColor = useCallback((temperatura?: string) => {
    switch (temperatura) {
      case 'elite': return 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
      case 'quente': return 'bg-red-500/20 text-red-300 border border-red-500/30'
      case 'morno': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
      case 'frio': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
      default: return 'bg-white/[0.05] text-white/40 border border-white/[0.08]'
    }
  }, [])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'vendido': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
      case 'perdido': return 'bg-red-500/20 text-red-300 border border-red-500/30'
      case 'churn': return 'bg-white/[0.05] text-white/40 border border-white/[0.08]'
      case 'negociacao': return 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
      case 'proposta_enviada': return 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
      default: return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    }
  }, [])

  const getProbabilityIcon = useCallback((probability: number) => {
    if (probability >= 80) return <ArrowUp className="h-4 w-4 text-emerald-400" />
    if (probability >= 50) return <Minus className="h-4 w-4 text-yellow-400" />
    return <ArrowDown className="h-4 w-4 text-red-400" />
  }, [])

  // Memoized filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = searchTerm.length === 0 ||
        lead.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.empresa?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCloser = selectedCloser === 'all' || lead.closer_id === selectedCloser
      const matchesTemperatura = selectedTemperatura === 'all' || lead.temperatura === selectedTemperatura
      const matchesStatus = selectedStatus === 'all' || lead.status === selectedStatus

      return matchesSearch && matchesCloser && matchesTemperatura && matchesStatus
    })
  }, [leads, searchTerm, selectedCloser, selectedTemperatura, selectedStatus])

  // AI Chat context builder
  const buildChatContext = useCallback(() => {
    const statusCounts = leads.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const statusList = Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(', ')

    const closerStatsList = closers.map(c =>
      `${c.nome_completo} (${c.tipo_closer || 'closer'}): ${c.leads_ativos} ativos, ${c.conversoes_mes} conversoes, ${c.taxa_conversao.toFixed(1)}% taxa, R$ ${(c.valor_pipeline / 1000).toFixed(0)}k pipeline`
    ).join('\n')

    return `
PERFORMANCE AVANCADA DE LEADS:
- Total: ${stats.totalLeads}
- Qualificados: ${stats.leadsQualificados} (${stats.taxaQualificacao.toFixed(1)}%)
- Convertidos: ${stats.leadsConvertidos} (${stats.taxaConversao.toFixed(1)}%)
- Pipeline: R$ ${(stats.valorPipeline / 1000).toFixed(0)}k
- Fechado: R$ ${(stats.valorFechado / 1000).toFixed(0)}k
- Ticket medio: R$ ${(stats.ticketMedio / 1000).toFixed(0)}k
- Ciclo vendas medio: ${stats.cicloVendasMedio.toFixed(0)} dias

STATUS: ${statusList}

CLOSERS:
${closerStatsList}

LEADS DETALHADOS (top 20):
${filteredLeads.slice(0, 20).map(l => `${l.nome_completo}: ${l.status}, ${l.temperatura || 'N/A'}, ${l.total_interacoes} interacoes, ${l.dias_no_pipeline} dias, prob: ${l.probabilidade_real}%`).join('\n')}
`
  }, [leads, closers, stats, filteredLeads])

  const chatSuggestions = useMemo(() => [
    'Gere um relatorio de performance dos closers',
    'Onde estao os gargalos do funil?',
    'Qual closer esta performando melhor?',
    'Como reduzir o ciclo de vendas?',
  ], [])

  // Stable refresh function
  const loadDashboardData = useCallback(async () => {
    await refetchLeads()
  }, [refetchLeads])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <RefreshCw className="h-7 w-7 animate-spin text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-white">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-[#0a0a0c]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Performance Avancada</h1>
                <p className="text-xs text-white/40 mt-0.5">Dashboard de tracking e analise de leads</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadDashboardData}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all duration-200 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Leads */}
          <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] ring-1 ring-white/[0.06] hover:border-blue-500/20 hover:ring-blue-500/10 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Users className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Total Leads</p>
              <p className="text-3xl font-bold text-white mt-1 tabular-nums">{stats.totalLeads}</p>
            </div>
          </div>

          {/* Qualificados */}
          <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] ring-1 ring-white/[0.06] hover:border-purple-500/20 hover:ring-purple-500/10 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Target className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Qualificados</p>
              <p className="text-3xl font-bold text-white mt-1 tabular-nums">{stats.leadsQualificados}</p>
              <p className="text-xs text-purple-400 mt-1">{stats.taxaQualificacao.toFixed(1)}%</p>
            </div>
          </div>

          {/* Convertidos */}
          <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] ring-1 ring-white/[0.06] hover:border-emerald-500/20 hover:ring-emerald-500/10 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Convertidos</p>
              <p className="text-3xl font-bold text-white mt-1 tabular-nums">{stats.leadsConvertidos}</p>
              <p className="text-xs text-emerald-400 mt-1">{stats.taxaConversao.toFixed(1)}%</p>
            </div>
          </div>

          {/* Pipeline */}
          <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] ring-1 ring-white/[0.06] hover:border-yellow-500/20 hover:ring-yellow-500/10 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-yellow-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center shadow-lg shadow-yellow-500/20">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Pipeline</p>
              <p className="text-3xl font-bold text-white mt-1 tabular-nums">
                R$ {(stats.valorPipeline / 1000).toFixed(0)}k
              </p>
            </div>
          </div>

          {/* Ticket Medio */}
          <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] ring-1 ring-white/[0.06] hover:border-orange-500/20 hover:ring-orange-500/10 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Award className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Ticket Medio</p>
              <p className="text-3xl font-bold text-white mt-1 tabular-nums">
                R$ {(stats.ticketMedio / 1000).toFixed(0)}k
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#1a1a1e] rounded-2xl border border-white/[0.06] ring-1 ring-white/[0.06] p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                <input
                  placeholder="Buscar por nome, email ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all"
                />
              </div>
            </div>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-48 bg-white/[0.05] border-white/[0.08] text-white/70 rounded-xl hover:bg-white/[0.08] transition-all [&>svg]:text-white/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1e] border-white/[0.08] text-white">
                <SelectItem value="7_days">Ultimos 7 dias</SelectItem>
                <SelectItem value="30_days">Ultimos 30 dias</SelectItem>
                <SelectItem value="90_days">Ultimos 90 dias</SelectItem>
                <SelectItem value="month">Mes Atual</SelectItem>
                <SelectItem value="quarter">Trimestre Atual</SelectItem>
                <SelectItem value="semester">Semestre Atual</SelectItem>
                <SelectItem value="ytd">Ano ate hoje</SelectItem>
                <SelectItem value="year">Ano Atual</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCloser} onValueChange={setSelectedCloser}>
              <SelectTrigger className="w-48 bg-white/[0.05] border-white/[0.08] text-white/70 rounded-xl hover:bg-white/[0.08] transition-all [&>svg]:text-white/40">
                <SelectValue placeholder="Closer" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1e] border-white/[0.08] text-white">
                <SelectItem value="all">Todos os Closers</SelectItem>
                {closers.map(closer => (
                  <SelectItem key={closer.id} value={closer.id}>
                    {closer.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTemperatura} onValueChange={setSelectedTemperatura}>
              <SelectTrigger className="w-48 bg-white/[0.05] border-white/[0.08] text-white/70 rounded-xl hover:bg-white/[0.08] transition-all [&>svg]:text-white/40">
                <SelectValue placeholder="Temperatura" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1e] border-white/[0.08] text-white">
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="quente">Quente</SelectItem>
                <SelectItem value="morno">Morno</SelectItem>
                <SelectItem value="frio">Frio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-[#1a1a1e] rounded-2xl border border-white/[0.06] ring-1 ring-white/[0.06] overflow-hidden">
          {/* Tab headers */}
          <div className="flex border-b border-white/[0.06] bg-[#141418]/50">
            <button
              onClick={() => setActiveTab('leads')}
              className={`flex-1 px-6 py-3.5 text-sm font-medium transition-all duration-200 relative ${
                activeTab === 'leads'
                  ? 'text-white bg-white/[0.06]'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
              }`}
            >
              {activeTab === 'leads' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full" />
              )}
              <div className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                Leads Detalhados
              </div>
            </button>
            <button
              onClick={() => setActiveTab('closers')}
              className={`flex-1 px-6 py-3.5 text-sm font-medium transition-all duration-200 relative ${
                activeTab === 'closers'
                  ? 'text-white bg-white/[0.06]'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
              }`}
            >
              {activeTab === 'closers' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full" />
              )}
              <div className="flex items-center justify-center gap-2">
                <Star className="h-4 w-4" />
                Performance Closers
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 px-6 py-3.5 text-sm font-medium transition-all duration-200 relative ${
                activeTab === 'analytics'
                  ? 'text-white bg-white/[0.06]'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
              }`}
            >
              {activeTab === 'analytics' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full" />
              )}
              <div className="flex items-center justify-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics Avancado
              </div>
            </button>
          </div>

          {/* Tab content */}
          <div className="p-6">
            {/* ── LEADS TAB ────────────────────────────────────── */}
            {activeTab === 'leads' && (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Leads Detalhados ({filteredLeads.length})</h2>
                    <p className="text-sm text-white/40">Informacoes completas sobre qualificacao, interacoes e performance</p>
                  </div>
                </div>

                {/* Dark Table */}
                <div className="overflow-x-auto rounded-xl border border-white/[0.04]">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                        <th className="text-left p-3.5 text-[11px] font-semibold text-white/50 uppercase tracking-widest">Lead</th>
                        <th className="text-left p-3.5 text-[11px] font-semibold text-white/50 uppercase tracking-widest">Score/Temperatura</th>
                        <th className="text-left p-3.5 text-[11px] font-semibold text-white/50 uppercase tracking-widest">Closer/SDR</th>
                        <th className="text-left p-3.5 text-[11px] font-semibold text-white/50 uppercase tracking-widest">Atividade</th>
                        <th className="text-left p-3.5 text-[11px] font-semibold text-white/50 uppercase tracking-widest">Qualificacao</th>
                        <th className="text-left p-3.5 text-[11px] font-semibold text-white/50 uppercase tracking-widest">Pipeline</th>
                        <th className="text-center p-3.5 text-[11px] font-semibold text-white/50 uppercase tracking-widest">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors duration-200 group/row">
                          <td className="p-3">
                            <div>
                              <p className="font-medium text-white">{lead.nome_completo}</p>
                              <p className="text-sm text-white/40">{lead.email}</p>
                              {lead.empresa && (
                                <p className="text-xs text-white/30 flex items-center mt-0.5">
                                  <Building className="h-3 w-3 mr-1 text-white/20" />
                                  {lead.empresa}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-1.5">
                              <Badge className={getTemperaturaColor(lead.temperatura)}>
                                {lead.temperatura || 'N/A'}
                              </Badge>
                              {lead.score_bant && (
                                <div className="flex items-center text-sm text-white/50">
                                  <Brain className="h-3 w-3 mr-1 text-purple-400" />
                                  Score: {lead.score_bant}/100
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-1 text-sm">
                              {lead.closer && (
                                <div className="flex items-center text-white/60">
                                  <User className="h-3 w-3 mr-1.5 text-blue-400" />
                                  {lead.closer.nome_completo}
                                </div>
                              )}
                              {lead.sdr && (
                                <div className="flex items-center text-white/60">
                                  <Phone className="h-3 w-3 mr-1.5 text-emerald-400" />
                                  {lead.sdr.nome_completo}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center text-white/50">
                                <Activity className="h-3 w-3 mr-1.5 text-purple-400" />
                                {lead.total_interacoes} interacoes
                              </div>
                              <div className="flex items-center text-white/50">
                                <Clock className="h-3 w-3 mr-1.5 text-white/30" />
                                {lead.dias_no_pipeline} dias
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center text-sm text-white/60">
                                {getProbabilityIcon(lead.probabilidade_real)}
                                <span className="ml-1">{lead.probabilidade_real}%</span>
                              </div>
                              <Badge className={getStatusColor(lead.status)}>
                                {lead.status}
                              </Badge>
                            </div>
                          </td>
                          <td className="p-3">
                            {lead.valor_potencial && (
                              <div className="flex items-center text-sm text-emerald-400 font-medium">
                                <DollarSign className="h-3 w-3 mr-1" />
                                R$ {lead.valor_potencial.toLocaleString('pt-BR')}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openDetailModal(lead)}
                                className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openInteractionModal(lead)}
                                className="p-2 rounded-lg hover:bg-purple-500/10 text-white/40 hover:text-purple-400 transition-all"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredLeads.length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
                      <Users className="h-8 w-8 text-white/20" />
                    </div>
                    <p className="text-white/40 text-sm">Nenhum lead encontrado</p>
                  </div>
                )}
              </div>
            )}

            {/* ── CLOSERS TAB ──────────────────────────────────── */}
            {activeTab === 'closers' && (
              <div className="space-y-4">
                {/* Header */}
                <div className="mb-2">
                  <h2 className="text-lg font-semibold text-white">Performance dos Closers</h2>
                  <p className="text-sm text-white/40">Metricas detalhadas de performance individual</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {closers.map((closer) => (
                    <div key={closer.id} className="group relative bg-[#141417] rounded-2xl border border-white/[0.06] hover:border-purple-500/20 transition-all duration-300 overflow-hidden">
                      {/* Decorative gradient */}
                      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-purple-500/[0.04] to-transparent rounded-bl-full" />

                      {/* Header */}
                      <div className="relative p-5 pb-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold text-white">{closer.nome_completo}</h3>
                          <Badge className={
                            closer.tipo_closer === 'closer_senior'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-white/[0.05] text-white/50 border border-white/[0.08]'
                          }>
                            {closer.tipo_closer}
                          </Badge>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="relative px-5 pb-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/[0.03] rounded-xl p-3">
                            <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Leads Ativos</p>
                            <p className="text-2xl font-bold text-blue-400">{closer.leads_ativos}</p>
                          </div>
                          <div className="bg-white/[0.03] rounded-xl p-3">
                            <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Conversoes</p>
                            <p className="text-2xl font-bold text-emerald-400">{closer.conversoes_mes}</p>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-white/40">Taxa de Conversao</p>
                            <p className="text-xs font-medium text-white/70">{closer.taxa_conversao.toFixed(1)}%</p>
                          </div>
                          <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(closer.taxa_conversao, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-white/30">Atividade/dia</p>
                            <p className="font-medium text-white/70">{closer.atividade_media_dia.toFixed(1)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/30">Pipeline</p>
                            <p className="font-medium text-white/70">R$ {(closer.valor_pipeline / 1000).toFixed(0)}k</p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-white/[0.06]">
                          <p className="text-xs text-white/25">
                            Ultima atividade: {closer.ultima_atividade !== 'N/A' ?
                              new Date(closer.ultima_atividade).toLocaleDateString('pt-BR') : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ANALYTICS TAB ────────────────────────────────── */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Funil de Conversao */}
                  <div className="bg-[#141417] rounded-2xl border border-white/[0.06] p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-700/20 flex items-center justify-center border border-purple-500/20">
                        <TrendingUp className="h-4 w-4 text-purple-400" />
                      </div>
                      <h3 className="text-base font-semibold text-white">Funil de Conversao</h3>
                    </div>
                    <div className="space-y-5">
                      {['novo', 'contatado', 'qualificado', 'proposta_enviada', 'vendido'].map((stage, index) => {
                        const stageLeads = leads.filter(l => l.status === stage).length
                        const percentage = leads.length > 0 ? (stageLeads / leads.length) * 100 : 0
                        const stageColors = [
                          'from-blue-500 to-blue-600',
                          'from-cyan-500 to-cyan-600',
                          'from-purple-500 to-purple-600',
                          'from-orange-500 to-orange-600',
                          'from-emerald-500 to-emerald-600',
                        ]

                        return (
                          <div key={stage} className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-white/60 capitalize">{stage.replace('_', ' ')}</span>
                              <span className="text-sm text-white/40">
                                {stageLeads} leads ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="h-2.5 bg-white/[0.05] rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${stageColors[index]} rounded-full transition-all duration-700`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Distribuicao por Fonte */}
                  <div className="bg-[#141417] rounded-2xl border border-white/[0.06] p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-700/20 flex items-center justify-center border border-blue-500/20">
                        <BarChart3 className="h-4 w-4 text-blue-400" />
                      </div>
                      <h3 className="text-base font-semibold text-white">Distribuicao por Fonte</h3>
                    </div>
                    <div className="space-y-3">
                      {Array.from(new Set(leads.map(l => l.origem || 'Nao especificado')))
                        .map(fonte => {
                          const fonteLeads = leads.filter(l => (l.origem || 'Nao especificado') === fonte)
                          const percentage = leads.length > 0 ? (fonteLeads.length / leads.length) * 100 : 0
                          const conversoes = fonteLeads.filter(l => l.status === 'vendido').length
                          const taxaConversao = fonteLeads.length > 0 ? (conversoes / fonteLeads.length) * 100 : 0

                          return (
                            <div key={fonte} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:border-white/[0.1] transition-all">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="font-medium text-white/80 text-sm">{fonte}</span>
                                <span className="text-xs text-white/40">{fonteLeads.length} leads</span>
                              </div>
                              <div className="text-xs text-white/30 mb-2">
                                Taxa de conversao: {taxaConversao.toFixed(1)}%
                              </div>
                              <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                </div>

                {/* Extra row: key metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#141417] rounded-2xl border border-white/[0.06] p-5">
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Valor Fechado</p>
                    <p className="text-2xl font-bold text-emerald-400">R$ {(stats.valorFechado / 1000).toFixed(0)}k</p>
                  </div>
                  <div className="bg-[#141417] rounded-2xl border border-white/[0.06] p-5">
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Ciclo Vendas Medio</p>
                    <p className="text-2xl font-bold text-purple-400">{stats.cicloVendasMedio.toFixed(0)} dias</p>
                  </div>
                  <div className="bg-[#141417] rounded-2xl border border-white/[0.06] p-5">
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Taxa Qualificacao</p>
                    <p className="text-2xl font-bold text-blue-400">{stats.taxaQualificacao.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── EMBEDDED AI CHAT ─────────────────────────────── */}
        <EmbeddedAIChat
          contextBuilder={buildChatContext}
          systemPrompt="Voce e uma ANALISTA DE PERFORMANCE SENIOR especializada em metricas de vendas e closers. Analise os dados de performance fornecidos. Identifique closers de alta e baixa performance. Sugira melhorias nos processos de venda. Analise o pipeline e gargalos. Responda SEMPRE em portugues brasileiro. Base suas analises EXCLUSIVAMENTE nos dados fornecidos. Se nao tem dados suficientes, diga claramente. Use markdown para formatar (negrito, listas, titulos). Sempre que possivel, cite numeros especificos dos dados."
          title="Analista de Performance IA"
          subtitle="Pergunte sobre performance, closers e pipeline"
          suggestions={chatSuggestions}
          accentColor="violet"
          defaultCollapsed={false}
        />
      </div>

      {/* Lead Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-[#141417] border-white/[0.08] text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Detalhes do Lead - {selectedLead?.nome_completo}</DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-6">
              {/* Lead Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-purple-400" />
                    Informacoes Basicas
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="text-white/50"><span className="text-white/70 font-medium">Email:</span> {selectedLead.email}</div>
                    <div className="text-white/50"><span className="text-white/70 font-medium">Telefone:</span> {selectedLead.telefone}</div>
                    <div className="text-white/50"><span className="text-white/70 font-medium">Empresa:</span> {selectedLead.empresa}</div>
                    <div className="text-white/50"><span className="text-white/70 font-medium">Cargo:</span> {selectedLead.cargo}</div>
                    <div className="text-white/50"><span className="text-white/70 font-medium">Origem:</span> {selectedLead.origem}</div>
                  </div>
                </div>

                <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    Pipeline
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="text-white/50 flex items-center gap-2">
                      <span className="text-white/70 font-medium">Status:</span>
                      <Badge className={getStatusColor(selectedLead.status)}>
                        {selectedLead.status}
                      </Badge>
                    </div>
                    <div className="text-white/50 flex items-center gap-2">
                      <span className="text-white/70 font-medium">Temperatura:</span>
                      <Badge className={getTemperaturaColor(selectedLead.temperatura)}>
                        {selectedLead.temperatura}
                      </Badge>
                    </div>
                    <div className="text-white/50"><span className="text-white/70 font-medium">Valor:</span> R$ {selectedLead.valor_potencial?.toLocaleString('pt-BR')}</div>
                    <div className="text-white/50"><span className="text-white/70 font-medium">Probabilidade:</span> {selectedLead.probabilidade_real}%</div>
                    <div className="text-white/50"><span className="text-white/70 font-medium">Dias no pipeline:</span> {selectedLead.dias_no_pipeline}</div>
                  </div>
                </div>

                <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-400" />
                    Atividade
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="text-white/50"><span className="text-white/70 font-medium">Total interacoes:</span> {selectedLead.total_interacoes}</div>
                    <div className="text-white/50"><span className="text-white/70 font-medium">Score BANT:</span> {selectedLead.score_bant}/100</div>
                    <div className="text-white/50"><span className="text-white/70 font-medium">Closer:</span> {selectedLead.closer?.nome_completo}</div>
                    <div className="text-white/50"><span className="text-white/70 font-medium">SDR:</span> {selectedLead.sdr?.nome_completo}</div>
                  </div>
                </div>
              </div>

              {/* Interactions History */}
              {selectedLead.interactions && selectedLead.interactions.length > 0 && (
                <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5">
                  <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-purple-400" />
                    Historico de Interacoes
                  </h4>
                  <div className="space-y-3">
                    {selectedLead.interactions.slice(0, 5).map((interaction: any, index) => (
                      <div key={index} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-white/80 capitalize text-sm">
                              {interaction.tipo_interacao} - {interaction.resultado}
                            </p>
                            <p className="text-sm text-white/40 mt-1">
                              {interaction.resumo || 'Sem resumo'}
                            </p>
                          </div>
                          <div className="text-xs text-white/30 whitespace-nowrap ml-4">
                            {new Date(interaction.data_interacao).toLocaleDateString('pt-BR')}
                          </div>
                        </div>

                        {interaction.nivel_interesse && (
                          <div className="mt-2 flex items-center gap-4 text-xs text-white/40">
                            <span>Interesse: {interaction.nivel_interesse}/5</span>
                            {interaction.probabilidade_fechamento_percebida && (
                              <span>Probabilidade: {interaction.probabilidade_fechamento_percebida}%</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Qualification Details */}
              {selectedLead.qualification && (
                <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5">
                  <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-400" />
                    Qualificacao BANT
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p className="text-white/50"><span className="text-white/70 font-medium">Budget confirmado:</span> {selectedLead.qualification.budget_confirmado ? 'Sim' : 'Nao'}</p>
                      <p className="text-white/50"><span className="text-white/70 font-medium">Autoridade:</span> {selectedLead.qualification.authority_nivel}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-white/50"><span className="text-white/70 font-medium">Score urgencia:</span> {selectedLead.qualification.need_urgencia_score}/10</p>
                      <p className="text-white/50"><span className="text-white/70 font-medium">Meta implementacao:</span> {selectedLead.qualification.timeline_meta_implementacao}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Interaction Modal */}
      <Dialog open={isInteractionModalOpen} onOpenChange={setIsInteractionModalOpen}>
        <DialogContent className="max-w-2xl bg-[#141417] border-white/[0.08] text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Nova Interacao - {selectedLead?.nome_completo}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/60 text-sm">Tipo de Interacao</Label>
                <Select
                  value={interactionForm.tipo_interacao}
                  onValueChange={(value: any) => setInteractionForm({...interactionForm, tipo_interacao: value})}
                >
                  <SelectTrigger className="bg-white/[0.05] border-white/[0.08] text-white/70 mt-1.5 rounded-xl [&>svg]:text-white/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1e] border-white/[0.08] text-white">
                    <SelectItem value="ligacao">Ligacao</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="reuniao">Reuniao</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white/60 text-sm">Resultado</Label>
                <Select
                  value={interactionForm.resultado}
                  onValueChange={(value: any) => setInteractionForm({...interactionForm, resultado: value})}
                >
                  <SelectTrigger className="bg-white/[0.05] border-white/[0.08] text-white/70 mt-1.5 rounded-xl [&>svg]:text-white/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1e] border-white/[0.08] text-white">
                    <SelectItem value="contato_realizado">Contato Realizado</SelectItem>
                    <SelectItem value="sem_resposta">Sem Resposta</SelectItem>
                    <SelectItem value="agendamento_feito">Agendamento Feito</SelectItem>
                    <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-white/60 text-sm">Resumo da Interacao *</Label>
              <Textarea
                value={interactionForm.resumo || ''}
                onChange={(e) => setInteractionForm({...interactionForm, resumo: e.target.value})}
                placeholder="Descreva o que aconteceu nesta interacao..."
                rows={3}
                className="bg-white/[0.05] border-white/[0.08] text-white placeholder-white/25 mt-1.5 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/60 text-sm">Nivel de Interesse (1-5)</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={interactionForm.nivel_interesse || 3}
                  onChange={(e) => setInteractionForm({...interactionForm, nivel_interesse: parseInt(e.target.value)})}
                  className="bg-white/[0.05] border-white/[0.08] text-white mt-1.5 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30"
                />
              </div>

              <div>
                <Label className="text-white/60 text-sm">Probabilidade de Fechamento (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={interactionForm.probabilidade_fechamento_percebida || 0}
                  onChange={(e) => setInteractionForm({...interactionForm, probabilidade_fechamento_percebida: parseInt(e.target.value)})}
                  className="bg-white/[0.05] border-white/[0.08] text-white mt-1.5 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setIsInteractionModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateInteraction}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-medium hover:from-purple-500 hover:to-purple-600 transition-all shadow-lg shadow-purple-500/20"
            >
              Registrar Interacao
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </ProtectedRoute>
  )
}
