'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Mentorado {
  id: string
  nome: string
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

export function MentoradoAuthProvider({ children }: { children: ReactNode }) {
  const [mentorado, setMentorado] = useState<Mentorado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mentoradoRef = useRef<Mentorado | null>(null)

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

  // Função para verificar se o mentorado deve ter acesso bloqueado
  const shouldBlockAccess = (mentoradoData: any): { blocked: boolean, reason?: string } => {
    // 1. Verificar se foi marcado como churn ou excluído
    if (mentoradoData.estado_atual === 'churn') {
      return { blocked: true, reason: 'Conta marcada como churn' }
    }

    // 2. Verificar se completou 12 meses desde a data de entrada
    if (mentoradoData.data_entrada) {
      const dataEntrada = new Date(mentoradoData.data_entrada)
      const agora = new Date()
      const diferencaEmMeses = (agora.getFullYear() - dataEntrada.getFullYear()) * 12 + (agora.getMonth() - dataEntrada.getMonth())

      if (diferencaEmMeses >= 12) {
        return { blocked: true, reason: 'Período de acesso expirado (12 meses)' }
      }
    }

    // 3. Verificar se status_login está inativo
    if (mentoradoData.status_login !== 'ativo') {
      return { blocked: true, reason: 'Status de login inativo' }
    }

    return { blocked: false }
  }

  // Função para verificar autenticação (reutilizável)
  const checkAuth = async () => {
    try {
      setLoading(true)
      setError(null)

      // Debug: Verificar dispositivo
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      console.log('📱 Dispositivo:', isMobile ? 'MOBILE' : 'DESKTOP')

      // Verificar cookie
      const mentoradoId = getCookie(COOKIE_NAME)
      console.log('🔍 Cookie mentorado_auth:', mentoradoId ? 'ENCONTRADO' : 'NÃO ENCONTRADO')

      if (mentoradoId) {
        // Buscar dados atualizados do mentorado
        const { data: mentoradoData, error: fetchError } = await supabase
          .from('mentorados')
          .select('*')
          .eq('id', mentoradoId)
          .single()

        if (fetchError || !mentoradoData) {
          // Cookie inválido ou usuário não encontrado
          removeCookie(COOKIE_NAME)
          localStorage.removeItem('mentorado') // Limpar localStorage legado
          setMentorado(null)
        } else {
          // Verificar se deve ter acesso bloqueado
          const accessCheck = shouldBlockAccess(mentoradoData)

          if (accessCheck.blocked) {
            console.log('🚫 Acesso bloqueado:', accessCheck.reason)
            setError(accessCheck.reason || 'Acesso bloqueado')
            removeCookie(COOKIE_NAME)
            localStorage.removeItem('mentorado')
            setMentorado(null)
          } else {
            setMentorado(mentoradoData)
          }
        }
      } else {
        // Migrar do localStorage para cookie se existir
        const savedMentorado = localStorage.getItem('mentorado')
        if (savedMentorado) {
          try {
            const mentoradoData = JSON.parse(savedMentorado)

            // Verificar se ainda é válido no banco
            const { data: currentData, error: fetchError } = await supabase
              .from('mentorados')
              .select('*')
              .eq('id', mentoradoData.id)
              .eq('status_login', 'ativo')
              .single()

            if (!fetchError && currentData) {
              setMentorado(currentData)
              setCookie(COOKIE_NAME, currentData.id)
            }

            // Limpar localStorage
            localStorage.removeItem('mentorado')
          } catch (e) {
            localStorage.removeItem('mentorado')
          }
        }

        // Se não encontrou nada, garantir que está null
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

  // Verificar autenticação no carregamento e monitorar mudanças
  useEffect(() => {
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

      // Buscar mentorado pelo email (case-insensitive)
      const { data: mentoradoData, error: fetchError } = await supabase
        .from('mentorados')
        .select('*')
        .ilike('email', email)
        .single()

      console.log('📊 Resultado da busca:', { mentoradoData, fetchError })

      if (fetchError) {
        console.error('❌ Erro na busca:', fetchError)
        if (fetchError.code === 'PGRST116') {
          setError('Email não encontrado')
        } else {
          setError('Erro ao buscar usuário: ' + fetchError.message)
        }
        return false
      }

      if (!mentoradoData) {
        setError('Email não encontrado')
        return false
      }

      console.log('👤 Mentorado encontrado:', {
        nome: mentoradoData.nome,
        email: mentoradoData.email,
        status_login: mentoradoData.status_login,
        estado_atual: mentoradoData.estado_atual
      })

      // Verificar se deve ter acesso bloqueado ANTES de validar senha
      const accessCheck = shouldBlockAccess(mentoradoData)
      if (accessCheck.blocked) {
        console.log('🚫 Acesso bloqueado:', accessCheck.reason)
        setError(accessCheck.reason || 'Acesso bloqueado')
        return false
      }

      // Verificar senha (aceita qualquer senha se password_hash for null, senão verifica)
      if (!mentoradoData.password_hash || mentoradoData.password_hash === password) {
        setMentorado(mentoradoData)
        setCookie(COOKIE_NAME, mentoradoData.id)

        // Limpar localStorage legado se existir
        localStorage.removeItem('mentorado')

        // Disparar evento customizado para notificar outros componentes
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('mentoradoLoginSuccess'))
        }, 50)

        return true
      } else {
        setError('Senha incorreta')
        return false
      }
    } catch (error: any) {
      console.error('Erro no login do mentorado:', error)
      setError('Erro ao fazer login')
      return false
    }
  }

  const signOut = async (): Promise<void> => {
    try {
      removeCookie(COOKIE_NAME)
      localStorage.removeItem('mentorado') // Limpar localStorage legado
      setMentorado(null)
      setError(null)
    } catch (error: any) {
      console.error('Erro no logout do mentorado:', error)
      // Forçar logout mesmo com erro
      removeCookie(COOKIE_NAME)
      localStorage.removeItem('mentorado')
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