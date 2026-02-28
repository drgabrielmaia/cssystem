'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface OrganizationUser {
  is_active: boolean
  organization_id: string
  role: string
  email: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  organizationId: string | null
  orgUser: OrganizationUser | null
  isAuthenticated: boolean
  isAdmin: boolean
  refreshAuth: () => Promise<void>
  signOut: () => Promise<void>
  requireAuth: (redirectTo?: string) => boolean
  requireAdmin: (redirectTo?: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

const AUTH_STORAGE_KEY = 'customer_success_auth'
const ORG_STORAGE_KEY = 'customer_success_org'

// Intervalo do heartbeat: verificar sessão a cada 4 minutos
const SESSION_HEARTBEAT_MS = 4 * 60 * 1000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [orgUser, setOrgUser] = useState<OrganizationUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const isRecoveringRef = useRef(false)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)


  // Função para salvar dados de auth no localStorage
  const saveAuthData = (user: User, orgId?: string) => {
    try {
      const authData = {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          app_metadata: user.app_metadata,
          user_metadata: user.user_metadata
        },
        organization_id: orgId,
        timestamp: Date.now(),
        expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 dias
      }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData))
      if (orgId) {
        localStorage.setItem(ORG_STORAGE_KEY, orgId)
      }
    } catch (error) {
      console.error('Erro ao salvar auth data:', error)
    }
  }

  // Função para limpar dados de auth
  const clearAuthData = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      localStorage.removeItem(ORG_STORAGE_KEY)
    } catch (error) {
      console.error('Erro ao limpar auth data:', error)
    }
  }

  // Recuperar sessão: força refresh do token e revalida tudo
  const recoverSession = useCallback(async () => {
    // Evitar múltiplas recuperações simultâneas
    if (isRecoveringRef.current) return
    isRecoveringRef.current = true

    try {
      console.log('🔄 Recuperando sessão...')

      // 1. Tentar refresh do token (valida server-side)
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError || !session?.user) {
        // 2. Se refresh falhou, tentar getUser() como fallback (valida server-side)
        const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser()

        if (userError || !validatedUser) {
          console.log('Session recovery failed - token expired')
          clearAuthData()
          setUser(null)
          setOrganizationId(null)
          setOrgUser(null)
          setIsAuthenticated(false)
          return
        }

        // getUser validou, mas precisamos do token. Forçar novo refresh
        const { data: retryData } = await supabase.auth.refreshSession()
        if (retryData.session?.user) {
          setUser(retryData.session.user)
          const orgId = await getOrganizationForUser(retryData.session.user)
          if (orgId) saveAuthData(retryData.session.user, orgId)
          console.log('Session recovered via getUser + retry refresh')
        }
        return
      }

      // Refresh deu certo - sessão recuperada
      setUser(session.user)
      const orgId = await getOrganizationForUser(session.user)
      if (orgId) saveAuthData(session.user, orgId)
      console.log('Session recovered via refreshSession')

    } catch (error) {
      console.error('Session recovery error:', error)
    } finally {
      isRecoveringRef.current = false
    }
  }, [])

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        // Usar getUser() para validação server-side real (não apenas localStorage)
        const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser()

        if (userError || !validatedUser) {
          // getUser falhou - tentar getSession como fallback (pode ter token válido em storage)
          const { data: { session } } = await supabase.auth.getSession()
          const currentUser = session?.user ?? null

          if (!currentUser) {
            clearAuthData()
            setUser(null)
            setOrganizationId(null)
            setOrgUser(null)
            setLoading(false)
            setIsInitialized(true)
            return
          }

          // Session existe mas getUser falhou - token pode estar expirando, forçar refresh
          const { data: refreshData } = await supabase.auth.refreshSession()
          if (refreshData.session?.user) {
            setUser(refreshData.session.user)
            const orgId = await getOrganizationForUser(refreshData.session.user)
            if (orgId) saveAuthData(refreshData.session.user, orgId)
          } else {
            clearAuthData()
            setUser(null)
            setOrganizationId(null)
            setOrgUser(null)
          }

          setLoading(false)
          setIsInitialized(true)
          return
        }

        // getUser validou server-side com sucesso
        setUser(validatedUser)
        const orgId = await getOrganizationForUser(validatedUser)

        if (orgId) {
          saveAuthData(validatedUser, orgId)
        } else {
          clearAuthData()
          setUser(null)
          setOrganizationId(null)
          setOrgUser(null)
        }

        setLoading(false)
        setIsInitialized(true)

      } catch (error) {
        console.error('Erro na verificação inicial:', error)
        clearAuthData()
        setUser(null)
        setOrganizationId(null)
        setOrgUser(null)
        setLoading(false)
        setIsInitialized(true)
      }
    }

    getInitialSession()

    // Listen for auth changes (sem depender de isInitialized para não perder eventos)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event)

      const currentUser = session?.user ?? null

      if (event === 'TOKEN_REFRESHED') {
        // Token foi renovado automaticamente - atualizar user silenciosamente
        if (currentUser) {
          setUser(currentUser)
          saveAuthData(currentUser, organizationId || undefined)
        }
        return
      }

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setOrganizationId(null)
        setOrgUser(null)
        setIsAuthenticated(false)
        clearAuthData()
        return
      }

      if (currentUser) {
        setUser(currentUser)
        const orgId = await getOrganizationForUser(currentUser)
        saveAuthData(currentUser, orgId || undefined)
      } else {
        setUser(null)
        setOrganizationId(null)
        setOrgUser(null)
      }

      setLoading(false)
    })

    // VISIBILITYCHANGE: Recuperar sessão quando a aba volta a ficar visível
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab visible - recovering session...')
        recoverSession()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // HEARTBEAT: Verificar sessão periodicamente como safety net
    heartbeatRef.current = setInterval(async () => {
      // Só fazer heartbeat se a aba estiver visível
      if (document.visibilityState !== 'visible') return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.log('Heartbeat: no session, recovering...')
          recoverSession()
        }
      } catch {
        // Silenciar erros do heartbeat
      }
    }, SESSION_HEARTBEAT_MS)

    // Cleanup
    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [])

  const signOut = async () => {
    console.log('🚪 Iniciando logout...')
    setLoading(true)

    try {
      // 1. Limpar estado local PRIMEIRO
      setUser(null)
      setOrganizationId(null)
      setOrgUser(null)

      // 2. Limpar localStorage de auth
      clearAuthData()

      // 3. Logout do Supabase
      await supabase.auth.signOut()
      console.log('✅ Logout Supabase OK')

      // 4. Limpeza básica de cookies
      const cookiesToClear = ['admin_auth', 'mentorado']
      cookiesToClear.forEach(name => {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
      })

      console.log('✅ Logout completo')

      // 5. Redirect sem forçar
      router.push('/login')

    } catch (error) {
      console.error('❌ Erro no logout:', error)

      // Fallback simples
      clearAuthData()
      setUser(null)
      setOrganizationId(null)
      setOrgUser(null)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  // Função para validar autenticação atual (força refresh do token server-side)
  const refreshAuth = useCallback(async () => {
    console.log('Refresh auth forçado...')
    setLoading(true)

    try {
      // Usar refreshSession() para forçar renovação server-side
      const { data: { session }, error } = await supabase.auth.refreshSession()

      if (error || !session?.user) {
        console.log('Refresh: sem sessão válida')
        setUser(null)
        setOrganizationId(null)
        setOrgUser(null)
        setIsAuthenticated(false)
        clearAuthData()
        return
      }

      const currentUser = session.user

      // Verificar organização
      const orgId = await getOrganizationForUser(currentUser)

      if (!orgId) {
        setUser(null)
        setOrganizationId(null)
        setOrgUser(null)
        setIsAuthenticated(false)
        clearAuthData()
        return
      }

      setUser(currentUser)
      setOrganizationId(orgId)
      setIsAuthenticated(true)
      saveAuthData(currentUser, orgId)
    } catch (error) {
      console.error('Erro no refresh auth:', error)
      setUser(null)
      setOrganizationId(null)
      setOrgUser(null)
      setIsAuthenticated(false)
      clearAuthData()
    } finally {
      setLoading(false)
    }
  }, [])

  const getOrganizationForUser = async (user: User): Promise<string | null> => {
    try {
      const { data: userDataArray, error } = await supabase
        .from('organization_users')
        .select('organization_id, is_active, role, email')
        .eq('email', user.email)
        .eq('is_active', true)
        .limit(1)

      if (error) {
        console.warn('Erro ao buscar organização do usuário:', user.email, error)
        setOrganizationId(null)
        setOrgUser(null)
        setIsAuthenticated(false)
        return null
      }

      const userData = userDataArray?.[0]

      if (!userData || !userData.is_active) {
        console.warn('Usuário sem organização ativa:', user.email)
        setOrganizationId(null)
        setOrgUser(null)
        setIsAuthenticated(false)
        return null
      }

      setOrganizationId(userData.organization_id)
      setOrgUser(userData)
      setIsAuthenticated(true)
      return userData.organization_id
    } catch (error: any) {
      console.error('Erro ao buscar organização:', error)
      setOrganizationId(null)
      setOrgUser(null)
      setIsAuthenticated(false)
      return null
    }
  }

  const isAdmin = () => {
    return orgUser?.role === 'admin'
  }

  const requireAuth = (redirectTo: string = '/login') => {
    if (!loading && !isAuthenticated) {
      router.push(redirectTo)
      return false
    }
    return true
  }

  const requireAdmin = (redirectTo: string = '/dashboard?error=admin_required') => {
    if (!loading && (!isAuthenticated || !isAdmin())) {
      router.push(redirectTo)
      return false
    }
    return true
  }

  const value = {
    user,
    organizationId,
    orgUser,
    loading,
    isAuthenticated,
    isAdmin: isAdmin(),
    refreshAuth,
    signOut,
    requireAuth,
    requireAdmin,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}