'use client'

import { useState, useEffect } from 'react'
import { Trophy, Star, Award, Medal, Target, Calendar } from 'lucide-react'
import { useMentoradoAuth } from '@/contexts/mentorado-auth'
import { supabase } from '@/lib/supabase'

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt?: string
  progress?: number
  maxProgress?: number
}

export default function MentoradoConquistasPage() {
  const { mentorado, loading: authLoading } = useMentoradoAuth()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (mentorado && !authLoading) {
      loadAchievements()
    }
  }, [mentorado, authLoading])

  const loadAchievements = async () => {
    if (!mentorado) return

    try {
      setLoading(true)

      // Carregar dados do progresso real do mentorado
      const [lessonsProgress, comissoes, metas] = await Promise.all([
        // Progresso das aulas
        supabase
          .from('lesson_progress')
          .select('*')
          .eq('mentorado_id', mentorado.id),
        // Comissões
        supabase
          .from('comissoes')
          .select('*')
          .eq('mentorado_id', mentorado.id)
          .gt('valor', 0),
        // Metas (se houver tabela)
        supabase
          .from('metas')
          .select('*')
          .eq('mentorado_id', mentorado.id)
          .eq('alcancada', true)
          .then(result => result.data || [], () => [])
      ])

      const completedLessons = lessonsProgress.data?.filter(p => p.is_completed) || []
      const totalLessons = lessonsProgress.data?.length || 0
      const totalComissoes = comissoes.data?.length || 0
      const totalMetas = Array.isArray(metas) ? metas.length : 0

      // Gerar conquistas baseadas em dados reais
      const realAchievements: Achievement[] = [
        {
          id: '1',
          title: 'Primeira Aula',
          description: 'Assistiu sua primeira aula do curso',
          icon: 'play',
          unlocked: completedLessons.length > 0,
          unlockedAt: completedLessons[0]?.completed_at || undefined
        },
        {
          id: '2',
          title: 'Dedicado',
          description: 'Completou 5 aulas',
          icon: 'star',
          unlocked: completedLessons.length >= 5,
          progress: completedLessons.length,
          maxProgress: 5,
          unlockedAt: completedLessons.length >= 5 ? completedLessons[4]?.completed_at : undefined
        },
        {
          id: '3',
          title: 'Estudioso',
          description: 'Completou 10 aulas',
          icon: 'award',
          unlocked: completedLessons.length >= 10,
          progress: completedLessons.length,
          maxProgress: 10,
          unlockedAt: completedLessons.length >= 10 ? completedLessons[9]?.completed_at : undefined
        },
        {
          id: '4',
          title: 'Primeiro Ganho',
          description: 'Recebeu sua primeira comissão',
          icon: 'dollar',
          unlocked: totalComissoes > 0,
          progress: totalComissoes,
          maxProgress: 1,
          unlockedAt: totalComissoes > 0 ? comissoes.data?.[0]?.data_pagamento : undefined
        },
        {
          id: '5',
          title: 'Vendedor',
          description: 'Recebeu 5 comissões',
          icon: 'target',
          unlocked: totalComissoes >= 5,
          progress: totalComissoes,
          maxProgress: 5,
          unlockedAt: totalComissoes >= 5 ? comissoes.data?.[4]?.data_pagamento : undefined
        },
        {
          id: '6',
          title: 'Especialista',
          description: 'Completou todas as aulas disponíveis',
          icon: 'medal',
          unlocked: totalLessons > 0 && completedLessons.length === totalLessons,
          progress: completedLessons.length,
          maxProgress: totalLessons,
          unlockedAt: totalLessons > 0 && completedLessons.length === totalLessons ?
            completedLessons[completedLessons.length - 1]?.completed_at : undefined
        }
      ]

      setAchievements(realAchievements)
    } catch (error) {
      console.error('Erro ao carregar conquistas:', error)
      setAchievements([])
    } finally {
      setLoading(false)
    }
  }

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'play': return Trophy
      case 'star': return Star
      case 'award': return Award
      case 'medal': return Medal
      case 'dollar': return Trophy
      case 'target': return Target
      default: return Trophy
    }
  }

  const unlockedCount = achievements.filter(a => a.unlocked).length

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="bg-[#141414] min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando conquistas...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!mentorado) {
    return (
      <div className="bg-[#141414] min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Acesso Restrito</h1>
          <p className="text-gray-400 mb-4">Você precisa fazer login para ver suas conquistas.</p>
          <a href="/login" className="bg-[#E879F9] hover:bg-[#D865E8] text-white px-6 py-2 rounded">
            Fazer Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#141414] min-h-screen text-white">
      {/* Netflix-style Header */}
      <div className="relative h-[40vh] mb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#141414]/50 to-[#141414] z-10" />

        {/* Hero Background */}
        <div className="absolute inset-0">
          <img
            src="https://medicosderesultado.com/wp-content/uploads/2024/10/capa-dashboard.png"
            alt="Dashboard Médicos de Resultado"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="absolute top-0 left-0 right-0 p-4 md:p-8 z-20">
          <div className="max-w-2xl">
            <h1 className="text-[32px] md:text-[48px] font-bold text-white mb-4 leading-tight">
              Minhas Conquistas
            </h1>
            <p className="text-[16px] md:text-[18px] text-gray-300 mb-6 leading-relaxed">
              Acompanhe seus marcos e celebre suas vitórias
            </p>
            <div className="text-gray-300 text-sm">
              {unlockedCount} de {achievements.length} conquistas desbloqueadas
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 pb-8">
        {/* Stats */}
        <section className="mb-12">
          <h2 className="text-[20px] md:text-[24px] font-semibold text-white mb-6">
            Seu progresso
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-[#1A1A1A] rounded-[8px] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-gray-400 font-medium mb-2">Conquistas Desbloqueadas</p>
                  <p className="text-[24px] font-bold text-white">{unlockedCount}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500 rounded-[8px] flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-[8px] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-gray-400 font-medium mb-2">Taxa de Conclusão</p>
                  <p className="text-[24px] font-bold text-white">{Math.round((unlockedCount / achievements.length) * 100)}%</p>
                </div>
                <div className="w-12 h-12 bg-[#E879F9] rounded-[8px] flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-[8px] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-gray-400 font-medium mb-2">Próxima Meta</p>
                  <p className="text-[24px] font-bold text-white">{achievements.length - unlockedCount}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-[8px] flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Achievements Grid */}
        <section>
          <h2 className="text-[20px] md:text-[24px] font-semibold text-white mb-6">
            Todas as conquistas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {achievements.map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon)
              const progress = achievement.progress || 0
              const maxProgress = achievement.maxProgress || 1

              return (
                <div
                  key={achievement.id}
                  className={`bg-[#1A1A1A] rounded-[8px] p-6 border-2 transition-all duration-300 ${
                    achievement.unlocked
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-[8px] flex items-center justify-center ${
                      achievement.unlocked ? 'bg-yellow-500' : 'bg-gray-600'
                    }`}>
                      <IconComponent className={`w-6 h-6 ${achievement.unlocked ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    {achievement.unlocked && (
                      <div className="text-yellow-400 text-sm font-medium">
                        Desbloqueada!
                      </div>
                    )}
                  </div>

                  <h3 className={`text-lg font-semibold mb-2 ${
                    achievement.unlocked ? 'text-white' : 'text-gray-400'
                  }`}>
                    {achievement.title}
                  </h3>

                  <p className="text-gray-400 text-sm mb-4">
                    {achievement.description}
                  </p>

                  {!achievement.unlocked && achievement.maxProgress && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Progresso</span>
                        <span className="text-gray-400">{progress}/{maxProgress}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-[#E879F9] h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(progress / maxProgress) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {achievement.unlocked && achievement.unlockedAt && (
                    <div className="flex items-center text-sm text-gray-400 mt-4">
                      <Calendar className="w-4 h-4 mr-2" />
                      Desbloqueada em {new Date(achievement.unlockedAt).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Motivational Section */}
        <section className="mt-12">
          <div className="bg-[#1A1A1A] rounded-[8px] p-8 text-center border border-gray-700">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">
              Continue assim!
            </h3>
            <p className="text-gray-400 mb-6">
              Você está fazendo um ótimo progresso. Continue se dedicando para desbloquear mais conquistas.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-gray-300">
                🎯 <strong>Próxima meta:</strong> Complete mais 3 aulas
              </div>
              <div className="text-gray-300">
                💰 <strong>Foco financeiro:</strong> Busque sua primeira venda
              </div>
              <div className="text-gray-300">
                📚 <strong>Aprendizado:</strong> Finalize um módulo completo
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}