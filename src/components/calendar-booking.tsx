'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useCalendarSettings } from './calendar-settings'
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  MessageSquare
} from 'lucide-react'

interface FormSubmission {
  id: string
  template_id: string
  template_slug: string
  lead_id: string | null
  mentorado_id: string | null
  source_url: string | null
  submission_data: Record<string, any>
  created_at: string
  template: {
    name: string
    description: string
    fields: any[]
  } | null
  lead: {
    nome_completo: string
    email: string
    telefone: string
  } | null
  mentorado: {
    nome_completo: string
    email: string
  } | null
}

interface CalendarBookingProps {
  submission: FormSubmission
  isOpen: boolean
  onClose: () => void
}

// Horários disponíveis (9h às 19h) - configurado dinamicamente
const AVAILABLE_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
]

export function CalendarBooking({ submission, isOpen, onClose }: CalendarBookingProps) {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'calendar' | 'confirmation' | 'success'>('calendar')
  const [bookingData, setBookingData] = useState<any>(null)

  // Usar configurações dinâmicas do calendário
  const { settings, availableSlots, loading: settingsLoading } = useCalendarSettings()

  // Gerar próximos dias baseado nas configurações
  const getAvailableDates = () => {
    const dates = []
    const today = new Date()
    const availableDays = settings?.available_days || [1, 2, 3, 4, 5]
    const advanceBookingDays = settings?.advance_booking_days || 1
    const maxBookingDays = settings?.max_booking_days || 30

    for (let i = advanceBookingDays; i <= maxBookingDays + advanceBookingDays; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)

      // Verificar se o dia da semana está disponível
      if (availableDays.includes(date.getDay())) {
        dates.push(date)
      }
    }

    return dates
  }

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateForDb = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) return

    setLoading(true)

    try {
      const contactInfo = submission.lead || submission.mentorado

      if (!contactInfo) {
        throw new Error('Dados de contato não encontrados')
      }

      // Criar agendamento na tabela calendar_events (existente)
      const startDateTime = new Date(`${selectedDate}T${selectedTime}:00-03:00`)
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000) // +1 hora

      const eventInfo = {
        title: `Call de Qualificação - ${contactInfo.nome_completo}`,
        description: `Agendamento via formulário: ${submission.template?.name || submission.template_slug}`,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        all_day: false,
        lead_id: submission.lead_id,
        mentorado_id: submission.mentorado_id,
        call_status: 'agendado',
        tipo_call: 'qualificacao',
        origem_agendamento: 'formulario_automatico',
        nome_contato: contactInfo.nome_completo,
        email_contato: contactInfo.email || '',
        telefone_contato: submission.lead?.telefone || '',
        whatsapp_contato: submission.lead?.telefone || '',
        objetivo_call: 'Qualificação inicial via formulário',
        status_confirmacao: 'pendente',
        notificacao_enviada: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('🗓️ Tentando criar agendamento:', eventInfo)

      const { data, error } = await supabase
        .from('calendar_events')
        .insert([eventInfo])
        .select()
        .single()

      if (error) {
        console.error('❌ Erro detalhado ao criar agendamento:', error)
        console.error('📋 Dados que tentamos inserir:', eventInfo)

        // Verificar se é um erro de campo obrigatório
        if (error.message?.includes('null value in column')) {
          const fieldMatch = error.message.match(/null value in column "([^"]+)"/)
          const fieldName = fieldMatch ? fieldMatch[1] : 'desconhecido'
          throw new Error(`Campo obrigatório não preenchido: ${fieldName}. Verifique se todos os dados necessários estão configurados.`)
        }

        throw new Error(`Erro no banco de dados: ${error.message}`)
      }

      console.log('✅ Agendamento criado com sucesso:', data)
      setBookingData(data)

      // Enviar notificações via API
      await fetch('/api/send-booking-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          booking: data,
          submission: submission
        })
      })

      setStep('success')

    } catch (error: any) {
      console.error('💥 Erro completo no agendamento:', error)

      let errorMessage = 'Erro ao agendar call. Tente novamente.'

      if (error.message) {
        errorMessage = error.message
      }

      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            <span>Agendar Call de Qualificação</span>
          </DialogTitle>
        </DialogHeader>

        {step === 'calendar' && (
          <div className="space-y-6">
            {/* Informações do Lead */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Dados do Contato:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span>{(submission.lead || submission.mentorado)?.nome_completo}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-emerald-600" />
                  <span>{(submission.lead || submission.mentorado)?.email}</span>
                </div>
                {submission.lead?.telefone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-orange-600" />
                    <span>{submission.lead.telefone}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span>Formulário: {submission.template?.name || submission.template_slug}</span>
                </div>
              </div>
            </div>

            {/* Seleção de Data */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Escolha uma data:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {getAvailableDates().map((date) => {
                  const dateStr = formatDateForDb(date)
                  const isSelected = selectedDate === dateStr

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`
                        p-3 rounded-lg text-left text-sm transition-all duration-200
                        ${isSelected
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }
                      `}
                    >
                      <div className="font-medium">
                        {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </div>
                      <div className="text-xs opacity-75">
                        {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Seleção de Horário */}
            {selectedDate && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Escolha um horário para {selectedDateObj && formatDateForDisplay(selectedDateObj)}:
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {(availableSlots.length > 0 ? availableSlots : AVAILABLE_TIMES).map((time) => {
                    const isSelected = selectedTime === time

                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`
                          p-2 rounded-lg text-center transition-all duration-200
                          ${isSelected
                            ? 'bg-emerald-600 text-white shadow-lg'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                          }
                        `}
                      >
                        <Clock className="h-4 w-4 mx-auto mb-1" />
                        <div className="text-sm font-medium">{time}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleBooking}
                disabled={!selectedDate || !selectedTime || loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {loading ? 'Agendando...' : 'Confirmar Agendamento'}
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center space-y-6 py-8">
            <div className="flex justify-center">
              <div className="p-4 bg-emerald-100 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Call Agendada com Sucesso!
              </h3>
              <p className="text-gray-600">
                O agendamento foi confirmado e as notificações foram enviadas.
              </p>
            </div>

            {bookingData && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 text-left">
                <h4 className="font-semibold text-gray-900 mb-2">Detalhes do Agendamento:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data:</span>
                    <span className="font-medium">{new Date(bookingData.start_datetime).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Horário:</span>
                    <span className="font-medium">{new Date(bookingData.start_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contato:</span>
                    <span className="font-medium">{bookingData.nome_contato}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge className="bg-emerald-100 text-emerald-800">Agendado</Badge>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3 justify-center">
              <Button
                onClick={onClose}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                Fechar
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('/calendario', '_blank')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Ver Calendário
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}