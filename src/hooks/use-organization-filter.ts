import { useActiveOrganization } from '@/contexts/organization'

/**
 * Hook para aplicar filtros baseados na organização ativa
 * Retorna filtros padrão para queries do Supabase
 */
export function useOrganizationFilter() {
  const { activeOrganization, activeOrganizationId, loading } = useActiveOrganization()

  const getOrganizationFilter = () => {
    if (!activeOrganizationId) return null

    return {
      organization_id: activeOrganizationId,
    }
  }

  const getOrganizationUserFilter = () => {
    if (!activeOrganization?.user_id) return null

    return {
      user_id: activeOrganization.user_id,
      organization_id: activeOrganizationId,
    }
  }

  // Helper para adicionar filtros de organização em queries
  const applyOrganizationFilter = (query: any) => {
    const filter = getOrganizationFilter()
    if (filter) {
      return query.eq('organization_id', filter.organization_id)
    }
    return query
  }

  return {
    activeOrganization,
    activeOrganizationId,
    loading,
    isReady: !!activeOrganizationId && !loading,
    getOrganizationFilter,
    getOrganizationUserFilter,
    applyOrganizationFilter,
    // Informações da organização para exibição
    organizationName: activeOrganization?.organization.name || 'Sem organização',
    userRole: activeOrganization?.role || null,
    canManage: activeOrganization?.role === 'owner' || activeOrganization?.role === 'manager',
    isOwner: activeOrganization?.role === 'owner',
  }
}