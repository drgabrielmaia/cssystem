'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { KPICardVibrant } from '@/components/ui/kpi-card-vibrant'
import { MetricCard } from '@/components/ui/metric-card'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { ChartCard } from '@/components/ui/chart-card'
import { supabase } from '@/lib/supabase'
import {
  Users,
  TrendingUp,
  Calendar,
  Star,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  ExternalLink,
  CheckCircle,
  RefreshCw,
  Download,
  UserCheck,
  UserX
} from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

interface Mentorado {
  id: string
  nome_completo: string
  email: string
  telefone?: string
  data_entrada: string
  estado_atual: string
  turma?: string
  nivel?: string
  pontuacao?: number
  observacoes_privadas?: string
  created_at: string
  updated_at: string
}

interface MentoradoStats {
  total_mentorados: number
  ativos: number
  inativos: number
  novos_mes: number
  taxa_retencao: number
  pontuacao_media: number
  checkins_pendentes: number
}

export default function MentoradosPage() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [stats, setStats] = useState<MentoradoStats>({
    total_mentorados: 0,
    ativos: 0,
    inativos: 0,
    novos_mes: 0,
    taxa_retencao: 0,
    pontuacao_media: 0,
    checkins_pendentes: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [turmaFilter, setTurmaFilter] = useState('todas')
  const [nivelFilter, setNivelFilter] = useState('todos')
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    turma: '',
    nivel: 'iniciante',
    estado_atual: 'ativo',
    observacoes_privadas: ''
  })

  const statusMap = {
    ativo: 'confirmed',
    inativo: 'cancelled',
    engajado: 'completed',
    cancelado: 'cancelled'
  }

  const monthlyData = [
    { month: 'Jul', novos: 8, ativos: 65 },
    { month: 'Ago', novos: 12, ativos: 72 },
    { month: 'Set', novos: 15, ativos: 78 },
    { month: 'Out', novos: 18, ativos: 85 },
    { month: 'Nov', novos: 22, ativos: 92 },
    { month: 'Dez', novos: 25, ativos: 98 }
  ]

  const levelDistribution = [
    { name: 'Iniciante', value: 35, color: '#3B82F6' },
    { name: 'Intermediário', value: 40, color: '#059669' },
    { name: 'Avançado', value: 20, color: '#F59E0B' },
    { name: 'Expert', value: 5, color: '#8B5CF6' }
  ]

  useEffect(() => {
    loadMentorados()
    loadStats()
  }, [])

  useEffect(() => {
    if (!loading) {
      setIsLoadingData(true)
      loadMentorados()
    }
  }, [statusFilter, turmaFilter, nivelFilter])

  const loadMentorados = async () => {
    try {
      let query = supabase
        .from('mentorados')
        .select('*')

      if (statusFilter !== 'todos') {
        query = query.eq('estado_atual', statusFilter)
      }

      if (turmaFilter !== 'todas') {
        query = query.eq('turma', turmaFilter)
      }

      if (nivelFilter !== 'todos') {
        query = query.eq('nivel', nivelFilter)
      }

      const { data, error } = await query.order('nome_completo', { ascending: true })

      if (error) throw error
      setMentorados(data || [])
    } catch (error) {
      console.error('Erro ao carregar mentorados:', error)
    } finally {
      setLoading(false)
      setIsLoadingData(false)
    }
  }

  const loadStats = async () => {
    try {
      const { data: mentorados } = await supabase.from('mentorados').select('*')

      if (mentorados) {
        const hoje = new Date()
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

        const ativos = mentorados.filter(m => m.estado_atual === 'ativo')
        const inativos = mentorados.filter(m => m.estado_atual === 'inativo')
        const novosMes = mentorados.filter(m => new Date(m.created_at) >= inicioMes)
        const pontuacaoMedia = mentorados.length > 0
          ? mentorados.reduce((sum, m) => sum + (m.pontuacao || 0), 0) / mentorados.length
          : 0

        setStats({
          total_mentorados: mentorados.length,
          ativos: ativos.length,
          inativos: inativos.length,
          novos_mes: novosMes.length,
          taxa_retencao: mentorados.length > 0 ? (ativos.length / mentorados.length) * 100 : 0,
          pontuacao_media: pontuacaoMedia,
          checkins_pendentes: 12 // TODO: Implementar contagem real de check-ins pendentes
        })
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const filteredMentorados = mentorados.filter(mentorado => {
    return searchTerm === '' ||
      mentorado.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentorado.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentorado.telefone?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const availableTurmas = Array.from(new Set(mentorados.map(m => m.turma).filter(Boolean)))
  const availableNiveis = Array.from(new Set(mentorados.map(m => m.nivel).filter(Boolean)))

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const handleNewMentorado = () => {
    setFormData({
      nome_completo: '',
      email: '',
      telefone: '',
      turma: '',
      nivel: 'iniciante',
      estado_atual: 'ativo',
      observacoes_privadas: ''
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setFormData({
      nome_completo: '',
      email: '',
      telefone: '',
      turma: '',
      nivel: 'iniciante',
      estado_atual: 'ativo',
      observacoes_privadas: ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome_completo || !formData.email) {
      alert('Nome completo e email são obrigatórios')
      return
    }

    try {
      setIsLoadingData(true)
      const { error } = await supabase
        .from('mentorados')
        .insert([{
          ...formData,
          data_entrada: new Date().toISOString()
        }])

      if (error) throw error

      await loadMentorados()
      await loadStats()
      handleCloseModal()
    } catch (error) {
      console.error('Erro ao criar mentorado:', error)
      alert('Erro ao criar mentorado. Tente novamente.')
      setIsLoadingData(false)
    }
  }

  const handleEditMentorado = (mentorado: Mentorado) => {
    // Redirecionar para página de edição do mentorado
    window.location.href = `/mentorados/${mentorado.id}/edit`
  }

  const handleViewMentorado = (mentorado: Mentorado) => {
    // Redirecionar para página de detalhes do mentorado
    window.location.href = `/mentorados/${mentorado.id}`
  }

  const handleDeleteMentorado = async (mentoradoId: string) => {
    if (confirm('Tem certeza que deseja excluir este mentorado?')) {
      try {
        setIsLoadingData(true)
        const { error } = await supabase
          .from('mentorados')
          .delete()
          .eq('id', mentoradoId)

        if (error) throw error

        await loadMentorados()
        await loadStats()
      } catch (error) {
        console.error('Erro ao excluir mentorado:', error)
        setIsLoadingData(false)
      }
    }
  }

  const handleToggleStatus = async (mentoradoId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo'
    try {
      setIsLoadingData(true)
      const { error } = await supabase
        .from('mentorados')
        .update({ estado_atual: newStatus })
        .eq('id', mentoradoId)

      if (error) throw error

      await loadMentorados()
      await loadStats()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      setIsLoadingData(false)
    }
  }

  if (loading) {
    return (
      <PageLayout title="Mentorados" subtitle="Carregando...">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#059669]"></div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Mentorados" subtitle="Gestão de mentorados e acompanhamento">
      {/* KPI Cards - Grid responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICardVibrant
          title="Total Mentorados"
          value={stats.total_mentorados.toString()}
          subtitle="Este mês"
          percentage={12}
          trend="up"
          color="blue"
          icon={Users}
          sparklineData={[
            { value: 65 }, { value: 72 }, { value: 78 }, { value: 85 },
            { value: 92 }, { value: 95 }, { value: 96 }, { value: stats.total_mentorados }
          ]}
        />
        <MetricCard
          title="Ativos"
          value={stats.ativos.toString()}
          change={8}
          changeType="increase"
          icon={UserCheck}
          iconColor="green"
        />
        <MetricCard
          title="Taxa de Retenção"
          value={`${stats.taxa_retencao.toFixed(1)}%`}
          change={2.3}
          changeType="increase"
          icon={TrendingUp}
          iconColor="purple"
        />
        <MetricCard
          title="Pontuação Média"
          value={stats.pontuacao_media.toFixed(1)}
          change={0.5}
          changeType="increase"
          icon={Star}
          iconColor="orange"
        />
      </div>

      {/* Alerta para check-ins pendentes */}
      {stats.checkins_pendentes > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-semibold text-blue-800">Check-ins Pendentes</p>
              <p className="text-sm text-blue-700">
                {stats.checkins_pendentes} mentorado{stats.checkins_pendentes > 1 ? 's' : ''} com check-in pendente
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos - Grid responsivo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Gráfico de Evolução */}
        <div className="lg:col-span-2">
          <ChartCard title="Evolução dos Mentorados" subtitle="Últimos 6 meses">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorMentorados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} />
                  <YAxis stroke="#94A3B8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.08)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ativos"
                    stroke="#059669"
                    fillOpacity={1}
                    fill="url(#colorMentorados)"
                    strokeWidth={3}
                  />
                  <Area
                    type="monotone"
                    dataKey="novos"
                    stroke="#10B981"
                    fillOpacity={0.5}
                    fill="#10B981"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Gráfico de Níveis */}
        <ChartCard title="Distribuição por Nível" subtitle="Níveis dos mentorados">
          <div className="h-80 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="70%">
              <PieChart>
                <Pie
                  data={levelDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {levelDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.08)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 w-full mt-4">
              {levelDistribution.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-[#475569] font-medium">
                    {entry.name}: {entry.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Ações e Filtros - Responsivo */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-0 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94A3B8] w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar mentorados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all w-full sm:w-80"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
          >
            <option value="todos">Todos os Status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>

          {availableTurmas.length > 0 && (
            <select
              value={turmaFilter}
              onChange={(e) => setTurmaFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
            >
              <option value="todas">Todas as Turmas</option>
              {availableTurmas.map(turma => (
                <option key={turma} value={turma}>{turma}</option>
              ))}
            </select>
          )}

          {availableNiveis.length > 0 && (
            <select
              value={nivelFilter}
              onChange={(e) => setNivelFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
            >
              <option value="todos">Todos os Níveis</option>
              {availableNiveis.map(nivel => (
                <option key={nivel} value={nivel}>{nivel}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={loadMentorados}
            className="flex items-center gap-2 px-4 py-2 text-[#475569] hover:bg-[#F1F5F9] rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-[#475569] hover:bg-[#F1F5F9] rounded-xl transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={handleNewMentorado}
            className="flex items-center gap-2 px-6 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Mentorado
          </button>
        </div>
      </div>

      {/* Loading indicator para filtros */}
      {isLoadingData && (
        <div className="flex items-center justify-center py-4 mb-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-sm border border-[#E2E8F0]">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#059669]"></div>
            <span className="text-sm text-[#475569]">Atualizando filtros...</span>
          </div>
        </div>
      )}

      {/* Tabela de Mentorados */}
      <DataTable
        title="Lista de Mentorados"
        columns={[
          {
            header: 'Mentorado',
            render: (mentorado) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center text-white font-semibold text-sm">
                  {mentorado.nome_completo?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'ND'}
                </div>
                <div>
                  <p className="font-semibold text-[#0F172A]">{mentorado.nome_completo || 'Nome não encontrado'}</p>
                  <p className="text-sm text-[#94A3B8]">{mentorado.email || 'Email não encontrado'}</p>
                </div>
              </div>
            )
          },
          {
            header: 'Turma/Nível',
            render: (mentorado) => (
              <div>
                <p className="font-medium text-[#0F172A]">{mentorado.turma || '-'}</p>
                <p className="text-sm text-[#94A3B8]">{mentorado.nivel || '-'}</p>
              </div>
            )
          },
          {
            header: 'Data de Entrada',
            render: (mentorado) => (
              <span className="text-sm text-[#475569]">{formatDate(mentorado.data_entrada || mentorado.created_at)}</span>
            )
          },
          {
            header: 'Status',
            render: (mentorado) => <StatusBadge status={(statusMap as any)[mentorado.estado_atual] || 'pending'} />
          },
          {
            header: 'Ações',
            render: (mentorado) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewMentorado(mentorado)}
                  className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors group"
                  title="Ver detalhes"
                >
                  <Eye className="w-4 h-4 text-[#94A3B8] group-hover:text-[#475569]" />
                </button>
                <button
                  onClick={() => handleEditMentorado(mentorado)}
                  className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors group"
                  title="Editar"
                >
                  <Edit className="w-4 h-4 text-[#94A3B8] group-hover:text-[#059669]" />
                </button>
                <button
                  onClick={() => handleDeleteMentorado(mentorado.id)}
                  className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors group"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4 text-[#94A3B8] group-hover:text-[#EF4444]" />
                </button>
              </div>
            )
          }
        ]}
        data={filteredMentorados}
      />

      {/* Modal Novo Mentorado */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#0F172A]">Novo Mentorado</h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-[#F1F5F9] rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5 text-[#94A3B8] transform rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.nome_completo}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-colors"
                    placeholder="Digite o nome completo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-colors"
                    placeholder="Digite o email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-colors"
                    placeholder="Digite o telefone"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Turma
                  </label>
                  <input
                    type="text"
                    value={formData.turma}
                    onChange={(e) => setFormData(prev => ({ ...prev, turma: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-colors"
                    placeholder="Digite a turma"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Nível
                  </label>
                  <select
                    value={formData.nivel}
                    onChange={(e) => setFormData(prev => ({ ...prev, nivel: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-colors"
                  >
                    <option value="iniciante">Iniciante</option>
                    <option value="intermediario">Intermediário</option>
                    <option value="avancado">Avançado</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Status
                  </label>
                  <select
                    value={formData.estado_atual}
                    onChange={(e) => setFormData(prev => ({ ...prev, estado_atual: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-colors"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Observações Privadas
                  </label>
                  <textarea
                    value={formData.observacoes_privadas}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes_privadas: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-colors"
                    placeholder="Observações sobre o mentorado"
                    rows={3}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoadingData}
                    className="flex-1 px-6 py-3 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingData ? 'Criando...' : 'Criar Mentorado'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}