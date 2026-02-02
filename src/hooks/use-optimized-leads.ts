'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

interface Lead {
  id: string
  nome_completo: string
  email: string | null
  telefone: string | null
  empresa: string | null
  cargo: string | null
  origem: string | null
  status: string
  temperatura?: string | null
  observacoes: string | null
  valor_vendido: number | null
  valor_arrecadado: number | null
  data_primeiro_contato: string
  data_venda: string | null
  created_at: string
  updated_at: string
  mentorado_indicador_id?: string | null
  fonte_referencia?: string | null
}

interface LeadStats {
  total_leads: number
  leads_convertidos: number
  valor_total_vendas: number
  valor_total_arrecadado: number
  taxa_conversao: number
  ticket_medio: number
}

interface LeadsFilters {
  search: string
  status: string
  origem: string
  dateFilter: string
  customStartDate: string
  customEndDate: string
}

interface PaginatedResponse {
  data: Lead[]
  total: number
  hasMore: boolean
  page: number
  pageSize: number
}

interface LeadsState {
  leads: Lead[]
  stats: LeadStats
  origemData: Array<{name: string, value: number, color: string, valorPago: number, taxaConversao: number}>
  conversionData: Array<{month: string, leads: number, vendas: number, taxa: number}>
  pagination: PaginatedResponse
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

// Cache com TTL de 3 minutos para leads (dados mais dinâmicos)
const CACHE_TTL = 3 * 60 * 1000
let leadsCache: { data: Partial<LeadsState>; timestamp: number; filters: string } | null = null

const origemColors = {
  'Instagram': '#F59E0B',
  'WhatsApp': '#059669',
  'Indicação': '#3B82F6',
  'Site': '#EF4444',
  'LinkedIn': '#8B5CF6',
  'Facebook': '#1877F2',
  'Google': '#EA4335',
  'TikTok': '#FF0050',
  'YouTube': '#FF0000',
  'Tráfego': '#6366F1',
  'Social Seller': '#EC4899',
  'Eventos Próprios': '#8B5CF6',
  'Parcerias': '#10B981',
  'Sessão Fechada': '#F59E0B',
  'instagram': '#F59E0B',
  'whatsapp': '#059669',
  'indicacao': '#3B82F6',
  'site': '#EF4444',
  'linkedin': '#8B5CF6',
  'facebook': '#1877F2',
  'google': '#EA4335',
  'tiktok': '#FF0050',
  'youtube': '#FF0000',
  'trafego': '#6366F1',
  'social-seller': '#EC4899',
  'eventos-proprios': '#8B5CF6',
  'parcerias': '#10B981',
  'sessao-fechada': '#F59E0B',
  'Outros': '#94A3B8'
}

export function useOptimizedLeads(filters: LeadsFilters, pageSize = 25) {
  const [state, setState] = useState<LeadsState>({
    leads: [],
    stats: {
      total_leads: 0,
      leads_convertidos: 0,
      valor_total_vendas: 0,
      valor_total_arrecadado: 0,
      taxa_conversao: 0,
      ticket_medio: 0
    },
    origemData: [],
    conversionData: [],
    pagination: {
      data: [],
      total: 0,
      hasMore: false,
      page: 1,
      pageSize,

    },
    loading: true,
    error: null,
    lastUpdated: null
  })

  // Generate cache key from filters
  const cacheKey = useMemo(() =>
    JSON.stringify({ ...filters, pageSize }),
    [filters, pageSize]
  )

  // Memoize date range calculation
  const getDateRange = useCallback((filter: string, startDate?: string, endDate?: string) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    switch (filter) {
      case 'mes_atual':
        return {
          start: new Date(year, month, 1).toISOString(),
          end: new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString()
        }
      case 'ano_atual':
        return {
          start: new Date(year, 0, 1).toISOString(),
          end: new Date(year, 11, 31, 23, 59, 59, 999).toISOString()
        }
      case 'semana_atual':
        const currentDay = now.getDay()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - currentDay)
        startOfWeek.setHours(0, 0, 0, 0)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)
        return {
          start: startOfWeek.toISOString(),
          end: endOfWeek.toISOString()
        }
      case 'personalizado':
        if (startDate && endDate) {
          return {
            start: new Date(startDate).toISOString(),
            end: new Date(endDate + 'T23:59:59').toISOString()
          }
        }
        return null
      case 'todos':
      default:
        return null
    }
  }, [])

  const loadLeadsData = useCallback(async (page = 1, reset = false): Promise<Partial<LeadsState>> => {
    // Check cache for first page
    if (page === 1 && leadsCache && Date.now() - leadsCache.timestamp < CACHE_TTL && leadsCache.filters === cacheKey) {
      console.log('📊 Using cached leads data')
      return leadsCache.data
    }

    console.log('📊 Loading fresh leads data...')
    const dateRange = getDateRange(filters.dateFilter, filters.customStartDate, filters.customEndDate)

    // Optimized parallel queries
    const [leadsResult, statsResult, origemResult, conversionResult] = await Promise.allSettled([
      // Paginated leads query
      (() => {
        let query = supabase
          .from('leads')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1)

        // Apply filters
        if (filters.status !== 'todos') {
          query = query.eq('status', filters.status)
        }
        if (filters.origem !== 'todas') {
          query = query.eq('origem', filters.origem)
        }
        if (dateRange) {
          if (filters.status === 'vendido') {
            query = query
              .gte('data_venda', dateRange.start)
              .lte('data_venda', dateRange.end)
          } else {
            query = query.or(`and(status.eq.vendido,data_venda.gte.${dateRange.start},data_venda.lte.${dateRange.end}),and(status.neq.vendido,data_primeiro_contato.gte.${dateRange.start},data_primeiro_contato.lte.${dateRange.end})`)
          }
        }

        return query
      })(),

      // Stats query
      (() => {
        const queries = []

        // Total leads query
        let totalQuery = supabase.from('leads').select('id', { count: 'exact', head: true })
        if (filters.status !== 'todos') totalQuery = totalQuery.eq('status', filters.status)
        if (filters.origem !== 'todas') totalQuery = totalQuery.eq('origem', filters.origem)
        if (dateRange) {
          totalQuery = totalQuery.or(`and(status.eq.vendido,data_venda.gte.${dateRange.start},data_venda.lte.${dateRange.end}),and(status.neq.vendido,data_primeiro_contato.gte.${dateRange.start},data_primeiro_contato.lte.${dateRange.end})`)
        }
        queries.push(totalQuery)

        // Sales query
        let salesQuery = supabase
          .from('leads')
          .select('valor_vendido, valor_arrecadado')
          .eq('status', 'vendido')
          .not('valor_arrecadado', 'is', null)
          .gt('valor_arrecadado', 0)

        if (filters.origem !== 'todas') salesQuery = salesQuery.eq('origem', filters.origem)
        if (dateRange) {
          salesQuery = salesQuery
            .gte('data_venda', dateRange.start)
            .lte('data_venda', dateRange.end)
        }
        queries.push(salesQuery)

        return Promise.all(queries)
      })(),

      // Origem stats (simplified)
      supabase
        .from('leads')
        .select('origem, status, valor_arrecadado'),

      // Conversion data (last 6 months)
      (() => {
        const months = []
        const currentDate = new Date()

        const promises = []
        for (let i = 5; i >= 0; i--) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
          const startDate = new Date(date.getFullYear(), date.getMonth(), 1)
          const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)

          const monthPromises = Promise.all([
            supabase
              .from('leads')
              .select('id', { count: 'exact', head: true })
              .gte('data_primeiro_contato', startDate.toISOString())
              .lte('data_primeiro_contato', endDate.toISOString()),

            supabase
              .from('leads')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'vendido')
              .not('valor_arrecadado', 'is', null)
              .gt('valor_arrecadado', 0)
              .gte('data_venda', startDate.toISOString())
              .lte('data_venda', endDate.toISOString())
          ]).then(([leadsRes, salesRes]) => ({
            month: date.toLocaleDateString('pt-BR', { month: 'short' }).slice(0, 3),
            leads: leadsRes.count || 0,
            vendas: salesRes.count || 0,
            taxa: (leadsRes.count || 0) > 0 ? ((salesRes.count || 0) / (leadsRes.count || 0)) * 100 : 0
          }))

          promises.push(monthPromises)
        }

        return Promise.all(promises)
      })()
    ])

    // Process results
    const newState: Partial<LeadsState> = {
      loading: false,
      error: null,
      lastUpdated: new Date()
    }

    // Process leads
    if (leadsResult.status === 'fulfilled' && leadsResult.value.data) {
      const { data, count } = leadsResult.value
      newState.leads = data
      newState.pagination = {
        data,
        total: count || 0,
        hasMore: (page * pageSize) < (count || 0),
        page,
        pageSize
      }
    }

    // Process stats
    if (statsResult.status === 'fulfilled') {
      const [totalResult, salesResult] = statsResult.value
      const totalLeads = totalResult.count || 0
      const salesData = salesResult.data || []

      const totalVendas = salesData.reduce((sum, sale) => sum + ((sale as any).valor_vendido || 0), 0)
      const totalArrecadado = salesData.reduce((sum, sale) => sum + ((sale as any).valor_arrecadado || 0), 0)
      const taxaConversao = totalLeads > 0 ? (salesData.length / totalLeads) * 100 : 0
      const ticketMedio = salesData.length > 0 ? totalArrecadado / salesData.length : 0

      newState.stats = {
        total_leads: totalLeads,
        leads_convertidos: salesData.length,
        valor_total_vendas: totalVendas,
        valor_total_arrecadado: totalArrecadado,
        taxa_conversao: Math.round(taxaConversao * 100) / 100,
        ticket_medio: Math.round(ticketMedio * 100) / 100
      }
    }

    // Process origem data
    if (origemResult.status === 'fulfilled' && origemResult.value.data) {
      const leads = origemResult.value.data
      const origemStats = leads.reduce((acc, lead) => {
        const origem = lead.origem || 'Outros'
        if (!acc[origem]) {
          acc[origem] = { total: 0, convertidos: 0, valorPago: 0 }
        }
        acc[origem].total += 1
        if (lead.status === 'vendido') {
          acc[origem].convertidos += 1
          acc[origem].valorPago += (lead as any).valor_arrecadado || 0
        }
        return acc
      }, {} as Record<string, {total: number, convertidos: number, valorPago: number}>)

      newState.origemData = Object.entries(origemStats)
        .map(([name, stats]) => ({
          name,
          value: stats.total,
          valorPago: stats.valorPago,
          taxaConversao: stats.total > 0 ? (stats.convertidos / stats.total) * 100 : 0,
          color: origemColors[name as keyof typeof origemColors] || '#94A3B8'
        }))
        .sort((a, b) => b.value - a.value)
    }

    // Process conversion data
    if (conversionResult.status === 'fulfilled') {
      newState.conversionData = conversionResult.value.map(data => ({
        ...data,
        taxa: Math.round(data.taxa * 100) / 100
      }))
    }

    // Cache first page results
    if (page === 1) {
      leadsCache = {
        data: newState,
        timestamp: Date.now(),
        filters: cacheKey
      }
    }

    return newState
  }, [filters, pageSize, cacheKey, getDateRange])

  const loadData = useCallback(async (page = 1, reset = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const newData = await loadLeadsData(page, reset)

      setState(prev => ({
        ...prev,
        ...newData,
        leads: reset || page === 1 ? (newData.leads || []) : [...prev.leads, ...(newData.leads || [])]
      }))
    } catch (error) {
      console.error('❌ Error loading leads:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar leads'
      }))
    }
  }, [loadLeadsData])

  const loadMore = useCallback(() => {
    if (!state.loading && state.pagination.hasMore) {
      loadData(state.pagination.page + 1, false)
    }
  }, [state.loading, state.pagination.hasMore, state.pagination.page, loadData])

  const refetch = useCallback(() => {
    // Clear cache on manual refresh
    leadsCache = null
    loadData(1, true)
  }, [loadData])

  const searchLeads = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return state.leads

    return state.leads.filter(lead =>
      lead.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.telefone?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [state.leads])

  useEffect(() => {
    loadData(1, true)
  }, [cacheKey])

  return {
    ...state,
    loadMore,
    refetch,
    searchLeads,
    isStale: leadsCache ? Date.now() - leadsCache.timestamp > CACHE_TTL / 2 : true
  }
}