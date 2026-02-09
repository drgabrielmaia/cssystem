'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { MetricCard } from '@/components/ui/metric-card'
import { ChartCard } from '@/components/ui/chart-card'
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
  Phone,
  MessageCircle
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { EditEventModal } from '@/components/edit-event-modal'
import { useAuth } from '@/contexts/auth'

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

// Função para notificar admin sobre novo evento
const notifyAdminAboutNewEvent = async (eventData: any) => {
  try {
    // Buscar o nome do lead ou mentorado se associado
    let associatedName = ''

    if (eventData.lead_id) {
      try {
        const response = await fetch('/routes/leads')
        const data = await response.json()
        if (data.success) {
          const lead = data.leads.find((l: any) => l.id === eventData.lead_id)
          associatedName = lead?.nome_completo || ''
        }
      } catch (error) {
        console.warn('Erro ao buscar lead:', error)
      }
    }

    if (eventData.mentorado_id && !associatedName) {
      try {
        const { data, error } = await supabase
          .from('mentorados')
          .select('nome_completo')
          .eq('id', eventData.mentorado_id)
          .single()

        if (!error && data) {
          associatedName = data.nome_completo
        }
      } catch (error) {
        console.warn('Erro ao buscar mentorado:', error)
      }
    }

    // Formatar data e hora
    const eventDate = new Date(eventData.start_datetime)
    const formattedDate = eventDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Sao_Paulo'
    })

    const formattedTime = eventData.all_day
      ? 'Dia todo'
      : eventDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo'
        })

    // Construir mensagem
    let message = `🗓️ *NOVO EVENTO CRIADO*\n\n`
    message += `📋 *Título:* ${eventData.title}\n`
    message += `📅 *Data:* ${formattedDate}\n`
    message += `⏰ *Horário:* ${formattedTime}\n`

    if (eventData.description) {
      message += `📝 *Descrição:* ${eventData.description}\n`
    }

    if (associatedName) {
      const type = eventData.lead_id ? 'Lead' : 'Mentorado'
      message += `👤 *${type}:* ${associatedName}\n`
    }

    message += `\n✅ Evento adicionado ao calendário com sucesso!`

    // Enviar mensagem via WhatsApp API
    const adminPhone = process.env.NEXT_PUBLIC_ADMIN_PHONE || '558396910414'
    console.log('📱 Enviando mensagem para:', adminPhone)
    console.log('📝 Mensagem:', message)

    const response = await fetch('/api/whatsapp/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: adminPhone,
        message: message,
        sender: 'kellybsantoss@icloud.com'
      })
    })

    const responseData = await response.json()
    console.log('📡 Resposta da API:', responseData)

    if (!response.ok) {
      throw new Error(`Falha ao enviar notificação WhatsApp: ${response.status} - ${responseData.error || 'Erro desconhecido'}`)
    }

    console.log('✅ Notificação enviada para o admin com sucesso!')

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
    mentorado_id: ''
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
    }
  }, [organizationId])

  const loadLeads = async () => {
    try {
      const response = await fetch('/routes/leads')
      const data = await response.json()
      if (data.success) {
        setLeads(data.leads.map((lead: any) => ({
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
      const { data, error } = await supabase
        .from('mentorados')
        .select('id, nome_completo')
        .order('nome_completo')

      if (error) throw error

      setMentorados(data || [])
    } catch (error) {
      console.error('Erro ao carregar mentorados:', error)
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
      mentorado_id: 'none'
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
        organization_id: organizationId, // ✅ INCLUINDO ORGANIZATION_ID
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
        await notifyAdminAboutNewEvent(eventData)
        console.log('✅ Notificação enviada com sucesso!')
      } catch (notificationError) {
        console.warn('❌ Erro ao enviar notificação:', notificationError)
        // Não quebrar o fluxo se a notificação falhar
      }

      setShowNewEventModal(false)
      await fetchEvents()
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

  if (loading) {
    return (
      <PageLayout title="Calendário" subtitle="Carregando...">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#059669]"></div>
        </div>
      </PageLayout>
    )
  }

  const days = getDaysInMonth(currentDate)
  const selectedDateEvents = getEventsForDate(selectedDate)

  return (
    <PageLayout title="Calendário" subtitle="Agenda e eventos">
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Eventos Hoje"
          value={todayEvents.length.toString()}
          change={2}
          changeType="increase"
          icon={CalendarIcon}
          iconColor="blue"
        />
        <MetricCard
          title="Total de Eventos"
          value={Array.isArray(events) ? events.length.toString() : '0'}
          change={8}
          changeType="increase"
          icon={Users}
          iconColor="green"
        />
        <MetricCard
          title="Próximos Eventos"
          value={upcomingEvents.length.toString()}
          change={1}
          changeType="increase"
          icon={Clock}
          iconColor="orange"
        />
        <MetricCard
          title="Eventos Concluídos"
          value={Array.isArray(events) ? events.filter(e => e.call_status === 'completed').length.toString() : '0'}
          change={5}
          changeType="increase"
          icon={CheckCircle}
          iconColor="purple"
        />
      </div>

      {/* Alerta para eventos de hoje */}
      {todayEvents.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-blue-800 text-sm sm:text-base">Agenda de Hoje</p>
              <p className="text-xs sm:text-sm text-blue-700">
                Você tem {todayEvents.length} evento{todayEvents.length > 1 ? 's' : ''} agendado{todayEvents.length > 1 ? 's' : ''} para hoje
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Calendário Principal */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Calendário"
            subtitle={`${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            actions={
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={goToToday}
                  className="px-2 sm:px-3 py-1 text-xs bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg transition-colors"
                >
                  <span className="hidden sm:inline">Hoje</span>
                  <span className="sm:hidden">•</span>
                </button>
                <button
                  onClick={goToPreviousMonth}
                  className="p-1.5 sm:p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-1.5 sm:p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
                >
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            }
          >
            <div className="p-2 sm:p-4">
              {/* Dias da semana */}
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1 sm:mb-2">
                {DAYS.map(day => (
                  <div key={day} className="h-6 sm:h-8 flex items-center justify-center text-xs font-medium text-[#94A3B8]">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.charAt(0)}</span>
                  </div>
                ))}
              </div>

              {/* Dias do mês */}
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {days.map((day, index) => {
                  const isToday = day && day.toDateString() === today.toDateString()
                  const isSelected = day && selectedDate && day.toDateString() === selectedDate.toDateString()
                  const dayEvents = day ? getEventsForDate(day) : []

                  return (
                    <div
                      key={index}
                      className={`
                        h-12 sm:h-16 p-1 border border-[#E2E8F0] cursor-pointer transition-colors relative text-center
                        ${day ? 'hover:bg-[#F8FAFC]' : 'bg-[#F8FAFC]'}
                        ${isToday ? 'bg-[#059669] text-white' : ''}
                        ${isSelected ? 'ring-1 sm:ring-2 ring-[#059669] ring-offset-1' : ''}
                      `}
                      onClick={() => day && setSelectedDate(day)}
                    >
                      {day && (
                        <>
                          <div className={`text-xs font-medium ${isToday ? 'text-white' : 'text-[#0F172A]'}`}>
                            {day.getDate()}
                          </div>
                          {dayEvents.length > 0 && (
                            <div className="absolute bottom-0.5 sm:bottom-1 left-0.5 sm:left-1 right-0.5 sm:right-1">
                              <div className="flex gap-0.5 sm:gap-1">
                                {dayEvents.slice(0, 2).map((event, i) => (
                                  <div
                                    key={i}
                                    className="h-0.5 sm:h-1 flex-1 bg-[#059669] rounded-full"
                                  />
                                ))}
                                {dayEvents.length > 2 && (
                                  <div className="text-[10px] sm:text-xs text-[#059669] font-medium">
                                    +{dayEvents.length - 2}
                                  </div>
                                )}
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
          </ChartCard>
        </div>

        {/* Sidebar - Eventos */}
        <div className="space-y-4 lg:space-y-6">
          {/* Ações */}
          <div className="flex gap-2">
            <button
              onClick={handleNewEvent}
              className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-medium transition-colors text-sm"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Novo Evento</span>
              <span className="sm:hidden">Novo</span>
            </button>
            <button
              onClick={fetchEvents}
              className="p-2 text-[#475569] hover:bg-[#F1F5F9] rounded-xl transition-colors"
            >
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Eventos do dia selecionado */}
          {selectedDate && (
            <ChartCard
              title="Eventos do Dia"
              subtitle={formatDate(selectedDate)}
            >
              <div className="p-4">
                {selectedDateEvents.length === 0 ? (
                  <p className="text-[#94A3B8] text-center py-8">
                    Nenhum evento agendado para este dia
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateEvents.map((event) => (
                      <div key={event.id} className="border border-[#E2E8F0] rounded-xl p-3 hover:bg-[#F8FAFC] transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-[#0F172A] text-sm">
                              {event.title}
                            </h4>
                            {!event.all_day && (
                              <p className="text-xs text-[#94A3B8] mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(event.start_datetime)} - {formatTime(event.end_datetime)}
                              </p>
                            )}
                            {event.description && (
                              <p className="text-xs text-[#475569] mt-1 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => alert(`Evento: ${event.title}\n\nDescrição: ${event.description || 'Sem descrição'}\n\nInício: ${new Date(event.start_datetime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\nFim: ${new Date(event.end_datetime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`)}
                              className="p-1 hover:bg-[#F1F5F9] rounded-lg transition-colors group"
                              title="Ver detalhes"
                            >
                              <Eye className="w-3 h-3 text-[#94A3B8] group-hover:text-[#475569]" />
                            </button>
                            <button
                              onClick={() => handleEditEvent(event)}
                              className="p-1 hover:bg-[#F1F5F9] rounded-lg transition-colors group"
                              title="Editar evento"
                            >
                              <Edit className="w-3 h-3 text-[#94A3B8] group-hover:text-[#059669]" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event)}
                              className="p-1 hover:bg-red-50 rounded-lg transition-colors group"
                              title="Excluir evento"
                            >
                              <Trash2 className="w-3 h-3 text-red-500 group-hover:text-red-700" />
                            </button>
                          </div>
                        </div>
                        {(event.call_status || event.sale_value || event.mensagem_enviada !== undefined) && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#F1F5F9]">
                            {event.call_status === 'completed' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-50 text-green-700">
                                <CheckCircle className="w-3 h-3" />
                                Concluído
                              </span>
                            )}
                            {event.mensagem_enviada && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                                <MessageCircle className="w-3 h-3" />
                                Msg Enviada
                              </span>
                            )}
                            {event.mensagem_enviada === false && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-orange-50 text-orange-700">
                                <AlertCircle className="w-3 h-3" />
                                Pendente
                              </span>
                            )}
                            {event.sale_value && (
                              <span className="text-xs font-medium text-[#059669]">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                }).format(event.sale_value)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ChartCard>
          )}

          {/* Próximos eventos */}
          <ChartCard title="Próximos Eventos" subtitle="Agenda da semana">
            <div className="p-4">
              {upcomingEvents.length === 0 ? (
                <p className="text-[#94A3B8] text-center py-8">
                  Nenhum evento próximo
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="border border-[#E2E8F0] rounded-xl p-3 hover:bg-[#F8FAFC] transition-colors">
                      <h4 className="font-semibold text-[#0F172A] text-sm">
                        {event.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#94A3B8]">
                        <CalendarIcon className="w-3 h-3" />
                        {new Date(event.start_datetime).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                        {!event.all_day && (
                          <>
                            <Clock className="w-3 h-3 ml-1" />
                            {formatTime(event.start_datetime)}
                          </>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-xs text-[#475569] mt-1 line-clamp-1">
                          {event.description}
                        </p>
                      )}
                      {event.mensagem_enviada !== undefined && (
                        <div className="flex items-center gap-1 mt-2">
                          {event.mensagem_enviada ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                              <MessageCircle className="w-2 h-2" />
                              Msg Enviada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-50 text-orange-700">
                              <AlertCircle className="w-2 h-2" />
                              Pendente
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ChartCard>
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
    </PageLayout>
  )
}