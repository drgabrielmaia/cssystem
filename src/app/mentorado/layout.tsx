'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  Video,
  DollarSign,
  User,
  Menu,
  X,
  LogOut,
  Book,
  TrendingUp,
  Award
} from 'lucide-react'

interface MentoradoLayoutProps {
  children: React.ReactNode
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/mentorado',
    icon: Home,
    description: 'Visão geral do seu progresso'
  },
  {
    name: 'Vídeos & Aulas',
    href: '/mentorado/videos',
    icon: Video,
    description: 'Módulos e aulas de aprendizado'
  },
  {
    name: 'Comissões',
    href: '/mentorado/comissoes',
    icon: DollarSign,
    description: 'Acompanhe suas comissões'
  }
]

export default function MentoradoLayout({ children }: MentoradoLayoutProps) {
  const [mentorado, setMentorado] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const { data: mentoradoData, error } = await supabase
          .from('mentorados')
          .select('*')
          .eq('email', session.user.email)
          .eq('status_login', 'ativo')
          .single()

        if (mentoradoData && !error) {
          setMentorado(mentoradoData)
          localStorage.setItem('mentorado', JSON.stringify(mentoradoData))
        } else {
          await supabase.auth.signOut()
          window.location.href = '/mentorado'
        }
      } else {
        const savedMentorado = localStorage.getItem('mentorado')
        if (savedMentorado) {
          setMentorado(JSON.parse(savedMentorado))
        } else {
          window.location.href = '/mentorado'
        }
      }
    } catch (error) {
      console.error('Erro na verificação de auth:', error)
      window.location.href = '/mentorado'
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('mentorado')
      window.location.href = '/mentorado'
    } catch (error) {
      console.error('Erro no logout:', error)
      localStorage.removeItem('mentorado')
      window.location.href = '/mentorado'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!mentorado) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Book className="w-5 h-5 text-white" />
              </div>
              <span className="ml-3 font-semibold text-gray-900">Portal</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User info */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {mentorado.nome_completo}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {mentorado.turma || 'Mentorado'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href === '/mentorado' && pathname === '/mentorado') ||
                (item.href !== '/mentorado' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                    ${isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={`
                    mr-3 h-5 w-5 transition-colors
                    ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'}
                  `} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{item.name}</div>
                    <div className={`
                      text-xs truncate
                      ${isActive ? 'text-blue-100' : 'text-gray-500'}
                    `}>
                      {item.description}
                    </div>
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5 text-gray-400" />
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Portal do Mentorado</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}