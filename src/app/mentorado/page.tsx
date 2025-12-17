'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserCheck, Mail, Eye, EyeOff, LogIn, Play, BookOpen, DollarSign, TrendingUp, Calendar, Award, CheckCircle, Clock, Video, Target } from 'lucide-react'
import Link from 'next/link'

export default function MentoradoLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [mentorado, setMentorado] = useState<any>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const { data: mentoradoData, error } = await supabase
          .from('mentorados')
          .select('*')
          .eq('email', session.user.email)
          .eq('status_login', 'ativo')
          .single()

        if (mentoradoData && !error) {
          setMentorado(mentoradoData)
          setIsLoggedIn(true)
          localStorage.setItem('mentorado', JSON.stringify(mentoradoData))
        } else {
          await supabase.auth.signOut()
        }
      } else {
        const savedMentorado = localStorage.getItem('mentorado')
        if (savedMentorado) {
          const mentoradoData = JSON.parse(savedMentorado)
          setMentorado(mentoradoData)
          setIsLoggedIn(true)
        }
      }
    }

    checkAuth()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (authError) {
        alert('Email ou senha incorretos')
        return
      }

      const { data: mentoradoData, error: mentoradoError } = await supabase
        .from('mentorados')
        .select('*')
        .eq('email', email)
        .eq('status_login', 'ativo')
        .single()

      if (mentoradoError || !mentoradoData) {
        alert('Conta não encontrada ou inativa')
        await supabase.auth.signOut()
        return
      }

      setMentorado(mentoradoData)
      setIsLoggedIn(true)
      localStorage.setItem('mentorado', JSON.stringify(mentoradoData))

    } catch (error) {
      console.error('Erro no login:', error)
      alert('Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('mentorado')
      setIsLoggedIn(false)
      setMentorado(null)
      setEmail('')
      setPassword('')
      window.location.reload()
    } catch (error) {
      console.error('Erro no logout:', error)
      localStorage.removeItem('mentorado')
      setIsLoggedIn(false)
      window.location.reload()
    }
  }

  const [dashboardStats, setDashboardStats] = useState({
    totalModules: 0,
    totalLessons: 0,
    completedLessons: 0,
    totalComissoes: 0,
    comissoesPendentes: 0,
    lastActivity: null as string | null
  })

  useEffect(() => {
    if (mentorado) {
      loadDashboardStats()
    }
  }, [mentorado])

  const loadDashboardStats = async () => {
    try {
      // Buscar módulos com acesso
      const { data: accessData } = await supabase
        .from('video_access_control')
        .select('module_id')
        .eq('mentorado_id', mentorado.id)
        .eq('has_access', true)

      const accessibleModuleIds = accessData?.map(a => a.module_id) || []

      // Contar módulos
      const { count: totalModules } = await supabase
        .from('video_modules')
        .select('id', { count: 'exact' })
        .in('id', accessibleModuleIds.length > 0 ? accessibleModuleIds : [''])
        .eq('is_active', true)

      // Contar aulas
      const { count: totalLessons } = await supabase
        .from('video_lessons')
        .select('id', { count: 'exact' })
        .in('module_id', accessibleModuleIds.length > 0 ? accessibleModuleIds : [''])
        .eq('is_active', true)

      // Contar aulas concluídas
      const { count: completedLessons } = await supabase
        .from('lesson_progress')
        .select('id', { count: 'exact' })
        .eq('mentorado_id', mentorado.id)
        .eq('is_completed', true)

      // Buscar comissões
      const { data: comissoesData } = await supabase
        .from('comissoes')
        .select('valor, status')
        .eq('mentorado_id', mentorado.id)

      const totalComissoes = comissoesData?.reduce((acc, c) => acc + c.valor, 0) || 0
      const comissoesPendentes = comissoesData?.filter(c => c.status === 'pendente').reduce((acc, c) => acc + c.valor, 0) || 0

      // Última atividade
      const { data: lastActivityData } = await supabase
        .from('lesson_progress')
        .select('started_at')
        .eq('mentorado_id', mentorado.id)
        .order('started_at', { ascending: false })
        .limit(1)

      setDashboardStats({
        totalModules: totalModules || 0,
        totalLessons: totalLessons || 0,
        completedLessons: completedLessons || 0,
        totalComissoes,
        comissoesPendentes,
        lastActivity: lastActivityData?.[0]?.started_at || null
      })

    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Portal do Mentorado</CardTitle>
            <CardDescription>
              Acesse suas aulas e módulos de aprendizado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Sua senha"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
                <LogIn className="h-4 w-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatLastActivity = (dateString: string | null) => {
    if (!dateString) return 'Nunca'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Hoje'
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 7) return `${diffDays} dias atrás`
    return date.toLocaleDateString('pt-BR')
  }

  const progressPercentage = dashboardStats.totalLessons > 0
    ? (dashboardStats.completedLessons / dashboardStats.totalLessons) * 100
    : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header de Boas-vindas */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Olá, {mentorado?.nome_completo?.split(' ')[0]}! 👋
            </h1>
            <p className="text-blue-100 mb-4">
              Bem-vindo ao seu portal de aprendizado
            </p>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Última atividade: {formatLastActivity(dashboardStats.lastActivity)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span>Turma: {mentorado?.turma || 'Principal'}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <Award className="w-16 h-16 text-blue-200 mb-2" />
            <div className="text-sm text-blue-100">
              {progressPercentage.toFixed(1)}% de progresso
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Módulos Disponíveis</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalModules}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Aulas Concluídas</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardStats.completedLessons}/{dashboardStats.totalLessons}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Comissões Pendentes</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboardStats.comissoesPendentes)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Comissões</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboardStats.totalComissoes)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Progresso de Aprendizado */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Seu Progresso</h3>
            <Link href="/mentorado/videos" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Ver todos →
            </Link>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progresso geral</span>
              <span>{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center text-sm">
              <Video className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-gray-600">{dashboardStats.totalLessons} aulas disponíveis</span>
            </div>
            <div className="flex items-center text-sm">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-gray-600">{dashboardStats.completedLessons} aulas concluídas</span>
            </div>
          </div>

          <Link
            href="/mentorado/videos"
            className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <Play className="w-4 h-4 mr-2" />
            Continuar Estudando
          </Link>
        </div>

        {/* Resumo Financeiro */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Resumo Financeiro</h3>
            <Link href="/mentorado/comissoes" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Ver detalhes →
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-green-600 mr-2" />
                <span className="font-medium text-gray-900">Total Acumulado</span>
              </div>
              <span className="font-bold text-green-600">
                {formatCurrency(dashboardStats.totalComissoes)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="font-medium text-gray-900">Aguardando Pagamento</span>
              </div>
              <span className="font-bold text-yellow-600">
                {formatCurrency(dashboardStats.comissoesPendentes)}
              </span>
            </div>
          </div>

          <Link
            href="/mentorado/comissoes"
            className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Ver Comissões
          </Link>
        </div>
      </div>
    </div>
  )
}