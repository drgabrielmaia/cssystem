'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Preload de componentes críticos
export function FormPreloader() {
  useEffect(() => {
    // Preload conexão Supabase
    const preloadSupabase = async () => {
      try {
        // Fazer uma query simples para inicializar a conexão
        await supabase.from('form_templates').select('slug').limit(1)
      } catch {
        // Ignorar erros de preload
      }
    }

    preloadSupabase()

    // Preload de recursos críticos
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'style'
    link.href = '/_next/static/css/app/layout.css'
    document.head.appendChild(link)

    return () => {
      if (link.parentNode) {
        document.head.removeChild(link)
      }
    }
  }, [])

  return null
}