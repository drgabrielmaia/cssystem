'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Target, Trophy, Plus, CheckCircle, Clock, Calendar,
  Search, Filter, Edit3, Trash2, Star
} from 'lucide-react'

interface MetaAluno {
  id: string
  title: string
  description: string
  goal_type: 'short_term' | 'medium_term' | 'long_term' | 'big_term'
  category_id: string | null
  priority_level: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'in_progress' | 'completed' | 'paused' | 'cancelled'
  progress_percentage: number
  due_date: string | null
  created_at: string
  completed_at: string | null
}

export default function MentoradoMetasPage() {
  const [mentorado, setMentorado] = useState<any>(null)
  const [metas, setMetas] = useState<MetaAluno[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [novaMeta, setNovaMeta] = useState({
    title: '',
    description: '',
    goal_type: 'medium_term' as 'short_term' | 'medium_term' | 'long_term' | 'big_term',
    priority_level: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    due_date: ''
  })

  const prazosMeta = [
    { value: 'short_term', label: 'Curto Prazo', sublabel: '1-3 meses', color: 'text-red-600' },
    { value: 'medium_term', label: 'Médio Prazo', sublabel: '3-6 meses', color: 'text-yellow-600' },
    { value: 'long_term', label: 'Longo Prazo', sublabel: '6-12 meses', color: 'text-blue-600' },
    { value: 'big_term', label: 'Grande Meta', sublabel: '1+ anos', color: 'text-purple-600' }
  ]

  useEffect(() => {
    console.log('🔐 Verificando mentorado no localStorage...')
    const mentoradoData = localStorage.getItem('mentorado')
    if (mentoradoData) {
      try {
        const parsed = JSON.parse(mentoradoData)
        console.log('✅ Mentorado encontrado:', parsed.id, parsed.nome_completo)
        setMentorado(parsed)
        carregarMetas(parsed.id)
      } catch (e) {
        console.error('❌ Erro ao parsear mentorado:', e)
        setLoading(false)
      }
    } else {
      console.log('❌ Sem mentorado no localStorage, redirecionando...')
      window.location.href = '/mentorado'
    }
  }, [])

  const carregarMetas = async (mentoradoId: string) => {
    try {
      console.log('🎯 Carregando metas para mentorado:', mentoradoId)

      const { data, error } = await supabase
        .from('video_learning_goals')
        .select('*')
        .eq('mentorado_id', mentoradoId)
        .order('created_at', { ascending: false })

      console.log('📊 Resultado query metas:', { data, error })

      if (error) {
        console.error('❌ Erro na query:', error)
        throw error
      }

      setMetas(data || [])
      console.log('✅ Metas carregadas:', data?.length || 0)
    } catch (error) {
      console.error('💥 Erro ao carregar metas:', error)
      setMetas([])
    } finally {
      setLoading(false)
    }
  }

  const criarMeta = async () => {
    if (!mentorado?.id || !novaMeta.title) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('video_learning_goals')
        .insert([{
          mentorado_id: mentorado.id,
          title: novaMeta.title,
          description: novaMeta.description,
          goal_type: novaMeta.goal_type,
          priority_level: novaMeta.priority_level,
          due_date: novaMeta.due_date || null,
          status: 'pending',
          progress_percentage: 0
        }])

      if (error) {
        console.error('Erro RLS:', error)
        alert(`Erro ao criar meta: ${error.message}. Execute fix_video_learning_goals_rls.sql no Supabase Dashboard.`)
        return
      }

      await carregarMetas(mentorado.id)
      setNovaMeta({
        title: '',
        description: '',
        goal_type: 'medium_term',
        priority_level: 'medium',
        due_date: ''
      })
      setShowCreateModal(false)

    } catch (error: any) {
      console.error('Erro ao criar meta:', error)
      alert(`Erro: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const concluirMeta = async (metaId: string) => {
    try {
      const { error } = await supabase
        .from('video_learning_goals')
        .update({
          status: 'completed',
          progress_percentage: 100,
          completed_at: new Date().toISOString()
        })
        .eq('id', metaId)

      if (error) throw error
      await carregarMetas(mentorado.id)
    } catch (error) {
      console.error('Erro ao concluir meta:', error)
    }
  }

  const metasFiltradas = metas.filter(meta => {
    if (filtroStatus === 'todos') return true
    if (filtroStatus === 'ativo') return meta.status === 'pending' || meta.status === 'in_progress'
    if (filtroStatus === 'concluido') return meta.status === 'completed'
    if (filtroStatus === 'pausado') return meta.status === 'paused'
    return meta.status === filtroStatus
  })

  const estatisticas = {
    total: metas.length,
    ativas: metas.filter(m => m.status === 'pending' || m.status === 'in_progress').length,
    concluidas: metas.filter(m => m.status === 'completed').length,
    taxaConclusao: metas.length > 0 ? (metas.filter(m => m.status === 'completed').length / metas.length) * 100 : 0
  }

  const getFilteredMetas = () => {
    let filtered = metas

    // Filtro de busca
    if (searchTerm.trim()) {
      filtered = filtered.filter(meta =>
        meta.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meta.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro de status
    if (filtroStatus !== 'todos') {
      if (filtroStatus === 'ativo') {
        filtered = filtered.filter(m => m.status === 'pending' || m.status === 'in_progress')
      } else if (filtroStatus === 'concluido') {
        filtered = filtered.filter(m => m.status === 'completed')
      } else {
        filtered = filtered.filter(m => m.status === filtroStatus)
      }
    }

    return filtered
  }

  const overallProgress = () => {
    const total = metas.length
    const completed = metas.filter(m => m.status === 'completed').length
    return {
      total,
      completed,
      percentage: total > 0 ? (completed / total) * 100 : 0
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E879F9]"></div>
      </div>
    )
  }

  const filteredMetas = getFilteredMetas()
  const progress = overallProgress()

  return (
    <div className="flex h-full">
      {/* Conteúdo Principal */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Header da Página */}
        <div className="mb-8">
          <h1 className="text-[32px] font-semibold text-[#1A1A1A] mb-2">
            Minhas Metas
          </h1>
          <p className="text-[15px] text-[#6B7280] mb-4">
            Defina e acompanhe seus objetivos pessoais
          </p>

          {/* Campo de Busca */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Buscar metas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#F3F3F5] border-0 rounded-full text-sm text-[#1A1A1A] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#E879F9] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Estatísticas de Progresso */}
        <div className="bg-[#F3F3F5] rounded-[20px] p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[18px] font-semibold text-[#1A1A1A]">
              Progresso Geral
            </h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#1A1A1A] text-white px-4 py-2 rounded-full text-[14px] font-medium hover:bg-opacity-90 transition-all flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Meta
            </button>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-4">
            <div className="text-center">
              <p className="text-[24px] font-bold text-[#1A1A1A]">{progress.total}</p>
              <p className="text-[13px] text-[#6B7280]">Total</p>
            </div>
            <div className="text-center">
              <p className="text-[24px] font-bold text-[#E879F9]">{metas.filter(m => m.status === 'pending' || m.status === 'in_progress').length}</p>
              <p className="text-[13px] text-[#6B7280]">Em Progresso</p>
            </div>
            <div className="text-center">
              <p className="text-[24px] font-bold text-[#22C55E]">{progress.completed}</p>
              <p className="text-[13px] text-[#6B7280]">Concluídas</p>
            </div>
          </div>

          <div className="w-full bg-white rounded-full h-2">
            <div
              className="h-full bg-[#E879F9] rounded-full transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-[13px] text-[#6B7280] text-center mt-2">
            {progress.percentage.toFixed(0)}% das metas concluídas
          </p>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-4 mb-6">
          <Filter className="w-4 h-4 text-[#6B7280]" />
          <div className="flex gap-2">
            {[
              { value: 'todos', label: 'Todas' },
              { value: 'ativo', label: 'Em Progresso' },
              { value: 'concluido', label: 'Concluídas' },
              { value: 'paused', label: 'Pausadas' }
            ].map((filtro) => (
              <button
                key={filtro.value}
                onClick={() => setFiltroStatus(filtro.value)}
                className={`px-3 py-1 rounded-full text-[13px] font-medium transition-all ${
                  filtroStatus === filtro.value
                    ? 'bg-[#E879F9] text-white'
                    : 'bg-[#F3F3F5] text-[#6B7280] hover:bg-[#E879F9] hover:text-white'
                }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Metas */}
        {filteredMetas.length === 0 ? (
          <div className="bg-[#F3F3F5] rounded-[20px] p-12 text-center">
            <Target className="w-16 h-16 text-[#6B7280] mx-auto mb-4" />
            <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-2">
              {metas.length === 0 ? 'Crie sua primeira meta' : 'Nenhuma meta encontrada'}
            </h3>
            <p className="text-[15px] text-[#6B7280] mb-4">
              {metas.length === 0
                ? 'Defina objetivos claros para acompanhar seu progresso'
                : 'Ajuste os filtros para ver suas metas'
              }
            </p>
            {metas.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#1A1A1A] text-white px-6 py-3 rounded-full text-[14px] font-medium hover:bg-opacity-90 transition-all"
              >
                Criar Primeira Meta
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMetas.map((meta) => {
              const prazo = prazosMeta.find(p => p.value === meta.goal_type)
              const isCompleted = meta.status === 'completed'
              const isActive = meta.status === 'pending' || meta.status === 'in_progress'

              return (
                <div
                  key={meta.id}
                  className={`bg-white rounded-[16px] p-6 border transition-all hover:shadow-md ${
                    isCompleted ? 'border-[#22C55E] bg-green-50' : 'border-[#E5E7EB] hover:border-[#E879F9]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Checkbox para marcar como concluída */}
                      <button
                        onClick={() => concluirMeta(meta.id)}
                        disabled={isCompleted}
                        className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isCompleted
                            ? 'bg-[#22C55E] border-[#22C55E] text-white'
                            : 'border-[#E5E7EB] hover:border-[#E879F9] hover:bg-[#E879F9] hover:bg-opacity-10'
                        }`}
                      >
                        {isCompleted && <CheckCircle className="h-4 w-4" />}
                      </button>

                      <div className="flex-1">
                        <h3 className={`text-[18px] font-semibold text-[#1A1A1A] mb-2 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                          {meta.title}
                        </h3>
                        {meta.description && (
                          <p className="text-[15px] text-[#6B7280] mb-3">{meta.description}</p>
                        )}

                        {/* Progress bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-[13px] text-[#6B7280] mb-2">
                            <span>Progresso</span>
                            <span>{meta.progress_percentage}%</span>
                          </div>
                          <div className="w-full bg-[#F3F3F5] rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                isCompleted ? 'bg-[#22C55E]' :
                                meta.progress_percentage > 70 ? 'bg-[#E879F9]' :
                                meta.progress_percentage > 30 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${meta.progress_percentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Tags e informações */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {prazo && (
                            <span className={`text-[12px] font-medium px-2 py-1 rounded-full bg-[#F3F3F5] ${prazo.color}`}>
                              {prazo.label}
                            </span>
                          )}
                          <span className={`text-[12px] font-medium px-2 py-1 rounded-full ${
                            meta.priority_level === 'critical' ? 'bg-red-100 text-red-700' :
                            meta.priority_level === 'high' ? 'bg-orange-100 text-orange-700' :
                            meta.priority_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {meta.priority_level === 'critical' ? 'Crítica' :
                             meta.priority_level === 'high' ? 'Alta' :
                             meta.priority_level === 'medium' ? 'Média' : 'Baixa'
                            } Prioridade
                          </span>
                          <span className={`text-[12px] font-medium px-2 py-1 rounded-full ${
                            isCompleted ? 'bg-[#22C55E] text-white' :
                            isActive ? 'bg-[#E879F9] text-white' : 'bg-[#F3F3F5] text-[#6B7280]'
                          }`}>
                            {isCompleted ? '✅ Concluída' :
                             meta.status === 'in_progress' ? '🔄 Em Progresso' :
                             meta.status === 'paused' ? '⏸️ Pausada' : '⏳ Pendente'}
                          </span>

                          {meta.due_date && (
                            <span className={`text-[12px] font-medium px-2 py-1 rounded-full flex items-center ${
                              new Date(meta.due_date) < new Date() && !isCompleted
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(meta.due_date).toLocaleDateString('pt-BR')}
                              {new Date(meta.due_date) < new Date() && !isCompleted && (
                                <span className="ml-1">⚠️</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isCompleted && (
                      <div className="flex items-center">
                        <Trophy className="w-8 h-8 text-[#22C55E]" />
                      </div>
                    )}
                  </div>

                  <div className="text-[12px] text-[#6B7280] pt-3 border-t border-[#F3F3F5]">
                    Criada em {new Date(meta.created_at).toLocaleDateString('pt-BR')}
                    {meta.completed_at && (
                      <> • Concluída em {new Date(meta.completed_at).toLocaleDateString('pt-BR')}</>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sidebar Direita - Estatísticas e Ações */}
      <aside className="w-80 bg-[#F3F3F5] border-l border-[#E5E7EB] p-6 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-[18px] font-semibold text-[#1A1A1A] mb-4">
            Suas Estatísticas
          </h2>

          <div className="space-y-4">
            <div className="bg-white rounded-[12px] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] text-[#6B7280]">Metas Ativas</span>
                <span className="text-[18px] font-bold text-[#E879F9]">
                  {metas.filter(m => m.status === 'pending' || m.status === 'in_progress').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#6B7280]">Concluídas este mês</span>
                <span className="text-[18px] font-bold text-[#22C55E]">
                  {metas.filter(m =>
                    m.status === 'completed' &&
                    m.completed_at &&
                    new Date(m.completed_at).getMonth() === new Date().getMonth()
                  ).length}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-[12px] p-4">
              <h4 className="text-[15px] font-medium text-[#1A1A1A] mb-3">Distribuição por Prazo</h4>
              <div className="space-y-2">
                {prazosMeta.map(prazo => {
                  const count = metas.filter(m => m.goal_type === prazo.value).length
                  return (
                    <div key={prazo.value} className="flex items-center justify-between">
                      <span className={`text-[13px] font-medium ${prazo.color}`}>
                        {prazo.label}
                      </span>
                      <span className="text-[13px] text-[#6B7280]">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Modal de Criar Meta */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[600px] bg-white rounded-[24px] overflow-hidden">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-[18px] font-semibold text-[#1A1A1A] mb-4">
                Criar Nova Meta
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-[15px] font-medium text-[#1A1A1A] mb-2 block">
                  Título da Meta
                </label>
                <input
                  type="text"
                  value={novaMeta.title}
                  onChange={(e) => setNovaMeta(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Concluir curso de marketing digital"
                  className="w-full p-3 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#E879F9] focus:border-[#E879F9] text-[#1A1A1A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[15px] font-medium text-[#1A1A1A] mb-2 block">
                    Tipo de Meta
                  </label>
                  <select
                    value={novaMeta.goal_type}
                    onChange={(e) => setNovaMeta(prev => ({ ...prev, goal_type: e.target.value as any }))}
                    className="w-full p-3 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#E879F9] focus:border-[#E879F9] text-[#1A1A1A]"
                  >
                    {prazosMeta.map(prazo => (
                      <option key={prazo.value} value={prazo.value}>
                        {prazo.label} ({prazo.sublabel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[15px] font-medium text-[#1A1A1A] mb-2 block">
                    Prioridade
                  </label>
                  <select
                    value={novaMeta.priority_level}
                    onChange={(e) => setNovaMeta(prev => ({ ...prev, priority_level: e.target.value as any }))}
                    className="w-full p-3 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#E879F9] focus:border-[#E879F9] text-[#1A1A1A]"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[15px] font-medium text-[#1A1A1A] mb-2 block">
                  Data Limite (Opcional)
                </label>
                <input
                  type="date"
                  value={novaMeta.due_date}
                  onChange={(e) => setNovaMeta(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full p-3 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#E879F9] focus:border-[#E879F9] text-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="text-[15px] font-medium text-[#1A1A1A] mb-2 block">
                  Descrição (Opcional)
                </label>
                <textarea
                  value={novaMeta.description}
                  onChange={(e) => setNovaMeta(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva sua meta em detalhes..."
                  rows={3}
                  className="w-full p-3 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#E879F9] focus:border-[#E879F9] text-[#1A1A1A]"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-[#F3F3F5] text-[#6B7280] rounded-[8px] text-[14px] font-medium hover:bg-opacity-80 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  onClick={criarMeta}
                  disabled={!novaMeta.title || saving}
                  className="px-6 py-2 bg-[#1A1A1A] text-white rounded-[8px] text-[14px] font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Criando...
                    </>
                  ) : (
                    'Criar Meta'
                  )}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}