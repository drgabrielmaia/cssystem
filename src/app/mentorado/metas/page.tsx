'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'
import {
  Target, Trophy, Plus, CheckCircle, Clock, Star, Heart,
  BookOpen, Zap, Award, ArrowLeft, Calendar, Filter
} from 'lucide-react'
import Link from 'next/link'

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
  const { user } = useAuth()
  const [metas, setMetas] = useState<MetaAluno[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [novaMeta, setNovaMeta] = useState({
    title: '',
    description: '',
    goal_type: 'medium_term' as 'short_term' | 'medium_term' | 'long_term' | 'big_term',
    category_id: '',
    priority_level: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    due_date: ''
  })

  const categoriasMeta = [
    { value: 'financeira', label: 'Financeira', icon: <Trophy className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'profissional', label: 'Profissional', icon: <Zap className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
    { value: 'pessoal', label: 'Pessoal', icon: <Heart className="h-4 w-4" />, color: 'bg-pink-100 text-pink-800' },
    { value: 'saude', label: 'Saúde', icon: <Award className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
    { value: 'aprendizado', label: 'Aprendizado', icon: <BookOpen className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' }
  ]

  const prazosMeta = [
    { value: 'short_term', label: 'Curto Prazo', sublabel: '1-3 meses', color: 'bg-red-100 text-red-800' },
    { value: 'medium_term', label: 'Médio Prazo', sublabel: '3-6 meses', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'long_term', label: 'Longo Prazo', sublabel: '6-12 meses', color: 'bg-blue-100 text-blue-800' },
    { value: 'big_term', label: 'Grande Meta', sublabel: '1+ anos', color: 'bg-purple-100 text-purple-800' }
  ]

  useEffect(() => {
    if (user?.id) {
      carregarMetas()
    }
  }, [user])

  const carregarMetas = async () => {
    try {
      const { data, error } = await supabase
        .from('video_learning_goals')
        .select('*')
        .eq('mentorado_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMetas(data || [])
    } catch (error) {
      console.error('Erro ao carregar metas:', error)
      setMetas([])
    } finally {
      setLoading(false)
    }
  }

  const criarMeta = async () => {
    if (!user?.id || !novaMeta.title) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('video_learning_goals')
        .insert([{
          mentorado_id: user.id,
          title: novaMeta.title,
          description: novaMeta.description,
          goal_type: novaMeta.goal_type,
          priority_level: novaMeta.priority_level,
          due_date: novaMeta.due_date || null,
          status: 'pending',
          progress_percentage: 0
        }])

      if (error) throw error

      await carregarMetas()
      setNovaMeta({
        title: '',
        description: '',
        goal_type: 'medium_term',
        category_id: '',
        priority_level: 'medium',
        due_date: ''
      })

    } catch (error) {
      console.error('Erro ao criar meta:', error)
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
      await carregarMetas()
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D4AF37] to-[#FFD700] p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/mentorado" className="p-3 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-800" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Minhas Metas</h1>
              <p className="text-slate-700">Defina e acompanhe seus objetivos pessoais</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-slate-800 border-slate-800/20">
            {user?.email?.split('@')[0]}
          </Badge>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/90 backdrop-blur-sm border-[#B8860B] shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total</p>
                  <p className="text-3xl font-bold text-slate-800">{estatisticas.total}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#FFD700] rounded-xl flex items-center justify-center">
                  <Target className="h-6 w-6 text-slate-800" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-[#B8860B] shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Ativas</p>
                  <p className="text-3xl font-bold text-slate-800">{estatisticas.ativas}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-[#CD853F] to-[#DEB887] rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-slate-800" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-[#B8860B] shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Concluídas</p>
                  <p className="text-3xl font-bold text-slate-800">{estatisticas.concluidas}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-[#B8860B] shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Taxa de Sucesso</p>
                  <p className="text-3xl font-bold text-slate-800">{estatisticas.taxaConclusao.toFixed(0)}%</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-[#DAA520] to-[#B8860B] rounded-xl flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Criar Nova Meta */}
          <Card className="lg:col-span-1 bg-white/90 backdrop-blur-sm border-[#B8860B] shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-slate-800">
                <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#FFD700] rounded-xl flex items-center justify-center">
                  <Plus className="h-5 w-5 text-slate-800" />
                </div>
                Nova Meta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título da Meta</Label>
                <Input
                  value={novaMeta.title}
                  onChange={(e) => setNovaMeta(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Concluir curso de marketing digital"
                />
              </div>

              <div>
                <Label>Tipo de Meta</Label>
                <Select
                  value={novaMeta.goal_type}
                  onValueChange={(value: any) => setNovaMeta(prev => ({ ...prev, goal_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {prazosMeta.map(prazo => (
                      <SelectItem key={prazo.value} value={prazo.value}>
                        {prazo.label} ({prazo.sublabel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data Limite</Label>
                <Input
                  type="date"
                  value={novaMeta.due_date}
                  onChange={(e) => setNovaMeta(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>

              <div>
                <Label>Prioridade</Label>
                <Select
                  value={novaMeta.priority_level}
                  onValueChange={(value: any) => setNovaMeta(prev => ({ ...prev, priority_level: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={novaMeta.description}
                  onChange={(e) => setNovaMeta(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva sua meta..."
                  rows={3}
                />
              </div>

              <Button
                onClick={criarMeta}
                disabled={!novaMeta.title || saving}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {saving ? 'Criando...' : 'Criar Meta'}
              </Button>
            </CardContent>
          </Card>

          {/* Lista de Metas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filtros */}
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      <SelectItem value="ativo">Ativas</SelectItem>
                      <SelectItem value="concluido">Concluídas</SelectItem>
                      <SelectItem value="pausado">Pausadas</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">
                    {metasFiltradas.length} meta(s) encontrada(s)
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Metas */}
            {metasFiltradas.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="text-center py-12">
                  <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    {metas.length === 0 ? 'Crie sua primeira meta' : 'Nenhuma meta encontrada'}
                  </h3>
                  <p className="text-gray-500">
                    {metas.length === 0
                      ? 'Defina objetivos claros para acompanhar seu progresso'
                      : 'Ajuste os filtros para ver suas metas'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {metasFiltradas.map((meta) => {
                  const prazo = prazosMeta.find(p => p.value === meta.goal_type)
                  const isCompleted = meta.status === 'completed'
                  const isActive = meta.status === 'pending' || meta.status === 'in_progress'

                  return (
                    <Card
                      key={meta.id}
                      className={`transition-all hover:shadow-md border-2 ${
                        isCompleted
                          ? 'border-green-300 bg-gradient-to-r from-green-50 to-green-100'
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            {/* Checkbox para marcar como concluída */}
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => concluirMeta(meta.id)}
                                disabled={isCompleted}
                                className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  isCompleted
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                                }`}
                              >
                                {isCompleted && <CheckCircle className="h-4 w-4" />}
                              </button>
                              <div className="flex-1">
                                <h3 className={`text-xl font-semibold mb-2 ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                                  {meta.title}
                                </h3>
                                {meta.description && (
                                  <p className="text-gray-600 mb-3">{meta.description}</p>
                                )}
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mb-3">
                              <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Progresso</span>
                                <span>{meta.progress_percentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    isCompleted ? 'bg-green-500' :
                                    meta.progress_percentage > 70 ? 'bg-blue-500' :
                                    meta.progress_percentage > 30 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${meta.progress_percentage}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                              {prazo && (
                                <Badge variant="outline" className={prazo.color}>
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {prazo.label}
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={
                                  meta.priority_level === 'critical' ? 'bg-red-100 text-red-700' :
                                  meta.priority_level === 'high' ? 'bg-orange-100 text-orange-700' :
                                  meta.priority_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }
                              >
                                {meta.priority_level === 'critical' ? 'Crítica' :
                                 meta.priority_level === 'high' ? 'Alta' :
                                 meta.priority_level === 'medium' ? 'Média' : 'Baixa'
                                } Prioridade
                              </Badge>
                              <Badge variant={isCompleted ? 'default' : 'secondary'}>
                                {isCompleted ? '✅ Concluída' :
                                 meta.status === 'in_progress' ? '🔄 Em Progresso' :
                                 meta.status === 'paused' ? '⏸️ Pausada' : '⏳ Pendente'}
                              </Badge>
                            </div>

                            {meta.due_date && (
                              <div className="text-sm text-gray-500">
                                📅 Prazo: {new Date(meta.due_date).toLocaleDateString('pt-BR')}
                                {new Date(meta.due_date) < new Date() && !isCompleted && (
                                  <span className="text-red-500 font-medium ml-2">⚠️ Vencida</span>
                                )}
                              </div>
                            )}
                          </div>

                          {isCompleted && (
                            <div className="flex items-center gap-2 text-green-600">
                              <Trophy className="h-8 w-8" />
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 pt-3 border-t">
                          Criada em {new Date(meta.created_at).toLocaleDateString('pt-BR')}
                          {meta.completed_at && (
                            <> • Concluída em {new Date(meta.completed_at).toLocaleDateString('pt-BR')}</>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}