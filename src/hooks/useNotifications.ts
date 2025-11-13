'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface Notification {
  id: string
  type: 'success' | 'warning' | 'info' | 'error'
  title: string
  message: string
  source_type: string
  source_id?: string
  read: boolean
  action_required: boolean
  created_at: string
  read_at?: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Buscar notificações do banco
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20) // Limitar a 20 notificações mais recentes

      if (fetchError) {
        throw fetchError
      }

      setNotifications(data || [])
    } catch (err) {
      console.error('Erro ao buscar notificações:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  // Marcar notificação como lida
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)

      if (updateError) {
        throw updateError
      }

      // Atualizar estado local
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true, read_at: new Date().toISOString() }
            : notification
        )
      )
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err)
      setError(err instanceof Error ? err.message : 'Erro ao marcar como lida')
    }
  }, [])

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications
        .filter(n => !n.read)
        .map(n => n.id)

      if (unreadIds.length === 0) return

      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .in('id', unreadIds)

      if (updateError) {
        throw updateError
      }

      // Atualizar estado local
      const readAt = new Date().toISOString()
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          read: true,
          read_at: readAt
        }))
      )
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err)
      setError(err instanceof Error ? err.message : 'Erro ao marcar todas como lidas')
    }
  }, [notifications])

  // Remover notificação
  const removeNotification = useCallback(async (notificationId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (deleteError) {
        throw deleteError
      }

      // Atualizar estado local
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (err) {
      console.error('Erro ao remover notificação:', err)
      setError(err instanceof Error ? err.message : 'Erro ao remover notificação')
    }
  }, [])

  // Criar notificação manual (para testes)
  const createNotification = useCallback(async (notification: Omit<Notification, 'id' | 'created_at' | 'read_at'>) => {
    try {
      const { data, error: createError } = await supabase
        .from('notifications')
        .insert([notification])
        .select()
        .single()

      if (createError) {
        throw createError
      }

      // Atualizar estado local
      setNotifications(prev => [data, ...prev])
    } catch (err) {
      console.error('Erro ao criar notificação:', err)
      setError(err instanceof Error ? err.message : 'Erro ao criar notificação')
    }
  }, [])

  // Setup de real-time subscriptions
  useEffect(() => {
    // Buscar notificações iniciais
    fetchNotifications()

    // Configurar real-time subscription
    const subscription = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('Nova notificação recebida:', payload.new)
          setNotifications(prev => [payload.new as Notification, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('Notificação atualizada:', payload.new)
          setNotifications(prev =>
            prev.map(notification =>
              notification.id === payload.new.id
                ? payload.new as Notification
                : notification
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('Notificação removida:', payload.old)
          setNotifications(prev =>
            prev.filter(notification => notification.id !== payload.old.id)
          )
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      subscription.unsubscribe()
    }
  }, [fetchNotifications])

  // Calcular contador de não lidas
  const unreadCount = notifications.filter(n => !n.read).length

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    removeNotification,
    createNotification,
    refetch: fetchNotifications
  }
}