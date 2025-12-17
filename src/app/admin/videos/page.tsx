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
  Clock
} from 'lucide-react'

interface VideoModule {
  id: string
  title: string
  description: string
  order_index: number
  thumbnail_url?: string
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
        .select(`
          *,
          lessons_count:video_lessons(count)
        `)
        .order('order_index', { ascending: true })

      if (error) throw error

      setModules(data?.map(module => ({
        ...module,
        lessons_count: module.lessons_count?.[0]?.count || 0
      })) || [])
    } catch (error) {
      console.error('Erro ao carregar módulos:', error)
    }
  }

  const loadLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('video_lessons')
        .select(`
          *,
          video_modules(title)
        `)
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
    setSelectedModule(null)
    setShowModuleModal(true)
  }

  const handleNewLesson = () => {
    setSelectedLesson(null)
    setShowLessonModal(true)
  }

  const handleEditModule = (module: VideoModule) => {
    setSelectedModule(module)
    setShowModuleModal(true)
  }

  const handleEditLesson = (lesson: VideoLesson) => {
    setSelectedLesson(lesson)
    setShowLessonModal(true)
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

  const moduleColumns = [
    {
      header: 'Módulo',
      render: (module: VideoModule) => (
        <div>
          <p className="font-medium text-[#0F172A]">{module.title}</p>
          <p className="text-sm text-[#94A3B8]">{module.description}</p>
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
          <Play className="w-4 h-4 text-blue-500" />
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
          <Clock className="w-4 h-4 text-orange-500" />
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
            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
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
                  ? 'bg-white text-[#059669] shadow-sm'
                  : 'text-[#475569] hover:text-[#059669]'
              }`}
            >
              Módulos
            </button>
            <button
              onClick={() => setActiveTab('lessons')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'lessons'
                  ? 'bg-white text-[#059669] shadow-sm'
                  : 'text-[#475569] hover:text-[#059669]'
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
                className="flex items-center gap-2 px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                {activeTab === 'modules' ? 'Novo Módulo' : 'Nova Aula'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      {activeTab === 'modules' ? (
        <DataTable
          columns={moduleColumns}
          data={filteredModules}
          title="Módulos de Vídeo"
        />
      ) : (
        <DataTable
          columns={lessonColumns}
          data={filteredLessons}
          title="Aulas de Vídeo"
        />
      )}
    </PageLayout>
  )
}