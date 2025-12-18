'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { supabase, type Mentorado } from '@/lib/supabase'
import { onboardingService, metasService } from '@/lib/video-portal-service'
import {
  Brain, User, Target, CheckCircle, Calendar, BookOpen, Heart,
  Trophy, Sparkles, ArrowRight, Star, Clock, Zap, Award
} from 'lucide-react'

interface OnboardingStep {
  id: number
  title: string
  description: string
  icon: React.ReactNode
  completed: boolean
}

interface MetaDetalhada {
  id: string
  titulo: string
  descricao: string
  prazo: 'curto' | 'medio' | 'longo' | 'grande'
  categoria: string
  prioridade: 'alta' | 'media' | 'baixa'
  status: 'ativo' | 'concluido' | 'pausado'
}

export default function PortalOnboardingPage() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [selectedMentorado, setSelectedMentorado] = useState<Mentorado | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [onboardingData, setOnboardingData] = useState<any>(null)
  const [metas, setMetas] = useState<MetaDetalhada[]>([])
  const [novaMeta, setNovaMeta] = useState<Partial<MetaDetalhada>>({
    titulo: '',
    descricao: '',
    prazo: 'medio',
    categoria: '',
    prioridade: 'media'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 1,
      title: 'Bem-vindo ao Portal',
      description: 'Conhecendo sua jornada de crescimento',
      icon: <Sparkles className="h-5 w-5" />,
      completed: currentStep > 1
    },
    {
      id: 2,
      title: 'Suas Metas',
      description: 'Definindo objetivos claros',
      icon: <Target className="h-5 w-5" />,
      completed: currentStep > 2
    },
    {
      id: 3,
      title: 'Plano de Ação',
      description: 'Estratégia para alcançar seus objetivos',
      icon: <Calendar className="h-5 w-5" />,
      completed: currentStep > 3
    },
    {
      id: 4,
      title: 'Recursos de Aprendizado',
      description: 'Conteúdos personalizados para você',
      icon: <BookOpen className="h-5 w-5" />,
      completed: currentStep > 4
    },
    {
      id: 5,
      title: 'Acompanhamento',
      description: 'Sistema de progresso e conquistas',
      icon: <Trophy className="h-5 w-5" />,
      completed: currentStep > 5
    }
  ]

  const categoriasMeta = [
    { value: 'financeira', label: 'Financeira', icon: <Trophy className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'profissional', label: 'Profissional', icon: <Zap className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
    { value: 'pessoal', label: 'Pessoal', icon: <Heart className="h-4 w-4" />, color: 'bg-pink-100 text-pink-800' },
    { value: 'saude', label: 'Saúde', icon: <Award className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
    { value: 'relacionamento', label: 'Relacionamentos', icon: <User className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' },
    { value: 'aprendizado', label: 'Aprendizado', icon: <BookOpen className="h-4 w-4" />, color: 'bg-orange-100 text-orange-800' }
  ]

  const prazosMeta = [
    { value: 'curto', label: 'Curto Prazo (1-3 meses)', color: 'bg-red-100 text-red-800' },
    { value: 'medio', label: 'Médio Prazo (3-6 meses)', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'longo', label: 'Longo Prazo (6-12 meses)', color: 'bg-blue-100 text-blue-800' },
    { value: 'grande', label: 'Grande Meta (1+ anos)', color: 'bg-purple-100 text-purple-800' }
  ]

  useEffect(() => {
    fetchMentorados()
  }, [])

  const fetchMentorados = async () => {
    try {
      const { data, error } = await supabase
        .from('mentorados')
        .select('*')
        .order('nome_completo', { ascending: true })

      if (error) throw error
      setMentorados(data || [])
    } catch (error) {
      console.error('Erro ao buscar mentorados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMentoradoSelect = async (mentoradoId: string) => {
    const mentorado = mentorados.find(m => m.id === mentoradoId)
    setSelectedMentorado(mentorado || null)

    if (mentorado) {
      // Buscar onboarding existente
      const onboardingExistente = await onboardingService.buscarOnboarding(mentoradoId)
      if (onboardingExistente) {
        setOnboardingData(onboardingExistente.resposta_json)
        setCurrentStep(onboardingExistente.resposta_json.step_atual || 1)
      } else {
        // Iniciar novo onboarding
        const novoOnboarding = await onboardingService.iniciarOnboarding(mentoradoId, {
          nome: mentorado.nome_completo,
          email: mentorado.email
        })
        setOnboardingData(novoOnboarding.resposta_json)
      }

      // Buscar metas existentes
      const metasExistentes = await metasService.buscarMetas(mentoradoId)
      const metasFormatadas = metasExistentes.map(meta => ({
        id: meta.id,
        titulo: meta.resposta_json.titulo,
        descricao: meta.resposta_json.descricao,
        prazo: meta.resposta_json.prazo,
        categoria: meta.resposta_json.categoria || 'pessoal',
        prioridade: meta.resposta_json.prioridade || 'media',
        status: meta.resposta_json.status
      }))
      setMetas(metasFormatadas)
    }
  }

  const adicionarMeta = async () => {
    if (!selectedMentorado || !novaMeta.titulo) return

    setSaving(true)
    try {
      await metasService.criarMeta({
        mentorado_id: selectedMentorado.id,
        titulo: novaMeta.titulo!,
        descricao: novaMeta.descricao || '',
        prazo: novaMeta.prazo!,
        status: 'ativo',
        criado_por: 'admin',
        data_meta: new Date().toISOString()
      })

      // Recarregar metas
      await handleMentoradoSelect(selectedMentorado.id)

      // Limpar formulário
      setNovaMeta({
        titulo: '',
        descricao: '',
        prazo: 'medio',
        categoria: '',
        prioridade: 'media'
      })
    } catch (error) {
      console.error('Erro ao criar meta:', error)
    } finally {
      setSaving(false)
    }
  }

  const avancarStep = async () => {
    if (!selectedMentorado || !onboardingData) return

    const proximoStep = currentStep + 1
    setCurrentStep(proximoStep)

    // Atualizar onboarding no banco
    await onboardingService.atualizarProgresso(
      onboardingData.id,
      proximoStep,
      { step_completado: currentStep }
    )
  }

  const progress = (currentStep / onboardingSteps.length) * 100

  if (loading) {
    return (
      <PageLayout title="Portal de Onboarding" subtitle="Sistema avançado de integração e metas">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Portal de Onboarding"
      subtitle="Sistema avançado de integração, metas e acompanhamento personalizado"
    >
      <div className="space-y-8">
        {/* Seleção de Mentorado */}
        <Card className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-blue-900">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              Selecionar Mentorado para Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handleMentoradoSelect}>
              <SelectTrigger className="w-full bg-white border-blue-300 shadow-sm">
                <SelectValue placeholder="Escolha um mentorado para iniciar o onboarding..." />
              </SelectTrigger>
              <SelectContent>
                {mentorados.map((mentorado) => (
                  <SelectItem key={mentorado.id} value={mentorado.id}>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                        <User className="h-3 w-3 text-white" />
                      </div>
                      <span className="font-medium">{mentorado.nome_completo}</span>
                      <Badge variant="outline" className="text-xs">
                        {mentorado.estado_atual}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedMentorado && (
          <>
            {/* Progress Bar do Onboarding */}
            <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-green-900">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  Progresso do Onboarding - {selectedMentorado.nome_completo}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-green-700">
                        Etapa {currentStep} de {onboardingSteps.length}
                      </span>
                      <span className="text-sm text-green-600">{progress.toFixed(0)}% completo</span>
                    </div>
                    <Progress value={progress} className="h-3 bg-green-100" />
                  </div>

                  {/* Steps do Onboarding */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {onboardingSteps.map((step, index) => (
                      <div
                        key={step.id}
                        className={`relative p-4 rounded-xl border-2 transition-all ${
                          step.completed
                            ? 'border-green-300 bg-green-50'
                            : currentStep === step.id
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              step.completed
                                ? 'bg-green-600 text-white'
                                : currentStep === step.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-400 text-white'
                            }`}
                          >
                            {step.completed ? <CheckCircle className="h-4 w-4" /> : step.icon}
                          </div>
                          <span className="text-sm font-semibold">{step.id}</span>
                        </div>
                        <h4 className="font-semibold text-sm mb-1">{step.title}</h4>
                        <p className="text-xs text-gray-600">{step.description}</p>

                        {index < onboardingSteps.length - 1 && (
                          <ArrowRight className="hidden md:block absolute -right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conteúdo da Etapa Atual */}
            {currentStep === 1 && (
              <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-purple-900">
                    <Sparkles className="h-6 w-6 text-purple-600" />
                    Bem-vindo ao Portal, {selectedMentorado.nome_completo}!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-purple-700 text-lg">
                      Estamos muito felizes em tê-lo(a) conosco! Este portal foi criado especialmente
                      para acompanhar sua jornada de crescimento pessoal e profissional.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-start gap-3 p-4 bg-white rounded-lg">
                        <Target className="h-6 w-6 text-purple-600 mt-1" />
                        <div>
                          <h4 className="font-semibold text-purple-900">Metas Personalizadas</h4>
                          <p className="text-sm text-purple-700">Defina e acompanhe seus objetivos</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 bg-white rounded-lg">
                        <BookOpen className="h-6 w-6 text-purple-600 mt-1" />
                        <div>
                          <h4 className="font-semibold text-purple-900">Conteúdo Exclusivo</h4>
                          <p className="text-sm text-purple-700">Acesse vídeos e materiais especiais</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 bg-white rounded-lg">
                        <Trophy className="h-6 w-6 text-purple-600 mt-1" />
                        <div>
                          <h4 className="font-semibold text-purple-900">Sistema de Conquistas</h4>
                          <p className="text-sm text-purple-700">Ganhe pontos e desbloqueie prêmios</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={avancarStep} className="bg-purple-600 hover:bg-purple-700">
                        Continuar <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 2 && (
              <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-orange-900">
                    <Target className="h-6 w-6 text-orange-600" />
                    Suas Metas e Objetivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Metas Existentes */}
                    {metas.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-orange-900 mb-4">Metas Definidas:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {metas.map((meta) => {
                            const categoria = categoriasMeta.find(c => c.value === meta.categoria)
                            const prazo = prazosMeta.find(p => p.value === meta.prazo)

                            return (
                              <div key={meta.id} className="p-4 bg-white rounded-lg border border-orange-200">
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-semibold text-orange-900">{meta.titulo}</h5>
                                  <Badge className={prazo?.color}>{prazo?.label.split(' ')[0]}</Badge>
                                </div>
                                <p className="text-sm text-orange-700 mb-3">{meta.descricao}</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={categoria?.color}>
                                    {categoria?.icon} {categoria?.label}
                                  </Badge>
                                  <Badge variant={meta.status === 'ativo' ? 'default' : 'secondary'}>
                                    {meta.status}
                                  </Badge>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Adicionar Nova Meta */}
                    <div className="border-2 border-dashed border-orange-300 rounded-lg p-6">
                      <h4 className="font-semibold text-orange-900 mb-4">Adicionar Nova Meta:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="titulo">Título da Meta</Label>
                          <Input
                            id="titulo"
                            value={novaMeta.titulo}
                            onChange={(e) => setNovaMeta(prev => ({ ...prev, titulo: e.target.value }))}
                            placeholder="Ex: Aumentar renda em 30%"
                            className="border-orange-300"
                          />
                        </div>
                        <div>
                          <Label htmlFor="categoria">Categoria</Label>
                          <Select
                            value={novaMeta.categoria}
                            onValueChange={(value) => setNovaMeta(prev => ({ ...prev, categoria: value }))}
                          >
                            <SelectTrigger className="border-orange-300">
                              <SelectValue placeholder="Selecione a categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {categoriasMeta.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  <div className="flex items-center gap-2">
                                    {cat.icon} {cat.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="descricao">Descrição</Label>
                          <Textarea
                            id="descricao"
                            value={novaMeta.descricao}
                            onChange={(e) => setNovaMeta(prev => ({ ...prev, descricao: e.target.value }))}
                            placeholder="Descreva sua meta em detalhes..."
                            rows={3}
                            className="border-orange-300"
                          />
                        </div>
                        <div>
                          <Label htmlFor="prazo">Prazo</Label>
                          <Select
                            value={novaMeta.prazo}
                            onValueChange={(value: any) => setNovaMeta(prev => ({ ...prev, prazo: value }))}
                          >
                            <SelectTrigger className="border-orange-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {prazosMeta.map((prazo) => (
                                <SelectItem key={prazo.value} value={prazo.value}>
                                  {prazo.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="prioridade">Prioridade</Label>
                          <Select
                            value={novaMeta.prioridade}
                            onValueChange={(value: any) => setNovaMeta(prev => ({ ...prev, prioridade: value }))}
                          >
                            <SelectTrigger className="border-orange-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="alta">Alta Prioridade</SelectItem>
                              <SelectItem value="media">Média Prioridade</SelectItem>
                              <SelectItem value="baixa">Baixa Prioridade</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-6">
                        <p className="text-sm text-orange-600">
                          {metas.length} meta(s) já definida(s)
                        </p>
                        <Button
                          onClick={adicionarMeta}
                          disabled={!novaMeta.titulo || saving}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          {saving ? 'Salvando...' : 'Adicionar Meta'}
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={avancarStep} className="bg-orange-600 hover:bg-orange-700">
                        Continuar para Plano de Ação <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mais etapas podem ser adicionadas aqui */}
            {currentStep > 2 && (
              <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-blue-900">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                    Onboarding em Andamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Trophy className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-blue-900 mb-2">
                      Ótimo progresso, {selectedMentorado.nome_completo}!
                    </h3>
                    <p className="text-blue-700 mb-6">
                      Você está na etapa {currentStep} de {onboardingSteps.length}. Continue assim!
                    </p>
                    <Button
                      onClick={() => window.open(`/mentorado/videos`, '_blank')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Acessar Portal de Vídeos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PageLayout>
  )
}