'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

export function CacheRefreshHelper() {
  const [showRefreshSuggestion, setShowRefreshSuggestion] = useState(false)

  useEffect(() => {
    // Verificar se há problema de cache
    const checkCacheIssues = () => {
      try {
        // Se localStorage tem dados antigos mas versão não bate
        const hasOldData = localStorage.getItem('mentorado') || localStorage.getItem('mentorado_auth_fallback')
        const currentVersion = localStorage.getItem('mentorado_auth_version')

        if (hasOldData && (!currentVersion || currentVersion !== '2.0')) {
          setShowRefreshSuggestion(true)
        }
      } catch (error) {
        console.log('Erro ao verificar cache:', error)
      }
    }

    checkCacheIssues()

    // Escutar por erros de login persistentes
    const handleLoginError = (event: CustomEvent) => {
      if (event.detail?.persistent) {
        setShowRefreshSuggestion(true)
      }
    }

    window.addEventListener('mentoradoLoginPersistentError', handleLoginError as EventListener)

    return () => {
      window.removeEventListener('mentoradoLoginPersistentError', handleLoginError as EventListener)
    }
  }, [])

  const handleRefresh = () => {
    // Limpar todo cache e recarregar
    try {
      localStorage.clear()
      sessionStorage.clear()

      // Forçar refresh completo
      window.location.reload()
    } catch (error) {
      // Fallback se não conseguir limpar
      window.location.reload()
    }
  }

  const handleDismiss = () => {
    setShowRefreshSuggestion(false)
    localStorage.setItem('cache_refresh_dismissed', Date.now().toString())
  }

  if (!showRefreshSuggestion) return null

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <RefreshCw className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-800 mb-1">
              Problemas de login?
            </h3>
            <p className="text-xs text-blue-700 mb-3">
              Detectamos dados antigos no seu navegador. Atualize a página para resolver.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
              >
                Atualizar Página
              </button>
              <button
                onClick={handleDismiss}
                className="text-blue-600 px-2 py-1 text-xs hover:text-blue-700"
              >
                Dispensar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}