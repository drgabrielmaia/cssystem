'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Target,
  UserPlus,
  CheckCircle
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      // Buscar mentorados
      const { data: mentorados } = await supabase
        .from('mentorados')
        .select('id')
      
      // Buscar checkins agendados/pendentes (não realizados)
      const { data: checkins } = await supabase
        .from('checkins')
        .select('id')
        .eq('status', 'agendado')
      
      // Buscar pendências financeiras
      const { data: despesas } = await supabase
        .from('despesas_mensais')
        .select('*')
      
      // Calcular total de pendências
      let totalPendencias = 0
      if (despesas) {
        totalPendencias = despesas.reduce((sum, despesa) => {
          const meses = ['agosto', 'setembro', 'outubro', 'novembro', 'dezembro', 'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho']
          return sum + meses.reduce((mesSum, mes) => mesSum + (despesa[mes] || 0), 0)
        }, 0)
      }

      // Buscar dados dos leads
      const { data: leadsStatsData } = await supabase
        .from('leads_stats')
        .select('*')

      const { data: allLeads } = await supabase
        .from('leads')
        .select('id, status, valor_vendido, valor_arrecadado')

      let totalLeads = 0
      let valorVendido = 0
      let valorArrecadado = 0
      let leadsVendidos = 0

      if (leadsStatsData) {
        totalLeads = leadsStatsData.reduce((sum, stat) => sum + stat.quantidade, 0)
        valorVendido = leadsStatsData.reduce((sum, stat) => sum + (stat.valor_total_vendido || 0), 0)
        valorArrecadado = leadsStatsData.reduce((sum, stat) => sum + (stat.valor_total_arrecadado || 0), 0)
        leadsVendidos = leadsStatsData.find(s => s.status === 'vendido')?.quantidade || 0
      }

      setStats({
        totalMentorados: mentorados?.length || 0,
        totalCheckins: checkins?.length || 0,
        totalFormularios: despesas?.length || 0,
        npsMedia: totalPendencias
      })

      setLeadsStats({
        totalLeads,
        valorVendido,
        valorArrecadado,
        leadsVendidos
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
        subtitle="Visão geral do Customer Success" 
      />
      
      <main className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Mentorados</p>
                      <p className="text-2xl font-bold text-gray-900">
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
                      <p className="text-sm font-medium text-gray-600">Check-ins</p>
                      <p className="text-2xl font-bold text-gray-900">
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
                      <p className="text-sm font-medium text-gray-600">Pessoas c/ Pendências</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : stats.totalFormularios}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Pendente</p>
                      <p className="text-2xl font-bold text-red-600">
                        {loading ? '...' : formatCurrency(stats.npsMedia)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Novos Cards dos Leads */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Leads</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : leadsStats.totalLeads}
                      </p>
                    </div>
                    <UserPlus className="h-8 w-8 text-indigo-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Leads Vendidos</p>
                      <p className="text-2xl font-bold text-green-600">
                        {loading ? '...' : leadsStats.leadsVendidos}
                      </p>
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