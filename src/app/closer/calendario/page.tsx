'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Users,
  Phone,
  Video,
  MapPin
} from 'lucide-react'
import { CloserAuthProvider, useCloserAuth } from '@/contexts/closer-auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  date: string
  time: string
  duration?: number
  type: 'call' | 'meeting' | 'follow_up' | 'presentation' | 'other'
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  lead_id?: string
  lead?: {
    nome: string
    email?: string
    telefone?: string
  }
  location?: string
  meeting_link?: string
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function CalendarioPageContent() {
  const { closer, loading: authLoading } = useCloserAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')

  useEffect(() => {
    if (closer) {
      loadEvents()
    }
  }, [closer, currentDate])

  const loadEvents = async () => {
    if (!closer) return

    try {
      setLoading(true)

      // Get start and end of the current month for filtering
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      // Load activities that have future actions as calendar events
      const { data: activities, error: activitiesError } = await supabase
        .from('closers_atividades')
        .select(`
          id,
          tipo_atividade,
          descricao,
          data_proxima_acao,
          proxima_acao,
          lead:leads!closers_atividades_lead_id_fkey (
            nome,
            email,
            telefone
          )
        `)
        .eq('closer_id', closer.id)
        .not('data_proxima_acao', 'is', null)
        .gte('data_proxima_acao', startOfMonth.toISOString().split('T')[0])
        .lte('data_proxima_acao', endOfMonth.toISOString().split('T')[0])

      if (activitiesError) {
        console.error('Error loading activities:', activitiesError)
      }

      // Transform activities into calendar events
      const calendarEvents: CalendarEvent[] = (activities || []).map(activity => {
        const leadData = Array.isArray(activity.lead) ? activity.lead[0] : activity.lead
        return {
          id: activity.id,
          title: activity.proxima_acao || activity.tipo_atividade,
          description: activity.descricao,
          date: activity.data_proxima_acao,
          time: '09:00', // Default time, could be enhanced
          type: activity.tipo_atividade === 'ligacao' ? 'call' : 
                activity.tipo_atividade === 'reuniao' ? 'meeting' : 'follow_up',
          status: 'scheduled',
          lead_id: leadData?.nome ? activity.id : undefined,
          lead: leadData
        }
      })

      setEvents(calendarEvents)
    } catch (error) {
      console.error('Error loading events:', error)
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

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => event.date === dateStr)
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-3 w-3" />
      case 'meeting': return <Users className="h-3 w-3" />
      case 'presentation': return <Video className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'call': return 'bg-blue-100 text-blue-800'
      case 'meeting': return 'bg-green-100 text-green-800'
      case 'presentation': return 'bg-purple-100 text-purple-800'
      case 'follow_up': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString()
  }

  if (authLoading || !closer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const days = getDaysInMonth(currentDate)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Calendário</h1>
              <p className="text-sm text-gray-500">Gerencie seus compromissos e follow-ups</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/closer">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Dashboard
                </Link>
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Calendar Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-semibold min-w-[200px] text-center">
                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                {['month', 'week', 'day'].map((viewType) => (
                  <Button
                    key={viewType}
                    variant={view === viewType ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setView(viewType as 'month' | 'week' | 'day')}
                  >
                    {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Calendar Grid */}
            {view === 'month' && (
              <div className="grid grid-cols-7 gap-1">
                {/* Weekday Headers */}
                {WEEKDAYS.map((day) => (
                  <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {days.map((day, index) => {
                  if (!day) {
                    return <div key={index} className="p-2 h-24"></div>
                  }

                  const dayEvents = getEventsForDate(day)
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={`p-2 h-24 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                        isToday(day) ? 'bg-blue-50 border-blue-200' : ''
                      } ${
                        isSelected(day) ? 'bg-blue-100 border-blue-300' : ''
                      }`}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className="flex justify-between items-start h-full">
                        <span className={`text-sm ${
                          isToday(day) ? 'font-bold text-blue-600' : 'text-gray-700'
                        }`}>
                          {day.getDate()}
                        </span>
                      </div>
                      
                      <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className={`text-xs p-1 rounded truncate ${getEventTypeColor(event.type)}`}
                          >
                            <div className="flex items-center gap-1">
                              {getEventTypeIcon(event.type)}
                              <span>{event.title}</span>
                            </div>
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{dayEvents.length - 2} mais
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Date Events */}
        {selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate.toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardTitle>
              <CardDescription>
                {getEventsForDate(selectedDate).length} compromissos agendados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {getEventsForDate(selectedDate).length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum compromisso para esta data</p>
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Compromisso
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {getEventsForDate(selectedDate).map((event) => (
                    <div key={event.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={getEventTypeColor(event.type)}>
                              <div className="flex items-center gap-1">
                                {getEventTypeIcon(event.type)}
                                {event.type.toUpperCase()}
                              </div>
                            </Badge>
                            <span className="text-sm text-gray-500">{event.time}</span>
                          </div>
                          
                          <h3 className="font-semibold text-gray-900 mb-1">{event.title}</h3>
                          
                          {event.description && (
                            <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                          )}

                          {event.lead && (
                            <div className="text-sm text-gray-600">
                              <strong>Lead:</strong> {event.lead.nome}
                              {event.lead.telefone && (
                                <span className="ml-2">
                                  <Phone className="h-3 w-3 inline mr-1" />
                                  {event.lead.telefone}
                                </span>
                              )}
                            </div>
                          )}

                          {event.location && (
                            <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
                          <Button variant="outline" size="sm">
                            Concluir
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total de Compromissos</p>
                  <p className="text-2xl font-bold">{events.length}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Ligações Agendadas</p>
                  <p className="text-2xl font-bold">{events.filter(e => e.type === 'call').length}</p>
                </div>
                <Phone className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Reuniões</p>
                  <p className="text-2xl font-bold">{events.filter(e => e.type === 'meeting').length}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function CalendarioPage() {
  return (
    <CloserAuthProvider>
      <CalendarioPageContent />
    </CloserAuthProvider>
  )
}