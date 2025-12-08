'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import {
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  BarChart3,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  Plus,
  RefreshCw
} from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, AreaChart, Area } from 'recharts'

interface MetaMensal {
  ano: number
  mes: number
  mes_nome: string
  meta_faturamento_bruto: number
  meta_vendas: number
  faturamento_real_bruto: number
  vendas_realizadas: number
  percent_meta_faturamento: number
  percent_meta_vendas: number
  status_meta: 'ATINGIDA' | 'PRÓXIMA' | 'DISTANTE'
  ticket_medio_real: number
  margem_liquida_real: number
}

interface ResumoAnual {
  ano: number
  meta_faturamento_anual: number
  faturamento_real_anual: number
  percent_meta_anual_faturamento: number
  status_meta_anual: 'ATINGIDA' | 'PRÓXIMA' | 'DISTANTE'
  ticket_medio_anual: number
  margem_liquida_anual: number
  total_comissoes_anual: number
}

export default function MetasPage() {
  const [metasMensais, setMetasMensais] = useState<MetaMensal[]>([])
  const [resumoAnual, setResumoAnual] = useState<ResumoAnual | null>(null)
  const [anoSelecionado, setAnoSelecionado] = useState(2026)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [anoSelecionado])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Dados mock temporários (até configurar o banco)
      const mockMetasMensais: MetaMensal[] = [
        {
          ano: anoSelecionado,
          mes: 1,
          mes_nome: 'Janeiro 2026',
          meta_faturamento_bruto: 500000,
          meta_vendas: 11,
          faturamento_real_bruto: 420000,
          vendas_realizadas: 9,
          percent_meta_faturamento: 84,
          percent_meta_vendas: 82,
          status_meta: 'PRÓXIMA' as const,
          ticket_medio_real: 46667,
          margem_liquida_real: 315000
        },
        {
          ano: anoSelecionado,
          mes: 2,
          mes_nome: 'Fevereiro 2026',
          meta_faturamento_bruto: 600000,
          meta_vendas: 13,
          faturamento_real_bruto: 650000,
          vendas_realizadas: 14,
          percent_meta_faturamento: 108,
          percent_meta_vendas: 108,
          status_meta: 'ATINGIDA' as const,
          ticket_medio_real: 46429,
          margem_liquida_real: 487500
        },
        {
          ano: anoSelecionado,
          mes: 3,
          mes_nome: 'Março 2026',
          meta_faturamento_bruto: 700000,
          meta_vendas: 15,
          faturamento_real_bruto: 0,
          vendas_realizadas: 0,
          percent_meta_faturamento: 0,
          percent_meta_vendas: 0,
          status_meta: 'DISTANTE' as const,
          ticket_medio_real: 0,
          margem_liquida_real: 0
        }
      ]

      const mockResumoAnual: ResumoAnual = {
        ano: anoSelecionado,
        meta_faturamento_anual: 10000000,
        faturamento_real_anual: 1070000,
        percent_meta_anual_faturamento: 10.7,
        status_meta_anual: 'DISTANTE' as const,
        ticket_medio_anual: 46548,
        margem_liquida_anual: 802500,
        total_comissoes_anual: 75000
      }

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 800))

      setMetasMensais(mockMetasMensais)
      setResumoAnual(mockResumoAnual)

    } catch (err) {
      console.error('Erro geral:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  const formatPercent = (value: number) => {
    return `${(value || 0).toFixed(1)}%`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ATINGIDA': return 'bg-green-100 text-green-800 border-green-200'
      case 'PRÓXIMA': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'DISTANTE': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ATINGIDA': return <CheckCircle className="w-4 h-4" />
      case 'PRÓXIMA': return <Clock className="w-4 h-4" />
      case 'DISTANTE': return <AlertCircle className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

  // Dados para gráficos
  const chartData = metasMensais.map(meta => ({
    mes: meta.mes_nome?.split(' ')[0] || `Mês ${meta.mes}`,
    meta: meta.meta_faturamento_bruto,
    realizado: meta.faturamento_real_bruto,
    percentual: meta.percent_meta_faturamento
  }))

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FB] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#2563EB]" />
              <p className="text-gray-600">Carregando dados das metas...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F7F9FB] p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar dados</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadDashboardData} variant="outline" className="border-red-300 text-red-700">
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#111827] flex items-center gap-3">
              <div className="bg-gradient-to-r from-[#2563EB] to-[#3B82F6] p-2 rounded-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              Metas e Performance
            </h1>
            <p className="text-[#6B7280] mt-1">
              Acompanhe o desempenho vs metas de faturamento e vendas
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(parseInt(e.target.value))}
              className="px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white text-[#111827] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
            <Button
              onClick={loadDashboardData}
              variant="outline"
              className="border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Resumo Anual */}
          {resumoAnual && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white shadow-sm border-[#E5E7EB]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#6B7280]">Meta Anual {anoSelecionado}</p>
                      <p className="text-2xl font-bold text-[#111827] mt-1">
                        {formatCurrency(resumoAnual.meta_faturamento_anual)}
                      </p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Target className="h-6 w-6 text-[#2563EB]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border-[#E5E7EB]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#6B7280]">Realizado</p>
                      <p className="text-2xl font-bold text-[#111827] mt-1">
                        {formatCurrency(resumoAnual.faturamento_real_anual)}
                      </p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border-[#E5E7EB]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#6B7280]">Performance Anual</p>
                      <p className="text-2xl font-bold text-[#111827] mt-1">
                        {formatPercent(resumoAnual.percent_meta_anual_faturamento)}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${
                      resumoAnual.percent_meta_anual_faturamento >= 100 ? 'bg-green-100' :
                      resumoAnual.percent_meta_anual_faturamento >= 80 ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      {resumoAnual.percent_meta_anual_faturamento >= 100 ? (
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      ) : (
                        <TrendingDown className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border-[#E5E7EB]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#6B7280]">Ticket Médio</p>
                      <p className="text-2xl font-bold text-[#111827] mt-1">
                        {formatCurrency(resumoAnual.ticket_medio_anual)}
                      </p>
                    </div>
                    <div className="bg-purple-100 p-3 rounded-full">
                      <BarChart3 className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Gráfico de Performance Mensal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white shadow-sm border-[#E5E7EB]">
              <CardHeader>
                <CardTitle className="text-[#111827] flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#2563EB]" />
                  Faturamento: Meta vs Realizado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="mes"
                      stroke="#6B7280"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={(value) => `${(value/1000000).toFixed(1)}M`}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        formatCurrency(Number(value)),
                        name === 'meta' ? 'Meta' : 'Realizado'
                      ]}
                      labelStyle={{ color: '#111827' }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="meta"
                      stackId="1"
                      stroke="#94A3B8"
                      fill="#F1F5F9"
                    />
                    <Area
                      type="monotone"
                      dataKey="realizado"
                      stackId="2"
                      stroke="#2563EB"
                      fill="#3B82F6"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-[#E5E7EB]">
              <CardHeader>
                <CardTitle className="text-[#111827] flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#2563EB]" />
                  Percentual de Atingimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="mes"
                      stroke="#6B7280"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="#6B7280"
                      fontSize={12}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Atingimento']}
                      labelStyle={{ color: '#111827' }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar
                      dataKey="percentual"
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tabela Detalhada por Mês */}
          <Card className="bg-white shadow-sm border-[#E5E7EB]">
            <CardHeader>
              <CardTitle className="text-[#111827] flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#2563EB]" />
                Performance Mensal Detalhada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB]">
                      <th className="text-left py-3 px-4 font-medium text-[#6B7280]">Mês</th>
                      <th className="text-right py-3 px-4 font-medium text-[#6B7280]">Meta Fat.</th>
                      <th className="text-right py-3 px-4 font-medium text-[#6B7280]">Realizado</th>
                      <th className="text-right py-3 px-4 font-medium text-[#6B7280]">% Meta</th>
                      <th className="text-right py-3 px-4 font-medium text-[#6B7280]">Vendas</th>
                      <th className="text-right py-3 px-4 font-medium text-[#6B7280]">Ticket Médio</th>
                      <th className="text-center py-3 px-4 font-medium text-[#6B7280]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metasMensais.map((meta) => (
                      <tr key={`${meta.ano}-${meta.mes}`} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                        <td className="py-3 px-4 font-medium text-[#111827]">
                          {meta.mes_nome?.split(' ')[0] || `Mês ${meta.mes}`}
                        </td>
                        <td className="py-3 px-4 text-right text-[#6B7280]">
                          {formatCurrency(meta.meta_faturamento_bruto)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-[#111827]">
                          {formatCurrency(meta.faturamento_real_bruto)}
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${
                          meta.percent_meta_faturamento >= 100 ? 'text-green-600' :
                          meta.percent_meta_faturamento >= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {formatPercent(meta.percent_meta_faturamento)}
                        </td>
                        <td className="py-3 px-4 text-right text-[#6B7280]">
                          {meta.vendas_realizadas} / {meta.meta_vendas}
                        </td>
                        <td className="py-3 px-4 text-right text-[#6B7280]">
                          {formatCurrency(meta.ticket_medio_real)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            className={`${getStatusColor(meta.status_meta)} flex items-center gap-1 w-fit mx-auto`}
                          >
                            {getStatusIcon(meta.status_meta)}
                            {meta.status_meta}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex justify-end">
            <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
              <Edit className="h-4 w-4 mr-2" />
              Editar Metas
            </Button>
          </div>

        </div>
      </div>
    </div>
  )
}