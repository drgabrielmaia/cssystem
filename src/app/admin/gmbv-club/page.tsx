'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Users,
  Target,
  TrendingUp,
  DollarSign,
  BarChart3,
  Building2,
  Clock,
  MessageCircle,
  ChevronRight,
  Shield,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface OrganizationStats {
  id: string
  name: string
  leads_count: number
  mentorados_count: number
  faturamento_total: number
  comissoes_count: number
  ativos_count: number
  created_at: string
}

const ADMIN_ORG_ID = '9c8c0033-15ea-4e33-a55f-28d81a19693b'

export default function GMBVClubPage() {
  const { user, organizationId } = useAuth()
  const router = useRouter()
  const [organizations, setOrganizations] = useState<OrganizationStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState<OrganizationStats | null>(null)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!user || !organizationId) {
      if (!loading) router.push('/login')
      return
    }
    // Only allow access from the admin organization
    if (organizationId !== ADMIN_ORG_ID) {
      router.push('/dashboard')
      return
    }
    setAuthorized(true)
    loadOrganizations()
  }, [user, organizationId])

  const loadOrganizations = async () => {
    try {
      setLoading(true)

      // Execute all queries in parallel for better performance
      const [
        { data: orgsData, error: orgsError },
        { data: leadsStats, error: leadsError },
        { data: mentoradosStats, error: mentoradosError },
        { data: faturamentoStats, error: faturamentoError },
        { data: atividadesStats, error: atividadesError }
      ] = await Promise.all([
        // Get organizations
        supabase
          .from('organizations')
          .select('id, name, created_at')
          .order('created_at', { ascending: false }),

        // Get leads stats aggregated by organization
        supabase
          .from('leads')
          .select('organization_id, possui_comissao')
          .not('organization_id', 'is', null),

        // Get mentorados stats
        supabase
          .from('mentorado_atividades')
          .select('organization_id, mentorado_id')
          .not('organization_id', 'is', null),

        // Get faturamento stats
        supabase
          .from('leads')
          .select('organization_id, valor_vendido')
          .not('organization_id', 'is', null)
          .not('valor_vendido', 'is', null),

        // Get atividades stats
        supabase
          .from('mentorado_atividades')
          .select('organization_id')
          .not('organization_id', 'is', null)
      ])

      if (orgsError) {
        console.error('Erro ao carregar organizacoes:', orgsError)
        return
      }

      // Process stats in memory instead of multiple database calls
      const organizationsWithStats: OrganizationStats[] = (orgsData || []).map(org => {
        const orgLeads = leadsStats?.filter(l => l.organization_id === org.id) || []
        const orgMentorados = mentoradosStats?.filter(m => m.organization_id === org.id) || []
        const orgFaturamento = faturamentoStats?.filter(f => f.organization_id === org.id) || []
        const orgAtividades = atividadesStats?.filter(a => a.organization_id === org.id) || []

        const faturamentoTotal = orgFaturamento.reduce((sum, lead) => {
          const val = parseFloat(lead.valor_vendido) || 0
          return sum + (isNaN(val) ? 0 : val)
        }, 0)

        const comissoesCount = orgLeads.filter(lead => lead.possui_comissao === true).length

        // Count unique mentorados
        const uniqueMentorados = new Set(orgMentorados.map(m => m.mentorado_id))

        return {
          id: org.id,
          name: org.name || 'Sem nome',
          leads_count: orgLeads.length,
          mentorados_count: uniqueMentorados.size,
          faturamento_total: faturamentoTotal,
          comissoes_count: comissoesCount,
          ativos_count: orgAtividades.length,
          created_at: org.created_at
        }
      })

      setOrganizations(organizationsWithStats)
    } catch (error) {
      console.error('Erro ao carregar estatisticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    const safeValue = isNaN(value) || !isFinite(value) ? 0 : value
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(safeValue)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date)
  }

  const calculateGrowthRate = (current: number, previous: number) => {
    if (previous === 0) return 0
    const growth = ((current - previous) / previous) * 100
    return Math.round(growth * 10) / 10
  }

  // Estatisticas gerais
  const totalOrganizations = organizations.length
  const totalLeads = organizations.reduce((sum, org) => sum + org.leads_count, 0)
  const totalMentorados = organizations.reduce((sum, org) => sum + org.mentorados_count, 0)
  const totalFaturamento = organizations.reduce((sum, org) => sum + org.faturamento_total, 0)
  const avgFaturamentoPorOrg = totalOrganizations > 0 ? totalFaturamento / totalOrganizations : 0
  const avgLeadsPorOrg = totalOrganizations > 0 ? totalLeads / totalOrganizations : 0

  if (!authorized || loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <Header title="GMBV Club" subtitle="Visao administrativa de todas as organizacoes" />
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
          {/* Skeleton org list */}
          <div className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] overflow-hidden">
            <div className="px-6 py-5 border-b border-white/[0.06]">
              <div className="h-5 w-56 bg-white/[0.06] rounded animate-pulse mb-2" />
              <div className="h-3 w-72 bg-white/[0.04] rounded animate-pulse" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-6 py-5 border-b border-white/[0.04]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="h-5 w-40 bg-white/[0.06] rounded animate-pulse mb-2" />
                    <div className="h-3 w-28 bg-white/[0.04] rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-5 bg-white/[0.04] rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="text-center">
                      <div className="h-6 w-12 bg-white/[0.06] rounded animate-pulse mx-auto mb-1" />
                      <div className="h-3 w-14 bg-white/[0.04] rounded animate-pulse mx-auto" />
                    </div>
                  ))}
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
      <Header title="GMBV Club" subtitle="Visao administrativa de todas as organizacoes" />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Organizacoes */}
          <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-blue-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Organizacoes</p>
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">{totalOrganizations}</p>
              <p className="text-xs text-white/30 mt-1">Organizacoes ativas</p>
            </div>
          </div>

          {/* Total Leads */}
          <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-emerald-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Total de Leads</p>
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">{totalLeads}</p>
              <p className="text-xs text-white/30 mt-1">Media: {avgLeadsPorOrg.toFixed(1)} leads/org</p>
            </div>
          </div>

          {/* Total Mentorados */}
          <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-purple-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Total de Mentorados</p>
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">{totalMentorados}</p>
              <p className="text-xs text-white/30 mt-1">
                Media: {totalOrganizations > 0 ? (totalMentorados / totalOrganizations).toFixed(1) : '0'} mentorados/org
              </p>
            </div>
          </div>

          {/* Faturamento Total */}
          <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-yellow-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-yellow-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Faturamento Total</p>
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">{formatCurrency(totalFaturamento)}</p>
              <p className="text-xs text-white/30 mt-1">Media: {formatCurrency(avgFaturamentoPorOrg)}/org</p>
            </div>
          </div>
        </div>

        {/* Lista de Organizacoes */}
        <div className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-5 w-5 text-white/40" />
              <h2 className="text-lg font-semibold text-white">Organizacoes e Estatisticas</h2>
            </div>
            <p className="text-sm text-white/40">Clique em uma organizacao para ver detalhes</p>
          </div>

          {organizations.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-6 w-6 text-white/20" />
              </div>
              <p className="text-white/40 text-sm">Nenhuma organizacao encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  onClick={() => setSelectedOrg(org)}
                  className={cn(
                    'px-6 py-5 cursor-pointer transition-all duration-200 hover:bg-white/[0.02]',
                    selectedOrg?.id === org.id && 'bg-white/[0.04]'
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-white truncate">{org.name}</h3>
                      <p className="text-xs text-white/30 mt-0.5">
                        Criada em {formatDate(org.created_at)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/20 flex-shrink-0 ml-4" />
                  </div>

                  {/* Estatisticas Compactas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3 bg-white/[0.02] rounded-xl px-3 py-2.5">
                      <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-white tabular-nums">{org.leads_count}</p>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider">Leads</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/[0.02] rounded-xl px-3 py-2.5">
                      <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-white tabular-nums">{org.mentorados_count}</p>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider">Mentorados</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/[0.02] rounded-xl px-3 py-2.5">
                      <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-white tabular-nums truncate">{formatCurrency(org.faturamento_total)}</p>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider">Faturamento</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/[0.02] rounded-xl px-3 py-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-white tabular-nums">{org.ativos_count}</p>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider">Atividades</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Detalhes da Organizacao - using shadcn Dialog */}
        <Dialog open={!!selectedOrg} onOpenChange={(open) => { if (!open) setSelectedOrg(null) }}>
          <DialogContent className="bg-[#141418] border-white/[0.06] ring-1 ring-white/[0.06] text-white max-w-4xl max-h-[90vh] overflow-hidden p-0">
            <DialogHeader className="px-6 pt-6 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white">
                    {selectedOrg?.name}
                  </DialogTitle>
                  <DialogDescription className="text-white/40 text-sm">
                    Detalhes e metricas da organizacao
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 pb-6 pt-4 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
              {/* Grid de Estatisticas Detalhadas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Leads */}
                <div className="bg-[#0A0A0A] rounded-xl p-4 ring-1 ring-white/[0.06]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Leads Detalhados</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/40">Total de Leads</span>
                      <span className="text-lg font-bold text-white tabular-nums">{selectedOrg?.leads_count}</span>
                    </div>
                    <div className="h-px bg-white/[0.04]" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/40">Leads por Dia (media)</span>
                      <span className="text-lg font-bold text-white tabular-nums">
                        {selectedOrg && selectedOrg.leads_count > 0
                          ? (selectedOrg.leads_count / 30).toFixed(1)
                          : '0'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mentorados */}
                <div className="bg-[#0A0A0A] rounded-xl p-4 ring-1 ring-white/[0.06]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Mentorados Ativos</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/40">Total de Mentorados</span>
                      <span className="text-lg font-bold text-white tabular-nums">{selectedOrg?.mentorados_count}</span>
                    </div>
                    <div className="h-px bg-white/[0.04]" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/40">Mentorados por Org (media)</span>
                      <span className="text-lg font-bold text-white tabular-nums">
                        {selectedOrg && totalOrganizations > 0
                          ? (selectedOrg.mentorados_count / totalOrganizations).toFixed(1)
                          : '0'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Faturamento */}
                <div className="bg-[#0A0A0A] rounded-xl p-4 ring-1 ring-white/[0.06]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Faturamento</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/40">Faturamento Total</span>
                      <span className="text-lg font-bold text-white tabular-nums">{selectedOrg ? formatCurrency(selectedOrg.faturamento_total) : 'R$ 0,00'}</span>
                    </div>
                    <div className="h-px bg-white/[0.04]" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/40">Ticket Medio</span>
                      <span className="text-lg font-bold text-white tabular-nums">
                        {selectedOrg && selectedOrg.leads_count > 0
                          ? formatCurrency(selectedOrg.faturamento_total / selectedOrg.leads_count)
                          : 'R$ 0,00'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Comissoes */}
                <div className="bg-[#0A0A0A] rounded-xl p-4 ring-1 ring-white/[0.06]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Comissoes</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/40">Leads com Comissao</span>
                      <span className="text-lg font-bold text-white tabular-nums">{selectedOrg?.comissoes_count}</span>
                    </div>
                    <div className="h-px bg-white/[0.04]" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/40">Taxa de Conversao</span>
                      <span className="text-lg font-bold text-white tabular-nums">
                        {selectedOrg && selectedOrg.leads_count > 0 && selectedOrg.comissoes_count > 0
                          ? ((selectedOrg.comissoes_count / selectedOrg.leads_count) * 100).toFixed(1) + '%'
                          : '0%'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Atividades */}
                <div className="bg-[#0A0A0A] rounded-xl p-4 ring-1 ring-white/[0.06]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Atividades Recentes</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/40">Atividades Registradas</span>
                      <span className="text-lg font-bold text-white tabular-nums">{selectedOrg?.ativos_count}</span>
                    </div>
                    <div className="h-px bg-white/[0.04]" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/40">Engajamento Medio</span>
                      <span className="text-lg font-bold text-white tabular-nums">
                        {selectedOrg && selectedOrg.mentorados_count > 0 && selectedOrg.ativos_count > 0
                          ? (selectedOrg.ativos_count / selectedOrg.mentorados_count).toFixed(1) + ' ativ/ment'
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div className="bg-[#0A0A0A] rounded-xl p-4 ring-1 ring-white/[0.06]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Performance da Org</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/40">Posicao no Ranking</span>
                      <span className="text-lg font-bold text-white tabular-nums">
                        #{selectedOrg ? organizations.findIndex(o => o.id === selectedOrg.id) + 1 : '-'} de {totalOrganizations}
                      </span>
                    </div>
                    <div className="h-px bg-white/[0.04]" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/40">Score de Saude</span>
                      <span className="text-sm font-semibold">
                        {selectedOrg && selectedOrg.leads_count > 10 ? (
                          <span className="text-emerald-400">Excelente</span>
                        ) : selectedOrg && selectedOrg.leads_count > 5 ? (
                          <span className="text-blue-400">Bom</span>
                        ) : selectedOrg && selectedOrg.leads_count > 0 ? (
                          <span className="text-yellow-400">Em Desenvolvimento</span>
                        ) : (
                          <span className="text-white/30">Sem Dados</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <DialogFooter className="px-6 py-4 border-t border-white/[0.06] flex flex-row gap-3 sm:justify-between">
              <Button
                variant="ghost"
                onClick={() => setSelectedOrg(null)}
                className="text-white/40 hover:text-white hover:bg-white/[0.06]"
              >
                Fechar
              </Button>
              <Button
                onClick={() => selectedOrg && router.push(`/admin/organizations/${selectedOrg.id}`)}
                className="bg-white text-black hover:bg-white/90 font-semibold"
              >
                Ver Dashboard Completo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
