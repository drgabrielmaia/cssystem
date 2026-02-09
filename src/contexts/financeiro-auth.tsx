'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface UsuarioFinanceiro {
  id: string
  nome: string
  email: string
  nivel_acesso: 'admin' | 'operador'
  status: 'ativo' | 'inativo'
  created_at: string
}

interface FinanceiroAuthContextType {
  usuario: UsuarioFinanceiro | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
}

const FinanceiroAuthContext = createContext<FinanceiroAuthContextType | undefined>(undefined)

export function FinanceiroAuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioFinanceiro | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // Verificar se é usuário do financeiro
        const { data: usuarioFinanceiro, error } = await supabase
          .from('usuarios_financeiro')
          .select('*')
          .eq('email', session.user.email)
          .eq('status', 'ativo')
          .single()

        if (usuarioFinanceiro && !error) {
          setUsuario(usuarioFinanceiro)
        }
      }
    } catch (error) {
      console.error('Erro ao verificar usuário financeiro:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      // Primeiro, verificar se o usuário existe na tabela usuarios_financeiro
      const { data: usuarioFinanceiro, error: userError } = await supabase
        .from('usuarios_financeiro')
        .select('*')
        .eq('email', email)
        .eq('status', 'ativo')
        .single()

      if (userError || !usuarioFinanceiro) {
        setError('Usuário não encontrado ou inativo')
        return false
      }

      // Tentar fazer login no Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError('Email ou senha incorretos')
        return false
      }

      if (data.user) {
        setUsuario(usuarioFinanceiro)
        return true
      }

      return false
    } catch (error) {
      console.error('Erro no login:', error)
      setError('Erro interno. Tente novamente.')
      return false
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUsuario(null)
      setError(null)
    } catch (error) {
      console.error('Erro no logout:', error)
    }
  }

  return (
    <FinanceiroAuthContext.Provider value={{
      usuario,
      loading,
      error,
      signIn,
      signOut,
    }}>
      {children}
    </FinanceiroAuthContext.Provider>
  )
}

export function useFinanceiroAuth() {
  const context = useContext(FinanceiroAuthContext)
  if (context === undefined) {
    throw new Error('useFinanceiroAuth must be used within a FinanceiroAuthProvider')
  }
  return context
}