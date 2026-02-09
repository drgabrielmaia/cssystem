'use client'

import { useState, useEffect } from 'react'
import { 
  UserCheck, 
  Mail, 
  Eye, 
  EyeOff, 
  LogIn, 
  Phone,
  Target,
  TrendingUp,
  DollarSign,
  Activity,
  Users,
  Calendar,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { CloserAuthProvider, useCloserAuth } from '@/contexts/closer-auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface CloserMetrics {
  totalVendas: number
  valorTotal: number
  comissaoTotal: number
  taxaConversao: number
  leadsAtendidos: number
}

interface CloserActivity {
  id: string
  tipo_atividade: string
  descricao: string
  data_atividade: string
  resultado?: string
}

function CloserPageContent() {
  const { closer, loading: authLoading, error, signIn, signOut } = useCloserAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [metrics, setMetrics] = useState<CloserMetrics | null>(null)
  const [recentActivities, setRecentActivities] = useState<CloserActivity[]>([])
  const [monthlyTarget, setMonthlyTarget] = useState<any>(null)

  useEffect(() => {
    if (closer) {
      loadMetrics()
      loadRecentActivities()
      loadMonthlyTarget()
    }
  }, [closer])

  const loadMetrics = async () => {
    if (!closer) return

    try {
      // Get current month and year
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()

      // Call the stored function to get metrics
      const { data, error } = await supabase.rpc('calculate_closer_metrics', {
        p_closer_id: closer.id,
        p_month: currentMonth,
        p_year: currentYear
      })

      if (error) {
        console.error('Error loading metrics:', error)
        // Fallback to default values if function doesn't exist
        setMetrics({
          totalVendas: 0,
          valorTotal: 0,
          comissaoTotal: 0,
          taxaConversao: 0,
          leadsAtendidos: 0
        })
      } else if (data && data.length > 0) {
        setMetrics({
          totalVendas: data[0].total_vendas || 0,
          valorTotal: data[0].valor_total || 0,
          comissaoTotal: data[0].comissao_total || 0,
          taxaConversao: data[0].taxa_conversao || 0,
          leadsAtendidos: data[0].leads_atendidos || 0
        })
      } else {
        // No data returned, set default values
        setMetrics({
          totalVendas: 0,
          valorTotal: 0,
          comissaoTotal: 0,
          taxaConversao: 0,
          leadsAtendidos: 0
        })
      }
    } catch (error) {
      console.error('Error loading metrics:', error)
      setMetrics({
        totalVendas: 0,
        valorTotal: 0,
        comissaoTotal: 0,
        taxaConversao: 0,
        leadsAtendidos: 0
      })
    }
  }

  const loadRecentActivities = async () => {
    if (!closer) return

    try {
      const { data, error } = await supabase
        .from('closers_atividades')
        .select('*')
        .eq('closer_id', closer.id)
        .order('data_atividade', { ascending: false })
        .limit(5)

      if (!error && data) {
        setRecentActivities(data)
      }
    } catch (error) {
      console.error('Error loading activities:', error)
    }
  }

  const loadMonthlyTarget = async () => {
    if (!closer) return

    try {
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()

      const { data, error } = await supabase
        .from('closers_metas')
        .select('*')
        .eq('closer_id', closer.id)
        .eq('mes', currentMonth)
        .eq('ano', currentYear)
        .single()

      if (!error && data) {
        setMonthlyTarget(data)
      }
    } catch (error) {
      console.error('Error loading monthly target:', error)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const success = await signIn(email, password)

    if (!success && error) {
      alert(error)
    }

    setLoading(false)
  }

  const handleLogout = async () => {
    await signOut()
    setEmail('')
    setPassword('')
  }

  const getActivityIcon = (tipo: string) => {
    switch (tipo) {
      case 'ligacao': return <Phone className="h-4 w-4" />
      case 'whatsapp': return <Phone className="h-4 w-4" />
      case 'email': return <Mail className="h-4 w-4" />
      case 'reuniao': return <Users className="h-4 w-4" />
      case 'follow_up': return <Clock className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getResultIcon = (resultado?: string) => {
    switch (resultado) {
      case 'venda': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'recusa': return <XCircle className="h-4 w-4 text-red-500" />
      case 'follow_up_necessario': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    )
  }

  if (!closer) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="text-center mb-6">
              <div className="avatar placeholder mb-4">
                <div className="bg-primary text-primary-content rounded-full w-16">
                  <UserCheck className="h-8 w-8" />
                </div>
              </div>
              <h2 className="card-title text-2xl justify-center">Portal do Closer/SDR</h2>
              <p className="text-base-content/70">
                Acesse seu dashboard de vendas e atividades
              </p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="input input-bordered w-full"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Senha</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Sua senha"
                    className="input input-bordered w-full pr-12"
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="alert alert-error">
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className={`btn btn-primary w-full ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {!loading && (
                  <>
                    Entrar
                    <LogIn className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="navbar bg-base-100 shadow-lg">
        <div className="navbar-start">
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16"></path>
              </svg>
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold">
              Olá, {closer.nome_completo?.split(' ')[0]}!
            </h1>
            <div className="badge badge-primary badge-sm">
              {closer.tipo_closer === 'sdr' ? 'SDR' : 
               closer.tipo_closer === 'closer' ? 'Closer' :
               closer.tipo_closer === 'closer_senior' ? 'Closer Senior' : 'Manager'}
            </div>
          </div>
        </div>
        <div className="navbar-end">
          <button onClick={handleLogout} className="btn btn-outline">
            Sair
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-medium text-base-content/70 uppercase tracking-wider">
                    Vendas do Mês
                  </h2>
                  <div className="text-2xl font-bold">{metrics?.totalVendas || 0}</div>
                  {monthlyTarget && (
                    <p className="text-xs text-base-content/50">
                      Meta: {monthlyTarget.meta_vendas_quantidade || 0}
                    </p>
                  )}
                </div>
                <div className="text-primary">
                  <Target className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-medium text-base-content/70 uppercase tracking-wider">
                    Valor Total
                  </h2>
                  <div className="text-2xl font-bold">
                    R$ {metrics?.valorTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </div>
                  {monthlyTarget && (
                    <p className="text-xs text-base-content/50">
                      Meta: R$ {monthlyTarget.meta_vendas_valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </p>
                  )}
                </div>
                <div className="text-success">
                  <DollarSign className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-medium text-base-content/70 uppercase tracking-wider">
                    Comissões
                  </h2>
                  <div className="text-2xl font-bold">
                    R$ {metrics?.comissaoTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </div>
                  <p className="text-xs text-base-content/50">
                    {closer.comissao_percentual || 5}% de comissão
                  </p>
                </div>
                <div className="text-secondary">
                  <DollarSign className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-medium text-base-content/70 uppercase tracking-wider">
                    Taxa de Conversão
                  </h2>
                  <div className="text-2xl font-bold">
                    {metrics?.taxaConversao?.toFixed(1) || 0}%
                  </div>
                  {monthlyTarget && (
                    <p className="text-xs text-base-content/50">
                      Meta: {monthlyTarget.meta_conversao_rate || 0}%
                    </p>
                  )}
                </div>
                <div className="text-warning">
                  <TrendingUp className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-medium text-base-content/70 uppercase tracking-wider">
                    Leads Atendidos
                  </h2>
                  <div className="text-2xl font-bold">{metrics?.leadsAtendidos || 0}</div>
                  {monthlyTarget && (
                    <p className="text-xs text-base-content/50">
                      Meta: {monthlyTarget.meta_leads_atendidos || 0}
                    </p>
                  )}
                </div>
                <div className="text-info">
                  <Users className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activities */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Atividades Recentes</h2>
              <p className="text-base-content/70 mb-4">Suas últimas interações com leads</p>
              
              {recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-base-content/50">Nenhuma atividade registrada</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-base-200 rounded-lg">
                      <div className="avatar placeholder">
                        <div className="bg-primary text-primary-content rounded-full w-8">
                          {getActivityIcon(activity.tipo_atividade)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {activity.tipo_atividade.charAt(0).toUpperCase() + activity.tipo_atividade.slice(1)}
                        </div>
                        <div className="text-sm text-base-content/70">{activity.descricao}</div>
                        <div className="text-xs text-base-content/50 mt-1">
                          {new Date(activity.data_atividade).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {getResultIcon(activity.resultado)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6">
                <Link href="/closer/atividades">
                  <button className="btn btn-outline w-full">
                    Ver todas as atividades
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Ações Rápidas</h2>
              <p className="text-base-content/70 mb-4">Acesse suas ferramentas de trabalho</p>
              
              <div className="grid grid-cols-2 gap-4">
                <Link href="/closer/leads">
                  <div className="card bg-base-200 hover:bg-base-300 cursor-pointer transition-colors">
                    <div className="card-body items-center text-center p-6">
                      <Users className="h-8 w-8 text-primary mb-2" />
                      <span className="font-medium">Gerenciar Leads</span>
                    </div>
                  </div>
                </Link>

                <Link href="/closer/vendas">
                  <div className="card bg-base-200 hover:bg-base-300 cursor-pointer transition-colors">
                    <div className="card-body items-center text-center p-6">
                      <DollarSign className="h-8 w-8 text-success mb-2" />
                      <span className="font-medium">Registrar Venda</span>
                    </div>
                  </div>
                </Link>

                <Link href="/closer/atividades/nova">
                  <div className="card bg-base-200 hover:bg-base-300 cursor-pointer transition-colors">
                    <div className="card-body items-center text-center p-6">
                      <Activity className="h-8 w-8 text-secondary mb-2" />
                      <span className="font-medium">Nova Atividade</span>
                    </div>
                  </div>
                </Link>

                <Link href="/closer/relatorios">
                  <div className="card bg-base-200 hover:bg-base-300 cursor-pointer transition-colors">
                    <div className="card-body items-center text-center p-6">
                      <BarChart3 className="h-8 w-8 text-info mb-2" />
                      <span className="font-medium">Relatórios</span>
                    </div>
                  </div>
                </Link>

                <Link href="/closer/calendario">
                  <div className="card bg-base-200 hover:bg-base-300 cursor-pointer transition-colors">
                    <div className="card-body items-center text-center p-6">
                      <Calendar className="h-8 w-8 text-warning mb-2" />
                      <span className="font-medium">Calendário</span>
                    </div>
                  </div>
                </Link>

                <Link href="/closer/comissoes">
                  <div className="card bg-base-200 hover:bg-base-300 cursor-pointer transition-colors">
                    <div className="card-body items-center text-center p-6">
                      <DollarSign className="h-8 w-8 text-accent mb-2" />
                      <span className="font-medium">Minhas Comissões</span>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Chart Placeholder */}
        <div className="card bg-base-100 shadow-xl mt-8">
          <div className="card-body">
            <h2 className="card-title">Desempenho Mensal</h2>
            <p className="text-base-content/70 mb-4">Acompanhe sua evolução ao longo do mês</p>
            
            <div className="h-64 bg-base-200 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 text-primary" />
                <p className="text-base-content/60">Gráfico de desempenho</p>
                <p className="text-sm text-base-content/40">Em desenvolvimento</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CloserLoginPage() {
  return (
    <CloserAuthProvider>
      <CloserPageContent />
    </CloserAuthProvider>
  )
}