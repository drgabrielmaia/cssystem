'use client'

import { useEffect, useState, useCallback } from 'react'
import { debounce } from 'lodash'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { ArrowRight, ArrowLeft, CheckCircle, AlertCircle, User, Mail, Phone, Building, FileText } from 'lucide-react'

interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date'
  label: string
  name: string
  required: boolean
  options?: string[]
  placeholder?: string
  mapToLead?: string
}

interface FormStyle {
  primaryColor: string
  backgroundColor: string
  textColor: string
  cardColor: string
  borderRadius: string
  fontFamily: string
}

interface FormTemplate {
  id: string
  name: string
  description: string
  slug: string
  form_type: 'lead' | 'nps' | 'survey' | 'feedback' | 'other'
  fields: FormField[]
  style?: FormStyle
}

export default function FormPage() {
  const params = useParams()
  const router = useRouter()
  const [template, setTemplate] = useState<FormTemplate | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sourceUrl, setSourceUrl] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null)
  const [showCalendarBooking, setShowCalendarBooking] = useState(false)
  const [mounted, setMounted] = useState(false)

  const slug = params.slug as string

  // Capturar fonte imediatamente
  const captureSource = useCallback(() => {
    if (typeof window === 'undefined') return 'direct'

    try {
      const urlParams = new URLSearchParams(window.location.search)
      const ref = urlParams.get('ref') || urlParams.get('source') || ''
      const utmSource = urlParams.get('utm_source') || ''
      const utmMedium = urlParams.get('utm_medium') || ''
      const utmCampaign = urlParams.get('utm_campaign') || ''

      if (ref) return ref
      if (utmSource || utmMedium || utmCampaign) {
        return [utmSource, utmMedium, utmCampaign].filter(Boolean).join('/')
      }

      if (document?.referrer) {
        try {
          const referrerUrl = new URL(document.referrer)
          const hostname = referrerUrl.hostname
          if (hostname.includes('instagram.com')) return 'instagram'
          if (hostname.includes('facebook.com')) return 'facebook'
          if (hostname.includes('google.com')) return 'google'
          if (hostname !== window.location.hostname) return hostname
        } catch {}
      }

      return 'direct'
    } catch {
      return 'direct'
    }
  }, [])

  // Inicialização otimizada
  useEffect(() => {
    setMounted(true)
    setSourceUrl(captureSource())
    fetchTemplate() // Executar imediatamente
  }, [slug, captureSource])

  const fetchTemplate = useCallback(async () => {
    try {
      console.log('🔍 Buscando template:', slug)

      // Cache simples baseado em slug
      const cacheKey = `template_${slug}`
      const cached = sessionStorage.getItem(cacheKey)

      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          const now = Date.now()
          // Cache válido por 5 minutos
          if (now - cachedData.timestamp < 5 * 60 * 1000) {
            console.log('✨ Template carregado do cache:', cachedData.data.name)
            setTemplate(cachedData.data)
            setLoading(false)
            return
          }
        } catch {
          sessionStorage.removeItem(cacheKey)
        }
      }

      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error) {
        console.error('❌ Erro ao buscar template:', error)
        setTemplate(null)
        return
      }

      if (data) {
        console.log('✅ Template carregado:', data.name)
        setTemplate(data)

        // Salvar no cache
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            data,
            timestamp: Date.now()
          }))
        } catch {
          // Ignorar erros de cache
        }
      } else {
        console.warn('⚠️ Template não encontrado')
        setTemplate(null)
      }
    } catch (error) {
      console.error('💥 Erro inesperado ao buscar template:', error)
      setTemplate(null)
    } finally {
      setLoading(false)
    }
  }, [slug])

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

      if (field.type === 'phone' && formData[field.name]) {
        const phoneRegex = /^[\(\)\s\-\+\d]{10,}$/
        if (!phoneRegex.test(formData[field.name].replace(/\D/g, ''))) {
          newErrors[field.name] = 'Telefone inválido'
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const processFormSubmission = async (submissionData: Record<string, any>) => {
    try {
      console.log('🔄 Iniciando processamento do formulário:', submissionData, 'Tipo:', template?.form_type)

      // Se não for formulário de lead, apenas salvar submissão sem criar lead
      if (template?.form_type !== 'lead') {
        console.log('📋 Formulário não é de lead, não criando lead')
        return null
      }

      // Mapear campos do formulário para campos do lead
      const leadData: Record<string, any> = {
        origem: sourceUrl || 'formulario_personalizado',
        status: 'novo',
        observacoes: ''
      }

      const activityData: Record<string, any> = {}
      const notesData: string[] = []

      template?.fields.forEach(field => {
        const value = submissionData[field.name]
        if (!value) return

        console.log(`📝 Processando campo ${field.name}:`, value, 'mapToLead:', field.mapToLead)

        if (field.mapToLead && field.mapToLead !== 'none' && ['nome_completo', 'email', 'telefone', 'empresa', 'cargo'].includes(field.mapToLead)) {
          // Mapear para campo específico do lead
          leadData[field.mapToLead] = value
          console.log(`✅ Mapeado para lead.${field.mapToLead}:`, value)
        } else {
          // Adicionar ao histórico de atividade
          activityData[field.label] = value
          console.log(`📋 Adicionado ao histórico:`, `${field.label}: ${value}`)
        }
      })

      console.log('💾 Dados finais do lead:', leadData)

      // Criar o lead
      const { data: lead, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select()
        .single()

      if (error) {
        console.error('❌ Erro ao criar lead:', error)
        return null
      }

      console.log('✅ Lead criado com sucesso:', lead)

      // Adicionar dados extras nas observações do lead
      if (lead && Object.keys(activityData).length > 0) {
        try {
          console.log('📝 Adicionando dados extras nas observações:', activityData)

          // Construir texto das informações extras
          const extraInfo = Object.entries(activityData)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n')

          const currentDate = new Date().toLocaleString('pt-BR')
          const formInfo = `\n\n--- ${template?.name || 'Formulário'} (${currentDate}) ---\n${extraInfo}`

          // Adicionar às observações existentes
          const updatedObservations = (lead.observacoes || '') + formInfo

          const { error: updateError } = await supabase
            .from('leads')
            .update({
              observacoes: updatedObservations,
              origem_detalhada: sourceUrl
            })
            .eq('id', lead.id)

          if (updateError) {
            console.error('❌ Erro ao atualizar observações:', updateError)
          } else {
            console.log('✅ Observações atualizadas com sucesso')
          }
        } catch (err) {
          console.error('💥 Erro ao processar observações:', err)
          // Não falha o processo principal se der erro nas observações
        }
      }

      return lead
    } catch (error) {
      console.error('💥 Erro ao processar lead:', error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submit')

    setSubmitting(true)

    try {
      // 1. Processar formulário (criar lead só se for tipo 'lead')
      const lead = await processFormSubmission(formData)

      // 2. Salvar submissão do formulário
      const submissionData = {
        template_id: template?.id,
        template_slug: slug,
        lead_id: lead?.id || null,
        mentorado_id: null, // Será definido se for formulário NPS/survey
        source_url: sourceUrl,
        submission_data: formData,
        ip_address: null, // Pode ser capturado pelo backend se necessário
        user_agent: navigator.userAgent
      }

      // Se for formulário NPS/Survey e tem email, tentar identificar mentorado
      if (template?.form_type !== 'lead' && formData.email) {
        try {
          const { data: mentorado } = await supabase
            .from('mentorados')
            .select('id')
            .eq('email', formData.email)
            .single()

          if (mentorado) {
            submissionData.mentorado_id = mentorado.id
          }
        } catch (error) {
          console.log('Mentorado não encontrado pelo email:', formData.email)
        }
      }

      const { error } = await supabase
        .from('form_submissions')
        .insert([submissionData])

      if (error) {
        console.error('Erro ao salvar submissão:', error)
        alert('Erro ao enviar formulário. Tente novamente.')
        return
      }

      setSubmitted(true)

      // Redirect opcional após sucesso
      setTimeout(() => {
        // Pode redirecionar para página de obrigado ou resetar o form
        // router.push('/obrigado')
      }, 3000)

    } catch (error) {
      console.error('Erro ao processar submissão:', error)
      alert('Erro inesperado. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateFormData = (name: string, value: any) => {
    console.log(`Escreveu ${value}`)
    setFormData(prev => ({ ...prev, [name]: value }))

    // Limpar erro quando o usuário corrigir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }

    // Não salva automaticamente - só quando apertar "Próximo"
  }

  // Função de auto-save imediata (sem debounce)

  // Auto-save otimizado com debounce
  const autoSaveField = useCallback(
    debounce(async (fieldName: string, fieldValue: any) => {
      try {
        if (!template || template.form_type !== 'lead' || !fieldValue) return

        console.log(`🔧 autoSaveField: ${fieldName} = ${fieldValue}`)

        const field = template.fields.find(f => f.name === fieldName)
        if (!field) return

        if (currentLeadId) {
          // Atualizar lead existente
          if (field.mapToLead && field.mapToLead !== 'none') {
            const { error } = await supabase
              .from('leads')
              .update({ [field.mapToLead]: fieldValue })
              .eq('id', currentLeadId)

            if (!error) {
              console.log(`✅ Campo ${field.mapToLead} atualizado`)
            }
          }
        } else {
          // Criar novo lead na primeira pergunta
          const leadData: Record<string, any> = {
            origem: sourceUrl || 'formulario',
            status: 'novo'
          }

          if (field.mapToLead && field.mapToLead !== 'none') {
            leadData[field.mapToLead] = fieldValue
          } else {
            leadData.observacoes = `${field.label}: ${fieldValue}`
          }

          const { data, error } = await supabase
            .from('leads')
            .insert([leadData])
            .select('id')
            .single()

          if (!error && data?.id) {
            setCurrentLeadId(data.id)
            console.log('✅ Lead criado:', data.id)
          }
        }
      } catch (error) {
        console.log('💥 Erro no autoSaveField:', error)
      }
    }, 1000),
    [template, currentLeadId, slug, sourceUrl]
  )

  const goToNextStep = () => {
    if (!template || currentStep >= template.fields.length - 1) return

    setIsAnimating(true)
    setTimeout(() => {
      setCurrentStep(prev => prev + 1)
      setIsAnimating(false)
    }, 150)
  }

  const goToPreviousStep = () => {
    if (currentStep <= 0) return

    setIsAnimating(true)
    setTimeout(() => {
      setCurrentStep(prev => prev - 1)
      setIsAnimating(false)
    }, 150)
  }

  const validateCurrentField = () => {
    if (!template) return false

    const currentField = template.fields[currentStep]
    if (!currentField.required) return true

    const value = formData[currentField.name]

    if (!value || (Array.isArray(value) && value.length === 0)) {
      setErrors(prev => ({ ...prev, [currentField.name]: 'Este campo é obrigatório' }))
      return false
    }

    // Validações específicas
    if (currentField.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        setErrors(prev => ({ ...prev, [currentField.name]: 'Email inválido' }))
        return false
      }
    }

    if (currentField.type === 'phone' && value) {
      const phoneRegex = /^[\(\)\s\-\+\d]{10,}$/
      if (!phoneRegex.test(value.replace(/\D/g, ''))) {
        setErrors(prev => ({ ...prev, [currentField.name]: 'Telefone inválido' }))
        return false
      }
    }

    return true
  }

  const saveFormData = async () => {
    console.log('🏁 Finalizando formulário')

    try {
      if (currentLeadId && template?.form_type === 'lead') {
        // FINALIZAR o lead - mudar status e adicionar todas as observações extras
        const observacoesExtras: string[] = []

        template.fields.forEach(field => {
          const value = formData[field.name]
          if (value && (!field.mapToLead || field.mapToLead === 'none')) {
            observacoesExtras.push(`${field.label}: ${value}`)
          }
        })

        const updateData: Record<string, any> = {
          status: 'novo' // Mudar status para 'novo' quando completar o formulário
        }

        // Se tem observações extras, adicionar
        if (observacoesExtras.length > 0) {
          // Primeiro pegar as observações atuais
          const { data: leadAtual } = await supabase
            .from('leads')
            .select('observacoes')
            .eq('id', currentLeadId)
            .single()

          const currentDate = new Date().toLocaleString('pt-BR')
          const extraInfo = `\n\n--- Dados extras do formulário (${currentDate}) ---\n` + observacoesExtras.join('\n')
          updateData.observacoes = (leadAtual?.observacoes || '') + extraInfo
        }

        await supabase
          .from('leads')
          .update(updateData)
          .eq('id', currentLeadId)

        console.log('✅ Lead finalizado')
      }

      // ATUALIZAR form_submission com dados completos (já foi criado na primeira pergunta)
      await supabase
        .from('form_submissions')
        .update({
          submission_data: formData
        })
        .eq('lead_id', currentLeadId)
        .eq('template_slug', slug)

      console.log('✅ Form_submission atualizado')

    } catch (error) {
      console.error('Erro ao salvar:', error)
    }
  }

  const handleNext = async () => {
    if (validateCurrentField() && template) {
      const currentField = template.fields[currentStep]
      const currentValue = formData[currentField.name]

      // SEMPRE salvar o campo atual quando apertar "Próximo"
      if (currentValue && template.form_type === 'lead') {
        console.log('🚀 Salvando campo atual no Próximo:', currentField.name, currentValue)
        await autoSaveField(currentField.name, currentValue)

        // ATUALIZAR form_submission com dados atuais a cada passo
        if (currentLeadId) {
          console.log('📝 Atualizando form_submission com dados atuais')
          await supabase
            .from('form_submissions')
            .update({
              submission_data: formData // Dados completos até agora
            })
            .eq('lead_id', currentLeadId)
            .eq('template_slug', slug)
        }
      }

      // Se for último campo, finalizar
      if (currentStep === template.fields.length - 1) {
        await saveFormData() // SÓ chama saveFormData no ÚLTIMO campo para finalizar
        setSubmitted(true)
      } else {
        // Se não for último, vai para próxima página
        goToNextStep()
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !submitting) {
      e.preventDefault()
      handleNext()
    }
  }

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'text': return User
      case 'email': return Mail
      case 'phone': return Phone
      case 'textarea': return FileText
      default: return FileText
    }
  }

  const renderField = (field: FormField) => {
    const hasError = !!errors[field.name]

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <div className="space-y-3">
            <Input
              id={field.id}
              type={field.type}
              value={formData[field.name] || ''}
              onChange={(e) => updateFormData(field.name, e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
              className={`h-16 text-lg border-2 rounded-2xl transition-all duration-300 bg-gradient-to-r from-gray-50 to-white hover:from-blue-50 hover:to-indigo-50 focus:from-blue-50 focus:to-purple-50 shadow-sm hover:shadow-md focus:shadow-lg ${
                hasError
                  ? 'border-red-500 bg-red-50 from-red-50 to-red-50'
                  : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
              }`}
              autoFocus
            />
            {hasError && (
              <p className="text-red-500 text-sm flex items-center animate-pulse">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors[field.name]}
              </p>
            )}
          </div>
        )

      case 'textarea':
        return (
          <div className="space-y-3">
            <Textarea
              id={field.id}
              value={formData[field.name] || ''}
              onChange={(e) => updateFormData(field.name, e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={field.placeholder || `Conte-nos mais sobre ${field.label.toLowerCase()}...`}
              className={`min-h-[140px] text-lg border-2 rounded-2xl transition-all duration-300 resize-none bg-gradient-to-br from-gray-50 to-white hover:from-blue-50 hover:to-indigo-50 focus:from-blue-50 focus:to-purple-50 shadow-sm hover:shadow-md focus:shadow-lg ${
                hasError
                  ? 'border-red-500 bg-red-50 from-red-50 to-red-50'
                  : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
              }`}
              autoFocus
            />
            {hasError && (
              <p className="text-red-500 text-sm flex items-center animate-pulse">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors[field.name]}
              </p>
            )}
          </div>
        )

      case 'select':
        return (
          <div className="space-y-3">
            <Select
              value={formData[field.name] || ''}
              onValueChange={(value) => updateFormData(field.name, value)}
            >
              <SelectTrigger className={`h-14 text-lg border-2 rounded-xl ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                <SelectValue placeholder={field.placeholder || `Selecione ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option, index) => (
                  <SelectItem key={index} value={option} className="text-lg py-3">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && (
              <p className="text-red-500 text-sm flex items-center animate-pulse">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors[field.name]}
              </p>
            )}
          </div>
        )

      case 'radio':
        return (
          <div className="space-y-4">
            <div className="grid gap-3">
              {field.options?.map((option, index) => {
                const isSelected = formData[field.name] === option
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => updateFormData(field.name, option)}
                    className={`p-4 text-left rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <span className="text-lg font-medium">{option}</span>
                    </div>
                  </button>
                )
              })}
            </div>
            {hasError && (
              <p className="text-red-500 text-sm flex items-center animate-pulse">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors[field.name]}
              </p>
            )}
          </div>
        )

      case 'checkbox':
        return (
          <div className="space-y-4">
            <div className="grid gap-3">
              {field.options?.map((option, index) => {
                const currentValues = formData[field.name] || []
                const isChecked = currentValues.includes(option)
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      const newValues = isChecked
                        ? currentValues.filter((v: string) => v !== option)
                        : [...currentValues, option]

                      updateFormData(field.name, newValues)
                    }}
                    className={`p-4 text-left rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] ${
                      isChecked
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isChecked ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {isChecked && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-lg font-medium">{option}</span>
                    </div>
                  </button>
                )
              })}
            </div>
            {hasError && (
              <p className="text-red-500 text-sm flex items-center animate-pulse">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors[field.name]}
              </p>
            )}
          </div>
        )

      case 'date':
        return (
          <div className="space-y-3">
            <Input
              id={field.id}
              type="date"
              value={formData[field.name] || ''}
              onChange={(e) => updateFormData(field.name, e.target.value)}
              onKeyDown={handleKeyDown}
              className={`h-14 text-lg border-2 rounded-xl transition-all duration-200 ${
                hasError
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
              }`}
              autoFocus
            />
            {hasError && (
              <p className="text-red-500 text-sm flex items-center animate-pulse">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors[field.name]}
              </p>
            )}
          </div>
        )

      default:
        return null
    }
  }

  // Renderização otimizada com skeleton
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header skeleton */}
          <div className="text-center mb-8">
            <div className="animate-pulse">
              <div className="inline-block bg-blue-200 rounded-full px-4 py-2 mb-4 h-8 w-48"></div>
              <div className="bg-gray-200 rounded h-8 w-64 mx-auto mb-2"></div>
              <div className="bg-gray-200 rounded h-4 w-48 mx-auto"></div>
            </div>
          </div>

          {/* Form skeleton */}
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="animate-pulse space-y-6">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-200 rounded-xl w-12 h-12"></div>
                <div className="flex-1">
                  <div className="bg-gray-200 rounded h-6 w-3/4 mb-2"></div>
                  <div className="bg-gray-200 rounded h-4 w-1/2"></div>
                </div>
              </div>
              <div className="bg-gray-200 rounded h-16"></div>
              <div className="flex justify-between">
                <div className="bg-gray-200 rounded h-12 w-24"></div>
                <div className="bg-blue-200 rounded h-12 w-32"></div>
              </div>
            </div>
          </div>

          {/* Loading text */}
          <div className="text-center mt-6">
            <p className="text-gray-600 text-sm">
              {!mounted ? 'Inicializando...' : 'Carregando formulário...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full mx-4">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
            Formulário não encontrado
          </h2>
          <p className="text-gray-500 text-center">
            O formulário solicitado não existe ou não está disponível.
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full grid md:grid-cols-2 overflow-hidden">
          {/* Mensagem de Sucesso */}
          <div className="p-8 flex flex-col justify-center text-center">
            <div className="animate-pulse mb-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Obrigado! ✨
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Seu formulário foi enviado com sucesso. Agora agende sua consulta gratuita!
            </p>
            <div className="bg-green-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-green-700 font-medium">
                📅 Escolha o melhor horário para sua consulta de 30 minutos
              </p>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-2">O que você receberá:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Análise personalizada do seu caso</li>
                <li>• Estratégias específicas para sua área</li>
                <li>• Plano de ação customizado</li>
                <li>• Acesso a materiais exclusivos</li>
              </ul>
            </div>
          </div>

          {/* Calendário de Agendamento */}
          <div className="bg-gray-50 p-6 flex flex-col">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
              📅 Agende Agora
            </h3>

            {/* Sistema de Agendamento Interno */}
            <div className="flex-1 bg-white rounded-lg p-6">
              <div className="text-center space-y-6">
                <div className="mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">Sistema de Agendamento</h4>
                  <p className="text-gray-600 text-lg">
                    Clique no botão abaixo para acessar nossa agenda e escolher o melhor horário
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-green-500 rounded-full p-2">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <h5 className="font-semibold text-green-800 mb-2">Agendamento Confirmado Automaticamente</h5>
                  <p className="text-sm text-green-600">
                    Seu agendamento será criado instantaneamente e você receberá confirmação por email
                  </p>
                </div>

                <Button
                  onClick={() => {
                    // Redirecionar para seu sistema de agendamento interno
                    if (currentLeadId) {
                      window.open(`/agendar/lead/${currentLeadId}`, '_blank')
                    } else {
                      // Fallback: página de agendamento geral
                      window.open('/agenda', '_blank')
                    }
                  }}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white w-full py-4 text-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg transform"
                >
                  🗓️ Acessar Agenda de Agendamentos
                </Button>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Button
                    onClick={() => {
                      const message = `Olá! Acabei de preencher o formulário e gostaria de agendar minha consulta gratuita de 30 minutos.`
                      window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(message)}`, '_blank')
                    }}
                    variant="outline"
                    className="py-3 border-green-200 hover:border-green-300 hover:bg-green-50"
                  >
                    <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.687"/>
                    </svg>
                    WhatsApp
                  </Button>

                  <Button
                    onClick={() => {
                      const subject = 'Agendamento de Consulta'
                      const body = 'Olá! Gostaria de agendar minha consulta gratuita de 30 minutos.'
                      window.open(`mailto:contato@seudominio.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
                    }}
                    variant="outline"
                    className="py-3"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Consulta 100% gratuita • Sem compromisso • 30 minutos
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentField = template.fields[currentStep]
  const totalSteps = template.fields.length
  const progress = ((currentStep + 1) / totalSteps) * 100
  const FieldIcon = getFieldIcon(currentField.type)

  // Aplicar estilo personalizado ou padrão
  const style = template.style || {
    primaryColor: '#3b82f6',
    backgroundColor: '#f8fafc',
    textColor: '#1e293b',
    cardColor: '#ffffff',
    borderRadius: '12',
    fontFamily: 'Inter'
  }

  return (
    <div
      className="min-h-screen transition-all duration-300"
      style={{
        background: `linear-gradient(135deg, ${style.backgroundColor} 0%, ${style.primaryColor}10 100%)`,
        fontFamily: style.fontFamily
      }}
    >
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-sm">
        <div className="h-1 bg-gray-200">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              backgroundColor: style.primaryColor
            }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium shadow-lg">
                ✨ Formulário Exclusivo
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 leading-tight">
              {template.name}
            </h1>
            <p className="text-gray-600 text-lg mb-4">
              Pergunta {currentStep + 1} de {totalSteps} • {Math.round(((currentStep + 1) / totalSteps) * 100)}% completo
            </p>

            {/* Visual Progress Indicator */}
            <div className="flex justify-center mb-2">
              <div className="flex space-x-2">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      i <= currentStep
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Question Card */}
          <div
            className={`shadow-2xl p-6 md:p-8 transition-all duration-300 border border-gray-100/50 backdrop-blur-sm ${isAnimating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'}`}
            style={{
              backgroundColor: style.cardColor,
              borderRadius: `${style.borderRadius}px`,
              color: style.textColor,
              background: `linear-gradient(145deg, ${style.cardColor} 0%, ${style.cardColor}f0 100%)`
            }}
          >
            {/* Question Icon & Title */}
            <div className="flex items-center mb-6">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-xl mr-4 flex-shrink-0"
                style={{
                  backgroundColor: style.primaryColor,
                  borderRadius: `${style.borderRadius}px`
                }}
              >
                <FieldIcon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl md:text-2xl font-semibold text-gray-900 leading-tight">
                  {currentField.label}
                  {currentField.required && <span className="text-red-500 ml-1">*</span>}
                </h3>
                {currentField.placeholder && (
                  <p className="text-gray-500 mt-1 text-sm">
                    {currentField.placeholder}
                  </p>
                )}
              </div>
            </div>

            {/* Field Input */}
            <div className="mb-8">
              {renderField(currentField)}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
                disabled={currentStep === 0}
                className="flex items-center space-x-2 h-12 px-6 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar</span>
              </Button>

              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-400 font-medium">
                  {currentStep + 1} / {totalSteps}
                </div>
                {currentStep === totalSteps - 1 && (
                  <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
                    Último passo!
                  </div>
                )}
              </div>

              <Button
                type="button"
                onClick={handleNext}
                disabled={submitting}
                className="flex items-center space-x-2 h-12 px-8 text-white font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg transform"
                style={{
                  background: `linear-gradient(135deg, ${style.primaryColor} 0%, ${style.primaryColor}dd 100%)`,
                  borderRadius: `${style.borderRadius}px`
                }}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {currentStep === totalSteps - 1 ? '🎯 Finalizar' : 'Próximo'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Source Info */}
          {sourceUrl && (
            <div className="text-center mt-4">
              <span className="text-xs text-gray-400 bg-white/50 px-3 py-1 rounded-full">
                Origem: {sourceUrl}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}