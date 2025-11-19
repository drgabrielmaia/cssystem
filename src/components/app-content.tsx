'use client'

import { Sidebar } from '@/components/sidebar'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMentorado, setIsMentorado] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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

  // Don't show sidebar on login page, forms, mentorado page, or for mentorados
  if (pathname === '/login' ||
      pathname === '/mentorado' ||
      (pathname.startsWith('/formulario/') && pathname !== '/formularios') ||
      pathname.startsWith('/forms/') ||
      isMentorado) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen" style={{ background: '#F8FAF7' }}>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}