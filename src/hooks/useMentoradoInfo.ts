'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface UseMentoradoInfoReturn {
  shouldShowModal: boolean
  loading: boolean
  showModal: () => void
  hideModal: () => void
}

export function useMentoradoInfo(mentoradoId?: string): UseMentoradoInfoReturn {
  const [shouldShowModal, setShouldShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (mentoradoId) {
      checkMentoradoInfo(mentoradoId)
    }
  }, [mentoradoId])

  const checkMentoradoInfo = async (id: string) => {
    try {
      setLoading(true)

      // Verificar se já existe informação do mentorado
      const { data: existingInfo, error } = await supabase
        .from('mentorado_info')
        .select('id, created_at')
        .eq('mentorado_id', id)
        .single()

      if (error && error.code !== 'PGRST116') {
        // Error different from "not found"
        console.error('Erro ao verificar informações do mentorado:', error)
        return
      }

      // Se não existe informação OU se foi criada há mais de 6 meses, mostrar modal
      if (!existingInfo) {
        setShouldShowModal(true)
      } else {
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
        
        const infoCreatedDate = new Date(existingInfo.created_at)
        
        if (infoCreatedDate < sixMonthsAgo) {
          setShouldShowModal(true)
        }
      }

    } catch (error) {
      console.error('Erro ao verificar informações do mentorado:', error)
    } finally {
      setLoading(false)
    }
  }

  const showModal = () => setShouldShowModal(true)
  const hideModal = () => setShouldShowModal(false)

  return {
    shouldShowModal,
    loading,
    showModal,
    hideModal
  }
}