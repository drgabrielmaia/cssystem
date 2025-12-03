'use client'

import { Sidebar } from './sidebar'
import { Header } from './header'

interface PageLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export const PageLayout = ({ children, title, subtitle }: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Sidebar - Fixed */}
      <Sidebar />

      {/* Main Content - Responsivo para sidebar */}
      <div className="lg:ml-64">
        {/* Header - Sticky */}
        <Header title={title} subtitle={subtitle} />

        {/* Page Content - Responsivo */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}