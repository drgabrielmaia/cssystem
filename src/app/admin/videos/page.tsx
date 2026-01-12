'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { MetricCard } from '@/components/ui/metric-card'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { supabase } from '@/lib/supabase'
import {
  Play,
  BookOpen,
  Users,
  TrendingUp,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Clock,
  ChevronDown,
  ChevronRight,
  X,
  Save
} from 'lucide-react'

interface VideoModule {
  id: string
  title: string
  description: string
  order_index: number
  thumbnail_url?: string
  cover_image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
  lessons_count?: number
}

interface VideoLesson {
  id: string
  module_id: string
  title: string
  description: string
  panda_video_embed_url: string
  panda_video_id?: string
  duration_minutes: number
  order_index: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface VideoStats {
  total_modules: number
  total_lessons: number
  total_students: number
  completion_rate: number
}

export default function AdminVideosPage() {
  const [modules, setModules] = useState<VideoModule[]>([])
  const [lessons, setLessons] = useState<VideoLesson[]>([])
  const [stats, setStats] = useState<VideoStats>({
    total_modules: 0,
    total_lessons: 0,
    total_students: 0,
    completion_rate: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'modules' | 'lessons'>('modules')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [selectedModule, setSelectedModule] = useState<VideoModule | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<VideoLesson | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [moduleForm, setModuleForm] = useState({ title: '', description: '', cover_image_url: '', order_index: 1, is_active: true })
  const [lessonForm, setLessonForm] = useState({ title: '', description: '', panda_video_embed_url: '', duration_minutes: 0, order_index: 1, module_id: '', is_active: true })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([
      loadModules(),
      loadLessons(),
      loadStats()
    ])
    setLoading(false)
  }

  const loadModules = async () => {
    try {
      const { data, error } = await supabase
        .from('video_modules')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error

      // Buscar contagem de aulas para cada módulo separadamente
      const modulesWithCount = await Promise.all(
        (data || []).map(async (module) => {
          const { count } = await supabase
            .from('video_lessons')
            .select('id', { count: 'exact' })
            .eq('module_id', module.id)

          return {
            ...module,
            lessons_count: count || 0
          }
        })
      )

      setModules(modulesWithCount)
    } catch (error) {
      console.error('Erro ao carregar módulos:', error)
    }
  }

  const loadLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('video_lessons')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error
      setLessons(data || [])
    } catch (error) {
      console.error('Erro ao carregar aulas:', error)
    }
  }

  const loadStats = async () => {
    try {
      const [modulesResult, lessonsResult, studentsResult, progressResult] = await Promise.all([
        supabase.from('video_modules').select('id', { count: 'exact' }),
        supabase.from('video_lessons').select('id', { count: 'exact' }),
        supabase.from('mentorados').select('id', { count: 'exact' }).eq('excluido', false),
        supabase.from('lesson_progress').select('is_completed', { count: 'exact' })
      ])

      const totalModules = modulesResult.count || 0
      const totalLessons = lessonsResult.count || 0
      const totalStudents = studentsResult.count || 0

      const progressData = progressResult.data || []
      const completedLessons = progressData.filter(p => p.is_completed).length
      const completionRate = progressData.length > 0 ? (completedLessons / progressData.length) * 100 : 0

      setStats({
        total_modules: totalModules,
        total_lessons: totalLessons,
        total_students: totalStudents,
        completion_rate: completionRate
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const filteredModules = modules.filter(module =>
    module.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredLessons = lessons.filter(lesson =>
    lesson.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const handleNewModule = () => {
    openModuleModal()
  }

  const handleNewLesson = () => {
    openLessonModal()
  }

  const handleEditModule = (module: VideoModule) => {
    openModuleModal(module)
  }

  const handleEditLesson = (lesson: VideoLesson) => {
    openLessonModal(lesson)
  }

  const handleDeleteModule = async (module: VideoModule) => {
    if (!confirm(`Tem certeza que deseja excluir o módulo "${module.title}"?\n\nIsto também excluirá todas as aulas deste módulo.`)) {
      return
    }

    try {
      setIsLoadingData(true)
      const { error } = await supabase
        .from('video_modules')
        .delete()
        .eq('id', module.id)

      if (error) throw error

      alert('Módulo excluído com sucesso!')
      loadData()
    } catch (error) {
      console.error('Erro ao excluir módulo:', error)
      alert('Erro ao excluir módulo')
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleDeleteLesson = async (lesson: VideoLesson) => {
    if (!confirm(`Tem certeza que deseja excluir a aula "${lesson.title}"?`)) {
      return
    }

    try {
      setIsLoadingData(true)
      const { error } = await supabase
        .from('video_lessons')
        .delete()
        .eq('id', lesson.id)

      if (error) throw error

      alert('Aula excluída com sucesso!')
      loadData()
    } catch (error) {
      console.error('Erro ao excluir aula:', error)
      alert('Erro ao excluir aula')
    } finally {
      setIsLoadingData(false)
    }
  }

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
    } else {
      newExpanded.add(moduleId)
    }
    setExpandedModules(newExpanded)
  }

  const handleSaveModule = async () => {
    try {
      setIsLoadingData(true)

      if (selectedModule) {
        // Editando módulo existente
        const { error } = await supabase
          .from('video_modules')
          .update(moduleForm)
          .eq('id', selectedModule.id)

        if (error) throw error
        alert('Módulo atualizado com sucesso!')
      } else {
        // Criando novo módulo
        const { error } = await supabase
          .from('video_modules')
          .insert([moduleForm])

        if (error) throw error
        alert('Módulo criado com sucesso!')
      }

      setShowModuleModal(false)
      loadData()
    } catch (error) {
      console.error('Erro ao salvar módulo:', error)
      alert('Erro ao salvar módulo')
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleSaveLesson = async () => {
    try {
      setIsLoadingData(true)

      if (selectedLesson) {
        // Editando aula existente
        const { error } = await supabase
          .from('video_lessons')
          .update(lessonForm)
          .eq('id', selectedLesson.id)

        if (error) throw error
        alert('Aula atualizada com sucesso!')
      } else {
        // Criando nova aula
        const { error } = await supabase
          .from('video_lessons')
          .insert([lessonForm])

        if (error) throw error
        alert('Aula criada com sucesso!')
      }

      setShowLessonModal(false)
      loadData()
    } catch (error) {
      console.error('Erro ao salvar aula:', error)
      alert('Erro ao salvar aula')
    } finally {
      setIsLoadingData(false)
    }
  }

  const openModuleModal = (module?: VideoModule) => {
    if (module) {
      setSelectedModule(module)
      setModuleForm({
        title: module.title,
        description: module.description || '',
        cover_image_url: module.cover_image_url || '',
        order_index: module.order_index,
        is_active: module.is_active
      })
    } else {
      setSelectedModule(null)
      setModuleForm({ title: '', description: '', cover_image_url: '', order_index: modules.length + 1, is_active: true })
    }
    setShowModuleModal(true)
  }

  const openLessonModal = (lesson?: VideoLesson) => {
    if (lesson) {
      setSelectedLesson(lesson)
      setLessonForm({
        title: lesson.title,
        description: lesson.description || '',
        panda_video_embed_url: lesson.panda_video_embed_url,
        duration_minutes: lesson.duration_minutes,
        order_index: lesson.order_index,
        module_id: lesson.module_id,
        is_active: lesson.is_active
      })
    } else {
      setSelectedLesson(null)
      setLessonForm({
        title: '',
        description: '',
        panda_video_embed_url: '',
        duration_minutes: 0,
        order_index: lessons.length + 1,
        module_id: modules[0]?.id || '',
        is_active: true
      })
    }
    setShowLessonModal(true)
  }

  const moduleColumns = [
    {
      header: 'Módulo',
      render: (module: VideoModule) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleModule(module.id)}
            className="flex items-center justify-center w-6 h-6 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors"
          >
            {expandedModules.has(module.id) ? (
              <ChevronDown className="w-4 h-4 text-[#475569]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#475569]" />
            )}
          </button>
          <div>
            <p className="font-medium text-[#0F172A]">{module.title}</p>
            <p className="text-sm text-[#64748B]">{module.description}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Ordem',
      render: (module: VideoModule) => (
        <span className="font-medium">{module.order_index}</span>
      )
    },
    {
      header: 'Aulas',
      render: (module: VideoModule) => (
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-[#D4AF37]" />
          <span className="font-medium">{module.lessons_count || 0}</span>
        </div>
      )
    },
    {
      header: 'Status',
      render: (module: VideoModule) => (
        <StatusBadge
          status={module.is_active ? 'confirmed' : 'cancelled'}
          label={module.is_active ? 'Ativo' : 'Inativo'}
        />
      )
    },
    {
      header: 'Criado em',
      render: (module: VideoModule) => (
        <span className="text-sm text-[#475569]">
          {formatDate(module.created_at)}
        </span>
      )
    },
    {
      header: 'Ações',
      render: (module: VideoModule) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditModule(module)}
            className="p-2 text-[#475569] hover:bg-[#F1F5F9] rounded-lg transition-colors"
            title="Editar módulo"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteModule(module)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Excluir módulo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  const lessonColumns = [
    {
      header: 'Aula',
      render: (lesson: VideoLesson) => (
        <div>
          <p className="font-medium text-[#0F172A]">{lesson.title}</p>
          <p className="text-sm text-[#94A3B8]">{lesson.description}</p>
          <p className="text-xs text-[#94A3B8] mt-1">
            Módulo: {(lesson as any).video_modules?.title}
          </p>
        </div>
      )
    },
    {
      header: 'Ordem',
      render: (lesson: VideoLesson) => (
        <span className="font-medium">{lesson.order_index}</span>
      )
    },
    {
      header: 'Duração',
      render: (lesson: VideoLesson) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#F59E0B]" />
          <span className="text-sm">{lesson.duration_minutes}min</span>
        </div>
      )
    },
    {
      header: 'Status',
      render: (lesson: VideoLesson) => (
        <StatusBadge
          status={lesson.is_active ? 'confirmed' : 'cancelled'}
          label={lesson.is_active ? 'Ativo' : 'Inativo'}
        />
      )
    },
    {
      header: 'Criado em',
      render: (lesson: VideoLesson) => (
        <span className="text-sm text-[#475569]">
          {formatDate(lesson.created_at)}
        </span>
      )
    },
    {
      header: 'Ações',
      render: (lesson: VideoLesson) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(lesson.panda_video_embed_url, '_blank')}
            className="p-2 text-[#D4AF37] hover:bg-[#FEF3C7] rounded-lg transition-colors"
            title="Visualizar vídeo"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEditLesson(lesson)}
            className="p-2 text-[#475569] hover:bg-[#F1F5F9] rounded-lg transition-colors"
            title="Editar aula"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteLesson(lesson)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Excluir aula"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <PageLayout title="Gestão de Vídeos" subtitle="Carregando...">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#059669]"></div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Gestão de Vídeos" subtitle="Módulos e aulas para mentorados">
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total de Módulos"
          value={stats.total_modules.toString()}
          change={5}
          changeType="increase"
          icon={BookOpen}
          iconColor="blue"
        />
        <MetricCard
          title="Total de Aulas"
          value={stats.total_lessons.toString()}
          change={8}
          changeType="increase"
          icon={Play}
          iconColor="green"
        />
        <MetricCard
          title="Alunos Ativos"
          value={stats.total_students.toString()}
          change={12}
          changeType="increase"
          icon={Users}
          iconColor="purple"
        />
        <MetricCard
          title="Taxa de Conclusão"
          value={`${stats.completion_rate.toFixed(1)}%`}
          change={2.3}
          changeType="increase"
          icon={TrendingUp}
          iconColor="orange"
        />
      </div>

      {/* Tabs e Controles */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 mb-8">
        <div className="flex flex-col gap-4">
          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-[#F8FAFC] rounded-lg">
            <button
              onClick={() => setActiveTab('modules')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'modules'
                  ? 'bg-white text-[#D4AF37] shadow-sm'
                  : 'text-[#475569] hover:text-[#D4AF37]'
              }`}
            >
              Módulos
            </button>
            <button
              onClick={() => setActiveTab('lessons')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'lessons'
                  ? 'bg-white text-[#D4AF37] shadow-sm'
                  : 'text-[#475569] hover:text-[#D4AF37]'
              }`}
            >
              Aulas
            </button>
          </div>

          {/* Controles */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94A3B8] w-4 h-4" />
              <input
                type="text"
                placeholder={`Buscar ${activeTab === 'modules' ? 'módulos' : 'aulas'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadData}
                className="p-2 text-[#475569] hover:bg-[#F1F5F9] rounded-xl transition-colors"
                disabled={isLoadingData}
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={activeTab === 'modules' ? handleNewModule : handleNewLesson}
                className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] hover:bg-[#B8860B] text-white rounded-xl font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                {activeTab === 'modules' ? 'Novo Módulo' : 'Nova Aula'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="space-y-4">
        {activeTab === 'modules' ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <h3 className="text-lg font-semibold text-[#0F172A]">Módulos de Vídeo</h3>
            </div>
            <div className="p-6">
              {filteredModules.length === 0 ? (
                <div className="text-center py-8 text-[#64748B]">
                  Nenhum módulo encontrado
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredModules.map((module) => {
                    const moduleLessons = lessons.filter(l => l.module_id === module.id)
                    const isExpanded = expandedModules.has(module.id)

                    return (
                      <div key={module.id} className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                        <div className="p-4 bg-[#F8FAFC]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleModule(module.id)}
                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-[#475569]" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-[#475569]" />
                                )}
                              </button>
                              <div>
                                <h4 className="font-semibold text-[#0F172A]">{module.title}</h4>
                                <p className="text-sm text-[#64748B]">{module.description}</p>
                                <div className="flex items-center gap-4 mt-2">
                                  <span className="text-xs text-[#64748B]">Ordem: {module.order_index}</span>
                                  <div className="flex items-center gap-1">
                                    <Play className="w-3 h-3 text-[#D4AF37]" />
                                    <span className="text-xs text-[#64748B]">{module.lessons_count} aulas</span>
                                  </div>
                                  <StatusBadge
                                    status={module.is_active ? 'confirmed' : 'cancelled'}
                                    label={module.is_active ? 'Ativo' : 'Inativo'}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditModule(module)}
                                className="p-2 text-[#475569] hover:bg-white rounded-lg transition-colors"
                                title="Editar módulo"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteModule(module)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir módulo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-[#E2E8F0]">
                            {moduleLessons.length === 0 ? (
                              <div className="p-4 text-center text-[#64748B]">
                                Nenhuma aula neste módulo
                              </div>
                            ) : (
                              <div className="divide-y divide-[#E2E8F0]">
                                {moduleLessons.map((lesson) => (
                                  <div key={lesson.id} className="p-4 flex items-center justify-between hover:bg-[#F8FAFC]">
                                    <div className="flex-1">
                                      <h5 className="font-medium text-[#0F172A]">{lesson.title}</h5>
                                      <p className="text-sm text-[#64748B] mt-1">{lesson.description}</p>
                                      <div className="flex items-center gap-4 mt-2">
                                        <span className="text-xs text-[#64748B]">Ordem: {lesson.order_index}</span>
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-[#F59E0B]" />
                                          <span className="text-xs text-[#64748B]">{lesson.duration_minutes}min</span>
                                        </div>
                                        <StatusBadge
                                          status={lesson.is_active ? 'confirmed' : 'cancelled'}
                                          label={lesson.is_active ? 'Ativo' : 'Inativo'}
                                        />
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                      <button
                                        onClick={() => window.open(lesson.panda_video_embed_url, '_blank')}
                                        className="p-2 text-[#D4AF37] hover:bg-[#FEF3C7] rounded-lg transition-colors"
                                        title="Visualizar vídeo"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleEditLesson(lesson)}
                                        className="p-2 text-[#475569] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                                        title="Editar aula"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLesson(lesson)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Excluir aula"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <DataTable
            columns={lessonColumns}
            data={filteredLessons}
            title="Aulas de Vídeo"
          />
        )}
      </div>

      {/* Modal para Módulos */}
      {showModuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#0F172A]">
                {selectedModule ? 'Editar Módulo' : 'Novo Módulo'}
              </h3>
              <button
                onClick={() => setShowModuleModal(false)}
                className="p-2 text-[#64748B] hover:bg-[#F1F5F9] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">Título</label>
                <input
                  type="text"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-[#0F172A]"
                  placeholder="Nome do módulo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">Descrição</label>
                <textarea
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-[#0F172A]"
                  placeholder="Descrição do módulo"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">URL da Imagem de Capa</label>
                <input
                  type="url"
                  value={moduleForm.cover_image_url}
                  onChange={(e) => setModuleForm(prev => ({ ...prev, cover_image_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-[#0F172A]"
                  placeholder="https://exemplo.com/imagem-capa.jpg"
                />
                <p className="text-xs text-[#64748B] mt-1">
                  Esta imagem será exibida como capa do módulo na página de vídeos
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Ordem</label>
                  <input
                    type="number"
                    value={moduleForm.order_index}
                    onChange={(e) => setModuleForm(prev => ({ ...prev, order_index: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-[#0F172A]"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Status</label>
                  <select
                    value={moduleForm.is_active.toString()}
                    onChange={(e) => setModuleForm(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-[#0F172A]"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModuleModal(false)}
                className="flex-1 px-4 py-2 border border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-[#F8FAFC] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveModule}
                disabled={isLoadingData || !moduleForm.title.trim()}
                className="flex-1 px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#B8860B] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isLoadingData ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Aulas */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#0F172A]">
                {selectedLesson ? 'Editar Aula' : 'Nova Aula'}
              </h3>
              <button
                onClick={() => setShowLessonModal(false)}
                className="p-2 text-[#64748B] hover:bg-[#F1F5F9] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">Módulo</label>
                <select
                  value={lessonForm.module_id}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, module_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-[#0F172A]"
                >
                  <option value="">Selecione um módulo</option>
                  {modules.map(module => (
                    <option key={module.id} value={module.id}>{module.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">Título</label>
                <input
                  type="text"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-[#0F172A]"
                  placeholder="Nome da aula"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">Descrição</label>
                <textarea
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-[#0F172A]"
                  placeholder="Descrição da aula"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">URL do Vídeo (Panda)</label>
                <input
                  type="url"
                  value={lessonForm.panda_video_embed_url}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, panda_video_embed_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-[#0F172A]"
                  placeholder="https://player.pandavideo.com.br/embed/?v=..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Duração (min)</label>
                  <input
                    type="number"
                    value={lessonForm.duration_minutes}
                    onChange={(e) => setLessonForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-[#0F172A]"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">Ordem</label>
                  <input
                    type="number"
                    value={lessonForm.order_index}
                    onChange={(e) => setLessonForm(prev => ({ ...prev, order_index: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-[#0F172A]"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">Status</label>
                <select
                  value={lessonForm.is_active.toString()}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-[#0F172A]"
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLessonModal(false)}
                className="flex-1 px-4 py-2 border border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-[#F8FAFC] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveLesson}
                disabled={isLoadingData || !lessonForm.title.trim() || !lessonForm.module_id}
                className="flex-1 px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#B8860B] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isLoadingData ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}