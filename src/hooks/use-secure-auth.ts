'use client'

import { useAuth } from '@/contexts/auth'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
      console.log('🔒 Validação de segurança server-side...')
      
      // 1. Verificar se sessão ainda é válida no servidor
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.user) {
        console.error('❌ Sessão inválida no servidor:', sessionError)
        setValidationError('Sessão expirada')
        setIsValidated(false)
        return false
      }

      // 2. Verificar se user ID bate
      if (session.user.id !== auth.user.id) {
        console.error('❌ User ID não confere')
        setValidationError('Dados de usuário inconsistentes')
        setIsValidated(false)
        return false
      }

      // 3. Revalidar organização no servidor
      const { data: orgUser, error: orgError } = await supabase
        .from('organization_users')
        .select('is_active, organization_id, role, email')
        .eq('email', session.user.email)
        .eq('is_active', true)
        .single()

      if (orgError || !orgUser) {
        console.error('❌ Usuário sem organização válida:', orgError)
        setValidationError('Usuário sem permissão')
        setIsValidated(false)
        return false
      }

      // 4. Verificar se organização bate com contexto
      if (orgUser.organization_id !== auth.organizationId) {
        console.error('❌ Organization ID não confere')
        setValidationError('Dados de organização inconsistentes')
        setIsValidated(false)
        return false
      }

      console.log('✅ Validação de segurança passou')
      setValidationError(null)
      setIsValidated(true)
      return true

    } catch (error) {
      console.error('❌ Erro na validação de segurança:', error)
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