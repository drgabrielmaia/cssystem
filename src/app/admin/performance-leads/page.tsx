'use client'

import { useState, useEffect } from 'react'
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
  // State
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<LeadDetailed[]>([])
  const [closers, setClosers] = useState<CloserStats[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    leadsQualificados: 0,
    leadsConvertidos: 0,
    taxaQualificacao: 0,
    taxaConversao: 0,
    valorPipeline: 0,
    valorFechado: 0,
    ticketMedio: 0,
    cicloVendasMedio: 0
  })
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCloser, setSelectedCloser] = useState<string>('all')
  const [selectedTemperatura, setSelectedTemperatura] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('30_days')
  
  // Modal states
  const [selectedLead, setSelectedLead] = useState<LeadDetailed | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false)
  const [interactionForm, setInteractionForm] = useState<Partial<CreateLeadInteractionData>>({})

  useEffect(() => {
    loadDashboardData()
  }, [dateRange, selectedCloser])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadLeads(),
        loadClosers(),
        loadStats()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

  const loadLeads = async () => {
    try {
      let query = supabase
        .from('leads')
        .select(`
          *,
          closer:closer_id(id, nome_completo, tipo_closer),
          sdr:sdr_id(id, nome_completo, tipo_closer),
          interactions:lead_interactions(
            id, tipo_interacao, data_interacao, resultado, interesse_manifestado,
            qualificacao_budget, qualificacao_autoridade, qualificacao_necessidade,
            qualificacao_timeline, sentimento_lead, nivel_interesse,
            probabilidade_fechamento_percebida
          ),
          qualification:lead_qualification_details(
            qualification_score, authority_nivel, budget_confirmado,
            need_urgencia_score, timeline_meta_implementacao,
            situacao_atual, empresa_nome
          )
        `)
        .order('created_at', { ascending: false })

      // Apply date range filter
      const dateFilter = new Date()
      switch (dateRange) {
        case '7_days':
          dateFilter.setDate(dateFilter.getDate() - 7)
          break
        case '30_days':
          dateFilter.setDate(dateFilter.getDate() - 30)
          break
        case '90_days':
          dateFilter.setDate(dateFilter.getDate() - 90)
          break
      }
      
      query = query.gte('created_at', dateFilter.toISOString())

      if (selectedCloser !== 'all') {
        query = query.eq('closer_id', selectedCloser)
      }

      const { data, error } = await query

      if (error) throw error

      // Process leads data to add calculated fields
      const processedLeads: LeadDetailed[] = (data || []).map(lead => {
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
      })

      setLeads(processedLeads)
    } catch (error) {
      console.error('Error loading leads:', error)
      throw error
    }
  }

  const loadClosers = async () => {
    try {
      const { data, error } = await supabase
        .from('closers')
        .select(`
          id, nome_completo, tipo_closer,
          leads:leads(id, status, valor_potencial, created_at),
          interactions:lead_interactions(id, data_interacao)
        `)
        .eq('status_contrato', 'ativo')

      if (error) throw error

      const processedClosers: CloserStats[] = (data || []).map(closer => {
        const leads = closer.leads || []
        const interactions = closer.interactions || []
        
        const leadsAtivos = leads.filter((l: any) => 
          !['fechado_ganho', 'fechado_perdido', 'cancelado'].includes(l.status)
        ).length
        
        const conversoesMes = leads.filter((l: any) => {
          const createdThisMonth = new Date(l.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          return l.status === 'fechado_ganho' && createdThisMonth
        }).length
        
        const taxaConversao = leads.length > 0 ? 
          (leads.filter((l: any) => l.status === 'fechado_ganho').length / leads.length) * 100 : 0
        
        const valorPipeline = leads
          .filter((l: any) => !['fechado_ganho', 'fechado_perdido', 'cancelado'].includes(l.status))
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
      })

      setClosers(processedClosers)
    } catch (error) {
      console.error('Error loading closers:', error)
      throw error
    }
  }

  const loadStats = async () => {
    try {
      // This would typically come from a database view or aggregation
      // For now, calculate from loaded data
      const totalLeads = leads.length
      const leadsQualificados = leads.filter(l => l.score_bant && l.score_bant > 50).length
      const leadsConvertidos = leads.filter(l => l.status === 'fechado_ganho').length
      const taxaQualificacao = totalLeads > 0 ? (leadsQualificados / totalLeads) * 100 : 0
      const taxaConversao = totalLeads > 0 ? (leadsConvertidos / totalLeads) * 100 : 0
      const valorPipeline = leads.reduce((sum, l) => sum + (l.valor_potencial || 0), 0)
      const valorFechado = leads
        .filter(l => l.status === 'fechado_ganho')
        .reduce((sum, l) => sum + (l.valor_potencial || 0), 0)
      const ticketMedio = leadsConvertidos > 0 ? valorFechado / leadsConvertidos : 0
      const cicloVendasMedio = leads
        .filter(l => l.status === 'fechado_ganho')
        .reduce((sum, l) => sum + l.dias_no_pipeline, 0) / (leadsConvertidos || 1)

      setStats({
        totalLeads,
        leadsQualificados,
        leadsConvertidos,
        taxaQualificacao,
        taxaConversao,
        valorPipeline,
        valorFechado,
        ticketMedio,
        cicloVendasMedio
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleCreateInteraction = async () => {
    if (!selectedLead || !interactionForm.resumo) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    try {
      const { error } = await supabase
        .from('lead_interactions')
        .insert({
          ...interactionForm,
          lead_id: selectedLead.id,
          closer_id: selectedLead.closer_id,
          organization_id: selectedLead.organization_id
        })

      if (error) throw error

      toast.success('Interação registrada com sucesso!')
      setIsInteractionModalOpen(false)
      setInteractionForm({})
      loadDashboardData()
    } catch (error) {
      console.error('Error creating interaction:', error)
      toast.error('Erro ao registrar interação')
    }
  }

  const openDetailModal = (lead: LeadDetailed) => {
    setSelectedLead(lead)
    setIsDetailModalOpen(true)
  }

  const openInteractionModal = (lead: LeadDetailed) => {
    setSelectedLead(lead)
    setInteractionForm({
      tipo_interacao: 'ligacao',
      resultado: 'contato_realizado',
      resumo: '',
      nivel_interesse: 3,
      probabilidade_fechamento_percebida: lead.probabilidade_real
    })
    setIsInteractionModalOpen(true)
  }

  const getTemperaturaColor = (temperatura?: string) => {
    switch (temperatura) {
      case 'quente': return 'bg-red-500 text-white'
      case 'morno': return 'bg-yellow-500 text-white'
      case 'frio': return 'bg-blue-500 text-white'
      default: return 'bg-gray-400 text-white'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fechado_ganho': return 'bg-green-500 text-white'
      case 'fechado_perdido': return 'bg-red-500 text-white'
      case 'negociacao': return 'bg-purple-500 text-white'
      case 'proposta_enviada': return 'bg-orange-500 text-white'
      default: return 'bg-blue-500 text-white'
    }
  }

  const getProbabilityIcon = (probability: number) => {
    if (probability >= 80) return <ArrowUp className="h-4 w-4 text-green-600" />
    if (probability >= 50) return <Minus className="h-4 w-4 text-yellow-600" />
    return <ArrowDown className="h-4 w-4 text-red-600" />
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCloser = selectedCloser === 'all' || lead.closer_id === selectedCloser
    const matchesTemperatura = selectedTemperatura === 'all' || lead.temperatura === selectedTemperatura
    const matchesStatus = selectedStatus === 'all' || lead.status === selectedStatus

    return matchesSearch && matchesCloser && matchesTemperatura && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Avançada - Leads</h1>
          <p className="text-gray-600 mt-1">
            Dashboard completo de tracking e análise de leads com dados do closer/SDR
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Qualificados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.leadsQualificados}</p>
                <p className="text-xs text-purple-600">{stats.taxaQualificacao.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Convertidos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.leadsConvertidos}</p>
                <p className="text-xs text-green-600">{stats.taxaConversao.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pipeline</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {(stats.valorPipeline / 1000).toFixed(0)}k
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Award className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {(stats.ticketMedio / 1000).toFixed(0)}k
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Buscar por nome, email ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7_days">Últimos 7 dias</SelectItem>
                <SelectItem value="30_days">Últimos 30 dias</SelectItem>
                <SelectItem value="90_days">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCloser} onValueChange={setSelectedCloser}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Closer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Closers</SelectItem>
                {closers.map(closer => (
                  <SelectItem key={closer.id} value={closer.id}>
                    {closer.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTemperatura} onValueChange={setSelectedTemperatura}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Temperatura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="quente">Quente</SelectItem>
                <SelectItem value="morno">Morno</SelectItem>
                <SelectItem value="frio">Frio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="leads" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leads">Leads Detalhados</TabsTrigger>
          <TabsTrigger value="closers">Performance Closers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics Avançado</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-4">
          {/* Detailed Leads Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Leads Detalhados ({filteredLeads.length})
              </CardTitle>
              <CardDescription>
                Informações completas sobre qualificação, interações e performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Lead</th>
                      <th className="text-left p-2">Score/Temperatura</th>
                      <th className="text-left p-2">Closer/SDR</th>
                      <th className="text-left p-2">Atividade</th>
                      <th className="text-left p-2">Qualificação</th>
                      <th className="text-left p-2">Pipeline</th>
                      <th className="text-center p-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{lead.nome_completo}</p>
                            <p className="text-sm text-gray-500">{lead.email}</p>
                            {lead.empresa && (
                              <p className="text-xs text-gray-400 flex items-center">
                                <Building className="h-3 w-3 mr-1" />
                                {lead.empresa}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <Badge className={getTemperaturaColor(lead.temperatura)}>
                              {lead.temperatura || 'N/A'}
                            </Badge>
                            {lead.score_bant && (
                              <div className="flex items-center text-sm">
                                <Brain className="h-3 w-3 mr-1" />
                                Score: {lead.score_bant}/100
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1 text-sm">
                            {lead.closer && (
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1 text-blue-600" />
                                {lead.closer.nome_completo}
                              </div>
                            )}
                            {lead.sdr && (
                              <div className="flex items-center">
                                <Phone className="h-3 w-3 mr-1 text-green-600" />
                                {lead.sdr.nome_completo}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center">
                              <Activity className="h-3 w-3 mr-1" />
                              {lead.total_interacoes} interações
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {lead.dias_no_pipeline} dias
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
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
                            <div className="flex items-center text-sm">
                              <DollarSign className="h-3 w-3 mr-1 text-green-600" />
                              R$ {lead.valor_potencial.toLocaleString('pt-BR')}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDetailModal(lead)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openInteractionModal(lead)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredLeads.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Nenhum lead encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closers" className="space-y-4">
          {/* Closers Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Performance dos Closers</CardTitle>
              <CardDescription>
                Métricas detalhadas de performance individual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {closers.map((closer) => (
                  <Card key={closer.id} className="bg-gradient-to-br from-white to-gray-50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{closer.nome_completo}</CardTitle>
                        <Badge variant={closer.tipo_closer === 'closer_senior' ? 'default' : 'secondary'}>
                          {closer.tipo_closer}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-sm text-gray-600">Leads Ativos</p>
                          <p className="text-2xl font-bold text-blue-600">{closer.leads_ativos}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Conversões</p>
                          <p className="text-2xl font-bold text-green-600">{closer.conversoes_mes}</p>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm text-gray-600">Taxa de Conversão</p>
                          <p className="text-sm font-medium">{closer.taxa_conversao.toFixed(1)}%</p>
                        </div>
                        <Progress value={closer.taxa_conversao} className="h-2" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Atividade/dia</p>
                          <p className="font-medium">{closer.atividade_media_dia.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Pipeline</p>
                          <p className="font-medium">R$ {(closer.valor_pipeline / 1000).toFixed(0)}k</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="text-xs text-gray-500">
                        Última atividade: {closer.ultima_atividade !== 'N/A' ? 
                          new Date(closer.ultima_atividade).toLocaleDateString('pt-BR') : 'N/A'}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Advanced Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Funil de Conversão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['novo', 'contatado', 'qualificado', 'proposta_enviada', 'fechado_ganho'].map((stage, index) => {
                    const stageLeads = leads.filter(l => l.status === stage).length
                    const percentage = leads.length > 0 ? (stageLeads / leads.length) * 100 : 0
                    
                    return (
                      <div key={stage} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="capitalize">{stage.replace('_', ' ')}</span>
                          <span className="text-sm text-gray-600">
                            {stageLeads} leads ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-3" />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Fonte</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from(new Set(leads.map(l => l.origem || 'Não especificado')))
                    .map(fonte => {
                      const fonteLeads = leads.filter(l => (l.origem || 'Não especificado') === fonte)
                      const percentage = leads.length > 0 ? (fonteLeads.length / leads.length) * 100 : 0
                      const conversoes = fonteLeads.filter(l => l.status === 'fechado_ganho').length
                      const taxaConversao = fonteLeads.length > 0 ? (conversoes / fonteLeads.length) * 100 : 0
                      
                      return (
                        <div key={fonte} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">{fonte}</span>
                            <span className="text-sm text-gray-600">{fonteLeads.length} leads</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Taxa de conversão: {taxaConversao.toFixed(1)}%
                          </div>
                          <Progress value={percentage} className="h-2 mt-2" />
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Lead Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Lead - {selectedLead?.nome_completo}</DialogTitle>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-6">
              {/* Lead Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Email:</strong> {selectedLead.email}</div>
                    <div><strong>Telefone:</strong> {selectedLead.telefone}</div>
                    <div><strong>Empresa:</strong> {selectedLead.empresa}</div>
                    <div><strong>Cargo:</strong> {selectedLead.cargo}</div>
                    <div><strong>Origem:</strong> {selectedLead.origem}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Pipeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Status:</strong> 
                      <Badge className={getStatusColor(selectedLead.status) + " ml-2"}>
                        {selectedLead.status}
                      </Badge>
                    </div>
                    <div><strong>Temperatura:</strong>
                      <Badge className={getTemperaturaColor(selectedLead.temperatura) + " ml-2"}>
                        {selectedLead.temperatura}
                      </Badge>
                    </div>
                    <div><strong>Valor:</strong> R$ {selectedLead.valor_potencial?.toLocaleString('pt-BR')}</div>
                    <div><strong>Probabilidade:</strong> {selectedLead.probabilidade_real}%</div>
                    <div><strong>Dias no pipeline:</strong> {selectedLead.dias_no_pipeline}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Atividade</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Total interações:</strong> {selectedLead.total_interacoes}</div>
                    <div><strong>Score BANT:</strong> {selectedLead.score_bant}/100</div>
                    <div><strong>Closer:</strong> {selectedLead.closer?.nome_completo}</div>
                    <div><strong>SDR:</strong> {selectedLead.sdr?.nome_completo}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Interactions History */}
              {selectedLead.interactions && selectedLead.interactions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Interações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedLead.interactions.slice(0, 5).map((interaction: any, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium capitalize">
                                {interaction.tipo_interacao} - {interaction.resultado}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {interaction.resumo || 'Sem resumo'}
                              </p>
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(interaction.data_interacao).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          
                          {interaction.nivel_interesse && (
                            <div className="mt-2 flex items-center gap-4 text-sm">
                              <span>Interesse: {interaction.nivel_interesse}/5</span>
                              {interaction.probabilidade_fechamento_percebida && (
                                <span>Probabilidade: {interaction.probabilidade_fechamento_percebida}%</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Qualification Details */}
              {selectedLead.qualification && (
                <Card>
                  <CardHeader>
                    <CardTitle>Qualificação BANT</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Budget confirmado:</strong> {selectedLead.qualification.budget_confirmado ? 'Sim' : 'Não'}</p>
                      <p><strong>Autoridade:</strong> {selectedLead.qualification.authority_nivel}</p>
                    </div>
                    <div>
                      <p><strong>Score urgência:</strong> {selectedLead.qualification.need_urgencia_score}/10</p>
                      <p><strong>Meta implementação:</strong> {selectedLead.qualification.timeline_meta_implementacao}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Interaction Modal */}
      <Dialog open={isInteractionModalOpen} onOpenChange={setIsInteractionModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Interação - {selectedLead?.nome_completo}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Interação</Label>
                <Select 
                  value={interactionForm.tipo_interacao} 
                  onValueChange={(value: any) => setInteractionForm({...interactionForm, tipo_interacao: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ligacao">Ligação</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="reuniao">Reunião</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Resultado</Label>
                <Select 
                  value={interactionForm.resultado} 
                  onValueChange={(value: any) => setInteractionForm({...interactionForm, resultado: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contato_realizado">Contato Realizado</SelectItem>
                    <SelectItem value="sem_resposta">Sem Resposta</SelectItem>
                    <SelectItem value="agendamento_feito">Agendamento Feito</SelectItem>
                    <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Resumo da Interação *</Label>
              <Textarea
                value={interactionForm.resumo || ''}
                onChange={(e) => setInteractionForm({...interactionForm, resumo: e.target.value})}
                placeholder="Descreva o que aconteceu nesta interação..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nível de Interesse (1-5)</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={interactionForm.nivel_interesse || 3}
                  onChange={(e) => setInteractionForm({...interactionForm, nivel_interesse: parseInt(e.target.value)})}
                />
              </div>
              
              <div>
                <Label>Probabilidade de Fechamento (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={interactionForm.probabilidade_fechamento_percebida || 0}
                  onChange={(e) => setInteractionForm({...interactionForm, probabilidade_fechamento_percebida: parseInt(e.target.value)})}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsInteractionModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateInteraction}>
              Registrar Interação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}