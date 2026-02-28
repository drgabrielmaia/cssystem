'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Phone,
  Mail,
  MessageCircle,
  UserPlus,
  ExternalLink,
  Download,
  RefreshCw,
  PieChart,
  Activity,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Crown,
  Medal,
  Award,
  ChevronDown,
  Zap,
  Filter,
  Star,
  Trophy,
  Shield
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface LeadRaw {
  id: string
  nome_completo: string | null
  origem: string | null
  status: string | null
  valor_venda: number | null
  closer_id: string | null
  created_at: string
  closers: {
    id: string
    nome_completo: string | null
    nome: string | null
  } | null
}

interface CloserRaw {
  id: string
  nome_completo: string | null
  nome: string | null
  tipo_closer: string | null
  meta_mensal: number | null
  comissao_percentual: number | null
  ativo: boolean | null
}

interface ChannelData {
  origem: string
  total_leads: number
  percentage: number
  leads_this_period: number
  leads_last_period: number
  growth_rate: number
  conversion_rate: number
  revenue: number
}

interface CloserPerformance {
  id: string
  name: string
  tipo: string | null
  leads_assigned: number
  leads_won: number
  revenue: number
  conversion_rate: number
  meta_mensal: number | null
  comissao_percentual: number | null
}

interface StatusCount {
  status: string
  count: number
  percentage: number
  revenue: number
}

// ─── Status configuration ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; gradient: string }> = {
  novo:            { label: 'Novo',            color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    gradient: 'from-blue-500 to-blue-600' },
  contactado:      { label: 'Contactado',      color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    gradient: 'from-cyan-500 to-cyan-600' },
  qualificado:     { label: 'Qualificado',     color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   gradient: 'from-amber-500 to-amber-600' },
  proposta:        { label: 'Proposta',         color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  gradient: 'from-purple-500 to-purple-600' },
  negociacao:      { label: 'Negociação',      color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  gradient: 'from-orange-500 to-orange-600' },
  fechado_ganho:   { label: 'Fechado (Ganho)',  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', gradient: 'from-emerald-500 to-emerald-600' },
  fechado_perdido: { label: 'Fechado (Perdido)',color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     gradient: 'from-red-500 to-red-600' },
  churn:           { label: 'Churn',            color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    gradient: 'from-rose-500 to-rose-600' },
  churnzinho:      { label: 'Churnzinho',       color: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/20',    gradient: 'from-pink-500 to-pink-600' },
  desistiu:        { label: 'Desistiu',         color: 'text-gray-400',    bg: 'bg-gray-500/10',    border: 'border-gray-500/20',    gradient: 'from-gray-500 to-gray-600' },
}

const STATUS_ORDER = ['novo', 'contactado', 'qualificado', 'proposta', 'negociacao', 'fechado_ganho', 'fechado_perdido', 'churn', 'churnzinho', 'desistiu']

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function getChannelIcon(channel: string) {
  switch (channel.toLowerCase()) {
    case 'instagram':
      return <MessageCircle className="h-4 w-4" />
    case 'whatsapp':
      return <Phone className="h-4 w-4" />
    case 'indicacao':
      return <UserPlus className="h-4 w-4" />
    case 'direct':
    case 'direto':
      return <ExternalLink className="h-4 w-4" />
    case 'trafego':
    case 'tráfego pago':
      return <Target className="h-4 w-4" />
    case 'email':
      return <Mail className="h-4 w-4" />
    default:
      return <Activity className="h-4 w-4" />
  }
}

function getChannelGradient(channel: string): string {
  switch (channel.toLowerCase()) {
    case 'instagram':    return 'from-fuchsia-500 to-pink-600'
    case 'whatsapp':     return 'from-emerald-500 to-green-600'
    case 'indicacao':    return 'from-blue-500 to-indigo-600'
    case 'direct':
    case 'direto':       return 'from-slate-400 to-slate-600'
    case 'trafego':
    case 'tráfego pago': return 'from-orange-500 to-red-500'
    case 'email':        return 'from-violet-500 to-purple-600'
    default:             return 'from-gray-400 to-gray-600'
  }
}

function getChannelBarColor(channel: string): string {
  switch (channel.toLowerCase()) {
    case 'instagram':    return 'bg-gradient-to-r from-fuchsia-500 to-pink-500'
    case 'whatsapp':     return 'bg-gradient-to-r from-emerald-500 to-green-500'
    case 'indicacao':    return 'bg-gradient-to-r from-blue-500 to-indigo-500'
    case 'direct':
    case 'direto':       return 'bg-gradient-to-r from-slate-400 to-slate-500'
    case 'trafego':
    case 'tráfego pago': return 'bg-gradient-to-r from-orange-500 to-red-500'
    case 'email':        return 'bg-gradient-to-r from-violet-500 to-purple-500'
    default:             return 'bg-gradient-to-r from-gray-400 to-gray-500'
  }
}

function formatChannelName(channel: string): string {
  const nameMap: Record<string, string> = {
    'instagram': 'Instagram',
    'whatsapp': 'WhatsApp',
    'indicacao': 'Indicação',
    'direct': 'Acesso Direto',
    'direto': 'Acesso Direto',
    'trafego': 'Tráfego Pago',
    'social-seller': 'Social Seller',
    'outros': 'Outros',
    'formulario_seguro': 'Form. Seguro',
    'formulario_qualificacao_v2': 'Form. Qualificação',
    'email': 'E-mail',
  }
  return nameMap[channel] || channel.charAt(0).toUpperCase() + channel.slice(1)
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-400" />
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-300" />
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />
  return <span className="text-xs font-bold text-white/30">#{rank}</span>
}

function getRankBadgeBg(rank: number): string {
  if (rank === 1) return 'bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border-amber-500/30'
  if (rank === 2) return 'bg-gradient-to-br from-slate-400/20 to-slate-300/10 border-slate-400/30'
  if (rank === 3) return 'bg-gradient-to-br from-amber-700/20 to-orange-600/10 border-amber-700/30'
  return 'bg-white/[0.03] border-white/[0.06]'
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function LeadDistributionDashboard() {
  const { organizationId } = useAuth()

  // State
  const [leads, setLeads] = useState<LeadRaw[]>([])
  const [closers, setClosers] = useState<CloserRaw[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')

  // ─── Date range calculation ─────────────────────────────────────────────────

  const getDateRanges = useCallback(() => {
    const now = new Date()
    let startDate: Date
    let lastPeriodStart: Date
    let lastPeriodEnd: Date

    switch (selectedPeriod) {
      case '7d': {
        const dayOfWeek = now.getDay()
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        startDate = new Date(now)
        startDate.setDate(now.getDate() - daysToMonday)
        startDate.setHours(0, 0, 0, 0)
        lastPeriodStart = new Date(startDate)
        lastPeriodStart.setDate(startDate.getDate() - 7)
        lastPeriodEnd = new Date(startDate)
        lastPeriodEnd.setSeconds(-1)
        break
      }
      case '30d': {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        lastPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        lastPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        lastPeriodEnd.setHours(23, 59, 59, 999)
        break
      }
      case '90d': {
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 90)
        startDate.setHours(0, 0, 0, 0)
        lastPeriodStart = new Date(startDate)
        lastPeriodStart.setDate(startDate.getDate() - 90)
        lastPeriodEnd = new Date(startDate)
        lastPeriodEnd.setSeconds(-1)
        break
      }
      default: {
        startDate = new Date(now)
        startDate.setFullYear(now.getFullYear() - 1)
        startDate.setHours(0, 0, 0, 0)
        lastPeriodStart = new Date(startDate)
        lastPeriodStart.setFullYear(startDate.getFullYear() - 1)
        lastPeriodEnd = new Date(startDate)
        lastPeriodEnd.setSeconds(-1)
      }
    }

    return { startDate, lastPeriodStart, lastPeriodEnd }
  }, [selectedPeriod])

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const loadData = useCallback(async (showRefresh = false) => {
    if (!organizationId) return

    if (showRefresh) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const [leadsResult, closersResult] = await Promise.all([
        supabase
          .from('leads')
          .select('id, nome_completo, origem, status, valor_venda, closer_id, created_at, closers:closer_id(id, nome_completo, nome)')
          .eq('organization_id', organizationId)
          .not('origem', 'is', null),
        supabase
          .from('closers')
          .select('id, nome_completo, nome, tipo_closer, meta_mensal, comissao_percentual, ativo')
          .eq('organization_id', organizationId)
      ])

      if (leadsResult.error) throw leadsResult.error
      if (closersResult.error) throw closersResult.error

      setLeads((leadsResult.data || []) as unknown as LeadRaw[])
      setClosers((closersResult.data || []) as CloserRaw[])
    } catch (error) {
      console.error('Error loading lead distribution data:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [organizationId])

  useEffect(() => {
    if (organizationId) loadData()
  }, [organizationId, loadData])

  // ─── Computed data ──────────────────────────────────────────────────────────

  const { startDate, lastPeriodStart, lastPeriodEnd } = useMemo(() => getDateRanges(), [getDateRanges])

  const totalLeads = leads.length

  const totalRevenue = useMemo(() => {
    return leads
      .filter(l => l.status === 'fechado_ganho')
      .reduce((sum, l) => sum + (l.valor_venda || 0), 0)
  }, [leads])

  const conversionRate = useMemo(() => {
    if (totalLeads === 0) return 0
    const won = leads.filter(l => l.status === 'fechado_ganho').length
    return (won / totalLeads) * 100
  }, [leads, totalLeads])

  // Status breakdown
  const statusBreakdown = useMemo<StatusCount[]>(() => {
    const counts: Record<string, { count: number; revenue: number }> = {}
    leads.forEach(lead => {
      const status = lead.status || 'novo'
      if (!counts[status]) counts[status] = { count: 0, revenue: 0 }
      counts[status].count += 1
      if (lead.valor_venda && lead.status === 'fechado_ganho') {
        counts[status].revenue += lead.valor_venda
      }
    })

    return STATUS_ORDER.map(status => ({
      status,
      count: counts[status]?.count || 0,
      percentage: totalLeads > 0 ? ((counts[status]?.count || 0) / totalLeads) * 100 : 0,
      revenue: counts[status]?.revenue || 0,
    })).filter(s => s.count > 0)
  }, [leads, totalLeads])

  // Max status count for funnel width
  const maxStatusCount = useMemo(() => {
    return Math.max(...statusBreakdown.map(s => s.count), 1)
  }, [statusBreakdown])

  // Channel distribution
  const channelData = useMemo<ChannelData[]>(() => {
    const allChannelCounts: Record<string, number> = {}
    const currentChannelCounts: Record<string, number> = {}
    const previousChannelCounts: Record<string, number> = {}
    const channelConversions: Record<string, { total: number; converted: number; revenue: number }> = {}

    leads.forEach(lead => {
      const channel = lead.origem || 'outros'
      allChannelCounts[channel] = (allChannelCounts[channel] || 0) + 1

      const leadDate = new Date(lead.created_at)
      if (leadDate >= startDate) {
        currentChannelCounts[channel] = (currentChannelCounts[channel] || 0) + 1
      }
      if (leadDate >= lastPeriodStart && leadDate <= lastPeriodEnd) {
        previousChannelCounts[channel] = (previousChannelCounts[channel] || 0) + 1
      }

      if (!channelConversions[channel]) channelConversions[channel] = { total: 0, converted: 0, revenue: 0 }
      channelConversions[channel].total += 1
      if (lead.status === 'fechado_ganho') {
        channelConversions[channel].converted += 1
        channelConversions[channel].revenue += lead.valor_venda || 0
      }
    })

    const total = Object.values(allChannelCounts).reduce((sum, c) => sum + c, 0)

    return Object.entries(allChannelCounts)
      .map(([origem, count]) => {
        const currentCount = currentChannelCounts[origem] || 0
        const previousCount = previousChannelCounts[origem] || 0
        const growthRate = previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0
        const conv = channelConversions[origem]
        const conversionRate = conv ? (conv.converted / conv.total) * 100 : 0

        return {
          origem,
          total_leads: count,
          percentage: total > 0 ? (count / total) * 100 : 0,
          leads_this_period: currentCount,
          leads_last_period: previousCount,
          growth_rate: growthRate,
          conversion_rate: conversionRate,
          revenue: conv?.revenue || 0,
        }
      })
      .sort((a, b) => b.total_leads - a.total_leads)
  }, [leads, startDate, lastPeriodStart, lastPeriodEnd])

  const bestChannel = channelData.length > 0 ? channelData[0] : null
  const maxChannelLeads = useMemo(() => Math.max(...channelData.map(c => c.total_leads), 1), [channelData])

  // Closer performance
  const closerPerformance = useMemo<CloserPerformance[]>(() => {
    const closerMap: Record<string, { leads: number; won: number; revenue: number }> = {}

    leads.forEach(lead => {
      if (!lead.closer_id) return
      if (!closerMap[lead.closer_id]) closerMap[lead.closer_id] = { leads: 0, won: 0, revenue: 0 }
      closerMap[lead.closer_id].leads += 1
      if (lead.status === 'fechado_ganho') {
        closerMap[lead.closer_id].won += 1
        closerMap[lead.closer_id].revenue += lead.valor_venda || 0
      }
    })

    return closers
      .filter(c => closerMap[c.id])
      .map(closer => {
        const data = closerMap[closer.id]
        return {
          id: closer.id,
          name: closer.nome_completo || closer.nome || 'Sem nome',
          tipo: closer.tipo_closer,
          leads_assigned: data.leads,
          leads_won: data.won,
          revenue: data.revenue,
          conversion_rate: data.leads > 0 ? (data.won / data.leads) * 100 : 0,
          meta_mensal: closer.meta_mensal,
          comissao_percentual: closer.comissao_percentual,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
  }, [leads, closers])

  // Revenue per channel (sorted by revenue)
  const revenueByChannel = useMemo(() => {
    return [...channelData].sort((a, b) => b.revenue - a.revenue).filter(c => c.revenue > 0)
  }, [channelData])

  const maxChannelRevenue = useMemo(() => Math.max(...revenueByChannel.map(c => c.revenue), 1), [revenueByChannel])

  // ─── Export ─────────────────────────────────────────────────────────────────

  const handleExport = () => {
    const headers = ['Canal', 'Total Leads', '%', 'Período Atual', 'Período Anterior', 'Conversão', 'Crescimento', 'Faturamento']
    const rows = channelData.map(item => [
      formatChannelName(item.origem),
      item.total_leads,
      `${item.percentage.toFixed(1)}%`,
      item.leads_this_period,
      item.leads_last_period,
      `${item.conversion_rate.toFixed(1)}%`,
      `${item.growth_rate >= 0 ? '+' : ''}${item.growth_rate.toFixed(1)}%`,
      formatCurrency(item.revenue),
    ])

    const closerHeaders = ['', '', 'Closer', 'Leads', 'Vendas', 'Conversão', 'Faturamento']
    const closerRows = closerPerformance.map(c => [
      '', '', c.name, c.leads_assigned, c.leads_won, `${c.conversion_rate.toFixed(1)}%`, formatCurrency(c.revenue)
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(',')),
      '',
      closerHeaders.join(','),
      ...closerRows.map(r => r.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `lead-distribution-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // ─── Period label ───────────────────────────────────────────────────────────

  const periodLabel = selectedPeriod === '7d' ? 'Esta Semana' : selectedPeriod === '30d' ? 'Este Mês' : selectedPeriod === '90d' ? 'Últimos 90 dias' : 'Último Ano'

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <RefreshCw className="h-7 w-7 animate-spin text-white" />
            </div>
            <div className="absolute -inset-2 rounded-2xl bg-emerald-500/20 blur-xl animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white">Carregando dados...</p>
            <p className="text-xs text-white/40 mt-1">Analisando distribuição de leads</p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Distribuição de Leads
                </h1>
                <p className="text-xs text-white/40 mt-0.5">
                  Analytics completo de aquisição, closers e faturamento
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Period selector */}
              <div className="relative">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm bg-[#1a1a1e] border border-white/[0.06] rounded-xl text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all cursor-pointer"
                >
                  <option value="7d">Esta semana</option>
                  <option value="30d">Este mês</option>
                  <option value="90d">Últimos 90 dias</option>
                  <option value="1y">Último ano</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
              </div>

              {/* Refresh */}
              <button
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-[#1a1a1e] border border-white/[0.06] text-white/70 rounded-xl hover:bg-white/[0.06] hover:text-white transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Atualizar</span>
              </button>

              {/* Export */}
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-500 hover:to-emerald-600 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── KPI Row ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Leads */}
          <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] hover:border-blue-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-blue-500/[0.1]" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Zap className="h-3 w-3 text-blue-400" />
                  <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Leads</span>
                </div>
              </div>
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Total de Leads</p>
              <p className="text-3xl font-bold text-white mt-1 tabular-nums">{formatNumber(totalLeads)}</p>
              <p className="text-[11px] text-white/30 mt-1">{periodLabel}</p>
            </div>
          </div>

          {/* Revenue */}
          <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] hover:border-emerald-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-emerald-500/[0.1]" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Revenue</span>
                </div>
              </div>
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Faturamento Total</p>
              <p className="text-3xl font-bold text-white mt-1 tabular-nums">{formatCurrency(totalRevenue)}</p>
              <p className="text-[11px] text-white/30 mt-1">Vendas fechadas (ganho)</p>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] hover:border-purple-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-purple-500/[0.1]" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <Filter className="h-3 w-3 text-purple-400" />
                  <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">CVR</span>
                </div>
              </div>
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Taxa de Conversão</p>
              <p className="text-3xl font-bold text-white mt-1 tabular-nums">{formatPercent(conversionRate)}</p>
              <p className="text-[11px] text-white/30 mt-1">Leads {'->'} Fechado Ganho</p>
            </div>
          </div>

          {/* Best Channel */}
          <div className="group relative bg-[#1a1a1e] rounded-2xl p-5 border border-white/[0.06] hover:border-amber-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/[0.06] to-transparent rounded-bl-full transition-all group-hover:from-amber-500/[0.1]" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Star className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Trophy className="h-3 w-3 text-amber-400" />
                  <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Top</span>
                </div>
              </div>
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Melhor Canal</p>
              <p className="text-2xl font-bold text-white mt-1 truncate">
                {bestChannel ? formatChannelName(bestChannel.origem) : '-'}
              </p>
              {bestChannel && (
                <p className="text-[11px] text-white/30 mt-1">{bestChannel.percentage.toFixed(1)}% dos leads &middot; {formatPercent(bestChannel.conversion_rate)} conv.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Status Funnel ─────────────────────────────────────────────────── */}
        <div className="bg-[#1a1a1e] rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Funil de Status</h3>
              <p className="text-[11px] text-white/30 mt-0.5">Distribuição de leads por etapa do funil</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.03] rounded-lg border border-white/[0.06] text-[11px] text-white/40">
              <Activity className="h-3 w-3" />
              <span>{statusBreakdown.length} status ativos</span>
            </div>
          </div>

          <div className="p-6">
            {statusBreakdown.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-white/10 mx-auto mb-2" />
                <p className="text-sm text-white/30">Nenhum dado de status disponível</p>
              </div>
            ) : (
              <div className="space-y-3">
                {statusBreakdown.map((item) => {
                  const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.novo
                  const widthPct = (item.count / maxStatusCount) * 100

                  return (
                    <div key={item.status} className="group">
                      <div className="flex items-center gap-4">
                        {/* Label */}
                        <div className="w-36 shrink-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.gradient}`} />
                            <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                          </div>
                        </div>

                        {/* Bar */}
                        <div className="flex-1 relative">
                          <div className="w-full bg-white/[0.03] rounded-lg h-9 overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${config.gradient} rounded-lg transition-all duration-700 ease-out flex items-center px-3 relative overflow-hidden`}
                              style={{ width: `${Math.max(widthPct, 3)}%` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-transparent" />
                              {widthPct > 15 && (
                                <span className="relative text-xs font-bold text-white/90 tabular-nums">{formatNumber(item.count)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="w-20 text-right shrink-0">
                          {widthPct <= 15 && (
                            <span className="text-sm font-bold text-white tabular-nums">{formatNumber(item.count)}</span>
                          )}
                          <span className="text-[11px] text-white/30 ml-1">({formatPercent(item.percentage)})</span>
                        </div>

                        {/* Revenue (for fechado_ganho) */}
                        <div className="w-28 text-right shrink-0">
                          {item.revenue > 0 && (
                            <span className="text-xs font-semibold text-emerald-400 tabular-nums">{formatCurrency(item.revenue)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Closer Performance + Revenue by Channel ──────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* Closer Performance */}
          <div className="xl:col-span-3 bg-[#1a1a1e] rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-400" />
                  Performance dos Closers
                </h3>
                <p className="text-[11px] text-white/30 mt-0.5">Ranking por faturamento gerado</p>
              </div>
              <span className="text-[11px] text-white/30 bg-white/[0.03] px-2 py-1 rounded-lg border border-white/[0.06]">
                {closerPerformance.length} closers
              </span>
            </div>

            <div className="p-4">
              {closerPerformance.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-10 w-10 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/30">Nenhum closer com leads atribuídos</p>
                  <p className="text-xs text-white/20 mt-1">Atribua leads a closers para ver a performance</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {closerPerformance.map((closer, index) => {
                    const rank = index + 1
                    const metaProgress = closer.meta_mensal && closer.meta_mensal > 0
                      ? (closer.revenue / closer.meta_mensal) * 100
                      : null

                    return (
                      <div
                        key={closer.id}
                        className={`relative rounded-xl border p-4 transition-all duration-300 hover:scale-[1.01] ${getRankBadgeBg(rank)}`}
                      >
                        {/* Rank glow for top 3 */}
                        {rank <= 3 && (
                          <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity ${
                            rank === 1 ? 'bg-amber-500/[0.03]' : rank === 2 ? 'bg-slate-300/[0.03]' : 'bg-amber-700/[0.03]'
                          }`} />
                        )}

                        <div className="relative flex items-start gap-4">
                          {/* Rank badge */}
                          <div className="flex flex-col items-center gap-1 pt-0.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              rank === 1 ? 'bg-gradient-to-br from-amber-500/20 to-yellow-500/10' :
                              rank === 2 ? 'bg-gradient-to-br from-slate-400/20 to-slate-300/10' :
                              rank === 3 ? 'bg-gradient-to-br from-amber-700/20 to-orange-600/10' :
                              'bg-white/[0.03]'
                            }`}>
                              {getRankIcon(rank)}
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <h4 className="text-sm font-semibold text-white truncate">{closer.name}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {closer.tipo && (
                                    <span className="text-[10px] font-medium text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded uppercase tracking-wider">
                                      {closer.tipo}
                                    </span>
                                  )}
                                  {closer.comissao_percentual && (
                                    <span className="text-[10px] text-emerald-400/60">
                                      {closer.comissao_percentual}% comissão
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-lg font-bold text-emerald-400 tabular-nums">{formatCurrency(closer.revenue)}</p>
                              </div>
                            </div>

                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-3 mt-3">
                              <div className="bg-[#111113] rounded-lg px-3 py-2">
                                <p className="text-[10px] text-white/30 uppercase tracking-wider">Leads</p>
                                <p className="text-sm font-bold text-blue-400 tabular-nums mt-0.5">{closer.leads_assigned}</p>
                              </div>
                              <div className="bg-[#111113] rounded-lg px-3 py-2">
                                <p className="text-[10px] text-white/30 uppercase tracking-wider">Vendas</p>
                                <p className="text-sm font-bold text-emerald-400 tabular-nums mt-0.5">{closer.leads_won}</p>
                              </div>
                              <div className="bg-[#111113] rounded-lg px-3 py-2">
                                <p className="text-[10px] text-white/30 uppercase tracking-wider">Conversão</p>
                                <p className="text-sm font-bold text-purple-400 tabular-nums mt-0.5">{formatPercent(closer.conversion_rate)}</p>
                              </div>
                            </div>

                            {/* Meta progress bar */}
                            {metaProgress !== null && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] text-white/20 uppercase tracking-wider">Meta mensal</span>
                                  <span className="text-[10px] text-white/40 tabular-nums">{formatCurrency(closer.revenue)} / {formatCurrency(closer.meta_mensal!)}</span>
                                </div>
                                <div className="w-full bg-white/[0.04] rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ${
                                      metaProgress >= 100
                                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                        : metaProgress >= 70
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                        : 'bg-gradient-to-r from-red-500 to-red-400'
                                    }`}
                                    style={{ width: `${Math.min(metaProgress, 100)}%` }}
                                  />
                                </div>
                                <div className="text-right mt-0.5">
                                  <span className={`text-[10px] font-semibold tabular-nums ${
                                    metaProgress >= 100 ? 'text-emerald-400' : metaProgress >= 70 ? 'text-amber-400' : 'text-red-400'
                                  }`}>
                                    {metaProgress.toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Revenue by Channel */}
          <div className="xl:col-span-2 bg-[#1a1a1e] rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.04]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                Faturamento por Canal
              </h3>
              <p className="text-[11px] text-white/30 mt-0.5">Revenue gerado por cada origem</p>
            </div>

            <div className="p-4 space-y-3">
              {revenueByChannel.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-10 w-10 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/30">Nenhuma venda registrada</p>
                </div>
              ) : (
                revenueByChannel.map((item) => {
                  const widthPct = (item.revenue / maxChannelRevenue) * 100
                  return (
                    <div key={item.origem} className="bg-[#111113] rounded-xl p-4 border border-white/[0.04] hover:border-white/[0.08] transition-all">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getChannelGradient(item.origem)} flex items-center justify-center text-white shadow-sm`}>
                            {getChannelIcon(item.origem)}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-white">{formatChannelName(item.origem)}</span>
                            <p className="text-[10px] text-white/25">{item.total_leads} leads &middot; {formatPercent(item.conversion_rate)} conv.</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-emerald-400 tabular-nums">{formatCurrency(item.revenue)}</span>
                      </div>
                      <div className="w-full bg-white/[0.04] rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${getChannelBarColor(item.origem)} rounded-full transition-all duration-700`}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}

              {/* Revenue per closer mini-list */}
              {closerPerformance.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/[0.04]">
                  <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">Faturamento por Closer</h4>
                  <div className="space-y-2">
                    {closerPerformance.slice(0, 5).map((closer, idx) => (
                      <div key={closer.id} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-white/20 w-4">#{idx + 1}</span>
                          <span className="text-xs text-white/60 truncate max-w-[120px]">{closer.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-emerald-400/80 tabular-nums">{formatCurrency(closer.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Channel Distribution ──────────────────────────────────────────── */}
        <div className="bg-[#1a1a1e] rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Distribuição por Canal</h3>
              <p className="text-[11px] text-white/30 mt-0.5">Volume total de leads e crescimento por origem</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.03] rounded-lg border border-white/[0.06] text-[11px] text-white/40">
              <PieChart className="h-3 w-3" />
              <span>{periodLabel}</span>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {channelData.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="h-10 w-10 text-white/10 mx-auto mb-3" />
                <p className="text-sm text-white/30">Nenhum dado disponível</p>
                <p className="text-xs text-white/20 mt-1">Verifique o período selecionado</p>
              </div>
            ) : (
              channelData.map((item) => {
                const barWidth = (item.total_leads / maxChannelLeads) * 100

                return (
                  <div key={item.origem} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getChannelGradient(item.origem)} text-white flex items-center justify-center shadow-lg`}>
                          {getChannelIcon(item.origem)}
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-white">
                            {formatChannelName(item.origem)}
                          </span>
                          <div className="flex items-center gap-2.5 mt-0.5">
                            <span className="text-[10px] text-white/25">
                              Período: <span className="text-white/40 font-medium">{item.leads_this_period}</span>
                            </span>
                            <span className="text-[10px] text-white/10">|</span>
                            <span className="text-[10px] text-white/25">
                              Anterior: <span className="text-white/40 font-medium">{item.leads_last_period}</span>
                            </span>
                            <span className="text-[10px] text-white/10">|</span>
                            <span className="text-[10px] text-white/25">
                              Conv: <span className="text-purple-400/80 font-medium">{formatPercent(item.conversion_rate)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Growth badge */}
                        <div className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          item.growth_rate >= 0
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : 'text-red-400 bg-red-500/10 border-red-500/20'
                        }`}>
                          {item.growth_rate >= 0 ?
                            <ArrowUpRight className="h-3 w-3" /> :
                            <ArrowDownRight className="h-3 w-3" />
                          }
                          {Math.abs(item.growth_rate).toFixed(1)}%
                        </div>

                        <div className="text-right">
                          <span className="text-lg font-bold text-white tabular-nums">
                            {formatNumber(item.total_leads)}
                          </span>
                          <span className="text-xs text-white/25 ml-1">
                            ({item.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bar */}
                    <div className="w-full bg-white/[0.03] rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full ${getChannelBarColor(item.origem)} rounded-full transition-all duration-700 ease-out relative overflow-hidden`}
                        style={{ width: `${barWidth}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.08] to-transparent" />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Summary Table ─────────────────────────────────────────────────── */}
        <div className="bg-[#1a1a1e] rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Resumo Completo</h3>
              <p className="text-[11px] text-white/30 mt-0.5">Visão consolidada de canais, conversões e faturamento</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.03] rounded-lg border border-white/[0.06] text-[11px] text-white/40">
              <Shield className="h-3 w-3" />
              <span>{channelData.length} canais</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left py-3 px-6 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Canal</th>
                  <th className="text-right py-3 px-4 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Total</th>
                  <th className="text-right py-3 px-4 text-[10px] font-semibold text-white/30 uppercase tracking-wider">%</th>
                  <th className="text-right py-3 px-4 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Período</th>
                  <th className="text-right py-3 px-4 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Anterior</th>
                  <th className="text-right py-3 px-4 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Conversão</th>
                  <th className="text-right py-3 px-4 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Faturamento</th>
                  <th className="text-right py-3 px-6 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Variação</th>
                </tr>
              </thead>
              <tbody>
                {channelData.map((item, idx) => (
                  <tr
                    key={item.origem}
                    className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${getChannelGradient(item.origem)} text-white flex items-center justify-center`}>
                          {getChannelIcon(item.origem)}
                        </div>
                        <span className="font-medium text-white/80">{formatChannelName(item.origem)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white tabular-nums">{formatNumber(item.total_leads)}</td>
                    <td className="py-3 px-4 text-right text-white/40 tabular-nums">{item.percentage.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right text-white/40 tabular-nums">{item.leads_this_period}</td>
                    <td className="py-3 px-4 text-right text-white/40 tabular-nums">{item.leads_last_period}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-purple-400/80 font-medium tabular-nums">{formatPercent(item.conversion_rate)}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-emerald-400/80 font-medium tabular-nums">{formatCurrency(item.revenue)}</span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        item.growth_rate >= 0
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          : 'text-red-400 bg-red-500/10 border-red-500/20'
                      }`}>
                        {item.growth_rate >= 0 ?
                          <ArrowUpRight className="h-3 w-3" /> :
                          <ArrowDownRight className="h-3 w-3" />
                        }
                        {Math.abs(item.growth_rate).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Summary footer */}
              <tfoot>
                <tr className="border-t border-white/[0.06] bg-white/[0.02]">
                  <td className="py-3 px-6 text-sm font-bold text-white">TOTAL</td>
                  <td className="py-3 px-4 text-right font-bold text-white tabular-nums">{formatNumber(totalLeads)}</td>
                  <td className="py-3 px-4 text-right text-white/40">100%</td>
                  <td className="py-3 px-4 text-right text-white/40 tabular-nums">
                    {formatNumber(channelData.reduce((s, c) => s + c.leads_this_period, 0))}
                  </td>
                  <td className="py-3 px-4 text-right text-white/40 tabular-nums">
                    {formatNumber(channelData.reduce((s, c) => s + c.leads_last_period, 0))}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-purple-400 font-bold tabular-nums">{formatPercent(conversionRate)}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-emerald-400 font-bold tabular-nums">{formatCurrency(totalRevenue)}</span>
                  </td>
                  <td className="py-3 px-6"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Closer Summary Table ──────────────────────────────────────────── */}
        {closerPerformance.length > 0 && (
          <div className="bg-[#1a1a1e] rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  Tabela de Closers
                </h3>
                <p className="text-[11px] text-white/30 mt-0.5">Detalhamento completo de performance individual</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left py-3 px-6 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Rank</th>
                    <th className="text-left py-3 px-4 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Closer</th>
                    <th className="text-left py-3 px-4 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Tipo</th>
                    <th className="text-right py-3 px-4 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Leads</th>
                    <th className="text-right py-3 px-4 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Vendas</th>
                    <th className="text-right py-3 px-4 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Conversão</th>
                    <th className="text-right py-3 px-4 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Faturamento</th>
                    <th className="text-right py-3 px-4 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Meta</th>
                    <th className="text-right py-3 px-6 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Progresso</th>
                  </tr>
                </thead>
                <tbody>
                  {closerPerformance.map((closer, idx) => {
                    const rank = idx + 1
                    const metaProgress = closer.meta_mensal && closer.meta_mensal > 0
                      ? (closer.revenue / closer.meta_mensal) * 100
                      : null

                    return (
                      <tr
                        key={closer.id}
                        className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3 px-6">
                          <div className="flex items-center justify-center w-8 h-8">
                            {getRankIcon(rank)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-white/80">{closer.name}</span>
                        </td>
                        <td className="py-3 px-4">
                          {closer.tipo ? (
                            <span className="text-[10px] font-medium text-white/30 bg-white/[0.04] px-2 py-0.5 rounded uppercase tracking-wider">
                              {closer.tipo}
                            </span>
                          ) : (
                            <span className="text-white/15">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-blue-400 tabular-nums">{closer.leads_assigned}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-400 tabular-nums">{closer.leads_won}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-purple-400 font-medium tabular-nums">{formatPercent(closer.conversion_rate)}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400 tabular-nums">{formatCurrency(closer.revenue)}</td>
                        <td className="py-3 px-4 text-right text-white/30 tabular-nums">
                          {closer.meta_mensal ? formatCurrency(closer.meta_mensal) : '-'}
                        </td>
                        <td className="py-3 px-6 text-right">
                          {metaProgress !== null ? (
                            <div className="flex items-center gap-2 justify-end">
                              <div className="w-16 bg-white/[0.04] rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    metaProgress >= 100 ? 'bg-emerald-500' : metaProgress >= 70 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(metaProgress, 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-semibold tabular-nums ${
                                metaProgress >= 100 ? 'text-emerald-400' : metaProgress >= 70 ? 'text-amber-400' : 'text-red-400'
                              }`}>
                                {metaProgress.toFixed(0)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-white/15">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/[0.06] bg-white/[0.02]">
                    <td className="py-3 px-6"></td>
                    <td className="py-3 px-4 text-sm font-bold text-white">TOTAL</td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4 text-right font-bold text-blue-400 tabular-nums">
                      {closerPerformance.reduce((s, c) => s + c.leads_assigned, 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400 tabular-nums">
                      {closerPerformance.reduce((s, c) => s + c.leads_won, 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-purple-400 tabular-nums">
                      {(() => {
                        const totalAssigned = closerPerformance.reduce((s, c) => s + c.leads_assigned, 0)
                        const totalWon = closerPerformance.reduce((s, c) => s + c.leads_won, 0)
                        return totalAssigned > 0 ? formatPercent((totalWon / totalAssigned) * 100) : '0%'
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400 tabular-nums">
                      {formatCurrency(closerPerformance.reduce((s, c) => s + c.revenue, 0))}
                    </td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-6"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between py-4">
          <p className="text-[11px] text-white/15">
            Última atualização: {new Date().toLocaleString('pt-BR')}
          </p>
          <p className="text-[11px] text-white/15">
            CS System &middot; Lead Distribution Analytics
          </p>
        </div>
      </div>
    </div>
  )
}
