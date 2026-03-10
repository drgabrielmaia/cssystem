'use client'

import { useState, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Users,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Send,
  Loader2
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { EditEventModal } from '@/components/edit-event-modal'
import { useAuth } from '@/contexts/auth'
import { whatsappNotifications } from '@/services/whatsapp-notifications'
import { generateWeeklyAgenda, generateDailyAgenda } from '@/services/agenda-generator'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start_datetime: string
  end_datetime: string
  all_day: boolean
  mentorado_id?: string
  lead_id?: string
  call_status?: string
  sale_value?: number
  result_notes?: string
  created_at: string
  mensagem_enviada?: boolean
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Função para notificar admin sobre novo evento (usando novo serviço)
const notifyAdminAboutNewEvent = async (eventData: any, organizationId: string) => {
  try {
    // Buscar o nome do lead ou mentorado se associado
    let leadName = ''
    let mentoradoName = ''

    if (eventData.lead_id) {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('nome_completo')
          .eq('id', eventData.lead_id)
          .single()
        if (!error && data) {
          leadName = data.nome_completo || ''
        }
      } catch (error) {
        console.warn('Erro ao buscar lead:', error)
      }
    }

    if (eventData.mentorado_id && !mentoradoName) {
      try {
        const { data, error } = await supabase
          .from('mentorados')
          .select('nome_completo')
          .eq('id', eventData.mentorado_id)
          .single()

        if (!error && data) {
          mentoradoName = data.nome_completo
        }
      } catch (error) {
        console.warn('Erro ao buscar mentorado:', error)
      }
    }

    // Formatar hora se não for evento de dia todo
    const eventTime = eventData.all_day 
      ? undefined 
      : new Date(eventData.start_datetime).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo'
        })

    // Usar novo serviço de notificações
    await whatsappNotifications.notifyEventCreated({
      organizationId,
      eventTitle: eventData.title,
      eventDate: eventData.start_datetime,
      eventTime,
      leadName: leadName || undefined,
      mentoradoName: mentoradoName || undefined,
      description: eventData.description || undefined
    })

    console.log('✅ Notificação enviada via novo serviço!')

  } catch (error) {
    console.error('❌ Erro ao enviar notificação para admin:', error)
    throw error
  }
}

export default function CalendarioPage() {
  const { organizationId } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [showNewEventModal, setShowNewEventModal] = useState(false)
  const [leads, setLeads] = useState<Array<{id: string, nome_completo: string}>>([])
  const [mentorados, setMentorados] = useState<Array<{id: string, nome_completo: string}>>([])
  const [isCreating, setIsCreating] = useState(false)
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})

  // Estados para edição
  const [showEditEventModal, setShowEditEventModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Estados para envio de agenda WhatsApp
  const [showAgendaModal, setShowAgendaModal] = useState(false)
  const [whatsappGroups, setWhatsappGroups] = useState<Array<{id: string, name: string}>>([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [agendaType, setAgendaType] = useState<'semana' | 'dia'>('semana')
  const [agendaPreview, setAgendaPreview] = useState('')
  const [isSendingAgenda, setIsSendingAgenda] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [linkedGroupId, setLinkedGroupId] = useState('')
  const [linkedGroupName, setLinkedGroupName] = useState('')

  // Closers
  const [closers, setClosers] = useState<Array<{id: string, nome_completo: string}>>([])

  // Estados para o formulário de novo evento
  const [newEventForm, setNewEventForm] = useState({
    title: '',
    description: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    all_day: false,
    lead_id: '',
    mentorado_id: '',
    closer_id: ''
  })

  const today = new Date()
  const todayEvents = Array.isArray(events) ? events.filter(event => {
    const eventDate = new Date(event.start_datetime)
    return eventDate.toDateString() === today.toDateString()
  }) : []

  const upcomingEvents = Array.isArray(events) ? events.filter(event => {
    const eventDate = new Date(event.start_datetime)
    return eventDate > today
  }).slice(0, 5) : []

  useEffect(() => {
    if (organizationId) {
      fetchEvents()
      loadLeads()
      loadMentorados()
      loadClosers()
      loadLinkedGroup()
    }
  }, [organizationId])

  const loadLinkedGroup = async () => {
    if (!organizationId) return
    try {
      const { data } = await supabase
        .from('organizations')
        .select('whatsapp_group_agenda')
        .eq('id', organizationId)
        .single()
      if (data?.whatsapp_group_agenda) {
        setLinkedGroupId(data.whatsapp_group_agenda)
      }
    } catch (err) {
      console.error('Erro ao carregar grupo vinculado:', err)
    }
  }

  const loadLeads = async () => {
    try {
      let query = supabase
        .from('leads')
        .select('id, nome_completo')
        .order('nome_completo')

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query
      if (!error && data) {
        setLeads(data.map((lead: any) => ({
          id: lead.id,
          nome_completo: lead.nome_completo
        })))
      }
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
    }
  }

  const loadMentorados = async () => {
    try {
      let query = supabase
        .from('mentorados')
        .select('id, nome_completo')
        .order('nome_completo')

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query

      if (error) throw error

      setMentorados(data || [])
    } catch (error) {
      console.error('Erro ao carregar mentorados:', error)
    }
  }

  const loadClosers = async () => {
    try {
      let query = supabase
        .from('closers')
        .select('id, nome_completo')
        .eq('ativo', true)
        .order('nome_completo')

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query
      if (!error && data) {
        setClosers(data)
      }
    } catch (error) {
      console.error('Erro ao carregar closers:', error)
    }
  }

  const fetchEvents = async () => {
    if (!organizationId) {
      console.log('⚠️ Aguardando organization_id...')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('🔄 Buscando eventos do calendário para organização:', organizationId)

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('organization_id', organizationId)
        .order('start_datetime', { ascending: true })

      if (error) {
        console.error('❌ Erro do Supabase:', error)
        throw error
      }

      console.log('✅ Eventos carregados:', data?.length || 0)
      setEvents(data || [])
    } catch (error) {
      console.error('❌ Erro ao carregar eventos:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const getEventsForDate = (date: Date | null) => {
    if (!date) return []
    return Array.isArray(events) ? events.filter(event => {
      const eventDate = new Date(event.start_datetime)
      return eventDate.toDateString() === date.toDateString()
    }) : []
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Sao_Paulo'
    })
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const handleNewEvent = () => {
    setNewEventForm({
      title: '',
      description: '',
      start_date: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
      start_time: '',
      end_date: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
      end_time: '',
      all_day: false,
      lead_id: 'none',
      mentorado_id: 'none',
      closer_id: 'none'
    })
    setFormErrors({})
    setShowNewEventModal(true)
  }

  const validateForm = () => {
    const errors: {[key: string]: string} = {}

    if (!newEventForm.title.trim()) {
      errors.title = 'Título é obrigatório'
    }

    if (!newEventForm.start_date) {
      errors.start_date = 'Data de início é obrigatória'
    }

    if (!newEventForm.all_day && newEventForm.start_time && newEventForm.end_time) {
      const startDateTime = new Date(`${newEventForm.start_date}T${newEventForm.start_time}:00-03:00`)
      const endDateTime = new Date(`${newEventForm.end_date || newEventForm.start_date}T${newEventForm.end_time}:00-03:00`)

      if (endDateTime <= startDateTime) {
        errors.end_time = 'Hora de fim deve ser posterior à hora de início'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateEvent = async () => {
    if (!validateForm()) {
      return
    }

    if (!organizationId) {
      alert('Erro: Organization ID não encontrado')
      return
    }

    try {
      setIsCreating(true)

      // Construir datetime strings com timezone de São Paulo
      const startDatetime = newEventForm.all_day
        ? `${newEventForm.start_date}T00:00:00-03:00`
        : `${newEventForm.start_date}T${newEventForm.start_time || '00:00'}:00-03:00`

      const endDatetime = newEventForm.all_day
        ? `${newEventForm.end_date || newEventForm.start_date}T23:59:59-03:00`
        : `${newEventForm.end_date || newEventForm.start_date}T${newEventForm.end_time || '23:59'}:00-03:00`

      const eventData = {
        title: newEventForm.title,
        description: newEventForm.description || null,
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        all_day: newEventForm.all_day,
        lead_id: newEventForm.lead_id === 'none' ? null : newEventForm.lead_id || null,
        mentorado_id: newEventForm.mentorado_id === 'none' ? null : newEventForm.mentorado_id || null,
        closer_id: newEventForm.closer_id === 'none' ? null : newEventForm.closer_id || null,
        organization_id: organizationId,
        created_at: new Date().toISOString()
      }

      console.log('🔄 Criando evento com organization_id:', organizationId)

      const { error } = await supabase
        .from('calendar_events')
        .insert([eventData])

      if (error) throw error

      // Enviar notificação WhatsApp para o admin
      try {
        console.log('🔄 Enviando notificação para admin...', eventData.title)
        await notifyAdminAboutNewEvent(eventData, organizationId)
        console.log('✅ Notificação enviada com sucesso!')
      } catch (notificationError) {
        console.warn('❌ Erro ao enviar notificação:', notificationError)
        // Não quebrar o fluxo se a notificação falhar
      }

      setShowNewEventModal(false)
      await fetchEvents()

      // Enviar agenda atualizada do dia ao grupo vinculado
      if (linkedGroupId && organizationId) {
        try {
          const agendaMsg = await generateDailyAgenda(organizationId)
          const apiUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'
          await fetch(`${apiUrl}/api/whatsapp/send-group`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId: linkedGroupId, message: agendaMsg })
          })
          console.log('✅ Agenda do dia enviada ao grupo vinculado')
        } catch (agendaErr) {
          console.warn('Erro ao enviar agenda ao grupo:', agendaErr)
        }
      }

      alert('Evento criado com sucesso!')
    } catch (error) {
      console.error('Erro ao criar evento:', error)
      alert('Erro ao criar evento')
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEditEventModal(true)
  }

  const handleEditSuccess = async () => {
    setShowEditEventModal(false)
    setSelectedEvent(null)
    await fetchEvents()
  }

  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (!confirm(`Tem certeza que deseja excluir o evento "${event.title}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', event.id)

      if (error) throw error

      await fetchEvents()
      alert('Evento excluído com sucesso!')
    } catch (error) {
      console.error('Erro ao excluir evento:', error)
      alert('Erro ao excluir evento')
    }
  }

  // ─── Agenda WhatsApp ────────────────────────────────────────
  const loadWhatsappGroups = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'
      const res = await fetch(`${apiUrl}/api/whatsapp/groups`)
      const json = await res.json()
      if (json.success && json.groups) {
        setWhatsappGroups(json.groups.map((g: any) => ({ id: g.id, name: g.name || g.subject || g.id })))
      }
    } catch (err) {
      console.error('Erro ao carregar grupos WhatsApp:', err)
    }
  }

  const handleOpenAgendaModal = async () => {
    setShowAgendaModal(true)
    setAgendaType('semana')
    setSelectedGroup('')
    setAgendaPreview('')
    loadWhatsappGroups()
  }

  const handleGeneratePreview = async () => {
    if (!organizationId) return
    setIsLoadingPreview(true)
    try {
      const msg = agendaType === 'semana'
        ? await generateWeeklyAgenda(organizationId)
        : await generateDailyAgenda(organizationId)
      setAgendaPreview(msg)
    } catch (err) {
      console.error('Erro ao gerar agenda:', err)
      setAgendaPreview('Erro ao gerar agenda.')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleSendAgenda = async () => {
    if (!selectedGroup || !agendaPreview) return
    setIsSendingAgenda(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'
      const res = await fetch(`${apiUrl}/api/whatsapp/send-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: selectedGroup, message: agendaPreview })
      })
      const result = await res.json()
      if (result.success) {
        alert('Agenda enviada com sucesso!')
        setShowAgendaModal(false)
      } else {
        alert('Erro ao enviar: ' + (result.error || 'Erro desconhecido'))
      }
    } catch {
      alert('Erro ao enviar agenda')
    } finally {
      setIsSendingAgenda(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500/30 border-t-emerald-500 mx-auto mb-3"></div>
          <p className="text-sm text-white/40">Carregando calendario...</p>
        </div>
      </div>
    )
  }

  const days = getDaysInMonth(currentDate)
  const selectedDateEvents = getEventsForDate(selectedDate)
  const completedEvents = Array.isArray(events) ? events.filter(e => e.call_status === 'completed').length : 0

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Calendario</h1>
              <p className="text-sm text-white/40 mt-0.5">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAgendaModal}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium transition-colors border border-emerald-500/20"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Enviar Agenda</span>
              </button>
              <button
                onClick={handleNewEvent}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Evento</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <CalendarIcon className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{todayEvents.length}</p>
                <p className="text-xs text-white/40">Hoje</p>
              </div>
            </div>
          </div>
          <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{Array.isArray(events) ? events.length : 0}</p>
                <p className="text-xs text-white/40">Total</p>
              </div>
            </div>
          </div>
          <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{upcomingEvents.length}</p>
                <p className="text-xs text-white/40">Proximos</p>
              </div>
            </div>
          </div>
          <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <CheckCircle className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{completedEvents}</p>
                <p className="text-xs text-white/40">Concluidos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alert banner for today's events */}
        {todayEvents.length > 0 && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
            <div className="p-1.5 bg-emerald-500/20 rounded-lg">
              <CalendarIcon className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-300">Agenda de Hoje</p>
              <p className="text-xs text-emerald-400/60">{todayEvents.length} evento{todayEvents.length > 1 ? 's' : ''} agendado{todayEvents.length > 1 ? 's' : ''}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            <div className="bg-[#12121a] border border-white/[0.06] rounded-xl overflow-hidden">
              {/* Calendar Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <h2 className="text-lg font-semibold text-white">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={goToToday}
                    className="px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                  >
                    Hoje
                  </button>
                  <button
                    onClick={goToPreviousMonth}
                    className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-white/40" />
                  </button>
                  <button
                    onClick={goToNextMonth}
                    className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  </button>
                  <button
                    onClick={fetchEvents}
                    className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors ml-1"
                    title="Atualizar"
                  >
                    <RefreshCw className="w-4 h-4 text-white/40" />
                  </button>
                </div>
              </div>

              {/* Days of week header */}
              <div className="grid grid-cols-7 border-b border-white/[0.04]">
                {DAYS.map(day => (
                  <div key={day} className="py-2.5 text-center text-xs font-medium text-white/30 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7">
                {days.map((day, index) => {
                  const isToday = day && day.toDateString() === today.toDateString()
                  const isSelected = day && selectedDate && day.toDateString() === selectedDate.toDateString()
                  const dayEvents = day ? getEventsForDate(day) : []
                  const isWeekend = day && (day.getDay() === 0 || day.getDay() === 6)

                  return (
                    <div
                      key={index}
                      className={`
                        min-h-[72px] sm:min-h-[88px] p-1.5 sm:p-2 border-b border-r border-white/[0.04] cursor-pointer transition-all relative
                        ${day ? 'hover:bg-white/[0.03]' : ''}
                        ${isSelected ? 'bg-emerald-500/5 ring-1 ring-inset ring-emerald-500/30' : ''}
                        ${isWeekend && !isSelected ? 'bg-white/[0.01]' : ''}
                      `}
                      onClick={() => day && setSelectedDate(day)}
                    >
                      {day && (
                        <>
                          <div className={`
                            w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium mb-1
                            ${isToday ? 'bg-emerald-500 text-white' : 'text-white/60'}
                            ${isSelected && !isToday ? 'text-emerald-400' : ''}
                          `}>
                            {day.getDate()}
                          </div>
                          {dayEvents.length > 0 && (
                            <div className="space-y-0.5">
                              {dayEvents.slice(0, 2).map((event, i) => (
                                <div
                                  key={i}
                                  className="text-[10px] leading-tight px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 truncate hidden sm:block"
                                >
                                  {event.title}
                                </div>
                              ))}
                              {dayEvents.length > 2 && (
                                <div className="text-[10px] text-white/30 pl-1.5 hidden sm:block">
                                  +{dayEvents.length - 2} mais
                                </div>
                              )}
                              {/* Mobile dots */}
                              <div className="flex gap-0.5 sm:hidden mt-0.5">
                                {dayEvents.slice(0, 3).map((_, i) => (
                                  <div key={i} className="w-1 h-1 rounded-full bg-emerald-400" />
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Selected Day Events */}
            {selectedDate ? (
              <div className="bg-[#12121a] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white">Eventos do Dia</h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })}
                  </p>
                </div>
                <div className="p-4">
                  {selectedDateEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarIcon className="w-8 h-8 text-white/10 mx-auto mb-2" />
                      <p className="text-sm text-white/30">Nenhum evento neste dia</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedDateEvents.map((event) => (
                        <div key={event.id} className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg p-3 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-white truncate">{event.title}</h4>
                              {!event.all_day && (
                                <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(event.start_datetime)} - {formatTime(event.end_datetime)}
                                </p>
                              )}
                              {event.description && (
                                <p className="text-xs text-white/30 mt-1 line-clamp-2">{event.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditEvent(event)}
                                className="p-1.5 hover:bg-white/[0.08] rounded-md transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-3.5 h-3.5 text-white/40 hover:text-emerald-400" />
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(event)}
                                className="p-1.5 hover:bg-red-500/10 rounded-md transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-white/40 hover:text-red-400" />
                              </button>
                            </div>
                          </div>
                          {(event.call_status === 'completed' || event.sale_value) && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.04]">
                              {event.call_status === 'completed' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle className="w-2.5 h-2.5" />
                                  Concluido
                                </span>
                              )}
                              {event.sale_value && (
                                <span className="text-[10px] font-medium text-emerald-400">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(event.sale_value)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#12121a] border border-white/[0.06] rounded-xl p-8 text-center">
                <CalendarIcon className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-sm text-white/30">Selecione um dia no calendario</p>
                <p className="text-xs text-white/20 mt-1">para ver os eventos</p>
              </div>
            )}

            {/* Upcoming events */}
            <div className="bg-[#12121a] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white">Proximos Eventos</h3>
              </div>
              <div className="p-4">
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-6">
                    <Clock className="w-6 h-6 text-white/10 mx-auto mb-2" />
                    <p className="text-xs text-white/30">Nenhum evento proximo</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer"
                        onClick={() => {
                          const evDate = new Date(event.start_datetime)
                          setCurrentDate(new Date(evDate.getFullYear(), evDate.getMonth()))
                          setSelectedDate(evDate)
                        }}
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-emerald-500/10 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-[10px] text-emerald-400/60 uppercase leading-none">
                            {new Date(event.start_datetime).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '')}
                          </span>
                          <span className="text-sm font-bold text-emerald-400 leading-none mt-0.5">
                            {new Date(event.start_datetime).getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white truncate">{event.title}</h4>
                          <p className="text-xs text-white/30 mt-0.5">
                            {!event.all_day && formatTime(event.start_datetime)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Novo Evento */}
      <Dialog open={showNewEventModal} onOpenChange={setShowNewEventModal}>
        <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
              <div className="p-1.5 sm:p-2 bg-[#059669] rounded-lg">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="truncate">Criar Novo Evento</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-title">Título *</Label>
                <Input
                  id="event-title"
                  value={newEventForm.title}
                  onChange={(e) => {
                    setNewEventForm({ ...newEventForm, title: e.target.value })
                    if (formErrors.title) {
                      setFormErrors({ ...formErrors, title: '' })
                    }
                  }}
                  placeholder="Título do evento"
                  className={`${formErrors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                {formErrors.title && (
                  <p className="text-sm text-red-600">{formErrors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Lead (Opcional)</Label>
                <Select value={newEventForm.lead_id} onValueChange={(value) => setNewEventForm({ ...newEventForm, lead_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum lead</SelectItem>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mentorado (Opcional)</Label>
                <Select value={newEventForm.mentorado_id} onValueChange={(value) => setNewEventForm({ ...newEventForm, mentorado_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar mentorado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum mentorado</SelectItem>
                    {mentorados.map((mentorado) => (
                      <SelectItem key={mentorado.id} value={mentorado.id}>
                        {mentorado.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Closer Responsável</Label>
              <Select value={newEventForm.closer_id} onValueChange={(value) => setNewEventForm({ ...newEventForm, closer_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar closer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum closer</SelectItem>
                  {closers.map((closer) => (
                    <SelectItem key={closer.id} value={closer.id}>
                      {closer.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">Descrição</Label>
              <Textarea
                id="event-description"
                value={newEventForm.description}
                onChange={(e) => setNewEventForm({ ...newEventForm, description: e.target.value })}
                placeholder="Descrição do evento"
                className="min-h-[80px]"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="all-day"
                checked={newEventForm.all_day}
                onChange={(e) => setNewEventForm({ ...newEventForm, all_day: e.target.checked })}
                className="w-4 h-4 text-[#059669] border-gray-300 rounded focus:ring-[#059669]"
              />
              <Label htmlFor="all-day">Evento de dia inteiro</Label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="start-date">Data de Início *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={newEventForm.start_date}
                  onChange={(e) => {
                    setNewEventForm({ ...newEventForm, start_date: e.target.value })
                    if (formErrors.start_date) {
                      setFormErrors({ ...formErrors, start_date: '' })
                    }
                  }}
                  className={`${formErrors.start_date ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                {formErrors.start_date && (
                  <p className="text-sm text-red-600">{formErrors.start_date}</p>
                )}
              </div>

              {!newEventForm.all_day && (
                <div className="space-y-2">
                  <Label htmlFor="start-time">Hora de Início</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={newEventForm.start_time}
                    onChange={(e) => setNewEventForm({ ...newEventForm, start_time: e.target.value })}
                  />
                </div>
              )}

              {!newEventForm.all_day && (
                <div className="space-y-2">
                  <Label htmlFor="end-time">Hora de Fim</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={newEventForm.end_time}
                    onChange={(e) => setNewEventForm({ ...newEventForm, end_time: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="end-date">Data de Fim (Opcional)</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={newEventForm.end_date}
                  onChange={(e) => setNewEventForm({ ...newEventForm, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setShowNewEventModal(false)}
                className="px-4 py-2 text-[#475569] hover:bg-[#F1F5F9] rounded-xl transition-colors"
                disabled={isCreating}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={isCreating}
                className="flex items-center gap-2 px-6 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Criando...
                  </>
                ) : (
                  <>
                    <CalendarIcon className="w-4 h-4" />
                    Criar Evento
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Evento */}
      <EditEventModal
        isOpen={showEditEventModal}
        onClose={() => setShowEditEventModal(false)}
        onSuccess={handleEditSuccess}
        event={selectedEvent}
      />

      {/* Modal Enviar Agenda WhatsApp */}
      <Dialog open={showAgendaModal} onOpenChange={setShowAgendaModal}>
        <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-[#16A34A] rounded-lg">
                <Send className="w-5 h-5 text-white" />
              </div>
              Enviar Agenda para WhatsApp
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Tipo de Agenda */}
            <div className="space-y-2">
              <Label>Tipo de Agenda</Label>
              <div className="flex gap-3">
                <button
                  onClick={() => { setAgendaType('semana'); setAgendaPreview('') }}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    agendaType === 'semana'
                      ? 'bg-[#059669] text-white'
                      : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                  }`}
                >
                  Agenda da Semana
                </button>
                <button
                  onClick={() => { setAgendaType('dia'); setAgendaPreview('') }}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    agendaType === 'dia'
                      ? 'bg-[#059669] text-white'
                      : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                  }`}
                >
                  Agenda do Dia
                </button>
              </div>
            </div>

            {/* Grupo WhatsApp */}
            <div className="space-y-2">
              <Label>Grupo do WhatsApp</Label>
              {whatsappGroups.length === 0 ? (
                <p className="text-sm text-[#94A3B8] py-2">Carregando grupos... Certifique-se de que o WhatsApp está conectado.</p>
              ) : (
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um grupo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {whatsappGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Vincular Grupo */}
            {whatsappGroups.length > 0 && (
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#166534]">Grupo vinculado (envio automático)</p>
                    <p className="text-xs text-[#15803D]">
                      {linkedGroupId
                        ? `Vinculado: ${whatsappGroups.find(g => g.id === linkedGroupId)?.name || linkedGroupId}`
                        : 'Nenhum grupo vinculado. A agenda será enviada automaticamente ao criar eventos.'}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!organizationId || !selectedGroup) return
                      await supabase
                        .from('organizations')
                        .update({ whatsapp_group_agenda: selectedGroup })
                        .eq('id', organizationId)
                      setLinkedGroupId(selectedGroup)
                      setLinkedGroupName(whatsappGroups.find(g => g.id === selectedGroup)?.name || '')
                      alert('Grupo vinculado com sucesso! A agenda será enviada automaticamente ao criar eventos.')
                    }}
                    disabled={!selectedGroup}
                    className="px-3 py-1.5 bg-[#16A34A] text-white rounded-lg text-xs font-medium hover:bg-[#15803D] transition-colors disabled:opacity-50"
                  >
                    Vincular
                  </button>
                </div>
                {linkedGroupId && (
                  <button
                    onClick={async () => {
                      if (!organizationId) return
                      await supabase
                        .from('organizations')
                        .update({ whatsapp_group_agenda: null })
                        .eq('id', organizationId)
                      setLinkedGroupId('')
                      setLinkedGroupName('')
                      alert('Grupo desvinculado.')
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Desvincular grupo
                  </button>
                )}
              </div>
            )}

            {/* Gerar Preview */}
            <button
              onClick={handleGeneratePreview}
              disabled={isLoadingPreview}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoadingPreview ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
              ) : (
                <><Eye className="w-4 h-4" /> Gerar Preview da Mensagem</>
              )}
            </button>

            {/* Preview */}
            {agendaPreview && (
              <div className="space-y-2">
                <Label>Preview da Mensagem</Label>
                <textarea
                  value={agendaPreview}
                  onChange={(e) => setAgendaPreview(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 text-sm whitespace-pre-wrap font-mono max-h-60 min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-[#059669]"
                />
                <p className="text-xs text-[#94A3B8]">Você pode editar a mensagem antes de enviar.</p>
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setShowAgendaModal(false)}
                className="px-4 py-2 text-[#475569] hover:bg-[#F1F5F9] rounded-xl transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendAgenda}
                disabled={!selectedGroup || !agendaPreview || isSendingAgenda}
                className="flex items-center gap-2 px-6 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl font-medium transition-colors disabled:opacity-50 text-sm"
              >
                {isSendingAgenda ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="w-4 h-4" /> Enviar para Grupo</>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}