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
  Video,
  HelpCircle,
  Search,
  Star,
  Heart,
  Plus,
  Filter,
  Grid,
  List,
  ThumbsUp,
  ThumbsDown
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

export default function NetflixStyleVideosPage() {
  const [mentorado, setMentorado] = useState<any>(null)
  const [modules, setModules] = useState<VideoModule[]>([])
  const [selectedLesson, setSelectedLesson] = useState<VideoLesson | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<LessonExercise | null>(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [selectedModuleForRating, setSelectedModuleForRating] = useState<VideoModule | null>(null)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [exerciseResponse, setExerciseResponse] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [categories, setCategories] = useState<any[]>([])
  const [continueWatching, setContinueWatching] = useState<any[]>([])
  const [featuredModules, setFeaturedModules] = useState<VideoModule[]>([])

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
      console.log('🎥 Carregando dados de vídeo para mentorado:', mentoradoData.id)

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

      console.log('📊 Dados de acesso encontrados:', { accessData, accessError })

      let modulesData: any[] = []
      let lessonsData: any[] = []

      if (accessError) {
        console.warn('⚠️ Erro ao verificar acesso, carregando todos os módulos:', accessError.message)

        // Fallback: carregar todos os módulos ativos
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
          .limit(20) // Limitar para não sobrecarregar

        if (!allModulesError && allModulesData) {
          modulesData = allModulesData
          console.log('✅ Fallback: carregou', allModulesData.length, 'módulos')
        }

      } else {
        const accessibleModuleIds = accessData?.map(a => a.module_id) || []
        console.log('🔑 Módulos acessíveis encontrados:', accessibleModuleIds.length)

        if (accessibleModuleIds.length === 0) {
          console.warn('⚠️ Nenhum módulo acessível, carregando sample módulos')

          // Se não há módulos acessíveis, mostrar alguns módulos como exemplo
          const { data: sampleModulesData, error: sampleError } = await supabase
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
            .limit(6)

          if (!sampleError && sampleModulesData) {
            modulesData = sampleModulesData
            console.log('✅ Sample: carregou', sampleModulesData.length, 'módulos')
          }

        } else {
          // Carregar módulos com acesso
          const { data: accessModulesData, error: modulesError } = await supabase
            .from('video_modules')
            .select(`
              *,
              category:module_categories!category_id (
                id,
                name,
                color
              )
            `)
            .in('id', accessibleModuleIds)
            .eq('is_active', true)
            .order('featured', { ascending: false })
            .order('order_index', { ascending: true })

          if (modulesError) {
            console.error('❌ Erro ao carregar módulos específicos:', modulesError)
          } else {
            modulesData = accessModulesData || []
            console.log('✅ Carregou', modulesData.length, 'módulos com acesso')
          }

          // Carregar aulas dos módulos com acesso
          const { data: accessLessonsData, error: lessonsError } = await supabase
            .from('video_lessons')
            .select('*')
            .in('module_id', accessibleModuleIds)
            .eq('is_active', true)
            .order('order_index', { ascending: true })

          if (lessonsError) {
            console.error('❌ Erro ao carregar aulas:', lessonsError)
          } else {
            lessonsData = accessLessonsData || []
            console.log('✅ Carregou', lessonsData.length, 'aulas')
          }
        }
      }

      // Carregar exercícios das aulas (se temos aulas)
      let exercisesData: any[] = []
      const lessonIds = lessonsData?.map(l => l.id) || []

      if (lessonIds.length > 0) {
        const { data: exercisesResult, error: exercisesError } = await supabase
          .from('lesson_exercises')
          .select('*')
          .in('lesson_id', lessonIds)
          .eq('ativo', true)
          .order('ordem', { ascending: true })

        if (exercisesError) {
          console.warn('⚠️ Erro ao carregar exercícios:', exercisesError)
        } else {
          exercisesData = exercisesResult || []
          console.log('✅ Carregou', exercisesData.length, 'exercícios')
        }
      }

      // Carregar progresso do mentorado
      let progressData: any[] = []
      const { data: progressResult, error: progressError } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('mentorado_id', mentoradoData.id)

      if (progressError) {
        console.warn('⚠️ Erro ao carregar progresso:', progressError)
      } else {
        progressData = progressResult || []
        console.log('✅ Carregou progresso de', progressData.length, 'aulas')
      }

      // Carregar respostas de exercícios do mentorado
      let exerciseResponsesData: any[] = []
      const { data: responseResult, error: exerciseResponseError } = await supabase
        .from('exercise_responses')
        .select('*')
        .eq('mentorado_id', mentoradoData.id)

      if (exerciseResponseError) {
        console.warn('⚠️ Erro ao carregar respostas:', exerciseResponseError)
      } else {
        exerciseResponsesData = responseResult || []
        console.log('✅ Carregou', exerciseResponsesData.length, 'respostas')
      }

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
      console.log('✅ Total de módulos processados:', processedModules.length)

      // Separar módulos em destaque
      const featured = processedModules.filter(m => m.featured) || []
      setFeaturedModules(featured)
      console.log('✅ Módulos em destaque:', featured.length)

    } catch (error) {
      console.error('❌ Erro crítico ao carregar dados de vídeo:', error)

      // Em caso de erro crítico, definir arrays vazios para evitar loading infinito
      setModules([])
      setFeaturedModules([])
      setContinueWatching([])
      setCategories([])
    } finally {
      console.log('🎯 Finalizando loading de vídeos')
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

      // Verificar se deve mostrar modal de avaliação
      const module = modules.find(m => m.lessons.some(l => l.id === lessonId))
      if (module) {
        setSelectedModuleForRating(module)
        setShowRatingModal(true)
      }

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
    if (lesson.order_index === 1) return true

    const previousLesson = moduleLessons.find(l => l.order_index === lesson.order_index - 1)
    return previousLesson?.progress?.is_completed || false
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

  const getFilteredModules = () => {
    let filtered = modules

    // Filtrar por categoria
    if (selectedCategory) {
      filtered = filtered.filter(module => module.category?.id === selectedCategory)
    }

    // Filtrar por busca
    if (searchTerm.trim()) {
      filtered = filtered.filter(module =>
        module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        module.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }

  const submitModuleRating = async (moduleId: string, rating: number, feedback?: string) => {
    if (!mentorado) return

    try {
      const { error } = await supabase
        .from('module_ratings')
        .upsert({
          module_id: moduleId,
          mentorado_id: mentorado.id,
          rating,
          feedback: feedback || null,
          organization_id: mentorado.organization_id
        }, {
          onConflict: 'module_id,mentorado_id'
        })

      if (error) throw error

      // Recarregar dados para atualizar a avaliação média
      loadVideoData(mentorado)
      setShowRatingModal(false)
      setRating(0)
      setFeedback('')
      alert('Avaliação enviada! Obrigado pelo feedback! ⭐')
    } catch (error) {
      console.error('Erro ao avaliar módulo:', error)
    }
  }

  const getDifficultyColor = (level?: string) => {
    switch (level) {
      case 'beginner': return 'text-green-500'
      case 'intermediate': return 'text-yellow-500'
      case 'advanced': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getDifficultyLabel = (level?: string) => {
    switch (level) {
      case 'beginner': return 'Iniciante'
      case 'intermediate': return 'Intermediário'
      case 'advanced': return 'Avançado'
      default: return ''
    }
  }

  if (loading) {
    return (
      <div className="bg-[#141414] h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E879F9]"></div>
      </div>
    )
  }

  const overallProgress = getOverallProgress()
  const filteredModules = getFilteredModules()

  return (
    <div className="bg-[#141414] min-h-screen text-white">
      {/* Netflix-style Header */}
      <div className="relative h-[70vh] mb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#141414]/50 to-[#141414] z-10" />

        {/* Featured Content Background */}
        {featuredModules.length > 0 && (
          <div className="absolute inset-0">
            <img
              src={featuredModules[0].cover_image_url || 'https://via.placeholder.com/1920x1080/1a1a1a/ffffff?text=Featured+Content'}
              alt={featuredModules[0].title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

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
          {featuredModules.length > 0 && (
            <div className="max-w-2xl">
              <h1 className="text-[48px] font-bold text-white mb-4 leading-tight">
                {featuredModules[0].title}
              </h1>
              <p className="text-[18px] text-gray-300 mb-6 leading-relaxed">
                {featuredModules[0].description}
              </p>
              <div className="flex items-center space-x-4 mb-6">
                {featuredModules[0].average_rating && (
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 mr-1 fill-current" />
                    <span className="text-white text-[14px]">
                      {featuredModules[0].average_rating.toFixed(1)}
                    </span>
                  </div>
                )}
                {featuredModules[0].difficulty_level && (
                  <span className={`text-[13px] font-medium ${getDifficultyColor(featuredModules[0].difficulty_level)}`}>
                    {getDifficultyLabel(featuredModules[0].difficulty_level)}
                  </span>
                )}
                <span className="text-gray-400 text-[13px]">
                  {featuredModules[0].lessons.length} aulas
                </span>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    const firstLesson = featuredModules[0].lessons.find(l =>
                      isLessonUnlocked(l, featuredModules[0].lessons)
                    )
                    if (firstLesson) handleWatchLesson(firstLesson)
                  }}
                  className="bg-white text-black px-8 py-3 rounded-[4px] font-semibold hover:bg-opacity-80 transition-all flex items-center text-[16px]"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Assistir
                </button>
                <button className="bg-[#6B7280] bg-opacity-50 text-white px-6 py-3 rounded-[4px] font-medium hover:bg-opacity-70 transition-all flex items-center text-[16px]">
                  <Plus className="w-5 h-5 mr-2" />
                  Minha Lista
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Sections */}
      <div className="px-8 pb-8 space-y-12">
        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <section>
            <h2 className="text-[24px] font-semibold text-white mb-4">
              Continue assistindo
            </h2>
            <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
              {continueWatching.map((item) => (
                <div
                  key={item.id}
                  className="min-w-[320px] group cursor-pointer"
                  onClick={() => {
                    const lesson = modules
                      .flatMap(m => m.lessons)
                      .find(l => l.id === item.lesson_id)
                    if (lesson) handleWatchLesson(lesson)
                  }}
                >
                  <div className="relative rounded-[8px] overflow-hidden bg-[#2A2A2A] aspect-video mb-3">
                    <img
                      src={item.cover_image_url || 'https://via.placeholder.com/320x180/1a1a1a/ffffff?text=Video'}
                      alt={item.lesson_title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-20 transition-all duration-300">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                          <Play className="w-6 h-6 text-black ml-1" />
                        </div>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-50">
                      <div
                        className="h-full bg-[#E879F9] transition-all duration-300"
                        style={{ width: `${item.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="px-1">
                    <h3 className="text-white text-[15px] font-medium truncate mb-1">
                      {item.lesson_title}
                    </h3>
                    <p className="text-gray-400 text-[13px] truncate">
                      {item.module_title}
                    </p>
                    <p className="text-gray-500 text-[12px] mt-1">
                      {item.progress_percentage}% assistido
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Categories Filter */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[24px] font-semibold text-white">
              Navegar por categorias
            </h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 bg-[#2A2A2A] text-white rounded-[4px] hover:bg-opacity-80 transition-all"
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex space-x-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-full text-[14px] font-medium whitespace-nowrap transition-all ${
                selectedCategory === ''
                  ? 'bg-white text-black'
                  : 'bg-[#2A2A2A] text-white hover:bg-opacity-80'
              }`}
            >
              Todos
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-[14px] font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category.id
                    ? 'text-white'
                    : 'bg-[#2A2A2A] text-white hover:bg-opacity-80'
                }`}
                style={{
                  backgroundColor: selectedCategory === category.id ? category.color : undefined
                }}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Modules Grid */}
          {filteredModules.length === 0 ? (
            <div className="text-center py-16">
              <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-[20px] font-medium text-white mb-2">
                {searchTerm || selectedCategory ? 'Nenhum resultado encontrado' : 'Nenhum módulo disponível'}
              </h3>
              <p className="text-gray-400">
                {searchTerm || selectedCategory ? 'Tente buscar por outros termos ou categorias' : 'Entre em contato com seu mentor'}
              </p>
            </div>
          ) : (
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
            }>
              {filteredModules.map((module) => {
                const moduleProgress = getModuleProgress(module)
                const firstUnlockedLesson = module.lessons.find(l => isLessonUnlocked(l, module.lessons))

                if (viewMode === 'grid') {
                  return (
                    <div key={module.id} className="group cursor-pointer">
                      <div className="relative rounded-[8px] overflow-hidden bg-[#2A2A2A] aspect-video mb-3 group-hover:scale-105 transition-transform duration-300">
                        <img
                          src={module.cover_image_url || `https://via.placeholder.com/320x180/${module.category?.color?.replace('#', '') || '1a1a1a'}/ffffff?text=${encodeURIComponent(module.title)}`}
                          alt={module.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-20 transition-all duration-300">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <Play className="w-6 h-6 text-black ml-1" />
                            </div>
                          </div>
                        </div>
                        {/* Progress Bar */}
                        {moduleProgress.percentage > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-50">
                            <div
                              className="h-full bg-[#E879F9] transition-all duration-300"
                              style={{ width: `${moduleProgress.percentage}%` }}
                            />
                          </div>
                        )}
                        {/* Category Badge */}
                        {module.category && (
                          <div className="absolute top-3 left-3">
                            <span
                              className="px-2 py-1 rounded-[4px] text-[11px] font-medium text-white"
                              style={{ backgroundColor: module.category.color }}
                            >
                              {module.category.name}
                            </span>
                          </div>
                        )}
                        {/* Rating */}
                        {module.average_rating && (
                          <div className="absolute top-3 right-3 flex items-center bg-black bg-opacity-70 rounded-[4px] px-2 py-1">
                            <Star className="w-3 h-3 text-yellow-400 mr-1 fill-current" />
                            <span className="text-white text-[11px]">
                              {module.average_rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="px-1" onClick={() => firstUnlockedLesson && handleWatchLesson(firstUnlockedLesson)}>
                        <h3 className="text-white text-[15px] font-medium mb-1 group-hover:text-gray-300 transition-colors">
                          {module.title}
                        </h3>
                        <p className="text-gray-400 text-[13px] leading-relaxed mb-2 line-clamp-2">
                          {module.description}
                        </p>
                        <div className="flex items-center justify-between text-[12px] text-gray-500">
                          <span>{module.lessons.length} aulas</span>
                          {module.difficulty_level && (
                            <span className={getDifficultyColor(module.difficulty_level)}>
                              {getDifficultyLabel(module.difficulty_level)}
                            </span>
                          )}
                        </div>
                        {moduleProgress.percentage > 0 && (
                          <div className="mt-2 text-[12px] text-[#E879F9]">
                            {moduleProgress.percentage.toFixed(0)}% concluído
                          </div>
                        )}
                      </div>
                    </div>
                  )
                } else {
                  return (
                    <div key={module.id} className="group cursor-pointer bg-[#1A1A1A] rounded-[8px] p-4 hover:bg-[#2A2A2A] transition-colors">
                      <div className="flex space-x-4">
                        <div className="w-32 h-20 rounded-[8px] overflow-hidden bg-[#2A2A2A] flex-shrink-0">
                          <img
                            src={module.cover_image_url || `https://via.placeholder.com/128x80/${module.category?.color?.replace('#', '') || '1a1a1a'}/ffffff?text=${encodeURIComponent(module.title)}`}
                            alt={module.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white text-[16px] font-medium mb-1">
                            {module.title}
                          </h3>
                          <p className="text-gray-400 text-[13px] leading-relaxed mb-2 line-clamp-2">
                            {module.description}
                          </p>
                          <div className="flex items-center space-x-4 text-[12px] text-gray-500">
                            <span>{module.lessons.length} aulas</span>
                            {module.average_rating && (
                              <div className="flex items-center">
                                <Star className="w-3 h-3 text-yellow-400 mr-1 fill-current" />
                                <span>{module.average_rating.toFixed(1)}</span>
                              </div>
                            )}
                            {module.difficulty_level && (
                              <span className={getDifficultyColor(module.difficulty_level)}>
                                {getDifficultyLabel(module.difficulty_level)}
                              </span>
                            )}
                            {moduleProgress.percentage > 0 && (
                              <span className="text-[#E879F9]">
                                {moduleProgress.percentage.toFixed(0)}% concluído
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center">
                          <button
                            onClick={() => firstUnlockedLesson && handleWatchLesson(firstUnlockedLesson)}
                            className="p-2 bg-white bg-opacity-10 rounded-full hover:bg-opacity-20 transition-all"
                          >
                            <Play className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                }
              })}
            </div>
          )}
        </section>
      </div>

      {/* Video Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="sm:max-w-[95vw] sm:max-h-[95vh] p-0 bg-[#181818] border-gray-800 rounded-[8px] overflow-hidden">
          {selectedLesson && (
            <div className="space-y-0">
              <div className="aspect-video bg-[#1A1A1A] rounded-t-[8px] overflow-hidden">
                <iframe
                  id={`panda-${selectedLesson.panda_video_embed_url}`}
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

      {/* Rating Modal */}
      <Dialog open={showRatingModal} onOpenChange={setShowRatingModal}>
        <DialogContent className="sm:max-w-[500px] bg-[#181818] border-gray-800 rounded-[8px] text-white">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-semibold text-white">
              Avalie este módulo
            </DialogTitle>
          </DialogHeader>

          {selectedModuleForRating && (
            <div className="space-y-4">
              <p className="text-gray-400">
                Como foi sua experiência com o módulo "{selectedModuleForRating.title}"?
              </p>

              <div>
                <label className="text-[15px] font-medium text-white mb-2 block">
                  Sua nota (0-10):
                </label>
                <div className="flex space-x-2">
                  {[...Array(11)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setRating(i)}
                      className={`w-10 h-10 rounded-full text-[14px] font-medium transition-all ${
                        rating === i
                          ? 'bg-[#E879F9] text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[15px] font-medium text-white mb-2 block">
                  Feedback (opcional):
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Compartilhe sua opinião sobre o módulo..."
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-[4px] text-white placeholder-gray-400 focus:outline-none focus:border-[#E879F9] min-h-[100px]"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowRatingModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-[4px] text-[14px] font-medium hover:bg-gray-700 transition-colors"
                >
                  Pular
                </button>
                <button
                  onClick={() => selectedModuleForRating && submitModuleRating(selectedModuleForRating.id, rating, feedback)}
                  disabled={rating === 0}
                  className="px-4 py-2 bg-[#E879F9] text-white rounded-[4px] text-[14px] font-medium hover:bg-[#D865E8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enviar Avaliação
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Exercise Modal */}
      <Dialog open={showExerciseModal} onOpenChange={setShowExerciseModal}>
        <DialogContent className="sm:max-w-[600px] bg-[#181818] border-gray-800 rounded-[8px] text-white">
          {selectedExercise && (
            <div className="p-6">
              <DialogHeader>
                <DialogTitle className="text-[18px] font-semibold text-white mb-4">
                  Exercício
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <h4 className="text-[15px] font-medium text-white mb-2">
                    Pergunta:
                  </h4>
                  <p className="text-[14px] text-gray-400 mb-4">
                    {selectedExercise.pergunta}
                  </p>
                </div>

                <div>
                  <h4 className="text-[15px] font-medium text-white mb-2">
                    Sua resposta:
                  </h4>

                  {selectedExercise.tipo === 'multipla_escolha' ? (
                    <div className="space-y-2">
                      {selectedExercise.opcoes?.map((opcao, index) => (
                        <label
                          key={index}
                          className="flex items-center p-3 bg-gray-800 rounded-[4px] cursor-pointer hover:bg-gray-700 transition-colors"
                        >
                          <input
                            type="radio"
                            name="exercise_option"
                            value={opcao}
                            checked={exerciseResponse === opcao}
                            onChange={(e) => setExerciseResponse(e.target.value)}
                            className="mr-3 accent-[#E879F9]"
                            disabled={!!selectedExercise.user_response}
                          />
                          <span className="text-[14px] text-white">{opcao}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      value={exerciseResponse}
                      onChange={(e) => setExerciseResponse(e.target.value)}
                      placeholder="Digite sua resposta..."
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-[4px] text-white placeholder-gray-400 focus:outline-none focus:border-[#E879F9] min-h-[120px]"
                      disabled={!!selectedExercise.user_response}
                    />
                  )}
                </div>

                {selectedExercise.user_response && (
                  <div className={`p-3 rounded-[4px] ${
                    selectedExercise.user_response.correto
                      ? 'bg-green-900/50 border border-green-700'
                      : 'bg-red-900/50 border border-red-700'
                  }`}>
                    <div className="flex items-center">
                      {selectedExercise.user_response.correto ? (
                        <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                      ) : (
                        <div className="w-5 h-5 text-red-400 mr-2">✗</div>
                      )}
                      <span className={`text-sm font-medium ${
                        selectedExercise.user_response.correto ? 'text-green-300' : 'text-red-300'
                      }`}>
                        {selectedExercise.user_response.correto ? 'Resposta correta!' : 'Resposta incorreta'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowExerciseModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-[4px] text-[14px] font-medium hover:bg-gray-700 transition-colors"
                  >
                    Fechar
                  </button>

                  {!selectedExercise.user_response && (
                    <button
                      onClick={handleSubmitExercise}
                      disabled={!exerciseResponse.trim()}
                      className="px-4 py-2 bg-[#E879F9] text-white rounded-[4px] text-[14px] font-medium hover:bg-[#D865E8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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