'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  MessageCircle,
  Instagram,
  TrendingUp,
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  Target,
  UserCheck,
  Brain,
  Wrench,
  Eye,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  PlayCircle,
  Video,
  Shield,
  Building2
} from 'lucide-react'
import { useState } from 'react'

const modules = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    color: '#D4AF37', // Dourado Rolex
    items: [
      { name: 'Visão Geral', href: '/', icon: LayoutDashboard, description: 'Dashboard principal' },
    ]
  },
  {
    name: 'Gestão de Leads',
    icon: UserPlus,
    color: '#FFD700', // Dourado mais claro
    items: [
      { name: 'Leads', href: '/leads', icon: UserPlus, description: 'Novos prospects' },
      { name: 'Follow-ups', href: '/follow-ups', icon: Clock, description: 'Acompanhamentos' },
      { name: 'Cadastro', href: '/cadastro', icon: UserCheck, description: 'Mentorados indicadores' },
    ]
  },
  {
    name: 'Marketing',
    icon: TrendingUp,
    color: '#B8860B', // Dourado escuro
    items: [
      { name: 'WhatsApp', href: '/whatsapp', icon: MessageCircle, description: 'Mensagens automáticas' },
      { name: 'Instagram', href: '/instagram', icon: Instagram, description: 'Marketing no Instagram' },
    ]
  },
  {
    name: 'Gestão de Pessoas',
    icon: Users,
    color: '#DAA520', // Dourado médio
    items: [
      { name: 'Mentorados', href: '/lista-mentorados', icon: Users, description: 'Gerenciar pessoas' },
      { name: 'Onboarding', href: '/onboarding', icon: Brain, description: 'Mapa mental de metas' },
    ]
  },
  {
    name: 'Performance',
    icon: BarChart3,
    color: '#CD853F', // Dourado bronze
    items: [
      { name: 'Performance', href: '/social-seller', icon: TrendingUp, description: 'Métricas de vendas' },
      { name: 'Check-ins', href: '/checkins', icon: BarChart3, description: 'Acompanhamento' },
      { name: 'Metas', href: '/metas', icon: Target, description: 'Performance e Metas' },
    ]
  },
  {
    name: 'Plataforma de Vídeos',
    icon: PlayCircle,
    color: '#9F7AEA', // Roxo para vídeos
    items: [
      { name: 'Gerenciar Módulos', href: '/admin/videos', icon: Video, description: 'Módulos e aulas de vídeo' },
      { name: 'Controle de Acesso', href: '/admin/videos/access', icon: Shield, description: 'Limitar acesso por mentorado' },
    ]
  },
  {
    name: 'Financeiro',
    icon: DollarSign,
    color: '#D4AF37', // Dourado Rolex
    items: [
      { name: 'Dashboard', href: '/financeiro/dashboard', icon: BarChart3, description: 'Visão geral financeira' },
      { name: 'Análise Avançada', href: '/financeiro/analise', icon: TrendingUp, description: 'Gráficos e relatórios detalhados' },
      { name: 'Comissões', href: '/comissoes', icon: DollarSign, description: 'Gestão de comissões' },
      { name: 'Pendências', href: '/pendencias', icon: Clock, description: 'Contas e pendências' },
      { name: 'Gestão de Usuários', href: '/financeiro/usuarios', icon: Shield, description: 'Gerenciar acessos do financeiro' },
    ]
  },
  {
    name: 'Ferramentas',
    icon: Wrench,
    color: '#DAA520',
    items: [
      { name: 'Calendário', href: '/calendario', icon: Calendar, description: 'Agendar eventos' },
      { name: 'Form Builder', href: '/form-builder', icon: Wrench, description: 'Criar formulários' },
      { name: 'Respostas Forms', href: '/form-responses', icon: Eye, description: 'Ver respostas' },
    ]
  },
  {
    name: 'Administração',
    icon: Settings,
    color: '#6366F1', // Roxo para admin
    items: [
      { name: 'Gerenciar Usuários', href: '/admin/users', icon: Users, description: 'Controle de usuários da organização' },
      { name: 'Criar Usuário', href: '/admin/create-user', icon: UserPlus, description: 'Adicionar novo membro' },
      { name: 'Configurar Organização', href: '/admin/organization', icon: Building2, description: 'Configurações da organização' },
    ]
  },
  {
    name: 'Configurações',
    icon: Settings,
    color: '#8B7355',
    items: [
      { name: 'Configurações', href: '/configuracoes', icon: Settings, description: 'Metas e preferências' },
    ]
  },
]

function UserSection() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 shadow-xl">
      <div className="flex items-center space-x-3 flex-1">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#FFD700] shadow-lg ring-2 ring-gray-600">
          <span className="text-lg font-bold text-gray-900">
            {user?.email?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">
            {user?.email?.split('@')[0] || 'Usuário'}
          </p>
          <p className="text-xs text-gray-400">Administrador</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={signOut}
        className="h-8 w-8 p-0 hover:bg-red-900/20 text-gray-400 hover:text-red-400 transition-all duration-200"
        title="Sair"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  )
}

interface ModularSidebarProps {
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
}

export function ModularSidebar({ isOpen = false, setIsOpen }: ModularSidebarProps) {
  const pathname = usePathname()
  const [expandedModules, setExpandedModules] = useState<string[]>(['Dashboard', 'Gestão de Leads', 'Marketing'])

  const toggleModule = (moduleName: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleName)
        ? prev.filter(name => name !== moduleName)
        : [...prev, moduleName]
    )
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen?.(!isOpen)}
          className="bg-gray-900/95 backdrop-blur-sm border-[#D4AF37] shadow-xl hover:shadow-2xl transition-all duration-200 text-[#D4AF37] hover:bg-gray-800"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsOpen?.(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 border-r border-gray-700 shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo Section */}
        <div className="flex h-20 items-center px-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#FFD700] shadow-lg">
              <LayoutDashboard className="h-6 w-6 text-gray-900" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold text-white">Customer Success</span>
              <p className="text-xs text-[#D4AF37]">Sistema Modular</p>
            </div>
          </div>
        </div>

        {/* Navigation Modules */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-2">
          {modules.map((module) => {
            const isExpanded = expandedModules.includes(module.name)
            const hasActiveItem = module.items.some(item => pathname === item.href)

            return (
              <div key={module.name} className="space-y-1">
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(module.name)}
                  className={cn(
                    'w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-gray-800/60',
                    hasActiveItem ? 'bg-gray-800 text-[#D4AF37] border border-[#D4AF37]/20' : 'text-gray-300 hover:text-white'
                  )}
                >
                  <div className="flex items-center justify-center w-6 h-6 mr-3">
                    <module.icon className="h-5 w-5" style={{ color: hasActiveItem ? '#D4AF37' : module.color }} />
                  </div>
                  <span className="flex-1 text-left">{module.name}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" style={{ color: module.color }} />
                  ) : (
                    <ChevronRight className="h-4 w-4" style={{ color: module.color }} />
                  )}
                </button>

                {/* Module Items */}
                {isExpanded && (
                  <div className="ml-6 space-y-1 border-l border-gray-700 pl-4">
                    {module.items.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsOpen?.(false)}
                          className={cn(
                            'group flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200 hover:bg-gray-800/40',
                            isActive
                              ? 'bg-gradient-to-r from-[#D4AF37]/10 to-[#FFD700]/5 text-[#D4AF37] border-l-2 border-[#D4AF37]'
                              : 'text-gray-400 hover:text-gray-200 hover:border-l-2 hover:border-gray-600'
                          )}
                        >
                          <div className={cn(
                            'flex items-center justify-center w-4 h-4 mr-3',
                            isActive ? 'text-[#D4AF37]' : 'text-gray-500 group-hover:text-gray-300'
                          )}>
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.name}</p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
                          </div>
                          {isActive && (
                            <div className="w-2 h-2 rounded-full bg-[#D4AF37] ml-2" />
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-700 p-4">
          <UserSection />
        </div>
      </div>
    </>
  )
}