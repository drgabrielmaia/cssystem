'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Target, TrendingUp, DollarSign, BarChart3, Building2, Shield, Clock, MessageCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth'
import { usePathname, useRouter } from 'next/navigation'

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

export default function GMBVClubPage() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [organizations, setOrganizations] = useState<OrganizationStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState<OrganizationStats | null>(null)

  useEffect(() => {
    loadOrganizations()
  }, [])

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
        console.error('Erro ao carregar organizações:', orgsError)
        return
      }

      // Process stats in memory instead of multiple database calls
      const organizationsWithStats: OrganizationStats[] = (orgsData || []).map(org => {
        const orgLeads = leadsStats?.filter(l => l.organization_id === org.id) || []
        const orgMentorados = mentoradosStats?.filter(m => m.organization_id === org.id) || []
        const orgFaturamento = faturamentoStats?.filter(f => f.organization_id === org.id) || []
        const orgAtividades = atividadesStats?.filter(a => a.organization_id === org.id) || []

        const faturamentoTotal = orgFaturamento.reduce((sum, lead) => {
          return sum + (lead.valor_vendido || 0)
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
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
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

  // Estatísticas gerais
  const totalOrganizations = organizations.length
  const totalLeads = organizations.reduce((sum, org) => sum + org.leads_count, 0)
  const totalMentorados = organizations.reduce((sum, org) => sum + org.mentorados_count, 0)
  const totalFaturamento = organizations.reduce((sum, org) => sum + org.faturamento_total, 0)
  const avgFaturamentoPorOrg = totalOrganizations > 0 ? totalFaturamento / totalOrganizations : 0
  const avgLeadsPorOrg = totalOrganizations > 0 ? totalLeads / totalOrganizations : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 border-t-transparent border-r-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-gray-900 p-6 border-b border-gray-700">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">🏆 GMBV Club</h1>
              <p className="text-blue-200 text-sm">Visão administrativa de todas as organizações</p>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="text-blue-200 hover:text-white transition-colors"
            >
              ← Voltar ao Admin
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Total de Organizações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-400">{totalOrganizations}</div>
              <p className="text-gray-400 text-sm mt-1">Organizações ativas</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Total de Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-400">{totalLeads}</div>
              <p className="text-gray-400 text-sm mt-1">Média: {avgLeadsPorOrg.toFixed(1)} leads/org</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="h-5 w-5" />
                Total de Mentorados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-purple-400">{totalMentorados}</div>
              <p className="text-gray-400 text-sm mt-1">Média: {(totalMentorados / totalOrganizations).toFixed(1)} mentorados/org</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Faturamento Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">{formatCurrency(totalFaturamento)}</div>
              <p className="text-gray-400 text-sm mt-1">Média: {formatCurrency(avgFaturamentoPorOrg)}/org</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Organizações */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">📊 Organizações e Estatísticas</h2>
            <p className="text-gray-400 text-sm mb-4">Clique em uma organização para ver detalhes</p>
          </div>

          {organizations.length === 0 ? (
            <div className="p-12 text-center">
              <MessageCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Nenhuma organização encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  onClick={() => setSelectedOrg(org)}
                  className={cn(
                    'p-4 cursor-pointer transition-all duration-200 hover:bg-gray-700/50',
                    selectedOrg?.id === org.id && 'bg-gray-700'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{org.name}</h3>
                      <p className="text-gray-400 text-xs">
                        Criada em {formatDate(org.created_at)}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  </div>

                  {/* Estatísticas Compactas */}
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    <div className="text-center">
                      <Users className="h-6 w-6 text-blue-400 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-white">{org.leads_count}</div>
                      <p className="text-gray-400 text-xs">Leads</p>
                    </div>

                    <div className="text-center">
                      <Target className="h-6 w-6 text-purple-400 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-white">{org.mentorados_count}</div>
                      <p className="text-gray-400 text-xs">Mentorados</p>
                    </div>

                    <div className="text-center">
                      <DollarSign className="h-6 w-6 text-yellow-400 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-white">{formatCurrency(org.faturamento_total)}</div>
                      <p className="text-gray-400 text-xs">Faturamento</p>
                    </div>

                    <div className="text-center">
                      <BarChart3 className="h-6 w-6 text-green-400 mx-auto mb-1" />
                      <div className="text-2xl font-bold text-white">{org.ativos_count}</div>
                      <p className="text-gray-400 text-xs">Atividades</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Detalhes da Organização */}
        {selectedOrg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-800 border border-gray-600 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Building2 className="h-6 w-6" />
                  {selectedOrg.name}
                </h2>
                <button
                  onClick={() => setSelectedOrg(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                {/* Grid de Estatísticas Detalhadas */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Leads */}
                  <Card className="bg-gray-900 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Leads Detalhados
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total de Leads:</span>
                          <span className="text-xl font-bold text-blue-400">{selectedOrg.leads_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Leads por Dia (média):</span>
                          <span className="text-xl font-bold text-blue-400">
                            {selectedOrg.leads_count > 0 
                              ? (selectedOrg.leads_count / 30).toFixed(1) 
                              : '0'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Mentorados */}
                  <Card className="bg-gray-900 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Mentorados Ativos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total de Mentorados:</span>
                          <span className="text-xl font-bold text-purple-400">{selectedOrg.mentorados_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Mentorados por Org (média):</span>
                          <span className="text-xl font-bold text-purple-400">
                            {totalOrganizations > 0 
                              ? (selectedOrg.mentorados_count / totalOrganizations).toFixed(1) 
                              : '0'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Faturamento */}
                  <Card className="bg-gray-900 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Faturamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Faturamento Total:</span>
                          <span className="text-xl font-bold text-yellow-400">{formatCurrency(selectedOrg.faturamento_total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Ticket Médio:</span>
                          <span className="text-xl font-bold text-yellow-400">
                            {selectedOrg.leads_count > 0 
                              ? formatCurrency(selectedOrg.faturamento_total / selectedOrg.leads_count) 
                              : 'R$ 0,00'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Comissões */}
                  <Card className="bg-gray-900 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Comissões
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Leads com Comissão:</span>
                          <span className="text-xl font-bold text-green-400">{selectedOrg.comissoes_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Taxa de Conversão:</span>
                          <span className="text-xl font-bold text-green-400">
                            {selectedOrg.leads_count > 0 && selectedOrg.comissoes_count > 0 
                              ? ((selectedOrg.comissoes_count / selectedOrg.leads_count) * 100).toFixed(1) + '%'
                              : '0%'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Atividades */}
                  <Card className="bg-gray-900 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Atividades Recentes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Atividades Registradas:</span>
                          <span className="text-xl font-bold text-orange-400">{selectedOrg.ativos_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Engajamento Médio:</span>
                          <span className="text-xl font-bold text-orange-400">
                            {selectedOrg.mentorados_count > 0 && selectedOrg.ativos_count > 0 
                              ? (selectedOrg.ativos_count / selectedOrg.mentorados_count).toFixed(1) + ' atividades/mentorado'
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Performance */}
                  <Card className="bg-gray-900 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Performance da Org
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Posição no Ranking:</span>
                          <span className="text-xl font-bold text-cyan-400">
                            #{organizations.findIndex(o => o.id === selectedOrg.id) + 1} de {totalOrganizations}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Score de Saúde:</span>
                          <span className="text-xl font-bold text-cyan-400">
                            {selectedOrg.leads_count > 10 ? 'Excelente' : 
                             selectedOrg.leads_count > 5 ? 'Bom' : 
                             selectedOrg.leads_count > 0 ? 'Em Desenvolvimento' : 'Sem Dados'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Footer do Modal */}
                <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
                  <button
                    onClick={() => router.push(`/admin/organizations/${selectedOrg.id}`)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
                  >
                    Ver Dashboard Completo
                  </button>
                  <button
                    onClick={() => setSelectedOrg(null)}
                    className="px-4 py-3 text-gray-400 hover:text-white rounded-lg font-semibold transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}