'use client'

import { useAuth } from '@/contexts/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    if (!loading && !hasChecked) {
      setHasChecked(true)
      if (!user) {
        router.replace('/login')
      }
    }
  }, [user, loading, router, hasChecked])

  // Se ainda carregando ou não checou ainda, mostra loading
  if (loading || !hasChecked) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
      </div>
    )
  }

  // Se não tem usuário após check, não renderiza
  if (!user) {
    return null
  }

  // Tem usuário, renderiza conteúdo
  return <>{children}</>
}