'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Crown, Shield, User2, Loader2, DollarSign, Target, RefreshCw, AlertCircle, Eye, EyeOff, Calendar, UserX, UserMinus } from 'lucide-react'
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
    total_vendas: 0,
    total_churn: 0,
    total_churnzinho: 0
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
      case 'owner': return <Crown className="w-4 h-4 text-purple-400" />
      case 'manager': return <Shield className="w-4 h-4 text-blue-400" />
      case 'viewer': return <User2 className="w-4 h-4 text-emerald-400" />
      default: return <User2 className="w-4 h-4 text-white/40" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      case 'manager': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'viewer': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      default: return 'bg-white/10 text-white/60 border-white/20'
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
        <div className="bg-[#1a1a1e] text-white p-3 rounded-xl shadow-2xl border border-white/[0.08] text-sm">
          <p className="font-bold mb-2 text-white/90">{label}</p>
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
    <div className="min-h-screen bg-[#0a0a0c]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Dashboard</h1>
                <p className="text-xs text-white/40 mt-0.5">Centro de resultados e performance</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refetch}
                className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${metricsLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{metricsLoading ? 'Atualizando...' : 'Atualizar'}</span>
              </button>
              <button
                onClick={() => setShowValues(!showValues)}
                className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all"
                title={showValues ? "Ocultar valores" : "Mostrar valores"}
              >
                {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="hidden sm:inline">{showValues ? 'Ocultar' : 'Mostrar'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Date Filter + Organization Row */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Date Filters Card */}
          <div className="flex-1 bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-white/40" />
              <span className="text-sm font-medium text-white/50 mr-1">Periodo:</span>
              {DATE_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDateFilter(option.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    dateFilter === option.value
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.08] hover:text-white/80 border border-white/[0.06]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Custom date inputs */}
            {dateFilter === 'custom' && (
              <div className="flex flex-wrap items-center gap-4 mt-3 p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-white/50">De:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-white/[0.08] rounded-lg bg-white/[0.05] text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-white/50">Ate:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-white/[0.08] rounded-lg bg-white/[0.05] text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Organization Info */}
          <div className="lg:w-[380px]">
            {loading ? (
              <div className="bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] flex items-center gap-3 h-full">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                <span className="text-sm text-white/50">Carregando organizacao...</span>
              </div>
            ) : isReady && activeOrganization ? (
              <div className="bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] h-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm truncate">{organizationName}</h3>
                    <p className="text-xs text-white/40 truncate">
                      {activeOrganization.organization.owner_email}
                    </p>
                  </div>
                  {userRole && (
                    <Badge variant="outline" className={`${getRoleBadgeColor(userRole)} text-xs`}>
                      {getRoleIcon(userRole)}
                      <span className="ml-1 capitalize">{userRole}</span>
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${canManage ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                    <span className="text-white/50">
                      {canManage ? 'Pode gerenciar' : 'Visualizacao'}
                    </span>
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-1">
                      <Crown className="w-3 h-3 text-purple-400" />
                      <span className="text-purple-400 font-medium">Proprietario</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#1a1a1e] rounded-2xl p-5 border border-red-500/20 h-full">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/20">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Nenhuma organizacao ativa</h3>
                    <p className="text-xs text-white/40">
                      Voce precisa ser membro de uma organizacao.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Faturamento + KPIs */}
        {isReady && (
          <div className="space-y-6">
            {metricsLoading ? (
              <OptimizedLoadingCard />
            ) : metricsError ? (
              <div className="bg-[#1a1a1e] rounded-2xl p-8 border border-red-500/20 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                <h3 className="text-xl font-bold mb-2 text-white">Erro ao carregar metricas</h3>
                <p className="text-sm mb-4 text-white/50">{metricsError}</p>
                <button
                  onClick={refetch}
                  className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 px-5 py-2.5 rounded-xl font-medium transition-all text-red-300 hover:text-red-200"
                >
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  Tentar Novamente
                </button>
              </div>
            ) : (
              <>
                {/* Faturamento Hero Card */}
                <div className="relative overflow-hidden bg-[#1a1a1e] rounded-2xl border border-white/[0.06] shadow-2xl">
                  {/* Gradient accent line at top */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500" />

                  {/* Subtle glow effect */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-gradient-to-b from-emerald-500/[0.06] to-transparent rounded-full blur-3xl pointer-events-none" />

                  <div className="relative p-6">
                    {/* Stale data indicator */}
                    {isStale && (
                      <div className="absolute top-4 right-4 bg-amber-500/20 text-amber-300 text-xs px-3 py-1 rounded-full animate-pulse border border-amber-500/20 z-20">
                        Atualizando...
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-3">
                          FATURAMENTO
                          <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                            {DATE_FILTER_OPTIONS.find(o => o.value === dateFilter)?.label || 'Mes'}
                          </span>
                        </h3>
                        <p className="text-sm text-white/40 mt-0.5">Centro de Resultados</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    {/* Main Value */}
                    <div className="text-center mb-6 bg-white/[0.03] backdrop-blur-sm rounded-2xl p-6 border border-white/[0.06]">
                      <div className={`text-4xl md:text-5xl font-black text-white mb-2 tracking-tight transition-all duration-300 ${
                        !showValues ? 'blur-md select-none' : ''
                      }`}>
                        {showValues ? formatCurrency(salesMetrics.valor_vendido) : 'R$ ***.***,**'}
                      </div>
                      <div className="text-base font-semibold text-white/60">
                        Valor Total Vendido
                      </div>
                      <div className={`text-sm text-white/40 mt-2 bg-white/[0.05] rounded-lg px-3 py-1.5 inline-block transition-all duration-300 border border-white/[0.04] ${
                        !showValues ? 'blur-md select-none' : ''
                      }`}>
                        Meta: <span className="font-bold text-white/60">{showValues ? formatCurrency(500000) : 'R$ ***.***,**'}</span> |
                        {showValues ? ` ${arrecadacaoPercentage.toFixed(1)}% arrecadado` : ' **.* % arrecadado'}
                      </div>
                    </div>

                    {/* KPI Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                      {/* Meta Progress */}
                      <div className="group relative bg-white/[0.03] backdrop-blur-sm p-5 rounded-2xl border border-white/[0.06] hover:border-emerald-500/20 transition-all duration-300 overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-emerald-500/[0.1]" />
                        <div className="relative text-center">
                          <div className={`text-3xl font-bold text-white mb-1 transition-all duration-300 ${
                            !showValues ? 'blur-md select-none' : ''
                          }`}>
                            <Target className="w-5 h-5 inline mr-1 text-emerald-400" />
                            {showValues ? (salesMetrics.valor_vendido > 0 ? ((salesMetrics.valor_vendido / 500000) * 100).toFixed(1) : '0.0') : '**.* '}%
                          </div>
                          <div className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">Meta Atingida</div>
                          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-1000 rounded-full ${
                                showValues ? (
                                  (salesMetrics.valor_vendido / 500000) > 0.8 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                  (salesMetrics.valor_vendido / 500000) >= 0.5 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-red-500 to-red-400'
                                ) : 'bg-white/20'
                              }`}
                              style={{ width: `${showValues ? Math.min((salesMetrics.valor_vendido / 500000) * 100, 100) : 30}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Conversion Rate */}
                      <div className="group relative bg-white/[0.03] backdrop-blur-sm p-5 rounded-2xl border border-white/[0.06] hover:border-cyan-500/20 transition-all duration-300 overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-cyan-500/[0.1]" />
                        <div className="relative text-center">
                          <div className={`text-3xl font-bold text-white mb-1 transition-all duration-300 ${
                            !showValues ? 'blur-md select-none' : ''
                          }`}>
                            {showValues ? (callsMetrics.total_calls > 0 ? ((callsMetrics.calls_vendidas / callsMetrics.total_calls) * 100).toFixed(1) : '0.0') : '**.* '}%
                          </div>
                          <div className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">Conversao</div>
                          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden mb-2">
                            <div
                              className={`h-full transition-all duration-1000 rounded-full ${
                                showValues ? (
                                  callsMetrics.total_calls > 0
                                    ? (() => {
                                        const conversionRate = (callsMetrics.calls_vendidas / callsMetrics.total_calls) * 100;
                                        if (conversionRate >= 50) return 'bg-gradient-to-r from-emerald-500 to-emerald-400';
                                        if (conversionRate >= 30) return 'bg-gradient-to-r from-amber-500 to-amber-400';
                                        return 'bg-gradient-to-r from-red-500 to-red-400';
                                      })()
                                    : 'bg-white/20'
                                ) : 'bg-white/20'
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
                          <div className={`text-xs text-white/40 transition-all duration-300 ${
                            !showValues ? 'blur-md select-none' : ''
                          }`}>
                            {showValues ? `${callsMetrics.calls_vendidas || 0}/${callsMetrics.total_calls || 0}` : '***/***'} calls
                          </div>
                        </div>
                      </div>

                      {/* % Arrecadado */}
                      <div className="group relative bg-white/[0.03] backdrop-blur-sm p-5 rounded-2xl border border-white/[0.06] hover:border-amber-500/20 transition-all duration-300 overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-amber-500/[0.1]" />
                        <div className="relative text-center">
                          <div className={`text-3xl font-bold text-white mb-1 transition-all duration-300 ${
                            !showValues ? 'blur-md select-none' : ''
                          }`}>
                            {showValues ? arrecadacaoPercentage.toFixed(1) : '**.* '}%
                          </div>
                          <div className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">Arrecadado</div>
                          <div className="text-xs text-white/30">
                            do total vendido
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Performance Ruler */}
                    <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl p-5 border border-white/[0.06]">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-white/80 uppercase tracking-wider">Performance de Arrecadacao</h4>
                        <div className={`text-2xl font-black text-white transition-all duration-300 ${
                          !showValues ? 'blur-md select-none' : ''
                        }`}>
                          {showValues ? arrecadacaoPercentage.toFixed(1) : '**.* '}%
                        </div>
                      </div>

                      {/* Progress Bar - 5 ranges */}
                      <div className="relative h-5 bg-white/[0.04] rounded-full overflow-hidden mb-3 shadow-inner">
                        {/* Background color bands: 20% + 20% + 20% + 10% + 30% = 100% */}
                        <div className="absolute inset-0 flex z-0">
                          <div style={{ width: '20%' }} className="bg-red-500/15"></div>
                          <div style={{ width: '20%' }} className="bg-orange-500/15"></div>
                          <div style={{ width: '20%' }} className="bg-blue-500/15"></div>
                          <div style={{ width: '10%' }} className="bg-lime-500/15"></div>
                          <div style={{ width: '30%' }} className="bg-emerald-500/15"></div>
                        </div>

                        {/* Progress bar */}
                        <div
                          className={`h-full transition-all duration-1000 relative z-10 shadow-lg rounded-full ${
                            showValues ? getRevenueBarColor(arrecadacaoPercentage) : 'bg-white/20'
                          }`}
                          style={{
                            width: `${showValues ? Math.min(arrecadacaoPercentage, 100) : 40}%`
                          }}
                        />
                      </div>

                      {/* Range Labels */}
                      <div className="flex text-[10px] font-semibold uppercase tracking-wider">
                        <div style={{ width: '20%' }} className="text-red-400/70 text-center">Pessimo</div>
                        <div style={{ width: '20%' }} className="text-orange-400/70 text-center">Ruim</div>
                        <div style={{ width: '20%' }} className="text-blue-400/70 text-center">Bom</div>
                        <div style={{ width: '10%' }} className="text-lime-400/70 text-center">Otimo</div>
                        <div style={{ width: '30%' }} className="text-emerald-400/70 text-center">Excelente</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Churn & Churnzinho Cards */}
                {(salesMetrics.total_churn > 0 || salesMetrics.total_churnzinho > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Churn Card */}
                    <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] hover:border-red-500/20 transition-all duration-300 overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-500/[0.08] to-transparent rounded-bl-full transition-all group-hover:from-red-500/[0.15]" />
                      <div className="relative flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Churn (Leads)</p>
                          <p className="text-3xl font-black text-white mt-1 tabular-nums">{salesMetrics.total_churn}</p>
                          <p className="text-xs text-red-400/80 mt-1">
                            {salesMetrics.total_leads > 0
                              ? `${((salesMetrics.total_churn / salesMetrics.total_leads) * 100).toFixed(1)}% dos leads`
                              : '0% dos leads'
                            }
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/20">
                          <UserX className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Churnzinho Card */}
                    <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] hover:border-pink-500/20 transition-all duration-300 overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-pink-500/[0.08] to-transparent rounded-bl-full transition-all group-hover:from-pink-500/[0.15]" />
                      <div className="relative flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Churnzinho (Leads)</p>
                          <p className="text-3xl font-black text-white mt-1 tabular-nums">{salesMetrics.total_churnzinho}</p>
                          <p className="text-xs text-pink-400/80 mt-1">
                            {salesMetrics.total_leads > 0
                              ? `${((salesMetrics.total_churnzinho / salesMetrics.total_leads) * 100).toFixed(1)}% dos leads`
                              : '0% dos leads'
                            }
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center shadow-lg shadow-pink-500/20">
                          <UserMinus className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Evolution Chart */}
                {evolution && evolution.length > 1 && (
                  <div className="bg-[#1a1a1e] rounded-2xl border border-white/[0.06] overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/[0.04]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">Evolucao do Dashboard</h3>
                          <span className="text-xs font-medium text-white/30 bg-white/[0.05] px-2.5 py-0.5 rounded-full border border-white/[0.06]">
                            {DATE_FILTER_OPTIONS.find(o => o.value === dateFilter)?.label || 'Mes'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={evolution} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.35)' }}
                              tickLine={false}
                              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                            />
                            <YAxis
                              yAxisId="currency"
                              tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }}
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
                              tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }}
                              tickFormatter={(value) => `${value}%`}
                              tickLine={false}
                              axisLine={false}
                              domain={[0, 100]}
                            />
                            <Tooltip content={<EvolutionTooltip />} />
                            <Legend
                              wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: 'rgba(255,255,255,0.5)' }}
                            />
                            <Line
                              yAxisId="currency"
                              type="monotone"
                              dataKey="faturamento"
                              name="Faturamento"
                              stroke="#22c55e"
                              strokeWidth={2.5}
                              dot={{ r: 4, fill: '#22c55e', stroke: '#0a0a0c', strokeWidth: 2 }}
                              activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2, fill: '#0a0a0c' }}
                            />
                            <Line
                              yAxisId="currency"
                              type="monotone"
                              dataKey="arrecadado"
                              name="Arrecadado"
                              stroke="#a855f7"
                              strokeWidth={2.5}
                              dot={{ r: 4, fill: '#a855f7', stroke: '#0a0a0c', strokeWidth: 2 }}
                              activeDot={{ r: 6, stroke: '#a855f7', strokeWidth: 2, fill: '#0a0a0c' }}
                            />
                            <Line
                              yAxisId="percentage"
                              type="monotone"
                              dataKey="taxa_conversao"
                              name="Taxa Conversao"
                              stroke="#eab308"
                              strokeWidth={2}
                              dot={{ r: 3, fill: '#eab308', stroke: '#0a0a0c', strokeWidth: 2 }}
                              strokeDasharray="5 5"
                            />
                            <Line
                              yAxisId="percentage"
                              type="monotone"
                              dataKey="taxa_churn"
                              name="Taxa Churn"
                              stroke="#ef4444"
                              strokeWidth={2}
                              dot={{ r: 3, fill: '#ef4444', stroke: '#0a0a0c', strokeWidth: 2 }}
                              strokeDasharray="5 5"
                            />
                            <Line
                              yAxisId="percentage"
                              type="monotone"
                              dataKey="volume_calls"
                              name="Volume Calls"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              dot={{ r: 3, fill: '#3b82f6', stroke: '#0a0a0c', strokeWidth: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
