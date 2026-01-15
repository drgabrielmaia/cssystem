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
  Medal,
  Crown,
  Star,
  Watch,
  ShoppingBag
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

      // First get all mentorados from the admin organization (where all mentorados are now)
      const { data: allMentorados, error: mentoradosError } = await supabase
        .from('mentorados')
        .select('id, nome_completo, organization_id')
        .eq('excluido', false)
        .eq('organization_id', '9c8c0033-15ea-4e33-a55f-28d81a19693b')
        .order('nome_completo')

      if (mentoradosError) {
        console.error('❌ Erro ao carregar mentorados:', mentoradosError)
        return
      }

      console.log(`✅ ${allMentorados.length} mentorados encontrados`)

      // Then get ranking data from the view
      const { data: viewData, error: viewError } = await supabase
        .from('view_dashboard_comissoes_mentorado')
        .select(`
          mentorado_id,
          total_indicacoes,
          indicacoes_vendidas,
          total_comissoes,
          valor_medio_comissao
        `)

      if (viewError) {
        console.error('❌ Erro ao carregar dados do ranking:', viewError)
        // Continue even with view error - show all mentorados with 0 values
      }

      // Create ranking with all mentorados, filling in 0 values for those without data
      const rankingFormatted = allMentorados?.map((mentorado: any) => {
        const rankingData = viewData?.find(item => item.mentorado_id === mentorado.id)

        return {
          mentorado_id: mentorado.id,
          nome_completo: mentorado.nome_completo,
          total_indicacoes: rankingData?.total_indicacoes || 0,
          indicacoes_vendidas: rankingData?.indicacoes_vendidas || 0,
          total_comissoes: rankingData?.total_comissoes || 0,
          valor_medio_comissao: rankingData?.valor_medio_comissao || 0
        }
      }).sort((a, b) => b.total_indicacoes - a.total_indicacoes) || []

      setRanking(rankingFormatted)
      console.log('✅ Ranking carregado:', rankingFormatted.length, 'mentorados')
      console.log('📊 Primeiros 3 do ranking:', rankingFormatted.slice(0, 3))
    } catch (error) {
      console.error('❌ Erro ao carregar ranking:', error)
    }
  }

  const getStats = () => {
    const totalComissoes = comissoes.reduce((acc, c) => acc + (c.valor || 0), 0)
    const comissoesPagas = comissoes.filter(c => c.status === 'pago').reduce((acc, c) => acc + (c.valor || 0), 0)
    const comissoesPendentes = comissoes.filter(c => c.status === 'pendente').reduce((acc, c) => acc + (c.valor || 0), 0)
    const totalVendas = comissoes.length

    const mesAtual = comissoes.filter(c => {
      const dataVenda = new Date(c.data_venda)
      return dataVenda.getMonth() === new Date().getMonth() && dataVenda.getFullYear() === new Date().getFullYear()
    })
    const comissoesMesAtual = mesAtual.reduce((acc, c) => acc + (c.valor || 0), 0)

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
              {stats.totalVendas} vendas realizadas
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
                        {formatCurrency(comissao.valor || 0)}
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

        {/* Botão para mostrar ranking quando escondido */}
        {!showRanking && (
          <div className="mb-6">
            <button
              onClick={() => setShowRanking(true)}
              className="flex items-center space-x-3 bg-[#1A1A1A] p-4 rounded-lg border border-gray-700 hover:bg-[#2A2A2A] transition-colors w-full"
            >
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <h3 className="text-lg font-bold text-white">Mostrar Ranking de Indicações</h3>
                <p className="text-gray-400 text-sm">Clique para ver sua posição no ranking competitivo</p>
              </div>
            </button>
          </div>
        )}

        {/* Ranking de Indicações */}
        {showRanking && (
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
                onClick={() => setShowRanking(!showRanking)}
                className="text-gray-400 hover:text-white transition-colors"
                title={showRanking ? "Esconder ranking" : "Mostrar ranking"}
              >
                {showRanking ? "✕" : "👁️"}
              </button>
            </div>

            {ranking.length === 0 ? (
              <div className="bg-[#1A1A1A] rounded-lg p-8 text-center">
                <Trophy className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Carregando ranking...</p>
              </div>
            ) : (
              <>
                {/* Layout vertical do ranking competitivo */}
                <div className="flex">
                  {/* Lista do ranking */}
                  <div className="flex-1 space-y-4">
                    {ranking.map((mentorado, index) => (
                      <div
                        key={mentorado.mentorado_id}
                        className={`flex items-center p-4 rounded-lg transition-all hover:scale-[1.02] ${
                          index === 0
                            ? 'bg-gradient-to-r from-yellow-600/20 to-yellow-800/20 border-l-4 border-yellow-400'
                            : index === 1
                            ? 'bg-gradient-to-r from-gray-500/20 to-gray-700/20 border-l-4 border-gray-400'
                            : index === 2
                            ? 'bg-gradient-to-r from-amber-600/20 to-amber-800/20 border-l-4 border-amber-500'
                            : 'bg-[#1A1A1A] border-l-4 border-gray-600'
                        }`}
                      >
                        {/* Medalha */}
                        <div className="flex items-center justify-center w-12 h-12 mr-4">
                          {index === 0 ? (
                            <Medal className="w-8 h-8 text-yellow-400" />
                          ) : index === 1 ? (
                            <Medal className="w-8 h-8 text-gray-400" />
                          ) : index === 2 ? (
                            <Medal className="w-8 h-8 text-amber-500" />
                          ) : (
                            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {index + 1}
                            </div>
                          )}
                        </div>

                        {/* Nome e indicações */}
                        <div className="flex-1 flex items-center justify-between">
                          <h3 className="text-white font-semibold text-lg">
                            {mentorado.nome_completo}
                          </h3>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-white">
                              {mentorado.total_indicacoes}
                            </div>
                            <div className="text-sm text-gray-400">indicações</div>
                          </div>
                        </div>

                        {/* Badge de posição para top 3 */}
                        {index < 3 && (
                          <div className={`ml-4 px-3 py-1 rounded-full text-xs font-bold ${
                            index === 0 ? 'bg-yellow-400 text-black' :
                            index === 1 ? 'bg-gray-400 text-black' :
                            'bg-amber-500 text-white'
                          }`}>
                            {index + 1}º LUGAR
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Seção de recompensas visuais */}
                  <div className="ml-8 w-64 space-y-6">
                    <div className="bg-gradient-to-b from-yellow-600/20 to-yellow-800/20 border border-yellow-400/30 rounded-lg p-6 text-center">
                      <div className="flex justify-center items-center space-x-4 mb-3">
                        <Watch className="w-8 h-8 text-yellow-400" />
                        <div className="text-lg text-gray-300 font-bold">OU</div>
                        <ShoppingBag className="w-8 h-8 text-yellow-400" />
                      </div>
                      <div className="flex justify-center mb-2">
                        <Crown className="w-6 h-6 text-yellow-400 mr-2" />
                        <h4 className="text-yellow-400 font-bold">PRÊMIO DO CAMPEÃO</h4>
                      </div>
                      <p className="text-white text-sm font-medium">Bolsa de luxo OU Relógio de luxo</p>
                      <p className="text-gray-400 text-xs mt-2">Para quem ficar em 1º lugar no ranking</p>
                      <div className="mt-3 px-3 py-1 bg-yellow-400/20 rounded-full">
                        <p className="text-yellow-300 text-xs font-bold">APENAS O 1º LUGAR GANHA!</p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-b from-gray-600/20 to-gray-800/20 border border-gray-400/30 rounded-lg p-6 text-center">
                      <div className="flex justify-center mb-3">
                        <Target className="w-10 h-10 text-gray-400" />
                      </div>
                      <h4 className="text-gray-400 font-bold mb-2">COMPETIÇÃO</h4>
                      <p className="text-white text-sm">Quem fizer mais indicações que virarem vendas</p>
                      <p className="text-gray-400 text-xs mt-2">O ranking é atualizado em tempo real</p>
                    </div>
                  </div>
                </div>
              </>
            )}

          </section>
        )}
      </div>
    </div>
  )
}