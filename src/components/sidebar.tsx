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
  Zap,
  MessageCircle,
  Menu,
  X,
  Phone,
  UserPlus,
  Wrench,
  Eye,
  Activity
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, description: 'Visão geral' },
  { name: 'Leads', href: '/leads', icon: UserPlus, description: 'Novos prospects' },
  { name: 'Mentorados', href: '/mentorados', icon: Users, description: 'Gerenciar pessoas' },
  { name: 'Calendário', href: '/calendario', icon: Calendar, description: 'Agendar eventos' },
  { name: 'Social Seller', href: '/social-seller', icon: Phone, description: 'Métricas de vendas' },
  { name: 'Check-ins', href: '/checkins', icon: BarChart3, description: 'Acompanhamento' },
  { name: 'Formulários', href: '/formularios', icon: FileText, description: 'Pesquisas + IA' },
  { name: 'Form Builder', href: '/form-builder', icon: Wrench, description: 'Criar formulários' },
  { name: 'Respostas Forms', href: '/form-responses', icon: Eye, description: 'Ver respostas' },
  { name: 'WhatsApp', href: '/whatsapp', icon: MessageCircle, description: 'Mensagens' },
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

interface SidebarProps {
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
}

export function Sidebar({ isOpen = false, setIsOpen }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen?.(!isOpen)}
          className="bg-white/90 backdrop-blur-sm border-gray-200 shadow-lg"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen?.(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 border-r border-emerald-800 shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-emerald-700/50">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold text-white">Customer Success</span>
              <p className="text-xs text-emerald-200">Management Hub</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen?.(false)} // Close mobile menu on link click
                className={cn(
                  'group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 hover:scale-[1.02]',
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-white shadow-lg backdrop-blur-sm border border-emerald-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-emerald-800/30'
                )}
              >
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg mr-3 transition-colors flex-shrink-0',
                  isActive
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md'
                    : 'bg-slate-800/50 text-slate-400 group-hover:bg-emerald-700/50 group-hover:text-slate-300'
                )}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{item.name}</div>
                  <div className="text-xs opacity-70 truncate">{item.description}</div>
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
    </>
  )
}