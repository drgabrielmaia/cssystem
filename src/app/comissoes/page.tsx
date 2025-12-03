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

export default function ComissoesPage() {
  const [comissoes, setComissoes] = useState<Comissao[]>([])
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

  const statusMap = {
    pendente: 'pending',
    pago: 'completed',
    cancelado: 'cancelled'
  }

  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [statusDistribution, setStatusDistribution] = useState<{name: string, value: number, color: string}[]>([])

  useEffect(() => {
    loadComissoes()
    loadStats()
  }, [])

  useEffect(() => {
    if (!loading) {
      setIsLoadingData(true)
      loadComissoes()
    }
  }, [statusFilter, mentoradoFilter])

  const loadComissoes = async () => {
    try {
      // Buscar dados reais da tabela comissoes com joins
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
      const { data: comissoesData, error } = await supabase
        .from('comissoes')
        .select('valor_comissao, status_pagamento, data_venda, created_at')

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#059669]"></div>
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
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <div>
              <p className="font-semibold text-orange-800">Comissões Pendentes</p>
              <p className="text-sm text-orange-700">
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
                    dataKey="comissoes"
                    stroke="#059669"
                    fillOpacity={1}
                    fill="url(#colorComissoes)"
                    strokeWidth={3}
                  />
                  <Area
                    type="monotone"
                    dataKey="pagas"
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
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
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
                  <span className="text-sm text-[#475569] font-medium">
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
              placeholder="Buscar comissões..."
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
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>

          {availableMentorados.length > 0 && (
            <select
              value={mentoradoFilter}
              onChange={(e) => setMentoradoFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
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
            className="flex items-center gap-2 px-6 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Comissão
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

      {/* Tabela de Comissões */}
      <DataTable
        title="Lista de Comissões"
        columns={[
          {
            header: 'Mentorado',
            render: (comissao) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center text-white font-semibold text-sm">
                  {comissao.mentorados?.nome?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'ND'}
                </div>
                <div>
                  <p className="font-semibold text-[#0F172A]">{comissao.mentorados?.nome || 'Nome não encontrado'}</p>
                  <p className="text-sm text-[#94A3B8]">{comissao.mentorados?.email || 'Email não encontrado'}</p>
                </div>
              </div>
            )
          },
          {
            header: 'Lead/Venda',
            render: (comissao) => (
              <div>
                <p className="font-medium text-[#0F172A]">{comissao.leads?.nome_completo || 'Lead não encontrado'}</p>
                <p className="text-sm text-[#94A3B8]">{comissao.leads?.empresa || '-'}</p>
              </div>
            )
          },
          {
            header: 'Valor da Venda',
            render: (comissao) => (
              <div className="text-right">
                <p className="font-semibold text-[#0F172A]">{formatCurrency(comissao.valor_venda)}</p>
                <p className="text-xs text-[#94A3B8]">{comissao.percentual_comissao}% comissão</p>
              </div>
            )
          },
          {
            header: 'Valor Comissão',
            render: (comissao) => (
              <div className="text-right">
                <p className="font-semibold text-[#059669]">{formatCurrency(comissao.valor_comissao)}</p>
              </div>
            )
          },
          {
            header: 'Vencimento',
            render: (comissao) => (
              <div className={`${isOverdue(comissao.data_vencimento, comissao.status_pagamento) ? 'text-red-600' : 'text-[#475569]'}`}>
                <p className="text-sm font-medium">{formatDate(comissao.data_vencimento)}</p>
                {isOverdue(comissao.data_vencimento, comissao.status_pagamento) && (
                  <p className="text-xs text-red-500">Atrasado</p>
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
                  className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors group"
                  title="Ver detalhes"
                >
                  <Eye className="w-4 h-4 text-[#94A3B8] group-hover:text-[#475569]" />
                </button>
                <button
                  className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors group"
                  title="Editar"
                >
                  <Edit className="w-4 h-4 text-[#94A3B8] group-hover:text-[#059669]" />
                </button>
                {comissao.status_pagamento === 'pendente' && (
                  <button
                    onClick={() => handleMarkAsPaid(comissao.id)}
                    className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors group"
                    title="Marcar como pago"
                  >
                    <Check className="w-4 h-4 text-[#94A3B8] group-hover:text-[#059669]" />
                  </button>
                )}
                {comissao.status_pagamento === 'pendente' && (
                  <button
                    onClick={() => handleMarkAsCancelled(comissao.id)}
                    className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors group"
                    title="Cancelar comissão"
                  >
                    <X className="w-4 h-4 text-[#94A3B8] group-hover:text-[#EF4444]" />
                  </button>
                )}
                {comissao.status_pagamento === 'pago' && comissao.data_pagamento && (
                  <div className="px-2 py-1 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-700">
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
    </PageLayout>
  )
}