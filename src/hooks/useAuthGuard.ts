'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth'

export function useAuthGuard() {
  const { user, loading } = useAuth()
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Simplificado: apenas aguarda o loading inicial terminar
    if (!loading) {
      if (!user) {
        router.replace('/login')
      }
      setIsChecking(false)
    }
  }, [user, loading, router])

  return {
    isAuthenticated: !!user && !loading,
    isChecking: loading || isChecking,
    user
  }
}