'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname } from 'next/navigation'
import { MOCK_MODE, createMockMentorado } from '@/lib/mock-data'
import Link from 'next/link'
import { MentoradoAuthProvider } from '@/contexts/mentorado-auth'
import { ThemeProvider, useTheme } from '@/contexts/theme-context'
import {
  Home,
  Video,
  DollarSign,
  User,
  Search,
  Bell,
  TrendingUp,
  BookOpen,
  LogOut,
  Settings,
  Target,
  Sun,
  Moon
} from 'lucide-react'

interface MentoradoLayoutProps {
  children: React.ReactNode
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/mentorado',
    icon: Home
  },
  {
    name: 'Aulas',
    href: '/mentorado/videos',
    icon: Video
  },
  {
    name: 'Metas',
    href: '/mentorado/metas',
    icon: Target
  },
  {
    name: 'Comissões',
    href: '/mentorado/comissoes',
    icon: DollarSign
  },
  {
    name: 'Perfil',
    href: '/mentorado/perfil',
    icon: User
  }
]

function MentoradoLayoutContent({ children }: MentoradoLayoutProps) {
  const [mentorado, setMentorado] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()
  const { theme, toggleTheme, isDark } = useTheme()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // MOCK MODE: não setar mentorado no layout — deixar a página tratar via context
      if (MOCK_MODE) {
        setIsLoading(false)
        return
      }

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
          // Não redirecionar - deixar a página mostrar o login
        }
      } else {
        const savedMentorado = localStorage.getItem('mentorado')
        if (savedMentorado) {
          setMentorado(JSON.parse(savedMentorado))
        }
        // Não redirecionar - deixar a página mostrar o login
      }
    } catch (error) {
      console.error('Erro na verificação de auth:', error)
      // Não redirecionar - deixar a página mostrar o login
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      // 1. Fazer logout no Supabase
      await supabase.auth.signOut()

      // 2. Limpar TUDO do localStorage
      localStorage.clear()

      // 3. Limpar TUDO do sessionStorage
      sessionStorage.clear()

      // 4. Limpar cookies específicos (se houver)
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // 5. Forçar redirecionamento para página inicial
      window.location.href = '/mentorado'

    } catch (error) {
      console.error('Erro no logout:', error)

      // Fazer limpeza completa mesmo com erro
      localStorage.clear()
      sessionStorage.clear()
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Forçar redirecionamento
      window.location.href = '/mentorado'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!mentorado) {
    return (
      <div className="min-h-screen bg-white">
        {children}
      </div>
    )
  }

  return (
    <div className={`min-h-screen font-sans ${isDark ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
      {/* Header Superior */}
      <header className={`px-8 py-4 border-b ${isDark ? 'bg-[#141414] border-white/5' : 'bg-white border-[#F3F3F5]'}`}>
        <div className="flex items-center justify-between">
          {/* Logo e Navegação Principal */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-emerald-500' : 'bg-[#1A1A1A]'}`}>
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className={`ml-3 text-lg font-semibold ${isDark ? 'text-white' : 'text-[#1A1A1A]'}`}>Portal</span>
            </div>

            {/* Navegação Principal */}
            <nav className="hidden md:flex items-center space-x-6">
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href === '/mentorado' && pathname === '/mentorado') ||
                  (item.href !== '/mentorado' && pathname.startsWith(item.href))

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      isActive
                        ? isDark ? 'bg-white text-black' : 'bg-[#1A1A1A] text-white'
                        : isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F3F3F5]'
                    }`}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Ações do Usuário */}
          <div className="flex items-center space-x-4">
            {/* Busca */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Buscar aulas, módulos..."
                className={`pl-10 pr-4 py-2 border-0 rounded-full text-sm placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${isDark ? 'bg-white/10 text-white focus:bg-white/15' : 'bg-[#F3F3F5] text-[#1A1A1A] focus:bg-white'}`}
                onChange={(e) => {
                  // Implementar busca global
                  const searchTerm = e.target.value.toLowerCase()
                  if (searchTerm.length > 2) {
                    // Aqui poderia implementar uma busca global
                    console.log('Buscando por:', searchTerm)
                  }
                }}
              />
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'text-amber-400 hover:bg-white/10' : 'text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F3F3F5]'}`}
              title={isDark ? 'Modo claro' : 'Modo escuro'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notificações */}
            <button className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F3F3F5]'}`}>
              <Bell className="w-5 h-5" />
            </button>

            {/* Avatar e Menu */}
            <div className="flex items-center space-x-3">
              <Link
                href="/mentorado/perfil"
                className={`flex items-center space-x-3 rounded-lg p-2 transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#F3F3F5]'}`}
              >
                {mentorado?.avatar_url ? (
                  <img src={mentorado.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="hidden sm:block">
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-[#1A1A1A]'}`}>
                    {mentorado?.nome_completo?.split(' ')[0]}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    {mentorado?.turma || 'Mentorado'}
                  </p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className={`p-1 transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-[#6B7280] hover:text-[#1A1A1A]'}`}
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Layout de 3 Colunas */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar Esquerda - Menu do Portal do Mentorado */}
        <aside className={`w-64 border-r flex flex-col ${isDark ? 'bg-[#141414] border-white/5' : 'bg-white border-[#F3F3F5]'}`}>
          {/* Menu de Navegação */}
          <nav className="flex-1 p-6">
            <div className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href === '/mentorado' && pathname === '/mentorado') ||
                  (item.href !== '/mentorado' && pathname.startsWith(item.href))

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? isDark ? 'bg-white text-black' : 'bg-[#1A1A1A] text-white'
                        : isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F3F3F5]'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Rodapé do Menu */}
          <div className={`p-6 border-t ${isDark ? 'border-white/5' : 'border-[#F3F3F5]'}`}>
            <Link
              href="/mentorado/perfil"
              className={`flex items-center rounded-lg p-3 transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#F3F3F5]'}`}
            >
              {mentorado?.avatar_url ? (
                <img src={mentorado.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="ml-3">
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-[#1A1A1A]'}`}>
                  {mentorado?.nome_completo?.split(' ')[0]}
                </p>
                <p className="text-xs text-[#6B7280]">
                  {mentorado?.turma || 'Mentorado'}
                </p>
              </div>
            </Link>
          </div>
        </aside>

        {/* Conteúdo Principal */}
        <main className={`flex-1 overflow-y-auto ${isDark ? 'bg-[#0a0a0a]' : ''}`}>
          {children}
        </main>
      </div>

      {/* Mobile Navigation */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 border-t px-4 py-2 ${isDark ? 'bg-[#141414] border-white/5' : 'bg-white border-[#F3F3F5]'}`}>
        <div className="flex items-center justify-around">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href === '/mentorado' && pathname === '/mentorado') ||
              (item.href !== '/mentorado' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                  isActive
                    ? isDark ? 'text-white' : 'text-[#1A1A1A]'
                    : 'text-[#6B7280]'
                }`}
              >
                <item.icon className="w-5 h-5 mb-1" />
                <span className="text-xs">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>

    </div>
  )
}

export default function MentoradoLayout({ children }: MentoradoLayoutProps) {
  return (
    <ThemeProvider>
      <MentoradoAuthProvider>
        <MentoradoLayoutContent>
          {children}
        </MentoradoLayoutContent>
      </MentoradoAuthProvider>
    </ThemeProvider>
  )
}