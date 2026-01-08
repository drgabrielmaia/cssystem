import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface PendingInvite {
  id: string
  organization_id: string
  email: string
  role: 'owner' | 'manager' | 'viewer'
  created_at: string
  organization?: {
    id: string
    name: string
    owner_email: string
  }
}

export function usePendingInvites(userEmail: string | null) {
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPendingInvites = async () => {
    if (!userEmail) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Buscar convites pendentes (onde email = userEmail e user_id = null)
      const { data, error: fetchError } = await supabase
        .from('organization_users')
        .select(`
          id,
          organization_id,
          email,
          role,
          created_at,
          organizations (
            id,
            name,
            owner_email
          )
        `)
        .eq('email', userEmail)
        .is('user_id', null) // Convites pendentes

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setPendingInvites(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar convites pendentes:', error)
      setError(error.message)
      setPendingInvites([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPendingInvites()
  }, [userEmail])

  const acceptInvite = async (inviteId: string, userId: string) => {
    try {
      // Atualizar o convite com o user_id para aceitar
      const { error } = await supabase
        .from('organization_users')
        .update({ user_id: userId })
        .eq('id', inviteId)

      if (error) {
        throw new Error(`Erro ao aceitar convite: ${error.message}`)
      }

      // Remover da lista de pendentes
      setPendingInvites(prev => prev.filter(invite => invite.id !== inviteId))

      return { success: true }
    } catch (error: any) {
      console.error('Erro ao aceitar convite:', error)
      return { success: false, error: error.message }
    }
  }

  const declineInvite = async (inviteId: string) => {
    try {
      // Deletar o convite para recusar
      const { error } = await supabase
        .from('organization_users')
        .delete()
        .eq('id', inviteId)

      if (error) {
        throw new Error(`Erro ao recusar convite: ${error.message}`)
      }

      // Remover da lista de pendentes
      setPendingInvites(prev => prev.filter(invite => invite.id !== inviteId))

      return { success: true }
    } catch (error: any) {
      console.error('Erro ao recusar convite:', error)
      return { success: false, error: error.message }
    }
  }

  return {
    pendingInvites,
    loading,
    error,
    acceptInvite,
    declineInvite,
    refreshInvites: loadPendingInvites
  }
}