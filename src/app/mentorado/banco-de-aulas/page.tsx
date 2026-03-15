'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Play, BookOpen, Clock, CheckCircle, Lock, Search, ArrowLeft, Archive,
  ChevronDown, ChevronRight, X, FileText, Save, Loader2, Check,
} from 'lucide-react'
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

  // Lesson viewer state
  const [lessonNote, setLessonNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    if (mentorado && !authLoading) {
      loadAllVideoData(mentorado)
    }
  }, [mentorado, authLoading])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showVideoModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showVideoModal])

  const loadAllVideoData = async (mentoradoData: any) => {
    setLoading(true)
    try {
      if (MOCK_MODE) {
        const mockModules = MOCK_MODULES.map(m => ({
          ...m,
          lessons: m.lessons.map(l => ({ ...l, is_current: true, progress: undefined }))
        }))
        setModules(mockModules as any)
        setLoading(false)
        return
      }

      const dataEntrada = new Date(mentoradoData.data_entrada)
      const hoje = new Date()
      const diasDesdeEntrada = Math.floor((hoje.getTime() - dataEntrada.getTime()) / (1000 * 60 * 60 * 24))

      let accessibleModuleIds: string[] = []

      if (diasDesdeEntrada < 7) {
        const { data: onboardingModule } = await supabase
          .from('video_modules')
          .select('id')
          .eq('title', 'Onboarding')
          .eq('organization_id', mentoradoData.organization_id)
          .eq('is_active', true)
          .single()
        if (onboardingModule) accessibleModuleIds = [onboardingModule.id]
      } else {
        const { data: allModulesData } = await supabase
          .from('video_modules')
          .select('id')
          .eq('organization_id', mentoradoData.organization_id)
          .eq('is_active', true)
        accessibleModuleIds = allModulesData?.map(m => m.id) || []
      }

      if (accessibleModuleIds.length === 0) {
        setModules([])
        setLoading(false)
        return
      }

      const { data: modulesData } = await supabase
        .from('video_modules')
        .select('*')
        .in('id', accessibleModuleIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('video_lessons')
        .select('*, is_current, version, archived_at')
        .in('module_id', accessibleModuleIds)
        .eq('is_active', true)
        .order('module_id', { ascending: true })
        .order('is_current', { ascending: true })
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false })

      if (lessonsError) {
        setModules([])
        setLoading(false)
        return
      }

      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('mentorado_id', mentoradoData.id)

      const modulesWithLessons = (modulesData || []).map(module => ({
        ...module,
        lessons: (lessonsData || [])
          .filter(lesson => lesson.module_id === module.id)
          .map(lesson => ({
            ...lesson,
            progress: progressData?.find(p => p.lesson_id === lesson.id)
          }))
      }))

      setModules(modulesWithLessons)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setModules([])
    } finally {
      setLoading(false)
    }
  }

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
      searchTerm === '' ||
      lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }))

  const handleLessonClick = (lesson: VideoLesson) => {
    setSelectedLesson(lesson)
    setIsCompleted(!!lesson.progress?.is_completed)
    setLessonNote('')
    setNoteSaved(false)
    setShowVideoModal(true)

    if (!MOCK_MODE && mentorado && !lesson.progress) {
      supabase.from('lesson_progress').upsert({
        mentorado_id: mentorado.id,
        lesson_id: lesson.id,
        started_at: new Date().toISOString(),
        watch_time_minutes: 0,
        is_completed: false
      }, { onConflict: 'mentorado_id,lesson_id' }).then(() => {})
    }
  }

  const handleClose = () => {
    setShowVideoModal(false)
    setSelectedLesson(null)
    setLessonNote('')
    setNoteSaved(false)
  }

  const handleSaveNote = async () => {
    if (!lessonNote.trim() || !selectedLesson || !mentorado) return
    setSavingNote(true)
    try {
      const res = await fetch('/api/video/save-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorado_id: mentorado.id,
          lesson_id: selectedLesson.id,
          note_text: lessonNote.trim(),
        })
      })
      if (res.ok) {
        setNoteSaved(true)
        setLessonNote('')
        setTimeout(() => setNoteSaved(false), 3000)
      }
    } catch (e) {
      console.error('Erro ao salvar nota:', e)
    } finally {
      setSavingNote(false)
    }
  }

  const handleCompleteLesson = async () => {
    if (!selectedLesson || !mentorado || MOCK_MODE) return
    setCompleting(true)
    try {
      const { error } = await supabase.from('lesson_progress').upsert({
        mentorado_id: mentorado.id,
        lesson_id: selectedLesson.id,
        completed_at: new Date().toISOString(),
        is_completed: true,
        completed: true,
        started_at: new Date().toISOString(),
        watch_time_minutes: selectedLesson.duration_minutes || 0,
        watch_time_seconds: (selectedLesson.duration_minutes || 0) * 60
      }, { onConflict: 'mentorado_id,lesson_id' })

      if (!error) {
        setIsCompleted(true)
        // Update local modules state
        setModules(prev => prev.map(mod => ({
          ...mod,
          lessons: mod.lessons.map(l =>
            l.id === selectedLesson.id
              ? { ...l, progress: { ...l.progress, is_completed: true, completed_at: new Date().toISOString() } as LessonProgress }
              : l
          )
        })))
      }
    } catch (e) {
      console.error('Erro ao concluir aula:', e)
    } finally {
      setCompleting(false)
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return hours > 0 ? `${hours}h ${remainingMinutes}min` : `${remainingMinutes}min`
  }

  if (authLoading || loading) {
    return (
      <div className="bg-[#0f0f0f] min-h-screen text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" />
          <span className="text-gray-400 text-sm">Carregando aulas...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0f0f0f] min-h-screen text-white">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href="/mentorado" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
            <div className="w-px h-5 bg-white/10" />
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                Banco de Aulas
              </h1>
              <p className="text-gray-500 text-xs mt-0.5">
                {modules.reduce((total, m) => total + m.lessons.length, 0)} aulas disponíveis
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar aulas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 w-64 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        {filteredModules.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-1">
              {searchTerm ? 'Nenhuma aula encontrada' : 'Nenhum módulo disponível'}
            </h3>
            <p className="text-gray-500 text-sm">
              {searchTerm ? 'Tente buscar com outros termos' : 'Entre em contato com seu mentor'}
            </p>
          </div>
        ) : (
          filteredModules.map((module) => {
            const completedCount = module.lessons.filter(l => l.progress?.is_completed).length
            const progressPct = module.lessons.length > 0 ? Math.round((completedCount / module.lessons.length) * 100) : 0
            const isOpen = expandedModule === module.id

            return (
              <div key={module.id} className="rounded-xl overflow-hidden border border-white/5">
                {/* Module Header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/3 transition-colors bg-[#1a1a1a]"
                  onClick={() => setExpandedModule(isOpen ? null : module.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isOpen ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                      {module.cover_image_url ? (
                        <img src={module.cover_image_url} alt={module.title} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <BookOpen className={`w-5 h-5 ${isOpen ? 'text-emerald-400' : 'text-gray-500'}`} />
                      )}
                    </div>
                    <div>
                      <h2 className="font-semibold text-white">{module.title}</h2>
                      {module.description && (
                        <p className="text-gray-500 text-xs mt-0.5 max-w-lg line-clamp-1">{module.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-3 text-right">
                      <div>
                        <div className="text-xs text-gray-400">{completedCount}/{module.lessons.length} concluídas</div>
                        <div className="w-28 h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 bg-white/5 px-2.5 py-1 rounded-full">
                        {module.lessons.length} aulas
                      </span>
                    </div>
                    {isOpen
                      ? <ChevronDown className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    }
                  </div>
                </div>

                {/* Lessons Grid */}
                {isOpen && (
                  <div className="bg-[#141414] p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {module.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="group cursor-pointer rounded-lg overflow-hidden border border-white/5 hover:border-emerald-500/30 bg-[#1e1e1e] hover:bg-[#242424] transition-all"
                          onClick={() => handleLessonClick(lesson)}
                        >
                          {/* Thumbnail */}
                          <div className="aspect-video bg-black relative flex items-center justify-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-transparent" />
                            <div className="relative w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                              <Play className="w-5 h-5 text-white fill-white" />
                            </div>

                            {/* Badges */}
                            <div className="absolute top-2 left-2 flex gap-1.5">
                              {lesson.progress?.is_completed && (
                                <span className="bg-emerald-500 rounded-full p-1">
                                  <CheckCircle className="w-3 h-3 text-white" />
                                </span>
                              )}
                              {!lesson.is_current && (
                                <span className="bg-orange-500/80 rounded-full p-1" title="Versão arquivada">
                                  <Archive className="w-3 h-3 text-white" />
                                </span>
                              )}
                            </div>

                            <div className="absolute bottom-2 right-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-gray-300 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {formatDuration(lesson.duration_minutes)}
                            </div>
                          </div>

                          {/* Info */}
                          <div className="p-3">
                            <h3 className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                              {lesson.title}
                            </h3>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] text-gray-600">Aula {lesson.order_index}</span>
                              {lesson.is_current
                                ? <span className="text-[10px] text-emerald-500">Atual</span>
                                : <span className="text-[10px] text-orange-400">Arquivada</span>
                              }
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ===== FULLSCREEN LESSON OVERLAY ===== */}
      {showVideoModal && selectedLesson && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={handleClose}
                className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                Aulas
              </button>
              <div className="w-px h-4 bg-white/10 flex-shrink-0" />
              <div className="flex items-center gap-2 min-w-0">
                {!selectedLesson.is_current && (
                  <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full flex-shrink-0">Arquivada</span>
                )}
                <h2 className="text-sm font-medium text-white truncate">{selectedLesson.title}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(selectedLesson.duration_minutes)}
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Main content: video + sidebar */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Video area */}
            <div className="flex-1 min-w-0 flex flex-col bg-black">
              {/* 16:9 video container */}
              <div className="w-full" style={{ maxHeight: 'calc(100vh - 52px - 0px)' }}>
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <div className="absolute inset-0">
                    <PandaVideoPlayer
                      embedUrl={selectedLesson.panda_video_embed_url}
                      title={selectedLesson.title}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="w-80 flex-shrink-0 border-l border-white/5 bg-[#111] flex flex-col overflow-y-auto hidden lg:flex">
              {/* Lesson info */}
              <div className="p-5 border-b border-white/5">
                <h3 className="font-semibold text-white text-sm leading-snug mb-1">{selectedLesson.title}</h3>
                {selectedLesson.description && (
                  <p className="text-gray-400 text-xs leading-relaxed mt-2">{selectedLesson.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(selectedLesson.duration_minutes)}</span>
                  {selectedLesson.version && <span className="bg-white/5 px-2 py-0.5 rounded">v{selectedLesson.version}</span>}
                </div>
              </div>

              {/* Complete button */}
              <div className="p-5 border-b border-white/5">
                <button
                  onClick={handleCompleteLesson}
                  disabled={isCompleted || completing}
                  className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    isCompleted
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-white'
                  }`}
                >
                  {completing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCompleted ? (
                    <><Check className="w-4 h-4" /> Aula concluída</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Marcar como concluída</>
                  )}
                </button>
              </div>

              {/* Notes */}
              <div className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-white">Anotações</span>
                </div>
                <textarea
                  value={lessonNote}
                  onChange={(e) => setLessonNote(e.target.value)}
                  placeholder="Escreva suas anotações sobre esta aula..."
                  rows={6}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/40 resize-none transition-colors leading-relaxed"
                />
                <button
                  onClick={handleSaveNote}
                  disabled={!lessonNote.trim() || savingNote}
                  className={`w-full py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    noteSaved
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-40'
                  }`}
                >
                  {savingNote ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : noteSaved ? (
                    <><Check className="w-3.5 h-3.5" /> Nota salva!</>
                  ) : (
                    <><Save className="w-3.5 h-3.5" /> Salvar nota</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile bottom bar (shown on small screens instead of sidebar) */}
          <div className="lg:hidden border-t border-white/5 bg-[#111] px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleCompleteLesson}
              disabled={isCompleted || completing}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                isCompleted
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-white'
              }`}
            >
              {completing ? <Loader2 className="w-4 h-4 animate-spin" /> :
               isCompleted ? <><Check className="w-4 h-4" /> Concluída</> :
               <><CheckCircle className="w-4 h-4" /> Marcar concluída</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
