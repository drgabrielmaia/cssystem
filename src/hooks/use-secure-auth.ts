'use client'

import { useAuth } from '@/contexts/auth'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getToken, apiFetch } from '@/lib/api'

export function useSecureAuth() {
  const auth = useAuth()
  const [isValidated, setIsValidated] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Validação adicional server-side que não pode ser burlada
  const validateServerSide = async () => {
    if (!auth.user || auth.loading) {
      setIsValidated(false)
      return false
    }

    try {
      // If using custom JWT (Docker PostgreSQL), validate via API
      const customToken = getToken()
      if (customToken) {
        try {
          const res = await apiFetch('/auth/me')
          if (res.ok) {
            setValidationError(null)
            setIsValidated(true)
            return true
          }
        } catch (e) {
          // JWT invalid
        }
        setValidationError('Sessão expirada')
        setIsValidated(false)
        return false
      }

      // Supabase flow
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        setValidationError('Sessão expirada')
        setIsValidated(false)
        return false
      }

      if (session.user.id !== auth.user.id) {
        setValidationError('Dados de usuário inconsistentes')
        setIsValidated(false)
        return false
      }

      const { data: orgUser, error: orgError } = await supabase
        .from('organization_users')
        .select('is_active, organization_id, role, email')
        .eq('email', session.user.email)
        .eq('is_active', true)
        .single()

      if (orgError || !orgUser) {
        setValidationError('Usuário sem permissão')
        setIsValidated(false)
        return false
      }

      if (orgUser.organization_id !== auth.organizationId) {
        setValidationError('Dados de organização inconsistentes')
        setIsValidated(false)
        return false
      }

      setValidationError(null)
      setIsValidated(true)
      return true

    } catch (error) {
      console.error('Erro na validação de segurança:', error)
      setValidationError('Erro de validação')
      setIsValidated(false)
      return false
    }
  }

  // Executar validação quando auth mudar
  useEffect(() => {
    if (!auth.loading) {
      validateServerSide()
    }
  }, [auth.user, auth.organizationId, auth.loading])

  // Revalidar periodicamente (anti-tamper)
  useEffect(() => {
    if (!auth.loading && auth.isAuthenticated) {
      const interval = setInterval(() => {
        console.log('🔄 Revalidação de segurança automática...')
        validateServerSide()
      }, 5 * 60 * 1000) // A cada 5 minutos

      return () => clearInterval(interval)
    }
  }, [auth.loading, auth.isAuthenticated])

  return {
    ...auth,
    isSecurelyValidated: isValidated && auth.isAuthenticated,
    validationError,
    revalidate: validateServerSide
  }
}