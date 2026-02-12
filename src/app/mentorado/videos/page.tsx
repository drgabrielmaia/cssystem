'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EnhancedPandaVideoPlayer } from '@/components/EnhancedPandaVideoPlayer'
import {
  Play,
  BookOpen,
  Clock,
  CheckCircle,
  Lock,
  Award,
  Users,
  TrendingUp,
  Video,
  HelpCircle,
  Search,
  Star,
  Heart,
  Plus,
  Filter,
  Grid,
  List,
  Trophy,
  Medal,
  FileText
} from 'lucide-react'

interface VideoModule {
  id: string
  title: string
  description: string
  order_index: number
  thumbnail_url?: string
  cover_image_url?: string
  is_active: boolean
  featured?: boolean
  average_rating?: number
  total_ratings?: number
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  category?: {
    id: string
    name: string
    color: string
  }
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
  exercises: LessonExercise[]
  progress?: LessonProgress
}

interface LessonExercise {
  id: string
  lesson_id: string
  pergunta: string
  tipo: 'multipla_escolha' | 'dissertativa'
  opcoes?: string[]
  resposta_correta?: string
  ordem: number
  user_response?: ExerciseResponse
}

interface ExerciseResponse {
  id: string
  mentorado_id: string
  exercise_id: string
  resposta: string
  correto: boolean
  respondido_em: string
}

interface LessonProgress {
  id: string
  mentorado_id: string
  lesson_id: string
  started_at: string
  completed_at?: string
  watch_time_minutes: number
  is_completed: boolean
}

export default function MentoradoVideosPage() {
  // Redirect to new Netflix-style page
  if (typeof window !== 'undefined') {
    window.location.href = '/mentorado/videos/netflix'
    return null
  }
  const [mentorado, setMentorado] = useState<any>(null)
  const [modules, setModules] = useState<VideoModule[]>([])
  const [selectedLesson, setSelectedLesson] = useState<VideoLesson | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<LessonExercise | null>(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [exerciseResponse, setExerciseResponse] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [categories, setCategories] = useState<any[]>([])
  const [continueWatching, setContinueWatching] = useState<any[]>([])
  const [featuredModules, setFeaturedModules] = useState<VideoModule[]>([])

  // Estados para anotações e NPS
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [showNpsModal, setShowNpsModal] = useState(false)
  const [lessonNote, setLessonNote] = useState('')
  const [npsScore, setNpsScore] = useState<number | null>(null)
  const [npsFeedback, setNpsFeedback] = useState('')

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
      console.log('🔍 Carregando dados de vídeo para mentorado:', mentoradoData.id)

      // Carregar categorias primeiro
      await loadCategories()

      // Carregar continue watching
      await loadContinueWatching(mentoradoData.id)

      // Verificar acesso aos módulos
      const { data: accessData, error: accessError } = await supabase
        .from('video_access_control')
        .select('module_id')
        .eq('mentorado_id', mentoradoData.id)
        .eq('has_access', true)

      if (accessError) {
        console.error('❌ Erro ao verificar acesso:', accessError)
        // Em caso de erro, tentar carregar todos os módulos ativos
        console.log('⚠️ Carregando todos os módulos como fallback')
        return loadAllModulesAsFallback(mentoradoData)
      }

      const accessibleModuleIds = accessData?.map(a => a.module_id) || []

      // Carregar módulos com acesso e categorias
      const { data: modulesData, error: modulesError } = await supabase
        .from('video_modules')
        .select(`
          *,
          category:module_categories!category_id (
            id,
            name,
            color
          )
        `)
        .in('id', accessibleModuleIds.length > 0 ? accessibleModuleIds : ['fallback-empty'])
        .eq('is_active', true)
        .order('featured', { ascending: false })
        .order('order_index', { ascending: true })

      if (modulesError) {
        console.error('❌ Erro ao carregar módulos:', modulesError)
        // Fallback: carregar todos os módulos
        return loadAllModulesAsFallback(mentoradoData)
      }

      // Carregar aulas dos módulos com acesso
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('video_lessons')
        .select('*')
        .in('module_id', accessibleModuleIds.length > 0 ? accessibleModuleIds : [''])
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (lessonsError) throw lessonsError

      // Carregar exercícios das aulas
      const lessonIds = lessonsData?.map(l => l.id) || []
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('lesson_exercises')
        .select('*')
        .in('lesson_id', lessonIds.length > 0 ? lessonIds : [''])
        .eq('ativo', true)
        .order('ordem', { ascending: true })

      if (exercisesError) throw exercisesError

      // Carregar progresso do mentorado
      const { data: progressData, error: progressError } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('mentorado_id', mentoradoData.id)

      if (progressError) throw progressError

      // Carregar respostas de exercícios do mentorado
      const { data: exerciseResponsesData, error: exerciseResponseError } = await supabase
        .from('exercise_responses')
        .select('*')
        .eq('mentorado_id', mentoradoData.id)

      if (exerciseResponseError) throw exerciseResponseError

      // Processar dados dos módulos
      const processedModules = modulesData?.map(module => {
        const moduleLessons = lessonsData?.filter(l => l.module_id === module.id) || []
        const lessonsWithExercises = moduleLessons.map(lesson => {
          const lessonExercises = exercisesData?.filter(e => e.lesson_id === lesson.id) || []
          const lesssonProgress = progressData?.find(p => p.lesson_id === lesson.id)

          const exercisesWithResponses = lessonExercises.map(exercise => {
            const userResponse = exerciseResponsesData?.find(r => r.exercise_id === exercise.id)
            return {
              ...exercise,
              user_response: userResponse
            }
          })

          return {
            ...lesson,
            exercises: exercisesWithResponses,
            progress: lesssonProgress
          }
        })

        return {
          ...module,
          lessons: lessonsWithExercises
        }
      }) || []

      setModules(processedModules)

      // Separar módulos em destaque
      const featured = processedModules.filter(m => m.featured) || []
      setFeaturedModules(featured)

    } catch (error) {
      console.error('Erro ao carregar dados de vídeo:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('module_categories')
        .select('*')
        .order('display_order')

      if (!error && data) {
        setCategories(data)
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }

  const loadContinueWatching = async (mentoradoId: string) => {
    try {
      const { data, error } = await supabase
        .from('continue_watching_details')
        .select('*')
        .eq('mentorado_id', mentoradoId)
        .order('last_watched_at', { ascending: false })
        .limit(6)

      if (!error && data) {
        setContinueWatching(data)
      }
    } catch (error) {
      console.error('Erro ao carregar continue watching:', error)
    }
  }

  const loadAllModulesAsFallback = async (mentoradoData: any) => {
    try {
      console.log('🔄 Executando fallback - carregando todos os módulos ativos')

      // Carregar todos os módulos ativos como fallback
      const { data: allModulesData, error: allModulesError } = await supabase
        .from('video_modules')
        .select(`
          *,
          category:module_categories!category_id (
            id,
            name,
            color
          )
        `)
        .eq('is_active', true)
        .order('featured', { ascending: false })
        .order('order_index', { ascending: true })

      if (allModulesError) {
        console.error('❌ Erro no fallback de módulos:', allModulesError)
        setModules([])
        return
      }

      // Carregar aulas de todos os módulos
      const moduleIds = allModulesData?.map(m => m.id) || []
      const { data: allLessonsData, error: allLessonsError } = await supabase
        .from('video_lessons')
        .select('*')
        .in('module_id', moduleIds.length > 0 ? moduleIds : ['fallback'])
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (allLessonsError) {
        console.error('❌ Erro no fallback de aulas:', allLessonsError)
      }

      // Processar módulos com suas aulas
      const processedModules = allModulesData?.map(module => {
        const moduleLessons = allLessonsData?.filter(l => l.module_id === module.id) || []
        return {
          ...module,
          lessons: moduleLessons
        }
      }) || []

      console.log('✅ Fallback concluído:', processedModules.length, 'módulos carregados')
      setModules(processedModules)
      setFeaturedModules(processedModules.filter(m => m.featured))

    } catch (error) {
      console.error('❌ Erro geral no fallback:', error)
      setModules([])
    } finally {
      setLoading(false)
    }
  }

  const handleWatchLesson = async (lesson: VideoLesson) => {
    setSelectedLesson(lesson)
    setShowVideoModal(true)

    try {
      const existingProgress = lesson.progress

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

  const handleOpenExercise = (exercise: LessonExercise) => {
    setSelectedExercise(exercise)
    setExerciseResponse(exercise.user_response?.resposta || '')
    setShowExerciseModal(true)
  }

  const handleSubmitExercise = async () => {
    if (!selectedExercise || !exerciseResponse.trim()) return

    try {
      const isCorrect = selectedExercise.tipo === 'multipla_escolha'
        ? exerciseResponse === selectedExercise.resposta_correta
        : true // Para dissertativas, considerar sempre corretas por enquanto

      const { error } = await supabase
        .from('exercise_responses')
        .upsert({
          mentorado_id: mentorado.id,
          exercise_id: selectedExercise.id,
          resposta: exerciseResponse,
          correto: isCorrect
        }, {
          onConflict: 'mentorado_id,exercise_id'
        })

      if (error) throw error

      setShowExerciseModal(false)
      setExerciseResponse('')
      loadVideoData(mentorado)

      if (isCorrect) {
        alert('Resposta correta! 🎉')
      } else {
        alert('Resposta incorreta. Tente novamente!')
      }

    } catch (error) {
      console.error('Erro ao salvar resposta:', error)
    }
  }

  const isLessonUnlocked = (lesson: VideoLesson, moduleLessons: VideoLesson[]) => {
    // Todas as aulas estão desbloqueadas
    return true
  }

  const getModuleProgress = (module: VideoModule) => {
    const completedLessons = module.lessons.filter(l => l.progress?.is_completed).length
    return {
      completed: completedLessons,
      total: module.lessons.length,
      percentage: module.lessons.length > 0 ? (completedLessons / module.lessons.length) * 100 : 0
    }
  }

  const getOverallProgress = () => {
    const totalLessons = modules.reduce((acc, module) => acc + module.lessons.length, 0)
    const completedLessons = modules.reduce((acc, module) =>
      acc + module.lessons.filter(l => l.progress?.is_completed).length, 0
    )

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

  const getNextRecommendedLesson = () => {
    for (const module of modules) {
      for (const lesson of module.lessons) {
        if (!lesson.progress?.is_completed && isLessonUnlocked(lesson, module.lessons)) {
          return lesson
        }
      }
    }
    return null
  }

  const getFilteredModules = () => {
    if (!searchTerm.trim()) return modules

    return modules.map(module => ({
      ...module,
      lessons: module.lessons.filter(lesson =>
        lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        module.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(module => module.lessons.length > 0)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const overallProgress = getOverallProgress()
  const nextLesson = getNextRecommendedLesson()
  const filteredModules = getFilteredModules()

  return (
    <div className="flex h-full">
      {/* Conteúdo Principal (Centro) */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Header da Página */}
        <div className="mb-8">
          <h1 className="text-[32px] font-semibold text-[#1A1A1A] mb-2">
            Assistir vídeo aula
          </h1>
          <p className="text-[15px] text-[#6B7280] mb-4">
            Continue seu progresso de aprendizado
          </p>

          {/* Campo de Busca */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Buscar aulas, módulos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#F3F3F5] border-0 rounded-full text-sm text-[#1A1A1A] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#E879F9] focus:bg-white transition-all"
            />
          </div>
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

        {/* Próxima Aula Recomendada */}
        {nextLesson && (
          <div className="bg-[#F3F3F5] rounded-[20px] p-6 mb-8">
            <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-2">
              Próxima aula recomendada
            </h3>
            <p className="text-[15px] text-[#6B7280] mb-4">
              {nextLesson.title}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-[13px] text-[#6B7280]">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{formatDuration(nextLesson.duration_minutes)}</span>
                </div>
                {nextLesson.exercises.length > 0 && (
                  <div className="flex items-center text-[13px] text-[#6B7280]">
                    <HelpCircle className="w-4 h-4 mr-1" />
                    <span>{nextLesson.exercises.length} exercício(s)</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleWatchLesson(nextLesson)}
                className="bg-[#1A1A1A] text-white px-6 py-2 rounded-full text-[14px] font-medium hover:bg-opacity-90 transition-all"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Exercícios da Aula Selecionada */}
        {selectedLesson && selectedLesson.exercises.length > 0 && (
          <div className="bg-[#F3F3F5] rounded-[20px] p-6">
            <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-4">
              Exercícios - {selectedLesson.title}
            </h3>

            <div className="space-y-3">
              {selectedLesson.exercises.map((exercise, index) => (
                <div key={exercise.id} className="bg-white rounded-[12px] p-4 border border-[#E879F9]">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[15px] font-medium text-[#1A1A1A]">
                      Questão {index + 1}
                    </h4>
                    {exercise.user_response && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        exercise.user_response.correto
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {exercise.user_response.correto ? 'Correto' : 'Incorreto'}
                      </span>
                    )}
                  </div>

                  <p className="text-[14px] text-[#6B7280] mb-4">
                    {exercise.pergunta}
                  </p>

                  <button
                    onClick={() => handleOpenExercise(exercise)}
                    className="bg-[#1A1A1A] text-white px-4 py-2 rounded-[8px] text-[14px] font-medium hover:bg-opacity-90 transition-all"
                  >
                    {exercise.user_response ? 'Ver Resposta' : 'Responder'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
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

        {filteredModules.length === 0 ? (
          <div className="text-center py-8">
            <Video className="w-12 h-12 text-[#6B7280] mx-auto mb-3" />
            <h3 className="text-[15px] font-medium text-[#1A1A1A] mb-2">
              {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum módulo disponível'}
            </h3>
            <p className="text-[13px] text-[#6B7280]">
              {searchTerm ? 'Tente buscar por outros termos' : 'Entre em contato com seu mentor'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredModules.map((module) => {
              const moduleProgress = getModuleProgress(module)

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
                    {module.lessons.map((lesson, index) => {
                      const isUnlocked = isLessonUnlocked(lesson, module.lessons)
                      const isCompleted = lesson.progress?.is_completed || false
                      const hasStarted = !!lesson.progress
                      const hasExercises = lesson.exercises.length > 0

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
                            <div className="flex items-center justify-between">
                              <p className="text-[13px] font-medium truncate">
                                {lesson.order_index}. {lesson.title}
                              </p>
                              {hasExercises && (
                                <HelpCircle className="w-3 h-3 text-[#E879F9] ml-1" />
                              )}
                            </div>
                            <p className="text-[12px] opacity-70">
                              {formatDuration(lesson.duration_minutes)}
                              {hasExercises && ` • ${lesson.exercises.length} exercício(s)`}
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
                <EnhancedPandaVideoPlayer
                  embedUrl={selectedLesson.panda_video_embed_url}
                  title={selectedLesson.title}
                  className="w-full h-full rounded-t-[24px]"
                  onTimeUpdate={(currentTime, duration) => {
                    // Atualizar progresso da aula automaticamente
                    if (currentTime > 0 && duration > 0) {
                      const watchPercentage = (currentTime / duration) * 100
                      if (watchPercentage > 80 && !selectedLesson.progress?.is_completed) {
                        // Auto-completar quando assistir 80% da aula
                        handleCompleteLesson(selectedLesson.id)
                      }
                    }
                  }}
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

                    {selectedLesson.exercises.length > 0 && (
                      <div className="flex items-center text-[13px] text-[#E879F9]">
                        <HelpCircle className="w-4 h-4 mr-1" />
                        <span>{selectedLesson.exercises.length} exercício(s)</span>
                      </div>
                    )}

                    {!selectedLesson.progress?.is_completed && (
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
                    {!selectedLesson.progress?.is_completed && (
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

      {/* Modal de Exercício */}
      <Dialog open={showExerciseModal} onOpenChange={setShowExerciseModal}>
        <DialogContent className="sm:max-w-[600px] bg-white rounded-[24px] overflow-hidden">
          {selectedExercise && (
            <div className="p-6">
              <DialogHeader>
                <DialogTitle className="text-[18px] font-semibold text-[#1A1A1A] mb-4">
                  Exercício
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <h4 className="text-[15px] font-medium text-[#1A1A1A] mb-2">
                    Pergunta:
                  </h4>
                  <p className="text-[14px] text-[#6B7280] mb-4">
                    {selectedExercise.pergunta}
                  </p>
                </div>

                <div>
                  <h4 className="text-[15px] font-medium text-[#1A1A1A] mb-2">
                    Sua resposta:
                  </h4>

                  {selectedExercise.tipo === 'multipla_escolha' ? (
                    <div className="space-y-2">
                      {selectedExercise.opcoes?.map((opcao, index) => (
                        <label
                          key={index}
                          className="flex items-center p-3 bg-[#F3F3F5] rounded-[8px] cursor-pointer hover:bg-opacity-80 transition-colors"
                        >
                          <input
                            type="radio"
                            name="exercise_option"
                            value={opcao}
                            checked={exerciseResponse === opcao}
                            onChange={(e) => setExerciseResponse(e.target.value)}
                            className="mr-3"
                            disabled={!!selectedExercise.user_response}
                          />
                          <span className="text-[14px] text-[#1A1A1A]">{opcao}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      value={exerciseResponse}
                      onChange={(e) => setExerciseResponse(e.target.value)}
                      placeholder="Digite sua resposta..."
                      className="w-full p-3 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#E879F9] focus:border-[#E879F9] text-[#1A1A1A] min-h-[120px]"
                      disabled={!!selectedExercise.user_response}
                    />
                  )}
                </div>

                {selectedExercise.user_response && (
                  <div className={`p-3 rounded-lg ${
                    selectedExercise.user_response.correto
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center">
                      {selectedExercise.user_response.correto ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      ) : (
                        <div className="w-5 h-5 text-red-600 mr-2">✗</div>
                      )}
                      <span className={`text-sm font-medium ${
                        selectedExercise.user_response.correto ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {selectedExercise.user_response.correto ? 'Resposta correta!' : 'Resposta incorreta'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowExerciseModal(false)}
                    className="px-4 py-2 bg-[#F3F3F5] text-[#6B7280] rounded-[8px] text-[14px] font-medium hover:bg-opacity-80 transition-colors"
                  >
                    Fechar
                  </button>

                  {!selectedExercise.user_response && (
                    <button
                      onClick={handleSubmitExercise}
                      disabled={!exerciseResponse.trim()}
                      className="px-4 py-2 bg-[#1A1A1A] text-white rounded-[8px] text-[14px] font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Enviar Resposta
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}