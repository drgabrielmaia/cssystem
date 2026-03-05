'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
import { MOCK_MODE, MOCK_PASSWORD, createMockMentorado } from '@/lib/mock-data'

const API_BASE_URL = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'

interface Mentorado {
  id: string
  nome_completo: string
  email: string
  telefone?: string
  estado_entrada: string
  estado_atual: string
  data_entrada: string
  data_nascimento?: string
  endereco?: string
  crm?: string
  cpf?: string
  rg?: string
  origem_conhecimento?: string
  data_inicio_mentoria?: string
  password_hash?: string
  status_login?: string
  genero?: string
  especialidade?: string
  created_at: string
}

interface MentoradoAuthContextType {
  mentorado: Mentorado | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
}

const MentoradoAuthContext = createContext<MentoradoAuthContextType | undefined>(undefined)

const COOKIE_NAME = 'mentorado_auth'
const AUTH_VERSION = '3.0' // Incrementar quando houver mudanças no auth
const VERSION_KEY = 'mentorado_auth_version'

export function MentoradoAuthProvider({ children }: { children: ReactNode }) {
  const [mentorado, setMentorado] = useState<Mentorado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mentoradoRef = useRef<Mentorado | null>(null)
  const errorCountRef = useRef(0)

  // Keep ref in sync with state
  useEffect(() => {
    mentoradoRef.current = mentorado
  }, [mentorado])

  // Função para obter cookie com fallback para localStorage
  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null

    // Tentar ler do cookie primeiro
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
      console.log('Erro ao ler cookie:', error)
    }

    // Fallback: tentar ler do localStorage se cookie falhou
    try {
      const fallbackValue = localStorage.getItem(`${name}_fallback`)
      if (fallbackValue) {
        console.log('🔄 Usando fallback localStorage para:', name)
        return fallbackValue
      }
    } catch (error) {
      console.log('Erro ao ler fallback localStorage:', error)
    }

    return null
  }

  // Função para definir cookie - Compatível com mobile
  const setCookie = (name: string, value: string, days = 7) => {
    if (typeof document === 'undefined') return

    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)

    // Configuração mais compatível com mobile
    const isSecure = window.location.protocol === 'https:'
    const cookieString = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`

    document.cookie = cookieString

    // Fallback: Salvar também no localStorage para casos onde cookies não funcionam
    try {
      localStorage.setItem(`${name}_fallback`, value)
    } catch (error) {
      console.log('Fallback localStorage falhou:', error)
    }
  }

  // Função para remover cookie
  const removeCookie = (name: string) => {
    if (typeof document === 'undefined') return

    const isSecure = window.location.protocol === 'https:'
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`

    // Remover também o fallback
    try {
      localStorage.removeItem(`${name}_fallback`)
    } catch (error) {
      console.log('Erro ao remover fallback localStorage:', error)
    }
  }

  // Função para verificar autenticação (reutilizável)
  const checkAuth = async () => {
    try {
      setLoading(true)
      setError(null)

      // MOCK MODE: verificar se tem mentorado mockado salvo
      if (MOCK_MODE) {
        const mockEmail = getCookie(COOKIE_NAME)
        if (mockEmail && mockEmail.startsWith('mock:')) {
          const email = mockEmail.replace('mock:', '')
          setMentorado(createMockMentorado(email) as any)
          setLoading(false)
          return
        }
        // Sem cookie mock, não autenticado
        setMentorado(null)
        setLoading(false)
        return
      }

      // Verificar cookie
      const mentoradoId = getCookie(COOKIE_NAME)
      console.log('🔍 Cookie mentorado_auth:', mentoradoId ? 'ENCONTRADO' : 'NÃO ENCONTRADO')

      if (mentoradoId) {
        // Validar mentorado via API pública (sem JWT)
        try {
          const response = await fetch(`${API_BASE_URL}/public/mentorados/validate/${mentoradoId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })

          if (response.ok) {
            const result = await response.json()
            if (result.success && result.mentorado) {
              setMentorado(result.mentorado)
              // Store/refresh JWT token from validate (so write operations work after refresh)
              if (result.token) {
                localStorage.setItem('cs_auth_token', result.token)
                document.cookie = `cs_auth_token=${result.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
              }
            } else {
              removeCookie(COOKIE_NAME)
              localStorage.removeItem('mentorado')
              setMentorado(null)
            }
          } else if (response.status === 403) {
            const result = await response.json()
            console.log('🚫 Acesso bloqueado:', result.error)
            setError(result.error || 'Acesso bloqueado')
            removeCookie(COOKIE_NAME)
            localStorage.removeItem('mentorado')
            setMentorado(null)
          } else {
            // Cookie inválido ou mentorado não encontrado
            removeCookie(COOKIE_NAME)
            localStorage.removeItem('mentorado')
            setMentorado(null)
          }
        } catch (fetchErr) {
          console.error('Erro ao validar mentorado via API:', fetchErr)
          // On network error, try using cached data from localStorage
          const cached = localStorage.getItem('mentorado_cache')
          if (cached) {
            try {
              setMentorado(JSON.parse(cached))
            } catch (e) {
              removeCookie(COOKIE_NAME)
              setMentorado(null)
            }
          } else {
            removeCookie(COOKIE_NAME)
            setMentorado(null)
          }
        }
      } else {
        // Migrar do localStorage para cookie se existir
        const savedMentorado = localStorage.getItem('mentorado')
        if (savedMentorado) {
          try {
            const mentoradoData = JSON.parse(savedMentorado)
            // Set cookie and use cached data
            setCookie(COOKIE_NAME, mentoradoData.id)
            setMentorado(mentoradoData)
            // Limpar localStorage legado
            localStorage.removeItem('mentorado')
          } catch (e) {
            localStorage.removeItem('mentorado')
          }
        }

        if (!savedMentorado) {
          setMentorado(null)
        }
      }
    } catch (error: any) {
      console.error('Erro ao verificar autenticação do mentorado:', error)
      setError('Erro ao verificar autenticação')
      removeCookie(COOKIE_NAME)
      localStorage.removeItem('mentorado')
      setMentorado(null)
    } finally {
      setLoading(false)
    }
  }

  // Limpar cache antigo se versão mudou
  const clearOldCache = () => {
    try {
      const currentVersion = localStorage.getItem(VERSION_KEY)
      if (currentVersion !== AUTH_VERSION) {
        console.log('🔄 Versão do auth mudou, limpando cache...')

        // Limpar todos os dados de auth antigos
        removeCookie(COOKIE_NAME)
        localStorage.removeItem('mentorado')
        localStorage.removeItem(`${COOKIE_NAME}_fallback`)

        // Atualizar versão
        localStorage.setItem(VERSION_KEY, AUTH_VERSION)

        console.log('✅ Cache limpo, versão atualizada para', AUTH_VERSION)
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar versão do cache:', error)
    }
  }

  // Verificar autenticação no carregamento e monitorar mudanças
  useEffect(() => {
    clearOldCache() // Limpar cache primeiro
    checkAuth()

    // Monitorar mudanças no cookie periodicamente
    const intervalId = setInterval(() => {
      const cookieExists = !!getCookie(COOKIE_NAME)
      const hasUser = !!mentoradoRef.current

      // Se o estado não bate com o cookie, revalidar
      if (cookieExists !== hasUser) {
        console.log('🔄 Cookie state mismatch, rechecking auth...')
        checkAuth()
      }
    }, 1000)

    // Escutar eventos customizados
    const handleMentoradoLogin = () => {
      console.log('🎉 Evento de login do mentorado detectado')
      setTimeout(checkAuth, 100) // Pequeno delay para garantir que o cookie foi setado
    }

    // Monitorar mudanças de storage/cookie
    const handleStorageChange = () => {
      checkAuth()
    }

    // Adicionar event listeners
    window.addEventListener('mentoradoLoginSuccess', handleMentoradoLogin)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('mentoradoLoginSuccess', handleMentoradoLogin)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, []) // Empty dependency array - only run once on mount

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null)
      console.log('🔍 Tentando login com email:', email)

      // MOCK MODE: aceitar qualquer email com senha fixa
      if (MOCK_MODE) {
        if (password !== MOCK_PASSWORD) {
          setError('Senha incorreta')
          return false
        }
        const mockData = createMockMentorado(email) as any
        setMentorado(mockData)
        setCookie(COOKIE_NAME, `mock:${email}`)
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('mentoradoLoginSuccess'))
        }, 50)
        console.log('✅ Login mock realizado com sucesso')
        return true
      }

      console.log('📋 Versão do auth:', AUTH_VERSION)

      // Login via API pública (sem JWT)
      const response = await fetch(`${API_BASE_URL}/public/mentorados/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const result = await response.json()

      if (response.ok && result.success && result.mentorado) {
        console.log('✅ Login via API bem-sucedido')
        setMentorado(result.mentorado)
        setCookie(COOKIE_NAME, result.mentorado.id)
        localStorage.removeItem('mentorado')

        // Store JWT token so ApiQueryBuilder works for mentorado pages
        if (result.token) {
          localStorage.setItem('cs_auth_token', result.token)
          document.cookie = `cs_auth_token=${result.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
        }

        // Cache mentorado data for offline/network error fallback
        try {
          localStorage.setItem('mentorado_cache', JSON.stringify(result.mentorado))
        } catch (e) { /* ignore */ }

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('mentoradoLoginSuccess'))
        }, 50)

        console.log('✅ Login realizado com sucesso')
        errorCountRef.current = 0
        return true
      } else {
        const errorMsg = result.error || 'Email ou senha incorretos'
        console.log('❌ Login falhou:', errorMsg)
        setError(errorMsg)
        return false
      }

    } catch (error: any) {
      console.error('❌ Erro no login:', error)
      errorCountRef.current += 1

      // Se múltiplos erros consecutivos, sugerir refresh
      if (errorCountRef.current >= 3) {
        console.log('⚠️ Múltiplos erros detectados, sugerindo refresh...')
        window.dispatchEvent(new CustomEvent('mentoradoLoginPersistentError', {
          detail: { persistent: true, count: errorCountRef.current }
        }))
      }

      setError('Erro ao fazer login')
      return false
    }
  }


  const signOut = async (): Promise<void> => {
    try {
      console.log('🚪 Fazendo logout do mentorado...')
      removeCookie(COOKIE_NAME)
      localStorage.removeItem('mentorado')
      localStorage.removeItem('mentorado_cache')
      // Clear mentorado JWT token (but don't clear admin token if it's a different user)
      const storedToken = localStorage.getItem('cs_auth_token')
      if (storedToken) {
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1]))
          if (payload.is_mentorado) {
            localStorage.removeItem('cs_auth_token')
            document.cookie = 'cs_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          }
        } catch (e) {
          // If can't decode, clear anyway
          localStorage.removeItem('cs_auth_token')
          document.cookie = 'cs_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        }
      }
      setMentorado(null)
      setError(null)
      console.log('✅ Logout realizado com sucesso')

      // Redirect para a página de login após logout
      window.location.href = '/mentorado'
    } catch (error: any) {
      console.error('Erro no logout do mentorado:', error)
      // Forçar logout mesmo com erro
      removeCookie(COOKIE_NAME)
      localStorage.removeItem('mentorado')
      localStorage.removeItem('mentorado_cache')
      localStorage.removeItem('cs_auth_token')
      document.cookie = 'cs_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      setMentorado(null)
      setError(null)
    }
  }

  return (
    <MentoradoAuthContext.Provider
      value={{
        mentorado,
        loading,
        error,
        signIn,
        signOut,
      }}
    >
      {children}
    </MentoradoAuthContext.Provider>
  )
}

export function useMentoradoAuth(): MentoradoAuthContextType {
  const context = useContext(MentoradoAuthContext)
  if (context === undefined) {
    throw new Error('useMentoradoAuth must be used within a MentoradoAuthProvider')
  }
  return context
}