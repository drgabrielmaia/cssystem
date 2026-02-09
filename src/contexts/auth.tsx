'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
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

const AUTH_STORAGE_KEY = 'customer_success_auth'
const ORG_STORAGE_KEY = 'customer_success_org'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
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
        console.log('🔍 Verificando sessão inicial...')

        // 1. Check Supabase session
        console.log('🔄 Verificando sessão Supabase...')
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          if (error.name === 'AbortError' || error.message?.includes('signal is aborted')) {
            console.error('❌ Timeout ao buscar sessão - continuando sem auth:', error)
          } else {
            console.error('❌ Erro ao buscar sessão:', error)
          }
          setUser(null)
          setOrganizationId(null)
          setLoading(false)
          setIsInitialized(true)
          return
        }

        const currentUser = session?.user ?? null
        console.log('👤 Usuário Supabase encontrado:', currentUser ? 'SIM' : 'NÃO')

        if (currentUser) {
          console.log('✅ Usuário autenticado encontrado')
          setUser(currentUser)

          // Get organization for the user
          const orgId = await getOrganizationForUser(currentUser)

          // Salvar no localStorage para próximas vezes
          saveAuthData(currentUser, orgId || undefined)
        } else {
          console.log('❌ Nenhum usuário autenticado')
          setUser(null)
          setOrganizationId(null)
        }

        setLoading(false)
        setIsInitialized(true)

      } catch (error) {
        console.error('❌ Erro na verificação inicial:', error)
        clearAuthData()
        setUser(null)
        setOrganizationId(null)
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
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const getOrganizationForUser = async (user: User): Promise<string | null> => {
    try {
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('email', user.email)
        .eq('is_active', true)
        .single()

      if (orgUser) {
        setOrganizationId(orgUser.organization_id)
        return orgUser.organization_id
      } else {
        console.warn('Usuário sem organização:', user.email)
        setOrganizationId(null)
        return null
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('signal is aborted')) {
        console.error('Timeout ao buscar organização - continuando sem org:', error)
      } else {
        console.error('Erro ao buscar organização:', error)
      }
      setOrganizationId(null)
      return null
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