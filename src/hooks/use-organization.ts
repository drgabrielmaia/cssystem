import { useState, useEffect, useCallback } from 'react'
import { organizationService, Organization } from '@/lib/supabase'

interface OrganizationStats {
  totalMembers: number
  activeMembers: number
  pendingMembers: number
  owners: number
  managers: number
  viewers: number
  createdAt: string
}

interface UseOrganizationReturn {
  organization: Organization | null
  currentUserRole: string | null
  stats: OrganizationStats | null
  loading: boolean
  error: string | null
  updateOrganization: (updates: { name?: string; comissao_fixa_indicacao?: number }) => Promise<void>
  deleteOrganization: () => Promise<void>
  refreshData: () => Promise<void>
  canManageOrganization: boolean
}

export function useOrganization(userId: string | null): UseOrganizationReturn {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [stats, setStats] = useState<OrganizationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Buscar organização do usuário
      const result = await organizationService.getUserOrganization(userId)
      
      if (!result) {
        setOrganization(null)
        setCurrentUserRole(null)
        setStats(null)
        return
      }

      const { organization: orgData, role } = result
      setOrganization(orgData)
      setCurrentUserRole(role)

      // Buscar estatísticas da organização
      const statsData = await organizationService.getOrganizationStats(orgData.id)
      setStats(statsData)

    } catch (error: any) {
      console.error('Erro ao carregar dados da organização:', error)
      setError(error.message || 'Erro ao carregar dados da organização')
      setOrganization(null)
      setCurrentUserRole(null)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Função para atualizar organização
  const updateOrganization = useCallback(async (updates: { name?: string; comissao_fixa_indicacao?: number }) => {
    if (!organization || !currentUserRole) {
      throw new Error('Dados da organização não carregados')
    }

    // Verificar permissões - apenas owners podem atualizar
    if (currentUserRole !== 'owner') {
      throw new Error('Apenas owners podem editar a organização')
    }

    try {
      const updatedOrg = await organizationService.updateOrganization(organization.id, updates)
      setOrganization(updatedOrg)
    } catch (error: any) {
      throw new Error(`Erro ao atualizar organização: ${error.message}`)
    }
  }, [organization, currentUserRole])

  // Função para deletar organização
  const deleteOrganization = useCallback(async () => {
    if (!organization || !currentUserRole) {
      throw new Error('Dados da organização não carregados')
    }

    // Verificar permissões - apenas owners podem deletar
    if (currentUserRole !== 'owner') {
      throw new Error('Apenas owners podem deletar a organização')
    }

    try {
      await organizationService.deleteOrganization(organization.id)
      setOrganization(null)
      setCurrentUserRole(null)
      setStats(null)
    } catch (error: any) {
      throw new Error(`Erro ao deletar organização: ${error.message}`)
    }
  }, [organization, currentUserRole])

  // Verificar se pode gerenciar organização
  const canManageOrganization = currentUserRole === 'owner'

  return {
    organization,
    currentUserRole,
    stats,
    loading,
    error,
    updateOrganization,
    deleteOrganization,
    refreshData: loadData,
    canManageOrganization
  }
}