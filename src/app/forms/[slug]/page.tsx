'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronUp, ChevronDown, Check, AlertCircle, Loader2, ArrowLeft, ArrowRight } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────
interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'rating'
  label: string
  name: string
  required: boolean
  options?: string[]
  placeholder?: string
  mapToLead?: string
  scoring?: {
    enabled: boolean
    points?: number
    optionScores?: { [key: string]: number }
  }
}

interface FormStyle {
  primaryColor?: string
  backgroundColor?: string
  textColor?: string
  cardColor?: string
  borderRadius?: string
  fontFamily?: string
  logoUrl?: string
  backgroundPattern?: string
}

interface FormTemplate {
  id: string
  name: string
  description: string
  slug: string
  form_type: 'lead' | 'nps' | 'survey' | 'feedback' | 'other'
  fields: FormField[]
  organization_id?: string
  style?: FormStyle
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
  fields: FormField[]
}

// ─── Component ───────────────────────────────────────────────────────
export default function FormPageSafe() {
  const params = useParams()
  const slug = params.slug as string

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
  const [direction, setDirection] = useState<'next' | 'prev'>('next')

  // ─── Step creation ─────────────────────────────────────────────────
  const createSteps = useCallback((fields: FormField[]) => {
    const stepsFromFields = fields.map((field, index) => ({
      id: index,
      title: field.label,
      description: field.placeholder || '',
      fields: [field],
    }))
    setSteps(stepsFromFields)
  }, [])

  // ─── Effects ───────────────────────────────────────────────────────
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const fetchTemplate = async () => {
      try {
        const { data, error } = await supabase
          .from('form_templates')
          .select('*')
          .eq('slug', slug)
          .single()

        if (error || !data) {
          setTemplate(null)
        } else {
          const mapped = { ...data, leadQualification: data.lead_qualification || undefined }
          setTemplate(mapped)
          createSteps(data.fields)
        }
      } catch {
        setTemplate(null)
      } finally {
        setLoading(false)
      }
    }
    fetchTemplate()
  }, [slug, mounted, createSteps])

  // ─── Form logic ────────────────────────────────────────────────────
  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validateStep = (stepIndex: number) => {
    const newErrors: Record<string, string> = {}
    const currentStepFields = steps[stepIndex]?.fields || []
    currentStepFields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = 'Este campo é obrigatório'
      }
      if (field.type === 'email' && formData[field.name]) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData[field.name])) {
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
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData[field.name])) {
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
        setDirection('next')
        setCurrentStep(prev => prev + 1)
      }
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection('prev')
      setCurrentStep(prev => prev - 1)
    }
  }

  const calculateScore = (): { score: number; temperatura: string; closerId: string | null } => {
    if (!template?.fields || !template?.leadQualification?.enabled) {
      return { score: 0, temperatura: 'frio', closerId: null }
    }
    let totalScore = 0
    template.fields.forEach(field => {
      if (!field.scoring?.enabled) return
      const value = formData[field.name]
      if (!value) return
      if (['select', 'radio'].includes(field.type) && field.scoring?.optionScores) {
        totalScore += field.scoring.optionScores[value] || 0
      } else if (field.type === 'checkbox' && field.scoring?.optionScores) {
        const selected = Array.isArray(value) ? value : [value]
        selected.forEach((opt: string) => { totalScore += field.scoring?.optionScores?.[opt] || 0 })
      } else if (field.type === 'rating' && field.scoring?.optionScores) {
        totalScore += field.scoring.optionScores[value] || 0
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
        token_link: token, lead_id: leadId, closer_id: closerId || null,
        organization_id: template?.organization_id || null,
        tipo_call_permitido: 'vendas',
        titulo_personalizado: `Agendamento de Call - ${nomeCompleto}`,
        descricao_personalizada: `Ola ${nomeCompleto}! Escolha o melhor horario para sua call.`,
        cor_tema: '#3b82f6', ativo: true, uso_unico: true,
        total_visualizacoes: 0, total_agendamentos: 0,
      }
      const { error: linkError } = await supabase
        .from('agendamento_links').insert([linkData]).select().single()
      if (linkError) {
        setSubmitted(true)
      } else {
        setBookingToken(token)
        setTimeout(() => { window.location.href = `/agenda/agendar/${token}` }, 2000)
      }
    } catch {
      setSubmitted(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    if (template?.slug === 'persona-marketing-digital') {
      if (formData.email_acesso !== 'emersonbljr2802@gmail.com') {
        alert('Acesso negado! Este formulário é restrito.')
        return
      }
    }

    setSubmitting(true)
    try {
      // Path 1: Lead qualification with scoring
      if (template?.leadQualification?.enabled) {
        const { score, temperatura, closerId } = calculateScore()
        const leadData: any = {
          origem: 'formulario', status: 'novo', temperatura, score,
          closer_id: closerId, organization_id: template.organization_id || null,
          data_primeiro_contato: new Date().toISOString(),
        }
        template.fields.forEach(field => {
          const value = formData[field.name]
          if (value && field.mapToLead && ['nome_completo', 'email', 'telefone', 'empresa', 'cargo'].includes(field.mapToLead)) {
            leadData[field.mapToLead] = value
          }
        })
        const { data: lead } = await supabase.from('leads').insert([leadData]).select('id').single()
        const leadId = lead?.id
        await supabase.from('form_submissions').insert([{
          template_id: template.id, template_slug: slug,
          organization_id: template.organization_id || null, lead_id: leadId,
          submission_data: formData, score, temperatura, closer_id: closerId,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        }])
        if (template.leadQualification.enableCalendar && closerId && leadId) {
          await createBookingLink(leadId, closerId)
          return
        }
        setSubmitted(true)
        return
      }

      // Path 2: qualificacao-medica special flow
      if (slug === 'qualificacao-medica') {
        const organizationId = template?.organization_id || '00000000-0000-0000-0000-000000000001'
        const submissionData = {
          template_id: template?.id, template_slug: slug,
          organization_id: organizationId,
          source_url: window.location.search ? window.location.search.replace('?source=', '') || 'form_direto' : 'form_direto',
          submission_data: formData,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          ip_address: null,
        }
        const { createClient } = await import('@supabase/supabase-js')
        const publicSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
        )
        const { data: submission, error: submissionError } = await publicSupabase
          .from('form_submissions').insert([submissionData]).select('*').single()
        if (submissionError) throw new Error('Erro ao salvar formulário')
        await new Promise(resolve => setTimeout(resolve, 2000))
        const { data: updatedSubmission } = await supabase
          .from('form_submissions').select('submission_data').eq('id', submission.id).single()
        const agendamentoToken = updatedSubmission?.submission_data?.agendamento_token
        if (agendamentoToken) {
          setBookingToken(agendamentoToken)
          setSubmitted(true)
          setTimeout(() => { window.location.href = `/agenda/agendar/${agendamentoToken}` }, 3000)
        } else {
          setSubmitted(true)
        }
        return
      }

      // Path 3: Default flow
      let leadId = null
      if (template?.form_type === 'lead') {
        const leadData: any = {
          origem: 'formulario_seguro', status: 'novo', observacoes: '',
          organization_id: template?.organization_id || '00000000-0000-0000-0000-000000000001',
          data_primeiro_contato: new Date().toISOString(),
        }
        template.fields.forEach(field => {
          const value = formData[field.name]
          if (value && field.mapToLead && ['nome_completo', 'email', 'telefone', 'empresa', 'cargo'].includes(field.mapToLead)) {
            leadData[field.mapToLead] = value
          }
        })
        const { data: lead } = await supabase.from('leads').insert([leadData]).select().single()
        if (lead) leadId = lead.id
      }
      await supabase.from('form_submissions').insert([{
        template_id: template?.id, template_slug: slug,
        organization_id: template?.organization_id || '00000000-0000-0000-0000-000000000001',
        lead_id: leadId, mentorado_id: null, source_url: 'form_safe',
        submission_data: formData,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      }])
      if (template?.form_type === 'lead' && leadId) {
        await createBookingLink(leadId, null)
      } else {
        setSubmitted(true)
      }
    } catch (error) {
      console.error('Erro no envio:', error)
      alert('Erro ao enviar formulário. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Style config from template ───────────────────────────────────
  const s = template?.style || {}
  const accentColor = s.primaryColor || '#C13B3B'
  const bgColor = s.backgroundColor || '#FDF6EE'
  const txtColor = s.textColor || '#2D2D2D'
  const logoUrl = (s as any).logoUrl || null
  const fontFamily = s.fontFamily || 'Inter, system-ui, sans-serif'

  // ─── Field renderer ────────────────────────────────────────────────
  const renderField = (field: FormField) => {
    const value = formData[field.name]
    const hasError = !!errors[field.name]
    const borderColor = hasError ? '#EF4444' : value ? accentColor : '#D1D5DB'

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
      case 'date':
        return (
          <input
            type={field.type === 'phone' ? 'tel' : field.type}
            value={value || ''}
            onChange={e => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder || `Digite aqui...`}
            autoFocus
            className="w-full bg-transparent border-0 border-b-2 py-3 text-lg outline-none transition-all duration-300 placeholder:text-gray-400"
            style={{ borderBottomColor: borderColor, color: txtColor, fontFamily }}
          />
        )

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={e => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder || 'Digite aqui...'}
            rows={4}
            className="w-full bg-white/60 backdrop-blur-sm border-2 rounded-2xl py-4 px-5 text-base outline-none transition-all duration-300 resize-none placeholder:text-gray-400"
            style={{ borderColor, color: txtColor, fontFamily }}
          />
        )

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={e => handleInputChange(field.name, e.target.value)}
            className="w-full bg-white/60 backdrop-blur-sm border-2 rounded-2xl py-4 px-5 text-base outline-none transition-all duration-300 appearance-none cursor-pointer"
            style={{ borderColor, color: value ? txtColor : '#9CA3AF', fontFamily }}
          >
            <option value="">Selecione uma opção...</option>
            {field.options?.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
        )

      case 'radio':
        return (
          <div className="flex flex-col gap-3">
            {field.options?.map((option, i) => {
              const isSelected = value === option
              return (
                <label
                  key={i}
                  onClick={() => handleInputChange(field.name, option)}
                  className="flex items-center gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-sm"
                  style={{
                    borderColor: isSelected ? accentColor : '#E5E7EB',
                    backgroundColor: isSelected ? accentColor + '08' : 'white',
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={{ borderColor: isSelected ? accentColor : '#9CA3AF' }}
                  >
                    {isSelected && (
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accentColor }} />
                    )}
                  </div>
                  <span className="font-medium text-base" style={{ color: txtColor }}>{option}</span>
                </label>
              )
            })}
          </div>
        )

      case 'checkbox': {
        const selectedArr = Array.isArray(value) ? value : value ? [value] : []
        return (
          <div className="flex flex-col gap-3">
            {field.options?.map((option, i) => {
              const isSelected = selectedArr.includes(option)
              return (
                <label
                  key={i}
                  onClick={() => {
                    let newValue: string[]
                    if (isSelected) {
                      newValue = selectedArr.filter((v: string) => v !== option)
                    } else {
                      newValue = [...selectedArr, option]
                    }
                    handleInputChange(field.name, newValue)
                  }}
                  className="flex items-center gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-sm"
                  style={{
                    borderColor: isSelected ? accentColor : '#E5E7EB',
                    backgroundColor: isSelected ? accentColor + '08' : 'white',
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={{
                      borderColor: isSelected ? accentColor : '#9CA3AF',
                      backgroundColor: isSelected ? accentColor : 'transparent',
                    }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="font-medium text-base" style={{ color: txtColor }}>{option}</span>
                </label>
              )
            })}
            {selectedArr.length > 0 && (
              <p className="text-sm mt-1" style={{ color: accentColor }}>
                {selectedArr.length} selecionado(s)
              </p>
            )}
          </div>
        )
      }

      case 'rating': {
        const ratingOptions = field.options?.length ? field.options : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
        return (
          <div className="flex gap-2 flex-wrap">
            {ratingOptions.map((val) => {
              const isSelected = value === val
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleInputChange(field.name, val)}
                  className="w-14 h-14 rounded-2xl border-2 font-bold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    borderColor: isSelected ? accentColor : '#E5E7EB',
                    backgroundColor: isSelected ? accentColor : 'white',
                    color: isSelected ? '#FFFFFF' : txtColor,
                  }}
                >
                  {val}
                </button>
              )
            })}
          </div>
        )
      }

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={e => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder || 'Digite aqui...'}
            className="w-full bg-transparent border-0 border-b-2 py-3 text-lg outline-none transition-all duration-300 placeholder:text-gray-400"
            style={{ borderBottomColor: borderColor, color: txtColor, fontFamily }}
          />
        )
    }
  }

  // ─── Loading ───────────────────────────────────────────────────────
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: accentColor }} />
          <p className="text-gray-500 text-sm">Carregando formulário...</p>
        </div>
      </div>
    )
  }

  // ─── Not found ─────────────────────────────────────────────────────
  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="bg-white rounded-3xl p-10 shadow-lg max-w-md w-full mx-4 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Formulário não encontrado</h2>
          <p className="text-gray-500">O formulário solicitado não existe ou foi removido.</p>
        </div>
      </div>
    )
  }

  // ─── Booking redirect ──────────────────────────────────────────────
  if (bookingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="bg-white rounded-3xl p-10 shadow-lg max-w-md w-full mx-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: accentColor }} />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Preparando seu agendamento...</h2>
          <p className="text-gray-500">Você será redirecionado em instantes.</p>
        </div>
      </div>
    )
  }

  // ─── Success ───────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="bg-white rounded-3xl p-10 shadow-lg max-w-md w-full mx-4 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: accentColor + '15' }}
          >
            <Check className="w-8 h-8" style={{ color: accentColor }} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Obrigado!</h2>
          <p className="text-gray-500">Seu formulário foi enviado com sucesso.</p>
        </div>
      </div>
    )
  }

  // ─── Waiting for steps ─────────────────────────────────────────────
  if (steps.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: accentColor }} />
      </div>
    )
  }

  // ─── Main form rendering ──────────────────────────────────────────
  const currentField = steps[currentStep]?.fields[0]
  const isLastStep = currentStep === steps.length - 1

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ backgroundColor: bgColor, fontFamily }}
    >
      {/* CSS animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in { animation: fadeSlideIn 0.35s ease-out; }
        .animate-slide-up { animation: fadeSlideUp 0.35s ease-out; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      ` }} />

      {/* Dot pattern background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top accent bar */}
      <div className="h-1 w-full relative z-10" style={{ backgroundColor: accentColor }} />

      {/* Header: logo + progress */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-10 md:h-12 object-contain" />
          ) : (
            <span className="text-sm font-semibold" style={{ color: txtColor + '60' }}>
              {template.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="w-24 md:w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((currentStep + (completedSteps.has(currentStep) ? 1 : 0)) / steps.length) * 100}%`,
                backgroundColor: accentColor,
              }}
            />
          </div>
          <span className="text-sm font-semibold tabular-nums" style={{ color: accentColor }}>
            {currentStep + 1}/{steps.length}
          </span>
        </div>
      </header>

      {/* Question area */}
      <main className="relative z-10 max-w-2xl mx-auto px-6 md:px-10 pt-8 md:pt-20 pb-32">
        <form onSubmit={isLastStep ? handleSubmit : (e) => { e.preventDefault(); nextStep() }}>
          <div
            key={currentStep}
            className={direction === 'next' ? 'animate-slide-in' : 'animate-slide-up'}
          >
            {/* Question number + text */}
            <div className="mb-8">
              <span
                className="text-base font-bold mb-2 block"
                style={{ color: txtColor + '50' }}
              >
                {currentStep + 1}.
              </span>
              <h2
                className="text-2xl md:text-3xl font-bold mb-2 leading-tight"
                style={{ color: txtColor }}
              >
                {currentField?.label}
                {currentField?.required && (
                  <span style={{ color: accentColor }} className="ml-1">*</span>
                )}
              </h2>
              {currentField?.placeholder && (
                <p className="text-base" style={{ color: txtColor + '70' }}>
                  {currentField.placeholder}
                </p>
              )}
            </div>

            {/* Field */}
            <div className="mb-8">
              {currentField && renderField(currentField)}
            </div>

            {/* Error message */}
            {currentField && errors[currentField.name] && (
              <div className="flex items-center gap-2 mb-6 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                {errors[currentField.name]}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                  style={{ borderColor: '#E5E7EB', color: txtColor + '80' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 rounded-xl text-white text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
                style={{ backgroundColor: accentColor }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : isLastStep ? (
                  <>
                    Enviar
                    <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Responder
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* Side navigation arrows (desktop only) */}
      <nav className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 flex-col gap-1.5 z-20">
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className="w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-200 hover:shadow-sm disabled:opacity-25"
          style={{ borderColor: '#E5E7EB', backgroundColor: 'white' }}
        >
          <ChevronUp className="w-5 h-5" style={{ color: txtColor }} />
        </button>
        <button
          onClick={() => { if (validateStep(currentStep)) nextStep() }}
          disabled={isLastStep}
          className="w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-200 hover:shadow-sm disabled:opacity-25"
          style={{ borderColor: '#E5E7EB', backgroundColor: 'white' }}
        >
          <ChevronDown className="w-5 h-5" style={{ color: txtColor }} />
        </button>
      </nav>
    </div>
  )
}
