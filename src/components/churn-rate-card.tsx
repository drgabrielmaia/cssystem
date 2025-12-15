'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, CheckCircle, AlertCircle, TrendingDown } from 'lucide-react'

interface ChurnStats {
  totalMentorias: number
  desistencias: number
  taxaChurn: number
  status: 'excelente' | 'aceitavel' | 'grave'
}

export function ChurnRateCard() {
  const [stats, setStats] = useState<ChurnStats>({
    totalMentorias: 0,
    desistencias: 0,
    taxaChurn: 0,
    status: 'excelente'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChurnStats()
  }, [])

  const loadChurnStats = async () => {
    try {
      setLoading(true)

      // Buscar mentorados que entraram na mentoria
      const { data: mentorados, error } = await supabase
        .from('mentorados')
        .select('id, motivo_exclusao, data_entrada, data_exclusao, excluido')

      if (error) throw error

      const totalMentorias = mentorados?.length || 0
      // Contar apenas exclusões por reembolso como churn (não por erro)
      const churnPorReembolso = mentorados?.filter(
        mentorado => mentorado.excluido === true && mentorado.motivo_exclusao === 'reembolso'
      ).length || 0
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
        status
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          Taxa de Churn
        </CardTitle>
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
                {stats.desistencias} de {stats.totalMentorias} mentorados
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
                <span className="font-medium text-red-600">{stats.desistencias}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}