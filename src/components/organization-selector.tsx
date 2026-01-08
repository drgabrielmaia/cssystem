'use client'

import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building2,
  ChevronDown,
  Crown,
  Shield,
  User2,
  Check,
  Loader2
} from 'lucide-react'
import { useOrganizationContext } from '@/contexts/organization'

export function OrganizationSelector() {
  const {
    organizations,
    activeOrganization,
    loading,
    switchOrganization,
    hasMultipleOrganizations
  } = useOrganizationContext()

  const [switching, setSwitching] = useState<string | null>(null)

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-3 h-3 text-purple-400" />
      case 'manager': return <Shield className="w-3 h-3 text-blue-400" />
      case 'viewer': return <User2 className="w-3 h-3 text-green-400" />
      default: return <User2 className="w-3 h-3 text-gray-400" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      case 'manager': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'viewer': return 'bg-green-500/20 text-green-300 border-green-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const handleSwitchOrganization = async (orgId: string) => {
    setSwitching(orgId)
    await switchOrganization(orgId)
    // switching state será resetado quando a página recarregar
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800/50 border border-gray-700/50">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-400">Carregando...</span>
      </div>
    )
  }

  if (!activeOrganization) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/30">
        <Building2 className="w-4 h-4 text-red-400" />
        <span className="text-sm text-red-300">Sem organização</span>
      </div>
    )
  }

  // Se tem apenas uma organização, mostrar sem dropdown
  if (!hasMultipleOrganizations) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
        <div className="w-6 h-6 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
          <Building2 className="w-3 h-3 text-white" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-white truncate max-w-32">
            {activeOrganization.organization.name}
          </span>
          <div className="flex items-center gap-1">
            {getRoleIcon(activeOrganization.role)}
            <span className="text-xs text-gray-400 capitalize">{activeOrganization.role}</span>
          </div>
        </div>
      </div>
    )
  }

  // Se tem múltiplas organizações, mostrar com dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-3 py-2 h-auto bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 hover:from-cyan-500/30 hover:to-purple-500/30 transition-all duration-200"
        >
          <div className="w-6 h-6 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
            <Building2 className="w-3 h-3 text-white" />
          </div>
          <div className="flex flex-col items-start min-w-0">
            <span className="text-sm font-semibold text-white truncate max-w-32">
              {activeOrganization.organization.name}
            </span>
            <div className="flex items-center gap-1">
              {getRoleIcon(activeOrganization.role)}
              <span className="text-xs text-gray-400 capitalize">{activeOrganization.role}</span>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-80 bg-gray-900/95 backdrop-blur-md border-gray-700/50 shadow-2xl"
        align="start"
      >
        <DropdownMenuLabel className="text-gray-300 font-medium">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400" />
            Alternar Organização
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700/50" />

        <div className="max-h-64 overflow-y-auto">
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.organization_id}
              onClick={() => handleSwitchOrganization(org.organization_id)}
              disabled={switching === org.organization_id}
              className="p-3 hover:bg-gray-800/50 cursor-pointer transition-colors duration-200"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    org.organization_id === activeOrganization?.organization_id
                      ? 'bg-gradient-to-br from-cyan-400 to-purple-500'
                      : 'bg-gray-700/50'
                  }`}>
                    <Building2 className={`w-5 h-5 ${
                      org.organization_id === activeOrganization?.organization_id
                        ? 'text-white'
                        : 'text-gray-400'
                    }`} />
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">
                        {org.organization.name}
                      </span>
                      {org.organization_id === activeOrganization?.organization_id && (
                        <Check className="w-4 h-4 text-green-400 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-xs ${getRoleBadgeColor(org.role)}`}>
                        {getRoleIcon(org.role)}
                        <span className="ml-1 capitalize">{org.role}</span>
                      </Badge>

                      <span className="text-xs text-gray-500 truncate">
                        por {org.organization.owner_email}
                      </span>
                    </div>
                  </div>
                </div>

                {switching === org.organization_id && (
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}