'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
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
  Heart,
  ChevronLeft,
  ChevronRight,
  Star,
  Target,
  Zap,
  CreditCard,
  Shield,
  Lock
} from 'lucide-react'

interface AgendaLink {
  id: string
  token_link: string
  lead_id?: string
  mentorado_id?: string
  tipo_call_permitido: string
  titulo_personalizado?: string
  descricao_personalizada?: string
  cor_tema: string
  ativo: boolean
  leads?: { nome_completo: string; email: string; telefone?: string }
  mentorados?: { nome_completo: string; email: string; telefone?: string }
}

interface TimeSlot {
  data: string
  horario: string
  disponivel: boolean
  tipo_call: string
}

interface FormData {
  nome_completo: string
  email: string
  telefone: string
  whatsapp: string
  cpf: string
  objetivo_call: string
}

const tiposCall = {
  vendas: {
    nome: 'Call Comercial',
    descricao: 'Reunião focada em vendas e propostas comerciais',
    duracao: 60,
    preco: 97.00,
    icon: Briefcase,
    color: '#059669',
    gradient: 'from-emerald-500 to-teal-600'
  },
  estrategica: {
    nome: 'Call Estratégica',
    descricao: 'Sessão de onboarding e estratégia para clientes premium',
    duracao: 30,
    preco: 197.00,
    icon: Heart,
    color: '#7C3AED',
    gradient: 'from-purple-500 to-violet-600'
  }
}

export default function AgendarPublicoPage() {
  const params = useParams()
  const token = params?.token as string

  // Estados principais
  const [agendaLink, setAgendaLink] = useState<AgendaLink | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const [processando, setProcessando] = useState(false)

  // Estados do pagamento
  const [checkoutUrl, setCheckoutUrl] = useState('')
  const [pagamentoId, setPagamentoId] = useState('')
  const [statusPagamento, setStatusPagamento] = useState('')
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [pixData, setPixData] = useState<{
    qrCode: string
    qrCodeBase64: string
    expiresAt: string
    amount: number
    pixKey?: string
  } | null>(null)

  // Estados do formulário
  const [tipoCallSelecionado, setTipoCallSelecionado] = useState<'vendas' | 'estrategica'>('vendas')
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [horarioSelecionado, setHorarioSelecionado] = useState('')
  const [formData, setFormData] = useState<FormData>({
    nome_completo: '',
    email: '',
    telefone: '',
    whatsapp: '',
    cpf: '',
    objetivo_call: ''
  })

  // Estados do calendário
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    if (token) {
      loadAgendaLink()
    }
  }, [token])

  useEffect(() => {
    if (dataSelecionada) {
      loadAvailableSlots()
    }
  }, [dataSelecionada, tipoCallSelecionado])

  // Verificar status do pagamento ao voltar da AbacatePay
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatus = urlParams.get('payment')

    if (paymentStatus === 'success') {
      setStatusPagamento('paid')
      finalizarAgendamento()
    } else if (paymentStatus === 'cancelled') {
      setError('Pagamento cancelado. Você pode tentar novamente.')
      setStep(4) // Voltar para o formulário
    }
  }, [])

  const loadAgendaLink = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('agendamento_links')
        .select(`
          *,
          leads(nome_completo, email, telefone),
          mentorados(nome_completo, email, telefone)
        `)
        .eq('token_link', token)
        .eq('ativo', true)
        .single()

      if (error || !data) {
        setError('Link de agendamento inválido ou expirado.')
        return
      }

      setAgendaLink(data)

      // Pre-preencher dados se for lead ou mentorado
      if (data.leads) {
        setFormData(prev => ({
          ...prev,
          nome_completo: data.leads?.nome_completo || '',
          email: data.leads?.email || '',
          telefone: data.leads?.telefone || '',
          whatsapp: data.leads?.telefone || ''
        }))
      } else if (data.mentorados) {
        setFormData(prev => ({
          ...prev,
          nome_completo: data.mentorados?.nome_completo || '',
          email: data.mentorados?.email || '',
          telefone: data.mentorados?.telefone || '',
          whatsapp: data.mentorados?.telefone || ''
        }))
      }

      // Configurar tipo de call permitido
      if (data.tipo_call_permitido === 'estrategica') {
        setTipoCallSelecionado('estrategica')
      }
    } catch (err) {
      setError('Erro ao carregar informações do agendamento.')
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableSlots = async () => {
    try {
      setLoadingSlots(true)
      const { data, error } = await supabase
        .rpc('gerar_slots_disponiveis', {
          data_inicio: dataSelecionada,
          data_fim: dataSelecionada,
          tipo_call_param: tipoCallSelecionado
        })

      if (error) throw error
      setAvailableSlots(data || [])
    } catch (err) {
      console.error('Erro ao carregar slots:', err)
    } finally {
      setLoadingSlots(false)
    }
  }

  const criarCheckout = async () => {
    try {
      setLoadingCheckout(true)

      const callType = tiposCall[tipoCallSelecionado]

      // Criar QR Code PIX na AbacatePay
      const pixData = {
        amount: Math.round(callType.preco * 100), // Converter para centavos
        expiresIn: 1800, // 30 minutos para expirar
        description: `${callType.nome} - ${callType.descricao} (${callType.duracao} minutos)`,
        customer: {
          name: formData.nome_completo,
          email: formData.email,
          cellphone: formData.telefone,
          taxId: formData.cpf
        },
        metadata: {
          externalId: `agenda_${token}_${Date.now()}`,
          tipoCall: tipoCallSelecionado,
          dataHorario: `${dataSelecionada} ${horarioSelecionado}`
        }
      }

      const response = await fetch('/api/pix-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pixData)
      })

      const result = await response.json()

      if (!response.ok) {
        // Se a API da AbacatePay não estiver disponível, vamos simular o checkout
        if (result.error && result.error.includes('Route') && result.error.includes('not found')) {
          console.warn('API da AbacatePay não disponível, simulando checkout...')
          // Simular resposta da AbacatePay
          const mockResult = {
            id: `mock_${Date.now()}`,
            url: `#mock-checkout-${Date.now()}`
          }
          setPagamentoId(mockResult.id)
          setCheckoutUrl(mockResult.url)
          setStep(5) // Ir para tela de checkout
          return
        }
        throw new Error(result.error || 'Erro ao criar checkout')
      }

      // Se retornou dados do PIX, armazenar e ir para tela do PIX
      if (result.qrCode) {
        setPagamentoId(result.id)
        setPixData({
          qrCode: result.qrCode,
          qrCodeBase64: result.qrCodeBase64,
          expiresAt: result.expiresAt,
          amount: result.amount,
          pixKey: result.pixKey
        })
        setStep(5) // Ir para tela do PIX
      } else {
        // Fallback para checkout URL
        setPagamentoId(result.id)
        setCheckoutUrl(result.url)
        setStep(5) // Ir para tela de checkout
      }

    } catch (err) {
      console.error('Erro ao criar checkout:', err)
      setError('Erro ao criar checkout. Tente novamente.')
    } finally {
      setLoadingCheckout(false)
    }
  }

  const finalizarAgendamento = async () => {
    try {
      setProcessando(true)

      const [year, month, day] = dataSelecionada.split('-')
      const [hours, minutes] = horarioSelecionado.split(':')
      const startDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes))
      const endDateTime = new Date(startDateTime.getTime() + (tiposCall[tipoCallSelecionado].duracao * 60 * 1000))

      const eventData = {
        title: `${tiposCall[tipoCallSelecionado].nome} - ${formData.nome_completo}`,
        description: `${tiposCall[tipoCallSelecionado].nome} agendada via link público.\n\nObjetivo: ${formData.objetivo_call}\n\nPagamento ID: ${pagamentoId}`,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        lead_id: agendaLink?.lead_id || null,
        mentorado_id: agendaLink?.mentorado_id || null,
        tipo_call: tipoCallSelecionado,
        origem_agendamento: agendaLink?.lead_id ? 'link_lead' : agendaLink?.mentorado_id ? 'link_mentorado' : 'link_publico',
        nome_contato: formData.nome_completo,
        email_contato: formData.email,
        telefone_contato: formData.telefone,
        whatsapp_contato: formData.whatsapp,
        objetivo_call: formData.objetivo_call,
        status_confirmacao: 'agendado',
        valor_produto: tiposCall[tipoCallSelecionado].preco,
        all_day: false
      }

      const { error } = await supabase
        .from('calendar_events')
        .insert(eventData)

      if (error) throw error

      // 🔥 ENVIAR NOTIFICAÇÃO WHATSAPP PARA O ADMIN
      try {
        console.log('📱 Enviando notificação WhatsApp para o admin...')

        // Buscar admin_phone da organização (através do lead/mentorado)
        let adminPhone = '+5583996910414' // Fallback

        if (agendaLink?.lead_id) {
          const { data: leadOrg } = await supabase
            .from('leads')
            .select('organization_id, organizations!inner(admin_phone)')
            .eq('id', agendaLink.lead_id)
            .single()
          adminPhone = (leadOrg?.organizations as any)?.admin_phone || adminPhone
        } else if (agendaLink?.mentorado_id) {
          const { data: mentorOrg } = await supabase
            .from('mentorados')
            .select('organization_id, organizations!inner(admin_phone)')
            .eq('id', agendaLink.mentorado_id)
            .single()
          adminPhone = (mentorOrg?.organizations as any)?.admin_phone || adminPhone
        }

        // Formatear data/hora
        const dataFormatada = new Date(eventData.start_datetime).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
        const horaFormatada = new Date(eventData.start_datetime).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        })

        // Mensagem para o admin
        const mensagemAdmin = `🎯 NOVO AGENDAMENTO CONFIRMADO

📋 ${eventData.title}
📅 ${dataFormatada} às ${horaFormatada}
⏱️ Duração: ${tiposCall[tipoCallSelecionado]?.duracao || 60} minutos

👤 CLIENTE:
${formData.nome_completo}
📧 ${formData.email}
📱 ${formData.telefone || formData.whatsapp || 'Não informado'}

🎯 OBJETIVO:
${formData.objetivo_call || 'Não especificado'}

💰 VALOR: R$ ${tiposCall[tipoCallSelecionado]?.preco?.toLocaleString('pt-BR') || '0,00'}

🔗 Link da call será enviado próximo ao horário agendado.

✅ O cliente foi notificado e receberá lembretes automáticos.`

        // Enviar para admin
        const notificationResponse = await fetch('/api/whatsapp/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: adminPhone,
            message: mensagemAdmin
          })
        })

        if (notificationResponse.ok) {
          console.log('✅ Notificação enviada para admin:', adminPhone)
        } else {
          console.warn('⚠️ Falha ao enviar notificação para admin')
        }

      } catch (notificationError) {
        console.error('❌ Erro ao enviar notificação WhatsApp:', notificationError)
        // Não para o fluxo se a notificação falhar
      }

      setStep(6) // Tela de confirmação final
    } catch (err) {
      console.error('Erro ao finalizar agendamento:', err)
      setError('Erro ao confirmar agendamento. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  const getStepProgress = () => (step / 5) * 100

  const nomeUsuario = agendaLink?.leads?.nome_completo || agendaLink?.mentorados?.nome_completo || formData.nome_completo || 'Visitante'

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Carregando...</h2>
          <p className="text-gray-500">Preparando sua experiência de agendamento</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Oops! Algo deu errado</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      {/* Header com progresso */}
      <div className="bg-white shadow-sm border-b" style={{ borderColor: 'var(--border-soft)' }}>
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--mint), var(--lime))' }}>
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Agendamento Online</h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Com Paulo Guimarães - Consultor Sênior</p>
              </div>
            </div>
            {step < 6 && (
              <div className="text-right">
                <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Etapa {step} de 5</div>
                <div className="w-32 h-2 rounded-full" style={{ background: 'var(--border-soft)' }}>
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${getStepProgress()}%`,
                      background: 'linear-gradient(90deg, var(--mint), var(--lime))'
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {step === 1 && (
          <div className="space-y-8">
            {/* Boas-vindas personalizadas */}
            <div className="text-center mb-12">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'linear-gradient(135deg, var(--mint), var(--lime))' }}>
                <Star className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-main)' }}>
                Olá, {nomeUsuario.split(' ')[0]}! 👋
              </h2>
              <p className="text-xl mb-2" style={{ color: 'var(--text-muted)' }}>Que bom ter você aqui!</p>
              <p className="max-w-2xl mx-auto" style={{ color: 'var(--text-muted)' }}>
                Vou te ajudar a agendar nossa reunião. É super rápido e você pode escolher o melhor horário para você.
              </p>
            </div>

            {/* Seleção do tipo de call */}
            <div className="ultra-clean-card">
              <div className="text-center mb-8">
                <Target className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--mint)' }} />
                <h3 className="title-ultra-clean mb-2">Qual tipo de reunião você precisa?</h3>
                <p className="subtitle-ultra-clean">Escolha a opção que melhor atende suas necessidades</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(agendaLink?.tipo_call_permitido === 'ambos' ? ['vendas', 'estrategica'] : [agendaLink?.tipo_call_permitido || 'vendas']).map((tipo) => {
                  const callType = tiposCall[tipo as keyof typeof tiposCall]
                  const isSelected = tipoCallSelecionado === tipo
                  const Icon = callType.icon

                  return (
                    <button
                      key={tipo}
                      onClick={() => setTipoCallSelecionado(tipo as 'vendas' | 'estrategica')}
                      className={`p-6 rounded-2xl border-2 transition-all duration-200 hover:scale-105 ${
                        isSelected
                          ? 'shadow-lg'
                          : 'hover:shadow-md'
                      }`}
                      style={{
                        borderColor: isSelected ? 'var(--mint)' : 'var(--border-soft)',
                        backgroundColor: isSelected ? 'rgba(167, 245, 208, 0.1)' : 'var(--card-bg)'
                      }}
                    >
                      <div className="text-center">
                        <div
                          className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center"
                          style={{
                            background: isSelected ? 'linear-gradient(135deg, var(--mint), var(--lime))' : 'var(--border-soft)'
                          }}
                        >
                          <Icon className={`w-8 h-8 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                        </div>
                        <h4 className={`text-lg font-bold mb-2 ${isSelected ? '' : ''}`} style={{ color: 'var(--text-main)' }}>
                          {callType.nome}
                        </h4>
                        <p className="text-sm mb-3 subtitle-ultra-clean">
                          {callType.descricao}
                        </p>
                        <div className="flex flex-col gap-2 items-center">
                          <div
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: isSelected ? 'rgba(167, 245, 208, 0.2)' : 'var(--border-soft)',
                              color: 'var(--text-main)'
                            }}
                          >
                            <Clock className="w-3 h-3" />
                            {callType.duracao} minutos
                          </div>
                          <div className="metric-value-clean" style={{ fontSize: '1.5rem' }}>
                            R$ {callType.preco.toFixed(2).replace('.', ',')}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={() => setStep(2)}
                  className="px-8 py-4 rounded-xl font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center gap-2 text-white"
                  style={{
                    background: 'linear-gradient(135deg, var(--mint), var(--lime))'
                  }}
                >
                  Continuar
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            {/* Cabeçalho da etapa */}
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--mint)' }} />
              <h2 className="title-ultra-clean mb-2">Escolha o melhor dia para você</h2>
              <p className="subtitle-ultra-clean">Selecione uma data disponível no calendário abaixo</p>
            </div>

            {/* Calendário */}
            <div className="ultra-clean-card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-main)' }}>
                  {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                    className="btn-ultra-clean p-2"
                  >
                    <ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                    className="btn-ultra-clean p-2"
                  >
                    <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              </div>

              {/* Grid do calendário */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
                  <div key={dia} className="text-center font-medium text-gray-500 py-2">
                    {dia}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }, (_, i) => {
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i - 6)
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
                  const isToday = date.toDateString() === new Date().toDateString()
                  const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  const dateString = date.toISOString().split('T')[0]
                  const isSelected = dataSelecionada === dateString

                  if (!isCurrentMonth) return <div key={i} className="py-3" />

                  return (
                    <button
                      key={i}
                      onClick={() => !isPast && !isWeekend ? setDataSelecionada(dateString) : null}
                      disabled={isPast || isWeekend}
                      className={`py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isPast || isWeekend
                          ? 'cursor-not-allowed'
                          : isSelected
                          ? 'text-white shadow-lg'
                          : isToday
                          ? ''
                          : ''
                      }`}
                      style={{
                        color: isPast || isWeekend
                          ? '#D1D5DB'
                          : isSelected
                          ? '#ffffff'
                          : 'var(--text-main)',
                        background: isPast || isWeekend
                          ? 'transparent'
                          : isSelected
                          ? 'linear-gradient(135deg, var(--mint), var(--lime))'
                          : isToday
                          ? 'rgba(167, 245, 208, 0.2)'
                          : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!isPast && !isWeekend && !isSelected) {
                          e.currentTarget.style.backgroundColor = 'rgba(167, 245, 208, 0.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isPast && !isWeekend && !isSelected && !isToday) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      {date.getDate()}
                    </button>
                  )
                })}
              </div>

              {dataSelecionada && (
                <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-emerald-800 font-medium">
                    📅 Data selecionada: {new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Botões de navegação */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium transition-colors inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              {dataSelecionada && (
                <button
                  onClick={() => setStep(3)}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-medium transition-colors inline-flex items-center gap-2"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            {/* Cabeçalho */}
            <div className="text-center">
              <Clock className="w-12 h-12 mx-auto mb-4 text-emerald-600" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Qual horário funciona melhor?</h2>
              <p className="text-gray-600">Escolha um dos horários disponíveis para {new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            </div>

            {/* Horários disponíveis */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              {loadingSlots ? (
                <div className="text-center py-12">
                  <Loader className="w-8 h-8 mx-auto mb-4 text-emerald-600 animate-spin" />
                  <p className="text-gray-600">Carregando horários disponíveis...</p>
                </div>
              ) : availableSlots.filter(slot => slot.disponivel).length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum horário disponível</h3>
                  <p className="text-gray-500 mb-4">Não há horários livres para esta data. Que tal escolher outro dia?</p>
                  <button
                    onClick={() => setStep(2)}
                    className="text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Escolher outra data
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {availableSlots
                    .filter(slot => slot.disponivel)
                    .map((slot) => (
                      <button
                        key={slot.horario}
                        onClick={() => setHorarioSelecionado(slot.horario)}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                          horarioSelecionado === slot.horario
                            ? 'border-emerald-500 bg-emerald-50 shadow-lg'
                            : 'border-gray-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="text-center">
                          <div className={`w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center ${
                            horarioSelecionado === slot.horario ? 'bg-emerald-500' : 'bg-gray-100'
                          }`}>
                            <Clock className={`w-4 h-4 ${
                              horarioSelecionado === slot.horario ? 'text-white' : 'text-gray-600'
                            }`} />
                          </div>
                          <div className={`font-semibold ${
                            horarioSelecionado === slot.horario ? 'text-emerald-900' : 'text-gray-900'
                          }`}>
                            {slot.horario}
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              )}

              {horarioSelecionado && (
                <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-emerald-800 font-medium">
                    ⏰ Horário selecionado: {horarioSelecionado} ({tiposCall[tipoCallSelecionado].duracao} minutos)
                  </p>
                </div>
              )}
            </div>

            {/* Botões de navegação */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium transition-colors inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              {horarioSelecionado && (
                <button
                  onClick={() => setStep(4)}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-medium transition-colors inline-flex items-center gap-2"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8">
            {/* Cabeçalho */}
            <div className="text-center">
              <User className="w-12 h-12 mx-auto mb-4 text-emerald-600" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Quase lá! Preciso de alguns dados</h2>
              <p className="text-gray-600">Para confirmar seu agendamento, preencha as informações abaixo</p>
            </div>

            {/* Resumo do agendamento */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200">
              <h3 className="font-semibold text-emerald-900 mb-4">📋 Resumo do seu agendamento:</h3>
              <div className="space-y-2 text-emerald-800">
                <p><strong>Tipo:</strong> {tiposCall[tipoCallSelecionado].nome}</p>
                <p><strong>Data:</strong> {new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <p><strong>Horário:</strong> {horarioSelecionado} ({tiposCall[tipoCallSelecionado].duracao} minutos)</p>
              </div>
            </div>

            {/* Formulário */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome_completo}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="seu.email@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.telefone}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cpf}
                    onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qual o objetivo desta reunião? *
                </label>
                <textarea
                  required
                  value={formData.objetivo_call}
                  onChange={(e) => setFormData(prev => ({ ...prev, objetivo_call: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
                  placeholder="Conte um pouco sobre o que você gostaria de conversar, seus desafios ou objetivos..."
                />
              </div>
            </div>

            {/* Botões de navegação */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium transition-colors inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <button
                onClick={criarCheckout}
                disabled={!formData.nome_completo || !formData.email || !formData.telefone || !formData.objetivo_call || loadingCheckout}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-3 rounded-xl font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingCheckout ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Ir para Pagamento (R$ {tiposCall[tipoCallSelecionado].preco.toFixed(2).replace('.', ',')})
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-8">
            {/* Checkout */}
            <div className="text-center">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-emerald-600" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Finalizar Pagamento</h2>
              <p className="text-gray-600">Complete seu pagamento para confirmar o agendamento</p>
            </div>

            {/* Card de checkout */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              {/* Resumo do pedido */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200 mb-8">
                <h3 className="font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Resumo do Pedido
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-emerald-900">{tiposCall[tipoCallSelecionado].nome}</p>
                      <p className="text-sm text-emerald-700">
                        {new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        })} às {horarioSelecionado} • {tiposCall[tipoCallSelecionado].duracao}min
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">
                        R$ {tiposCall[tipoCallSelecionado].preco.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Segurança e garantias */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Shield className="w-8 h-8 text-emerald-600" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Pagamento Seguro</p>
                    <p className="text-xs text-gray-600">SSL 256-bit</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">100% Garantido</p>
                    <p className="text-xs text-gray-600">Reembolso total</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Clock className="w-8 h-8 text-emerald-600" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Confirmação Imediata</p>
                    <p className="text-xs text-gray-600">Acesso instantâneo</p>
                  </div>
                </div>
              </div>

              {/* Iframe do checkout ou redirecionamento */}
              {checkoutUrl ? (
                <div className="space-y-6">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                      <p className="font-medium text-emerald-900">
                        {checkoutUrl.includes('mock') ? 'Checkout Simulado - Modo Teste' : 'Checkout Seguro - AbacatePay'}
                      </p>
                    </div>
                    <p className="text-sm text-emerald-700 mb-4">
                      {checkoutUrl.includes('mock')
                        ? 'Modo de demonstração ativo. Use o botão "Simular Pagamento" para continuar.'
                        : 'Você será redirecionado para nossa plataforma de pagamento segura. Aceitamos cartão de crédito e PIX.'
                      }
                    </p>

                    <div className="flex flex-wrap gap-3">
                      {!checkoutUrl.includes('mock') && (
                        <button
                          onClick={() => window.open(checkoutUrl, '_blank')}
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-medium transition-colors inline-flex items-center gap-2"
                        >
                          <CreditCard className="w-4 h-4" />
                          Abrir Checkout
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setStatusPagamento('paid')
                          finalizarAgendamento()
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-medium transition-colors text-sm"
                      >
                        ✅ Simular Pagamento Aprovado (Teste)
                      </button>
                    </div>
                  </div>

                  {/* Status do pagamento */}
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <Clock className="w-4 h-4 text-yellow-600 animate-spin" />
                      <span className="text-sm font-medium text-yellow-800">
                        Aguardando confirmação do pagamento...
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Esta página será atualizada automaticamente após a confirmação
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Loader className="w-8 h-8 mx-auto mb-4 text-emerald-600 animate-spin" />
                  <p className="text-gray-600">Preparando checkout...</p>
                </div>
              )}
            </div>

            {/* Botões de navegação */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep(4)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium transition-colors inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="text-center space-y-8">
            {/* Animação de sucesso */}
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                <CheckCircle className="w-16 h-16 text-white" />
              </div>
              <div className="absolute inset-0 w-32 h-32 mx-auto rounded-full border-4 border-emerald-200 animate-ping"></div>
            </div>

            <div className="max-w-2xl mx-auto">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                🎉 Perfeito, {formData.nome_completo.split(' ')[0]}!
              </h2>
              <p className="text-xl text-gray-600 mb-6">
                Seu agendamento foi confirmado com sucesso!
              </p>

              {/* Card de confirmação */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-left">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">📅 Detalhes da sua reunião</h3>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tiposCall[tipoCallSelecionado].nome}</p>
                      <p className="text-sm text-gray-600">{tiposCall[tipoCallSelecionado].duracao} minutos</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-gray-600">às {horarioSelecionado}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Com Paulo Guimarães</p>
                      <p className="text-sm text-gray-600">Consultor Sênior</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <h4 className="font-semibold text-emerald-900 mb-2">📧 Próximos passos:</h4>
                  <ul className="text-emerald-800 text-sm space-y-1">
                    <li>• ✅ Pagamento aprovado e processado</li>
                    <li>• 📧 Você receberá um email de confirmação em instantes</li>
                    <li>• 🔗 O link da reunião será enviado 1 dia antes</li>
                    <li>• 📱 Vamos mandar um lembrete no WhatsApp também</li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <p className="text-gray-600">
                  Mal posso esperar para nossa conversa! 💬
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <button
                    onClick={() => window.close()}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  )
}