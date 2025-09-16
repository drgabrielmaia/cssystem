'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { TurmaStats } from '@/types'

export function useTurmas() {
  const [turmas, setTurmas] = useState<TurmaStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTurmas = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: mentorados, error: mentoradosError } = await supabase
        .from('mentorados')
        .select('turma, estado_atual, created_at')

      if (mentoradosError) throw mentoradosError

      const { data: formularios, error: formulariosError } = await supabase
        .from('formularios_respostas')
        .select('data_envio, mentorados!inner(turma)')
        .order('data_envio', { ascending: false })

      if (formulariosError) throw formulariosError

      const turmasMap = new Map<string, TurmaStats>()

      mentorados?.forEach(mentorado => {
        const turma = mentorado.turma
        if (!turmasMap.has(turma)) {
          turmasMap.set(turma, {
            turma,
            total_mentorados: 0,
            ativos: 0,
            inativos: 0,
            ultima_atividade: 'Sem atividade'
          })
        }

        const stats = turmasMap.get(turma)!
        stats.total_mentorados++
        
        if (mentorado.estado_atual === 'ativo') {
          stats.ativos++
        } else {
          stats.inativos++
        }
      })

      formularios?.forEach(formulario => {
        const turma = (formulario.mentorados as any).turma
        const stats = turmasMap.get(turma)
        if (stats && (!stats.ultima_atividade || stats.ultima_atividade === 'Sem atividade')) {
          const date = new Date(formulario.data_envio)
          stats.ultima_atividade = date.toLocaleDateString('pt-BR')
        }
      })

      setTurmas(Array.from(turmasMap.values()))
    } catch (err) {
      console.error('Erro ao buscar turmas:', err)
      setError('Erro ao carregar turmas. Verifique se o Supabase está configurado.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTurmas()
  }, [])

  return {
    turmas,
    loading,
    error,
    refetch: fetchTurmas
  }
}