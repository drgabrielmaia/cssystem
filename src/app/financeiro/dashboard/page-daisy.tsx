'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
  Download,
  Eye,
  PieChart,
  BarChart3,
  Receipt,
  Target,
  AlertCircle,
  Filter,
  Building2
} from 'lucide-react'

interface FinanceMetrics {
  caixa_atual: number
  entradas_mes: number
  saidas_mes: number
  resultado_liquido: number
  contas_pagar: number
  contas_receber: number
  variacao_entradas: number
  variacao_saidas: number
}

interface Transaction {
  id: string
  tipo: 'entrada' | 'saida'
  valor: number
  descricao: string
  categoria: string
  data: string
  status: 'pendente' | 'liquidado' | 'atrasado'
  fornecedor?: string
  projeto_id?: string
  projeto?: {
    id: string
    codigo: string
    nome: string
    cor_tema: string
  }
}

export default function FinanceiroDashboardDaisy() {
  const [metrics, setMetrics] = useState<FinanceMetrics>({
    caixa_atual: 0,
    entradas_mes: 0,
    saidas_mes: 0,
    resultado_liquido: 0,
    contas_pagar: 0,
    contas_receber: 0,
    variacao_entradas: 0,
    variacao_saidas: 0
  })

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [chartPeriod, setChartPeriod] = useState('7d')
  const { user, organizationId } = useAuth()

  useEffect(() => {
    if (organizationId) {
      loadFinancialData()
    }
  }, [organizationId, chartPeriod])

  const loadFinancialData = async () => {
    try {
      setLoading(true)
      
      const [transactionsResult, metricsResult] = await Promise.all([
        loadTransactions(),
        calculateMetrics()
      ])

      setTransactions(transactionsResult)
      setMetrics(metricsResult)
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTransactions = async (): Promise<Transaction[]> => {
    if (!organizationId) return []

    const { data, error } = await supabase
      .from('transacoes_financeiras')
      .select(`
        *,
        projeto:projetos_organizacao(id, codigo, nome, cor_tema)
      `)
      .eq('organization_id', organizationId)
      .order('data_transacao', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Erro ao carregar transações:', error)
      return []
    }

    return data || []
  }

  const calculateMetrics = async (): Promise<FinanceMetrics> => {
    if (!organizationId) {
      return {
        caixa_atual: 0,
        entradas_mes: 0,
        saidas_mes: 0,
        resultado_liquido: 0,
        contas_pagar: 0,
        contas_receber: 0,
        variacao_entradas: 0,
        variacao_saidas: 0
      }
    }

    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    
    // Buscar transações do mês atual
    const { data: transacoesMes } = await supabase
      .from('transacoes_financeiras')
      .select('tipo, valor, status')
      .eq('organization_id', organizationId)
      .like('data_transacao', `${currentMonth}%`)

    let entradas_mes = 0
    let saidas_mes = 0
    let contas_pagar = 0
    let contas_receber = 0

    transacoesMes?.forEach(transacao => {
      if (transacao.tipo === 'entrada') {
        entradas_mes += transacao.valor
        if (transacao.status === 'pendente') {
          contas_receber += transacao.valor
        }
      } else {
        saidas_mes += transacao.valor
        if (transacao.status === 'pendente') {
          contas_pagar += transacao.valor
        }
      }
    })

    const resultado_liquido = entradas_mes - saidas_mes
    const caixa_atual = resultado_liquido // Simplificado

    return {
      caixa_atual,
      entradas_mes,
      saidas_mes,
      resultado_liquido,
      contas_pagar,
      contas_receber,
      variacao_entradas: 0, // TODO: calcular comparando com mês anterior
      variacao_saidas: 0
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'liquidado':
        return <div className="badge badge-success">Liquidado</div>
      case 'pendente':
        return <div className="badge badge-warning">Pendente</div>
      case 'atrasado':
        return <div className="badge badge-error">Atrasado</div>
      default:
        return <div className="badge badge-ghost">{status}</div>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="navbar bg-base-100 shadow-lg">
        <div className="navbar-start">
          <h1 className="text-xl font-bold">Dashboard Financeiro</h1>
        </div>
        <div className="navbar-end">
          <div className="flex gap-2">
            <button className="btn btn-outline btn-sm">
              <Download className="h-4 w-4" />
              Exportar
            </button>
            <button onClick={loadFinancialData} className="btn btn-primary btn-sm">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Caixa Atual */}
          <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm opacity-90 uppercase tracking-wider">Caixa Atual</h3>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.caixa_atual)}</p>
                </div>
                <DollarSign className="h-8 w-8 opacity-80" />
              </div>
            </div>
          </div>

          {/* Entradas do Mês */}
          <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm opacity-90 uppercase tracking-wider">Entradas do Mês</h3>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.entradas_mes)}</p>
                  {metrics.variacao_entradas !== 0 && (
                    <div className="flex items-center text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {metrics.variacao_entradas > 0 ? '+' : ''}{metrics.variacao_entradas.toFixed(1)}%
                    </div>
                  )}
                </div>
                <TrendingUp className="h-8 w-8 opacity-80" />
              </div>
            </div>
          </div>

          {/* Saídas do Mês */}
          <div className="card bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm opacity-90 uppercase tracking-wider">Saídas do Mês</h3>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.saidas_mes)}</p>
                  {metrics.variacao_saidas !== 0 && (
                    <div className="flex items-center text-xs">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {metrics.variacao_saidas > 0 ? '+' : ''}{metrics.variacao_saidas.toFixed(1)}%
                    </div>
                  )}
                </div>
                <TrendingDown className="h-8 w-8 opacity-80" />
              </div>
            </div>
          </div>

          {/* Resultado Líquido */}
          <div className={`card ${metrics.resultado_liquido >= 0 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'} text-white shadow-xl`}>
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm opacity-90 uppercase tracking-wider">Resultado Líquido</h3>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.resultado_liquido)}</p>
                </div>
                <Target className="h-8 w-8 opacity-80" />
              </div>
            </div>
          </div>
        </div>

        {/* Contas a Pagar e Receber */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-warning">
                <AlertCircle className="h-5 w-5" />
                Contas a Pagar
              </h3>
              <div className="text-3xl font-bold text-warning">
                {formatCurrency(metrics.contas_pagar)}
              </div>
              <p className="text-base-content/70">
                Valores pendentes a pagar
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-info">
                <Receipt className="h-5 w-5" />
                Contas a Receber
              </h3>
              <div className="text-3xl font-bold text-info">
                {formatCurrency(metrics.contas_receber)}
              </div>
              <p className="text-base-content/70">
                Valores pendentes a receber
              </p>
            </div>
          </div>
        </div>

        {/* Filtros e Ações */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Período</span>
                  </label>
                  <select 
                    className="select select-bordered select-sm"
                    value={chartPeriod}
                    onChange={(e) => setChartPeriod(e.target.value)}
                  >
                    <option value="7d">Últimos 7 dias</option>
                    <option value="30d">Últimos 30 dias</option>
                    <option value="90d">Últimos 90 dias</option>
                    <option value="1y">Último ano</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm">
                  <Plus className="h-4 w-4" />
                  Nova Transação
                </button>
                <button className="btn btn-outline btn-sm">
                  <Filter className="h-4 w-4" />
                  Filtros
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">
                <BarChart3 className="h-5 w-5" />
                Fluxo de Caixa
              </h3>
              <div className="h-64 bg-base-200 rounded-lg flex items-center justify-center">
                <div className="text-center text-base-content/60">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                  <p>Gráfico de fluxo de caixa</p>
                  <p className="text-sm">Em desenvolvimento</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">
                <PieChart className="h-5 w-5" />
                Categorias
              </h3>
              <div className="h-64 bg-base-200 rounded-lg flex items-center justify-center">
                <div className="text-center text-base-content/60">
                  <PieChart className="h-12 w-12 mx-auto mb-2" />
                  <p>Distribuição por categorias</p>
                  <p className="text-sm">Em desenvolvimento</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transações Recentes */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title">Transações Recentes</h3>
              <button className="btn btn-outline btn-sm">
                <Eye className="h-4 w-4" />
                Ver Todas
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-base-content/40" />
                <p className="text-base-content/60">Nenhuma transação encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Projeto</th>
                      <th>Status</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover">
                        <td>{new Date(transaction.data).toLocaleDateString('pt-BR')}</td>
                        <td>
                          <div className="font-medium">{transaction.descricao}</div>
                          {transaction.fornecedor && (
                            <div className="text-xs text-base-content/70">{transaction.fornecedor}</div>
                          )}
                        </td>
                        <td>
                          <div className="badge badge-outline">{transaction.categoria}</div>
                        </td>
                        <td>
                          {transaction.projeto ? (
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: transaction.projeto.cor_tema }}
                              ></div>
                              <span className="text-sm">{transaction.projeto.nome}</span>
                            </div>
                          ) : (
                            <span className="text-base-content/40">-</span>
                          )}
                        </td>
                        <td>{getStatusBadge(transaction.status)}</td>
                        <td>
                          <span className={`font-bold ${transaction.tipo === 'entrada' ? 'text-success' : 'text-error'}`}>
                            {transaction.tipo === 'entrada' ? '+' : '-'}{formatCurrency(transaction.valor)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}