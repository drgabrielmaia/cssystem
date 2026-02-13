'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  ChevronLeft,
  ChevronRight,
  Users,
  Phone,
  Video,
  CheckCircle2,
  XCircle,
  Calendar,
  User
} from 'lucide-react'
import { useSecureAuth } from '@/hooks/use-secure-auth'
import { supabase } from '@/lib/supabase'

interface Appointment {
  id: string
  lead_id: string
  appointment_date: string
  start_time: string
  end_time: string
  type: 'discovery' | 'demo' | 'negotiation' | 'closing'
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'
  notes?: string
  meeting_url?: string
  lead?: {
    nome_completo: string
    email?: string
    telefone?: string
    temperatura?: string
    lead_score?: number
  }
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const APPOINTMENT_TYPES = {
  discovery: { label: 'Descoberta', icon: <Phone className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
  demo: { label: 'Demonstração', icon: <Video className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' },
  negotiation: { label: 'Negociação', icon: <Users className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800' },
  closing: { label: 'Fechamento', icon: <CheckCircle2 className="h-4 w-4" />, color: 'bg-green-100 text-green-800' }
}

const STATUS_TYPES = {
  scheduled: { label: 'Agendado', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
  no_show: { label: 'Não compareceu', color: 'bg-gray-100 text-gray-800' },
  rescheduled: { label: 'Reagendado', color: 'bg-yellow-100 text-yellow-800' }
}

export default function CloserAgendaPage() {
  const { user, orgUser, loading: authLoading, isSecurelyValidated } = useSecureAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    completed: 0
  })

  useEffect(() => {
    if (isSecurelyValidated && user) {
      loadAppointments()
    }
  }, [currentDate, isSecurelyValidated, user])

  const loadAppointments = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get start and end of current month
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      // Load appointments from the appointment system
      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select(`
          id,
          lead_id,
          appointment_date,
          start_time,
          end_time,
          type,
          status,
          notes,
          meeting_url,
          leads!appointments_lead_id_fkey (
            nome_completo,
            email,
            telefone,
            temperatura,
            lead_score
          )
        `)
        .eq('closer_id', user.id)
        .gte('appointment_date', startOfMonth.toISOString().split('T')[0])
        .lte('appointment_date', endOfMonth.toISOString().split('T')[0])
        .order('appointment_date', { ascending: true })

      if (error) {
        console.error('Error loading appointments:', error)
        return
      }

      const transformedAppointments: Appointment[] = (appointmentsData || []).map(appointment => ({
        ...appointment,
        lead: Array.isArray(appointment.leads) ? appointment.leads[0] : appointment.leads
      }))

      setAppointments(transformedAppointments)
      calculateStats(transformedAppointments)

    } catch (error) {
      console.error('Error loading appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (appointmentsData: Appointment[]) => {
    const today = new Date().toISOString().split('T')[0]
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 6)

    const stats = {
      today: appointmentsData.filter(apt => apt.appointment_date === today && apt.status === 'scheduled').length,
      thisWeek: appointmentsData.filter(apt => {
        const aptDate = new Date(apt.appointment_date)
        return aptDate >= startOfWeek && aptDate <= endOfWeek && apt.status === 'scheduled'
      }).length,
      thisMonth: appointmentsData.filter(apt => apt.status === 'scheduled').length,
      completed: appointmentsData.filter(apt => apt.status === 'completed').length
    }

    setStats(stats)
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

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return appointments.filter(appointment => appointment.appointment_date === dateStr)
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

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId)

      if (error) throw error

      // Reload appointments
      await loadAppointments()
    } catch (error) {
      console.error('Error updating appointment:', error)
    }
  }

  if (authLoading || !isSecurelyValidated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Minha Agenda</h1>
          <p className="text-gray-600">Gerencie seus agendamentos e reuniões</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Hoje</p>
                <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Esta Semana</p>
                <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Este Mês</p>
                <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Concluídos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-600 p-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentDate).map((date, index) => {
                if (!date) {
                  return <div key={index} className="h-20"></div>
                }

                const dayAppointments = getAppointmentsForDate(date)
                const isToday = date.toDateString() === new Date().toDateString()
                const isSelected = selectedDate?.toDateString() === date.toDateString()

                return (
                  <div
                    key={index}
                    className={`h-20 p-1 border rounded cursor-pointer transition-colors ${
                      isToday ? 'bg-blue-50 border-blue-200' : 
                      isSelected ? 'bg-purple-50 border-purple-200' : 
                      'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 2).map(appointment => (
                        <div
                          key={appointment.id}
                          className={`text-xs px-1 py-0.5 rounded ${APPOINTMENT_TYPES[appointment.type].color}`}
                        >
                          {formatTime(appointment.start_time)}
                        </div>
                      ))}
                      {dayAppointments.length > 2 && (
                        <div className="text-xs text-gray-500">+{dayAppointments.length - 2}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedDate ? 
                `Agendamentos - ${selectedDate.toLocaleDateString('pt-BR')}` : 
                'Próximos Agendamentos'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {(selectedDate ? getAppointmentsForDate(selectedDate) : 
                  appointments.filter(apt => new Date(apt.appointment_date) >= new Date()).slice(0, 10)
                ).map(appointment => (
                  <div key={appointment.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {APPOINTMENT_TYPES[appointment.type].icon}
                        <span className="font-medium text-sm">
                          {APPOINTMENT_TYPES[appointment.type].label}
                        </span>
                      </div>
                      <Badge className={STATUS_TYPES[appointment.status].color}>
                        {STATUS_TYPES[appointment.status].label}
                      </Badge>
                    </div>
                    
                    <div className="text-sm">
                      <p className="font-medium">{appointment.lead?.nome_completo}</p>
                      <p className="text-gray-600">
                        {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                      </p>
                      {appointment.lead?.telefone && (
                        <p className="text-gray-500">{appointment.lead.telefone}</p>
                      )}
                    </div>

                    {appointment.status === 'scheduled' && (
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-green-600 hover:bg-green-50"
                          onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                        >
                          Concluir
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                {(selectedDate ? getAppointmentsForDate(selectedDate) : appointments).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhum agendamento encontrado</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}