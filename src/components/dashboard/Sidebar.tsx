'use client'

import {
  Home,
  Users,
  BarChart3,
  FileText,
  Settings,
  Calendar,
  MessageSquare,
  TrendingUp,
  DollarSign,
  Target,
  Brain
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  { icon: Users, href: '/lista-mentorados', label: 'Visão Geral' },
  { icon: Home, href: '/dashboard', label: 'Dashboard' },
  { icon: Brain, href: '/admin/mapas-mentais', label: 'Mapas Mentais' },
  { icon: FileText, href: '/cases', label: 'Cases' },
  { icon: BarChart3, href: '/analytics', label: 'Analytics' },
  { icon: MessageSquare, href: '/formularios', label: 'Formulários' },
  { icon: Calendar, href: '/checkins', label: 'Check-ins' },
  { icon: DollarSign, href: '/pendencias', label: 'Pendências' },
  { icon: Target, href: '/metas', label: 'Metas' },
  { icon: TrendingUp, href: '/relatorios', label: 'Relatórios' },
  { icon: Settings, href: '/configuracoes', label: 'Configurações' }
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-16 bg-card shadow-sm border-r border-border flex flex-col items-center py-4 space-y-2">
      {menuItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              group relative p-3 rounded-md transition-all duration-200 hover:bg-primary/10
              ${isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-primary'
              }
            `}
          >
            <Icon className="h-5 w-5" />

            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 border border-border">
              {item.label}
            </div>
          </Link>
        )
      })}
    </div>
  )
}