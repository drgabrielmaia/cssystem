'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { getToken, getStoredUser, clearAuth as clearApiAuth, getApiBaseUrl } from '@/lib/api'

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
    const API_BASE = getApiBaseUrl()

    // Direct fetch to /auth/me without using apiFetch (avoids circular 401 handling)
    const validateToken = async (token: string) => {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!res.ok) return null
      return res.json()
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const token = getToken()

        // STEP 0: Restore from localStorage cache for instant UI (no spinner on refresh)
        if (token) {
          try {
            const cachedAuth = localStorage.getItem(AUTH_STORAGE_KEY)
            if (cachedAuth) {
              const cached = JSON.parse(cachedAuth)
              if (cached.user && cached.organization_id && cached.expires_at > Date.now()) {
                const cachedUser = {
                  id: cached.user.id,
                  email: cached.user.email,
                  created_at: cached.user.created_at || new Date().toISOString(),
                  app_metadata: cached.user.app_metadata || {},
                  user_metadata: cached.user.user_metadata || {},
                  aud: 'authenticated',
                  role: 'authenticated',
                } as any
                setUser(cachedUser)
                setOrganizationId(cached.organization_id)
                setIsAuthenticated(true)
                setLoading(false) // Stop spinner immediately - user sees the app
              }
            }
          } catch {
            // Cache parse error - continue to validation
          }
        }

        // STEP 1: Validate custom JWT via direct fetch (not apiFetch)
        if (token) {
          try {
            const meData = await validateToken(token)
            if (meData) {
              const customUser = {
                id: meData.user.id,
                email: meData.user.email,
                created_at: new Date().toISOString(),
                app_metadata: {},
                user_metadata: { nome: meData.user.nome },
                aud: 'authenticated',
                role: meData.role,
              } as any

              setUser(customUser)
              setOrganizationId(meData.organization_id)
              setOrgUser({
                is_active: meData.is_active,
                organization_id: meData.organization_id,
                role: meData.role,
                email: meData.user.email,
              })
              setIsAuthenticated(true)
              saveAuthData(customUser, meData.organization_id)
              setLoading(false)
              setIsInitialized(true)
              return
            } else {
              // Token invalid - clear it but don't redirect yet (try Supabase fallback)
              const isMentoradoPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/mentorado')
              if (!isMentoradoPage) {
                clearApiAuth()
              }
            }
          } catch {
            // Network error - if we have cache, keep using it and don't clear
            try {
              const cachedAuth = localStorage.getItem(AUTH_STORAGE_KEY)
              if (cachedAuth) {
                const cached = JSON.parse(cachedAuth)
                if (cached.user && cached.expires_at > Date.now()) {
                  // Valid cache exists, keep using it despite network error
                  setLoading(false)
                  setIsInitialized(true)
                  return
                }
              }
            } catch {}
            // No valid cache and network error
            const isMentoradoPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/mentorado')
            if (!isMentoradoPage) {
              clearApiAuth()
            }
          }
        }

        // STEP 2: Fallback Supabase auth (for users not using custom JWT)
        const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser()

        if (userError || !validatedUser) {
          const { data: { session } } = await supabase.auth.getSession()
          const currentUser = session?.user ?? null

          if (!currentUser) {
            clearAuthData()
            setUser(null)
            setOrganizationId(null)
            setOrgUser(null)
            setIsAuthenticated(false)
            setLoading(false)
            setIsInitialized(true)
            return
          }

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
            setIsAuthenticated(false)
          }

          setLoading(false)
          setIsInitialized(true)
          return
        }

        setUser(validatedUser)
        const orgId = await getOrganizationForUser(validatedUser)

        if (orgId) {
          saveAuthData(validatedUser, orgId)
        } else {
          clearAuthData()
          setUser(null)
          setOrganizationId(null)
          setOrgUser(null)
          setIsAuthenticated(false)
        }

        setLoading(false)
        setIsInitialized(true)

      } catch (error) {
        console.error('Erro na verificação inicial:', error)
        // On error, keep cache if valid before clearing
        try {
          const cachedAuth = localStorage.getItem(AUTH_STORAGE_KEY)
          if (cachedAuth) {
            const cached = JSON.parse(cachedAuth)
            if (cached.user && cached.expires_at > Date.now()) {
              setLoading(false)
              setIsInitialized(true)
              return
            }
          }
        } catch {}
        clearAuthData()
        setUser(null)
        setOrganizationId(null)
        setOrgUser(null)
        setIsAuthenticated(false)
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

      // Ignore Supabase auth events when using custom JWT (Docker PostgreSQL)
      if (getToken()) return

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

    // Listen for custom API login events
    const handleApiLogin = ((event: CustomEvent) => {
      const { token, user: userData } = event.detail
      const customUser = {
        id: userData.id,
        email: userData.email,
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: { nome: userData.nome },
        aud: 'authenticated',
        role: userData.role,
      } as any

      setUser(customUser)
      setOrganizationId(userData.organization_id)
      setOrgUser({
        is_active: true,
        organization_id: userData.organization_id,
        role: userData.role,
        email: userData.email,
      })
      setIsAuthenticated(true)
      saveAuthData(customUser, userData.organization_id)
      setLoading(false)
    }) as EventListener
    window.addEventListener('apiLoginSuccess', handleApiLogin)

    // VISIBILITYCHANGE: Recuperar sessão quando a aba volta a ficar visível
    // Skip if using custom JWT — no Supabase session to recover
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !getToken()) {
        console.log('Tab visible - recovering session...')
        recoverSession()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // HEARTBEAT: Verificar sessão periodicamente como safety net
    // Skip if using custom JWT — session is managed via JWT expiry
    heartbeatRef.current = setInterval(async () => {
      if (document.visibilityState !== 'visible') return
      if (getToken()) return // Using custom JWT, skip Supabase heartbeat

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

    // Listen for cs:sessionExpired events from apiFetch (401 on data queries)
    // This is the centralized handler — apiFetch no longer clears auth or redirects
    let sessionExpiredTimer: NodeJS.Timeout | null = null
    const handleSessionExpired = () => {
      // Debounce: only handle once per 5 seconds to avoid multiple rapid revalidations
      if (sessionExpiredTimer) return
      sessionExpiredTimer = setTimeout(() => { sessionExpiredTimer = null }, 5000)

      const token = getToken()
      if (!token) return

      console.log('Session expired event — re-validating token...')
      validateToken(token)
        .then((meData) => {
          if (!meData) {
            console.log('Token truly expired, logging out...')
            clearApiAuth()
            clearAuthData()
            setUser(null)
            setOrganizationId(null)
            setOrgUser(null)
            setIsAuthenticated(false)
            router.push('/login')
          }
        })
        .catch(() => {
          // Network error — don't log out on transient failures
        })
    }
    window.addEventListener('cs:sessionExpired', handleSessionExpired)

    // Cleanup
    return () => {
      subscription.unsubscribe()
      window.removeEventListener('apiLoginSuccess', handleApiLogin)
      window.removeEventListener('cs:sessionExpired', handleSessionExpired)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (sessionExpiredTimer) clearTimeout(sessionExpiredTimer)
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
      setIsAuthenticated(false)

      // 2. Limpar localStorage de auth (both custom JWT and Supabase)
      clearAuthData()
      clearApiAuth()

      // 3. Logout do Supabase (may fail if using custom JWT, that's ok)
      try {
        await supabase.auth.signOut()
        console.log('✅ Logout Supabase OK')
      } catch {
        // Ignore Supabase signOut errors when using custom JWT
      }

      // 4. Limpeza básica de cookies
      const cookiesToClear = ['admin_auth', 'mentorado', 'cs_auth_token']
      cookiesToClear.forEach(name => {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
      })

      console.log('✅ Logout completo')

      // 5. Redirect sem forçar
      router.push('/login')

    } catch (error) {
      console.error('❌ Erro no logout:', error)

      clearAuthData()
      clearApiAuth()
      setUser(null)
      setOrganizationId(null)
      setOrgUser(null)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  // Função para validar autenticação atual
  const refreshAuth = useCallback(async () => {
    console.log('Refresh auth forçado...')
    setLoading(true)

    const API_BASE = getApiBaseUrl()

    try {
      // If using custom JWT, validate via direct fetch (not apiFetch)
      const token = getToken()
      if (token) {
        try {
          const meResponse = await fetch(`${API_BASE}/auth/me`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          })
          if (meResponse.ok) {
            const meData = await meResponse.json()
            const customUser = {
              id: meData.user.id,
              email: meData.user.email,
              created_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: { nome: meData.user.nome },
              aud: 'authenticated',
              role: meData.role,
            } as any
            setUser(customUser)
            setOrganizationId(meData.organization_id)
            setOrgUser({
              is_active: meData.is_active,
              organization_id: meData.organization_id,
              role: meData.role,
              email: meData.user.email,
            })
            setIsAuthenticated(true)
            saveAuthData(customUser, meData.organization_id)
            return
          }
        } catch {
          // JWT expired or network error, fall through to clear
        }
        clearApiAuth()
        setUser(null)
        setOrganizationId(null)
        setOrgUser(null)
        setIsAuthenticated(false)
        clearAuthData()
        return
      }

      // Fallback: Supabase refreshSession
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