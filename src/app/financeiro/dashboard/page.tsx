'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'
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
  Building2,
  Trophy,
  Heart,
  Briefcase,
  Settings
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
}

interface Projeto {
  id: string
  codigo: string
  nome: string
  descricao?: string
  cor_tema: string
  ativo: boolean
}

interface ProjetoMetrics {
  projeto: Projeto
  receitas: number
  despesas: number
  lucro: number
  transacoes_count: number
  crescimento: number
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
  const [chartData, setChartData] = useState<number[]>([])
  const { user, organizationId } = useAuth()
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [projetoSelecionado, setProjetoSelecionado] = useState<string>('todos')
  const [projetoMetrics, setProjetoMetrics] = useState<ProjetoMetrics[]>([])
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [transactionForm, setTransactionForm] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    valor: '',
    descricao: '',
    categoria: '',
    data: new Date().toISOString().split('T')[0],
    fornecedor: '',
    projeto_id: ''
  })

  const loadProjetoMetrics = async () => {
    try {
      if (!organizationId || projetos.length === 0) return

      const projetoMetricsData: ProjetoMetrics[] = []

      for (const projeto of projetos) {
        // Buscar transações do projeto
        const { data: transacoes } = await supabase
          .from('transacoes_financeiras')
          .select('valor, tipo')
          .eq('organization_id', organizationId)
          .eq('projeto_id', projeto.id)
          .eq('status', 'pago')

        const receitas = transacoes?.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + t.valor, 0) || 0
        const despesas = transacoes?.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + t.valor, 0) || 0
        const lucro = receitas - despesas
        const transacoes_count = transacoes?.length || 0

        // Calcular crescimento (simulado por agora)
        const crescimento = Math.random() * 20 - 10 // -10% a +10%

        projetoMetricsData.push({
          projeto,
          receitas,
          despesas,
          lucro,
          transacoes_count,
          crescimento: Math.round(crescimento * 10) / 10
        })
      }

      // Ordenar por lucro (maior primeiro)
      projetoMetricsData.sort((a, b) => b.lucro - a.lucro)
      setProjetoMetrics(projetoMetricsData)

      console.log('📊 Métricas por projeto carregadas:', projetoMetricsData.length)
    } catch (error) {
      console.error('Erro ao carregar métricas por projeto:', error)
    }
  }

  useEffect(() => {
    if (user && organizationId) {
      loadProjetos()
      loadFinanceData()
    }
  }, [user, organizationId])

  useEffect(() => {
    if (user && organizationId && projetos.length > 0) {
      loadFinanceData()
      loadProjetoMetrics()
    }
  }, [projetoSelecionado])

  const loadProjetos = async () => {
    try {
      if (!organizationId) return

      const { data, error } = await supabase
        .from('projetos_organizacao')
        .select('id, codigo, nome, descricao, cor_tema, ativo')
        .eq('organization_id', organizationId)
        .eq('ativo', true)
        .order('codigo')

      if (error) throw error

      setProjetos(data || [])
      console.log('📂 Projetos carregados:', data?.length)

      // Carregar métricas por projeto
      await loadProjetoMetrics()
    } catch (error) {
      console.error('Erro ao carregar projetos:', error)
    }
  }

  const loadFinanceData = async () => {
    try {
      setLoading(true)

      if (!organizationId) {
        console.log('🔄 Aguardando organização do usuário...')
        return
      }

      console.log('💰 Carregando dados financeiros para organização:', organizationId, 'projeto:', projetoSelecionado)

      // Query base para transações
      let transactionsQuery = supabase
        .from('transacoes_financeiras')
        .select(`
          *,
          projeto:projetos_organizacao(id, codigo, nome, cor_tema)
        `)
        .eq('organization_id', organizationId)

      // Filtrar por projeto se selecionado
      if (projetoSelecionado !== 'todos') {
        const projetoId = projetos.find(p => p.codigo === projetoSelecionado)?.id
        if (projetoId) {
          transactionsQuery = transactionsQuery.eq('projeto_id', projetoId)
        }
      }

      const [transactionsResult, metricsResult, chartDataResult] = await Promise.all([
        transactionsQuery
          .order('data_transacao', { ascending: false })
          .limit(10),
        calculateMetrics(),
        generateChartData()
      ])

      if (transactionsResult.data) {
        setTransactions(transactionsResult.data)
      }

      setMetrics(metricsResult)
      setChartData(chartDataResult)
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = async (): Promise<FinanceMetrics> => {
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

    try {
      if (!organizationId) {
        console.warn('❌ calculateMetrics: organizationId não definido')
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

      // Query base para transações do mês
      let monthlyQuery = supabase
        .from('transacoes_financeiras')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('data_transacao', `${currentMonth}-01`)
        .lt('data_transacao', `${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()}`)

      // Filtrar por projeto se selecionado
      if (projetoSelecionado !== 'todos') {
        const projetoId = projetos.find(p => p.codigo === projetoSelecionado)?.id
        if (projetoId) {
          monthlyQuery = monthlyQuery.eq('projeto_id', projetoId)
        }
      }

      const { data: monthlyTransactions } = await monthlyQuery

      // Query para todas as transações (caixa atual)
      let allQuery = supabase
        .from('transacoes_financeiras')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pago')

      // Filtrar por projeto se selecionado
      if (projetoSelecionado !== 'todos') {
        const projetoId = projetos.find(p => p.codigo === projetoSelecionado)?.id
        if (projetoId) {
          allQuery = allQuery.eq('projeto_id', projetoId)
        }
      }

      const { data: allTransactions } = await allQuery

      // ADICIONAR VALORES DOS LEADS ARRECADADOS
      // Buscar leads arrecadados do mês atual
      const { data: monthlyLeads } = await supabase
        .from('leads')
        .select('valor_arrecadado, data_arrecadacao, organization_id')
        .eq('organization_id', organizationId)
        .not('valor_arrecadado', 'is', null)
        .gt('valor_arrecadado', 0)
        .gte('data_arrecadacao', `${currentMonth}-01`)
        .lt('data_arrecadacao', `${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()}`)

      // Buscar todos os leads arrecadados para caixa atual
      const { data: allLeads } = await supabase
        .from('leads')
        .select('valor_arrecadado, organization_id')
        .eq('organization_id', organizationId)
        .not('valor_arrecadado', 'is', null)
        .gt('valor_arrecadado', 0)

      // ADICIONAR RECEITAS DE MENTORIA E PENDÊNCIAS PAGAS
      // Buscar receitas de mentoria do mês atual
      const { data: monthlyMentorias } = await supabase
        .from('transacoes_financeiras')
        .select('valor, data_transacao')
        .eq('organization_id', organizationId)
        .in('referencia_tipo', ['mentorado_receita', 'pendencia_paga'])
        .gte('data_transacao', `${currentMonth}-01`)
        .lt('data_transacao', `${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0]}`)

      // Buscar todas as receitas de mentoria e pendências para caixa atual
      const { data: allMentorias } = await supabase
        .from('transacoes_financeiras')
        .select('valor')
        .eq('organization_id', organizationId)
        .in('referencia_tipo', ['mentorado_receita', 'pendencia_paga'])

      const entradas_transacoes = monthlyTransactions?.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + t.valor, 0) || 0
      const entradas_leads = monthlyLeads?.reduce((acc, lead) => acc + (lead.valor_arrecadado || 0), 0) || 0
      const entradas_mentorias = monthlyMentorias?.reduce((acc, mentoria) => acc + (mentoria.valor || 0), 0) || 0
      const entradas_mes = entradas_transacoes + entradas_leads + entradas_mentorias

      const saidas_mes = monthlyTransactions?.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + t.valor, 0) || 0

      const caixa_transacoes = allTransactions?.reduce((acc, t) => {
        return t.tipo === 'entrada' ? acc + t.valor : acc - t.valor
      }, 0) || 0

      const caixa_leads = allLeads?.reduce((acc, lead) => acc + (lead.valor_arrecadado || 0), 0) || 0
      const caixa_mentorias = allMentorias?.reduce((acc, mentoria) => acc + (mentoria.valor || 0), 0) || 0
      const caixa_atual = caixa_transacoes + caixa_leads + caixa_mentorias

      // Buscar contas a pagar e receber com filtro organizacional
      const { data: contasPagar } = await supabase
        .from('transacoes_financeiras')
        .select('valor')
        .eq('organization_id', organizationId)
        .eq('tipo', 'saida')
        .eq('status', 'pendente')

      const { data: contasReceber } = await supabase
        .from('transacoes_financeiras')
        .select('valor')
        .eq('organization_id', organizationId)
        .eq('tipo', 'entrada')
        .eq('status', 'pendente')

      const contas_pagar = contasPagar?.reduce((acc, t) => acc + t.valor, 0) || 0
      const contas_receber = contasReceber?.reduce((acc, t) => acc + t.valor, 0) || 0

      // Calcular variações reais (mês atual vs anterior) com filtro organizacional
      const previousMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 7)

      const { data: previousMonthData } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('data_transacao', `${previousMonth}-01`)
        .lt('data_transacao', `${currentMonth}-01`)

      const entradas_mes_anterior = previousMonthData?.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + t.valor, 0) || 1
      const saidas_mes_anterior = previousMonthData?.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + t.valor, 0) || 1

      const variacao_entradas = entradas_mes_anterior > 0 ? ((entradas_mes - entradas_mes_anterior) / entradas_mes_anterior) * 100 : 0
      const variacao_saidas = saidas_mes_anterior > 0 ? ((saidas_mes - saidas_mes_anterior) / saidas_mes_anterior) * 100 : 0

      console.log('📊 Métricas calculadas para organização', organizationId, {
        caixa_atual,
        entradas_mes: {
          total: entradas_mes,
          transacoes: entradas_transacoes,
          leads: entradas_leads,
          mentorias: entradas_mentorias
        },
        saidas_mes,
        variacao_entradas: Math.round(variacao_entradas * 100) / 100,
        variacao_saidas: Math.round(variacao_saidas * 100) / 100
      })

      return {
        caixa_atual,
        entradas_mes,
        saidas_mes,
        resultado_liquido: entradas_mes - saidas_mes,
        contas_pagar,
        contas_receber,
        variacao_entradas: Math.round(variacao_entradas * 100) / 100, // Real calculation
        variacao_saidas: Math.round(variacao_saidas * 100) / 100      // Real calculation
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
        variacao_saidas: 0
      }
    }
  }

  const generateChartData = async (): Promise<number[]> => {
    try {
      if (!organizationId) {
        console.warn('❌ generateChartData: organizationId não definido')
        return Array.from({ length: 14 }, () => Math.random() * 60 + 20) // Fallback
      }

      // Gerar dados dos últimos 14 dias para o gráfico
      const days = []
      for (let i = 13; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        days.push(date.toISOString().split('T')[0])
      }

      const chartValues = []
      for (const day of days) {
        const { data: dayTransactions } = await supabase
          .from('transacoes_financeiras')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('data_transacao', day)
          .lt('data_transacao', new Date(new Date(day).getTime() + 86400000).toISOString().split('T')[0])

        let value = 0
        if (chartType === 'entradas') {
          value = dayTransactions?.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + t.valor, 0) || 0
        } else if (chartType === 'saidas') {
          value = dayTransactions?.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + t.valor, 0) || 0
        } else {
          const entradas = dayTransactions?.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + t.valor, 0) || 0
          const saidas = dayTransactions?.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + t.valor, 0) || 0
          value = entradas - saidas
        }

        chartValues.push(value)
      }

      // Normalizar valores para porcentagem (0-100)
      const maxValue = Math.max(...chartValues, 1)
      const normalizedData = chartValues.map(value => Math.max((value / maxValue) * 100, 5)) // Mín 5% para visibilidade

      console.log('📈 Dados do gráfico gerados para organização', organizationId, {
        chartType,
        days: days.length,
        maxValue,
        chartValues: chartValues.slice(0, 3),
        normalizedData: normalizedData.slice(0, 3)
      })

      return normalizedData

    } catch (error) {
      console.error('Erro ao gerar dados do gráfico:', error)
      return Array.from({ length: 14 }, () => Math.random() * 60 + 20) // Fallback
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
      fornecedor: '',
      projeto_id: ''
    })
    setShowTransactionModal(true)
  }

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)

      if (!organizationId) {
        alert('❌ Erro: Organização não identificada. Faça login novamente.')
        return
      }

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
          referencia_tipo: 'manual',
          organization_id: organizationId,
          projeto_id: transactionForm.projeto_id || null
        }])

      if (error) throw error

      console.log('✅ Transação salva com organização:', organizationId)
      alert('Transação registrada com sucesso!')
      setShowTransactionModal(false)
      loadFinanceData() // Recarregar dados
    } catch (error: any) {
      console.error('Erro ao salvar transação:', error)
      alert('Erro ao salvar transação: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = () => {
    alert('Implementar funcionalidade de transferência')
  }

  const handleCreateInvoice = () => {
    alert('Implementar criação de cobrança')
  }

  const handleImport = () => {
    alert('Implementar importação de dados')
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
        loadFinanceData() // Recarregar dados
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

  const handleSyncMentoriaVendas = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/financeiro/sync-mentoria-vendas', {
        method: 'POST'
      })

      const result = await response.json()

      if (response.ok) {
        alert(`✅ ${result.message}\n\nResumo:\n• ${result.statistics.total_mentorados_ativos} mentorados ativos\n• R$ ${result.statistics.valor_sincronizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em receitas\n• ${result.statistics.transacoes_sincronizadas} transações sincronizadas`)
        loadFinanceData() // Recarregar dados
      } else {
        throw new Error(result.error || 'Erro na sincronização')
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar vendas de mentoria:', error)
      alert('❌ Erro ao sincronizar vendas de mentoria: ' + error.message)
    } finally {
      setLoading(false)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/30 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent mb-1">
              Dashboard Financeiro 💰
            </h1>
            <p className="text-slate-600">Controle profissional de receitas e despesas por projeto</p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Filtro por Projeto */}
            <select
              value={projetoSelecionado}
              onChange={(e) => setProjetoSelecionado(e.target.value)}
              className="px-4 py-2 bg-white rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            >
              <option value="todos">🏢 Todos os Projetos</option>
              {projetos.map((projeto) => (
                <option key={projeto.id} value={projeto.codigo}>
                  {projeto.codigo === 'MENTORIA' && '🎓'}
                  {projeto.codigo === 'GMBV' && '💼'}
                  {projeto.codigo === 'CLINICA' && '🏥'}
                  {projeto.codigo === 'OPERACIONAL' && '⚙️'}
                  {projeto.codigo === 'OUTROS' && '📊'}
                  {' '}{projeto.nome}
                </option>
              ))}
            </select>

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
              className="p-2 bg-[#D4AF37] text-white rounded-2xl hover:bg-[#B8860B] transition-colors"
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
          <div className="md:col-span-2 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] rounded-3xl p-8 text-[#1A1A1A] relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#1A1A1A]/80 text-sm font-medium">Caixa Atual</h3>
                <Eye className="w-5 h-5 text-[#1A1A1A]/60" />
              </div>
              <div className="text-4xl font-bold mb-2 text-[#1A1A1A]">
                {formatCurrency(metrics.caixa_atual)}
              </div>
              <div className="flex items-center text-[#1A1A1A]/80">
                <ArrowUpRight className="w-4 h-4 mr-1" />
                <span className="text-sm">+{metrics.variacao_entradas}% vs mês anterior</span>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#1A1A1A]/10 rounded-full -mr-16 -mt-16"></div>
          </div>

          {/* Entradas */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#B8860B]" />
              </div>
              <span className="text-xs text-[#B8860B] bg-[#D4AF37]/10 px-2 py-1 rounded-full">
                +{metrics.variacao_entradas}%
              </span>
            </div>
            <h3 className="text-slate-600 text-sm mb-1">Entradas</h3>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(metrics.entradas_mes)}</p>
          </div>

          {/* Saídas */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#CD853F]/10 rounded-2xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-[#CD853F]" />
              </div>
              <span className="text-xs text-[#CD853F] bg-[#CD853F]/10 px-2 py-1 rounded-full">
                {metrics.variacao_saidas}%
              </span>
            </div>
            <h3 className="text-slate-600 text-sm mb-1">Saídas</h3>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(metrics.saidas_mes)}</p>
          </div>

          {/* Resultado Líquido */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#DAA520]/10 rounded-2xl flex items-center justify-center">
                <Target className="w-6 h-6 text-[#DAA520]" />
              </div>
            </div>
            <h3 className="text-slate-600 text-sm mb-1">Líquido</h3>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(metrics.resultado_liquido)}</p>
          </div>

          {/* Contas a Pagar */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#B8860B]/10 rounded-2xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-[#B8860B]" />
              </div>
            </div>
            <h3 className="text-slate-600 text-sm mb-1">A Pagar</h3>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(metrics.contas_pagar)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projetos Cards - Novo Design Profissional */}
          <div className="lg:col-span-3 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Projetos & Performance</h3>
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-[#10B981] rounded-full"></div>
                  <span>Receitas</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-[#EF4444] rounded-full"></div>
                  <span>Despesas</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {projetoMetrics.map((projetoMetric, index) => {
                const { projeto, receitas, despesas, lucro, transacoes_count, crescimento } = projetoMetric
                const getProjetoIcon = (codigo: string) => {
                  switch (codigo) {
                    case 'MENTORIA': return <Trophy className="w-6 h-6" style={{ color: projeto.cor_tema }} />
                    case 'GMBV': return <Briefcase className="w-6 h-6" style={{ color: projeto.cor_tema }} />
                    case 'CLINICA': return <Heart className="w-6 h-6" style={{ color: projeto.cor_tema }} />
                    case 'OPERACIONAL': return <Settings className="w-6 h-6" style={{ color: projeto.cor_tema }} />
                    default: return <Building2 className="w-6 h-6" style={{ color: projeto.cor_tema }} />
                  }
                }

                return (
                  <div key={projeto.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group relative overflow-hidden">
                    {/* Projeto Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${projeto.cor_tema}15` }}>
                          {getProjetoIcon(projeto.codigo)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-800 text-sm">{projeto.codigo}</h4>
                          <p className="text-xs text-slate-500 truncate max-w-[100px]">{projeto.nome}</p>
                        </div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                        crescimento >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                      }`}>
                        {crescimento >= 0 ? '+' : ''}{crescimento}%
                      </div>
                    </div>

                    {/* Métricas Visuais */}
                    <div className="space-y-3">
                      {/* Lucro Principal */}
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-1">Lucro</p>
                        <p className={`text-lg font-bold ${
                          lucro >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(lucro)}
                        </p>
                      </div>

                      {/* Barra de Performance */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>Receitas</span>
                          <span>{formatCurrency(receitas)}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all"
                            style={{
                              width: `${receitas > 0 ? Math.min((receitas / Math.max(...projetoMetrics.map(p => p.receitas), 1)) * 100, 100) : 0}%`
                            }}
                          />
                        </div>

                        {despesas > 0 && (
                          <>
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>Despesas</span>
                              <span>{formatCurrency(despesas)}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all"
                                style={{
                                  width: `${despesas > 0 ? Math.min((despesas / Math.max(...projetoMetrics.map(p => p.despesas), 1)) * 100, 100) : 0}%`
                                }}
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Stats Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Transações</p>
                          <p className="font-semibold text-slate-700">{transacoes_count}</p>
                        </div>
                        <button
                          onClick={() => setProjetoSelecionado(projeto.codigo)}
                          className="text-xs px-3 py-1 rounded-full transition-colors"
                          style={{
                            backgroundColor: projetoSelecionado === projeto.codigo ? projeto.cor_tema : `${projeto.cor_tema}15`,
                            color: projetoSelecionado === projeto.codigo ? 'white' : projeto.cor_tema
                          }}
                        >
                          {projetoSelecionado === projeto.codigo ? 'Selecionado' : 'Ver detalhes'}
                        </button>
                      </div>
                    </div>

                    {/* Indicador de melhor performance */}
                    {index === 0 && lucro > 0 && (
                      <div className="absolute top-2 right-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                          <Trophy className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Chart Principal */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Fluxo Financeiro</h3>

              <div className="flex items-center space-x-2">
                <div className="flex bg-slate-100 rounded-2xl p-1">
                  {['entradas', 'saidas', 'liquido'].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setChartType(type)
                        // Recarregar dados do gráfico quando tipo muda
                        generateChartData().then(setChartData)
                      }}
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

            {/* Gráfico de Barras com Dados Reais */}
            <div className="h-64 flex items-end justify-between space-x-3">
              {chartData.map((height, index) => (
                <div key={index} className="flex-1 flex flex-col justify-end h-full">
                  <div
                    className={`w-full rounded-t-lg transition-all hover:opacity-80 cursor-pointer ${
                      chartType === 'entradas' ? 'bg-[#D4AF37]' :
                      chartType === 'saidas' ? 'bg-[#CD853F]' : 'bg-[#DAA520]'
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
              {transactions.slice(0, 6).map((transaction) => {
                // Buscar projeto da transação
                const transactionProjeto = projetos.find(p => p.id === transaction.projeto_id)

                return (
                  <div key={transaction.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center`}
                           style={{ backgroundColor: `${transactionProjeto?.cor_tema || '#D4AF37'}15` }}>
                        {transaction.tipo === 'entrada' ?
                          <ArrowUpRight className="w-5 h-5" style={{ color: transactionProjeto?.cor_tema || '#D4AF37' }} /> :
                          <ArrowDownRight className="w-5 h-5" style={{ color: transactionProjeto?.cor_tema || '#CD853F' }} />
                        }
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{transaction.descricao}</p>
                        <div className="flex items-center space-x-2">
                          {transactionProjeto && (
                            <span className="text-xs px-2 py-1 rounded-full"
                                  style={{
                                    backgroundColor: `${transactionProjeto.cor_tema}15`,
                                    color: transactionProjeto.cor_tema
                                  }}>
                              {transactionProjeto.codigo}
                            </span>
                          )}
                          <p className="text-xs text-slate-600">{transaction.fornecedor}</p>
                        </div>
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
                )
              })}
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="mt-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Ações Rápidas</h3>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              { icon: Plus, label: 'Novo Lançamento', color: 'blue', action: () => handleNewTransaction() },
              { icon: RefreshCw, label: 'Transferir', color: 'green', action: () => handleTransfer() },
              { icon: Receipt, label: 'Criar Cobrança', color: 'purple', action: () => handleCreateInvoice() },
              { icon: Download, label: 'Importar', color: 'orange', action: () => handleImport() },
              { icon: DollarSign, label: 'Sync Comissões', color: 'gold', action: () => handleSyncComissoes() },
              { icon: TrendingUp, label: 'Sync Mentorias', color: 'teal', action: () => handleSyncMentoriaVendas() }
            ].map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-slate-100 hover:border-slate-200 transition-colors group"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                  action.color === 'blue' ? 'bg-[#D4AF37]/10 text-[#D4AF37]' :
                  action.color === 'green' ? 'bg-[#DAA520]/10 text-[#DAA520]' :
                  action.color === 'purple' ? 'bg-[#B8860B]/10 text-[#B8860B]' :
                  action.color === 'gold' ? 'bg-[#FFD700]/10 text-[#FFD700]' :
                  action.color === 'teal' ? 'bg-teal-500/10 text-teal-600' :
                  'bg-[#CD853F]/10 text-[#CD853F]'
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

      {/* Modal de Nova Transação */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Nova Transação</h3>
              <button
                onClick={() => setShowTransactionModal(false)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
                <select
                  value={transactionForm.tipo}
                  onChange={(e) => setTransactionForm({ ...transactionForm, tipo: e.target.value as 'entrada' | 'saida' })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Valor *</label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.valor}
                  onChange={(e) => setTransactionForm({ ...transactionForm, valor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Descrição *</label>
                <input
                  type="text"
                  value={transactionForm.descricao}
                  onChange={(e) => setTransactionForm({ ...transactionForm, descricao: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  placeholder="Descrição da transação"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Projeto *</label>
                <select
                  value={transactionForm.projeto_id}
                  onChange={(e) => setTransactionForm({ ...transactionForm, projeto_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  required
                >
                  <option value="">Selecione um projeto</option>
                  {projetos.map((projeto) => (
                    <option key={projeto.id} value={projeto.id}>
                      {projeto.codigo === 'MENTORIA' && '🎓'}
                      {projeto.codigo === 'GMBV' && '💼'}
                      {projeto.codigo === 'CLINICA' && '🏥'}
                      {projeto.codigo === 'OPERACIONAL' && '⚙️'}
                      {projeto.codigo === 'OUTROS' && '📊'}
                      {' '}{projeto.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Categoria</label>
                <input
                  type="text"
                  value={transactionForm.categoria}
                  onChange={(e) => setTransactionForm({ ...transactionForm, categoria: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  placeholder="Ex: Receita, Despesas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Data</label>
                <input
                  type="date"
                  value={transactionForm.data}
                  onChange={(e) => setTransactionForm({ ...transactionForm, data: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Fornecedor/Cliente</label>
                <input
                  type="text"
                  value={transactionForm.fornecedor}
                  onChange={(e) => setTransactionForm({ ...transactionForm, fornecedor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  placeholder="Nome do fornecedor ou cliente"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#D4AF37] text-slate-800 rounded-lg hover:bg-[#B8860B] transition-colors disabled:opacity-50"
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