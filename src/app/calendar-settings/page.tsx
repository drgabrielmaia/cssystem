'use client'

import { Header } from '@/components/header'
import { CalendarSettingsComponent } from '@/components/calendar-settings'

export default function CalendarSettingsPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title="⚙️ Configurações do Calendário"
        subtitle="Configure seus horários e disponibilidade para agendamentos"
      />

      <main className="flex-1 p-6">
        <CalendarSettingsComponent />
      </main>
    </div>
  )
}