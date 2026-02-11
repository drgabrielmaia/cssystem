import { useState, useCallback, useMemo } from 'react'
import { organizationService, Organization, OrganizationUser } from '@/lib/supabase'
import { useStableData } from './use-stable-data'
import { useStableMutation } from './use-stable-mutation'

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
  isAddingUser: boolean
  isUpdatingUser: boolean
  isRemovingUser: boolean
  error: string | null
}

export function useOrganizationUsers(userId: string | null): UseOrganizationUsersReturn {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  // Use stable hook for organization data
  const {
    data: organizationData,
    loading: orgLoading,
    error: orgError,
    refetch: refetchOrganization
  } = useStableData<any>({
    tableName: 'organization_users',
    select: `
      id,
      organization:organizations(id, name),
      role,
      user_id,
      created_at
    `,
    filters: { user_id: userId },
    dependencies: [userId],
    autoLoad: !!userId,
    debounceMs: 200
  })

  // Use stable hook for users data
  const {
    data: usersData,
    loading: usersLoading,
    error: usersError,
    refetch: refetchUsers
  } = useStableData<any>({
    tableName: 'organization_users',
    select: `
      id,
      email,
      role,
      user_id,
      created_at,
      organization_id
    `,
    filters: organizationId ? { organization_id: organizationId } : {},
    dependencies: [organizationId],
    autoLoad: !!organizationId,
    debounceMs: 200
  })

  // Memoized organization setup
  const organizationSetup = useMemo(() => {
    if (!organizationData?.length) return null
    
    const orgUser = organizationData[0]
    if (!orgUser?.organization) return null
    
    return {
      organization: orgUser.organization,
      role: orgUser.role,
      organizationId: orgUser.organization.id
    }
  }, [organizationData])

  // Update organization state when data changes
  useMemo(() => {
    if (organizationSetup) {
      setOrganization(organizationSetup.organization)
      setCurrentUserRole(organizationSetup.role)
      setOrganizationId(organizationSetup.organizationId)
    } else if (!orgLoading) {
      setOrganization(null)
      setCurrentUserRole(null)
      setOrganizationId(null)
    }
  }, [organizationSetup, orgLoading])

  // Memoized users transformation
  const users = useMemo(() => {
    if (!usersData?.length) return []
    
    return usersData.map((user: any) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.user_id ? 'ativo' : 'pendente',
      created_at: user.created_at
    })) as UserRole[]
  }, [usersData])

  const loading = orgLoading || usersLoading
  const error = orgError || usersError

  // Stable mutation hooks for user operations
  const { mutate: mutateAddUser, isLoading: isAddingUser, error: addUserError } = useStableMutation(
    'organization_users',
    'insert',
    {
      onSuccess: async () => {
        await Promise.all([refetchOrganization(), refetchUsers()])
      },
      debounceMs: 150
    }
  )

  const { mutate: mutateUpdateUser, isLoading: isUpdatingUser, error: updateUserError } = useStableMutation(
    'organization_users', 
    'update',
    {
      onSuccess: async () => {
        await Promise.all([refetchOrganization(), refetchUsers()])
      },
      debounceMs: 150
    }
  )

  const { mutate: mutateRemoveUser, isLoading: isRemovingUser, error: removeUserError } = useStableMutation(
    'organization_users',
    'delete',
    {
      onSuccess: async () => {
        await Promise.all([refetchOrganization(), refetchUsers()])
      },
      debounceMs: 150
    }
  )

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
      // Use service for complex operations that involve multiple steps
      await organizationService.addUserToOrganization(organization.id, email, role)
      await Promise.all([refetchOrganization(), refetchUsers()])
    } catch (error: any) {
      throw new Error(`Erro ao adicionar usuário: ${error.message}`)
    }
  }, [organization, currentUserRole, refetchOrganization, refetchUsers])

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

    await mutateUpdateUser({ id: userId, role })
  }, [currentUserRole, users, mutateUpdateUser])

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

    await mutateRemoveUser(userId)
  }, [currentUserRole, users, mutateRemoveUser])

  // Memoized statistics calculation
  const stats = useMemo(() => ({
    total: users.length,
    owners: users.filter(u => u.role === 'owner').length,
    managers: users.filter(u => u.role === 'manager').length,
    viewers: users.filter(u => u.role === 'viewer').length,
    pending: users.filter(u => u.status === 'pendente').length
  }), [users])

  // Memoized permission checks
  const canManageUsers = useMemo(() => 
    currentUserRole === 'owner' || currentUserRole === 'manager', 
    [currentUserRole]
  )

  const canManageRole = useCallback((userRole: string) => {
    if (currentUserRole === 'owner') return true
    if (currentUserRole === 'manager' && userRole !== 'owner') return true
    return false
  }, [currentUserRole])

  // Stable refresh function
  const refreshData = useCallback(async () => {
    await Promise.all([refetchOrganization(), refetchUsers()])
  }, [refetchOrganization, refetchUsers])

  // Combine all loading states
  const isOperationInProgress = isAddingUser || isUpdatingUser || isRemovingUser

  return {
    users,
    organization,
    currentUserRole,
    loading: loading || isOperationInProgress,
    stats,
    addUser,
    updateUserRole,
    removeUser,
    refreshData,
    canManageUsers,
    canManageRole,
    // Additional status indicators
    isAddingUser,
    isUpdatingUser,
    isRemovingUser,
    error: error || addUserError || updateUserError || removeUserError
  }
}