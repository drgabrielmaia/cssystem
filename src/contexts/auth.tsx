'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  loading: boolean
  organizationId: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // Check for custom admin auth cookie
    const checkAdminAuth = () => {
      const adminAuth = document.cookie.includes('admin_auth=true')
      if (adminAuth) {
        // Create a mock user for admin
        const mockAdminUser = {
          id: 'admin-mock-id',
          aud: 'authenticated',
          email: 'admin@admin.com',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: { role: 'admin' }
        } as User
        setUser(mockAdminUser)
        setOrganizationId('9c8c0033-15ea-4e33-a55f-28d81a19693b')
        setLoading(false)
        return true
      }
      return false
    }

    // Get initial session
    const getInitialSession = async () => {
      // First check for admin cookie
      if (checkAdminAuth()) {
        return
      }

      // Then check Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      setUser(currentUser)

      // Get organization for the user
      if (currentUser) {
        await getOrganizationForUser(currentUser)
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Only update if no admin cookie exists
      if (!document.cookie.includes('admin_auth=true')) {
        const currentUser = session?.user ?? null
        setUser(currentUser)

        // Get organization for the user
        if (currentUser) {
          await getOrganizationForUser(currentUser)
        } else {
          setOrganizationId(null)
        }
      }
      setLoading(false)
    })

    // Listen for cookie changes (for admin login)
    const handleStorageChange = () => {
      checkAdminAuth()
    }

    // Check for cookie changes periodically (fallback)
    const intervalId = setInterval(checkAdminAuth, 1000)

    // Listen for custom events (we'll dispatch these on login)
    window.addEventListener('adminLoginSuccess', checkAdminAuth)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      subscription.unsubscribe()
      clearInterval(intervalId)
      window.removeEventListener('adminLoginSuccess', checkAdminAuth)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [supabase.auth])

  const signOut = async () => {
    console.log('🚪 Iniciando logout...')

    try {
      // 1. Tentar logout do Supabase (mas não esperar se travar)
      const logoutPromise = supabase.auth.signOut()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 2000)
      )

      try {
        await Promise.race([logoutPromise, timeoutPromise])
        console.log('✅ Logout Supabase OK')
      } catch (e) {
        console.log('⏰ Logout Supabase timeout/erro, continuando...')
      }

      // 2. Limpar TODOS os cookies possíveis (agressivo)
      const cookies = document.cookie.split(";")
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf("=")
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()

        // Limpar em todos os paths e domínios possíveis
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;secure`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;samesite=strict`
      })

      // Cookies específicos conhecidos (incluindo o token Supabase real)
      const knownCookies = [
        'admin_auth',
        'mentorado',
        'supabase-auth-token',
        'sb-udzmlnnztzzwrphhizol-auth-token',
        'sb-udzmlnnztzzwrphhizol-auth-token.0',
        'sb-udzmlnnztzzwrphhizol-auth-token.1'
      ]
      knownCookies.forEach(name => {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`
        // Extra cleanup para o cookie Supabase específico
        if (name.includes('sb-udzmlnnztzzwrphhizol')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.medicosderesultado.com.br`
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=medicosderesultado.com.br`
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;secure;samesite=lax`
        }
      })

      // 3. Limpar TODOS os storages
      localStorage.clear()
      sessionStorage.clear()

      // Limpeza específica Supabase (caso localStorage.clear() não pegue tudo)
      const supabaseKeys = [
        'supabase.auth.token',
        'sb-udzmlnnztzzwrphhizol-auth-token',
        'supabase.auth.refreshToken',
        'supabase.auth.expiresAt'
      ]
      supabaseKeys.forEach(key => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      })

      // 4. Limpar indexedDB se existir
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases?.()
          databases?.forEach(db => {
            if (db.name) indexedDB.deleteDatabase(db.name)
          })
        } catch (e) {
          console.log('Erro ao limpar indexedDB:', e)
        }
      }

      // 5. Atualizar estado local
      setUser(null)
      setOrganizationId(null)

      console.log('✅ Logout completo - redirecionando...')

      // 6. Forçar redirect imediato
      window.location.href = '/login'

    } catch (error) {
      console.error('❌ Erro no logout:', error)

      // FALLBACK: Se tudo falhar, ainda assim limpar e redirecionar
      console.log('🔥 Executando logout de emergência...')

      // Limpar o que conseguir
      try {
        localStorage.clear()
        sessionStorage.clear()
        document.cookie.split(";").forEach(cookie => {
          const eqPos = cookie.indexOf("=")
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        })
      } catch (e) {
        console.log('Erro na limpeza de emergência:', e)
      }

      // Forçar redirect mesmo com erro
      window.location.href = '/login'
    }
  }

  const getOrganizationForUser = async (user: User) => {
    try {
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('email', user.email)
        .eq('is_active', true)
        .single()

      if (orgUser) {
        setOrganizationId(orgUser.organization_id)
      } else {
        console.warn('Usuário sem organização:', user.email)
        setOrganizationId(null)
      }
    } catch (error) {
      console.error('Erro ao buscar organização:', error)
      setOrganizationId(null)
    }
  }

  const value = {
    user,
    organizationId,
    loading,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}