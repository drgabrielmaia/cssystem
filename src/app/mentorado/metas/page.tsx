'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Target,
  TrendingUp,
  CheckCircle,
  Circle,
  Plus,
  Trophy,
  ArrowUp,
  BarChart3
} from 'lucide-react'

interface Goal {
  id: string
  title: string
  description: string
  goal_type: string
  priority_level: 'low' | 'medium' | 'high'
  status: 'active' | 'completed' | 'paused'
  progress_percentage: number
  due_date?: string
  created_at: string
  completed_at?: string
  initial_value?: number
  target_value?: number
  current_value?: number
  checkpoints: Checkpoint[]
}

interface Checkpoint {
  id: string
  goal_id: string
  title: string
  description: string
  target_value: number
  current_value: number
  target_date?: string
  completed_date?: string
  is_completed: boolean
  progress: number
  order_index: number
  created_at: string
}

export default function MentoradoMetasPage() {
  const [mentorado, setMentorado] = useState<any>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [showAddCheckpoint, setShowAddCheckpoint] = useState(false)
  const [newCheckpointValue, setNewCheckpointValue] = useState('')

  useEffect(() => {
    const savedMentorado = localStorage.getItem('mentorado')
    if (savedMentorado) {
      const mentoradoData = JSON.parse(savedMentorado)
      setMentorado(mentoradoData)
      loadGoalsData(mentoradoData.id)
    }
  }, [])

  const loadGoalsData = async (mentoradoId: string) => {
    try {
      console.log('🎯 Carregando metas para mentorado:', mentoradoId)

      const { data: goalsData, error: goalsError } = await supabase
        .from('video_learning_goals')
        .select('*')
        .eq('mentorado_id', mentoradoId)
        .order('created_at', { ascending: false })

      if (goalsError) {
        console.error('❌ Erro ao carregar metas:', goalsError)
        setGoals([])
        return
      }

      if (!goalsData || goalsData.length === 0) {
        setGoals([])
        return
      }

      // Carregar checkpoints das metas
      const goalIds = goalsData.map(g => g.id)
      const { data: checkpointsData, error: checkpointsError } = await supabase
        .from('goal_checkpoints')
        .select('*')
        .in('goal_id', goalIds)
        .order('order_index', { ascending: true })

      if (checkpointsError) {
        console.warn('⚠️ Erro ao carregar checkpoints:', checkpointsError)
      }

      // Combinar dados
      const goalsWithCheckpoints = goalsData.map(goal => ({
        ...goal,
        checkpoints: checkpointsData?.filter(c => c.goal_id === goal.id) || []
      }))

      setGoals(goalsWithCheckpoints)

      // Selecionar primeira meta por padrão
      if (goalsWithCheckpoints.length > 0) {
        setSelectedGoal(goalsWithCheckpoints[0])
      }

    } catch (error) {
      console.error('Erro ao carregar metas:', error)
      setGoals([])
    }
  }

  const updateCheckpointProgress = async (checkpointId: string, newValue: number) => {
    if (!selectedGoal) return

    try {
      const checkpoint = selectedGoal.checkpoints.find(c => c.id === checkpointId)
      if (!checkpoint) return

      const progress = Math.min(100, Math.round((newValue / checkpoint.target_value) * 100))
      const isCompleted = newValue >= checkpoint.target_value

      const { error } = await supabase
        .from('goal_checkpoints')
        .update({
          current_value: newValue,
          progress,
          is_completed: isCompleted,
          completed_date: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', checkpointId)

      if (!error) {
        loadGoalsData(mentorado.id)
      }

    } catch (error) {
      console.error('Erro ao atualizar checkpoint:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/20'
      case 'medium': return 'text-yellow-400 bg-yellow-500/20'
      case 'low': return 'text-green-400 bg-green-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta'
      case 'medium': return 'Média'
      case 'low': return 'Baixa'
      default: return 'Normal'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <div className="bg-[#141414] min-h-screen text-white">
      {/* Netflix-style Header */}
      <div className="relative h-[40vh] mb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#141414]/50 to-[#141414] z-10" />

        {/* Hero Background */}
        <div className="absolute inset-0">
          <img
            src="https://medicosderesultado.com/wp-content/uploads/2024/10/capa-dashboard.png"
            alt="Dashboard Médicos de Resultado"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="absolute top-0 left-0 right-0 p-8 z-20">
          <div className="max-w-2xl">
            <h1 className="text-[48px] font-bold text-white mb-4 leading-tight">
              Minhas Metas
            </h1>
            <p className="text-[18px] text-gray-300 mb-6 leading-relaxed">
              Acompanhe seu progresso e conquiste seus objetivos
            </p>
            <div className="text-gray-300 text-sm">
              {goals.length} metas cadastradas • {goals.filter(g => g.status === 'completed').length} concluídas
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {goals.length === 0 ? (
          <div className="text-center py-16">
            <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-[20px] font-medium text-white mb-2">Nenhuma meta encontrada</h3>
            <p className="text-gray-400">
              Suas metas serão criadas pelo seu mentor e aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lista de Metas */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-[24px] font-semibold text-white mb-6">
                Suas metas
              </h2>

              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className={`bg-[#1A1A1A] rounded-[8px] p-6 cursor-pointer transition-all duration-300 border-2 ${
                    selectedGoal?.id === goal.id
                      ? 'border-[#E879F9] bg-[#2A2A2A]'
                      : 'border-gray-700 hover:border-gray-600 hover:bg-[#2A2A2A]'
                  }`}
                  onClick={() => setSelectedGoal(goal)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg text-white leading-tight">
                      {goal.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-[4px] text-xs font-medium ${getPriorityColor(goal.priority_level)}`}>
                      {getPriorityLabel(goal.priority_level)}
                    </span>
                  </div>

                  <p className="text-gray-400 text-sm mb-4">
                    {goal.description}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Progresso</span>
                      <span className="font-semibold text-white">{goal.progress_percentage}%</span>
                    </div>

                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-[#E879F9] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${goal.progress_percentage}%` }}
                      />
                    </div>

                    {goal.current_value !== undefined && goal.target_value && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Atual</span>
                        <span className="font-semibold text-white">{formatCurrency(goal.current_value)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Detalhes da Meta Selecionada */}
            {selectedGoal && (
              <div className="lg:col-span-2">
                <div className="bg-[#1A1A1A] rounded-[8px] p-8 border border-gray-700">
                  {/* Header da Meta */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold mb-2 text-white">{selectedGoal.title}</h2>
                      <p className="text-gray-400 text-lg">{selectedGoal.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-[#E879F9] mb-1">
                        {selectedGoal.progress_percentage}%
                      </div>
                      <div className="text-sm text-gray-400">Concluído</div>
                    </div>
                  </div>

                  {/* Progress Overview */}
                  {selectedGoal.current_value !== undefined && selectedGoal.target_value && (
                    <div className="grid grid-cols-3 gap-6 mb-8">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400 mb-1">
                          {formatCurrency(selectedGoal.initial_value || 0)}
                        </div>
                        <div className="text-sm text-gray-400">Valor Inicial</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400 mb-1">
                          {formatCurrency(selectedGoal.current_value)}
                        </div>
                        <div className="text-sm text-gray-400">Atual</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-[#E879F9] mb-1">
                          {formatCurrency(selectedGoal.target_value)}
                        </div>
                        <div className="text-sm text-gray-400">Meta</div>
                      </div>
                    </div>
                  )}

                  {/* Checkpoints */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold flex items-center text-white">
                        <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                        Checkpoints ({selectedGoal.checkpoints.filter(c => c.is_completed).length}/{selectedGoal.checkpoints.length})
                      </h3>
                    </div>

                    {/* Checkpoints List */}
                    <div className="space-y-4">
                      {selectedGoal.checkpoints.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <Circle className="w-8 h-8 mx-auto mb-2" />
                          <p>Nenhum checkpoint criado ainda.</p>
                          <p className="text-sm">Checkpoints serão adicionados pelo seu mentor.</p>
                        </div>
                      ) : (
                        selectedGoal.checkpoints.map((checkpoint) => (
                          <div
                            key={checkpoint.id}
                            className={`bg-[#2A2A2A] rounded-[8px] p-6 border transition-all duration-300 ${
                              checkpoint.is_completed
                                ? 'border-green-400 bg-green-400/10'
                                : 'border-gray-600'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center">
                                {checkpoint.is_completed ? (
                                  <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
                                ) : (
                                  <Circle className="w-6 h-6 text-gray-400 mr-3" />
                                )}
                                <div>
                                  <h4 className="font-semibold text-lg text-white">{checkpoint.title}</h4>
                                  <p className="text-gray-400 text-sm">{checkpoint.description}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-[#E879F9] mb-1">
                                  {checkpoint.progress}%
                                </div>
                                {checkpoint.is_completed && (
                                  <div className="text-xs text-green-400">✓ Concluído</div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">
                                  Atual: {formatCurrency(checkpoint.current_value)}
                                </span>
                                <span className="text-gray-400">
                                  Meta: {formatCurrency(checkpoint.target_value)}
                                </span>
                              </div>

                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    checkpoint.is_completed
                                      ? 'bg-green-400'
                                      : 'bg-[#E879F9]'
                                  }`}
                                  style={{ width: `${checkpoint.progress}%` }}
                                />
                              </div>

                              {!checkpoint.is_completed && (
                                <div className="flex items-center space-x-3 mt-3">
                                  <input
                                    type="number"
                                    placeholder="Valor atual"
                                    className="flex-1 bg-[#1A1A1A] border border-gray-600 rounded-[4px] px-3 py-2 text-white placeholder-gray-400 text-sm focus:outline-none focus:border-white"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        const value = parseFloat((e.target as HTMLInputElement).value)
                                        if (!isNaN(value)) {
                                          updateCheckpointProgress(checkpoint.id, value)
                                          ;(e.target as HTMLInputElement).value = ''
                                        }
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={(e) => {
                                      const input = e.currentTarget.previousElementSibling as HTMLInputElement
                                      const value = parseFloat(input.value)
                                      if (!isNaN(value)) {
                                        updateCheckpointProgress(checkpoint.id, value)
                                        input.value = ''
                                      }
                                    }}
                                    className="bg-[#E879F9] hover:bg-[#D865E8] text-white px-4 py-2 rounded-[4px] text-sm font-medium transition-colors flex items-center"
                                  >
                                    <ArrowUp className="w-4 h-4 mr-1" />
                                    Atualizar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="bg-[#2A2A2A] rounded-[8px] p-4 text-center">
                      <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                      <div className="text-lg font-semibold text-white">
                        {selectedGoal.checkpoints.filter(c => c.is_completed).length}
                      </div>
                      <div className="text-sm text-gray-400">Checkpoints Concluídos</div>
                    </div>
                    <div className="bg-[#2A2A2A] rounded-[8px] p-4 text-center">
                      <BarChart3 className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <div className="text-lg font-semibold text-white">
                        {selectedGoal.checkpoints.length}
                      </div>
                      <div className="text-sm text-gray-400">Total de Checkpoints</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}