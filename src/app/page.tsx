'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  RefreshCw
} from 'lucide-react'

export default function Dashboard() {
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
  const [filtroTempo, setFiltroTempo] = useState('todos') // semana, mes, ano, todos
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [filtroTempo])

  const getDateFilter = () => {
    const now = new Date()
    switch (filtroTempo) {
      case 'semana':
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return oneWeekAgo.toISOString()
      case 'mes':
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        return oneMonthAgo.toISOString()
      case 'ano':
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        return oneYearAgo.toISOString()
      default:
        return null
    }
  }

  const loadDashboardStats = async () => {
    try {
      const dateFilter = getDateFilter()

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
        if (dateFilter) {
          leadsParaContar = allLeads.filter(lead =>
            lead.data_primeiro_contato && new Date(lead.data_primeiro_contato) >= new Date(dateFilter)
          )
        }
        totalLeads = leadsParaContar.length

        // Para leads vendidos, usar convertido_em se disponível, senão data_primeiro_contato
        let leadsVendidosParaContar = allLeads.filter(lead => lead.status === 'vendido')
        if (dateFilter) {
          leadsVendidosParaContar = leadsVendidosParaContar.filter(lead => {
            const dataConversao = lead.convertido_em || lead.data_primeiro_contato
            return dataConversao && new Date(dataConversao) >= new Date(dateFilter)
          })
        }

        leadsVendidos = leadsVendidosParaContar.length
        valorVendido = leadsVendidosParaContar.reduce((sum, lead) => sum + (lead.valor_vendido || 0), 0)
        valorArrecadado = leadsVendidosParaContar.reduce((sum, lead) => sum + (lead.valor_arrecadado || 0), 0)
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

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title="Dashboard"
        subtitle={`Visão geral do Customer Success ${filtroTempo !== 'todos' ? `- ${filtroTempo === 'semana' ? 'Última semana' : filtroTempo === 'mes' ? 'Último mês' : 'Último ano'}` : ''}`}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Filtro de Período */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <Filter className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Período:</span>
                <Select value={filtroTempo} onValueChange={setFiltroTempo}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">📅 Todos os dados</SelectItem>
                    <SelectItem value="semana">📆 Última semana</SelectItem>
                    <SelectItem value="mes">📅 Último mês</SelectItem>
                    <SelectItem value="ano">📄 Último ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadDashboardStats}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

            {/* Stats Grid - Reorganizado em 3 seções */}
            <div className="space-y-6">
              {/* Seção 1: Mentorados e Check-ins */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">👥 Mentorados & Check-ins</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Mentorados</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {loading ? '...' : stats.totalMentorados}
                          </p>
                        </div>
                        <Users className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Check-ins Agendados</p>
                          <p className="text-2xl font-bold text-green-600">
                            {loading ? '...' : stats.totalCheckins}
                          </p>
                        </div>
                        <Calendar className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Pessoas c/ Dívidas</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {loading ? '...' : dividasStats.pessoasComDividas}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Seção 2: Financeiro - Dívidas */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💰 Financeiro - Dívidas Pendentes</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Dívidas</p>
                          <p className="text-2xl font-bold text-red-600">
                            {loading ? '...' : dividasStats.totalDividas}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-red-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Valor Total Pendente</p>
                          <p className="text-2xl font-bold text-red-600">
                            {loading ? '...' : formatCurrency(dividasStats.valorTotalPendente)}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-red-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Taxa de Pendências</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {loading ? '...' : stats.totalMentorados > 0 ? `${Math.round((dividasStats.pessoasComDividas / stats.totalMentorados) * 100)}%` : '0%'}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Seção 3: Leads & Vendas */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Leads & Vendas {filtroTempo !== 'todos' && `(${filtroTempo === 'semana' ? 'Última semana' : filtroTempo === 'mes' ? 'Último mês' : 'Último ano'})`}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Leads</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {loading ? '...' : leadsStats.totalLeads}
                          </p>
                        </div>
                        <UserPlus className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Leads Convertidos</p>
                          <p className="text-2xl font-bold text-green-600">
                            {loading ? '...' : leadsStats.leadsVendidos}
                          </p>
                          {leadsStats.totalLeads > 0 && (
                            <p className="text-xs text-green-500">
                              {Math.round((leadsStats.leadsVendidos / leadsStats.totalLeads) * 100)}% taxa
                            </p>
                          )}
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Valor Vendido</p>
                          <p className="text-2xl font-bold text-green-600">
                            {loading ? '...' : formatCurrency(leadsStats.valorVendido)}
                          </p>
                        </div>
                        <Target className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Valor Arrecadado</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {loading ? '...' : formatCurrency(leadsStats.valorArrecadado)}
                          </p>
                          {leadsStats.valorVendido > 0 && (
                            <p className="text-xs text-blue-500">
                              {Math.round((leadsStats.valorArrecadado / leadsStats.valorVendido) * 100)}% recebido
                            </p>
                          )}
                        </div>
                        <DollarSign className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                className="h-20 flex-col space-y-2" 
                variant="outline"
                onClick={() => window.location.href = '/mentorados'}
              >
                <Users className="h-6 w-6" />
                <span>Ver Mentorados</span>
              </Button>
              
              <Button 
                className="h-20 flex-col space-y-2" 
                variant="outline"
                onClick={() => window.location.href = '/checkins'}
              >
                <Calendar className="h-6 w-6" />
                <span>Agendar Check-in</span>
              </Button>
              
              <Button
                className="h-20 flex-col space-y-2"
                variant="outline"
                onClick={() => window.location.href = '/pendencias'}
              >
                <DollarSign className="h-6 w-6" />
                <span>Ver Pendências</span>
              </Button>

              <Button
                className="h-20 flex-col space-y-2"
                variant="outline"
                onClick={() => window.location.href = '/leads'}
              >
                <Target className="h-6 w-6" />
                <span>Gerenciar Leads</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}