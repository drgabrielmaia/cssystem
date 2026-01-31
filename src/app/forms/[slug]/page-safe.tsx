'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'

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

interface FormTemplate {
  id: string
  name: string
  description: string
  slug: string
  form_type: 'lead' | 'nps' | 'survey' | 'feedback' | 'other'
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

  const slug = params.slug as string

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
          console.error('❌ Erro ao buscar template:', error)
          setTemplate(null)
        } else if (data) {
          console.log('✅ Template carregado:', data.name)
          setTemplate(data)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setSubmitting(true)

    try {
      console.log('📤 Enviando formulário:', formData)

      // Criar lead se for formulário de lead
      let leadId = null
      if (template?.form_type === 'lead') {
        const leadData = {
          origem: 'formulario_seguro',
          status: 'novo',
          observacoes: ''
        }

        template.fields.forEach(field => {
          const value = formData[field.name]
          if (value && field.mapToLead && ['nome_completo', 'email', 'telefone', 'empresa', 'cargo'].includes(field.mapToLead)) {
            leadData[field.mapToLead] = value
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
      setSubmitted(true)
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {template.name}
            </h1>
            <p className="text-gray-600">
              {template.description}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {template.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                <Input
                  type={field.type}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
                  className={errors[field.name] ? 'border-red-500' : ''}
                />

                {errors[field.name] && (
                  <p className="text-red-500 text-sm flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors[field.name]}
                  </p>
                )}
              </div>
            ))}

            <div className="pt-4">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar Formulário
                    <ArrowRight className="h-4 w-4 ml-2" />
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