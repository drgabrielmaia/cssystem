'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronRight, Play, CheckCircle, Circle, BookOpen, Trophy } from 'lucide-react'

interface Module {
  id: string
  titulo: string
  descricao: string
  ordem: number
  lessons: Lesson[]
}

interface Lesson {
  id: string
  titulo: string
  descricao: string
  video_url: string
  duracao: number
  ordem: number
  modulo_id: string
  completed: boolean
  exercises: Exercise[]
}

interface Exercise {
  id: string
  aula_id: string
  pergunta: string
  tipo: 'multipla_escolha' | 'dissertativa'
  opcoes?: string[]
  resposta_correta?: string
  ordem: number
  user_response?: string
  is_correct?: boolean
}

interface UserProgress {
  completed_lessons: string[]
  total_lessons: number
  progress_percentage: number
  completed_exercises: string[]
  total_exercises: number
  exercise_score: number
}

export default function ProgressPage() {
  const [modules, setModules] = useState<Module[]>([])
  const [userProgress, setUserProgress] = useState<UserProgress>({
    completed_lessons: [],
    total_lessons: 0,
    progress_percentage: 0,
    completed_exercises: [],
    total_exercises: 0,
    exercise_score: 0
  })
  const [selectedModule, setSelectedModule] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mentorado, setMentorado] = useState<any>(null)

  useEffect(() => {
    loadMentorado()
  }, [])

  useEffect(() => {
    if (mentorado) {
      loadModulesAndProgress()
    }
  }, [mentorado])

  const loadMentorado = () => {
    const savedMentorado = localStorage.getItem('mentorado')
    if (savedMentorado) {
      setMentorado(JSON.parse(savedMentorado))
    }
  }

  const loadModulesAndProgress = async () => {
    try {
      setLoading(true)

      // Carregar módulos com aulas
      const { data: modulesData, error: modulesError } = await supabase
        .from('modulos')
        .select(`
          *,
          aulas:aulas(
            *,
            exercicios:exercicios(*)
          )
        `)
        .eq('ativo', true)
        .order('ordem')

      if (modulesError) throw modulesError

      // Carregar progresso do usuário
      const { data: progressData, error: progressError } = await supabase
        .from('progresso_mentorados')
        .select('*')
        .eq('mentorado_id', mentorado.id)

      const { data: exerciseProgressData, error: exerciseError } = await supabase
        .from('respostas_exercicios')
        .select('*')
        .eq('mentorado_id', mentorado.id)

      const completedLessons = progressData?.map(p => p.aula_id) || []
      const exerciseResponses = exerciseProgressData || []

      // Processar dados dos módulos
      const processedModules = modulesData?.map(module => ({
        ...module,
        lessons: module.aulas
          ?.sort((a: any, b: any) => a.ordem - b.ordem)
          .map((lesson: any) => ({
            ...lesson,
            completed: completedLessons.includes(lesson.id),
            exercises: lesson.exercicios
              ?.sort((a: any, b: any) => a.ordem - b.ordem)
              .map((exercise: any) => {
                const userResponse = exerciseResponses.find(r => r.exercicio_id === exercise.id)
                return {
                  ...exercise,
                  user_response: userResponse?.resposta,
                  is_correct: userResponse?.correto
                }
              }) || []
          })) || []
      })).sort((a, b) => a.ordem - b.ordem) || []

      setModules(processedModules)

      // Calcular progresso
      const totalLessons = processedModules.reduce((acc: number, module: any) => acc + module.lessons.length, 0)
      const totalExercises = processedModules.reduce((acc: number, module: any) =>
        acc + module.lessons.reduce((lessonAcc: number, lesson: any) => lessonAcc + lesson.exercises.length, 0), 0)

      const completedExercises = exerciseResponses.filter(r => r.correto).length
      const exerciseScore = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0

      setUserProgress({
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
        progress_percentage: totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0,
        completed_exercises: exerciseResponses.filter(r => r.correto).map(r => r.exercicio_id),
        total_exercises: totalExercises,
        exercise_score: exerciseScore
      })

    } catch (error) {
      console.error('Erro ao carregar progresso:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitExerciseResponse = async (exerciseId: string, response: string, lessonId: string) => {
    try {
      const exercise = modules
        .flatMap(m => m.lessons)
        .flatMap(l => l.exercises)
        .find(e => e.id === exerciseId)

      if (!exercise) return

      const isCorrect = exercise.tipo === 'multipla_escolha'
        ? response === exercise.resposta_correta
        : true // Para dissertativas, considerar sempre corretas por enquanto

      const { error } = await supabase
        .from('respostas_exercicios')
        .upsert({
          mentorado_id: mentorado.id,
          exercicio_id: exerciseId,
          resposta: response,
          correto: isCorrect
        }, {
          onConflict: 'mentorado_id,exercicio_id'
        })

      if (error) throw error

      // Se respondeu corretamente, marcar aula como completa
      if (isCorrect) {
        const { error: progressError } = await supabase
          .from('progresso_mentorados')
          .upsert({
            mentorado_id: mentorado.id,
            aula_id: lessonId,
            completa: true,
            data_conclusao: new Date().toISOString()
          }, {
            onConflict: 'mentorado_id,aula_id'
          })

        if (progressError) throw progressError
      }

      // Recarregar dados
      loadModulesAndProgress()

    } catch (error) {
      console.error('Erro ao salvar resposta:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Meu Progresso</h1>
          <p className="text-[#6B7280]">Acompanhe seu desenvolvimento no curso</p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F3F3F5]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#1A1A1A]">Aulas Concluídas</h3>
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-[#1A1A1A] mb-2">
              {userProgress.completed_lessons.length}/{userProgress.total_lessons}
            </div>
            <div className="w-full bg-[#F3F3F5] rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${userProgress.progress_percentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-[#6B7280]">{userProgress.progress_percentage}% concluído</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F3F3F5]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#1A1A1A]">Exercícios</h3>
              <Trophy className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-[#1A1A1A] mb-2">
              {userProgress.completed_exercises.length}/{userProgress.total_exercises}
            </div>
            <div className="w-full bg-[#F3F3F5] rounded-full h-2 mb-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${userProgress.exercise_score}%` }}
              ></div>
            </div>
            <p className="text-sm text-[#6B7280]">{userProgress.exercise_score}% de acertos</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F3F3F5]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#1A1A1A]">Módulos</h3>
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-[#1A1A1A] mb-2">
              {modules.filter(m => m.lessons.every(l => l.completed)).length}/{modules.length}
            </div>
            <p className="text-sm text-[#6B7280]">Módulos completos</p>
          </div>
        </div>

        {/* Lista de Módulos */}
        <div className="space-y-4">
          {modules.map((module) => {
            const completedLessons = module.lessons.filter(l => l.completed).length
            const moduleProgress = module.lessons.length > 0
              ? Math.round((completedLessons / module.lessons.length) * 100)
              : 0
            const isModuleExpanded = selectedModule === module.id

            return (
              <div key={module.id} className="bg-white rounded-2xl shadow-sm border border-[#F3F3F5]">
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => setSelectedModule(isModuleExpanded ? null : module.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">{module.titulo}</h3>
                      <p className="text-[#6B7280] mb-3">{module.descricao}</p>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-[#6B7280]">
                          {completedLessons}/{module.lessons.length} aulas
                        </span>
                        <div className="flex-1 max-w-48 bg-[#F3F3F5] rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${moduleProgress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-[#1A1A1A]">{moduleProgress}%</span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-[#6B7280] transition-transform ${
                        isModuleExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Lista de Aulas */}
                {isModuleExpanded && (
                  <div className="px-6 pb-6 border-t border-[#F3F3F5]">
                    <div className="space-y-3 pt-6">
                      {module.lessons.map((lesson, index) => (
                        <div key={lesson.id} className="flex items-center justify-between p-4 rounded-lg bg-[#F8FAFC]">
                          <div className="flex items-center space-x-3">
                            {lesson.completed ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-[#6B7280]" />
                            )}
                            <div>
                              <h4 className="font-medium text-[#1A1A1A]">{lesson.titulo}</h4>
                              <p className="text-sm text-[#6B7280]">
                                {lesson.duracao} min • {lesson.exercises.length} exercício(s)
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {lesson.exercises.length > 0 && (
                              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                {lesson.exercises.filter(e => e.user_response).length}/{lesson.exercises.length} exercícios
                              </span>
                            )}
                            {lesson.completed && (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                Concluída
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}