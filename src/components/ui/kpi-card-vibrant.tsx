'use client'

import { LucideIcon } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'

interface KPICardVibrantProps {
  title: string
  value: string
  subtitle: string
  percentage: number
  trend: 'up' | 'down'
  color: 'orange' | 'blue' | 'green' | 'purple'
  icon: LucideIcon
  sparklineData?: Array<{ value: number }>
}

export const KPICardVibrant = ({
  title,
  value,
  subtitle,
  percentage,
  trend,
  color,
  icon: Icon,
  sparklineData
}: KPICardVibrantProps) => {
  const colorClasses = {
    orange: 'from-orange-500 to-orange-600',
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
  }

  return (
    <div className={`
      relative overflow-hidden rounded-2xl p-4 sm:p-6
      bg-gradient-to-br ${colorClasses[color]}
      shadow-[0_4px_20px_-2px_rgb(0_0_0_/_0.08)] hover:shadow-[0_8px_30px_-4px_rgb(0_0_0_/_0.12)]
      transition-all duration-300 hover:-translate-y-1
    `}>
      {/* Background Pattern */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <div className="w-full h-full rounded-full bg-white transform translate-x-8 -translate-y-8" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="text-white/90 font-medium text-sm sm:text-base truncate">{title}</span>
          </div>
          <div className={`
            px-2 py-1 rounded-full text-xs font-bold flex-shrink-0 ml-2
            ${trend === 'up' ? 'bg-white/20 text-white' : 'bg-red-400/30 text-white'}
          `}>
            {trend === 'up' ? '↑' : '↓'} {percentage}%
          </div>
        </div>

        {/* Value */}
        <div className="mb-2">
          <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white break-all">{value}</span>
        </div>

        {/* Subtitle */}
        <p className="text-white/70 text-xs sm:text-sm leading-snug">{subtitle}</p>

        {/* Mini Sparkline */}
        {sparklineData && (
          <div className="mt-3 sm:mt-4 h-8 sm:h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="rgba(255,255,255,0.8)"
                  fill="rgba(255,255,255,0.2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}