'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { ArrowRight, ArrowLeft, CheckCircle, AlertCircle, User, Mail, Phone, Building, MessageCircle, Calendar } from 'lucide-react'

interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date'
  label: string
  name: string
  required: boolean
  options?: string[]
  placeholder?: string
  mapToLead?: string
  step?: number
  scoring?: {
    enabled: boolean
    points?: number
    optionScores?: { [key: string]: number }
  }
}

interface FormTemplate {
  id: string
  name: string
  description: string
  slug: string
  form_type: 'lead' | 'nps' | 'survey' | 'feedback' | 'other'
  fields: FormField[]
  organization_id?: string
  leadQualification?: {
    enabled: boolean
    frioCloserId?: string
    mornoCloserId?: string
    quenteCloserId?: string
    thresholdMorno?: number
    thresholdQuente?: number
    enableCalendar?: boolean
  }
}

interface Step {
  id: number
  title: string
  description: string
  icon: React.ComponentType<any>
  fields: FormField[]
}

export default function FormPageSafe() {
  const params = useParams()
  const [template, setTemplate] = useState<FormTemplate | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [mounted, setMounted] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<Step[]>([])
  const [showCalendar, setShowCalendar] = useState(false)
  const [leadScore, setLeadScore] = useState<any>(null)
  const [assignedCloser, setAssignedCloser] = useState<any>(null)
  const [qualificationResult, setQualificationResult] = useState<any>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [bookingToken, setBookingToken] = useState<string | null>(null)

  const slug = params.slug as string

  const createSteps = (fields: FormField[]) => {
    // 🔥 CADA CAMPO = UMA ETAPA (como você pediu!)
    const stepsFromFields = fields.map((field, index) => {
      let stepConfig = {
        title: field.label,
        description: field.placeholder || `Complete sua informação`,
        icon: User
      }

      // Escolher ícone baseado no tipo/nome do campo
      if (field.type === 'email' || field.name.includes('email')) {
        stepConfig.icon = Mail
      } else if (field.type === 'phone' || field.name.includes('telefone') || field.name.includes('whatsapp')) {
        stepConfig.icon = Phone
      } else if (field.name.includes('empresa') || field.name.includes('cargo') || field.name.includes('trabalho') || field.name.includes('consultorio')) {
        stepConfig.icon = Building
      } else if (field.type === 'textarea' || field.name.includes('mensagem') || field.name.includes('observ') || field.name.includes('incomoda') || field.name.includes('visao') || field.name.includes('agora')) {
        stepConfig.icon = MessageCircle
      } else if (field.name.includes('investimento') || field.name.includes('renda') || field.name.includes('pagamento')) {
        stepConfig.icon = MessageCircle
      } else {
        stepConfig.icon = User
      }

      return {
        id: index,
        title: stepConfig.title,
        description: stepConfig.description,
        icon: stepConfig.icon,
        fields: [field] // ✨ APENAS UM CAMPO POR ETAPA!
      }
    })

    setSteps(stepsFromFields)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const fetchTemplate = async () => {
      try {
        console.log('🔍 Buscando template:', slug)

        const { data, error } = await supabase
          .from('form_templates')
          .select('*')
          .eq('slug', slug)
          .single()

        if (error) {
          console.error('Erro ao buscar template:', error)
          setTemplate(null)
        } else if (data) {
          const mapped = {
            ...data,
            leadQualification: data.lead_qualification || undefined
          }
          setTemplate(mapped)
          createSteps(data.fields)
        } else {
          setTemplate(null)
        }
      } catch (error) {
        console.error('💥 Erro inesperado:', error)
        setTemplate(null)
      } finally {
        setLoading(false)
      }
    }

    fetchTemplate()
  }, [slug, mounted])

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateStep = (stepIndex: number) => {
    const newErrors: Record<string, string> = {}
    const currentStepFields = steps[stepIndex]?.fields || []

    currentStepFields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = 'Este campo é obrigatório'
      }

      if (field.type === 'email' && formData[field.name]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData[field.name])) {
          newErrors[field.name] = 'Email inválido'
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    template?.fields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = 'Este campo é obrigatório'
      }

      if (field.type === 'email' && formData[field.name]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData[field.name])) {
          newErrors[field.name] = 'Email inválido'
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => new Set(Array.from(prev).concat(currentStep)))
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1)
      }
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const goToStep = (stepIndex: number) => {
    if (stepIndex <= currentStep || completedSteps.has(stepIndex - 1)) {
      setCurrentStep(stepIndex)
    }
  }

  // Calcular score baseado nos campos respondidos
  const calculateScore = (): { score: number, temperatura: string, closerId: string | null } => {
    if (!template?.fields || !template?.leadQualification?.enabled) {
      return { score: 0, temperatura: 'frio', closerId: null }
    }

    let totalScore = 0

    template.fields.forEach((field) => {
      if (!field.scoring?.enabled) return
      const value = formData[field.name]
      if (!value) return

      if (['select', 'radio'].includes(field.type) && field.scoring?.optionScores) {
        totalScore += field.scoring.optionScores[value] || 0
      } else if (field.type === 'checkbox' && field.scoring?.optionScores) {
        const selected = Array.isArray(value) ? value : [value]
        selected.forEach((opt: string) => {
          totalScore += field.scoring?.optionScores?.[opt] || 0
        })
      } else if (value) {
        totalScore += field.scoring?.points || 0
      }
    })

    const qual = template.leadQualification!
    const thresholdMorno = qual.thresholdMorno || 40
    const thresholdQuente = qual.thresholdQuente || 70

    let temperatura = 'frio'
    let closerId: string | null = qual.frioCloserId || null

    if (totalScore >= thresholdQuente) {
      temperatura = 'quente'
      closerId = qual.quenteCloserId || null
    } else if (totalScore >= thresholdMorno) {
      temperatura = 'morno'
      closerId = qual.mornoCloserId || null
    }

    return { score: totalScore, temperatura, closerId }
  }

  const createBookingLink = async (leadId: string, closerId?: string | null) => {
    try {
      const token = Math.random().toString(36).substr(2) + Date.now().toString(36)
      const nomeCompleto = formData.nome_completo || formData.nome || 'Usuario'

      const linkData: any = {
        token_link: token,
        lead_id: leadId,
        closer_id: closerId || null,
        organization_id: template?.organization_id || null,
        tipo_call_permitido: 'vendas',
        titulo_personalizado: `Agendamento de Call - ${nomeCompleto}`,
        descricao_personalizada: `Ola ${nomeCompleto}! Escolha o melhor horario para sua call.`,
        cor_tema: '#3b82f6',
        ativo: true,
        uso_unico: true,
        total_visualizacoes: 0,
        total_agendamentos: 0
      }

      const { data: linkCreated, error: linkError } = await supabase
        .from('agendamento_links')
        .insert([linkData])
        .select()
        .single()

      if (linkError) {
        console.error('Erro ao criar link de agendamento:', linkError)
        setSubmitted(true)
      } else {
        setBookingToken(token)
        setTimeout(() => {
          window.location.href = `/agenda/agendar/${token}`
        }, 2000)
      }
    } catch (error) {
      console.error('Erro ao criar link de agendamento:', error)
      setSubmitted(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    // Validação especial para formulário de persona
    if (template?.slug === 'persona-marketing-digital') {
      const emailAcesso = formData.email_acesso
      if (emailAcesso !== 'emersonbljr2802@gmail.com') {
        alert('❌ Acesso negado! Este formulário é restrito.')
        return
      }
    }

    setSubmitting(true)

    try {
      console.log('📤 Enviando formulário:', formData)

      // Verificar se o formulário tem qualificação de leads habilitada (scoring por campo)
      if (template?.leadQualification?.enabled) {
        const { score, temperatura, closerId } = calculateScore()

        // Criar lead com score e temperatura
        const leadData: any = {
          origem: 'formulario',
          status: 'novo',
          temperatura,
          score,
          closer_id: closerId,
          organization_id: template.organization_id || null,
          data_primeiro_contato: new Date().toISOString()
        }

        template.fields.forEach(field => {
          const value = formData[field.name]
          if (value && field.mapToLead && ['nome_completo', 'email', 'telefone', 'empresa', 'cargo'].includes(field.mapToLead)) {
            leadData[field.mapToLead] = value
          }
        })

        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .insert([leadData])
          .select('id')
          .single()

        if (leadError) {
          console.error('Erro ao criar lead:', leadError)
        }

        const leadId = lead?.id

        // Salvar submissão com score
        await supabase.from('form_submissions').insert([{
          template_id: template.id,
          template_slug: slug,
          organization_id: template.organization_id || null,
          lead_id: leadId,
          submission_data: formData,
          score,
          temperatura,
          closer_id: closerId,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        }])

        // Se tem agendamento habilitado e closer definido
        if (template.leadQualification.enableCalendar && closerId && leadId) {
          await createBookingLink(leadId, closerId)
          return
        }

        setSubmitted(true)
        return
      }

      // Para o formulário médico específico, usar o sistema antigo
      if (slug === 'qualificacao-medica') {
        // Usar organização do próprio template (formulários são públicos)
        const organizationId = template?.organization_id || '00000000-0000-0000-0000-000000000001'

        // Salvar submissão - o trigger vai processar automaticamente
        const submissionData = {
          template_id: template?.id,
          template_slug: slug,
          organization_id: organizationId || '00000000-0000-0000-0000-000000000001', // Default org ID
          source_url: window.location.search ? 
            window.location.search.replace('?source=', '') || 'form_direto' : 'form_direto',
          submission_data: formData,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          ip_address: null // Será preenchido pelo servidor se necessário
        }

        console.log('💾 Salvando submissão (com trigger automático):', submissionData)

        // Criar cliente Supabase sem autenticação para forms públicos
        const { createClient } = await import('@supabase/supabase-js')
        const publicSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false
            }
          }
        )

        const { data: submission, error: submissionError } = await publicSupabase
          .from('form_submissions')
          .insert([submissionData])
          .select('*')
          .single()

        if (submissionError) {
          console.error('❌ Erro ao salvar submissão:', submissionError)
          throw new Error('Erro ao salvar formulário')
        }

        console.log('✅ Formulário enviado com sucesso:', submission)

        // Aguardar processamento do trigger e buscar token de agendamento
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2s para processar

        // Buscar dados atualizados da submissão com token
        const { data: updatedSubmission } = await supabase
          .from('form_submissions')
          .select('submission_data')
          .eq('id', submission.id)
          .single()

        const agendamentoToken = updatedSubmission?.submission_data?.agendamento_token

        if (agendamentoToken) {
          console.log('🎯 Token de agendamento encontrado:', agendamentoToken)
          setBookingToken(agendamentoToken)
          
          // Mostrar mensagem de sucesso personalizada por 3s
          setSubmitted(true)
          setTimeout(() => {
            window.location.href = `/agenda/agendar/${agendamentoToken}`
          }, 3000)
        } else {
          console.warn('⚠️ Token de agendamento não encontrado, usando fluxo padrão')
          setSubmitted(true)
        }

        return // Sair da função para o formulário médico
      }

      // Fluxo original para outros formulários
      let leadId = null
      if (template?.form_type === 'lead') {
        const leadData = {
          origem: 'formulario_seguro',
          status: 'novo',
          observacoes: '',
          organization_id: template?.organization_id || '00000000-0000-0000-0000-000000000001',
          data_primeiro_contato: new Date().toISOString()
        }

        template.fields.forEach(field => {
          const value = formData[field.name]
          if (value && field.mapToLead && ['nome_completo', 'email', 'telefone', 'empresa', 'cargo'].includes(field.mapToLead)) {
            (leadData as any)[field.mapToLead] = value
          }
        })

        console.log('💾 Criando lead:', leadData)

        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .insert([leadData])
          .select()
          .single()

        if (leadError) {
          console.error('❌ Erro ao criar lead:', leadError)
        } else {
          console.log('✅ Lead criado:', lead)
          leadId = lead.id
        }
      }

      // Salvar submissão
      const submissionData = {
        template_id: template?.id,
        template_slug: slug,
        organization_id: template?.organization_id || '00000000-0000-0000-0000-000000000001',
        lead_id: leadId,
        mentorado_id: null,
        source_url: 'form_safe',
        submission_data: formData,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      }

      const { error: submissionError } = await supabase
        .from('form_submissions')
        .insert([submissionData])

      if (submissionError) {
        console.error('❌ Erro ao salvar submissão:', submissionError)
        throw new Error('Erro ao salvar formulário')
      }

      console.log('✅ Formulário enviado com sucesso')

      // Criar link de agendamento se for formulário de lead
      if (template?.form_type === 'lead' && leadId) {
        await createBookingLink(leadId, null)
      } else {
        setSubmitted(true)
      }
    } catch (error) {
      console.error('💥 Erro no envio:', error)
      alert('Erro ao enviar formulário. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando formulário...</p>
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg p-8 shadow-md max-w-md w-full mx-4">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
            Formulário não encontrado
          </h2>
          <p className="text-gray-500 text-center">
            O formulário solicitado não existe.
          </p>
        </div>
      </div>
    )
  }

  if (bookingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full mx-4 text-center">
          <div className="animate-pulse mb-6">
            <Calendar className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Preparando seu agendamento...
          </h2>
          <p className="text-gray-600 mb-6">
            Formulário enviado com sucesso! Você será redirecionado para escolher o melhor horário para sua call.
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto"></div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="bg-white rounded-lg p-8 shadow-md max-w-md w-full mx-4 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Obrigado! ✨
          </h2>
          <p className="text-gray-600 mb-6">
            Seu formulário foi enviado com sucesso.
          </p>
        </div>
      </div>
    )
  }

  if (steps.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparando formulário...</p>
        </div>
      </div>
    )
  }

  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  // Enhanced styling for persona form
  const isPersonaForm = template?.slug === 'persona-marketing-digital'
  
  return (
    <div className={`
      min-h-screen py-8
      ${
        isPersonaForm
          ? 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'
          : 'bg-gradient-to-br from-green-50 via-white to-emerald-50'
      }
    `}>
      <div className="max-w-5xl mx-auto px-4">
        {/* Enhanced Header for persona form */}
        <div className="text-center mb-12">
          {isPersonaForm && (
            <div className="mb-6">
              <div className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                🎯 Pesquisa de Persona Exclusiva
              </div>
            </div>
          )}
          <h1 className={`
            font-bold mb-4
            ${
              isPersonaForm
                ? 'text-4xl md:text-5xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent'
                : 'text-4xl text-gray-900'
            }
          `}>
            {template.name}
          </h1>
          <p className={`
            text-lg max-w-3xl mx-auto
            ${
              isPersonaForm
                ? 'text-gray-700 font-medium'
                : 'text-gray-600'
            }
          `}>
            {template.description || 'Preencha as informações abaixo para prosseguir.'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const isActive = index === currentStep
              const isCompleted = completedSteps.has(index)
              const isClickable = index <= currentStep || isCompleted

              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center cursor-pointer group"
                  onClick={() => isClickable && goToStep(index)}
                >
                  <div
                    className={`
                      w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 transition-all duration-300
                      ${
                        isPersonaForm
                          ? isActive
                            ? 'bg-purple-600 border-purple-600 text-white scale-110 shadow-lg'
                            : isCompleted
                              ? 'bg-blue-500 border-blue-500 text-white shadow-md'
                              : 'bg-white border-purple-200 text-purple-400'
                          : isActive
                            ? 'bg-green-600 border-green-600 text-white scale-110'
                            : isCompleted
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-gray-300 text-gray-400'
                      }
                      ${isClickable ? 'hover:scale-105' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <step.icon className="w-6 h-6" />
                    )}
                  </div>
                  <span
                    className={`
                      text-sm font-medium transition-colors duration-200
                      ${
                        isPersonaForm
                          ? isActive
                            ? 'text-purple-600'
                            : isCompleted
                              ? 'text-blue-600'
                              : 'text-purple-400'
                          : isActive
                            ? 'text-green-600'
                            : isCompleted
                              ? 'text-emerald-600'
                              : 'text-gray-400'
                      }
                    `}
                  >
                    {step.title}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Progress line */}
          <div className="relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gray-200 rounded-full"></div>
            <div
              className={`
                absolute top-0 left-0 h-2 rounded-full transition-all duration-500 ease-out
                ${
                  isPersonaForm
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 shadow-sm'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500'
                }
              `}
              style={{
                width: `${((currentStep + (completedSteps.has(currentStep) ? 1 : 0)) / steps.length) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Enhanced Form Card */}
        <div className={`
          bg-white rounded-2xl shadow-xl border p-8
          ${
            isPersonaForm
              ? 'border-purple-200 shadow-purple-100/50'
              : 'border-gray-100'
          }
        `}>
          {/* Enhanced Step Header */}
          <div className="text-center mb-8">
            <div className={`
              inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4
              ${
                isPersonaForm
                  ? 'bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg'
                  : 'bg-gradient-to-br from-green-500 to-emerald-600'
              }
            `}>
              <currentStepData.icon className="w-8 h-8 text-white" />
            </div>
            <h2 className={`
              text-2xl font-bold mb-2
              ${
                isPersonaForm
                  ? 'bg-gradient-to-r from-purple-700 to-blue-700 bg-clip-text text-transparent'
                  : 'text-gray-900'
              }
            `}>
              {currentStepData.title}
            </h2>
            <p className={`
              ${
                isPersonaForm
                  ? 'text-gray-700 font-medium'
                  : 'text-gray-600'
              }
            `}>
              {currentStepData.description}
            </p>
          </div>

          {/* Form Fields */}
          <form onSubmit={isLastStep ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
            <div className="space-y-6 mb-8">
              {currentStepData.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
                      rows={4}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${
                        errors[field.name] ? 'border-red-500 focus:ring-red-500' : 'border-gray-200'
                      }`}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={formData[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className={`w-full h-12 px-4 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all bg-white text-gray-900 ${
                        errors[field.name] ? 'border-red-500 focus:ring-red-500' : 'border-gray-200'
                      }`}
                    >
                      <option value="">Selecione uma opção...</option>
                      {field.options?.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'radio' ? (
                    <div className="space-y-3">
                      {field.options?.map((option, index) => (
                        <label
                          key={index}
                          className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-green-50 transition-all"
                        >
                          <input
                            type="radio"
                            name={field.name}
                            value={option}
                            checked={formData[field.name] === option}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                            className="w-4 h-4 text-green-600 border-2 border-gray-300 focus:ring-2 focus:ring-green-500"
                          />
                          <span className="ml-3 text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  ) : field.type === 'checkbox' ? (
                    // Enhanced UX for persona form checkboxes with better visual design
                    <div className={`${
                      // Special styling for persona form with many options
                      template?.slug === 'persona-marketing-digital' && field.options && field.options.length > 10
                        ? 'grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-gray-50/50'
                        : 'space-y-3'
                    }`}>
                      {field.options?.map((option, index) => {
                        const isSelected = Array.isArray(formData[field.name])
                          ? formData[field.name].includes(option)
                          : formData[field.name] === option
                        
                        return (
                          <label
                            key={index}
                            className={`
                              flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 group
                              ${
                                isSelected
                                  ? 'border-green-500 bg-green-50 shadow-md transform scale-[1.02]'
                                  : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-25 hover:shadow-sm'
                              }
                              ${
                                template?.slug === 'persona-marketing-digital'
                                  ? 'min-h-[60px] hover:scale-[1.01] active:scale-[0.99]'
                                  : ''
                              }
                            `}
                          >
                            <input
                              type="checkbox"
                              name={field.name}
                              value={option}
                              checked={isSelected}
                              onChange={(e) => {
                                const currentValue = formData[field.name] || []
                                let newValue

                                if (Array.isArray(currentValue)) {
                                  // Multiple selection for checkboxes
                                  if (e.target.checked) {
                                    newValue = [...currentValue, option]
                                  } else {
                                    newValue = currentValue.filter(v => v !== option)
                                  }
                                } else {
                                  // Single selection (treat as radio)
                                  newValue = e.target.checked ? option : ''
                                }

                                handleInputChange(field.name, newValue)
                              }}
                              className={`
                                w-5 h-5 mt-0.5 text-green-600 border-2 rounded-md focus:ring-2 focus:ring-green-500 transition-all
                                ${isSelected ? 'border-green-500 bg-green-600' : 'border-gray-300'}
                              `}
                            />
                            <div className="ml-4 flex-1">
                              <span className={`
                                text-sm font-medium leading-relaxed
                                ${isSelected ? 'text-green-800' : 'text-gray-700'}
                                ${template?.slug === 'persona-marketing-digital' ? 'text-xs md:text-sm' : ''}
                              `}>
                                {option}
                              </span>
                              {/* Visual indicator for selected items */}
                              {isSelected && (
                                <div className="mt-1">
                                  <div className="h-1 w-8 bg-green-500 rounded-full opacity-75"></div>
                                </div>
                              )}
                            </div>
                          </label>
                        )
                      })}
                      
                      {/* Selection counter for persona form */}
                      {template?.slug === 'persona-marketing-digital' && field.options && field.options.length > 10 && (
                        <div className="col-span-full mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-700 font-medium">
                              📊 Selecionadas: {Array.isArray(formData[field.name]) ? formData[field.name].length : (formData[field.name] ? 1 : 0)} opções
                            </span>
                            <span className="text-blue-600">
                              💡 Selecione quantas desejar
                            </span>
                          </div>
                          {Array.isArray(formData[field.name]) && formData[field.name].length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {formData[field.name].slice(0, 3).map((item: string, idx: number) => (
                                <span key={idx} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {item.length > 20 ? item.substring(0, 20) + '...' : item}
                                </span>
                              ))}
                              {formData[field.name].length > 3 && (
                                <span className="inline-block px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">
                                  +{formData[field.name].length - 3} mais
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Input
                      type={field.type}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
                      className={`h-12 px-4 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-900 bg-white ${
                        errors[field.name] ? 'border-red-500 focus:ring-red-500' : 'border-gray-200'
                      }`}
                    />
                  )}

                  {errors[field.name] && (
                    <p className="text-red-500 text-sm flex items-center mt-2">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors[field.name]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center px-6 py-3 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>

              <div className="text-sm text-gray-500">
                {/* Contador removido conforme solicitado */}
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className={`
                  flex items-center px-6 py-3 text-white font-medium transition-all duration-200
                  ${
                    isPersonaForm
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-purple-200'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                  }
                `}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Enviando...
                  </>
                ) : isLastStep ? (
                  <>
                    Enviar Formulário
                    <CheckCircle className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}