'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { dashboardService } from '@/lib/video-portal-service'
import {
  Users, BookOpen, Target, Trophy, MessageSquare, Brain,
  TrendingUp, BarChart3, PieChart, Activity, Calendar,
  Star, CheckCircle, Clock, AlertTriangle, Eye,
  ArrowRight, Filter, Download, RefreshCw
} from 'lucide-react'

interface DashboardStats {
  total_mentorados: number
  total_formularios: number
  total_metas: number
  total_conquistas: number
  total_anotacoes: number
  metas_concluidas: number
  formularios_esta_semana: number
  nps_medio: number
  engagement_rate: number
}

interface MentoradoResumo {
  id: string
  nome_completo: string
  email: string
  total_formularios: number
  total_metas: number
  metas_concluidas: number
  total_conquistas: number
  pontos_total: number
  ultima_atividade: string
  nivel: string
  nps_medio?: number
}

interface FormularioRecente {
  id: string
  mentorado_nome: string
  tipo: string
  nps_score?: number
  data_envio: string
  lesson_id?: string
}

export default function AdminPortalVideosPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [mentorados, setMentorados] = useState<MentoradoResumo[]>([])
  const [formulariosRecentes, setFormulariosRecentes] = useState<FormularioRecente[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    carregarDashboard()
  }, [])

  const carregarDashboard = async () => {
    setLoading(true)
    try {
      await Promise.all([
        carregarEstatisticas(),
        carregarMentorados(),
        carregarFormulariosRecentes()
      ])
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const carregarEstatisticas = async () => {
    try {
      // Buscar dados gerais do dashboard admin
      const dadosAdmin = await dashboardService.buscarDadosAdmin()

      // Calcular estatísticas
      const totalMentorados = new Set(dadosAdmin.map(d => d.mentorado_id)).size
      const totalFormularios = dadosAdmin.filter(d => d.formulario === 'pos_aula' || d.formulario === 'nps').length
      const totalMetas = dadosAdmin.filter(d => d.formulario === 'meta').length
      const totalConquistas = dadosAdmin.filter(d => d.formulario === 'conquista').length
      const totalAnotacoes = dadosAdmin.filter(d => d.formulario === 'anotacao').length

      const metasConcluidas = dadosAdmin.filter(d =>
        d.formulario === 'meta' && d.resposta_json?.status === 'concluido'
      ).length

      const umaSemanaaAtras = new Date()
      umaSemanaaAtras.setDate(umaSemanaaAtras.getDate() - 7)
      const formulariosEstaSemanaa = dadosAdmin.filter(d =>
        new Date(d.data_envio) >= umaSemanaaAtras
      ).length

      // Calcular NPS médio
      const npsResponses = dadosAdmin.filter(d =>
        d.resposta_json?.nps_score !== undefined
      )
      const npsMedio = npsResponses.length > 0
        ? npsResponses.reduce((acc, d) => acc + d.resposta_json.nps_score, 0) / npsResponses.length
        : 0

      setStats({
        total_mentorados: totalMentorados,
        total_formularios: totalFormularios,
        total_metas: totalMetas,
        total_conquistas: totalConquistas,
        total_anotacoes: totalAnotacoes,
        metas_concluidas: metasConcluidas,
        formularios_esta_semana: formulariosEstaSemanaa,
        nps_medio: npsMedio,
        engagement_rate: totalMentorados > 0 ? (formulariosEstaSemanaa / totalMentorados) * 100 : 0
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const carregarMentorados = async () => {
    try {
      const { data: mentoradosData, error } = await supabase
        .from('mentorados')
        .select('*')
        .order('nome_completo')

      if (error) throw error

      // Para cada mentorado, buscar suas estatísticas
      const mentoradosComStats = await Promise.all(
        mentoradosData.map(async (mentorado) => {
          try {
            const estatisticas = await dashboardService.buscarEstatisticasAluno(mentorado.id)

            const getNivel = (pontos: number) => {
              if (pontos >= 500) return 'Mestre'
              if (pontos >= 350) return 'Expert'
              if (pontos >= 200) return 'Conquistador'
              if (pontos >= 100) return 'Estudioso'
              if (pontos >= 50) return 'Explorador'
              return 'Iniciante'
            }

            return {
              id: mentorado.id,
              nome_completo: mentorado.nome_completo,
              email: mentorado.email,
              total_formularios: estatisticas.total_formularios,
              total_metas: estatisticas.total_metas,
              metas_concluidas: estatisticas.metas_concluidas,
              total_conquistas: estatisticas.total_conquistas,
              pontos_total: estatisticas.pontos_total,
              ultima_atividade: new Date().toISOString(), // Poderia ser calculado baseado na última atividade real
              nivel: getNivel(estatisticas.pontos_total)
            }
          } catch (error) {
            return {
              id: mentorado.id,
              nome_completo: mentorado.nome_completo,
              email: mentorado.email,
              total_formularios: 0,
              total_metas: 0,
              metas_concluidas: 0,
              total_conquistas: 0,
              pontos_total: 0,
              ultima_atividade: mentorado.created_at,
              nivel: 'Iniciante'
            }
          }
        })
      )

      setMentorados(mentoradosComStats)
    } catch (error) {
      console.error('Erro ao carregar mentorados:', error)
    }
  }

  const carregarFormulariosRecentes = async () => {
    try {
      const dadosAdmin = await dashboardService.buscarDadosAdmin()

      const formulariosFormatados = dadosAdmin
        .filter(d => d.formulario === 'pos_aula' || d.formulario === 'nps')
        .slice(0, 10)
        .map(formulario => ({
          id: formulario.id,
          mentorado_nome: formulario.mentorados?.nome_completo || 'Desconhecido',
          tipo: formulario.formulario,
          nps_score: formulario.resposta_json?.nps_score,
          data_envio: formulario.data_envio,
          lesson_id: formulario.resposta_json?.lesson_id
        }))

      setFormulariosRecentes(formulariosFormatados)
    } catch (error) {
      console.error('Erro ao carregar formulários recentes:', error)
    }
  }

  if (loading) {
    return (
      <PageLayout title="Admin - Portal de Vídeos" subtitle="Dashboard administrativo completo">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Admin - Portal de Vídeos"
      subtitle="Dashboard administrativo para gestão completa do portal de vídeos, metas e conquistas"
    >
      <div className="space-y-8">
        {/* Botões de Ação Rápida */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 border-blue-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-blue-900">Ações Rápidas</h2>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => window.open('/portal-onboarding', '_blank')}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Onboarding
                </Button>
                <Button
                  onClick={() => window.open('/portal-metas', '_blank')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Gerenciar Metas
                </Button>
                <Button
                  onClick={() => window.open('/portal-conquistas', '_blank')}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Ver Conquistas
                </Button>
                <Button
                  onClick={carregarDashboard}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas Principais */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Mentorados</p>
                    <p className="text-3xl font-bold text-blue-900">{stats.total_mentorados}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  +{stats.formularios_esta_semana} interações esta semana
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Metas Concluídas</p>
                    <p className="text-3xl font-bold text-green-900">{stats.metas_concluidas}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-xs text-green-600 mt-2">
                  {stats.total_metas} metas totais criadas
                </p>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">NPS Médio</p>
                    <p className="text-3xl font-bold text-yellow-900">{stats.nps_medio.toFixed(1)}</p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-600" />
                </div>
                <p className="text-xs text-yellow-600 mt-2">
                  {stats.total_formularios} avaliações recebidas
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Taxa de Engajamento</p>
                    <p className="text-3xl font-bold text-purple-900">{stats.engagement_rate.toFixed(0)}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <p className="text-xs text-purple-600 mt-2">
                  Atividade semanal por mentorado
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Abas do Dashboard */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-1/2">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="mentorados">Mentorados</TabsTrigger>
            <TabsTrigger value="atividades">Atividades</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Atividade por Categoria */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Atividades por Categoria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Formulários</span>
                          <span className="text-sm text-gray-500">{stats.total_formularios}</span>
                        </div>
                        <Progress value={stats.total_formularios * 2} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Metas</span>
                          <span className="text-sm text-gray-500">{stats.total_metas}</span>
                        </div>
                        <Progress value={stats.total_metas * 5} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Anotações</span>
                          <span className="text-sm text-gray-500">{stats.total_anotacoes}</span>
                        </div>
                        <Progress value={Math.min(stats.total_anotacoes * 3, 100)} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Conquistas</span>
                          <span className="text-sm text-gray-500">{stats.total_conquistas}</span>
                        </div>
                        <Progress value={stats.total_conquistas * 4} className="h-2" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Formulários Recentes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Formulários Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {formulariosRecentes.slice(0, 5).map((formulario) => (
                      <div key={formulario.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{formulario.mentorado_nome}</p>
                          <p className="text-xs text-gray-500">
                            {formulario.tipo} • {new Date(formulario.data_envio).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        {formulario.nps_score && (
                          <Badge variant={formulario.nps_score >= 9 ? 'default' : formulario.nps_score >= 7 ? 'secondary' : 'destructive'}>
                            NPS: {formulario.nps_score}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="mentorados" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Mentorados e Suas Estatísticas
                  </div>
                  <Badge variant="outline">
                    {mentorados.length} mentorados ativos
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mentorados.map((mentorado) => (
                    <Card key={mentorado.id} className="border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-sm">{mentorado.nome_completo}</h4>
                              <p className="text-xs text-gray-500">{mentorado.email}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {mentorado.nivel}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3 text-green-600" />
                              <span>{mentorado.metas_concluidas}/{mentorado.total_metas}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Trophy className="h-3 w-3 text-yellow-600" />
                              <span>{mentorado.total_conquistas}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3 text-blue-600" />
                              <span>{mentorado.total_formularios}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-purple-600" />
                              <span>{mentorado.pontos_total}pts</span>
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Aqui você pode implementar a visualização detalhada do mentorado
                                window.open(`/portal-conquistas?mentorado=${mentorado.id}`, '_blank')
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Ver Detalhes
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="atividades" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Atividades Recentes no Portal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {formulariosRecentes.map((formulario) => (
                    <div key={formulario.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        {formulario.tipo === 'nps' ?
                          <Star className="h-4 w-4 text-blue-600" /> :
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                        }
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{formulario.mentorado_nome}</p>
                        <p className="text-xs text-gray-500">
                          {formulario.tipo === 'nps' ? 'Avaliou uma aula' : 'Respondeu formulário pós-aula'}
                        </p>
                      </div>
                      <div className="text-right">
                        {formulario.nps_score && (
                          <Badge variant="outline" className="mb-1">
                            NPS: {formulario.nps_score}
                          </Badge>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(formulario.data_envio).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relatorios" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Relatórios e Exportações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Relatórios Disponíveis</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Dados de Mentorados
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Relatório de Metas
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Análise de NPS
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Relatório de Conquistas
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Resumo Executivo</h4>
                    {stats && (
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span>Taxa de Conclusão de Metas:</span>
                          <span className="font-medium">
                            {stats.total_metas > 0 ? ((stats.metas_concluidas / stats.total_metas) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Engajamento Semanal:</span>
                          <span className="font-medium">{stats.engagement_rate.toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Satisfação (NPS):</span>
                          <span className="font-medium">{stats.nps_medio.toFixed(1)}/10</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Atividade Total:</span>
                          <span className="font-medium">
                            {stats.total_formularios + stats.total_anotacoes + stats.total_metas} ações
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  )
}