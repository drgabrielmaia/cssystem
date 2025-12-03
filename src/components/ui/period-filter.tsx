'use client'

import { Calendar, Filter } from 'lucide-react'

interface PeriodFilterProps {
  selected: string
  onChange: (period: string) => void
}

export const PeriodFilter = ({ selected, onChange }: PeriodFilterProps) => {
  const periods = [
    { id: 'all', label: 'Todos' },
    { id: 'week', label: 'Semana Atual' },
    { id: 'lastWeek', label: 'Última Semana' },
    { id: 'month', label: 'Mês Atual' },
    { id: 'year', label: 'Ano Atual' },
  ]

  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_-2px_rgb(0_0_0_/_0.08)] border border-gray-100">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-[#94A3B8] flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Período:
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {periods.map((period) => (
            <button
              key={period.id}
              onClick={() => onChange(period.id)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${selected === period.id
                  ? 'bg-[#059669] text-white shadow-md'
                  : 'bg-[#F1F5F9] text-[#475569] hover:bg-gray-200'
                }
              `}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              type="date"
              className="pl-10 pr-4 py-2 bg-[#F1F5F9] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]"
            />
          </div>
          <span className="text-[#94A3B8]">até</span>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              type="date"
              className="pl-10 pr-4 py-2 bg-[#F1F5F9] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}