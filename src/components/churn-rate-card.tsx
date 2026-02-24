'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, CheckCircle, AlertCircle, TrendingDown, Calendar, Users } from 'lucide-react'
import { useAuth } from '@/contexts/auth'

interface ChurnStats {
  totalMentorias: number
  desistencias: number
  taxaChurn: number
  status: 'excelente' | 'aceitavel' | 'grave'
  churnedMentorados?: Array<{
    id: string
    nome_completo: string
    data_exclusao: string
    motivo_exclusao: string
  }>
}

export function ChurnRateCard() {
  const { organizationId } = useAuth()
  const [stats, setStats] = useState<ChurnStats>({
    totalMentorias: 0,
    desistencias: 0,
    taxaChurn: 0,
    status: 'excelente'
  })
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState('semana_atual')
  const [showChurnedModal, setShowChurnedModal] = useState(false)

  useEffect(() => {
    if (organizationId) {
      loadChurnStats()
    }
  }, [timeFilter, organizationId])

  const getDateRange = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    switch (timeFilter) {
      case 'dia_atual':
        return {
          start: new Date(year, month, now.getDate()).toISOString(),
          end: new Date(year, month, now.getDate() + 1).toISOString()
        }
      case 'semana_atual':
        // Semana de Domingo a Sábado
        const currentDay = now.getDay() // 0 = Domingo
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - currentDay)
        startOfWeek.setHours(0, 0, 0, 0)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)
        return {
          start: startOfWeek.toISOString(),
          end: endOfWeek.toISOString()
        }
      case 'mes_atual':
        return {
          start: new Date(year, month, 1).toISOString(),
          end: new Date(year, month + 1, 0, 23, 59, 59).toISOString()
        }
      case 'trimestre_atual':
        const quarterStart = Math.floor(month / 3) * 3
        return {
          start: new Date(year, quarterStart, 1).toISOString(),
          end: new Date(year, quarterStart + 3, 0, 23, 59, 59).toISOString()
        }
      case 'semestre_atual':
        const semesterStart = Math.floor(month / 6) * 6
        return {
          start: new Date(year, semesterStart, 1).toISOString(),
          end: new Date(year, semesterStart + 6, 0, 23, 59, 59).toISOString()
        }
      case 'ano_atual':
        return {
          start: new Date(year, 0, 1).toISOString(),
          end: new Date(year, 11, 31, 23, 59, 59).toISOString()
        }
      default:
        return null
    }
  }

  const loadChurnStats = async () => {
    try {
      setLoading(true)

      // Buscar TODOS os mentorados para o cálculo da porcentagem
      const { data: todosMentorados, error: allError } = await supabase
        .from('mentorados')
        .select('id')
        .eq('organization_id', organizationId)

      if (allError) throw allError

      // Buscar mentorados que fizeram churn baseado no filtro de tempo
      const dateRange = getDateRange()
      let churnQuery = supabase
        .from('mentorados')
        .select('id, nome_completo, motivo_exclusao, data_entrada, data_exclusao, excluido')
        .eq('organization_id', organizationId)
        .eq('excluido', true)
        .eq('motivo_exclusao', 'reembolso')

      // Aplicar filtro de data apenas para o churn se necessário
      if (dateRange && timeFilter !== 'ano_atual') {
        // Filtrar por data_exclusao para churns no período
        churnQuery = churnQuery
          .gte('data_exclusao', dateRange.start)
          .lte('data_exclusao', dateRange.end)
      }

      const { data: churnedMentorados, error: churnError } = await churnQuery

      if (churnError) throw churnError

      const totalMentorias = todosMentorados?.length || 0
      const churnPorReembolso = churnedMentorados?.length || 0
      const taxaChurn = totalMentorias > 0 ? (churnPorReembolso / totalMentorias) * 100 : 0

      let status: 'excelente' | 'aceitavel' | 'grave'
      if (taxaChurn <= 5) {
        status = 'excelente'
      } else if (taxaChurn <= 8) {
        status = 'aceitavel'
      } else {
        status = 'grave'
      }

      setStats({
        totalMentorias,
        desistencias: churnPorReembolso,
        taxaChurn,
        status,
        churnedMentorados: churnedMentorados || []
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas de churn:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = (status: ChurnStats['status']) => {
    switch (status) {
      case 'excelente':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          iconColor: 'text-green-600',
          label: 'Excelente',
          description: 'Produto forte + seleção correta'
        }
      case 'aceitavel':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: AlertCircle,
          iconColor: 'text-yellow-600',
          label: 'Aceitável',
          description: 'Exige atenção'
        }
      case 'grave':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertTriangle,
          iconColor: 'text-red-600',
          label: 'Alerta Grave',
          description: 'Problema estrutural'
        }
    }
  }

  const statusConfig = getStatusConfig(stats.status)
  const StatusIcon = statusConfig.icon

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Taxa de Churn
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Taxa de Churn
            </CardTitle>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-3 py-1 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="dia_atual">Hoje</option>
              <option value="semana_atual">Semana</option>
              <option value="mes_atual">Mês</option>
              <option value="trimestre_atual">Trimestre</option>
              <option value="semestre_atual">Semestre</option>
              <option value="ano_atual">Ano</option>
            </select>
          </div>
          <CardDescription>
            Mentorados que saíram por reembolso (não inclui exclusões por erro)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {stats.taxaChurn.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  <button
                    onClick={() => setShowChurnedModal(true)}
                    className={`hover:underline ${stats.desistencias > 0 ? 'text-red-600 cursor-pointer' : ''}`}
                    disabled={stats.desistencias === 0}
                  >
                    {stats.desistencias} de {stats.totalMentorias} mentorados
                  </button>
                </div>
              </div>
              <StatusIcon className={`w-8 h-8 ${statusConfig.iconColor}`} />
            </div>

            <Badge
              variant="outline"
              className={statusConfig.color}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>

            <div className="text-xs text-muted-foreground">
              {statusConfig.description}
            </div>

            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Total de mentorados:</span>
                  <span className="font-medium">{stats.totalMentorias}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reembolsos (churn):</span>
                  <button
                    onClick={() => setShowChurnedModal(true)}
                    className={`font-medium text-red-600 ${stats.desistencias > 0 ? 'hover:underline cursor-pointer' : ''}`}
                    disabled={stats.desistencias === 0}
                  >
                    {stats.desistencias}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Churned Mentorados */}
      {showChurnedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Mentorados que fizeram Churn
              </h2>
              <button
                onClick={() => setShowChurnedModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {stats.churnedMentorados?.length || 0} mentorado(s) saíram por reembolso no período selecionado
              </p>
            </div>

            <div className="space-y-2">
              {stats.churnedMentorados && stats.churnedMentorados.length > 0 ? (
                stats.churnedMentorados.map((mentorado) => (
                  <div key={mentorado.id} className="p-3 border border-border rounded-lg bg-muted">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{mentorado.nome_completo}</p>
                        <p className="text-sm text-muted-foreground">
                          Motivo: {mentorado.motivo_exclusao}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {mentorado.data_exclusao ? new Date(mentorado.data_exclusao).toLocaleDateString('pt-BR') : 'Data não informada'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum churn registrado no período selecionado.</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowChurnedModal(false)}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}