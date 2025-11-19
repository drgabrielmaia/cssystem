'use client'

import { useState } from 'react'
import { Search, Bell, User, LogOut, Zap } from 'lucide-react'
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
  title: string | React.ReactNode
  subtitle?: string | React.ReactNode
}

export function Header({ title, subtitle }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { user, signOut } = useAuth()

  return (
    <header className="cyber-header sticky top-0 z-40 flex h-20 items-center gap-4 sm:gap-6 px-4 sm:px-6">
      {/* Neural Grid Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="w-full h-full bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent"></div>
      </div>

      {/* Left Section - Logo/Brand */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center pulse-neon">
          <Zap className="h-6 w-6 text-white" />
        </div>

        {/* Page Title */}
        <div className="flex flex-col min-w-0 flex-1 lg:flex-initial">
          <h1 className="text-lg sm:text-xl font-bold text-white truncate">{title}</h1>
          {subtitle && (
            <div className="text-xs sm:text-sm text-cyan-300">{subtitle}</div>
          )}
        </div>
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 flex justify-center max-w-2xl mx-auto">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
          <input
            placeholder="🔍 Buscar leads neural..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neon-input w-full pl-12 pr-4 py-3"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent rounded-xl pointer-events-none"></div>
        </div>
      </div>

      {/* Right Section - Actions & User */}
      <div className="flex items-center space-x-4">
        {/* System Status Indicator */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-300 text-xs font-semibold uppercase tracking-wider">SISTEMA ATIVO</span>
        </div>

        {/* Neural Grid Toggle */}
        <button className="relative w-10 h-10 bg-gradient-to-br from-purple-400/20 to-cyan-400/20 rounded-xl border border-purple-400/30 flex items-center justify-center group hover:scale-110 transition-transform duration-300">
          <div className="w-4 h-4 border border-purple-400 rounded-sm"></div>
          <div className="absolute inset-0 bg-purple-400/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>

        {/* Notifications */}
        <div className="relative">
          <NotificationCenter />
        </div>

        {/* User Profile Neural Pod */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative group">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-xl p-0.5 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/avatar.jpg" alt="Avatar" />
                    <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-purple-500 text-white font-bold text-sm">
                      CS
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="cyber-modal w-64 p-0" align="end" forceMount>
            <div className="p-4 border-b border-cyan-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CS</span>
                </div>
                <div>
                  <p className="text-white font-semibold">SISTEMA NEURAL</p>
                  <p className="text-cyan-300 text-xs uppercase tracking-wider">
                    {user?.email || 'admin@neural.sys'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-2">
              <DropdownMenuItem className="hover:bg-cyan-500/10 rounded-lg transition-colors duration-200">
                <User className="mr-3 h-4 w-4 text-cyan-400" />
                <span className="text-white font-semibold">PERFIL NEURAL</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-purple-500/10 rounded-lg transition-colors duration-200">
                <Zap className="mr-3 h-4 w-4 text-purple-400" />
                <span className="text-white font-semibold">CONFIGURAÇÕES</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors duration-200"
              >
                <LogOut className="mr-3 h-4 w-4" />
                <span className="font-semibold">DESCONECTAR</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Scanning Line Effect */}
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>
    </header>
  )
}