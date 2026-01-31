'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { MetricCard } from '@/components/ui/metric-card'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { supabase } from '@/lib/supabase'
import { AddMentoradoModalSafe } from '@/components/add-mentorado-modal-safe'
import { EditMentoradoModal } from '@/components/edit-mentorado-modal'
import { useAuth } from '@/contexts/auth'
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
  Trash2,
  Lock,
  Unlock,
  Clock,
  Download
} from 'lucide-react'

interface Mentorado {
  id: string
  nome_completo: string
  email: string
  telefone?: string
  data_entrada: string
  estado_atual: string
  status_login?: string
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

export default function MentoradosClientPage() {
  const { user, organizationId } = useAuth()
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
  const [filteredMentorados, setFilteredMentorados] = useState<Mentorado[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingMentorado, setEditingMentorado] = useState<Mentorado | null>(null)
  const [exportingPDF, setExportingPDF] = useState(false)

  useEffect(() => {
    if (organizationId) {
      loadMentorados()
    }
  }, [organizationId])

  useEffect(() => {
    filterMentorados()
  }, [mentorados, searchTerm])

  const loadMentorados = async () => {
    try {
      setLoading(true)

      if (!organizationId) {
        console.log('⚠️ Aguardando organização do usuário...')
        return
      }

      console.log('📊 Carregando mentorados para organização:', organizationId)

      const { data, error } = await supabase
        .from('mentorados')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao carregar mentorados:', error)
        throw error
      }

      console.log('✅ Mentorados carregados:', data?.length || 0)
      setMentorados(data || [])

      // Calcular estatísticas
      const total = data?.length || 0
      const ativos = data?.filter(m => m.estado_atual === 'ativo').length || 0
      const inativos = total - ativos

      // Mentorados criados este mês
      const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
      const novos_mes = data?.filter(m =>
        m.created_at?.startsWith(thisMonth)
      ).length || 0

      // Taxa de retenção (simplificada)
      const taxa_retencao = total > 0 ? (ativos / total) * 100 : 0

      // Pontuação média
      const mentoradosComPontuacao = data?.filter(m => m.pontuacao != null) || []
      const pontuacao_media = mentoradosComPontuacao.length > 0
        ? mentoradosComPontuacao.reduce((sum, m) => sum + (m.pontuacao || 0), 0) / mentoradosComPontuacao.length
        : 0

      setStats({
        total_mentorados: total,
        ativos,
        inativos,
        novos_mes,
        taxa_retencao: Math.round(taxa_retencao),
        pontuacao_media: Math.round(pontuacao_media * 10) / 10
      })

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterMentorados = () => {
    if (!searchTerm.trim()) {
      setFilteredMentorados(mentorados)
      return
    }

    const filtered = mentorados.filter(mentorado =>
      mentorado.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentorado.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentorado.telefone?.includes(searchTerm)
    )

    setFilteredMentorados(filtered)
  }

  const handleEdit = (mentorado: Mentorado) => {
    setEditingMentorado(mentorado)
    setShowEditModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este mentorado?')) return

    try {
      const { error } = await supabase
        .from('mentorados')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadMentorados()
      alert('Mentorado excluído com sucesso!')
    } catch (error) {
      console.error('Erro ao excluir mentorado:', error)
      alert('Erro ao excluir mentorado')
    }
  }

  const toggleStatus = async (mentorado: Mentorado) => {
    const newStatus = mentorado.estado_atual === 'ativo' ? 'inativo' : 'ativo'

    try {
      const { error } = await supabase
        .from('mentorados')
        .update({ estado_atual: newStatus })
        .eq('id', mentorado.id)

      if (error) throw error

      await loadMentorados()
      alert(`Status atualizado para ${newStatus}`)
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status')
    }
  }

  const columns = [
    {
      key: 'nome_completo',
      header: 'Nome',
      label: 'Nome',
      render: (mentorado: Mentorado) => (
        <div>
          <div className="font-medium text-white">{mentorado.nome_completo}</div>
          <div className="text-sm text-gray-400">{mentorado.email}</div>
        </div>
      )
    },
    {
      key: 'estado_atual',
      header: 'Status',
      label: 'Status',
      render: (mentorado: Mentorado) => (
        <StatusBadge status={mentorado.estado_atual as any} />
      )
    },
    {
      key: 'data_entrada',
      header: 'Data Entrada',
      label: 'Data Entrada',
      render: (mentorado: Mentorado) => (
        new Date(mentorado.data_entrada).toLocaleDateString('pt-BR')
      )
    },
    {
      key: 'pontuacao',
      header: 'Pontuação',
      label: 'Pontuação',
      render: (mentorado: Mentorado) => (
        <div className="flex items-center">
          <Star className="w-4 h-4 text-yellow-400 mr-1" />
          {mentorado.pontuacao || 0}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      label: 'Ações',
      render: (mentorado: Mentorado) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(mentorado)}
            className="p-1 hover:bg-gray-700 rounded"
            title="Editar"
          >
            <Edit className="w-4 h-4 text-blue-400" />
          </button>
          <button
            onClick={() => toggleStatus(mentorado)}
            className="p-1 hover:bg-gray-700 rounded"
            title={mentorado.estado_atual === 'ativo' ? 'Desativar' : 'Ativar'}
          >
            {mentorado.estado_atual === 'ativo' ? (
              <Lock className="w-4 h-4 text-yellow-400" />
            ) : (
              <Unlock className="w-4 h-4 text-green-400" />
            )}
          </button>
          <button
            onClick={() => handleDelete(mentorado.id)}
            className="p-1 hover:bg-gray-700 rounded"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )
    }
  ]

  const exportToPDF = async () => {
    try {
      setExportingPDF(true)

      // Criar conteúdo HTML para o PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Lista de Mentorados</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .stats { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .stat { text-align: center; padding: 10px; border: 1px solid #ccc; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; font-weight: bold; }
            .status-active { color: green; font-weight: bold; }
            .status-inactive { color: red; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Lista de Mentorados</h1>
            <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>

          <div class="stats">
            <div class="stat">
              <h3>${stats.total_mentorados}</h3>
              <p>Total</p>
            </div>
            <div class="stat">
              <h3>${stats.ativos}</h3>
              <p>Ativos</p>
            </div>
            <div class="stat">
              <h3>${stats.inativos}</h3>
              <p>Inativos</p>
            </div>
            <div class="stat">
              <h3>${stats.novos_mes}</h3>
              <p>Novos no Mês</p>
            </div>
            <div class="stat">
              <h3>${stats.taxa_retencao.toFixed(1)}%</h3>
              <p>Taxa Retenção</p>
            </div>
            <div class="stat">
              <h3>${stats.pontuacao_media.toFixed(1)}</h3>
              <p>Pontuação Média</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Data Entrada</th>
                <th>Status</th>
                <th>Pontuação</th>
              </tr>
            </thead>
            <tbody>
              ${filteredMentorados.map(mentorado => `
                <tr>
                  <td>${mentorado.nome_completo}</td>
                  <td>${mentorado.email}</td>
                  <td>${mentorado.telefone || '-'}</td>
                  <td>${new Date(mentorado.data_entrada).toLocaleDateString('pt-BR')}</td>
                  <td class="status-${mentorado.estado_atual}">${mentorado.estado_atual === 'ativo' ? 'Ativo' : 'Inativo'}</td>
                  <td>${mentorado.pontuacao || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Relatório gerado automaticamente pelo sistema de gestão de mentorados</p>
          </div>
        </body>
        </html>
      `

      // Criar blob e fazer download
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)

      // Criar link temporário para download
      const link = document.createElement('a')
      link.href = url
      link.download = `mentorados-${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log('✅ Arquivo HTML gerado com sucesso')

    } catch (error) {
      console.error('❌ Erro ao exportar PDF:', error)
    } finally {
      setExportingPDF(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <PageLayout
      title="Lista de Mentorados"
      subtitle={`Gerencie ${stats.total_mentorados} mentorados da sua organização`}
    >
      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
        <MetricCard
          title="Total"
          value={stats.total_mentorados.toString()}
          icon={Users}
          iconColor="blue"
        />
        <MetricCard
          title="Ativos"
          value={stats.ativos.toString()}
          icon={UserCheck}
          iconColor="green"
        />
        <MetricCard
          title="Inativos"
          value={stats.inativos.toString()}
          icon={UserX}
          iconColor="orange"
        />
        <MetricCard
          title="Novos (Mês)"
          value={stats.novos_mes.toString()}
          icon={TrendingUp}
          iconColor="blue"
        />
        <MetricCard
          title="Retenção"
          value={`${stats.taxa_retencao}%`}
          icon={Clock}
          iconColor="purple"
        />
        <MetricCard
          title="Pontuação Média"
          value={stats.pontuacao_media.toString()}
          icon={Star}
          iconColor="orange"
        />
      </div>

      {/* Barra de Ações */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={exportToPDF}
            disabled={exportingPDF || filteredMentorados.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            <Download className={`w-4 h-4 mr-2 ${exportingPDF ? 'animate-spin' : ''}`} />
            {exportingPDF ? 'Exportando...' : 'Exportar PDF'}
          </button>
          <button
            onClick={loadMentorados}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Mentorado
          </button>
        </div>
      </div>

      {/* Tabela */}
      <DataTable
        title="Mentorados"
        data={filteredMentorados}
        columns={columns}
      />

      {/* Modais */}
      <AddMentoradoModalSafe
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false)
          loadMentorados()
        }}
        organizationId={organizationId}
      />

      <EditMentoradoModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingMentorado(null)
        }}
        mentorado={editingMentorado as any}
        onSuccess={() => {
          setShowEditModal(false)
          setEditingMentorado(null)
          loadMentorados()
        }}
      />
    </PageLayout>
  )
}