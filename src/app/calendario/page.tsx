'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Calendar as CalendarIcon, Clock, Edit, Trash2, ChevronLeft, ChevronRight, MessageCircle, CheckCircle } from 'lucide-react'
import { AddEventModal } from '@/components/add-event-modal'
import { EditEventModal } from '@/components/edit-event-modal'

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null)
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/routes/calendar/events', {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      })
      const data = await response.json()

      if (data.success) {
        setEvents(data.events || [])
      } else {
        console.error('Erro na API:', data.error)
        setEvents([])
      }
    } catch (error) {
      console.error('Erro ao buscar eventos:', error)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleEventAdded = () => {
    fetchEvents()
  }

  const handleEventEdited = () => {
    fetchEvents()
  }

  const handleEditEvent = (event: CalendarEvent) => {
    setEventToEdit(event)
    setIsEditModalOpen(true)
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return

    try {
      const response = await fetch(`/routes/calendar/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao excluir evento')
      }

      setEvents(prev => prev.filter(e => e.id !== eventId))
      alert('Evento excluído com sucesso!')
    } catch (error) {
      console.error('Erro ao excluir evento:', error)
      alert('Erro ao excluir evento')
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

    // Dias do mês anterior
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      days.push({ date: prevDate, isCurrentMonth: false })
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true })
    }

    // Dias do próximo mês para completar a grid
    const remainingDays = 42 - days.length // 6 semanas x 7 dias
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false })
    }

    return days
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      // Para garantir comparação correta de datas, usar apenas a parte da data
      const eventDateStr = event.start_datetime.split('T')[0] // YYYY-MM-DD
      const targetDateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
      return eventDateStr === targetDateStr
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const formatTime = (dateString: string) => {
    // Converter para horário de São Paulo usando timezone correto
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo' // Timezone correto de São Paulo
    })
  }

  const renderMessageStatus = (event: CalendarEvent) => {
    if (event.mensagem_enviada) {
      return (
        <div className="flex items-center gap-1 text-green-600" title="Mensagem de lembrete enviada">
          <CheckCircle className="h-4 w-4" />
          <span className="text-xs font-medium">Enviado</span>
        </div>
      )
    }

    // Verificar se é um evento futuro que pode receber lembrete
    const eventStart = new Date(event.start_datetime)
    const now = new Date()
    const timeDiff = eventStart.getTime() - now.getTime()
    const hoursDiff = timeDiff / (1000 * 60 * 60)

    if (hoursDiff > 0.5 && hoursDiff < 24) { // Entre 30min e 24h no futuro
      return (
        <div className="flex items-center gap-1 text-gray-400" title="Aguardando envio de lembrete (30min antes)">
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs">Pendente</span>
        </div>
      )
    }

    return null
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const days = getDaysInMonth(currentDate)

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="Calendário" subtitle="Gerenciar eventos e agendamentos" />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Carregando calendário...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header title="Calendário" subtitle={`${events.length} eventos agendados`} />

      <main className="flex-1 p-6 space-y-6">
        {/* Header do Calendário */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold min-w-[200px] text-center">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Hoje
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant={view === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('month')}
            >
              Mês
            </Button>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
          </div>
        </div>

        {/* Grid do Calendário */}
        <div className="bg-white rounded-lg border shadow-sm">
          {/* Header dos dias da semana */}
          <div className="grid grid-cols-7 border-b">
            {DAYS.map(day => (
              <div key={day} className="p-4 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Grid dos dias */}
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const dayEvents = getEventsForDate(day.date)
              const isCurrentMonth = day.isCurrentMonth
              const isTodayDate = isToday(day.date)

              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border-b border-r border-gray-100 ${
                    !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                  } hover:bg-gray-50 cursor-pointer transition-colors`}
                  onClick={() => setSelectedDate(day.date)}
                >
                  <div className={`text-sm mb-2 ${
                    !isCurrentMonth
                      ? 'text-gray-400'
                      : isTodayDate
                        ? 'text-white bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center font-semibold'
                        : 'text-gray-900'
                  }`}>
                    {day.date.getDate()}
                  </div>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        className="text-xs p-1 bg-blue-100 text-blue-800 rounded truncate cursor-pointer hover:bg-blue-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditEvent(event)
                        }}
                      >
                        {event.all_day ? event.title : `${formatTime(event.start_datetime)} ${event.title}`}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{dayEvents.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Lista de Eventos do Dia Selecionado */}
        {selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Eventos para {selectedDate.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getEventsForDate(selectedDate).length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Nenhum evento agendado para este dia
                </p>
              ) : (
                <div className="space-y-3">
                  {getEventsForDate(selectedDate).map(event => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{event.title}</h4>
                          <Badge variant={event.all_day ? 'secondary' : 'default'}>
                            {event.all_day ? 'Dia inteiro' : 'Horário específico'}
                          </Badge>
                        </div>
                        {!event.all_day && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                            <Clock className="h-4 w-4" />
                            {formatTime(event.start_datetime)} - {formatTime(event.end_datetime)}
                          </div>
                        )}
                        {event.description && (
                          <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                        )}
                        {/* Status da mensagem de lembrete */}
                        <div className="mt-2">
                          {renderMessageStatus(event)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditEvent(event)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <AddEventModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleEventAdded}
        initialDate={selectedDate}
      />

      <EditEventModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEventToEdit(null)
        }}
        onSuccess={handleEventEdited}
        event={eventToEdit}
      />
    </div>
  )
}