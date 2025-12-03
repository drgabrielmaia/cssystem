'use client'

import { LucideIcon, ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface MetricCardProps {
  title: string
  value: string
  change?: number
  changeType?: 'increase' | 'decrease'
  icon: LucideIcon
  iconColor: 'blue' | 'green' | 'orange' | 'purple'
  link?: string
}

export const MetricCard = ({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  iconColor,
  link
}: MetricCardProps) => {
  const iconColorClasses = {
    blue: 'bg-[#DBEAFE] text-[#3B82F6]',
    green: 'bg-[#DCFCE7] text-[#22C55E]',
    orange: 'bg-[#FEF3C7] text-[#F59E0B]',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgb(0_0_0_/_0.08)] hover:shadow-[0_8px_30px_-4px_rgb(0_0_0_/_0.12)] transition-all duration-300 hover:-translate-y-1 border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${iconColorClasses[iconColor]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {change && (
          <div className={`
            flex items-center gap-1 text-sm font-medium
            ${changeType === 'increase' ? 'text-[#22C55E]' : 'text-[#EF4444]'}
          `}>
            {changeType === 'increase' ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {change}%
          </div>
        )}
      </div>

      <div className="mb-1">
        <span className="text-3xl font-bold text-[#0F172A]">{value}</span>
      </div>

      <p className="text-sm text-[#94A3B8] mb-4">{title}</p>

      {link && (
        <Link href={link} className="inline-flex items-center gap-1 text-sm font-medium text-[#059669] hover:text-[#047857] transition-colors">
          Ver detalhes
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  )
}