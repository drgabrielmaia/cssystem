'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { onboardingService, metasService } from '@/lib/video-portal-service'
import {
  Brain, Target, ArrowLeft, ArrowRight, CheckCircle, Sparkles,
  Calendar, Star, Heart, Trophy, BookOpen, Zap
} from 'lucide-react'
import Link from 'next/link'

interface OnboardingStep {
  id: number
  title: string
  description: string
  icon: React.ReactNode
  completed: boolean
}

export default function MentoradoOnboardingPage() {
  const [mentorado, setMentorado] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [onboardingData, setOnboardingData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Dados do formulário
  const [dadosFormulario, setDadosFormulario] = useState({
    especialidade: '',
    tempo_formado: '',
    maior_desafio: '',
    objetivo_principal: '',
    expectativa: '',
    disponibilidade: ''
  })

  // Metas iniciais
  const [metasPadrao, setMetasPadrao] = useState([
    {
      categoria: 'financeira',
      titulo: 'Aumentar renda mensal',
      descricao: 'Definir estratégias para aumentar minha renda',
      prazo: 'medio',
      selecionada: false
    },
    {
      categoria: 'profissional',
      titulo: 'Melhorar gestão do consultório',
      descricao: 'Organizar processos e melhorar atendimento',
      prazo: 'curto',
      selecionada: false
    },
    {
      categoria: 'pessoal',
      titulo: 'Equilibrar vida pessoal e profissional',
      descricao: 'Conseguir mais tempo para família e hobbies',
      prazo: 'longo',
      selecionada: false
    },
    {
      categoria: 'aprendizado',
      titulo: 'Completar curso de mentoria',
      descricao: 'Finalizar todos os módulos do programa',
      prazo: 'medio',
      selecionada: false
    }
  ])

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 1,
      title: 'Bem-vindo!',
      description: 'Vamos conhecer você melhor',
      icon: <Sparkles className="h-5 w-5" />,
      completed: currentStep > 1
    },
    {
      id: 2,
      title: 'Seus Dados',
      description: 'Informações profissionais',
      icon: <Heart className="h-5 w-5" />,
      completed: currentStep > 2
    },
    {
      id: 3,
      title: 'Suas Metas',
      description: 'Objetivos e expectativas',
      icon: <Target className="h-5 w-5" />,
      completed: currentStep > 3
    },
    {
      id: 4,
      title: 'Finalização',
      description: 'Tudo pronto para começar!',
      icon: <Trophy className="h-5 w-5" />,
      completed: currentStep > 4
    }
  ]

  useEffect(() => {
    const mentoradoData = localStorage.getItem('mentorado')
    if (mentoradoData) {
      const parsed = JSON.parse(mentoradoData)
      setMentorado(parsed)
      carregarOnboarding(parsed.id)
    } else {
      window.location.href = '/mentorado'
    }
  }, [])

  const carregarOnboarding = async (mentoradoId: string) => {
    try {
      const onboardingExistente = await onboardingService.buscarOnboarding(mentoradoId)
      if (onboardingExistente) {
        setOnboardingData(onboardingExistente.resposta_json)
        setCurrentStep(onboardingExistente.resposta_json.step_atual || 1)
        if (onboardingExistente.resposta_json.dados_coletados) {
          setDadosFormulario(prev => ({
            ...prev,
            ...onboardingExistente.resposta_json.dados_coletados
          }))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar onboarding:', error)
    } finally {
      setLoading(false)
    }
  }

  const salvarProgresso = async (proximoStep?: number) => {
    if (!mentorado) return

    setSaving(true)
    try {
      const stepAtual = proximoStep || currentStep
      const dadosParaSalvar = {
        ...dadosFormulario,
        metas_selecionadas: metasPadrao.filter(m => m.selecionada),
        step_completado_em: new Date().toISOString()
      }

      if (onboardingData) {
        await onboardingService.atualizarProgresso(onboardingData.id, stepAtual, dadosParaSalvar)
      } else {
        const novoOnboarding = await onboardingService.iniciarOnboarding(mentorado.id, dadosParaSalvar)
        setOnboardingData(novoOnboarding.resposta_json)
      }

      if (proximoStep) {
        setCurrentStep(proximoStep)
      }
    } catch (error) {
      console.error('Erro ao salvar progresso:', error)
    } finally {
      setSaving(false)
    }
  }

  const finalizarOnboarding = async () => {
    setSaving(true)
    try {
      // Salvar progresso final
      await salvarProgresso(5)

      // Criar metas selecionadas
      const metasSelecionadas = metasPadrao.filter(m => m.selecionada)
      for (const meta of metasSelecionadas) {
        await metasService.criarMeta({
          mentorado_id: mentorado.id,
          titulo: meta.titulo,
          descricao: meta.descricao,
          prazo: meta.prazo as any,
          status: 'ativo',
          criado_por: 'aluno',
          data_meta: new Date().toISOString()
        })
      }

      // Redirecionar para dashboard
      window.location.href = '/mentorado'
    } catch (error) {
      console.error('Erro ao finalizar onboarding:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleMeta = (index: number) => {
    const novasMetas = [...metasPadrao]
    novasMetas[index].selecionada = !novasMetas[index].selecionada
    setMetasPadrao(novasMetas)
  }

  const progress = (currentStep / onboardingSteps.length) * 100

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#D4AF37] to-[#FFD700] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D4AF37] to-[#FFD700] p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/mentorado" className="p-3 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-800" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Onboarding Personalizado</h1>
              <p className="text-slate-700">Configure sua jornada de aprendizado</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-slate-800 border-slate-800/20">
            {mentorado?.nome_completo?.split(' ')[0]}
          </Badge>
        </div>

        {/* Progress Bar */}
        <Card className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-xl">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">
                  Etapa {currentStep} de {onboardingSteps.length}
                </span>
                <span className="text-sm text-slate-600">{progress.toFixed(0)}% completo</span>
              </div>
              <Progress value={progress} className="h-3 bg-slate-200" />

              {/* Steps Visualization */}
              <div className="grid grid-cols-4 gap-4 mt-8">
                {onboardingSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`relative p-4 rounded-2xl border-2 transition-all ${
                      step.completed
                        ? 'border-[#B8860B] bg-gradient-to-br from-[#D4AF37] to-[#FFD700] text-slate-800'
                        : currentStep === step.id
                        ? 'border-slate-400 bg-white text-slate-800 shadow-lg'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          step.completed
                            ? 'bg-white text-[#B8860B]'
                            : currentStep === step.id
                            ? 'bg-[#D4AF37] text-white'
                            : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        {step.completed ? <CheckCircle className="h-4 w-4" /> : step.icon}
                      </div>
                      <span className="text-sm font-semibold">{step.id}</span>
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{step.title}</h4>
                    <p className="text-xs opacity-80">{step.description}</p>

                    {index < onboardingSteps.length - 1 && (
                      <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo da Etapa */}
        <Card className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-xl">
          <CardContent className="p-8">
            {currentStep === 1 && (
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-gradient-to-br from-[#D4AF37] to-[#FFD700] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Brain className="h-12 w-12 text-slate-800" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-4">
                  Bem-vindo ao seu Portal Personalizado!
                </h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  Estamos muito felizes em tê-lo conosco, <strong>{mentorado?.nome_completo}</strong>!
                  Este onboarding foi criado especialmente para personalizar sua experiência de aprendizado.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="flex flex-col items-center p-6 bg-slate-50 rounded-2xl">
                    <Target className="h-10 w-10 text-[#B8860B] mb-4" />
                    <h3 className="font-semibold text-slate-800 mb-2">Metas Personalizadas</h3>
                    <p className="text-sm text-slate-600 text-center">Defina objetivos específicos para sua carreira</p>
                  </div>
                  <div className="flex flex-col items-center p-6 bg-slate-50 rounded-2xl">
                    <BookOpen className="h-10 w-10 text-[#B8860B] mb-4" />
                    <h3 className="font-semibold text-slate-800 mb-2">Conteúdo Direcionado</h3>
                    <p className="text-sm text-slate-600 text-center">Receba materiais relevantes para seu perfil</p>
                  </div>
                  <div className="flex flex-col items-center p-6 bg-slate-50 rounded-2xl">
                    <Trophy className="h-10 w-10 text-[#B8860B] mb-4" />
                    <h3 className="font-semibold text-slate-800 mb-2">Sistema de Conquistas</h3>
                    <p className="text-sm text-slate-600 text-center">Ganhe pontos e desbloqueie recompensas</p>
                  </div>
                </div>
                <Button
                  onClick={() => setCurrentStep(2)}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-slate-800 hover:from-[#B8860B] hover:to-[#DAA520] px-8 py-3 text-lg font-semibold rounded-xl"
                >
                  Vamos começar! <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Conte-nos sobre você</h2>
                  <p className="text-slate-600">Essas informações nos ajudam a personalizar sua experiência</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-slate-700 font-medium">Especialidade Médica</Label>
                    <Select
                      value={dadosFormulario.especialidade}
                      onValueChange={(value) => setDadosFormulario(prev => ({ ...prev, especialidade: value }))}
                    >
                      <SelectTrigger className="border-slate-300">
                        <SelectValue placeholder="Selecione sua especialidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clinico-geral">Clínico Geral</SelectItem>
                        <SelectItem value="cardiologia">Cardiologia</SelectItem>
                        <SelectItem value="dermatologia">Dermatologia</SelectItem>
                        <SelectItem value="ginecologia">Ginecologia</SelectItem>
                        <SelectItem value="pediatria">Pediatria</SelectItem>
                        <SelectItem value="ortopedia">Ortopedia</SelectItem>
                        <SelectItem value="psiquiatria">Psiquiatria</SelectItem>
                        <SelectItem value="outra">Outra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-700 font-medium">Tempo de formado</Label>
                    <Select
                      value={dadosFormulario.tempo_formado}
                      onValueChange={(value) => setDadosFormulario(prev => ({ ...prev, tempo_formado: value }))}
                    >
                      <SelectTrigger className="border-slate-300">
                        <SelectValue placeholder="Há quanto tempo se formou?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="menos-2-anos">Menos de 2 anos</SelectItem>
                        <SelectItem value="2-5-anos">2 a 5 anos</SelectItem>
                        <SelectItem value="5-10-anos">5 a 10 anos</SelectItem>
                        <SelectItem value="mais-10-anos">Mais de 10 anos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-slate-700 font-medium">Qual seu maior desafio no consultório?</Label>
                  <Textarea
                    value={dadosFormulario.maior_desafio}
                    onChange={(e) => setDadosFormulario(prev => ({ ...prev, maior_desafio: e.target.value }))}
                    placeholder="Ex: captação de pacientes, organização financeira, vendas..."
                    rows={3}
                    className="border-slate-300"
                  />
                </div>

                <div>
                  <Label className="text-slate-700 font-medium">Principal objetivo com a mentoria</Label>
                  <Select
                    value={dadosFormulario.objetivo_principal}
                    onValueChange={(value) => setDadosFormulario(prev => ({ ...prev, objetivo_principal: value }))}
                  >
                    <SelectTrigger className="border-slate-300">
                      <SelectValue placeholder="O que mais espera alcançar?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aumentar-faturamento">Aumentar faturamento</SelectItem>
                      <SelectItem value="organizar-processos">Organizar processos</SelectItem>
                      <SelectItem value="marketing-digital">Marketing digital</SelectItem>
                      <SelectItem value="gestao-financeira">Gestão financeira</SelectItem>
                      <SelectItem value="desenvolvimento-pessoal">Desenvolvimento pessoal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="border-slate-300 text-slate-600"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Anterior
                  </Button>
                  <Button
                    onClick={() => salvarProgresso(3)}
                    disabled={!dadosFormulario.especialidade || saving}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-slate-800 hover:from-[#B8860B] hover:to-[#DAA520]"
                  >
                    {saving ? 'Salvando...' : 'Próximo'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Suas Metas Iniciais</h2>
                  <p className="text-slate-600">Selecione as metas que mais fazem sentido para você agora</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {metasPadrao.map((meta, index) => {
                    const categoriaIcon = {
                      financeira: <Trophy className="h-5 w-5" />,
                      profissional: <Zap className="h-5 w-5" />,
                      pessoal: <Heart className="h-5 w-5" />,
                      aprendizado: <BookOpen className="h-5 w-5" />
                    }[meta.categoria]

                    const categoriaColor = {
                      financeira: 'from-yellow-100 to-yellow-200 border-yellow-300',
                      profissional: 'from-blue-100 to-blue-200 border-blue-300',
                      pessoal: 'from-pink-100 to-pink-200 border-pink-300',
                      aprendizado: 'from-purple-100 to-purple-200 border-purple-300'
                    }[meta.categoria]

                    return (
                      <div
                        key={index}
                        onClick={() => toggleMeta(index)}
                        className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                          meta.selecionada
                            ? 'border-[#B8860B] bg-gradient-to-br from-[#D4AF37] to-[#FFD700] shadow-lg'
                            : `bg-gradient-to-br ${categoriaColor} hover:shadow-md`
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            meta.selecionada ? 'bg-white text-[#B8860B]' : 'bg-white/50'
                          }`}>
                            {meta.selecionada ? <CheckCircle className="h-5 w-5" /> : categoriaIcon}
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-semibold mb-2 ${meta.selecionada ? 'text-slate-800' : 'text-slate-700'}`}>
                              {meta.titulo}
                            </h3>
                            <p className={`text-sm ${meta.selecionada ? 'text-slate-700' : 'text-slate-600'}`}>
                              {meta.descricao}
                            </p>
                            <Badge className={`mt-2 ${meta.selecionada ? 'bg-white/20 text-slate-800' : 'bg-white/30'}`}>
                              {meta.prazo === 'curto' ? 'Curto prazo' :
                               meta.prazo === 'medio' ? 'Médio prazo' : 'Longo prazo'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl">
                  <p className="text-sm text-slate-600 mb-2">
                    <strong>Dica:</strong> Você pode selecionar quantas metas quiser e modificá-las depois no seu painel.
                  </p>
                  <p className="text-xs text-slate-500">
                    Metas selecionadas: {metasPadrao.filter(m => m.selecionada).length}
                  </p>
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="border-slate-300 text-slate-600"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Anterior
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(4)}
                    disabled={metasPadrao.filter(m => m.selecionada).length === 0}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-slate-800 hover:from-[#B8860B] hover:to-[#DAA520]"
                  >
                    Finalizar
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-gradient-to-br from-[#D4AF37] to-[#FFD700] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="h-12 w-12 text-slate-800" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-4">
                  Parabéns! Seu onboarding está completo! 🎉
                </h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  Agora você tem acesso completo ao portal personalizado com suas metas definidas e
                  conteúdo direcionado para seu perfil.
                </p>

                <div className="bg-slate-50 p-6 rounded-2xl text-left max-w-md mx-auto">
                  <h3 className="font-semibold text-slate-800 mb-4">Resumo das suas configurações:</h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li>• Especialidade: {dadosFormulario.especialidade || 'Não informado'}</li>
                    <li>• Tempo de formado: {dadosFormulario.tempo_formado || 'Não informado'}</li>
                    <li>• Metas selecionadas: {metasPadrao.filter(m => m.selecionada).length}</li>
                    <li>• Objetivo principal: {dadosFormulario.objetivo_principal || 'Não informado'}</li>
                  </ul>
                </div>

                <Button
                  onClick={finalizarOnboarding}
                  disabled={saving}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-slate-800 hover:from-[#B8860B] hover:to-[#DAA520] px-8 py-3 text-lg font-semibold rounded-xl"
                >
                  {saving ? 'Finalizando...' : 'Ir para meu Portal'}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}