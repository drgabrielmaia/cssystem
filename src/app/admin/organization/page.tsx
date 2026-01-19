'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Building2,
  Users,
  Crown,
  Shield,
  User2,
  Mail,
  CalendarDays,
  Edit,
  Trash2,
  Settings,
  UserCheck,
  AlertTriangle,
  ExternalLink,
  DollarSign
} from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { useOrganization } from '@/hooks/use-organization'
import Link from 'next/link'

export default function OrganizationManagementPage() {
  const [isEditNameOpen, setIsEditNameOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isEditCommissionOpen, setIsEditCommissionOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [newCommissionValue, setNewCommissionValue] = useState('')

  const { user } = useAuth()

  const {
    organization,
    currentUserRole,
    stats,
    loading,
    error,
    updateOrganization,
    deleteOrganization,
    canManageOrganization
  } = useOrganization(user?.id || null)

  const editarNome = async () => {
    if (!newName.trim()) return

    try {
      await updateOrganization({ name: newName.trim() })
      setIsEditNameOpen(false)
      setNewName('')
    } catch (error: any) {
      alert(error.message)
    }
  }

  const deletarOrganizacao = async () => {
    if (deleteConfirmText !== organization?.name) {
      alert('Nome da organização não confere')
      return
    }

    try {
      await deleteOrganization()
      setIsDeleteConfirmOpen(false)
      setDeleteConfirmText('')
      // Redirecionar ou mostrar mensagem de sucesso
      alert('Organização deletada com sucesso')
    } catch (error: any) {
      alert(error.message)
    }
  }

  const editarComissao = async () => {
    const valor = parseFloat(newCommissionValue)
    if (isNaN(valor) || valor <= 0) {
      alert('Valor deve ser um número maior que zero')
      return
    }

    try {
      await updateOrganization({ comissao_fixa_indicacao: valor })
      setIsEditCommissionOpen(false)
      setNewCommissionValue('')
      alert('Comissão fixa atualizada com sucesso!')
    } catch (error: any) {
      alert(error.message)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4" />
      case 'manager': return <Shield className="w-4 h-4" />
      case 'viewer': return <User2 className="w-4 h-4" />
      default: return <User2 className="w-4 h-4" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-700'
      case 'manager': return 'bg-blue-100 text-blue-700'
      case 'viewer': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error ? 'Erro ao carregar organização' : 'Organização não encontrada'}
          </h2>
          <p className="text-gray-600">
            {error || 'Você não pertence a nenhuma organização ou a organização não existe.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Configurações da Organização</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
              Gerencie as configurações da organização: <span className="font-medium">{organization.name}</span>
            </p>
            <div className="mt-1">
              <Badge className={getRoleBadgeColor(currentUserRole || '')}>
                {getRoleIcon(currentUserRole || '')}
                <span className="ml-1 capitalize">{currentUserRole}</span>
              </Badge>
            </div>
          </div>

          <Link href="/admin/users" className="self-start">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Gerenciar Usuários</span>
              <span className="sm:hidden">Usuários</span>
              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Total de Membros</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats?.totalMembers || 0}</p>
                </div>
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Membros Ativos</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">{stats?.activeMembers || 0}</p>
                </div>
                <UserCheck className="w-4 h-4 sm:w-6 sm:h-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Convites Pendentes</p>
                  <p className="text-lg sm:text-2xl font-bold text-orange-600">{stats?.pendingMembers || 0}</p>
                </div>
                <Mail className="w-4 h-4 sm:w-6 sm:h-6 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Data de Criação</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-900">
                    {stats?.createdAt ? new Date(stats.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                </div>
                <CalendarDays className="w-4 h-4 sm:w-6 sm:h-6 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detalhes da Organização */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Informações da Organização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Nome da Organização</p>
                  <p className="text-lg font-semibold text-gray-900">{organization.name}</p>
                </div>
                {canManageOrganization && (
                  <Dialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNewName(organization.name)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Nome da Organização</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="newName">Novo Nome</Label>
                          <Input
                            id="newName"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Nome da organização"
                            maxLength={100}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsEditNameOpen(false)
                              setNewName('')
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={editarNome}
                            disabled={!newName.trim() || newName.trim() === organization.name}
                          >
                            Salvar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Email do Owner</p>
                <p className="text-lg font-semibold text-gray-900">{organization.owner_email}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Data de Criação</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(organization.created_at).toLocaleDateString('pt-BR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Distribuição de Membros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Distribuição de Membros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-purple-500" />
                    <span className="font-medium text-gray-900">Owners</span>
                  </div>
                  <span className="text-lg font-bold text-purple-600">{stats?.owners || 0}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-gray-900">Managers</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{stats?.managers || 0}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User2 className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-gray-900">Viewers</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">{stats?.viewers || 0}</span>
                </div>
              </div>

              <div className="pt-4">
                <Link href="/admin/users">
                  <Button className="w-full">
                    <Users className="w-4 h-4 mr-2" />
                    Ver Todos os Membros
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Zona de Perigo */}
        {canManageOrganization && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                Zona de Perigo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-red-800 mb-1">Deletar Organização</h3>
                    <p className="text-sm text-red-600">
                      Esta ação não pode ser desfeita. Todos os dados da organização serão permanentemente removidos.
                    </p>
                  </div>

                  <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Deletar Organização
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-red-700">Confirmar Exclusão</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-red-800 mb-1">
                                Esta ação não pode ser desfeita!
                              </h4>
                              <p className="text-sm text-red-600">
                                Todos os dados, membros e configurações serão permanentemente removidos.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="confirmName" className="text-sm font-medium">
                            Para confirmar, digite o nome da organização: <strong>{organization.name}</strong>
                          </Label>
                          <Input
                            id="confirmName"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Nome da organização"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsDeleteConfirmOpen(false)
                              setDeleteConfirmText('')
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={deletarOrganizacao}
                            disabled={deleteConfirmText !== organization.name}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Deletar Definitivamente
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}