'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Building, 
  DollarSign,
  CheckCircle,
  AlertCircle,
  XCircle,
  Edit,
  Eye,
  Plus,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Settings,
  Video,
  FileText,
  Target,
  BarChart3,
  BookOpen,
  Menu,
  X as CloseIcon
} from 'lucide-react'
import { CloserAuthProvider, useCloserAuth } from '@/contexts/closer-auth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Appointment {
  id: string
  lead_id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  appointment_type: string
  title?: string
  description?: string
  notes?: string
  call_preparation_notes?: string
  lead_background_info?: string
  post_call_summary?: string
  outcome?: string
  lead_name: string
  lead_email?: string
  lead_phone?: string
  lead_company?: string
  lead_score?: number
  temperatura?: string
  valor_potencial?: number
  meeting_url?: string
  created_at: string
}

interface AvailableSlot {
  slot_date: string
  start_time: string
  end_time: string
  is_available: boolean
}

const STATUS_COLORS = {
  'agendado': 'bg-blue-500',
  'confirmado': 'bg-green-500',
  'em_andamento': 'bg-yellow-500',
  'concluido': 'bg-purple-500',
  'cancelado': 'bg-red-500',
  'no_show': 'bg-gray-500',
  'reagendado': 'bg-orange-500'
}

const APPOINTMENT_TYPES = [
  { value: 'qualificacao', label: 'Qualificação' },
  { value: 'apresentacao', label: 'Apresentação' },
  { value: 'fechamento', label: 'Fechamento' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'consultoria', label: 'Consultoria' }
]

function AgendaPageContent() {
  const { closer, loading: authLoading } = useCloserAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    lead_id: '',
    appointment_date: '',
    start_time: '',
    end_time: '',
    appointment_type: 'qualificacao',
    title: '',
    description: '',
    call_preparation_notes: '',
    lead_background_info: ''
  })

  useEffect(() => {
    if (closer) {
      loadAppointments()
      loadAvailableSlots()
    }
  }, [closer, selectedDate])

  const loadAppointments = async () => {
    if (!closer) return

    try {
      setLoading(true)
      
      // Buscar agendamentos da semana atual
      const startOfWeek = new Date(selectedDate)
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)

      const { data, error } = await supabase
        .from('v_closer_agenda')
        .select('*')
        .eq('closer_id', closer.id)
        .gte('appointment_date', startOfWeek.toISOString().split('T')[0])
        .lte('appointment_date', endOfWeek.toISOString().split('T')[0])
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error loading appointments:', error)
        toast.error('Erro ao carregar agendamentos')
      } else {
        setAppointments(data || [])
      }
    } catch (error) {
      console.error('Error loading appointments:', error)
      toast.error('Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableSlots = async () => {
    if (!closer) return

    try {
      const startDate = new Date(selectedDate)
      const endDate = new Date(selectedDate)
      endDate.setDate(startDate.getDate() + 7)

      const { data, error } = await supabase
        .rpc('get_available_slots', {
          p_closer_id: closer.id,
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate.toISOString().split('T')[0],
          p_duration_minutes: 60
        })

      if (error) {
        console.error('Error loading available slots:', error)
      } else {
        setAvailableSlots(data || [])
      }
    } catch (error) {
      console.error('Error loading available slots:', error)
    }
  }

  const handleCreateAppointment = async () => {
    if (!closer || !formData.appointment_date || !formData.start_time) {
      toast.error('Data e horário são obrigatórios')
      return
    }

    try {
      // Calcular horário de fim baseado na duração padrão (60min)
      const startTime = new Date(`${formData.appointment_date}T${formData.start_time}`)
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)
      
      const appointmentData = {
        ...formData,
        closer_id: closer.id,
        organization_id: closer.organization_id,
        end_time: endTime.toTimeString().split(' ')[0].substring(0, 5),
        status: 'agendado',
        created_by: closer.id
      }

      const { error } = await supabase
        .from('appointments')
        .insert(appointmentData)

      if (error) throw error

      toast.success('Agendamento criado com sucesso!')
      setIsCreateModalOpen(false)
      resetForm()
      loadAppointments()
    } catch (error) {
      console.error('Error creating appointment:', error)
      toast.error('Erro ao criar agendamento')
    }
  }

  const handleUpdateAppointment = async () => {
    if (!selectedAppointment) return

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAppointment.id)

      if (error) throw error

      toast.success('Agendamento atualizado!')
      setIsEditModalOpen(false)
      resetForm()
      setSelectedAppointment(null)
      loadAppointments()
    } catch (error) {
      console.error('Error updating appointment:', error)
      toast.error('Erro ao atualizar agendamento')
    }
  }

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)

      if (error) throw error

      toast.success('Status atualizado!')
      loadAppointments()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  const resetForm = () => {
    setFormData({
      lead_id: '',
      appointment_date: '',
      start_time: '',
      end_time: '',
      appointment_type: 'qualificacao',
      title: '',
      description: '',
      call_preparation_notes: '',
      lead_background_info: ''
    })
  }

  const openEditModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setFormData({
      lead_id: appointment.lead_id || '',
      appointment_date: appointment.appointment_date,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      appointment_type: appointment.appointment_type || 'qualificacao',
      title: appointment.title || '',
      description: appointment.description || '',
      call_preparation_notes: appointment.call_preparation_notes || '',
      lead_background_info: appointment.lead_background_info || ''
    })
    setIsEditModalOpen(true)
  }

  const openViewModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setIsViewModalOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const colorClass = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-500'
    const label = status.replace('_', ' ').toUpperCase()
    
    return (
      <Badge className={`${colorClass} text-white text-xs`}>
        {label}
      </Badge>
    )
  }

  const getTemperaturaBadge = (temperatura?: string) => {
    if (!temperatura) return null
    
    const colors = {
      'quente': 'bg-red-500',
      'morno': 'bg-yellow-500',
      'frio': 'bg-blue-500',
      'desqualificado': 'bg-gray-500'
    }
    
    const colorClass = colors[temperatura as keyof typeof colors] || 'bg-gray-500'
    
    return (
      <Badge className={`${colorClass} text-white text-xs`}>
        {temperatura.charAt(0).toUpperCase() + temperatura.slice(1)}
      </Badge>
    )
  }

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7))
    setSelectedDate(newDate)
  }

  const filteredAppointments = appointments.filter(appointment => {
    if (statusFilter === 'all') return true
    return appointment.status === statusFilter
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
              Você precisa estar logado como Closer para acessar esta página.
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
          <span className="text-white font-semibold">Agenda</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          {sidebarOpen ? <CloseIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar */}
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
        </div>

        <div className="flex-1 px-6 pt-6 lg:pt-0">
          {/* NAVEGAÇÃO */}
          <div className="mb-8">
            <h3 className="text-[#71717A] text-xs uppercase tracking-wider font-medium mb-4">NAVEGAÇÃO</h3>
            <nav className="space-y-1">
              <Link href="/closer" className="flex items-center gap-3 px-4 py-2 rounded-lg text-[#A1A1AA] hover:bg-white/5 transition-colors" onClick={() => setSidebarOpen(false)}>
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm">Dashboard</span>
              </Link>
              <Link href="/closer/leads" className="flex items-center gap-3 px-4 py-2 rounded-lg text-[#A1A1AA] hover:bg-white/5 transition-colors" onClick={() => setSidebarOpen(false)}>
                <User className="h-4 w-4" />
                <span className="text-sm">Leads</span>
              </Link>
              <a 
                href="#" 
                className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[#4ADE80]/10 border-l-4 border-[#4ADE80] text-[#4ADE80] transition-colors"
              >
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Agenda</span>
              </a>
              <Link href="/closer/availability" className="flex items-center gap-3 px-4 py-2 rounded-lg text-[#A1A1AA] hover:bg-white/5 transition-colors" onClick={() => setSidebarOpen(false)}>
                <Clock className="h-4 w-4" />
                <span className="text-sm">Disponibilidade</span>
              </Link>
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

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 lg:p-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
            <div>
              <nav className="text-[#71717A] text-sm mb-2">
                <span>Dashboard</span> <span className="mx-2">/</span> <span>Agenda</span>
              </nav>
              <h1 className="text-xl lg:text-2xl font-bold text-white">Minha Agenda</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 bg-[#1E1E1E] border border-white/10 rounded-lg text-[#A1A1AA] hover:bg-[#2A2A2A] transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-4 py-2 bg-[#1E1E1E] border border-white/10 rounded-lg text-white text-sm">
                {formatDate(selectedDate.toISOString())}
              </span>
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 bg-[#1E1E1E] border border-white/10 rounded-lg text-[#A1A1AA] hover:bg-[#2A2A2A] transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <button 
                    onClick={resetForm}
                    className="flex items-center px-3 lg:px-4 py-2 bg-[#4ADE80] text-black rounded-lg hover:bg-[#10B981] transition-colors text-sm font-medium"
                  >
                    <Plus className="h-4 w-4 mr-1 lg:mr-2" />
                    <span className="hidden sm:inline">Novo Agendamento</span>
                    <span className="sm:hidden">Novo</span>
                  </button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <p className="text-[#71717A] text-sm mb-2">Hoje</p>
              <p className="text-white text-3xl font-bold mb-2">
                {appointments.filter(a => a.appointment_date === new Date().toISOString().split('T')[0]).length}
              </p>
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4 text-[#4ADE80]" />
                <span className="text-[#4ADE80]">agendamentos</span>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <p className="text-[#71717A] text-sm mb-2">Esta Semana</p>
              <p className="text-white text-3xl font-bold mb-2">{appointments.length}</p>
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="h-4 w-4 text-[#4ADE80]" />
                <span className="text-[#4ADE80]">
                  {appointments.filter(a => a.status === 'concluido').length} concluídos
                </span>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <p className="text-[#71717A] text-sm mb-2">Taxa Conversão</p>
              <p className="text-white text-3xl font-bold mb-2">
                {appointments.length > 0 
                  ? ((appointments.filter(a => a.outcome === 'fechado').length / appointments.length) * 100).toFixed(1)
                  : '0'
                }%
              </p>
              <div className="flex items-center gap-1 text-sm">
                <Target className="h-4 w-4 text-[#4ADE80]" />
                <span className="text-[#4ADE80]">
                  {appointments.filter(a => a.outcome === 'fechado').length} vendas
                </span>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <p className="text-[#71717A] text-sm mb-2">Valor Potencial</p>
              <p className="text-white text-3xl font-bold mb-2">
                R$ {appointments.reduce((sum, a) => sum + (a.valor_potencial || 0), 0).toLocaleString('pt-BR')}
              </p>
              <div className="flex items-center gap-1 text-sm">
                <DollarSign className="h-4 w-4 text-[#4ADE80]" />
                <span className="text-[#4ADE80]">em pipeline</span>
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
                  <SelectItem value="agendado" className="text-white">Agendado</SelectItem>
                  <SelectItem value="confirmado" className="text-white">Confirmado</SelectItem>
                  <SelectItem value="em_andamento" className="text-white">Em Andamento</SelectItem>
                  <SelectItem value="concluido" className="text-white">Concluído</SelectItem>
                  <SelectItem value="cancelado" className="text-white">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <button
                onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
                className={`flex items-center px-3 lg:px-4 py-2 rounded-lg text-sm transition-colors ${
                  viewMode === 'calendar' 
                    ? 'bg-[#4ADE80] text-black font-medium' 
                    : 'bg-[#1E1E1E] border border-white/10 text-[#A1A1AA] hover:bg-[#2A2A2A]'
                }`}
              >
                <Calendar className="h-4 w-4 mr-1 lg:mr-2" />
                <span className="hidden sm:inline">{viewMode === 'calendar' ? 'Visualização em Lista' : 'Visualização em Calendário'}</span>
                <span className="sm:hidden">{viewMode === 'calendar' ? 'Lista' : 'Calendário'}</span>
              </button>
            </div>
          </div>

          {/* Lista de Agendamentos */}
          <div className="bg-[#1A1A1A] rounded-2xl p-4 lg:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-semibold">
                Agendamentos ({filteredAppointments.length})
              </h3>
            </div>

            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <div 
                  key={appointment.id} 
                  className="bg-[#0F0F0F] rounded-xl p-4 lg:p-6 border border-white/10 hover:border-[#4ADE80]/30 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                        <h4 className="text-white font-semibold text-lg">{appointment.lead_name}</h4>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(appointment.status)}
                          {getTemperaturaBadge(appointment.temperatura)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                          <Calendar className="h-4 w-4" />
                          {formatDate(appointment.appointment_date)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                          <Clock className="h-4 w-4" />
                          {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                        </div>
                        {appointment.lead_phone && (
                          <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                            <Phone className="h-4 w-4" />
                            {appointment.lead_phone}
                          </div>
                        )}
                        {appointment.valor_potencial && (
                          <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                            <DollarSign className="h-4 w-4" />
                            R$ {appointment.valor_potencial.toLocaleString('pt-BR')}
                          </div>
                        )}
                      </div>

                      {appointment.title && (
                        <p className="text-[#A1A1AA] text-sm mb-2">
                          <strong>Assunto:</strong> {appointment.title}
                        </p>
                      )}

                      {appointment.call_preparation_notes && (
                        <p className="text-[#A1A1AA] text-sm">
                          <strong>Preparação:</strong> {appointment.call_preparation_notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 lg:flex-col lg:gap-1">
                      <button
                        onClick={() => openViewModal(appointment)}
                        className="p-2 text-[#A1A1AA] hover:text-[#4ADE80] transition-colors"
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(appointment)}
                        className="p-2 text-[#A1A1AA] hover:text-[#4ADE80] transition-colors"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {appointment.meeting_url && (
                        <a
                          href={appointment.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-[#A1A1AA] hover:text-[#4ADE80] transition-colors"
                          title="Entrar na reunião"
                        >
                          <Video className="h-4 w-4" />
                        </a>
                      )}
                      <Select
                        value={appointment.status}
                        onValueChange={(value) => handleStatusUpdate(appointment.id, value)}
                      >
                        <SelectTrigger className="w-[120px] bg-[#1E1E1E] border-white/10 text-white text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1E1E1E] border-white/10">
                          <SelectItem value="agendado" className="text-white text-xs">Agendado</SelectItem>
                          <SelectItem value="confirmado" className="text-white text-xs">Confirmado</SelectItem>
                          <SelectItem value="em_andamento" className="text-white text-xs">Em Andamento</SelectItem>
                          <SelectItem value="concluido" className="text-white text-xs">Concluído</SelectItem>
                          <SelectItem value="cancelado" className="text-white text-xs">Cancelado</SelectItem>
                          <SelectItem value="no_show" className="text-white text-xs">No Show</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}

              {filteredAppointments.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-[#71717A] mb-4" />
                  <p className="text-[#71717A]">Nenhum agendamento encontrado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Criar/Editar Agendamento */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false)
          setIsEditModalOpen(false)
          setSelectedAppointment(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-4xl bg-[#1A1A1A] border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedAppointment ? 'Editar Agendamento' : 'Criar Novo Agendamento'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Data *</Label>
              <Input
                type="date"
                value={formData.appointment_date}
                onChange={(e) => setFormData({...formData, appointment_date: e.target.value})}
                className="bg-[#1E1E1E] border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Horário de Início *</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                className="bg-[#1E1E1E] border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Tipo de Agendamento</Label>
              <Select value={formData.appointment_type} onValueChange={(value) => setFormData({...formData, appointment_type: value})}>
                <SelectTrigger className="bg-[#1E1E1E] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1E1E] border-white/10">
                  {APPOINTMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value} className="text-white">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white">Título</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Título do agendamento"
                className="bg-[#1E1E1E] border-white/10 text-white"
              />
            </div>
            <div className="lg:col-span-2">
              <Label className="text-white">Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descrição do agendamento"
                className="bg-[#1E1E1E] border-white/10 text-white"
                rows={3}
              />
            </div>
            <div className="lg:col-span-2">
              <Label className="text-white">Notas de Preparação</Label>
              <Textarea
                value={formData.call_preparation_notes}
                onChange={(e) => setFormData({...formData, call_preparation_notes: e.target.value})}
                placeholder="Informações importantes para a call..."
                className="bg-[#1E1E1E] border-white/10 text-white"
                rows={3}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
            <button 
              onClick={() => {
                setIsCreateModalOpen(false)
                setIsEditModalOpen(false)
                setSelectedAppointment(null)
                resetForm()
              }}
              className="w-full sm:w-auto px-4 py-2 bg-[#1E1E1E] text-[#A1A1AA] rounded-lg hover:bg-[#2A2A2A] transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={selectedAppointment ? handleUpdateAppointment : handleCreateAppointment}
              className="w-full sm:w-auto px-4 py-2 bg-[#4ADE80] text-black rounded-lg hover:bg-[#10B981] transition-colors font-medium"
            >
              {selectedAppointment ? 'Atualizar' : 'Criar'} Agendamento
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizar Agendamento */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl bg-[#1A1A1A] border-white/10">
          {selectedAppointment && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">Detalhes do Agendamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#71717A] text-sm">Lead</Label>
                    <p className="text-white">{selectedAppointment.lead_name}</p>
                  </div>
                  <div>
                    <Label className="text-[#71717A] text-sm">Data e Horário</Label>
                    <p className="text-white">
                      {formatDate(selectedAppointment.appointment_date)} às {formatTime(selectedAppointment.start_time)}
                    </p>
                  </div>
                </div>
                
                {selectedAppointment.lead_phone && (
                  <div>
                    <Label className="text-[#71717A] text-sm">Telefone</Label>
                    <p className="text-white">{selectedAppointment.lead_phone}</p>
                  </div>
                )}
                
                {selectedAppointment.lead_email && (
                  <div>
                    <Label className="text-[#71717A] text-sm">Email</Label>
                    <p className="text-white">{selectedAppointment.lead_email}</p>
                  </div>
                )}

                {selectedAppointment.call_preparation_notes && (
                  <div>
                    <Label className="text-[#71717A] text-sm">Notas de Preparação</Label>
                    <p className="text-white">{selectedAppointment.call_preparation_notes}</p>
                  </div>
                )}

                {selectedAppointment.post_call_summary && (
                  <div>
                    <Label className="text-[#71717A] text-sm">Resumo Pós-Call</Label>
                    <p className="text-white">{selectedAppointment.post_call_summary}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedAppointment.status)}
                    {getTemperaturaBadge(selectedAppointment.temperatura)}
                  </div>
                  
                  {selectedAppointment.valor_potencial && (
                    <div className="text-right">
                      <Label className="text-[#71717A] text-sm">Valor Potencial</Label>
                      <p className="text-white font-bold">
                        R$ {selectedAppointment.valor_potencial.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CloserAgendaPage() {
  return (
    <CloserAuthProvider>
      <AgendaPageContent />
    </CloserAuthProvider>
  )
}