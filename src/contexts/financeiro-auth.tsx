'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface UsuarioFinanceiro {
  id: string
  nome: string
  email: string
  cargo: string
  permissoes: {
    dashboard: boolean
    transacoes: boolean
    orcamentos: boolean
    relatorios: boolean
    usuarios: boolean
  }
  ativo: boolean
  organization_id: string
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
        // Verificar se é usuário da organização com permissões financeiras
        const { data: orgUser, error } = await supabase
          .from('organization_users')
          .select(`
            id,
            email,
            role,
            is_active,
            organization_id,
            created_at,
            organization:organizations(name)
          `)
          .eq('email', session.user.email)
          .eq('is_active', true)
          .single()

        if (orgUser && !error) {
          // Mapear para formato financeiro
          const usuarioFinanceiro: UsuarioFinanceiro = {
            id: orgUser.id,
            nome: orgUser.email.split('@')[0],
            email: orgUser.email,
            cargo: orgUser.role || 'Operador',
            permissoes: {
              dashboard: true,
              transacoes: orgUser.role === 'admin' || orgUser.role === 'financeiro',
              orcamentos: orgUser.role === 'admin',
              relatorios: true,
              usuarios: orgUser.role === 'admin'
            },
            ativo: orgUser.is_active,
            organization_id: orgUser.organization_id,
            created_at: orgUser.created_at
          }
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

      // Verificar se é usuário da organização
      const { data: orgUser, error: userError } = await supabase
        .from('organization_users')
        .select(`
          id,
          email,
          role,
          is_active,
          organization_id,
          created_at,
          organization:organizations(name)
        `)
        .eq('email', email)
        .eq('is_active', true)
        .single()

      if (userError || !orgUser) {
        setError('Usuário não encontrado ou sem acesso ao sistema financeiro')
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
        const usuarioFinanceiro: UsuarioFinanceiro = {
          id: orgUser.id,
          nome: orgUser.email.split('@')[0],
          email: orgUser.email,
          cargo: orgUser.role || 'Operador',
          permissoes: {
            dashboard: true,
            transacoes: orgUser.role === 'admin' || orgUser.role === 'financeiro',
            orcamentos: orgUser.role === 'admin',
            relatorios: true,
            usuarios: orgUser.role === 'admin'
          },
          ativo: orgUser.is_active,
          organization_id: orgUser.organization_id,
          created_at: orgUser.created_at
        }
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