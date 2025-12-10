'use client'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  actions?: React.ReactNode
}

export const ChartCard = ({ title, subtitle, children, actions }: ChartCardProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgb(0_0_0_/_0.08)] border border-gray-100 overflow-hidden">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-[#0F172A] truncate">{title}</h3>
          {subtitle && <p className="text-xs sm:text-sm text-[#94A3B8] truncate">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0 ml-4">{actions}</div>}
      </div>
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  )
}