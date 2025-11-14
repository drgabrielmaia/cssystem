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

  const slug = params.slug as string

  useEffect(() => {
    console.log('Entrou na página')
    // Capturar URL de origem
    const urlParams = new URLSearchParams(window.location.search)
    const ref = urlParams.get('ref') || urlParams.get('source') || ''
    const utmSource = urlParams.get('utm_source') || ''
    const utmMedium = urlParams.get('utm_medium') || ''
    const utmCampaign = urlParams.get('utm_campaign') || ''

    // Construir string de origem
    let source = ''
    if (ref) {
      source = ref
    } else if (utmSource || utmMedium || utmCampaign) {
      source = [utmSource, utmMedium, utmCampaign].filter(Boolean).join('/')
    } else if (document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer)
        if (referrerUrl.hostname.includes('instagram.com')) {
          source = 'instagram'
        } else if (referrerUrl.hostname.includes('facebook.com')) {
          source = 'facebook'
        } else if (referrerUrl.hostname.includes('google.com')) {
          source = 'google'
        } else if (referrerUrl.hostname !== window.location.hostname) {
          source = referrerUrl.hostname
        }
      } catch {
        source = 'direct'
      }
    } else {
      source = 'direct'
    }

    setSourceUrl(source)
    fetchTemplate()
  }, [slug])

  const fetchTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error) {
        console.error('Erro ao buscar template:', error)
        return
      }

      if (data) {
        setTemplate(data)
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
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
        source_url: sourceUrl,
        submission_data: formData,
        ip_address: null, // Pode ser capturado pelo backend se necessário
        user_agent: navigator.userAgent
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

    // Auto-save com debounce de 200ms (mais responsivo)
    debouncedAutoSave(name, value)
  }

  // Debounced auto-save function
  const debouncedAutoSave = useCallback(debounce(async (fieldName: string, fieldValue: any) => {
    await autoSaveField(fieldName, fieldValue)
  }, 200), [])

  // Função de auto-save campo por campo
  const autoSaveField = async (fieldName: string, fieldValue: any) => {
    try {
      console.log(`🔧 autoSaveField: ${fieldName} = ${fieldValue}`)

      // Se não for formulário de lead, não fazer nada
      if (template?.form_type !== 'lead') {
        console.log(`❌ Não é formulário de lead`)
        return
      }

      const field = template?.fields.find(f => f.name === fieldName)
      if (!field) {
        console.log(`❌ Campo ${fieldName} não encontrado`)
        return
      }

      if (currentLeadId) {
        console.log(`🔄 Atualizando lead existente: ${currentLeadId}`)

        // Para lead existente, só atualizar se o campo tem mapeamento específico
        if (field.mapToLead && field.mapToLead !== 'none') {
          const updateData = {
            [field.mapToLead]: fieldValue
          }

          const { error } = await supabase
            .from('leads')
            .update(updateData)
            .eq('id', currentLeadId)

          if (!error) {
            console.log('✅ Update específico')
          } else {
            console.log('❌ Erro no update:', error)
          }
        } else {
          // Campo sem mapeamento - adicionar às observações
          const observacao = `${field.label}: ${fieldValue}`

          // Primeiro pegar as observações atuais
          const { data: leadAtual } = await supabase
            .from('leads')
            .select('observacoes')
            .eq('id', currentLeadId)
            .single()

          const novasObservacoes = (leadAtual?.observacoes || '') + '\n' + observacao

          const { error } = await supabase
            .from('leads')
            .update({ observacoes: novasObservacoes })
            .eq('id', currentLeadId)

          if (!error) {
            console.log('✅ Adicionado às observações')
          } else {
            console.log('❌ Erro ao adicionar observações:', error)
          }
        }
      } else {
        console.log(`🆕 CRIANDO NOVO LEAD - PRIMEIRA PERGUNTA`)

        // PRIMEIRA pergunta SEMPRE cria o lead no BD
        const initialLeadData: Record<string, any> = {
          origem: sourceUrl || 'formulario_temp',
          status: 'preenchendo'
        }

        // Se o campo tem mapeamento específico, usar
        if (field.mapToLead && field.mapToLead !== 'none') {
          initialLeadData[field.mapToLead] = fieldValue
        } else {
          // Se não tem mapeamento, adicionar às observações
          initialLeadData.observacoes = `${field.label}: ${fieldValue}`
        }

        const { data, error } = await supabase
          .from('leads')
          .insert([initialLeadData])
          .select('id')
          .single()

        if (!error && data?.id) {
          setCurrentLeadId(data.id) // Salvar ID no estado
          console.log('✅ CRIOU LEAD PRIMEIRA PERGUNTA:', data.id)

          // TAMBÉM criar form_submission imediatamente
          const submissionData = {
            template_id: template?.id,
            template_slug: slug,
            lead_id: data.id,
            source_url: sourceUrl,
            submission_data: { [fieldName]: fieldValue },
            ip_address: null,
            user_agent: navigator.userAgent
          }

          const { error: submissionError } = await supabase
            .from('form_submissions')
            .insert([submissionData])

          if (!submissionError) {
            console.log('✅ CRIOU FORM_SUBMISSION PRIMEIRA PERGUNTA')
          } else {
            console.log('❌ Erro ao criar form_submission:', submissionError)
          }
        } else {
          console.log('❌ Erro ao criar lead:', error)
        }
      }
    } catch (error) {
      console.log('💥 Erro no autoSaveField:', error)
    }
  }

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
          submission_data: formData,
          completed_at: new Date().toISOString()
        })
        .eq('lead_id', currentLeadId)
        .eq('template_slug', slug)

      console.log('✅ Form_submission atualizado')

    } catch (error) {
      console.error('Erro ao salvar:', error)
    }
  }

  const handleNext = async () => {
    if (validateCurrentField()) {
      // FORÇAR criação/atualização do lead no primeiro "Próximo" se não existir
      if (!currentLeadId && template?.form_type === 'lead') {
        const currentField = template.fields[currentStep]
        const currentValue = formData[currentField.name]

        if (currentValue && currentField.mapToLead && currentField.mapToLead !== 'none') {
          console.log('🔥 Forçando criação do lead no próximo')
          await autoSaveField(currentField.name, currentValue)
        }
      }

      // Se for último campo, finalizar
      if (template && currentStep === template.fields.length - 1) {
        await saveFormData() // SÓ chama saveFormData no ÚLTIMO campo
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

      case 'textarea':
        return (
          <div className="space-y-3">
            <Textarea
              id={field.id}
              value={formData[field.name] || ''}
              onChange={(e) => updateFormData(field.name, e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={field.placeholder || `Conte-nos mais sobre ${field.label.toLowerCase()}...`}
              className={`min-h-[120px] text-lg border-2 rounded-xl transition-all duration-200 resize-none ${
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Carregando formulário...</p>
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full mx-4 text-center">
          <div className="animate-pulse">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Obrigado! ✨
          </h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Seu formulário foi enviado com sucesso. Entraremos em contato em breve.
          </p>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-sm text-green-700 font-medium">
              Suas informações foram registradas e você será contactado dentro de 24 horas.
            </p>
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
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {template.name}
            </h1>
            <p className="text-gray-600 text-lg">
              Pergunta {currentStep + 1} de {totalSteps}
            </p>
          </div>

          {/* Question Card */}
          <div
            className={`shadow-xl p-6 md:p-8 transition-all duration-300 ${isAnimating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'}`}
            style={{
              backgroundColor: style.cardColor,
              borderRadius: `${style.borderRadius}px`,
              color: style.textColor
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
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
                disabled={currentStep === 0}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar</span>
              </Button>

              <div className="text-sm text-gray-400">
                {currentStep + 1} / {totalSteps}
              </div>

              <Button
                type="button"
                onClick={handleNext}
                disabled={submitting}
                className="flex items-center space-x-2 text-white font-medium transition-all hover:opacity-90"
                style={{
                  backgroundColor: style.primaryColor,
                  borderRadius: `${style.borderRadius}px`
                }}
              >
                <span>
                  {currentStep === totalSteps - 1
                    ? (submitting ? 'Enviando...' : 'Finalizar')
                    : 'Próximo'
                  }
                </span>
                <ArrowRight className="h-4 w-4" />
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