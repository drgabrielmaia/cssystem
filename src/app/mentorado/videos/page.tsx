'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Play,
  BookOpen,
  Clock,
  CheckCircle,
  Lock,
  Award,
  Users,
  TrendingUp,
  Video
} from 'lucide-react'

interface VideoModule {
  id: string
  title: string
  description: string
  order_index: number
  thumbnail_url?: string
  is_active: boolean
  lessons_count?: number
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
}

interface LessonProgress {
  id: string
  lesson_id: string
  started_at: string
  completed_at?: string
  watch_time_minutes: number
  is_completed: boolean
}

export default function MentoradoVideosPage() {
  const [mentorado, setMentorado] = useState<any>(null)
  const [modules, setModules] = useState<VideoModule[]>([])
  const [lessons, setLessons] = useState<VideoLesson[]>([])
  const [progress, setProgress] = useState<LessonProgress[]>([])
  const [selectedLesson, setSelectedLesson] = useState<VideoLesson | null>(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedMentorado = localStorage.getItem('mentorado')
    if (savedMentorado) {
      const mentoradoData = JSON.parse(savedMentorado)
      setMentorado(mentoradoData)
      loadVideoData(mentoradoData)
    }
  }, [])

  const loadVideoData = async (mentoradoData: any) => {
    try {
      setLoading(true)

      // Verificar acesso aos módulos
      const { data: accessData, error: accessError } = await supabase
        .from('video_access_control')
        .select('module_id')
        .eq('mentorado_id', mentoradoData.id)
        .eq('has_access', true)

      if (accessError) throw accessError

      const accessibleModuleIds = accessData?.map(a => a.module_id) || []

      // Carregar módulos com acesso
      const { data: modulesData, error: modulesError } = await supabase
        .from('video_modules')
        .select('*')
        .in('id', accessibleModuleIds.length > 0 ? accessibleModuleIds : [''])
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (modulesError) throw modulesError

      // Contar aulas para cada módulo
      const modulesWithCount = await Promise.all(
        (modulesData || []).map(async (module) => {
          const { count } = await supabase
            .from('video_lessons')
            .select('id', { count: 'exact' })
            .eq('module_id', module.id)
            .eq('is_active', true)

          return {
            ...module,
            lessons_count: count || 0
          }
        })
      )

      setModules(modulesWithCount)

      // Carregar aulas dos módulos com acesso
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('video_lessons')
        .select('*')
        .in('module_id', accessibleModuleIds.length > 0 ? accessibleModuleIds : [''])
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (lessonsError) throw lessonsError
      setLessons(lessonsData || [])

      // Carregar progresso do mentorado
      const { data: progressData, error: progressError } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('mentorado_id', mentoradoData.id)

      if (progressError) throw progressError
      setProgress(progressData || [])

    } catch (error) {
      console.error('Erro ao carregar dados de vídeo:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleWatchLesson = async (lesson: VideoLesson) => {
    setSelectedLesson(lesson)
    setShowVideoModal(true)

    try {
      const existingProgress = progress.find(p => p.lesson_id === lesson.id)

      if (!existingProgress) {
        const { error } = await supabase
          .from('lesson_progress')
          .insert([{
            mentorado_id: mentorado.id,
            lesson_id: lesson.id,
            started_at: new Date().toISOString(),
            watch_time_minutes: 0,
            is_completed: false
          }])

        if (!error) {
          loadVideoData(mentorado)
        }
      }
    } catch (error) {
      console.error('Erro ao marcar início da aula:', error)
    }
  }

  const handleCompleteLesson = async (lessonId: string) => {
    try {
      const { error } = await supabase
        .from('lesson_progress')
        .update({
          completed_at: new Date().toISOString(),
          is_completed: true,
          watch_time_minutes: selectedLesson?.duration_minutes || 0
        })
        .eq('mentorado_id', mentorado.id)
        .eq('lesson_id', lessonId)

      if (error) throw error

      loadVideoData(mentorado)
      setShowVideoModal(false)
      alert('Parabéns! Aula concluída! 🎉')
    } catch (error) {
      console.error('Erro ao marcar aula como concluída:', error)
    }
  }

  const getLessonProgress = (lessonId: string) => {
    return progress.find(p => p.lesson_id === lessonId)
  }

  const isLessonUnlocked = (lesson: VideoLesson) => {
    const moduleId = lesson.module_id
    const moduleLessons = lessons.filter(l => l.module_id === moduleId).sort((a, b) => a.order_index - b.order_index)

    if (lesson.id === moduleLessons[0]?.id) return true

    const currentIndex = moduleLessons.findIndex(l => l.id === lesson.id)
    if (currentIndex > 0) {
      const previousLesson = moduleLessons[currentIndex - 1]
      const previousProgress = getLessonProgress(previousLesson.id)
      return previousProgress?.is_completed || false
    }

    return true
  }

  const getModuleProgress = (moduleId: string) => {
    const moduleLessons = lessons.filter(l => l.module_id === moduleId)
    const completedLessons = moduleLessons.filter(l => getLessonProgress(l.id)?.is_completed)

    return {
      completed: completedLessons.length,
      total: moduleLessons.length,
      percentage: moduleLessons.length > 0 ? (completedLessons.length / moduleLessons.length) * 100 : 0
    }
  }

  const getOverallProgress = () => {
    const totalLessons = lessons.length
    const completedLessons = progress.filter(p => p.is_completed).length

    return {
      completed: completedLessons,
      total: totalLessons,
      percentage: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}min`
    }
    return `${mins}min`
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const overallProgress = getOverallProgress()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vídeos & Aulas</h1>
          <p className="text-gray-600">Seus módulos de aprendizado e progresso</p>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Módulos Disponíveis</p>
              <p className="text-2xl font-bold text-gray-900">{modules.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Aulas Concluídas</p>
              <p className="text-2xl font-bold text-gray-900">{overallProgress.completed}/{overallProgress.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Progresso Geral</p>
              <p className="text-2xl font-bold text-gray-900">{overallProgress.percentage.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Módulos e Aulas */}
      <div className="space-y-6">
        {modules.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum módulo disponível
            </h3>
            <p className="text-gray-600">
              Você ainda não tem acesso a nenhum módulo. Entre em contato com seu mentor para liberar o acesso aos conteúdos.
            </p>
          </div>
        ) : (
          modules.map((module) => {
            const moduleProgress = getModuleProgress(module.id)
            const moduleLessons = lessons.filter(l => l.module_id === module.id).sort((a, b) => a.order_index - b.order_index)

            return (
              <div key={module.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <BookOpen className="w-6 h-6 mr-3" />
                        <h2 className="text-xl font-bold">{module.title}</h2>
                      </div>
                      <p className="text-blue-100 mb-4">{module.description}</p>
                      <div className="flex items-center text-sm">
                        <span>{moduleProgress.completed}/{moduleProgress.total} aulas concluídas</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold mb-1">
                        {moduleProgress.percentage.toFixed(0)}%
                      </div>
                      <div className="text-sm text-blue-100">completo</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                      <div
                        className="bg-white rounded-full h-2 transition-all duration-500"
                        style={{ width: `${moduleProgress.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {moduleLessons.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma aula disponível neste módulo ainda.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {moduleLessons.map((lesson, index) => {
                        const lessonProgress = getLessonProgress(lesson.id)
                        const isUnlocked = isLessonUnlocked(lesson)
                        const isCompleted = lessonProgress?.is_completed || false
                        const hasStarted = !!lessonProgress

                        return (
                          <div
                            key={lesson.id}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              isCompleted
                                ? 'bg-green-50 border-green-200'
                                : hasStarted
                                ? 'bg-blue-50 border-blue-200'
                                : isUnlocked
                                ? 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                : 'bg-gray-50 border-gray-200 opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center flex-1">
                                <div className="mr-4">
                                  {isCompleted ? (
                                    <CheckCircle className="w-10 h-10 text-green-600" />
                                  ) : hasStarted ? (
                                    <Play className="w-10 h-10 text-blue-600" />
                                  ) : isUnlocked ? (
                                    <Play className="w-10 h-10 text-gray-400" />
                                  ) : (
                                    <Lock className="w-10 h-10 text-gray-400" />
                                  )}
                                </div>

                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 mb-1">
                                    Aula {index + 1}: {lesson.title}
                                  </h4>
                                  <p className="text-sm text-gray-600 mb-2">
                                    {lesson.description}
                                  </p>
                                  <div className="flex items-center text-sm text-gray-500">
                                    <Clock className="w-4 h-4 mr-1" />
                                    <span className="mr-4">{formatDuration(lesson.duration_minutes)}</span>
                                    {isCompleted && (
                                      <span className="text-green-600 font-medium">
                                        ✓ Concluída
                                      </span>
                                    )}
                                    {hasStarted && !isCompleted && (
                                      <span className="text-blue-600 font-medium">
                                        📝 Em andamento
                                      </span>
                                    )}
                                    {!isUnlocked && (
                                      <span className="text-gray-500">
                                        🔒 Bloqueada
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div>
                                {isUnlocked ? (
                                  <button
                                    onClick={() => handleWatchLesson(lesson)}
                                    className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center ${
                                      isCompleted
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : hasStarted
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                                  >
                                    <Play className="w-4 h-4 mr-2" />
                                    {isCompleted ? 'Assistir novamente' : hasStarted ? 'Continuar' : 'Assistir'}
                                  </button>
                                ) : (
                                  <button disabled className="px-6 py-3 rounded-lg font-medium bg-gray-300 text-gray-500 cursor-not-allowed flex items-center">
                                    <Lock className="w-4 h-4 mr-2" />
                                    Bloqueada
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal de Vídeo */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Play className="h-5 w-5 mr-2 text-blue-600" />
              {selectedLesson?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedLesson && (
            <div className="space-y-4">
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <iframe
                  src={selectedLesson.panda_video_embed_url}
                  className="w-full h-full"
                  frameBorder="0"
                  allowFullScreen
                  title={selectedLesson.title}
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">{selectedLesson.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{selectedLesson.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    Duração: {formatDuration(selectedLesson.duration_minutes)}
                  </div>

                  <div className="space-x-3">
                    <button
                      onClick={() => setShowVideoModal(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Fechar
                    </button>
                    {!getLessonProgress(selectedLesson.id)?.is_completed && (
                      <button
                        onClick={() => handleCompleteLesson(selectedLesson.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                      >
                        <Award className="h-4 w-4 mr-2" />
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
    </div>
  )
}