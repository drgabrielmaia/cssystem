'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
  fallback?: React.ReactNode
}

export default function ProtectedRoute({ 
  children, 
  requiredRole,
  fallback 
}: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    const validateAuth = async () => {
      try {
        console.log('🔐 ProtectedRoute: Validando autenticação...')

        // 1. Verificar sessão ativa do Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ Erro ao verificar sessão:', sessionError)
          throw new Error('Falha na verificação da sessão')
        }

        if (!session?.user) {
          console.log('❌ Nenhuma sessão ativa encontrada')
          if (mounted) {
            setIsAuthenticated(false)
            setIsLoading(false)
            router.push('/login')
          }
          return
        }

        const currentUser = session.user
        console.log('✅ Sessão ativa encontrada:', currentUser.email)

        // 2. Verificar se usuário está ativo na organização
        const { data: orgUser, error: orgError } = await supabase
          .from('organization_users')
          .select('is_active, role, organization_id')
          .eq('email', currentUser.email)
          .single()

        if (orgError) {
          console.error('❌ Erro ao verificar organização:', orgError)
          throw new Error('Usuário não encontrado na organização')
        }

        if (!orgUser.is_active) {
          console.log('❌ Usuário inativo na organização')
          if (mounted) {
            setIsAuthenticated(false)
            setIsLoading(false)
            router.push('/login?error=inactive')
          }
          return
        }

        // 3. Verificar role se necessário
        if (requiredRole && orgUser.role !== requiredRole && orgUser.role !== 'admin') {
          console.log('❌ Role insuficiente:', orgUser.role, 'requerido:', requiredRole)
          if (mounted) {
            setIsAuthenticated(false)
            setIsLoading(false)
            router.push('/login?error=insufficient_role')
          }
          return
        }

        console.log('✅ Usuário autenticado e autorizado')
        
        if (mounted) {
          setUser(currentUser)
          setIsAuthenticated(true)
          setIsLoading(false)
        }

      } catch (error) {
        console.error('❌ Erro na validação de auth:', error)
        
        if (mounted) {
          setIsAuthenticated(false)
          setIsLoading(false)
          router.push('/login?error=validation_failed')
        }
      }
    }

    validateAuth()

    // Listener para mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event)
        
        if (event === 'SIGNED_OUT' || !session) {
          if (mounted) {
            setIsAuthenticated(false)
            setUser(null)
            setIsLoading(false)
            router.push('/login')
          }
        } else if (event === 'SIGNED_IN' && session) {
          // Re-validar quando login
          validateAuth()
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, requiredRole])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-8">
          <div className="text-destructive text-6xl">🔒</div>
          <h1 className="text-2xl font-bold">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você precisa estar logado para acessar esta página.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Fazer Login
          </button>
        </div>
      </div>
    )
  }

  // Authenticated - render children
  return <>{children}</>
}