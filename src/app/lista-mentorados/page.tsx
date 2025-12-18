'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { MetricCard } from '@/components/ui/metric-card'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { supabase } from '@/lib/supabase'
import { AddMentoradoModal } from '@/components/add-mentorado-modal'
import { EditMentoradoModal } from '@/components/edit-mentorado-modal'
import {
  Users,
  TrendingUp,
  Star,
  Plus,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  Edit,
  Trash2
} from 'lucide-react'

interface Mentorado {
  id: string
  nome_completo: string
  email: string
  telefone?: string
  data_entrada: string
  estado_atual: string
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
}

export default function MentoradosPage() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [stats, setStats] = useState<MentoradoStats>({
    total_mentorados: 0,
    ativos: 0,
    inativos: 0,
    novos_mes: 0,
    taxa_retencao: 0,
    pontuacao_media: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedMentorado, setSelectedMentorado] = useState<Mentorado | null>(null)

  const statusMap = {
    ativo: 'confirmed',
    inativo: 'cancelled',
    engajado: 'completed',
    cancelado: 'cancelled'
  }

  useEffect(() => {
    loadMentorados()
    loadStats()
  }, [])

  useEffect(() => {
    if (!loading) {
      setIsLoadingData(true)
      loadMentorados()
    }
  }, [statusFilter])

  const loadMentorados = async () => {
    try {
      let query = supabase
        .from('mentorados')
        .select('*')
        .eq('excluido', false) // Apenas mentorados não excluídos

      if (statusFilter !== 'todos') {
        query = query.eq('estado_atual', statusFilter)
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
        const ativos = mentorados.filter(m => m.estado_atual === 'ativo').length
        const inativos = mentorados.filter(m => m.estado_atual === 'inativo').length

        // Calcular novos do mês
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        const novos_mes = mentorados.filter(m => {
          const dataEntrada = new Date(m.data_entrada)
          return dataEntrada.getMonth() === currentMonth && dataEntrada.getFullYear() === currentYear
        }).length

        const taxa_retencao = mentorados.length > 0 ? (ativos / mentorados.length) * 100 : 0
        const pontuacao_media = mentorados.reduce((acc, m) => acc + (m.pontuacao || 0), 0) / mentorados.length || 0

        setStats({
          total_mentorados: mentorados.length,
          ativos,
          inativos,
          novos_mes,
          taxa_retencao,
          pontuacao_media
        })
      }
    } catch (error) {
      console.error('Erro ao carregar stats:', error)
    }
  }

  const filteredMentorados = mentorados.filter(mentorado =>
    mentorado.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentorado.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentorado.telefone?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const handleNewMentorado = () => {
    setShowModal(true)
  }

  const handleSuccess = () => {
    setShowModal(false)
    loadMentorados()
    loadStats()
  }

  const handleEdit = (mentorado: Mentorado) => {
    setSelectedMentorado(mentorado)
    setShowEditModal(true)
  }

  const handleEditSuccess = () => {
    setShowEditModal(false)
    setSelectedMentorado(null)
    loadMentorados()
    loadStats()
  }

  const handleDelete = async (mentorado: Mentorado) => {
    // Perguntar o motivo da exclusão
    const motivo = prompt(`Por que você está excluindo o mentorado "${mentorado.nome_completo}"?\n\nEscolha:\n1 - Erro (foi adicionado por engano)\n2 - Reembolso (desistiu e pediu reembolso)\n\nDigite 1 ou 2:`);

    if (motivo === null) {
      return // Usuário cancelou
    }

    let motivoExclusao: string;
    if (motivo === '1') {
      motivoExclusao = 'erro'
    } else if (motivo === '2') {
      motivoExclusao = 'reembolso'
    } else {
      alert('Opção inválida. Digite 1 para erro ou 2 para reembolso.')
      return
    }

    try {
      setIsLoadingData(true)

      // Usar soft delete ao invés de deletar permanentemente
      const { error } = await supabase
        .from('mentorados')
        .update({
          excluido: true,
          motivo_exclusao: motivoExclusao,
          data_exclusao: new Date().toISOString().split('T')[0]
        })
        .eq('id', mentorado.id)

      if (error) throw error

      // Se foi reembolso, zerar valores do lead original (se existir)
      if (motivoExclusao === 'reembolso') {
        // Buscar o lead_id deste mentorado
        const { data: mentoradoData } = await supabase
          .from('mentorados')
          .select('lead_id')
          .eq('id', mentorado.id)
          .single()

        if (mentoradoData?.lead_id) {
          // Zerar valores do lead original
          const { error: leadError } = await supabase
            .from('leads')
            .update({
              valor_vendido: 0,
              valor_arrecadado: 0,
              status: 'perdido',
              observacoes: (mentorado as any).observacoes
                ? `${(mentorado as any).observacoes}\n\n[CHURN] Reembolsado - valores zerados`
                : '[CHURN] Reembolsado - valores zerados'
            })
            .eq('id', mentoradoData.lead_id)

          if (leadError) {
            console.warn('Erro ao atualizar lead:', leadError)
          }
        }
      }

      const motivoTexto = motivoExclusao === 'erro' ? 'por erro' : 'por reembolso (contará no churn e valores zerados)'
      alert(`Mentorado excluído ${motivoTexto}!`)
      loadMentorados()
      loadStats()
    } catch (error) {
      console.error('Erro ao excluir mentorado:', error)
      alert('Erro ao excluir mentorado')
    } finally {
      setIsLoadingData(false)
    }
  }

  const columns = [
    {
      header: 'Mentorado',
      render: (mentorado: any) => (
        <div>
          <p className="font-medium text-[#0F172A]">{mentorado.nome_completo}</p>
          <p className="text-sm text-[#94A3B8]">{mentorado.email}</p>
        </div>
      )
    },
    {
      header: 'Contato',
      render: (mentorado: any) => (
        <div>
          <p className="text-sm text-[#475569]">{mentorado.telefone || '-'}</p>
        </div>
      )
    },
    {
      header: 'Status',
      render: (mentorado: any) => (
        <StatusBadge
          status={(statusMap as any)[mentorado.estado_atual] || 'pending'}
          label={mentorado.estado_atual || 'Pendente'}
        />
      )
    },
    {
      header: 'Pontuação',
      render: (mentorado: any) => (
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500" />
          <span className="font-medium">{mentorado.pontuacao || 0}</span>
        </div>
      )
    },
    {
      header: 'Data Entrada',
      render: (mentorado: any) => (
        <span className="text-sm text-[#475569]">
          {formatDate(mentorado.data_entrada)}
        </span>
      )
    },
    {
      header: 'Ações',
      render: (mentorado: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(mentorado)}
            className="p-2 text-[#475569] hover:bg-[#F1F5F9] rounded-lg transition-colors"
            title="Editar mentorado"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(mentorado)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Excluir mentorado"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

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
    <PageLayout title="Mentorados" subtitle="Gestão de mentorados">
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total"
          value={stats.total_mentorados.toString()}
          change={5}
          changeType="increase"
          icon={Users}
          iconColor="blue"
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

      {/* Controles e Filtros */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94A3B8] w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar mentorados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] transition-all"
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
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadMentorados}
              className="p-2 text-[#475569] hover:bg-[#F1F5F9] rounded-xl transition-colors"
              disabled={isLoadingData}
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleNewMentorado}
              className="flex items-center gap-2 px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Mentorado
            </button>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <DataTable
        columns={columns}
        data={filteredMentorados}
        title="Mentorados"
      />

      {/* Modals */}
      <AddMentoradoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
      />

      <EditMentoradoModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditSuccess}
        mentorado={selectedMentorado as any}
      />
    </PageLayout>
  )
}