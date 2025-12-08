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
  UserCheck,
  Target
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
  { name: 'Metas', href: '/metas', icon: Target, description: 'Performance e Metas' },
  { name: 'Pendências', href: '/pendencias', icon: TrendingUp, description: 'Financeiro' },
  { name: 'Configurações', href: '/configuracoes', icon: Settings, description: 'Metas e preferências' },
]

function UserSection() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-gray-100">
      <div className="flex items-center space-x-3 flex-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6] shadow-sm ring-2 ring-white">
          <span className="text-sm font-bold text-white">
            {user?.email?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#0F172A] truncate">
            {user?.email?.split('@')[0] || 'Usuário'}
          </p>
          <p className="text-xs text-[#94A3B8]">Administrador</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={signOut}
        className="h-8 w-8 p-0 hover:bg-red-50 text-[#94A3B8] hover:text-red-600 transition-all duration-200"
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
          className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-200"
        >
          {isOpen ? <X className="h-4 w-4 text-[#475569]" /> : <Menu className="h-4 w-4 text-[#475569]" />}
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
        "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white border-r border-gray-200 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo Clean */}
        <div className="flex h-16 items-center px-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6] shadow-md">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-[#0F172A]">Customer Success</span>
              <p className="text-xs text-[#94A3B8]">Dashboard</p>
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
                  'group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-[#F1F5F9]',
                  isActive
                    ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]'
                    : 'text-[#475569] hover:text-[#0F172A]'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center w-5 h-5 mr-3',
                  isActive ? 'text-[#2563EB]' : 'text-[#94A3B8] group-hover:text-[#475569]'
                )}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-xs text-[#94A3B8] truncate mt-0.5">{item.description}</p>
                </div>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB] ml-2" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-100 p-4">
          <UserSection />
        </div>
      </div>
    </>
  )
}