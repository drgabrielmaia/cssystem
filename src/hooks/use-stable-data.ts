'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface UseStableDataOptions {
  tableName: string
  select?: string
  filters?: Record<string, any>
  dependencies?: any[]
  autoLoad?: boolean
  debounceMs?: number
}

interface UseStableDataReturn<T> {
  data: T[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  isRefetching: boolean
}

export function useStableData<T = any>({
  tableName,
  select = '*',
  filters = {},
  dependencies = [],
  autoLoad = true,
  debounceMs = 300
}: UseStableDataOptions): UseStableDataReturn<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(autoLoad)
  const [isRefetching, setIsRefetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Refs para controle de race conditions
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastFetchId = useRef(0)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async (isInitialLoad = false) => {
    // Não buscar se tem filtro organization_id mas valor é vazio (org ainda não carregou)
    if ('organization_id' in filters && !filters.organization_id) {
      console.log(`⏳ Aguardando organization_id para ${tableName}...`)
      return
    }

    // Cancelar fetch anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Criar novo controller
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const fetchId = ++lastFetchId.current

    try {
      if (!isInitialLoad) {
        setIsRefetching(true)
      }
      setError(null)

      console.log(`🔄 Fetching ${tableName} data... (ID: ${fetchId})`)

      let query = supabase.from(tableName).select(select)

      // Aplicar filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '' && value !== 'todos' && value !== 'todas') {
          // Suporte a operadores especiais (gte., lte., not.in., etc)
          if (typeof value === 'string' && value.includes('.')) {
            const dotIndex = value.indexOf('.')
            const op = value.substring(0, dotIndex)
            const val = value.substring(dotIndex + 1)

            if (op === 'gte') {
              query = query.gte(key, val)
            } else if (op === 'lte') {
              query = query.lte(key, val)
            } else if (op === 'not') {
              // not.in.(val1,val2)
              if (val.startsWith('in.')) {
                const values = val.replace('in.(', '').replace(')', '').split(',')
                query = query.not(key, 'in', `(${values.join(',')})`)
              }
            } else {
              query = query.eq(key, value)
            }
          } else {
            query = query.eq(key, value)
          }
        }
      })

      const { data: result, error: fetchError } = await query

      // Verificar se ainda é o fetch mais recente
      if (fetchId !== lastFetchId.current || abortController.signal.aborted) {
        console.log(`❌ Fetch ${fetchId} cancelado/obsoleto`)
        return
      }

      if (fetchError) {
        console.error(`❌ Erro ao buscar ${tableName}:`, fetchError)
        setError(fetchError.message)
        return
      }

      console.log(`✅ ${tableName} dados carregados (${result?.length || 0} items) - ID: ${fetchId}`)
      setData((result as T[]) || [])

    } catch (err: any) {
      // Ignorar erros de abort silenciosamente
      if (err.name === 'AbortError' || abortController.signal.aborted) {
        console.log(`🚫 Fetch ${fetchId} abortado`)
        return
      }
      
      if (fetchId === lastFetchId.current && !abortController.signal.aborted) {
        console.error(`❌ Erro no fetch ${tableName}:`, err)
        setError(err.message || 'Erro desconhecido')
      }
    } finally {
      if (fetchId === lastFetchId.current) {
        setLoading(false)
        setIsRefetching(false)
      }
    }
  }, [tableName, select, ...Object.values(filters)])

  const debouncedFetch = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchData(false)
    }, debounceMs)
  }, [fetchData, debounceMs])

  const refetch = useCallback(async () => {
    await fetchData(false)
  }, [fetchData])

  // Effect para carregamento inicial
  useEffect(() => {
    if (autoLoad) {
      fetchData(true)
    }

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort()
        } catch (error) {
          // Ignorar erros de cleanup
          console.log('🧹 Cleanup abort error ignored')
        }
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, []) // Só executa na montagem

  // Effect para mudanças nas dependências
  useEffect(() => {
    if (dependencies.length > 0) {
      debouncedFetch()
    }
  }, dependencies)

  return {
    data,
    loading,
    error,
    refetch,
    isRefetching
  }
}