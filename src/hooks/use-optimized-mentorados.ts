'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

interface Mentorado {
  id: string
  nome_completo: string
  email: string
  telefone?: string
  data_entrada: string
  estado_atual: string
  status_login?: string
  pontuacao?: number
  observacoes_privadas?: string
  created_at: string
  updated_at: string
  organization_id: string
}

interface MentoradoStats {
  total_mentorados: number
  ativos: number
  inativos: number
  novos_mes: number
  taxa_retencao: number
  pontuacao_media: number
}

interface MentoradosFilters {
  search: string
  status: string
  organizationId: string | null
}

interface PaginatedResponse {
  data: Mentorado[]
  total: number
  hasMore: boolean
  page: number
  pageSize: number
}

interface MentoradosState {
  mentorados: Mentorado[]
  stats: MentoradoStats
  pagination: PaginatedResponse
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

// Cache com TTL de 5 minutos para mentorados (dados relativamente estáveis)
const CACHE_TTL = 5 * 60 * 1000
let mentoradosCache: { data: Partial<MentoradosState>; timestamp: number; organizationId: string } | null = null

export function useOptimizedMentorados(organizationId: string | null, filters: MentoradosFilters, pageSize = 25) {
  const [state, setState] = useState<MentoradosState>({
    mentorados: [],
    stats: {
      total_mentorados: 0,
      ativos: 0,
      inativos: 0,
      novos_mes: 0,
      taxa_retencao: 0,
      pontuacao_media: 0
    },
    pagination: {
      data: [],
      total: 0,
      hasMore: false,
      page: 1,
      pageSize
    },
    loading: true,
    error: null,
    lastUpdated: null
  })

  // Generate cache key
  const cacheKey = useMemo(() =>
    `${organizationId}-${JSON.stringify(filters)}-${pageSize}`,
    [organizationId, filters, pageSize]
  )

  const loadMentoradosData = useCallback(async (page = 1, reset = false): Promise<Partial<MentoradosState>> => {
    if (!organizationId) {
      throw new Error('Organization ID is required')
    }

    // Check cache for first page
    if (page === 1 && mentoradosCache &&
        Date.now() - mentoradosCache.timestamp < CACHE_TTL &&
        mentoradosCache.organizationId === organizationId) {
      console.log('📊 Using cached mentorados data')
      return mentoradosCache.data
    }

    console.log('📊 Loading fresh mentorados data for organization:', organizationId)

    // Optimized parallel queries
    const [mentoradosResult, statsResult] = await Promise.allSettled([
      // Paginated mentorados query
      (() => {
        let query = supabase
          .from('mentorados')
          .select('*', { count: 'exact' })
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1)

        // Apply status filter
        if (filters.status !== 'todos') {
          query = query.eq('estado_atual', filters.status)
        }

        return query
      })(),

      // Stats query - get all mentorados for this organization for stats
      supabase
        .from('mentorados')
        .select('estado_atual, created_at, pontuacao')
        .eq('organization_id', organizationId)
    ])

    // Process results
    const newState: Partial<MentoradosState> = {
      loading: false,
      error: null,
      lastUpdated: new Date()
    }

    // Process mentorados
    if (mentoradosResult.status === 'fulfilled' && mentoradosResult.value.data) {
      const { data, count } = mentoradosResult.value
      newState.mentorados = data
      newState.pagination = {
        data,
        total: count || 0,
        hasMore: (page * pageSize) < (count || 0),
        page,
        pageSize
      }
    }

    // Process stats
    if (statsResult.status === 'fulfilled' && statsResult.value.data) {
      const allMentorados = statsResult.value.data
      const total = allMentorados.length
      const ativos = allMentorados.filter(m => m.estado_atual === 'ativo').length
      const inativos = total - ativos

      // Mentorados created this month
      const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
      const novos_mes = allMentorados.filter(m =>
        m.created_at?.startsWith(thisMonth)
      ).length

      // Retention rate (simplified)
      const taxa_retencao = total > 0 ? (ativos / total) * 100 : 0

      // Average score
      const mentoradosComPontuacao = allMentorados.filter(m => m.pontuacao != null)
      const pontuacao_media = mentoradosComPontuacao.length > 0
        ? mentoradosComPontuacao.reduce((sum, m) => sum + (m.pontuacao || 0), 0) / mentoradosComPontuacao.length
        : 0

      newState.stats = {
        total_mentorados: total,
        ativos,
        inativos,
        novos_mes,
        taxa_retencao: Math.round(taxa_retencao),
        pontuacao_media: Math.round(pontuacao_media * 10) / 10
      }
    }

    // Cache first page results
    if (page === 1) {
      mentoradosCache = {
        data: newState,
        timestamp: Date.now(),
        organizationId
      }
    }

    return newState
  }, [organizationId, filters, pageSize])

  const loadData = useCallback(async (page = 1, reset = false) => {
    if (!organizationId) {
      setState(prev => ({ ...prev, loading: false, error: 'Organization ID not available' }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const newData = await loadMentoradosData(page, reset)

      setState(prev => ({
        ...prev,
        ...newData,
        mentorados: reset || page === 1 ? (newData.mentorados || []) : [...prev.mentorados, ...(newData.mentorados || [])]
      }))
    } catch (error) {
      console.error('❌ Error loading mentorados:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar mentorados'
      }))
    }
  }, [organizationId, loadMentoradosData])

  const loadMore = useCallback(() => {
    if (!state.loading && state.pagination.hasMore) {
      loadData(state.pagination.page + 1, false)
    }
  }, [state.loading, state.pagination.hasMore, state.pagination.page, loadData])

  const refetch = useCallback(() => {
    // Clear cache on manual refresh
    mentoradosCache = null
    loadData(1, true)
  }, [loadData])

  const searchMentorados = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return state.mentorados

    return state.mentorados.filter(mentorado =>
      mentorado.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentorado.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentorado.telefone?.includes(searchTerm)
    )
  }, [state.mentorados])

  const updateMentorado = useCallback(async (id: string, updates: Partial<Mentorado>) => {
    try {
      const { error } = await supabase
        .from('mentorados')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      // Update local state
      setState(prev => ({
        ...prev,
        mentorados: prev.mentorados.map(m =>
          m.id === id ? { ...m, ...updates } : m
        )
      }))

      // Clear cache to force refresh on next load
      mentoradosCache = null

      return true
    } catch (error) {
      console.error('❌ Error updating mentorado:', error)
      return false
    }
  }, [])

  const deleteMentorado = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('mentorados')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Remove from local state
      setState(prev => ({
        ...prev,
        mentorados: prev.mentorados.filter(m => m.id !== id),
        pagination: {
          ...prev.pagination,
          total: prev.pagination.total - 1
        }
      }))

      // Clear cache to force refresh on next load
      mentoradosCache = null

      return true
    } catch (error) {
      console.error('❌ Error deleting mentorado:', error)
      return false
    }
  }, [])

  const addMentorado = useCallback(async (mentoradoData: Partial<Mentorado>) => {
    try {
      const { data, error } = await supabase
        .from('mentorados')
        .insert({ ...mentoradoData, organization_id: organizationId })
        .select()
        .single()

      if (error) throw error

      // Add to local state
      setState(prev => ({
        ...prev,
        mentorados: [data, ...prev.mentorados],
        pagination: {
          ...prev.pagination,
          total: prev.pagination.total + 1
        }
      }))

      // Clear cache to force refresh on next load
      mentoradosCache = null

      return data
    } catch (error) {
      console.error('❌ Error adding mentorado:', error)
      return null
    }
  }, [organizationId])

  useEffect(() => {
    if (organizationId) {
      loadData(1, true)
    }
  }, [cacheKey, organizationId])

  return {
    ...state,
    loadMore,
    refetch,
    searchMentorados,
    updateMentorado,
    deleteMentorado,
    addMentorado,
    isStale: mentoradosCache ? Date.now() - mentoradosCache.timestamp > CACHE_TTL / 2 : true
  }
}