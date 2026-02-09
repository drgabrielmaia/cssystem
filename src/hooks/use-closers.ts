import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Closer {
  id: string
  nome_completo: string
  email: string
  telefone?: string
  cpf?: string
  tipo_closer?: string
  organization_id?: string
  data_contratacao?: string
  status_contrato?: string
  meta_mensal?: number
  comissao_percentual?: number
  total_vendas?: number
  total_leads_atendidos?: number
  conversao_rate?: number
  pontuacao_total?: number
  created_at: string
  updated_at?: string
}

export interface CloserWithMetrics extends Closer {
  vendas_mes_atual?: number
  valor_vendas_mes?: number
  comissao_mes?: number
  leads_mes?: number
  taxa_conversao_mes?: number
}

export function useClosers(organizationId?: string) {
  const [closers, setClosers] = useState<CloserWithMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadClosers()
  }, [organizationId])

  const loadClosers = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('closers')
        .select('*')
        .order('nome_completo', { ascending: true })

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      // Load metrics for each closer
      const closersWithMetrics = await Promise.all(
        (data || []).map(async (closer) => {
          const metrics = await getCloserMetrics(closer.id)
          return {
            ...closer,
            ...metrics
          }
        })
      )

      setClosers(closersWithMetrics)
    } catch (err: any) {
      console.error('Error loading closers:', err)
      setError(err.message || 'Erro ao carregar closers')
    } finally {
      setLoading(false)
    }
  }

  const getCloserMetrics = async (closerId: string) => {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    try {
      const { data, error } = await supabase.rpc('calculate_closer_metrics', {
        p_closer_id: closerId,
        p_month: currentMonth,
        p_year: currentYear
      })

      if (!error && data && data.length > 0) {
        return {
          vendas_mes_atual: data[0].total_vendas || 0,
          valor_vendas_mes: data[0].valor_total || 0,
          comissao_mes: data[0].comissao_total || 0,
          leads_mes: data[0].leads_atendidos || 0,
          taxa_conversao_mes: data[0].taxa_conversao || 0
        }
      }
    } catch (err) {
      console.error('Error getting closer metrics:', err)
    }

    return {
      vendas_mes_atual: 0,
      valor_vendas_mes: 0,
      comissao_mes: 0,
      leads_mes: 0,
      taxa_conversao_mes: 0
    }
  }

  const addCloser = async (closerData: Omit<Closer, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('closers')
        .insert([closerData])
        .select()
        .single()

      if (error) throw error

      await loadClosers()
      return data
    } catch (err: any) {
      console.error('Error adding closer:', err)
      throw err
    }
  }

  const updateCloser = async (id: string, updates: Partial<Closer>) => {
    try {
      const { data, error } = await supabase
        .from('closers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await loadClosers()
      return data
    } catch (err: any) {
      console.error('Error updating closer:', err)
      throw err
    }
  }

  const deleteCloser = async (id: string) => {
    try {
      const { error } = await supabase
        .from('closers')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadClosers()
    } catch (err: any) {
      console.error('Error deleting closer:', err)
      throw err
    }
  }

  const deactivateCloser = async (id: string, motivo?: string) => {
    try {
      const updates = {
        status_contrato: 'desligado',
        status_login: 'inativo',
        data_desligamento: new Date().toISOString().split('T')[0],
        observacoes: motivo || 'Desligado'
      }

      return await updateCloser(id, updates)
    } catch (err: any) {
      console.error('Error deactivating closer:', err)
      throw err
    }
  }

  const reactivateCloser = async (id: string) => {
    try {
      const updates = {
        status_contrato: 'ativo',
        status_login: 'ativo',
        data_desligamento: null
      }

      return await updateCloser(id, updates)
    } catch (err: any) {
      console.error('Error reactivating closer:', err)
      throw err
    }
  }

  return {
    closers,
    loading,
    error,
    refetch: loadClosers,
    addCloser,
    updateCloser,
    deleteCloser,
    deactivateCloser,
    reactivateCloser
  }
}