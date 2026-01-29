'use client'

import { useAuthGuard } from '@/hooks/useAuthGuard'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isChecking } = useAuthGuard()

  // Mostra loading enquanto verifica
  if (isChecking) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Se não está autenticado, não renderiza nada (o hook já redirecionou)
  if (!isAuthenticated) {
    return null
  }

  // Se está autenticado, renderiza o conteúdo
  return <>{children}</>
}