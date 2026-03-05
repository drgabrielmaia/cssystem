'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Users, Search, Mail, Shield, ShieldCheck, Eye, UserCog } from 'lucide-react'

interface OrganizationUser {
  id: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  user_id: string
  nome_completo?: string | null
  ano_nascimento?: number | null
  foto_perfil?: string | null
  funcao?: string | null
  profile_completed?: boolean
}

const ROLE_CONFIG: Record<string, { label: string; color: string; dotColor: string; bgGlow: string }> = {
  owner: {
    label: 'Proprietario',
    color: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
    dotColor: 'bg-emerald-400',
    bgGlow: 'from-emerald-500/[0.06]',
  },
  admin: {
    label: 'Administrador',
    color: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
    dotColor: 'bg-amber-400',
    bgGlow: 'from-amber-500/[0.06]',
  },
  manager: {
    label: 'Gerente',
    color: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20',
    dotColor: 'bg-blue-400',
    bgGlow: 'from-blue-500/[0.06]',
  },
  member: {
    label: 'Membro',
    color: 'bg-white/[0.06] text-white/60 ring-1 ring-white/[0.08]',
    dotColor: 'bg-white/40',
    bgGlow: 'from-white/[0.03]',
  },
  viewer: {
    label: 'Visualizador',
    color: 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20',
    dotColor: 'bg-purple-400',
    bgGlow: 'from-purple-500/[0.06]',
  },
}

function getInitials(email: string): string {
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

function getRoleConfig(role: string) {
  return ROLE_CONFIG[role] || ROLE_CONFIG.member
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'owner':
      return <ShieldCheck className="h-3.5 w-3.5" />
    case 'admin':
      return <Shield className="h-3.5 w-3.5" />
    case 'manager':
      return <UserCog className="h-3.5 w-3.5" />
    case 'viewer':
      return <Eye className="h-3.5 w-3.5" />
    default:
      return <Users className="h-3.5 w-3.5" />
  }
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateString))
}

export default function FuncionariosPage() {
  const { user, organizationId } = useAuth()
  const [members, setMembers] = useState<OrganizationUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (organizationId) {
      loadMembers()
    }
  }, [organizationId])

  const loadMembers = async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('organization_users')
        .select('id, email, role, is_active, created_at, user_id, nome_completo, ano_nascimento, foto_perfil, funcao, profile_completed')
        .eq('organization_id', organizationId)
        .order('role')

      if (error) {
        console.error('Erro ao carregar funcionarios:', error)
        return
      }

      setMembers(data || [])
    } catch (err) {
      console.error('Erro ao carregar funcionarios:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = members.filter((member) => {
    const search = searchTerm.toLowerCase()
    return member.email.toLowerCase().includes(search) ||
      (member.nome_completo && member.nome_completo.toLowerCase().includes(search)) ||
      (member.funcao && member.funcao.toLowerCase().includes(search))
  })

  // KPI calculations
  const totalMembers = members.length
  const activeMembers = members.filter((m) => m.is_active).length
  const roleBreakdown = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] || 0) + 1
    return acc
  }, {})

  // Find the top 3 roles for the KPI display
  const topRoles = Object.entries(roleBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <Header title="Funcionarios" subtitle="Membros da organizacao" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Skeleton KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-white/10 animate-pulse" />
                  <div className="h-3 w-24 bg-white/[0.06] rounded animate-pulse" />
                </div>
                <div className="h-8 w-20 bg-white/[0.06] rounded animate-pulse mb-2" />
                <div className="h-3 w-32 bg-white/[0.04] rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Skeleton cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[#141418] rounded-2xl p-6 ring-1 ring-white/[0.06]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-white/[0.06] animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-40 bg-white/[0.06] rounded animate-pulse mb-2" />
                    <div className="h-3 w-20 bg-white/[0.04] rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-3 w-28 bg-white/[0.04] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Header title="Funcionarios" subtitle="Membros da organizacao" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Members */}
          <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-blue-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Total de Membros</p>
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">{totalMembers}</p>
              <p className="text-xs text-white/30 mt-1">{activeMembers} ativos</p>
            </div>
          </div>

          {/* Active Members */}
          <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-emerald-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Ativos</p>
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">{activeMembers}</p>
              <p className="text-xs text-white/30 mt-1">
                {totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0}% do total
              </p>
            </div>
          </div>

          {/* Inactive Members */}
          <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-red-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Inativos</p>
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">{totalMembers - activeMembers}</p>
              <p className="text-xs text-white/30 mt-1">
                {totalMembers > 0 ? Math.round(((totalMembers - activeMembers) / totalMembers) * 100) : 0}% do total
              </p>
            </div>
          </div>

          {/* Role Breakdown */}
          <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-purple-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Funcoes</p>
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">{Object.keys(roleBreakdown).length}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {topRoles.map(([role, count]) => (
                  <span key={role} className="text-[11px] text-white/30">
                    {getRoleConfig(role).label}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-[#141418] rounded-2xl p-4 ring-1 ring-white/[0.06]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder="Buscar por nome, email ou funcao..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/30 focus:ring-1 focus:ring-white/10 focus:border-white/10"
            />
          </div>
        </div>

        {/* Role Breakdown Bar */}
        {Object.keys(roleBreakdown).length > 0 && (
          <div className="bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06]">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-white/40" />
              <p className="text-sm font-medium text-white/60">Distribuicao por Funcao</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(roleBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([role, count]) => {
                  const config = getRoleConfig(role)
                  return (
                    <div
                      key={role}
                      className="flex items-center gap-2 bg-white/[0.02] rounded-xl px-3 py-2 ring-1 ring-white/[0.04]"
                    >
                      <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                      <span className="text-sm text-white/60">{config.label}</span>
                      <span className="text-sm font-bold text-white tabular-nums">{count}</span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Members Grid */}
        {filteredMembers.length === 0 ? (
          <div className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-white/20" />
            </div>
            <p className="text-white/40 text-sm">
              {searchTerm
                ? 'Nenhum funcionario encontrado para esta busca'
                : 'Nenhum funcionario encontrado'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => {
              const config = getRoleConfig(member.role)
              const initials = getInitials(member.email)

              return (
                <div
                  key={member.id}
                  className={`group relative bg-[#141418] rounded-2xl p-6 ring-1 ring-white/[0.06] hover:ring-white/[0.12] transition-all duration-300 overflow-hidden ${
                    !member.is_active ? 'opacity-60' : ''
                  }`}
                >
                  {/* Subtle glow effect based on role */}
                  <div
                    className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${config.bgGlow} to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                  />

                  <div className="relative">
                    {/* Avatar + Info */}
                    <div className="flex items-start gap-4 mb-4">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/[0.08] to-white/[0.02] ring-1 ring-white/[0.08] flex items-center justify-center overflow-hidden">
                          {member.foto_perfil ? (
                            <img src={member.foto_perfil} alt={member.nome_completo || ''} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-white/70">{initials}</span>
                          )}
                        </div>
                        {/* Active indicator dot */}
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#141418] ${
                            member.is_active ? 'bg-emerald-400' : 'bg-red-400'
                          }`}
                        />
                      </div>

                      {/* Name/Email and Role */}
                      <div className="flex-1 min-w-0">
                        {member.nome_completo && (
                          <p className="text-sm font-semibold text-white truncate mb-0.5">{member.nome_completo}</p>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          <Mail className="h-3 w-3 text-white/30 flex-shrink-0" />
                          <p className="text-xs text-white/50 truncate">{member.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${config.color} text-[11px] font-medium px-2 py-0.5 gap-1 border-0`}>
                            {getRoleIcon(member.role)}
                            {config.label}
                          </Badge>
                          {member.funcao && (
                            <span className="text-[11px] text-white/40">{member.funcao}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-white/[0.04] mb-3" />

                    {/* Meta info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            member.is_active ? 'bg-emerald-400' : 'bg-red-400'
                          }`}
                        />
                        <span className={`text-xs ${member.is_active ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                          {member.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <span className="text-[11px] text-white/25">
                        Desde {formatDate(member.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Results count */}
        {searchTerm && filteredMembers.length > 0 && (
          <div className="text-center">
            <p className="text-xs text-white/25">
              {filteredMembers.length} de {totalMembers} funcionario{totalMembers !== 1 ? 's' : ''} encontrado{filteredMembers.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
