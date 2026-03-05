'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { MetricCard } from '@/components/ui/metric-card'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { supabase } from '@/lib/supabase'
import { useDraggable } from '@/hooks/use-draggable'
import { useAuth } from '@/contexts/auth'
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
  Save,
  Upload,
  Download,
  FileText,
  Archive,
  CheckCircle,
  AlertCircle,
  Star,
  MessageCircle,
  Bell,
  BellOff
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
  pdf_url?: string
  pdf_filename?: string
  pdf_size_bytes?: number
  pdf_uploaded_at?: string
  created_at: string
  updated_at: string
  // Campos de versionamento
  is_current?: boolean
  version?: string
  archived_at?: string
  replaced_by?: string
  archive_reason?: string
}

interface VideoStats {
  total_modules: number
  total_lessons: number
  total_students: number
  completion_rate: number
}

export default function AdminVideosPage() {
  const { organizationId } = useAuth()
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
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    panda_video_embed_url: '',
    duration_minutes: 0,
    order_index: 1,
    module_id: '',
    is_active: true,
    is_current: true  // Novas aulas começam como atuais
  })
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [lessonPdfs, setLessonPdfs] = useState<any[]>([])
  const [loadingPdfs, setLoadingPdfs] = useState(false)

  // WhatsApp group notification config
  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false)
  const [whatsAppGroups, setWhatsAppGroups] = useState<{ id: string; name: string }[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [autoNotifyAula, setAutoNotifyAula] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)

  // Draggable hooks for modals
  const { ref: draggableModuleRef, isDragging: isModuleDragging } = useDraggable({
    enabled: showModuleModal,
    handle: '[data-drag-handle="module-modal"]'
  })
  const { ref: draggableLessonRef, isDragging: isLessonDragging } = useDraggable({
    enabled: showLessonModal,
    handle: '[data-drag-handle="lesson-modal"]'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([
      loadModules(),
      loadLessons(),
      loadStats(),
      loadWhatsAppConfig()
    ])
    setLoading(false)
  }

  const loadWhatsAppConfig = async () => {
    const orgId = organizationId || '9c8c0033-15ea-4e33-a55f-28d81a19693b'
    try {
      const { data } = await supabase
        .from('organizations')
        .select('whatsapp_group_aulas, whatsapp_auto_notify_aula')
        .eq('id', orgId)
        .single()

      if (data) {
        setSelectedGroupId(data.whatsapp_group_aulas || '')
        setAutoNotifyAula(data.whatsapp_auto_notify_aula || false)
      }
    } catch (err) {
      console.error('Erro ao carregar config WhatsApp:', err)
    }
  }

  const loadWhatsAppGroups = async () => {
    setLoadingGroups(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'
      const orgId = organizationId || '9c8c0033-15ea-4e33-a55f-28d81a19693b'
      const res = await fetch(`${apiUrl}/api/whatsapp/groups?userId=default`)
      const json = await res.json()
      if (json.success && json.groups) {
        setWhatsAppGroups(json.groups.map((g: any) => ({ id: g.id, name: g.name || g.subject || g.id })))
      }
    } catch (err) {
      console.error('Erro ao carregar grupos WhatsApp:', err)
    } finally {
      setLoadingGroups(false)
    }
  }

  const handleSaveWhatsAppConfig = async () => {
    setSavingConfig(true)
    try {
      const orgId = organizationId || '9c8c0033-15ea-4e33-a55f-28d81a19693b'
      const { error } = await supabase
        .from('organizations')
        .update({
          whatsapp_group_aulas: selectedGroupId || null,
          whatsapp_auto_notify_aula: autoNotifyAula
        })
        .eq('id', orgId)

      if (error) throw error
      alert('Configuracao salva com sucesso!')
      setShowWhatsAppConfig(false)
    } catch (err: any) {
      console.error('Erro ao salvar config:', err)
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setSavingConfig(false)
    }
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
        supabase.from('mentorados').select('id', { count: 'exact' }),
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

  const handleToggleLessonStatus = async (lesson: VideoLesson) => {
    const newStatus = !lesson.is_current
    const actionText = newStatus ? 'marcar como atual' : 'arquivar'

    if (!confirm(`Tem certeza que deseja ${actionText} a aula "${lesson.title}"?`)) {
      return
    }

    try {
      setIsLoadingData(true)
      const { error } = await supabase
        .from('video_lessons')
        .update({
          is_current: newStatus,
          archived_at: newStatus ? null : new Date().toISOString(),
          archive_reason: newStatus ? null : 'Arquivado manualmente pelo admin'
        })
        .eq('id', lesson.id)

      if (error) throw error

      alert(`Aula ${newStatus ? 'marcada como atual' : 'arquivada'} com sucesso!`)
      loadLessons()
    } catch (error) {
      console.error('Erro ao alterar status da aula:', error)
      alert('Erro ao alterar status da aula')
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
        // Criando novo módulo - usar organização padrão
        // TODO: Implementar lógica para buscar organization_id do admin quando a tabela admins existir
        const moduleDataWithOrg = {
          ...moduleForm,
          organization_id: '9c8c0033-15ea-4e33-a55f-28d81a19693b' // Médicos de Resultado
        }

        const { error } = await supabase
          .from('video_modules')
          .insert([moduleDataWithOrg])

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

  // Carregar PDFs de uma aula
  const loadLessonPdfs = async (lessonId: string) => {
    setLoadingPdfs(true)
    try {
      // Primeiro, verificar se existe PDF no campo antigo (retrocompatibilidade)
      const lesson = lessons.find(l => l.id === lessonId)
      const pdfs = []

      if (lesson?.pdf_url) {
        pdfs.push({
          id: 'legacy-pdf',
          filename: lesson.pdf_filename || 'Material de apoio',
          url: lesson.pdf_url,
          size_bytes: lesson.pdf_size_bytes || 0,
          uploaded_at: lesson.pdf_uploaded_at || new Date().toISOString()
        })
      }

      setLessonPdfs(pdfs)
    } catch (error) {
      console.error('Erro ao carregar PDFs:', error)
    } finally {
      setLoadingPdfs(false)
    }
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
        is_active: lesson.is_active,
        is_current: lesson.is_current ?? false
      })
      loadLessonPdfs(lesson.id)
    } else {
      setSelectedLesson(null)
      setLessonForm({
        title: '',
        description: '',
        panda_video_embed_url: '',
        duration_minutes: 0,
        order_index: lessons.length + 1,
        module_id: modules[0]?.id || '',
        is_active: true,
        is_current: true  // Novas aulas começam como atuais
      })
      setLessonPdfs([])
    }
    setShowLessonModal(true)
  }

  const handleUploadPdf = async () => {
    if (!selectedFile || !selectedLesson) return

    try {
      setUploadingPdf(true)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('id', selectedLesson.id)

      const response = await fetch('/api/video/upload-pdf-fallback', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        alert('PDF enviado com sucesso!')
        setSelectedFile(null)
        // Recarregar dados para mostrar o novo PDF
        await loadLessons()
        await loadLessonPdfs(selectedLesson.id)

        // Atualizar o selectedLesson para mostrar o novo PDF
        const updatedLesson = lessons.find(l => l.id === selectedLesson.id)
        if (updatedLesson) {
          setSelectedLesson(updatedLesson)
        }
      } else {
        alert(`Erro ao enviar PDF: ${result.error}`)
      }
    } catch (error) {
      console.error('Erro no upload do PDF:', error)
      alert('Erro ao enviar PDF')
    } finally {
      setUploadingPdf(false)
    }
  }

  const handleRemovePdf = async (lessonId: string) => {
    if (!confirm('Tem certeza que deseja remover o PDF desta aula?')) return

    try {
      const response = await fetch(`/api/video/upload-pdf?lesson_id=${lessonId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (response.ok) {
        alert('PDF removido com sucesso!')
        // Recarregar dados
        await loadLessons()

        // Atualizar o selectedLesson
        const updatedLesson = lessons.find(l => l.id === lessonId)
        if (updatedLesson) {
          setSelectedLesson(updatedLesson)
        }
      } else {
        alert(`Erro ao remover PDF: ${result.error}`)
      }
    } catch (error) {
      console.error('Erro ao remover PDF:', error)
      alert('Erro ao remover PDF')
    }
  }

  const handleRemoveSpecificPdf = async (pdfId: string, pdfUrl: string) => {
    if (!selectedLesson) return

    if (!confirm('Tem certeza que deseja remover este PDF?')) return

    try {
      setLoadingPdfs(true)

      if (pdfId === 'legacy-pdf') {
        // Remover PDF do campo antigo
        const response = await fetch(`/api/video/upload-pdf-fallback?lesson_id=${selectedLesson.id}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          alert('PDF removido com sucesso!')
          await loadLessonPdfs(selectedLesson.id)
          await loadLessons()
        } else {
          alert('Erro ao remover PDF')
        }
      }
      // Aqui você pode adicionar remoção para novos PDFs quando implementar a tabela
    } catch (error) {
      console.error('Erro ao remover PDF:', error)
      alert('Erro ao remover PDF')
    } finally {
      setLoadingPdfs(false)
    }
  }

  // --- Column definitions (kept for DataTable, now dark-themed) ---
  const moduleColumns = [
    {
      header: 'Modulo',
      render: (module: VideoModule) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleModule(module.id)}
            className="flex items-center justify-center w-6 h-6 rounded bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
          >
            {expandedModules.has(module.id) ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <div>
            <p className="font-medium text-white">{module.title}</p>
            <p className="text-sm text-gray-500">{module.description}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Ordem',
      render: (module: VideoModule) => (
        <span className="font-medium text-gray-300">{module.order_index}</span>
      )
    },
    {
      header: 'Aulas',
      render: (module: VideoModule) => (
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-[#D4AF37]" />
          <span className="font-medium text-gray-300">{module.lessons_count || 0}</span>
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
        <span className="text-sm text-gray-500">
          {formatDate(module.created_at)}
        </span>
      )
    },
    {
      header: 'Acoes',
      render: (module: VideoModule) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleEditModule(module)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
            title="Editar modulo"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteModule(module)}
            className="p-2 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Excluir modulo"
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
          <p className="font-medium text-white">{lesson.title}</p>
          <p className="text-sm text-gray-500">{lesson.description}</p>
          <p className="text-xs text-gray-600 mt-1">
            Modulo: {(lesson as any).video_modules?.title}
          </p>
        </div>
      )
    },
    {
      header: 'Ordem',
      render: (lesson: VideoLesson) => (
        <span className="font-medium text-gray-300">{lesson.order_index}</span>
      )
    },
    {
      header: 'Duracao',
      render: (lesson: VideoLesson) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-gray-300">{lesson.duration_minutes}min</span>
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
        <span className="text-sm text-gray-500">
          {formatDate(lesson.created_at)}
        </span>
      )
    },
    {
      header: 'Acoes',
      render: (lesson: VideoLesson) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => window.open(lesson.panda_video_embed_url, '_blank')}
            className="p-2 text-[#D4AF37]/70 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg transition-colors"
            title="Visualizar video"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEditLesson(lesson)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
            title="Editar aula"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteLesson(lesson)}
            className="p-2 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Excluir aula"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  // --- Loading state ---
  if (loading) {
    return (
      <PageLayout title="Gestao de Videos" subtitle="Carregando...">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-white/[0.06]" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-t-[#D4AF37] animate-spin" />
          </div>
          <p className="text-sm text-gray-500">Carregando modulos e aulas...</p>
        </div>
      </PageLayout>
    )
  }

  // Helper: total duration for a module
  const getModuleTotalDuration = (moduleId: string) => {
    return lessons
      .filter(l => l.module_id === moduleId)
      .reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
  }

  // Helper: active lesson ratio for progress bar
  const getModuleCompletionRatio = (moduleId: string) => {
    const moduleLessons = lessons.filter(l => l.module_id === moduleId)
    if (moduleLessons.length === 0) return 0
    const activeLessons = moduleLessons.filter(l => l.is_active)
    return (activeLessons.length / moduleLessons.length) * 100
  }

  return (
    <PageLayout title="Gestao de Videos" subtitle="Modulos e aulas para mentorados">
      {/* =============== STAT CARDS =============== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Modules */}
        <div className="bg-[#141418] p-5 rounded-xl ring-1 ring-white/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total de Modulos</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.total_modules}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Lessons */}
        <div className="bg-[#141418] p-5 rounded-xl ring-1 ring-white/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total de Aulas</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.total_lessons}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Play className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Students */}
        <div className="bg-[#141418] p-5 rounded-xl ring-1 ring-white/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Alunos Ativos</p>
              <p className="text-2xl font-bold text-purple-400 mt-1">{stats.total_students}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-[#141418] p-5 rounded-xl ring-1 ring-white/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Taxa de Conclusao</p>
              <p className="text-2xl font-bold text-[#D4AF37] mt-1">{stats.completion_rate.toFixed(1)}%</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
            </div>
          </div>
          {/* Mini progress ring */}
          <div className="mt-3">
            <div className="w-full h-1.5 rounded-full bg-white/[0.06]">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F5D76E] transition-all duration-700"
                style={{ width: `${Math.min(stats.completion_rate, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* =============== TABS + SEARCH + CONTROLS =============== */}
      <div className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] p-5 mb-6">
        <div className="flex flex-col gap-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-white/[0.03] rounded-lg ring-1 ring-white/[0.04] w-fit">
            <button
              onClick={() => setActiveTab('modules')}
              className={`px-5 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'modules'
                  ? 'bg-[#D4AF37]/15 text-[#D4AF37] ring-1 ring-[#D4AF37]/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
              }`}
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Modulos
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === 'modules' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/[0.06] text-gray-500'
                }`}>
                  {modules.length}
                </span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('lessons')}
              className={`px-5 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'lessons'
                  ? 'bg-[#D4AF37]/15 text-[#D4AF37] ring-1 ring-[#D4AF37]/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Aulas
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === 'lessons' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/[0.06] text-gray-500'
                }`}>
                  {lessons.length}
                </span>
              </span>
            </button>
          </div>

          {/* Search + Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder={`Buscar ${activeTab === 'modules' ? 'modulos' : 'aulas'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowWhatsAppConfig(true); loadWhatsAppGroups() }}
                className={`flex items-center gap-2 p-2.5 rounded-lg ring-1 transition-colors ${
                  autoNotifyAula
                    ? 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20 hover:bg-emerald-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.06] ring-white/[0.06]'
                }`}
                title={autoNotifyAula ? 'Notificacoes WhatsApp ativas' : 'Configurar notificacoes WhatsApp'}
              >
                <MessageCircle className="w-4 h-4" />
                {autoNotifyAula ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
              </button>
              <button
                onClick={loadData}
                className="p-2.5 text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-lg ring-1 ring-white/[0.06] transition-colors"
                disabled={isLoadingData}
                title="Atualizar dados"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
              </button>

              {activeTab === 'lessons' && (
                <a
                  href="/admin/videos/cadastrar"
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 rounded-lg ring-1 ring-purple-500/20 font-medium text-sm transition-colors"
                >
                  <Star className="w-4 h-4" />
                  Criar Aula Facil
                </a>
              )}

              <button
                onClick={activeTab === 'modules' ? handleNewModule : handleNewLesson}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#c4a030] text-black rounded-lg font-medium text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                {activeTab === 'modules' ? 'Novo Modulo' : 'Nova Aula'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =============== CONTENT AREA =============== */}
      <div className="space-y-4">
        {activeTab === 'modules' ? (
          <>
            {filteredModules.length === 0 ? (
              /* Empty State - Modules */
              <div className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] flex items-center justify-center mb-5">
                    <BookOpen className="w-7 h-7 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {searchTerm ? 'Nenhum modulo encontrado' : 'Nenhum modulo cadastrado'}
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm mb-6">
                    {searchTerm
                      ? `Nenhum resultado para "${searchTerm}". Tente uma busca diferente.`
                      : 'Comece criando seu primeiro modulo de video para organizar suas aulas.'
                    }
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={handleNewModule}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] hover:bg-[#c4a030] text-black rounded-lg font-medium text-sm transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Criar Primeiro Modulo
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Module Cards */
              <div className="space-y-3">
                {filteredModules.map((module) => {
                  const moduleLessons = lessons.filter(l => l.module_id === module.id)
                  const isExpanded = expandedModules.has(module.id)
                  const totalDuration = getModuleTotalDuration(module.id)
                  const completionRatio = getModuleCompletionRatio(module.id)
                  const activeLessonCount = moduleLessons.filter(l => l.is_active).length
                  const archivedCount = moduleLessons.filter(l => l.is_current === false).length
                  const hasPdfs = moduleLessons.some(l => l.pdf_url)

                  return (
                    <div
                      key={module.id}
                      className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] overflow-hidden transition-all"
                    >
                      {/* Module Header */}
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Cover image / placeholder */}
                          <div className="relative flex-shrink-0">
                            {module.cover_image_url ? (
                              <div className="w-20 h-14 rounded-lg overflow-hidden ring-1 ring-white/[0.06]">
                                <img
                                  src={module.cover_image_url}
                                  alt={module.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-20 h-14 rounded-lg bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 ring-1 ring-white/[0.06] flex items-center justify-center">
                                <Play className="w-5 h-5 text-[#D4AF37]/60" />
                              </div>
                            )}
                            {/* Order badge */}
                            <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-[#D4AF37] text-black text-xs font-bold flex items-center justify-center ring-2 ring-[#141418]">
                              {module.order_index}
                            </div>
                          </div>

                          {/* Module info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-white truncate">{module.title}</h4>
                              {!module.is_active && (
                                <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
                                  Inativo
                                </span>
                              )}
                            </div>
                            {module.description && (
                              <p className="text-sm text-gray-500 line-clamp-1 mb-2">{module.description}</p>
                            )}

                            {/* Meta chips */}
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Lesson count badge */}
                              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/[0.04] text-gray-300 ring-1 ring-white/[0.06]">
                                <Play className="w-3 h-3 text-[#D4AF37]" />
                                {module.lessons_count || 0} {(module.lessons_count || 0) === 1 ? 'aula' : 'aulas'}
                              </span>

                              {/* Total duration */}
                              {totalDuration > 0 && (
                                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/[0.04] text-gray-300 ring-1 ring-white/[0.06]">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  {totalDuration >= 60
                                    ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}min`
                                    : `${totalDuration}min`
                                  }
                                </span>
                              )}

                              {/* PDF indicator */}
                              {hasPdfs && (
                                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                                  <FileText className="w-3 h-3" />
                                  PDF
                                </span>
                              )}

                              {/* Archived count */}
                              {archivedCount > 0 && (
                                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20">
                                  <Archive className="w-3 h-3" />
                                  {archivedCount} arquivada{archivedCount > 1 ? 's' : ''}
                                </span>
                              )}

                              {/* Created date */}
                              <span className="text-xs text-gray-600">
                                Criado em {formatDate(module.created_at)}
                              </span>
                            </div>

                            {/* Module progress bar */}
                            {moduleLessons.length > 0 && (
                              <div className="mt-3 flex items-center gap-3">
                                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06]">
                                  <div
                                    className="h-1.5 rounded-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${completionRatio}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 flex-shrink-0">
                                  {activeLessonCount}/{moduleLessons.length} ativas
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleEditModule(module)}
                              className="p-2 text-gray-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                              title="Editar modulo"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteModule(module)}
                              className="p-2 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Excluir modulo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleModule(module.id)}
                              className={`p-2 rounded-lg transition-all ${
                                isExpanded
                                  ? 'text-[#D4AF37] bg-[#D4AF37]/10'
                                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]'
                              }`}
                              title={isExpanded ? 'Recolher aulas' : 'Expandir aulas'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Lessons List */}
                      {isExpanded && (
                        <div className="border-t border-white/[0.06]">
                          {moduleLessons.length === 0 ? (
                            /* Empty lessons state */
                            <div className="p-8 flex flex-col items-center justify-center text-center">
                              <div className="w-12 h-12 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] flex items-center justify-center mb-3">
                                <Play className="w-5 h-5 text-gray-600" />
                              </div>
                              <p className="text-sm text-gray-500 mb-3">Nenhuma aula neste modulo</p>
                              <button
                                onClick={() => {
                                  setLessonForm(prev => ({ ...prev, module_id: module.id }))
                                  handleNewLesson()
                                }}
                                className="text-sm text-[#D4AF37] hover:text-[#F5D76E] transition-colors flex items-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Adicionar aula
                              </button>
                            </div>
                          ) : (
                            <div>
                              {moduleLessons.map((lesson, index) => {
                                const isArchived = lesson.is_current === false
                                return (
                                  <div
                                    key={lesson.id}
                                    className={`flex items-center gap-4 px-5 py-3.5 transition-colors group ${
                                      isArchived
                                        ? 'bg-orange-500/[0.03] hover:bg-orange-500/[0.06]'
                                        : 'hover:bg-white/[0.02]'
                                    } ${index > 0 ? 'border-t border-white/[0.04]' : ''}`}
                                  >
                                    {/* Lesson number */}
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-semibold ${
                                      isArchived
                                        ? 'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20'
                                        : 'bg-white/[0.04] text-gray-400 ring-1 ring-white/[0.06]'
                                    }`}>
                                      {lesson.order_index}
                                    </div>

                                    {/* Lesson info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <h5 className={`font-medium truncate ${isArchived ? 'text-gray-400' : 'text-white'}`}>
                                          {lesson.title}
                                        </h5>
                                        {/* Version / archive badge */}
                                        {isArchived ? (
                                          <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20">
                                            <Archive className="w-2.5 h-2.5" />
                                            Arquivada {lesson.version ? `(${lesson.version})` : ''}
                                          </span>
                                        ) : (
                                          <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                                            <CheckCircle className="w-2.5 h-2.5" />
                                            Atual {lesson.version ? `(${lesson.version})` : ''}
                                          </span>
                                        )}
                                        {/* PDF indicator */}
                                        {lesson.pdf_url && (
                                          <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                                            <FileText className="w-2.5 h-2.5" />
                                            PDF
                                          </span>
                                        )}
                                        {!lesson.is_active && (
                                          <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
                                            Inativo
                                          </span>
                                        )}
                                      </div>
                                      {lesson.description && (
                                        <p className="text-xs text-gray-500 truncate">{lesson.description}</p>
                                      )}
                                    </div>

                                    {/* Duration */}
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
                                      <Clock className="w-3 h-3 text-amber-400/70" />
                                      {lesson.duration_minutes}min
                                    </div>

                                    {/* Lesson actions */}
                                    <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => window.open(lesson.panda_video_embed_url, '_blank')}
                                        className="p-1.5 text-[#D4AF37]/60 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-md transition-colors"
                                        title="Visualizar video"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleEditLesson(lesson)}
                                        className="p-1.5 text-gray-500 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors"
                                        title="Editar aula"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleToggleLessonStatus(lesson)}
                                        className={`p-1.5 rounded-md transition-colors ${
                                          isArchived
                                            ? 'text-emerald-500/60 hover:text-emerald-400 hover:bg-emerald-500/10'
                                            : 'text-orange-500/60 hover:text-orange-400 hover:bg-orange-500/10'
                                        }`}
                                        title={isArchived ? 'Marcar como atual' : 'Arquivar aula'}
                                      >
                                        {isArchived ? (
                                          <CheckCircle className="w-3.5 h-3.5" />
                                        ) : (
                                          <Archive className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLesson(lesson)}
                                        className="p-1.5 text-red-400/40 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                        title="Excluir aula"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                              {/* Add lesson inline */}
                              <div className="border-t border-white/[0.04] px-5 py-2.5">
                                <button
                                  onClick={() => {
                                    setLessonForm(prev => ({ ...prev, module_id: module.id }))
                                    handleNewLesson()
                                  }}
                                  className="text-xs text-gray-500 hover:text-[#D4AF37] transition-colors flex items-center gap-1.5"
                                >
                                  <Plus className="w-3 h-3" />
                                  Adicionar aula a este modulo
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          /* ---- Lessons Tab (DataTable) ---- */
          <>
            {filteredLessons.length === 0 ? (
              <div className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] flex items-center justify-center mb-5">
                    <Play className="w-7 h-7 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {searchTerm ? 'Nenhuma aula encontrada' : 'Nenhuma aula cadastrada'}
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm mb-6">
                    {searchTerm
                      ? `Nenhum resultado para "${searchTerm}". Tente uma busca diferente.`
                      : 'Crie modulos primeiro e depois adicione aulas a eles.'
                    }
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={handleNewLesson}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] hover:bg-[#c4a030] text-black rounded-lg font-medium text-sm transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Criar Primeira Aula
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <DataTable
                columns={lessonColumns}
                data={filteredLessons}
                title="Aulas de Video"
              />
            )}
          </>
        )}
      </div>

      {/* =============== MODULE MODAL =============== */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModuleModal(false)}
          />
          {/* Modal */}
          <div
            ref={draggableModuleRef}
            className={`relative bg-[#141418] rounded-xl ring-1 ring-white/[0.06] w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col ${isModuleDragging ? 'select-none' : ''}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div
                data-drag-handle="module-modal"
                className="flex items-center gap-3 cursor-move flex-1"
              >
                <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/15 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {selectedModule ? 'Editar Modulo' : 'Novo Modulo'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedModule ? 'Atualize as informacoes do modulo' : 'Preencha os dados do novo modulo'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModuleModal(false)}
                className="p-2 text-gray-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Titulo <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all text-sm"
                  placeholder="Nome do modulo"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Descricao</label>
                <textarea
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all text-sm resize-none"
                  placeholder="Descricao do modulo"
                  rows={3}
                />
              </div>

              {/* Cover Image URL */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">URL da Imagem de Capa</label>
                <input
                  type="url"
                  value={moduleForm.cover_image_url}
                  onChange={(e) => setModuleForm(prev => ({ ...prev, cover_image_url: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all text-sm"
                  placeholder="https://exemplo.com/imagem-capa.jpg"
                />
                {moduleForm.cover_image_url && (
                  <div className="mt-2 rounded-lg overflow-hidden ring-1 ring-white/[0.06] h-32">
                    <img
                      src={moduleForm.cover_image_url}
                      alt="Preview da capa"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
                <p className="text-xs text-gray-600">
                  Esta imagem sera exibida como capa do modulo na pagina de videos
                </p>
              </div>

              {/* Order + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Ordem</label>
                  <input
                    type="number"
                    value={moduleForm.order_index}
                    onChange={(e) => setModuleForm(prev => ({ ...prev, order_index: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3.5 py-2.5 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all text-sm"
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Status</label>
                  <select
                    value={moduleForm.is_active.toString()}
                    onChange={(e) => setModuleForm(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                    className="w-full px-3.5 py-2.5 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all text-sm appearance-none"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-white/[0.06]">
              <button
                onClick={() => setShowModuleModal(false)}
                className="flex-1 px-4 py-2.5 text-gray-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] ring-1 ring-white/[0.06] rounded-lg transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveModule}
                disabled={isLoadingData || !moduleForm.title.trim()}
                className="flex-1 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#c4a030] text-black rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
              >
                {isLoadingData ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Modulo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============== LESSON MODAL =============== */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLessonModal(false)}
          />
          {/* Modal */}
          <div
            ref={draggableLessonRef}
            className={`relative bg-[#141418] rounded-xl ring-1 ring-white/[0.06] w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col ${isLessonDragging ? 'select-none' : ''}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div
                data-drag-handle="lesson-modal"
                className="flex items-center gap-3 cursor-move flex-1"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <Play className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {selectedLesson ? 'Editar Aula' : 'Nova Aula'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedLesson ? 'Atualize as informacoes da aula' : 'Preencha os dados da nova aula'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLessonModal(false)}
                className="p-2 text-gray-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Module select */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Modulo <span className="text-red-400">*</span>
                </label>
                <select
                  value={lessonForm.module_id}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, module_id: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all text-sm appearance-none"
                >
                  <option value="">Selecione um modulo</option>
                  {modules.map(module => (
                    <option key={module.id} value={module.id}>{module.title}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Titulo <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all text-sm"
                  placeholder="Nome da aula"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Descricao</label>
                <textarea
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all text-sm resize-none"
                  placeholder="Descricao da aula"
                  rows={2}
                />
              </div>

              {/* Video URL */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">URL do Video (Panda)</label>
                <input
                  type="url"
                  value={lessonForm.panda_video_embed_url}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, panda_video_embed_url: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all text-sm"
                  placeholder="https://player.pandavideo.com.br/embed/?v=..."
                />
              </div>

              {/* PDF Materials Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <label className="text-sm font-medium text-gray-300">Materiais de Apoio (PDFs)</label>
                  </div>
                  <span className="text-xs text-gray-600 px-2 py-0.5 rounded-full bg-white/[0.04] ring-1 ring-white/[0.06]">
                    {lessonPdfs.length > 0 ? `${lessonPdfs.length} arquivo${lessonPdfs.length > 1 ? 's' : ''}` : 'Nenhum'}
                  </span>
                </div>

                {/* Existing PDFs */}
                {loadingPdfs ? (
                  <div className="p-3 rounded-lg bg-white/[0.02] ring-1 ring-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-gray-500">Carregando PDFs...</span>
                    </div>
                  </div>
                ) : (
                  lessonPdfs.map((pdf, index) => (
                    <div key={pdf.id} className="p-3 rounded-lg bg-emerald-500/[0.05] ring-1 ring-emerald-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-emerald-300 font-medium truncate">{pdf.filename}</p>
                            <p className="text-xs text-emerald-500/70">
                              {Math.round(pdf.size_bytes / 1024)} KB  --  PDF {index + 1}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => window.open(pdf.url, '_blank')}
                            className="p-1.5 text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors"
                            title="Visualizar PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveSpecificPdf(pdf.id, pdf.url)}
                            className="p-1.5 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                            title="Remover PDF"
                            disabled={loadingPdfs}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Upload new PDF */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="flex items-center gap-2 px-3.5 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg ring-1 ring-blue-500/20 cursor-pointer text-sm transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {lessonPdfs.length > 0 ? 'Adicionar outro PDF' : 'Adicionar PDF'}
                  </label>

                  {selectedFile && (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm text-gray-400 truncate">
                        {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                      </span>
                      <button
                        onClick={handleUploadPdf}
                        disabled={uploadingPdf || !selectedLesson}
                        className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 ring-1 ring-emerald-500/20 rounded-md text-xs font-medium transition-colors disabled:opacity-40 flex-shrink-0"
                      >
                        {uploadingPdf ? 'Enviando...' : 'Enviar'}
                      </button>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-600">
                  Adicione quantos PDFs de apoio desejar (maximo 50MB por arquivo)
                </p>
              </div>

              {/* Duration + Order */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Duracao (min)</label>
                  <input
                    type="number"
                    value={lessonForm.duration_minutes}
                    onChange={(e) => setLessonForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3.5 py-2.5 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all text-sm"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Ordem</label>
                  <input
                    type="number"
                    value={lessonForm.order_index}
                    onChange={(e) => setLessonForm(prev => ({ ...prev, order_index: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3.5 py-2.5 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all text-sm"
                    min="1"
                  />
                </div>
              </div>

              {/* Status + Version */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Status da Aula</label>
                  <select
                    value={lessonForm.is_active.toString()}
                    onChange={(e) => setLessonForm(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                    className="w-full px-3.5 py-2.5 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all text-sm appearance-none"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Versao</label>
                  <select
                    value={lessonForm.is_current.toString()}
                    onChange={(e) => setLessonForm(prev => ({ ...prev, is_current: e.target.value === 'true' }))}
                    className="w-full px-3.5 py-2.5 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all text-sm appearance-none"
                  >
                    <option value="true">Atual</option>
                    <option value="false">Arquivada</option>
                  </select>
                  {lessonForm.is_current === false && (
                    <div className="flex items-center gap-1.5 p-2 rounded-md bg-orange-500/[0.06] ring-1 ring-orange-500/20">
                      <AlertCircle className="w-3 h-3 text-orange-400 flex-shrink-0" />
                      <span className="text-xs text-orange-400">Esta aula sera marcada como versao arquivada</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-white/[0.06]">
              <button
                onClick={() => setShowLessonModal(false)}
                className="flex-1 px-4 py-2.5 text-gray-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] ring-1 ring-white/[0.06] rounded-lg transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveLesson}
                disabled={isLoadingData || !lessonForm.title.trim() || !lessonForm.module_id}
                className="flex-1 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#c4a030] text-black rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
              >
                {isLoadingData ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Aula
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============== WHATSAPP CONFIG MODAL =============== */}
      {showWhatsAppConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowWhatsAppConfig(false)} />
          <div className="relative bg-[#141418] rounded-2xl ring-1 ring-white/[0.08] w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Notificacoes WhatsApp</h3>
                  <p className="text-xs text-gray-500">Enviar aviso ao grupo quando nova aula for criada</p>
                </div>
              </div>
              <button onClick={() => setShowWhatsAppConfig(false)} className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5">
              {/* Toggle */}
              <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl ring-1 ring-white/[0.04]">
                <div className="flex items-center gap-3">
                  {autoNotifyAula ? <Bell className="w-5 h-5 text-emerald-400" /> : <BellOff className="w-5 h-5 text-gray-500" />}
                  <div>
                    <p className="text-sm font-medium text-white">Notificacao automatica</p>
                    <p className="text-xs text-gray-500">Ao criar aula, avisa o grupo</p>
                  </div>
                </div>
                <button
                  onClick={() => setAutoNotifyAula(!autoNotifyAula)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${autoNotifyAula ? 'bg-emerald-500' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${autoNotifyAula ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Group select */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Grupo WhatsApp</label>
                {loadingGroups ? (
                  <div className="flex items-center gap-2 p-3 bg-white/[0.02] rounded-lg ring-1 ring-white/[0.04]">
                    <RefreshCw className="w-4 h-4 text-gray-500 animate-spin" />
                    <span className="text-sm text-gray-500">Carregando grupos...</span>
                  </div>
                ) : whatsAppGroups.length === 0 ? (
                  <div className="p-3 bg-white/[0.02] rounded-lg ring-1 ring-white/[0.04]">
                    <p className="text-sm text-gray-500">Nenhum grupo encontrado. Verifique se o WhatsApp esta conectado.</p>
                    <button
                      onClick={loadWhatsAppGroups}
                      className="mt-2 text-xs text-[#D4AF37] hover:text-[#F5D76E] transition-colors"
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#1a1a1e] ring-1 ring-white/[0.06] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                  >
                    <option value="">Selecione um grupo</option>
                    {whatsAppGroups.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Preview message */}
              {autoNotifyAula && selectedGroupId && (
                <div className="p-3 bg-emerald-500/5 rounded-xl ring-1 ring-emerald-500/10">
                  <p className="text-xs font-medium text-emerald-400 mb-2">Preview da mensagem:</p>
                  <p className="text-xs text-gray-400 whitespace-pre-line">
                    {`📚 *Nova Aula Disponivel!*\n\n📖 *Nome da Aula*\n📁 Modulo: Nome do Modulo\n\n🔗 Acesse a area do aluno para assistir!`}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-white/[0.06]">
              <button
                onClick={() => setShowWhatsAppConfig(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-lg ring-1 ring-white/[0.06] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveWhatsAppConfig}
                disabled={savingConfig}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-black bg-[#D4AF37] hover:bg-[#c4a030] rounded-lg transition-colors disabled:opacity-50"
              >
                {savingConfig ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="w-4 h-4" /> Salvar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
