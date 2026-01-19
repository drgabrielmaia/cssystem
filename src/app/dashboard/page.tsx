'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/dashboard/Navbar'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Crown, Shield, User2, Users, Loader2, DollarSign, Target } from 'lucide-react'
import { useOrganizationFilter } from '@/hooks/use-organization-filter'
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

  useEffect(() => {
    if (isReady && activeOrganizationId) {
      loadSalesMetrics()
      loadCallsMetrics()
    }
  }, [isReady, activeOrganizationId])

  const loadSalesMetrics = async () => {
    try {
      setMetricsLoading(true)

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

      setSalesMetrics({
        valor_vendido,
        valor_arrecadado,
        taxa_conversao,
        total_leads,
        total_vendas
      })
    } catch (error) {
      console.error('Erro ao carregar métricas de vendas:', error)
    } finally {
      setMetricsLoading(false)
    }
  }

  const loadCallsMetrics = async () => {
    try {
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
        setCallsMetrics({
          total_calls: 0,
          calls_vendidas: 0,
          calls_nao_vendidas: 0,
          no_shows: 0,
          total_vendas_calls: 0,
          taxa_conversao_calls: 0
        })
        return
      }

      console.log('📞 Debug Dashboard - Métricas de calls:', callsData)

      setCallsMetrics({
        total_calls: callsData.total_calls || 0,
        calls_vendidas: callsData.calls_vendidas || 0,
        calls_nao_vendidas: callsData.calls_nao_vendidas || 0,
        no_shows: callsData.no_shows || 0,
        total_vendas_calls: callsData.total_vendas || 0,
        taxa_conversao_calls: callsData.taxa_conversao || 0
      })

    } catch (error) {
      console.error('Erro ao carregar métricas de calls:', error)
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
                    {metricsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                      </div>
                    ) : (
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

                        {/* Valores Principais - Lado a lado */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {/* Valor Vendido (Faturamento) */}
                          <div>
                            <div className="text-3xl font-bold text-orange-900 mb-2">
                              {formatCurrency(salesMetrics.valor_vendido)}
                            </div>
                            <div className="text-sm text-gray-600">
                              Mês atual • Meta de faturamento: {formatCurrency(500000)}
                            </div>
                          </div>

                          {/* Valor Arrecadado */}
                          <div className="bg-orange-100 p-3 rounded border border-orange-300">
                            <div className="text-sm font-semibold text-orange-800">Valor Arrecadado</div>
                            <div className="text-3xl font-bold text-orange-900">
                              {formatCurrency(salesMetrics.valor_arrecadado || 0)}
                            </div>
                          </div>
                        </div>

                        {/* Régua de Conversão - Taxa de Calls */}
                        <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-semibold text-gray-700">Taxa de Conversão (Calls)</span>
                            <span className="text-2xl font-bold text-gray-900">{(callsMetrics.taxa_conversao_calls || 0).toFixed(1)}%</span>
                          </div>

                          {/* Barra de Progresso Melhorada */}
                          <div className="h-6 bg-gray-200 rounded-full overflow-hidden mb-4 relative">
                            <div
                              className={`h-full transition-all duration-700 ease-out ${
                                (callsMetrics.taxa_conversao_calls || 0) > 55 ? 'bg-blue-500 shadow-blue-200' :
                                (callsMetrics.taxa_conversao_calls || 0) >= 40 ? 'bg-green-500 shadow-green-200' :
                                (callsMetrics.taxa_conversao_calls || 0) >= 25 ? 'bg-yellow-500 shadow-yellow-200' : 'bg-red-500 shadow-red-200'
                              } shadow-lg`}
                              style={{ width: `${Math.min(callsMetrics.taxa_conversao_calls || 0, 100)}%` }}
                            />
                            {/* Marcadores de faixas */}
                            <div className="absolute inset-0 flex">
                              <div className="w-1/4 border-r border-white/50"></div>
                              <div className="w-1/4 border-r border-white/50"></div>
                              <div className="w-1/4 border-r border-white/50"></div>
                              <div className="w-1/4"></div>
                            </div>
                          </div>

                          {/* Legenda com cores - Mais visível */}
                          <div className="grid grid-cols-2 gap-3 text-xs font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <span>🔴 Ruim &lt; 25%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                              <span>🟡 Normal 25% – 40%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span>🟢 Bom 40% – 55%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span>🔵 Excelente &gt; 55%</span>
                            </div>
                          </div>
                        </div>

                        {/* Resumo Calls - Compacto */}
                        <div className="mt-4 pt-3 border-t border-orange-200">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-blue-50 p-2 rounded">
                              <div className="text-sm font-bold text-blue-800">{callsMetrics.total_calls}</div>
                              <div className="text-xs text-blue-600">Total</div>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <div className="text-sm font-bold text-green-800">{callsMetrics.calls_vendidas}</div>
                              <div className="text-xs text-green-600">Vendidas</div>
                            </div>
                            <div className="bg-red-50 p-2 rounded">
                              <div className="text-sm font-bold text-red-800">{callsMetrics.no_shows}</div>
                              <div className="text-xs text-red-600">No-Show</div>
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-orange-600 mt-2">
                          {salesMetrics.total_vendas} vendas de {salesMetrics.total_leads} leads
                        </div>
                      </>
                    )}
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