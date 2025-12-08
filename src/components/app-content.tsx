'use client'

import { Navbar } from '@/components/dashboard/Navbar'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
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

  // Don't show sidebar on login page, forms, mentorado page, scheduling pages, or for mentorados
  if (pathname === '/login' ||
      pathname === '/mentorado' ||
      (pathname.startsWith('/formulario/') && pathname !== '/formularios') ||
      pathname.startsWith('/forms/') ||
      pathname.startsWith('/agendar/') ||
      isMentorado) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      {/* Navbar */}
      <Navbar />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}