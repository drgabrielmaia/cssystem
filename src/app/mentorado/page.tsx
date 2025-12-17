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
          .eq('estado_atual', 'ativo')
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
      // Se a senha tem menos de 6 caracteres, fazer autenticação direta
      if (password.length < 6) {
        // Buscar mentorado diretamente no banco
        const { data: mentoradoData, error: mentoradoError } = await supabase
          .from('mentorados')
          .select('*')
          .eq('email', email)
          .eq('estado_atual', 'ativo')
          .single()

        if (mentoradoError || !mentoradoData) {
          alert('Email não encontrado ou conta inativa')
          return
        }

        // Verificar se a senha bate (simulação básica - não há campo senha no schema)
        // Por enquanto aceitar qualquer senha para desenvolvimento
        if (mentoradoData) {
          setMentorado(mentoradoData)
          setIsLoggedIn(true)
          localStorage.setItem('mentorado', JSON.stringify(mentoradoData))
          return
        } else {
          alert('Senha incorreta')
          return
        }
      }

      // Para senhas >= 6 caracteres, usar autenticação normal do Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (authError) {
        // Se falhou no Supabase, tentar autenticação direta também
        const { data: mentoradoData, error: mentoradoError } = await supabase
          .from('mentorados')
          .select('*')
          .eq('email', email)
          .eq('estado_atual', 'ativo')
          .single()

        // Aceitar qualquer senha por enquanto (não há campo senha no schema)
        if (mentoradoData) {
          setMentorado(mentoradoData)
          setIsLoggedIn(true)
          localStorage.setItem('mentorado', JSON.stringify(mentoradoData))
          return
        }

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
    <div className="p-8 space-y-8 bg-white">
      {/* Título Principal */}
      <div className="mb-8">
        <h1 className="text-[32px] font-semibold text-[#1A1A1A] mb-2">
          Olá, {mentorado?.nome?.split(' ')[0]}!
        </h1>
        <p className="text-[15px] text-[#6B7280]">
          Continue seu aprendizado de onde parou
        </p>
      </div>

      {/* Cards de Progresso Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card de Progresso Principal */}
        <div className="bg-[#F3F3F5] rounded-[20px] p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[13px] text-[#6B7280] font-medium mb-1">Progresso Geral</p>
              <div className="flex items-center">
                <div className="w-16 h-16 rounded-full border-4 border-[#E879F9] flex items-center justify-center bg-white">
                  <span className="text-[18px] font-bold text-[#1A1A1A]">
                    {progressPercentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[14px] font-medium text-[#1A1A1A]">
                {dashboardStats.completedLessons}/{dashboardStats.totalLessons}
              </p>
              <p className="text-[12px] text-[#6B7280]">aulas</p>
            </div>
          </div>
        </div>

        {/* Módulos Disponíveis */}
        <div className="bg-[#F3F3F5] rounded-[20px] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#6B7280] font-medium mb-2">Módulos</p>
              <p className="text-[28px] font-bold text-[#1A1A1A]">
                {dashboardStats.totalModules}
              </p>
            </div>
            <div className="w-12 h-12 bg-[#1A1A1A] rounded-[12px] flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Comissões */}
        <div className="bg-[#F3F3F5] rounded-[20px] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#6B7280] font-medium mb-2">Comissões</p>
              <p className="text-[18px] font-bold text-[#1A1A1A]">
                {formatCurrency(dashboardStats.totalComissoes)}
              </p>
            </div>
            <div className="w-12 h-12 bg-[#22C55E] rounded-[12px] flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Seção Principal - Vídeo Aula */}
      <div className="bg-[#F3F3F5] rounded-[24px] p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-semibold text-[#1A1A1A]">
            Continue assistindo
          </h2>
          <Link
            href="/mentorado/videos"
            className="text-[14px] text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
          >
            Ver todos
          </Link>
        </div>

        {/* Placeholder para Vídeo */}
        <div className="bg-[#1A1A1A] rounded-[20px] aspect-video mb-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-4">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
            <p className="text-white text-[15px]">
              Próxima aula disponível
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-medium text-[#1A1A1A] mb-1">
              Assistir próxima aula
            </h3>
            <p className="text-[14px] text-[#6B7280]">
              Continue seu progresso de aprendizado
            </p>
          </div>
          <Link
            href="/mentorado/videos"
            className="bg-[#1A1A1A] text-white px-6 py-3 rounded-full text-[14px] font-medium hover:bg-opacity-90 transition-all"
          >
            Assistir agora
          </Link>
        </div>
      </div>

      {/* Resumo de Atividade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Última Atividade */}
        <div className="bg-[#F3F3F5] rounded-[20px] p-6">
          <h3 className="text-[16px] font-medium text-[#1A1A1A] mb-4">
            Última Atividade
          </h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-[#22C55E] rounded-full mr-3"></div>
              <span className="text-[14px] text-[#6B7280]">
                {formatLastActivity(dashboardStats.lastActivity)}
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-[#E879F9] rounded-full mr-3"></div>
              <span className="text-[14px] text-[#6B7280]">
                Turma: {mentorado?.turma || 'Principal'}
              </span>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="bg-[#F3F3F5] rounded-[20px] p-6">
          <h3 className="text-[16px] font-medium text-[#1A1A1A] mb-4">
            Ações Rápidas
          </h3>
          <div className="space-y-3">
            <Link
              href="/mentorado/comissoes"
              className="flex items-center justify-between p-3 bg-white rounded-[12px] hover:bg-opacity-80 transition-colors group"
            >
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-[#6B7280] mr-3" />
                <span className="text-[14px] text-[#1A1A1A]">Ver Comissões</span>
              </div>
              <span className="text-[12px] text-[#6B7280] group-hover:text-[#1A1A1A] transition-colors">
                →
              </span>
            </Link>

            <Link
              href="/mentorado/videos"
              className="flex items-center justify-between p-3 bg-white rounded-[12px] hover:bg-opacity-80 transition-colors group"
            >
              <div className="flex items-center">
                <Video className="w-5 h-5 text-[#6B7280] mr-3" />
                <span className="text-[14px] text-[#1A1A1A]">Minhas Aulas</span>
              </div>
              <span className="text-[12px] text-[#6B7280] group-hover:text-[#1A1A1A] transition-colors">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}