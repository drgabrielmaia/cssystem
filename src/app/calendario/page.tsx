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

export default function CalendarioPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [showNewEventModal, setShowNewEventModal] = useState(false)
  const [leads, setLeads] = useState<Array<{id: string, nome_completo: string}>>([])
  const [isCreating, setIsCreating] = useState(false)
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})

  // Estados para o formulário de novo evento
  const [newEventForm, setNewEventForm] = useState({
    title: '',
    description: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    all_day: false,
    lead_id: ''
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
    fetchEvents()
    loadLeads()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/routes/calendar/events', {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      })

      if (response.ok) {
        const result = await response.json()
        setEvents(result.events || [])
      }
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
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
      minute: '2-digit'
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome_completo')
        .order('nome_completo')

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
    }
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
      lead_id: 'none'
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
      const startDateTime = new Date(`${newEventForm.start_date}T${newEventForm.start_time}`)
      const endDateTime = new Date(`${newEventForm.end_date || newEventForm.start_date}T${newEventForm.end_time}`)

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

    try {
      setIsCreating(true)

      // Construir datetime strings
      const startDatetime = newEventForm.all_day
        ? `${newEventForm.start_date}T00:00:00`
        : `${newEventForm.start_date}T${newEventForm.start_time || '00:00'}`

      const endDatetime = newEventForm.all_day
        ? `${newEventForm.end_date || newEventForm.start_date}T23:59:59`
        : `${newEventForm.end_date || newEventForm.start_date}T${newEventForm.end_time || '23:59'}`

      const eventData = {
        title: newEventForm.title,
        description: newEventForm.description || null,
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        all_day: newEventForm.all_day,
        lead_id: newEventForm.lead_id === 'none' ? null : newEventForm.lead_id || null,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('calendar_events')
        .insert([eventData])

      if (error) throw error

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
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-semibold text-blue-800">Agenda de Hoje</p>
              <p className="text-sm text-blue-700">
                Você tem {todayEvents.length} evento{todayEvents.length > 1 ? 's' : ''} agendado{todayEvents.length > 1 ? 's' : ''} para hoje
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário Principal */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Calendário"
            subtitle={`${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            actions={
              <div className="flex items-center gap-2">
                <button
                  onClick={goToToday}
                  className="px-3 py-1 text-xs bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg transition-colors"
                >
                  Hoje
                </button>
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            }
          >
            <div className="p-4">
              {/* Dias da semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map(day => (
                  <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-[#94A3B8]">
                    {day}
                  </div>
                ))}
              </div>

              {/* Dias do mês */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => {
                  const isToday = day && day.toDateString() === today.toDateString()
                  const isSelected = day && selectedDate && day.toDateString() === selectedDate.toDateString()
                  const dayEvents = day ? getEventsForDate(day) : []

                  return (
                    <div
                      key={index}
                      className={`
                        h-16 p-1 border border-[#E2E8F0] cursor-pointer transition-colors relative
                        ${day ? 'hover:bg-[#F8FAFC]' : 'bg-[#F8FAFC]'}
                        ${isToday ? 'bg-[#059669] text-white' : ''}
                        ${isSelected ? 'ring-2 ring-[#059669] ring-offset-1' : ''}
                      `}
                      onClick={() => day && setSelectedDate(day)}
                    >
                      {day && (
                        <>
                          <div className={`text-xs font-medium ${isToday ? 'text-white' : 'text-[#0F172A]'}`}>
                            {day.getDate()}
                          </div>
                          {dayEvents.length > 0 && (
                            <div className="absolute bottom-1 left-1 right-1">
                              <div className="flex gap-1">
                                {dayEvents.slice(0, 2).map((event, i) => (
                                  <div
                                    key={i}
                                    className="h-1 flex-1 bg-[#059669] rounded-full"
                                  />
                                ))}
                                {dayEvents.length > 2 && (
                                  <div className="text-xs text-[#059669] font-medium">
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
        <div className="space-y-6">
          {/* Ações */}
          <div className="flex gap-2">
            <button
              onClick={handleNewEvent}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Evento
            </button>
            <button
              onClick={fetchEvents}
              className="p-2 text-[#475569] hover:bg-[#F1F5F9] rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
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
                            <button className="p-1 hover:bg-[#F1F5F9] rounded-lg transition-colors group">
                              <Eye className="w-3 h-3 text-[#94A3B8] group-hover:text-[#475569]" />
                            </button>
                            <button className="p-1 hover:bg-[#F1F5F9] rounded-lg transition-colors group">
                              <Edit className="w-3 h-3 text-[#94A3B8] group-hover:text-[#059669]" />
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
                        {new Date(event.start_datetime).toLocaleDateString('pt-BR')}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-[#059669] rounded-lg">
                <Plus className="w-5 h-5 text-white" />
              </div>
              Criar Novo Evento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
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

              <div className="space-y-2">
                <Label htmlFor="end-date">Data de Fim</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={newEventForm.end_date}
                  onChange={(e) => setNewEventForm({ ...newEventForm, end_date: e.target.value })}
                />
              </div>

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
    </PageLayout>
  )
}