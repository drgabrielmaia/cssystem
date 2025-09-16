'use client'

import { Sidebar } from '@/components/sidebar'
import { usePathname } from 'next/navigation'

export function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Don't show sidebar on login page or when filling forms (not the forms listing page)
  if (pathname === '/login' || (pathname.startsWith('/formulario/') && pathname !== '/formularios')) {
    return <>{children}</>
  }

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}