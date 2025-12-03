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
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#0F172A]">{title}</h3>
          {subtitle && <p className="text-sm text-[#94A3B8]">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}