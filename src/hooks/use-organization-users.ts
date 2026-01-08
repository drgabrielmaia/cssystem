import { useState, useEffect, useCallback } from 'react'
import { organizationService, Organization, OrganizationUser } from '@/lib/supabase'

interface UserRole {
  id: string
  email: string
  role: 'owner' | 'manager' | 'viewer'
  status: 'ativo' | 'pendente'
  created_at: string
}

interface OrganizationData {
  organization: Organization | null
  currentUserRole: string | null
}

interface UseOrganizationUsersReturn {
  users: UserRole[]
  organization: Organization | null
  currentUserRole: string | null
  loading: boolean
  stats: {
    total: number
    owners: number
    managers: number
    viewers: number
    pending: number
  }
  addUser: (email: string, role: 'owner' | 'manager' | 'viewer') => Promise<void>
  updateUserRole: (userId: string, role: 'owner' | 'manager' | 'viewer') => Promise<void>
  removeUser: (userId: string) => Promise<void>
  refreshData: () => Promise<void>
  canManageUsers: boolean
  canManageRole: (userRole: string) => boolean
}

export function useOrganizationUsers(userId: string | null): UseOrganizationUsersReturn {
  const [users, setUsers] = useState<UserRole[]>([])
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Buscar organização do usuário
      const { organization: orgData, role } = await organizationService.getUserOrganization(userId)

      setOrganization(orgData)
      setCurrentUserRole(role)

      // Buscar todos os usuários da organização
      const usersData = await organizationService.getOrganizationUsers(orgData.id)

      // Transformar dados para o formato necessário
      const transformedUsers: UserRole[] = usersData.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.user_id ? 'ativo' : 'pendente',
        created_at: user.created_at
      }))

      setUsers(transformedUsers)

    } catch (error: any) {
      console.error('Erro ao carregar dados da organização:', error)
      setOrganization(null)
      setCurrentUserRole(null)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Função para adicionar usuário
  const addUser = useCallback(async (email: string, role: 'owner' | 'manager' | 'viewer') => {
    if (!organization || !currentUserRole) {
      throw new Error('Dados da organização não carregados')
    }

    // Verificar permissões
    if (currentUserRole === 'viewer') {
      throw new Error('Você não tem permissão para adicionar usuários')
    }

    if (currentUserRole === 'manager' && role === 'owner') {
      throw new Error('Apenas owners podem adicionar outros owners')
    }

    try {
      await organizationService.addUserToOrganization(organization.id, email, role)
      await loadData() // Recarregar dados
    } catch (error: any) {
      throw new Error(`Erro ao adicionar usuário: ${error.message}`)
    }
  }, [organization, currentUserRole, loadData])

  // Função para atualizar role do usuário
  const updateUserRole = useCallback(async (userId: string, role: 'owner' | 'manager' | 'viewer') => {
    if (!currentUserRole) {
      throw new Error('Permissões não carregadas')
    }

    const userToUpdate = users.find(u => u.id === userId)
    if (!userToUpdate) {
      throw new Error('Usuário não encontrado')
    }

    // Verificar permissões
    if (currentUserRole === 'viewer') {
      throw new Error('Você não tem permissão para editar usuários')
    }

    if (currentUserRole === 'manager' && (role === 'owner' || userToUpdate.role === 'owner')) {
      throw new Error('Apenas owners podem gerenciar outros owners')
    }

    try {
      await organizationService.updateUserRole(userId, role)
      await loadData() // Recarregar dados
    } catch (error: any) {
      throw new Error(`Erro ao atualizar usuário: ${error.message}`)
    }
  }, [currentUserRole, users, loadData])

  // Função para remover usuário
  const removeUser = useCallback(async (userId: string) => {
    if (!currentUserRole) {
      throw new Error('Permissões não carregadas')
    }

    const userToRemove = users.find(u => u.id === userId)
    if (!userToRemove) {
      throw new Error('Usuário não encontrado')
    }

    // Verificar permissões
    if (currentUserRole === 'viewer') {
      throw new Error('Você não tem permissão para remover usuários')
    }

    if (currentUserRole === 'manager' && userToRemove.role === 'owner') {
      throw new Error('Apenas owners podem remover outros owners')
    }

    try {
      await organizationService.removeUserFromOrganization(userId)
      await loadData() // Recarregar dados
    } catch (error: any) {
      throw new Error(`Erro ao remover usuário: ${error.message}`)
    }
  }, [currentUserRole, users, loadData])

  // Calcular estatísticas
  const stats = {
    total: users.length,
    owners: users.filter(u => u.role === 'owner').length,
    managers: users.filter(u => u.role === 'manager').length,
    viewers: users.filter(u => u.role === 'viewer').length,
    pending: users.filter(u => u.status === 'pendente').length
  }

  // Verificar se pode gerenciar usuários
  const canManageUsers = currentUserRole === 'owner' || currentUserRole === 'manager'

  // Verificar se pode gerenciar role específica
  const canManageRole = useCallback((userRole: string) => {
    if (currentUserRole === 'owner') return true
    if (currentUserRole === 'manager' && userRole !== 'owner') return true
    return false
  }, [currentUserRole])

  return {
    users,
    organization,
    currentUserRole,
    loading,
    stats,
    addUser,
    updateUserRole,
    removeUser,
    refreshData: loadData,
    canManageUsers,
    canManageRole
  }
}