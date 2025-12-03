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
  Activity,
  Clock,
  UserCheck
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, description: 'Visão geral' },
  { name: 'Leads', href: '/leads', icon: UserPlus, description: 'Novos prospects' },
  { name: 'Follow-ups', href: '/follow-ups', icon: Clock, description: 'Acompanhamentos' },
  { name: 'Comissões', href: '/comissoes', icon: DollarSign, description: 'Gestão de comissões' },
  { name: 'Cadastro', href: '/cadastro', icon: UserCheck, description: 'Mentorados indicadores' },
  { name: 'Mentorados', href: '/mentorados', icon: Users, description: 'Gerenciar pessoas' },
  { name: 'Calendário', href: '/calendario', icon: Calendar, description: 'Agendar eventos' },
  { name: 'Social Seller', href: '/social-seller', icon: Phone, description: 'Métricas de vendas' },
  { name: 'Check-ins', href: '/checkins', icon: BarChart3, description: 'Acompanhamento' },
  { name: 'Onboarding', href: '/onboarding', icon: Brain, description: 'Mapa mental de metas' },
  { name: 'Form Builder', href: '/form-builder', icon: Wrench, description: 'Criar formulários' },
  { name: 'Respostas Forms', href: '/form-responses', icon: Eye, description: 'Ver respostas' },
  { name: 'WhatsApp', href: '/whatsapp', icon: MessageCircle, description: 'Mensagens' },
  { name: 'Pendências', href: '/pendencias', icon: TrendingUp, description: 'Financeiro' },
  { name: 'Configurações', href: '/configuracoes', icon: Settings, description: 'Metas e preferências' },
]

function UserSection() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3 flex-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-mint-green to-pastel-green shadow-sm">
          <span className="text-sm font-medium text-gray-700">
            {user?.email?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">
            {user?.email?.split('@')[0] || 'Usuário'}
          </p>
          <p className="text-xs text-gray-500">Administrador</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={signOut}
        className="h-8 w-8 p-0 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-all duration-200"
        title="Sair"
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
        "fixed inset-y-0 left-0 z-50 flex w-72 flex-col sidebar-ultra-clean transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo Clean */}
        <div className="flex h-16 items-center px-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-mint-green to-lime-green shadow-sm">
              <LayoutDashboard className="h-5 w-5 text-gray-700" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-medium text-gray-800">Customer Success</span>
              <p className="text-xs text-gray-500">Dashboard</p>
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
                onClick={() => setIsOpen?.(false)}
                className={cn(
                  'sidebar-item-ultra-clean',
                  isActive && 'active'
                )}
              >
                <div className="sidebar-icon-clean">
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 truncate">{item.description}</p>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-100 px-6 py-4">
          <UserSection />
        </div>
      </div>
    </>
  )
}