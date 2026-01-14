'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Target,
  Award,
  Download,
  Search,
  Trophy,
  Medal
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

interface RankingMentorado {
  mentorado_id: string
  nome_completo: string
  total_indicacoes: number
  indicacoes_vendidas: number
  total_comissoes: number
  valor_medio_comissao: number
}

export default function MentoradoComissoesPage() {
  const [mentorado, setMentorado] = useState<any>(null)
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [ranking, setRanking] = useState<RankingMentorado[]>([])
  const [showRanking, setShowRanking] = useState(true)

  useEffect(() => {
    const savedMentorado = localStorage.getItem('mentorado')
    if (savedMentorado) {
      const mentoradoData = JSON.parse(savedMentorado)
      setMentorado(mentoradoData)
      loadComissoes(mentoradoData.id)
      loadRanking()
    }
  }, [])

  const loadComissoes = async (mentoradoId: string) => {
    try {
      console.log('🔍 Carregando comissões para mentorado:', mentoradoId)

      const { data: comissoesData, error } = await supabase
        .from('comissoes')
        .select('*')
        .eq('mentorado_id', mentoradoId)
        .order('data_venda', { ascending: false })

      if (error) {
        console.error('❌ Erro ao buscar comissões:', error)
        setComissoes([])
      } else {
        console.log('✅ Comissões carregadas:', comissoesData?.length || 0)
        setComissoes(comissoesData || [])
      }
    } catch (error) {
      console.error('Erro ao carregar comissões:', error)
      setComissoes([])
    }
  }

  const loadRanking = async () => {
    try {
      console.log('🏆 Carregando ranking de indicações...')

      const { data, error } = await supabase
        .from('view_dashboard_comissoes_mentorado')
        .select(`
          mentorado_id,
          total_indicacoes,
          indicacoes_vendidas,
          total_comissoes,
          valor_medio_comissao,
          mentorados!inner(nome_completo)
        `)
        .order('total_indicacoes', { ascending: false })
        .limit(10)

      if (error) {
        console.error('❌ Erro ao carregar ranking:', error)
        return
      }

      const rankingFormatted = data?.map((item: any) => ({
        mentorado_id: item.mentorado_id,
        nome_completo: item.mentorados?.nome_completo || 'Nome não encontrado',
        total_indicacoes: item.total_indicacoes || 0,
        indicacoes_vendidas: item.indicacoes_vendidas || 0,
        total_comissoes: item.total_comissoes || 0,
        valor_medio_comissao: item.valor_medio_comissao || 0
      })) || []

      setRanking(rankingFormatted)
      console.log('✅ Ranking carregado:', rankingFormatted.length, 'mentorados')
    } catch (error) {
      console.error('❌ Erro ao carregar ranking:', error)
    }
  }

  const getStats = () => {
    const totalComissoes = comissoes.reduce((acc, c) => acc + c.valor, 0)
    const comissoesPagas = comissoes.filter(c => c.status === 'pago').reduce((acc, c) => acc + c.valor, 0)
    const comissoesPendentes = comissoes.filter(c => c.status === 'pendente').reduce((acc, c) => acc + c.valor, 0)
    const totalVendas = comissoes.length

    const mesAtual = comissoes.filter(c => {
      const dataVenda = new Date(c.data_venda)
      return dataVenda.getMonth() === new Date().getMonth() && dataVenda.getFullYear() === new Date().getFullYear()
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pago': return 'Pago'
      case 'pendente': return 'Pendente'
      case 'cancelado': return 'Cancelado'
      default: return status
    }
  }

  const stats = getStats()

  return (
    <div className="bg-[#141414] min-h-screen text-white">
      {/* Netflix-style Header */}
      <div className="relative h-[40vh] mb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#141414]/50 to-[#141414] z-10" />

        {/* Hero Background */}
        <div className="absolute inset-0">
          <img
            src="https://medicosderesultado.com/wp-content/uploads/2024/10/capa-dashboard.png"
            alt="Dashboard Médicos de Resultado"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="absolute top-0 left-0 right-0 p-8 z-20">
          <div className="max-w-2xl">
            <h1 className="text-[48px] font-bold text-white mb-4 leading-tight">
              Minhas Comissões
            </h1>
            <p className="text-[18px] text-gray-300 mb-6 leading-relaxed">
              Acompanhe suas vendas e ganhos
            </p>
            <div className="text-gray-300 text-sm">
              {stats.totalVendas} vendas realizadas • {formatCurrency(stats.totalComissoes)} em comissões
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8 space-y-12">
        {/* Stats Grid */}
        <section>
          <h2 className="text-[24px] font-semibold text-white mb-6">
            Suas estatísticas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#1A1A1A] rounded-[8px] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-gray-400 font-medium mb-2">Total Comissões</p>
                  <p className="text-[20px] font-bold text-white">{formatCurrency(stats.totalComissoes)}</p>
                </div>
                <div className="w-12 h-12 bg-[#22C55E] rounded-[8px] flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-[8px] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-gray-400 font-medium mb-2">Já Recebidas</p>
                  <p className="text-[20px] font-bold text-white">{formatCurrency(stats.comissoesPagas)}</p>
                </div>
                <div className="w-12 h-12 bg-[#6366F1] rounded-[8px] flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-[8px] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-gray-400 font-medium mb-2">Pendentes</p>
                  <p className="text-[20px] font-bold text-white">{formatCurrency(stats.comissoesPendentes)}</p>
                </div>
                <div className="w-12 h-12 bg-[#E879F9] rounded-[8px] flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-[8px] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-gray-400 font-medium mb-2">Total Vendas</p>
                  <p className="text-[20px] font-bold text-white">{stats.totalVendas}</p>
                </div>
                <div className="w-12 h-12 bg-[#F59E0B] rounded-[8px] flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
            <h2 className="text-[24px] font-semibold text-white">
              Histórico de comissões
            </h2>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-[#2A2A2A] border border-gray-600 rounded-[4px] text-white placeholder-gray-400 focus:outline-none focus:border-white transition-all"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-[#2A2A2A] border border-gray-600 rounded-[4px] text-white focus:outline-none focus:border-white transition-all cursor-pointer"
              >
                <option value="todos">Todos os Status</option>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Commissions List */}
          {filteredComissoes.length === 0 ? (
            <div className="text-center py-16">
              <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h4 className="text-[20px] font-medium text-white mb-2">Nenhuma comissão encontrada</h4>
              <p className="text-gray-400">
                {searchTerm || filterStatus !== 'todos'
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Suas comissões aparecerão aqui conforme você realizar vendas.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredComissoes.map((comissao) => (
                <div key={comissao.id} className="bg-[#1A1A1A] rounded-[8px] p-6 hover:bg-[#2A2A2A] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-[8px] flex items-center justify-center ${
                        comissao.status === 'pago' ? 'bg-[#22C55E]' :
                        comissao.status === 'pendente' ? 'bg-[#E879F9]' :
                        'bg-[#6B7280]'
                      }`}>
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-[15px] font-medium text-white">
                            {comissao.lead_nome || 'Cliente não informado'}
                          </h4>
                          <span className={`px-3 py-1 text-[12px] font-medium rounded-[4px] ${
                            comissao.status === 'pago' ? 'bg-[#22C55E] bg-opacity-20 text-[#22C55E]' :
                            comissao.status === 'pendente' ? 'bg-[#E879F9] bg-opacity-20 text-[#E879F9]' :
                            'bg-[#6B7280] bg-opacity-20 text-[#6B7280]'
                          }`}>
                            {getStatusText(comissao.status)}
                          </span>
                        </div>
                        <p className="text-[13px] text-gray-400">
                          Venda: {formatDate(comissao.data_venda)}
                        </p>
                        {comissao.observacoes && (
                          <p className="text-[13px] text-gray-400 mt-1">{comissao.observacoes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[18px] font-bold text-white">
                        {formatCurrency(comissao.valor)}
                      </p>
                      <p className="text-[12px] text-gray-400">
                        Criado: {formatDate(comissao.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Ranking de Indicações */}
        {showRanking && ranking.length > 0 && (
          <section className="mt-16 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <div>
                  <h2 className="text-2xl font-bold text-white">🏆 Ranking de Indicações</h2>
                  <p className="text-gray-400">Concorra ao prêmio! O 1º lugar ganha um Rolex OU uma bolsa de grife!</p>
                </div>
              </div>
              <button
                onClick={() => setShowRanking(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Top 3 - Pódio */}
              {ranking.slice(0, 3).map((mentorado, index) => (
                <div
                  key={mentorado.mentorado_id}
                  className={`relative p-6 rounded-lg text-center transform transition-all hover:scale-105 ${
                    index === 0
                      ? 'bg-gradient-to-b from-yellow-600 to-yellow-800 border-2 border-yellow-400'
                      : index === 1
                      ? 'bg-gradient-to-b from-gray-500 to-gray-700 border-2 border-gray-400'
                      : 'bg-gradient-to-b from-amber-600 to-amber-800 border-2 border-amber-500'
                  }`}
                >
                  {/* Coroa/Medal */}
                  <div className="flex justify-center mb-3">
                    {index === 0 ? (
                      <Trophy className="w-12 h-12 text-yellow-200" />
                    ) : index === 1 ? (
                      <Medal className="w-12 h-12 text-gray-200" />
                    ) : (
                      <Award className="w-12 h-12 text-amber-200" />
                    )}
                  </div>

                  {/* Posição */}
                  <div className="text-3xl font-bold text-white mb-2">
                    {index + 1}º
                  </div>

                  {/* Nome */}
                  <div className="text-lg font-semibold text-white mb-3 truncate">
                    {mentorado.nome_completo}
                  </div>

                  {/* Métricas */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-white/90">
                      <span>Indicações:</span>
                      <span className="font-bold">{mentorado.total_indicacoes}</span>
                    </div>
                    <div className="flex justify-between text-white/90">
                      <span>Vendidas:</span>
                      <span className="font-bold text-green-300">{mentorado.indicacoes_vendidas}</span>
                    </div>
                    <div className="flex justify-between text-white/90">
                      <span>Comissões:</span>
                      <span className="font-bold text-green-300">
                        R$ {(mentorado.total_comissoes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Prêmio */}
                  <div className="mt-4 p-2 bg-black/20 rounded text-white/80 text-xs font-medium">
                    {index === 0 ? '🏆 ROLEX OU BOLSA DE GRIFE' : index === 1 ? '🥈 2º LUGAR' : '🥉 3º LUGAR'}
                  </div>

                  {/* Badge de destaque */}
                  {index === 0 && (
                    <div className="absolute -top-3 -right-3 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                      👑 LÍDER
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Lista completa do ranking */}
            {ranking.length > 3 && (
              <div className="bg-[#1A1A1A] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Ranking Completo</h3>
                <div className="space-y-3">
                  {ranking.slice(3).map((mentorado, index) => (
                    <div
                      key={mentorado.mentorado_id}
                      className="flex items-center justify-between bg-[#2A2A2A] rounded-lg p-4"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-white">{index + 4}</span>
                        </div>
                        <span className="text-white font-medium">{mentorado.nome_completo}</span>
                      </div>
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="text-center">
                          <p className="text-gray-400">Indicações</p>
                          <p className="text-white font-bold">{mentorado.total_indicacoes}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400">Vendidas</p>
                          <p className="text-green-300 font-bold">{mentorado.indicacoes_vendidas}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400">Comissões</p>
                          <p className="text-green-300 font-bold">
                            R$ {(mentorado.total_comissoes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}