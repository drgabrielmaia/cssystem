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
    <div className="flex h-full">
      {/* Conteúdo Principal (Centro) */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Header da Página */}
        <div className="mb-8">
          <h1 className="text-[32px] font-semibold text-[#1A1A1A] mb-2">
            Assistir vídeo aula
          </h1>
          <p className="text-[15px] text-[#6B7280]">
            Continue seu progresso de aprendizado
          </p>
        </div>

        {/* Vídeo Player Principal */}
        <div className="bg-[#1A1A1A] rounded-[24px] aspect-video mb-8 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-4">
              <Play className="w-10 h-10 text-white ml-1" />
            </div>
            <h3 className="text-white text-[18px] font-medium mb-2">
              Selecione uma aula
            </h3>
            <p className="text-white text-opacity-70 text-[14px]">
              Escolha um módulo na lateral para começar
            </p>
          </div>
        </div>

        {/* Informações da Aula */}
        <div className="bg-[#F3F3F5] rounded-[20px] p-6 mb-8">
          <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-2">
            Próxima aula recomendada
          </h3>
          <p className="text-[15px] text-[#6B7280] mb-4">
            Continue de onde parou em seu último acesso
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-[13px] text-[#6B7280]">
                <Clock className="w-4 h-4 mr-1" />
                <span>15 min</span>
              </div>
              <div className="w-16 h-2 bg-[#E879F9] bg-opacity-30 rounded-full">
                <div className="w-3/4 h-full bg-[#E879F9] rounded-full"></div>
              </div>
              <span className="text-[13px] text-[#6B7280]">75%</span>
            </div>

            <button className="bg-[#1A1A1A] text-white px-6 py-2 rounded-full text-[14px] font-medium hover:bg-opacity-90 transition-all">
              Continuar
            </button>
          </div>
        </div>

        {/* Exercícios / Questões */}
        <div className="bg-[#F3F3F5] rounded-[20px] p-6">
          <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-4">
            Exercícios práticos
          </h3>

          <div className="space-y-3">
            <div className="bg-white rounded-[12px] p-4 border border-[#E879F9]">
              <h4 className="text-[15px] font-medium text-[#1A1A1A] mb-2">
                Questão sobre o conteúdo
              </h4>
              <p className="text-[14px] text-[#6B7280] mb-4">
                Qual é o principal conceito abordado nesta aula?
              </p>

              <div className="space-y-2">
                <label className="flex items-center p-3 bg-[#F3F3F5] rounded-[8px] cursor-pointer hover:bg-opacity-80 transition-colors">
                  <input type="radio" name="question1" className="mr-3" />
                  <span className="text-[14px] text-[#1A1A1A]">Opção A</span>
                </label>
                <label className="flex items-center p-3 bg-[#F3F3F5] rounded-[8px] cursor-pointer hover:bg-opacity-80 transition-colors">
                  <input type="radio" name="question1" className="mr-3" />
                  <span className="text-[14px] text-[#1A1A1A]">Opção B</span>
                </label>
                <label className="flex items-center p-3 bg-[#F3F3F5] rounded-[8px] cursor-pointer hover:bg-opacity-80 transition-colors">
                  <input type="radio" name="question1" className="mr-3" />
                  <span className="text-[14px] text-[#1A1A1A]">Opção C</span>
                </label>
              </div>

              <button className="mt-4 bg-[#1A1A1A] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium hover:bg-opacity-90 transition-all">
                Responder
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Direita - Lista de Módulos */}
      <aside className="w-80 bg-[#F3F3F5] border-l border-[#E5E7EB] p-6 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-[18px] font-semibold text-[#1A1A1A] mb-2">
            Módulos do Curso
          </h2>
          <div className="flex items-center space-x-2 text-[13px] text-[#6B7280]">
            <span>{overallProgress.completed}/{overallProgress.total} concluídas</span>
            <div className="w-16 h-2 bg-[#E879F9] bg-opacity-30 rounded-full">
              <div
                className="h-full bg-[#E879F9] rounded-full transition-all duration-500"
                style={{ width: `${overallProgress.percentage}%` }}
              />
            </div>
            <span>{overallProgress.percentage.toFixed(0)}%</span>
          </div>
        </div>

        {modules.length === 0 ? (
          <div className="text-center py-8">
            <Video className="w-12 h-12 text-[#6B7280] mx-auto mb-3" />
            <h3 className="text-[15px] font-medium text-[#1A1A1A] mb-2">
              Nenhum módulo disponível
            </h3>
            <p className="text-[13px] text-[#6B7280]">
              Entre em contato com seu mentor
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((module) => {
              const moduleProgress = getModuleProgress(module.id)
              const moduleLessons = lessons.filter(l => l.module_id === module.id).sort((a, b) => a.order_index - b.order_index)

              return (
                <div key={module.id} className="bg-white rounded-[16px] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[15px] font-medium text-[#1A1A1A]">
                      {module.title}
                    </h3>
                    <div className="text-[12px] text-[#6B7280]">
                      {moduleProgress.completed}/{moduleProgress.total}
                    </div>
                  </div>

                  <div className="w-full h-1 bg-[#F3F3F5] rounded-full mb-3">
                    <div
                      className="h-full bg-[#E879F9] rounded-full transition-all duration-500"
                      style={{ width: `${moduleProgress.percentage}%` }}
                    />
                  </div>

                  <div className="space-y-2">
                    {moduleLessons.map((lesson, index) => {
                      const lessonProgress = getLessonProgress(lesson.id)
                      const isUnlocked = isLessonUnlocked(lesson)
                      const isCompleted = lessonProgress?.is_completed || false
                      const hasStarted = !!lessonProgress

                      return (
                        <div
                          key={lesson.id}
                          className={`flex items-center p-2 rounded-[8px] cursor-pointer transition-all ${
                            isCompleted
                              ? 'bg-[#22C55E] bg-opacity-10 text-[#22C55E]'
                              : hasStarted
                              ? 'bg-[#E879F9] bg-opacity-10 text-[#E879F9]'
                              : isUnlocked
                              ? 'hover:bg-[#F3F3F5] text-[#1A1A1A]'
                              : 'opacity-50 text-[#6B7280] cursor-not-allowed'
                          }`}
                          onClick={() => isUnlocked && handleWatchLesson(lesson)}
                        >
                          <div className="w-6 h-6 mr-3 flex items-center justify-center">
                            {isCompleted ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : hasStarted ? (
                              <Play className="w-4 h-4" />
                            ) : isUnlocked ? (
                              <Play className="w-4 h-4 text-[#6B7280]" />
                            ) : (
                              <Lock className="w-4 h-4" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium truncate">
                              {index + 1}. {lesson.title}
                            </p>
                            <p className="text-[12px] opacity-70">
                              {formatDuration(lesson.duration_minutes)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </aside>

      {/* Modal de Vídeo */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="sm:max-w-[95vw] sm:max-h-[95vh] p-0 bg-white rounded-[24px] overflow-hidden">
          {selectedLesson && (
            <div className="space-y-0">
              <div className="aspect-video bg-[#1A1A1A] rounded-t-[24px] overflow-hidden">
                <iframe
                  src={selectedLesson.panda_video_embed_url}
                  className="w-full h-full"
                  frameBorder="0"
                  allowFullScreen
                  title={selectedLesson.title}
                />
              </div>

              <div className="p-6">
                <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-2">
                  {selectedLesson.title}
                </h3>
                <p className="text-[15px] text-[#6B7280] mb-4">
                  {selectedLesson.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-[13px] text-[#6B7280]">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{formatDuration(selectedLesson.duration_minutes)}</span>
                    </div>

                    {!getLessonProgress(selectedLesson.id)?.is_completed && (
                      <div className="flex items-center text-[13px] text-[#E879F9]">
                        <span>Em andamento</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowVideoModal(false)}
                      className="px-4 py-2 bg-[#F3F3F5] text-[#6B7280] rounded-[8px] text-[14px] font-medium hover:bg-opacity-80 transition-colors"
                    >
                      Fechar
                    </button>
                    {!getLessonProgress(selectedLesson.id)?.is_completed && (
                      <button
                        onClick={() => handleCompleteLesson(selectedLesson.id)}
                        className="px-4 py-2 bg-[#22C55E] text-white rounded-[8px] text-[14px] font-medium hover:bg-opacity-90 transition-colors flex items-center"
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
    </div>
  )
}