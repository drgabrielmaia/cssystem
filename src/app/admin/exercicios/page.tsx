'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash, BookOpen, CheckCircle, Clock } from 'lucide-react'

interface Modulo {
  id: string
  name: string
  description: string
  is_active: boolean
}

interface Aula {
  id: string
  module_id: string
  title: string
  description: string
  video_url: string
  order_index: number
  is_active: boolean
}

interface Exercicio {
  id: string
  lesson_id: string
  module_id: string
  title: string
  description: string
  exercise_type: 'quiz' | 'essay' | 'practical' | 'reflection'
  questions: any[]
  passing_score: number
  time_limit_minutes: number | null
  attempts_allowed: number
  is_required: boolean
  is_active: boolean
  created_at: string
}

interface NovoExercicio {
  lesson_id: string
  module_id: string
  title: string
  description: string
  exercise_type: 'quiz' | 'essay' | 'practical' | 'reflection'
  questions: QuestionItem[]
  passing_score: number
  time_limit_minutes: number | null
  attempts_allowed: number
  is_required: boolean
}

interface QuestionItem {
  id: string
  type: 'multiple_choice' | 'true_false' | 'essay' | 'practical'
  question: string
  options?: string[]
  correct_answer?: string | number
  points: number
  explanation?: string
}

export default function ExerciciosAdminPage() {
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [aulas, setAulas] = useState<Aula[]>([])
  const [exercicios, setExercicios] = useState<Exercicio[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [novoExercicio, setNovoExercicio] = useState<NovoExercicio>({
    lesson_id: '',
    module_id: '',
    title: '',
    description: '',
    exercise_type: 'quiz',
    questions: [],
    passing_score: 70,
    time_limit_minutes: null,
    attempts_allowed: 3,
    is_required: true
  })

  const [novaQuestao, setNovaQuestao] = useState<Partial<QuestionItem>>({
    type: 'multiple_choice',
    question: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    points: 1,
    explanation: ''
  })

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      // Carregar módulos
      const { data: modulosData, error: modulosError } = await supabase
        .from('video_modules')
        .select('*')
        .order('order_index')

      if (modulosError) throw modulosError

      // Carregar aulas
      const { data: aulasData, error: aulasError } = await supabase
        .from('video_lessons')
        .select('*')
        .order('order_index')

      if (aulasError) throw aulasError

      // Carregar exercícios existentes
      const { data: exerciciosData, error: exerciciosError } = await supabase
        .from('lesson_exercises')
        .select('*')
        .order('created_at', { ascending: false })

      if (exerciciosError) {
        // Tabela pode não existir ainda, criar se necessário
        console.log('Tabela lesson_exercises não existe, será criada')
        setExercicios([])
      } else {
        setExercicios(exerciciosData || [])
      }

      setModulos(modulosData || [])
      setAulas(aulasData || [])

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const adicionarQuestao = () => {
    if (!novaQuestao.question) return

    const questao: QuestionItem = {
      id: `q_${Date.now()}`,
      type: novaQuestao.type || 'multiple_choice',
      question: novaQuestao.question,
      options: novaQuestao.options || [],
      correct_answer: novaQuestao.correct_answer,
      points: novaQuestao.points || 1,
      explanation: novaQuestao.explanation || ''
    }

    setNovoExercicio(prev => ({
      ...prev,
      questions: [...prev.questions, questao]
    }))

    // Reset form
    setNovaQuestao({
      type: 'multiple_choice',
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      points: 1,
      explanation: ''
    })
  }

  const removerQuestao = (questionId: string) => {
    setNovoExercicio(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }))
  }

  const salvarExercicio = async () => {
    try {
      const dadosExercicio = {
        lesson_id: novoExercicio.lesson_id,
        module_id: novoExercicio.module_id,
        title: novoExercicio.title,
        description: novoExercicio.description,
        exercise_type: novoExercicio.exercise_type,
        questions: novoExercicio.questions,
        passing_score: novoExercicio.passing_score,
        time_limit_minutes: novoExercicio.time_limit_minutes,
        attempts_allowed: novoExercicio.attempts_allowed,
        is_required: novoExercicio.is_required,
        is_active: true
      }

      const { error } = await supabase
        .from('lesson_exercises')
        .insert([dadosExercicio])

      if (error) throw error

      await carregarDados()
      setShowForm(false)
      resetForm()

    } catch (error) {
      console.error('Erro ao salvar exercício:', error)
      alert('Erro ao salvar exercício. Verifique se as tabelas foram criadas no banco.')
    }
  }

  const resetForm = () => {
    setNovoExercicio({
      lesson_id: '',
      module_id: '',
      title: '',
      description: '',
      exercise_type: 'quiz',
      questions: [],
      passing_score: 70,
      time_limit_minutes: null,
      attempts_allowed: 3,
      is_required: true
    })
    setEditingId(null)
  }

  const aulasDoModulo = aulas.filter(aula => aula.module_id === novoExercicio.module_id)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sistema de Exercícios</h1>
            <p className="text-gray-600 mt-2">
              Crie exercícios interativos para as aulas dos mentorados
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Exercício
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Exercícios</p>
                  <p className="text-3xl font-bold text-gray-900">{exercicios.length}</p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Exercícios Ativos</p>
                  <p className="text-3xl font-bold text-green-600">
                    {exercicios.filter(e => e.is_active).length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Módulos</p>
                  <p className="text-3xl font-bold text-purple-600">{modulos.length}</p>
                </div>
                <BookOpen className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Aulas</p>
                  <p className="text-3xl font-bold text-orange-600">{aulas.length}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulário de Novo Exercício */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingId ? 'Editar Exercício' : 'Criar Novo Exercício'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Módulo */}
                <div>
                  <label className="block text-sm font-medium mb-2">Módulo</label>
                  <Select
                    value={novoExercicio.module_id}
                    onValueChange={(value) => setNovoExercicio(prev => ({ ...prev, module_id: value, lesson_id: '' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um módulo" />
                    </SelectTrigger>
                    <SelectContent>
                      {modulos.map(modulo => (
                        <SelectItem key={modulo.id} value={modulo.id}>
                          {modulo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Aula */}
                <div>
                  <label className="block text-sm font-medium mb-2">Aula</label>
                  <Select
                    value={novoExercicio.lesson_id}
                    onValueChange={(value) => setNovoExercicio(prev => ({ ...prev, lesson_id: value }))}
                    disabled={!novoExercicio.module_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma aula" />
                    </SelectTrigger>
                    <SelectContent>
                      {aulasDoModulo.map(aula => (
                        <SelectItem key={aula.id} value={aula.id}>
                          {aula.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Título e Descrição */}
              <div>
                <label className="block text-sm font-medium mb-2">Título do Exercício</label>
                <Input
                  value={novoExercicio.title}
                  onChange={(e) => setNovoExercicio(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Quiz sobre Marketing Digital"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Descrição</label>
                <Textarea
                  value={novoExercicio.description}
                  onChange={(e) => setNovoExercicio(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o que será avaliado neste exercício..."
                  rows={3}
                />
              </div>

              {/* Configurações do Exercício */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo</label>
                  <Select
                    value={novoExercicio.exercise_type}
                    onValueChange={(value: any) => setNovoExercicio(prev => ({ ...prev, exercise_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="essay">Dissertativo</SelectItem>
                      <SelectItem value="practical">Prático</SelectItem>
                      <SelectItem value="reflection">Reflexão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Nota Mínima (%)</label>
                  <Input
                    type="number"
                    value={novoExercicio.passing_score}
                    onChange={(e) => setNovoExercicio(prev => ({ ...prev, passing_score: parseInt(e.target.value) }))}
                    min={0}
                    max={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tempo Limite (min)</label>
                  <Input
                    type="number"
                    value={novoExercicio.time_limit_minutes || ''}
                    onChange={(e) => setNovoExercicio(prev => ({
                      ...prev,
                      time_limit_minutes: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    placeholder="Sem limite"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tentativas</label>
                  <Input
                    type="number"
                    value={novoExercicio.attempts_allowed}
                    onChange={(e) => setNovoExercicio(prev => ({ ...prev, attempts_allowed: parseInt(e.target.value) }))}
                    min={1}
                  />
                </div>
              </div>

              {/* Adicionar Questões */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Questões ({novoExercicio.questions.length})</h3>

                {/* Lista de Questões */}
                {novoExercicio.questions.map((questao, index) => (
                  <div key={questao.id} className="border rounded-lg p-4 mb-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">Questão {index + 1}</h4>
                      <Button
                        onClick={() => removerQuestao(questao.id)}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-gray-700 mb-2">{questao.question}</p>
                    {questao.options && (
                      <div className="space-y-1">
                        {questao.options.map((opcao, i) => (
                          <div
                            key={i}
                            className={`text-sm px-2 py-1 rounded ${
                              questao.correct_answer === i ? 'bg-green-100 text-green-700' : 'text-gray-600'
                            }`}
                          >
                            {String.fromCharCode(65 + i)}) {opcao}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 text-sm text-gray-500">
                      Pontos: {questao.points}
                    </div>
                  </div>
                ))}

                {/* Formulário de Nova Questão */}
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium mb-4">Adicionar Nova Questão</h4>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Tipo de Questão</label>
                        <Select
                          value={novaQuestao.type}
                          onValueChange={(value: any) => setNovaQuestao(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                            <SelectItem value="true_false">Verdadeiro/Falso</SelectItem>
                            <SelectItem value="essay">Dissertativa</SelectItem>
                            <SelectItem value="practical">Prática</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Pontos</label>
                        <Input
                          type="number"
                          value={novaQuestao.points}
                          onChange={(e) => setNovaQuestao(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                          min={1}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Pergunta</label>
                      <Textarea
                        value={novaQuestao.question}
                        onChange={(e) => setNovaQuestao(prev => ({ ...prev, question: e.target.value }))}
                        placeholder="Digite a pergunta..."
                        rows={2}
                      />
                    </div>

                    {(novaQuestao.type === 'multiple_choice' || novaQuestao.type === 'true_false') && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-2">Opções de Resposta</label>
                          <div className="space-y-2">
                            {novaQuestao.type === 'true_false' ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="correct"
                                    checked={novaQuestao.correct_answer === 0}
                                    onChange={() => setNovaQuestao(prev => ({ ...prev, correct_answer: 0 }))}
                                  />
                                  <span>Verdadeiro</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="correct"
                                    checked={novaQuestao.correct_answer === 1}
                                    onChange={() => setNovaQuestao(prev => ({ ...prev, correct_answer: 1 }))}
                                  />
                                  <span>Falso</span>
                                </div>
                              </div>
                            ) : (
                              novaQuestao.options?.map((opcao, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="correct"
                                    checked={novaQuestao.correct_answer === i}
                                    onChange={() => setNovaQuestao(prev => ({ ...prev, correct_answer: i }))}
                                  />
                                  <Input
                                    value={opcao}
                                    onChange={(e) => {
                                      const newOptions = [...(novaQuestao.options || [])]
                                      newOptions[i] = e.target.value
                                      setNovaQuestao(prev => ({ ...prev, options: newOptions }))
                                    }}
                                    placeholder={`Opção ${String.fromCharCode(65 + i)}`}
                                  />
                                </div>
                              ))
                            )}
                        </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">Explicação (opcional)</label>
                      <Input
                        value={novaQuestao.explanation}
                        onChange={(e) => setNovaQuestao(prev => ({ ...prev, explanation: e.target.value }))}
                        placeholder="Explicação da resposta correta..."
                      />
                    </div>

                    <Button onClick={adicionarQuestao} disabled={!novaQuestao.question}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Questão
                    </Button>
                  </div>
                </div>
              </div>

              {/* Ações do Formulário */}
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => { setShowForm(false); resetForm() }}
                  variant="outline"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={salvarExercicio}
                  disabled={!novoExercicio.title || !novoExercicio.lesson_id || novoExercicio.questions.length === 0}
                >
                  Salvar Exercício
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Exercícios */}
        <Card>
          <CardHeader>
            <CardTitle>Exercícios Criados</CardTitle>
          </CardHeader>
          <CardContent>
            {exercicios.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Nenhum exercício criado
                </h3>
                <p className="text-gray-500 mb-6">
                  Crie exercícios interativos para engajar seus mentorados
                </p>
                <Button onClick={() => setShowForm(true)}>
                  Criar Primeiro Exercício
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {exercicios.map((exercicio) => (
                  <div key={exercicio.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{exercicio.title}</h3>
                        <p className="text-gray-600">{exercicio.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={exercicio.is_active ? 'default' : 'secondary'}>
                          {exercicio.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Badge variant="outline">
                          {exercicio.exercise_type}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span>Questões: {exercicio.questions?.length || 0}</span>
                      <span>Nota mínima: {exercicio.passing_score}%</span>
                      <span>Tentativas: {exercicio.attempts_allowed}</span>
                      {exercicio.time_limit_minutes && (
                        <span>Tempo: {exercicio.time_limit_minutes}min</span>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm">
                        <Trash className="w-4 h-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}