'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  ArrowLeft,
  Download,
  Calendar,
  DollarSign,
  Target,
  Phone,
  Mail,
  Users,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { CloserAuthProvider, useCloserAuth } from '@/contexts/closer-auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface ReportMetrics {
  totalVendas: number
  valorTotalVendas: number
  comissaoTotal: number
  totalAtividades: number
  leadsAtendidos: number
  taxaConversao: number
  ticketMedio: number
  atividadesPorTipo: Record<string, number>
  resultadosPorTipo: Record<string, number>
  vendasPorMes: Array<{ mes: string; vendas: number; valor: number }>
  atividadesPorMes: Array<{ mes: string; atividades: number }>
}

interface PeriodFilter {
  startDate: string
  endDate: string
  period: 'month' | 'quarter' | 'year' | 'custom'
}

function RelatoriosPageContent() {
  const { closer, loading: authLoading } = useCloserAuth()
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<PeriodFilter>({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    endDate: new Date().toISOString().split('T')[0], // Today
    period: 'year'
  })

  useEffect(() => {
    if (closer) {
      loadMetrics()
    }
  }, [closer, filter])

  const loadMetrics = async () => {
    if (!closer) return

    try {
      setLoading(true)

      // Load vendas
      const { data: vendas, error: vendasError } = await supabase
        .from('closers_vendas')
        .select('*')
        .eq('closer_id', closer.id)
        .gte('data_venda', filter.startDate)
        .lte('data_venda', filter.endDate)
        .eq('status_venda', 'confirmada')

      if (vendasError) throw vendasError

      // Load atividades
      const { data: atividades, error: atividadesError } = await supabase
        .from('closers_atividades')
        .select('*')
        .eq('closer_id', closer.id)
        .gte('data_atividade', filter.startDate + 'T00:00:00Z')
        .lte('data_atividade', filter.endDate + 'T23:59:59Z')

      if (atividadesError) throw atividadesError

      // Calculate metrics
      const totalVendas = vendas?.length || 0
      const valorTotalVendas = vendas?.reduce((sum, v) => sum + v.valor_venda, 0) || 0
      const comissaoTotal = vendas?.reduce((sum, v) => sum + v.valor_comissao, 0) || 0
      const totalAtividades = atividades?.length || 0
      const leadsAtendidos = new Set(atividades?.map(a => a.lead_id).filter(Boolean)).size
      const taxaConversao = leadsAtendidos > 0 ? (totalVendas / leadsAtendidos) * 100 : 0
      const ticketMedio = totalVendas > 0 ? valorTotalVendas / totalVendas : 0

      // Calculate activities by type
      const atividadesPorTipo: Record<string, number> = {}
      atividades?.forEach(atividade => {
        atividadesPorTipo[atividade.tipo_atividade] = 
          (atividadesPorTipo[atividade.tipo_atividade] || 0) + 1
      })

      // Calculate results by type
      const resultadosPorTipo: Record<string, number> = {}
      atividades?.forEach(atividade => {
        if (atividade.resultado) {
          resultadosPorTipo[atividade.resultado] = 
            (resultadosPorTipo[atividade.resultado] || 0) + 1
        }
      })

      // Calculate sales by month
      const vendasPorMes = calculateMonthlyData(vendas || [], 'data_venda', {
        vendas: (items) => items.length,
        valor: (items) => items.reduce((sum, item) => sum + item.valor_venda, 0)
      })

      // Calculate activities by month
      const atividadesPorMes = calculateMonthlyData(atividades || [], 'data_atividade', {
        atividades: (items) => items.length
      })

      setMetrics({
        totalVendas,
        valorTotalVendas,
        comissaoTotal,
        totalAtividades,
        leadsAtendidos,
        taxaConversao,
        ticketMedio,
        atividadesPorTipo,
        resultadosPorTipo,
        vendasPorMes,
        atividadesPorMes
      })
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateMonthlyData = (data: any[], dateField: string, aggregators: Record<string, (items: any[]) => number>) => {
    const monthlyData: Record<string, any[]> = {}
    
    data.forEach(item => {
      const date = new Date(item[dateField])
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = []
      }
      monthlyData[monthKey].push(item)
    })

    return Object.entries(monthlyData).map(([monthKey, items]) => {
      const result: any = { mes: monthKey }
      
      Object.entries(aggregators).forEach(([key, aggregator]) => {
        result[key] = aggregator(items)
      })
      
      return result
    }).sort((a, b) => a.mes.localeCompare(b.mes))
  }

  const setPeriodFilter = (period: PeriodFilter['period']) => {
    const now = new Date()
    let startDate: string
    let endDate = now.toISOString().split('T')[0]

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        break
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0]
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
        break
      default:
        return // For custom, don't change dates
    }

    setFilter({ startDate, endDate, period })
  }

  const exportReport = () => {
    if (!metrics || !closer) return

    const reportData = {
      closer: {
        nome: closer.nome_completo,
        email: closer.email,
        tipo: closer.tipo_closer
      },
      periodo: {
        inicio: filter.startDate,
        fim: filter.endDate
      },
      metricas: metrics
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${closer.nome_completo}-${filter.startDate}-${filter.endDate}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (authLoading || !closer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <h1 className="text-2xl font-bold text-gray-900">Relatórios de Performance</h1>
              <p className="text-sm text-gray-500">Análise detalhada do seu desempenho</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/closer">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Dashboard
                </Link>
              </Button>
              <Button onClick={exportReport} disabled={!metrics}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Relatório
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex gap-2">
                {['month', 'quarter', 'year'].map((period) => (
                  <Button
                    key={period}
                    variant={filter.period === period ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPeriodFilter(period as PeriodFilter['period'])}
                  >
                    {period === 'month' ? 'Este Mês' :
                     period === 'quarter' ? 'Este Trimestre' : 'Este Ano'}
                  </Button>
                ))}
              </div>
              
              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium">Período personalizado:</label>
                <input
                  type="date"
                  value={filter.startDate}
                  onChange={(e) => setFilter(prev => ({ ...prev, startDate: e.target.value, period: 'custom' }))}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span>até</span>
                <input
                  type="date"
                  value={filter.endDate}
                  onChange={(e) => setFilter(prev => ({ ...prev, endDate: e.target.value, period: 'custom' }))}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : !metrics ? (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Erro ao carregar relatórios</p>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total de Vendas</p>
                      <p className="text-2xl font-bold">{metrics.totalVendas}</p>
                    </div>
                    <Target className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    R$ {metrics.valorTotalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Comissão Total</p>
                      <p className="text-2xl font-bold text-green-600">
                        R$ {metrics.comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Taxa de Conversão</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {metrics.taxaConversao.toFixed(1)}%
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.leadsAtendidos} leads atendidos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Ticket Médio</p>
                      <p className="text-2xl font-bold text-orange-600">
                        R$ {metrics.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Activities by Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Atividades por Tipo</CardTitle>
                  <CardDescription>Distribuição das suas atividades</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(metrics.atividadesPorTipo).map(([tipo, count]) => (
                      <div key={tipo} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {tipo === 'ligacao' ? <Phone className="h-4 w-4" /> :
                           tipo === 'email' ? <Mail className="h-4 w-4" /> :
                           tipo === 'reuniao' ? <Users className="h-4 w-4" /> :
                           <Clock className="h-4 w-4" />}
                          <span className="text-sm capitalize">{tipo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-200 h-2 rounded-full" style={{ 
                            width: `${Math.max(20, (count / metrics.totalAtividades) * 100)}px` 
                          }}></div>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Results Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Resultados das Atividades</CardTitle>
                  <CardDescription>Efetividade das suas interações</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(metrics.resultadosPorTipo).map(([resultado, count]) => (
                      <div key={resultado} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {resultado === 'venda' ? <CheckCircle className="h-4 w-4 text-green-500" /> :
                           resultado === 'recusa' ? <XCircle className="h-4 w-4 text-red-500" /> :
                           <Clock className="h-4 w-4 text-yellow-500" />}
                          <span className="text-sm capitalize">{resultado.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 rounded-full ${
                            resultado === 'venda' ? 'bg-green-200' :
                            resultado === 'recusa' ? 'bg-red-200' : 'bg-yellow-200'
                          }`} style={{ 
                            width: `${Math.max(20, (count / metrics.totalAtividades) * 100)}px` 
                          }}></div>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Sales */}
              <Card>
                <CardHeader>
                  <CardTitle>Vendas por Mês</CardTitle>
                  <CardDescription>Evolução das suas vendas</CardDescription>
                </CardHeader>
                <CardContent>
                  {metrics.vendasPorMes.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nenhuma venda no período</p>
                  ) : (
                    <div className="space-y-3">
                      {metrics.vendasPorMes.map((item) => (
                        <div key={item.mes} className="flex items-center justify-between">
                          <span className="text-sm">{item.mes}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{item.vendas} vendas</span>
                            <span className="text-sm font-medium">
                              R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Activities */}
              <Card>
                <CardHeader>
                  <CardTitle>Atividades por Mês</CardTitle>
                  <CardDescription>Volume de atividades realizadas</CardDescription>
                </CardHeader>
                <CardContent>
                  {metrics.atividadesPorMes.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nenhuma atividade no período</p>
                  ) : (
                    <div className="space-y-3">
                      {metrics.atividadesPorMes.map((item) => (
                        <div key={item.mes} className="flex items-center justify-between">
                          <span className="text-sm">{item.mes}</span>
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-200 h-2 rounded-full" style={{ 
                              width: `${Math.max(20, (item.atividades / Math.max(...metrics.atividadesPorMes.map(i => i.atividades))) * 100)}px` 
                            }}></div>
                            <span className="text-sm font-medium">{item.atividades}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default function RelatoriosPage() {
  return (
    <CloserAuthProvider>
      <RelatoriosPageContent />
    </CloserAuthProvider>
  )
}