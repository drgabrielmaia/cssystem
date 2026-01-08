import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface UserOrganization {
  id: string
  organization_id: string
  role: 'owner' | 'manager' | 'viewer'
  email: string
  user_id: string
  created_at: string
  organization: {
    id: string
    name: string
    owner_email: string
    created_at: string
  }
}

export function useUserOrganizations(userId: string | null) {
  const [organizations, setOrganizations] = useState<UserOrganization[]>([])
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUserOrganizations = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Buscar todas as organizações onde o usuário é membro ativo
      const { data, error: fetchError } = await supabase
        .from('organization_users')
        .select(`
          id,
          organization_id,
          role,
          email,
          user_id,
          created_at,
          organizations (
            id,
            name,
            owner_email,
            created_at
          )
        `)
        .eq('user_id', userId) // Apenas organizações onde já foi aceito

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      const userOrgs = (data || []).map(item => ({
        ...item,
        organization: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations
      }))
      setOrganizations(userOrgs)

      // Se há organizações e nenhuma está ativa, selecionar a primeira
      if (userOrgs.length > 0 && !activeOrganizationId) {
        // Pegar da localStorage se existir, senão usar a primeira
        const savedOrgId = localStorage.getItem('activeOrganizationId')
        const validSavedOrg = userOrgs.find(org => org.organization_id === savedOrgId)

        if (validSavedOrg) {
          setActiveOrganizationId(savedOrgId)
        } else {
          // Priorizar organizações onde é owner, depois manager, depois viewer
          const sortedOrgs = [...userOrgs].sort((a, b) => {
            const roleOrder: Record<string, number> = { owner: 0, manager: 1, viewer: 2 }
            return roleOrder[a.role] - roleOrder[b.role]
          })
          setActiveOrganizationId(sortedOrgs[0].organization_id)
        }
      }

    } catch (error: any) {
      console.error('Erro ao carregar organizações do usuário:', error)
      setError(error.message)
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }, [userId, activeOrganizationId])

  useEffect(() => {
    loadUserOrganizations()
  }, [loadUserOrganizations])

  // Salvar organização ativa no localStorage
  useEffect(() => {
    if (activeOrganizationId) {
      localStorage.setItem('activeOrganizationId', activeOrganizationId)
    }
  }, [activeOrganizationId])

  const switchOrganization = useCallback((organizationId: string) => {
    const org = organizations.find(org => org.organization_id === organizationId)
    if (org) {
      setActiveOrganizationId(organizationId)
      // Recarregar a página para garantir que todos os dados sejam atualizados
      // com a nova organização
      setTimeout(() => {
        window.location.reload()
      }, 100)
    }
  }, [organizations])

  const activeOrganization = organizations.find(org => org.organization_id === activeOrganizationId)

  return {
    organizations,
    activeOrganization,
    activeOrganizationId,
    loading,
    error,
    switchOrganization,
    refreshOrganizations: loadUserOrganizations,
    hasMultipleOrganizations: organizations.length > 1
  }
}