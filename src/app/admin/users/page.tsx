'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Search, Users, Plus, Edit, Trash2, Mail, Shield, UserPlus, Crown, User2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { useOrganizationUsers } from '@/hooks/use-organization-users'

export default function UsersManagementPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'owners' | 'managers' | 'viewers'>('all')
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [newUser, setNewUser] = useState({ email: '', role: 'viewer' as const })
  const [editRole, setEditRole] = useState('')

  const { user } = useAuth()

  const {
    users,
    organization,
    currentUserRole,
    loading,
    stats,
    addUser,
    updateUserRole,
    removeUser,
    canManageUsers,
    canManageRole
  } = useOrganizationUsers(user?.id || null)

  const adicionarUsuario = async () => {
    try {
      await addUser(newUser.email, newUser.role)
      setNewUser({ email: '', role: 'viewer' })
      setIsAddUserOpen(false)
    } catch (error: any) {
      alert(error.message)
    }
  }

  const editarRole = async () => {
    if (!selectedUser) return

    try {
      await updateUserRole(selectedUser.id, editRole as 'owner' | 'manager' | 'viewer')
      setIsEditUserOpen(false)
      setSelectedUser(null)
      setEditRole('')
    } catch (error: any) {
      alert(error.message)
    }
  }

  const removerUsuario = async (userId: string) => {
    const userToRemove = users.find(u => u.id === userId)
    if (!userToRemove) return

    if (window.confirm(`Tem certeza que deseja remover ${userToRemove.email}?`)) {
      try {
        await removeUser(userId)
      } catch (error: any) {
        alert(error.message)
      }
    }
  }

  const usuariosFiltrados = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false

    switch (filter) {
      case 'owners': return user.role === 'owner'
      case 'managers': return user.role === 'manager'
      case 'viewers': return user.role === 'viewer'
      default: return true
    }
  })


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

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Você não pertence a nenhuma organização.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Controle de Usuários</h1>
            <p className="text-gray-600 mt-2">
              Gerencie os usuários da organização: {organization.name}
            </p>
            <div className="mt-1">
              <Badge className={getRoleBadgeColor(currentUserRole || '')}>
                {getRoleIcon(currentUserRole || '')}
                <span className="ml-1 capitalize">{currentUserRole}</span>
              </Badge>
            </div>
          </div>

          {canManageUsers && (
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="usuario@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Função</Label>
                    <Select value={newUser.role} onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer - Visualização</SelectItem>
                        <SelectItem value="manager">Manager - Gerenciamento</SelectItem>
                        {currentUserRole === 'owner' && (
                          <SelectItem value="owner">Owner - Controle Total</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={adicionarUsuario}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Owners</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.owners}</p>
                </div>
                <Crown className="w-6 h-6 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Managers</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.managers}</p>
                </div>
                <Shield className="w-6 h-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Viewers</p>
                  <p className="text-2xl font-bold text-green-600">{stats.viewers}</p>
                </div>
                <User2 className="w-6 h-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pendentes</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                </div>
                <Mail className="w-6 h-6 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controles de Filtro */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')}
                  size="sm"
                >
                  Todos
                </Button>
                <Button
                  variant={filter === 'owners' ? 'default' : 'outline'}
                  onClick={() => setFilter('owners')}
                  size="sm"
                >
                  Owners
                </Button>
                <Button
                  variant={filter === 'managers' ? 'default' : 'outline'}
                  onClick={() => setFilter('managers')}
                  size="sm"
                >
                  Managers
                </Button>
                <Button
                  variant={filter === 'viewers' ? 'default' : 'outline'}
                  onClick={() => setFilter('viewers')}
                  size="sm"
                >
                  Viewers
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários ({usuariosFiltrados.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Função
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Adicionado em
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usuariosFiltrados.map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <User2 className="w-5 h-5 text-gray-500" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {usuario.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getRoleBadgeColor(usuario.role)}>
                          {getRoleIcon(usuario.role)}
                          <span className="ml-1 capitalize">{usuario.role}</span>
                        </Badge>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={usuario.status === 'ativo' ? 'default' : 'secondary'}
                          className={
                            usuario.status === 'ativo'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }
                        >
                          {usuario.status}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {canManageRole(usuario.role) && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(usuario)
                                setEditRole(usuario.role)
                                setIsEditUserOpen(true)
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removerUsuario(usuario.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {usuariosFiltrados.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    Nenhum usuário encontrado
                  </h3>
                  <p className="text-gray-500">
                    Ajuste os filtros ou termo de busca
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal de Edição */}
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input value={selectedUser.email} disabled />
                </div>
                <div>
                  <Label htmlFor="editRole">Função</Label>
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer - Visualização</SelectItem>
                      <SelectItem value="manager">Manager - Gerenciamento</SelectItem>
                      {currentUserRole === 'owner' && (
                        <SelectItem value="owner">Owner - Controle Total</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={editarRole}>
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}