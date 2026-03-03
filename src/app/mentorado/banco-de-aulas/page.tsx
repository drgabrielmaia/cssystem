'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Play, BookOpen, Clock, CheckCircle, Lock, Search, ArrowLeft, Archive, ChevronDown, ChevronRight } from 'lucide-react'
import { useMentoradoAuth } from '@/contexts/mentorado-auth'
import { PandaVideoPlayer } from '@/components/PandaVideoPlayer'
import Link from 'next/link'
import { MOCK_MODE, MOCK_MODULES } from '@/lib/mock-data'

interface VideoModule {
  id: string
  title: string
  description: string
  order_index: number
  cover_image_url?: string
  is_active: boolean
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
  is_current?: boolean
  version?: string
  archived_at?: string
  progress?: LessonProgress
}

interface LessonProgress {
  id: string
  mentorado_id: string
  lesson_id: string
  completed_at?: string
  is_completed: boolean
}

export default function BancoDeAulasPage() {
  const { mentorado, loading: authLoading } = useMentoradoAuth()
  const [modules, setModules] = useState<VideoModule[]>([])
  const [selectedLesson, setSelectedLesson] = useState<VideoLesson | null>(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (mentorado && !authLoading) {
      console.log('📚 Carregando banco de aulas para:', mentorado.nome_completo)
      loadAllVideoData(mentorado)
    }
  }, [mentorado, authLoading])

  const loadAllVideoData = async (mentoradoData: any) => {
    setLoading(true)
    try {
      // MOCK MODE: usar dados locais
      if (MOCK_MODE) {
        const mockModules = MOCK_MODULES.map(m => ({
          ...m,
          lessons: m.lessons.map(l => ({ ...l, is_current: true, progress: undefined }))
        }))
        setModules(mockModules as any)
        setLoading(false)
        return
      }

      console.log('📚 Carregando TODAS as aulas para:', mentoradoData.id)

      // Step 1: Calcular dias desde entrada
      const dataEntrada = new Date(mentoradoData.data_entrada)
      const hoje = new Date()
      const diasDesdeEntrada = Math.floor((hoje.getTime() - dataEntrada.getTime()) / (1000 * 60 * 60 * 24))
      
      console.log(`⏰ Mentorado ${mentoradoData.nome_completo} entrou há ${diasDesdeEntrada} dias`)

      let accessibleModuleIds: string[] = []

      if (diasDesdeEntrada < 7) {
        // Menos de 7 dias: apenas módulo de onboarding
        console.log('🆕 Mentorado novato - acesso apenas ao onboarding')
        const { data: onboardingModule } = await supabase
          .from('video_modules')
          .select('id')
          .eq('title', 'Onboarding')
          .eq('organization_id', mentoradoData.organization_id)
          .eq('is_active', true)
          .single()
        
        if (onboardingModule) {
          accessibleModuleIds = [onboardingModule.id]
        }
      } else {
        // 7+ dias: acesso a todos os módulos da organização
        console.log('🎓 Mentorado experiente - acesso a todos os módulos')
        const { data: allModulesData } = await supabase
          .from('video_modules')
          .select('id')
          .eq('organization_id', mentoradoData.organization_id)
          .eq('is_active', true)
        accessibleModuleIds = allModulesData?.map(m => m.id) || []
      }

      console.log('🔓 Módulos acessíveis:', accessibleModuleIds.length)

      if (accessibleModuleIds.length === 0) {
        console.log('❌ Nenhum módulo acessível')
        setModules([])
        setLoading(false)
        return
      }

      // Step 2: Carregar módulos com acesso
      const { data: modulesData } = await supabase
        .from('video_modules')
        .select('*')
        .in('id', accessibleModuleIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      // Step 3: Carregar TODAS as aulas dos módulos acessíveis (incluindo versões antigas)
      console.log('🎬 Carregando TODAS as aulas para módulos:', accessibleModuleIds)
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('video_lessons')
        .select(`
          *,
          is_current,
          version,
          archived_at
        `)
        .in('module_id', accessibleModuleIds)
        .eq('is_active', true)
        .order('module_id', { ascending: true })
        .order('is_current', { ascending: true }) // Aulas arquivadas primeiro, atuais depois
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false }) // Versões mais recentes primeiro

      console.log('📚 Todas as aulas carregadas:', lessonsData?.length || 0)

      if (lessonsError) {
        console.error('❌ Erro ao carregar aulas:', lessonsError)
        setModules([])
        setLoading(false)
        return
      }

      // Step 4: Carregar progresso das aulas
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('mentorado_id', mentoradoData.id)

      // Step 5: Organizar dados
      const modulesWithLessons = (modulesData || []).map(module => ({
        ...module,
        lessons: (lessonsData || [])
          .filter(lesson => lesson.module_id === module.id)
          .map(lesson => ({
            ...lesson,
            progress: progressData?.find(p => p.lesson_id === lesson.id)
          }))
      }))

      console.log('📚 Módulos organizados com aulas:', modulesWithLessons.length)
      setModules(modulesWithLessons)

    } catch (error) {
      console.error('❌ Erro geral ao carregar dados:', error)
      setModules([])
    } finally {
      setLoading(false)
    }
  }

  // Filter modules and lessons based on search
  const filteredModules = modules.filter(module => {
    const moduleMatch = module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       module.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const lessonsMatch = module.lessons.some(lesson =>
      lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    return moduleMatch || lessonsMatch
  }).map(module => ({
    ...module,
    lessons: module.lessons.filter(lesson =>
      lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      searchTerm === '' // Show all lessons if no search term
    )
  }))

  const handleLessonClick = (lesson: VideoLesson) => {
    console.log('▶️ Abrindo aula:', lesson.title)
    setSelectedLesson(lesson)
    setShowVideoModal(true)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return hours > 0 ? `${hours}h ${remainingMinutes}min` : `${remainingMinutes}min`
  }

  if (authLoading || loading) {
    return (
      <div className="bg-[#141414] min-h-screen text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="bg-[#141414] min-h-screen text-white">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-[#141414] via-[#1f1f1f] to-[#141414] px-8 py-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/mentorado"
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                <BookOpen className="w-8 h-8 mr-3" />
                Banco de Aulas
              </h1>
              <p className="text-gray-400 mt-1">
                Acesso completo a todas as aulas e versões - {modules.reduce((total, m) => total + m.lessons.length, 0)} aulas disponíveis
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar aulas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#2A2A2A] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {filteredModules.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">
              {searchTerm ? 'Nenhuma aula encontrada' : 'Nenhum módulo disponível'}
            </h3>
            <p className="text-gray-400">
              {searchTerm ? 'Tente buscar com outros termos' : 'Entre em contato com seu mentor para acessar os módulos'}
            </p>
          </div>
        ) : (
          filteredModules.map((module) => (
            <div key={module.id} className="mb-8">
              {/* Module Header - Clickable */}
              <div 
                className="bg-[#1A1A1A] rounded-lg p-6 cursor-pointer hover:bg-[#2A2A2A] transition-all duration-300 mb-4"
                onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Expand/Collapse Icon */}
                    <div className="flex-shrink-0">
                      {expandedModule === module.id ? (
                        <ChevronDown className="w-6 h-6 text-[#34D399]" />
                      ) : (
                        <ChevronRight className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Module Icon */}
                    <div className="w-16 h-16 bg-gradient-to-br from-[#34D399]/20 to-[#1A1A1A] rounded-lg flex items-center justify-center">
                      {module.cover_image_url ? (
                        <img
                          src={module.cover_image_url}
                          alt={module.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <BookOpen className="w-8 h-8 text-[#34D399]" />
                      )}
                    </div>
                    
                    {/* Module Info */}
                    <div>
                      <h2 className="text-2xl font-semibold text-white mb-2">
                        {module.title}
                      </h2>
                      {module.description && (
                        <p className="text-gray-400 text-sm max-w-2xl line-clamp-2">
                          {module.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Module Stats */}
                  <div className="text-right">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="bg-[#34D399] text-white px-4 py-2 rounded-full text-sm font-medium">
                        {module.lessons.length} aulas
                      </span>
                      <span className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                        {module.lessons.filter(l => l.is_current).length} atuais
                      </span>
                      {module.lessons.filter(l => !l.is_current).length > 0 && (
                        <span className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                          {module.lessons.filter(l => !l.is_current).length} arquivadas
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">
                      {expandedModule === module.id ? 'Clique para recolher' : 'Clique para expandir'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lessons Grid - Only show when expanded */}
              {expandedModule === module.id && (
                <div className="animate-in slide-in-from-top duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pl-8">
                    {module.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="group cursor-pointer"
                        onClick={() => handleLessonClick(lesson)}
                      >
                        <div className="bg-[#1A1A1A] rounded-lg overflow-hidden hover:bg-[#2A2A2A] transition-all duration-300 group-hover:scale-[1.02] border border-gray-800">
                          <div className="aspect-video bg-gradient-to-br from-[#34D399]/20 to-[#1A1A1A] flex items-center justify-center relative">
                            <Play className="w-10 h-10 text-white opacity-60 group-hover:opacity-100 transition-opacity" />
                            
                            {/* Lesson Status Indicators */}
                            <div className="absolute top-3 left-3 flex space-x-2">
                              {lesson.progress?.is_completed && (
                                <div className="bg-green-500 rounded-full p-1">
                                  <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                              )}
                              {!lesson.is_current && (
                                <div className="bg-orange-500 rounded-full p-1" title="Versão arquivada">
                                  <Archive className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>

                            {/* Duration */}
                            <div className="absolute bottom-3 right-3 bg-black bg-opacity-80 px-2 py-1 rounded text-xs text-white flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDuration(lesson.duration_minutes)}
                            </div>
                          </div>

                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-white font-semibold group-hover:text-[#34D399] transition-colors line-clamp-2">
                                {lesson.title}
                              </h3>
                              {lesson.version && (
                                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded ml-2 flex-shrink-0">
                                  {lesson.version}
                                </span>
                              )}
                            </div>
                            
                            {lesson.description && (
                              <p className="text-gray-400 text-sm line-clamp-2 mb-2">
                                {lesson.description}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>Aula {lesson.order_index}</span>
                              {!lesson.is_current && lesson.archived_at && (
                                <span className="text-orange-400">Arquivada</span>
                              )}
                              {lesson.is_current && (
                                <span className="text-green-400">Atual</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Video Modal */}
      {selectedLesson && (
        <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
          <DialogContent className="max-w-6xl w-full max-h-[90vh] bg-[#1A1A1A] border-gray-700 p-0">
            <div className="relative">
              {/* Video Player */}
              <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
                <PandaVideoPlayer
                  embedUrl={selectedLesson.panda_video_embed_url}
                  title={selectedLesson.title}
                />
              </div>
              
              {/* Lesson Info */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {selectedLesson.title}
                    </h2>
                    {selectedLesson.version && (
                      <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded">
                        Versão {selectedLesson.version}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-gray-400 text-sm mb-1">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatDuration(selectedLesson.duration_minutes)}
                    </div>
                    {!selectedLesson.is_current ? (
                      <span className="text-orange-400 text-sm flex items-center">
                        <Archive className="w-4 h-4 mr-1" />
                        Versão arquivada
                      </span>
                    ) : (
                      <span className="text-green-400 text-sm">Versão atual</span>
                    )}
                  </div>
                </div>
                
                {selectedLesson.description && (
                  <p className="text-gray-300 mb-4">
                    {selectedLesson.description}
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}