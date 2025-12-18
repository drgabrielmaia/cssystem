'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { supabase, type Mentorado } from '@/lib/supabase'
import { conquistasService, dashboardService } from '@/lib/video-portal-service'
import {
  Trophy, Star, Award, Medal, Crown, Zap, Target, BookOpen,
  Calendar, CheckCircle, TrendingUp, Users, Gift, Sparkles,
  Timer, Clock, Heart, Brain, Flame
} from 'lucide-react'

interface Conquista {
  id: string
  tipo: string
  titulo: string
  descricao: string
  pontos: number
  conquistada_em: string
}

interface EstatisticasAluno {
  total_formularios: number
  total_metas: number
  metas_concluidas: number
  total_anotacoes: number
  total_conquistas: number
  pontos_total: number
}

export default function PortalConquistasPage() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [selectedMentorado, setSelectedMentorado] = useState<Mentorado | null>(null)
  const [conquistas, setConquistas] = useState<Conquista[]>([])
  const [estatisticas, setEstatisticas] = useState<EstatisticasAluno | null>(null)
  const [loading, setLoading] = useState(true)

  // Definição das conquistas disponíveis
  const conquistasDisponiveis = [
    {
      id: 'primeira_aula',
      titulo: 'Primeiro Passo! 🎬',
      descricao: 'Assistiu sua primeira aula',
      pontos: 10,
      icon: <BookOpen className="h-6 w-6" />,
      color: 'from-blue-400 to-blue-600',
      categoria: 'aprendizado'
    },
    {
      id: 'primeira_meta',
      titulo: 'Visionário! 🎯',
      descricao: 'Definiu sua primeira meta',
      pontos: 15,
      icon: <Target className="h-6 w-6" />,
      color: 'from-green-400 to-green-600',
      categoria: 'planejamento'
    },
    {
      id: 'meta_alcancada',
      titulo: 'Conquistador! 🏆',
      descricao: 'Concluiu uma meta',
      pontos: 25,
      icon: <Trophy className="h-6 w-6" />,
      color: 'from-yellow-400 to-yellow-600',
      categoria: 'conquista'
    },
    {
      id: 'streak_7_dias',
      titulo: 'Persistente! 🔥',
      descricao: 'Acessou o portal por 7 dias seguidos',
      pontos: 30,
      icon: <Flame className="h-6 w-6" />,
      color: 'from-red-400 to-red-600',
      categoria: 'consistencia'
    },
    {
      id: 'modulo_completo',
      titulo: 'Expert em Módulo! 📚',
      descricao: 'Completou um módulo inteiro',
      pontos: 35,
      icon: <Medal className="h-6 w-6" />,
      color: 'from-purple-400 to-purple-600',
      categoria: 'aprendizado'
    },
    {
      id: 'nps_alto',
      titulo: 'Satisfeito! ⭐',
      descricao: 'Deu nota 9 ou 10 em uma avaliação NPS',
      pontos: 20,
      icon: <Star className="h-6 w-6" />,
      color: 'from-pink-400 to-pink-600',
      categoria: 'feedback'
    },
    {
      id: 'anotador_ativo',
      titulo: 'Estudioso! 📝',
      descricao: 'Fez 10+ anotações em aulas',
      pontos: 20,
      icon: <Brain className="h-6 w-6" />,
      color: 'from-indigo-400 to-indigo-600',
      categoria: 'estudo'
    },
    {
      id: 'mentor_feedback',
      titulo: 'Comunicativo! 💬',
      descricao: 'Respondeu 5+ formulários de feedback',
      pontos: 15,
      icon: <Heart className="h-6 w-6" />,
      color: 'from-rose-400 to-rose-600',
      categoria: 'engajamento'
    }
  ]

  const niveis = [
    { min: 0, max: 49, nome: 'Iniciante', icon: '🌱', color: 'from-green-100 to-green-200' },
    { min: 50, max: 99, nome: 'Explorador', icon: '🔍', color: 'from-blue-100 to-blue-200' },
    { min: 100, max: 199, nome: 'Estudioso', icon: '📚', color: 'from-purple-100 to-purple-200' },
    { min: 200, max: 349, nome: 'Conquistador', icon: '🏆', color: 'from-yellow-100 to-yellow-200' },
    { min: 350, max: 499, nome: 'Expert', icon: '⭐', color: 'from-orange-100 to-orange-200' },
    { min: 500, max: 999, nome: 'Mestre', icon: '👑', color: 'from-red-100 to-red-200' },
    { min: 1000, max: Infinity, nome: 'Lenda', icon: '🚀', color: 'from-gradient-to-r from-purple-500 to-pink-500' }
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
      await Promise.all([
        carregarConquistas(mentoradoId),
        carregarEstatisticas(mentoradoId)
      ])
    }
  }

  const carregarConquistas = async (mentoradoId: string) => {
    try {
      const conquistasData = await conquistasService.buscarConquistas(mentoradoId)
      const conquistasFormatadas = conquistasData.map(conquista => ({
        id: conquista.id,
        tipo: conquista.resposta_json.tipo,
        titulo: conquista.resposta_json.titulo,
        descricao: conquista.resposta_json.descricao,
        pontos: conquista.resposta_json.pontos,
        conquistada_em: conquista.resposta_json.conquistada_em
      }))
      setConquistas(conquistasFormatadas)
    } catch (error) {
      console.error('Erro ao carregar conquistas:', error)
      setConquistas([])
    }
  }

  const carregarEstatisticas = async (mentoradoId: string) => {
    try {
      const stats = await dashboardService.buscarEstatisticasAluno(mentoradoId)
      setEstatisticas(stats)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      setEstatisticas(null)
    }
  }

  const getNivelAtual = (pontos: number) => {
    return niveis.find(nivel => pontos >= nivel.min && pontos <= nivel.max) || niveis[0]
  }

  const getProximoNivel = (pontos: number) => {
    return niveis.find(nivel => pontos < nivel.min) || niveis[niveis.length - 1]
  }

  const getProgressoNivel = (pontos: number) => {
    const nivelAtual = getNivelAtual(pontos)
    const proximoNivel = getProximoNivel(pontos)

    if (nivelAtual === proximoNivel) return 100 // Nível máximo

    const progressoAtual = pontos - nivelAtual.min
    const totalNecessario = proximoNivel.min - nivelAtual.min
    return (progressoAtual / totalNecessario) * 100
  }

  const conquistasObtidas = conquistas.map(c => c.tipo)
  const conquistasPendentes = conquistasDisponiveis.filter(c => !conquistasObtidas.includes(c.id))

  if (loading) {
    return (
      <PageLayout title="Portal de Conquistas" subtitle="Sistema de gamificação e motivação">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Portal de Conquistas"
      subtitle="Sistema avançado de gamificação, níveis e recompensas motivacionais"
    >
      <div className="space-y-8">
        {/* Seleção de Mentorado */}
        <Card className="bg-gradient-to-r from-purple-50 via-pink-50 to-indigo-50 border-purple-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-purple-900">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              Sistema de Conquistas e Gamificação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handleMentoradoSelect}>
              <SelectTrigger className="w-full bg-white border-purple-300 shadow-sm">
                <SelectValue placeholder="Selecione um mentorado para ver suas conquistas..." />
              </SelectTrigger>
              <SelectContent>
                {mentorados.map((mentorado) => (
                  <SelectItem key={mentorado.id} value={mentorado.id}>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                        <Trophy className="h-3 w-3 text-white" />
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

        {selectedMentorado && estatisticas && (
          <>
            {/* Painel de Nível e Progresso */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Nível Atual */}
              <Card className="lg:col-span-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-yellow-900">
                    <Crown className="h-6 w-6 text-yellow-600" />
                    Nível de {selectedMentorado.nome_completo}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {(() => {
                      const nivelAtual = getNivelAtual(estatisticas.pontos_total)
                      const proximoNivel = getProximoNivel(estatisticas.pontos_total)
                      const progresso = getProgressoNivel(estatisticas.pontos_total)

                      return (
                        <>
                          <div className="flex items-center gap-6">
                            <div className="text-6xl">{nivelAtual.icon}</div>
                            <div className="flex-1">
                              <h3 className="text-2xl font-bold text-yellow-900 mb-1">
                                {nivelAtual.nome}
                              </h3>
                              <p className="text-yellow-700 mb-3">
                                {estatisticas.pontos_total} pontos totais
                              </p>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Progresso para {proximoNivel.nome}</span>
                                  <span>{progresso.toFixed(0)}%</span>
                                </div>
                                <Progress value={progresso} className="h-3" />
                                <p className="text-xs text-yellow-600">
                                  {proximoNivel.min - estatisticas.pontos_total} pontos para o próximo nível
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Estatísticas Rápidas */}
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Zap className="h-5 w-5" />
                    Estatísticas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Conquistas</span>
                      </div>
                      <span className="font-bold text-blue-900">{conquistas.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Metas</span>
                      </div>
                      <span className="font-bold text-blue-900">{estatisticas.metas_concluidas}/{estatisticas.total_metas}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-purple-600" />
                        <span className="text-sm">Anotações</span>
                      </div>
                      <span className="font-bold text-blue-900">{estatisticas.total_anotacoes}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Formulários</span>
                      </div>
                      <span className="font-bold text-blue-900">{estatisticas.total_formularios}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Conquistas Obtidas */}
            <Card className="border-green-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-green-900">
                  <Award className="h-6 w-6 text-green-600" />
                  Conquistas Obtidas ({conquistas.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {conquistas.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">
                      Nenhuma conquista ainda
                    </h3>
                    <p className="text-gray-500">
                      Continue usando o portal para desbloquear suas primeiras conquistas!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {conquistas.map((conquista) => {
                      const conquistaInfo = conquistasDisponiveis.find(c => c.id === conquista.tipo)

                      return (
                        <div
                          key={conquista.id}
                          className="relative p-4 rounded-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-md transition-all"
                        >
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-green-600 text-white">
                              +{conquista.pontos}pts
                            </Badge>
                          </div>

                          <div className="flex items-start gap-3 mb-3">
                            <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${conquistaInfo?.color || 'from-gray-400 to-gray-600'} flex items-center justify-center text-white`}>
                              {conquistaInfo?.icon || <Trophy className="h-6 w-6" />}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-green-900 mb-1">
                                {conquista.titulo}
                              </h4>
                              <p className="text-sm text-green-700">
                                {conquista.descricao}
                              </p>
                            </div>
                          </div>

                          <div className="text-xs text-green-600">
                            Conquistado em {new Date(conquista.conquistada_em).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Conquistas Pendentes */}
            <Card className="border-orange-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-orange-900">
                  <Target className="h-6 w-6 text-orange-600" />
                  Próximas Conquistas ({conquistasPendentes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {conquistasPendentes.length === 0 ? (
                  <div className="text-center py-8">
                    <Crown className="h-16 w-16 text-gold-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gold-600 mb-2">
                      Todas as conquistas desbloqueadas! 🎉
                    </h3>
                    <p className="text-gold-500">
                      Parabéns! Você completou todas as conquistas disponíveis!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {conquistasPendentes.map((conquista) => (
                      <div
                        key={conquista.id}
                        className="relative p-4 rounded-lg border-2 border-dashed border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-md transition-all opacity-75"
                      >
                        <div className="absolute top-2 right-2">
                          <Badge variant="outline" className="border-orange-400 text-orange-700">
                            +{conquista.pontos}pts
                          </Badge>
                        </div>

                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${conquista.color} opacity-50 flex items-center justify-center text-white`}>
                            {conquista.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-orange-900 mb-1">
                              {conquista.titulo}
                            </h4>
                            <p className="text-sm text-orange-700">
                              {conquista.descricao}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Timer className="h-3 w-3 text-orange-500" />
                          <span className="text-xs text-orange-600">
                            Conquista pendente
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageLayout>
  )
}