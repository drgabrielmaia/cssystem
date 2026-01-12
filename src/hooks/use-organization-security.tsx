import { useState, useEffect } from 'react'
import React from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'

interface OrganizationSecurityResult {
  hasOrganization: boolean
  organizationId: string | null
  userRole: string | null
  loading: boolean
  isAuthorized: (requiredRoles?: string[]) => boolean
  blockUnauthorized: () => void
}

/**
 * Hook para controle de segurança organizacional
 *
 * IMPORTANTE: Este é uma proteção TEMPORÁRIA no frontend
 * A proteção real deve ser feita via RLS no Supabase!
 *
 * USO:
 * const { hasOrganization, isAuthorized, blockUnauthorized } = useOrganizationSecurity()
 *
 * if (!hasOrganization) {
 *   return <NoAccessComponent />
 * }
 */
export function useOrganizationSecurity(): OrganizationSecurityResult {
  const { user } = useAuth()
  const [hasOrganization, setHasOrganization] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkOrganizationAccess() {
      if (!user?.id) {
        setHasOrganization(false)
        setOrganizationId(null)
        setUserRole(null)
        setLoading(false)
        return
      }

      try {
        console.log('🔒 Verificando acesso organizacional para:', user.email)

        const { data: orgUser, error } = await supabase
          .from('organization_users')
          .select('organization_id, role, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        if (error || !orgUser) {
          console.warn('⚠️ Usuário SEM organização:', user.email)
          setHasOrganization(false)
          setOrganizationId(null)
          setUserRole(null)
        } else {
          console.log('✅ Usuário COM organização:', {
            email: user.email,
            org: orgUser.organization_id,
            role: orgUser.role
          })
          setHasOrganization(true)
          setOrganizationId(orgUser.organization_id)
          setUserRole(orgUser.role)
        }
      } catch (error) {
        console.error('❌ Erro ao verificar organização:', error)
        setHasOrganization(false)
        setOrganizationId(null)
        setUserRole(null)
      } finally {
        setLoading(false)
      }
    }

    checkOrganizationAccess()
  }, [user?.id])

  const isAuthorized = (requiredRoles?: string[]): boolean => {
    if (!hasOrganization) return false
    if (!requiredRoles) return true
    if (!userRole) return false

    return requiredRoles.includes(userRole)
  }

  const blockUnauthorized = (): void => {
    if (!hasOrganization) {
      console.error('🚨 ACESSO BLOQUEADO: Usuário sem organização tentando acessar dados sensíveis')
      throw new Error('Acesso negado: usuário não pertence a nenhuma organização')
    }
  }

  return {
    hasOrganization,
    organizationId,
    userRole,
    loading,
    isAuthorized,
    blockUnauthorized
  }
}

/**
 * Componente de proteção para páginas sensíveis
 */
export function OrganizationGuard({
  children,
  requiredRoles,
  fallback
}: {
  children: React.ReactNode
  requiredRoles?: string[]
  fallback?: React.ReactNode
}) {
  const { hasOrganization, userRole, loading, isAuthorized } = useOrganizationSecurity()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  if (!hasOrganization) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 19c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Acesso Restrito</h1>
          <p className="text-gray-600 mb-4">
            Você não está associado a nenhuma organização. Entre em contato com o administrador para solicitar acesso.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    )
  }

  if (requiredRoles && !isAuthorized(requiredRoles)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Permissão Insuficiente</h1>
          <p className="text-gray-600 mb-4">
            Seu nível de acesso ({userRole}) não permite acessar esta página.
            <br />
            Níveis necessários: {requiredRoles?.join(', ')}
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}