'use client'

import { Navbar } from '@/components/dashboard/Navbar'
import { Sidebar } from '@/components/dashboard/Sidebar'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <Navbar />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 px-8 py-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Dashboard Content */}
            <div className="bg-card p-8 rounded-2xl border">
              <h1 className="text-2xl font-semibold text-foreground mb-4">Dashboard do Customer Success</h1>
              <p className="text-muted-foreground">
                Bem-vindo ao sistema de Customer Success. Use o menu lateral para navegar pelas funcionalidades.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}