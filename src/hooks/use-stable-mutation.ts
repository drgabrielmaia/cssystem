'use client'

import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface UseMutationOptions {
  onSuccess?: (data: any) => void | Promise<void>
  onError?: (error: any) => void
  debounceMs?: number
}

interface UseMutationReturn {
  mutate: (data: any) => Promise<void>
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function useStableMutation(
  tableName: string,
  operation: 'insert' | 'update' | 'delete',
  options: UseMutationOptions = {}
): UseMutationReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { onSuccess, onError, debounceMs = 300 } = options
  
  // Controle para evitar múltiplas operações simultâneas
  const operationInProgressRef = useRef(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastOperationId = useRef(0)

  const reset = useCallback(() => {
    setError(null)
    setIsLoading(false)
    operationInProgressRef.current = false
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
      debounceTimeoutRef.current = null
    }
  }, [])

  const executeOperation = useCallback(async (data: any, operationId: number) => {
    if (operationInProgressRef.current) {
      console.log('⏳ Operação já em andamento, ignorando...')
      return
    }

    // Verificar se ainda é a operação mais recente
    if (operationId !== lastOperationId.current) {
      console.log('❌ Operação obsoleta, ignorando...')
      return
    }

    operationInProgressRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      console.log(`🔄 Executando ${operation} em ${tableName}...`, data)

      let result

      switch (operation) {
        case 'insert':
          result = await supabase.from(tableName).insert(data).select()
          break
          
        case 'update':
          const { id, ...updateData } = data
          if (!id) throw new Error('ID é obrigatório para update')
          result = await supabase.from(tableName).update(updateData).eq('id', id).select()
          break
          
        case 'delete':
          const deleteId = typeof data === 'string' ? data : data.id
          if (!deleteId) throw new Error('ID é obrigatório para delete')
          result = await supabase.from(tableName).delete().eq('id', deleteId)
          break
          
        default:
          throw new Error(`Operação ${operation} não suportada`)
      }

      if (result.error) {
        throw result.error
      }

      console.log(`✅ ${operation} realizado com sucesso em ${tableName}`)
      
      if (onSuccess) {
        await onSuccess(result.data)
      }

    } catch (err: any) {
      console.error(`❌ Erro no ${operation} ${tableName}:`, err)
      const errorMessage = err.message || `Erro ao ${operation === 'insert' ? 'criar' : operation === 'update' ? 'atualizar' : 'deletar'} registro`
      setError(errorMessage)
      
      if (onError) {
        onError(err)
      }
    } finally {
      // Só limpar se ainda for a operação atual
      if (operationId === lastOperationId.current) {
        setIsLoading(false)
        operationInProgressRef.current = false
      }
    }
  }, [tableName, operation, onSuccess, onError])

  const mutate = useCallback(async (data: any) => {
    // Incrementar ID da operação
    const operationId = ++lastOperationId.current

    if (debounceMs > 0) {
      // Cancelar timeout anterior se existir
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      // Criar novo timeout
      debounceTimeoutRef.current = setTimeout(() => {
        executeOperation(data, operationId)
      }, debounceMs)
    } else {
      // Executar imediatamente
      await executeOperation(data, operationId)
    }
  }, [executeOperation, debounceMs])

  return {
    mutate,
    isLoading,
    error,
    reset
  }
}