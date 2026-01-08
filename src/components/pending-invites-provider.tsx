'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth'
import { usePendingInvites } from '@/hooks/use-pending-invites'
import { PendingInvitesPopup } from './pending-invites-popup'

export function PendingInvitesProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { pendingInvites, loading: invitesLoading } = usePendingInvites(user?.email || null)
  const [showPopup, setShowPopup] = useState(false)
  const [hasShownPopup, setHasShownPopup] = useState(false)

  useEffect(() => {
    // Só mostrar o pop-up quando:
    // 1. Usuário está autenticado
    // 2. Não está carregando mais nada
    // 3. Há convites pendentes
    // 4. Ainda não mostrou o pop-up nesta sessão
    if (
      !authLoading &&
      !invitesLoading &&
      user &&
      pendingInvites.length > 0 &&
      !hasShownPopup
    ) {
      // Aguardar um pequeno delay para garantir que a página carregou completamente
      const timeout = setTimeout(() => {
        setShowPopup(true)
        setHasShownPopup(true)
      }, 1000)

      return () => clearTimeout(timeout)
    }
  }, [authLoading, invitesLoading, user, pendingInvites.length, hasShownPopup])

  // Reset quando usuário muda (para mostrar pop-up para novo usuário)
  useEffect(() => {
    setHasShownPopup(false)
    setShowPopup(false)
  }, [user?.id])

  return (
    <>
      {children}
      <PendingInvitesPopup
        isOpen={showPopup}
        onOpenChange={setShowPopup}
      />
    </>
  )
}