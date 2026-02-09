'use client'

import { useState, useEffect } from 'react'
import { Plus, Eye, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, Receipt, Calendar, Filter, Download, MoreVertical, ArrowUpRight, ArrowDownRight, Wallet, CreditCard, PieChart, BarChart3, RefreshCw } from 'lucide-react'
import { FinanceiroAuthProvider, useFinanceiroAuth } from '@/contexts/financeiro-auth'
import { supabase } from '@/lib/supabase'

interface Categoria {
  id: string
  nome: string
  tipo: 'entrada' | 'saida'
  cor: string
  descricao?: string
  ativo: boolean
  business_unit_id?: string
  is_shared?: boolean
}

interface BusinessUnit {
  id: string
  name: string
  description?: string
  color: string
  unit_type: 'revenue_center' | 'cost_center' | 'profit_center'
  manager_id?: string
  target_revenue: number
  target_roi: number
  target_conversion_rate: number
  is_active: boolean
  organization_id: string
  created_at: string
}

interface BusinessUnitMetrics {
  id: string
  business_unit_id: string
  period_month: string
  total_revenue: number
  total_costs: number
  gross_profit: number
  roi_percentage: number
  leads_generated: number
  leads_converted: number
  conversion_rate: number
  average_ticket: number
  business_unit?: {
    name: string
    color: string
    unit_type: string
  }
}

interface Transacao {
  id: string
  tipo: 'entrada' | 'saida'
  valor: number
  descricao: string
  categoria_id: string
  categoria?: Categoria
  business_unit_id?: string
  business_unit?: BusinessUnit
  data_transacao: string
  metodo_pagamento?: string
  observacoes?: string
  usuario_id: string
  roi_impact_type?: 'revenue' | 'cost' | 'investment'
  allocation_percentage?: number
  referencia_externa?: string
  automatico?: boolean
  created_at: string
}

interface Metricas {
  totalEntradas: number
  totalSaidas: number
  saldoAtual: number
  transacoesMes: number
  variacao: number
  crescimentoMensal: number
  ticketMedio: number
  transacoesHoje: number
  receitaMentoria?: number
  comissoesPagas?: number
  margemLucro?: number
  eficienciaOperacional?: number
  transacoesAutomaticas?: number
  transacoesManuais?: number
  analisesPorCategoria?: Record<string, {
    total: number
    transacoes: number
    tipo: string
    automatico: number
    manual: number
  }>
}

function FinancasPageContent() {
  const { usuario, loading: authLoading, error, signIn, signOut } = useFinanceiroAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Estados principais
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [metricas, setMetricas] = useState<Metricas>({
    totalEntradas: 0,
    totalSaidas: 0,
    saldoAtual: 0,
    transacoesMes: 0,
    variacao: 0,
    crescimentoMensal: 0,
    ticketMedio: 0,
    transacoesHoje: 0
  })

  // Estados de modais
  const [showNovaTransacao, setShowNovaTransacao] = useState(false)
  const [showNovaCategoria, setShowNovaCategoria] = useState(false)
  const [showNovoMotor, setShowNovoMotor] = useState(false)
  const [showGerenciarMotores, setShowGerenciarMotores] = useState(false)
  const [showDetalhes, setShowDetalhes] = useState(false)
  const [transacaoSelecionada, setTransacaoSelecionada] = useState<Transacao | null>(null)

  // Estados de motores/business units
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([])
  const [businessUnitMetrics, setBusinessUnitMetrics] = useState<BusinessUnitMetrics[]>([])
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<string>('todos')

  // Estados de formulário
  const [novaTransacao, setNovaTransacao] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    valor: '',
    descricao: '',
    categoria_id: '',
    business_unit_id: '',
    data_transacao: new Date().toISOString().split('T')[0],
    metodo_pagamento: '',
    observacoes: '',
    roi_impact_type: 'revenue' as 'revenue' | 'cost' | 'investment'
  })

  const [novaCategoria, setNovaCategoria] = useState({
    nome: '',
    tipo: 'entrada' as 'entrada' | 'saida',
    cor: '#3B82F6',
    descricao: '',
    business_unit_id: '',
    is_shared: false
  })

  const [novoMotor, setNovoMotor] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    unit_type: 'profit_center' as 'revenue_center' | 'cost_center' | 'profit_center',
    target_revenue: '',
    target_roi: '',
    target_conversion_rate: ''
  })

  // Estados de filtros
  const [filtros, setFiltros] = useState({
    periodo: '30' as '7' | '30' | '90' | '365',
    tipo: 'todas' as 'todas' | 'entrada' | 'saida',
    categoria: '',
    ordenacao: 'data_desc' as 'data_desc' | 'data_asc' | 'valor_desc' | 'valor_asc'
  })

  useEffect(() => {
    if (usuario) {
      carregarDados()
    }
  }, [usuario, filtros.periodo])

  const carregarDados = async () => {
    await Promise.all([
      carregarBusinessUnits(),
      carregarTransacoes(),
      carregarCategorias(),
      sincronizarDadosAutomaticos(),
      calcularMetricas(),
      atualizarMetricasBusinessUnits(),
      carregarBusinessUnitMetrics()
    ])
  }

  const carregarBusinessUnits = async () => {
    if (!usuario) return
    
    try {
      const { data, error } = await supabase
        .from('business_units')
        .select('*')
        .eq('organization_id', usuario.organization_id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setBusinessUnits(data || [])
    } catch (error) {
      console.error('Erro ao carregar motores:', error)
    }
  }

  const atualizarMetricasBusinessUnits = async () => {
    if (!usuario) return

    try {
      // Buscar todos os business units ativos
      const { data: businessUnitsAtivos } = await supabase
        .from('business_units')
        .select('id')
        .eq('organization_id', usuario.organization_id)
        .eq('is_active', true)

      if (businessUnitsAtivos) {
        // Atualizar métricas para cada business unit usando a função SQL
        for (const unit of businessUnitsAtivos) {
          await supabase.rpc('calculate_business_unit_metrics', {
            unit_id: unit.id
          })
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar métricas de business units:', error)
    }
  }

  const carregarBusinessUnitMetrics = async () => {
    if (!usuario) return
    
    try {
      const hoje = new Date()
      const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('business_unit_metrics')
        .select(`
          *,
          business_unit:business_units(name, color, unit_type)
        `)
        .eq('organization_id', usuario.organization_id)
        .eq('period_month', mesAtual)
        .order('total_revenue', { ascending: false })

      if (error) throw error
      setBusinessUnitMetrics(data || [])
    } catch (error) {
      console.error('Erro ao carregar métricas de motores:', error)
    }
  }

  const criarMotor = async () => {
    if (!usuario) return
    
    try {
      if (!novoMotor.name) {
        alert('Nome do motor é obrigatório')
        return
      }

      const { error } = await supabase
        .from('business_units')
        .insert([{
          ...novoMotor,
          organization_id: usuario.organization_id,
          target_revenue: parseFloat(novoMotor.target_revenue) || 0,
          target_roi: parseFloat(novoMotor.target_roi) || 0,
          target_conversion_rate: parseFloat(novoMotor.target_conversion_rate) || 0,
          is_active: true
        }])

      if (error) throw error

      setShowNovoMotor(false)
      resetFormMotor()
      carregarBusinessUnits()
    } catch (error) {
      console.error('Erro ao criar motor:', error)
      alert('Erro ao criar motor')
    }
  }

  const resetFormMotor = () => {
    setNovoMotor({
      name: '',
      description: '',
      color: '#3B82F6',
      unit_type: 'profit_center',
      target_revenue: '',
      target_roi: '',
      target_conversion_rate: ''
    })
  }

  const sincronizarDadosAutomaticos = async () => {
    if (!usuario) return
    
    try {
      const diasAtras = parseInt(filtros.periodo)
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() - diasAtras)
      
      // 1. Buscar comissões pagas (DESPESAS)
      const { data: comissoesPagas } = await supabase
        .from('commissions')
        .select(`
          id,
          commission_amount,
          status,
          created_at,
          referral:referrals(
            mentorado:mentorados(nome)
          )
        `)
        .eq('organization_id', usuario.organization_id)
        .eq('status', 'paid')
        .gte('created_at', dataLimite.toISOString())

      // 2. Buscar pagamentos de mentoria confirmados (RECEITAS)
      const { data: pagamentosMentoria } = await supabase
        .from('referral_payments')
        .select(`
          id,
          payment_amount,
          payment_date,
          status,
          referral:referrals(
            mentorado:mentorados(nome)
          )
        `)
        .eq('organization_id', usuario.organization_id)
        .eq('status', 'confirmed')
        .gte('payment_date', dataLimite.toISOString())

      // 3. Buscar categorias automáticas ou criar se não existirem
      let { data: categoriaComissao } = await supabase
        .from('categorias_financeiras')
        .select('id')
        .eq('nome', 'Comissões Pagas')
        .eq('ativo', true)
        .single()

      if (!categoriaComissao) {
        const { data: novaCategoria } = await supabase
          .from('categorias_financeiras')
          .insert({
            nome: 'Comissões Pagas',
            tipo: 'saida',
            cor: '#EF4444',
            ativo: true
          })
          .select('id')
          .single()
        categoriaComissao = novaCategoria
      }

      let { data: categoriaMentoria } = await supabase
        .from('categorias_financeiras')
        .select('id')
        .eq('nome', 'Mentoria')
        .eq('ativo', true)
        .single()

      if (!categoriaMentoria) {
        const { data: novaCategoria } = await supabase
          .from('categorias_financeiras')
          .insert({
            nome: 'Mentoria',
            tipo: 'entrada',
            cor: '#10B981',
            ativo: true
          })
          .select('id')
          .single()
        categoriaMentoria = novaCategoria
      }

      // 4. Sincronizar comissões como transações de saída
      if (comissoesPagas && categoriaComissao) {
        for (const comissao of comissoesPagas) {
          // Verificar se já existe transação para esta comissão
          const { data: transacaoExistente } = await supabase
            .from('transacoes_financeiras')
            .select('id')
            .eq('referencia_externa', `commission_${comissao.id}`)
            .single()

          if (!transacaoExistente) {
            await supabase
              .from('transacoes_financeiras')
              .insert({
                tipo: 'saida',
                valor: comissao.commission_amount,
                descricao: `Comissão paga - ${(comissao.referral as any)?.mentorado?.nome || 'Mentor'}`,
                categoria_id: categoriaComissao.id,
                data_transacao: comissao.created_at.split('T')[0],
                referencia_externa: `commission_${comissao.id}`,
                automatico: true
              })
          }
        }
      }

      // 5. Sincronizar pagamentos de mentoria como transações de entrada
      if (pagamentosMentoria && categoriaMentoria) {
        for (const pagamento of pagamentosMentoria) {
          // Verificar se já existe transação para este pagamento
          const { data: transacaoExistente } = await supabase
            .from('transacoes_financeiras')
            .select('id')
            .eq('referencia_externa', `payment_${pagamento.id}`)
            .single()

          if (!transacaoExistente) {
            await supabase
              .from('transacoes_financeiras')
              .insert({
                tipo: 'entrada',
                valor: pagamento.payment_amount,
                descricao: `Pagamento de mentoria - ${(pagamento.referral as any)?.mentorado?.nome || 'Cliente'}`,
                categoria_id: categoriaMentoria.id,
                data_transacao: pagamento.payment_date.split('T')[0],
                referencia_externa: `payment_${pagamento.id}`,
                automatico: true
              })
          }
        }
      }

    } catch (error) {
      console.error('Erro ao sincronizar dados automáticos:', error)
    }
  }

  const carregarTransacoes = async () => {
    try {
      const diasAtras = parseInt(filtros.periodo)
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() - diasAtras)

      let query = supabase
        .from('transacoes_financeiras')
        .select(`
          *,
          categoria:categorias_financeiras(*),
          business_unit:business_units(*)
        `)
        .gte('data_transacao', dataLimite.toISOString().split('T')[0])
        .order('data_transacao', { ascending: false })

      if (filtros.tipo !== 'todas') {
        query = query.eq('tipo', filtros.tipo)
      }
      if (filtros.categoria) {
        query = query.eq('categoria_id', filtros.categoria)
      }
      if (selectedBusinessUnit && selectedBusinessUnit !== 'todos') {
        query = query.eq('business_unit_id', selectedBusinessUnit)
      }

      const { data, error } = await query

      if (error) throw error
      setTransacoes(data || [])
    } catch (error) {
      console.error('Erro ao carregar transações:', error)
    }
  }

  const carregarCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .select('*')
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      setCategorias(data || [])
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }

  const calcularMetricas = async () => {
    try {
      const hoje = new Date()
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
      const fimMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
      const diasAtras = parseInt(filtros.periodo)
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() - diasAtras)

      // Transações do período atual com detalhes da categoria
      const { data: transacoesPeriodo } = await supabase
        .from('transacoes_financeiras')
        .select(`
          tipo, 
          valor, 
          automatico,
          categoria:categorias_financeiras(nome, tipo)
        `)
        .gte('data_transacao', dataLimite.toISOString().split('T')[0])

      // Transações do mês atual
      const { data: transacoesMes } = await supabase
        .from('transacoes_financeiras')
        .select(`
          tipo, 
          valor, 
          automatico,
          categoria:categorias_financeiras(nome, tipo)
        `)
        .gte('data_transacao', inicioMes.toISOString().split('T')[0])

      // Transações do mês passado
      const { data: transacoesMesPassado } = await supabase
        .from('transacoes_financeiras')
        .select('tipo, valor, automatico')
        .gte('data_transacao', mesPassado.toISOString().split('T')[0])
        .lte('data_transacao', fimMesPassado.toISOString().split('T')[0])

      // Transações de hoje
      const { data: transacoesHoje } = await supabase
        .from('transacoes_financeiras')
        .select('tipo, valor')
        .eq('data_transacao', hoje.toISOString().split('T')[0])

      // Cálculos básicos
      let totalEntradas = 0
      let totalSaidas = 0
      let entradasMesPassado = 0
      let saidasMesPassado = 0
      let receitaMentoria = 0
      let comissoesPagas = 0
      let transacoesAutomaticas = 0
      let transacoesManuais = 0

      transacoesPeriodo?.forEach(t => {
        if (t.tipo === 'entrada') {
          totalEntradas += t.valor
          // Verificar se é receita de mentoria
          if ((t.categoria as any)?.nome === 'Mentoria') {
            receitaMentoria += t.valor
          }
        } else {
          totalSaidas += t.valor
          // Verificar se são comissões pagas
          if ((t.categoria as any)?.nome === 'Comissões Pagas') {
            comissoesPagas += t.valor
          }
        }

        // Separar automáticas das manuais
        if (t.automatico) {
          transacoesAutomaticas++
        } else {
          transacoesManuais++
        }
      })

      transacoesMesPassado?.forEach(t => {
        if (t.tipo === 'entrada') entradasMesPassado += t.valor
        else saidasMesPassado += t.valor
      })

      // Cálculos avançados
      const saldoAtual = totalEntradas - totalSaidas
      const saldoMesPassado = entradasMesPassado - saidasMesPassado
      const crescimentoMensal = saldoMesPassado > 0 
        ? ((saldoAtual - saldoMesPassado) / saldoMesPassado) * 100 
        : 0

      const ticketMedio = transacoesPeriodo?.length ? (totalEntradas + totalSaidas) / transacoesPeriodo.length : 0
      const margemLucro = totalEntradas > 0 ? ((totalEntradas - totalSaidas) / totalEntradas) * 100 : 0
      const eficienciaOperacional = totalSaidas > 0 ? (totalEntradas / totalSaidas) : 0

      // Análises por categoria
      const analisesPorCategoria: Record<string, any> = {}
      transacoesPeriodo?.forEach(t => {
        const categoria = (t.categoria as any)?.nome || 'Sem Categoria'
        if (!analisesPorCategoria[categoria]) {
          analisesPorCategoria[categoria] = {
            total: 0,
            transacoes: 0,
            tipo: t.tipo,
            automatico: 0,
            manual: 0
          }
        }
        analisesPorCategoria[categoria].total += t.valor
        analisesPorCategoria[categoria].transacoes++
        if (t.automatico) {
          analisesPorCategoria[categoria].automatico++
        } else {
          analisesPorCategoria[categoria].manual++
        }
      })

      setMetricas({
        totalEntradas,
        totalSaidas,
        saldoAtual,
        transacoesMes: transacoesMes?.length || 0,
        variacao: margemLucro,
        crescimentoMensal,
        ticketMedio,
        transacoesHoje: transacoesHoje?.length || 0,
        // Novas métricas avançadas
        receitaMentoria,
        comissoesPagas,
        margemLucro,
        eficienciaOperacional,
        transacoesAutomaticas,
        transacoesManuais,
        analisesPorCategoria
      } as any)

    } catch (error) {
      console.error('Erro ao calcular métricas:', error)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const success = await signIn(email, password)
    if (!success && error) {
      alert(error)
    }
    setLoading(false)
  }

  const adicionarTransacao = async () => {
    try {
      if (!novaTransacao.valor || !novaTransacao.descricao || !novaTransacao.categoria_id) {
        alert('Preencha todos os campos obrigatórios')
        return
      }

      const { error } = await supabase
        .from('transacoes_financeiras')
        .insert([{
          ...novaTransacao,
          valor: parseFloat(novaTransacao.valor),
          usuario_id: usuario?.id
        }])

      if (error) throw error

      setShowNovaTransacao(false)
      resetFormTransacao()
      carregarDados()
    } catch (error) {
      console.error('Erro ao adicionar transação:', error)
      alert('Erro ao adicionar transação')
    }
  }

  const resetFormTransacao = () => {
    setNovaTransacao({
      tipo: 'entrada',
      valor: '',
      descricao: '',
      categoria_id: '',
      business_unit_id: '',
      data_transacao: new Date().toISOString().split('T')[0],
      metodo_pagamento: '',
      observacoes: '',
      roi_impact_type: 'revenue'
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Carregando sistema financeiro...</p>
        </div>
      </div>
    )
  }

  if (!usuario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg mb-6">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Sistema Financeiro
            </h1>
            <p className="text-slate-600 mt-2">
              Acesse o portal de gestão financeira empresarial
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="p-8">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Email Corporativo
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="seu@email.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 bg-white/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Senha
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 bg-white/50 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Eye className="h-5 w-5 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <DollarSign className="h-5 w-5" />
                      Acessar Sistema
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-slate-500 text-sm">
              © 2024 Sistema de Gestão Financeira
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header Premium */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Financeiro</h1>
                  <p className="text-xs text-slate-500">Gestão Empresarial</p>
                </div>
              </div>
              
              <div className="hidden md:flex items-center gap-2 ml-8">
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  {usuario.cargo}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={carregarDados}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                title="Atualizar dados"
              >
                <RefreshCw className="h-5 w-5 text-slate-600" />
              </button>
              
              <div className="relative group">
                <button className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {usuario.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden md:block text-slate-700 font-medium">{usuario.nome}</span>
                </button>
                
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-2">
                    <button
                      onClick={signOut}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      Sair do Sistema
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Métricas Premium */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Saldo Atual */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  metricas.crescimentoMensal >= 0 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {formatPercentage(metricas.crescimentoMensal)}
                </div>
              </div>
              <h3 className="text-slate-500 text-sm font-medium mb-1">Saldo Atual</h3>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(metricas.saldoAtual)}</p>
              <p className="text-slate-500 text-sm mt-2">vs. mês anterior</p>
            </div>
          </div>

          {/* Entradas */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-slate-500 text-sm font-medium mb-1">Entradas do Mês</h3>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(metricas.totalEntradas)}</p>
              <p className="text-slate-500 text-sm mt-2">{metricas.transacoesMes} transações</p>
            </div>
          </div>

          {/* Saídas */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <ArrowDownRight className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-slate-500 text-sm font-medium mb-1">Saídas do Mês</h3>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(metricas.totalSaidas)}</p>
              <p className="text-slate-500 text-sm mt-2">Gastos operacionais</p>
            </div>
          </div>

          {/* Ticket Médio */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Receipt className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-purple-600 text-sm font-medium">
                  {metricas.transacoesHoje} hoje
                </div>
              </div>
              <h3 className="text-slate-500 text-sm font-medium mb-1">Ticket Médio</h3>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(metricas.ticketMedio)}</p>
              <p className="text-slate-500 text-sm mt-2">Por transação</p>
            </div>
          </div>
        </div>

        {/* Análises Avançadas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {/* Receita de Mentoria */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <CreditCard className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="text-emerald-600 text-xs font-medium bg-emerald-50 px-2 py-1 rounded-full">
                  AUTO
                </div>
              </div>
              <h3 className="text-slate-500 text-sm font-medium mb-1">Receita Mentoria</h3>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(metricas.receitaMentoria || 0)}</p>
              <p className="text-slate-500 text-sm mt-2">Pagamentos confirmados</p>
            </div>
          </div>

          {/* Comissões Pagas */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <ArrowDownRight className="h-6 w-6 text-orange-600" />
                </div>
                <div className="text-orange-600 text-xs font-medium bg-orange-50 px-2 py-1 rounded-full">
                  AUTO
                </div>
              </div>
              <h3 className="text-slate-500 text-sm font-medium mb-1">Comissões Pagas</h3>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(metricas.comissoesPagas || 0)}</p>
              <p className="text-slate-500 text-sm mt-2">Despesas automáticas</p>
            </div>
          </div>

          {/* Margem de Lucro */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <PieChart className="h-6 w-6 text-indigo-600" />
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  (metricas.margemLucro || 0) >= 0 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {formatPercentage(metricas.margemLucro || 0)}
                </div>
              </div>
              <h3 className="text-slate-500 text-sm font-medium mb-1">Margem de Lucro</h3>
              <p className="text-2xl font-bold text-slate-800">
                {(metricas.margemLucro || 0) >= 0 ? 'Lucro' : 'Prejuízo'}
              </p>
              <p className="text-slate-500 text-sm mt-2">Rentabilidade geral</p>
            </div>
          </div>

          {/* Automação */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-cyan-100 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-cyan-600" />
                </div>
                <div className="text-cyan-600 text-sm font-medium">
                  {metricas.transacoesAutomaticas || 0}/{(metricas.transacoesAutomaticas || 0) + (metricas.transacoesManuais || 0)}
                </div>
              </div>
              <h3 className="text-slate-500 text-sm font-medium mb-1">Automação</h3>
              <p className="text-2xl font-bold text-slate-800">
                {Math.round(((metricas.transacoesAutomaticas || 0) / Math.max((metricas.transacoesAutomaticas || 0) + (metricas.transacoesManuais || 0), 1)) * 100)}%
              </p>
              <p className="text-slate-500 text-sm mt-2">Transações automáticas</p>
            </div>
          </div>
        </div>

        {/* Performance por Motor de Negócio */}
        {businessUnitMetrics.length > 0 && (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Performance por Motor de Negócio
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {businessUnitMetrics.map((metric) => (
                <div key={metric.id} className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-6 border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: metric.business_unit?.color || '#3B82F6' }}
                      ></div>
                      <h4 className="font-semibold text-slate-800 text-sm">
                        {metric.business_unit?.name}
                      </h4>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      metric.roi_percentage >= 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      ROI {formatPercentage(metric.roi_percentage)}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Receita</span>
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(metric.total_revenue / 100)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Custos</span>
                      <span className="text-sm font-semibold text-red-600">
                        {formatCurrency(metric.total_costs / 100)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2">
                      <span className="text-xs text-slate-500">Lucro</span>
                      <span className={`text-sm font-bold ${
                        metric.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(metric.gross_profit / 100)}
                      </span>
                    </div>
                    
                    {metric.leads_generated > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-200">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Conversão</span>
                          <span className="font-medium">{metric.conversion_rate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Ticket Médio</span>
                          <span className="font-medium">{formatCurrency(metric.average_ticket)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Análises por Categoria */}
        {metricas.analisesPorCategoria && Object.keys(metricas.analisesPorCategoria).length > 0 && (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-600" />
              Análise por Categoria
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Object.entries(metricas.analisesPorCategoria).map(([categoria, dados]) => (
                <div key={categoria} className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-700 text-sm">{categoria}</h4>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      dados.tipo === 'entrada' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {dados.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA'}
                    </div>
                  </div>
                  <p className="text-xl font-bold text-slate-800 mb-2">
                    {formatCurrency(dados.total)}
                  </p>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{dados.transacoes} transações</span>
                    <span>{dados.automatico} auto | {dados.manual} manual</span>
                  </div>
                  <div className="mt-2 bg-slate-200 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full ${
                        dados.tipo === 'entrada' ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ 
                        width: `${Math.min((dados.total / Math.max(...Object.values(metricas.analisesPorCategoria!).map(d => d.total))) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ações e Filtros */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Período</label>
                <select 
                  className="px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 bg-white/50"
                  value={filtros.periodo}
                  onChange={(e) => setFiltros(prev => ({...prev, periodo: e.target.value as any}))}
                >
                  <option value="7">Últimos 7 dias</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="90">Últimos 90 dias</option>
                  <option value="365">Último ano</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
                <select 
                  className="px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 bg-white/50"
                  value={filtros.tipo}
                  onChange={(e) => setFiltros(prev => ({...prev, tipo: e.target.value as any}))}
                >
                  <option value="todas">Todas</option>
                  <option value="entrada">Entradas</option>
                  <option value="saida">Saídas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Categoria</label>
                <select 
                  className="px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 bg-white/50"
                  value={filtros.categoria}
                  onChange={(e) => setFiltros(prev => ({...prev, categoria: e.target.value}))}
                >
                  <option value="">Todas</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Motor</label>
                <select 
                  className="px-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 bg-white/50"
                  value={selectedBusinessUnit}
                  onChange={(e) => setSelectedBusinessUnit(e.target.value)}
                >
                  <option value="todos">Todos os Motores</option>
                  {businessUnits.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      <span style={{color: unit.color}}>●</span> {unit.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowNovaTransacao(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nova Transação
              </button>

              <button
                onClick={() => setShowNovoMotor(true)}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-2 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Novo Motor
              </button>

              <button
                onClick={() => setShowNovaCategoria(true)}
                className="border border-slate-200 hover:border-slate-300 text-slate-700 font-medium py-2 px-4 rounded-xl transition-all duration-200 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nova Categoria
              </button>
              
              <button className="border border-slate-200 hover:border-slate-300 text-slate-700 font-medium py-2 px-4 rounded-xl transition-all duration-200 flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Transações Premium */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Transações Recentes</h3>
              <button className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1">
                <Eye className="h-4 w-4" />
                Ver todas
              </button>
            </div>
          </div>

          {transacoes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">Nenhuma transação encontrada</p>
              <p className="text-slate-500 text-sm">Adicione uma nova transação para começar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {transacoes.slice(0, 10).map((transacao, index) => (
                  <div 
                    key={transacao.id} 
                    className={`p-6 border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer ${
                      index === transacoes.length - 1 ? 'border-b-0' : ''
                    }`}
                    onClick={() => {
                      setTransacaoSelecionada(transacao)
                      setShowDetalhes(true)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          transacao.tipo === 'entrada' 
                            ? 'bg-green-100' 
                            : 'bg-red-100'
                        }`}>
                          {transacao.tipo === 'entrada' ? (
                            <ArrowUpRight className={`h-5 w-5 ${
                              transacao.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                            }`} />
                          ) : (
                            <ArrowDownRight className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        
                        <div>
                          <p className="font-semibold text-slate-800">{transacao.descricao}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {transacao.categoria && (
                              <span 
                                className="inline-block w-3 h-3 rounded-full"
                                style={{ backgroundColor: transacao.categoria.cor }}
                              ></span>
                            )}
                            <span className="text-sm text-slate-500">
                              {transacao.categoria?.nome || 'Sem categoria'}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-sm text-slate-500">
                              {new Date(transacao.data_transacao).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          transacao.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transacao.tipo === 'entrada' ? '+' : '-'}{formatCurrency(transacao.valor)}
                        </p>
                        {transacao.metodo_pagamento && (
                          <p className="text-sm text-slate-500 mt-1">
                            {transacao.metodo_pagamento}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nova Transação Premium */}
      {showNovaTransacao && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-semibold text-slate-800">Nova Transação</h3>
              <p className="text-slate-500 mt-1">Adicione uma nova entrada ou saída financeira</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Tipo de Transação</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNovaTransacao(prev => ({...prev, tipo: 'entrada'}))}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      novaTransacao.tipo === 'entrada'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-slate-200 hover:border-green-300 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ArrowUpRight className="h-5 w-5" />
                      <span className="font-medium">Entrada</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNovaTransacao(prev => ({...prev, tipo: 'saida'}))}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      novaTransacao.tipo === 'saida'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-slate-200 hover:border-red-300 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ArrowDownRight className="h-5 w-5" />
                      <span className="font-medium">Saída</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Valor */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                    value={novaTransacao.valor}
                    onChange={(e) => setNovaTransacao(prev => ({...prev, valor: e.target.value}))}
                  />
                </div>

                {/* Data */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Data *</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                    value={novaTransacao.data_transacao}
                    onChange={(e) => setNovaTransacao(prev => ({...prev, data_transacao: e.target.value}))}
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Descrição *</label>
                <input
                  type="text"
                  placeholder="Descreva a transação"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                  value={novaTransacao.descricao}
                  onChange={(e) => setNovaTransacao(prev => ({...prev, descricao: e.target.value}))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Categoria */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Categoria *</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                    value={novaTransacao.categoria_id}
                    onChange={(e) => setNovaTransacao(prev => ({...prev, categoria_id: e.target.value}))}
                  >
                    <option value="">Selecione uma categoria</option>
                    {categorias.filter(cat => cat.tipo === novaTransacao.tipo).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Método de Pagamento */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Método de Pagamento</label>
                  <input
                    type="text"
                    placeholder="PIX, Cartão, Dinheiro..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                    value={novaTransacao.metodo_pagamento}
                    onChange={(e) => setNovaTransacao(prev => ({...prev, metodo_pagamento: e.target.value}))}
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Observações</label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 resize-none"
                  rows={3}
                  placeholder="Observações adicionais..."
                  value={novaTransacao.observacoes}
                  onChange={(e) => setNovaTransacao(prev => ({...prev, observacoes: e.target.value}))}
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowNovaTransacao(false)}
                className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={adicionarTransacao}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Adicionar Transação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetalhes && transacaoSelecionada && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-semibold text-slate-800">Detalhes da Transação</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  transacaoSelecionada.tipo === 'entrada' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {transacaoSelecionada.tipo === 'entrada' ? (
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-slate-800">{transacaoSelecionada.descricao}</h4>
                  <p className={`text-xl font-bold ${
                    transacaoSelecionada.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transacaoSelecionada.tipo === 'entrada' ? '+' : '-'}{formatCurrency(transacaoSelecionada.valor)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Data</p>
                  <p className="font-medium text-slate-800">
                    {new Date(transacaoSelecionada.data_transacao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Categoria</p>
                  <div className="flex items-center gap-2">
                    {transacaoSelecionada.categoria && (
                      <span 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: transacaoSelecionada.categoria.cor }}
                      ></span>
                    )}
                    <p className="font-medium text-slate-800">
                      {transacaoSelecionada.categoria?.nome || 'Sem categoria'}
                    </p>
                  </div>
                </div>
              </div>

              {transacaoSelecionada.metodo_pagamento && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Método de Pagamento</p>
                  <p className="font-medium text-slate-800">{transacaoSelecionada.metodo_pagamento}</p>
                </div>
              )}

              {transacaoSelecionada.observacoes && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Observações</p>
                  <p className="font-medium text-slate-800">{transacaoSelecionada.observacoes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setShowDetalhes(false)}
                className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Motor */}
      {showNovoMotor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Novo Motor de Negócio</h2>
              <p className="text-slate-600 text-sm mt-1">Crie uma nova unidade de negócio para tracking de ROI</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nome do Motor *</label>
                <input
                  type="text"
                  value={novoMotor.name}
                  onChange={(e) => setNovoMotor(prev => ({...prev, name: e.target.value}))}
                  placeholder="Ex: Mentoria Premium, Clínica VIP..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Descrição</label>
                <textarea
                  value={novoMotor.description}
                  onChange={(e) => setNovoMotor(prev => ({...prev, description: e.target.value}))}
                  placeholder="Descrição detalhada do motor..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
                  <select
                    value={novoMotor.unit_type}
                    onChange={(e) => setNovoMotor(prev => ({...prev, unit_type: e.target.value as any}))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="profit_center">Centro de Lucro</option>
                    <option value="revenue_center">Centro de Receita</option>
                    <option value="cost_center">Centro de Custo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cor</label>
                  <input
                    type="color"
                    value={novoMotor.color}
                    onChange={(e) => setNovoMotor(prev => ({...prev, color: e.target.value}))}
                    className="w-full h-10 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Meta Receita (R$)</label>
                  <input
                    type="number"
                    value={novoMotor.target_revenue}
                    onChange={(e) => setNovoMotor(prev => ({...prev, target_revenue: e.target.value}))}
                    placeholder="50000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Meta ROI (%)</label>
                  <input
                    type="number"
                    value={novoMotor.target_roi}
                    onChange={(e) => setNovoMotor(prev => ({...prev, target_roi: e.target.value}))}
                    placeholder="25"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Meta Conv. (%)</label>
                  <input
                    type="number"
                    value={novoMotor.target_conversion_rate}
                    onChange={(e) => setNovoMotor(prev => ({...prev, target_conversion_rate: e.target.value}))}
                    placeholder="5"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowNovoMotor(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={criarMotor}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg transition-all duration-200"
              >
                Criar Motor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FinancasPagePremium() {
  return (
    <FinanceiroAuthProvider>
      <FinancasPageContent />
    </FinanceiroAuthProvider>
  )
}