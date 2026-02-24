'use client'

import { Search, Bell, Settings, User, ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

export function Navbar() {
  const handleLogout = async () => {
    try {
      // Logout do Supabase
      await supabase.auth.signOut()

      // Limpar cookies customizados
      document.cookie = 'admin_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'

      // Redirecionar para login
      window.location.href = '/login'
    } catch (error) {
      console.error('Erro no logout:', error)
      // Mesmo com erro, limpar tudo e redirecionar
      document.cookie = 'admin_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
      window.location.href = '/login'
    }
  }

  return (
    <div className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Left Side - Back Button & Logo */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">CS</span>
          </div>
          <span className="font-semibold text-foreground hidden md:block">Customer Success</span>
        </div>
      </div>

      {/* Center - Search */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Buscar mentorados, casos..." 
            className="pl-10"
          />
        </div>
      </div>

      {/* Right Side - Actions & Profile */}
      <div className="flex items-center space-x-3">
        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
            3
          </span>
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="sm"
          asChild
        >
          <Link href="/configuracoes">
            <Settings className="h-5 w-5" />
          </Link>
        </Button>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt="User" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">GM</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium">Gabriel Maia</p>
                <p className="w-[200px] truncate text-sm text-muted-foreground">
                  gabriel@customersucess.com
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/configuracoes">
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}