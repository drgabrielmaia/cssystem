'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import {
  Calendar,
  Clock,
  User,
  Phone,
  MessageCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader,
  AlertCircle,
  Briefcase,
  Heart
} from 'lucide-react'

interface AgendaLink {
  id: string
  agenda_id: string
  lead_id?: string
  mentorado_id?: string
  titulo_customizado?: string
  descricao_customizada?: string
  duracao_customizada?: number
  ativo: boolean
  total_agendamentos?: number
  ultimo_acesso?: string
  leads?: { nome_completo: string; email: string; telefone?: string }
  mentorados?: { nome: string; email: string; telefone?: string }
  agenda_configuracoes?: {
    nome: string
    descricao: string
    duracao_minutos: number
    horario_inicio: string
    horario_fim: string
    dias_semana: number[]
    antecedencia_minima_horas: number
    cor_tema: string
  }
}

interface TimeSlot {
  datetime: string
  time: string
  available: boolean
}

interface FormData {
  nome_completo: string
  email: string
  telefone: string
  whatsapp: string
  objetivo_call: string
}

const diasSemana = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']
const meses = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export default function AgendarPage() {
  const params = useParams()
  const token = params?.token as string

  const [step, setStep] = useState(1) // 1: Data, 2: Horario, 3: Dados, 4: Confirmacao
  const [agendaLink, setAgendaLink] = useState<AgendaLink | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Estados para calendário
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Estados para formulário
  const [formData, setFormData] = useState<FormData>({
    nome_completo: '',
    email: '',
    telefone: '',
    whatsapp: '',
    objetivo_call: ''
  })

  // Estados para resultado
  const [agendamentoId, setAgendamentoId] = useState<string>('')

  useEffect(() => {
    loadAgendaLink()
  }, [token])

  useEffect(() => {
    if (selectedDate && agendaLink) {
      loadAvailableSlots(selectedDate)
    }
  }, [selectedDate, agendaLink])

  const loadAgendaLink = async () => {
    try {
      if (!token) {
        setError('Link de agendamento inválido')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('agenda_links_personalizados')
        .select(`
          *,
          leads:lead_id(nome_completo, email, telefone),
          mentorados:mentorado_id(nome, email, telefone),
          agenda_configuracoes:agenda_id(*)
        `)
        .eq('token_link', token)
        .eq('ativo', true)
        .single()

      if (error || !data) {
        setError('Link de agendamento não encontrado ou inativo')
        setLoading(false)
        return
      }

      setAgendaLink(data)

      // Pre-preencher dados se for lead ou mentorado conhecido
      if (data.leads) {
        setFormData(prev => ({
          ...prev,
          nome_completo: data.leads?.nome_completo || '',
          email: data.leads?.email || '',
          telefone: data.leads?.telefone || ''
        }))
      } else if (data.mentorados) {
        setFormData(prev => ({
          ...prev,
          nome_completo: data.mentorados?.nome || '',
          email: data.mentorados?.email || '',
          telefone: data.mentorados?.telefone || ''
        }))
      }

      // Atualizar contador de visualizações
      await supabase
        .from('agenda_links_personalizados')
        .update({ total_visualizacoes: (data.total_visualizacoes || 0) + 1 })
        .eq('id', data.id)

    } catch (error) {
      console.error('Erro ao carregar link:', error)
      setError('Erro ao carregar informações do agendamento')
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableSlots = async (date: string) => {
    if (!agendaLink?.agenda_configuracoes) return

    setLoadingSlots(true)
    try {
      const config = agendaLink.agenda_configuracoes
      const selectedDateObj = new Date(date)
      const dayOfWeek = selectedDateObj.getDay()

      // Verificar se o dia está disponível
      if (!config.dias_semana.includes(dayOfWeek)) {
        setAvailableSlots([])
        setLoadingSlots(false)
        return
      }

      // Verificar antecedência mínima
      const now = new Date()
      const minDate = new Date(now.getTime() + (config.antecedencia_minima_horas * 60 * 60 * 1000))
      if (selectedDateObj < minDate) {
        setAvailableSlots([])
        setLoadingSlots(false)
        return
      }

      // Gerar slots disponíveis
      const slots: TimeSlot[] = []
      const startTime = parseTimeString(config.horario_inicio)
      const endTime = parseTimeString(config.horario_fim)
      const duration = config.duracao_minutos

      let currentTime = startTime
      while (currentTime < endTime) {
        const slotDateTime = new Date(selectedDateObj)
        slotDateTime.setHours(Math.floor(currentTime), currentTime % 60 * 60, 0, 0)

        // Verificar se o slot está no futuro
        const isInFuture = slotDateTime > now

        slots.push({
          datetime: slotDateTime.toISOString(),
          time: formatTime(currentTime),
          available: isInFuture
        })

        currentTime += duration / 60
      }

      // Verificar agendamentos existentes
      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('data_agendada, duracao_minutos')
        .eq('agenda_id', agendaLink.agenda_id)
        .gte('data_agendada', selectedDateObj.toISOString().split('T')[0])
        .lt('data_agendada', new Date(selectedDateObj.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .in('status', ['agendado', 'confirmado'])

      if (agendamentos) {
        agendamentos.forEach(agendamento => {
          const agendamentoDate = new Date(agendamento.data_agendada)
          slots.forEach(slot => {
            const slotDate = new Date(slot.datetime)
            if (Math.abs(slotDate.getTime() - agendamentoDate.getTime()) < agendamento.duracao_minutos * 60 * 1000) {
              slot.available = false
            }
          })
        })
      }

      setAvailableSlots(slots)
    } catch (error) {
      console.error('Erro ao carregar slots:', error)
    } finally {
      setLoadingSlots(false)
    }
  }

  const parseTimeString = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours + (minutes / 60)
  }

  const formatTime = (timeFloat: number): string => {
    const hours = Math.floor(timeFloat)
    const minutes = Math.round((timeFloat % 1) * 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const today = new Date()
    const config = agendaLink?.agenda_configuracoes

    const days = []

    // Dias do mês anterior para completar a semana
    const firstDayOfWeek = firstDay.getDay()
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push({ date, isCurrentMonth: false, isAvailable: false })
    }

    // Dias do mês atual
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      const dayOfWeek = date.getDay()
      const isAvailable = config?.dias_semana.includes(dayOfWeek) && date >= today
      days.push({ date, isCurrentMonth: true, isAvailable })
    }

    // Dias do próximo mês para completar a semana
    const remainingDays = 42 - days.length // 6 semanas x 7 dias
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      days.push({ date, isCurrentMonth: false, isAvailable: false })
    }

    return days
  }

  const handleDateSelect = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    setSelectedDate(dateStr)
    setSelectedTime('')
  }

  const handleTimeSelect = (time: string, datetime: string) => {
    setSelectedTime(time)
    setStep(3)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !selectedTime || !agendaLink) return

    setSubmitting(true)
    try {
      const selectedSlot = availableSlots.find(slot => slot.time === selectedTime)
      if (!selectedSlot) throw new Error('Horário não encontrado')

      const agendamentoData = {
        agenda_id: agendaLink.agenda_id,
        lead_id: agendaLink.lead_id || null,
        mentorado_id: agendaLink.mentorado_id || null,
        titulo: agendaLink.titulo_customizado || 'Reunião Agendada',
        data_agendada: selectedSlot.datetime,
        duracao_minutos: agendaLink.duracao_customizada || agendaLink.agenda_configuracoes?.duracao_minutos || 60,
        nome_completo: formData.nome_completo,
        email: formData.email,
        telefone: formData.telefone,
        whatsapp: formData.whatsapp,
        objetivo_call: formData.objetivo_call,
        origem: agendaLink.lead_id ? 'lead' : agendaLink.mentorado_id ? 'mentorado' : 'publico',
        status: 'agendado'
      }

      const { data, error } = await supabase
        .from('agendamentos')
        .insert(agendamentoData)
        .select()
        .single()

      if (error) throw error

      // Atualizar contador de agendamentos do link
      await supabase
        .from('agenda_links_personalizados')
        .update({
          total_agendamentos: (agendaLink.total_agendamentos || 0) + 1,
          ultimo_acesso: new Date().toISOString()
        })
        .eq('id', agendaLink.id)

      setAgendamentoId(data.id)
      setStep(4)
    } catch (error) {
      console.error('Erro ao agendar:', error)
      setError('Erro ao confirmar agendamento. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatSelectedDateTime = () => {
    if (!selectedDate || !selectedTime) return ''
    const date = new Date(selectedDate)
    const dayName = diasSemana[date.getDay()]
    const day = date.getDate()
    const month = meses[date.getMonth()]
    return `${dayName}, ${day} de ${month} às ${selectedTime}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#059669]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <AlertCircle className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ops! Algo deu errado</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const config = agendaLink?.agenda_configuracoes
  const themeColor = config?.cor_tema || '#059669'

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {agendaLink?.titulo_customizado || config?.nome || 'Agendar Reunião'}
          </h1>
          <p className="text-gray-600">
            {agendaLink?.descricao_customizada || config?.descricao || 'Escolha o melhor horário para nossa conversa'}
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {agendaLink?.duracao_customizada || config?.duracao_minutos || 60} minutos
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Reunião online
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i <= step
                    ? 'bg-[#059669] text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
                style={{ backgroundColor: i <= step ? themeColor : undefined }}
              >
                {i === 4 ? <CheckCircle className="h-4 w-4" /> : i}
              </div>
              {i < 4 && (
                <div
                  className={`w-12 h-1 mx-2 ${
                    i < step ? 'bg-[#059669]' : 'bg-gray-200'
                  }`}
                  style={{ backgroundColor: i < step ? themeColor : undefined }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Conteúdo Principal */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                {/* Step 1: Selecionar Data */}
                {step === 1 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-6">Escolha uma data</h3>

                    {/* Calendar Navigation */}
                    <div className="flex items-center justify-between mb-6">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <h4 className="text-lg font-medium">
                        {meses[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </h4>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 mb-4">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day) => (
                        <div key={day} className="h-10 flex items-center justify-center text-sm font-medium text-gray-500">
                          {day}
                        </div>
                      ))}
                      {generateCalendarDays().map((day, index) => {
                        const isSelected = selectedDate === day.date.toISOString().split('T')[0]
                        const isToday = day.date.toDateString() === new Date().toDateString()

                        return (
                          <button
                            key={index}
                            onClick={() => day.isAvailable && handleDateSelect(day.date)}
                            disabled={!day.isAvailable}
                            className={`h-10 flex items-center justify-center text-sm rounded transition-colors ${
                              isSelected
                                ? 'bg-[#059669] text-white'
                                : day.isAvailable
                                ? 'hover:bg-gray-100 text-gray-900'
                                : 'text-gray-400 cursor-not-allowed'
                            } ${isToday && !isSelected ? 'bg-blue-50 text-blue-600' : ''} ${
                              !day.isCurrentMonth ? 'text-gray-300' : ''
                            }`}
                            style={{
                              backgroundColor: isSelected ? themeColor : undefined,
                              color: isSelected ? 'white' : undefined
                            }}
                          >
                            {day.date.getDate()}
                          </button>
                        )
                      })}
                    </div>

                    {selectedDate && (
                      <Button
                        onClick={() => setStep(2)}
                        className="w-full bg-[#059669] hover:bg-[#047857] text-white"
                        style={{ backgroundColor: themeColor }}
                      >
                        Continuar
                      </Button>
                    )}
                  </div>
                )}

                {/* Step 2: Selecionar Horário */}
                {step === 2 && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold">Escolha um horário</h3>
                      <Button variant="outline" onClick={() => setStep(1)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                      </Button>
                    </div>

                    <p className="text-gray-600 mb-6">
                      {selectedDate && new Date(selectedDate).toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>

                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {availableSlots
                          .filter(slot => slot.available)
                          .map((slot) => (
                            <Button
                              key={slot.datetime}
                              onClick={() => handleTimeSelect(slot.time, slot.datetime)}
                              variant="outline"
                              className="p-3 text-center hover:bg-gray-50"
                            >
                              {slot.time}
                            </Button>
                          ))}
                      </div>
                    )}

                    {availableSlots.filter(slot => slot.available).length === 0 && !loadingSlots && (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>Não há horários disponíveis para esta data</p>
                        <p className="text-sm">Tente selecionar outro dia</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Preencher Dados */}
                {step === 3 && (
                  <form onSubmit={handleSubmit}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold">Seus dados</h3>
                      <Button type="button" variant="outline" onClick={() => setStep(2)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="nome">Nome completo *</Label>
                        <Input
                          id="nome"
                          type="text"
                          value={formData.nome_completo}
                          onChange={(e) => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
                          required
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          required
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input
                          id="telefone"
                          type="tel"
                          value={formData.telefone}
                          onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="whatsapp">WhatsApp</Label>
                        <Input
                          id="whatsapp"
                          type="tel"
                          value={formData.whatsapp}
                          onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="objetivo">Objetivo da call</Label>
                        <Textarea
                          id="objetivo"
                          value={formData.objetivo_call}
                          onChange={(e) => setFormData(prev => ({ ...prev, objetivo_call: e.target.value }))}
                          placeholder="Descreva brevemente o que gostaria de discutir na reunião..."
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full mt-6 bg-[#059669] hover:bg-[#047857] text-white"
                      style={{ backgroundColor: themeColor }}
                    >
                      {submitting ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          Confirmando...
                        </>
                      ) : (
                        'Confirmar Agendamento'
                      )}
                    </Button>
                  </form>
                )}

                {/* Step 4: Confirmação */}
                {step === 4 && (
                  <div className="text-center">
                    <div className="mb-6">
                      <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Agendamento confirmado!</h3>
                      <p className="text-gray-600">Sua reunião foi agendada com sucesso</p>
                    </div>

                    <Card className="bg-gray-50">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2">Detalhes da reunião</h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Data e horário:</strong> {formatSelectedDateTime()}</p>
                          <p><strong>Duração:</strong> {agendaLink?.duracao_customizada || config?.duracao_minutos || 60} minutos</p>
                          <p><strong>Participante:</strong> {formData.nome_completo}</p>
                          <p><strong>Email:</strong> {formData.email}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="mt-6 text-sm text-gray-500">
                      <p>Um email de confirmação será enviado para você em breve.</p>
                      <p>Caso precise remarcar ou cancelar, entre em contato conosco.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar com informações */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Resumo do agendamento</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDate && selectedTime ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium">{formatSelectedDateTime()}</p>
                        <p className="text-sm text-gray-500">
                          {agendaLink?.duracao_customizada || config?.duracao_minutos || 60} minutos
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium">Reunião com</p>
                        <p className="text-sm text-gray-500">Equipe Customer Success</p>
                      </div>
                    </div>

                    {formData.objetivo_call && (
                      <div className="flex items-start gap-3">
                        <MessageCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium">Objetivo</p>
                          <p className="text-sm text-gray-500">{formData.objetivo_call}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Selecione uma data e horário para ver o resumo</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}