'use client'

import { useState, useMemo } from 'react'
import { Navbar } from '@/components/dashboard/Navbar'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Crown, Shield, User2, Loader2, DollarSign, Target, RefreshCw, AlertCircle, Eye, EyeOff, Calendar } from 'lucide-react'
import { useOrganizationFilter } from '@/hooks/use-organization-filter'
import { useOptimizedDashboard, DateFilter } from '@/hooks/use-optimized-dashboard'
import { OptimizedLoadingCard } from '@/components/dashboard/OptimizedLoadingCard'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'


const DATE_FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'semester', label: 'Semestre' },
  { value: 'year', label: 'Ano' },
  { value: 'custom', label: 'Personalizado' },
]

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

  const [dateFilter, setDateFilter] = useState<DateFilter>('month')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  const customStart = useMemo(() => customStartDate ? new Date(customStartDate) : undefined, [customStartDate])
  const customEnd = useMemo(() => customEndDate ? new Date(customEndDate) : undefined, [customEndDate])

  const {
    metrics,
    evolution,
    loading: metricsLoading,
    error: metricsError,
    refetch,
    isStale
  } = useOptimizedDashboard(activeOrganizationId, isReady, dateFilter, customStart, customEnd)

  const [showValues, setShowValues] = useState(false)

  // Get metrics data with fallbacks
  const salesMetrics = metrics?.sales || {
    valor_vendido: 0,
    valor_arrecadado: 0,
    taxa_conversao: 0,
    total_leads: 0,
    total_vendas: 0
  }

  const callsMetrics = metrics?.calls || {
    total_calls: 0,
    calls_vendidas: 0,
    calls_nao_vendidas: 0,
    no_shows: 0,
    total_vendas_calls: 0,
    taxa_conversao_calls: 0
  }

  const arrecadacaoPercentage = salesMetrics.valor_vendido > 0
    ? (salesMetrics.valor_arrecadado / salesMetrics.valor_vendido) * 100
    : 0

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

  // Revenue ruler color logic based on new thresholds
  const getRevenueBarColor = (percentage: number): string => {
    if (percentage <= 20) return 'bg-gradient-to-r from-red-500 to-red-600'
    if (percentage <= 40) return 'bg-gradient-to-r from-orange-500 to-orange-600'
    if (percentage <= 60) return 'bg-gradient-to-r from-blue-500 to-blue-600'
    if (percentage <= 70) return 'bg-gradient-to-r from-yellow-400 to-green-400'
    return 'bg-gradient-to-r from-green-500 to-green-600'
  }

  // Custom tooltip for the evolution chart
  const EvolutionTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white p-3 rounded-lg shadow-xl border border-gray-700 text-sm">
          <p className="font-bold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: {entry.name.includes('Taxa') ? `${entry.value}%` : entry.name === 'Volume Calls' ? entry.value : formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
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
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold text-foreground">Dashboard do Customer Success</h1>
              </div>
              <p className="text-muted-foreground mb-6">
                Bem-vindo ao sistema de Customer Success. Use o menu lateral para navegar pelas funcionalidades.
              </p>

              {/* Date Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground mr-1">Filtro:</span>
                {DATE_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDateFilter(option.value)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      dateFilter === option.value
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Custom date inputs */}
              {dateFilter === 'custom' && (
                <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-muted-foreground">De:</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-3 py-1.5 text-sm border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-muted-foreground">Até:</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-3 py-1.5 text-sm border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </div>
              )}

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

            {/* Faturamento Card - Full Width Hero */}
            {isReady && (
              <div className="space-y-6">
                {metricsLoading ? (
                  <OptimizedLoadingCard />
                ) : metricsError ? (
                  <Card className="relative overflow-hidden bg-gradient-to-br from-red-400 via-red-500 to-red-600 border-2 border-red-400 shadow-2xl">
                    <CardContent className="pt-6 text-center text-white">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2">Erro ao carregar métricas</h3>
                      <p className="text-sm mb-4">{metricsError}</p>
                      <button
                        onClick={refetch}
                        className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium transition-all"
                      >
                        <RefreshCw className="w-4 h-4 inline mr-2" />
                        Tentar Novamente
                      </button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="relative overflow-hidden bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 border-2 border-yellow-400 shadow-2xl">
                    <CardContent className="pt-6 relative z-10">
                      <>
                        {/* Stale data indicator */}
                        {isStale && (
                          <div className="absolute top-2 right-2 bg-orange-500/80 text-white text-xs px-2 py-1 rounded-full animate-pulse z-20">
                            Atualizando...
                          </div>
                        )}

                        {/* Efeito de brilho no fundo */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-pulse"></div>

                        {/* Header Premium */}
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                              FATURAMENTO
                              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                {DATE_FILTER_OPTIONS.find(o => o.value === dateFilter)?.label || 'Mês'}
                              </span>
                            </h3>
                            <p className="text-sm text-gray-700 font-medium">Centro de Resultados</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setShowValues(!showValues)}
                              className="bg-white/20 hover:bg-white/30 p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                              title={showValues ? "Ocultar valores" : "Mostrar valores"}
                            >
                              {showValues ? (
                                <EyeOff className="w-5 h-5 text-gray-900" />
                              ) : (
                                <Eye className="w-5 h-5 text-gray-900" />
                              )}
                            </button>
                            <button
                              onClick={refetch}
                              className="bg-white/20 hover:bg-white/30 p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                              title="Atualizar dados"
                            >
                              <RefreshCw className="w-5 h-5 text-gray-900" />
                            </button>
                            <div className="bg-white/20 p-3 rounded-full shadow-lg">
                              <DollarSign className="w-8 h-8 text-gray-900" />
                            </div>
                          </div>
                        </div>

                        {/* Valor Principal Destacado */}
                        <div className="text-center mb-6 bg-black/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                          <div className={`text-4xl md:text-5xl font-black text-gray-900 mb-2 drop-shadow-lg transition-all duration-300 ${
                            !showValues ? 'blur-sm select-none' : ''
                          }`}>
                            {showValues ? formatCurrency(salesMetrics.valor_vendido) : 'R$ ***.***,**'}
                          </div>
                          <div className="text-lg font-bold text-gray-800">
                            Valor Total Vendido
                          </div>
                          <div className={`text-sm text-gray-700 mt-2 bg-white/50 rounded-lg px-3 py-1 inline-block transition-all duration-300 ${
                            !showValues ? 'blur-sm select-none' : ''
                          }`}>
                            Meta: <span className="font-bold">{showValues ? formatCurrency(500000) : 'R$ ***.***,**'}</span> |
                            {showValues ? ` ${arrecadacaoPercentage.toFixed(1)}% arrecadado` : ' **.* % arrecadado'}
                          </div>
                        </div>

                        {/* Métricas em Grid Elegante */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                          {/* Progresso da Meta */}
                          <div className="bg-black/20 backdrop-blur-sm p-4 rounded-xl border border-white/30">
                            <div className="text-center">
                              <div className={`text-2xl font-bold text-gray-900 mb-1 transition-all duration-300 ${
                                !showValues ? 'blur-sm select-none' : ''
                              }`}>
                                <Target className="w-5 h-5 inline mr-1" />
                                {showValues ? (salesMetrics.valor_vendido > 0 ? ((salesMetrics.valor_vendido / 500000) * 100).toFixed(1) : '0.0') : '**.* '}%
                              </div>
                              <div className="text-sm font-semibold text-gray-800 mb-2">Meta Atingida</div>
                              <div className="h-2 bg-gray-900/30 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-1000 ${
                                    showValues ? (
                                      (salesMetrics.valor_vendido / 500000) > 0.8 ? 'bg-green-400' :
                                      (salesMetrics.valor_vendido / 500000) >= 0.5 ? 'bg-yellow-300' : 'bg-red-400'
                                    ) : 'bg-gray-400'
                                  }`}
                                  style={{ width: `${showValues ? Math.min((salesMetrics.valor_vendido / 500000) * 100, 100) : 30}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Taxa de Conversão */}
                          <div className="bg-black/20 backdrop-blur-sm p-4 rounded-xl border border-white/30">
                            <div className="text-center">
                              <div className={`text-2xl font-bold text-gray-900 mb-1 transition-all duration-300 ${
                                !showValues ? 'blur-sm select-none' : ''
                              }`}>
                                {showValues ? (callsMetrics.total_calls > 0 ? ((callsMetrics.calls_vendidas / callsMetrics.total_calls) * 100).toFixed(1) : '0.0') : '**.* '}%
                              </div>
                              <div className="text-sm font-semibold text-gray-800 mb-2">Conversão</div>
                              <div className="h-2 bg-gray-900/30 rounded-full overflow-hidden mb-1">
                                <div
                                  className={`h-full transition-all duration-1000 ${
                                    showValues ? (
                                      callsMetrics.total_calls > 0
                                        ? (() => {
                                            const conversionRate = (callsMetrics.calls_vendidas / callsMetrics.total_calls) * 100;
                                            if (conversionRate >= 50) return 'bg-green-400';
                                            if (conversionRate >= 30) return 'bg-yellow-300';
                                            return 'bg-red-400';
                                          })()
                                        : 'bg-gray-400'
                                    ) : 'bg-gray-400'
                                  }`}
                                  style={{
                                    width: `${showValues ? (
                                      callsMetrics.total_calls > 0
                                        ? Math.min(((callsMetrics.calls_vendidas / callsMetrics.total_calls) * 100) / 50 * 100, 100)
                                        : 0
                                    ) : 60}%`
                                  }}
                                />
                              </div>
                              <div className={`text-xs text-gray-700 transition-all duration-300 ${
                                !showValues ? 'blur-sm select-none' : ''
                              }`}>
                                {showValues ? `${callsMetrics.calls_vendidas || 0}/${callsMetrics.total_calls || 0}` : '***/***'} calls
                              </div>
                            </div>
                          </div>

                          {/* % Arrecadado */}
                          <div className="bg-black/20 backdrop-blur-sm p-4 rounded-xl border border-white/30">
                            <div className="text-center">
                              <div className={`text-2xl font-bold text-gray-900 mb-1 transition-all duration-300 ${
                                !showValues ? 'blur-sm select-none' : ''
                              }`}>
                                {showValues ? arrecadacaoPercentage.toFixed(1) : '**.* '}%
                              </div>
                              <div className="text-sm font-semibold text-gray-800 mb-1">Arrecadado</div>
                              <div className="text-xs text-gray-700">
                                do total vendido
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* Régua de Arrecadação Premium - 5 segments */}
                        <div className="bg-black/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-lg font-bold text-gray-900">Performance de Arrecadação</h4>
                            <div className={`text-2xl font-black text-gray-900 transition-all duration-300 ${
                              !showValues ? 'blur-sm select-none' : ''
                            }`}>
                              {showValues ? arrecadacaoPercentage.toFixed(1) : '**.* '}%
                            </div>
                          </div>

                          {/* Barra de Progresso - 5 faixas */}
                          <div className="relative h-6 bg-gray-900/30 rounded-full overflow-hidden mb-3 shadow-inner">
                            {/* Faixas de cores de fundo: 20% + 20% + 20% + 10% + 30% = 100% */}
                            <div className="absolute inset-0 flex z-0">
                              <div style={{ width: '20%' }} className="bg-red-300/60"></div>
                              <div style={{ width: '20%' }} className="bg-orange-300/60"></div>
                              <div style={{ width: '20%' }} className="bg-blue-300/60"></div>
                              <div style={{ width: '10%' }} className="bg-lime-300/60"></div>
                              <div style={{ width: '30%' }} className="bg-green-300/60"></div>
                            </div>

                            {/* Barra de progresso */}
                            <div
                              className={`h-full transition-all duration-1000 relative z-10 shadow-lg ${
                                showValues ? getRevenueBarColor(arrecadacaoPercentage) : 'bg-gray-400'
                              }`}
                              style={{
                                width: `${showValues ? Math.min(arrecadacaoPercentage, 100) : 40}%`
                              }}
                            />
                          </div>

                          {/* Labels das 5 faixas */}
                          <div className="flex text-xs font-semibold">
                            <div style={{ width: '20%' }} className="text-red-600 text-center">Péssimo</div>
                            <div style={{ width: '20%' }} className="text-orange-600 text-center">Ruim</div>
                            <div style={{ width: '20%' }} className="text-blue-600 text-center">Bom</div>
                            <div style={{ width: '10%' }} className="text-lime-600 text-center">Ótimo</div>
                            <div style={{ width: '30%' }} className="text-green-600 text-center">Excelente</div>
                          </div>
                        </div>

                      </>
                    </CardContent>
                  </Card>
                )}

                {/* Evolução do Dashboard Chart */}
                {!metricsLoading && !metricsError && evolution && evolution.length > 1 && (
                  <Card className="border shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        Evolução do Dashboard
                        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {DATE_FILTER_OPTIONS.find(o => o.value === dateFilter)?.label || 'Mês'}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={evolution} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 12, fill: '#6b7280' }}
                              tickLine={false}
                            />
                            <YAxis
                              yAxisId="currency"
                              tick={{ fontSize: 11, fill: '#6b7280' }}
                              tickFormatter={(value) => {
                                if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
                                return value.toString()
                              }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              yAxisId="percentage"
                              orientation="right"
                              tick={{ fontSize: 11, fill: '#6b7280' }}
                              tickFormatter={(value) => `${value}%`}
                              tickLine={false}
                              axisLine={false}
                              domain={[0, 100]}
                            />
                            <Tooltip content={<EvolutionTooltip />} />
                            <Legend
                              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                            />
                            <Line
                              yAxisId="currency"
                              type="monotone"
                              dataKey="faturamento"
                              name="Faturamento"
                              stroke="#22c55e"
                              strokeWidth={2.5}
                              dot={{ r: 4, fill: '#22c55e' }}
                              activeDot={{ r: 6 }}
                            />
                            <Line
                              yAxisId="currency"
                              type="monotone"
                              dataKey="arrecadado"
                              name="Arrecadado"
                              stroke="#a855f7"
                              strokeWidth={2.5}
                              dot={{ r: 4, fill: '#a855f7' }}
                              activeDot={{ r: 6 }}
                            />
                            <Line
                              yAxisId="percentage"
                              type="monotone"
                              dataKey="taxa_conversao"
                              name="Taxa Conversão"
                              stroke="#eab308"
                              strokeWidth={2}
                              dot={{ r: 3, fill: '#eab308' }}
                              strokeDasharray="5 5"
                            />
                            <Line
                              yAxisId="percentage"
                              type="monotone"
                              dataKey="taxa_churn"
                              name="Taxa Churn"
                              stroke="#ef4444"
                              strokeWidth={2}
                              dot={{ r: 3, fill: '#ef4444' }}
                              strokeDasharray="5 5"
                            />
                            <Line
                              yAxisId="percentage"
                              type="monotone"
                              dataKey="volume_calls"
                              name="Volume Calls"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              dot={{ r: 3, fill: '#3b82f6' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
