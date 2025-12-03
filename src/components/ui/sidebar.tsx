'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  UserPlus,
  PhoneCall,
  Percent,
  Database,
  Users,
  Calendar,
  Share2,
  ClipboardCheck,
  Rocket,
  FileEdit,
  FileText,
  MessageCircle,
  Sparkles,
  ChevronDown,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', badge: null },
  { icon: UserPlus, label: 'Leads', path: '/leads', badge: 12 },
  { icon: PhoneCall, label: 'Follow-ups', path: '/follow-ups', badge: null },
  { icon: Percent, label: 'Comissões', path: '/comissoes', badge: null },
  { icon: Database, label: 'Cadastro', path: '/cadastro', badge: null },
  { icon: Users, label: 'Mentorados', path: '/mentorados', badge: null },
  { icon: Calendar, label: 'Calendário', path: '/calendario', badge: null },
  { icon: Share2, label: 'Social Seller', path: '/social', badge: null },
  { icon: ClipboardCheck, label: 'Check-ins', path: '/checkins', badge: 5 },
  { icon: Rocket, label: 'Onboarding', path: '/onboarding', badge: null },
  { icon: FileEdit, label: 'Form Builder', path: '/form-builder', badge: null },
  { icon: FileText, label: 'Respostas Forms', path: '/form-responses', badge: null },
  { icon: MessageCircle, label: 'WhatsApp', path: '/whatsapp', badge: 3 },
]

export const Sidebar = () => {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
      >
        <Menu className="w-6 h-6 text-[#475569]" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-50
        lg:translate-x-0 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      {/* Logo */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-[#0F172A] text-lg">Customer</h1>
            <p className="text-xs text-[#94A3B8] -mt-1">Success</p>
          </div>
        </div>

        {/* Close button for mobile */}
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-1 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-5 h-5 text-[#94A3B8]" />
        </button>
      </div>

      {/* User Profile */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F1F5F9]">
          <img
            src="/avatar.jpg"
            alt="User"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500 ring-offset-2"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#0F172A] text-sm truncate">Admin</p>
            <p className="text-xs text-[#94A3B8]">Administrador</p>
          </div>
          <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item, index) => {
            const isActive = pathname === item.path
            return (
              <li key={index}>
                <Link
                  href={item.path}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${isActive
                      ? 'bg-[#ECFDF5] text-[#059669]'
                      : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-[#059669]' : 'text-[#94A3B8]'}`} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-[#059669] text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <button className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-[#475569] hover:bg-[#F1F5F9] rounded-xl transition-colors">
          <LogOut className="w-5 h-5 text-[#94A3B8]" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
    </>
  )
}