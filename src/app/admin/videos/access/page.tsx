'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PageLayout } from '@/components/ui/page-layout'
import { MetricCard } from '@/components/ui/metric-card'
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  Video,
  Play,
  Lock,
  Unlock,
  Clock,
  CheckCircle,
  PlayCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react'

interface Mentorado {
  id: string
  nome_completo: string
  email: string
  turma: string
  status_login: string
}

interface VideoModule {
  id: string
  title: string
  description: string
  order_index: number
  is_active: boolean
}

interface VideoAccess {
  id: string
  mentorado_id: string
  module_id: string
  has_access: boolean
  granted_at: string
  granted_by: string
}

interface LessonProgress {
  id: string
  mentorado_id: string
  lesson_id: string
  started_at: string
  completed_at?: string
  watch_time_minutes: number
  is_completed: boolean
  video_lessons: {
    title: string
    module_id: string
    duration_minutes: number
  }
}

interface MentoradoProgress {
  mentorado: Mentorado
  total_lessons: number
  completed_lessons: number
  watch_time_minutes: number
  last_activity?: string
  completion_rate: number
  modules_accessed: number
  recent_lessons: LessonProgress[]
}

export default function VideoAccessControlPage() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [modules, setModules] = useState<VideoModule[]>([])
  const [access, setAccess] = useState<VideoAccess[]>([])
  const [progress, setProgress] = useState<LessonProgress[]>([])
  const [mentoradoProgress, setMentoradoProgress] = useState<MentoradoProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedModule, setSelectedModule] = useState<string>('all')
  const [isLoadingData, setIsLoadingData] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Buscar mentorados ativos
      const { data: mentoradosData } = await supabase
        .from('mentorados')
        .select('id, nome_completo, email, turma, status_login')
        .eq('excluido', false)
        .eq('status_login', 'ativo')
        .order('nome_completo')

      // Buscar módulos de vídeo
      const { data: modulesData } = await supabase
        .from('video_modules')
        .select('*')
        .eq('is_active', true)
        .order('order_index')

      // Buscar controles de acesso existentes
      const { data: accessData } = await supabase
        .from('video_access_control')
        .select('*')

      // Buscar progresso das aulas
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select(`
          *,
          video_lessons (
            title,
            module_id,
            duration_minutes
          )
        `)
        .order('started_at', { ascending: false })

      setMentorados(mentoradosData || [])
      setModules(modulesData || [])
      setAccess(accessData || [])
      setProgress(progressData || [])

      // Processar progresso dos mentorados
      await processMentoradoProgress(mentoradosData || [], progressData || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const processMentoradoProgress = async (mentoradosData: Mentorado[], progressData: LessonProgress[]) => {
    // Buscar total de aulas
    const { count: totalLessons } = await supabase
      .from('video_lessons')
      .select('id', { count: 'exact' })
      .eq('is_active', true)

    const processed = mentoradosData.map(mentorado => {
      const mentoradoProgress = progressData.filter(p => p.mentorado_id === mentorado.id)
      const completed = mentoradoProgress.filter(p => p.is_completed)
      const watchTime = mentoradoProgress.reduce((acc, p) => acc + p.watch_time_minutes, 0)
      const lastActivity = mentoradoProgress.length > 0 ? mentoradoProgress[0].started_at : undefined
      const completionRate = totalLessons ? (completed.length / totalLessons) * 100 : 0

      // Contar módulos com acesso
      const modulesAccessed = access.filter(a => a.mentorado_id === mentorado.id && a.has_access).length

      return {
        mentorado,
        total_lessons: totalLessons || 0,
        completed_lessons: completed.length,
        watch_time_minutes: watchTime,
        last_activity: lastActivity,
        completion_rate: completionRate,
        modules_accessed: modulesAccessed,
        recent_lessons: mentoradoProgress.slice(0, 3)
      }
    })

    setMentoradoProgress(processed)
  }

  const toggleAccess = async (mentoradoId: string, moduleId: string, hasAccess: boolean) => {
    try {
      setIsLoadingData(true)
      if (hasAccess) {
        // Remover acesso
        await supabase
          .from('video_access_control')
          .delete()
          .eq('mentorado_id', mentoradoId)
          .eq('module_id', moduleId)
      } else {
        // Conceder acesso
        await supabase
          .from('video_access_control')
          .insert({
            mentorado_id: mentoradoId,
            module_id: moduleId,
            has_access: true,
            granted_at: new Date().toISOString(),
            granted_by: 'admin'
          })
      }

      // Recarregar dados
      await loadData()
    } catch (error) {
      console.error('Erro ao alterar acesso:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const hasModuleAccess = (mentoradoId: string, moduleId: string) => {
    return access.some(a =>
      a.mentorado_id === mentoradoId &&
      a.module_id === moduleId &&
      a.has_access
    )
  }

  const filteredMentoradoProgress = mentoradoProgress.filter(mp => {
    const searchLower = searchTerm.toLowerCase()
    const m = mp.mentorado
    return m.nome_completo.toLowerCase().includes(searchLower) ||
           m.email.toLowerCase().includes(searchLower) ||
           m.turma.toLowerCase().includes(searchLower)
  })

  const getAccessStats = (mentoradoId: string) => {
    const total = modules.length
    const granted = modules.filter(m => hasModuleAccess(mentoradoId, m.id)).length
    return { total, granted }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}min`
    }
    return `${mins}min`
  }

  const formatLastActivity = (dateString?: string) => {
    if (!dateString) return 'Nunca'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Hoje'
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 7) return `${diffDays} dias atrás`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`
    return date.toLocaleDateString('pt-BR')
  }

  if (loading) {
    return (
      <PageLayout title="Controle de Acesso" subtitle="Carregando...">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#059669]"></div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Controle de Acesso"
      subtitle={`Gestão de acesso e progresso dos mentorados • ${filteredMentoradoProgress.length} mentorados • ${modules.length} módulos`}
    >
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Mentorados Ativos"
          value={mentorados.length.toString()}
          change={5}
          changeType="increase"
          icon={Users}
          iconColor="blue"
        />
        <MetricCard
          title="Módulos Disponíveis"
          value={modules.length.toString()}
          change={2}
          changeType="increase"
          icon={Video}
          iconColor="purple"
        />
        <MetricCard
          title="Acessos Concedidos"
          value={access.filter(a => a.has_access).length.toString()}
          change={12}
          changeType="increase"
          icon={ShieldCheck}
          iconColor="green"
        />
        <MetricCard
          title="Conclusão Média"
          value={`${Math.round(mentoradoProgress.reduce((acc, mp) => acc + mp.completion_rate, 0) / (mentoradoProgress.length || 1))}%`}
          change={8.5}
          changeType="increase"
          icon={TrendingUp}
          iconColor="orange"
        />
      </div>

      {/* Controles */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94A3B8] w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar mentorado..."
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
          </div>
        </div>
      </div>


      {/* Lista de mentorados com progresso */}
      <div className="space-y-6">
        {filteredMentoradoProgress.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
            <Users className="h-16 w-16 text-[#94A3B8] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
              Nenhum mentorado encontrado
            </h3>
            <p className="text-[#64748B]">
              {searchTerm
                ? 'Tente ajustar os filtros de busca.'
                : 'Não há mentorados ativos cadastrados.'}
            </p>
          </div>
        ) : (
          filteredMentoradoProgress.map((mp) => {
            const mentorado = mp.mentorado
            return (
              <div key={mentorado.id} className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden hover:shadow-lg transition-shadow">
                {/* Header do mentorado */}
                <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[#0F172A]">{mentorado.nome_completo}</h3>
                      <div className="flex items-center gap-6 mt-2 text-sm text-[#64748B]">
                        <span className="flex items-center gap-1">
                          <span>📧</span>
                          {mentorado.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <span>🎓</span>
                          {mentorado.turma}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Última atividade: {formatLastActivity(mp.last_activity)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-[#059669]">{Math.round(mp.completion_rate)}%</div>
                        <div className="text-xs text-[#64748B]">Conclusão</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estatísticas do progresso */}
                <div className="p-6 border-b border-[#E2E8F0]">
                  <h4 className="font-medium text-[#0F172A] mb-4">Progresso Geral</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-[#F8FAFC] rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <PlayCircle className="w-5 h-5 text-[#059669]" />
                      </div>
                      <div className="text-lg font-semibold text-[#0F172A]">{mp.completed_lessons}</div>
                      <div className="text-xs text-[#64748B]">Aulas Concluídas</div>
                    </div>
                    <div className="text-center p-3 bg-[#F8FAFC] rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <Clock className="w-5 h-5 text-[#F59E0B]" />
                      </div>
                      <div className="text-lg font-semibold text-[#0F172A]">{formatDuration(mp.watch_time_minutes)}</div>
                      <div className="text-xs text-[#64748B]">Tempo Assistido</div>
                    </div>
                    <div className="text-center p-3 bg-[#F8FAFC] rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <Shield className="w-5 h-5 text-[#8B5CF6]" />
                      </div>
                      <div className="text-lg font-semibold text-[#0F172A]">{mp.modules_accessed}</div>
                      <div className="text-xs text-[#64748B]">Módulos Acessíveis</div>
                    </div>
                    <div className="text-center p-3 bg-[#F8FAFC] rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <Video className="w-5 h-5 text-[#06B6D4]" />
                      </div>
                      <div className="text-lg font-semibold text-[#0F172A]">{mp.total_lessons}</div>
                      <div className="text-xs text-[#64748B]">Total de Aulas</div>
                    </div>
                  </div>
                </div>

                {/* Aulas recentes */}
                {mp.recent_lessons.length > 0 && (
                  <div className="p-6 border-b border-[#E2E8F0]">
                    <h4 className="font-medium text-[#0F172A] mb-4">Atividade Recente</h4>
                    <div className="space-y-2">
                      {mp.recent_lessons.map((lesson, index) => (
                        <div key={lesson.id} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
                          <div className="flex items-center gap-3">
                            {lesson.is_completed ? (
                              <CheckCircle className="w-4 h-4 text-[#059669]" />
                            ) : (
                              <Play className="w-4 h-4 text-[#F59E0B]" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-[#0F172A]">{lesson.video_lessons.title}</p>
                              <p className="text-xs text-[#64748B]">
                                {lesson.is_completed ? 'Concluída' : `Assistiu ${lesson.watch_time_minutes} de ${lesson.video_lessons.duration_minutes} min`}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-[#64748B]">
                            {formatLastActivity(lesson.started_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Controle de acesso aos módulos */}
                <div className="p-6">
                  <h4 className="font-medium text-[#0F172A] mb-4">Controle de Acesso aos Módulos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {modules.map((module) => {
                      const hasAccess = hasModuleAccess(mentorado.id, module.id)
                      return (
                        <div
                          key={module.id}
                          className="flex items-center justify-between p-4 border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm text-[#0F172A]">{module.title}</p>
                            <p className="text-xs text-[#64748B]">Módulo {module.order_index}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {hasAccess ? (
                              <Unlock className="w-4 h-4 text-[#059669]" />
                            ) : (
                              <Lock className="w-4 h-4 text-[#94A3B8]" />
                            )}
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={hasAccess}
                                onChange={() => toggleAccess(mentorado.id, module.id, hasAccess)}
                                disabled={isLoadingData}
                                className="sr-only peer"
                              />
                              <div className="relative w-11 h-6 bg-[#E2E8F0] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#059669]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#059669]"></div>
                            </label>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </PageLayout>
  )
}