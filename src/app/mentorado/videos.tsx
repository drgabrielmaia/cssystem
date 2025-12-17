'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Play,
  BookOpen,
  Clock,
  CheckCircle,
  Lock,
  TrendingUp,
  Award,
  BarChart3,
  User
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

interface MentoradoDashboardProps {
  mentorado: any
  onLogout: () => void
}

export default function MentoradoVideosDashboard({ mentorado, onLogout }: MentoradoDashboardProps) {
  const [modules, setModules] = useState<VideoModule[]>([])
  const [lessons, setLessons] = useState<VideoLesson[]>([])
  const [progress, setProgress] = useState<LessonProgress[]>([])
  const [selectedLesson, setSelectedLesson] = useState<VideoLesson | null>(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (mentorado) {
      loadVideoData()
    }
  }, [mentorado])

  const loadVideoData = async () => {
    try {
      setLoading(true)

      // Carregar módulos
      const { data: modulesData, error: modulesError } = await supabase
        .from('video_modules')
        .select(`
          *,
          lessons_count:video_lessons(count)
        `)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (modulesError) throw modulesError

      const modulesWithCount = modulesData?.map(module => ({
        ...module,
        lessons_count: module.lessons_count?.[0]?.count || 0
      })) || []

      setModules(modulesWithCount)

      // Carregar todas as aulas
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('video_lessons')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (lessonsError) throw lessonsError
      setLessons(lessonsData || [])

      // Carregar progresso do mentorado
      const { data: progressData, error: progressError } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('mentorado_id', mentorado.id)

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
          loadVideoData()
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

      loadVideoData()
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const overallProgress = getOverallProgress()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Olá, {mentorado?.nome_completo}!
              </h1>
              <p className="text-gray-600">Portal do Mentorado - Suas aulas e módulos</p>
              <div className="flex items-center mt-2">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  Mentorado - {mentorado?.turma || 'Turma Principal'}
                </span>
                <span className="ml-3 text-sm text-blue-600 font-semibold">
                  Progresso: {overallProgress.completed}/{overallProgress.total} aulas
                </span>
                <span className="ml-3 text-sm text-green-600">
                  {overallProgress.percentage.toFixed(1)}% concluído
                </span>
              </div>
            </div>
            <div className="flex space-x-4">
              <Button variant="outline" onClick={onLogout}>
                <User className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>

        {/* Estatísticas de Progresso */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Módulos</p>
                  <p className="text-2xl font-bold text-gray-900">{modules.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Play className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Aulas</p>
                  <p className="text-2xl font-bold text-gray-900">{lessons.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Aulas Concluídas</p>
                  <p className="text-2xl font-bold text-gray-900">{overallProgress.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Progresso</p>
                  <p className="text-2xl font-bold text-gray-900">{overallProgress.percentage.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Módulos e Aulas */}
        <div className="space-y-8">
          {modules.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Nenhum módulo disponível ainda
                </h3>
                <p className="text-gray-600">
                  Os módulos e aulas serão adicionados em breve. Aguarde!
                </p>
              </CardContent>
            </Card>
          ) : (
            modules.map((module) => {
              const moduleProgress = getModuleProgress(module.id)
              const moduleLessons = lessons.filter(l => l.module_id === module.id).sort((a, b) => a.order_index - b.order_index)

              return (
                <Card key={module.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="flex items-center text-xl">
                          <BookOpen className="h-6 w-6 mr-3" />
                          {module.title}
                        </CardTitle>
                        <CardDescription className="text-blue-100 mt-2">
                          {module.description}
                        </CardDescription>
                        <div className="mt-3 text-sm">
                          {moduleProgress.completed}/{moduleProgress.total} aulas concluídas
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {moduleProgress.percentage.toFixed(0)}%
                        </div>
                        <div className="text-sm opacity-90">completo</div>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="mt-4">
                      <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                        <div
                          className="bg-white rounded-full h-2 transition-all duration-500"
                          style={{ width: `${moduleProgress.percentage}%` }}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    {moduleLessons.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma aula disponível neste módulo ainda.</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {moduleLessons.map((lesson, index) => {
                          const lessonProgress = getLessonProgress(lesson.id)
                          const isUnlocked = isLessonUnlocked(lesson)
                          const isCompleted = lessonProgress?.is_completed || false
                          const hasStarted = !!lessonProgress

                          return (
                            <div
                              key={lesson.id}
                              className={`p-4 rounded-lg border transition-all ${
                                isCompleted
                                  ? 'bg-green-50 border-green-200'
                                  : hasStarted
                                  ? 'bg-blue-50 border-blue-200'
                                  : isUnlocked
                                  ? 'bg-white border-gray-200 hover:border-blue-300'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center flex-1">
                                  <div className="mr-4">
                                    {isCompleted ? (
                                      <CheckCircle className="h-8 w-8 text-green-600" />
                                    ) : hasStarted ? (
                                      <Play className="h-8 w-8 text-blue-600" />
                                    ) : isUnlocked ? (
                                      <Play className="h-8 w-8 text-gray-400" />
                                    ) : (
                                      <Lock className="h-8 w-8 text-gray-400" />
                                    )}
                                  </div>

                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">
                                      Aula {index + 1}: {lesson.title}
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {lesson.description}
                                    </p>
                                    <div className="flex items-center mt-2 text-sm text-gray-500">
                                      <Clock className="h-4 w-4 mr-1" />
                                      {formatDuration(lesson.duration_minutes)}
                                      {isCompleted && (
                                        <span className="ml-4 text-green-600 font-medium">
                                          ✓ Concluída
                                        </span>
                                      )}
                                      {hasStarted && !isCompleted && (
                                        <span className="ml-4 text-blue-600 font-medium">
                                          Em andamento
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  {isUnlocked ? (
                                    <Button
                                      onClick={() => handleWatchLesson(lesson)}
                                      className={
                                        isCompleted
                                          ? 'bg-green-600 hover:bg-green-700'
                                          : hasStarted
                                          ? 'bg-blue-600 hover:bg-blue-700'
                                          : 'bg-blue-600 hover:bg-blue-700'
                                      }
                                    >
                                      <Play className="h-4 w-4 mr-2" />
                                      {isCompleted ? 'Assistir novamente' : hasStarted ? 'Continuar' : 'Assistir'}
                                    </Button>
                                  ) : (
                                    <Button disabled variant="outline">
                                      <Lock className="h-4 w-4 mr-2" />
                                      Bloqueada
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
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
                      <Button variant="outline" onClick={() => setShowVideoModal(false)}>
                        Fechar
                      </Button>
                      {!getLessonProgress(selectedLesson.id)?.is_completed && (
                        <Button
                          onClick={() => handleCompleteLesson(selectedLesson.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Award className="h-4 w-4 mr-2" />
                          Marcar como Concluída
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}