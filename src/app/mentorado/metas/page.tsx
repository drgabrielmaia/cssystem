'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Target,
  TrendingUp,
  CheckCircle,
  Circle,
  Calendar,
  DollarSign,
  Plus,
  Star,
  Trophy,
  Zap,
  ArrowUp,
  BarChart3
} from 'lucide-react'

interface Goal {
  id: string
  title: string
  description: string
  goal_type: string
  category_id?: string
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
  const [loading, setLoading] = useState(true)
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
      setLoading(true)
      console.log('🎯 Carregando metas para mentorado:', mentoradoId)

      // Carregar metas do mentorado
      const { data: goalsData, error: goalsError } = await supabase
        .from('video_learning_goals')
        .select('*')
        .eq('mentorado_id', mentoradoId)
        .order('created_at', { ascending: false })

      if (goalsError) {
        console.error('❌ Erro ao carregar metas:', goalsError)
        // Em caso de erro de RLS, criar metas padrão
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

      if (checkpointsError) throw checkpointsError

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
      // Em caso de erro, definir array vazio para evitar loading infinito
      setGoals([])
    } finally {
      setLoading(false)
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

      if (error) throw error

      // Recalcular progresso da meta principal
      const updatedCheckpoints = selectedGoal.checkpoints.map(c =>
        c.id === checkpointId ? { ...c, current_value: newValue, progress, is_completed: isCompleted } : c
      )

      const completedCheckpoints = updatedCheckpoints.filter(c => c.is_completed).length
      const totalCheckpoints = updatedCheckpoints.length
      const goalProgress = totalCheckpoints > 0 ? Math.round((completedCheckpoints / totalCheckpoints) * 100) : 0

      // Atualizar meta principal
      const { error: goalError } = await supabase
        .from('video_learning_goals')
        .update({
          progress_percentage: goalProgress,
          current_value: newValue,
          status: goalProgress >= 100 ? 'completed' : 'active',
          completed_at: goalProgress >= 100 ? new Date().toISOString() : null
        })
        .eq('id', selectedGoal.id)

      if (goalError) throw goalError

      // Recarregar dados
      loadGoalsData(mentorado.id)

    } catch (error) {
      console.error('Erro ao atualizar checkpoint:', error)
      alert('Erro ao atualizar progresso. Tente novamente.')
    }
  }

  const addCheckpoint = async () => {
    if (!selectedGoal || !newCheckpointValue) return

    try {
      const targetValue = parseFloat(newCheckpointValue)
      if (isNaN(targetValue)) {
        alert('Por favor, digite um valor válido.')
        return
      }

      const nextOrder = selectedGoal.checkpoints.length + 1
      const checkpointTitle = `Checkpoint ${nextOrder}: R$ ${targetValue.toLocaleString('pt-BR')}`

      const { error } = await supabase
        .from('goal_checkpoints')
        .insert([{
          goal_id: selectedGoal.id,
          title: checkpointTitle,
          description: `Meta de alcançar R$ ${targetValue.toLocaleString('pt-BR')}`,
          target_value: targetValue,
          current_value: selectedGoal.current_value || 0,
          order_index: nextOrder,
          organization_id: mentorado.organization_id
        }])

      if (error) throw error

      setNewCheckpointValue('')
      setShowAddCheckpoint(false)
      loadGoalsData(mentorado.id)

    } catch (error) {
      console.error('Erro ao adicionar checkpoint:', error)
      alert('Erro ao adicionar checkpoint. Tente novamente.')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-500/10'
      case 'medium': return 'text-yellow-500 bg-yellow-500/10'
      case 'low': return 'text-green-500 bg-green-500/10'
      default: return 'text-gray-500 bg-gray-500/10'
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

  const calculateProgress = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
            🎯 Minhas Metas
          </h1>
          <p className="text-purple-200">
            Acompanhe seu progresso e conquiste seus objetivos
          </p>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-16">
            <Target className="w-16 h-16 text-purple-300 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Nenhuma meta encontrada</h3>
            <p className="text-purple-200">
              Suas metas serão criadas pelo seu mentor e aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lista de Metas */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                Suas Metas
              </h2>

              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 cursor-pointer transition-all duration-300 border-2 ${
                    selectedGoal?.id === goal.id
                      ? 'border-purple-400 bg-white/20 shadow-2xl transform scale-105'
                      : 'border-white/20 hover:border-purple-300 hover:bg-white/15'
                  }`}
                  onClick={() => setSelectedGoal(goal)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg leading-tight">
                      {goal.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(goal.priority_level)}`}>
                      {getPriorityLabel(goal.priority_level)}
                    </span>
                  </div>

                  <p className="text-purple-200 text-sm mb-4 line-clamp-2">
                    {goal.description}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-300">Progresso</span>
                      <span className="font-semibold">{goal.progress_percentage}%</span>
                    </div>

                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${goal.progress_percentage}%` }}
                      />
                    </div>

                    {goal.current_value !== undefined && goal.target_value && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-purple-300">Atual</span>
                        <span className="font-semibold">{formatCurrency(goal.current_value)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Detalhes da Meta Selecionada */}
            {selectedGoal && (
              <div className="lg:col-span-2">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                  {/* Header da Meta */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold mb-2">{selectedGoal.title}</h2>
                      <p className="text-purple-200 text-lg">{selectedGoal.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-purple-300 mb-1">
                        {selectedGoal.progress_percentage}%
                      </div>
                      <div className="text-sm text-purple-200">Concluído</div>
                    </div>
                  </div>

                  {/* Progress Overview */}
                  {selectedGoal.current_value !== undefined && selectedGoal.target_value && (
                    <div className="grid grid-cols-3 gap-6 mb-8">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400 mb-1">
                          {formatCurrency(selectedGoal.initial_value || 0)}
                        </div>
                        <div className="text-sm text-purple-200">Valor Inicial</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400 mb-1">
                          {formatCurrency(selectedGoal.current_value)}
                        </div>
                        <div className="text-sm text-purple-200">Atual</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400 mb-1">
                          {formatCurrency(selectedGoal.target_value)}
                        </div>
                        <div className="text-sm text-purple-200">Meta</div>
                      </div>
                    </div>
                  )}

                  {/* Checkpoints */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                        Checkpoints ({selectedGoal.checkpoints.filter(c => c.is_completed).length}/{selectedGoal.checkpoints.length})
                      </h3>
                      <button
                        onClick={() => setShowAddCheckpoint(!showAddCheckpoint)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                      </button>
                    </div>

                    {/* Add Checkpoint Form */}
                    {showAddCheckpoint && (
                      <div className="bg-white/10 rounded-lg p-4 mb-6">
                        <h4 className="font-semibold mb-3">Novo Checkpoint</h4>
                        <div className="flex space-x-3">
                          <input
                            type="number"
                            placeholder="Valor da meta (R$)"
                            value={newCheckpointValue}
                            onChange={(e) => setNewCheckpointValue(e.target.value)}
                            className="flex-1 bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-purple-200"
                          />
                          <button
                            onClick={addCheckpoint}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            Adicionar
                          </button>
                          <button
                            onClick={() => setShowAddCheckpoint(false)}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Checkpoints List */}
                    <div className="space-y-4">
                      {selectedGoal.checkpoints.length === 0 ? (
                        <div className="text-center py-8 text-purple-200">
                          <Circle className="w-8 h-8 mx-auto mb-2" />
                          <p>Nenhum checkpoint criado ainda.</p>
                          <p className="text-sm">Adicione checkpoints para acompanhar seu progresso.</p>
                        </div>
                      ) : (
                        selectedGoal.checkpoints.map((checkpoint, index) => (
                          <div
                            key={checkpoint.id}
                            className={`bg-white/10 rounded-xl p-6 border-2 transition-all duration-300 ${
                              checkpoint.is_completed
                                ? 'border-green-400 bg-green-400/10'
                                : 'border-white/20 hover:border-purple-300'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center">
                                {checkpoint.is_completed ? (
                                  <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
                                ) : (
                                  <Circle className="w-6 h-6 text-purple-300 mr-3" />
                                )}
                                <div>
                                  <h4 className="font-semibold text-lg">{checkpoint.title}</h4>
                                  <p className="text-purple-200 text-sm">{checkpoint.description}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-purple-300 mb-1">
                                  {checkpoint.progress}%
                                </div>
                                {checkpoint.is_completed && (
                                  <div className="text-xs text-green-400">✓ Concluído</div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-purple-300">
                                  Atual: {formatCurrency(checkpoint.current_value)}
                                </span>
                                <span className="text-purple-300">
                                  Meta: {formatCurrency(checkpoint.target_value)}
                                </span>
                              </div>

                              <div className="w-full bg-white/20 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    checkpoint.is_completed
                                      ? 'bg-gradient-to-r from-green-400 to-green-500'
                                      : 'bg-gradient-to-r from-purple-400 to-pink-400'
                                  }`}
                                  style={{ width: `${checkpoint.progress}%` }}
                                />
                              </div>

                              {!checkpoint.is_completed && (
                                <div className="flex items-center space-x-3 mt-3">
                                  <input
                                    type="number"
                                    placeholder="Valor atual"
                                    className="flex-1 bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-purple-200 text-sm"
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
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
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
                    <div className="bg-white/10 rounded-xl p-4 text-center">
                      <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                      <div className="text-lg font-semibold">
                        {selectedGoal.checkpoints.filter(c => c.is_completed).length}
                      </div>
                      <div className="text-sm text-purple-200">Checkpoints Concluídos</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 text-center">
                      <BarChart3 className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <div className="text-lg font-semibold">
                        {selectedGoal.checkpoints.length}
                      </div>
                      <div className="text-sm text-purple-200">Total de Checkpoints</div>
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