'use client'

import { useState } from 'react'
import { Search, Bell, User, LogOut } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { NotificationCenter } from '@/components/notifications'
import { useAuth } from '@/contexts/auth'

interface HeaderProps {
  title: string
  subtitle?: string | React.ReactNode
}

export function Header({ title, subtitle }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { user, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-2 sm:gap-4 border-b border-gray-200 bg-white px-4 sm:px-6">
      {/* Page Title */}
      <div className="flex flex-col min-w-0 flex-1 lg:flex-initial">
        <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{title}</h1>
        {subtitle && (
          <div className="text-xs sm:text-sm text-gray-500">{subtitle}</div>
        )}
      </div>

      {/* Search */}
      <div className="ml-auto flex items-center space-x-2 sm:space-x-4">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar mentorados..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-60 lg:w-80 pl-9"
          />
        </div>

        {/* Notifications */}
        <NotificationCenter />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatar.jpg" alt="Avatar" />
                <AvatarFallback>CS</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Customer Success</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || 'cs@empresa.com'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}