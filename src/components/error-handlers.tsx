'use client'

import { useEffect } from 'react'

export function GlobalErrorHandler() {
  useEffect(() => {
    // Handler para erros não capturados de Promise
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.name === 'AbortError') {
        event.preventDefault()
        console.log('🚫 Unhandled AbortError silenced:', event.reason.message)
        return
      }
      
      // Tratar erros de auth silenciosamente
      if (event.reason?.message?.includes('Invalid Refresh') || 
          event.reason?.message?.includes('refresh_token') ||
          event.reason?.name === 'AuthApiError') {
        event.preventDefault()
        console.log('🔑 Auth error silenced:', event.reason.message?.slice(0, 100))
        return
      }
      
      // Log outros erros mas não impede o comportamento padrão
      console.error('Unhandled promise rejection:', event.reason)
    }

    // Handler para erros globais de JavaScript
    const handleError = (event: ErrorEvent) => {
      if (event.error?.name === 'AbortError') {
        event.preventDefault()
        console.log('🚫 Global AbortError silenced:', event.error.message)
        return
      }
      
      // Tratar erros de syntax de forma mais suave
      if (event.error?.name === 'SyntaxError' && event.message?.includes('Unexpected token')) {
        event.preventDefault()
        console.log('📝 Syntax error silenced - likely chunk loading issue')
        return
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  return null // Este componente não renderiza nada
}