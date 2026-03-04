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
      <aside className="w-full lg:w-64 bg-[#0A0A0A] border-b lg:border-r lg:border-b-0 border-white/[0.06] flex flex-col">
        <div className="p-5">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-7">
            <div className="w-9 h-9 bg-gradient-to-br from-[#4ADE80] to-[#059669] rounded-xl flex items-center justify-center shadow-lg shadow-[#4ADE80]/20">
              <span className="text-black font-bold text-sm">CS</span>
            </div>
            <div>
              <span className="text-white font-semibold text-[15px]">CustomerSuccess</span>
              <span className="block text-[#52525B] text-[10px] uppercase tracking-widest font-medium">Platform</span>
            </div>
          </div>

          {/* User Card */}
          <div className="flex items-center gap-3 mb-7 p-3 rounded-xl bg-gradient-to-r from-white/[0.04] to-transparent border border-white/[0.06]">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4ADE80]/20 to-[#059669]/20 rounded-full flex items-center justify-center ring-2 ring-[#4ADE80]/20">
              <span className="text-[#4ADE80] font-bold text-sm">
                {closer.nome_completo?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {closer.nome_completo?.split(' ')[0] || 'Usuario'}
              </p>
              <p className="text-[#52525B] text-xs">
                {closer.tipo_closer === 'sdr' ? 'SDR' :
                 closer.tipo_closer === 'closer' ? 'Closer' :
                 closer.tipo_closer === 'closer_senior' ? 'Closer Senior' : 'Manager'}
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#4ADE80] shadow-sm shadow-[#4ADE80]/50"></div>
          </div>

          {/* Search */}
          <div className="relative mb-7">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#52525B]" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-10 pr-12 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder-[#52525B] text-sm focus:outline-none focus:border-[#4ADE80]/40 focus:bg-white/[0.05] transition-all duration-200"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <kbd className="text-[#52525B] text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.08]">&#8984;K</kbd>
            </div>
          </div>
        </div>

        <div className="flex-1 px-5">
          {/* Main Navigation */}
          <div className="mb-6">
            <h3 className="text-[#52525B] text-[10px] uppercase tracking-[0.15em] font-semibold mb-3 px-3">Menu Principal</h3>
            <nav className="space-y-0.5">
              <a
                href="#"
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#4ADE80]/10 to-[#4ADE80]/[0.03] text-[#4ADE80] transition-all duration-200 relative"
              >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#4ADE80] rounded-r-full"></div>
                <div className="w-8 h-8 rounded-lg bg-[#4ADE80]/15 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">Dashboard</span>
              </a>
              <Link href="/closer/leads" className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#A1A1AA] hover:bg-white/[0.04] hover:text-white transition-all duration-200">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.08] flex items-center justify-center transition-colors">
                  <Users className="h-4 w-4" />
                </div>
                <span className="text-sm">Leads</span>
                <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-60 -translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
              </Link>
              <Link href="/closer/agenda" className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#A1A1AA] hover:bg-white/[0.04] hover:text-white transition-all duration-200">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.08] flex items-center justify-center transition-colors">
                  <Calendar className="h-4 w-4" />
                </div>
                <span className="text-sm">Agenda</span>
                <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-60 -translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
              </Link>
            </nav>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-6"></div>

          {/* Tools Section */}
          <div className="mb-6">
            <h3 className="text-[#52525B] text-[10px] uppercase tracking-[0.15em] font-semibold mb-3 px-3">Ferramentas</h3>
            <nav className="space-y-0.5">
              <Link href="/closer/availability" className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#A1A1AA] hover:bg-white/[0.04] hover:text-white transition-all duration-200">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.08] flex items-center justify-center transition-colors">
                  <Settings className="h-4 w-4" />
                </div>
                <span className="text-sm">Configurar Agenda</span>
              </Link>
              <button
                onClick={() => setShowStudyMaterials(true)}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#A1A1AA] hover:bg-white/[0.04] hover:text-white transition-all duration-200 w-full text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.08] flex items-center justify-center transition-colors">
                  <BookOpen className="h-4 w-4" />
                </div>
                <span className="text-sm">Estudos</span>
                <span className="ml-auto text-[10px] bg-[#4ADE80]/15 text-[#4ADE80] px-2 py-0.5 rounded-full font-medium">Novo</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mx-5"></div>

        <div className="p-5">
          <button
            onClick={() => signOut()}
            className="w-full py-2.5 px-4 bg-white/[0.03] text-[#71717A] rounded-xl hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border border-white/[0.06] transition-all duration-200 text-sm font-medium"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Conteudo Central */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <nav className="text-[#52525B] text-sm mb-1 flex items-center gap-1.5">
                <span className="hover:text-[#A1A1AA] cursor-pointer transition-colors">Dashboards</span>
                <span className="text-[#3F3F46]">/</span>
                <span className="text-[#A1A1AA]">Closer/SDR</span>
              </nav>
              <h1 className="text-2xl font-bold text-white">
                Bem-vindo, {closer.nome_completo?.split(' ')[0] || 'Usuario'}
              </h1>
              <p className="text-[#52525B] text-sm mt-0.5">Acompanhe suas metricas e performance em tempo real.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-[#1A1A1A] rounded-xl p-1 flex items-center border border-white/[0.06]">
                <button
                  onClick={() => setPeriodFilter('today')}
                  className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                    periodFilter === 'today'
                      ? 'bg-[#4ADE80] text-black font-semibold shadow-lg shadow-[#4ADE80]/20'
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  Hoje
                </button>
                <button
                  onClick={() => setPeriodFilter('week')}
                  className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                    periodFilter === 'week'
                      ? 'bg-[#4ADE80] text-black font-semibold shadow-lg shadow-[#4ADE80]/20'
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setPeriodFilter('month')}
                  className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                    periodFilter === 'month'
                      ? 'bg-[#4ADE80] text-black font-semibold shadow-lg shadow-[#4ADE80]/20'
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  Mes
                </button>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {/* Leads Contatados */}
            <div className="group relative bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl p-5 border border-white/[0.06] hover:border-[#4ADE80]/20 transition-all duration-300 hover:shadow-lg hover:shadow-[#4ADE80]/[0.03] overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#4ADE80]/[0.06] to-transparent rounded-bl-full"></div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#71717A] text-sm font-medium">Leads Contatados</p>
                <div className="w-9 h-9 rounded-xl bg-[#4ADE80]/10 flex items-center justify-center ring-1 ring-[#4ADE80]/20">
                  <Users className="h-4 w-4 text-[#4ADE80]" />
                </div>
              </div>
              <p className="text-white text-3xl font-bold mb-3 tracking-tight">{dashboardMetrics?.leads_atendidos || 0}</p>
              <div className="flex items-center gap-1.5 text-sm">
                <div className="flex items-center gap-1 bg-[#4ADE80]/10 px-2 py-0.5 rounded-full">
                  <ArrowUp className="h-3.5 w-3.5 text-[#4ADE80]" />
                  <span className="text-[#4ADE80] font-medium text-xs">
                    {dashboardMetrics?.total_leads ?
                      ((dashboardMetrics.leads_atendidos / dashboardMetrics.total_leads) * 100).toFixed(1) : '0.0'
                    }%
                  </span>
                </div>
                <span className="text-[#52525B] text-xs">dos leads totais</span>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#4ADE80] to-[#10B981] rounded-full transition-all duration-700"
                  style={{ width: `${dashboardMetrics?.total_leads ? Math.min((dashboardMetrics.leads_atendidos / dashboardMetrics.total_leads) * 100, 100) : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Taxa de Conversao */}
            <div className="group relative bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl p-5 border border-white/[0.06] hover:border-[#60A5FA]/20 transition-all duration-300 hover:shadow-lg hover:shadow-[#60A5FA]/[0.03] overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#60A5FA]/[0.06] to-transparent rounded-bl-full"></div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#71717A] text-sm font-medium">Taxa de Conversao</p>
                <div className="w-9 h-9 rounded-xl bg-[#60A5FA]/10 flex items-center justify-center ring-1 ring-[#60A5FA]/20">
                  <Target className="h-4 w-4 text-[#60A5FA]" />
                </div>
              </div>
              <p className="text-white text-3xl font-bold mb-3 tracking-tight">{Number(dashboardMetrics?.taxa_conversao || 0).toFixed(1) || '0.0'}%</p>
              <div className="flex items-center gap-1.5 text-sm">
                <div className="flex items-center gap-1 bg-[#4ADE80]/10 px-2 py-0.5 rounded-full">
                  <ArrowUp className="h-3.5 w-3.5 text-[#4ADE80]" />
                  <span className="text-[#4ADE80] font-medium text-xs">
                    {dashboardMetrics?.leads_fechados || 0} fechados
                  </span>
                </div>
                <span className="text-[#52525B] text-xs">de {dashboardMetrics?.total_leads || 0}</span>
              </div>
              <div className="mt-3 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(dashboardMetrics?.taxa_conversao || 0, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Reunioes Agendadas */}
            <div className="group relative bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl p-5 border border-white/[0.06] hover:border-[#A78BFA]/20 transition-all duration-300 hover:shadow-lg hover:shadow-[#A78BFA]/[0.03] overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#A78BFA]/[0.06] to-transparent rounded-bl-full"></div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#71717A] text-sm font-medium">Reunioes Agendadas</p>
                <div className="w-9 h-9 rounded-xl bg-[#A78BFA]/10 flex items-center justify-center ring-1 ring-[#A78BFA]/20">
                  <Calendar className="h-4 w-4 text-[#A78BFA]" />
                </div>
              </div>
              <p className="text-white text-3xl font-bold mb-3 tracking-tight">{dashboardMetrics?.reunioes_agendadas || 0}</p>
              <div className="flex items-center gap-1.5 text-sm">
                <div className="flex items-center gap-1 bg-[#4ADE80]/10 px-2 py-0.5 rounded-full">
                  <ArrowUp className="h-3.5 w-3.5 text-[#4ADE80]" />
                  <span className="text-[#4ADE80] font-medium text-xs">
                    {dashboardMetrics?.leads_em_andamento || 0} em andamento
                  </span>
                </div>
                <span className="text-[#52525B] text-xs">+ {dashboardMetrics?.leads_em_qualificacao || 0} qual.</span>
              </div>
              <div className="mt-3 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#A78BFA] to-[#8B5CF6] rounded-full transition-all duration-700"
                  style={{ width: `${dashboardMetrics?.total_leads ? Math.min(((dashboardMetrics.reunioes_agendadas || 0) / dashboardMetrics.total_leads) * 100, 100) : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Receita Gerada */}
            <div className="group relative bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl p-5 border border-white/[0.06] hover:border-[#FACC15]/20 transition-all duration-300 hover:shadow-lg hover:shadow-[#FACC15]/[0.03] overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#FACC15]/[0.06] to-transparent rounded-bl-full"></div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#71717A] text-sm font-medium">Receita Gerada</p>
                <div className="w-9 h-9 rounded-xl bg-[#FACC15]/10 flex items-center justify-center ring-1 ring-[#FACC15]/20">
                  <DollarSign className="h-4 w-4 text-[#FACC15]" />
                </div>
              </div>
              <p className="text-white text-3xl font-bold mb-3 tracking-tight">
                R$ {dashboardMetrics?.receita_total?.toLocaleString('pt-BR') || '0'}
              </p>
              <div className="flex items-center gap-1.5 text-sm">
                <div className="flex items-center gap-1 bg-[#4ADE80]/10 px-2 py-0.5 rounded-full">
                  <TrendingUp className="h-3.5 w-3.5 text-[#4ADE80]" />
                  <span className="text-[#4ADE80] font-medium text-xs">
                    R$ {dashboardMetrics?.valor_potencial_total?.toLocaleString('pt-BR') || '0'}
                  </span>
                </div>
                <span className="text-[#52525B] text-xs">potencial</span>
              </div>
              <div className="mt-3 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#FACC15] to-[#EAB308] rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(dashboardMetrics?.percentual_meta || 0, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Sales KPI Cards - Valor Vendido, Arrecadado, Comissao */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Valor Vendido */}
            <div className="group relative bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl p-5 border border-white/[0.06] hover:border-[#4ADE80]/20 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#4ADE80]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#4ADE80]/10 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-[#4ADE80]" />
                  </div>
                  <p className="text-[#71717A] text-sm font-medium">Valor Vendido</p>
                </div>
                <p className="text-white text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
                  R$ {salesMetrics.valorVendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm">
                    <TrendingUp className="h-3.5 w-3.5 text-[#4ADE80]" />
                    <span className="text-[#4ADE80] font-medium">{salesMetrics.totalVendas} vendas</span>
                    <span className="text-[#52525B]">realizadas</span>
                  </div>
                </div>
                {/* Mini sparkline-style bar */}
                <div className="mt-3 flex items-end gap-[2px] h-6">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                    <div key={i} className="flex-1 bg-[#4ADE80]/20 rounded-sm transition-all duration-300 group-hover:bg-[#4ADE80]/30" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Valor Arrecadado */}
            <div className="group relative bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl p-5 border border-white/[0.06] hover:border-[#4ADE80]/20 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#4ADE80]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#4ADE80]/10 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-[#4ADE80]" />
                  </div>
                  <p className="text-[#71717A] text-sm font-medium">Valor Arrecadado</p>
                </div>
                <p className="text-white text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
                  R$ {salesMetrics.valorArrecadado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-1.5 text-sm">
                  <TrendingUp className="h-3.5 w-3.5 text-[#4ADE80]" />
                  <span className="text-[#4ADE80] font-medium">
                    {salesMetrics.valorVendido > 0
                      ? ((salesMetrics.valorArrecadado / salesMetrics.valorVendido) * 100).toFixed(0)
                      : '0'}%
                  </span>
                  <span className="text-[#52525B]">do valor vendido</span>
                </div>
                {/* Progress ring indicator */}
                <div className="mt-3 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#4ADE80] to-[#10B981] rounded-full transition-all duration-700"
                    style={{ width: `${salesMetrics.valorVendido > 0 ? Math.min((salesMetrics.valorArrecadado / salesMetrics.valorVendido) * 100, 100) : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Comissao */}
            <div className="group relative bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl p-5 border border-white/[0.06] hover:border-[#FACC15]/20 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FACC15]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FACC15]/10 flex items-center justify-center">
                    <Award className="h-4 w-4 text-[#FACC15]" />
                  </div>
                  <p className="text-[#71717A] text-sm font-medium">Comissao</p>
                </div>
                <p className="text-[#FACC15] text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
                  R$ {salesMetrics.comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-1.5 text-sm">
                  <TrendingUp className="h-3.5 w-3.5 text-[#FACC15]" />
                  <span className="text-[#FACC15] font-medium">
                    {salesMetrics.valorVendido > 0
                      ? ((salesMetrics.comissaoTotal / salesMetrics.valorVendido) * 100).toFixed(1)
                      : '0'}%
                  </span>
                  <span className="text-[#52525B]">do valor vendido</span>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#FACC15] to-[#EAB308] rounded-full transition-all duration-700"
                    style={{ width: `${salesMetrics.valorVendido > 0 ? Math.min((salesMetrics.comissaoTotal / salesMetrics.valorVendido) * 100, 100) : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo Section */}
          <div className="bg-gradient-to-r from-[#4ADE80]/[0.06] via-[#1A1A1A] to-[#1A1A1A] rounded-2xl p-5 border border-[#4ADE80]/10 mb-8">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#4ADE80]/15 flex items-center justify-center">
                <Zap className="h-4 w-4 text-[#4ADE80]" />
              </div>
              <h3 className="text-white font-semibold">Resumo de Performance</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02]">
                <div className="w-2 h-2 rounded-full bg-[#4ADE80] mt-1.5 shrink-0"></div>
                <div>
                  <p className="text-[#A1A1AA] text-sm">
                    Voce contatou <span className="text-white font-semibold">{dashboardMetrics?.leads_atendidos || 0}</span> de {dashboardMetrics?.total_leads || 0} leads atribuidos.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02]">
                <div className="w-2 h-2 rounded-full bg-[#60A5FA] mt-1.5 shrink-0"></div>
                <div>
                  <p className="text-[#A1A1AA] text-sm">
                    Taxa de conversao atual: <span className="text-white font-semibold">{Number(dashboardMetrics?.taxa_conversao || 0).toFixed(1) || '0'}%</span>.
                    {(dashboardMetrics?.taxa_conversao || 0) >= 20
                      ? <span className="text-[#4ADE80]"> Excelente!</span>
                      : (dashboardMetrics?.taxa_conversao || 0) >= 10
                        ? <span className="text-[#FACC15]"> Continue melhorando.</span>
                        : <span className="text-[#EF4444]"> Precisa de atencao.</span>
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02]">
                <div className="w-2 h-2 rounded-full bg-[#FACC15] mt-1.5 shrink-0"></div>
                <div>
                  <p className="text-[#A1A1AA] text-sm">
                    Meta mensal: <span className="text-white font-semibold">{Number(dashboardMetrics?.percentual_meta || 0).toFixed(0) || '0'}%</span> atingida.
                    {(dashboardMetrics?.percentual_meta || 0) >= 100
                      ? <span className="text-[#4ADE80]"> Meta batida!</span>
                      : <span className="text-[#71717A]"> Faltam R$ {((dashboardMetrics?.meta_mensal || 500000) - (dashboardMetrics?.receita_total || 0)).toLocaleString('pt-BR')}.</span>
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02]">
                <div className="w-2 h-2 rounded-full bg-[#A78BFA] mt-1.5 shrink-0"></div>
                <div>
                  <p className="text-[#A1A1AA] text-sm">
                    Comissao acumulada: <span className="text-[#FACC15] font-semibold">R$ {salesMetrics.comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> em {salesMetrics.totalVendas} vendas.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance e Mini Cards */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-8">
            {/* Performance por Closer */}
            <div className="xl:col-span-2 bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl p-6 border border-white/[0.06]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#4ADE80]/20 to-[#059669]/10 rounded-xl flex items-center justify-center ring-1 ring-[#4ADE80]/20">
                    <BarChart3 className="h-5 w-5 text-[#4ADE80]" />
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-semibold">Performance por Closer</h3>
                    <p className="text-[#52525B] text-sm">Receita total da equipe</p>
                  </div>
                </div>
                <p className="text-white text-2xl font-bold tracking-tight">R$ {dashboardMetrics?.receita_total?.toLocaleString('pt-BR') || '0'}</p>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Styled donut chart with CSS conic-gradient */}
                <div className="relative flex-shrink-0">
                  <div className="w-40 h-40 rounded-full relative"
                    style={{
                      background: (() => {
                        const sorted = [...teamMembers].sort((a, b) => b.receita_gerada - a.receita_gerada).slice(0, 4);
                        const totalReceita = sorted.reduce((sum, m) => sum + m.receita_gerada, 0);
                        if (totalReceita === 0) return 'conic-gradient(#27272A 0deg 360deg)';
                        const colors = ['#4ADE80', '#3B82F6', '#FACC15', '#A78BFA'];
                        let segments: string[] = [];
                        let currentDeg = 0;
                        sorted.forEach((member, i) => {
                          const deg = (member.receita_gerada / totalReceita) * 360;
                          segments.push(`${colors[i]} ${currentDeg}deg ${currentDeg + deg}deg`);
                          currentDeg += deg;
                        });
                        if (currentDeg < 360) {
                          segments.push(`#27272A ${currentDeg}deg 360deg`);
                        }
                        return `conic-gradient(${segments.join(', ')})`;
                      })()
                    }}
                  >
                    <div className="absolute inset-3 bg-[#1A1A1A] rounded-full flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-white text-2xl font-bold">{dashboardMetrics?.total_leads || 0}</p>
                        <p className="text-[#52525B] text-[10px] uppercase tracking-wider font-medium">Leads Totais</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend with bars */}
                <div className="flex-1 w-full space-y-3">
                  {teamMembers
                    .sort((a, b) => b.receita_gerada - a.receita_gerada)
                    .slice(0, 4)
                    .map((member, index) => {
                      const colors = ['#4ADE80', '#3B82F6', '#FACC15', '#A78BFA'];
                      const totalReceita = teamMembers.reduce((sum, m) => sum + m.receita_gerada, 0);
                      const percent = totalReceita > 0 ? (member.receita_gerada / totalReceita) * 100 : 0;
                      return (
                        <div key={member.id} className="group">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[index] }}></div>
                              <span className="text-[#A1A1AA] text-sm group-hover:text-white transition-colors">{member.nome_completo}</span>
                            </div>
                            <span className="text-white text-sm font-medium">R$ {member.receita_gerada.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="ml-5 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${percent}%`, backgroundColor: colors[index] }}></div>
                          </div>
                        </div>
                      );
                    })}
                  {teamMembers.length === 0 && (
                    <div className="text-[#52525B] text-sm text-center py-8">
                      Nenhum dado de receita disponivel
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.04]">
                <p className="text-[#52525B] text-sm">Total Vendas Equipe</p>
                <p className="text-white text-sm font-semibold">R$ {dashboardMetrics?.receita_total?.toLocaleString('pt-BR') || '0'}</p>
              </div>
            </div>

            {/* Mini Cards */}
            <div className="space-y-5">
              {/* Novos Leads Hoje */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl p-5 border border-white/[0.06]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#4ADE80]/20 to-[#059669]/10 rounded-xl flex items-center justify-center ring-1 ring-[#4ADE80]/20">
                      <Users className="h-5 w-5 text-[#4ADE80]" />
                    </div>
                    <h4 className="text-white font-medium">Novos Leads Hoje</h4>
                  </div>
                </div>
                <div className="flex items-end justify-between mb-3">
                  <p className="text-white text-3xl font-bold tracking-tight">{dashboardMetrics?.leads_hoje || 0}</p>
                  <div className="flex items-center gap-1 bg-[#4ADE80]/10 px-2 py-0.5 rounded-full">
                    <TrendingUp className="h-3 w-3 text-[#4ADE80]" />
                    <span className="text-[#4ADE80] text-xs font-medium">
                      {dashboardMetrics?.total_leads ?
                        ((dashboardMetrics.leads_hoje / dashboardMetrics.total_leads) * 100).toFixed(1) : '0'
                      }%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#4ADE80] to-[#10B981] rounded-full transition-all duration-700"
                    style={{
                      width: `${dashboardMetrics?.total_leads ?
                        Math.min((dashboardMetrics.leads_hoje / dashboardMetrics.total_leads) * 100, 100) : 0
                      }%`
                    }}
                  ></div>
                </div>
                <p className="text-[#52525B] text-xs mt-2">do total de leads</p>
              </div>

              {/* Meta Mensal */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl p-5 border border-white/[0.06]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#FACC15]/20 to-[#EAB308]/10 rounded-xl flex items-center justify-center ring-1 ring-[#FACC15]/20">
                      <Target className="h-5 w-5 text-[#FACC15]" />
                    </div>
                    <h4 className="text-white font-medium">Meta Mensal</h4>
                  </div>
                </div>
                <p className="text-white text-lg font-bold mb-1">
                  R$ {dashboardMetrics?.receita_total?.toLocaleString('pt-BR') || '0'}
                </p>
                <p className="text-[#52525B] text-xs mb-3">de R$ {dashboardMetrics?.meta_mensal?.toLocaleString('pt-BR') || '500.000'}</p>
                <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(dashboardMetrics?.percentual_meta || 0, 100)}%`,
                      background: (dashboardMetrics?.percentual_meta || 0) >= 80
                        ? 'linear-gradient(to right, #4ADE80, #10B981)'
                        : (dashboardMetrics?.percentual_meta || 0) >= 50
                          ? 'linear-gradient(to right, #FACC15, #EAB308)'
                          : 'linear-gradient(to right, #EF4444, #DC2626)'
                    }}
                  ></div>
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-semibold ${
                    (dashboardMetrics?.percentual_meta || 0) >= 80 ? 'text-[#4ADE80]' :
                    (dashboardMetrics?.percentual_meta || 0) >= 50 ? 'text-[#FACC15]' : 'text-[#EF4444]'
                  }`}>
                    {Number(dashboardMetrics?.percentual_meta || 0).toFixed(1) || '0'}% atingido
                  </p>
                  {(dashboardMetrics?.percentual_meta || 0) >= 100 && (
                    <span className="text-[10px] bg-[#4ADE80]/15 text-[#4ADE80] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Meta Batida</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Closers */}
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] rounded-xl flex items-center justify-center ring-1 ring-white/[0.08]">
                  <Users className="h-5 w-5 text-[#A1A1AA]" />
                </div>
                <div>
                  <h3 className="text-white text-lg font-semibold">Lista de Closers/SDRs</h3>
                  <p className="text-[#52525B] text-sm">{teamMembers.length} membros da equipe</p>
                </div>
              </div>
              <button className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors">
                <MoreHorizontal className="h-4 w-4 text-[#71717A]" />
              </button>
            </div>

            {/* Mobile Cards for smaller screens */}
            <div className="block md:hidden px-5 pb-5 space-y-3">
              {teamMembers.map((member, index) => {
                const avatarColors = ['bg-[#4ADE80]/20 text-[#4ADE80]', 'bg-[#60A5FA]/20 text-[#60A5FA]', 'bg-[#FACC15]/20 text-[#FACC15]', 'bg-[#A78BFA]/20 text-[#A78BFA]', 'bg-[#F472B6]/20 text-[#F472B6]'];
                const colorClass = avatarColors[index % avatarColors.length];
                const initials = member.nome_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <div key={member.id} className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${colorClass}`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{member.nome_completo}</p>
                        <p className="text-[#52525B] text-xs truncate">{member.email || `user${index + 1}@empresa.com`}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        member.tipo_closer === 'closer' || member.tipo_closer === 'closer_senior'
                          ? 'bg-[#4ADE80]/10 text-[#4ADE80] ring-1 ring-[#4ADE80]/20'
                          : 'bg-[#60A5FA]/10 text-[#60A5FA] ring-1 ring-[#60A5FA]/20'
                      }`}>
                        {member.tipo_closer === 'closer' || member.tipo_closer === 'closer_senior' ? 'Closer' : 'SDR'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white/[0.02] rounded-lg p-2.5">
                        <span className="text-[#52525B] text-xs block mb-0.5">Leads</span>
                        <span className="text-white font-semibold">{member.leads_atribuidos}</span>
                      </div>
                      <div className="bg-white/[0.02] rounded-lg p-2.5">
                        <span className="text-[#52525B] text-xs block mb-0.5">Conversoes</span>
                        <span className="text-white font-semibold">{member.conversoes}</span>
                      </div>
                      <div className="bg-white/[0.02] rounded-lg p-2.5">
                        <span className="text-[#52525B] text-xs block mb-0.5">Taxa Conv.</span>
                        <span className={`font-bold ${
                          member.taxa_conversao >= 20 ? 'text-[#4ADE80]' :
                          member.taxa_conversao >= 15 ? 'text-[#FBBF24]' : 'text-[#EF4444]'
                        }`}>
                          {member.taxa_conversao}%
                        </span>
                      </div>
                      <div className="bg-white/[0.02] rounded-lg p-2.5">
                        <span className="text-[#52525B] text-xs block mb-0.5">Receita</span>
                        <span className="text-white font-semibold text-xs">R$ {member.receita_gerada.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        member.status === 'Ativo' ? 'bg-[#4ADE80]/10 text-[#4ADE80]' :
                        member.status === 'Em pausa' ? 'bg-[#FBBF24]/10 text-[#FBBF24]' : 'bg-[#EF4444]/10 text-[#EF4444]'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          member.status === 'Ativo' ? 'bg-[#4ADE80]' :
                          member.status === 'Em pausa' ? 'bg-[#FBBF24]' : 'bg-[#EF4444]'
                        }`}></span>
                        {member.status}
                      </span>
                      {/* Mini conversion bar */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            member.taxa_conversao >= 20 ? 'bg-[#4ADE80]' :
                            member.taxa_conversao >= 15 ? 'bg-[#FBBF24]' : 'bg-[#EF4444]'
                          }`} style={{ width: `${Math.min(member.taxa_conversao, 100)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table for larger screens */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-3 px-6 text-[#52525B] text-[10px] uppercase tracking-[0.15em] font-semibold">Nome</th>
                    <th className="text-left py-3 px-4 text-[#52525B] text-[10px] uppercase tracking-[0.15em] font-semibold">Cargo</th>
                    <th className="text-left py-3 px-4 text-[#52525B] text-[10px] uppercase tracking-[0.15em] font-semibold">Leads</th>
                    <th className="text-left py-3 px-4 text-[#52525B] text-[10px] uppercase tracking-[0.15em] font-semibold">Conversoes</th>
                    <th className="text-left py-3 px-4 text-[#52525B] text-[10px] uppercase tracking-[0.15em] font-semibold">Taxa Conv.</th>
                    <th className="text-left py-3 px-4 text-[#52525B] text-[10px] uppercase tracking-[0.15em] font-semibold">Receita</th>
                    <th className="text-left py-3 px-4 text-[#52525B] text-[10px] uppercase tracking-[0.15em] font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member, index) => {
                    const avatarColors = ['bg-[#4ADE80]/20 text-[#4ADE80]', 'bg-[#60A5FA]/20 text-[#60A5FA]', 'bg-[#FACC15]/20 text-[#FACC15]', 'bg-[#A78BFA]/20 text-[#A78BFA]', 'bg-[#F472B6]/20 text-[#F472B6]'];
                    const colorClass = avatarColors[index % avatarColors.length];
                    const initials = member.nome_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                    return (
                      <tr key={member.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${colorClass}`}>
                              {initials}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium group-hover:text-[#4ADE80] transition-colors">{member.nome_completo}</p>
                              <p className="text-[#52525B] text-xs">{member.email || `user${index + 1}@empresa.com`}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            member.tipo_closer === 'closer' || member.tipo_closer === 'closer_senior'
                              ? 'bg-[#4ADE80]/10 text-[#4ADE80]'
                              : 'bg-[#60A5FA]/10 text-[#60A5FA]'
                          }`}>
                            {member.tipo_closer === 'closer' || member.tipo_closer === 'closer_senior' ? 'Closer' : 'SDR'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-white text-sm font-medium">{member.leads_atribuidos}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-medium">{member.conversoes}</span>
                            {/* Sparkline indicator */}
                            <div className="flex items-end gap-[1px] h-3">
                              {[30, 60, 40, 80, 50, 70].map((h, i) => (
                                <div key={i} className="w-[3px] rounded-sm bg-[#4ADE80]/30" style={{ height: `${h}%` }}></div>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${
                              member.taxa_conversao >= 20 ? 'text-[#4ADE80]' :
                              member.taxa_conversao >= 15 ? 'text-[#FBBF24]' : 'text-[#EF4444]'
                            }`}>
                              {member.taxa_conversao}%
                            </span>
                            <div className="w-12 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${
                                member.taxa_conversao >= 20 ? 'bg-[#4ADE80]' :
                                member.taxa_conversao >= 15 ? 'bg-[#FBBF24]' : 'bg-[#EF4444]'
                              }`} style={{ width: `${Math.min(member.taxa_conversao, 100)}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-white text-sm font-medium">R$ {member.receita_gerada.toLocaleString('pt-BR')}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            member.status === 'Ativo' ? 'bg-[#4ADE80]/10 text-[#4ADE80]' :
                            member.status === 'Em pausa' ? 'bg-[#FBBF24]/10 text-[#FBBF24]' : 'bg-[#EF4444]/10 text-[#EF4444]'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              member.status === 'Ativo' ? 'bg-[#4ADE80] shadow-sm shadow-[#4ADE80]/50' :
                              member.status === 'Em pausa' ? 'bg-[#FBBF24]' : 'bg-[#EF4444]'
                            }`}></span>
                            {member.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Sidebar Direita */}
      <aside className="hidden xl:block w-80 bg-[#0A0A0A] border-l border-white/[0.06] overflow-y-auto">
        <div className="p-6">
          {/* Notificacoes */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-sm font-semibold uppercase tracking-wider">Notificacoes</h3>
              <span className="text-[10px] bg-[#4ADE80]/15 text-[#4ADE80] px-2 py-0.5 rounded-full font-bold">3 novas</span>
            </div>
            <div className="space-y-2.5">
              <div className="group p-3.5 bg-gradient-to-r from-[#4ADE80]/[0.06] to-transparent rounded-xl border border-[#4ADE80]/10 hover:border-[#4ADE80]/20 transition-all duration-200 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#4ADE80]/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="h-4 w-4 text-[#4ADE80]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">34 Novos leads atribuidos</p>
                    <p className="text-[#52525B] text-xs mt-1">Agora</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-[#4ADE80] shrink-0 mt-1.5 shadow-sm shadow-[#4ADE80]/50"></div>
                </div>
              </div>
              <div className="group p-3.5 bg-gradient-to-r from-[#60A5FA]/[0.04] to-transparent rounded-xl border border-white/[0.04] hover:border-[#60A5FA]/20 transition-all duration-200 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#60A5FA]/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="h-4 w-4 text-[#60A5FA]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#A1A1AA] text-sm">15 Reunioes confirmadas</p>
                    <p className="text-[#52525B] text-xs mt-1">2h atras</p>
                  </div>
                </div>
              </div>
              <div className="group p-3.5 bg-gradient-to-r from-[#FACC15]/[0.04] to-transparent rounded-xl border border-white/[0.04] hover:border-[#FACC15]/20 transition-all duration-200 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FACC15]/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Award className="h-4 w-4 text-[#FACC15]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#A1A1AA] text-sm">Meta semanal atingida por Joao Silva</p>
                    <p className="text-[#52525B] text-xs mt-1">5h atras</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-8"></div>

          {/* Atividades Recentes - Timeline style */}
          <div className="mb-8">
            <h3 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">Atividades</h3>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-[#4ADE80]/30 via-white/[0.06] to-transparent"></div>
              <div className="space-y-4">
                {recentActivities.slice(0, 4).map((activity, idx) => (
                  <div key={activity.id} className="relative flex items-start gap-4 pl-1">
                    {/* Timeline dot */}
                    <div className={`relative z-10 w-[10px] h-[10px] rounded-full shrink-0 mt-1.5 ring-2 ring-[#0A0A0A] ${
                      idx === 0 ? 'bg-[#4ADE80] shadow-sm shadow-[#4ADE80]/50' : 'bg-[#3F3F46]'
                    }`}></div>
                    <div className="flex-1 min-w-0 pb-1">
                      <p className={`text-sm leading-relaxed ${idx === 0 ? 'text-white' : 'text-[#A1A1AA]'}`}>{activity.descricao}</p>
                      <p className="text-[#52525B] text-xs mt-1 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {new Date(activity.data_atividade).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
                {recentActivities.length === 0 && (
                  <p className="text-[#52525B] text-sm text-center py-4 pl-8">Nenhuma atividade recente</p>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-8"></div>

          {/* Top Performers */}
          <div className="mb-8">
            <h3 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">Top Performers</h3>
            <div className="space-y-2.5">
              {teamMembers
                .sort((a, b) => b.receita_gerada - a.receita_gerada)
                .slice(0, 4)
                .map((member, index) => {
                  const medals = ['bg-gradient-to-r from-[#FACC15] to-[#F59E0B] text-black', 'bg-gradient-to-r from-[#94A3B8] to-[#64748B] text-white', 'bg-gradient-to-r from-[#D97706] to-[#B45309] text-white', 'bg-white/[0.06] text-[#A1A1AA]'];
                  const avatarColors = ['bg-[#FACC15]/20 text-[#FACC15]', 'bg-[#94A3B8]/20 text-[#94A3B8]', 'bg-[#D97706]/20 text-[#D97706]', 'bg-white/[0.06] text-[#A1A1AA]'];
                  const initials = member.nome_completo.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                  return (
                    <div key={member.id} className={`p-3.5 rounded-xl transition-all duration-200 cursor-pointer ${
                      index === 0
                        ? 'bg-gradient-to-r from-[#FACC15]/[0.08] to-transparent border border-[#FACC15]/15 hover:border-[#FACC15]/30'
                        : 'bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.04]'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${avatarColors[index]}`}>
                            {initials}
                          </div>
                          <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${medals[index]}`}>
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{member.nome_completo}</p>
                          <p className="text-[#52525B] text-xs">R$ {member.receita_gerada.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className={`h-3 w-3 ${index === 0 ? 'text-[#FACC15]' : 'text-[#4ADE80]'}`} />
                          <span className={`text-xs font-medium ${index === 0 ? 'text-[#FACC15]' : 'text-[#4ADE80]'}`}>
                            {member.taxa_conversao}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
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