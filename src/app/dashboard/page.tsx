'use client'

import { Navbar } from '@/components/dashboard/Navbar'
import { Sidebar } from '@/components/dashboard/Sidebar'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      {/* Navbar */}
      <Navbar />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 px-8 py-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Dashboard Content */}
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard do Customer Success</h1>
              <p className="text-gray-600">
                Bem-vindo ao sistema de Customer Success. Use o menu lateral para navegar pelas funcionalidades.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}