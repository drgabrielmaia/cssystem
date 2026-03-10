'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Header } from '@/components/header'
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
  } = useOrganization(user?.id || null, user?.email)

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
      case 'owner': return 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20'
      case 'manager': return 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20'
      case 'viewer': return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
      default: return 'bg-white/[0.06] text-white/40 ring-1 ring-white/10'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/10 border-t-white/60"></div>
          <p className="text-white/40 text-sm">Carregando organização...</p>
        </div>
      </div>
    )
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white/20" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {error ? 'Erro ao carregar organização' : 'Organização não encontrada'}
          </h2>
          <p className="text-white/40 max-w-md">
            {error || 'Você não pertence a nenhuma organização ou a organização não existe.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Header
        title="Configurações da Organização"
        subtitle={
          <span>
            Gerencie as configurações da organização: <span className="font-medium text-white/70">{organization.name}</span>
          </span>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top bar with role badge and manage users */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${getRoleBadgeColor(currentUserRole || '')}`}>
              {getRoleIcon(currentUserRole || '')}
              <span className="capitalize">{currentUserRole}</span>
            </span>
          </div>

          <Link href="/admin/users" className="self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              className="border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white text-xs sm:text-sm"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Gerenciar Usuários</span>
              <span className="sm:hidden">Usuários</span>
              <ExternalLink className="w-3 h-3 ml-1.5 opacity-50" />
            </Button>
          </Link>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#141418] p-4 sm:p-5 rounded-2xl ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-white/40">Total de Membros</p>
                <p className="text-xl sm:text-2xl font-bold text-white mt-1">{stats?.totalMembers || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#141418] p-4 sm:p-5 rounded-2xl ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-white/40">Membros Ativos</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">{stats?.activeMembers || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#141418] p-4 sm:p-5 rounded-2xl ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-white/40">Convites Pendentes</p>
                <p className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">{stats?.pendingMembers || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#141418] p-4 sm:p-5 rounded-2xl ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-white/40">Data de Criação</p>
                <p className="text-xs sm:text-sm font-medium text-white mt-1">
                  {stats?.createdAt ? new Date(stats.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Detalhes da Organização */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Informações Básicas */}
          <div className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                <Settings className="w-4 h-4 text-white/60" />
              </div>
              <h3 className="text-sm font-semibold text-white">Informações da Organização</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center p-4 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06]">
                <div>
                  <p className="text-xs font-medium text-white/40">Nome da Organização</p>
                  <p className="text-base font-semibold text-white mt-0.5">{organization.name}</p>
                </div>
                {canManageOrganization && (
                  <Dialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white"
                        onClick={() => setNewName(organization.name)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#1a1a1e] border-white/[0.08] text-white">
                      <DialogHeader>
                        <DialogTitle className="text-white">Editar Nome da Organização</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="newName" className="text-white/60 text-sm">Novo Nome</Label>
                          <Input
                            id="newName"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Nome da organização"
                            maxLength={100}
                            className="bg-[#141418] border-white/[0.08] text-white placeholder-white/30 focus:ring-white/10 focus:border-white/20 mt-1.5"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            className="border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white"
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
                            className="bg-white text-black hover:bg-white/90 disabled:opacity-30"
                          >
                            Salvar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <div className="p-4 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06]">
                <p className="text-xs font-medium text-white/40">Email do Owner</p>
                <p className="text-base font-semibold text-white mt-0.5">{organization.owner_email}</p>
              </div>

              <div className="p-4 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06]">
                <p className="text-xs font-medium text-white/40">Data de Criação</p>
                <p className="text-base font-semibold text-white mt-0.5">
                  {new Date(organization.created_at).toLocaleDateString('pt-BR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              {/* Comissão Fixa de Indicação */}
              <div className="flex justify-between items-center p-4 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06]">
                <div>
                  <p className="text-xs font-medium text-white/40">Comissão Fixa de Indicação</p>
                  <p className="text-base font-semibold text-emerald-400 mt-0.5">
                    R$ {Number(organization.comissao_fixa_indicacao || 0).toFixed(2)}
                  </p>
                </div>
                {canManageOrganization && (
                  <Dialog open={isEditCommissionOpen} onOpenChange={setIsEditCommissionOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white"
                        onClick={() => setNewCommissionValue(String(organization.comissao_fixa_indicacao || ''))}
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#1a1a1e] border-white/[0.08] text-white">
                      <DialogHeader>
                        <DialogTitle className="text-white">Editar Comissão Fixa de Indicação</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="newCommission" className="text-white/60 text-sm">Valor (R$)</Label>
                          <Input
                            id="newCommission"
                            type="number"
                            step="0.01"
                            min="0"
                            value={newCommissionValue}
                            onChange={(e) => setNewCommissionValue(e.target.value)}
                            placeholder="Ex: 50.00"
                            className="bg-[#141418] border-white/[0.08] text-white placeholder-white/30 focus:ring-white/10 focus:border-white/20 mt-1.5"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            className="border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white"
                            onClick={() => {
                              setIsEditCommissionOpen(false)
                              setNewCommissionValue('')
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={editarComissao}
                            disabled={!newCommissionValue || parseFloat(newCommissionValue) <= 0}
                            className="bg-white text-black hover:bg-white/90 disabled:opacity-30"
                          >
                            Salvar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </div>

          {/* Distribuição de Membros */}
          <div className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                <Users className="w-4 h-4 text-white/60" />
              </div>
              <h3 className="text-sm font-semibold text-white">Distribuição de Membros</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-purple-500/[0.06] rounded-xl ring-1 ring-purple-500/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Crown className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="font-medium text-white text-sm">Owners</span>
                  </div>
                  <span className="text-lg font-bold text-purple-400">{stats?.owners || 0}</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-blue-500/[0.06] rounded-xl ring-1 ring-blue-500/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="font-medium text-white text-sm">Managers</span>
                  </div>
                  <span className="text-lg font-bold text-blue-400">{stats?.managers || 0}</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-emerald-500/[0.06] rounded-xl ring-1 ring-emerald-500/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <User2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="font-medium text-white text-sm">Viewers</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400">{stats?.viewers || 0}</span>
                </div>
              </div>

              <div className="pt-3">
                <Link href="/admin/users">
                  <Button className="w-full bg-white/[0.06] text-white hover:bg-white/[0.10] ring-1 ring-white/[0.06] hover:ring-white/[0.12] border-0">
                    <Users className="w-4 h-4 mr-2" />
                    Ver Todos os Membros
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Zona de Perigo */}
        {canManageOrganization && (
          <div className="bg-[#141418] rounded-2xl ring-1 ring-red-500/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-red-500/10 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <h3 className="text-sm font-semibold text-red-400">Zona de Perigo</h3>
            </div>
            <div className="p-5">
              <div className="bg-red-500/[0.06] rounded-xl p-4 ring-1 ring-red-500/10">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <h3 className="font-medium text-red-400 mb-1 text-sm">Deletar Organização</h3>
                    <p className="text-xs text-white/30">
                      Esta ação não pode ser desfeita. Todos os dados da organização serão permanentemente removidos.
                    </p>
                  </div>

                  <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                    <DialogTrigger asChild>
                      <Button
                        className="bg-red-500/10 text-red-400 hover:bg-red-500/20 ring-1 ring-red-500/20 hover:ring-red-500/30 border-0 shrink-0"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Deletar Organização
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#1a1a1e] border-white/[0.08] text-white">
                      <DialogHeader>
                        <DialogTitle className="text-red-400">Confirmar Exclusão</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="bg-red-500/[0.06] rounded-xl p-4 ring-1 ring-red-500/10">
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-red-400 mb-1 text-sm">
                                Esta ação não pode ser desfeita!
                              </h4>
                              <p className="text-xs text-white/30">
                                Todos os dados, membros e configurações serão permanentemente removidos.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="confirmName" className="text-sm font-medium text-white/60">
                            Para confirmar, digite o nome da organização: <strong className="text-white">{organization.name}</strong>
                          </Label>
                          <Input
                            id="confirmName"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Nome da organização"
                            className="bg-[#141418] border-white/[0.08] text-white placeholder-white/30 focus:ring-red-500/20 focus:border-red-500/20 mt-1.5"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            className="border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white"
                            onClick={() => {
                              setIsDeleteConfirmOpen(false)
                              setDeleteConfirmText('')
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={deletarOrganizacao}
                            disabled={deleteConfirmText !== organization.name}
                            className="bg-red-500 text-white hover:bg-red-600 disabled:opacity-30 border-0"
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
