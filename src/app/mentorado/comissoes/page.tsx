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
      console.log('🔍 Carregando comissões para mentorado:', mentoradoId)

      // Buscar comissões do mentorado sem depender de RLS
      const { data: comissoesData, error } = await supabase
        .from('comissoes')
        .select('*')
        .eq('mentorado_id', mentoradoId)
        .order('data_venda', { ascending: false })

      if (error) {
        console.error('❌ Erro ao buscar comissões:', error)
        // Se der erro por RLS, continuar com array vazio
        setComissoes([])
      } else {
        console.log('✅ Comissões carregadas:', comissoesData?.length || 0)
        setComissoes(comissoesData || [])
      }
    } catch (error) {
      console.error('Erro ao carregar comissões:', error)
      // Em caso de erro, definir array vazio para evitar loading infinito
      setComissoes([])
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
    <div className="p-8 space-y-8 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-semibold text-[#1A1A1A] mb-2">Minhas Comissões</h1>
          <p className="text-[15px] text-[#6B7280]">Acompanhe suas vendas e ganhos</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center px-4 py-2 bg-[#1A1A1A] text-white rounded-full text-[14px] font-medium hover:bg-opacity-90 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#F3F3F5] rounded-[20px] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#6B7280] font-medium mb-2">Total Comissões</p>
              <p className="text-[28px] font-bold text-[#1A1A1A]">{formatCurrency(stats.totalComissoes)}</p>
            </div>
            <div className="w-12 h-12 bg-[#22C55E] rounded-[12px] flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-[#F3F3F5] rounded-[20px] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#6B7280] font-medium mb-2">Já Recebidas</p>
              <p className="text-[28px] font-bold text-[#1A1A1A]">{formatCurrency(stats.comissoesPagas)}</p>
            </div>
            <div className="w-12 h-12 bg-[#1A1A1A] rounded-[12px] flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-[#F3F3F5] rounded-[20px] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#6B7280] font-medium mb-2">Pendentes</p>
              <p className="text-[28px] font-bold text-[#1A1A1A]">{formatCurrency(stats.comissoesPendentes)}</p>
            </div>
            <div className="w-12 h-12 bg-[#E879F9] rounded-[12px] flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-[#F3F3F5] rounded-[20px] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#6B7280] font-medium mb-2">Total Vendas</p>
              <p className="text-[28px] font-bold text-[#1A1A1A]">{stats.totalVendas}</p>
            </div>
            <div className="w-12 h-12 bg-[#6366F1] rounded-[12px] flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Performance do Mês */}
      <div className="bg-[#F3F3F5] rounded-[24px] p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-2">Performance do Mês</h3>
            <p className="text-[15px] text-[#6B7280]">Seu desempenho financeiro atual</p>
          </div>
          <div className="w-16 h-16 bg-[#1A1A1A] rounded-[16px] flex items-center justify-center">
            <Award className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-[13px] text-[#6B7280] font-medium mb-1">Comissões do Mês</p>
            <p className="text-[24px] font-bold text-[#1A1A1A]">{formatCurrency(stats.comissoesMesAtual)}</p>
          </div>
          <div>
            <p className="text-[13px] text-[#6B7280] font-medium mb-1">Vendas Realizadas</p>
            <p className="text-[24px] font-bold text-[#1A1A1A]">{stats.vendasMesAtual}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[#F3F3F5] rounded-[20px] p-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border-0 rounded-full text-[14px] text-[#1A1A1A] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#E879F9] transition-all"
              />
            </div>

            {/* Filter by status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 bg-white border-0 rounded-full text-[14px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#E879F9] transition-all cursor-pointer"
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
      <div className="bg-[#F3F3F5] rounded-[24px] overflow-hidden">
        <div className="px-8 py-6">
          <h3 className="text-[18px] font-semibold text-[#1A1A1A]">Histórico de Comissões</h3>
        </div>

        {filteredComissoes.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-16 h-16 text-[#6B7280] mx-auto mb-4" />
            <h4 className="text-[16px] font-medium text-[#1A1A1A] mb-2">Nenhuma comissão encontrada</h4>
            <p className="text-[14px] text-[#6B7280]">
              {searchTerm || filterStatus !== 'todos'
                ? 'Tente ajustar os filtros de busca.'
                : 'Suas comissões aparecerão aqui conforme você realizar vendas.'}
            </p>
          </div>
        ) : (
          <div className="px-8 pb-8 space-y-4">
            {filteredComissoes.map((comissao) => (
              <div key={comissao.id} className="bg-white rounded-[16px] p-6 hover:bg-opacity-80 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-[12px] flex items-center justify-center ${
                      comissao.status === 'pago' ? 'bg-[#22C55E]' :
                      comissao.status === 'pendente' ? 'bg-[#E879F9]' :
                      'bg-[#6B7280]'
                    }`}>
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-[15px] font-medium text-[#1A1A1A]">
                          {comissao.lead_nome || 'Cliente não informado'}
                        </h4>
                        <span className={`px-3 py-1 text-[12px] font-medium rounded-full ${
                          comissao.status === 'pago' ? 'bg-[#22C55E] bg-opacity-20 text-[#22C55E]' :
                          comissao.status === 'pendente' ? 'bg-[#E879F9] bg-opacity-20 text-[#E879F9]' :
                          'bg-[#6B7280] bg-opacity-20 text-[#6B7280]'
                        }`}>
                          {getStatusText(comissao.status)}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#6B7280]">
                        {formatDate(comissao.data_venda)}
                      </p>
                      {comissao.observacoes && (
                        <p className="text-[13px] text-[#6B7280] mt-1">{comissao.observacoes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[18px] font-bold text-[#1A1A1A]">
                      {formatCurrency(comissao.valor)}
                    </p>
                    <p className="text-[12px] text-[#6B7280]">
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