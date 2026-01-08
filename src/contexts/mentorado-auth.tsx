'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
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

  // Função para obter cookie
  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null

    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null
    }
    return null
  }

  // Função para definir cookie
  const setCookie = (name: string, value: string, days = 7) => {
    if (typeof document === 'undefined') return

    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
  }

  // Função para remover cookie
  const removeCookie = (name: string) => {
    if (typeof document === 'undefined') return

    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
  }

  // Verificar autenticação no carregamento
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true)
        setError(null)

        // Verificar cookie
        const mentoradoId = getCookie(COOKIE_NAME)

        if (mentoradoId) {
          // Buscar dados atualizados do mentorado
          const { data: mentoradoData, error: fetchError } = await supabase
            .from('mentorados')
            .select('*')
            .eq('id', mentoradoId)
            .eq('status_login', 'ativo')
            .single()

          if (fetchError || !mentoradoData) {
            // Cookie inválido ou usuário inativo
            removeCookie(COOKIE_NAME)
            localStorage.removeItem('mentorado') // Limpar localStorage legado
          } else {
            setMentorado(mentoradoData)
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
        }
      } catch (error: any) {
        console.error('Erro ao verificar autenticação do mentorado:', error)
        setError('Erro ao verificar autenticação')
        removeCookie(COOKIE_NAME)
        localStorage.removeItem('mentorado')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null)

      // Buscar mentorado pelo email
      const { data: mentoradoData, error: fetchError } = await supabase
        .from('mentorados')
        .select('*')
        .eq('email', email)
        .eq('status_login', 'ativo')
        .single()

      if (fetchError || !mentoradoData) {
        setError('Email não encontrado ou conta inativa')
        return false
      }

      // Verificar senha (aceita qualquer senha se password_hash for null, senão verifica)
      if (!mentoradoData.password_hash || mentoradoData.password_hash === password) {
        setMentorado(mentoradoData)
        setCookie(COOKIE_NAME, mentoradoData.id)

        // Limpar localStorage legado se existir
        localStorage.removeItem('mentorado')

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