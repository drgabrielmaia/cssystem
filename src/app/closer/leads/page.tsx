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
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4ADE80]"></div>
      </div>
    )
  }

  if (!closer) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
        <div className="bg-[#1A1A1A] rounded-2xl p-8 w-full max-w-md border border-white/10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Acesso Restrito</h2>
            <p className="text-[#71717A] mt-2">
              Você precisa estar logado como Closer/SDR para acessar esta página.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col lg:flex-row">
      {/* Mobile Menu Button */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-[#1A1A1A] border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-[#4ADE80] to-[#10B981] rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">CS</span>
          </div>
          <span className="text-white font-semibold">CustomerSuccess</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          {sidebarOpen ? <CloseIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar Esquerda */}
      <aside className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-full lg:w-60 bg-[#0F0F0F] lg:border-r border-white/10 flex flex-col absolute lg:relative z-10 h-full lg:h-auto`}>
        <div className="p-6 hidden lg:block">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-[#4ADE80] to-[#10B981] rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">CS</span>
            </div>
            <span className="text-white font-semibold">CustomerSuccess</span>
          </div>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#1E1E1E] rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-[#4ADE80]" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">
                {closer.nome_completo?.split(' ')[0] || 'Usuário'}
              </p>
              <p className="text-[#71717A] text-xs">
                {closer.tipo_closer === 'sdr' ? 'SDR' : 
                 closer.tipo_closer === 'closer' ? 'Closer' :
                 closer.tipo_closer === 'closer_senior' ? 'Closer Senior' : 'Manager'}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#71717A]" />
            <input
              type="text"
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1E1E1E] border border-white/10 rounded-lg text-white placeholder-[#71717A] text-sm focus:outline-none focus:border-[#4ADE80]"
            />
          </div>
        </div>

        <div className="flex-1 px-6 pt-6 lg:pt-0">
          {/* NAVEGAÇÃO */}
          <div className="mb-8">
            <h3 className="text-[#71717A] text-xs uppercase tracking-wider font-medium mb-4">NAVEGAÇÃO</h3>
            <nav className="space-y-1">
              <Link href="/closer" className="flex items-center gap-3 px-4 py-2 rounded-lg text-[#A1A1AA] hover:bg-white/5 transition-colors" onClick={() => setSidebarOpen(false)}>
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Dashboard</span>
              </Link>
              <a 
                href="#" 
                className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[#4ADE80]/10 border-l-4 border-[#4ADE80] text-[#4ADE80] transition-colors"
              >
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Leads</span>
              </a>
              <button 
                onClick={() => setShowStudyMaterials(true)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-[#A1A1AA] hover:bg-white/5 transition-colors w-full text-left"
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
            className="w-full py-2 px-4 bg-[#1E1E1E] text-[#A1A1AA] rounded-lg hover:bg-[#2A2A2A] transition-colors text-sm text-center block"
            onClick={() => setSidebarOpen(false)}
          >
            ← Voltar ao Dashboard
          </Link>
        </div>
      </aside>

      {/* Conteúdo Central */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
            <div>
              <nav className="text-[#71717A] text-sm mb-2">
                <span>Dashboards</span> <span className="mx-2">/</span> <span>Leads</span>
              </nav>
              <h1 className="text-xl lg:text-2xl font-bold text-white">Gestão de Leads</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPeriodFilter('today')}
                className={`px-3 lg:px-4 py-2 rounded-lg text-sm transition-colors ${
                  periodFilter === 'today' 
                    ? 'bg-[#4ADE80] text-black font-medium' 
                    : 'bg-[#1E1E1E] border border-white/10 text-[#A1A1AA] hover:bg-[#2A2A2A]'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setPeriodFilter('week')}
                className={`px-3 lg:px-4 py-2 rounded-lg text-sm transition-colors ${
                  periodFilter === 'week' 
                    ? 'bg-[#4ADE80] text-black font-medium' 
                    : 'bg-[#1E1E1E] border border-white/10 text-[#A1A1AA] hover:bg-[#2A2A2A]'
                }`}
              >
                Esta Semana
              </button>
              <button
                onClick={() => setPeriodFilter('month')}
                className={`px-3 lg:px-4 py-2 rounded-lg text-sm transition-colors ${
                  periodFilter === 'month' 
                    ? 'bg-[#4ADE80] text-black font-medium' 
                    : 'bg-[#1E1E1E] border border-white/10 text-[#A1A1AA] hover:bg-[#2A2A2A]'
                }`}
              >
                Este Mês
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <p className="text-[#71717A] text-sm mb-2">Total Leads</p>
              <p className="text-white text-3xl font-bold mb-2">{leads.length}</p>
              <div className="flex items-center gap-1 text-sm">
                <ArrowUp className="h-4 w-4 text-[#4ADE80]" />
                <span className="text-[#4ADE80]">No período</span>
                <span className="text-[#71717A]">selecionado</span>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <p className="text-[#71717A] text-sm mb-2">Convertidos</p>
              <p className="text-white text-3xl font-bold mb-2">
                {leads.filter(l => l.status === 'fechado_ganho').length}
              </p>
              <div className="flex items-center gap-1 text-sm">
                <ArrowUp className="h-4 w-4 text-[#4ADE80]" />
                <span className="text-[#4ADE80]">
                  {leads.length > 0 
                    ? ((leads.filter(l => l.status === 'fechado_ganho').length / leads.length) * 100).toFixed(1)
                    : '0'
                  }%
                </span>
                <span className="text-[#71717A]">taxa conversão</span>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <p className="text-[#71717A] text-sm mb-2">Em Andamento</p>
              <p className="text-white text-3xl font-bold mb-2">
                {leads.filter(l => !['fechado_ganho', 'fechado_perdido'].includes(l.status)).length}
              </p>
              <div className="flex items-center gap-1 text-sm">
                <ArrowUp className="h-4 w-4 text-[#4ADE80]" />
                <span className="text-[#4ADE80]">
                  {leads.filter(l => l.status === 'qualificado').length} qualificados
                </span>
                <span className="text-[#71717A]">+ {leads.filter(l => l.status === 'interessado').length} interessados</span>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <p className="text-[#71717A] text-sm mb-2">Valor Potencial</p>
              <p className="text-white text-3xl font-bold mb-2">
                R$ {leads.reduce((sum, l) => sum + (l.valor_potencial || 0), 0).toLocaleString('pt-BR')}
              </p>
              <div className="flex items-center gap-1 text-sm">
                <ArrowUp className="h-4 w-4 text-[#4ADE80]" />
                <span className="text-[#4ADE80]">
                  {leads.filter(l => l.valor_potencial && l.valor_potencial > 0).length} leads
                </span>
                <span className="text-[#71717A]">com valor</span>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-[#1A1A1A] rounded-2xl p-4 lg:p-6 mb-8">
            <div className="flex flex-wrap gap-2 lg:gap-4 items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-[#1E1E1E] border-white/10 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1E1E] border-white/10">
                  <SelectItem value="all" className="text-white">Todos os Status</SelectItem>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status.value} value={status.value} className="text-white">
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={closerFilter} onValueChange={setCloserFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-[#1E1E1E] border-white/10 text-white">
                  <SelectValue placeholder="Closer" />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1E1E] border-white/10">
                  <SelectItem value="all" className="text-white">Todos os Closers</SelectItem>
                  <SelectItem value="unassigned" className="text-white">Não Atribuídos</SelectItem>
                  {closers.map(closer => (
                    <SelectItem key={closer.id} value={closer.id} className="text-white">
                      {closer.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                onClick={() => setShowMyLeadsOnly(!showMyLeadsOnly)}
                className={`flex items-center px-3 lg:px-4 py-2 rounded-lg text-sm transition-colors ${
                  showMyLeadsOnly 
                    ? 'bg-[#4ADE80] text-black font-medium' 
                    : 'bg-[#1E1E1E] border border-white/10 text-[#A1A1AA] hover:bg-[#2A2A2A]'
                }`}
              >
                <User className="h-4 w-4 mr-1 lg:mr-2" />
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
                className={`flex items-center px-3 lg:px-4 py-2 rounded-lg text-sm transition-colors ${
                  showUnassignedOnly 
                    ? 'bg-[#4ADE80] text-black font-medium' 
                    : 'bg-[#1E1E1E] border border-white/10 text-[#A1A1AA] hover:bg-[#2A2A2A]'
                }`}
              >
                <UserX className="h-4 w-4 mr-1 lg:mr-2" />
                <span className="hidden sm:inline">{showUnassignedOnly ? 'Todos os Leads' : 'Leads Sem SDR'}</span>
                <span className="sm:hidden">{showUnassignedOnly ? 'Todos' : 'S/SDR'}</span>
              </button>

              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <button 
                    onClick={resetForm}
                    className="flex items-center px-3 lg:px-4 py-2 bg-[#4ADE80] text-black rounded-lg hover:bg-[#10B981] transition-colors text-sm font-medium"
                  >
                    <Plus className="h-4 w-4 mr-1 lg:mr-2" />
                    <span className="hidden sm:inline">Novo Lead</span>
                    <span className="sm:hidden">Novo</span>
                  </button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>

          {/* Tabela de Leads */}
          <div className="bg-[#1A1A1A] rounded-2xl p-4 lg:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-semibold">
                Leads ({filteredLeads.length})
              </h3>
              <button>
                <MoreHorizontal className="h-5 w-5 text-[#71717A]" />
              </button>
            </div>

            <div className="overflow-x-auto -mx-4 lg:mx-0">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-2 lg:px-4 text-[#71717A] text-xs uppercase tracking-wider font-medium">Nome</th>
                    <th className="text-left py-3 px-2 lg:px-4 text-[#71717A] text-xs uppercase tracking-wider font-medium hidden md:table-cell">Contato</th>
                    <th className="text-left py-3 px-2 lg:px-4 text-[#71717A] text-xs uppercase tracking-wider font-medium">Status</th>
                    <th className="text-left py-3 px-2 lg:px-4 text-[#71717A] text-xs uppercase tracking-wider font-medium hidden lg:table-cell">Temperatura</th>
                    <th className="text-left py-3 px-2 lg:px-4 text-[#71717A] text-xs uppercase tracking-wider font-medium hidden lg:table-cell">Valor</th>
                    <th className="text-left py-3 px-2 lg:px-4 text-[#71717A] text-xs uppercase tracking-wider font-medium hidden lg:table-cell">Closer</th>
                    <th className="text-center py-3 px-2 lg:px-4 text-[#71717A] text-xs uppercase tracking-wider font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead, index) => (
                    <tr key={lead.id} className="hover:bg-[#4ADE80]/5 transition-colors">
                      <td className="py-4 px-2 lg:px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#1E1E1E] rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-[#4ADE80]" />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{lead.nome_completo}</p>
                            <p className="text-[#71717A] text-xs">{lead.cargo || lead.empresa || 'Lead'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2 lg:px-4 hidden md:table-cell">
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center text-sm text-[#A1A1AA]">
                              <Mail className="h-3 w-3 mr-2" />
                              <span className="truncate max-w-[150px]">{lead.email}</span>
                            </div>
                          )}
                          {lead.telefone && (
                            <div className="flex items-center text-sm text-[#A1A1AA]">
                              <Phone className="h-3 w-3 mr-2" />
                              {lead.telefone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-2 lg:px-4">
                        {getStatusBadge(lead.status)}
                      </td>
                      <td className="py-4 px-2 lg:px-4 hidden lg:table-cell">
                        {getTemperaturaBadge(lead.temperatura)}
                      </td>
                      <td className="py-4 px-2 lg:px-4 hidden lg:table-cell">
                        {lead.valor_potencial && (
                          <div className="flex items-center text-sm text-white">
                            <DollarSign className="h-3 w-3 mr-1 text-[#4ADE80]" />
                            R$ {lead.valor_potencial.toLocaleString('pt-BR')}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-2 lg:px-4 hidden lg:table-cell">
                        <span className="text-[#A1A1AA] text-sm">
                          {lead.closers?.nome_completo || 'Não atribuído'}
                        </span>
                      </td>
                      <td className="py-4 px-2 lg:px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(lead)}
                            className="p-1 text-[#A1A1AA] hover:text-[#4ADE80] transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-1 text-[#A1A1AA] hover:text-red-400 transition-colors"
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
              <div className="text-center py-8">
                <User className="h-12 w-12 mx-auto text-[#71717A] mb-4" />
                <p className="text-[#71717A]">Nenhum lead encontrado</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Sidebar Direita */}
      <aside className="hidden xl:block w-80 bg-[#0F0F0F] border-l border-white/10 p-6 overflow-y-auto">
        <div className="mb-8">
          <h3 className="text-white text-lg font-semibold mb-4">Estatísticas</h3>
          <div className="space-y-3">
            {STATUS_OPTIONS.slice(0, 5).map((status) => {
              const count = leads.filter(l => l.status === status.value).length
              return (
                <div key={status.value} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                    <span className="text-[#A1A1AA] text-sm">{status.label}</span>
                  </div>
                  <span className="text-white font-medium">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-white text-lg font-semibold mb-4">Ações Rápidas</h3>
          <div className="space-y-2">
            <button
              onClick={loadLeads}
              className="w-full flex items-center gap-2 p-3 bg-[#1A1A1A] rounded-lg text-[#A1A1AA] hover:bg-[#2A2A2A] transition-colors text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar Leads
            </button>
            <button className="w-full flex items-center gap-2 p-3 bg-[#1A1A1A] rounded-lg text-[#A1A1AA] hover:bg-[#2A2A2A] transition-colors text-sm">
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
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
        <DialogContent className="max-w-4xl bg-[#1A1A1A] border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedLead ? 'Editar Lead' : 'Criar Novo Lead'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Nome Completo *</Label>
              <Input
                value={formData.nome_completo}
                onChange={(e) => setFormData({...formData, nome_completo: e.target.value})}
                placeholder="Nome completo"
                className="bg-[#1E1E1E] border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Email</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Email"
                type="email"
                className="bg-[#1E1E1E] border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Telefone</Label>
              <Input
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                placeholder="Telefone"
                className="bg-[#1E1E1E] border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Empresa</Label>
              <Input
                value={formData.empresa}
                onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                placeholder="Empresa"
                className="bg-[#1E1E1E] border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger className="bg-[#1E1E1E] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1E1E] border-white/10">
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status.value} value={status.value} className="text-white">
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white">Valor Potencial</Label>
              <Input
                value={formData.valor_potencial}
                onChange={(e) => setFormData({...formData, valor_potencial: e.target.value})}
                placeholder="0"
                type="number"
                className="bg-[#1E1E1E] border-white/10 text-white"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
            <button 
              onClick={() => {
                setIsCreateModalOpen(false)
                setIsEditModalOpen(false)
                setSelectedLead(null)
                resetForm()
              }}
              className="w-full sm:w-auto px-4 py-2 bg-[#1E1E1E] text-[#A1A1AA] rounded-lg hover:bg-[#2A2A2A] transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={selectedLead ? handleUpdateLead : handleCreateLead}
              className="w-full sm:w-auto px-4 py-2 bg-[#4ADE80] text-black rounded-lg hover:bg-[#10B981] transition-colors font-medium"
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