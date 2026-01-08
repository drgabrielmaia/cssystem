'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Mentorado } from '@/types'

export function useMentorados(turma?: string) {  // Parâmetro turma mantido para compatibilidade
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMentorados = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('mentorados')
        .select('*')
        .order('created_at', { ascending: false })

      // Campo turma não existe na tabela
      // if (turma) {
      //   query = query.eq('turma', turma)
      // }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setMentorados(data || [])
    } catch (err) {
      console.error('Erro ao buscar mentorados:', err)
      setError('Erro ao carregar mentorados. Verifique se o Supabase está configurado.')
    } finally {
      setLoading(false)
    }
  }

  const adicionarMentorado = async (dadosMentorado: Omit<Mentorado, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('mentorados')
        .insert([dadosMentorado])
        .select()
        .single()

      if (error) throw error

      setMentorados(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Erro ao adicionar mentorado:', err)
      throw err
    }
  }

  const atualizarMentorado = async (id: string, dadosAtualizados: Partial<Mentorado>) => {
    try {
      const { data, error } = await supabase
        .from('mentorados')
        .update(dadosAtualizados)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setMentorados(prev => 
        prev.map(m => m.id === id ? { ...m, ...dadosAtualizados } : m)
      )
      return data
    } catch (err) {
      console.error('Erro ao atualizar mentorado:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchMentorados()
  }, [turma])

  return {
    mentorados,
    loading,
    error,
    adicionarMentorado,
    atualizarMentorado,
    refetch: fetchMentorados
  }
}