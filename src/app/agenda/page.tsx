'use client'

import { useState, useEffect } from 'react'
import { KPICardVibrant } from '@/components/ui/kpi-card-vibrant'
import { MetricCard } from '@/components/ui/metric-card'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { ChartCard } from '@/components/ui/chart-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import {
  Calendar,
  Clock,
  Users,
  Settings,
  Plus,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Search,
  Filter,
  Download,
  Eye,
  Phone,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Link as LinkIcon,
  CalendarDays
} from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts'

interface AgendaConfig {
  id: string
  nome: string
  descricao: string
  duracao_minutos: number
  buffer_antes_minutos: number
  buffer_depois_minutos: number
  horario_inicio: string
  horario_fim: string
  dias_semana: number[]
  antecedencia_minima_horas: number
  antecedencia_maxima_dias: number
  cor_tema: string
  ativo: boolean
}

interface Agendamento {
  id: string
  agenda_id: string
  lead_id?: string
  mentorado_id?: string
  titulo: string
  data_agendada: string
  duracao_minutos: number
  nome_completo: string
  email: string
  telefone?: string
  whatsapp?: string
  objetivo_call?: string
  status: 'agendado' | 'confirmado' | 'reagendado' | 'cancelado' | 'concluido' | 'no_show'
  token_agendamento: string
  link_meet?: string
  origem: string
  created_at: string
  leads?: { nome_completo: string; email: string; empresa?: string }
  mentorados?: { nome: string; email: string }
  agenda_configuracoes?: { nome: string; cor_tema: string }
}

interface AgendaStats {
  total_agendamentos: number
  agendamentos_hoje: number
  agendamentos_semana: number
  taxa_comparecimento: number
  agendados: number
  confirmados: number
  concluidos: number
  cancelados: number
}

interface LinkPersonalizado {
  id: string
  agenda_id: string
  lead_id?: string
  mentorado_id?: string
  token_link: string
  slug_personalizado?: string
  titulo_customizado?: string
  descricao_customizada?: string
  total_visualizacoes: number
  total_agendamentos: number
  ativo: boolean
  created_at: string
  leads?: { nome_completo: string }
  mentorados?: { nome: string }
}

const diasSemanaNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const statusColors = {
  agendado: 'bg-blue-100 text-blue-700',
  confirmado: 'bg-green-100 text-green-700',
  reagendado: 'bg-yellow-100 text-yellow-700',
  cancelado: 'bg-red-100 text-red-700',
  concluido: 'bg-emerald-100 text-emerald-700',
  no_show: 'bg-gray-100 text-gray-700'
}

export default function AgendaPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [agendaConfig, setAgendaConfig] = useState<AgendaConfig | null>(null)
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [linksPersonalizados, setLinksPersonalizados] = useState<LinkPersonalizado[]>([])
  const [stats, setStats] = useState<AgendaStats>({
    total_agendamentos: 0,
    agendamentos_hoje: 0,
    agendamentos_semana: 0,
    taxa_comparecimento: 0,
    agendados: 0,
    confirmados: 0,
    concluidos: 0,
    cancelados: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [chartData, setChartData] = useState<any[]>([])

  // Estados para modais e formulários
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<AgendaConfig | null>(null)
  const [editingLink, setEditingLink] = useState<LinkPersonalizado | null>(null)

  useEffect(() => {
    loadAgendaData()
  }, [])

  useEffect(() => {
    loadAgendamentos()
  }, [statusFilter])

  const loadAgendaData = async () => {
    try {
      await Promise.all([
        loadAgendaConfig(),
        loadAgendamentos(),
        loadLinksPersonalizados(),
        loadStats(),
        loadChartData()
      ])
    } catch (error) {
      console.error('Erro ao carregar dados da agenda:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAgendaConfig = async () => {
    const { data, error } = await supabase
      .from('agenda_configuracoes')
      .select('*')
      .eq('ativo', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao carregar configuração:', error)
      return
    }

    setAgendaConfig(data)
  }

  const loadAgendamentos = async () => {
    let query = supabase
      .from('agendamentos')
      .select(`
        *,
        leads:lead_id(nome_completo, email, empresa),
        mentorados:mentorado_id(nome, email),
        agenda_configuracoes:agenda_id(nome, cor_tema)
      `)
      .order('data_agendada', { ascending: false })

    if (statusFilter !== 'todos') {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao carregar agendamentos:', error)
      return
    }

    setAgendamentos(data || [])
  }

  const loadLinksPersonalizados = async () => {
    const { data, error } = await supabase
      .from('agenda_links_personalizados')
      .select(`
        *,
        leads:lead_id(nome_completo),
        mentorados:mentorado_id(nome)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao carregar links:', error)
      return
    }

    setLinksPersonalizados(data || [])
  }

  const loadStats = async () => {
    const { data: agendamentosData } = await supabase
      .from('agendamentos')
      .select('status, data_agendada, created_at')

    if (!agendamentosData) return

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const amanha = new Date(hoje)
    amanha.setDate(amanha.getDate() + 1)

    const semanaQueVem = new Date(hoje)
    semanaQueVem.setDate(semanaQueVem.getDate() + 7)

    const agendamentosHoje = agendamentosData.filter(a => {
      const dataAgendada = new Date(a.data_agendada)
      return dataAgendada >= hoje && dataAgendada < amanha
    }).length

    const agendamentosSemana = agendamentosData.filter(a => {
      const dataAgendada = new Date(a.data_agendada)
      return dataAgendada >= hoje && dataAgendada < semanaQueVem
    }).length

    const statusCounts = agendamentosData.reduce((acc, agendamento) => {
      acc[agendamento.status] = (acc[agendamento.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const totalConcluidos = statusCounts.concluido || 0
    const totalNoShow = statusCounts.no_show || 0
    const taxaComparecimento = totalConcluidos + totalNoShow > 0
      ? (totalConcluidos / (totalConcluidos + totalNoShow)) * 100
      : 0

    setStats({
      total_agendamentos: agendamentosData.length,
      agendamentos_hoje: agendamentosHoje,
      agendamentos_semana: agendamentosSemana,
      taxa_comparecimento: taxaComparecimento,
      agendados: statusCounts.agendado || 0,
      confirmados: statusCounts.confirmado || 0,
      concluidos: statusCounts.concluido || 0,
      cancelados: statusCounts.cancelado || 0
    })
  }

  const loadChartData = async () => {
    const { data } = await supabase
      .from('view_agenda_estatisticas')
      .select('*')
      .order('data', { ascending: true })
      .limit(30)

    if (data) {
      const chartData = data.map(item => ({
        data: new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        agendamentos: item.total_agendamentos,
        concluidos: item.concluidos,
        cancelados: item.cancelados
      }))
      setChartData(chartData)
    }
  }

  const saveAgendaConfig = async (configData: Partial<AgendaConfig>) => {
    try {
      if (agendaConfig?.id) {
        const { error } = await supabase
          .from('agenda_configuracoes')
          .update(configData)
          .eq('id', agendaConfig.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('agenda_configuracoes')
          .insert(configData)

        if (error) throw error
      }

      await loadAgendaConfig()
      setIsConfigModalOpen(false)
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      alert('Erro ao salvar configuração')
    }
  }

  const gerarLinkPersonalizado = async (tipo: 'lead' | 'mentorado', targetId: string) => {
    try {
      if (!agendaConfig?.id) {
        alert('Configure a agenda primeiro')
        return
      }

      const linkData = {
        agenda_id: agendaConfig.id,
        [tipo === 'lead' ? 'lead_id' : 'mentorado_id']: targetId
      }

      const { data, error } = await supabase
        .from('agenda_links_personalizados')
        .insert(linkData)
        .select()
        .single()

      if (error) throw error

      await loadLinksPersonalizados()
      alert(`Link gerado: /agenda/agendar/${data.token_link}`)
    } catch (error) {
      console.error('Erro ao gerar link:', error)
      alert('Erro ao gerar link personalizado')
    }
  }

  const copiarLink = (token: string) => {
    const link = `${window.location.origin}/agenda/agendar/${token}`
    navigator.clipboard.writeText(link)
    alert('Link copiado para a área de transferência!')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5) // Remove os segundos
  }

  const filteredAgendamentos = agendamentos.filter(agendamento =>
    searchTerm === '' ||
    agendamento.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agendamento.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agendamento.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#059669]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Agenda</h1>
          <p className="text-gray-600 mt-1">Sistema de agendamento tipo Calendly</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsConfigModalOpen(true)}
            variant="outline"
            className="border-[#059669] text-[#059669] hover:bg-[#059669] hover:text-white"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurar Agenda
          </Button>
          <Button className="bg-[#059669] hover:bg-[#047857] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
          <TabsTrigger value="links">Links Personalizados</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICardVibrant
              title="Total de Agendamentos"
              value={stats.total_agendamentos.toString()}
              subtitle="Este mês"
              percentage={15}
              trend="up"
              color="blue"
              icon={Calendar}
              sparklineData={chartData.map(d => ({ value: d.agendamentos }))}
            />
            <MetricCard
              title="Hoje"
              value={stats.agendamentos_hoje.toString()}
              change={5}
              changeType="increase"
              icon={Clock}
              iconColor="orange"
            />
            <MetricCard
              title="Esta Semana"
              value={stats.agendamentos_semana.toString()}
              change={12}
              changeType="increase"
              icon={CalendarDays}
              iconColor="green"
            />
            <MetricCard
              title="Taxa de Comparecimento"
              value={`${stats.taxa_comparecimento.toFixed(1)}%`}
              change={-3}
              changeType="decrease"
              icon={Users}
              iconColor="purple"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartCard title="Agendamentos por Dia" subtitle="Últimos 30 dias">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorAgendamentos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="data" stroke="#94A3B8" fontSize={12} />
                      <YAxis stroke="#94A3B8" fontSize={12} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="agendamentos"
                        stroke="#059669"
                        fillOpacity={1}
                        fill="url(#colorAgendamentos)"
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Status dos Agendamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm">Agendados</span>
                    </div>
                    <span className="font-semibold">{stats.agendados}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm">Confirmados</span>
                    </div>
                    <span className="font-semibold">{stats.confirmados}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-sm">Concluídos</span>
                    </div>
                    <span className="font-semibold">{stats.concluidos}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm">Cancelados</span>
                    </div>
                    <span className="font-semibold">{stats.cancelados}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agendamentos Tab */}
        <TabsContent value="agendamentos" className="space-y-6">
          {/* Filtros */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar agendamentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#059669] focus:border-[#059669] w-80"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#059669] focus:border-[#059669]"
              >
                <option value="todos">Todos os Status</option>
                <option value="agendado">Agendado</option>
                <option value="confirmado">Confirmado</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
                <option value="no_show">No-show</option>
              </select>
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>

          {/* Tabela de Agendamentos */}
          <DataTable
            title="Agendamentos"
            columns={[
              {
                header: 'Data/Horário',
                render: (agendamento) => (
                  <div>
                    <p className="font-medium">{formatDate(agendamento.data_agendada)}</p>
                    <p className="text-sm text-gray-500">{agendamento.duracao_minutos} min</p>
                  </div>
                )
              },
              {
                header: 'Cliente',
                render: (agendamento) => (
                  <div>
                    <p className="font-medium">{agendamento.nome_completo}</p>
                    <p className="text-sm text-gray-500">{agendamento.email}</p>
                    {agendamento.telefone && (
                      <p className="text-sm text-gray-500">{agendamento.telefone}</p>
                    )}
                  </div>
                )
              },
              {
                header: 'Título/Objetivo',
                render: (agendamento) => (
                  <div>
                    <p className="font-medium">{agendamento.titulo}</p>
                    {agendamento.objetivo_call && (
                      <p className="text-sm text-gray-500">{agendamento.objetivo_call}</p>
                    )}
                  </div>
                )
              },
              {
                header: 'Origem',
                render: (agendamento) => (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {agendamento.origem}
                  </span>
                )
              },
              {
                header: 'Status',
                render: (agendamento) => (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[agendamento.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700'}`}>
                    {agendamento.status.charAt(0).toUpperCase() + agendamento.status.slice(1)}
                  </span>
                )
              },
              {
                header: 'Ações',
                render: (agendamento) => (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                    {agendamento.link_meet && (
                      <Button size="sm" variant="outline">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )
              }
            ]}
            data={filteredAgendamentos}
          />
        </TabsContent>

        {/* Links Personalizados Tab */}
        <TabsContent value="links" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Links Personalizados</h3>
              <p className="text-gray-600">Gere links únicos para cada lead ou mentorado</p>
            </div>
            <Button
              onClick={() => setIsLinkModalOpen(true)}
              className="bg-[#059669] hover:bg-[#047857] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Link
            </Button>
          </div>

          <DataTable
            title="Links Gerados"
            columns={[
              {
                header: 'Para quem',
                render: (link) => (
                  <div>
                    <p className="font-medium">
                      {link.leads?.nome_completo || link.mentorados?.nome || 'Link Público'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {link.lead_id ? 'Lead' : link.mentorado_id ? 'Mentorado' : 'Público'}
                    </p>
                  </div>
                )
              },
              {
                header: 'Token/Slug',
                render: (link) => (
                  <div className="font-mono text-sm">
                    {link.slug_personalizado || link.token_link}
                  </div>
                )
              },
              {
                header: 'Estatísticas',
                render: (link) => (
                  <div className="text-sm">
                    <p>{link.total_visualizacoes} visualizações</p>
                    <p>{link.total_agendamentos} agendamentos</p>
                  </div>
                )
              },
              {
                header: 'Status',
                render: (link) => (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    link.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {link.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                )
              },
              {
                header: 'Ações',
                render: (link) => (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copiarLink(link.token_link)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                )
              }
            ]}
            data={linksPersonalizados}
          />
        </TabsContent>

        {/* Configurações Tab */}
        <TabsContent value="configuracoes" className="space-y-6">
          {agendaConfig && (
            <Card>
              <CardHeader>
                <CardTitle>Configurações da Agenda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Nome da Agenda</Label>
                    <p className="text-lg font-medium">{agendaConfig.nome}</p>
                  </div>
                  <div>
                    <Label>Duração Padrão</Label>
                    <p className="text-lg font-medium">{agendaConfig.duracao_minutos} minutos</p>
                  </div>
                  <div>
                    <Label>Horário de Funcionamento</Label>
                    <p className="text-lg font-medium">
                      {formatTime(agendaConfig.horario_inicio)} às {formatTime(agendaConfig.horario_fim)}
                    </p>
                  </div>
                  <div>
                    <Label>Dias Disponíveis</Label>
                    <p className="text-lg font-medium">
                      {agendaConfig.dias_semana.map(dia => diasSemanaNames[dia]).join(', ')}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setEditingConfig(agendaConfig)
                    setIsConfigModalOpen(true)
                  }}
                  className="bg-[#059669] hover:bg-[#047857] text-white"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Configurações
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Configuração da Agenda */}
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => {
          setIsConfigModalOpen(false)
          setEditingConfig(null)
        }}
        config={editingConfig || agendaConfig}
        onSave={saveAgendaConfig}
      />
    </div>
  )
}

// Componente Modal de Configuração
function ConfigModal({ isOpen, onClose, config, onSave }: {
  isOpen: boolean
  onClose: () => void
  config: AgendaConfig | null
  onSave: (config: Partial<AgendaConfig>) => void
}) {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    duracao_minutos: 60,
    buffer_antes_minutos: 15,
    buffer_depois_minutos: 15,
    horario_inicio: '08:00',
    horario_fim: '18:00',
    dias_semana: [1, 2, 3, 4, 5],
    antecedencia_minima_horas: 24,
    antecedencia_maxima_dias: 60,
    cor_tema: '#059669'
  })

  useEffect(() => {
    if (config) {
      setFormData({
        nome: config.nome || '',
        descricao: config.descricao || '',
        duracao_minutos: config.duracao_minutos || 60,
        buffer_antes_minutos: config.buffer_antes_minutos || 15,
        buffer_depois_minutos: config.buffer_depois_minutos || 15,
        horario_inicio: config.horario_inicio?.slice(0, 5) || '08:00',
        horario_fim: config.horario_fim?.slice(0, 5) || '18:00',
        dias_semana: config.dias_semana || [1, 2, 3, 4, 5],
        antecedencia_minima_horas: config.antecedencia_minima_horas || 24,
        antecedencia_maxima_dias: config.antecedencia_maxima_dias || 60,
        cor_tema: config.cor_tema || '#059669'
      })
    }
  }, [config])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      horario_inicio: formData.horario_inicio + ':00',
      horario_fim: formData.horario_fim + ':00'
    })
  }

  const toggleDiaSemana = (dia: number) => {
    setFormData(prev => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(dia)
        ? prev.dias_semana.filter(d => d !== dia)
        : [...prev.dias_semana, dia].sort()
    }))
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar Agenda</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nome">Nome da Agenda</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="duracao">Duração (minutos)</Label>
              <Input
                id="duracao"
                type="number"
                value={formData.duracao_minutos}
                onChange={(e) => setFormData(prev => ({ ...prev, duracao_minutos: parseInt(e.target.value) }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="inicio">Horário Início</Label>
              <Input
                id="inicio"
                type="time"
                value={formData.horario_inicio}
                onChange={(e) => setFormData(prev => ({ ...prev, horario_inicio: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="fim">Horário Fim</Label>
              <Input
                id="fim"
                type="time"
                value={formData.horario_fim}
                onChange={(e) => setFormData(prev => ({ ...prev, horario_fim: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descrição da agenda..."
            />
          </div>

          <div>
            <Label>Dias Disponíveis</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {diasSemanaNames.map((dia, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDiaSemana(index)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    formData.dias_semana.includes(index)
                      ? 'bg-[#059669] text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {dia}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#059669] hover:bg-[#047857] text-white">
              Salvar Configurações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}