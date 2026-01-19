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
  valor_arrecadado: number
  taxa_conversao: number
  total_leads: number
  total_vendas: number
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
    valor_arrecadado: 0,
    taxa_conversao: 0,
    total_leads: 0,
    total_vendas: 0
  })
  const [metricsLoading, setMetricsLoading] = useState(true)

  useEffect(() => {
    if (isReady && activeOrganizationId) {
      loadSalesMetrics()
    }
  }, [isReady, activeOrganizationId])

  const loadSalesMetrics = async () => {
    try {
      setMetricsLoading(true)

      // Calcular data do mês atual
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      // Buscar todos os leads do mês (data_primeiro_contato)
      const { data: allLeads } = await supabase
        .from('leads')
        .select('id')
        .gte('data_primeiro_contato', startOfMonth.toISOString())
        .lte('data_primeiro_contato', endOfMonth.toISOString())

      // Buscar vendas com valor arrecadado do mês (data_venda)
      const { data: salesData } = await supabase
        .from('leads')
        .select('valor_arrecadado, data_venda')
        .eq('status', 'vendido')
        .not('valor_arrecadado', 'is', null)
        .gt('valor_arrecadado', 0)
        .gte('data_venda', startOfMonth.toISOString())
        .lte('data_venda', endOfMonth.toISOString())

      // Para taxa de conversão: buscar leads vendidos no período por data_venda
      const { data: vendasParaConversao } = await supabase
        .from('leads')
        .select('id, data_primeiro_contato, data_venda')
        .eq('status', 'vendido')
        .gte('data_venda', startOfMonth.toISOString())
        .lte('data_venda', endOfMonth.toISOString())

      const total_leads = allLeads?.length || 0
      const total_vendas = vendasParaConversao?.length || 0  // Vendas por data_venda
      const valor_arrecadado = salesData?.reduce((sum, sale) => sum + (sale.valor_arrecadado || 0), 0) || 0
      const taxa_conversao = total_leads > 0 ? (total_vendas / total_leads) * 100 : 0

      setSalesMetrics({
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
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm text-orange-700">Valor Arrecadado</p>
                            <p className="text-2xl font-bold text-orange-900">
                              {formatCurrency(salesMetrics.valor_arrecadado)}
                            </p>
                          </div>
                          <DollarSign className="w-8 h-8 text-orange-500" />
                        </div>

                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs text-orange-700 mb-1">
                            <span>Taxa de Conversão: {salesMetrics.taxa_conversao.toFixed(1)}%</span>
                            <span>Meta: {formatCurrency(500000)}</span>
                          </div>

                          {/* Régua de Conversão */}
                          <div className="h-2 bg-orange-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                salesMetrics.taxa_conversao > 55 ? 'bg-blue-500' :
                                salesMetrics.taxa_conversao >= 40 ? 'bg-green-500' :
                                salesMetrics.taxa_conversao >= 25 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(salesMetrics.taxa_conversao, 100)}%` }}
                            />
                          </div>

                          <div className="flex justify-between text-[8px] text-orange-600 mt-1">
                            <span>🔴 Ruim &lt;25%</span>
                            <span>🟡 Normal 25-40%</span>
                            <span>🟢 Bom 40-55%</span>
                            <span>🔵 Excelente &gt;55%</span>
                          </div>
                        </div>

                        <div className="text-xs text-orange-600">
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