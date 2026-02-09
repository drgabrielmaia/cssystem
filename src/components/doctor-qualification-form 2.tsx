'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Stethoscope,
  DollarSign,
  Clock,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Heart
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Tipos específicos para médicos
interface DoctorQualificationData {
  // Informações básicas
  nome_completo: string
  email: string
  whatsapp: string
  
  // Contexto profissional
  principal_fonte_renda: 'plantao' | 'sus' | 'convenios' | 'consultorio' | 'misto'
  plantoes_por_semana: 'nenhum' | '1-2' | '3-4' | '5+'
  tempo_formado: '<2_anos' | '2-5_anos' | '5-10_anos' | '+10_anos'
  
  // Realidade financeira
  renda_mensal: 'ate_15k' | '15-30k' | '30-60k' | 'acima_60k'
  dependencia_horas: 'quase_tudo' | 'mais_metade' | 'menos_metade' | 'pouco'
  
  // Dor e insatisfação
  o_que_mais_incomoda: string
  visao_3_anos: string
  
  // Momento e ambição
  ja_tentou_consultorio: 'nao' | 'sozinho' | 'curso_mentoria' | 'ja_tem_algo'
  objetivo_principal: 'ganhar_mais' | 'trabalhar_menos' | 'liberdade' | 'confuso'
  
  // Capacidade de investimento
  condicoes_investir: 'sim' | 'sim_planejamento' | 'nao'
  estilo_decisao: 'rapido' | 'analisa' | 'trava'
  
  // Comprometimento
  por_que_agora: string
}

interface FormStep {
  id: number
  title: string
  subtitle: string
  icon: any
  fields: string[]
}

const formSteps: FormStep[] = [
  {
    id: 1,
    title: "Informações Básicas",
    subtitle: "Vamos começar conhecendo você",
    icon: Heart,
    fields: ['nome_completo', 'email', 'whatsapp']
  },
  {
    id: 2,
    title: "Contexto Profissional",
    subtitle: "Sua situação atual na medicina",
    icon: Stethoscope,
    fields: ['principal_fonte_renda', 'plantoes_por_semana', 'tempo_formado']
  },
  {
    id: 3,
    title: "Realidade Financeira",
    subtitle: "Como está sua situação financeira hoje",
    icon: DollarSign,
    fields: ['renda_mensal', 'dependencia_horas']
  },
  {
    id: 4,
    title: "Dor e Insatisfação",
    subtitle: "O que te incomoda na sua carreira",
    icon: AlertCircle,
    fields: ['o_que_mais_incomoda', 'visao_3_anos']
  },
  {
    id: 5,
    title: "Momento e Ambição",
    subtitle: "Seus objetivos e experiências",
    icon: Target,
    fields: ['ja_tentou_consultorio', 'objetivo_principal']
  },
  {
    id: 6,
    title: "Capacidade de Investimento",
    subtitle: "Sua disponibilidade para investir",
    icon: TrendingUp,
    fields: ['condicoes_investir', 'estilo_decisao']
  },
  {
    id: 7,
    title: "Comprometimento",
    subtitle: "Por que decidir agora?",
    icon: Clock,
    fields: ['por_que_agora']
  }
]

export function DoctorQualificationForm() {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<DoctorQualificationData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [score, setScore] = useState(0)
  const [temperature, setTemperature] = useState<'quente' | 'morno' | 'frio'>('frio')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [startTime] = useState(Date.now())
  const [fieldStartTimes, setFieldStartTimes] = useState<Record<string, number>>({})

  // Cálculo do progresso
  const progress = ((currentStep - 1) / (formSteps.length - 1)) * 100

  // Função para calcular o score
  const calculateScore = useCallback((data: Partial<DoctorQualificationData>) => {
    let totalScore = 0

    // Contexto Profissional (25 pontos)
    const fonteRendaScores = {
      'consultorio': 25,
      'misto': 20,
      'convenios': 15,
      'plantao': 10,
      'sus': 5
    }
    totalScore += fonteRendaScores[data.principal_fonte_renda as keyof typeof fonteRendaScores] || 0

    // Tempo formado (15 pontos)
    const tempoFormadoScores = {
      '+10_anos': 15,
      '5-10_anos': 12,
      '2-5_anos': 8,
      '<2_anos': 5
    }
    totalScore += tempoFormadoScores[data.tempo_formado as keyof typeof tempoFormadoScores] || 0

    // Renda mensal (20 pontos)
    const rendaScores = {
      'acima_60k': 20,
      '30-60k': 15,
      '15-30k': 10,
      'ate_15k': 5
    }
    totalScore += rendaScores[data.renda_mensal as keyof typeof rendaScores] || 0

    // Experiência com consultório (15 pontos)
    const consultorioScores = {
      'ja_tem_algo': 15,
      'curso_mentoria': 12,
      'sozinho': 8,
      'nao': 5
    }
    totalScore += consultorioScores[data.ja_tentou_consultorio as keyof typeof consultorioScores] || 0

    // Capacidade de investimento (25 pontos)
    const investimentoScores = {
      'sim': 25,
      'sim_planejamento': 15,
      'nao': 0
    }
    totalScore += investimentoScores[data.condicoes_investir as keyof typeof investimentoScores] || 0

    // Determinar temperatura
    let temp: 'quente' | 'morno' | 'frio'
    if (totalScore >= 80 || data.condicoes_investir === 'sim') {
      temp = 'quente'
    } else if (totalScore >= 50) {
      temp = 'morno'
    } else {
      temp = 'frio'
    }

    return { score: totalScore, temperature: temp }
  }, [])

  // Validação de campos
  const validateStep = (step: number): boolean => {
    const stepFields = formSteps.find(s => s.id === step)?.fields || []
    const newErrors: Record<string, string> = {}

    stepFields.forEach(field => {
      if (field === 'nome_completo' && !formData.nome_completo?.trim()) {
        newErrors.nome_completo = 'Nome completo é obrigatório'
      }
      if (field === 'email' && !formData.email?.trim()) {
        newErrors.email = 'Email é obrigatório'
      }
      if (field === 'whatsapp' && !formData.whatsapp?.trim()) {
        newErrors.whatsapp = 'WhatsApp é obrigatório'
      }
      if (field === 'o_que_mais_incomoda' && !formData.o_que_mais_incomoda?.trim()) {
        newErrors.o_que_mais_incomoda = 'Este campo é obrigatório'
      }
      if (field === 'visao_3_anos' && !formData.visao_3_anos?.trim()) {
        newErrors.visao_3_anos = 'Este campo é obrigatório'
      }
      if (field === 'por_que_agora' && !formData.por_que_agora?.trim()) {
        newErrors.por_que_agora = 'Este campo é obrigatório'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFieldFocus = (fieldName: string) => {
    setFieldStartTimes(prev => ({
      ...prev,
      [fieldName]: Date.now()
    }))
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, formSteps.length))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return

    setIsSubmitting(true)

    try {
      const { score: calculatedScore, temperature: calculatedTemp } = calculateScore(formData)
      setScore(calculatedScore)
      setTemperature(calculatedTemp)

      const completionTime = Math.floor((Date.now() - startTime) / 1000)

      const qualificationData = {
        // Mapeamento para a estrutura da tabela lead_qualifications
        nome_completo: formData.nome_completo!,
        email: formData.email!,
        whatsapp: formData.whatsapp!,
        
        // Mapeando campos específicos para campos genéricos
        origem_conhecimento: 'formulario_medicos',
        situacao_negocio: 'tem_negocio_escalando' as any, // Baseado na situação do médico
        forma_pagamento: formData.condicoes_investir === 'sim' ? 'a_vista' as any : 'vai_conseguir' as any,
        urgencia: 'imediato' as any, // Assumindo urgência alta para médicos qualificados
        
        // Campos de análise
        motivacao_principal: formData.o_que_mais_incomoda,
        maior_desafio: formData.visao_3_anos,
        
        // Scoring
        score_total: calculatedScore,
        temperatura: calculatedTemp,
        score_breakdown: {
          contexto_profissional: {
            score: calculatedScore * 0.25,
            weight: '25%'
          },
          situacao_financeira: {
            score: calculatedScore * 0.35,
            weight: '35%'
          },
          capacidade_investimento: {
            score: calculatedScore * 0.25,
            weight: '25%'
          },
          experiencia_anterior: {
            score: calculatedScore * 0.15,
            weight: '15%'
          },
          total: calculatedScore,
          max_possible: 100
        },
        
        // Dados específicos do médico em JSONB
        psychological_profile: {
          contexto_profissional: {
            principal_fonte_renda: formData.principal_fonte_renda,
            plantoes_por_semana: formData.plantoes_por_semana,
            tempo_formado: formData.tempo_formado
          },
          realidade_financeira: {
            renda_mensal: formData.renda_mensal,
            dependencia_horas: formData.dependencia_horas
          },
          momento_ambicao: {
            ja_tentou_consultorio: formData.ja_tentou_consultorio,
            objetivo_principal: formData.objetivo_principal
          },
          capacidade_decisao: {
            condicoes_investir: formData.condicoes_investir,
            estilo_decisao: formData.estilo_decisao
          },
          comprometimento: {
            por_que_agora: formData.por_que_agora
          }
        },
        
        engagement_signals: {
          form_start_time: new Date(startTime).toISOString(),
          form_complete_time: new Date().toISOString(),
          total_time_seconds: completionTime,
          field_times: fieldStartTimes,
          field_changes: {}, // Poderia ser implementado para rastrear mudanças
          hesitation_points: [],
          scroll_depth: 100,
          mouse_activity: 1,
          device_switches: 0
        },
        
        form_version: '1.0',
        completion_time: completionTime,
        device_info: {
          user_agent: navigator.userAgent,
          platform: navigator.platform,
          screen_resolution: `${screen.width}x${screen.height}`,
          browser: navigator.userAgent,
          is_mobile: /Mobile|Android|iPhone/.test(navigator.userAgent)
        },
        
        status: 'new',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('lead_qualifications')
        .insert([qualificationData])
        .select()
        .single()

      if (error) {
        console.error('Erro ao salvar qualificação:', error)
        throw error
      }

      console.log('✅ Qualificação salva com sucesso:', data)

      // Notificação baseada na temperatura
      if (calculatedTemp === 'quente') {
        toast({
          title: "🔥 Lead Quente Identificado!",
          description: `Score: ${calculatedScore}/100 - Ação imediata necessária!`,
          duration: 5000,
        })
      } else if (calculatedTemp === 'morno') {
        toast({
          title: "📊 Lead Qualificado",
          description: `Score: ${calculatedScore}/100 - Requer nutrição.`,
          duration: 4000,
        })
      } else {
        toast({
          title: "✅ Qualificação Registrada",
          description: `Score: ${calculatedScore}/100 - Acompanhamento necessário.`,
          duration: 3000,
        })
      }

      setIsCompleted(true)
    } catch (error) {
      console.error('Erro ao submeter formulário:', error)
      toast({
        title: "Erro ao enviar formulário",
        description: "Tente novamente em alguns momentos.",
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full"
        >
          <Card className="text-center border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mb-8"
              >
                <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-4xl ${
                  temperature === 'quente' ? 'bg-red-100 text-red-600' :
                  temperature === 'morno' ? 'bg-orange-100 text-orange-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {temperature === 'quente' ? '🔥' : temperature === 'morno' ? '📊' : '❄️'}
                </div>
              </motion.div>

              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Qualificação Concluída!
              </h2>
              
              <div className="mb-8">
                <p className="text-gray-600 mb-4">
                  Sua qualificação foi registrada com sucesso.
                </p>
                
                <div className="flex items-center justify-center gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{score}/100</div>
                    <div className="text-sm text-gray-500">Score</div>
                  </div>
                  <div className="text-center">
                    <Badge 
                      variant="outline" 
                      className={`text-sm px-3 py-1 ${
                        temperature === 'quente' ? 'border-red-200 text-red-700 bg-red-50' :
                        temperature === 'morno' ? 'border-orange-200 text-orange-700 bg-orange-50' :
                        'border-blue-200 text-blue-700 bg-blue-50'
                      }`}
                    >
                      {temperature === 'quente' ? 'Lead Quente' : 
                       temperature === 'morno' ? 'Lead Morno' : 'Lead Frio'}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  Nossa equipe entrará em contato em breve para dar continuidade ao processo.
                </p>
              </div>

              <Button 
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                Nova Qualificação
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  const currentStepData = formSteps.find(step => step.id === currentStep)!

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Qualificação Médica Avançada
          </h1>
          <p className="text-gray-600">
            Questionário especializado para entender seu perfil profissional
          </p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Etapa {currentStep} de {formSteps.length}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </motion.div>

        {/* Step Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {formSteps.map((step) => (
              <div
                key={step.id}
                className={`flex items-center space-x-2 ${
                  step.id <= currentStep ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.id < currentStep
                      ? 'bg-blue-600 text-white'
                      : step.id === currentStep
                      ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {step.id < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.id
                  )}
                </div>
                {step.id < formSteps.length && (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Form Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                  <currentStepData.icon className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl text-gray-900">
                  {currentStepData.title}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {currentStepData.subtitle}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Informações Básicas */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nome_completo" className="text-sm font-medium text-gray-700">
                        Nome Completo *
                      </Label>
                      <Input
                        id="nome_completo"
                        value={formData.nome_completo || ''}
                        onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                        onFocus={() => handleFieldFocus('nome_completo')}
                        placeholder="Dr(a). Seu nome completo"
                        className={errors.nome_completo ? 'border-red-500' : ''}
                      />
                      {errors.nome_completo && (
                        <p className="text-red-500 text-xs mt-1">{errors.nome_completo}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        onFocus={() => handleFieldFocus('email')}
                        placeholder="seu.email@exemplo.com"
                        className={errors.email ? 'border-red-500' : ''}
                      />
                      {errors.email && (
                        <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="whatsapp" className="text-sm font-medium text-gray-700">
                        WhatsApp *
                      </Label>
                      <Input
                        id="whatsapp"
                        value={formData.whatsapp || ''}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        onFocus={() => handleFieldFocus('whatsapp')}
                        placeholder="(00) 00000-0000"
                        className={errors.whatsapp ? 'border-red-500' : ''}
                      />
                      {errors.whatsapp && (
                        <p className="text-red-500 text-xs mt-1">{errors.whatsapp}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Contexto Profissional */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Principal fonte de renda:
                      </Label>
                      <RadioGroup
                        value={formData.principal_fonte_renda}
                        onValueChange={(value) => setFormData({ ...formData, principal_fonte_renda: value as any })}
                        className="space-y-2"
                      >
                        {[
                          { value: 'plantao', label: 'Plantão' },
                          { value: 'sus', label: 'SUS' },
                          { value: 'convenios', label: 'Convênios' },
                          { value: 'consultorio', label: 'Consultório próprio' },
                          { value: 'misto', label: 'Misto (várias fontes)' }
                        ].map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={option.value} />
                            <Label htmlFor={option.value} className="font-normal cursor-pointer">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Plantões por semana:
                      </Label>
                      <RadioGroup
                        value={formData.plantoes_por_semana}
                        onValueChange={(value) => setFormData({ ...formData, plantoes_por_semana: value as any })}
                        className="space-y-2"
                      >
                        {[
                          { value: 'nenhum', label: 'Nenhum' },
                          { value: '1-2', label: '1 a 2 plantões' },
                          { value: '3-4', label: '3 a 4 plantões' },
                          { value: '5+', label: '5 ou mais plantões' }
                        ].map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`plantoes_${option.value}`} />
                            <Label htmlFor={`plantoes_${option.value}`} className="font-normal cursor-pointer">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Tempo de formado:
                      </Label>
                      <RadioGroup
                        value={formData.tempo_formado}
                        onValueChange={(value) => setFormData({ ...formData, tempo_formado: value as any })}
                        className="space-y-2"
                      >
                        {[
                          { value: '<2_anos', label: 'Menos de 2 anos' },
                          { value: '2-5_anos', label: 'Entre 2 e 5 anos' },
                          { value: '5-10_anos', label: 'Entre 5 e 10 anos' },
                          { value: '+10_anos', label: 'Mais de 10 anos' }
                        ].map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`tempo_${option.value}`} />
                            <Label htmlFor={`tempo_${option.value}`} className="font-normal cursor-pointer">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {/* Realidade Financeira */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Renda mensal aproximada:
                      </Label>
                      <RadioGroup
                        value={formData.renda_mensal}
                        onValueChange={(value) => setFormData({ ...formData, renda_mensal: value as any })}
                        className="space-y-2"
                      >
                        {[
                          { value: 'ate_15k', label: 'Até R$ 15.000' },
                          { value: '15-30k', label: 'R$ 15.000 - R$ 30.000' },
                          { value: '30-60k', label: 'R$ 30.000 - R$ 60.000' },
                          { value: 'acima_60k', label: 'Acima de R$ 60.000' }
                        ].map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`renda_${option.value}`} />
                            <Label htmlFor={`renda_${option.value}`} className="font-normal cursor-pointer">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Sua renda depende das horas trabalhadas:
                      </Label>
                      <RadioGroup
                        value={formData.dependencia_horas}
                        onValueChange={(value) => setFormData({ ...formData, dependencia_horas: value as any })}
                        className="space-y-2"
                      >
                        {[
                          { value: 'quase_tudo', label: 'Quase tudo depende das horas' },
                          { value: 'mais_metade', label: 'Mais da metade depende' },
                          { value: 'menos_metade', label: 'Menos da metade depende' },
                          { value: 'pouco', label: 'Pouco ou nada depende' }
                        ].map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`dep_${option.value}`} />
                            <Label htmlFor={`dep_${option.value}`} className="font-normal cursor-pointer">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {/* Dor e Insatisfação */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="o_que_mais_incomoda" className="text-sm font-medium text-gray-700">
                        O que mais te incomoda na sua carreira médica hoje? *
                      </Label>
                      <Textarea
                        id="o_que_mais_incomoda"
                        value={formData.o_que_mais_incomoda || ''}
                        onChange={(e) => setFormData({ ...formData, o_que_mais_incomoda: e.target.value })}
                        onFocus={() => handleFieldFocus('o_que_mais_incomoda')}
                        placeholder="Descreva suas principais frustações, desafios ou insatisfações..."
                        rows={4}
                        className={errors.o_que_mais_incomoda ? 'border-red-500' : ''}
                      />
                      {errors.o_que_mais_incomoda && (
                        <p className="text-red-500 text-xs mt-1">{errors.o_que_mais_incomoda}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="visao_3_anos" className="text-sm font-medium text-gray-700">
                        Como você se vê daqui a 3 anos? *
                      </Label>
                      <Textarea
                        id="visao_3_anos"
                        value={formData.visao_3_anos || ''}
                        onChange={(e) => setFormData({ ...formData, visao_3_anos: e.target.value })}
                        onFocus={() => handleFieldFocus('visao_3_anos')}
                        placeholder="Descreva sua visão ideal para o futuro da sua carreira..."
                        rows={4}
                        className={errors.visao_3_anos ? 'border-red-500' : ''}
                      />
                      {errors.visao_3_anos && (
                        <p className="text-red-500 text-xs mt-1">{errors.visao_3_anos}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Momento e Ambição */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Já tentou abrir consultório antes?
                      </Label>
                      <RadioGroup
                        value={formData.ja_tentou_consultorio}
                        onValueChange={(value) => setFormData({ ...formData, ja_tentou_consultorio: value as any })}
                        className="space-y-2"
                      >
                        {[
                          { value: 'nao', label: 'Não, nunca tentei' },
                          { value: 'sozinho', label: 'Sim, tentei sozinho' },
                          { value: 'curso_mentoria', label: 'Sim, com curso/mentoria' },
                          { value: 'ja_tem_algo', label: 'Já tenho algo funcionando' }
                        ].map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`consultorio_${option.value}`} />
                            <Label htmlFor={`consultorio_${option.value}`} className="font-normal cursor-pointer">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Seu objetivo principal:
                      </Label>
                      <RadioGroup
                        value={formData.objetivo_principal}
                        onValueChange={(value) => setFormData({ ...formData, objetivo_principal: value as any })}
                        className="space-y-2"
                      >
                        {[
                          { value: 'ganhar_mais', label: 'Ganhar mais dinheiro' },
                          { value: 'trabalhar_menos', label: 'Trabalhar menos horas' },
                          { value: 'liberdade', label: 'Ter liberdade e autonomia' },
                          { value: 'confuso', label: 'Estou confuso sobre meus objetivos' }
                        ].map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`obj_${option.value}`} />
                            <Label htmlFor={`obj_${option.value}`} className="font-normal cursor-pointer">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {/* Capacidade de Investimento */}
                {currentStep === 6 && (
                  <div className="space-y-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Tem condições de investir em mentoria/consultoria?
                      </Label>
                      <RadioGroup
                        value={formData.condicoes_investir}
                        onValueChange={(value) => setFormData({ ...formData, condicoes_investir: value as any })}
                        className="space-y-2"
                      >
                        {[
                          { value: 'sim', label: 'Sim, tenho recursos disponíveis' },
                          { value: 'sim_planejamento', label: 'Sim, mas com planejamento' },
                          { value: 'nao', label: 'Não tenho condições no momento' }
                        ].map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`invest_${option.value}`} />
                            <Label htmlFor={`invest_${option.value}`} className="font-normal cursor-pointer">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Seu estilo de decisão:
                      </Label>
                      <RadioGroup
                        value={formData.estilo_decisao}
                        onValueChange={(value) => setFormData({ ...formData, estilo_decisao: value as any })}
                        className="space-y-2"
                      >
                        {[
                          { value: 'rapido', label: 'Decido rapidamente quando vejo valor' },
                          { value: 'analisa', label: 'Analiso bem antes de decidir' },
                          { value: 'trava', label: 'Costumo travar nas decisões' }
                        ].map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`decisao_${option.value}`} />
                            <Label htmlFor={`decisao_${option.value}`} className="font-normal cursor-pointer">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {/* Comprometimento */}
                {currentStep === 7 && (
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="por_que_agora" className="text-sm font-medium text-gray-700">
                        Por que agora é o momento certo para mudar sua situação? *
                      </Label>
                      <Textarea
                        id="por_que_agora"
                        value={formData.por_que_agora || ''}
                        onChange={(e) => setFormData({ ...formData, por_que_agora: e.target.value })}
                        onFocus={() => handleFieldFocus('por_que_agora')}
                        placeholder="O que te motivou a buscar uma solução agora? O que mudou?"
                        rows={4}
                        className={errors.por_que_agora ? 'border-red-500' : ''}
                      />
                      {errors.por_que_agora && (
                        <p className="text-red-500 text-xs mt-1">{errors.por_que_agora}</p>
                      )}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-blue-900 mb-1">
                            Você está quase terminando!
                          </h4>
                          <p className="text-blue-700 text-sm">
                            Sua qualificação será analisada e nossa equipe entrará em contato 
                            em breve com orientações personalizadas.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                    className="flex items-center space-x-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </Button>

                  {currentStep < formSteps.length ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      <span>Próximo</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{isSubmitting ? 'Enviando...' : 'Finalizar'}</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}