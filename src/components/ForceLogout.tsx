'use client'

import { LogOut } from 'lucide-react'

export function ForceLogout() {
  const handleForceLogout = () => {
    try {
      console.log('🚨 Executando logout forçado...')

      // Limpar TODOS os cookies possíveis
      const cookies = document.cookie.split(";")
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf("=")
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`
      })

      // Limpar armazenamento
      localStorage.clear()
      sessionStorage.clear()

      // Se existir indexedDB, limpar também
      if ('indexedDB' in window) {
        indexedDB.databases?.().then(databases => {
          databases.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name)
            }
          })
        })
      }

      console.log('✅ Logout forçado executado')

      // Redirecionar imediatamente
      window.location.href = '/login'
    } catch (error) {
      console.error('❌ Erro no logout forçado:', error)
      // Mesmo com erro, tentar redirecionar
      window.location.href = '/login'
    }
  }

  return (
    <button
      onClick={handleForceLogout}
      className="fixed top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors flex items-center gap-2"
      title="Logout Forçado - Use se o logout normal não funcionar"
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">Logout Forçado</span>
    </button>
  )
}