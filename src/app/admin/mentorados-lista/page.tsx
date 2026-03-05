'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/auth'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { Input } from '@/components/ui/input'
import { Users, Search, Phone, Mail, UserCheck, UserX } from 'lucide-react'

interface Mentorado {
  id: string
  nome_completo: string
  email: string
  telefone: string | null
  data_nascimento: string | null
  estado_atual: string | null
  avatar_url: string | null
  status_login: string | null
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function extractYear(dateString: string | null): string | null {
  if (!dateString) return null
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return null
    return String(date.getFullYear())
  } catch {
    return null
  }
}

function getEstadoBadgeClasses(estado: string | null): string {
  if (!estado) return 'bg-white/[0.06] text-white/50'
  const normalized = estado.toLowerCase().trim()
  if (normalized === 'ativo' || normalized === 'ativa') {
    return 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
  }
  if (normalized === 'inativo' || normalized === 'inativa') {
    return 'bg-red-500/15 text-red-400 ring-1 ring-red-500/20'
  }
  if (normalized === 'bloqueado' || normalized === 'bloqueada') {
    return 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/20'
  }
  if (normalized === 'pendente') {
    return 'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/20'
  }
  return 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20'
}

export default function MentoradosListaPage() {
  const { user, organizationId } = useAuth()
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!organizationId) return
    loadMentorados()
  }, [organizationId])

  const loadMentorados = async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('mentorados')
        .select('id, nome_completo, email, telefone, data_nascimento, estado_atual, avatar_url, status_login')
        .eq('organization_id', organizationId)
        .order('nome_completo')

      if (error) {
        console.error('Erro ao carregar mentorados:', error)
        return
      }

      setMentorados(data || [])
    } catch (err) {
      console.error('Erro inesperado:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredMentorados = useMemo(() => {
    if (!searchTerm.trim()) return mentorados
    const term = searchTerm.toLowerCase()
    return mentorados.filter(
      (m) =>
        m.nome_completo.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term)
    )
  }, [mentorados, searchTerm])

  const stats = useMemo(() => {
    const total = mentorados.length
    const ativos = mentorados.filter(
      (m) => m.estado_atual?.toLowerCase() === 'ativo' || m.estado_atual?.toLowerCase() === 'ativa'
    ).length
    const inativos = mentorados.filter(
      (m) => m.estado_atual?.toLowerCase() === 'inativo' || m.estado_atual?.toLowerCase() === 'inativa'
    ).length
    return { total, ativos, inativos }
  }, [mentorados])

  // Skeleton loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <Header title="Mentorados" subtitle="Lista de todos os mentorados" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* KPI Skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] animate-pulse"
              >
                <div className="h-3 w-20 bg-white/[0.06] rounded mb-3" />
                <div className="h-8 w-16 bg-white/[0.06] rounded" />
              </div>
            ))}
          </div>
          {/* Search Skeleton */}
          <div className="bg-[#141418] rounded-2xl p-4 ring-1 ring-white/[0.06] animate-pulse">
            <div className="h-10 bg-white/[0.04] rounded-xl" />
          </div>
          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-[#141418] rounded-2xl p-6 ring-1 ring-white/[0.06] animate-pulse"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-white/[0.06]" />
                  <div className="h-4 w-32 bg-white/[0.06] rounded" />
                  <div className="h-3 w-16 bg-white/[0.06] rounded" />
                  <div className="h-5 w-20 bg-white/[0.06] rounded-full" />
                  <div className="w-full space-y-2 mt-2">
                    <div className="h-3 w-full bg-white/[0.06] rounded" />
                    <div className="h-3 w-3/4 bg-white/[0.06] rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Header title="Mentorados" subtitle="Lista de todos os mentorados" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total */}
          <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-blue-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Total Mentorados</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-white tabular-nums">{stats.total}</p>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Ativos */}
          <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-emerald-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Ativos</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-white tabular-nums">{stats.ativos}</p>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Inativos */}
          <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-red-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Inativos</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-white tabular-nums">{stats.inativos}</p>
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <UserX className="h-5 w-5 text-red-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-[#141418] rounded-2xl p-4 ring-1 ring-white/[0.06]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder="Buscar mentorado por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-11 bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/30 rounded-xl focus-visible:ring-blue-500/30 focus-visible:border-blue-500/30"
            />
            {searchTerm && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/30">
                {filteredMentorados.length} resultado{filteredMentorados.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Mentorados Grid */}
        {filteredMentorados.length === 0 ? (
          <div className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <Users className="h-7 w-7 text-white/20" />
            </div>
            <h3 className="text-base font-semibold text-white/60 mb-1">
              Nenhum mentorado encontrado
            </h3>
            <p className="text-sm text-white/30">
              {searchTerm
                ? 'Tente ajustar o termo de busca'
                : 'Nenhum mentorado cadastrado nesta organizacao'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMentorados.map((mentorado) => {
              const year = extractYear(mentorado.data_nascimento)
              return (
                <div
                  key={mentorado.id}
                  className="group bg-[#141418] rounded-2xl p-6 ring-1 ring-white/[0.06] hover:ring-white/[0.12] transition-all duration-300"
                >
                  {/* Avatar + Name + Year */}
                  <div className="flex flex-col items-center text-center mb-4">
                    {/* Avatar */}
                    <div className="relative mb-3">
                      {mentorado.avatar_url ? (
                        <img
                          src={mentorado.avatar_url}
                          alt={mentorado.nome_completo}
                          className="w-16 h-16 rounded-full object-cover ring-2 ring-white/[0.08]"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const fallback = target.nextElementSibling as HTMLElement
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div
                        className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-2 ring-white/[0.08] items-center justify-center"
                        style={{ display: mentorado.avatar_url ? 'none' : 'flex' }}
                      >
                        <span className="text-lg font-bold text-white/70">
                          {getInitials(mentorado.nome_completo)}
                        </span>
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className="text-sm font-semibold text-white truncate max-w-full">
                      {mentorado.nome_completo}
                    </h3>

                    {/* Year of Birth */}
                    {year && (
                      <p className="text-xs text-white/30 mt-0.5">{year}</p>
                    )}

                    {/* Estado Badge */}
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${getEstadoBadgeClasses(mentorado.estado_atual)}`}
                      >
                        {mentorado.estado_atual || 'Sem estado'}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 border-t border-white/[0.06] pt-4">
                    {/* Email */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                        <Mail className="h-3.5 w-3.5 text-white/30" />
                      </div>
                      <a
                        href={`mailto:${mentorado.email}`}
                        className="text-xs text-white/50 hover:text-white/80 transition-colors truncate"
                        title={mentorado.email}
                      >
                        {mentorado.email}
                      </a>
                    </div>

                    {/* Telefone */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                        <Phone className="h-3.5 w-3.5 text-white/30" />
                      </div>
                      {mentorado.telefone ? (
                        <a
                          href={`tel:${mentorado.telefone}`}
                          className="text-xs text-white/50 hover:text-white/80 transition-colors"
                        >
                          {mentorado.telefone}
                        </a>
                      ) : (
                        <span className="text-xs text-white/20 italic">Sem telefone</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
