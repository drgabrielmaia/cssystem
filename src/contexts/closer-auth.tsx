'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Closer {
  id: string
  nome_completo: string
  email: string
  telefone?: string
  cpf?: string
  rg?: string
  data_nascimento?: string
  endereco?: string
  password_hash?: string
  status_login?: string
  tipo_closer?: string
  organization_id?: string
  data_contratacao?: string
  data_desligamento?: string
  status_contrato?: string
  meta_mensal?: number
  comissao_percentual?: number
  total_vendas?: number
  total_leads_atendidos?: number
  conversao_rate?: number
  pontuacao_total?: number
  observacoes?: string
  skills?: any
  horario_trabalho?: any
  created_at: string
  updated_at?: string
}

interface CloserAuthContextType {
  closer: Closer | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
}

const CloserAuthContext = createContext<CloserAuthContextType | undefined>(undefined)

const COOKIE_NAME = 'closer_auth'
const AUTH_VERSION = '1.0'
const VERSION_KEY = 'closer_auth_version'

export function CloserAuthProvider({ children }: { children: ReactNode }) {
  const [closer, setCloser] = useState<Closer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const closerRef = useRef<Closer | null>(null)
  const errorCountRef = useRef(0)

  // Keep ref in sync with state
  useEffect(() => {
    closerRef.current = closer
  }, [closer])

  // Function to get cookie with fallback to localStorage
  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null

    // Try to read from cookie first
    try {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) {
        const cookieValue = parts.pop()?.split(';').shift() || null
        if (cookieValue) {
          return cookieValue
        }
      }
    } catch (error) {
      console.log('Error reading cookie:', error)
    }

    // Fallback: try to read from localStorage if cookie failed
    try {
      const fallbackValue = localStorage.getItem(`${name}_fallback`)
      if (fallbackValue) {
        console.log('Using localStorage fallback for:', name)
        return fallbackValue
      }
    } catch (error) {
      console.log('Error reading localStorage fallback:', error)
    }

    return null
  }

  // Function to set cookie - Mobile compatible
  const setCookie = (name: string, value: string, days = 7) => {
    if (typeof document === 'undefined') return

    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)

    // More compatible mobile configuration
    const isSecure = window.location.protocol === 'https:'
    const cookieString = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`

    document.cookie = cookieString

    // Fallback: Also save to localStorage for cases where cookies don't work
    try {
      localStorage.setItem(`${name}_fallback`, value)
    } catch (error) {
      console.log('localStorage fallback failed:', error)
    }
  }

  // Function to remove cookie
  const removeCookie = (name: string) => {
    if (typeof document === 'undefined') return

    const isSecure = window.location.protocol === 'https:'
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`

    // Also remove fallback
    try {
      localStorage.removeItem(`${name}_fallback`)
    } catch (error) {
      console.log('Error removing localStorage fallback:', error)
    }
  }

  // Function to check if closer should have access blocked
  const shouldBlockAccess = (closerData: any): { blocked: boolean, reason?: string } => {
    // 1. Check if marked as inactive or terminated
    if (closerData.status_contrato === 'desligado') {
      return { blocked: true, reason: 'Contrato encerrado' }
    }

    // 2. Check if login status is inactive
    if (closerData.status_login !== 'ativo') {
      return { blocked: true, reason: 'Status de login inativo' }
    }

    // 3. Check if termination date has passed
    if (closerData.data_desligamento) {
      const dataDesligamento = new Date(closerData.data_desligamento)
      const hoje = new Date()
      if (hoje >= dataDesligamento) {
        return { blocked: true, reason: 'Acesso encerrado após desligamento' }
      }
    }

    return { blocked: false }
  }

  // Function to check authentication (reusable)
  const checkAuth = async () => {
    try {
      setLoading(true)
      setError(null)

      // Debug: Check device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      console.log('Device:', isMobile ? 'MOBILE' : 'DESKTOP')

      // Check cookie
      const closerId = getCookie(COOKIE_NAME)
      console.log('Cookie closer_auth:', closerId ? 'FOUND' : 'NOT FOUND')

      if (closerId) {
        // Fetch updated closer data
        const { data: closerData, error: fetchError } = await supabase
          .from('closers')
          .select('*')
          .eq('id', closerId)
          .single()

        if (fetchError || !closerData) {
          // Invalid cookie or user not found
          removeCookie(COOKIE_NAME)
          localStorage.removeItem('closer')
          setCloser(null)
        } else {
          // Check if should have access blocked
          const accessCheck = shouldBlockAccess(closerData)

          if (accessCheck.blocked) {
            console.log('Access blocked:', accessCheck.reason)
            setError(accessCheck.reason || 'Acesso bloqueado')
            removeCookie(COOKIE_NAME)
            localStorage.removeItem('closer')
            setCloser(null)
          } else {
            setCloser(closerData)
          }
        }
      } else {
        // Migrate from localStorage to cookie if exists
        const savedCloser = localStorage.getItem('closer')
        if (savedCloser) {
          try {
            const closerData = JSON.parse(savedCloser)

            // Verify if still valid in database
            const { data: currentData, error: fetchError } = await supabase
              .from('closers')
              .select('*')
              .eq('id', closerData.id)
              .eq('status_login', 'ativo')
              .single()

            if (!fetchError && currentData) {
              setCloser(currentData)
              setCookie(COOKIE_NAME, currentData.id)
            }

            // Clear localStorage
            localStorage.removeItem('closer')
          } catch (e) {
            localStorage.removeItem('closer')
          }
        }

        // If nothing found, ensure it's null
        if (!savedCloser) {
          setCloser(null)
        }
      }
    } catch (error: any) {
      console.error('Error checking closer authentication:', error)
      setError('Erro ao verificar autenticação')
      removeCookie(COOKIE_NAME)
      localStorage.removeItem('closer')
      setCloser(null)
    } finally {
      setLoading(false)
    }
  }

  // Clear old cache if version changed
  const clearOldCache = () => {
    try {
      const currentVersion = localStorage.getItem(VERSION_KEY)
      if (currentVersion !== AUTH_VERSION) {
        console.log('Auth version changed, clearing cache...')

        // Clear all old auth data
        removeCookie(COOKIE_NAME)
        localStorage.removeItem('closer')
        localStorage.removeItem(`${COOKIE_NAME}_fallback`)

        // Update version
        localStorage.setItem(VERSION_KEY, AUTH_VERSION)

        console.log('Cache cleared, version updated to', AUTH_VERSION)
      }
    } catch (error) {
      console.log('Error checking cache version:', error)
    }
  }

  // Check authentication on load and monitor changes
  useEffect(() => {
    clearOldCache()
    checkAuth()

    // Monitor cookie changes periodically
    const intervalId = setInterval(() => {
      const cookieExists = !!getCookie(COOKIE_NAME)
      const hasUser = !!closerRef.current

      // If state doesn't match cookie, revalidate
      if (cookieExists !== hasUser) {
        console.log('Cookie state mismatch, rechecking auth...')
        checkAuth()
      }
    }, 1000)

    // Listen to custom events
    const handleCloserLogin = () => {
      console.log('Closer login event detected')
      setTimeout(checkAuth, 100) // Small delay to ensure cookie is set
    }

    // Monitor storage/cookie changes
    const handleStorageChange = () => {
      checkAuth()
    }

    // Add event listeners
    window.addEventListener('closerLoginSuccess', handleCloserLogin)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('closerLoginSuccess', handleCloserLogin)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null)
      console.log('Attempting login with email:', email)
      console.log('Auth version:', AUTH_VERSION)

      // Simple search - first try case-insensitive
      const { data: closerData, error: fetchError } = await supabase
        .from('closers')
        .select('*')
        .ilike('email', email)
        .single()

      if (fetchError) {
        console.log('Case-insensitive search failed:', fetchError.code, fetchError.message)

        // If not found, try exact search
        const { data: exactData, error: exactError } = await supabase
          .from('closers')
          .select('*')
          .eq('email', email.toLowerCase())
          .single()

        if (exactError) {
          console.log('Exact search also failed:', exactError.code)
          setError('Email não encontrado')
          return false
        }

        // Use exact search data
        console.log('Found with exact search')
        return await processLogin(exactData, password)
      }

      // Use case-insensitive search data
      console.log('Found with case-insensitive search')
      return await processLogin(closerData, password)

    } catch (error: any) {
      console.error('Login error:', error)
      errorCountRef.current += 1

      // If multiple consecutive errors, suggest refresh
      if (errorCountRef.current >= 3) {
        console.log('Multiple errors detected, suggesting refresh...')
        window.dispatchEvent(new CustomEvent('closerLoginPersistentError', {
          detail: { persistent: true, count: errorCountRef.current }
        }))
      }

      setError('Erro ao fazer login')
      return false
    }
  }

  const processLogin = async (closerData: any, password: string): Promise<boolean> => {
    console.log('Processing login for:', {
      nome_completo: closerData.nome_completo,
      email: closerData.email,
      status_login: closerData.status_login,
      tipo_closer: closerData.tipo_closer,
      status_contrato: closerData.status_contrato
    })

    // Check if should have access blocked
    const accessCheck = shouldBlockAccess(closerData)
    if (accessCheck.blocked) {
      console.log('Access blocked:', accessCheck.reason)
      setError(accessCheck.reason || 'Acesso bloqueado')
      return false
    }

    // Check password (accepts any password if password_hash is null, otherwise verifies)
    if (!closerData.password_hash || closerData.password_hash === password) {
      setCloser(closerData)
      setCookie(COOKIE_NAME, closerData.id)
      localStorage.removeItem('closer') // Clear legacy localStorage

      // Track dashboard access
      try {
        await supabase.from('closers_dashboard_access').insert({
          closer_id: closerData.id,
          ip_address: 'unknown', // Would need server-side to get real IP
          user_agent: navigator.userAgent,
          device_type: /Mobile|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          browser: navigator.userAgent.split(' ').pop()?.split('/')[0] || 'unknown'
        })
      } catch (accessError) {
        console.log('Error tracking dashboard access:', accessError)
      }

      // Dispatch success event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('closerLoginSuccess'))
      }, 50)

      console.log('Login successful')
      errorCountRef.current = 0 // Reset error counter on success
      return true
    } else {
      setError('Senha incorreta')
      return false
    }
  }

  const signOut = async (): Promise<void> => {
    try {
      removeCookie(COOKIE_NAME)
      localStorage.removeItem('closer')
      setCloser(null)
      setError(null)
    } catch (error: any) {
      console.error('Error during closer logout:', error)
      // Force logout even with error
      removeCookie(COOKIE_NAME)
      localStorage.removeItem('closer')
      setCloser(null)
      setError(null)
    }
  }

  return (
    <CloserAuthContext.Provider
      value={{
        closer,
        loading,
        error,
        signIn,
        signOut,
      }}
    >
      {children}
    </CloserAuthContext.Provider>
  )
}

export function useCloserAuth(): CloserAuthContextType {
  const context = useContext(CloserAuthContext)
  if (context === undefined) {
    throw new Error('useCloserAuth must be used within a CloserAuthProvider')
  }
  return context
}