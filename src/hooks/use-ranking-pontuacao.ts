'use client'

import { useState, useEffect, useCallback } from 'react'

interface RankingMentorado {
  mentorado_id: string
  nome_completo: string
  pontuacao_total: number
  total_indicacoes: number
  genero: string
  especialidade?: string
  posicao?: number
}

interface RankingStats {
  total_mentorados: number
  total_masculino: number
  total_feminino: number
  total_pontos: number
}

interface RankingData {
  geral: RankingMentorado[]
  masculino: RankingMentorado[]
  feminino: RankingMentorado[]
}

interface RankingState {
  ranking: RankingData
  stats: RankingStats
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

// Cache com TTL de 2 minutos (dados dinâmicos de ranking)
const CACHE_TTL = 2 * 60 * 1000
let rankingCache: { data: RankingState; timestamp: number } | null = null

export function useRankingPontuacao(refreshInterval = 60000) {
  const [state, setState] = useState<RankingState>({
    ranking: {
      geral: [],
      masculino: [],
      feminino: []
    },
    stats: {
      total_mentorados: 0,
      total_masculino: 0,
      total_feminino: 0,
      total_pontos: 0
    },
    loading: true,
    error: null,
    lastUpdated: null
  })

  const loadRankingData = useCallback(async () => {
    // Check cache first
    if (rankingCache && Date.now() - rankingCache.timestamp < CACHE_TTL) {
      console.log('🏆 Using cached ranking data')
      setState(rankingCache.data)
      return
    }

    console.log('🏆 Loading fresh ranking data...')
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch('/api/ranking', {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        const newState: RankingState = {
          ranking: {
            geral: result.ranking.geral || [],
            masculino: result.ranking.masculino || [],
            feminino: result.ranking.feminino || []
          },
          stats: result.stats || {
            total_mentorados: 0,
            total_masculino: 0,
            total_feminino: 0,
            total_pontos: 0
          },
          loading: false,
          error: null,
          lastUpdated: new Date()
        }

        setState(newState)

        // Update cache
        rankingCache = {
          data: newState,
          timestamp: Date.now()
        }

        console.log('✅ Ranking loaded:', {
          total: result.ranking.geral.length,
          masculino: result.ranking.masculino.length,
          feminino: result.ranking.feminino.length,
          total_pontos: result.stats.total_pontos
        })
      } else {
        throw new Error(result.error || 'Erro na API')
      }

    } catch (error) {
      console.error('❌ Error loading ranking:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar ranking'
      }))
    }
  }, [])

  // Auto-refresh para manter dados atualizados
  useEffect(() => {
    loadRankingData()

    // Set up auto refresh if interval is provided
    if (refreshInterval > 0) {
      const interval = setInterval(loadRankingData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [loadRankingData, refreshInterval])

  const refetch = useCallback(() => {
    // Clear cache on manual refresh
    rankingCache = null
    loadRankingData()
  }, [loadRankingData])

  // Utility functions for ranking analysis
  const getTopPerformers = useCallback((count = 3) => ({
    masculino: state.ranking.masculino.slice(0, count),
    feminino: state.ranking.feminino.slice(0, count),
    geral: state.ranking.geral.slice(0, count)
  }), [state.ranking])

  const findMentoradoPosition = useCallback((mentoradoId: string, genero?: string) => {
    if (genero === 'masculino') {
      return state.ranking.masculino.findIndex(r => r.mentorado_id === mentoradoId) + 1
    } else if (genero === 'feminino') {
      return state.ranking.feminino.findIndex(r => r.mentorado_id === mentoradoId) + 1
    }
    return state.ranking.geral.findIndex(r => r.mentorado_id === mentoradoId) + 1
  }, [state.ranking])

  const getAverageScore = useCallback((genero?: string) => {
    let ranking: RankingMentorado[]

    if (genero === 'masculino') {
      ranking = state.ranking.masculino
    } else if (genero === 'feminino') {
      ranking = state.ranking.feminino
    } else {
      ranking = state.ranking.geral
    }

    if (ranking.length === 0) return 0

    const totalScore = ranking.reduce((sum, r) => sum + r.pontuacao_total, 0)
    return Math.round((totalScore / ranking.length) * 10) / 10
  }, [state.ranking])

  return {
    ...state,
    refetch,
    getTopPerformers,
    findMentoradoPosition,
    getAverageScore,
    isStale: rankingCache ? Date.now() - rankingCache.timestamp > CACHE_TTL / 2 : true
  }
}