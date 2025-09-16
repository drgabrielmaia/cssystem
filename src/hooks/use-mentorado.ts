'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Mentorado, FormularioResposta } from '@/types'

export function useMentorado(id: string) {
  const [mentorado, setMentorado] = useState<Mentorado | null>(null)
  const [formularios, setFormularios] = useState<FormularioResposta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMentorado = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: mentoradoData, error: mentoradoError } = await supabase
        .from('mentorados')
        .select('*')
        .eq('id', id)
        .single()

      if (mentoradoError) throw mentoradoError

      const { data: formulariosData, error: formulariosError } = await supabase
        .from('formularios_respostas')
        .select('*')
        .eq('mentorado_id', id)
        .order('data_envio', { ascending: false })

      if (formulariosError) throw formulariosError

      setMentorado(mentoradoData)
      setFormularios(formulariosData || [])
    } catch (err) {
      console.error('Erro ao buscar mentorado:', err)
      setError('Erro ao carregar dados do mentorado.')
    } finally {
      setLoading(false)
    }
  }

  const atualizarMentorado = async (dadosAtualizados: Partial<Mentorado>) => {
    try {
      const { data, error } = await supabase
        .from('mentorados')
        .update(dadosAtualizados)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setMentorado(prev => prev ? { ...prev, ...dadosAtualizados } : null)
      return data
    } catch (err) {
      console.error('Erro ao atualizar mentorado:', err)
      throw err
    }
  }

  const adicionarFormulario = async (formulario: string, respostas: Record<string, any>) => {
    try {
      const { data, error } = await supabase
        .from('formularios_respostas')
        .insert([{
          mentorado_id: id,
          formulario,
          resposta_json: respostas
        }])
        .select()
        .single()

      if (error) throw error

      setFormularios(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Erro ao adicionar formulário:', err)
      throw err
    }
  }

  useEffect(() => {
    if (id) {
      fetchMentorado()
    }
  }, [id])

  return {
    mentorado,
    formularios,
    loading,
    error,
    atualizarMentorado,
    adicionarFormulario,
    refetch: fetchMentorado
  }
}