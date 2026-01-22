'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/dashboard/Navbar'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Crown, Shield, User2, Users, Loader2, DollarSign, Target, RefreshCw, AlertCircle } from 'lucide-react'
import { useOrganizationFilter } from '@/hooks/use-organization-filter'
import { useRetryRequest } from '@/hooks/use-retry-request'
import { supabase } from '@/lib/supabase'

interface SalesMetrics {
  valor_vendido: number
  valor_arrecadado: number
  taxa_conversao: number
  total_leads: number
  total_vendas: number
}

interface CallsMetrics {
  total_calls: number
  calls_vendidas: number
  calls_nao_vendidas: number
  no_shows: number
  total_vendas_calls: number
  taxa_conversao_calls: number
}

export default function DashboardPage() {
  const {
    activeOrganization,
    activeOrganizationId,
    organizationName,
    userRole,
    canManage,
    isOwner,
    loading,
    isReady
  } = useOrganizationFilter()

  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics>({
    valor_vendido: 0,
    valor_arrecadado: 0,
    taxa_conversao: 0,
    total_leads: 0,
    total_vendas: 0
  })
  const [callsMetrics, setCallsMetrics] = useState<CallsMetrics>({
    total_calls: 0,
    calls_vendidas: 0,
    calls_nao_vendidas: 0,
    no_shows: 0,
    total_vendas_calls: 0,
    taxa_conversao_calls: 0
  })
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [loadingStage, setLoadingStage] = useState('Iniciando...')
  const salesRetry = useRetryRequest<SalesMetrics>()
  const callsRetry = useRetryRequest<CallsMetrics>()

  useEffect(() => {
    if (isReady && activeOrganizationId) {
      loadAllMetrics()
    }
  }, [isReady, activeOrganizationId])

  const loadAllMetrics = async () => {
    setMetricsLoading(true)
    setLoadingStage('Carregando métricas de vendas...')

    // Carregar métricas de vendas com retry
    const salesResult = await salesRetry.executeWithRetry(
      () => loadSalesMetricsData(),
      { maxAttempts: 3, delay: 1000 }
    )

    if (salesResult) {
      setSalesMetrics(salesResult)
    }

    setLoadingStage('Carregando métricas de calls...')

    // Carregar métricas de calls com retry
    const callsResult = await callsRetry.executeWithRetry(
      () => loadCallsMetricsData(),
      { maxAttempts: 3, delay: 1000 }
    )

    if (callsResult) {
      setCallsMetrics(callsResult)
    }

    setMetricsLoading(false)
    setLoadingStage('')
  }

  const loadSalesMetricsData = async (): Promise<SalesMetrics> => {
    console.log('🏢 Debug Dashboard - Organization ID:', activeOrganizationId)
    console.log('🏢 Debug Dashboard - isReady:', isReady)

      // Calcular data do mês atual
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      // Buscar todos os leads do mês (data_primeiro_contato)
      // TODO: Adicionar filtro de organização quando leads tiverem organization_id
      const { data: allLeads } = await supabase
        .from('leads')
        .select('id')
        .gte('data_primeiro_contato', startOfMonth.toISOString())
        .lte('data_primeiro_contato', endOfMonth.toISOString())

      // Buscar TODAS as vendas primeiro (sem filtro de data)
      // TODO: Adicionar filtro de organização quando leads tiverem organization_id
      const { data: allSalesData } = await supabase
        .from('leads')
        .select('valor_vendido, valor_arrecadado, data_venda, nome_completo')
        .eq('status', 'vendido')

      console.log('🎯 Debug Dashboard - Total vendas com valor:', allSalesData?.length)
      console.log('🎯 Debug Dashboard - Exemplo vendas:', allSalesData?.slice(0, 3))

      // Agora filtrar pelo mês atual
      const salesData = allSalesData?.filter(sale => {
        if (!sale.data_venda) return false
        const saleDate = new Date(sale.data_venda)
        return saleDate >= startOfMonth && saleDate <= endOfMonth
      })

      console.log('🎯 Debug Dashboard - Vendas do mês atual:', salesData?.length)
      console.log('🎯 Debug Dashboard - Período:', startOfMonth.toISOString(), 'até', endOfMonth.toISOString())

      // Para taxa de conversão: buscar leads vendidos no período por data_venda
      // TODO: Adicionar filtro de organização quando leads tiverem organization_id
      const { data: vendasParaConversao } = await supabase
        .from('leads')
        .select('id, data_primeiro_contato, data_venda')
        .eq('status', 'vendido')
        .gte('data_venda', startOfMonth.toISOString())
        .lte('data_venda', endOfMonth.toISOString())

      const total_leads = allLeads?.length || 0
      const total_vendas = vendasParaConversao?.length || 0

      // Garantir que valores sejam números válidos, incluindo 0
      const valor_vendido = salesData?.reduce((sum, sale) => {
        const val = parseFloat(sale.valor_vendido) || 0
        return sum + val
      }, 0) ?? 0

      const valor_arrecadado = salesData?.reduce((sum, sale) => {
        const val = parseFloat(sale.valor_arrecadado) || 0
        return sum + val
      }, 0) ?? 0

      const taxa_conversao = total_leads > 0 ? (total_vendas / total_leads) * 100 : 0

      console.log('🎯 Debug Dashboard - Dados de vendas do mês:', salesData?.length, 'vendas')
      console.log('🎯 Debug Dashboard - Exemplo venda:', salesData?.[0])
      console.log('🎯 Debug Dashboard - Resultado final:', {
        total_leads,
        total_vendas,
        valor_vendido,
        valor_arrecadado,
        taxa_conversao
      })

      return {
        valor_vendido,
        valor_arrecadado,
        taxa_conversao,
        total_leads,
        total_vendas
      }
  }

  const loadCallsMetricsData = async (): Promise<CallsMetrics> => {
    console.log('📞 Debug Dashboard - Carregando métricas de calls...')

    // Buscar métricas do mês atual da view social_seller_metrics
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const { data: callsData, error: callsError } = await supabase
      .from('social_seller_metrics')
      .select('*')
      .gte('month_year', startOfMonth.toISOString())
      .single()

    if (callsError) {
      console.log('⚠️ Nenhuma métrica de calls encontrada para o mês atual:', callsError)
      return {
        total_calls: 0,
        calls_vendidas: 0,
        calls_nao_vendidas: 0,
        no_shows: 0,
        total_vendas_calls: 0,
        taxa_conversao_calls: 0
      }
    }

    console.log('📞 Debug Dashboard - Métricas de calls:', callsData)

    return {
      total_calls: callsData.total_calls || 0,
      calls_vendidas: callsData.calls_vendidas || 0,
      calls_nao_vendidas: callsData.calls_nao_vendidas || 0,
      no_shows: callsData.no_shows || 0,
      total_vendas_calls: callsData.total_vendas || 0,
      taxa_conversao_calls: callsData.taxa_conversao || 0
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-purple-500" />
      case 'manager': return <Shield className="w-4 h-4 text-blue-500" />
      case 'viewer': return <User2 className="w-4 h-4 text-green-500" />
      default: return <User2 className="w-4 h-4 text-gray-400" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'viewer': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <Navbar />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 px-8 py-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Welcome Section */}
            <div className="bg-card p-8 rounded-2xl border">
              <h1 className="text-2xl font-semibold text-foreground mb-4">Dashboard do Customer Success</h1>
              <p className="text-muted-foreground mb-6">
                Bem-vindo ao sistema de Customer Success. Use o menu lateral para navegar pelas funcionalidades.
              </p>

              {/* Organization Info */}
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Carregando informações da organização...</span>
                </div>
              ) : isReady && activeOrganization ? (
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      Organização Ativa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{organizationName}</h3>
                          <p className="text-sm text-gray-600">
                            Owner: {activeOrganization.organization.owner_email}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {userRole && (
                            <Badge variant="outline" className={getRoleBadgeColor(userRole)}>
                              {getRoleIcon(userRole)}
                              <span className="ml-1 capitalize">{userRole}</span>
                            </Badge>
                          )}

                          <div className="text-xs text-gray-500">
                            ID: {activeOrganizationId}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${canManage ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                          <span className="text-gray-600">
                            {canManage ? 'Pode gerenciar dados' : 'Acesso apenas para visualização'}
                          </span>
                        </div>

                        {isOwner && (
                          <div className="flex items-center gap-1">
                            <Crown className="w-3 h-3 text-purple-500" />
                            <span className="text-purple-600 font-medium">Proprietário</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-8 h-8 text-red-500" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Nenhuma organização ativa</h3>
                        <p className="text-sm text-gray-600">
                          Você precisa ser membro de uma organização para acessar o sistema.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Quick Stats - Only show when organization is ready */}
            {isReady && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Dados filtrados por</p>
                        <p className="text-2xl font-bold text-foreground">Organização</p>
                      </div>
                      <Building2 className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Todos os dados são filtrados pela organização ativa
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Seu acesso</p>
                        <p className="text-2xl font-bold text-foreground capitalize">{userRole}</p>
                      </div>
                      {userRole && getRoleIcon(userRole)}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {canManage ? 'Pode criar e editar' : 'Apenas visualização'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Multi-tenant</p>
                        <p className="text-2xl font-bold text-foreground">Ativo</p>
                      </div>
                      <Users className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Sistema isolado por organização
                    </div>
                  </CardContent>
                </Card>

                {/* Card de Faturamento com Régua de Conversão */}
                <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
                  <CardContent className="pt-6">
                    <>
                        {/* Header com crescimento */}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-orange-700">Faturamento</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm font-medium text-green-600">↑ 155%</span>
                            </div>
                          </div>
                          <DollarSign className="w-6 h-6 text-orange-500" />
                        </div>

                        {/* Valor Principal */}
                        <div className="mb-4">
                          <div className="text-3xl font-bold text-orange-900 mb-2">
                            {formatCurrency(salesMetrics.valor_vendido)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Arrecadado: {formatCurrency(salesMetrics.valor_arrecadado || 0)} • Meta de faturamento: {formatCurrency(500000)}
                          </div>
                        </div>

                        {/* Progresso da Meta */}
                        <div className="bg-gray-50 p-3 rounded border mb-4">
                          <div className="text-sm font-semibold text-gray-700 mb-2">Progresso da Meta de Faturamento</div>
                          <div className="text-lg font-bold text-gray-900 mb-2">
                            {salesMetrics.valor_vendido > 0 ? ((salesMetrics.valor_vendido / 500000) * 100).toFixed(1) : '0.0'}%
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                            <span>R$ 0</span>
                            <span>R$ 500.000</span>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 transition-all duration-500"
                              style={{ width: `${Math.min((salesMetrics.valor_vendido / 500000) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Régua de Arrecadação */}
                        <div className="bg-white p-3 rounded border mb-4">
                          <div className="text-sm font-semibold text-gray-700 mb-2">% Arrecadado do Vendido</div>
                          <div className="text-lg font-bold text-gray-900 mb-2">
                            {salesMetrics.valor_vendido > 0 ? ((salesMetrics.valor_arrecadado / salesMetrics.valor_vendido) * 100).toFixed(1) : '0.0'}%
                          </div>
                          <div className="text-xs text-gray-600 mb-2">
                            {formatCurrency(salesMetrics.valor_arrecadado)} de {formatCurrency(salesMetrics.valor_vendido)} vendido
                          </div>

                          {/* Régua com cores dinâmicas */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>0%</span>
                              <span>20%</span>
                              <span>35%</span>
                              <span>50%</span>
                              <span>100%</span>
                            </div>
                            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                              {/* Faixas de cores de fundo */}
                              <div className="absolute inset-0 flex">
                                <div className="w-1/5 bg-red-200"></div>
                                <div className="w-3/20 bg-yellow-200"></div>
                                <div className="w-3/20 bg-blue-200"></div>
                                <div className="flex-1 bg-green-200"></div>
                              </div>

                              {/* Barra de progresso */}
                              <div
                                className={`h-full transition-all duration-500 ${
                                  salesMetrics.valor_vendido > 0
                                    ? (() => {
                                        const percentage = (salesMetrics.valor_arrecadado / salesMetrics.valor_vendido) * 100;
                                        if (percentage < 20) return 'bg-red-500';
                                        if (percentage < 35) return 'bg-yellow-500';
                                        if (percentage < 50) return 'bg-blue-500';
                                        return 'bg-green-500';
                                      })()
                                    : 'bg-gray-400'
                                }`}
                                style={{
                                  width: `${Math.min(salesMetrics.valor_vendido > 0 ? (salesMetrics.valor_arrecadado / salesMetrics.valor_vendido) * 100 : 0, 100)}%`
                                }}
                              />
                            </div>

                            {/* Labels das faixas */}
                            <div className="flex justify-between text-xs">
                              <span className="text-red-600">Ruim</span>
                              <span className="text-yellow-600">Normal</span>
                              <span className="text-blue-600">Bom</span>
                              <span className="text-green-600">Ótimo</span>
                            </div>
                          </div>
                        </div>

                        {/* Taxa de Conversão */}
                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm font-semibold text-gray-700 mb-1">Taxa de Conversão</div>
                          <div className="text-lg font-bold text-gray-900 mb-2">
                            {callsMetrics.total_calls > 0 ? ((callsMetrics.calls_vendidas / callsMetrics.total_calls) * 100).toFixed(1) : '0.0'}%
                          </div>
                          <div className="text-xs text-gray-600">
                            {callsMetrics.calls_vendidas || 0} vendas de {callsMetrics.total_calls || 0} calls
                          </div>
                        </div>


                      </>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}