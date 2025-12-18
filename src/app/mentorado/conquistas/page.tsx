'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { conquistasService, dashboardService } from '@/lib/video-portal-service'
import {
  Trophy, Star, Award, Crown, ArrowLeft, Sparkles, Target,
  BookOpen, Heart, Zap, Timer, Calendar, CheckCircle, Flame
} from 'lucide-react'
import Link from 'next/link'

interface Conquista {
  id: string
  tipo: string
  titulo: string
  descricao: string
  pontos: number
  conquistada_em: string
}

export default function MentoradoConquistasPage() {
  const [mentorado, setMentorado] = useState<any>(null)
  const [conquistas, setConquistas] = useState<Conquista[]>([])
  const [estatisticas, setEstatisticas] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const conquistasDisponiveis = [
    {
      id: 'primeira_aula',
      titulo: 'Primeiro Passo! 🎬',
      descricao: 'Assistiu sua primeira aula',
      pontos: 10,
      icon: <BookOpen className="h-6 w-6" />,
      color: 'from-blue-400 to-blue-600'
    },
    {
      id: 'primeira_meta',
      titulo: 'Visionário! 🎯',
      descricao: 'Definiu sua primeira meta',
      pontos: 15,
      icon: <Target className="h-6 w-6" />,
      color: 'from-green-400 to-green-600'
    },
    {
      id: 'meta_alcancada',
      titulo: 'Conquistador! 🏆',
      descricao: 'Concluiu uma meta',
      pontos: 25,
      icon: <Trophy className="h-6 w-6" />,
      color: 'from-yellow-400 to-yellow-600'
    },
    {
      id: 'streak_7_dias',
      titulo: 'Persistente! 🔥',
      descricao: 'Acessou o portal por 7 dias seguidos',
      pontos: 30,
      icon: <Flame className="h-6 w-6" />,
      color: 'from-red-400 to-red-600'
    },
    {
      id: 'modulo_completo',
      titulo: 'Expert em Módulo! 📚',
      descricao: 'Completou um módulo inteiro',
      pontos: 35,
      icon: <Award className="h-6 w-6" />,
      color: 'from-purple-400 to-purple-600'
    },
    {
      id: 'nps_alto',
      titulo: 'Satisfeito! ⭐',
      descricao: 'Deu nota 9 ou 10 em uma avaliação',
      pontos: 20,
      icon: <Star className="h-6 w-6" />,
      color: 'from-pink-400 to-pink-600'
    },
    {
      id: 'anotador_ativo',
      titulo: 'Estudioso! 📝',
      descricao: 'Fez 10+ anotações em aulas',
      pontos: 20,
      icon: <Sparkles className="h-6 w-6" />,
      color: 'from-indigo-400 to-indigo-600'
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
    const mentoradoData = localStorage.getItem('mentorado')
    if (mentoradoData) {
      const parsed = JSON.parse(mentoradoData)
      setMentorado(parsed)
      Promise.all([
        carregarConquistas(parsed.id),
        carregarEstatisticas(parsed.id)
      ])
    } else {
      window.location.href = '/mentorado'
    }
  }, [])

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
    } finally {
      setLoading(false)
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

    if (nivelAtual === proximoNivel) return 100

    const progressoAtual = pontos - nivelAtual.min
    const totalNecessario = proximoNivel.min - nivelAtual.min
    return (progressoAtual / totalNecessario) * 100
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  const pontosTotais = estatisticas?.pontos_total || 0
  const nivelAtual = getNivelAtual(pontosTotais)
  const proximoNivel = getProximoNivel(pontosTotais)
  const progresso = getProgressoNivel(pontosTotais)

  const conquistasObtidas = conquistas.map(c => c.tipo)
  const conquistasPendentes = conquistasDisponiveis.filter(c => !conquistasObtidas.includes(c.id))

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D4AF37] to-[#FFD700] p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/mentorado" className="p-3 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-800" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Minhas Conquistas</h1>
              <p className="text-slate-700">Acompanhe seu progresso e desbloqueie prêmios</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-slate-800 border-slate-800/20">
            {mentorado?.nome_completo?.split(' ')[0]}
          </Badge>
        </div>

        {/* Nível e Progresso */}
        <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-yellow-900">
              <Crown className="h-6 w-6 text-yellow-600" />
              Seu Nível Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="text-8xl">{nivelAtual.icon}</div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-3xl font-bold text-yellow-900 mb-2">
                    {nivelAtual.nome}
                  </h3>
                  <p className="text-yellow-700 text-lg">
                    {pontosTotais} pontos conquistados
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso para {proximoNivel.nome}</span>
                    <span>{progresso.toFixed(0)}%</span>
                  </div>
                  <Progress value={progresso} className="h-4" />
                  <p className="text-sm text-yellow-600">
                    Faltam {proximoNivel.min - pontosTotais} pontos para o próximo nível
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Conquistas</p>
                  <p className="text-3xl font-bold text-blue-900">{conquistas.length}</p>
                </div>
                <Trophy className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Pontos Totais</p>
                  <p className="text-3xl font-bold text-green-900">{pontosTotais}</p>
                </div>
                <Star className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Nível</p>
                  <p className="text-2xl font-bold text-purple-900">{nivelAtual.nome}</p>
                </div>
                <Award className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conquistas Obtidas */}
        <Card className="border-green-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-green-900">
              <Trophy className="h-6 w-6 text-green-600" />
              Conquistas Desbloqueadas ({conquistas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {conquistas.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Ainda sem conquistas
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
                      className="relative p-6 rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all"
                    >
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-green-600 text-white">
                          +{conquista.pontos}pts
                        </Badge>
                      </div>

                      <div className="flex items-start gap-4 mb-4">
                        <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${conquistaInfo?.color || 'from-gray-400 to-gray-600'} flex items-center justify-center text-white shadow-lg`}>
                          {conquistaInfo?.icon || <Trophy className="h-8 w-8" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-green-900 text-lg mb-2">
                            {conquista.titulo}
                          </h4>
                          <p className="text-sm text-green-700 leading-relaxed">
                            {conquista.descricao}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-green-600">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          Conquistado em {new Date(conquista.conquistada_em).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximas Conquistas */}
        <Card className="border-orange-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-orange-900">
              <Target className="h-6 w-6 text-orange-600" />
              Próximas Conquistas ({conquistasPendentes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {conquistasPendentes.length === 0 ? (
              <div className="text-center py-12">
                <Crown className="h-16 w-16 text-gold-400 mx-auto mb-4" />
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
                    className="relative p-6 rounded-xl border-2 border-dashed border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-md transition-all opacity-80"
                  >
                    <div className="absolute top-4 right-4">
                      <Badge variant="outline" className="border-orange-400 text-orange-700">
                        +{conquista.pontos}pts
                      </Badge>
                    </div>

                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${conquista.color} opacity-60 flex items-center justify-center text-white`}>
                        {conquista.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-orange-900 text-lg mb-2">
                          {conquista.titulo}
                        </h4>
                        <p className="text-sm text-orange-700 leading-relaxed">
                          {conquista.descricao}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-orange-600">
                      <Timer className="h-4 w-4" />
                      <span className="text-sm">
                        Conquista pendente
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}