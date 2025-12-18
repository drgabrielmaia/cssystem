'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
  Download,
  Eye,
  Calendar,
  PieChart,
  BarChart3,
  CreditCard,
  Receipt,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter
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
}

export default function FinanceiroDashboard() {
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
  const [chartType, setChartType] = useState('entradas')
  const [financeUser, setFinanceUser] = useState<any>(null)

  useEffect(() => {
    checkAuth()
    loadFinanceData()
  }, [])

  const checkAuth = () => {
    const savedUser = localStorage.getItem('finance_user')
    if (savedUser) {
      setFinanceUser(JSON.parse(savedUser))
    }
  }

  const loadFinanceData = async () => {
    try {
      setLoading(true)

      // Simular dados - você pode conectar ao Supabase aqui
      const mockMetrics: FinanceMetrics = {
        caixa_atual: 145000,
        entradas_mes: 89500,
        saidas_mes: 42300,
        resultado_liquido: 47200,
        contas_pagar: 12400,
        contas_receber: 8900,
        variacao_entradas: 12.5,
        variacao_saidas: -8.2
      }

      const mockTransactions: Transaction[] = [
        {
          id: '1',
          tipo: 'entrada',
          valor: 15000,
          descricao: 'Pagamento Cliente XYZ',
          categoria: 'Receita',
          data: '2024-01-15',
          status: 'liquidado',
          fornecedor: 'Cliente XYZ'
        },
        {
          id: '2',
          tipo: 'saida',
          valor: 3200,
          descricao: 'Aluguel Escritório',
          categoria: 'Infraestrutura',
          data: '2024-01-14',
          status: 'pendente',
          fornecedor: 'Imobiliária ABC'
        },
        {
          id: '3',
          tipo: 'entrada',
          valor: 8500,
          descricao: 'Consultoria Projeto',
          categoria: 'Serviços',
          data: '2024-01-13',
          status: 'atrasado',
          fornecedor: 'Empresa DEF'
        }
      ]

      setMetrics(mockMetrics)
      setTransactions(mockTransactions)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'liquidado': return 'text-green-600 bg-green-50'
      case 'pendente': return 'text-yellow-600 bg-yellow-50'
      case 'atrasado': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'liquidado': return <CheckCircle className="w-4 h-4" />
      case 'pendente': return <Clock className="w-4 h-4" />
      case 'atrasado': return <AlertCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-lg border-b border-white/20 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">
              Olá, {financeUser?.nome || 'Financeiro'} 👋
            </h1>
            <p className="text-slate-600">Aqui está um resumo das suas finanças hoje</p>
          </div>

          <div className="flex items-center space-x-4">
            <select className="px-4 py-2 bg-white rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Últimos 30 dias</option>
              <option>Últimos 7 dias</option>
              <option>Este mês</option>
            </select>

            <button className="px-4 py-2 bg-white rounded-2xl border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>

            <button
              onClick={loadFinanceData}
              className="p-2 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
          {/* Caixa Atual - Hero Card */}
          <div className="md:col-span-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white/80 text-sm font-medium">Caixa Atual</h3>
                <Eye className="w-5 h-5 text-white/60" />
              </div>
              <div className="text-4xl font-bold mb-2">
                {formatCurrency(metrics.caixa_atual)}
              </div>
              <div className="flex items-center text-white/80">
                <ArrowUpRight className="w-4 h-4 mr-1" />
                <span className="text-sm">+{metrics.variacao_entradas}% vs mês anterior</span>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          </div>

          {/* Entradas */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                +{metrics.variacao_entradas}%
              </span>
            </div>
            <h3 className="text-slate-600 text-sm mb-1">Entradas</h3>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(metrics.entradas_mes)}</p>
          </div>

          {/* Saídas */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                {metrics.variacao_saidas}%
              </span>
            </div>
            <h3 className="text-slate-600 text-sm mb-1">Saídas</h3>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(metrics.saidas_mes)}</p>
          </div>

          {/* Resultado Líquido */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-slate-600 text-sm mb-1">Líquido</h3>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(metrics.resultado_liquido)}</p>
          </div>

          {/* Contas a Pagar */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <h3 className="text-slate-600 text-sm mb-1">A Pagar</h3>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(metrics.contas_pagar)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Principal */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Fluxo Financeiro</h3>

              <div className="flex items-center space-x-2">
                <div className="flex bg-slate-100 rounded-2xl p-1">
                  {['entradas', 'saidas', 'liquido'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setChartType(type)}
                      className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors capitalize ${
                        chartType === type
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Gráfico de Barras Pontilhado */}
            <div className="h-64 flex items-end justify-between space-x-3">
              {[45, 52, 38, 65, 42, 58, 70, 48, 63, 55, 72, 60, 45, 68].map((height, index) => (
                <div key={index} className="flex-1 flex flex-col justify-end h-full">
                  <div
                    className={`w-full rounded-t-lg transition-all hover:opacity-80 cursor-pointer ${
                      chartType === 'entradas' ? 'bg-green-400' :
                      chartType === 'saidas' ? 'bg-red-400' : 'bg-blue-400'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-4 text-sm text-slate-600">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
          </div>

          {/* Transações Recentes */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Recentes</h3>
              <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
                Ver tudo
              </button>
            </div>

            <div className="space-y-4">
              {transactions.slice(0, 6).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      transaction.tipo === 'entrada' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {transaction.tipo === 'entrada' ?
                        <ArrowUpRight className="w-5 h-5 text-green-600" /> :
                        <ArrowDownRight className="w-5 h-5 text-red-600" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{transaction.descricao}</p>
                      <p className="text-xs text-slate-600">{transaction.fornecedor}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-semibold text-sm ${
                      transaction.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.tipo === 'entrada' ? '+' : '-'}{formatCurrency(transaction.valor)}
                    </p>
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getStatusColor(transaction.status)}`}>
                      {getStatusIcon(transaction.status)}
                      <span className="capitalize">{transaction.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="mt-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Ações Rápidas</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Plus, label: 'Novo Lançamento', color: 'blue' },
              { icon: RefreshCw, label: 'Transferir', color: 'green' },
              { icon: Receipt, label: 'Criar Cobrança', color: 'purple' },
              { icon: Download, label: 'Importar', color: 'orange' }
            ].map((action, index) => (
              <button
                key={index}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-slate-100 hover:border-slate-200 transition-colors group"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                  action.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                  action.color === 'green' ? 'bg-green-100 text-green-600' :
                  action.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                  'bg-orange-100 text-orange-600'
                }`}>
                  <action.icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-800">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}