'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Play, BookOpen, Clock, CheckCircle, Lock, Search, Star } from 'lucide-react'

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

export default function NetflixStyleVideosPage() {
  const [mentorado, setMentorado] = useState<any>(null)
  const [modules, setModules] = useState<VideoModule[]>([])
  const [selectedLesson, setSelectedLesson] = useState<VideoLesson | null>(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState<string>('')

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
    if (!lesson.progress) {
      supabase
        .from('lesson_progress')
        .insert([{
          mentorado_id: mentorado.id,
          lesson_id: lesson.id,
          started_at: new Date().toISOString(),
          watch_time_minutes: 0,
          is_completed: false
        }])
        .then(() => {
          console.log('✅ Progresso iniciado para:', lesson.title)
        })
    }
  }

  const handleCompleteLesson = async (lessonId: string) => {
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
    if (lesson.order_index === 1) return true
    const previousLesson = moduleLessons.find(l => l.order_index === lesson.order_index - 1)
    return previousLesson?.progress?.is_completed || false
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}min`
    }
    return `${mins}min`
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

  const filteredModules = getFilteredModules()

  return (
    <div className="bg-[#141414] min-h-screen text-white">
      {/* Netflix-style Header */}
      <div className="relative h-[50vh] mb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#141414]/50 to-[#141414] z-10" />

        {/* Hero Background - only show if no modules or first module has no cover */}
        <div className="absolute inset-0">
          {modules.length === 0 || !modules[0]?.cover_image_url ? (
            <img
              src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
              alt="Aulas"
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
            <h1 className="text-[48px] font-bold text-white mb-4 leading-tight">
              Suas Aulas
            </h1>
            <p className="text-[18px] text-gray-300 mb-6 leading-relaxed">
              Continue seu aprendizado de onde parou
            </p>
            <div className="text-gray-300 text-sm">
              {modules.reduce((total, m) => total + m.lessons.length, 0)} aulas disponíveis
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {/* Modules Grid */}
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
          <div className="space-y-12">
            {filteredModules.map((module) => {
              const moduleProgress = getModuleProgress(module)

              return (
                <section key={module.id}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-[24px] font-semibold text-white mb-2">
                        {module.title}
                      </h2>
                      <p className="text-gray-400 text-sm">
                        {moduleProgress.completed}/{moduleProgress.total} aulas concluídas
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                            {/* Module Cover Image if available */}
                            {module.cover_image_url ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={module.cover_image_url}
                                  alt={module.title}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                                  <div className="text-center">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${
                                      isCompleted
                                        ? 'bg-green-500'
                                        : isUnlocked
                                          ? 'bg-white bg-opacity-90'
                                          : 'bg-gray-600'
                                    }`}>
                                      {isCompleted ? (
                                        <CheckCircle className="w-8 h-8 text-white" />
                                      ) : isUnlocked ? (
                                        <Play className="w-8 h-8 text-black ml-1" />
                                      ) : (
                                        <Lock className="w-8 h-8 text-white" />
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
                                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${
                                    isCompleted
                                      ? 'bg-green-500'
                                      : isUnlocked
                                        ? 'bg-white bg-opacity-90'
                                        : 'bg-gray-600'
                                  }`}>
                                    {isCompleted ? (
                                      <CheckCircle className="w-8 h-8 text-white" />
                                    ) : isUnlocked ? (
                                      <Play className="w-8 h-8 text-black ml-1" />
                                    ) : (
                                      <Lock className="w-8 h-8 text-white" />
                                    )}
                                  </div>
                                  <p className="text-white text-xs">
                                    Aula {lesson.order_index}
                                  </p>
                                </div>
                              </div>
                            )}
                            {/* Progress indicator */}
                            {lesson.progress && !isCompleted && (
                              <div className="absolute top-2 right-2 w-3 h-3 bg-[#E879F9] rounded-full"></div>
                            )}
                          </div>
                          <div className="px-1">
                            <h3 className="text-white text-[15px] font-medium mb-1 group-hover:text-gray-300 transition-colors line-clamp-2">
                              {lesson.title}
                            </h3>
                            <div className="flex items-center justify-between text-[12px] text-gray-500">
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
                </section>
              )
            })}
          </div>
        )}
      </div>

      {/* Video Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="sm:max-w-[95vw] sm:max-h-[95vh] p-0 bg-[#181818] border-gray-800 rounded-[8px] overflow-hidden">
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
    </div>
  )
}