'use client'

import { Navbar } from '@/components/dashboard/Navbar'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Crown, Shield, User2, Users, Loader2 } from 'lucide-react'
import { useOrganizationFilter } from '@/hooks/use-organization-filter'

export default function DashboardPage() {
  const {
    activeOrganization,
    activeOrganizationId,
    organizationName,
    userRole,
    canManage,
    isOwner,
    loading,
    isReady
  } = useOrganizationFilter()

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-purple-500" />
      case 'manager': return <Shield className="w-4 h-4 text-blue-500" />
      case 'viewer': return <User2 className="w-4 h-4 text-green-500" />
      default: return <User2 className="w-4 h-4 text-gray-400" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'viewer': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <Navbar />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 px-8 py-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Welcome Section */}
            <div className="bg-card p-8 rounded-2xl border">
              <h1 className="text-2xl font-semibold text-foreground mb-4">Dashboard do Customer Success</h1>
              <p className="text-muted-foreground mb-6">
                Bem-vindo ao sistema de Customer Success. Use o menu lateral para navegar pelas funcionalidades.
              </p>

              {/* Organization Info */}
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Carregando informações da organização...</span>
                </div>
              ) : isReady && activeOrganization ? (
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      Organização Ativa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{organizationName}</h3>
                          <p className="text-sm text-gray-600">
                            Owner: {activeOrganization.organization.owner_email}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {userRole && (
                            <Badge variant="outline" className={getRoleBadgeColor(userRole)}>
                              {getRoleIcon(userRole)}
                              <span className="ml-1 capitalize">{userRole}</span>
                            </Badge>
                          )}

                          <div className="text-xs text-gray-500">
                            ID: {activeOrganizationId}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${canManage ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                          <span className="text-gray-600">
                            {canManage ? 'Pode gerenciar dados' : 'Acesso apenas para visualização'}
                          </span>
                        </div>

                        {isOwner && (
                          <div className="flex items-center gap-1">
                            <Crown className="w-3 h-3 text-purple-500" />
                            <span className="text-purple-600 font-medium">Proprietário</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-8 h-8 text-red-500" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Nenhuma organização ativa</h3>
                        <p className="text-sm text-gray-600">
                          Você precisa ser membro de uma organização para acessar o sistema.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Quick Stats - Only show when organization is ready */}
            {isReady && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Dados filtrados por</p>
                        <p className="text-2xl font-bold text-foreground">Organização</p>
                      </div>
                      <Building2 className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Todos os dados são filtrados pela organização ativa
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Seu acesso</p>
                        <p className="text-2xl font-bold text-foreground capitalize">{userRole}</p>
                      </div>
                      {userRole && getRoleIcon(userRole)}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {canManage ? 'Pode criar e editar' : 'Apenas visualização'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Multi-tenant</p>
                        <p className="text-2xl font-bold text-foreground">Ativo</p>
                      </div>
                      <Users className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Sistema isolado por organização
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}