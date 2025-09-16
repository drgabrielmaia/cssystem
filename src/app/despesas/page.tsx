'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase, type DespesaMensal } from '@/lib/supabase'
import { DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const meses = [
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho'
]

const nomesMeses = [
  'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho'
]

export default function DespesasPage() {
  const [despesas, setDespesas] = useState<DespesaMensal[]>([])
  const [loading, setLoading] = useState(true)
  const [mesAtual, setMesAtual] = useState('agosto')

  useEffect(() => {
    async function fetchDespesas() {
      try {
        const { data, error } = await supabase
          .from('despesas_mensais')
          .select('*')
          .neq('nome', '')
          .order('nome')

        if (error) throw error
        setDespesas(data || [])
      } catch (error) {
        console.error('Erro ao carregar despesas:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDespesas()
  }, [])

  // Calcular totais por mês
  const totaisPorMes = meses.map((mes, index) => ({
    mes: nomesMeses[index],
    total: despesas.reduce((sum, despesa) => sum + (despesa[mes as keyof DespesaMensal] as number || 0), 0)
  }))

  // Calcular estatísticas
  const totalMesAtual = despesas.reduce((sum, despesa) => 
    sum + (despesa[mesAtual as keyof DespesaMensal] as number || 0), 0
  )

  const mesAnteriorIndex = meses.indexOf(mesAtual) - 1
  const mesAnterior = mesAnteriorIndex >= 0 ? meses[mesAnteriorIndex] : 'julho'
  const totalMesAnterior = despesas.reduce((sum, despesa) => 
    sum + (despesa[mesAnterior as keyof DespesaMensal] as number || 0), 0
  )

  const variacao = totalMesAnterior > 0 
    ? ((totalMesAtual - totalMesAnterior) / totalMesAnterior) * 100 
    : 0

  const totalAnual = totaisPorMes.reduce((sum, mes) => sum + mes.total, 0)
  const mediaMenual = totalAnual / 12

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="Despesas" subtitle="Controle de despesas mensais" />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Carregando dados de despesas...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header title="Despesas" subtitle={`Total anual: ${formatCurrency(totalAnual)}`} />
      
      <main className="flex-1 p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl shadow-sm border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Mês Atual</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalMesAtual)}
              </div>
              <p className={`text-xs flex items-center mt-1 ${
                variacao >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {variacao >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(variacao).toFixed(1)}% vs mês anterior
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Média Mensal</CardTitle>
              <Calendar className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(mediaMenual)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                baseado nos 12 meses
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Anual</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalAnual)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                soma de todos os meses
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Colaboradores</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {despesas.length}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                pessoas cadastradas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Seletor de Mês */}
        <div className="flex flex-wrap gap-2">
          {meses.map((mes, index) => (
            <Button
              key={mes}
              variant={mesAtual === mes ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMesAtual(mes)}
            >
              {nomesMeses[index]}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Gráfico de Despesas por Mês */}
          <Card className="rounded-2xl shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Despesas por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={totaisPorMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" stroke="#666" fontSize={12} />
                  <YAxis 
                    stroke="#666" 
                    fontSize={12}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Total']}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tabela de Despesas do Mês Atual */}
          <Card className="rounded-2xl shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {nomesMeses[meses.indexOf(mesAtual)]} - Detalhamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {despesas
                  .filter(d => (d[mesAtual as keyof DespesaMensal] as number) > 0)
                  .sort((a, b) => 
                    (b[mesAtual as keyof DespesaMensal] as number) - (a[mesAtual as keyof DespesaMensal] as number)
                  )
                  .map((despesa, index) => (
                    <div key={despesa.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{despesa.nome}</p>
                          <p className="text-xs text-gray-500">Colaborador</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(despesa[mesAtual as keyof DespesaMensal] as number)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(((despesa[mesAtual as keyof DespesaMensal] as number) / totalMesAtual) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))
                }
                
                {despesas.filter(d => (d[mesAtual as keyof DespesaMensal] as number) > 0).length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <DollarSign className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                    <p>Nenhuma despesa registrada para este mês</p>
                  </div>
                )}
              </div>

              {totalMesAtual > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>Total do mês:</span>
                    <span className="text-lg text-blue-600">{formatCurrency(totalMesAtual)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}