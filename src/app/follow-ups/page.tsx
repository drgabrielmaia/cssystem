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
          prioridade: lead.status === 'agendado' ? 'alta' : lead.status === 'contactado' ? 'media' : 'baixa',
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
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
            </div>
            <p className="text-sm text-white/40">Carregando follow-ups...</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Follow-ups" subtitle="Gestão de acompanhamentos e tarefas">
      {/* Loading Overlay */}
      {isLoadingData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#1a1a1e] rounded-2xl p-6 shadow-2xl border border-white/[0.06] flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
            <span className="text-sm font-medium text-white/70">Atualizando dados...</span>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {/* Total Follow-ups */}
        <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-emerald-500/20 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-emerald-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-emerald-500/[0.1]" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Total Follow-ups</p>
            <p className="text-3xl font-bold text-white mt-1 tabular-nums">{stats.total_followups}</p>
            <p className="text-xs text-white/30 mt-1">Este mes</p>
          </div>
        </div>

        {/* Pendentes */}
        <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-amber-500/20 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-amber-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-amber-500/[0.1]" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Pendentes</p>
            <p className="text-3xl font-bold text-white mt-1 tabular-nums">{stats.pendentes}</p>
            <p className="text-xs text-white/30 mt-1">Aguardando acao</p>
          </div>
        </div>

        {/* Concluidos */}
        <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-emerald-500/20 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-emerald-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-emerald-500/[0.1]" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Concluidos</p>
            <p className="text-3xl font-bold text-white mt-1 tabular-nums">{stats.concluidos}</p>
            <p className="text-xs text-emerald-400/70 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Finalizados
            </p>
          </div>
        </div>

        {/* Taxa de Conclusao */}
        <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-violet-500/20 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-violet-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-violet-500/[0.1]" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-violet-400" />
              </div>
            </div>
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Taxa Conclusao</p>
            <p className="text-3xl font-bold text-white mt-1 tabular-nums">{stats.taxa_conclusao.toFixed(1)}%</p>
            <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(stats.taxa_conclusao, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banners - Dark Theme */}
      {stats.atrasados > 0 && (
        <div className="relative bg-[#141418] rounded-2xl p-4 mb-6 ring-1 ring-red-500/20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/[0.08] to-transparent" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0 animate-pulse">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-300">Atencao - Follow-ups Atrasados</p>
              <p className="text-xs text-red-400/70 mt-0.5">
                Voce tem <span className="font-bold text-red-300">{stats.atrasados}</span> follow-up{stats.atrasados > 1 ? 's' : ''} atrasado{stats.atrasados > 1 ? 's' : ''} que precisa{stats.atrasados > 1 ? 'm' : ''} de atencao
              </p>
            </div>
            <div className="ml-auto flex-shrink-0">
              <span className="px-3 py-1 rounded-full bg-red-500/15 text-xs font-bold text-red-300 tabular-nums">
                {stats.atrasados}
              </span>
            </div>
          </div>
        </div>
      )}

      {stats.hoje > 0 && (
        <div className="relative bg-[#141418] rounded-2xl p-4 mb-6 ring-1 ring-blue-500/20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.08] to-transparent" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-300">Agenda de Hoje</p>
              <p className="text-xs text-blue-400/70 mt-0.5">
                Voce tem <span className="font-bold text-blue-300">{stats.hoje}</span> follow-up{stats.hoje > 1 ? 's' : ''} agendado{stats.hoje > 1 ? 's' : ''} para hoje
              </p>
            </div>
            <div className="ml-auto flex-shrink-0">
              <span className="px-3 py-1 rounded-full bg-blue-500/15 text-xs font-bold text-blue-300 tabular-nums">
                {stats.hoje}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Charts - Dark Theme */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white">Evolucao Semanal</h3>
            <p className="text-xs text-white/40 mt-0.5">Follow-ups criados vs concluidos</p>
          </div>
          <div className="p-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="week" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1e',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      color: '#fff'
                    }}
                    labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="criados" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="concluidos" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white">Distribuicao por Tipo</h3>
            <p className="text-xs text-white/40 mt-0.5">Tipos de follow-up</p>
          </div>
          <div className="p-6">
            <div className="h-72 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="70%">
                <BarChart data={tipoDistribution} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1e',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      color: '#fff'
                    }}
                    labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {tipoDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Buscar follow-ups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-[#141418] ring-1 ring-white/[0.06] rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-emerald-500/40 transition-all w-full sm:w-80"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              showFilters
                ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                : 'bg-[#141418] text-white/60 ring-1 ring-white/[0.06] hover:ring-white/[0.1] hover:text-white/80'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {(statusFilter !== 'todos' || tipoFilter !== 'todos' || prioridadeFilter !== 'todas' || dateFilter !== 'mes_atual') && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadFollowUps}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] ring-1 ring-white/[0.06] rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] ring-1 ring-white/[0.06] rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button
            onClick={handleNewFollowUp}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo Follow-up
          </button>
        </div>
      </div>

      {/* Collapsible Filters Panel */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? 'max-h-96 opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
        <div className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Status Filter - Pill Style */}
            <div>
              <label className="block text-xs font-medium text-white/40 mb-2.5 uppercase tracking-wider">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'todos', label: 'Todos' },
                  { value: 'pendente', label: 'Pendente' },
                  { value: 'concluido', label: 'Concluido' },
                  { value: 'cancelado', label: 'Cancelado' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      statusFilter === option.value
                        ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                        : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/70'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo Filter - Pill Style */}
            <div>
              <label className="block text-xs font-medium text-white/40 mb-2.5 uppercase tracking-wider">Tipo</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'todos', label: 'Todos' },
                  { value: 'ligacao', label: 'Ligacao' },
                  { value: 'email', label: 'Email' },
                  { value: 'whatsapp', label: 'WhatsApp' },
                  { value: 'reuniao', label: 'Reuniao' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTipoFilter(option.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      tipoFilter === option.value
                        ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30'
                        : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/70'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prioridade Filter - Pill Style */}
            <div>
              <label className="block text-xs font-medium text-white/40 mb-2.5 uppercase tracking-wider">Prioridade</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'todas', label: 'Todas' },
                  { value: 'baixa', label: 'Baixa', color: 'emerald' },
                  { value: 'media', label: 'Media', color: 'amber' },
                  { value: 'alta', label: 'Alta', color: 'red' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPrioridadeFilter(option.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      prioridadeFilter === option.value
                        ? option.color === 'emerald' ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                          : option.color === 'amber' ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                          : option.color === 'red' ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                        : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/70'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-xs font-medium text-white/40 mb-2.5 uppercase tracking-wider">Periodo</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.04] ring-1 ring-white/[0.06] rounded-lg text-xs text-white/70 focus:outline-none focus:ring-emerald-500/40 transition-all appearance-none cursor-pointer [&>option]:bg-[#1a1a1e] [&>option]:text-white"
              >
                <option value="todos">Todas as Datas</option>
                <option value="mes_atual">Mes Atual</option>
                <option value="semana_atual">Semana Atual</option>
                <option value="semana_passada">Ultima Semana</option>
                <option value="mes_passado">Mes Passado</option>
                <option value="personalizado">Personalizado</option>
              </select>

              {dateFilter === 'personalizado' && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/[0.04] ring-1 ring-white/[0.06] rounded-lg text-xs text-white/70 focus:outline-none focus:ring-emerald-500/40 transition-all"
                  />
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/[0.04] ring-1 ring-white/[0.06] rounded-lg text-xs text-white/70 focus:outline-none focus:ring-emerald-500/40 transition-all"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Follow-ups Table - Modern Dark */}
      <div className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-white">Lista de Follow-ups</h3>
            <span className="px-2 py-0.5 rounded-full bg-white/[0.04] text-[10px] font-semibold text-gray-500 tabular-nums">
              {filteredFollowUps.length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-3 px-6 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Titulo</th>
                <th className="text-left py-3 px-6 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                <th className="text-left py-3 px-6 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left py-3 px-6 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Prioridade</th>
                <th className="text-left py-3 px-6 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Data Agendada</th>
                <th className="text-left py-3 px-6 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right py-3 px-6 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredFollowUps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                        <Calendar className="w-7 h-7 text-white/15" />
                      </div>
                      <p className="text-sm text-white/40 font-medium">Nenhum follow-up encontrado</p>
                      <p className="text-xs text-white/20">Tente ajustar os filtros ou crie um novo follow-up</p>
                      <button
                        onClick={handleNewFollowUp}
                        className="mt-2 flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-medium hover:bg-emerald-500/20 transition-colors ring-1 ring-emerald-500/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Criar Follow-up
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFollowUps.map((followUp) => {
                  const overdue = isOverdue(followUp.data_agendada, followUp.status)
                  return (
                    <tr
                      key={followUp.id}
                      className={`hover:bg-white/[0.02] transition-colors group ${overdue ? 'bg-red-500/[0.03]' : ''}`}
                    >
                      {/* Titulo */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {overdue && (
                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] flex-shrink-0 animate-pulse" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate max-w-xs">{followUp.titulo}</p>
                            <p className="text-xs text-white/30 truncate max-w-xs mt-0.5">
                              {followUp.descricao || 'Sem descricao'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Lead */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 ring-1 ring-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-[10px]">
                            {followUp.leads?.nome_completo?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'ND'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-white/80 font-medium truncate">{followUp.leads?.nome_completo || 'Lead nao encontrado'}</p>
                            <p className="text-xs text-white/30 truncate">{followUp.leads?.empresa || '-'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] text-xs font-medium text-white/60">
                          {followUp.tipo === 'ligacao' || followUp.tipo === 'call' ? (
                            <Phone className="w-3 h-3 text-emerald-400" />
                          ) : followUp.tipo === 'email' ? (
                            <Mail className="w-3 h-3 text-blue-400" />
                          ) : followUp.tipo === 'whatsapp' ? (
                            <MessageCircle className="w-3 h-3 text-green-400" />
                          ) : followUp.tipo === 'reuniao' ? (
                            <Users className="w-3 h-3 text-amber-400" />
                          ) : null}
                          {followUp.tipo?.charAt(0).toUpperCase() + followUp.tipo?.slice(1) || 'N/A'}
                        </span>
                      </td>

                      {/* Prioridade */}
                      <td className="px-6 py-4">
                        {followUp.prioridade === 'alta' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-xs font-semibold text-red-400 ring-1 ring-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Alta
                          </span>
                        ) : followUp.prioridade === 'media' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Media
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Baixa
                          </span>
                        )}
                      </td>

                      {/* Data Agendada */}
                      <td className="px-6 py-4">
                        <div className={overdue ? '' : ''}>
                          {overdue ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 ring-1 ring-red-500/20">
                              <AlertCircle className="w-3 h-3 text-red-400" />
                              <span className="text-xs font-semibold text-red-400">{formatDate(followUp.data_agendada)}</span>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-white/70 font-medium tabular-nums">{formatDate(followUp.data_agendada)}</p>
                              <p className="text-[10px] text-white/30 tabular-nums mt-0.5">
                                {new Date(followUp.data_agendada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status - Dot Indicator */}
                      <td className="px-6 py-4">
                        {followUp.status === 'pendente' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-xs font-medium text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Pendente
                          </span>
                        ) : followUp.status === 'concluido' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-xs font-medium text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Concluido
                          </span>
                        ) : followUp.status === 'cancelado' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-xs font-medium text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Cancelado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] text-xs font-medium text-white/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                            {followUp.status}
                          </span>
                        )}
                      </td>

                      {/* Acoes */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewFollowUp(followUp)}
                            className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4 text-white/30 hover:text-white/60" />
                          </button>
                          <button
                            onClick={() => handleEditFollowUp(followUp)}
                            className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4 text-white/30 hover:text-emerald-400" />
                          </button>
                          {followUp.status === 'pendente' && (
                            <button
                              onClick={() => handleMarkAsCompleted(followUp.id)}
                              className="p-1.5 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title="Marcar como concluido"
                            >
                              <CheckCircle className="w-4 h-4 text-white/30 hover:text-emerald-400" />
                            </button>
                          )}
                          {followUp.leads?.telefone && (
                            <button
                              className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
                              title="Ligar"
                            >
                              <Phone className="w-4 h-4 text-white/30 hover:text-emerald-400" />
                            </button>
                          )}
                          {followUp.leads?.email && (
                            <button
                              className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
                              title="Enviar email"
                            >
                              <Mail className="w-4 h-4 text-white/30 hover:text-blue-400" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteFollowUp(followUp.id)}
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
      </div>

      {/* View Modal - Glass-morphism Dark */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl bg-[#141418]/95 backdrop-blur-xl border-white/[0.06] ring-1 ring-white/[0.06] shadow-2xl shadow-black/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-400" />
              </div>
              Detalhes do Follow-up
            </DialogTitle>
          </DialogHeader>

          {selectedFollowUp && (
            <div className="space-y-5 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Lead</label>
                  <div className="p-3.5 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 ring-1 ring-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-[10px]">
                        {selectedFollowUp.leads?.nome_completo?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'ND'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{selectedFollowUp.leads?.nome_completo}</p>
                        <p className="text-xs text-white/40">{selectedFollowUp.leads?.email}</p>
                        {selectedFollowUp.leads?.telefone && (
                          <p className="text-xs text-white/40">{selectedFollowUp.leads?.telefone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Data Agendada</label>
                  <div className="p-3.5 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06]">
                    <p className="text-sm font-medium text-white tabular-nums">
                      {new Date(selectedFollowUp.data_agendada).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                    {isOverdue(selectedFollowUp.data_agendada, selectedFollowUp.status) && (
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md bg-red-500/10 text-[10px] font-semibold text-red-400 ring-1 ring-red-500/20">
                        <AlertCircle className="w-3 h-3" />
                        Atrasado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Titulo</label>
                <div className="p-3.5 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06]">
                  <p className="text-sm font-medium text-white">{selectedFollowUp.titulo}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Descricao</label>
                <div className="p-3.5 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06] min-h-[80px]">
                  <p className="text-sm text-white/60">{selectedFollowUp.descricao || 'Sem descricao'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Tipo</label>
                  <div className="p-3.5 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06]">
                    <span className="inline-flex items-center gap-1.5 text-sm text-white/80">
                      {selectedFollowUp.tipo === 'ligacao' || selectedFollowUp.tipo === 'call' ? (
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      ) : selectedFollowUp.tipo === 'email' ? (
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                      ) : selectedFollowUp.tipo === 'whatsapp' ? (
                        <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                      ) : selectedFollowUp.tipo === 'reuniao' ? (
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                      ) : null}
                      {selectedFollowUp.tipo?.charAt(0).toUpperCase() + selectedFollowUp.tipo?.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Prioridade</label>
                  <div className="p-3.5 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06]">
                    {selectedFollowUp.prioridade === 'alta' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-xs font-semibold text-red-400 ring-1 ring-red-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        Alta
                      </span>
                    ) : selectedFollowUp.prioridade === 'media' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Media
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Baixa
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Status</label>
                  <div className="p-3.5 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06]">
                    {selectedFollowUp.status === 'pendente' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-xs font-medium text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Pendente
                      </span>
                    ) : selectedFollowUp.status === 'concluido' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-xs font-medium text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Concluido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-xs font-medium text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        Cancelado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal - Glass-morphism Dark */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl bg-[#141418]/95 backdrop-blur-xl border-white/[0.06] ring-1 ring-white/[0.06] shadow-2xl shadow-black/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Edit className="w-5 h-5 text-emerald-400" />
              </div>
              Editar Follow-up
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-titulo" className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Titulo</Label>
                <Input
                  id="edit-titulo"
                  value={editForm.titulo}
                  onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
                  placeholder="Titulo do follow-up"
                  className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20 focus:border-emerald-500/40 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-data" className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Data Agendada</Label>
                <Input
                  id="edit-data"
                  type="date"
                  value={editForm.data_agendada}
                  onChange={(e) => setEditForm({ ...editForm, data_agendada: e.target.value })}
                  className="bg-white/[0.03] border-white/[0.06] text-white focus:border-emerald-500/40 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-descricao" className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Descricao</Label>
              <Textarea
                id="edit-descricao"
                value={editForm.descricao}
                onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                placeholder="Descricao do follow-up"
                className="min-h-[100px] bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20 focus:border-emerald-500/40 focus:ring-emerald-500/20"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Tipo</Label>
                <Select value={editForm.tipo} onValueChange={(value) => setEditForm({ ...editForm, tipo: value })}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white focus:ring-emerald-500/20">
                    <SelectValue placeholder="Selecionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1e] border-white/[0.06]">
                    <SelectItem value="ligacao">Ligacao</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="reuniao">Reuniao</SelectItem>
                    <SelectItem value="proposta">Proposta</SelectItem>
                    <SelectItem value="contrato">Contrato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Prioridade</Label>
                <Select value={editForm.prioridade} onValueChange={(value) => setEditForm({ ...editForm, prioridade: value })}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white focus:ring-emerald-500/20">
                    <SelectValue placeholder="Selecionar prioridade" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1e] border-white/[0.06]">
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Status</Label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white focus:ring-emerald-500/20">
                    <SelectValue placeholder="Selecionar status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1e] border-white/[0.06]">
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2.5 text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.04] rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateFollowUp}
                disabled={isLoadingData}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingData ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Salvar Alteracoes
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Modal - Glass-morphism Dark */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-2xl bg-[#141418]/95 backdrop-blur-xl border-white/[0.06] ring-1 ring-white/[0.06] shadow-2xl shadow-black/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Plus className="w-5 h-5 text-emerald-400" />
              </div>
              Criar Novo Follow-up
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Lead *</Label>
              <Select value={newForm.lead_id} onValueChange={(value) => {
                setNewForm({ ...newForm, lead_id: value })
                if (newFormErrors.lead_id) {
                  setNewFormErrors({ ...newFormErrors, lead_id: '' })
                }
              }}>
                <SelectTrigger className={`bg-white/[0.03] border-white/[0.06] text-white focus:ring-emerald-500/20 ${newFormErrors.lead_id ? 'border-red-500/50 ring-1 ring-red-500/20' : ''}`}>
                  <SelectValue placeholder="Selecionar lead" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1e] border-white/[0.06] max-h-60">
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.nome_completo} ({lead.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newFormErrors.lead_id && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {newFormErrors.lead_id}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-titulo" className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Titulo *</Label>
                <Input
                  id="new-titulo"
                  value={newForm.titulo}
                  onChange={(e) => {
                    setNewForm({ ...newForm, titulo: e.target.value })
                    if (newFormErrors.titulo) {
                      setNewFormErrors({ ...newFormErrors, titulo: '' })
                    }
                  }}
                  placeholder="Titulo do follow-up"
                  className={`bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20 focus:border-emerald-500/40 focus:ring-emerald-500/20 ${newFormErrors.titulo ? 'border-red-500/50 ring-1 ring-red-500/20' : ''}`}
                />
                {newFormErrors.titulo && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {newFormErrors.titulo}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-data" className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Data Agendada *</Label>
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
                  className={`bg-white/[0.03] border-white/[0.06] text-white focus:border-emerald-500/40 focus:ring-emerald-500/20 ${newFormErrors.data_agendada ? 'border-red-500/50 ring-1 ring-red-500/20' : ''}`}
                />
                {newFormErrors.data_agendada && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {newFormErrors.data_agendada}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-descricao" className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Descricao</Label>
              <Textarea
                id="new-descricao"
                value={newForm.descricao}
                onChange={(e) => setNewForm({ ...newForm, descricao: e.target.value })}
                placeholder="Descricao do follow-up"
                className="min-h-[100px] bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20 focus:border-emerald-500/40 focus:ring-emerald-500/20"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Tipo</Label>
                <Select value={newForm.tipo} onValueChange={(value) => setNewForm({ ...newForm, tipo: value })}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white focus:ring-emerald-500/20">
                    <SelectValue placeholder="Selecionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1e] border-white/[0.06]">
                    <SelectItem value="ligacao">Ligacao</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="reuniao">Reuniao</SelectItem>
                    <SelectItem value="proposta">Proposta</SelectItem>
                    <SelectItem value="contrato">Contrato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Prioridade</Label>
                <Select value={newForm.prioridade} onValueChange={(value) => setNewForm({ ...newForm, prioridade: value })}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white focus:ring-emerald-500/20">
                    <SelectValue placeholder="Selecionar prioridade" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1e] border-white/[0.06]">
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Status</Label>
                <Select value={newForm.status} onValueChange={(value) => setNewForm({ ...newForm, status: value })}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white focus:ring-emerald-500/20">
                    <SelectValue placeholder="Selecionar status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1e] border-white/[0.06]">
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2.5 text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.04] rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateFollowUp}
                disabled={isLoadingData}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
