'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  Target,
  Award,
  Eye,
  Download,
  Filter,
  Search
} from 'lucide-react'

interface Comissao {
  id: string
  mentorado_id: string
  valor: number
  data_venda: string
  status: 'pendente' | 'pago' | 'cancelado'
  observacoes?: string
  lead_nome?: string
  created_at: string
}

export default function MentoradoComissoesPage() {
  const [mentorado, setMentorado] = useState<any>(null)
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  useEffect(() => {
    const savedMentorado = localStorage.getItem('mentorado')
    if (savedMentorado) {
      const mentoradoData = JSON.parse(savedMentorado)
      setMentorado(mentoradoData)
      loadComissoes(mentoradoData.id)
    }
  }, [])

  const loadComissoes = async (mentoradoId: string) => {
    try {
      setLoading(true)

      // Buscar comissões do mentorado
      const { data: comissoesData, error } = await supabase
        .from('comissoes')
        .select('*')
        .eq('mentorado_id', mentoradoId)
        .order('data_venda', { ascending: false })

      if (error) throw error

      setComissoes(comissoesData || [])
    } catch (error) {
      console.error('Erro ao carregar comissões:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStats = () => {
    const totalComissoes = comissoes.reduce((acc, c) => acc + c.valor, 0)
    const comissoesPagas = comissoes.filter(c => c.status === 'pago').reduce((acc, c) => acc + c.valor, 0)
    const comissoesPendentes = comissoes.filter(c => c.status === 'pendente').reduce((acc, c) => acc + c.valor, 0)
    const totalVendas = comissoes.length

    // Comissões do mês atual
    const mesAtual = comissoes.filter(c => {
      const dataVenda = new Date(c.data_venda)
      return dataVenda.getMonth() === currentMonth && dataVenda.getFullYear() === currentYear
    })
    const comissoesMesAtual = mesAtual.reduce((acc, c) => acc + c.valor, 0)

    return {
      totalComissoes,
      comissoesPagas,
      comissoesPendentes,
      totalVendas,
      comissoesMesAtual,
      vendasMesAtual: mesAtual.length
    }
  }

  const filteredComissoes = comissoes.filter(comissao => {
    const matchStatus = filterStatus === 'todos' || comissao.status === filterStatus
    const matchSearch = searchTerm === '' ||
      comissao.lead_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comissao.observacoes?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchStatus && matchSearch
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago': return 'text-green-600 bg-green-50 border-green-200'
      case 'pendente': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'cancelado': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pago': return 'Pago'
      case 'pendente': return 'Pendente'
      case 'cancelado': return 'Cancelado'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const stats = getStats()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Comissões</h1>
          <p className="text-gray-600">Acompanhe suas vendas e comissões</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Comissões</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalComissoes)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Comissões Pagas</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.comissoesPagas)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.comissoesPendentes)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Vendas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalVendas}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comissões do Mês */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Performance do Mês</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-blue-100 text-sm">Comissões do Mês</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.comissoesMesAtual)}</p>
              </div>
              <div>
                <p className="text-blue-100 text-sm">Vendas Realizadas</p>
                <p className="text-2xl font-bold">{stats.vendasMesAtual}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <Award className="w-16 h-16 text-blue-200 mb-2" />
            <p className="text-sm text-blue-100">Continue assim!</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter by status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todos os Status</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Comissões */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Histórico de Comissões</h3>
        </div>

        {filteredComissoes.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma comissão encontrada</h4>
            <p className="text-gray-500">
              {searchTerm || filterStatus !== 'todos'
                ? 'Tente ajustar os filtros de busca.'
                : 'Suas comissões aparecerão aqui conforme você realizar vendas.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredComissoes.map((comissao) => (
              <div key={comissao.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-gray-900">
                          {comissao.lead_nome || 'Cliente não informado'}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-md border ${getStatusColor(comissao.status)}`}>
                          {getStatusText(comissao.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Data da venda: {formatDate(comissao.data_venda)}
                      </p>
                      {comissao.observacoes && (
                        <p className="text-sm text-gray-600 mt-1">{comissao.observacoes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(comissao.valor)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(comissao.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}