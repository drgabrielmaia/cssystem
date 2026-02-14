'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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

interface DashboardMetrics {
  sales: SalesMetrics
  calls: CallsMetrics
}

interface DashboardState {
  metrics: DashboardMetrics | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

// Cache com TTL de 5 minutos
const CACHE_TTL = 5 * 60 * 1000
let metricsCache: { data: DashboardMetrics; timestamp: number } | null = null

export function useOptimizedDashboard(organizationId: string | null, isReady: boolean) {
  const [state, setState] = useState<DashboardState>({
    metrics: null,
    loading: true,
    error: null,
    lastUpdated: null
  })

  // Memoize date calculations
  const dateRange = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    return { startOfMonth, endOfMonth }
  }, [])

  const loadMetrics = useCallback(async (): Promise<DashboardMetrics> => {
    // Early exit if no organizationId
    if (!organizationId) {
      throw new Error('Organization ID is required to load metrics')
    }
    // Check cache first
    if (metricsCache && Date.now() - metricsCache.timestamp < CACHE_TTL) {
      console.log('📊 Using cached dashboard metrics')
      return metricsCache.data
    }

    console.log('📊 Loading fresh dashboard metrics...')
    const { startOfMonth, endOfMonth } = dateRange

    // Parallel data loading with optimized queries
    const [salesResult, callsResult] = await Promise.allSettled([
      // Sales metrics - optimized single query WITH ORGANIZATION FILTER
      supabase
        .from('leads')
        .select('id, valor_vendido, valor_arrecadado, data_primeiro_contato, data_venda, status')
        .eq('organization_id', organizationId)
        .or(`data_primeiro_contato.gte.${startOfMonth.toISOString()},and(status.eq.vendido,data_venda.gte.${startOfMonth.toISOString()})`),

      // Calls metrics - single query to materialized view WITH ORGANIZATION FILTER
      supabase
        .from('social_seller_metrics')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('month_year', startOfMonth.toISOString())
        .single()
    ])

    // Process sales data
    const salesMetrics: SalesMetrics = {
      valor_vendido: 0,
      valor_arrecadado: 0,
      taxa_conversao: 0,
      total_leads: 0,
      total_vendas: 0
    }

    if (salesResult.status === 'fulfilled' && salesResult.value.data) {
      const data = salesResult.value.data

      // Filter leads by month for lead count
      const monthLeads = data.filter(lead => {
        if (!lead.data_primeiro_contato) return false
        const contactDate = new Date(lead.data_primeiro_contato)
        return contactDate >= startOfMonth && contactDate <= endOfMonth
      })

      // Filter sales by month for sales metrics
      const monthSales = data.filter(lead => {
        if (lead.status !== 'vendido' || !lead.data_venda) return false
        const saleDate = new Date(lead.data_venda)
        return saleDate >= startOfMonth && saleDate <= endOfMonth
      })

      salesMetrics.total_leads = monthLeads.length
      salesMetrics.total_vendas = monthSales.length
      salesMetrics.valor_vendido = monthSales.reduce((sum, sale) => sum + (parseFloat(sale.valor_vendido) || 0), 0)
      salesMetrics.valor_arrecadado = monthSales.reduce((sum, sale) => sum + (parseFloat(sale.valor_arrecadado) || 0), 0)
      salesMetrics.taxa_conversao = monthLeads.length > 0 ? (monthSales.length / monthLeads.length) * 100 : 0
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

    if (callsResult.status === 'fulfilled' && callsResult.value.data) {
      const data = callsResult.value.data
      callsMetrics.total_calls = data.total_calls || 0
      callsMetrics.calls_vendidas = data.calls_vendidas || 0
      callsMetrics.calls_nao_vendidas = data.calls_nao_vendidas || 0
      callsMetrics.no_shows = data.no_shows || 0
      callsMetrics.total_vendas_calls = data.total_vendas || 0
      callsMetrics.taxa_conversao_calls = data.taxa_conversao || 0
    }

    const metrics = { sales: salesMetrics, calls: callsMetrics }

    // Update cache
    metricsCache = { data: metrics, timestamp: Date.now() }

    return metrics
  }, [dateRange, organizationId])

  const refetch = useCallback(async () => {
    if (!isReady || !organizationId) return

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const metrics = await loadMetrics()
      setState({
        metrics,
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
  }, [isReady, organizationId, loadMetrics])

  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    ...state,
    refetch,
    isStale: metricsCache ? Date.now() - metricsCache.timestamp > CACHE_TTL / 2 : true
  }
}