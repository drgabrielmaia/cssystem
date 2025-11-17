'use client'

import { Search, Bell, Settings, User, ChevronLeft } from 'lucide-react'
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
  return (
    <div className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-6">
      {/* Left Side - Back Button & Logo */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" className="text-[#6B7280] hover:text-[#111827]">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CS</span>
          </div>
          <span className="font-semibold text-[#111827] hidden md:block">Customer Success</span>
        </div>
      </div>

      {/* Center - Search */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] h-4 w-4" />
          <Input 
            placeholder="Buscar mentorados, casos..." 
            className="pl-10 bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          />
        </div>
      </div>

      {/* Right Side - Actions & Profile */}
      <div className="flex items-center space-x-3">
        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB]"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 bg-[#EF4444] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            3
          </span>
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="sm"
          className="text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB]"
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
                <AvatarImage src="/avatar.jpg" alt="User" />
                <AvatarFallback className="bg-[#2563EB] text-white text-sm">GM</AvatarFallback>
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
            <DropdownMenuItem>
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}