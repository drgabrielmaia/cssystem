'use client'

import { useState, useEffect } from 'react'
import { Plus, Eye, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, Receipt, Calendar, Filter, Download } from 'lucide-react'
import { FinanceiroAuthProvider, useFinanceiroAuth } from '@/contexts/financeiro-auth'
import { supabase } from '@/lib/supabase'

interface Categoria {
  id: string
  nome: string
  tipo: 'entrada' | 'saida'
  cor: string
  descricao?: string
  ativo: boolean
}

interface Transacao {
  id: string
  tipo: 'entrada' | 'saida'
  valor: number
  descricao: string
  categoria_id: string
  categoria?: Categoria
  data_transacao: string
  metodo_pagamento?: string
  observacoes?: string
  usuario_id: string
  created_at: string
}

interface Metricas {
  totalEntradas: number
  totalSaidas: number
  saldoAtual: number
  transacoesMes: number
  variacao: number
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
    variacao: 0
  })

  // Estados de modais
  const [showNovaTransacao, setShowNovaTransacao] = useState(false)
  const [showNovaCategoria, setShowNovaCategoria] = useState(false)
  const [showGerenciarCategorias, setShowGerenciarCategorias] = useState(false)

  // Estados de formulário
  const [novaTransacao, setNovaTransacao] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    valor: '',
    descricao: '',
    categoria_id: '',
    data_transacao: new Date().toISOString().split('T')[0],
    metodo_pagamento: '',
    observacoes: ''
  })

  const [novaCategoria, setNovaCategoria] = useState({
    nome: '',
    tipo: 'entrada' as 'entrada' | 'saida',
    cor: '#3B82F6',
    descricao: ''
  })

  // Estados de filtros
  const [filtros, setFiltros] = useState({
    tipo: 'todas' as 'todas' | 'entrada' | 'saida',
    categoria: '',
    dataInicio: '',
    dataFim: '',
    ordenacao: 'data_desc' as 'data_desc' | 'data_asc' | 'valor_desc' | 'valor_asc'
  })

  useEffect(() => {
    if (usuario) {
      carregarDados()
    }
  }, [usuario])

  const carregarDados = async () => {
    await Promise.all([
      carregarTransacoes(),
      carregarCategorias(),
      calcularMetricas()
    ])
  }

  const carregarTransacoes = async () => {
    try {
      let query = supabase
        .from('transacoes_financeiras')
        .select(`
          *,
          categoria:categorias_financeiras(*)
        `)
        .order('data_transacao', { ascending: false })

      // Aplicar filtros
      if (filtros.tipo !== 'todas') {
        query = query.eq('tipo', filtros.tipo)
      }
      if (filtros.categoria) {
        query = query.eq('categoria_id', filtros.categoria)
      }
      if (filtros.dataInicio) {
        query = query.gte('data_transacao', filtros.dataInicio)
      }
      if (filtros.dataFim) {
        query = query.lte('data_transacao', filtros.dataFim)
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
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)

      // Calcular entradas e saídas do mês
      const { data: transacoesMes } = await supabase
        .from('transacoes_financeiras')
        .select('tipo, valor')
        .gte('data_transacao', inicioMes.toISOString().split('T')[0])
        .lte('data_transacao', fimMes.toISOString().split('T')[0])

      let totalEntradas = 0
      let totalSaidas = 0

      transacoesMes?.forEach(t => {
        if (t.tipo === 'entrada') {
          totalEntradas += t.valor
        } else {
          totalSaidas += t.valor
        }
      })

      const saldoAtual = totalEntradas - totalSaidas

      setMetricas({
        totalEntradas,
        totalSaidas,
        saldoAtual,
        transacoesMes: transacoesMes?.length || 0,
        variacao: 0 // TODO: calcular variação comparando com mês anterior
      })
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

  const adicionarCategoria = async () => {
    try {
      if (!novaCategoria.nome) {
        alert('Nome da categoria é obrigatório')
        return
      }

      const { error } = await supabase
        .from('categorias_financeiras')
        .insert([{
          ...novaCategoria,
          ativo: true
        }])

      if (error) throw error

      setShowNovaCategoria(false)
      resetFormCategoria()
      carregarCategorias()
    } catch (error) {
      console.error('Erro ao adicionar categoria:', error)
      alert('Erro ao adicionar categoria')
    }
  }

  const resetFormTransacao = () => {
    setNovaTransacao({
      tipo: 'entrada',
      valor: '',
      descricao: '',
      categoria_id: '',
      data_transacao: new Date().toISOString().split('T')[0],
      metodo_pagamento: '',
      observacoes: ''
    })
  }

  const resetFormCategoria = () => {
    setNovaCategoria({
      nome: '',
      tipo: 'entrada',
      cor: '#3B82F6',
      descricao: ''
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    )
  }

  if (!usuario) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="text-center mb-6">
              <div className="avatar placeholder mb-4">
                <div className="bg-primary text-primary-content rounded-full w-16">
                  <DollarSign className="h-8 w-8" />
                </div>
              </div>
              <h2 className="card-title text-2xl justify-center">Portal Financeiro</h2>
              <p className="text-base-content/70">
                Acesse o sistema de gestão financeira
              </p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="financeiro@empresa.com"
                  className="input input-bordered w-full"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Senha</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Sua senha"
                    className="input input-bordered w-full pr-12"
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <Eye className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="alert alert-error">
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className={`btn btn-primary w-full ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {!loading && 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="navbar bg-base-100 shadow-lg">
        <div className="navbar-start">
          <h1 className="text-xl font-bold">Sistema Financeiro</h1>
        </div>
        <div className="navbar-center">
          <div className="badge badge-primary">{usuario.nivel_acesso}</div>
        </div>
        <div className="navbar-end">
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost">
              {usuario.nome}
            </div>
            <ul tabIndex={0} className="menu dropdown-content z-[1] p-2 shadow bg-base-100 rounded-box w-52">
              <li><a onClick={signOut}>Sair</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm opacity-90">Entradas do Mês</h3>
                  <p className="text-2xl font-bold">{formatCurrency(metricas.totalEntradas)}</p>
                </div>
                <TrendingUp className="h-8 w-8 opacity-80" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm opacity-90">Saídas do Mês</h3>
                  <p className="text-2xl font-bold">{formatCurrency(metricas.totalSaidas)}</p>
                </div>
                <TrendingDown className="h-8 w-8 opacity-80" />
              </div>
            </div>
          </div>

          <div className={`card ${metricas.saldoAtual >= 0 ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'} text-white shadow-xl`}>
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm opacity-90">Saldo Atual</h3>
                  <p className="text-2xl font-bold">{formatCurrency(metricas.saldoAtual)}</p>
                </div>
                <DollarSign className="h-8 w-8 opacity-80" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm opacity-90">Transações</h3>
                  <p className="text-2xl font-bold">{metricas.transacoesMes}</p>
                </div>
                <Receipt className="h-8 w-8 opacity-80" />
              </div>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button 
            onClick={() => setShowNovaTransacao(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4" />
            Nova Transação
          </button>
          <button 
            onClick={() => setShowNovaCategoria(true)}
            className="btn btn-secondary"
          >
            <Plus className="h-4 w-4" />
            Nova Categoria
          </button>
          <button 
            onClick={() => setShowGerenciarCategorias(true)}
            className="btn btn-outline"
          >
            <Edit className="h-4 w-4" />
            Gerenciar Categorias
          </button>
          <button className="btn btn-outline">
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>

        {/* Filtros */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h3 className="card-title">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Tipo</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={filtros.tipo}
                  onChange={(e) => setFiltros(prev => ({...prev, tipo: e.target.value as any}))}
                >
                  <option value="todas">Todas</option>
                  <option value="entrada">Entradas</option>
                  <option value="saida">Saídas</option>
                </select>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Categoria</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={filtros.categoria}
                  onChange={(e) => setFiltros(prev => ({...prev, categoria: e.target.value}))}
                >
                  <option value="">Todas</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Data Início</span>
                </label>
                <input 
                  type="date" 
                  className="input input-bordered"
                  value={filtros.dataInicio}
                  onChange={(e) => setFiltros(prev => ({...prev, dataInicio: e.target.value}))}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Data Fim</span>
                </label>
                <input 
                  type="date" 
                  className="input input-bordered"
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros(prev => ({...prev, dataFim: e.target.value}))}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Ordenação</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={filtros.ordenacao}
                  onChange={(e) => setFiltros(prev => ({...prev, ordenacao: e.target.value as any}))}
                >
                  <option value="data_desc">Data (Mais Recente)</option>
                  <option value="data_asc">Data (Mais Antigo)</option>
                  <option value="valor_desc">Valor (Maior)</option>
                  <option value="valor_asc">Valor (Menor)</option>
                </select>
              </div>
            </div>
            <div className="card-actions justify-end mt-4">
              <button onClick={carregarTransacoes} className="btn btn-primary">
                <Filter className="h-4 w-4" />
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Transações */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">Transações Recentes</h3>
            
            {transacoes.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-base-content/60">Nenhuma transação encontrada</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Valor</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transacoes.map((transacao) => (
                      <tr key={transacao.id}>
                        <td>{new Date(transacao.data_transacao).toLocaleDateString('pt-BR')}</td>
                        <td>
                          <div className={`badge ${transacao.tipo === 'entrada' ? 'badge-success' : 'badge-error'}`}>
                            {transacao.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </div>
                        </td>
                        <td>{transacao.descricao}</td>
                        <td>
                          <div 
                            className="badge" 
                            style={{ backgroundColor: transacao.categoria?.cor, color: 'white' }}
                          >
                            {transacao.categoria?.nome || 'N/A'}
                          </div>
                        </td>
                        <td className={`font-bold ${transacao.tipo === 'entrada' ? 'text-success' : 'text-error'}`}>
                          {transacao.tipo === 'entrada' ? '+' : '-'}{formatCurrency(transacao.valor)}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn btn-ghost btn-xs">
                              <Eye className="h-3 w-3" />
                            </button>
                            <button className="btn btn-ghost btn-xs">
                              <Edit className="h-3 w-3" />
                            </button>
                            <button className="btn btn-ghost btn-xs text-error">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
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

      {/* Modal Nova Transação */}
      {showNovaTransacao && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Nova Transação</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Tipo *</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={novaTransacao.tipo}
                  onChange={(e) => setNovaTransacao(prev => ({...prev, tipo: e.target.value as any}))}
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Valor *</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  className="input input-bordered"
                  value={novaTransacao.valor}
                  onChange={(e) => setNovaTransacao(prev => ({...prev, valor: e.target.value}))}
                />
              </div>

              <div className="form-control md:col-span-2">
                <label className="label">
                  <span className="label-text">Descrição *</span>
                </label>
                <input
                  type="text"
                  placeholder="Descreva a transação"
                  className="input input-bordered"
                  value={novaTransacao.descricao}
                  onChange={(e) => setNovaTransacao(prev => ({...prev, descricao: e.target.value}))}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Categoria *</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={novaTransacao.categoria_id}
                  onChange={(e) => setNovaTransacao(prev => ({...prev, categoria_id: e.target.value}))}
                >
                  <option value="">Selecione uma categoria</option>
                  {categorias.filter(cat => cat.tipo === novaTransacao.tipo).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Data *</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={novaTransacao.data_transacao}
                  onChange={(e) => setNovaTransacao(prev => ({...prev, data_transacao: e.target.value}))}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Método de Pagamento</span>
                </label>
                <input
                  type="text"
                  placeholder="PIX, Cartão, Dinheiro..."
                  className="input input-bordered"
                  value={novaTransacao.metodo_pagamento}
                  onChange={(e) => setNovaTransacao(prev => ({...prev, metodo_pagamento: e.target.value}))}
                />
              </div>

              <div className="form-control md:col-span-2">
                <label className="label">
                  <span className="label-text">Observações</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  placeholder="Observações adicionais..."
                  value={novaTransacao.observacoes}
                  onChange={(e) => setNovaTransacao(prev => ({...prev, observacoes: e.target.value}))}
                />
              </div>
            </div>

            <div className="modal-action">
              <button onClick={() => setShowNovaTransacao(false)} className="btn">
                Cancelar
              </button>
              <button onClick={adicionarTransacao} className="btn btn-primary">
                Adicionar Transação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Categoria */}
      {showNovaCategoria && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Nova Categoria</h3>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Nome *</span>
                </label>
                <input
                  type="text"
                  placeholder="Nome da categoria"
                  className="input input-bordered"
                  value={novaCategoria.nome}
                  onChange={(e) => setNovaCategoria(prev => ({...prev, nome: e.target.value}))}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Tipo *</span>
                </label>
                <select 
                  className="select select-bordered"
                  value={novaCategoria.tipo}
                  onChange={(e) => setNovaCategoria(prev => ({...prev, tipo: e.target.value as any}))}
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Cor</span>
                </label>
                <input
                  type="color"
                  className="input input-bordered h-12"
                  value={novaCategoria.cor}
                  onChange={(e) => setNovaCategoria(prev => ({...prev, cor: e.target.value}))}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Descrição</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  placeholder="Descrição da categoria..."
                  value={novaCategoria.descricao}
                  onChange={(e) => setNovaCategoria(prev => ({...prev, descricao: e.target.value}))}
                />
              </div>
            </div>

            <div className="modal-action">
              <button onClick={() => setShowNovaCategoria(false)} className="btn">
                Cancelar
              </button>
              <button onClick={adicionarCategoria} className="btn btn-primary">
                Criar Categoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FinancasPage() {
  return (
    <FinanceiroAuthProvider>
      <FinancasPageContent />
    </FinanceiroAuthProvider>
  )
}