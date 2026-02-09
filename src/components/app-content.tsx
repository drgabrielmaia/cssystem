'use client'

import { ModularSidebar } from '@/components/ModularSidebar'
import { AuthGuard } from '@/components/AuthGuard'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isMentorado, setIsMentorado] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Check if user is a mentorado
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const userRole = session.user.user_metadata?.role
          setIsMentorado(userRole === 'mentorado')
        }
      } catch (error) {
        console.error('Error checking user role:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkUserRole()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const userRole = session.user.user_metadata?.role
        setIsMentorado(userRole === 'mentorado')
      } else {
        setIsMentorado(false)
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Páginas públicas que não precisam de autenticação
  const publicPages = [
    '/login',
    '/cadastro', 
    '/recover-password'
  ]

  // Páginas de formulários e agendamento públicas
  const isPublicPage = publicPages.includes(pathname) ||
                      pathname.startsWith('/formulario/') ||
                      pathname.startsWith('/forms/') ||
                      pathname.startsWith('/agendar/') ||
                      pathname.startsWith('/agenda/') ||
                      pathname.startsWith('/mentorado') ||
                      pathname.startsWith('/closer')

  // Páginas que requerem autenticação mas sem sidebar
  const noSidebarPages = pathname.startsWith('/mentorado') || 
                         pathname.startsWith('/closer') || 
                         isMentorado

  // Se for página pública, não aplicar AuthGuard
  if (isPublicPage) {
    return <>{children}</>
  }

  // Se for área do mentorado ou usuário é mentorado, sem sidebar (sem AuthGuard para debug)
  if (noSidebarPages) {
    return (
      <>{children}</>
    )
  }

  // Páginas administrativas - com sidebar (sem AuthGuard para debug)
  return (
    <div className="flex h-screen bg-gray-900">
      <ModularSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="h-full">
            {/* Container que ocupa toda a largura disponível */}
            <div className="h-full w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}