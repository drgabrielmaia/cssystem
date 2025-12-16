'use client'

import { Header } from './header'

interface PageLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export const PageLayout = ({ children, title, subtitle }: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header - Sticky */}
      <Header title={title} subtitle={subtitle} />

      {/* Page Content */}
      <main className="p-4 lg:p-8">
        {children}
      </main>
    </div>
  )
}