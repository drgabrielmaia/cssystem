'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

export type DateFilter = 'today' | 'week' | 'month' | 'quarter' | 'semester' | 'year' | 'custom'

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

export interface EvolutionDataPoint {
  label: string
  faturamento: number
  arrecadado: number
  taxa_conversao: number
  taxa_churn: number
  volume_calls: number
}

interface DashboardMetrics {
  sales: SalesMetrics
  calls: CallsMetrics
}

interface DashboardState {
  metrics: DashboardMetrics | null
  evolution: EvolutionDataPoint[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

// Cache com TTL de 5 minutos
const CACHE_TTL = 5 * 60 * 1000
const metricsCache: Record<string, { data: DashboardMetrics; evolution: EvolutionDataPoint[]; timestamp: number }> = {}

function getDateRange(filter: DateFilter, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date()
  let start: Date
  let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  switch (filter) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      break
    case 'week': {
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday as start
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff, 0, 0, 0, 0)
      break
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      break
    case 'quarter': {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3
      start = new Date(now.getFullYear(), quarterMonth, 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), quarterMonth + 3, 0, 23, 59, 59, 999)
      break
    }
    case 'semester': {
      const semesterMonth = now.getMonth() < 6 ? 0 : 6
      start = new Date(now.getFullYear(), semesterMonth, 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), semesterMonth + 6, 0, 23, 59, 59, 999)
      break
    }
    case 'year':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      break
    case 'custom':
      start = customStart ? new Date(customStart.getFullYear(), customStart.getMonth(), customStart.getDate(), 0, 0, 0, 0) : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      end = customEnd ? new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 23, 59, 59, 999) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      break
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  }

  return { start, end }
}

function getEvolutionBuckets(filter: DateFilter, start: Date, end: Date): { bucketStart: Date; bucketEnd: Date; label: string }[] {
  const buckets: { bucketStart: Date; bucketEnd: Date; label: string }[] = []

  if (filter === 'today') {
    // For today, no evolution (single point)
    buckets.push({ bucketStart: start, bucketEnd: end, label: 'Hoje' })
    return buckets
  }

  if (filter === 'week') {
    // Daily buckets for the week
    const current = new Date(start)
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    while (current <= end && current <= new Date()) {
      const bucketEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 23, 59, 59, 999)
      buckets.push({
        bucketStart: new Date(current),
        bucketEnd,
        label: `${dayNames[current.getDay()]} ${current.getDate().toString().padStart(2, '0')}/${(current.getMonth() + 1).toString().padStart(2, '0')}`
      })
      current.setDate(current.getDate() + 1)
    }
    return buckets
  }

  if (filter === 'month' || filter === 'custom') {
    // Weekly buckets
    const current = new Date(start)
    let weekNum = 1
    while (current <= end && current <= new Date()) {
      const weekEnd = new Date(current)
      weekEnd.setDate(weekEnd.getDate() + 6)
      const actualEnd = weekEnd > end ? end : weekEnd
      buckets.push({
        bucketStart: new Date(current),
        bucketEnd: new Date(actualEnd.getFullYear(), actualEnd.getMonth(), actualEnd.getDate(), 23, 59, 59, 999),
        label: `Sem ${weekNum}`
      })
      current.setDate(current.getDate() + 7)
      weekNum++
    }
    return buckets
  }

  // For quarter, semester, year - monthly buckets
  const current = new Date(start.getFullYear(), start.getMonth(), 1)
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  while (current <= end && current <= new Date()) {
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999)
    const actualEnd = monthEnd > end ? end : monthEnd
    buckets.push({
      bucketStart: new Date(current),
      bucketEnd: actualEnd,
      label: `${monthNames[current.getMonth()]}/${current.getFullYear().toString().slice(-2)}`
    })
    current.setMonth(current.getMonth() + 1)
  }
  return buckets
}

export function useOptimizedDashboard(
  organizationId: string | null,
  isReady: boolean,
  dateFilter: DateFilter = 'month',
  customStartDate?: Date,
  customEndDate?: Date
) {
  const [state, setState] = useState<DashboardState>({
    metrics: null,
    evolution: [],
    loading: true,
    error: null,
    lastUpdated: null
  })

  // Memoize date calculations based on filter
  const dateRange = useMemo(() => {
    return getDateRange(dateFilter, customStartDate, customEndDate)
  }, [dateFilter, customStartDate, customEndDate])

  const cacheKey = useMemo(() => {
    return `${organizationId}_${dateFilter}_${dateRange.start.toISOString()}_${dateRange.end.toISOString()}`
  }, [organizationId, dateFilter, dateRange])

  const loadMetrics = useCallback(async (): Promise<{ metrics: DashboardMetrics; evolution: EvolutionDataPoint[] }> => {
    // Early exit if no organizationId
    if (!organizationId) {
      throw new Error('Organization ID is required to load metrics')
    }
    // Check cache first
    const cached = metricsCache[cacheKey]
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('📊 Using cached dashboard metrics')
      return { metrics: cached.data, evolution: cached.evolution }
    }

    console.log('📊 Loading fresh dashboard metrics...')
    const { start, end } = dateRange

    // Parallel data loading with optimized queries
    const [salesResult, callsResult, churnResult] = await Promise.allSettled([
      // Sales metrics - optimized single query WITH ORGANIZATION FILTER
      supabase
        .from('leads')
        .select('id, valor_vendido, valor_arrecadado, data_primeiro_contato, data_venda, status')
        .eq('organization_id', organizationId)
        .or(`data_primeiro_contato.gte.${start.toISOString()},and(status.eq.vendido,data_venda.gte.${start.toISOString()})`),

      // Calls metrics - buscar diretamente dos leads excluindo churns e excluídos
      supabase
        .from('leads')
        .select(`
          id, status, call_details, call_history, valor_vendido, valor_arrecadado, data_venda, data_primeiro_contato,
          mentorados!inner(is_churned, excluido)
        `)
        .eq('organization_id', organizationId)
        .gte('data_primeiro_contato', start.toISOString())
        .lte('data_primeiro_contato', end.toISOString())
        .eq('mentorados.is_churned', false)
        .eq('mentorados.excluido', false),

      // Churn data for evolution chart
      supabase
        .from('mentorados')
        .select('id, is_churned, data_churn, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
    ])

    // Process sales data
    const salesMetrics: SalesMetrics = {
      valor_vendido: 0,
      valor_arrecadado: 0,
      taxa_conversao: 0,
      total_leads: 0,
      total_vendas: 0
    }

    let allSalesData: any[] = []

    if (salesResult.status === 'fulfilled' && salesResult.value.data) {
      const data = salesResult.value.data
      allSalesData = data

      // Filter leads by date range for lead count
      const rangeLeads = data.filter(lead => {
        if (!lead.data_primeiro_contato) return false
        const contactDate = new Date(lead.data_primeiro_contato)
        return contactDate >= start && contactDate <= end
      })

      // Filter sales by date range for sales metrics
      const rangeSales = data.filter(lead => {
        if (lead.status !== 'vendido' || !lead.data_venda) return false
        const saleDate = new Date(lead.data_venda)
        return saleDate >= start && saleDate <= end
      })

      salesMetrics.total_leads = rangeLeads.length
      salesMetrics.total_vendas = rangeSales.length
      salesMetrics.valor_vendido = rangeSales.reduce((sum, sale) => sum + (parseFloat(sale.valor_vendido) || 0), 0)
      salesMetrics.valor_arrecadado = rangeSales.reduce((sum, sale) => sum + (parseFloat(sale.valor_arrecadado) || 0), 0)
      salesMetrics.taxa_conversao = rangeLeads.length > 0 ? (rangeSales.length / rangeLeads.length) * 100 : 0
    }

    // Process calls data
    const callsMetrics: CallsMetrics = {
      total_calls: 0,
      calls_vendidas: 0,
      calls_nao_vendidas: 0,
      no_shows: 0,
      total_vendas_calls: 0,
      taxa_conversao_calls: 0
    }

    let allCallsData: any[] = []

    if (callsResult.status === 'fulfilled' && callsResult.value.data) {
      const callsData = callsResult.value.data
      allCallsData = callsData

      // Filtrar calls (leads que tem call_details ou call_history)
      const callLeads = callsData.filter((lead: any) =>
        lead.call_details !== null || lead.call_history !== null
      )

      // Calls vendidas (leads vendidos que vieram de calls)
      const callsVendidas = callLeads.filter((lead: any) => lead.status === 'vendido')

      // Calls não vendidas (leads de calls que não foram vendidos)
      const callsNaoVendidas = callLeads.filter((lead: any) =>
        lead.status !== 'vendido' && lead.status !== 'novo' && lead.status !== 'qualificado'
      )

      callsMetrics.total_calls = callLeads.length
      callsMetrics.calls_vendidas = callsVendidas.length
      callsMetrics.calls_nao_vendidas = callsNaoVendidas.length
      callsMetrics.no_shows = 0
      callsMetrics.total_vendas_calls = callsVendidas.reduce((sum: number, lead: any) =>
        sum + (parseFloat(lead.valor_vendido) || 0), 0
      )
      callsMetrics.taxa_conversao_calls = callLeads.length > 0 ?
        (callsVendidas.length / callLeads.length) * 100 : 0
    }

    // Build evolution data
    const buckets = getEvolutionBuckets(dateFilter, start, end)
    const churnData = churnResult.status === 'fulfilled' && churnResult.value.data ? churnResult.value.data : []

    const evolution: EvolutionDataPoint[] = buckets.map(bucket => {
      // Sales in this bucket
      const bucketSales = allSalesData.filter(lead => {
        if (lead.status !== 'vendido' || !lead.data_venda) return false
        const saleDate = new Date(lead.data_venda)
        return saleDate >= bucket.bucketStart && saleDate <= bucket.bucketEnd
      })

      const bucketLeads = allSalesData.filter(lead => {
        if (!lead.data_primeiro_contato) return false
        const contactDate = new Date(lead.data_primeiro_contato)
        return contactDate >= bucket.bucketStart && contactDate <= bucket.bucketEnd
      })

      // Calls in this bucket
      const bucketCalls = allCallsData.filter((lead: any) => {
        if (!lead.data_primeiro_contato) return false
        const contactDate = new Date(lead.data_primeiro_contato)
        return contactDate >= bucket.bucketStart && contactDate <= bucket.bucketEnd && (lead.call_details !== null || lead.call_history !== null)
      })

      // Churn in this bucket
      const bucketMentorados = churnData.filter((m: any) => {
        const createdDate = new Date(m.created_at)
        return createdDate >= bucket.bucketStart && createdDate <= bucket.bucketEnd
      })
      const bucketChurned = bucketMentorados.filter((m: any) => m.is_churned)

      const faturamento = bucketSales.reduce((sum: number, s: any) => sum + (parseFloat(s.valor_vendido) || 0), 0)
      const arrecadado = bucketSales.reduce((sum: number, s: any) => sum + (parseFloat(s.valor_arrecadado) || 0), 0)
      const taxaConversao = bucketLeads.length > 0 ? (bucketSales.length / bucketLeads.length) * 100 : 0
      const taxaChurn = bucketMentorados.length > 0 ? (bucketChurned.length / bucketMentorados.length) * 100 : 0

      return {
        label: bucket.label,
        faturamento,
        arrecadado,
        taxa_conversao: Math.round(taxaConversao * 10) / 10,
        taxa_churn: Math.round(taxaChurn * 10) / 10,
        volume_calls: bucketCalls.length
      }
    })

    const metrics = { sales: salesMetrics, calls: callsMetrics }

    // Update cache
    metricsCache[cacheKey] = { data: metrics, evolution, timestamp: Date.now() }

    return { metrics, evolution }
  }, [dateRange, organizationId, cacheKey, dateFilter])

  const refetch = useCallback(async () => {
    if (!isReady || !organizationId) return

    // Invalidate cache for this key
    delete metricsCache[cacheKey]

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { metrics, evolution } = await loadMetrics()
      setState({
        metrics,
        evolution,
        loading: false,
        error: null,
        lastUpdated: new Date()
      })
    } catch (error) {
      console.error('❌ Error loading dashboard metrics:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar métricas do dashboard'
      }))
    }
  }, [isReady, organizationId, loadMetrics, cacheKey])

  useEffect(() => {
    if (!isReady || !organizationId) return

    setState(prev => ({ ...prev, loading: true, error: null }))

    loadMetrics().then(({ metrics, evolution }) => {
      setState({
        metrics,
        evolution,
        loading: false,
        error: null,
        lastUpdated: new Date()
      })
    }).catch(error => {
      console.error('❌ Error loading dashboard metrics:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar métricas do dashboard'
      }))
    })
  }, [isReady, organizationId, loadMetrics])

  const cached = metricsCache[cacheKey]

  return {
    ...state,
    refetch,
    isStale: cached ? Date.now() - cached.timestamp > CACHE_TTL / 2 : true
  }
}
