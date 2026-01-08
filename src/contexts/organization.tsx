'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useAuth } from '@/contexts/auth'
import { useUserOrganizations } from '@/hooks/use-user-organizations'

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

interface OrganizationContextType {
  organizations: UserOrganization[]
  activeOrganization: UserOrganization | undefined
  activeOrganizationId: string | null
  loading: boolean
  error: string | null
  switchOrganization: (organizationId: string) => void
  refreshOrganizations: () => Promise<void>
  hasMultipleOrganizations: boolean
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const organizationData = useUserOrganizations(user?.id || null)

  return (
    <OrganizationContext.Provider value={organizationData}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganizationContext(): OrganizationContextType {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganizationContext must be used within an OrganizationProvider')
  }
  return context
}

// Hook conveniente para obter apenas a organização ativa
export function useActiveOrganization() {
  const { activeOrganization, activeOrganizationId, loading } = useOrganizationContext()
  return { activeOrganization, activeOrganizationId, loading }
}