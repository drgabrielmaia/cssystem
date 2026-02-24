'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Calendar, 
  Clock, 
  User, 
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Settings,
  BarChart3,
  Menu,
  X as CloseIcon,
  CheckCircle,
  AlertCircle
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
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

interface CloserAvailability {
  id: string
  weekday?: number
  start_time: string
  end_time: string
  specific_date?: string
  is_active: boolean
  is_recurring: boolean
  slot_duration_minutes: number
  buffer_minutes: number
  max_daily_appointments?: number
  notes?: string
  created_at: string
  updated_at: string
}

interface ScheduleConfig {
  id: string
  default_meeting_duration_minutes: number
  default_buffer_minutes: number
  max_daily_appointments: number
  booking_advance_days: number
  booking_limit_days: number
  auto_confirm_appointments: boolean
  timezone: string
  meeting_url_template?: string
}

const WEEKDAYS = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' }
]

function AvailabilityPageContent() {
  const { closer, loading: authLoading } = useCloserAuth()
  const [availabilities, setAvailabilities] = useState<CloserAvailability[]>([])
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [selectedAvailability, setSelectedAvailability] = useState<CloserAvailability | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    weekday: '',
    start_time: '',
    end_time: '',
    specific_date: '',
    is_recurring: true,
    slot_duration_minutes: 60,
    buffer_minutes: 15,
    max_daily_appointments: '',
    notes: ''
  })

  // Config form state
  const [configData, setConfigData] = useState({
    default_meeting_duration_minutes: 60,
    default_buffer_minutes: 15,
    max_daily_appointments: 8,
    booking_advance_days: 1,
    booking_limit_days: 30,
    auto_confirm_appointments: false,
    timezone: 'America/Sao_Paulo',
    meeting_url_template: ''
  })

  useEffect(() => {
    if (closer) {
      loadAvailabilities()
      loadScheduleConfig()
    }
  }, [closer])

  const loadAvailabilities = async () => {
    if (!closer) return

    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('closer_availability')
        .select('*')
        .eq('closer_id', closer.id)
        .eq('organization_id', closer.organization_id)
        .order('weekday', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error loading availabilities:', error)
        toast.error('Erro ao carregar disponibilidades')
      } else {
        setAvailabilities(data || [])
      }
    } catch (error) {
      console.error('Error loading availabilities:', error)
      toast.error('Erro ao carregar disponibilidades')
    } finally {
      setLoading(false)
    }
  }

  const loadScheduleConfig = async () => {
    if (!closer) return

    try {
      const { data, error } = await supabase
        .from('closer_schedule_config')
        .select('*')
        .eq('closer_id', closer.id)
        .eq('organization_id', closer.organization_id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading schedule config:', error)
      } else if (data) {
        setScheduleConfig(data)
        setConfigData({
          default_meeting_duration_minutes: data.default_meeting_duration_minutes || 60,
          default_buffer_minutes: data.default_buffer_minutes || 15,
          max_daily_appointments: data.max_daily_appointments || 8,
          booking_advance_days: data.booking_advance_days || 1,
          booking_limit_days: data.booking_limit_days || 30,
          auto_confirm_appointments: data.auto_confirm_appointments || false,
          timezone: data.timezone || 'America/Sao_Paulo',
          meeting_url_template: data.meeting_url_template || ''
        })
      }
    } catch (error) {
      console.error('Error loading schedule config:', error)
    }
  }

  const handleCreateAvailability = async () => {
    if (!closer || !formData.start_time || !formData.end_time) {
      toast.error('Horário de início e fim são obrigatórios')
      return
    }

    if (formData.is_recurring && !formData.weekday) {
      toast.error('Dia da semana é obrigatório para disponibilidades recorrentes')
      return
    }

    if (!formData.is_recurring && !formData.specific_date) {
      toast.error('Data específica é obrigatória para disponibilidades pontuais')
      return
    }

    try {
      const availabilityData = {
        closer_id: closer.id,
        organization_id: closer.organization_id,
        weekday: formData.is_recurring ? parseInt(formData.weekday) : null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        specific_date: !formData.is_recurring ? formData.specific_date : null,
        is_recurring: formData.is_recurring,
        is_active: true,
        slot_duration_minutes: formData.slot_duration_minutes,
        buffer_minutes: formData.buffer_minutes,
        max_daily_appointments: formData.max_daily_appointments ? parseInt(formData.max_daily_appointments) : null,
        notes: formData.notes || null
      }

      const { error } = await supabase
        .from('closer_availability')
        .insert(availabilityData)

      if (error) throw error

      toast.success('Disponibilidade criada com sucesso!')
      setIsCreateModalOpen(false)
      resetForm()
      loadAvailabilities()
    } catch (error) {
      console.error('Error creating availability:', error)
      toast.error('Erro ao criar disponibilidade')
    }
  }

  const handleUpdateAvailability = async () => {
    if (!selectedAvailability) return

    try {
      const updateData = {
        weekday: formData.is_recurring ? parseInt(formData.weekday) : null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        specific_date: !formData.is_recurring ? formData.specific_date : null,
        is_recurring: formData.is_recurring,
        slot_duration_minutes: formData.slot_duration_minutes,
        buffer_minutes: formData.buffer_minutes,
        max_daily_appointments: formData.max_daily_appointments ? parseInt(formData.max_daily_appointments) : null,
        notes: formData.notes || null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('closer_availability')
        .update(updateData)
        .eq('id', selectedAvailability.id)

      if (error) throw error

      toast.success('Disponibilidade atualizada!')
      setIsEditModalOpen(false)
      resetForm()
      setSelectedAvailability(null)
      loadAvailabilities()
    } catch (error) {
      console.error('Error updating availability:', error)
      toast.error('Erro ao atualizar disponibilidade')
    }
  }

  const handleDeleteAvailability = async (availabilityId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta disponibilidade?')) return

    try {
      const { error } = await supabase
        .from('closer_availability')
        .delete()
        .eq('id', availabilityId)

      if (error) throw error

      toast.success('Disponibilidade excluída!')
      loadAvailabilities()
    } catch (error) {
      console.error('Error deleting availability:', error)
      toast.error('Erro ao excluir disponibilidade')
    }
  }

  const handleToggleAvailability = async (availabilityId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('closer_availability')
        .update({ 
          is_active: !isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', availabilityId)

      if (error) throw error

      toast.success(`Disponibilidade ${!isActive ? 'ativada' : 'desativada'}!`)
      loadAvailabilities()
    } catch (error) {
      console.error('Error toggling availability:', error)
      toast.error('Erro ao alterar disponibilidade')
    }
  }

  const handleSaveConfig = async () => {
    if (!closer) return

    try {
      const configPayload = {
        closer_id: closer.id,
        organization_id: closer.organization_id,
        ...configData,
        updated_at: new Date().toISOString()
      }

      if (scheduleConfig) {
        const { error } = await supabase
          .from('closer_schedule_config')
          .update(configPayload)
          .eq('id', scheduleConfig.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('closer_schedule_config')
          .insert(configPayload)

        if (error) throw error
      }

      toast.success('Configurações salvas!')
      setIsConfigModalOpen(false)
      loadScheduleConfig()
    } catch (error) {
      console.error('Error saving config:', error)
      toast.error('Erro ao salvar configurações')
    }
  }

  const resetForm = () => {
    setFormData({
      weekday: '',
      start_time: '',
      end_time: '',
      specific_date: '',
      is_recurring: true,
      slot_duration_minutes: 60,
      buffer_minutes: 15,
      max_daily_appointments: '',
      notes: ''
    })
  }

  const openEditModal = (availability: CloserAvailability) => {
    setSelectedAvailability(availability)
    setFormData({
      weekday: availability.weekday?.toString() || '',
      start_time: availability.start_time,
      end_time: availability.end_time,
      specific_date: availability.specific_date || '',
      is_recurring: availability.is_recurring,
      slot_duration_minutes: availability.slot_duration_minutes,
      buffer_minutes: availability.buffer_minutes,
      max_daily_appointments: availability.max_daily_appointments?.toString() || '',
      notes: availability.notes || ''
    })
    setIsEditModalOpen(true)
  }

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5)
  }

  const getWeekdayLabel = (weekday: number) => {
    const day = WEEKDAYS.find(w => w.value === weekday)
    return day ? day.label : 'Desconhecido'
  }

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
          <span className="text-white font-semibold">Disponibilidade</span>
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
              <Link href="/closer/agenda" className="flex items-center gap-3 px-4 py-2 rounded-lg text-[#A1A1AA] hover:bg-white/5 transition-colors" onClick={() => setSidebarOpen(false)}>
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Agenda</span>
              </Link>
              <a 
                href="#" 
                className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[#4ADE80]/10 border-l-4 border-[#4ADE80] text-[#4ADE80] transition-colors"
              >
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Disponibilidade</span>
              </a>
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
                <span>Dashboard</span> <span className="mx-2">/</span> <span>Disponibilidade</span>
              </nav>
              <h1 className="text-xl lg:text-2xl font-bold text-white">Minha Disponibilidade</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
                <DialogTrigger asChild>
                  <button className="flex items-center px-3 lg:px-4 py-2 bg-[#1E1E1E] border border-white/10 text-[#A1A1AA] rounded-lg hover:bg-[#2A2A2A] transition-colors text-sm">
                    <Settings className="h-4 w-4 mr-1 lg:mr-2" />
                    <span className="hidden sm:inline">Configurações</span>
                    <span className="sm:hidden">Config</span>
                  </button>
                </DialogTrigger>
              </Dialog>
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <button 
                    onClick={resetForm}
                    className="flex items-center px-3 lg:px-4 py-2 bg-[#4ADE80] text-black rounded-lg hover:bg-[#10B981] transition-colors text-sm font-medium"
                  >
                    <Plus className="h-4 w-4 mr-1 lg:mr-2" />
                    <span className="hidden sm:inline">Nova Disponibilidade</span>
                    <span className="sm:hidden">Nova</span>
                  </button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <p className="text-[#71717A] text-sm mb-2">Disponibilidades Ativas</p>
              <p className="text-white text-3xl font-bold mb-2">
                {availabilities.filter(a => a.is_active).length}
              </p>
              <div className="flex items-center gap-1 text-sm">
                <CheckCircle className="h-4 w-4 text-[#4ADE80]" />
                <span className="text-[#4ADE80]">configuradas</span>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <p className="text-[#71717A] text-sm mb-2">Horários Semanais</p>
              <p className="text-white text-3xl font-bold mb-2">
                {availabilities.filter(a => a.is_recurring && a.is_active).length}
              </p>
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4 text-[#4ADE80]" />
                <span className="text-[#4ADE80]">recorrentes</span>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <p className="text-[#71717A] text-sm mb-2">Duração Padrão</p>
              <p className="text-white text-3xl font-bold mb-2">
                {configData.default_meeting_duration_minutes}min
              </p>
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="h-4 w-4 text-[#4ADE80]" />
                <span className="text-[#4ADE80]">por reunião</span>
              </div>
            </div>
          </div>

          {/* Lista de Disponibilidades */}
          <div className="bg-[#1A1A1A] rounded-2xl p-4 lg:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-semibold">
                Horários Configurados ({availabilities.length})
              </h3>
            </div>

            <div className="space-y-4">
              {availabilities.map((availability) => (
                <div 
                  key={availability.id} 
                  className="bg-[#0F0F0F] rounded-xl p-4 lg:p-6 border border-white/10 hover:border-[#4ADE80]/30 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                        <h4 className="text-white font-semibold text-lg">
                          {availability.is_recurring 
                            ? getWeekdayLabel(availability.weekday!) 
                            : `Data específica: ${new Date(availability.specific_date!).toLocaleDateString('pt-BR')}`
                          }
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge className={`${availability.is_active ? 'bg-green-500' : 'bg-gray-500'} text-white text-xs`}>
                            {availability.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <Badge className="bg-blue-500 text-white text-xs">
                            {availability.is_recurring ? 'Recorrente' : 'Único'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                          <Clock className="h-4 w-4" />
                          {formatTime(availability.start_time)} - {formatTime(availability.end_time)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                          <Calendar className="h-4 w-4" />
                          {availability.slot_duration_minutes}min por slot
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                          <Clock className="h-4 w-4" />
                          {availability.buffer_minutes}min de intervalo
                        </div>
                        {availability.max_daily_appointments && (
                          <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                            <User className="h-4 w-4" />
                            Máx {availability.max_daily_appointments} por dia
                          </div>
                        )}
                      </div>

                      {availability.notes && (
                        <p className="text-[#A1A1AA] text-sm">
                          <strong>Observações:</strong> {availability.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAvailability(availability.id, availability.is_active)}
                        className={`p-2 rounded-lg transition-colors ${
                          availability.is_active 
                            ? 'text-yellow-500 hover:bg-yellow-500/10' 
                            : 'text-green-500 hover:bg-green-500/10'
                        }`}
                        title={availability.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {availability.is_active ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => openEditModal(availability)}
                        className="p-2 text-[#A1A1AA] hover:text-[#4ADE80] transition-colors"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAvailability(availability.id)}
                        className="p-2 text-[#A1A1AA] hover:text-red-400 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {availabilities.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-[#71717A] mb-4" />
                  <p className="text-[#71717A]">Nenhuma disponibilidade configurada</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Criar/Editar Disponibilidade */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false)
          setIsEditModalOpen(false)
          setSelectedAvailability(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl bg-[#1A1A1A] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedAvailability ? 'Editar Disponibilidade' : 'Nova Disponibilidade'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({...formData, is_recurring: checked})}
              />
              <Label className="text-white">Horário recorrente (semanal)</Label>
            </div>

            {formData.is_recurring ? (
              <div>
                <Label className="text-white">Dia da Semana *</Label>
                <Select value={formData.weekday} onValueChange={(value) => setFormData({...formData, weekday: value})}>
                  <SelectTrigger className="bg-[#1E1E1E] border-white/10 text-white">
                    <SelectValue placeholder="Selecione o dia" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1E1E] border-white/10">
                    {WEEKDAYS.map(day => (
                      <SelectItem key={day.value} value={day.value.toString()} className="text-white">
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label className="text-white">Data Específica *</Label>
                <Input
                  type="date"
                  value={formData.specific_date}
                  onChange={(e) => setFormData({...formData, specific_date: e.target.value})}
                  className="bg-[#1E1E1E] border-white/10 text-white"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
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
                <Label className="text-white">Horário de Fim *</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  className="bg-[#1E1E1E] border-white/10 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Duração do Slot (minutos)</Label>
                <Input
                  type="number"
                  value={formData.slot_duration_minutes}
                  onChange={(e) => setFormData({...formData, slot_duration_minutes: parseInt(e.target.value) || 60})}
                  className="bg-[#1E1E1E] border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Intervalo entre Slots (minutos)</Label>
                <Input
                  type="number"
                  value={formData.buffer_minutes}
                  onChange={(e) => setFormData({...formData, buffer_minutes: parseInt(e.target.value) || 15})}
                  className="bg-[#1E1E1E] border-white/10 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-white">Máximo de Agendamentos por Dia</Label>
              <Input
                type="number"
                value={formData.max_daily_appointments}
                onChange={(e) => setFormData({...formData, max_daily_appointments: e.target.value})}
                placeholder="Deixe vazio para ilimitado"
                className="bg-[#1E1E1E] border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Notas sobre esta disponibilidade..."
                className="bg-[#1E1E1E] border-white/10 text-white"
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <button 
              onClick={() => {
                setIsCreateModalOpen(false)
                setIsEditModalOpen(false)
                setSelectedAvailability(null)
                resetForm()
              }}
              className="px-4 py-2 bg-[#1E1E1E] text-[#A1A1AA] rounded-lg hover:bg-[#2A2A2A] transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={selectedAvailability ? handleUpdateAvailability : handleCreateAvailability}
              className="px-4 py-2 bg-[#4ADE80] text-black rounded-lg hover:bg-[#10B981] transition-colors font-medium"
            >
              {selectedAvailability ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Configurações */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="max-w-2xl bg-[#1A1A1A] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Configurações de Agenda</DialogTitle>
            <DialogDescription className="text-[#71717A]">
              Configure as opções padrão para seus agendamentos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Duração Padrão (minutos)</Label>
                <Input
                  type="number"
                  value={configData.default_meeting_duration_minutes}
                  onChange={(e) => setConfigData({...configData, default_meeting_duration_minutes: parseInt(e.target.value) || 60})}
                  className="bg-[#1E1E1E] border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Intervalo Padrão (minutos)</Label>
                <Input
                  type="number"
                  value={configData.default_buffer_minutes}
                  onChange={(e) => setConfigData({...configData, default_buffer_minutes: parseInt(e.target.value) || 15})}
                  className="bg-[#1E1E1E] border-white/10 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Máximo por Dia</Label>
                <Input
                  type="number"
                  value={configData.max_daily_appointments}
                  onChange={(e) => setConfigData({...configData, max_daily_appointments: parseInt(e.target.value) || 8})}
                  className="bg-[#1E1E1E] border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Antecedência Mínima (dias)</Label>
                <Input
                  type="number"
                  value={configData.booking_advance_days}
                  onChange={(e) => setConfigData({...configData, booking_advance_days: parseInt(e.target.value) || 1})}
                  className="bg-[#1E1E1E] border-white/10 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-white">Limite de Agendamento (dias no futuro)</Label>
              <Input
                type="number"
                value={configData.booking_limit_days}
                onChange={(e) => setConfigData({...configData, booking_limit_days: parseInt(e.target.value) || 30})}
                className="bg-[#1E1E1E] border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-white">URL Template da Reunião</Label>
              <Input
                value={configData.meeting_url_template}
                onChange={(e) => setConfigData({...configData, meeting_url_template: e.target.value})}
                placeholder="https://meet.google.com/..."
                className="bg-[#1E1E1E] border-white/10 text-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={configData.auto_confirm_appointments}
                onCheckedChange={(checked) => setConfigData({...configData, auto_confirm_appointments: checked})}
              />
              <Label className="text-white">Confirmar agendamentos automaticamente</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button 
              onClick={() => setIsConfigModalOpen(false)}
              className="px-4 py-2 bg-[#1E1E1E] text-[#A1A1AA] rounded-lg hover:bg-[#2A2A2A] transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSaveConfig}
              className="flex items-center gap-2 px-4 py-2 bg-[#4ADE80] text-black rounded-lg hover:bg-[#10B981] transition-colors font-medium"
            >
              <Save className="h-4 w-4" />
              Salvar Configurações
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CloserAvailabilityPage() {
  return (
    <CloserAuthProvider>
      <AvailabilityPageContent />
    </CloserAuthProvider>
  )
}