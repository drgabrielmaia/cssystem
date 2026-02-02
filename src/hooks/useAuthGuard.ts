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

      // Se ainda está carregando o contexto, aguardar
      if (loading) {
        timeoutId = setTimeout(checkAuth, 100)
        return
      }

      // Se não tem usuário, redirecionar imediatamente
      if (!user) {
        console.log('❌ Não autenticado, redirecionando...')
        router.replace('/login')
        return
      }

      // Se tem usuário e não está carregando, está OK
      // O contexto de auth já faz a validação de sessão em background
      console.log('✅ Usuário autenticado!')
      setIsChecking(false)
    }

    // Timeout máximo de 8 segundos para evitar loading infinito
    const maxTimeoutId = setTimeout(() => {
      if (loading || !user) {
        console.log('⏰ Timeout de auth, redirecionando...')
        router.replace('/login')
      }
      setIsChecking(false)
    }, 8000)

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