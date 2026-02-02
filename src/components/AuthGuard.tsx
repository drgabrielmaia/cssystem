'use client'

import { useAuth } from '@/contexts/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      console.log('🔒 AuthGuard: Usuário não autenticado, redirecionando...')
      router.replace('/login')
    }
  }, [user, loading, router])

  // PROTEÇÃO CRÍTICA: Se não tem usuário E não está carregando, bloqueia totalmente
  if (!loading && !user) {
    console.log('🛑 AuthGuard: Bloqueando acesso - usuário não autenticado')
    router.replace('/login')
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg">Acesso negado</div>
          <div className="text-gray-500 text-sm">Redirecionando para login...</div>
        </div>
      </div>
    )
  }

  // Se ainda carregando, mostra loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
      </div>
    )
  }

  // DUPLA VERIFICAÇÃO: Só renderiza se tem usuário autenticado
  if (!user) {
    return null
  }

  console.log('✅ AuthGuard: Usuário autenticado, renderizando conteúdo')
  return <>{children}</>
}