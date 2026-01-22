import { useState, useCallback } from 'react'

interface RetryOptions {
  maxAttempts?: number
  delay?: number
  backoffMultiplier?: number
}

export function useRetryRequest<T>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  const executeWithRetry = useCallback(async (
    requestFn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T | null> => {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoffMultiplier = 2
    } = options

    setLoading(true)
    setError(null)
    setAttempt(0)

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setAttempt(attempt)
        console.log(`🔄 Tentativa ${attempt}/${maxAttempts}`)

        const result = await requestFn()
        setLoading(false)
        setError(null)
        console.log(`✅ Sucesso na tentativa ${attempt}`)
        return result
      } catch (err) {
        console.error(`❌ Erro na tentativa ${attempt}:`, err)

        if (attempt === maxAttempts) {
          // Última tentativa falhou
          setError(err as Error)
          setLoading(false)
          console.error(`💥 Falha após ${maxAttempts} tentativas`)
          return null
        }

        // Aguardar antes da próxima tentativa
        const waitTime = delay * Math.pow(backoffMultiplier, attempt - 1)
        console.log(`⏳ Aguardando ${waitTime}ms antes da próxima tentativa...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    setLoading(false)
    return null
  }, [])

  return {
    executeWithRetry,
    loading,
    error,
    attempt
  }
}