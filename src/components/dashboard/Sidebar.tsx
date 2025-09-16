'use client'

import { 
  Home, 
  Users, 
  BarChart3, 
  FileText, 
  Settings, 
  Calendar,
  MessageSquare,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  { icon: Home, href: '/', label: 'Dashboard' },
  { icon: Users, href: '/mentorados', label: 'Mentorados' },
  { icon: FileText, href: '/cases', label: 'Cases' },
  { icon: BarChart3, href: '/analytics', label: 'Analytics' },
  { icon: MessageSquare, href: '/formularios', label: 'Formulários' },
  { icon: Calendar, href: '/checkins', label: 'Check-ins' },
  { icon: TrendingUp, href: '/relatorios', label: 'Relatórios' },
  { icon: Settings, href: '/configuracoes', label: 'Configurações' }
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-16 bg-white shadow-sm border-r border-[#E5E7EB] flex flex-col items-center py-4 space-y-2">
      {menuItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              group relative p-3 rounded-md transition-all duration-200 hover:bg-[#EFF6FF]
              ${isActive 
                ? 'bg-[#EFF6FF] text-[#2563EB]' 
                : 'text-[#6B7280] hover:text-[#2563EB]'
              }
            `}
          >
            <Icon className="h-5 w-5" />
            
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              {item.label}
            </div>
          </Link>
        )
      })}
    </div>
  )
}