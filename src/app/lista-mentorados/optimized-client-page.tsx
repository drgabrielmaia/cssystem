'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { MetricCard } from '@/components/ui/metric-card'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { OptimizedTableSkeleton, TableLoadingSkeleton } from '@/components/ui/optimized-table-skeleton'
import { AddMentoradoModalSafe } from '@/components/add-mentorado-modal-safe'
import { EditMentoradoModal } from '@/components/edit-mentorado-modal'
import { useAuth } from '@/contexts/auth'
import { useOptimizedMentorados } from '@/hooks/use-optimized-mentorados'
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
  Download,
  AlertCircle
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
  organization_id: string
}

export default function OptimizedMentoradosClientPage() {
  const { user, organizationId } = useAuth()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    status: 'todos',
    organizationId: organizationId
  })

  // UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingMentorado, setEditingMentorado] = useState<Mentorado | null>(null)
  const [exportingPDF, setExportingPDF] = useState(false)

  // Use optimized hook
  const {
    mentorados,
    stats,
    pagination,
    loading,
    error,
    loadMore,
    refetch,
    searchMentorados,
    updateMentorado,
    deleteMentorado,
    addMentorado,
    isStale
  } = useOptimizedMentorados(organizationId, { ...filters, organizationId }, 25)

  // Filter mentorados by search term on client side for instant feedback
  const filteredMentorados = searchMentorados(searchTerm)

  // Update filters when organizationId changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, organizationId }))
  }, [organizationId])

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
        if (scrollHeight - scrollTop <= clientHeight * 1.5) {
          loadMore()
        }
      }
    }

    const scrollElement = scrollRef.current
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll)
      return () => scrollElement.removeEventListener('scroll', handleScroll)
    }
  }, [loadMore])

  // Handle actions
  const handleEdit = useCallback((mentorado: Mentorado) => {
    setEditingMentorado(mentorado)
    setShowEditModal(true)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este mentorado?')) return

    const success = await deleteMentorado(id)
    if (success) {
      alert('Mentorado excluído com sucesso!')
    } else {
      alert('Erro ao excluir mentorado')
    }
  }, [deleteMentorado])

  const toggleStatus = useCallback(async (mentorado: Mentorado) => {
    const newStatus = mentorado.estado_atual === 'ativo' ? 'inativo' : 'ativo'

    const success = await updateMentorado(mentorado.id, { estado_atual: newStatus })
    if (success) {
      alert(`Status atualizado para ${newStatus}`)
    } else {
      alert('Erro ao atualizar status')
    }
  }, [updateMentorado])

  const exportToPDF = useCallback(async () => {
    try {
      setExportingPDF(true)

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

      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)

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
  }, [filteredMentorados, stats])

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

  // Loading state
  if (loading && mentorados.length === 0) {
    return (
      <PageLayout
        title="Lista de Mentorados"
        subtitle="Carregando mentorados..."
      >
        <OptimizedTableSkeleton
          title="Mentorados"
          rows={10}
          columns={5}
          showActions={true}
          showStats={true}
        />
      </PageLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <PageLayout
        title="Lista de Mentorados"
        subtitle="Gestão de mentorados da organização"
      >
        <div className="flex flex-col items-center justify-center h-96">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Erro ao carregar mentorados</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Tentar Novamente
          </button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Lista de Mentorados"
      subtitle={`Gerencie ${stats.total_mentorados} mentorados da sua organização`}
    >
      <div ref={scrollRef} className="h-screen overflow-y-auto">
        {/* Stale data indicator */}
        {isStale && (
          <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />
              <span className="text-sm text-orange-500">Dados podem estar desatualizados. Atualizando em segundo plano...</span>
            </div>
          </div>
        )}

        {/* Metrics */}
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
            value="0"
            icon={Star}
            iconColor="orange"
          />
        </div>

        {/* Actions Bar */}
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
              onClick={refetch}
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

        {/* Table */}
        <DataTable
          title="Mentorados"
          data={filteredMentorados}
          columns={columns}
        />

        {/* Load More */}
        {pagination.hasMore && (
          <TableLoadingSkeleton />
        )}

        {/* Total counter */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Mostrando {mentorados.length} de {pagination.total} mentorados
          {pagination.hasMore && ' (carregando mais automaticamente)'}
        </div>

        {/* Modals */}
        <AddMentoradoModalSafe
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            refetch()
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
            refetch()
          }}
        />
      </div>
    </PageLayout>
  )
}