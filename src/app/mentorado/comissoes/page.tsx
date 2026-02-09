'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { commissionSystem } from '@/lib/commission-service'
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
  ShoppingBag,
  X,
  Coins,
  Clock,
  CheckCircle,
  ArrowUpRight,
  Eye
} from 'lucide-react'
import type { 
  Commission, 
  CommissionSummary, 
  CommissionStats, 
  Referral,
  WithdrawalRequest 
} from '@/types/commission'

interface RankingMentorado {
  mentorado_id: string
  nome_completo: string
  total_indicacoes: number
}

export default function MentoradoComissoesPage() {
  const [mentorado, setMentorado] = useState<any>(null)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [summary, setSummary] = useState<CommissionSummary | null>(null)
  const [stats, setStats] = useState<CommissionStats | null>(null)
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [ranking, setRanking] = useState<RankingMentorado[]>([])
  const [showRanking, setShowRanking] = useState(true)
  const [showFullRanking, setShowFullRanking] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'commissions' | 'referrals' | 'withdrawals'>('overview')

  useEffect(() => {
    const savedMentorado = localStorage.getItem('mentorado')
    if (savedMentorado) {
      const mentoradoData = JSON.parse(savedMentorado)
      setMentorado(mentoradoData)
      loadCommissionData(mentoradoData.id)
      loadRanking()
    }
  }, [])

  const loadCommissionData = async (mentoradoId: string) => {
    setLoading(true)
    try {
      console.log('🔍 Carregando dados de comissão para mentorado:', mentoradoId)

      // Load all commission data in parallel
      const [
        commissionsData,
        referralsData, 
        summaryData,
        statsData,
        withdrawalsData
      ] = await Promise.all([
        commissionSystem.commissions.getByMentorado(mentoradoId),
        commissionSystem.referrals.getByMentorado(mentoradoId),
        commissionSystem.dashboard.getMentoradoSummary(mentoradoId),
        commissionSystem.dashboard.getMentoradoStats(mentoradoId),
        commissionSystem.withdrawals.getByMentorado(mentoradoId)
      ])

      setCommissions(commissionsData)
      setReferrals(referralsData)
      setSummary(summaryData)
      setStats(statsData)
      setWithdrawalRequests(withdrawalsData)

      console.log('✅ Dados carregados:', {
        commissions: commissionsData.length,
        referrals: referralsData.length,
        summary: summaryData,
        withdrawals: withdrawalsData.length
      })

    } catch (error) {
      console.error('❌ Erro ao carregar dados de comissão:', error)
      // Fallback to old system if new system fails
      await loadComissoesLegacy(mentoradoId)
    } finally {
      setLoading(false)
    }
  }

  const loadComissoesLegacy = async (mentoradoId: string) => {
    try {
      const { data: comissoesData, error } = await supabase
        .from('comissoes')
        .select('*')
        .eq('mentorado_id', mentoradoId)
        .order('data_venda', { ascending: false })

      if (!error && comissoesData) {
        // Convert legacy format to new format
        const legacyCommissions: Commission[] = comissoesData.map(c => ({
          id: c.id,
          mentorado_id: c.mentorado_id,
          referral_id: '', // Will be empty for legacy
          organization_id: '',
          base_amount: c.valor_venda || 0,
          commission_percentage: 50,
          commission_amount: c.valor_comissao || 0,
          commission_type: 'referral' as const,
          status: c.status_pagamento === 'pago' ? 'paid' as const : 
                  c.status_pagamento === 'pendente' ? 'eligible' as const : 'cancelled' as const,
          created_at: c.created_at,
          updated_at: c.created_at,
          notes: c.observacoes,
          paid_date: c.status_pagamento === 'pago' ? c.data_venda : undefined
        }))
        setCommissions(legacyCommissions)
      }
    } catch (error) {
      console.error('Erro ao carregar comissões legacy:', error)
    }
  }

  const loadRanking = async () => {
    try {
      console.log('🏆 Carregando ranking de indicações...')

      // First get all mentorados from the admin organization (where all mentorados are now)
      const { data: allMentorados, error: mentoradosError } = await supabase
        .from('mentorados')
        .select('id, nome_completo, organization_id')
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
          total_indicacoes
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
          total_indicacoes: rankingData?.total_indicacoes || 0
        }
      }).sort((a, b) => b.total_indicacoes - a.total_indicacoes) || []

      setRanking(rankingFormatted)
      console.log('✅ Ranking carregado:', rankingFormatted.length, 'mentorados')
      console.log('📊 Primeiros 3 do ranking:', rankingFormatted.slice(0, 3))
    } catch (error) {
      console.error('❌ Erro ao carregar ranking:', error)
    }
  }

  const getDisplayStats = () => {
    // Use calculated stats if available, otherwise fall back to calculated values
    if (stats) {
      return stats
    }

    // Fallback calculation for legacy data
    const totalCommissions = commissions.reduce((acc, c) => acc + c.commission_amount, 0)
    const paidCommissions = commissions.filter(c => c.status === 'paid').reduce((acc, c) => acc + c.commission_amount, 0)
    const pendingCommissions = commissions.filter(c => c.status === 'eligible').reduce((acc, c) => acc + c.commission_amount, 0)
    
    const currentMonth = new Date()
    const monthlyCommissions = commissions.filter(c => {
      const commissionDate = new Date(c.created_at)
      return commissionDate.getMonth() === currentMonth.getMonth() && 
             commissionDate.getFullYear() === currentMonth.getFullYear()
    })
    const monthlyAmount = monthlyCommissions.reduce((acc, c) => acc + c.commission_amount, 0)

    return {
      totalReferrals: referrals.length,
      activeReferrals: referrals.filter(r => ['pending', 'contacted', 'qualified', 'negotiating'].includes(r.status)).length,
      convertedReferrals: referrals.filter(r => r.status === 'converted').length,
      conversionRate: referrals.length > 0 ? (referrals.filter(r => r.status === 'converted').length / referrals.length) * 100 : 0,
      totalEarned: totalCommissions,
      pendingAmount: pendingCommissions,
      availableForWithdrawal: commissions.filter(c => c.status === 'eligible').reduce((acc, c) => acc + c.commission_amount, 0),
      paidAmount: paidCommissions,
      averageCommission: commissions.length > 0 ? totalCommissions / commissions.length : 0,
      lastPaymentDate: commissions.filter(c => c.status === 'paid' && c.paid_date).sort((a, b) => 
        new Date(b.paid_date!).getTime() - new Date(a.paid_date!).getTime()
      )[0]?.paid_date
    }
  }

  const filteredCommissions = commissions.filter(commission => {
    const matchStatus = filterStatus === 'todos' || 
      (filterStatus === 'pago' && commission.status === 'paid') ||
      (filterStatus === 'pendente' && ['pending', 'eligible'].includes(commission.status)) ||
      (filterStatus === 'cancelado' && commission.status === 'cancelled')
    
    const matchSearch = searchTerm === '' ||
      commission.referral?.lead?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.notes?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchStatus && matchSearch
  })

  // Handle withdrawal request
  const handleWithdrawalRequest = async () => {
    if (!mentorado) return
    
    try {
      await commissionSystem.withdrawals.create(mentorado.id)
      // Reload withdrawal requests
      const newWithdrawals = await commissionSystem.withdrawals.getByMentorado(mentorado.id)
      setWithdrawalRequests(newWithdrawals)
      
      // Reload commissions to update status
      const newCommissions = await commissionSystem.commissions.getByMentorado(mentorado.id)
      setCommissions(newCommissions)
    } catch (error) {
      console.error('Erro ao solicitar saque:', error)
      alert('Erro ao solicitar saque. Tente novamente.')
    }
  }

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
      case 'paid': return 'Pago'
      case 'eligible': return 'Disponível'
      case 'pending': return 'Pendente'
      case 'requested': return 'Saque Solicitado'
      case 'approved': return 'Aprovado'
      case 'processing': return 'Processando'
      case 'cancelled': return 'Cancelado'
      case 'on_hold': return 'Em Espera'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-400 bg-green-400/20'
      case 'eligible': return 'text-blue-400 bg-blue-400/20'
      case 'pending': return 'text-yellow-400 bg-yellow-400/20'
      case 'requested': return 'text-purple-400 bg-purple-400/20'
      case 'approved': return 'text-emerald-400 bg-emerald-400/20'
      case 'processing': return 'text-orange-400 bg-orange-400/20'
      case 'cancelled': return 'text-red-400 bg-red-400/20'
      case 'on_hold': return 'text-gray-400 bg-gray-400/20'
      default: return 'text-gray-400 bg-gray-400/20'
    }
  }

  const displayStats = getDisplayStats()

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
              Sistema de Comissões
            </h1>
            <p className="text-[18px] text-gray-300 mb-6 leading-relaxed">
              Acompanhe suas indicações, comissões e saques
            </p>
            <div className="flex items-center gap-6 text-gray-300 text-sm">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                {displayStats.totalReferrals} indicações
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {displayStats.convertedReferrals} convertidas
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                {formatCurrency(displayStats.totalEarned)} ganhos
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8 space-y-12">
        {/* Navigation Tabs */}
        <section>
          <div className="flex space-x-1 mb-8 bg-[#1A1A1A] p-1 rounded-lg">
            {[
              { id: 'overview', label: 'Visão Geral', icon: TrendingUp },
              { id: 'commissions', label: 'Comissões', icon: DollarSign },
              { id: 'referrals', label: 'Indicações', icon: Target },
              { id: 'withdrawals', label: 'Saques', icon: Download }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* Stats Grid */}
        {activeTab === 'overview' && (
          <section>
            <h2 className="text-[24px] font-semibold text-white mb-6">
              Resumo Financeiro
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-[#1A1A1A] rounded-[8px] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-gray-400 font-medium mb-2">Total Ganho</p>
                    <p className="text-[20px] font-bold text-white">{formatCurrency(displayStats.totalEarned)}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#22C55E] rounded-[8px] flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-[8px] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-gray-400 font-medium mb-2">Disponível p/ Saque</p>
                    <p className="text-[20px] font-bold text-blue-400">{formatCurrency(displayStats.availableForWithdrawal)}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#3B82F6] rounded-[8px] flex items-center justify-center">
                    <Coins className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-[8px] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-gray-400 font-medium mb-2">Taxa de Conversão</p>
                    <p className="text-[20px] font-bold text-white">{displayStats.conversionRate.toFixed(1)}%</p>
                  </div>
                  <div className="w-12 h-12 bg-[#8B5CF6] rounded-[8px] flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-[8px] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-gray-400 font-medium mb-2">Indicações Ativas</p>
                    <p className="text-[20px] font-bold text-white">{displayStats.activeReferrals}</p>
                  </div>
                  <div className="w-12 h-12 bg-[#F59E0B] rounded-[8px] flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Withdrawal Button */}
            {displayStats.availableForWithdrawal > 0 && (
              <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-400/30 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">💰 Você tem dinheiro disponível!</h3>
                    <p className="text-green-400 font-semibold text-lg mb-1">
                      {formatCurrency(displayStats.availableForWithdrawal)} prontos para saque
                    </p>
                    <p className="text-gray-400 text-sm">
                      Solicite seu saque e receba em até 3 dias úteis
                    </p>
                  </div>
                  <button
                    onClick={handleWithdrawalRequest}
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Solicitar Saque
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Seção Competitiva - Status do Mentorado */}
        {mentorado && ranking.length > 0 && (() => {
          const mentoradoIndex = ranking.findIndex(r => r.mentorado_id === mentorado?.id)
          const currentPosition = mentoradoIndex + 1
          const mentoradoData = ranking[mentoradoIndex]
          const nextPosition = ranking[mentoradoIndex - 1]
          const indicacoesParaSubir = nextPosition ? (nextPosition.total_indicacoes - mentoradoData.total_indicacoes + 1) : 0

          return (
            <section className="mb-8">
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-400/30 rounded-lg p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    currentPosition === 1 ? 'bg-yellow-400 text-black' :
                    currentPosition === 2 ? 'bg-gray-400 text-black' :
                    currentPosition === 3 ? 'bg-amber-500 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {currentPosition === 1 ? (
                      <Trophy className="w-8 h-8" />
                    ) : currentPosition === 2 ? (
                      <Medal className="w-8 h-8" />
                    ) : currentPosition === 3 ? (
                      <Award className="w-8 h-8" />
                    ) : (
                      <span className="text-2xl font-bold">#{currentPosition}</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {currentPosition === 1 ? '🏆 Você é o CAMPEÃO!' :
                       currentPosition <= 3 ? `🏅 Você está em ${currentPosition}º lugar!` :
                       `Você está em ${currentPosition}º lugar`}
                    </h2>
                    <p className="text-gray-400">
                      {mentoradoData.total_indicacoes} indicação{mentoradoData.total_indicacoes !== 1 ? 'ões' : ''} feita{mentoradoData.total_indicacoes !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Status Atual */}
                  <div className="bg-[#1A1A1A] rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-2 flex items-center">
                      <Star className="w-5 h-5 mr-2 text-blue-400" />
                      Sua Posição
                    </h3>
                    <div className="text-3xl font-bold text-white mb-1">#{currentPosition}</div>
                    <div className="text-sm text-gray-400">de {ranking.length} competidores</div>
                  </div>

                  {/* Para Subir de Posição */}
                  {nextPosition && (
                    <div className="bg-[#1A1A1A] rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-2 flex items-center">
                        <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                        Para Subir
                      </h3>
                      <div className="text-3xl font-bold text-yellow-400 mb-1">+{indicacoesParaSubir}</div>
                      <div className="text-sm text-gray-400">
                        indicações para passar {nextPosition.nome_completo}
                      </div>
                    </div>
                  )}

                  {/* Quem Está Acima */}
                  {nextPosition && (
                    <div className="bg-[#1A1A1A] rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-2 flex items-center">
                        <Medal className="w-5 h-5 mr-2 text-orange-400" />
                        Quem Está Acima
                      </h3>
                      <div className="text-lg font-bold text-white mb-1">
                        {nextPosition.nome_completo}
                      </div>
                      <div className="text-sm text-gray-400">
                        {nextPosition.total_indicacoes} indicações
                      </div>
                    </div>
                  )}

                  {/* Se for o primeiro lugar */}
                  {currentPosition === 1 && (
                    <div className="bg-[#1A1A1A] rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-2 flex items-center">
                        <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                        Prêmio do Campeão
                      </h3>
                      <div className="text-lg font-bold text-yellow-400 mb-1">
                        🏆 VOCÊ GANHA!
                      </div>
                      <div className="text-sm text-gray-400">
                        Bolsa de luxo OU Relógio de luxo
                      </div>
                    </div>
                  )}
                </div>

                {/* Barra de Progresso Motivacional */}
                {nextPosition && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium">Progresso para subir de posição</span>
                      <span className="text-gray-400 text-sm">
                        {mentoradoData.total_indicacoes} / {nextPosition.total_indicacoes + 1}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (mentoradoData.total_indicacoes / (nextPosition.total_indicacoes + 1)) * 100)}%`
                        }}
                      />
                    </div>
                    <p className="text-gray-400 text-sm mt-2">
                      Faltam apenas <span className="text-yellow-400 font-bold">{indicacoesParaSubir}</span> indicações para você subir!
                    </p>
                  </div>
                )}
              </div>
            </section>
          )
        })()}

        {/* Commissions Tab */}
        {activeTab === 'commissions' && (
          <section>
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
              <h2 className="text-[24px] font-semibold text-white">
                Histórico de Comissões
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
            {loading ? (
              <div className="text-center py-16">
                <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4 animate-spin" />
                <h4 className="text-[20px] font-medium text-white mb-2">Carregando comissões...</h4>
              </div>
            ) : filteredCommissions.length === 0 ? (
              <div className="text-center py-16">
                <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h4 className="text-[20px] font-medium text-white mb-2">Nenhuma comissão encontrada</h4>
                <p className="text-gray-400">
                  {searchTerm || filterStatus !== 'todos'
                    ? 'Tente ajustar os filtros de busca.'
                    : 'Suas comissões aparecerão aqui conforme suas indicações virarem vendas.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCommissions.map((commission) => (
                  <div
                    key={commission.id}
                    className="bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-[8px] p-6 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-[8px] flex items-center justify-center ${
                          commission.status === 'paid' ? 'bg-[#22C55E]' :
                          commission.status === 'eligible' ? 'bg-[#3B82F6]' :
                          commission.status === 'requested' ? 'bg-[#8B5CF6]' :
                          commission.status === 'approved' ? 'bg-[#10B981]' :
                          commission.status === 'processing' ? 'bg-[#F59E0B]' :
                          'bg-[#6B7280]'
                        }`}>
                          <DollarSign className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-[15px] font-medium text-white">
                              {commission.referral?.lead?.nome || 'Cliente não informado'}
                            </h4>
                            <span className={`px-3 py-1 text-[12px] font-medium rounded-[4px] ${getStatusColor(commission.status)}`}>
                              {getStatusText(commission.status)}
                            </span>
                            {commission.milestone && (
                              <span className="px-2 py-1 text-[10px] font-medium rounded-[4px] bg-gray-600/20 text-gray-400">
                                {commission.milestone === 'first_50_percent' ? '1º 50%' :
                                 commission.milestone === 'second_50_percent' ? '2º 50%' :
                                 commission.milestone === 'full_payment' ? '100%' :
                                 commission.milestone}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-[13px] text-gray-400">
                            <span>
                              Valor Base: {formatCurrency(commission.base_amount)}
                            </span>
                            <span>
                              {commission.commission_percentage}% de comissão
                            </span>
                            <span>
                              Criado: {formatDate(commission.created_at)}
                            </span>
                          </div>
                          {commission.notes && (
                            <p className="text-[13px] text-gray-400 mt-1">{commission.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-400 mb-1">
                          {formatCurrency(commission.commission_amount)}
                        </div>
                        {commission.eligible_date && (
                          <p className="text-[12px] text-gray-400">
                            Elegível: {formatDate(commission.eligible_date)}
                          </p>
                        )}
                        {commission.paid_date && (
                          <p className="text-[12px] text-green-400">
                            Pago: {formatDate(commission.paid_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Referrals Tab */}
        {activeTab === 'referrals' && (
          <section>
            <h2 className="text-[24px] font-semibold text-white mb-6">
              Suas Indicações
            </h2>
            
            {loading ? (
              <div className="text-center py-16">
                <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4 animate-spin" />
                <h4 className="text-[20px] font-medium text-white mb-2">Carregando indicações...</h4>
              </div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-16">
                <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h4 className="text-[20px] font-medium text-white mb-2">Nenhuma indicação encontrada</h4>
                <p className="text-gray-400">
                  Suas indicações aparecerão aqui quando você começar a indicar clientes.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {referrals.map((referral) => (
                  <div key={referral.id} className="bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-[8px] p-6 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-[8px] flex items-center justify-center ${
                          referral.status === 'converted' ? 'bg-[#22C55E]' :
                          referral.status === 'negotiating' ? 'bg-[#F59E0B]' :
                          referral.status === 'qualified' ? 'bg-[#3B82F6]' :
                          referral.status === 'contacted' ? 'bg-[#8B5CF6]' :
                          referral.status === 'lost' ? 'bg-[#EF4444]' :
                          'bg-[#6B7280]'
                        }`}>
                          <Target className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-[15px] font-medium text-white">
                              {referral.lead?.nome || 'Lead não informado'}
                            </h4>
                            <span className={`px-3 py-1 text-[12px] font-medium rounded-[4px] ${
                              referral.status === 'converted' ? 'bg-green-400/20 text-green-400' :
                              referral.status === 'negotiating' ? 'bg-yellow-400/20 text-yellow-400' :
                              referral.status === 'qualified' ? 'bg-blue-400/20 text-blue-400' :
                              referral.status === 'contacted' ? 'bg-purple-400/20 text-purple-400' :
                              referral.status === 'lost' ? 'bg-red-400/20 text-red-400' :
                              'bg-gray-400/20 text-gray-400'
                            }`}>
                              {referral.status === 'converted' ? 'Convertido' :
                               referral.status === 'negotiating' ? 'Negociando' :
                               referral.status === 'qualified' ? 'Qualificado' :
                               referral.status === 'contacted' ? 'Contactado' :
                               referral.status === 'lost' ? 'Perdido' :
                               referral.status === 'pending' ? 'Pendente' :
                               referral.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[13px] text-gray-400">
                            <span>Indicado: {formatDate(referral.referral_date)}</span>
                            {referral.referral_source && (
                              <span>Origem: {referral.referral_source}</span>
                            )}
                            {referral.conversion_date && (
                              <span>Convertido: {formatDate(referral.conversion_date)}</span>
                            )}
                          </div>
                          {referral.referral_notes && (
                            <p className="text-[13px] text-gray-400 mt-1">{referral.referral_notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {referral.contract_value && (
                          <div className="text-2xl font-bold text-white mb-1">
                            {formatCurrency(referral.contract_value)}
                          </div>
                        )}
                        {referral.referral_code && (
                          <p className="text-[12px] text-gray-400">
                            Código: {referral.referral_code}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[24px] font-semibold text-white">
                Saques e Solicitações
              </h2>
              
              {displayStats.availableForWithdrawal > 0 && (
                <button
                  onClick={handleWithdrawalRequest}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Solicitar Saque ({formatCurrency(displayStats.availableForWithdrawal)})
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-16">
                <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4 animate-spin" />
                <h4 className="text-[20px] font-medium text-white mb-2">Carregando saques...</h4>
              </div>
            ) : withdrawalRequests.length === 0 ? (
              <div className="text-center py-16">
                <Download className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h4 className="text-[20px] font-medium text-white mb-2">Nenhuma solicitação de saque</h4>
                <p className="text-gray-400">
                  Quando você tiver comissões elegíveis, poderá solicitar saques aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {withdrawalRequests.map((withdrawal) => (
                  <div key={withdrawal.id} className="bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-[8px] p-6 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-[8px] flex items-center justify-center ${
                          withdrawal.status === 'completed' ? 'bg-[#22C55E]' :
                          withdrawal.status === 'approved' ? 'bg-[#10B981]' :
                          withdrawal.status === 'processing' ? 'bg-[#F59E0B]' :
                          withdrawal.status === 'rejected' ? 'bg-[#EF4444]' :
                          'bg-[#6B7280]'
                        }`}>
                          <Download className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-[15px] font-medium text-white">
                              Solicitação de Saque #{withdrawal.id.slice(-8)}
                            </h4>
                            <span className={`px-3 py-1 text-[12px] font-medium rounded-[4px] ${
                              withdrawal.status === 'completed' ? 'bg-green-400/20 text-green-400' :
                              withdrawal.status === 'approved' ? 'bg-emerald-400/20 text-emerald-400' :
                              withdrawal.status === 'processing' ? 'bg-yellow-400/20 text-yellow-400' :
                              withdrawal.status === 'rejected' ? 'bg-red-400/20 text-red-400' :
                              'bg-gray-400/20 text-gray-400'
                            }`}>
                              {withdrawal.status === 'completed' ? 'Concluído' :
                               withdrawal.status === 'approved' ? 'Aprovado' :
                               withdrawal.status === 'processing' ? 'Processando' :
                               withdrawal.status === 'rejected' ? 'Rejeitado' :
                               withdrawal.status === 'pending' ? 'Pendente' :
                               withdrawal.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[13px] text-gray-400">
                            <span>Solicitado: {formatDate(withdrawal.requested_at)}</span>
                            {withdrawal.completed_at && (
                              <span>Concluído: {formatDate(withdrawal.completed_at)}</span>
                            )}
                          </div>
                          {withdrawal.rejection_reason && (
                            <p className="text-[13px] text-red-400 mt-1">
                              Motivo da rejeição: {withdrawal.rejection_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-400 mb-1">
                          {formatCurrency(withdrawal.net_amount)}
                        </div>
                        <p className="text-[12px] text-gray-400">
                          {withdrawal.commission_ids.length} comissões
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

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
                {/* Layout vertical do ranking competitivo - TOP 3 */}
                <div className="flex">
                  {/* Lista do ranking */}
                  <div className="flex-1 space-y-4">
                    {ranking.slice(0, 3).map((mentorado, index) => (
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

                {/* Botão Ver Ranking Completo */}
                {ranking.length > 3 && (
                  <div className="text-center mt-6">
                    <button
                      onClick={() => setShowFullRanking(true)}
                      className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center mx-auto space-x-2"
                    >
                      <Trophy className="w-5 h-5" />
                      <span>Ver Ranking Completo</span>
                      <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
                        {ranking.length} mentorados
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}

          </section>
        )}
      </div>

      {/* Modal do Ranking Completo */}
      {showFullRanking && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">Ranking Completo</h2>
                <span className="bg-yellow-400/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium">
                  {ranking.length} Competidores
                </span>
              </div>
              <button
                onClick={() => setShowFullRanking(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="overflow-y-auto max-h-[60vh] p-6">
              <div className="space-y-3">
                {ranking.map((mentoradoItem, index) => (
                  <div
                    key={mentoradoItem.mentorado_id}
                    className={`flex items-center p-4 rounded-lg transition-all ${
                      mentoradoItem.mentorado_id === mentorado?.id
                        ? 'bg-blue-600/20 border-2 border-blue-400'
                        : index === 0
                        ? 'bg-gradient-to-r from-yellow-600/20 to-yellow-800/20 border-l-4 border-yellow-400'
                        : index === 1
                        ? 'bg-gradient-to-r from-gray-500/20 to-gray-700/20 border-l-4 border-gray-400'
                        : index === 2
                        ? 'bg-gradient-to-r from-amber-600/20 to-amber-800/20 border-l-4 border-amber-500'
                        : 'bg-[#1A1A1A] border-l-4 border-gray-600'
                    }`}
                  >
                    {/* Posição */}
                    <div className="w-12 text-center mr-4">
                      <span className={`text-2xl font-bold ${
                        index === 0 ? 'text-yellow-400' :
                        index === 1 ? 'text-gray-400' :
                        index === 2 ? 'text-amber-500' : 'text-white'
                      }`}>
                        {index + 1}
                      </span>
                    </div>

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
                      <div className="flex items-center space-x-3">
                        <h3 className={`font-semibold text-lg ${
                          mentoradoItem.mentorado_id === mentorado?.id ? 'text-blue-400' : 'text-white'
                        }`}>
                          {mentoradoItem.nome_completo}
                        </h3>
                        {mentoradoItem.mentorado_id === mentorado?.id && (
                          <span className="bg-blue-400/20 text-blue-400 px-2 py-1 rounded-full text-xs font-bold">
                            VOCÊ
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          {mentoradoItem.total_indicacoes}
                        </div>
                        <div className="text-sm text-gray-400">indicações</div>
                      </div>
                    </div>

                    {/* Badges */}
                    {index < 3 && (
                      <div className={`ml-4 px-3 py-1 rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-yellow-400 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        'bg-amber-500 text-white'
                      }`}>
                        {index === 0 ? '🏆 CAMPEÃO' : index === 1 ? '🥈 VICE' : '🥉 3º LUGAR'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}