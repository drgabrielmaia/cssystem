'use client'

import { useSecureAuth } from '@/hooks/use-secure-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
  fallback?: React.ReactNode
  redirectTo?: string
}

export function AuthGuard({ 
  children, 
  requireAdmin = false, 
  fallback = null,
  redirectTo
}: AuthGuardProps) {
  const { user, orgUser, loading, isSecurelyValidated, validationError } = useSecureAuth()
  const router = useRouter()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    if (!loading && !hasChecked) {
      setHasChecked(true)
      
      if (!isSecurelyValidated || validationError) {
        const loginPath = redirectTo || '/login'
        router.replace(loginPath)
        return
      }

      if (requireAdmin && orgUser?.role !== 'admin') {
        const dashboardPath = redirectTo || '/dashboard?error=admin_required'
        router.replace(dashboardPath)
        return
      }
    }
  }, [loading, isSecurelyValidated, validationError, orgUser, requireAdmin, redirectTo, router, hasChecked])

  // Se ainda carregando ou não checou ainda, mostra loading
  if (loading || !hasChecked) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
      </div>
    )
  }

  // Se não tem validação segura ou erro de validação, não renderiza
  if (!isSecurelyValidated || validationError) {
    return fallback || null
  }

  // Se requer admin mas usuário não é admin
  if (requireAdmin && orgUser?.role !== 'admin') {
    return fallback || null
  }

  // Tem usuário autenticado, renderiza conteúdo
  return <>{children}</>
}