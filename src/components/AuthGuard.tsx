'use client'

import { useAuthGuard } from '@/hooks/useAuthGuard'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isChecking } = useAuthGuard()

  // Mostra loading enquanto verifica - com estilo consistente do app
  if (isChecking) {
    return fallback || (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#D4AF37] mx-auto mb-6"></div>
          <p className="text-gray-400 text-lg">Verificando autenticação...</p>
          <p className="text-gray-500 text-sm mt-2">Aguarde enquanto validamos sua sessão</p>
        </div>
      </div>
    )
  }

  // Se não está autenticado, não renderiza nada (o hook já redirecionou)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-lg">Redirecionando...</div>
        </div>
      </div>
    )
  }

  // Se está autenticado, renderiza o conteúdo
  return <>{children}</>
}