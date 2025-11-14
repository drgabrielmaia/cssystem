'use client'

import { Sidebar } from '@/components/sidebar'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Don't show sidebar on login page or when filling forms (not the forms listing page)
  if (pathname === '/login' ||
      (pathname.startsWith('/formulario/') && pathname !== '/formularios') ||
      pathname.startsWith('/forms/')) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-gray-50">
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