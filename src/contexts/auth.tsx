'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  loading: boolean
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
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Only update if no admin cookie exists
      if (!document.cookie.includes('admin_auth=true')) {
        setUser(session?.user ?? null)
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
    try {
      await supabase.auth.signOut()

      // Limpar cookies customizados
      document.cookie = 'admin_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'

      // Limpar localStorage (se existir algo)
      localStorage.clear()

      // Redirecionar para página de login após logout
      router.push('/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)

      // Mesmo com erro, limpar cookies e redirecionar
      document.cookie = 'admin_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
      localStorage.clear()
      router.push('/login')
    }
  }

  const value = {
    user,
    loading,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}