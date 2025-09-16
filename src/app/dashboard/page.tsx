'use client'

import { Navbar } from '@/components/dashboard/Navbar'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { JourneyFlow } from '@/components/dashboard/JourneyFlow'
import { CasesList } from '@/components/dashboard/CasesList'

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
            {/* Customer Journey Flow */}
            <JourneyFlow />
            
            {/* Support Cases List */}
            <CasesList />
          </div>
        </main>
      </div>
    </div>
  )
}