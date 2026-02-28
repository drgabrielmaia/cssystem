'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { MentoradoAuthProvider, useMentoradoAuth } from '@/contexts/mentorado-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Brain, Loader2, ChevronRight, ChevronLeft, Check, Sparkles,
  User, ArrowLeft, CheckCircle2, Target, Star
} from 'lucide-react'
import Link from 'next/link'

interface ICPField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number'
  required: boolean
  placeholder?: string
  options?: string[]
}

interface ICPTemplate {
  id: string
  name: string
  description: string
  fields: ICPField[]
}

function ICPFormContent() {
  const { mentorado, loading: authLoading } = useMentoradoAuth()
  const [template, setTemplate] = useState<ICPTemplate | null>(null)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)

  const loadTemplate = useCallback(async () => {
    const { data } = await supabase
      .from('icp_form_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data) setTemplate(data)
  }, [])

  const checkExisting = useCallback(async () => {
    if (!mentorado) return
    // Check if already has an ICP response
    const { data } = await supabase
      .from('icp_responses')
      .select('id')
      .eq('mentorado_id', mentorado.id)
      .limit(1)

    if (data && data.length > 0) {
      setAlreadyCompleted(true)
    }
  }, [mentorado])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await loadTemplate()
      await checkExisting()
      setLoading(false)
    }
    init()
  }, [loadTemplate, checkExisting])

  const currentField = template?.fields?.[currentStep]
  const totalSteps = template?.fields?.length || 0
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0

  const isCurrentValid = () => {
    if (!currentField) return false
    const val = responses[currentField.id]
    if (!currentField.required) return true
    if (currentField.type === 'multiselect') return Array.isArray(val) && val.length > 0
    return val !== undefined && val !== null && val !== ''
  }

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!mentorado || !template) return
    setSubmitting(true)
    try {
      // Save response
      const { data: respData } = await supabase
        .from('icp_responses')
        .insert({
          template_id: template.id,
          mentorado_id: mentorado.id,
          responses,
          completed_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      // Update mentorado
      if (respData) {
        await supabase
          .from('mentorados')
          .update({
            icp_completed: true,
            icp_response_id: respData.id,
          })
          .eq('id', mentorado.id)
      }

      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting ICP:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleMultiselect = (fieldId: string, option: string) => {
    const current = responses[fieldId] || []
    const updated = current.includes(option)
      ? current.filter((o: string) => o !== option)
      : [...current, option]
    setResponses({ ...responses, [fieldId]: updated })
  }

  // AUTH LOADING
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-amber-400" />
          <p className="text-white/60">Carregando formulário ICP...</p>
        </div>
      </div>
    )
  }

  // NOT LOGGED IN
  if (!mentorado) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
        <Card className="p-8 bg-white/5 backdrop-blur-xl border-white/10 max-w-md w-full text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-white/30" />
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-white/50 mb-6">Faça login como mentorado para acessar o formulário ICP.</p>
          <Link href="/mentorado">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Ir para Login
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  // ALREADY COMPLETED
  if (alreadyCompleted && !submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
        <Card className="p-8 bg-white/5 backdrop-blur-xl border-white/10 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">ICP já preenchido!</h2>
          <p className="text-white/50 mb-6">Você já respondeu o formulário de Perfil do Cliente Ideal. Obrigado!</p>
          <Link href="/mentorado">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Portal
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  // SUCCESS
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <div className="relative mb-8">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center animate-pulse">
              <Sparkles className="w-12 h-12 text-amber-400" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center animate-bounce">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent mb-3">
            ICP Enviado com Sucesso!
          </h2>
          <p className="text-white/50 mb-8 text-lg">
            Suas respostas foram registradas. Agora entendemos melhor o seu perfil e podemos te ajudar de forma mais personalizada.
          </p>
          <Link href="/mentorado">
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold px-8 py-3 text-base">
              Continuar para o Portal
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // NO TEMPLATE
  if (!template || !template.fields?.length) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
        <Card className="p-8 bg-white/5 backdrop-blur-xl border-white/10 max-w-md w-full text-center">
          <Brain className="w-16 h-16 mx-auto mb-4 text-white/20" />
          <h2 className="text-xl font-bold text-white mb-2">Formulário não disponível</h2>
          <p className="text-white/40">O formulário ICP ainda não foi configurado pelo administrador.</p>
        </Card>
      </div>
    )
  }

  // FORM
  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col">
      {/* Top Bar */}
      <div className="bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/10">
                <Brain className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Perfil do Cliente Ideal</h1>
                <p className="text-xs text-white/40">Conte-nos sobre você e seu negócio</p>
              </div>
            </div>
            <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20">
              {currentStep + 1} / {totalSteps}
            </Badge>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {currentField && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-5 duration-300" key={currentField.id}>
              {/* Question */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-amber-400/60">
                    Pergunta {currentStep + 1}
                  </span>
                  {currentField.required && (
                    <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px] px-1.5 py-0">
                      Obrigatório
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                  {currentField.label}
                </h2>
              </div>

              {/* Input Based on Type */}
              <div className="mt-8">
                {currentField.type === 'text' && (
                  <Input
                    value={responses[currentField.id] || ''}
                    onChange={(e) => setResponses({ ...responses, [currentField.id]: e.target.value })}
                    placeholder={currentField.placeholder || 'Digite sua resposta...'}
                    className="bg-white/5 border-white/10 text-white text-lg h-14 placeholder:text-white/20 focus:border-amber-500/50 focus:ring-amber-500/20"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isCurrentValid()) handleNext()
                    }}
                  />
                )}

                {currentField.type === 'number' && (
                  <Input
                    type="number"
                    value={responses[currentField.id] || ''}
                    onChange={(e) => setResponses({ ...responses, [currentField.id]: e.target.value })}
                    placeholder={currentField.placeholder || '0'}
                    className="bg-white/5 border-white/10 text-white text-lg h-14 placeholder:text-white/20 focus:border-amber-500/50 focus:ring-amber-500/20"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isCurrentValid()) handleNext()
                    }}
                  />
                )}

                {currentField.type === 'textarea' && (
                  <textarea
                    value={responses[currentField.id] || ''}
                    onChange={(e) => setResponses({ ...responses, [currentField.id]: e.target.value })}
                    placeholder={currentField.placeholder || 'Digite sua resposta...'}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 text-white text-base rounded-lg px-4 py-3 placeholder:text-white/20 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 focus:outline-none resize-none"
                    autoFocus
                  />
                )}

                {currentField.type === 'select' && (
                  <div className="grid grid-cols-1 gap-2">
                    {currentField.options?.map((opt) => {
                      const selected = responses[currentField.id] === opt
                      return (
                        <button
                          key={opt}
                          onClick={() => {
                            setResponses({ ...responses, [currentField.id]: opt })
                            // Auto advance after short delay
                            setTimeout(() => {
                              if (currentStep < totalSteps - 1) {
                                setCurrentStep(currentStep + 1)
                              }
                            }, 300)
                          }}
                          className={`text-left px-5 py-4 rounded-xl border transition-all duration-200 ${
                            selected
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 shadow-lg shadow-amber-500/5'
                              : 'bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-base">{opt}</span>
                            {selected && <Check className="w-5 h-5 text-amber-400" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {currentField.type === 'multiselect' && (
                  <div className="space-y-2">
                    <p className="text-xs text-white/30 mb-3">Selecione uma ou mais opções</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentField.options?.map((opt) => {
                        const selected = (responses[currentField.id] || []).includes(opt)
                        return (
                          <button
                            key={opt}
                            onClick={() => toggleMultiselect(currentField.id, opt)}
                            className={`text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                              selected
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                : 'bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                                  selected
                                    ? 'bg-amber-500 border-amber-500'
                                    : 'border-white/20'
                                }`}
                              >
                                {selected && <Check className="w-3 h-3 text-black" />}
                              </div>
                              <span className="text-sm">{opt}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-[#0a0a0c]/80 backdrop-blur-xl border-t border-white/5 sticky bottom-0">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            onClick={handlePrev}
            disabled={currentStep === 0}
            variant="outline"
            className="border-white/10 text-white/60 hover:bg-white/5 disabled:opacity-20"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>

          {currentStep === totalSteps - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!isCurrentValid() || submitting}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold px-8"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Enviar ICP
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!isCurrentValid()}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 disabled:opacity-30"
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MentoradoICPPage() {
  return (
    <MentoradoAuthProvider>
      <ICPFormContent />
    </MentoradoAuthProvider>
  )
}
