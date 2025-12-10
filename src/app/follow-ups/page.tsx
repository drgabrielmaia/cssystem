'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { KPICardVibrant } from '@/components/ui/kpi-card-vibrant'
import { MetricCard } from '@/components/ui/metric-card'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { ChartCard } from '@/components/ui/chart-card'
import { supabase } from '@/lib/supabase'
import {
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download
} from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts'

// Importando componentes de modal
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FollowUp {
  id: string
  lead_id: string
  titulo: string
  descricao: string
  data_agendada: string
  tipo: string
  prioridade: string
  status: string
  created_at: string
  updated_at: string
  leads?: {
    nome_completo: string
    email: string
    telefone: string
    empresa: string
  }
}

interface FollowUpStats {
  total_followups: number
  pendentes: number
  concluidos: number
  hoje: number
  atrasados: number
  taxa_conclusao: number
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [stats, setStats] = useState<FollowUpStats>({
    total_followups: 0,
    pendentes: 0,
    concluidos: 0,
    hoje: 0,
    atrasados: 0,
    taxa_conclusao: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [prioridadeFilter, setPrioridadeFilter] = useState('todas')
  const [dateFilter, setDateFilter] = useState('mes_atual')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Estados para modais
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null)
  const [leads, setLeads] = useState<Array<{id: string, nome_completo: string, email: string}>>([])
  const [newFormErrors, setNewFormErrors] = useState<{[key: string]: string}>({})

  // Estados para formulário de edição
  const [editForm, setEditForm] = useState({
    titulo: '',
    descricao: '',
    data_agendada: '',
    tipo: '',
    prioridade: '',
    status: ''
  })

  // Estados para formulário de criação
  const [newForm, setNewForm] = useState({
    lead_id: '',
    titulo: '',
    descricao: '',
    data_agendada: '',
    tipo: '',
    prioridade: '',
    status: 'pendente'
  })

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
        const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay()
        const startOfCurrentWeek = new Date(now)
        startOfCurrentWeek.setDate(now.getDate() - (currentDayOfWeek - 1))
        startOfCurrentWeek.setHours(0, 0, 0, 0)
        const endOfCurrentWeek = new Date(startOfCurrentWeek)
        endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6)
        endOfCurrentWeek.setHours(23, 59, 59, 999)
        return {
          start: startOfCurrentWeek.toISOString(),
          end: endOfCurrentWeek.toISOString()
        }
      case 'semana_passada':
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

  const statusMap = {
    pendente: 'pending',
    concluido: 'completed',
    cancelado: 'cancelled'
  }

  const prioridadeColors = {
    baixa: '#10B981',
    media: '#F59E0B',
    alta: '#EF4444'
  }

  const [weeklyData, setWeeklyData] = useState<Array<{week: string, criados: number, concluidos: number}>>([])
  const [tipoDistribution, setTipoDistribution] = useState<Array<{name: string, value: number, color: string}>>([])

  useEffect(() => {
    loadFollowUps()
    loadStats()
    loadLeads()
    loadChartData()
  }, [])

  useEffect(() => {
    if (!loading) {
      setIsLoadingData(true)
      loadFollowUps()
    }
  }, [statusFilter, tipoFilter, prioridadeFilter, dateFilter, customStartDate, customEndDate])

  const loadFollowUps = async () => {
    try {
      // Primeiro tentar buscar da tabela lead_followups
      let query = supabase
        .from('lead_followups')
        .select(`
          id, lead_id, titulo, descricao, data_agendada, tipo, prioridade, status,
          created_at, updated_at,
          leads:lead_id (
            nome_completo, email, telefone, empresa
          )
        `)

      // Aplicar filtro de data
      const dateRange = getDateRange(dateFilter)
      if (dateRange) {
        query = query
          .gte('data_agendada', dateRange.start)
          .lte('data_agendada', dateRange.end)
      }

      let { data: followUps, error } = await query.order('data_agendada', { ascending: true }) as { data: FollowUp[] | null, error: any }

      // Se não houver dados na tabela lead_followups, buscar da tabela leads (fallback)
      if (!followUps || followUps.length === 0) {
        let leadsQuery = supabase
          .from('leads')
          .select('id, nome_completo, email, telefone, empresa, status, next_followup_date, observacoes, created_at')
          .not('next_followup_date', 'is', null)

        if (dateRange) {
          leadsQuery = leadsQuery
            .gte('next_followup_date', dateRange.start)
            .lte('next_followup_date', dateRange.end)
        }

        const { data: leadsWithFollowups, error: leadsError } = await leadsQuery.order('next_followup_date', { ascending: true })

        if (leadsError) throw leadsError

        // Converter leads em follow-ups
        followUps = (leadsWithFollowups || []).map(lead => ({
          id: lead.id,
          lead_id: lead.id,
          titulo: `Follow-up com ${lead.nome_completo}`,
          descricao: lead.observacoes || 'Acompanhamento de lead',
          data_agendada: lead.next_followup_date,
          tipo: lead.telefone ? 'call' : 'email',
          prioridade: lead.status === 'qualificado' ? 'alta' : lead.status === 'contactado' ? 'media' : 'baixa',
          status: 'pendente',
          created_at: lead.created_at,
          updated_at: lead.created_at,
          leads: {
            nome_completo: lead.nome_completo,
            email: lead.email,
            telefone: lead.telefone,
            empresa: lead.empresa
          }
        }))
      }

      // Aplicar filtros
      let filteredData = followUps

      if (statusFilter !== 'todos') {
        filteredData = filteredData.filter(f => f.status === statusFilter)
      }

      if (tipoFilter !== 'todos') {
        filteredData = filteredData.filter(f => f.tipo === tipoFilter)
      }

      if (prioridadeFilter !== 'todas') {
        filteredData = filteredData.filter(f => f.prioridade === prioridadeFilter)
      }

      setFollowUps(filteredData)
    } catch (error) {
      console.error('Erro ao carregar follow-ups:', error)
    } finally {
      setLoading(false)
      setIsLoadingData(false)
    }
  }

  const loadStats = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Primeiro tentar buscar da tabela lead_followups
      let { data: followupsData, error } = await supabase
        .from('lead_followups')
        .select('id, data_agendada, status')

      // Se não tiver dados na tabela lead_followups, usar dados da tabela leads
      if (!followupsData || followupsData.length === 0) {
        const { data: leadsWithFollowups, error: leadsError } = await supabase
          .from('leads')
          .select('id, next_followup_date, status, created_at')
          .not('next_followup_date', 'is', null)

        if (leadsError) throw leadsError

        followupsData = (leadsWithFollowups || []).map(lead => ({
          id: lead.id,
          data_agendada: lead.next_followup_date,
          status: new Date(lead.next_followup_date) < today ? 'atrasado' : 'pendente'
        }))
      }

      if (error && !followupsData) throw error

      const allFollowUps = followupsData || []

      // Calcular estatísticas baseadas nos dados reais
      const total_followups = allFollowUps.length
      const pendentes = allFollowUps.filter(f => f.status === 'pendente' || new Date(f.data_agendada) >= today).length
      const concluidos = allFollowUps.filter(f => f.status === 'concluido').length

      const hoje = allFollowUps.filter(f => {
        const followupDate = new Date(f.data_agendada)
        followupDate.setHours(0, 0, 0, 0)
        return followupDate.getTime() === today.getTime()
      }).length

      const atrasados = allFollowUps.filter(f => {
        const followupDate = new Date(f.data_agendada)
        return followupDate < today && f.status !== 'concluido'
      }).length

      const taxa_conclusao = total_followups > 0 ? (concluidos / total_followups) * 100 : 0

      setStats({
        total_followups,
        pendentes,
        concluidos,
        hoje,
        atrasados,
        taxa_conclusao
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome_completo, email')
        .order('nome_completo')

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
    }
  }

  const validateNewForm = () => {
    const errors: {[key: string]: string} = {}

    if (!newForm.lead_id) {
      errors.lead_id = 'Lead é obrigatório'
    }

    if (!newForm.titulo.trim()) {
      errors.titulo = 'Título é obrigatório'
    }

    if (!newForm.data_agendada) {
      errors.data_agendada = 'Data é obrigatória'
    }

    setNewFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateFollowUp = async () => {
    if (!validateNewForm()) {
      return
    }

    try {
      setIsLoadingData(true)
      const { error } = await supabase
        .from('lead_followups')
        .insert({
          lead_id: newForm.lead_id,
          titulo: newForm.titulo,
          descricao: newForm.descricao,
          data_agendada: newForm.data_agendada,
          tipo: newForm.tipo,
          prioridade: newForm.prioridade,
          status: newForm.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setShowNewModal(false)
      setNewForm({
        lead_id: '',
        titulo: '',
        descricao: '',
        data_agendada: '',
        tipo: '',
        prioridade: '',
        status: 'pendente'
      })

      await loadFollowUps()
      await loadStats()
    } catch (error) {
      console.error('Erro ao criar follow-up:', error)
      alert('Erro ao criar follow-up')
      setIsLoadingData(false)
    }
  }

  const loadChartData = async () => {
    try {
      // Carregar dados dos últimos 4 semanas
      const { data: followupsData, error } = await supabase
        .from('lead_followups')
        .select('created_at, data_agendada, status, tipo')
        .gte('created_at', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString())

      if (error) throw error

      const followups = followupsData || []

      // Calcular dados semanais
      const weeks = []
      for (let i = 3; i >= 0; i--) {
        const startOfWeek = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
        const endOfWeek = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000)

        const weekFollowups = followups.filter(f => {
          const createdDate = new Date(f.created_at)
          return createdDate >= startOfWeek && createdDate < endOfWeek
        })

        const concluidos = weekFollowups.filter(f => f.status === 'concluido').length

        weeks.push({
          week: `Sem ${4 - i}`,
          criados: weekFollowups.length,
          concluidos: concluidos
        })
      }

      setWeeklyData(weeks)

      // Calcular distribuição por tipo
      const tipoCount = followups.reduce((acc, f) => {
        const tipo = f.tipo || 'outros'
        acc[tipo] = (acc[tipo] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const tipoColors = {
        ligacao: '#059669',
        email: '#3B82F6',
        whatsapp: '#10B981',
        reuniao: '#F59E0B',
        call: '#059669',
        outros: '#94A3B8'
      }

      const tipoArray = Object.entries(tipoCount).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: (tipoColors as any)[name] || '#94A3B8'
      })).sort((a, b) => b.value - a.value)

      setTipoDistribution(tipoArray)

    } catch (error) {
      console.error('Erro ao carregar dados dos gráficos:', error)
    }
  }

  const filteredFollowUps = followUps.filter(followUp => {
    return searchTerm === '' ||
      followUp.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      followUp.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      followUp.leads?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      followUp.leads?.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const isOverdue = (dateString: string, status: string) => {
    const today = new Date()
    const scheduledDate = new Date(dateString)
    return scheduledDate < today && status === 'pendente'
  }

  const handleNewFollowUp = () => {
    setNewForm({
      lead_id: '',
      titulo: '',
      descricao: '',
      data_agendada: '',
      tipo: '',
      prioridade: '',
      status: 'pendente'
    })
    setNewFormErrors({})
    setShowNewModal(true)
  }

  const handleViewFollowUp = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp)
    setShowViewModal(true)
  }

  const handleEditFollowUp = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp)
    setEditForm({
      titulo: followUp.titulo,
      descricao: followUp.descricao,
      data_agendada: followUp.data_agendada.split('T')[0], // Apenas a data
      tipo: followUp.tipo,
      prioridade: followUp.prioridade,
      status: followUp.status
    })
    setShowEditModal(true)
  }

  const handleUpdateFollowUp = async () => {
    if (!selectedFollowUp) return

    try {
      setIsLoadingData(true)
      const { error } = await supabase
        .from('lead_followups')
        .update({
          titulo: editForm.titulo,
          descricao: editForm.descricao,
          data_agendada: editForm.data_agendada,
          tipo: editForm.tipo,
          prioridade: editForm.prioridade,
          status: editForm.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedFollowUp.id)

      if (error) throw error

      setShowEditModal(false)
      setSelectedFollowUp(null)
      await loadFollowUps()
      await loadStats()
    } catch (error) {
      console.error('Erro ao atualizar follow-up:', error)
      alert('Erro ao atualizar follow-up')
      setIsLoadingData(false)
    }
  }

  const handleDeleteFollowUp = async (followUpId: string) => {
    if (confirm('Tem certeza que deseja excluir este follow-up?')) {
      try {
        setIsLoadingData(true)
        const { error } = await supabase
          .from('lead_followups')
          .delete()
          .eq('id', followUpId)

        if (error) throw error

        await loadFollowUps()
        await loadStats()
      } catch (error) {
        console.error('Erro ao excluir follow-up:', error)
        setIsLoadingData(false)
      }
    }
  }

  const handleMarkAsCompleted = async (followUpId: string) => {
    try {
      setIsLoadingData(true)
      const { error } = await supabase
        .from('lead_followups')
        .update({ status: 'concluido' })
        .eq('id', followUpId)

      if (error) throw error

      await loadFollowUps()
      await loadStats()
    } catch (error) {
      console.error('Erro ao marcar como concluído:', error)
      setIsLoadingData(false)
    }
  }

  if (loading) {
    return (
      <PageLayout title="Follow-ups" subtitle="Carregando...">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#059669]"></div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Follow-ups" subtitle="Gestão de acompanhamentos e tarefas">
      {/* KPI Cards - Grid responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICardVibrant
          title="Total Follow-ups"
          value={stats.total_followups.toString()}
          subtitle="Este mês"
          percentage={12}
          trend="up"
          color="blue"
          icon={Calendar}
          sparklineData={[
            { value: 10 }, { value: 15 }, { value: 18 }, { value: 22 },
            { value: 25 }, { value: 28 }, { value: 32 }, { value: stats.total_followups }
          ]}
        />
        <MetricCard
          title="Pendentes"
          value={stats.pendentes.toString()}
          change={-5}
          changeType="decrease"
          icon={Clock}
          iconColor="orange"
        />
        <MetricCard
          title="Concluídos"
          value={stats.concluidos.toString()}
          change={8}
          changeType="increase"
          icon={CheckCircle}
          iconColor="green"
        />
        <MetricCard
          title="Taxa de Conclusão"
          value={`${stats.taxa_conclusao.toFixed(1)}%`}
          change={3.2}
          changeType="increase"
          icon={TrendingUp}
          iconColor="purple"
        />
      </div>

      {/* Alertas para follow-ups importantes */}
      {stats.atrasados > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <div>
              <p className="font-semibold text-orange-800">Atenção!</p>
              <p className="text-sm text-orange-700">
                Você tem {stats.atrasados} follow-up{stats.atrasados > 1 ? 's' : ''} atrasado{stats.atrasados > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.hoje > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-semibold text-blue-800">Agenda de Hoje</p>
              <p className="text-sm text-blue-700">
                Você tem {stats.hoje} follow-up{stats.hoje > 1 ? 's' : ''} agendado{stats.hoje > 1 ? 's' : ''} para hoje
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos - Grid responsivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfico de Evolução Semanal */}
        <ChartCard title="Evolução Semanal" subtitle="Follow-ups criados vs concluídos">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="week" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.08)'
                  }}
                />
                <Bar dataKey="criados" fill="#059669" radius={[2, 2, 0, 0]} />
                <Bar dataKey="concluidos" fill="#10B981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Gráfico de Distribuição por Tipo */}
        <ChartCard title="Distribuição por Tipo" subtitle="Tipos de follow-up">
          <div className="h-80 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="70%">
              <BarChart data={tipoDistribution} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" stroke="#94A3B8" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.08)'
                  }}
                />
                <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                  {tipoDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Ações e Filtros - Responsivo */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-0 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94A3B8] w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar follow-ups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all w-full sm:w-80"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
          >
            <option value="todos">Todos os Status</option>
            <option value="pendente">Pendente</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
          >
            <option value="todos">Todos os Tipos</option>
            <option value="ligacao">Ligação</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="reuniao">Reunião</option>
          </select>

          <select
            value={prioridadeFilter}
            onChange={(e) => setPrioridadeFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
          >
            <option value="todas">Todas Prioridades</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
          >
            <option value="todos">Todas as Datas</option>
            <option value="mes_atual">Mês Atual</option>
            <option value="semana_atual">Semana Atual</option>
            <option value="semana_passada">Última Semana</option>
            <option value="mes_passado">Mês Passado</option>
            <option value="personalizado">Personalizado</option>
          </select>

          {dateFilter === 'personalizado' && (
            <>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
                placeholder="Data inicial"
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
                placeholder="Data final"
              />
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={loadFollowUps}
            className="flex items-center gap-2 px-4 py-2 text-[#475569] hover:bg-[#F1F5F9] rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-[#475569] hover:bg-[#F1F5F9] rounded-xl transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={handleNewFollowUp}
            className="flex items-center gap-2 px-6 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Follow-up
          </button>
        </div>
      </div>

      {/* Loading indicator para filtros */}
      {isLoadingData && (
        <div className="flex items-center justify-center py-4 mb-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-sm border border-[#E2E8F0]">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#059669]"></div>
            <span className="text-sm text-[#475569]">Atualizando filtros...</span>
          </div>
        </div>
      )}

      {/* Tabela de Follow-ups */}
      <DataTable
        title="Lista de Follow-ups"
        columns={[
          {
            header: 'Título',
            render: (followUp) => (
              <div>
                <p className="font-semibold text-[#0F172A]">{followUp.titulo}</p>
                <p className="text-sm text-[#94A3B8] truncate max-w-xs">
                  {followUp.descricao || 'Sem descrição'}
                </p>
              </div>
            )
          },
          {
            header: 'Lead',
            render: (followUp) => (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center text-white font-semibold text-xs">
                  {followUp.leads?.nome_completo?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'ND'}
                </div>
                <div>
                  <p className="font-medium text-[#0F172A]">{followUp.leads?.nome_completo || 'Lead não encontrado'}</p>
                  <p className="text-sm text-[#94A3B8]">{followUp.leads?.empresa || '-'}</p>
                </div>
              </div>
            )
          },
          {
            header: 'Tipo',
            render: (followUp) => (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569]">
                {followUp.tipo?.charAt(0).toUpperCase() + followUp.tipo?.slice(1) || 'N/A'}
              </span>
            )
          },
          {
            header: 'Prioridade',
            render: (followUp) => (
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: (prioridadeColors as any)[followUp.prioridade] || '#94A3B8' }}
              >
                {followUp.prioridade?.charAt(0).toUpperCase() + followUp.prioridade?.slice(1) || 'N/A'}
              </span>
            )
          },
          {
            header: 'Data Agendada',
            render: (followUp) => (
              <div className={`${isOverdue(followUp.data_agendada, followUp.status) ? 'text-red-600' : 'text-[#475569]'}`}>
                <p className="text-sm font-medium">{formatDate(followUp.data_agendada)}</p>
                <p className="text-xs">{new Date(followUp.data_agendada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            )
          },
          {
            header: 'Status',
            render: (followUp) => <StatusBadge status={(statusMap as any)[followUp.status] || 'pending'} />
          },
          {
            header: 'Ações',
            render: (followUp) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewFollowUp(followUp)}
                  className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors group"
                  title="Ver detalhes"
                >
                  <Eye className="w-4 h-4 text-[#94A3B8] group-hover:text-[#475569]" />
                </button>
                <button
                  onClick={() => handleEditFollowUp(followUp)}
                  className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors group"
                  title="Editar"
                >
                  <Edit className="w-4 h-4 text-[#94A3B8] group-hover:text-[#059669]" />
                </button>
                {followUp.status === 'pendente' && (
                  <button
                    onClick={() => handleMarkAsCompleted(followUp.id)}
                    className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors group"
                    title="Marcar como concluído"
                  >
                    <CheckCircle className="w-4 h-4 text-[#94A3B8] group-hover:text-[#10B981]" />
                  </button>
                )}
                {followUp.leads?.telefone && (
                  <button
                    className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors group"
                    title="Ligar"
                  >
                    <Phone className="w-4 h-4 text-[#94A3B8] group-hover:text-[#059669]" />
                  </button>
                )}
                {followUp.leads?.email && (
                  <button
                    className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors group"
                    title="Enviar email"
                  >
                    <Mail className="w-4 h-4 text-[#94A3B8] group-hover:text-[#059669]" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteFollowUp(followUp.id)}
                  className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors group"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4 text-[#94A3B8] group-hover:text-[#EF4444]" />
                </button>
              </div>
            )
          }
        ]}
        data={filteredFollowUps}
      />

      {/* Modal de Visualização */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              Detalhes do Follow-up
            </DialogTitle>
          </DialogHeader>

          {selectedFollowUp && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Lead</Label>
                  <div className="p-3 bg-[#F8FAFC] rounded-lg border">
                    <p className="font-medium text-[#0F172A]">{selectedFollowUp.leads?.nome_completo}</p>
                    <p className="text-sm text-[#94A3B8]">{selectedFollowUp.leads?.email}</p>
                    {selectedFollowUp.leads?.telefone && (
                      <p className="text-sm text-[#94A3B8]">{selectedFollowUp.leads?.telefone}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Data Agendada</Label>
                  <div className="p-3 bg-[#F8FAFC] rounded-lg border">
                    <p className="font-medium text-[#0F172A]">
                      {new Date(selectedFollowUp.data_agendada).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Título</Label>
                <div className="p-3 bg-[#F8FAFC] rounded-lg border">
                  <p className="font-medium text-[#0F172A]">{selectedFollowUp.titulo}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#475569]">Descrição</Label>
                <div className="p-3 bg-[#F8FAFC] rounded-lg border min-h-[100px]">
                  <p className="text-[#475569]">{selectedFollowUp.descricao}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Tipo</Label>
                  <div className="p-3 bg-[#F8FAFC] rounded-lg border">
                    <p className="font-medium text-[#0F172A]">{selectedFollowUp.tipo}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Prioridade</Label>
                  <div className="p-3 bg-[#F8FAFC] rounded-lg border">
                    <p className="font-medium text-[#0F172A]">{selectedFollowUp.prioridade}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#475569]">Status</Label>
                  <div className="p-3 bg-[#F8FAFC] rounded-lg border">
                    <StatusBadge status={
                      selectedFollowUp.status === 'pendente' ? 'pending' :
                      selectedFollowUp.status === 'concluido' ? 'completed' : 'cancelled'
                    } />
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-[#059669] rounded-lg">
                <Edit className="w-5 h-5 text-white" />
              </div>
              Editar Follow-up
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-titulo">Título</Label>
                <Input
                  id="edit-titulo"
                  value={editForm.titulo}
                  onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
                  placeholder="Título do follow-up"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-data">Data Agendada</Label>
                <Input
                  id="edit-data"
                  type="date"
                  value={editForm.data_agendada}
                  onChange={(e) => setEditForm({ ...editForm, data_agendada: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Textarea
                id="edit-descricao"
                value={editForm.descricao}
                onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                placeholder="Descrição do follow-up"
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={editForm.tipo} onValueChange={(value) => setEditForm({ ...editForm, tipo: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ligacao">Ligação</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="reuniao">Reunião</SelectItem>
                    <SelectItem value="proposta">Proposta</SelectItem>
                    <SelectItem value="contrato">Contrato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={editForm.prioridade} onValueChange={(value) => setEditForm({ ...editForm, prioridade: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-[#475569] hover:bg-[#F1F5F9] rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateFollowUp}
                disabled={isLoadingData}
                className="flex items-center gap-2 px-6 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {isLoadingData ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Criação */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-[#059669] rounded-lg">
                <Plus className="w-5 h-5 text-white" />
              </div>
              Criar Novo Follow-up
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Lead *</Label>
              <Select value={newForm.lead_id} onValueChange={(value) => {
                setNewForm({ ...newForm, lead_id: value })
                if (newFormErrors.lead_id) {
                  setNewFormErrors({ ...newFormErrors, lead_id: '' })
                }
              }}>
                <SelectTrigger className={`${newFormErrors.lead_id ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Selecionar lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.nome_completo} ({lead.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newFormErrors.lead_id && (
                <p className="text-sm text-red-600">{newFormErrors.lead_id}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-titulo">Título *</Label>
                <Input
                  id="new-titulo"
                  value={newForm.titulo}
                  onChange={(e) => {
                    setNewForm({ ...newForm, titulo: e.target.value })
                    if (newFormErrors.titulo) {
                      setNewFormErrors({ ...newFormErrors, titulo: '' })
                    }
                  }}
                  placeholder="Título do follow-up"
                  className={`${newFormErrors.titulo ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                {newFormErrors.titulo && (
                  <p className="text-sm text-red-600">{newFormErrors.titulo}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-data">Data Agendada *</Label>
                <Input
                  id="new-data"
                  type="date"
                  value={newForm.data_agendada}
                  onChange={(e) => {
                    setNewForm({ ...newForm, data_agendada: e.target.value })
                    if (newFormErrors.data_agendada) {
                      setNewFormErrors({ ...newFormErrors, data_agendada: '' })
                    }
                  }}
                  className={`${newFormErrors.data_agendada ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                {newFormErrors.data_agendada && (
                  <p className="text-sm text-red-600">{newFormErrors.data_agendada}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-descricao">Descrição</Label>
              <Textarea
                id="new-descricao"
                value={newForm.descricao}
                onChange={(e) => setNewForm({ ...newForm, descricao: e.target.value })}
                placeholder="Descrição do follow-up"
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newForm.tipo} onValueChange={(value) => setNewForm({ ...newForm, tipo: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ligacao">Ligação</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="reuniao">Reunião</SelectItem>
                    <SelectItem value="proposta">Proposta</SelectItem>
                    <SelectItem value="contrato">Contrato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={newForm.prioridade} onValueChange={(value) => setNewForm({ ...newForm, prioridade: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newForm.status} onValueChange={(value) => setNewForm({ ...newForm, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 text-[#475569] hover:bg-[#F1F5F9] rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateFollowUp}
                disabled={isLoadingData}
                className="flex items-center gap-2 px-6 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {isLoadingData ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Criar Follow-up
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}