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

      // Buscar dados reais de leads do banco
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .not('data_venda', 'is', null)
        .eq('status', 'vendido')

      if (leadsError) {
        console.error('Erro ao buscar leads (provável RLS):', leadsError)
        // Se der erro por RLS, ainda assim continua com dados vazios
        console.log('Continuando com dados vazios devido ao RLS')
      }

      // Processar dados por mês
      const dadosPorMes = new Map()
      const anoAtual = new Date().getFullYear()

      // Inicializar meses com metas
      const metasMensais = [
        { mes: 1, meta_faturamento: 500000, meta_vendas: 11, nome: 'Janeiro' },
        { mes: 2, meta_faturamento: 600000, meta_vendas: 13, nome: 'Fevereiro' },
        { mes: 3, meta_faturamento: 700000, meta_vendas: 15, nome: 'Março' },
        { mes: 4, meta_faturamento: 800000, meta_vendas: 17, nome: 'Abril' },
        { mes: 5, meta_faturamento: 900000, meta_vendas: 19, nome: 'Maio' },
        { mes: 6, meta_faturamento: 1000000, meta_vendas: 21, nome: 'Junho' },
        { mes: 7, meta_faturamento: 850000, meta_vendas: 18, nome: 'Julho' },
        { mes: 8, meta_faturamento: 900000, meta_vendas: 19, nome: 'Agosto' },
        { mes: 9, meta_faturamento: 950000, meta_vendas: 20, nome: 'Setembro' },
        { mes: 10, meta_faturamento: 1000000, meta_vendas: 21, nome: 'Outubro' },
        { mes: 11, meta_faturamento: 1100000, meta_vendas: 23, nome: 'Novembro' },
        { mes: 12, meta_faturamento: 1200000, meta_vendas: 25, nome: 'Dezembro' }
      ]

      // Processar leads reais (se conseguiu buscar)
      const leadsValidos = leadsData || []
      leadsValidos.forEach(lead => {
        if (!lead.data_venda) return

        const dataVenda = new Date(lead.data_venda)
        const ano = dataVenda.getFullYear()
        const mes = dataVenda.getMonth() + 1

        if (ano === anoSelecionado) {
          const key = `${ano}-${mes}`
          if (!dadosPorMes.has(key)) {
            dadosPorMes.set(key, {
              faturamento: 0,
              vendas: 0,
              arrecadado: 0
            })
          }

          const dados = dadosPorMes.get(key)
          dados.faturamento += lead.valor_vendido || 0
          dados.arrecadado += lead.valor_arrecadado || 0
          dados.vendas += 1
        }
      })

      // Montar dados mensais
      const metasMensaisProcessadas: MetaMensal[] = metasMensais.map(meta => {
        const key = `${anoSelecionado}-${meta.mes}`
        const dadosReais = dadosPorMes.get(key) || { faturamento: 0, vendas: 0, arrecadado: 0 }

        const percentFaturamento = meta.meta_faturamento > 0
          ? (dadosReais.faturamento / meta.meta_faturamento) * 100
          : 0

        const percentVendas = meta.meta_vendas > 0
          ? (dadosReais.vendas / meta.meta_vendas) * 100
          : 0

        let status: 'ATINGIDA' | 'PRÓXIMA' | 'DISTANTE' = 'DISTANTE'
        if (percentFaturamento >= 100) status = 'ATINGIDA'
        else if (percentFaturamento >= 80) status = 'PRÓXIMA'

        return {
          ano: anoSelecionado,
          mes: meta.mes,
          mes_nome: `${meta.nome} ${anoSelecionado}`,
          meta_faturamento_bruto: meta.meta_faturamento,
          meta_vendas: meta.meta_vendas,
          faturamento_real_bruto: dadosReais.faturamento,
          vendas_realizadas: dadosReais.vendas,
          percent_meta_faturamento: percentFaturamento,
          percent_meta_vendas: percentVendas,
          status_meta: status,
          ticket_medio_real: dadosReais.vendas > 0 ? dadosReais.faturamento / dadosReais.vendas : 0,
          margem_liquida_real: dadosReais.arrecadado * 0.75 // 75% de margem
        }
      })

      // Calcular resumo anual
      const metaAnual = metasMensais.reduce((acc, meta) => acc + meta.meta_faturamento, 0)
      const faturamentoAnual = metasMensaisProcessadas.reduce((acc, mes) => acc + mes.faturamento_real_bruto, 0)
      const vendasAnual = metasMensaisProcessadas.reduce((acc, mes) => acc + mes.vendas_realizadas, 0)
      const metaVendasAnual = metasMensais.reduce((acc, meta) => acc + meta.meta_vendas, 0)

      const resumoAnual: ResumoAnual = {
        ano: anoSelecionado,
        meta_faturamento_anual: metaAnual,
        faturamento_real_anual: faturamentoAnual,
        percent_meta_anual_faturamento: metaAnual > 0 ? (faturamentoAnual / metaAnual) * 100 : 0,
        status_meta_anual: faturamentoAnual >= metaAnual ? 'ATINGIDA' : faturamentoAnual >= metaAnual * 0.8 ? 'PRÓXIMA' : 'DISTANTE',
        ticket_medio_anual: vendasAnual > 0 ? faturamentoAnual / vendasAnual : 0,
        margem_liquida_anual: faturamentoAnual * 0.75,
        total_comissoes_anual: faturamentoAnual * 0.05 // 5% comissão média
      }

      setMetasMensais(metasMensaisProcessadas)
      setResumoAnual(resumoAnual)

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
              {Array.from({ length: 10 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i // 2 years back to 7 years forward
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                )
              })}
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