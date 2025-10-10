'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Phone,
  PhoneOff,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Calendar,
  Target,
  Activity
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'

interface SocialSellerMetrics {
  month_year: string
  no_shows: number
  calls_realizadas: number
  calls_vendidas: number
  calls_nao_vendidas: number
  calls_aguardando: number
  total_calls: number
  total_vendas: number | null
  taxa_conversao: number | null
}

interface CallEvent {
  id: string
  title: string
  description: string
  start_datetime: string
  call_status: string
  sale_value: number | null
  result_notes: string
  mentorados: {
    nome_completo: string
    telefone: string
  } | null
}

export default function SocialSellerPage() {
  const [metrics, setMetrics] = useState<SocialSellerMetrics[]>([])
  const [recentCalls, setRecentCalls] = useState<CallEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSocialSellerData()
  }, [])

  const loadSocialSellerData = async () => {
    try {
      setLoading(true)

      // Carregar métricas da view
      const { data: metricsData, error: metricsError } = await supabase
        .from('social_seller_metrics')
        .select('*')
        .order('month_year', { ascending: false })
        .limit(6)

      if (metricsError) {
        console.error('Erro ao carregar métricas:', metricsError)
      } else {
        setMetrics(metricsData || [])
      }

      // Carregar calls recentes
      const { data: callsData, error: callsError } = await supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          description,
          start_datetime,
          call_status,
          sale_value,
          result_notes,
          mentorados:mentorado_id (
            nome_completo,
            telefone
          )
        `)
        .not('call_status', 'is', null)
        .order('start_datetime', { ascending: false })
        .limit(10)

      if (callsError) {
        console.error('Erro ao carregar calls:', callsError)
      } else {
        // Transformar os dados para o formato correto
        const transformedCalls = (callsData || []).map((call: any) => ({
          ...call,
          mentorados: Array.isArray(call.mentorados) && call.mentorados.length > 0
            ? call.mentorados[0]
            : null
        }))
        setRecentCalls(transformedCalls)
      }

    } catch (error) {
      console.error('Erro geral:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentMetrics = () => {
    if (metrics.length === 0) return null
    return metrics[0] // Mês mais recente
  }

  const getPercentageData = () => {
    const current = getCurrentMetrics()
    if (!current) return { noShowRate: 0, conversionRate: 0, realizationRate: 0 }

    const totalScheduled = current.total_calls
    const noShowRate = totalScheduled > 0 ? (current.no_shows / totalScheduled) * 100 : 0
    const realizationRate = totalScheduled > 0 ? ((totalScheduled - current.no_shows) / totalScheduled) * 100 : 0
    const conversionRate = current.taxa_conversao || 0

    return { noShowRate, conversionRate, realizationRate }
  }

  const getPieChartData = () => {
    const current = getCurrentMetrics()
    if (!current) return []

    return [
      { name: 'Vendidas', value: current.calls_vendidas, color: '#10b981' },
      { name: 'Não Vendidas', value: current.calls_nao_vendidas, color: '#ef4444' },
      { name: 'Aguardando', value: current.calls_aguardando, color: '#f59e0b' },
      { name: 'No-Show', value: current.no_shows, color: '#f97316' },
      { name: 'Realizadas', value: current.calls_realizadas, color: '#3b82f6' }
    ].filter(item => item.value > 0)
  }

  const getBarChartData = () => {
    return metrics.slice(0, 6).reverse().map(metric => ({
      month: new Date(metric.month_year).toLocaleDateString('pt-BR', { month: 'short' }),
      vendidas: metric.calls_vendidas,
      naoVendidas: metric.calls_nao_vendidas,
      noShows: metric.no_shows,
      totalVendas: metric.total_vendas || 0
    }))
  }

  const getConversionTrend = () => {
    return metrics.slice(0, 6).reverse().map(metric => ({
      month: new Date(metric.month_year).toLocaleDateString('pt-BR', { month: 'short' }),
      taxa: metric.taxa_conversao || 0,
      vendas: metric.total_vendas || 0
    }))
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'vendida': { label: 'Vendida', variant: 'default', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      'nao_vendida': { label: 'Não Vendida', variant: 'secondary', className: 'bg-red-100 text-red-800', icon: XCircle },
      'no_show': { label: 'No-Show', variant: 'destructive', className: 'bg-orange-100 text-orange-800', icon: PhoneOff },
      'aguardando_resposta': { label: 'Aguardando', variant: 'outline', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'realizada': { label: 'Realizada', variant: 'outline', className: 'bg-blue-100 text-blue-800', icon: Phone },
      'agendada': { label: 'Agendada', variant: 'outline', className: 'bg-gray-100 text-gray-800', icon: Calendar }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.agendada
    const Icon = config.icon

    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const currentMetrics = getCurrentMetrics()
  const percentageData = getPercentageData()
  const pieData = getPieChartData()
  const barData = getBarChartData()
  const conversionData = getConversionTrend()

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="Social Seller" subtitle="Carregando métricas..." />
        <main className="flex-1 p-6">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title="Social Seller"
        subtitle={`${currentMetrics?.total_calls || 0} calls este mês • Taxa de conversão: ${currentMetrics?.taxa_conversao || 0}%`}
      />

      <main className="flex-1 p-6 space-y-6">
        {/* Cards de Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">No-Shows</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {currentMetrics?.no_shows || 0}
                  </p>
                  <p className="text-xs text-orange-500 font-medium">
                    {percentageData.noShowRate.toFixed(1)}% do total
                  </p>
                </div>
                <PhoneOff className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Calls Realizadas</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {currentMetrics?.calls_realizadas || 0}
                  </p>
                  <p className="text-xs text-blue-500 font-medium">
                    {percentageData.realizationRate.toFixed(1)}% efetividade
                  </p>
                </div>
                <Phone className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Vendidas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {currentMetrics?.calls_vendidas || 0}
                  </p>
                  <p className="text-xs text-green-500 font-medium">
                    {percentageData.conversionRate.toFixed(1)}% conversão
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Não Vendidas</p>
                  <p className="text-2xl font-bold text-red-600">
                    {currentMetrics?.calls_nao_vendidas || 0}
                  </p>
                  <p className="text-xs text-red-500 font-medium">
                    {currentMetrics?.calls_nao_vendidas && currentMetrics?.total_calls
                      ? ((currentMetrics.calls_nao_vendidas / currentMetrics.total_calls) * 100).toFixed(1)
                      : 0}% do total
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aguardando</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {currentMetrics?.calls_aguardando || 0}
                  </p>
                  <p className="text-xs text-yellow-500 font-medium">
                    {currentMetrics?.calls_aguardando && currentMetrics?.total_calls
                      ? ((currentMetrics.calls_aguardando / currentMetrics.total_calls) * 100).toFixed(1)
                      : 0}% pendente
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards de Performance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(currentMetrics?.total_vendas || null)}
                  </p>
                  <div className="mt-2 flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min((currentMetrics?.total_vendas || 0) / 50000 * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <span className="ml-2 text-xs text-gray-500">Meta: R$ 50k</span>
                  </div>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Taxa de Conversão</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {currentMetrics?.taxa_conversao || 0}%
                  </p>
                  <div className="mt-2 flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          (currentMetrics?.taxa_conversao || 0) >= 30
                            ? 'bg-green-500'
                            : (currentMetrics?.taxa_conversao || 0) >= 20
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        style={{
                          width: `${Math.min((currentMetrics?.taxa_conversao || 0), 100)}%`
                        }}
                      ></div>
                    </div>
                    <span className="ml-2 text-xs text-gray-500">Meta: 30%</span>
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Total de Calls</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {currentMetrics?.total_calls || 0}
                  </p>
                  <div className="mt-2 flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min((currentMetrics?.total_calls || 0) / 100 * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <span className="ml-2 text-xs text-gray-500">Meta: 100</span>
                  </div>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Pizza - Distribuição de Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Distribuição de Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Área - Evolução das Vendas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                Evolução da Taxa de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={conversionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'taxa' ? `${value}%` : formatCurrency(value as number),
                        name === 'taxa' ? 'Taxa de Conversão' : 'Total de Vendas'
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="taxa"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Barras - Evolução Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              Evolução Mensal de Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="vendidas" name="Vendidas" fill="#10b981" />
                  <Bar dataKey="naoVendidas" name="Não Vendidas" fill="#ef4444" />
                  <Bar dataKey="noShows" name="No-Shows" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Métricas */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Mês</th>
                    <th className="text-center p-2">No-Shows</th>
                    <th className="text-center p-2">Realizadas</th>
                    <th className="text-center p-2">Vendidas</th>
                    <th className="text-center p-2">Não Vendidas</th>
                    <th className="text-center p-2">Aguardando</th>
                    <th className="text-center p-2">Taxa Conversão</th>
                    <th className="text-right p-2">Total Vendas</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric) => (
                    <tr key={metric.month_year} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">
                        {new Date(metric.month_year).toLocaleDateString('pt-BR', {
                          year: 'numeric',
                          month: 'long'
                        })}
                      </td>
                      <td className="text-center p-2 text-orange-600">{metric.no_shows}</td>
                      <td className="text-center p-2 text-blue-600">{metric.calls_realizadas}</td>
                      <td className="text-center p-2 text-green-600">{metric.calls_vendidas}</td>
                      <td className="text-center p-2 text-red-600">{metric.calls_nao_vendidas}</td>
                      <td className="text-center p-2 text-yellow-600">{metric.calls_aguardando}</td>
                      <td className="text-center p-2 font-medium">{metric.taxa_conversao}%</td>
                      <td className="text-right p-2 font-medium">{formatCurrency(metric.total_vendas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Calls Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Calls Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">{call.title}</h3>
                    <p className="text-sm text-gray-600">
                      {call.mentorados?.nome_completo} • {new Date(call.start_datetime).toLocaleDateString('pt-BR')}
                    </p>
                    {call.result_notes && (
                      <p className="text-xs text-gray-500 mt-1">{call.result_notes}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    {call.sale_value && (
                      <span className="font-medium text-green-600">
                        {formatCurrency(call.sale_value)}
                      </span>
                    )}
                    {getStatusBadge(call.call_status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}