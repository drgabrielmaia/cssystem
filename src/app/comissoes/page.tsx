'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { KPICardVibrant } from '@/components/ui/kpi-card-vibrant'
import { MetricCard } from '@/components/ui/metric-card'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { ChartCard } from '@/components/ui/chart-card'
import { supabase } from '@/lib/supabase'
import { useActiveOrganization } from '@/contexts/organization'
import {
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Check,
  X,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  CreditCard,
  Calendar
} from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'

interface Comissao {
  id: string
  mentorado_id: string
  lead_id: string
  valor_venda: number
  percentual_comissao: number
  valor_comissao: number
  status_pagamento: 'pendente' | 'pago' | 'cancelado'
  data_venda: string
  data_vencimento: string
  data_pagamento?: string | null
  observacoes?: string | null
  created_at: string
  updated_at: string
  mentorados?: {
    nome: string
    email: string
    telefone: string
  }
  leads?: {
    nome_completo: string
    email: string
    empresa: string
  }
}

interface ComissaoStats {
  total_comissoes: number
  valor_total: number
  valor_pago: number
  valor_pendente: number
  quantidade_pendentes: number
  quantidade_pagas: number
  ticket_medio: number
  taxa_pagamento: number
}

interface ThirdPartyCommission {
  commission_id: string
  user_name: string
  user_email: string
  user_pix_key: string
  amount: number
  description?: string
  status: 'pending' | 'paid' | 'cancelled'
  created_at: string
  paid_at?: string
}

interface ThirdPartyUser {
  id: string
  name: string
  email: string
  pix_key: string
  phone?: string
  notes?: string
  created_at: string
}

export default function ComissoesPage() {
  const { activeOrganizationId } = useActiveOrganization()
  const [activeTab, setActiveTab] = useState('mentorados')
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [thirdPartyCommissions, setThirdPartyCommissions] = useState<ThirdPartyCommission[]>([])
  const [thirdPartyUsers, setThirdPartyUsers] = useState<ThirdPartyUser[]>([])
  const [stats, setStats] = useState<ComissaoStats>({
    total_comissoes: 0,
    valor_total: 0,
    valor_pago: 0,
    valor_pendente: 0,
    quantidade_pendentes: 0,
    quantidade_pagas: 0,
    ticket_medio: 0,
    taxa_pagamento: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [mentoradoFilter, setMentoradoFilter] = useState('todos')
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [selectedComissao, setSelectedComissao] = useState<Comissao | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showThirdPartyModal, setShowThirdPartyModal] = useState(false)
  const [editForm, setEditForm] = useState({
    valor_comissao: 0,
    percentual_comissao: 0,
    observacoes: ''
  })
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    pix_key: '',
    phone: '',
    notes: ''
  })
  const [thirdPartyForm, setThirdPartyForm] = useState({
    third_party_user_id: '',
    amount: '',
    description: ''
  })

  const statusMap = {
    pendente: 'pending',
    pago: 'completed',
    cancelado: 'cancelled'
  }

  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [statusDistribution, setStatusDistribution] = useState<{name: string, value: number, color: string}[]>([])

  useEffect(() => {
    if (activeOrganizationId) {
      loadComissoes()
      loadStats()
    }
  }, [activeOrganizationId])

  useEffect(() => {
    if (!loading) {
      setIsLoadingData(true)
      loadComissoes()
    }
  }, [statusFilter, mentoradoFilter])

  const loadComissoes = async () => {
    try {
      // Buscar dados reais da tabela comissoes com joins FILTRADO POR ORGANIZAÇÃO
      let query = supabase
        .from('comissoes')
        .select(`
          id,
          mentorado_id,
          lead_id,
          valor_venda,
          percentual_comissao,
          valor_comissao,
          status_pagamento,
          data_venda,
          data_vencimento,
          data_pagamento,
          observacoes,
          created_at,
          updated_at,
          mentorados:mentorado_id(
            nome_completo,
            email,
            telefone
          ),
          leads:lead_id(
            nome_completo,
            email,
            empresa
          )
        `)

      // Filtrar por organização
      if (activeOrganizationId) {
        query = query.eq('organization_id', activeOrganizationId)
      }

      // Aplicar filtros
      if (statusFilter !== 'todos') {
        query = query.eq('status_pagamento', statusFilter)
      }

      const { data: comissoesData, error } = await query.order('data_venda', { ascending: false })

      if (error) throw error

      // Transformar dados para compatibilidade com o tipo
      const comissoes = (comissoesData || []).map(comissao => ({
        ...comissao,
        mentorados: Array.isArray(comissao.mentorados) ?
          (comissao.mentorados[0] ? {
            nome: comissao.mentorados[0].nome_completo || '',
            email: comissao.mentorados[0].email || '',
            telefone: comissao.mentorados[0].telefone || ''
          } : { nome: '', email: '', telefone: '' }) :
          {
            nome: (comissao.mentorados as any)?.nome_completo || '',
            email: (comissao.mentorados as any)?.email || '',
            telefone: (comissao.mentorados as any)?.telefone || ''
          },
        leads: Array.isArray(comissao.leads) ?
          (comissao.leads[0] ? {
            nome_completo: comissao.leads[0].nome_completo || '',
            email: comissao.leads[0].email || '',
            empresa: comissao.leads[0].empresa || ''
          } : { nome_completo: '', email: '', empresa: '' }) :
          {
            nome_completo: (comissao.leads as any)?.nome_completo || '',
            email: (comissao.leads as any)?.email || '',
            empresa: (comissao.leads as any)?.empresa || ''
          }
      }))

      // Filtro adicional por mentorado se especificado
      let filteredData = comissoes
      if (mentoradoFilter !== 'todos') {
        filteredData = filteredData.filter(c => c.mentorados?.nome === mentoradoFilter)
      }

      setComissoes(filteredData)
    } catch (error) {
      console.error('Erro ao carregar comissões:', error)
    } finally {
      setLoading(false)
      setIsLoadingData(false)
    }
  }

  const loadStats = async () => {
    try {
      // Buscar dados detalhados para estatísticas e gráficos
      let statsQuery = supabase
        .from('comissoes')
        .select('valor_comissao, status_pagamento, data_venda, created_at')
      
      // Filtrar por organização
      if (activeOrganizationId) {
        statsQuery = statsQuery.eq('organization_id', activeOrganizationId)
      }

      const { data: comissoesData, error } = await statsQuery

      if (error) throw error

      const allComissoes = comissoesData || []

      // Calcular estatísticas básicas
      const total_comissoes = allComissoes.length
      const pendentes = allComissoes.filter(c => c.status_pagamento === 'pendente')
      const pagas = allComissoes.filter(c => c.status_pagamento === 'pago')
      const canceladas = allComissoes.filter(c => c.status_pagamento === 'cancelado')

      const valor_total = allComissoes.reduce((sum, c) => sum + (c.valor_comissao || 0), 0)
      const valor_pendente = pendentes.reduce((sum, c) => sum + (c.valor_comissao || 0), 0)
      const valor_pago = pagas.reduce((sum, c) => sum + (c.valor_comissao || 0), 0)
      const quantidade_pendentes = pendentes.length
      const quantidade_pagas = pagas.length
      const ticket_medio = total_comissoes > 0 ? valor_total / total_comissoes : 0
      const taxa_pagamento = total_comissoes > 0 ? (quantidade_pagas / total_comissoes) * 100 : 0

      setStats({
        total_comissoes,
        valor_total,
        valor_pago,
        valor_pendente,
        quantidade_pendentes,
        quantidade_pagas,
        ticket_medio,
        taxa_pagamento
      })

      // Gerar dados para gráfico de distribuição de status
      const statusData = [
        {
          name: 'Pagas',
          value: total_comissoes > 0 ? Math.round((quantidade_pagas / total_comissoes) * 100) : 0,
          color: '#059669'
        },
        {
          name: 'Pendentes',
          value: total_comissoes > 0 ? Math.round((quantidade_pendentes / total_comissoes) * 100) : 0,
          color: '#F59E0B'
        },
        {
          name: 'Canceladas',
          value: total_comissoes > 0 ? Math.round((canceladas.length / total_comissoes) * 100) : 0,
          color: '#EF4444'
        }
      ]
      setStatusDistribution(statusData)

      // Gerar dados mensais dos últimos 6 meses
      const today = new Date()
      const monthlyStats = []

      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1)
        const monthName = monthDate.toLocaleDateString('pt-BR', { month: 'short' })

        const monthComissoes = allComissoes.filter(c => {
          const comissaoDate = new Date(c.data_venda || c.created_at)
          return comissaoDate >= monthDate && comissaoDate < nextMonth
        })

        const monthPagas = monthComissoes.filter(c => c.status_pagamento === 'pago')

        monthlyStats.push({
          month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          comissoes: monthComissoes.reduce((sum, c) => sum + (c.valor_comissao || 0), 0),
          pagas: monthPagas.reduce((sum, c) => sum + (c.valor_comissao || 0), 0)
        })
      }

      setMonthlyData(monthlyStats)

    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const filteredComissoes = comissoes.filter(comissao => {
    return searchTerm === '' ||
      comissao.mentorados?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comissao.leads?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comissao.leads?.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const availableMentorados = Array.from(new Set(comissoes.map(c => c.mentorados?.nome).filter(Boolean)))

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const isOverdue = (dateString: string, status: string) => {
    const today = new Date()
    const dueDate = new Date(dateString)
    return dueDate < today && status === 'pendente'
  }

  const handleMarkAsPaid = async (comissaoId: string) => {
    try {
      setIsLoadingData(true)
      const { error } = await supabase
        .from('comissoes')
        .update({
          status_pagamento: 'pago',
          data_pagamento: new Date().toISOString()
        })
        .eq('id', comissaoId)

      if (error) throw error

      await loadComissoes()
      await loadStats()
    } catch (error) {
      console.error('Erro ao marcar como paga:', error)
      setIsLoadingData(false)
    }
  }

  const handleViewComissao = (comissao: Comissao) => {
    console.log('👁️ Visualizando comissão:', comissao.id)
    setSelectedComissao(comissao)
    setShowViewModal(true)
  }

  const handleEditComissao = (comissao: Comissao) => {
    console.log('✏️ Editando comissão:', comissao.id)
    setSelectedComissao(comissao)
    setEditForm({
      valor_comissao: comissao.valor_comissao || 0,
      percentual_comissao: comissao.percentual_comissao || 0,
      observacoes: comissao.observacoes || ''
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedComissao) return
    
    try {
      setIsLoadingData(true)
      const { error } = await supabase
        .from('comissoes')
        .update({
          valor_comissao: editForm.valor_comissao,
          percentual_comissao: editForm.percentual_comissao,
          observacoes: editForm.observacoes,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedComissao.id)

      if (error) throw error

      await loadComissoes()
      await loadStats()
      setShowEditModal(false)
      console.log('✅ Comissão editada com sucesso')
    } catch (error) {
      console.error('Erro ao editar comissão:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleMarkAsCancelled = async (comissaoId: string) => {
    if (confirm('Tem certeza que deseja cancelar esta comissão?')) {
      try {
        setIsLoadingData(true)
        const { error } = await supabase
          .from('comissoes')
          .update({ status_pagamento: 'cancelado' })
          .eq('id', comissaoId)

        if (error) throw error

        await loadComissoes()
        await loadStats()
      } catch (error) {
        console.error('Erro ao cancelar comissão:', error)
        setIsLoadingData(false)
      }
    }
  }

  if (loading) {
    return (
      <PageLayout title="Comissões" subtitle="Carregando...">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Comissões" subtitle="Gestão de comissões e pagamentos">
      {/* KPI Cards - Grid responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICardVibrant
          title="Valor Total"
          value={formatCurrency(stats.valor_total)}
          subtitle="Em comissões"
          percentage={15}
          trend="up"
          color="orange"
          icon={DollarSign}
          sparklineData={monthlyData.map(month => ({ value: month.comissoes }))}
        />
        <MetricCard
          title="Valor Pendente"
          value={formatCurrency(stats.valor_pendente)}
          change={-8}
          changeType="decrease"
          icon={Clock}
          iconColor="orange"
        />
        <MetricCard
          title="Valor Pago"
          value={formatCurrency(stats.valor_pago)}
          change={12}
          changeType="increase"
          icon={CheckCircle}
          iconColor="green"
        />
        <MetricCard
          title="Taxa de Pagamento"
          value={`${stats.taxa_pagamento.toFixed(1)}%`}
          change={3.5}
          changeType="increase"
          icon={TrendingUp}
          iconColor="purple"
        />
      </div>

      {/* Alertas para comissões importantes */}
      {stats.quantidade_pendentes > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold text-primary">Comissões Pendentes</p>
              <p className="text-sm text-primary/80">
                {stats.quantidade_pendentes} comiss{stats.quantidade_pendentes > 1 ? 'ões' : 'ão'} aguardando pagamento
                · {formatCurrency(stats.valor_pendente)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos - Grid responsivo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Gráfico de Evolução Mensal */}
        <div className="lg:col-span-2">
          <ChartCard title="Evolução das Comissões" subtitle="Últimos 6 meses">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorComissoes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="stroke-muted-foreground" fontSize={12} />
                  <YAxis className="stroke-muted-foreground" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.08)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="comissoes"
stroke="hsl(var(--primary))"
                    fillOpacity={1}
fill="url(#colorComissoes)"
                    strokeWidth={3}
                  />
                  <Area
                    type="monotone"
                    dataKey="pagas"
stroke="hsl(var(--primary))"
                    fillOpacity={0.5}
fill="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Gráfico de Status */}
        <ChartCard title="Status dos Pagamentos" subtitle="Distribuição atual">
          <div className="h-80 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="70%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.08)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-1 gap-2 w-full mt-4">
              {statusDistribution.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-muted-foreground font-medium">
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar comissões..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all w-full sm:w-80"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
          >
            <option value="todos">Todos os Status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>

          {availableMentorados.length > 0 && (
            <select
              value={mentoradoFilter}
              onChange={(e) => setMentoradoFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
            >
              <option value="todos">Todos os Mentorados</option>
              {availableMentorados.map(nome => (
                <option key={nome} value={nome}>{nome}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={loadComissoes}
            className="flex items-center gap-2 px-4 py-2 text-foreground hover:bg-muted rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-foreground hover:bg-muted rounded-xl transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Comissão
          </button>
        </div>
      </div>

      {/* Loading indicator para filtros */}
      {isLoadingData && (
        <div className="flex items-center justify-center py-4 mb-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-card rounded-xl shadow-sm border border-border">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-foreground">Atualizando filtros...</span>
          </div>
        </div>
      )}

      {/* Tabela de Comissões */}
      <DataTable
        title="Lista de Comissões"
        columns={[
          {
            header: 'Mentorado',
            render: (comissao) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {comissao.mentorados?.nome?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'ND'}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{comissao.mentorados?.nome || 'Nome não encontrado'}</p>
                  <p className="text-sm text-muted-foreground">{comissao.mentorados?.email || 'Email não encontrado'}</p>
                </div>
              </div>
            )
          },
          {
            header: 'Lead/Venda',
            render: (comissao) => (
              <div>
                <p className="font-medium text-foreground">{comissao.leads?.nome_completo || 'Lead não encontrado'}</p>
                <p className="text-sm text-muted-foreground">{comissao.leads?.empresa || '-'}</p>
              </div>
            )
          },
          {
            header: 'Valor da Venda',
            render: (comissao) => (
              <div className="text-right">
                <p className="font-semibold text-foreground">{formatCurrency(comissao.valor_venda)}</p>
                <p className="text-xs text-muted-foreground">{comissao.percentual_comissao}% comissão</p>
              </div>
            )
          },
          {
            header: 'Valor Comissão',
            render: (comissao) => (
              <div className="text-right">
                <p className="font-semibold text-primary">{formatCurrency(comissao.valor_comissao)}</p>
              </div>
            )
          },
          {
            header: 'Vencimento',
            render: (comissao) => (
              <div className={`${isOverdue(comissao.data_vencimento, comissao.status_pagamento) ? 'text-destructive' : 'text-foreground'}`}>
                <p className="text-sm font-medium">{formatDate(comissao.data_vencimento)}</p>
                {isOverdue(comissao.data_vencimento, comissao.status_pagamento) && (
                  <p className="text-xs text-destructive">Atrasado</p>
                )}
              </div>
            )
          },
          {
            header: 'Status',
            render: (comissao) => <StatusBadge status={(statusMap[comissao.status_pagamento as keyof typeof statusMap] || 'pending') as 'pending' | 'completed' | 'cancelled'} />
          },
          {
            header: 'Ações',
            render: (comissao) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewComissao(comissao)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors group"
                  title="Ver detalhes"
                >
                  <Eye className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                </button>
                <button
                  onClick={() => handleEditComissao(comissao)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors group"
                  title="Editar"
                >
                  <Edit className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </button>
                {comissao.status_pagamento === 'pendente' && (
                  <button
                    onClick={() => handleMarkAsPaid(comissao.id)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors group"
                    title="Marcar como pago"
                  >
                    <Check className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </button>
                )}
                {comissao.status_pagamento === 'pendente' && (
                  <button
                    onClick={() => handleMarkAsCancelled(comissao.id)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors group"
                    title="Cancelar comissão"
                  >
                    <X className="w-4 h-4 text-muted-foreground group-hover:text-destructive" />
                  </button>
                )}
                {comissao.status_pagamento === 'pago' && comissao.data_pagamento && (
                  <div className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-xs text-primary">
                      Pago em {formatDate(comissao.data_pagamento)}
                    </p>
                  </div>
                )}
              </div>
            )
          }
        ]}
        data={filteredComissoes}
      />

      {/* Modal de Visualização */}
      {showViewModal && selectedComissao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Detalhes da Comissão</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mentorado</label>
                  <p className="text-gray-900">{selectedComissao.mentorados?.nome}</p>
                  <p className="text-sm text-gray-500">{selectedComissao.mentorados?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead</label>
                  <p className="text-gray-900">{selectedComissao.leads?.nome_completo}</p>
                  <p className="text-sm text-gray-500">{selectedComissao.leads?.empresa}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Comissão</label>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(selectedComissao.valor_comissao)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Percentual</label>
                  <p className="text-lg font-bold text-blue-600">
                    {selectedComissao.percentual_comissao}%
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Venda</label>
                  <p className="text-lg font-bold">
                    {formatCurrency(selectedComissao.valor_venda)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data da Venda</label>
                  <p className="text-gray-900">{formatDate(selectedComissao.data_venda)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <p className="text-gray-900">{selectedComissao.status_pagamento}</p>
                </div>
              </div>
              {selectedComissao.observacoes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded">
                    {selectedComissao.observacoes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && selectedComissao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Editar Comissão</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mentorado: {selectedComissao.mentorados?.nome}
                </label>
                <label className="block text-sm text-gray-500 mb-3">
                  Valor da venda: {formatCurrency(selectedComissao.valor_venda)}
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Percentual de Comissão (%)
                </label>
                <input
                  type="number"
                  value={editForm.percentual_comissao}
                  onChange={(e) => {
                    const percentual = Number(e.target.value)
                    setEditForm(prev => ({
                      ...prev,
                      percentual_comissao: percentual,
                      valor_comissao: (selectedComissao.valor_venda * percentual) / 100
                    }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor da Comissão (R$)
                </label>
                <input
                  type="number"
                  value={editForm.valor_comissao}
                  onChange={(e) => {
                    const valor = Number(e.target.value)
                    setEditForm(prev => ({
                      ...prev,
                      valor_comissao: valor,
                      percentual_comissao: (valor / selectedComissao.valor_venda) * 100
                    }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={editForm.observacoes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, observacoes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
                  disabled={isLoadingData}
                >
                  {isLoadingData ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}