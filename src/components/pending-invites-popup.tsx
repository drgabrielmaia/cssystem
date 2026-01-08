'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Building2,
  Crown,
  Shield,
  User2,
  Check,
  X,
  AlertCircle,
  Mail,
  Calendar,
  UserCheck
} from 'lucide-react'
import { usePendingInvites } from '@/hooks/use-pending-invites'
import { useAuth } from '@/contexts/auth'

interface PendingInvitesPopupProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function PendingInvitesPopup({ isOpen, onOpenChange }: PendingInvitesPopupProps) {
  const { user } = useAuth()
  const { pendingInvites, loading, acceptInvite, declineInvite, refreshInvites } = usePendingInvites(user?.email || null)
  const [processingInvites, setProcessingInvites] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-purple-500" />
      case 'manager': return <Shield className="w-4 h-4 text-blue-500" />
      case 'viewer': return <User2 className="w-4 h-4 text-green-500" />
      default: return <User2 className="w-4 h-4" />
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

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'owner': return 'Controle total da organização'
      case 'manager': return 'Gerenciamento de usuários e dados'
      case 'viewer': return 'Visualização de dados apenas'
      default: return 'Acesso básico'
    }
  }

  const handleAccept = async (inviteId: string) => {
    if (!user?.id) {
      setMessage({ type: 'error', text: 'Usuário não autenticado' })
      return
    }

    setProcessingInvites(prev => {
      const newSet = new Set(prev)
      newSet.add(inviteId)
      return newSet
    })
    setMessage(null)

    try {
      const result = await acceptInvite(inviteId, user.id)

      if (result.success) {
        setMessage({ type: 'success', text: 'Convite aceito com sucesso!' })

        // Se não há mais convites, fechar o pop-up após 2 segundos
        if (pendingInvites.length <= 1) {
          setTimeout(() => {
            onOpenChange(false)
            setMessage(null)
          }, 2000)
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Erro ao aceitar convite' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro inesperado' })
    } finally {
      setProcessingInvites(prev => {
        const newSet = new Set(prev)
        newSet.delete(inviteId)
        return newSet
      })
    }
  }

  const handleDecline = async (inviteId: string) => {
    setProcessingInvites(prev => {
      const newSet = new Set(prev)
      newSet.add(inviteId)
      return newSet
    })
    setMessage(null)

    try {
      const result = await declineInvite(inviteId)

      if (result.success) {
        setMessage({ type: 'success', text: 'Convite recusado' })

        // Se não há mais convites, fechar o pop-up após 2 segundos
        if (pendingInvites.length <= 1) {
          setTimeout(() => {
            onOpenChange(false)
            setMessage(null)
          }, 2000)
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Erro ao recusar convite' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro inesperado' })
    } finally {
      setProcessingInvites(prev => {
        const newSet = new Set(prev)
        newSet.delete(inviteId)
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Carregando convites...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (pendingInvites.length === 0) {
    return null // Não mostrar pop-up se não há convites pendentes
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="w-6 h-6 text-blue-500" />
            Convites Pendentes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {message && (
            <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertCircle className={`h-4 w-4 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`} />
              <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-gray-600 mb-4">
            Você recebeu {pendingInvites.length} convite{pendingInvites.length !== 1 ? 's' : ''} para participar de organizações:
          </div>

          {pendingInvites.map((invite) => (
            <Card key={invite.id} className="border-2 border-blue-100">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header do convite */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {invite.organization?.name || 'Organização'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Convidado por: {invite.organization?.owner_email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes do papel */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Seu papel:</span>
                      <Badge variant="outline" className={getRoleBadgeColor(invite.role)}>
                        {getRoleIcon(invite.role)}
                        <span className="ml-1 capitalize">{invite.role}</span>
                      </Badge>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">
                        {getRoleDescription(invite.role)}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Convidado em {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        Para: {invite.email}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => handleAccept(invite.id)}
                      disabled={processingInvites.has(invite.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {processingInvites.has(invite.id) ? 'Aceitando...' : 'Aceitar Convite'}
                    </Button>

                    <Button
                      onClick={() => handleDecline(invite.id)}
                      disabled={processingInvites.has(invite.id)}
                      variant="outline"
                      className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      {processingInvites.has(invite.id) ? 'Recusando...' : 'Recusar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {pendingInvites.length > 1 && (
            <div className="text-center text-sm text-gray-500 pt-4">
              Você pode aceitar ou recusar cada convite individualmente
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}