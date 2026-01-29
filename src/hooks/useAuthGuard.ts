'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth'

export function useAuthGuard() {
  const { user, loading } = useAuth()
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const checkAuth = () => {
      console.log('🔒 Verificando auth:', { user: !!user, loading })

      // Se ainda está carregando, aguardar um pouco mais
      if (loading) {
        timeoutId = setTimeout(checkAuth, 100)
        return
      }

      // Se não está carregando e não tem usuário, redirecionar
      if (!user) {
        console.log('❌ Não autenticado, redirecionando...')
        router.replace('/login')
        return
      }

      // Se chegou aqui, está autenticado
      console.log('✅ Usuário autenticado!')
      setIsChecking(false)
    }

    // Timeout máximo de 5 segundos para evitar loading infinito
    const maxTimeoutId = setTimeout(() => {
      if (loading && !user) {
        console.log('⏰ Timeout de auth, redirecionando...')
        router.replace('/login')
      }
      setIsChecking(false)
    }, 5000)

    checkAuth()

    return () => {
      clearTimeout(timeoutId)
      clearTimeout(maxTimeoutId)
    }
  }, [user, loading, router])

  return {
    isAuthenticated: !!user,
    isChecking: isChecking || loading,
    user
  }
}