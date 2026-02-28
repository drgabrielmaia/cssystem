'use client'

import { useState, useEffect } from 'react'
import { 
  Search,
  Star,
  ShoppingCart,
  BarChart3,
  Users,
  MessageCircle,
  Settings,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Calendar,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  BookOpen,
  Play,
  FileText,
  Download,
  User,
  Phone,
  Mail,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Zap,
  Award,
  ChevronRight
} from 'lucide-react'
import { CloserAuthProvider, useCloserAuth } from '@/contexts/closer-auth'
import { supabase } from '@/lib/supabase'
import StudyMaterials from '@/components/StudyMaterials'
import Link from 'next/link'

interface CloserMetrics {
  totalVendas: number
  valorTotal: number
  comissaoTotal: number
  taxaConversao: number
  leadsAtendidos: number
}

interface SalesMetrics {
  valorVendido: number
  valorArrecadado: number
  comissaoTotal: number
  totalVendas: number
}

interface DashboardMetrics {
  total_leads: number
  leads_atendidos: number
  reunioes_agendadas: number
  leads_fechados: number
  taxa_conversao: number
  receita_total: number
  leads_hoje: number
  leads_em_qualificacao: number
  leads_em_andamento: number
  valor_potencial_total: number
  meta_mensal: number
  percentual_meta: number
}

interface CloserActivity {
  id: string
  tipo_atividade: string
  descricao: string
  data_atividade: string
  resultado?: string
}

interface TeamMember {
  id: string
  nome_completo: string
  tipo_closer: string
  email?: string
  leads_atribuidos: number
  conversoes: number
  taxa_conversao: number
  receita_gerada: number
  status: string
}

function CloserPageContent() {
  const { closer, loading: authLoading, error, signIn, signOut } = useCloserAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<CloserMetrics | null>(null)
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null)
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics>({ valorVendido: 0, valorArrecadado: 0, comissaoTotal: 0, totalVendas: 0 })
  const [recentActivities, setRecentActivities] = useState<CloserActivity[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [showStudyMaterials, setShowStudyMaterials] = useState(false)
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month'>('today')

  useEffect(() => {
    if (closer) {
      loadMetrics()
      loadDashboardMetrics()
      loadRecentActivities()
      loadTeamMembers()
      loadSalesMetrics()
    }
  }, [closer, periodFilter])

  const loadMetrics = async () => {
    if (!closer) return

    try {
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()

      const { data, error } = await supabase.rpc('calculate_closer_metrics', {
        p_closer_id: closer.id,
        p_month: currentMonth,
        p_year: currentYear
      })

      if (error) {
        console.error('Error loading metrics:', error)
        setMetrics({
          totalVendas: 0,
          valorTotal: 0,
          comissaoTotal: 0,
          taxaConversao: 0,
          leadsAtendidos: 0
        })
      } else if (data && data.length > 0) {
        setMetrics({
          totalVendas: data[0].total_vendas || 0,
          valorTotal: data[0].valor_total || 0,
          comissaoTotal: data[0].comissao_total || 0,
          taxaConversao: data[0].taxa_conversao || 0,
          leadsAtendidos: data[0].leads_atendidos || 0
        })
      }
    } catch (error) {
      console.error('Error loading metrics:', error)
      setMetrics({
        totalVendas: 0,
        valorTotal: 0,
        comissaoTotal: 0,
        taxaConversao: 0,
        leadsAtendidos: 0
      })
    }
  }

  const loadSalesMetrics = async () => {
    if (!closer) return
    try {
      const { data, error } = await supabase
        .from('closers_vendas')
        .select('valor_venda, valor_comissao, status_pagamento')
        .eq('closer_id', closer.id)

      if (!error && data) {
        const valorVendido = data.reduce((sum: number, v: any) => sum + (Number(v.valor_venda) || 0), 0)
        const valorArrecadado = data
          .filter((v: any) => v.status_pagamento === 'pago')
          .reduce((sum: number, v: any) => sum + (Number(v.valor_venda) || 0), 0)
        const comissaoTotal = data.reduce((sum: number, v: any) => sum + (Number(v.valor_comissao) || 0), 0)
        setSalesMetrics({ valorVendido, valorArrecadado, comissaoTotal, totalVendas: data.length })
      }
    } catch (error) {
      console.error('Error loading sales metrics:', error)
    }
  }

  const loadDashboardMetrics = async () => {
    if (!closer) return

    try {
      const { data, error } = await supabase.rpc('get_dashboard_metrics', {
        p_organization_id: closer.organization_id
      })

      if (!error && data && data.length > 0) {
        setDashboardMetrics(data[0])
      } else {
        console.error('Error loading dashboard metrics:', error)
        setDashboardMetrics({
          total_leads: 0,
          leads_atendidos: 0,
          reunioes_agendadas: 0,
          leads_fechados: 0,
          taxa_conversao: 0,
          receita_total: 0,
          leads_hoje: 0,
          leads_em_qualificacao: 0,
          leads_em_andamento: 0,
          valor_potencial_total: 0,
          meta_mensal: 500000,
          percentual_meta: 0
        })
      }
    } catch (error) {
      console.error('Error loading dashboard metrics:', error)
    }
  }

  const loadRecentActivities = async () => {
    if (!closer) return

    try {
      const { data, error } = await supabase
        .from('closers_atividades')
        .select('*')
        .eq('closer_id', closer.id)
        .order('data_atividade', { ascending: false })
        .limit(5)

      if (!error && data) {
        setRecentActivities(data)
      }
    } catch (error) {
      console.error('Error loading activities:', error)
    }
  }

  const loadTeamMembers = async () => {
    try {
      // Use the new RPC function to get real team metrics
      const { data, error } = await supabase.rpc('get_team_member_metrics', {
        p_organization_id: closer?.organization_id || null
      })

      if (!error && data) {
        const formattedMembers: TeamMember[] = data.map((member: any) => ({
          id: member.id,
          nome_completo: member.nome_completo || 'N/A',
          tipo_closer: member.tipo_closer || 'sdr',
          email: member.email || '',
          leads_atribuidos: Number(member.leads_atribuidos) || 0,
          conversoes: Number(member.conversoes) || 0,
          taxa_conversao: parseFloat(member.taxa_conversao) || 0,
          receita_gerada: parseFloat(member.receita_gerada) || 0,
          status: member.status || 'Ativo'
        }))
        setTeamMembers(formattedMembers)
      } else {
        console.error('Error loading team metrics:', error)
        // Fallback to basic closers data if RPC fails
        const { data: fallbackData } = await supabase
          .from('closers')
          .select('*')
          .eq('organization_id', closer?.organization_id)
          .limit(10)

        if (fallbackData) {
          const fallbackMembers: TeamMember[] = fallbackData.map((member: any) => ({
            id: member.id,
            nome_completo: member.nome_completo || 'N/A',
            tipo_closer: member.tipo_closer || 'sdr',
            email: member.email || '',
            leads_atribuidos: 0,
            conversoes: 0,
            taxa_conversao: 0,
            receita_gerada: 0,
            status: member.ativo ? 'Ativo' : 'Inativo'
          }))
          setTeamMembers(fallbackMembers)
        }
      }
    } catch (error) {
      console.error('Error loading team members:', error)
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4ADE80]"></div>
      </div>
    )
  }

  if (!closer) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
        <div className="bg-[#1A1A1A] rounded-2xl p-8 w-full max-w-md border border-white/10">
          <div className="text-center mb-8">
            <div className="bg-[#166534] rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <User className="h-8 w-8 text-[#4ADE80]" />
            </div>
            <h2 className="text-2xl font-bold text-white">Portal do Closer/SDR</h2>
            <p className="text-[#71717A] mt-2">
              Acesse seu dashboard de vendas e atividades
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                <Mail className="h-4 w-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full px-4 py-3 bg-[#1E1E1E] border border-white/10 rounded-lg text-white placeholder-[#71717A] focus:outline-none focus:border-[#4ADE80]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Sua senha"
                className="w-full px-4 py-3 bg-[#1E1E1E] border border-white/10 rounded-lg text-white placeholder-[#71717A] focus:outline-none focus:border-[#4ADE80]"
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-3 px-4 bg-gradient-to-r from-[#4ADE80] to-[#10B981] text-black font-semibold rounded-lg hover:from-[#10B981] hover:to-[#059669] transition-all duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col lg:flex-row">
      {/* Sidebar Esquerda */}
      <aside className="w-full lg:w-60 bg-[#0F0F0F] border-b lg:border-r lg:border-b-0 border-white/10 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-[#4ADE80] to-[#10B981] rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">CS</span>
            </div>
            <span className="text-white font-semibold">CustomerSuccess</span>
          </div>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#1E1E1E] rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-[#4ADE80]" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">
                {closer.nome_completo?.split(' ')[0] || 'Usuário'}
              </p>
              <p className="text-[#71717A] text-xs">
                {closer.tipo_closer === 'sdr' ? 'SDR' : 
                 closer.tipo_closer === 'closer' ? 'Closer' :
                 closer.tipo_closer === 'closer_senior' ? 'Closer Senior' : 'Manager'}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#71717A]" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-10 pr-12 py-2 bg-[#1E1E1E] border border-white/10 rounded-lg text-white placeholder-[#71717A] text-sm focus:outline-none focus:border-[#4ADE80]"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <span className="text-[#71717A] text-xs">⌘K</span>
            </div>
          </div>
        </div>

        <div className="flex-1 px-6">
          {/* NAVEGAÇÃO */}
          <div className="mb-8">
            <h3 className="text-[#71717A] text-xs uppercase tracking-wider font-medium mb-4">NAVEGAÇÃO</h3>
            <nav className="space-y-1">
              <a 
                href="#" 
                className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[#4ADE80]/10 border-l-4 border-[#4ADE80] text-[#4ADE80] transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Dashboard</span>
              </a>
              <Link href="/closer/leads" className="flex items-center gap-3 px-4 py-2 rounded-lg text-[#A1A1AA] hover:bg-white/5 transition-colors">
                <Users className="h-4 w-4" />
                <span className="text-sm">Leads</span>
              </Link>
              <Link href="/closer/agenda" className="flex items-center gap-3 px-4 py-2 rounded-lg text-[#A1A1AA] hover:bg-white/5 transition-colors">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Agenda</span>
              </Link>
              <Link href="/closer/availability" className="flex items-center gap-3 px-4 py-2 rounded-lg text-[#A1A1AA] hover:bg-white/5 transition-colors">
                <Settings className="h-4 w-4" />
                <span className="text-sm">Configurar Agenda</span>
              </Link>
              <button 
                onClick={() => setShowStudyMaterials(true)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-[#A1A1AA] hover:bg-white/5 transition-colors w-full text-left"
              >
                <BookOpen className="h-4 w-4" />
                <span className="text-sm">Estudos</span>
              </button>
            </nav>
          </div>
        </div>

        <div className="p-6">
          <button 
            onClick={() => signOut()}
            className="w-full py-2 px-4 bg-[#1E1E1E] text-[#A1A1AA] rounded-lg hover:bg-[#2A2A2A] transition-colors text-sm"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo Central */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <nav className="text-[#71717A] text-sm mb-2">
                <span>Dashboards</span> <span className="mx-2">/</span> <span>Closer/SDR</span>
              </nav>
              <h1 className="text-2xl font-bold text-white">Closer/SDR</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPeriodFilter('today')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  periodFilter === 'today' 
                    ? 'bg-[#4ADE80] text-black font-medium' 
                    : 'bg-[#1E1E1E] border border-white/10 text-[#A1A1AA] hover:bg-[#2A2A2A]'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setPeriodFilter('week')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  periodFilter === 'week' 
                    ? 'bg-[#4ADE80] text-black font-medium' 
                    : 'bg-[#1E1E1E] border border-white/10 text-[#A1A1AA] hover:bg-[#2A2A2A]'
                }`}
              >
                Esta Semana
              </button>
              <button
                onClick={() => setPeriodFilter('month')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  periodFilter === 'month' 
                    ? 'bg-[#4ADE80] text-black font-medium' 
                    : 'bg-[#1E1E1E] border border-white/10 text-[#A1A1AA] hover:bg-[#2A2A2A]'
                }`}
              >
                Este Mês
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
            {/* Leads Contatados */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <p className="text-[#71717A] text-sm mb-2">Leads Contatados</p>
              <p className="text-white text-3xl font-bold mb-2">{dashboardMetrics?.leads_atendidos || 0}</p>
              <div className="flex items-center gap-1 text-sm">
                <ArrowUp className="h-4 w-4 text-[#4ADE80]" />
                <span className="text-[#4ADE80]">
                  {dashboardMetrics?.total_leads ?
                    ((dashboardMetrics.leads_atendidos / dashboardMetrics.total_leads) * 100).toFixed(1) : '0.0'
                  }%
                </span>
                <span className="text-[#71717A]">dos leads totais</span>
              </div>
            </div>

            {/* Taxa de Conversao */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <p className="text-[#71717A] text-sm mb-2">Taxa de Conversao</p>
              <p className="text-white text-3xl font-bold mb-2">{dashboardMetrics?.taxa_conversao?.toFixed(1) || '0.0'}%</p>
              <div className="flex items-center gap-1 text-sm">
                <ArrowUp className="h-4 w-4 text-[#4ADE80]" />
                <span className="text-[#4ADE80]">
                  {dashboardMetrics?.leads_fechados || 0} fechados
                </span>
                <span className="text-[#71717A]">de {dashboardMetrics?.total_leads || 0} leads</span>
              </div>
            </div>

            {/* Reunioes Agendadas */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <p className="text-[#71717A] text-sm mb-2">Reunioes Agendadas</p>
              <p className="text-white text-3xl font-bold mb-2">{dashboardMetrics?.reunioes_agendadas || 0}</p>
              <div className="flex items-center gap-1 text-sm">
                <ArrowUp className="h-4 w-4 text-[#4ADE80]" />
                <span className="text-[#4ADE80]">
                  {dashboardMetrics?.leads_em_andamento || 0} em andamento
                </span>
                <span className="text-[#71717A]">+ {dashboardMetrics?.leads_em_qualificacao || 0} qualificando</span>
              </div>
            </div>

            {/* Receita Gerada */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <p className="text-[#71717A] text-sm mb-2">Receita Gerada</p>
              <p className="text-white text-3xl font-bold mb-2">
                R$ {dashboardMetrics?.receita_total?.toLocaleString('pt-BR') || '0'}
              </p>
              <div className="flex items-center gap-1 text-sm">
                <ArrowUp className="h-4 w-4 text-[#4ADE80]" />
                <span className="text-[#4ADE80]">
                  R$ {dashboardMetrics?.valor_potencial_total?.toLocaleString('pt-BR') || '0'}
                </span>
                <span className="text-[#71717A]">potencial</span>
              </div>
            </div>
          </div>

          {/* Sales KPI Cards - Valor Vendido, Arrecadado, Comissao */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            {/* Valor Vendido */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-[#4ADE80]" />
                <p className="text-[#71717A] text-sm">Valor Vendido</p>
              </div>
              <p className="text-white text-3xl font-bold mb-2">
                R$ {salesMetrics.valorVendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-[#4ADE80]">{salesMetrics.totalVendas} vendas</span>
                <span className="text-[#71717A]">realizadas</span>
              </div>
            </div>

            {/* Valor Arrecadado */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-[#4ADE80]" />
                <p className="text-[#71717A] text-sm">Valor Arrecadado</p>
              </div>
              <p className="text-white text-3xl font-bold mb-2">
                R$ {salesMetrics.valorArrecadado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-[#4ADE80]">
                  {salesMetrics.valorVendido > 0
                    ? ((salesMetrics.valorArrecadado / salesMetrics.valorVendido) * 100).toFixed(0)
                    : '0'}%
                </span>
                <span className="text-[#71717A]">do valor vendido</span>
              </div>
            </div>

            {/* Comissao */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-[#FACC15]" />
                <p className="text-[#71717A] text-sm">Comissao</p>
              </div>
              <p className="text-[#FACC15] text-3xl font-bold mb-2">
                R$ {salesMetrics.comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-[#FACC15]">
                  {salesMetrics.valorVendido > 0
                    ? ((salesMetrics.comissaoTotal / salesMetrics.valorVendido) * 100).toFixed(1)
                    : '0'}%
                </span>
                <span className="text-[#71717A]">do valor vendido</span>
              </div>
            </div>
          </div>

          {/* Performance e Mini Cards */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-8">
            {/* Performance por Closer - 60% */}
            <div className="xl:col-span-2 bg-[#1A1A1A] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-[#166534] rounded-full flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-[#4ADE80]" />
                </div>
                <div>
                  <h3 className="text-white text-lg font-semibold">Performance por Closer</h3>
                  <p className="text-white text-2xl font-bold">R$ {dashboardMetrics?.receita_total?.toLocaleString('pt-BR') || '0'}</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-center h-48">
                <div className="relative">
                  {/* Placeholder for donut chart */}
                  <div className="w-32 h-32 rounded-full border-8 border-[#3F3F46] border-t-[#4ADE80] animate-pulse"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-white text-xl font-bold">{dashboardMetrics?.total_leads || 0}</p>
                      <p className="text-[#71717A] text-xs">Leads Totais</p>
                    </div>
                  </div>
                </div>

                <div className="md:ml-8 mt-4 md:mt-0 space-y-3">
                  {teamMembers
                    .sort((a, b) => b.receita_gerada - a.receita_gerada)
                    .slice(0, 4)
                    .map((member, index) => {
                      const colors = ['#4ADE80', '#166534', '#FACC15', '#3F3F46'];
                      return (
                        <div key={member.id} className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: colors[index] }}></div>
                          <span className="text-[#A1A1AA] text-sm">{member.nome_completo}</span>
                          <span className="text-white text-sm ml-auto">R$ {member.receita_gerada.toLocaleString('pt-BR')}</span>
                        </div>
                      );
                    })}
                  {teamMembers.length === 0 && (
                    <div className="text-[#A1A1AA] text-sm text-center py-4">
                      Nenhum dado de receita disponível
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-right mt-4">
                <p className="text-[#A1A1AA] text-sm">Total Vendas: R$ {dashboardMetrics?.receita_total?.toLocaleString('pt-BR') || '0'}</p>
              </div>
            </div>

            {/* Mini Cards - 40% */}
            <div className="space-y-5">
              {/* Novos Leads Hoje */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-[#166534] rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-[#4ADE80]" />
                  </div>
                  <h4 className="text-white font-medium">Novos Leads Hoje</h4>
                </div>
                <p className="text-white text-2xl font-bold mb-2">{dashboardMetrics?.leads_hoje || 0}</p>
                <p className="text-[#4ADE80] text-sm mb-3">
                  {dashboardMetrics?.total_leads ? 
                    ((dashboardMetrics.leads_hoje / dashboardMetrics.total_leads) * 100).toFixed(1) : '0'
                  }% do total
                </p>
                <div className="h-8 bg-[#1E1E1E] rounded overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#4ADE80] to-[#10B981]" 
                    style={{ 
                      width: `${dashboardMetrics?.total_leads ? 
                        Math.min((dashboardMetrics.leads_hoje / dashboardMetrics.total_leads) * 100, 100) : 0
                      }%` 
                    }}
                  ></div>
                </div>
              </div>

              {/* Meta Mensal */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-[#166534] rounded-full flex items-center justify-center">
                    <Target className="h-4 w-4 text-[#4ADE80]" />
                  </div>
                  <h4 className="text-white font-medium">Meta Mensal</h4>
                </div>
                <p className="text-white text-xl font-bold mb-2">
                  R$ {dashboardMetrics?.receita_total?.toLocaleString('pt-BR') || '0'} / R$ {dashboardMetrics?.meta_mensal?.toLocaleString('pt-BR') || '500.000'}
                </p>
                <div className="h-2 bg-[#1E1E1E] rounded-full mb-2">
                  <div 
                    className="h-full bg-gradient-to-r from-[#4ADE80] to-[#10B981] rounded-full" 
                    style={{ width: `${Math.min(dashboardMetrics?.percentual_meta || 0, 100)}%` }}
                  ></div>
                </div>
                <p className="text-[#4ADE80] text-sm">{dashboardMetrics?.percentual_meta?.toFixed(1) || '0'}% atingido</p>
              </div>
            </div>
          </div>

          {/* Tabela de Closers */}
          <div className="bg-[#1A1A1A] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-semibold">Lista de Closers/SDRs</h3>
              <button>
                <MoreHorizontal className="h-5 w-5 text-[#71717A]" />
              </button>
            </div>

            {/* Mobile Cards for smaller screens */}
            <div className="block md:hidden space-y-4">
              {teamMembers.map((member, index) => (
                <div key={member.id} className="bg-[#1E1E1E] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-[#1E1E1E] rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-[#4ADE80]" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{member.nome_completo}</p>
                      <p className="text-[#71717A] text-xs">{member.email || `user${index + 1}@empresa.com`}</p>
                    </div>
                    <span className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${
                      member.tipo_closer === 'closer' || member.tipo_closer === 'closer_senior'
                        ? 'bg-[#166534] text-[#4ADE80]'
                        : 'bg-[#1E3A5F] text-[#60A5FA]'
                    }`}>
                      {member.tipo_closer === 'closer' || member.tipo_closer === 'closer_senior' ? 'Closer' : 'SDR'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[#71717A]">Leads: </span>
                      <span className="text-white">{member.leads_atribuidos}</span>
                    </div>
                    <div>
                      <span className="text-[#71717A]">Conversões: </span>
                      <span className="text-white">{member.conversoes}</span>
                    </div>
                    <div>
                      <span className="text-[#71717A]">Taxa Conv.: </span>
                      <span className={`font-medium ${
                        member.taxa_conversao >= 20 ? 'text-[#4ADE80]' :
                        member.taxa_conversao >= 15 ? 'text-[#FBBF24]' : 'text-[#EF4444]'
                      }`}>
                        {member.taxa_conversao}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[#71717A]">Receita: </span>
                      <span className="text-white">R$ {member.receita_gerada.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      member.status === 'Ativo' ? 'bg-[#166534] text-[#4ADE80]' :
                      member.status === 'Em pausa' ? 'bg-[#78350F] text-[#FBBF24]' : 'bg-[#7F1D1D] text-[#EF4444]'
                    }`}>
                      {member.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table for larger screens */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-[#71717A] text-xs uppercase tracking-wider font-medium">Nome</th>
                    <th className="text-left py-3 px-4 text-[#71717A] text-xs uppercase tracking-wider font-medium">Cargo</th>
                    <th className="text-left py-3 px-4 text-[#71717A] text-xs uppercase tracking-wider font-medium">Leads Atribuídos</th>
                    <th className="text-left py-3 px-4 text-[#71717A] text-xs uppercase tracking-wider font-medium">Conversões</th>
                    <th className="text-left py-3 px-4 text-[#71717A] text-xs uppercase tracking-wider font-medium">Taxa Conv.</th>
                    <th className="text-left py-3 px-4 text-[#71717A] text-xs uppercase tracking-wider font-medium">Receita Gerada</th>
                    <th className="text-left py-3 px-4 text-[#71717A] text-xs uppercase tracking-wider font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member, index) => (
                    <tr key={member.id} className="hover:bg-[#4ADE80]/5 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#1E1E1E] rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-[#4ADE80]" />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{member.nome_completo}</p>
                            <p className="text-[#71717A] text-xs">{member.email || `user${index + 1}@empresa.com`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.tipo_closer === 'closer' || member.tipo_closer === 'closer_senior'
                            ? 'bg-[#166534] text-[#4ADE80]'
                            : 'bg-[#1E3A5F] text-[#60A5FA]'
                        }`}>
                          {member.tipo_closer === 'closer' || member.tipo_closer === 'closer_senior' ? 'Closer' : 'SDR'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-white text-sm">{member.leads_atribuidos}</td>
                      <td className="py-4 px-4 text-white text-sm">{member.conversoes}</td>
                      <td className="py-4 px-4">
                        <span className={`text-sm font-medium ${
                          member.taxa_conversao >= 20 ? 'text-[#4ADE80]' :
                          member.taxa_conversao >= 15 ? 'text-[#FBBF24]' : 'text-[#EF4444]'
                        }`}>
                          {member.taxa_conversao}%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-white text-sm">R$ {member.receita_gerada.toLocaleString('pt-BR')}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.status === 'Ativo' ? 'bg-[#166534] text-[#4ADE80]' :
                          member.status === 'Em pausa' ? 'bg-[#78350F] text-[#FBBF24]' : 'bg-[#7F1D1D] text-[#EF4444]'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Sidebar Direita */}
      <aside className="hidden xl:block w-80 bg-[#0F0F0F] border-l border-white/10 p-6 overflow-y-auto">
        {/* Notificações */}
        <div className="mb-8">
          <h3 className="text-white text-lg font-semibold mb-4">Notificações</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-[#1A1A1A] rounded-lg">
              <div className="w-2 h-2 rounded-full bg-[#4ADE80] mt-2"></div>
              <div className="flex-1">
                <p className="text-[#A1A1AA] text-sm">34 Novos leads atribuídos.</p>
                <p className="text-[#71717A] text-xs mt-1">Agora</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[#1A1A1A] rounded-lg">
              <div className="w-2 h-2 rounded-full bg-[#60A5FA] mt-2"></div>
              <div className="flex-1">
                <p className="text-[#A1A1AA] text-sm">15 Reuniões confirmadas.</p>
                <p className="text-[#71717A] text-xs mt-1">2h atrás</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[#1A1A1A] rounded-lg">
              <div className="w-2 h-2 rounded-full bg-[#FACC15] mt-2"></div>
              <div className="flex-1">
                <p className="text-[#A1A1AA] text-sm">Meta semanal atingida por João Silva.</p>
                <p className="text-[#71717A] text-xs mt-1">5h atrás</p>
              </div>
            </div>
          </div>
        </div>

        {/* Atividades Recentes */}
        <div className="mb-8">
          <h3 className="text-white text-lg font-semibold mb-4">Atividades</h3>
          <div className="space-y-3">
            {recentActivities.slice(0, 4).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-[#1A1A1A] rounded-lg">
                <div className="w-6 h-6 bg-[#166534] rounded-full flex items-center justify-center mt-1">
                  <Activity className="h-3 w-3 text-[#4ADE80]" />
                </div>
                <div className="flex-1">
                  <p className="text-[#A1A1AA] text-sm">{activity.descricao}</p>
                  <p className="text-[#71717A] text-xs mt-1">
                    {new Date(activity.data_atividade).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="mb-8">
          <h3 className="text-white text-lg font-semibold mb-4">Top Performers</h3>
          <div className="space-y-3">
            {teamMembers.slice(0, 4).map((member, index) => (
              <div key={member.id} className={`p-3 rounded-lg ${index === 0 ? 'bg-[#4ADE80]/10 border border-[#4ADE80]/20' : 'bg-[#1A1A1A]'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#1E1E1E] rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-[#4ADE80]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{member.nome_completo}</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      index === 0 ? 'bg-[#4ADE80] text-black' : 'bg-[#166534] text-[#4ADE80]'
                    }`}>
                      #{index + 1}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </aside>

      {/* Study Materials Component */}
      <StudyMaterials 
        closerId={closer.id}
        isVisible={showStudyMaterials}
        onClose={() => setShowStudyMaterials(false)}
      />
    </div>
  )
}

export default function CloserLoginPage() {
  return (
    <CloserAuthProvider>
      <CloserPageContent />
    </CloserAuthProvider>
  )
}