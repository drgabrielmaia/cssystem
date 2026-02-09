'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!closer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Portal do Closer/SDR</CardTitle>
            <CardDescription>
              Acesse seu dashboard de vendas e atividades
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

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Olá, {closer.nome_completo?.split(' ')[0]}!
              </h1>
              <p className="text-sm text-gray-500">
                {closer.tipo_closer === 'sdr' ? 'SDR' : 
                 closer.tipo_closer === 'closer' ? 'Closer' :
                 closer.tipo_closer === 'closer_senior' ? 'Closer Senior' : 'Manager'}
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Vendas do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{metrics?.totalVendas || 0}</div>
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              {monthlyTarget && (
                <p className="text-xs text-gray-500 mt-1">
                  Meta: {monthlyTarget.meta_vendas_quantidade || 0}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Valor Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  R$ {metrics?.valorTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </div>
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              {monthlyTarget && (
                <p className="text-xs text-gray-500 mt-1">
                  Meta: R$ {monthlyTarget.meta_vendas_valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Comissões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  R$ {metrics?.comissaoTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </div>
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {closer.comissao_percentual || 5}% de comissão
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Taxa de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {metrics?.taxaConversao?.toFixed(1) || 0}%
                </div>
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              {monthlyTarget && (
                <p className="text-xs text-gray-500 mt-1">
                  Meta: {monthlyTarget.meta_conversao_rate || 0}%
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Leads Atendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{metrics?.leadsAtendidos || 0}</div>
                <Users className="h-5 w-5 text-indigo-500" />
              </div>
              {monthlyTarget && (
                <p className="text-xs text-gray-500 mt-1">
                  Meta: {monthlyTarget.meta_leads_atendidos || 0}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Atividades Recentes</CardTitle>
              <CardDescription>Suas últimas interações com leads</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivities.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhuma atividade registrada</p>
              ) : (
                <div className="space-y-3">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b last:border-0">
                      <div className="flex-shrink-0 mt-1">
                        {getActivityIcon(activity.tipo_atividade)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.tipo_atividade.charAt(0).toUpperCase() + activity.tipo_atividade.slice(1)}
                        </p>
                        <p className="text-xs text-gray-500">{activity.descricao}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(activity.data_atividade).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {getResultIcon(activity.resultado)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-4 border-t">
                <Link href="/closer/atividades">
                  <Button variant="outline" className="w-full">
                    Ver todas as atividades
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
              <CardDescription>Acesse suas ferramentas de trabalho</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/closer/leads">
                  <Button variant="outline" className="w-full h-24 flex flex-col">
                    <Users className="h-6 w-6 mb-2" />
                    <span>Gerenciar Leads</span>
                  </Button>
                </Link>

                <Link href="/closer/vendas">
                  <Button variant="outline" className="w-full h-24 flex flex-col">
                    <DollarSign className="h-6 w-6 mb-2" />
                    <span>Registrar Venda</span>
                  </Button>
                </Link>

                <Link href="/closer/atividades/nova">
                  <Button variant="outline" className="w-full h-24 flex flex-col">
                    <Activity className="h-6 w-6 mb-2" />
                    <span>Nova Atividade</span>
                  </Button>
                </Link>

                <Link href="/closer/relatorios">
                  <Button variant="outline" className="w-full h-24 flex flex-col">
                    <BarChart3 className="h-6 w-6 mb-2" />
                    <span>Relatórios</span>
                  </Button>
                </Link>

                <Link href="/closer/calendario">
                  <Button variant="outline" className="w-full h-24 flex flex-col">
                    <Calendar className="h-6 w-6 mb-2" />
                    <span>Calendário</span>
                  </Button>
                </Link>

                <Link href="/closer/comissoes">
                  <Button variant="outline" className="w-full h-24 flex flex-col">
                    <DollarSign className="h-6 w-6 mb-2" />
                    <span>Minhas Comissões</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart Placeholder */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Desempenho Mensal</CardTitle>
            <CardDescription>Acompanhe sua evolução ao longo do mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Gráfico de desempenho</p>
                <p className="text-sm text-gray-400">Em desenvolvimento</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
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