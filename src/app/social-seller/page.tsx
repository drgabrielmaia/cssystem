'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import {
  TrendingUp,
  Users,
  PhoneOff,
  DollarSign,
  CheckCircle,
  XCircle,
  Calendar,
  Target,
  UserPlus,
  RefreshCw
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface LeadsMetrics {
  total_leads: number
  leads_vendidos: number
  leads_nao_vendidos: number
  leads_no_show: number
  leads_qualificados: number
  valor_vendido: number
  valor_arrecadado: number
  taxa_conversao: number
}


export default function SocialSellerPage() {
  const [metrics, setMetrics] = useState<LeadsMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    loadSocialSellerData()

    // Configurar atualização automática a cada 30 segundos
    const interval = setInterval(() => {
      console.log('🔄 Atualizando dados do Social Seller automaticamente...')
      loadSocialSellerData()
    }, 30000)

    // Limpar interval ao desmontar componente
    return () => clearInterval(interval)
  }, [])

  const loadSocialSellerData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      console.log('📊 Carregando métricas baseadas em leads...')

      // Carregar todos os leads e suas estatísticas
      const { data: allLeads, error: leadsError } = await supabase
        .from('leads')
        .select('id, status, valor_vendido, valor_arrecadado')

      if (leadsError) {
        console.error('Erro ao carregar leads:', leadsError)
        throw leadsError
      }

      console.log('📊 Leads carregados:', allLeads)

      // Calcular métricas baseadas nos status dos leads
      const totalLeads = allLeads?.length || 0
      const leadsVendidos = allLeads?.filter(l => l.status === 'vendido').length || 0
      const leadsNaoVendidos = allLeads?.filter(l => l.status === 'perdido').length || 0
      const leadsNoShow = allLeads?.filter(l => l.status === 'no-show').length || 0
      const leadsQualificados = allLeads?.filter(l => ['qualificado', 'call_agendada', 'proposta_enviada'].includes(l.status)).length || 0

      const valorVendido = allLeads?.reduce((sum, lead) => sum + (lead.valor_vendido || 0), 0) || 0
      const valorArrecadado = allLeads?.reduce((sum, lead) => sum + (lead.valor_arrecadado || 0), 0) || 0

      const taxaConversao = (leadsVendidos + leadsNaoVendidos) > 0
        ? Math.round((leadsVendidos / (leadsVendidos + leadsNaoVendidos)) * 100 * 100) / 100
        : 0

      const calculatedMetrics: LeadsMetrics = {
        total_leads: totalLeads,
        leads_vendidos: leadsVendidos,
        leads_nao_vendidos: leadsNaoVendidos,
        leads_no_show: leadsNoShow,
        leads_qualificados: leadsQualificados,
        valor_vendido: valorVendido,
        valor_arrecadado: valorArrecadado,
        taxa_conversao: taxaConversao
      }

      console.log('📈 Métricas calculadas:', calculatedMetrics)
      setMetrics(calculatedMetrics)

    } catch (error) {
      console.error('💥 Erro geral:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLastUpdate(new Date())
    }
  }

  // Função para refresh manual
  const handleManualRefresh = () => {
    loadSocialSellerData(true)
  }

  const getPieChartData = () => {
    if (!metrics) return []

    return [
      { name: 'Vendidos', value: metrics.leads_vendidos, color: '#10b981' },
      { name: 'Não Vendidos', value: metrics.leads_nao_vendidos, color: '#ef4444' },
      { name: 'No-Show', value: metrics.leads_no_show, color: '#f97316' },
      { name: 'Qualificados', value: metrics.leads_qualificados, color: '#3b82f6' },
    ].filter(item => item.value > 0)
  }


  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const pieData = getPieChartData()

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

  // Se não há dados, mostrar mensagem
  if (!metrics) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="Social Seller" subtitle="Nenhum lead cadastrado ainda" />
        <main className="flex-1 p-6">
          <Card className="text-center py-12">
            <CardContent>
              <UserPlus className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum lead cadastrado
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Para ver as métricas, você precisa cadastrar leads:
              </p>
              <div className="space-y-2 text-left max-w-md mx-auto">
                <div className="flex items-center">
                  <UserPlus className="h-4 w-4 mr-2 text-blue-500" />
                  <span>1. Cadastrar leads na aba "Leads"</span>
                </div>
                <div className="flex items-center">
                  <Target className="h-4 w-4 mr-2 text-green-500" />
                  <span>2. Atualizar status dos leads (vendido, perdido, etc.)</span>
                </div>
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-purple-500" />
                  <span>3. Definir valores vendidos e arrecadados</span>
                </div>
              </div>
              <div className="mt-6">
                <Button onClick={() => window.location.href = '/leads'}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Cadastrar Leads
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Social Seller</h1>
          <p className="text-gray-600">
            {`${metrics?.total_leads || 0} leads totais • ${metrics?.leads_vendidos || 0} vendidos • Taxa de conversão: ${metrics?.taxa_conversao || 0}%`}
          </p>
          <p className="text-xs text-gray-400">
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      <main className="flex-1 p-6 space-y-6">
        {/* Cards de Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">No-Shows</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {metrics?.leads_no_show || 0}
                  </p>
                  <p className="text-xs text-orange-500 font-medium">
                    {metrics?.total_leads ? ((metrics.leads_no_show / metrics.total_leads) * 100).toFixed(1) : 0}% do total
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
                  <p className="text-sm font-medium text-gray-600">Qualificados</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {metrics?.leads_qualificados || 0}
                  </p>
                  <p className="text-xs text-blue-500 font-medium">
                    {metrics?.total_leads ? ((metrics.leads_qualificados / metrics.total_leads) * 100).toFixed(1) : 0}% do total
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Vendidos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {metrics?.leads_vendidos || 0}
                  </p>
                  <p className="text-xs text-green-500 font-medium">
                    {metrics?.taxa_conversao || 0}% conversão
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
                  <p className="text-sm font-medium text-gray-600">Não Vendidos</p>
                  <p className="text-2xl font-bold text-red-600">
                    {metrics?.leads_nao_vendidos || 0}
                  </p>
                  <p className="text-xs text-red-500 font-medium">
                    {metrics?.total_leads ? ((metrics.leads_nao_vendidos / metrics.total_leads) * 100).toFixed(1) : 0}% do total
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards de Valores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Valor Vendido</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(metrics?.valor_vendido || 0)}
                  </p>
                  <div className="mt-2 flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min((metrics?.valor_vendido || 0) / 100000 * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <span className="ml-2 text-xs text-gray-500">Meta: R$ 100k</span>
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
                  <p className="text-sm font-medium text-gray-600">Valor Arrecadado</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(metrics?.valor_arrecadado || 0)}
                  </p>
                  <p className="text-xs text-blue-500 font-medium">
                    {metrics?.valor_vendido && metrics.valor_vendido > 0
                      ? `${((metrics.valor_arrecadado / metrics.valor_vendido) * 100).toFixed(1)}% recebido`
                      : '0% recebido'
                    }
                  </p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Taxa de Conversão</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {metrics?.taxa_conversao || 0}%
                  </p>
                  <div className="mt-2 flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          (metrics?.taxa_conversao || 0) >= 30
                            ? 'bg-green-500'
                            : (metrics?.taxa_conversao || 0) >= 20
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        style={{
                          width: `${Math.min((metrics?.taxa_conversao || 0), 100)}%`
                        }}
                      ></div>
                    </div>
                    <span className="ml-2 text-xs text-gray-500">Meta: 30%</span>
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
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
                <TrendingUp className="h-5 w-5 text-green-500" />
                Distribuição de Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{metrics?.leads_vendidos || 0}</div>
                    <div className="text-sm text-gray-600">Vendidos</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{metrics?.leads_nao_vendidos || 0}</div>
                    <div className="text-sm text-gray-600">Não Vendidos</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{metrics?.leads_qualificados || 0}</div>
                    <div className="text-sm text-gray-600">Qualificados</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{metrics?.leads_no_show || 0}</div>
                    <div className="text-sm text-gray-600">No-Show</div>
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">{metrics?.taxa_conversao || 0}%</div>
                  <div className="text-sm text-gray-600">Taxa de Conversão</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


      </main>
    </div>
  )
}