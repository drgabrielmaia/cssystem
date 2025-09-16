'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FileText,
  Download,
  Settings,
  DollarSign,
  LogOut,
  Brain,
  BarChart3,
  Calendar,
  TrendingUp,
  Sparkles,
  Zap
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, description: 'Visão geral' },
  { name: 'Mentorados', href: '/mentorados', icon: Users, description: 'Gerenciar pessoas' },
  { name: 'Check-ins', href: '/checkins', icon: Calendar, description: 'Agendar reuniões' },
  { name: 'Formulários', href: '/formularios', icon: FileText, description: 'Pesquisas + IA' },
  { name: 'Pendências', href: '/pendencias', icon: DollarSign, description: 'Financeiro' },
]

function UserSection() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3 flex-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg">
          <span className="text-sm font-bold text-white">
            {user?.email?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {user?.email?.split('@')[0] || 'Usuário'}
          </p>
          <p className="text-xs text-emerald-200">Administrador</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={signOut}
        className="h-8 w-8 p-0 hover:bg-red-500/20 text-slate-300 hover:text-red-300 transition-all duration-200"
        title="Fazer logout"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-72 flex-col bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 border-r border-emerald-800 shadow-2xl">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-emerald-700/50">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-white">Customer Success</span>
            <p className="text-xs text-emerald-200">Management Hub</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 hover:scale-[1.02]',
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-white shadow-lg backdrop-blur-sm border border-emerald-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-emerald-800/30'
              )}
            >
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg mr-3 transition-colors',
                isActive
                  ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md'
                  : 'bg-slate-800/50 text-slate-400 group-hover:bg-emerald-700/50 group-hover:text-slate-300'
              )}>
                <item.icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs opacity-70">{item.description}</div>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="flex-shrink-0 border-t border-emerald-700/50 p-4">
        <div className="bg-gradient-to-r from-emerald-800/50 to-green-800/50 rounded-xl p-4 backdrop-blur-sm">
          <UserSection />
        </div>
      </div>
    </div>
  )
}