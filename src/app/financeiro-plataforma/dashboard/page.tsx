'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  Filter,
  Users,
  Settings,
  BarChart2,
  LogOut
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
  valor_total_arrecadado: number
  taxa_conversao_real: number
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

export default function FinanceiroPlataformaDashboard() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<FinanceMetrics>({
    caixa_atual: 0,
    entradas_mes: 0,
    saidas_mes: 0,
    resultado_liquido: 0,
    contas_pagar: 0,
    contas_receber: 0,
    variacao_entradas: 0,
    variacao_saidas: 0,
    valor_total_arrecadado: 0,
    taxa_conversao_real: 0
  })

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [chartPeriod, setChartPeriod] = useState('mensal')
  const [chartType, setChartType] = useState('entradas')
  const [chartData, setChartData] = useState<Array<{period: string, value: number}>>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [financeUser, setFinanceUser] = useState<any>(null)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [transactionForm, setTransactionForm] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    valor: '',
    descricao: '',
    categoria: '',
    data: new Date().toISOString().split('T')[0],
    fornecedor: ''
  })

  useEffect(() => {
    checkAuth()
    loadFinanceData()
    loadChartData()
  }, [])

  useEffect(() => {
    loadChartData()
  }, [chartPeriod, chartType])

  const checkAuth = () => {
    const savedUser = localStorage.getItem('finance_user')
    if (savedUser) {
      setFinanceUser(JSON.parse(savedUser))
    } else {
      router.push('/financeiro-plataforma/login')
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('finance_user')
      router.push('/financeiro-plataforma/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  const loadFinanceData = async () => {
    try {
      setLoading(true)

      // Buscar métricas financeiras do Supabase
      const [transactionsResult, metricsResult] = await Promise.all([
        supabase.from('transacoes_financeiras').select('*').order('data_transacao', { ascending: false }).limit(10),
        calculateMetrics()
      ])

      if (transactionsResult.data) {
        setTransactions(transactionsResult.data)
      }

      setMetrics(metricsResult)
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = async (): Promise<FinanceMetrics> => {
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

    try {
      // Buscar transações do mês atual
      const { data: monthlyTransactions } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .gte('data_transacao', `${currentMonth}-01`)
        .lt('data_transacao', `${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()}`)

      // Buscar todas as transações para caixa atual
      const { data: allTransactions } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .eq('status', 'pago')

      const entradas_mes = monthlyTransactions?.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + t.valor, 0) || 0
      const saidas_mes = monthlyTransactions?.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + t.valor, 0) || 0

      const caixa_atual = allTransactions?.reduce((acc, t) => {
        return t.tipo === 'entrada' ? acc + t.valor : acc - t.valor
      }, 0) || 0

      // Buscar contas a pagar e receber
      const { data: contasPagar } = await supabase
        .from('transacoes_financeiras')
        .select('valor')
        .eq('tipo', 'saida')
        .eq('status', 'pendente')

      const { data: contasReceber } = await supabase
        .from('transacoes_financeiras')
        .select('valor')
        .eq('tipo', 'entrada')
        .eq('status', 'pendente')

      const contas_pagar = contasPagar?.reduce((acc, t) => acc + t.valor, 0) || 0
      const contas_receber = contasReceber?.reduce((acc, t) => acc + t.valor, 0) || 0

      // Calcular valor total arrecadado (vendas realizadas)
      const { data: vendasData } = await supabase
        .from('leads')
        .select('valor_arrecadado')
        .eq('status', 'vendido')
        .not('valor_arrecadado', 'is', null)

      // Calcular taxa de conversão real (leads → vendas)
      const { data: totalLeadsData } = await supabase
        .from('leads')
        .select('id')

      const { data: vendasConversao } = await supabase
        .from('leads')
        .select('id')
        .eq('status', 'vendido')
        .not('valor_arrecadado', 'is', null)
        .gt('valor_arrecadado', 0)

      const valor_total_arrecadado = vendasData?.reduce((sum, lead) => sum + (lead.valor_arrecadado || 0), 0) || 0
      const meta_mensal = 500000 // Meta fixa de 500K
      const total_leads = totalLeadsData?.length || 0
      const total_vendas = vendasConversao?.length || 0
      const taxa_conversao_real = total_leads > 0 ? (total_vendas / total_leads) * 100 : 0

      // Debug logs
      console.log('🎯 Debug Financeiro Dashboard:', {
        valor_total_arrecadado,
        total_leads,
        total_vendas,
        taxa_conversao_real
      })

      return {
        caixa_atual,
        entradas_mes,
        saidas_mes,
        resultado_liquido: entradas_mes - saidas_mes,
        contas_pagar,
        contas_receber,
        variacao_entradas: Math.random() * 20 - 10, // Placeholder - implementar lógica real
        variacao_saidas: Math.random() * 20 - 10,     // Placeholder - implementar lógica real
        valor_total_arrecadado,
        taxa_conversao_real
      }
    } catch (error) {
      console.error('Erro ao calcular métricas:', error)
      return {
        caixa_atual: 0,
        entradas_mes: 0,
        saidas_mes: 0,
        resultado_liquido: 0,
        contas_pagar: 0,
        contas_receber: 0,
        variacao_entradas: 0,
        variacao_saidas: 0,
        valor_total_arrecadado: 0,
        taxa_conversao_real: 0
      }
    }
  }

  const loadChartData = async () => {
    try {
      setChartLoading(true)
      const currentDate = new Date()
      const periods = []

      if (chartPeriod === 'diario') {
        // Últimos 7 dias
        for (let i = 6; i >= 0; i--) {
          const date = new Date(currentDate)
          date.setDate(currentDate.getDate() - i)
          const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
          const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)

          const { data: transactionsDay } = await supabase
            .from('transacoes_financeiras')
            .select('valor, tipo')
            .eq('status', 'pago')
            .eq('tipo', chartType === 'liquido' ? 'entrada' : chartType)
            .gte('data_transacao', startDate.toISOString())
            .lt('data_transacao', endDate.toISOString())

          let value = transactionsDay?.reduce((acc, t) => acc + t.valor, 0) || 0

          if (chartType === 'liquido') {
            const { data: saidas } = await supabase
              .from('transacoes_financeiras')
              .select('valor')
              .eq('status', 'pago')
              .eq('tipo', 'saida')
              .gte('data_transacao', startDate.toISOString())
              .lt('data_transacao', endDate.toISOString())

            const valorSaidas = saidas?.reduce((acc, t) => acc + t.valor, 0) || 0
            value = value - valorSaidas
          }

          periods.push({
            period: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            value
          })
        }
      } else if (chartPeriod === 'semanal') {
        // Últimas 4 semanas
        for (let i = 3; i >= 0; i--) {
          const date = new Date(currentDate)
          date.setDate(currentDate.getDate() - (i * 7))

          // Início da semana (domingo)
          const startOfWeek = new Date(date)
          startOfWeek.setDate(date.getDate() - date.getDay())
          startOfWeek.setHours(0, 0, 0, 0)

          // Fim da semana (sábado)
          const endOfWeek = new Date(startOfWeek)
          endOfWeek.setDate(startOfWeek.getDate() + 6)
          endOfWeek.setHours(23, 59, 59, 999)

          const { data: transactionsWeek } = await supabase
            .from('transacoes_financeiras')
            .select('valor, tipo')
            .eq('status', 'pago')
            .eq('tipo', chartType === 'liquido' ? 'entrada' : chartType)
            .gte('data_transacao', startOfWeek.toISOString())
            .lte('data_transacao', endOfWeek.toISOString())

          let value = transactionsWeek?.reduce((acc, t) => acc + t.valor, 0) || 0

          if (chartType === 'liquido') {
            const { data: saidas } = await supabase
              .from('transacoes_financeiras')
              .select('valor')
              .eq('status', 'pago')
              .eq('tipo', 'saida')
              .gte('data_transacao', startOfWeek.toISOString())
              .lte('data_transacao', endOfWeek.toISOString())

            const valorSaidas = saidas?.reduce((acc, t) => acc + t.valor, 0) || 0
            value = value - valorSaidas
          }

          periods.push({
            period: `${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}`,
            value
          })
        }
      } else {
        // Mensal - últimos 6 meses
        for (let i = 5; i >= 0; i--) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
          const startDate = new Date(date.getFullYear(), date.getMonth(), 1)
          const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)

          const { data: transactionsMonth } = await supabase
            .from('transacoes_financeiras')
            .select('valor, tipo')
            .eq('status', 'pago')
            .eq('tipo', chartType === 'liquido' ? 'entrada' : chartType)
            .gte('data_transacao', startDate.toISOString())
            .lte('data_transacao', endDate.toISOString())

          let value = transactionsMonth?.reduce((acc, t) => acc + t.valor, 0) || 0

          if (chartType === 'liquido') {
            const { data: saidas } = await supabase
              .from('transacoes_financeiras')
              .select('valor')
              .eq('status', 'pago')
              .eq('tipo', 'saida')
              .gte('data_transacao', startDate.toISOString())
              .lte('data_transacao', endDate.toISOString())

            const valorSaidas = saidas?.reduce((acc, t) => acc + t.valor, 0) || 0
            value = value - valorSaidas
          }

          periods.push({
            period: date.toLocaleDateString('pt-BR', { month: 'short' }),
            value
          })
        }
      }

      setChartData(periods)
    } catch (error) {
      console.error('Erro ao carregar dados do gráfico:', error)
    } finally {
      setChartLoading(false)
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

  const handleNewTransaction = () => {
    setTransactionForm({
      tipo: 'entrada',
      valor: '',
      descricao: '',
      categoria: '',
      data: new Date().toISOString().split('T')[0],
      fornecedor: ''
    })
    setShowTransactionModal(true)
  }

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)

      const { error } = await supabase
        .from('transacoes_financeiras')
        .insert([{
          tipo: transactionForm.tipo,
          valor: parseFloat(transactionForm.valor),
          descricao: transactionForm.descricao,
          categoria: transactionForm.categoria,
          data_transacao: transactionForm.data,
          status: 'pago',
          fornecedor: transactionForm.fornecedor,
          referencia_tipo: 'manual'
        }])

      if (error) throw error

      alert('Transação registrada com sucesso!')
      setShowTransactionModal(false)
      loadFinanceData()
    } catch (error: any) {
      console.error('Erro ao salvar transação:', error)
      alert('Erro ao salvar transação: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncComissoes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/financeiro/sync-comissoes', {
        method: 'POST'
      })

      const result = await response.json()

      if (response.ok) {
        alert(`✅ ${result.message}`)
        loadFinanceData()
      } else {
        throw new Error(result.error || 'Erro na sincronização')
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar comissões:', error)
      alert('❌ Erro ao sincronizar comissões: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !financeUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F3F3F5] flex">
      {/* Sidebar Menu */}
      <aside className="w-64 bg-white border-r border-[#E5E7EB] flex flex-col">
        <div className="p-6 border-b border-[#E5E7EB]">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-[#1A1A1A]" />
            </div>
            <div className="ml-3">
              <h1 className="text-[18px] font-semibold text-[#1A1A1A]">Financeiro</h1>
              <p className="text-[13px] text-[#6B7280]">Plataforma</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <a
              href="/financeiro-plataforma/dashboard"
              className="flex items-center px-3 py-2 rounded-lg text-[#1A1A1A] bg-[#E879F9] bg-opacity-10 font-medium"
            >
              <BarChart2 className="w-4 h-4 mr-3" />
              Dashboard
            </a>

            <a
              href="/financeiro-plataforma/analise"
              className="flex items-center px-3 py-2 rounded-lg text-[#6B7280] hover:bg-[#F3F3F5] hover:text-[#1A1A1A] transition-colors"
            >
              <BarChart3 className="w-4 h-4 mr-3" />
              Análise
            </a>

            <a
              href="/financeiro-plataforma/usuarios"
              className="flex items-center px-3 py-2 rounded-lg text-[#6B7280] hover:bg-[#F3F3F5] hover:text-[#1A1A1A] transition-colors"
            >
              <Users className="w-4 h-4 mr-3" />
              Usuários
            </a>
          </div>
        </nav>

        <div className="p-4 border-t border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[14px] font-medium text-[#1A1A1A]">{financeUser?.nome}</p>
              <p className="text-[12px] text-[#6B7280]">{financeUser?.cargo}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-[13px] text-[#6B7280] hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-[#E5E7EB] px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[24px] font-semibold text-[#1A1A1A] mb-1">
                Dashboard Financeiro
              </h1>
              <p className="text-[15px] text-[#6B7280]">Olá, {financeUser?.nome || 'Financeiro'} 👋</p>
            </div>

            <div className="flex items-center space-x-4">
              <select className="px-4 py-2 bg-[#F3F3F5] rounded-lg border-0 text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-[#E879F9]">
                <option>Últimos 30 dias</option>
                <option>Últimos 7 dias</option>
                <option>Este mês</option>
              </select>

              <button
                onClick={loadFinanceData}
                className="p-2 bg-[#1A1A1A] text-white rounded-lg hover:bg-opacity-90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
            {/* Caixa Atual - Hero Card */}
            <div className="md:col-span-2 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] rounded-[20px] p-8 text-[#1A1A1A] relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#1A1A1A]/80 text-[14px] font-medium">Performance de Vendas</h3>
                  <Target className="w-5 h-5 text-[#1A1A1A]/60" />
                </div>

                {/* Faturamento e Meta lado a lado */}
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <div className="text-[32px] font-bold text-[#1A1A1A]">
                      {formatCurrency(metrics.valor_total_arrecadado || 0)}
                    </div>
                    <div className="text-[14px] text-[#1A1A1A]/70">Valor Arrecadado</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[16px] text-[#1A1A1A]/60">Meta: {formatCurrency(500000)}</div>
                    <div className="text-[12px] text-[#1A1A1A]/50">Mensal</div>
                  </div>
                </div>

                {/* Régua de Taxa de Conversão Real */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[12px] text-[#1A1A1A]/70 mb-1">
                    <span>Taxa de Conversão</span>
                    <span>{(metrics.taxa_conversao_real || 0).toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-[#1A1A1A]/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        (metrics.taxa_conversao_real || 0) > 55 ? 'bg-blue-500' :
                        (metrics.taxa_conversao_real || 0) >= 40 ? 'bg-green-500' :
                        (metrics.taxa_conversao_real || 0) >= 25 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((metrics.taxa_conversao_real || 0), 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#1A1A1A]/60 mt-1">
                    <span>🔴 Ruim (&lt;25%)</span>
                    <span>🟡 Normal (25-40%)</span>
                    <span>🟢 Bom (40-55%)</span>
                    <span>🔵 Excelente (&gt;55%)</span>
                  </div>
                </div>

                <div className="flex items-center text-[#1A1A1A]/80">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  <span className="text-[14px]">+{metrics.variacao_entradas.toFixed(1)}% vs mês anterior</span>
                </div>
              </div>
            </div>

            {/* Entradas */}
            <div className="bg-white rounded-[16px] p-6 border border-[#E5E7EB]">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-[#E879F9] bg-opacity-10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#E879F9]" />
                </div>
                <span className="text-[12px] text-[#22C55E] bg-green-50 px-2 py-1 rounded-full">
                  +{metrics.variacao_entradas.toFixed(1)}%
                </span>
              </div>
              <h3 className="text-[#6B7280] text-[13px] mb-1">Entradas</h3>
              <p className="text-[20px] font-bold text-[#1A1A1A]">{formatCurrency(metrics.entradas_mes)}</p>
            </div>

            {/* Saídas */}
            <div className="bg-white rounded-[16px] p-6 border border-[#E5E7EB]">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-[12px] text-red-500 bg-red-50 px-2 py-1 rounded-full">
                  {metrics.variacao_saidas.toFixed(1)}%
                </span>
              </div>
              <h3 className="text-[#6B7280] text-[13px] mb-1">Saídas</h3>
              <p className="text-[20px] font-bold text-[#1A1A1A]">{formatCurrency(metrics.saidas_mes)}</p>
            </div>

            {/* Resultado Líquido */}
            <div className="bg-white rounded-[16px] p-6 border border-[#E5E7EB]">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <h3 className="text-[#6B7280] text-[13px] mb-1">Líquido</h3>
              <p className="text-[20px] font-bold text-[#1A1A1A]">{formatCurrency(metrics.resultado_liquido)}</p>
            </div>

            {/* Contas a Pagar */}
            <div className="bg-white rounded-[16px] p-6 border border-[#E5E7EB]">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-orange-500" />
                </div>
              </div>
              <h3 className="text-[#6B7280] text-[13px] mb-1">A Pagar</h3>
              <p className="text-[20px] font-bold text-[#1A1A1A]">{formatCurrency(metrics.contas_pagar)}</p>
            </div>
          </div>

          {/* Charts and Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Principal */}
            <div className="lg:col-span-2 bg-white rounded-[20px] p-8 border border-[#E5E7EB]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[18px] font-semibold text-[#1A1A1A]">Evolução Financeira</h3>
                <div className="flex gap-2">
                  {/* Período */}
                  <div className="flex bg-[#F3F3F5] rounded-lg p-1">
                    {['diario', 'semanal', 'mensal'].map((period) => (
                      <button
                        key={period}
                        onClick={() => setChartPeriod(period)}
                        className={`px-3 py-1 text-[12px] font-medium rounded-lg transition-colors capitalize ${
                          chartPeriod === period
                            ? 'bg-white text-[#1A1A1A] shadow-sm'
                            : 'text-[#6B7280] hover:text-[#1A1A1A]'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                  {/* Tipo */}
                  <div className="flex bg-[#F3F3F5] rounded-lg p-1">
                    {['entradas', 'saidas', 'liquido'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setChartType(type)}
                        className={`px-4 py-2 text-[14px] font-medium rounded-lg transition-colors capitalize ${
                          chartType === type
                            ? 'bg-white text-[#1A1A1A] shadow-sm'
                            : 'text-[#6B7280] hover:text-[#1A1A1A]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="h-64">
                {chartLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E879F9]"></div>
                  </div>
                ) : (
                  <div className="h-full flex items-end justify-between space-x-2">
                    {chartData.map((item, index) => {
                      const maxValue = Math.max(...chartData.map(d => Math.abs(d.value)))
                      const height = maxValue > 0 ? (Math.abs(item.value) / maxValue) * 100 : 0
                      const isNegative = item.value < 0

                      return (
                        <div key={index} className="flex-1 flex flex-col justify-end h-full relative">
                          <div className="text-xs text-center text-gray-600 mb-1">
                            {formatCurrency(item.value)}
                          </div>
                          <div
                            className={`w-full rounded-t-lg transition-all ${
                              isNegative ? 'bg-red-400' :
                              chartType === 'entradas' ? 'bg-[#E879F9]' :
                              chartType === 'saidas' ? 'bg-red-400' : 'bg-blue-400'
                            }`}
                            style={{ height: `${Math.max(height, 5)}%` }}
                          />
                          <div className="text-xs text-center text-gray-500 mt-1">
                            {item.period}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-[20px] p-6 border border-[#E5E7EB]">
              <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-6">Ações Rápidas</h3>
              <div className="space-y-3">
                <button
                  onClick={handleNewTransaction}
                  className="w-full flex items-center justify-center px-4 py-3 bg-[#E879F9] text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Transação
                </button>

                <button
                  onClick={handleSyncComissoes}
                  className="w-full flex items-center justify-center px-4 py-3 bg-[#1A1A1A] text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Comissões
                </button>

                <button className="w-full flex items-center justify-center px-4 py-3 bg-[#F3F3F5] text-[#6B7280] rounded-lg hover:bg-[#E5E7EB] transition-colors">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Nova Transação */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-[#1A1A1A]">Nova Transação</h3>
              <button
                onClick={() => setShowTransactionModal(false)}
                className="p-2 text-[#6B7280] hover:bg-[#F3F3F5] rounded-lg transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4">
              <div>
                <label className="block text-[14px] font-medium text-[#1A1A1A] mb-2">Tipo</label>
                <select
                  value={transactionForm.tipo}
                  onChange={(e) => setTransactionForm({ ...transactionForm, tipo: e.target.value as 'entrada' | 'saida' })}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E879F9] focus:border-[#E879F9]"
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#1A1A1A] mb-2">Valor *</label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.valor}
                  onChange={(e) => setTransactionForm({ ...transactionForm, valor: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E879F9] focus:border-[#E879F9]"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#1A1A1A] mb-2">Descrição *</label>
                <input
                  type="text"
                  value={transactionForm.descricao}
                  onChange={(e) => setTransactionForm({ ...transactionForm, descricao: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E879F9] focus:border-[#E879F9]"
                  placeholder="Descrição da transação"
                  required
                />
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#1A1A1A] mb-2">Categoria</label>
                <input
                  type="text"
                  value={transactionForm.categoria}
                  onChange={(e) => setTransactionForm({ ...transactionForm, categoria: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E879F9] focus:border-[#E879F9]"
                  placeholder="Ex: Receita, Despesas"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="flex-1 px-4 py-2 border border-[#E5E7EB] text-[#6B7280] rounded-lg hover:bg-[#F3F3F5] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#E879F9] text-white rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}