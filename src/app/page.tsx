'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDateFilters } from '@/hooks/useDateFilters'
import { DateFilters } from '@/components/date-filters'
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Target,
  UserPlus,
  CheckCircle,
  Filter,
  RefreshCw,
  FileText,
  CreditCard,
  BarChart3,
  Eye,
  ExternalLink,
  Sparkles
} from 'lucide-react'

export default function Dashboard() {
  const router = useRouter()
  const dateFilters = useDateFilters()
  const [stats, setStats] = useState({
    totalMentorados: 0,
    totalCheckins: 0,
    totalFormularios: 0,
    npsMedia: 0
  })
  const [leadsStats, setLeadsStats] = useState({
    totalLeads: 0,
    valorVendido: 0,
    valorArrecadado: 0,
    leadsVendidos: 0
  })
  const [dividasStats, setDividasStats] = useState({
    totalDividas: 0,
    valorTotalPendente: 0,
    pessoasComDividas: 0
  })
  const [callsStats, setCallsStats] = useState({
    noShow: 0,
    rejeitadas: 0,
    vendidas: 0,
    totalCalls: 0,
    callsFeitas: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [dateFilters.filtroTempo, dateFilters.dataInicio, dateFilters.dataFim])

  const loadDashboardStats = async () => {
    try {
      const dateFilter = dateFilters.getDateFilter()

      // Buscar mentorados
      const { data: mentorados } = await supabase
        .from('mentorados')
        .select('id')

      // Buscar checkins agendados/pendentes (não realizados)
      const { data: checkins } = await supabase
        .from('checkins')
        .select('id')
        .eq('status', 'agendado')
      
      // Buscar pendências financeiras - MESMA LÓGICA DA PÁGINA DE PENDÊNCIAS
      const { data: mentoradosData } = await supabase
        .from('mentorados')
        .select('*')
        .order('nome_completo')

      const { data: despesasData } = await supabase
        .from('despesas_mensais')
        .select('*')

      let totalPendencias = 0
      let pessoasComPendencias = 0

      if (mentoradosData && despesasData) {
        const meses = [
          { key: 'agosto' }, { key: 'setembro' }, { key: 'outubro' }, { key: 'novembro' },
          { key: 'dezembro' }, { key: 'janeiro' }, { key: 'fevereiro' }, { key: 'marco' },
          { key: 'abril' }, { key: 'maio' }, { key: 'junho' }, { key: 'julho' }
        ]

        mentoradosData.forEach(mentorado => {
          const despesas = despesasData.find(d => d.nome === mentorado.nome_completo) || null
          let totalPendente = 0

          if (despesas) {
            meses.forEach(mes => {
              const valor = despesas[mes.key] || 0
              if (valor && valor > 0) {
                totalPendente += valor
              }
            })
          }

          if (totalPendente > 0) {
            totalPendencias += totalPendente
            pessoasComPendencias++
          }
        })
      }

      // Buscar todos os leads primeiro
      const { data: allLeads } = await supabase
        .from('leads')
        .select('id, status, valor_vendido, valor_arrecadado, data_primeiro_contato, convertido_em')

      let totalLeads = 0
      let valorVendido = 0
      let valorArrecadado = 0
      let leadsVendidos = 0

      if (allLeads) {
        // Filtrar leads por data_primeiro_contato para total de leads
        let leadsParaContar = allLeads
        if (dateFilter?.start || dateFilter?.end) {
          leadsParaContar = allLeads.filter(lead => {
            if (!lead.data_primeiro_contato) return false
            const leadDate = new Date(lead.data_primeiro_contato)

            if (dateFilter.start && dateFilter.end) {
              return leadDate >= new Date(dateFilter.start) && leadDate <= new Date(dateFilter.end)
            } else if (dateFilter.start) {
              return leadDate >= new Date(dateFilter.start)
            } else if (dateFilter.end) {
              return leadDate <= new Date(dateFilter.end)
            }
            return true
          })
        }
        totalLeads = leadsParaContar.length

        // Para leads vendidos, usar convertido_em se disponível, senão data_primeiro_contato
        let leadsVendidosParaContar = allLeads.filter(lead => lead.status === 'vendido')
        if (dateFilter?.start || dateFilter?.end) {
          leadsVendidosParaContar = leadsVendidosParaContar.filter(lead => {
            const dataConversao = lead.convertido_em || lead.data_primeiro_contato
            if (!dataConversao) return false
            const conversionDate = new Date(dataConversao)

            if (dateFilter.start && dateFilter.end) {
              return conversionDate >= new Date(dateFilter.start) && conversionDate <= new Date(dateFilter.end)
            } else if (dateFilter.start) {
              return conversionDate >= new Date(dateFilter.start)
            } else if (dateFilter.end) {
              return conversionDate <= new Date(dateFilter.end)
            }
            return true
          })
        }

        leadsVendidos = leadsVendidosParaContar.length
        valorVendido = leadsVendidosParaContar.reduce((sum, lead) => sum + (lead.valor_vendido || 0), 0)
        valorArrecadado = leadsVendidosParaContar.reduce((sum, lead) => sum + (lead.valor_arrecadado || 0), 0)
      }

      // Buscar calls por status (no-show, rejeitadas, vendidas)
      let noShow = 0
      let rejeitadas = 0
      let vendidas = 0
      let totalCalls = 0
      let callsFeitas = 0

      if (allLeads) {
        // Filtrar leads por data primeiro
        let leadsParaCall = allLeads
        if (dateFilter?.start || dateFilter?.end) {
          leadsParaCall = allLeads.filter(lead => {
            if (!lead.data_primeiro_contato) return false
            const leadDate = new Date(lead.data_primeiro_contato)

            if (dateFilter.start && dateFilter.end) {
              return leadDate >= new Date(dateFilter.start) && leadDate <= new Date(dateFilter.end)
            } else if (dateFilter.start) {
              return leadDate >= new Date(dateFilter.start)
            } else if (dateFilter.end) {
              return leadDate <= new Date(dateFilter.end)
            }
            return true
          })
        }

        // Contar calls por status
        leadsParaCall.forEach(lead => {
          if (lead.status === 'no-show') {
            noShow++
            totalCalls++
          } else if (lead.status === 'rejeitado' || lead.status === 'rejeitada') {
            rejeitadas++
            totalCalls++
          } else if (lead.status === 'vendido') {
            vendidas++
            totalCalls++
            callsFeitas++
          } else if (lead.status === 'proposta_enviada') {
            // Proposta enviada também conta como call realizada (vendida)
            vendidas++
            totalCalls++
            callsFeitas++
          } else if (lead.status === 'perdido') {
            // Perdido também conta como call já feita
            callsFeitas++
          }
        })
      }

      // Buscar pendências financeiras - MESMA LÓGICA DA PÁGINA DE PENDÊNCIAS
      const { data: mentoradosCompletos } = await supabase
        .from('mentorados')
        .select('*')
        .order('nome_completo')

      const { data: despesasDashboard } = await supabase
        .from('despesas_mensais')
        .select('*')

      let totalDividas = 0
      let valorTotalPendente = 0
      let pessoasComDividas = 0

      if (mentoradosCompletos && despesasDashboard) {
        const meses = [
          { key: 'agosto' }, { key: 'setembro' }, { key: 'outubro' }, { key: 'novembro' },
          { key: 'dezembro' }, { key: 'janeiro' }, { key: 'fevereiro' }, { key: 'marco' },
          { key: 'abril' }, { key: 'maio' }, { key: 'junho' }, { key: 'julho' }
        ]

        mentoradosCompletos.forEach(mentorado => {
          const despesas = despesasDashboard.find(d => d.nome === mentorado.nome_completo) || null
          let totalPendente = 0
          let qtdDividas = 0

          if (despesas) {
            meses.forEach(mes => {
              const valor = despesas[mes.key] || 0
              if (valor && valor > 0) {
                totalPendente += valor
                qtdDividas++
              }
            })
          }

          if (totalPendente > 0) {
            valorTotalPendente += totalPendente
            pessoasComDividas++
            totalDividas += qtdDividas
          }
        })
      }

      setStats({
        totalMentorados: mentorados?.length || 0,
        totalCheckins: checkins?.length || 0,
        totalFormularios: pessoasComPendencias,
        npsMedia: totalPendencias
      })

      setLeadsStats({
        totalLeads,
        valorVendido,
        valorArrecadado,
        leadsVendidos
      })

      setDividasStats({
        totalDividas,
        valorTotalPendente,
        pessoasComDividas
      })

      setCallsStats({
        noShow,
        rejeitadas,
        vendidas,
        totalCalls,
        callsFeitas
      })
    } catch (error) {
      console.error('Erro ao carregar stats:', error)
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

  // Função para navegar para as páginas
  const navigateTo = (path: string) => {
    router.push(path)
  }

  // Componente Card Minimalista
  const MinimalStatsCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    onClick,
    loading,
    trend
  }: {
    title: string
    value: string | number
    subtitle?: string
    icon: any
    onClick: () => void
    loading: boolean
    trend?: 'up' | 'down' | 'neutral'
  }) => (
    <Card
      className="group relative bg-white border border-gray-200 hover:border-gray-300 cursor-pointer transition-all duration-200 hover:shadow-lg"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-semibold text-gray-900">
              {loading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                value
              )}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col items-center space-y-2">
            <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors duration-200">
              <Icon className="h-5 w-5 text-gray-600" />
            </div>
            <ArrowRight className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
        </div>

        {/* Subtle bottom line on hover */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 min-h-screen">
      <Header
        title="Dashboard"
        subtitle="Visão geral do Customer Success"
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Filtros Avançados */}
        <DateFilters
          filtroTempo={dateFilters.filtroTempo}
          dataInicio={dateFilters.dataInicio}
          dataFim={dateFilters.dataFim}
          setFiltroTempo={dateFilters.setFiltroTempo}
          setDataInicio={dateFilters.setDataInicio}
          setDataFim={dateFilters.setDataFim}
          resetFilters={dateFilters.resetFilters}
        />

        {/* Dashboard Principal */}
        <div className="space-y-8">
          {/* Métricas Principais */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-semibold text-gray-900">
                Métricas Principais
              </h2>
              <p className="text-gray-600 mt-1">
                Indicadores-chave do sistema
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <MinimalStatsCard
                title="Total Mentorados"
                value={stats.totalMentorados}
                subtitle="Gerenciar mentorados"
                icon={Users}
                onClick={() => navigateTo('/mentorados')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Check-ins Agendados"
                value={stats.totalCheckins}
                subtitle="Visualizar check-ins"
                icon={Calendar}
                onClick={() => navigateTo('/checkins')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Pessoas c/ Pendências"
                value={dividasStats.pessoasComDividas}
                subtitle="Ver pendências"
                icon={CreditCard}
                onClick={() => navigateTo('/pendencias')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Total de Leads"
                value={leadsStats.totalLeads}
                subtitle="Gerenciar leads"
                icon={Target}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />
            </div>
          </div>

          {/* Análise Financeira */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-semibold text-gray-900">
                Análise Financeira
              </h2>
              <p className="text-gray-600 mt-1">
                Pendências e situação financeira
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MinimalStatsCard
                title="Total de Dívidas"
                value={dividasStats.totalDividas}
                subtitle="Ver detalhes"
                icon={TrendingUp}
                onClick={() => navigateTo('/pendencias')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Valor Pendente"
                value={formatCurrency(dividasStats.valorTotalPendente)}
                subtitle="Total em aberto"
                icon={DollarSign}
                onClick={() => navigateTo('/pendencias')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Taxa de Pendências"
                value={stats.totalMentorados > 0 ? `${Math.round((dividasStats.pessoasComDividas / stats.totalMentorados) * 100)}%` : '0%'}
                subtitle="% com dívidas"
                icon={BarChart3}
                onClick={() => navigateTo('/pendencias')}
                loading={loading}
              />
            </div>
          </div>

          {/* Performance de Vendas */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-semibold text-gray-900">
                Performance de Vendas
                {dateFilters.hasActiveFilter && (
                  <span className="text-lg text-gray-500 ml-2 font-normal">
                    - Filtro aplicado
                  </span>
                )}
              </h2>
              <p className="text-gray-600 mt-1">
                Leads e conversões
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <MinimalStatsCard
                title="Total de Leads"
                value={leadsStats.totalLeads}
                subtitle="Todos os prospects"
                icon={UserPlus}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Leads Convertidos"
                value={leadsStats.leadsVendidos}
                subtitle={
                  leadsStats.totalLeads > 0
                    ? `${Math.round((leadsStats.leadsVendidos / leadsStats.totalLeads) * 100)}% conversão`
                    : 'Taxa de conversão'
                }
                icon={CheckCircle}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Valor Vendido"
                value={formatCurrency(leadsStats.valorVendido)}
                subtitle="Receita total"
                icon={Target}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Valor Recebido"
                value={formatCurrency(leadsStats.valorArrecadado)}
                subtitle={
                  leadsStats.valorVendido > 0
                    ? `${Math.round((leadsStats.valorArrecadado / leadsStats.valorVendido) * 100)}% recebido`
                    : '% recebido'
                }
                icon={DollarSign}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />
            </div>
          </div>

          {/* Performance de Calls */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-semibold text-gray-900">
                Performance de Calls
                {dateFilters.hasActiveFilter && (
                  <span className="text-lg text-gray-500 ml-2 font-normal">
                    - Filtro aplicado
                  </span>
                )}
              </h2>
              <p className="text-gray-600 mt-1">
                Resultado das chamadas realizadas
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
              <MinimalStatsCard
                title="Calls Feitas"
                value={callsStats.callsFeitas}
                subtitle="Propostas + vendidas + perdidas"
                icon={TrendingUp}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />

              <MinimalStatsCard
                title="No-show"
                value={callsStats.noShow}
                subtitle="Não compareceram"
                icon={Users}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Rejeitadas"
                value={callsStats.rejeitadas}
                subtitle="Não interessados"
                icon={Target}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Vendidas"
                value={callsStats.vendidas}
                subtitle="Convertidas em venda"
                icon={CheckCircle}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />

              <MinimalStatsCard
                title="Taxa de Conversão"
                value={callsStats.totalCalls > 0 ? `${Math.round((callsStats.vendidas / callsStats.totalCalls) * 100)}%` : '0%'}
                subtitle={`${callsStats.totalCalls} calls total`}
                icon={BarChart3}
                onClick={() => navigateTo('/leads')}
                loading={loading}
              />
            </div>
          </div>
        </div>

        {/* Navegação Rápida */}
        <div className="space-y-6">
          <div className="border-b border-gray-200 pb-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              Navegação Rápida
            </h2>
            <p className="text-gray-600 mt-1">
              Acesso direto às funcionalidades
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'Mentorados', path: '/mentorados' },
              { icon: Calendar, label: 'Check-ins', path: '/checkins' },
              { icon: CreditCard, label: 'Pendências', path: '/pendencias' },
              { icon: Target, label: 'Leads', path: '/leads' },
              { icon: FileText, label: 'Formulários', path: '/formularios' },
              { icon: BarChart3, label: 'Calendário', path: '/calendario' },
              { icon: DollarSign, label: 'Despesas', path: '/despesas' },
              { icon: Eye, label: 'Insights', path: '/insights' }
            ].map((item, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-20 flex-col space-y-2 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group"
                onClick={() => navigateTo(item.path)}
              >
                <item.icon className="h-5 w-5 text-gray-600 group-hover:text-gray-900 transition-colors duration-200" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                  {item.label}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}