'use client'

import { Search, Bell, Settings } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
}

export const Header = ({ title, subtitle }: HeaderProps) => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-10">
      {/* Left: Title */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Space for mobile menu button */}
        <div className="lg:hidden w-12"></div>

        <div className="min-w-0">
          <h1 className="text-lg lg:text-xl font-bold text-[#0F172A] truncate">{title}</h1>
          {subtitle && <p className="text-sm text-[#475569] truncate hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      {/* Center: Search - Hidden on mobile */}
      <div className="hidden lg:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Buscar leads, mentorados..."
            className="w-full pl-12 pr-4 py-2.5 bg-[#F1F5F9] border border-gray-200 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-transparent
                       placeholder:text-[#94A3B8]"
          />
          <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-200 text-[#475569] text-xs rounded hidden xl:flex">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Status Badge - Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#ECFDF5] rounded-full">
          <div className="w-2 h-2 bg-[#059669] rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-[#059669] hidden lg:inline">SISTEMA ATIVO</span>
          <span className="text-xs font-semibold text-[#059669] lg:hidden">ATIVO</span>
        </div>

        {/* Search button for mobile */}
        <button className="lg:hidden p-2.5 hover:bg-[#F1F5F9] rounded-xl transition-colors">
          <Search className="w-5 h-5 text-[#475569]" />
        </button>

        {/* Settings - Hidden on small mobile */}
        <button className="hidden sm:block p-2.5 hover:bg-[#F1F5F9] rounded-xl transition-colors">
          <Settings className="w-5 h-5 text-[#475569]" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
          CS
        </div>
      </div>
    </header>
  )
}