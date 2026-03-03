'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  Calendar,
  User,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Edit,
  Trash2,
  Eye,
  UserX,
  Download,
  RefreshCw,
  Building,
  Star,
  Users,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  BookOpen,
  Play,
  FileText,
  Activity,
  Target,
  TrendingUp,
  BarChart3,
  Menu,
  X as CloseIcon
} from 'lucide-react'
import { CloserAuthProvider, useCloserAuth } from '@/contexts/closer-auth'
import { supabase } from '@/lib/supabase'
import StudyMaterials from '@/components/StudyMaterials'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Lead {
  id: string
  nome_completo: string
  email?: string
  telefone?: string
  empresa?: string
  cargo?: string
  status: string
  temperatura?: string
  prioridade?: string
  origem?: string
  observacoes?: string
  valor_potencial?: number
  data_primeiro_contato: string
  next_followup_date?: string
  closer_id?: string
  sdr_id?: string
  lead_score?: number
  created_at: string
  updated_at: string
  organization_id: string
  closers?: {
    id: string
    nome_completo: string
  }
  sdrs?: {
    id: string
    nome_completo: string
  }
}

interface Closer {
  id: string
  nome_completo: string
  email: string
  tipo_closer: string
  status_contrato: string
}

interface SDR {
  id: string
  nome_completo: string
  email: string
  status: string
}

const STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo', color: 'bg-blue-500' },
  { value: 'contatado', label: 'Contatado', color: 'bg-yellow-500' },
  { value: 'qualificado', label: 'Qualificado', color: 'bg-purple-500' },
  { value: 'interessado', label: 'Interessado', color: 'bg-green-500' },
  { value: 'proposta_enviada', label: 'Proposta Enviada', color: 'bg-orange-500' },
  { value: 'negociacao', label: 'Negociação', color: 'bg-indigo-500' },
  { value: 'fechado_ganho', label: 'Fechado - Ganho', color: 'bg-green-600' },
  { value: 'fechado_perdido', label: 'Fechado - Perdido', color: 'bg-red-500' },
  { value: 'nurturing', label: 'Nutrição', color: 'bg-teal-500' }
]

const TEMPERATURA_OPTIONS = [
  { value: 'frio', label: 'Frio', color: 'bg-blue-400' },
  { value: 'morno', label: 'Morno', color: 'bg-yellow-400' },
  { value: 'quente', label: 'Quente', color: 'bg-red-400' },
  { value: 'elite', label: 'Elite', color: 'bg-purple-500' }
]

const PRIORIDADE_OPTIONS = [
  { value: 'baixa', label: 'Baixa', color: 'bg-gray-400' },
  { value: 'media', label: 'Média', color: 'bg-yellow-500' },
  { value: 'alta', label: 'Alta', color: 'bg-red-500' }
]

function LeadsPageContent() {
  const { closer, loading: authLoading } = useCloserAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [closers, setClosers] = useState<Closer[]>([])
  const [sdrs, setSdrs] = useState<SDR[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [closerFilter, setCloserFilter] = useState('all')
  const [showMyLeadsOnly, setShowMyLeadsOnly] = useState(false)
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [showStudyMaterials, setShowStudyMaterials] = useState(false)
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month'>('today')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    empresa: '',
    cargo: '',
    status: 'novo',
    temperatura: 'frio',
    prioridade: 'media',
    origem: '',
    observacoes: '',
    valor_potencial: '',
    next_followup_date: '',
    closer_id: '',
    sdr_id: ''
  })

  useEffect(() => {
    if (closer) {
      loadLeads()
      loadClosers()
      loadSdrs()
    }
  }, [closer, showMyLeadsOnly, showUnassignedOnly, periodFilter])

  const loadLeads = async () => {
    if (!closer) return

    try {
      setLoading(true)

      let query = supabase
        .from('leads')
        .select(`
          *,
          closers:closer_id(id, nome_completo),
          sdrs:sdr_id(id, nome_completo)
        `)
        .eq('organization_id', closer.organization_id)
        .order('created_at', { ascending: false })

      // Filtro de período
      const now = new Date()
      let startDate: Date

      switch (periodFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          // Monday to Sunday of this week
          const dayOfWeek = now.getDay()
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          startDate = new Date(now)
          startDate.setDate(now.getDate() - daysToMonday)
          startDate.setHours(0, 0, 0, 0)
          break
        case 'month':
          // First day of current month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      }

      query = query.gte('created_at', startDate.toISOString())

      // Regras de visibilidade baseada no tipo de usuário
      if (closer.tipo_closer === 'sdr') {
        // SDRs veem: leads atribuídos a eles + leads sem SDR atribuído
        if (!showMyLeadsOnly) {
          query = query.or(`sdr_id.eq.${closer.id},sdr_id.is.null`)
        } else {
          query = query.eq('sdr_id', closer.id)
        }
      } else if (closer.tipo_closer === 'closer' || closer.tipo_closer === 'closer_senior') {
        // Closers veem: leads atribuídos a eles + leads qualificados sem closer atribuído
        if (!showMyLeadsOnly) {
          query = query.or(`closer_id.eq.${closer.id},and(closer_id.is.null,status.in.(qualificado,interessado,proposta_enviada,negociacao))`)
        } else {
          query = query.eq('closer_id', closer.id)
        }
      } else if (closer.tipo_closer === 'manager' || closer.tipo_closer === 'admin') {
        // Managers e admins veem todos os leads da organização
      }

      if (showUnassignedOnly) {
        query = query.is('sdr_id', null)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading leads:', error)
        toast.error('Erro ao carregar leads')
      } else {
        setLeads(data || [])
      }
    } catch (error) {
      console.error('Error loading leads:', error)
      toast.error('Erro ao carregar leads')
    } finally {
      setLoading(false)
    }
  }

  const loadClosers = async () => {
    if (!closer) return

    try {
      const { data, error } = await supabase
        .from('closers')
        .select('id, nome_completo, email, tipo_closer, ativo')
        .eq('organization_id', closer.organization_id)
        .eq('ativo', true)

      if (error) {
        console.error('Error loading closers:', error)
      } else {
        setClosers(data || [])
      }
    } catch (error) {
      console.error('Error loading closers:', error)
    }
  }

  const loadSdrs = async () => {
    if (!closer) return

    try {
      const { data, error } = await supabase
        .from('sdrs')
        .select('id, nome_completo, email, status')
        .eq('organization_id', closer.organization_id)
        .eq('status', 'ativo')

      if (error) {
        console.error('Error loading SDRs:', error)
      } else {
        setSdrs(data || [])
      }
    } catch (error) {
      console.error('Error loading SDRs:', error)
    }
  }

  const handleCreateLead = async () => {
    if (!closer || !formData.nome_completo) {
      toast.error('Nome completo é obrigatório')
      return
    }

    try {
      const leadData = {
        ...formData,
        valor_potencial: formData.valor_potencial ? parseFloat(formData.valor_potencial) : null,
        organization_id: closer.organization_id,
        data_primeiro_contato: new Date().toISOString(),
        lead_score: Math.floor(Math.random() * 100),
        closer_id: formData.closer_id || null,
        sdr_id: formData.sdr_id || null
      }

      const { error } = await supabase
        .from('leads')
        .insert(leadData)

      if (error) throw error

      toast.success('Lead criado com sucesso!')
      setIsCreateModalOpen(false)
      resetForm()
      loadLeads()
    } catch (error) {
      console.error('Error creating lead:', error)
      toast.error('Erro ao criar lead')
    }
  }

  const handleUpdateLead = async () => {
    if (!selectedLead || !formData.nome_completo) {
      toast.error('Nome completo é obrigatório')
      return
    }

    try {
      const leadData = {
        ...formData,
        valor_potencial: formData.valor_potencial ? parseFloat(formData.valor_potencial) : null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('leads')
        .update(leadData)
        .eq('id', selectedLead.id)

      if (error) throw error

      toast.success('Lead atualizado com sucesso!')
      setIsEditModalOpen(false)
      resetForm()
      setSelectedLead(null)
      loadLeads()
    } catch (error) {
      console.error('Error updating lead:', error)
      toast.error('Erro ao atualizar lead')
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId)

      if (error) throw error

      toast.success('Lead excluído com sucesso!')
      loadLeads()
    } catch (error) {
      console.error('Error deleting lead:', error)
      toast.error('Erro ao excluir lead')
    }
  }

  const handleQuickStatusUpdate = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)

      if (error) throw error

      toast.success('Status atualizado!')
      loadLeads()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  const resetForm = () => {
    setFormData({
      nome_completo: '',
      email: '',
      telefone: '',
      empresa: '',
      cargo: '',
      status: 'novo',
      temperatura: 'frio',
      prioridade: 'media',
      origem: '',
      observacoes: '',
      valor_potencial: '',
      next_followup_date: '',
      closer_id: '',
      sdr_id: ''
    })
  }

  const openEditModal = (lead: Lead) => {
    setSelectedLead(lead)
    setFormData({
      nome_completo: lead.nome_completo || '',
      email: lead.email || '',
      telefone: lead.telefone || '',
      empresa: lead.empresa || '',
      cargo: lead.cargo || '',
      status: lead.status || 'novo',
      temperatura: lead.temperatura || 'frio',
      prioridade: lead.prioridade || 'media',
      origem: lead.origem || '',
      observacoes: lead.observacoes || '',
      valor_potencial: lead.valor_potencial?.toString() || '',
      next_followup_date: lead.next_followup_date?.split('T')[0] || '',
      closer_id: lead.closer_id || '',
      sdr_id: lead.sdr_id || ''
    })
    setIsEditModalOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status)
    return statusOption ? (
      <Badge className={`${statusOption.color} text-white text-xs`}>
        {statusOption.label}
      </Badge>
    ) : (
      <Badge variant="secondary" className="text-xs">{status}</Badge>
    )
  }

  const getTemperaturaBadge = (temperatura?: string) => {
    if (!temperatura) return null
    const tempOption = TEMPERATURA_OPTIONS.find(t => t.value === temperatura)
    return tempOption ? (
      <Badge className={`${tempOption.color} text-white text-xs`}>
        {tempOption.label}
      </Badge>
    ) : null
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.telefone?.includes(searchTerm) ||
      lead.empresa?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    const matchesCloser = closerFilter === 'all' ||
                         (closerFilter === 'unassigned' && !lead.closer_id) ||
                         lead.closer_id === closerFilter

    return matchesSearch && matchesStatus && matchesCloser
  })

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <RefreshCw className="h-7 w-7 animate-spin text-white" />
            </div>
            <div className="absolute -inset-2 rounded-2xl bg-blue-500/20 blur-xl animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white">Carregando...</p>
            <p className="text-xs text-white/40 mt-1">Autenticando acesso</p>
          </div>
        </div>
      </div>
    )
  }

  if (!closer) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
        <div className="bg-[#1a1a1e] rounded-2xl p-8 w-full max-w-md border border-white/[0.06] shadow-2xl">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/20 mx-auto mb-4">
              <AlertCircle className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Acesso Restrito</h2>
            <p className="text-white/40 mt-2 text-sm">
              Você precisa estar logado como Closer/SDR para acessar esta página.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col lg:flex-row">
      {/* Mobile Menu Button */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-bold text-sm">CS</span>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">CustomerSuccess</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-white/60 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all"
        >
          {sidebarOpen ? <CloseIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar Esquerda */}
      <aside className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-full lg:w-[260px] bg-[#0a0a0c] lg:border-r border-white/[0.06] flex flex-col absolute lg:relative z-10 h-full lg:h-auto`}>
        <div className="p-6 hidden lg:block">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-bold text-sm">CS</span>
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">CustomerSuccess</span>
          </div>

          <div className="flex items-center gap-3 mb-8 p-3 bg-[#1a1a1e] rounded-xl border border-white/[0.06]">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-700/20 flex items-center justify-center border border-blue-500/20">
              <User className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">
                {closer.nome_completo?.split(' ')[0] || 'Usuário'}
              </p>
              <p className="text-white/30 text-xs">
                {closer.tipo_closer === 'sdr' ? 'SDR' :
                 closer.tipo_closer === 'closer' ? 'Closer' :
                 closer.tipo_closer === 'closer_senior' ? 'Closer Senior' : 'Manager'}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1e] border border-white/[0.06] rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 px-6 pt-6 lg:pt-0">
          {/* NAVEGAÇÃO */}
          <div className="mb-8">
            <h3 className="text-white/30 text-[10px] uppercase tracking-[0.15em] font-semibold mb-4 px-3">Navegação</h3>
            <nav className="space-y-1">
              <Link href="/closer" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all" onClick={() => setSidebarOpen(false)}>
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Dashboard</span>
              </Link>
              <a
                href="#"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 transition-all"
              >
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Leads</span>
              </a>
              <button
                onClick={() => setShowStudyMaterials(true)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all w-full text-left"
              >
                <BookOpen className="h-4 w-4" />
                <span className="text-sm">Estudos</span>
              </button>
            </nav>
          </div>
        </div>

        <div className="p-6">
          <Link
            href="/closer"
            className="w-full py-2.5 px-4 bg-[#1a1a1e] text-white/50 rounded-xl hover:bg-white/[0.06] hover:text-white/70 border border-white/[0.06] transition-all text-sm text-center block"
            onClick={() => setSidebarOpen(false)}
          >
            ← Voltar ao Dashboard
          </Link>
        </div>
      </aside>

      {/* Conteúdo Central */}
      <main className="flex-1 overflow-auto">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Gestão de Leads</h1>
                  <p className="text-xs text-white/40 mt-0.5">
                    <span className="text-white/30">Dashboards</span>
                    <span className="mx-2 text-white/20">/</span>
                    <span className="text-blue-400/70">Leads</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(['today', 'week', 'month'] as const).map((period) => {
                  const labels = { today: 'Hoje', week: 'Esta Semana', month: 'Este Mês' }
                  return (
                    <button
                      key={period}
                      onClick={() => setPeriodFilter(period)}
                      className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                        periodFilter === period
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                          : 'bg-[#1a1a1e] border border-white/[0.06] text-white/50 hover:text-white/70 hover:bg-white/[0.06]'
                      }`}
                    >
                      {labels[period]}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Total Leads */}
            <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] hover:border-blue-500/20 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-blue-500/[0.1]" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Activity className="h-3 w-3 text-blue-400" />
                    <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Total</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Total Leads</p>
                <p className="text-3xl font-bold text-white mt-1 tabular-nums">{leads.length}</p>
                <p className="text-[11px] text-white/30 mt-1">No período selecionado</p>
              </div>
            </div>

            {/* Convertidos */}
            <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] hover:border-emerald-500/20 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-emerald-500/[0.1]" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">CVR</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Convertidos</p>
                <p className="text-3xl font-bold text-white mt-1 tabular-nums">
                  {leads.filter(l => l.status === 'fechado_ganho').length}
                </p>
                <p className="text-[11px] text-white/30 mt-1">
                  <span className="text-emerald-400">
                    {leads.length > 0
                      ? ((leads.filter(l => l.status === 'fechado_ganho').length / leads.length) * 100).toFixed(1)
                      : '0'
                    }%
                  </span>
                  {' '}taxa conversão
                </p>
              </div>
            </div>

            {/* Em Andamento */}
            <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] hover:border-purple-500/20 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-purple-500/[0.1]" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <Filter className="h-3 w-3 text-purple-400" />
                    <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Pipeline</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Em Andamento</p>
                <p className="text-3xl font-bold text-white mt-1 tabular-nums">
                  {leads.filter(l => !['fechado_ganho', 'fechado_perdido'].includes(l.status)).length}
                </p>
                <p className="text-[11px] text-white/30 mt-1">
                  <span className="text-purple-400">{leads.filter(l => l.status === 'qualificado').length}</span> qualificados
                  {' + '}
                  <span className="text-purple-400">{leads.filter(l => l.status === 'interessado').length}</span> interessados
                </p>
              </div>
            </div>

            {/* Valor Potencial */}
            <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] hover:border-amber-500/20 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-amber-500/[0.1]" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Star className="h-3 w-3 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Revenue</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Valor Potencial</p>
                <p className="text-3xl font-bold text-white mt-1 tabular-nums">
                  R$ {leads.reduce((sum, l) => sum + (l.valor_potencial || 0), 0).toLocaleString('pt-BR')}
                </p>
                <p className="text-[11px] text-white/30 mt-1">
                  <span className="text-amber-400">{leads.filter(l => l.valor_potencial && l.valor_potencial > 0).length}</span> leads com valor
                </p>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-[#1a1a1e] rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="px-4 lg:px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-white/40" />
                <h3 className="text-sm font-semibold text-white">Filtros</h3>
              </div>
              <span className="text-[11px] text-white/30 bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                {filteredLeads.length} resultados
              </span>
            </div>
            <div className="p-4 lg:p-6">
              <div className="flex flex-wrap gap-2.5 items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 bg-[#0a0a0c] border-white/[0.06] text-white/80 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1e] border-white/[0.06] rounded-xl">
                    <SelectItem value="all" className="text-white/80 focus:bg-white/[0.06] focus:text-white">Todos os Status</SelectItem>
                    {STATUS_OPTIONS.map(status => (
                      <SelectItem key={status.value} value={status.value} className="text-white/80 focus:bg-white/[0.06] focus:text-white">
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={closerFilter} onValueChange={setCloserFilter}>
                  <SelectTrigger className="w-full sm:w-48 bg-[#0a0a0c] border-white/[0.06] text-white/80 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40">
                    <SelectValue placeholder="Closer" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1e] border-white/[0.06] rounded-xl">
                    <SelectItem value="all" className="text-white/80 focus:bg-white/[0.06] focus:text-white">Todos os Closers</SelectItem>
                    <SelectItem value="unassigned" className="text-white/80 focus:bg-white/[0.06] focus:text-white">Não Atribuídos</SelectItem>
                    {closers.map(closer => (
                      <SelectItem key={closer.id} value={closer.id} className="text-white/80 focus:bg-white/[0.06] focus:text-white">
                        {closer.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <button
                  onClick={() => setShowMyLeadsOnly(!showMyLeadsOnly)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    showMyLeadsOnly
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-[#0a0a0c] border border-white/[0.06] text-white/50 hover:text-white/70 hover:bg-white/[0.06]'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {showMyLeadsOnly
                      ? (closer?.tipo_closer === 'sdr' ? 'Todos os Leads' : 'Leads Disponíveis')
                      : 'Apenas Meus Leads'
                    }
                  </span>
                  <span className="sm:hidden">{showMyLeadsOnly ? 'Todos' : 'Meus'}</span>
                </button>

                <button
                  onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    showUnassignedOnly
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-[#0a0a0c] border border-white/[0.06] text-white/50 hover:text-white/70 hover:bg-white/[0.06]'
                  }`}
                >
                  <UserX className="h-4 w-4" />
                  <span className="hidden sm:inline">{showUnassignedOnly ? 'Todos os Leads' : 'Leads Sem SDR'}</span>
                  <span className="sm:hidden">{showUnassignedOnly ? 'Todos' : 'S/SDR'}</span>
                </button>

                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                  <DialogTrigger asChild>
                    <button
                      onClick={resetForm}
                      className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/20 transition-all text-sm font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Novo Lead</span>
                      <span className="sm:hidden">Novo</span>
                    </button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Tabela de Leads */}
          <div className="bg-[#1a1a1e] rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="px-4 lg:px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  Leads
                </h3>
                <p className="text-[11px] text-white/30 mt-0.5">{filteredLeads.length} leads encontrados</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadLeads}
                  className="p-2 text-white/30 hover:text-white/60 hover:bg-white/[0.04] rounded-lg transition-all"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button className="p-2 text-white/30 hover:text-white/60 hover:bg-white/[0.04] rounded-lg transition-all">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left py-3 px-4 lg:px-6 text-[10px] uppercase tracking-[0.15em] font-semibold text-white/30">Nome</th>
                    <th className="text-left py-3 px-4 lg:px-6 text-[10px] uppercase tracking-[0.15em] font-semibold text-white/30 hidden md:table-cell">Contato</th>
                    <th className="text-left py-3 px-4 lg:px-6 text-[10px] uppercase tracking-[0.15em] font-semibold text-white/30">Status</th>
                    <th className="text-left py-3 px-4 lg:px-6 text-[10px] uppercase tracking-[0.15em] font-semibold text-white/30 hidden lg:table-cell">Temperatura</th>
                    <th className="text-left py-3 px-4 lg:px-6 text-[10px] uppercase tracking-[0.15em] font-semibold text-white/30 hidden lg:table-cell">Valor</th>
                    <th className="text-left py-3 px-4 lg:px-6 text-[10px] uppercase tracking-[0.15em] font-semibold text-white/30 hidden lg:table-cell">Closer</th>
                    <th className="text-center py-3 px-4 lg:px-6 text-[10px] uppercase tracking-[0.15em] font-semibold text-white/30">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead, index) => (
                    <tr key={lead.id} className="border-b border-white/[0.03] hover:bg-blue-500/[0.03] transition-all duration-200 group/row">
                      <td className="py-4 px-4 lg:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-700/20 flex items-center justify-center border border-blue-500/10 group-hover/row:border-blue-500/20 transition-all">
                            <User className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{lead.nome_completo}</p>
                            <p className="text-white/30 text-xs">{lead.cargo || lead.empresa || 'Lead'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 lg:px-6 hidden md:table-cell">
                        <div className="space-y-1.5">
                          {lead.email && (
                            <div className="flex items-center text-sm text-white/40">
                              <Mail className="h-3 w-3 mr-2 text-white/20" />
                              <span className="truncate max-w-[150px]">{lead.email}</span>
                            </div>
                          )}
                          {lead.telefone && (
                            <div className="flex items-center text-sm text-white/40">
                              <Phone className="h-3 w-3 mr-2 text-white/20" />
                              {lead.telefone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 lg:px-6">
                        {getStatusBadge(lead.status)}
                      </td>
                      <td className="py-4 px-4 lg:px-6 hidden lg:table-cell">
                        {getTemperaturaBadge(lead.temperatura)}
                      </td>
                      <td className="py-4 px-4 lg:px-6 hidden lg:table-cell">
                        {lead.valor_potencial && (
                          <div className="flex items-center text-sm text-white font-medium tabular-nums">
                            <DollarSign className="h-3 w-3 mr-1 text-emerald-400" />
                            R$ {lead.valor_potencial.toLocaleString('pt-BR')}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 lg:px-6 hidden lg:table-cell">
                        <span className="text-white/40 text-sm">
                          {lead.closers?.nome_completo || (
                            <span className="text-white/20 italic">Não atribuído</span>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-4 lg:px-6">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(lead)}
                            className="p-2 text-white/30 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
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
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                  <Users className="h-7 w-7 text-white/10" />
                </div>
                <p className="text-white/30 text-sm">Nenhum lead encontrado</p>
                <p className="text-white/15 text-xs mt-1">Tente ajustar seus filtros ou período</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Sidebar Direita */}
      <aside className="hidden xl:block w-80 bg-[#0a0a0c] border-l border-white/[0.06] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Estatísticas */}
          <div className="bg-[#1a1a1e] rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.04]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-400" />
                Estatísticas
              </h3>
              <p className="text-[11px] text-white/30 mt-0.5">Por status do funil</p>
            </div>
            <div className="p-4 space-y-2">
              {STATUS_OPTIONS.slice(0, 5).map((status) => {
                const count = leads.filter(l => l.status === status.value).length
                const percentage = leads.length > 0 ? (count / leads.length) * 100 : 0
                return (
                  <div key={status.value} className="group flex items-center justify-between p-3 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl border border-white/[0.04] transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${status.color} shadow-sm`} />
                      <span className="text-white/50 text-sm group-hover:text-white/70 transition-colors">{status.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/20 tabular-nums">{percentage.toFixed(0)}%</span>
                      <span className="text-white font-semibold text-sm tabular-nums min-w-[24px] text-right">{count}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="bg-[#1a1a1e] rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.04]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-400" />
                Ações Rápidas
              </h3>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={loadLeads}
                className="w-full flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl text-white/50 hover:text-white/70 border border-white/[0.04] transition-all text-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <RefreshCw className="h-3.5 w-3.5 text-blue-400" />
                </div>
                Atualizar Leads
              </button>
              <button className="w-full flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl text-white/50 hover:text-white/70 border border-white/[0.04] transition-all text-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                Exportar CSV
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Modal Criar/Editar Lead */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false)
          setIsEditModalOpen(false)
          setSelectedLead(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-4xl bg-[#1a1a1e] border-white/[0.06] max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl shadow-black/50">
          <DialogHeader className="pb-4 border-b border-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                {selectedLead ? <Edit className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
              </div>
              <div>
                <DialogTitle className="text-white text-lg">
                  {selectedLead ? 'Editar Lead' : 'Criar Novo Lead'}
                </DialogTitle>
                <p className="text-white/30 text-xs mt-0.5">
                  {selectedLead ? 'Atualize as informações do lead' : 'Preencha os dados para criar um novo lead'}
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
            <div className="space-y-2">
              <Label className="text-white/60 text-xs font-medium uppercase tracking-wider">Nome Completo *</Label>
              <Input
                value={formData.nome_completo}
                onChange={(e) => setFormData({...formData, nome_completo: e.target.value})}
                placeholder="Nome completo"
                className="bg-[#0a0a0c] border-white/[0.06] text-white placeholder-white/20 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs font-medium uppercase tracking-wider">Email</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Email"
                type="email"
                className="bg-[#0a0a0c] border-white/[0.06] text-white placeholder-white/20 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs font-medium uppercase tracking-wider">Telefone</Label>
              <Input
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                placeholder="Telefone"
                className="bg-[#0a0a0c] border-white/[0.06] text-white placeholder-white/20 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs font-medium uppercase tracking-wider">Empresa</Label>
              <Input
                value={formData.empresa}
                onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                placeholder="Empresa"
                className="bg-[#0a0a0c] border-white/[0.06] text-white placeholder-white/20 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs font-medium uppercase tracking-wider">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger className="bg-[#0a0a0c] border-white/[0.06] text-white rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1e] border-white/[0.06] rounded-xl">
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status.value} value={status.value} className="text-white/80 focus:bg-white/[0.06] focus:text-white">
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-xs font-medium uppercase tracking-wider">Valor Potencial</Label>
              <Input
                value={formData.valor_potencial}
                onChange={(e) => setFormData({...formData, valor_potencial: e.target.value})}
                placeholder="0"
                type="number"
                className="bg-[#0a0a0c] border-white/[0.06] text-white placeholder-white/20 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2.5 mt-6 pt-4 border-t border-white/[0.04]">
            <button
              onClick={() => {
                setIsCreateModalOpen(false)
                setIsEditModalOpen(false)
                setSelectedLead(null)
                resetForm()
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-white/[0.04] text-white/50 rounded-xl hover:bg-white/[0.08] hover:text-white/70 border border-white/[0.06] transition-all text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={selectedLead ? handleUpdateLead : handleCreateLead}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/20 transition-all text-sm font-medium"
            >
              {selectedLead ? 'Atualizar' : 'Criar'} Lead
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Study Materials Component */}
      <StudyMaterials
        closerId={closer.id}
        isVisible={showStudyMaterials}
        onClose={() => setShowStudyMaterials(false)}
      />
    </div>
  )
}

export default function CloserLeadsPage() {
  return (
    <CloserAuthProvider>
      <LeadsPageContent />
    </CloserAuthProvider>
  )
}
