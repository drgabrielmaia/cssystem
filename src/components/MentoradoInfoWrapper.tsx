'use client'

import { useEffect, useState } from 'react'
import { useMentoradoInfo } from '@/hooks/useMentoradoInfo'
import { useMentoradoAuth } from '@/contexts/mentorado-auth'
import MentoradoInfoModal from './MentoradoInfoModal'

interface MentoradoInfoWrapperProps {
  children: React.ReactNode
}

export default function MentoradoInfoWrapper({ children }: MentoradoInfoWrapperProps) {
  const [mounted, setMounted] = useState(false)
  const { mentorado } = useMentoradoAuth()
  const { shouldShowModal, loading, hideModal } = useMentoradoInfo(mentorado?.id)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Evitar hydration mismatch
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <>
      {children}
      
      {!loading && shouldShowModal && mentorado?.id && mentorado?.nome_completo && (
        <MentoradoInfoModal
          isOpen={shouldShowModal}
          onClose={hideModal}
          mentoradoId={mentorado.id}
          mentoradoNome={mentorado.nome_completo}
        />
      )}
    </>
  )
}