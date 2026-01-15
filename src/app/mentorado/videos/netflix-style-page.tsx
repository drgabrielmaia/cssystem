'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Play, BookOpen, Clock, CheckCircle, Lock, Search, Star, Trophy, Medal, Award, FileText, MessageSquare, ThumbsUp } from 'lucide-react'
import { useMentoradoAuth } from '@/contexts/mentorado-auth'

interface VideoModule {
  id: string
  title: string
  description: string
  order_index: number
  cover_image_url?: string
  is_active: boolean
  featured?: boolean
  lessons: VideoLesson[]
}

interface VideoLesson {
  id: string
  module_id: string
  title: string
  description: string
  panda_video_embed_url: string
  duration_minutes: number
  order_index: number
  is_active: boolean
  progress?: LessonProgress
}

interface LessonProgress {
  id: string
  mentorado_id: string
  lesson_id: string
  completed_at?: string
  is_completed: boolean
}

interface RankingMentorado {
  mentorado_id: string
  nome_completo: string
  total_indicacoes: number
}

export default function NetflixStyleVideosPage() {
  const { mentorado, loading: authLoading } = useMentoradoAuth()
  const [modules, setModules] = useState<VideoModule[]>([])
  const [selectedLesson, setSelectedLesson] = useState<VideoLesson | null>(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const [ranking, setRanking] = useState<RankingMentorado[]>([])
  const [showRanking, setShowRanking] = useState(true)

  // Estados para anotações e NPS
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [showNpsModal, setShowNpsModal] = useState(false)
  const [lessonNote, setLessonNote] = useState('')
  const [npsScore, setNpsScore] = useState<number | null>(null)
  const [npsFeedback, setNpsFeedback] = useState('')

  useEffect(() => {
    if (mentorado && !authLoading) {
      console.log('🎥 Mentorado autenticado via cookie:', mentorado.nome_completo)
      loadVideoData(mentorado)
      loadRankingData()
    }
  }, [mentorado, authLoading])

  const loadVideoData = async (mentoradoData: any) => {
    try {
      console.log('🎥 Carregando dados de vídeo para:', mentoradoData.id)

      // Step 1: Verificar acesso aos módulos
      const { data: accessData, error: accessError } = await supabase
        .from('video_access_control')
        .select('module_id')
        .eq('mentorado_id', mentoradoData.id)
        .eq('has_access', true)

      let accessibleModuleIds: string[] = []

      if (accessError) {
        console.log('🔧 Erro de acesso, usando fallback para módulos:', accessError.message)
        // Fallback: carregar todos os módulos
        const { data: allModulesData } = await supabase
          .from('video_modules')
          .select('id')
          .eq('is_active', true)
        accessibleModuleIds = allModulesData?.map(m => m.id) || []
      } else {
        accessibleModuleIds = accessData?.map(a => a.module_id) || []
      }

      console.log('🔓 Módulos acessíveis:', accessibleModuleIds.length)

      if (accessibleModuleIds.length === 0) {
        console.log('❌ Nenhum módulo acessível')
        setModules([])
        return
      }

      // Step 2: Carregar módulos com acesso
      const { data: modulesData } = await supabase
        .from('video_modules')
        .select('*')
        .in('id', accessibleModuleIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      // Step 3: Carregar aulas dos módulos acessíveis
      console.log('🎬 Carregando aulas para módulos:', accessibleModuleIds)
      let { data: lessonsData, error: lessonsError } = await supabase
        .from('video_lessons')
        .select('*')
        .in('module_id', accessibleModuleIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      console.log('🎬 Query direta das aulas - Success:', !!lessonsData, 'Error:', !!lessonsError)
      console.log('🎬 Aulas retornadas:', lessonsData?.length || 0)

      if (lessonsError) {
        console.log('❌ Erro ao carregar aulas:', lessonsError.message)
        console.log('🔧 Implementando fallback para aulas...')
        // Fallback: tentar carregar aulas sem filtro específico
        const { data: fallbackLessons } = await supabase
          .from('video_lessons')
          .select('*')
          .eq('is_active', true)
          .order('order_index', { ascending: true })

        console.log('🔧 Fallback aulas - Total:', fallbackLessons?.length || 0)

        // Filtrar apenas aulas dos módulos acessíveis
        lessonsData = fallbackLessons?.filter(lesson =>
          accessibleModuleIds.includes(lesson.module_id)
        ) || []

        console.log('✅ Fallback funcionou, aulas filtradas:', lessonsData.length)
      } else {
        console.log('✅ Query direta funcionou, aulas:', lessonsData?.length || 0)
      }

      // Carregar progresso do mentorado
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('mentorado_id', mentoradoData.id)

      // Processar dados dos módulos
      console.log('🔄 Processando módulos...')
      const processedModules = modulesData?.map(module => {
        const moduleLessons = lessonsData?.filter(l => l.module_id === module.id) || []
        console.log(`📚 Módulo ${module.title}: ${moduleLessons.length} aulas encontradas`)

        const lessonsWithProgress = moduleLessons.map(lesson => {
          const lessonProgress = progressData?.find(p => p.lesson_id === lesson.id)
          return {
            ...lesson,
            progress: lessonProgress
          }
        })

        return {
          ...module,
          lessons: lessonsWithProgress
        }
      }) || []

      console.log('📊 Resultado final:')
      processedModules.forEach(module => {
        console.log(`  📚 ${module.title}: ${module.lessons.length} aulas`)
      })

      setModules(processedModules)
      console.log('✅ Carregou', processedModules.length, 'módulos com', lessonsData?.length || 0, 'aulas total')

    } catch (error) {
      console.error('❌ Erro ao carregar vídeos:', error)
      setModules([])
    }
  }

  const handleWatchLesson = (lesson: VideoLesson) => {
    console.log('▶️ Assistir aula:', lesson.title)
    setSelectedLesson(lesson)
    setShowVideoModal(true)

    // Marcar como iniciada se não foi ainda
    if (!lesson.progress && mentorado) {
      supabase
        .from('lesson_progress')
        .upsert({
          mentorado_id: mentorado.id,
          lesson_id: lesson.id,
          started_at: new Date().toISOString(),
          watch_time_minutes: 0,
          is_completed: false
        }, {
          onConflict: 'mentorado_id,lesson_id'
        })
        .then(({ error }) => {
          if (error) {
            console.log('⚠️ Progresso já existe:', error.message)
          } else {
            console.log('✅ Progresso iniciado para:', lesson.title)
          }
        })
    }
  }

  const handleCompleteLesson = async (lessonId: string) => {
    if (!mentorado) return

    try {
      await supabase
        .from('lesson_progress')
        .update({
          completed_at: new Date().toISOString(),
          is_completed: true,
          watch_time_minutes: selectedLesson?.duration_minutes || 0
        })
        .eq('mentorado_id', mentorado.id)
        .eq('lesson_id', lessonId)

      console.log('✅ Aula concluída!')
      setShowVideoModal(false)
      loadVideoData(mentorado)
      alert('Parabéns! Aula concluída! 🎉')
    } catch (error) {
      console.error('❌ Erro ao concluir aula:', error)
    }
  }

  const isLessonUnlocked = (lesson: VideoLesson, moduleLessons: VideoLesson[]) => {
    // Todas as aulas estão desbloqueadas
    return true
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}min`
    }
    return `${mins}min`
  }

  const loadRankingData = async () => {
    try {
      console.log('🏆 Carregando ranking de indicações...')

      // First get all mentorados from the admin organization (where all mentorados are now)
      const { data: allMentorados, error: mentoradosError } = await supabase
        .from('mentorados')
        .select('id, nome_completo, organization_id')
        .eq('excluido', false)
        .eq('organization_id', '9c8c0033-15ea-4e33-a55f-28d81a19693b')
        .order('nome_completo')

      if (mentoradosError) {
        console.error('❌ Erro ao carregar mentorados:', mentoradosError)
        return
      }

      // Then get ranking data from the view (only indicações count)
      const { data: viewData, error: viewError } = await supabase
        .from('view_dashboard_comissoes_mentorado')
        .select(`
          mentorado_id,
          total_indicacoes
        `)

      if (viewError) {
        console.error('❌ Erro ao carregar dados do ranking:', viewError)
        // Continue even with view error - show all mentorados with 0 values
      }

      // Create ranking with all mentorados, filling in 0 values for those without data
      const rankingFormatted = allMentorados?.map((mentoradoItem: any) => {
        const rankingData = viewData?.find(item => item.mentorado_id === mentoradoItem.id)

        return {
          mentorado_id: mentoradoItem.id,
          nome_completo: mentoradoItem.nome_completo,
          total_indicacoes: rankingData?.total_indicacoes || 0
        }
      }).sort((a, b) => b.total_indicacoes - a.total_indicacoes) || []

      setRanking(rankingFormatted)
      console.log('✅ Ranking carregado:', rankingFormatted.length, 'mentorados (incluindo zeros)')
    } catch (error) {
      console.error('❌ Erro ao carregar ranking:', error)
    }
  }

  const saveNote = async () => {
    if (!mentorado || !selectedLesson || !lessonNote.trim()) return

    try {
      const response = await fetch('/api/video/save-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mentorado_id: mentorado.id,
          lesson_id: selectedLesson.id,
          note_text: lessonNote,
          timestamp_seconds: 0,
          note_type: 'text'
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar anotação')
      }

      console.log('✅ Anotação salva!')
      setLessonNote('')
      setShowNotesModal(false)
      alert('Anotação salva com sucesso! 📝')
    } catch (error) {
      console.error('❌ Erro ao salvar anotação:', error)
      alert('Erro ao salvar anotação')
    }
  }

  const saveNps = async () => {
    if (!mentorado || !selectedLesson || npsScore === null) return

    try {
      const response = await fetch('/api/video/save-nps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mentorado_id: mentorado.id,
          lesson_id: selectedLesson.id,
          nps_score: npsScore,
          feedback_text: npsFeedback
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar avaliação')
      }

      console.log('✅ Avaliação NPS salva!')
      setNpsScore(null)
      setNpsFeedback('')
      setShowNpsModal(false)
      alert('Obrigado pela sua avaliação! 🌟')
    } catch (error) {
      console.error('❌ Erro ao salvar NPS:', error)
      alert('Erro ao salvar avaliação')
    }
  }

  const getFilteredModules = () => {
    if (!searchTerm.trim()) return modules

    return modules.filter(module =>
      module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.lessons.some(lesson =>
        lesson.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }

  const getModuleProgress = (module: VideoModule) => {
    const completedLessons = module.lessons.filter(l => l.progress?.is_completed).length
    return {
      completed: completedLessons,
      total: module.lessons.length,
      percentage: module.lessons.length > 0 ? (completedLessons / module.lessons.length) * 100 : 0
    }
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModule(expandedModule === moduleId ? null : moduleId)
  }

  const filteredModules = getFilteredModules()

  // Loading state
  if (authLoading) {
    return (
      <div className="bg-[#141414] min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando...</p>
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
          <p className="text-gray-400 mb-4">Você precisa fazer login para acessar as aulas.</p>
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
      <div className="relative h-[50vh] mb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#141414]/50 to-[#141414] z-10" />

        {/* Hero Background - only show if no modules or first module has no cover */}
        <div className="absolute inset-0">
          {modules.length === 0 || !modules[0]?.cover_image_url ? (
            <img
              src="https://medicosderesultado.com/wp-content/uploads/2024/10/capa-dashboard.png"
              alt="Dashboard Médicos de Resultado"
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={modules[0].cover_image_url}
              alt={modules[0].title}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className="absolute top-0 left-0 right-0 p-8 z-20">
          {/* Search Bar */}
          <div className="flex justify-end mb-8">
            <div className="relative max-w-lg">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar módulos, aulas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-black bg-opacity-70 border border-gray-600 rounded-[4px] text-white placeholder-gray-400 focus:outline-none focus:border-white transition-all"
              />
            </div>
          </div>

          {/* Hero Content */}
          <div className="max-w-2xl">
            <h1 className="text-[32px] md:text-[48px] font-bold text-white mb-4 leading-tight">
              Seus Módulos de Aulas
            </h1>
            <p className="text-[16px] md:text-[18px] text-gray-300 mb-6 leading-relaxed">
              {expandedModule ? 'Aulas do módulo selecionado' : 'Clique em um módulo para ver as aulas'}
            </p>
            <div className="text-gray-300 text-sm">
              {expandedModule ?
                `${modules.find(m => m.id === expandedModule)?.lessons.length || 0} aulas neste módulo` :
                `${modules.length} módulos • ${modules.reduce((total, m) => total + m.lessons.length, 0)} aulas disponíveis`
              }
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 pb-8">
        {filteredModules.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-[20px] font-medium text-white mb-2">
              {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum módulo disponível'}
            </h3>
            <p className="text-gray-400">
              {searchTerm ? 'Tente buscar por outros termos' : 'Entre em contato com seu mentor'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Back button */}
            {expandedModule && (
              <button
                onClick={() => setExpandedModule(null)}
                className="flex items-center text-gray-400 hover:text-white transition-colors mb-4"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar aos módulos
              </button>
            )}

            {!expandedModule ? (
              /* Modules Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredModules.map((module) => {
                  const moduleProgress = getModuleProgress(module)

                  return (
                    <div
                      key={module.id}
                      className="group cursor-pointer"
                      onClick={() => toggleModule(module.id)}
                    >
                      <div className="relative bg-[#2A2A2A] rounded-[8px] overflow-hidden aspect-video mb-3 group-hover:scale-105 transition-transform duration-300">
                        {module.cover_image_url ? (
                          <img
                            src={module.cover_image_url}
                            alt={module.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#E879F9]/20 to-[#1A1A1A] flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-white" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end">
                          <div className="p-4 w-full">
                            <div className="flex items-center justify-between">
                              <div className="bg-white bg-opacity-90 rounded-full p-2">
                                <Play className="w-4 h-4 text-black" />
                              </div>
                              <span className="text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                                {module.lessons.length} aulas
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* Progress bar */}
                        {moduleProgress.percentage > 0 && (
                          <div className="absolute top-2 left-2 right-2">
                            <div className="bg-black bg-opacity-50 rounded-full h-1">
                              <div
                                className="bg-[#E879F9] h-1 rounded-full transition-all"
                                style={{ width: `${moduleProgress.percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="px-1">
                        <h3 className="text-white text-[15px] md:text-[16px] font-medium mb-1 group-hover:text-gray-300 transition-colors line-clamp-2">
                          {module.title}
                        </h3>
                        <p className="text-gray-400 text-[12px] md:text-[13px] mb-2 line-clamp-2">
                          {module.description}
                        </p>
                        <div className="text-[11px] md:text-[12px] text-gray-500">
                          {moduleProgress.completed}/{moduleProgress.total} concluídas
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Lessons Grid for Expanded Module */
              (() => {
                const module = modules.find(m => m.id === expandedModule)
                if (!module) return null

                return (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-[20px] md:text-[24px] font-semibold text-white mb-2">
                        {module.title}
                      </h2>
                      <p className="text-gray-400 text-sm md:text-base">
                        {module.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                      {module.lessons.map((lesson) => {
                        const isUnlocked = isLessonUnlocked(lesson, module.lessons)
                        const isCompleted = lesson.progress?.is_completed || false

                        return (
                          <div
                            key={lesson.id}
                            className={`group cursor-pointer ${!isUnlocked ? 'opacity-50' : ''}`}
                            onClick={() => isUnlocked && handleWatchLesson(lesson)}
                          >
                            <div className="relative bg-[#2A2A2A] rounded-[8px] overflow-hidden aspect-video mb-3 group-hover:scale-105 transition-transform duration-300">
                              {module.cover_image_url ? (
                                <div className="relative w-full h-full">
                                  <img
                                    src={module.cover_image_url}
                                    alt={module.title}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                                    <div className="text-center">
                                      <div className={`w-12 md:w-16 h-12 md:h-16 rounded-full flex items-center justify-center mb-2 ${
                                        isCompleted
                                          ? 'bg-green-500'
                                          : isUnlocked
                                            ? 'bg-white bg-opacity-90'
                                            : 'bg-gray-600'
                                      }`}>
                                        {isCompleted ? (
                                          <CheckCircle className="w-6 md:w-8 h-6 md:h-8 text-white" />
                                        ) : isUnlocked ? (
                                          <Play className="w-6 md:w-8 h-6 md:h-8 text-black ml-1" />
                                        ) : (
                                          <Lock className="w-6 md:w-8 h-6 md:h-8 text-white" />
                                        )}
                                      </div>
                                      <p className="text-white text-xs">
                                        Aula {lesson.order_index}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#E879F9]/20 to-[#1A1A1A] flex items-center justify-center">
                                  <div className="text-center">
                                    <div className={`w-12 md:w-16 h-12 md:h-16 rounded-full flex items-center justify-center mb-2 ${
                                      isCompleted
                                        ? 'bg-green-500'
                                        : isUnlocked
                                          ? 'bg-white bg-opacity-90'
                                          : 'bg-gray-600'
                                    }`}>
                                      {isCompleted ? (
                                        <CheckCircle className="w-6 md:w-8 h-6 md:h-8 text-white" />
                                      ) : isUnlocked ? (
                                        <Play className="w-6 md:w-8 h-6 md:h-8 text-black ml-1" />
                                      ) : (
                                        <Lock className="w-6 md:w-8 h-6 md:h-8 text-white" />
                                      )}
                                    </div>
                                    <p className="text-white text-xs">
                                      Aula {lesson.order_index}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {lesson.progress && !isCompleted && (
                                <div className="absolute top-2 right-2 w-3 h-3 bg-[#E879F9] rounded-full"></div>
                              )}
                            </div>
                            <div className="px-1">
                              <h3 className="text-white text-[14px] md:text-[15px] font-medium mb-1 group-hover:text-gray-300 transition-colors line-clamp-2">
                                {lesson.title}
                              </h3>
                              <div className="flex items-center justify-between text-[11px] md:text-[12px] text-gray-500">
                                <span>{formatDuration(lesson.duration_minutes)}</span>
                                {isCompleted && (
                                  <span className="text-green-400 text-xs">Concluída</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()
            )}
          </div>
        )}
      </div>

      {/* Seção Competitiva - Status do Mentorado */}
      {mentorado && ranking.length > 0 && (() => {
        const mentoradoIndex = ranking.findIndex(r => r.mentorado_id === mentorado.id)
        const currentPosition = mentoradoIndex + 1
        const mentoradoData = ranking[mentoradoIndex]
        const nextPosition = ranking[mentoradoIndex - 1]
        const indicacoesParaSubir = nextPosition ? (nextPosition.total_indicacoes - mentoradoData.total_indicacoes + 1) : 0

        return (
          <div className="mt-12 mb-8">
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-400/30 rounded-lg p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  currentPosition === 1 ? 'bg-yellow-400 text-black' :
                  currentPosition === 2 ? 'bg-gray-400 text-black' :
                  currentPosition === 3 ? 'bg-amber-500 text-white' :
                  'bg-gray-600 text-white'
                }`}>
                  {currentPosition === 1 ? (
                    <Trophy className="w-8 h-8" />
                  ) : currentPosition === 2 ? (
                    <Medal className="w-8 h-8" />
                  ) : currentPosition === 3 ? (
                    <Award className="w-8 h-8" />
                  ) : (
                    <span className="text-2xl font-bold">#{currentPosition}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {currentPosition === 1 ? '🏆 Você é o CAMPEÃO!' :
                     currentPosition <= 3 ? `🏅 Você está em ${currentPosition}º lugar!` :
                     `Você está em ${currentPosition}º lugar`}
                  </h2>
                  <p className="text-gray-400">
                    {mentoradoData.total_indicacoes} indicação{mentoradoData.total_indicacoes !== 1 ? 'ões' : ''} feita{mentoradoData.total_indicacoes !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Status Atual */}
                <div className="bg-[#1A1A1A] rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-2 flex items-center">
                    <Star className="w-5 h-5 mr-2 text-blue-400" />
                    Sua Posição
                  </h3>
                  <div className="text-3xl font-bold text-white mb-1">#{currentPosition}</div>
                  <div className="text-sm text-gray-400">de {ranking.length} competidores</div>
                </div>

                {/* Para Subir de Posição */}
                {nextPosition && (
                  <div className="bg-[#1A1A1A] rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-2 flex items-center">
                      <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                      Para Subir
                    </h3>
                    <div className="text-3xl font-bold text-yellow-400 mb-1">+{indicacoesParaSubir}</div>
                    <div className="text-sm text-gray-400">
                      indicações para passar {nextPosition.nome_completo}
                    </div>
                  </div>
                )}

                {/* Quem Está Acima */}
                {nextPosition && (
                  <div className="bg-[#1A1A1A] rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-2 flex items-center">
                      <Medal className="w-5 h-5 mr-2 text-orange-400" />
                      Quem Está Acima
                    </h3>
                    <div className="text-lg font-bold text-white mb-1">
                      {nextPosition.nome_completo}
                    </div>
                    <div className="text-sm text-gray-400">
                      {nextPosition.total_indicacoes} indicações
                    </div>
                  </div>
                )}

                {/* Se for o primeiro lugar */}
                {currentPosition === 1 && (
                  <div className="bg-[#1A1A1A] rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-2 flex items-center">
                      <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                      Prêmio do Campeão
                    </h3>
                    <div className="text-lg font-bold text-yellow-400 mb-1">
                      🏆 VOCÊ GANHA!
                    </div>
                    <div className="text-sm text-gray-400">
                      Bolsa de luxo OU Relógio de luxo
                    </div>
                  </div>
                )}
              </div>

              {/* Barra de Progresso Motivacional */}
              {nextPosition && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">Progresso para subir de posição</span>
                    <span className="text-gray-400 text-sm">
                      {mentoradoData.total_indicacoes} / {nextPosition.total_indicacoes + 1}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (mentoradoData.total_indicacoes / (nextPosition.total_indicacoes + 1)) * 100)}%`
                      }}
                    />
                  </div>
                  <p className="text-gray-400 text-sm mt-2">
                    Faltam apenas <span className="text-yellow-400 font-bold">{indicacoesParaSubir}</span> indicações para você subir!
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Placar de Indicações */}
      {showRanking && (
        <div className="mt-16 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <h2 className="text-2xl font-bold text-white">🏆 Ranking de Indicações</h2>
                <p className="text-gray-400">Concorra ao prêmio! O 1º lugar ganha um Rolex OU uma bolsa de grife!</p>
              </div>
            </div>
            <button
              onClick={() => setShowRanking(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Top 3 - Pódio */}
            {ranking.slice(0, 3).map((mentorado, index) => (
              <div
                key={mentorado.mentorado_id}
                className={`relative p-6 rounded-lg text-center transform transition-all hover:scale-105 ${
                  index === 0
                    ? 'bg-gradient-to-b from-yellow-600 to-yellow-800 border-2 border-yellow-400'
                    : index === 1
                    ? 'bg-gradient-to-b from-gray-500 to-gray-700 border-2 border-gray-400'
                    : 'bg-gradient-to-b from-amber-600 to-amber-800 border-2 border-amber-500'
                }`}
              >
                {/* Coroa/Medal */}
                <div className="flex justify-center mb-3">
                  {index === 0 ? (
                    <Trophy className="w-12 h-12 text-yellow-200" />
                  ) : index === 1 ? (
                    <Medal className="w-12 h-12 text-gray-200" />
                  ) : (
                    <Award className="w-12 h-12 text-amber-200" />
                  )}
                </div>

                {/* Posição */}
                <div className="text-3xl font-bold text-white mb-2">
                  {index + 1}º
                </div>

                {/* Nome */}
                <div className="text-lg font-semibold text-white mb-3 truncate">
                  {mentorado.nome_completo}
                </div>

                {/* Métricas */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-white/90">
                    <span>Indicações:</span>
                    <span className="font-bold">{mentorado.total_indicacoes}</span>
                  </div>
                </div>

                {/* Prêmio */}
                <div className="mt-4 p-2 bg-black/20 rounded text-white/80 text-xs font-medium">
                  {index === 0 ? '🏆 ROLEX OU BOLSA DE GRIFE' : index === 1 ? '🥈 2º LUGAR' : '🥉 3º LUGAR'}
                </div>

                {/* Badge de destaque */}
                {index === 0 && (
                  <div className="absolute -top-3 -right-3 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                    👑 LÍDER
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Lista completa (Top 4-10) */}
          {ranking.length > 3 && (
            <div className="bg-[#1A1A1A] rounded-lg overflow-hidden">
              <div className="p-4 bg-[#2A2A2A] border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Demais Posições</h3>
              </div>
              <div className="divide-y divide-gray-700">
                {ranking.slice(3, 10).map((mentorado, index) => (
                  <div
                    key={mentorado.mentorado_id}
                    className="flex items-center justify-between p-4 hover:bg-[#2A2A2A] transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 4}
                      </div>
                      <div>
                        <div className="text-white font-medium">{mentorado.nome_completo}</div>
                        <div className="text-sm text-gray-400">
                          {mentorado.total_indicacoes} indicações
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-semibold text-lg">
                        #{index + 4}
                      </div>
                      <div className="text-xs text-gray-400">posição</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="sm:max-w-[95vw] sm:max-h-[95vh] p-0 bg-[#181818] border-gray-800 rounded-[8px] overflow-y-auto">
          {selectedLesson && (
            <div className="space-y-0">
              <div className="aspect-video bg-[#1A1A1A] rounded-t-[8px] overflow-hidden">
                <iframe
                  src={`https://player-vz-00efd930-2fc.tv.pandavideo.com.br/embed/?v=${selectedLesson.panda_video_embed_url}`}
                  className="w-full h-full"
                  style={{border: 'none'}}
                  allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture"
                  allowFullScreen={true}
                  title={selectedLesson.title}
                />
              </div>

              <div className="p-6 text-white">
                <h3 className="text-[18px] font-semibold text-white mb-2">
                  {selectedLesson.title}
                </h3>
                <p className="text-[15px] text-gray-400 mb-4">
                  {selectedLesson.description}
                </p>

                {/* Botões de Anotações e NPS */}
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => setShowNotesModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-[4px] text-[14px] font-medium hover:bg-blue-700 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Fazer Anotação
                  </button>
                  <button
                    onClick={() => setShowNpsModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-[4px] text-[14px] font-medium hover:bg-purple-700 transition-colors"
                  >
                    <Star className="w-4 h-4" />
                    Avaliar Aula
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-[13px] text-gray-400">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{formatDuration(selectedLesson.duration_minutes)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowVideoModal(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-[4px] text-[14px] font-medium hover:bg-gray-700 transition-colors"
                    >
                      Fechar
                    </button>
                    {!selectedLesson.progress?.is_completed && (
                      <button
                        onClick={() => handleCompleteLesson(selectedLesson.id)}
                        className="px-4 py-2 bg-[#E879F9] text-white rounded-[4px] text-[14px] font-medium hover:bg-[#D865E8] transition-colors flex items-center"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Marcar como Concluída
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Anotações */}
      <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
        <DialogContent className="sm:max-w-[600px] bg-[#181818] border-gray-800 text-white">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-400" />
              <div>
                <h3 className="text-xl font-semibold">Fazer Anotação</h3>
                <p className="text-gray-400 text-sm">
                  {selectedLesson?.title}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">
                Sua anotação sobre esta aula:
              </label>
              <textarea
                value={lessonNote}
                onChange={(e) => setLessonNote(e.target.value)}
                placeholder="Digite suas anotações, insights ou pontos importantes desta aula..."
                className="w-full h-32 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-400"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowNotesModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveNote}
                disabled={!lessonNote.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar Anotação
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de NPS */}
      <Dialog open={showNpsModal} onOpenChange={setShowNpsModal}>
        <DialogContent className="sm:max-w-[500px] bg-[#181818] border-gray-800 text-white">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6 text-purple-400" />
              <div>
                <h3 className="text-xl font-semibold">Avaliar esta Aula</h3>
                <p className="text-gray-400 text-sm">
                  {selectedLesson?.title}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Qual nota você daria para esta aula? (0-10)
                </label>
                <div className="flex gap-2 justify-center">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      onClick={() => setNpsScore(score)}
                      className={`w-10 h-10 rounded-full font-bold transition-all ${
                        npsScore === score
                          ? score <= 6
                            ? 'bg-red-600 text-white'
                            : score <= 8
                            ? 'bg-yellow-600 text-white'
                            : 'bg-green-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>Muito insatisfeito</span>
                  <span>Extremamente satisfeito</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Feedback adicional (opcional):
                </label>
                <textarea
                  value={npsFeedback}
                  onChange={(e) => setNpsFeedback(e.target.value)}
                  placeholder="O que você achou desta aula? Sugestões de melhoria?"
                  className="w-full h-24 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowNpsModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveNps}
                disabled={npsScore === null}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enviar Avaliação
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}