'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  Video,
  CheckCircle2,
  ArrowLeft,
  ArrowRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Lead {
  id: string
  nome_completo: string
  email: string
  telefone?: string
  closer_id?: string
  temperatura?: string
  lead_score?: number
}

interface Closer {
  id: string
  nome_completo: string
  email: string
  tipo_closer: string
}

interface TimeSlot {
  date: string
  start_time: string
  end_time: string
  available: boolean
}

export default function AgendarCallPage() {
  const params = useParams()
  const token = params.token as string
  
  const [lead, setLead] = useState<Lead | null>(null)
  const [closer, setCloser] = useState<Closer | null>(null)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [appointmentType, setAppointmentType] = useState<'discovery' | 'demo'>('discovery')
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [success, setSuccess] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(0)

  useEffect(() => {
    if (token) {
      loadLeadData()
    }
  }, [token])

  useEffect(() => {
    if (selectedDate && closer) {
      loadAvailableSlots()
    }
  }, [selectedDate, closer])

  const loadLeadData = async () => {
    try {
      // Decode token (assumindo que é o lead_id base64 encoded ou similar)
      let leadId: string
      try {
        leadId = atob(token)
      } catch {
        leadId = token // Se não conseguir decodificar, usar direto
      }

      // Buscar dados do lead
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('id, nome_completo, email, telefone, closer_id, temperatura, lead_score')
        .eq('id', leadId)
        .single()

      if (leadError || !leadData) {
        console.error('Lead não encontrado:', leadError)
        return
      }

      setLead(leadData)

      // Se lead já tem closer atribuído, buscar dados do closer
      if (leadData.closer_id) {
        const { data: closerData, error: closerError } = await supabase
          .from('closers')
          .select('id, nome_completo, email, tipo_closer')
          .eq('id', leadData.closer_id)
          .single()

        if (!closerError && closerData) {
          setCloser(closerData)
        }
      } else {
        // Se não tem closer, buscar um disponível
        const { data: availableCloser, error: closerError } = await supabase
          .from('closers')
          .select('id, nome_completo, email, tipo_closer')
          .eq('tipo_closer', 'closer')
          .eq('status_contrato', 'ativo')
          .order('total_leads_atendidos', { ascending: true })
          .limit(1)
          .single()

        if (!closerError && availableCloser) {
          setCloser(availableCloser)
        }
      }

      // Definir data inicial (amanhã)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setSelectedDate(tomorrow.toISOString().split('T')[0])

    } catch (error) {
      console.error('Erro ao carregar dados do lead:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableSlots = async () => {
    if (!closer || !selectedDate) return

    try {
      const { data: slots, error } = await supabase
        .rpc('get_closer_availability', {
          p_closer_id: closer.id,
          p_date: selectedDate
        })

      if (error) {
        console.error('Erro ao buscar slots:', error)
        return
      }

      setAvailableSlots(slots || [])
    } catch (error) {
      console.error('Erro ao carregar slots disponíveis:', error)
    }
  }

  const scheduleAppointment = async () => {
    if (!lead || !closer || !selectedSlot) return

    setBooking(true)
    try {
      const response = await fetch('/api/appointments/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead_id: lead.id,
          closer_id: closer.id,
          appointment_type: appointmentType,
          preferred_date: selectedDate,
          preferred_time: selectedSlot.start_time
        })
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(true)
      } else {
        console.error('Erro ao agendar:', result.error)
        alert(`Erro ao agendar: ${result.error}`)
      }
    } catch (error) {
      console.error('Erro no agendamento:', error)
      alert('Erro ao agendar. Tente novamente.')
    } finally {
      setBooking(false)
    }
  }

  const getNextWeekDates = () => {
    const dates = []
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + 1 + (currentWeek * 7)) // Começar amanhã + semanas

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      
      // Pular fins de semana
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        dates.push(date)
      }
    }
    return dates
  }

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!lead || !closer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <CheckCircle2 className="h-16 w-16 mx-auto" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Link Inválido</h2>
            <p className="text-gray-600">
              Não foi possível encontrar seus dados. Verifique o link ou entre em contato conosco.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-green-500 mb-4">
              <CheckCircle2 className="h-16 w-16 mx-auto" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Agendamento Confirmado!</h2>
            <p className="text-gray-600 mb-4">
              Sua call foi agendada para <strong>{new Date(selectedDate).toLocaleDateString('pt-BR')}</strong> às{' '}
              <strong>{selectedSlot ? formatTime(selectedSlot.start_time) : ''}</strong>
            </p>
            <p className="text-sm text-gray-500">
              {closer.nome_completo} entrará em contato com você antes da reunião.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Agende sua Call de Descoberta
          </h1>
          <p className="text-gray-600">
            Olá <strong>{lead.nome_completo}</strong>, escolha o melhor horário para nossa conversa
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Informações do Closer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Seu Consultor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{closer.nome_completo}</h3>
                  <p className="text-gray-600">Consultor Especializado</p>
                </div>
              </div>
              
              {/* Tipo de Call */}
              <div className="space-y-3">
                <h4 className="font-medium">Tipo de Reunião:</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="appointmentType"
                      value="discovery"
                      checked={appointmentType === 'discovery'}
                      onChange={(e) => setAppointmentType(e.target.value as 'discovery')}
                      className="text-blue-600"
                    />
                    <Phone className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium">Call de Descoberta</div>
                      <div className="text-sm text-gray-600">Conversar sobre seus objetivos (30 min)</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="appointmentType"
                      value="demo"
                      checked={appointmentType === 'demo'}
                      onChange={(e) => setAppointmentType(e.target.value as 'demo')}
                      className="text-blue-600"
                    />
                    <Video className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="font-medium">Demonstração</div>
                      <div className="text-sm text-gray-600">Ver nossa metodologia na prática (45 min)</div>
                    </div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seleção de Data e Horário */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Escolha Data e Horário
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeek(Math.max(0, currentWeek - 1))}
                    disabled={currentWeek === 0}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeek(currentWeek + 1)}
                    disabled={currentWeek >= 2}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Seleção de Datas */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {getNextWeekDates().map(date => {
                  const dateStr = date.toISOString().split('T')[0]
                  const isSelected = selectedDate === dateStr
                  
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white hover:bg-blue-50 border-gray-200'
                      }`}
                    >
                      <div className="text-sm font-medium">
                        {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </div>
                      <div className="text-xs">
                        {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Horários Disponíveis */}
              {selectedDate && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Horários Disponíveis
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {availableSlots.length > 0 ? (
                      availableSlots.filter(slot => slot.available).map(slot => (
                        <button
                          key={`${slot.date}-${slot.start_time}`}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-2 rounded border text-sm transition-colors ${
                            selectedSlot?.start_time === slot.start_time
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white hover:bg-blue-50 border-gray-200'
                          }`}
                        >
                          {formatTime(slot.start_time)}
                        </button>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-4 text-gray-500">
                        Nenhum horário disponível para esta data
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botão de Agendamento */}
              {selectedSlot && (
                <div className="mt-6">
                  <Button
                    onClick={scheduleAppointment}
                    disabled={booking}
                    className="w-full"
                    size="lg"
                  >
                    {booking ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Agendando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Confirmar Agendamento
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}