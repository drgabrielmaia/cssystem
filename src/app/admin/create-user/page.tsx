'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  User2,
  Mail,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  ExternalLink,
  Eye,
  EyeOff,
  Key
} from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { useOrganizationUsers } from '@/hooks/use-organization-users'
import Link from 'next/link'

export default function CreateUserPage() {
  const [newUser, setNewUser] = useState({
    email: '',
    fullName: '',
    password: '',
    role: 'viewer' as 'owner' | 'manager' | 'viewer'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const { user } = useAuth()

  const {
    organization,
    currentUserRole,
    loading: orgLoading,
    stats,
    addUser,
    canManageUsers
  } = useOrganizationUsers(user?.id || null)

  const criarUsuario = async () => {
    if (!newUser.email || !newUser.fullName || !newUser.password) {
      setErrorMessage('Todos os campos são obrigatórios')
      return
    }

    if (newUser.password.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await addUser(newUser.email, newUser.role)
      setSuccessMessage(`Usuário ${newUser.email} criado com sucesso! Um convite será enviado por email.`)
      setNewUser({
        email: '',
        fullName: '',
        password: '',
        role: 'viewer'
      })
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao criar usuário')
    } finally {
      setLoading(false)
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

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'owner': return 'Controle total sobre a organização'
      case 'manager': return 'Pode gerenciar usuários e configurações'
      case 'viewer': return 'Acesso apenas para visualização'
      default: return ''
    }
  }

  if (orgLoading) {
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
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Você não pertence a nenhuma organização.</p>
        </div>
      </div>
    )
  }

  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Permissão Insuficiente</h2>
          <p className="text-gray-600">
            Apenas owners e managers podem criar novos usuários.
          </p>
          <div className="mt-4">
            <Link href="/admin/users">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Usuários
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/admin/users">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Criar Novo Usuário</h1>
            </div>
            <p className="text-gray-600 mt-2">
              Adicione um novo membro à organização: {organization.name}
            </p>
            <div className="mt-1">
              <Badge className={getRoleBadgeColor(currentUserRole || '')}>
                {getRoleIcon(currentUserRole || '')}
                <span className="ml-1 capitalize">{currentUserRole}</span>
              </Badge>
            </div>
          </div>

          <Link href="/admin/users">
            <Button variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Ver Usuários
              <ExternalLink className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Estatísticas Resumidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        </div>

        {/* Mensagens de Feedback */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Formulário de Criação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Dados do Usuário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  placeholder="Nome completo do usuário"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value.toLowerCase() })}
                  placeholder="usuario@exemplo.com"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Um convite será enviado para este email
                </p>
              </div>

              <div>
                <Label htmlFor="password">Senha Temporária</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  O usuário deverá alterar na primeira conexão
                </p>
              </div>

              <div>
                <Label htmlFor="role">Função na Organização</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-2">
                        <User2 className="w-4 h-4 text-green-500" />
                        <span>Viewer - Visualização</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="manager">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-500" />
                        <span>Manager - Gerenciamento</span>
                      </div>
                    </SelectItem>
                    {currentUserRole === 'owner' && (
                      <SelectItem value="owner">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-purple-500" />
                          <span>Owner - Controle Total</span>
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {getRoleDescription(newUser.role)}
                </p>
              </div>

              <div className="pt-4">
                <Button
                  onClick={criarUsuario}
                  disabled={loading || !newUser.email || !newUser.fullName || !newUser.password}
                  className="w-full"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Criando...</span>
                    </div>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Criar Usuário
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Informações sobre Permissões */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Níveis de Permissão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 border border-purple-200 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-purple-500" />
                    <span className="font-semibold text-purple-700">Owner</span>
                  </div>
                  <ul className="text-sm text-purple-600 space-y-1">
                    <li>• Controle total sobre a organização</li>
                    <li>• Pode criar outros owners</li>
                    <li>• Pode deletar a organização</li>
                    <li>• Acesso a todas as funcionalidades</li>
                  </ul>
                </div>

                <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <span className="font-semibold text-blue-700">Manager</span>
                  </div>
                  <ul className="text-sm text-blue-600 space-y-1">
                    <li>• Pode gerenciar usuários</li>
                    <li>• Acesso a configurações</li>
                    <li>• Não pode gerenciar outros owners</li>
                    <li>• Pode criar viewers e managers</li>
                  </ul>
                </div>

                <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User2 className="w-5 h-5 text-green-500" />
                    <span className="font-semibold text-green-700">Viewer</span>
                  </div>
                  <ul className="text-sm text-green-600 space-y-1">
                    <li>• Acesso apenas para visualização</li>
                    <li>• Não pode modificar dados</li>
                    <li>• Ideal para relatórios e consultas</li>
                    <li>• Permissões limitadas</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Mail className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">Processo de Convite</h4>
                    <p className="text-sm text-yellow-700">
                      Após criar o usuário, um email de convite será enviado com instruções
                      para ativar a conta e definir uma nova senha.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}