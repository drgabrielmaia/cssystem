'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

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
      // Query mentorados directly via ApiQueryBuilder (client-side)
      const { data: mentorados, error } = await supabase
        .from('mentorados')
        .select('id, nome_completo, genero, especialidade, pontuacao_total')
        .gt('pontuacao_total', 0)
        .order('pontuacao_total', { ascending: false })
        .limit(50)

      if (error) throw error

      // Build ranking from mentorados
      const ranking = (mentorados || []).map((m: any, index: number) => ({
        mentorado_id: m.id,
        nome_completo: m.nome_completo,
        pontuacao_total: m.pontuacao_total || 0,
        total_indicacoes: 0,
        genero: m.genero || 'nao_informado',
        especialidade: m.especialidade,
        posicao: index + 1
      }))

      // Separate by gender
      const rankingMasculino = ranking
        .filter((r: any) => r.genero === 'masculino')
        .map((r: any, index: number) => ({ ...r, posicao: index + 1 }))
      const rankingFeminino = ranking
        .filter((r: any) => r.genero === 'feminino')
        .map((r: any, index: number) => ({ ...r, posicao: index + 1 }))

      const newState: RankingState = {
        ranking: {
          geral: ranking,
          masculino: rankingMasculino,
          feminino: rankingFeminino
        },
        stats: {
          total_mentorados: ranking.length,
          total_masculino: rankingMasculino.length,
          total_feminino: rankingFeminino.length,
          total_pontos: ranking.reduce((sum: number, r: any) => sum + r.pontuacao_total, 0)
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
        total: ranking.length,
        masculino: rankingMasculino.length,
        feminino: rankingFeminino.length
      })

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