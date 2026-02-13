'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [orgUser, setOrgUser] = useState<OrganizationUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()


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
      console.log('💾 Auth data salva no localStorage')
    } catch (error) {
      console.error('❌ Erro ao salvar auth data:', error)
    }
  }

  // Função para carregar dados de auth do localStorage
  const loadAuthData = (): { user: User | null, organizationId: string | null } => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      const storedOrg = localStorage.getItem(ORG_STORAGE_KEY)

      if (!stored) return { user: null, organizationId: null }

      const authData = JSON.parse(stored)

      // Verificar se não expirou
      if (authData.expires_at && Date.now() > authData.expires_at) {
        console.log('🕒 Auth data expirada, removendo...')
        localStorage.removeItem(AUTH_STORAGE_KEY)
        localStorage.removeItem(ORG_STORAGE_KEY)
        return { user: null, organizationId: null }
      }

      console.log('📂 Auth data carregada do localStorage')
      return {
        user: authData.user as User,
        organizationId: authData.organization_id || storedOrg
      }
    } catch (error) {
      console.error('❌ Erro ao carregar auth data:', error)
      return { user: null, organizationId: null }
    }
  }

  // Função para limpar dados de auth
  const clearAuthData = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      localStorage.removeItem(ORG_STORAGE_KEY)
      console.log('🗑️ Auth data removida do localStorage')
    } catch (error) {
      console.error('❌ Erro ao limpar auth data:', error)
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 Verificando sessão inicial (server-side)...')

        // 1. SEMPRE validar no Supabase (server-side) - não confia no localStorage
        console.log('🔄 Validação server-side obrigatória...')
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('❌ Erro ao buscar sessão:', error)
          clearAuthData() // Limpa qualquer coisa local
          setUser(null)
          setOrganizationId(null)
          setOrgUser(null)
          setLoading(false)
          setIsInitialized(true)
          return
        }

        const currentUser = session?.user ?? null
        console.log('👤 Usuário Supabase encontrado:', currentUser ? 'SIM' : 'NÃO')

        if (currentUser) {
          console.log('✅ Sessão válida confirmada server-side')
          setUser(currentUser)

          // Validar organização SEMPRE no servidor
          const orgId = await getOrganizationForUser(currentUser)

          if (orgId) {
            // Só salvar se validação server-side passou
            saveAuthData(currentUser, orgId)
          } else {
            // Se não tem org válida, limpar tudo
            clearAuthData()
            setUser(null)
            setOrganizationId(null)
            setOrgUser(null)
          }
        } else {
          console.log('❌ Sessão inválida ou expirada')
          clearAuthData() // Limpa localStorage comprometido
          setUser(null)
          setOrganizationId(null)
          setOrgUser(null)
        }

        setLoading(false)
        setIsInitialized(true)

      } catch (error) {
        console.error('❌ Erro na verificação inicial:', error)
        clearAuthData()
        setUser(null)
        setOrganizationId(null)
        setOrgUser(null)
        setLoading(false)
        setIsInitialized(true)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, 'Initialized:', isInitialized)

      // Skip if not initialized yet
      if (!isInitialized) return

      const currentUser = session?.user ?? null
      console.log('👤 Usuário atualizado:', currentUser ? 'SIM' : 'NÃO')

      if (currentUser) {
        setUser(currentUser)

        // Get organization for the user
        const orgId = await getOrganizationForUser(currentUser)

        // Salvar no localStorage
        saveAuthData(currentUser, orgId || undefined)
      } else {
        setUser(null)
        setOrganizationId(null)
        setOrgUser(null)

        // Limpar localStorage quando logout
        if (event === 'SIGNED_OUT') {
          clearAuthData()
        }
      }

      setLoading(false)
    })

    // Cleanup para evitar memory leaks
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth, isInitialized])

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

  // Função para validar autenticação atual (força verificação no Supabase)
  const refreshAuth = useCallback(async () => {
    console.log('🔄 Refresh auth forçado...')
    setLoading(true)
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session?.user) {
        console.log('❌ Refresh: sem sessão válida')
        setUser(null)
        setOrganizationId(null)
        setOrgUser(null)
        setIsAuthenticated(false)
        clearAuthData()
        return
      }

      const currentUser = session.user
      console.log('✅ Refresh: sessão válida encontrada')

      // Verificar organização
      const orgId = await getOrganizationForUser(currentUser)
      
      if (!orgId) {
        console.log('❌ Refresh: usuário sem organização ativa')
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
      
      console.log('✅ Refresh auth completado com sucesso')
    } catch (error) {
      console.error('❌ Erro no refresh auth:', error)
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
      const { data: userData, error } = await supabase
        .from('organization_users')
        .select('organization_id, is_active, role, email')
        .eq('email', user.email)
        .eq('is_active', true)
        .single()

      if (error || !userData || !userData.is_active) {
        console.warn('Usuário sem organização ativa:', user.email, error)
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