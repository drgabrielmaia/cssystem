'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { AddMentoradoModalSafe } from '@/components/add-mentorado-modal-safe'
import { EditMentoradoModal } from '@/components/edit-mentorado-modal'
import { ChurnModal } from '@/components/churn-modal'
import { useAuth } from '@/contexts/auth'
import { Header } from '@/components/header'
import { Input } from '@/components/ui/input'
import {
  Users,
  TrendingUp,
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
  Plus,
  Phone,
  Mail,
} from 'lucide-react'

interface Mentorado {
  id: string
  nome_completo: string
  email: string
  telefone?: string
  data_nascimento: string | null
  data_entrada: string
  estado_atual: string
  status_login?: string
  avatar_url: string | null
  pontuacao?: number
  observacoes_privadas?: string
  created_at: string
  updated_at: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getEstadoBadgeClasses(estado: string | null): string {
  if (!estado) return 'bg-white/[0.06] text-white/50'
  const normalized = estado.toLowerCase().trim()
  if (normalized === 'ativo' || normalized === 'ativa') {
    return 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
  }
  if (normalized === 'inativo' || normalized === 'inativa') {
    return 'bg-red-500/15 text-red-400 ring-1 ring-red-500/20'
  }
  if (normalized === 'bloqueado' || normalized === 'bloqueada') {
    return 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/20'
  }
  if (normalized === 'pendente') {
    return 'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/20'
  }
  return 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20'
}

export default function MentoradosClientPage() {
  const { user, organizationId } = useAuth()
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingMentorado, setEditingMentorado] = useState<Mentorado | null>(null)
  const [showChurnModal, setShowChurnModal] = useState(false)
  const [churnMentorado, setChurnMentorado] = useState<Mentorado | null>(null)
  const [exportingPDF, setExportingPDF] = useState(false)

  useEffect(() => {
    if (organizationId) {
      loadMentorados()
    }
  }, [organizationId])

  const loadMentorados = async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('mentorados')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('excluido', false)
        .neq('estado_atual', 'churned')
        .order('nome_completo')

      if (error) {
        console.error('Erro ao carregar mentorados:', error)
        return
      }

      setMentorados(data || [])
    } catch (err) {
      console.error('Erro inesperado:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredMentorados = useMemo(() => {
    if (!searchTerm.trim()) return mentorados
    const term = searchTerm.toLowerCase()
    return mentorados.filter(
      (m) =>
        m.nome_completo?.toLowerCase().includes(term) ||
        m.email?.toLowerCase().includes(term) ||
        m.telefone?.includes(term)
    )
  }, [mentorados, searchTerm])

  const stats = useMemo(() => {
    const total = mentorados.length
    const ativos = mentorados.filter(
      (m) => m.estado_atual?.toLowerCase() === 'ativo' || m.estado_atual?.toLowerCase() === 'ativa'
    ).length
    const inativos = mentorados.filter(
      (m) => m.estado_atual?.toLowerCase() === 'inativo' || m.estado_atual?.toLowerCase() === 'inativa'
    ).length
    const thisMonth = new Date().toISOString().slice(0, 7)
    const novos_mes = mentorados.filter(m => m.created_at?.startsWith(thisMonth)).length
    const taxa_retencao = total > 0 ? Math.round((ativos / total) * 100) : 0
    return { total, ativos, inativos, novos_mes, taxa_retencao }
  }, [mentorados])

  const handleEdit = (mentorado: Mentorado) => {
    setEditingMentorado(mentorado)
    setShowEditModal(true)
  }

  const handleDelete = (mentorado: Mentorado) => {
    setChurnMentorado(mentorado)
    setShowChurnModal(true)
  }

  const handleChurnProcessed = () => {
    loadMentorados()
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
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status')
    }
  }

  const exportToPDF = async () => {
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
            .status-ativo { color: green; font-weight: bold; }
            .status-inativo { color: red; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Lista de Mentorados</h1>
            <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
          <div class="stats">
            <div class="stat"><h3>${stats.total}</h3><p>Total</p></div>
            <div class="stat"><h3>${stats.ativos}</h3><p>Ativos</p></div>
            <div class="stat"><h3>${stats.inativos}</h3><p>Inativos</p></div>
            <div class="stat"><h3>${stats.novos_mes}</h3><p>Novos no Mês</p></div>
            <div class="stat"><h3>${stats.taxa_retencao}%</h3><p>Taxa Retenção</p></div>
          </div>
          <table>
            <thead>
              <tr><th>Nome</th><th>Email</th><th>Telefone</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${filteredMentorados.map(m => `
                <tr>
                  <td>${m.nome_completo}</td>
                  <td>${m.email}</td>
                  <td>${m.telefone || '-'}</td>
                  <td class="status-${m.estado_atual}">${m.estado_atual || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer"><p>Relatório gerado automaticamente</p></div>
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
    } catch (error) {
      console.error('Erro ao exportar:', error)
    } finally {
      setExportingPDF(false)
    }
  }

  // Skeleton loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <Header title="Mentorados" subtitle="Gestão de mentorados da organização" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] animate-pulse">
                <div className="h-3 w-20 bg-white/[0.06] rounded mb-3" />
                <div className="h-8 w-16 bg-white/[0.06] rounded" />
              </div>
            ))}
          </div>
          <div className="bg-[#141418] rounded-2xl p-4 ring-1 ring-white/[0.06] animate-pulse">
            <div className="h-10 bg-white/[0.04] rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-[#141418] rounded-2xl p-6 ring-1 ring-white/[0.06] animate-pulse">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-white/[0.06]" />
                  <div className="h-4 w-32 bg-white/[0.06] rounded" />
                  <div className="h-5 w-20 bg-white/[0.06] rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Header title="Mentorados" subtitle={`Gestão de ${stats.total} mentorados da organização`} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {/* Total */}
          <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-blue-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Total</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-white tabular-nums">{stats.total}</p>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Ativos */}
          <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-emerald-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Ativos</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-white tabular-nums">{stats.ativos}</p>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Inativos */}
          <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-red-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Inativos</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-white tabular-nums">{stats.inativos}</p>
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <UserX className="h-5 w-5 text-red-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Novos no Mês */}
          <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-purple-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Novos (Mês)</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-white tabular-nums">{stats.novos_mes}</p>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Taxa de Retenção */}
          <div className="group relative bg-[#141418] rounded-2xl p-5 ring-1 ring-white/[0.06] hover:ring-amber-500/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/[0.06] to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Retenção</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-white tabular-nums">{stats.taxa_retencao}%</p>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar + Actions */}
        <div className="bg-[#141418] rounded-2xl p-4 ring-1 ring-white/[0.06]">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-11 bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/30 rounded-xl focus-visible:ring-blue-500/30 focus-visible:border-blue-500/30"
              />
              {searchTerm && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/30">
                  {filteredMentorados.length} resultado{filteredMentorados.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportToPDF}
                disabled={exportingPDF || filteredMentorados.length === 0}
                className="h-11 px-4 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Download className={`h-4 w-4 ${exportingPDF ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Exportar</span>
              </button>
              <button
                onClick={loadMentorados}
                className="h-11 px-4 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-2 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Atualizar</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-2 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Novo Mentorado
              </button>
            </div>
          </div>
        </div>

        {/* Mentorados Grid */}
        {filteredMentorados.length === 0 ? (
          <div className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <Users className="h-7 w-7 text-white/20" />
            </div>
            <h3 className="text-base font-semibold text-white/60 mb-1">
              Nenhum mentorado encontrado
            </h3>
            <p className="text-sm text-white/30">
              {searchTerm
                ? 'Tente ajustar o termo de busca'
                : 'Nenhum mentorado cadastrado nesta organização'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMentorados.map((mentorado) => (
              <div
                key={mentorado.id}
                className="group bg-[#141418] rounded-2xl p-6 ring-1 ring-white/[0.06] hover:ring-white/[0.12] transition-all duration-300"
              >
                {/* Avatar + Name + Badge */}
                <div className="flex flex-col items-center text-center mb-4">
                  <div className="relative mb-3">
                    {mentorado.avatar_url ? (
                      <img
                        src={mentorado.avatar_url}
                        alt={mentorado.nome_completo}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-white/[0.08]"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const fallback = target.nextElementSibling as HTMLElement
                          if (fallback) fallback.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-2 ring-white/[0.08] items-center justify-center"
                      style={{ display: mentorado.avatar_url ? 'none' : 'flex' }}
                    >
                      <span className="text-lg font-bold text-white/70">
                        {getInitials(mentorado.nome_completo)}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-white truncate max-w-full">
                    {mentorado.nome_completo}
                  </h3>

                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${getEstadoBadgeClasses(mentorado.estado_atual)}`}
                    >
                      {mentorado.estado_atual || 'Sem estado'}
                    </span>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 border-t border-white/[0.06] pt-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                      <Mail className="h-3.5 w-3.5 text-white/30" />
                    </div>
                    <a
                      href={`mailto:${mentorado.email}`}
                      className="text-xs text-white/50 hover:text-white/80 transition-colors truncate"
                      title={mentorado.email}
                    >
                      {mentorado.email}
                    </a>
                  </div>

                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                      <Phone className="h-3.5 w-3.5 text-white/30" />
                    </div>
                    {mentorado.telefone ? (
                      <a
                        href={`tel:${mentorado.telefone}`}
                        className="text-xs text-white/50 hover:text-white/80 transition-colors"
                      >
                        {mentorado.telefone}
                      </a>
                    ) : (
                      <span className="text-xs text-white/20 italic">Sem telefone</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/[0.06]">
                  <button
                    onClick={() => handleEdit(mentorado)}
                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-blue-500/15 text-white/40 hover:text-blue-400 transition-all"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleStatus(mentorado)}
                    className={`p-2 rounded-lg bg-white/[0.04] transition-all ${
                      mentorado.estado_atual === 'ativo'
                        ? 'hover:bg-yellow-500/15 text-white/40 hover:text-yellow-400'
                        : 'hover:bg-emerald-500/15 text-white/40 hover:text-emerald-400'
                    }`}
                    title={mentorado.estado_atual === 'ativo' ? 'Desativar' : 'Ativar'}
                  >
                    {mentorado.estado_atual === 'ativo' ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Unlock className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(mentorado)}
                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-red-500/15 text-white/40 hover:text-red-400 transition-all"
                    title="Excluir / Churn"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
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

      <ChurnModal
        isOpen={showChurnModal}
        onClose={() => {
          setShowChurnModal(false)
          setChurnMentorado(null)
        }}
        mentorado={churnMentorado}
        onChurnProcessed={handleChurnProcessed}
      />
    </div>
  )
}
