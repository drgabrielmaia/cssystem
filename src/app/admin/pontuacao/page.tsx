'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { supabase } from '@/lib/supabase'
import {
  Trophy,
  Plus,
  Minus,
  Search,
  Calendar,
  User,
  Star,
  Target,
  Award,
  Gift,
  Filter,
  Eye,
  Trash2,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PontuacaoMentorado, Mentorado } from '@/types'

interface MentoradoComPontos extends Mentorado {
  pontuacao_total: number
}

const tiposAcao = [
  { value: 'indicacao', label: 'Indicação', icon: User, color: 'bg-blue-500', pontos: 1 },
  { value: 'aula_completa', label: 'Aula Completa', icon: Star, color: 'bg-green-500', pontos: 2 },
  { value: 'meta_atingida', label: 'Meta Atingida', icon: Target, color: 'bg-purple-500', pontos: 5 },
  { value: 'participacao_evento', label: 'Participação em Evento', icon: Award, color: 'bg-orange-500', pontos: 3 },
  { value: 'remocao_pontos', label: 'Remoção de Pontos', icon: Minus, color: 'bg-red-500', pontos: 0 },
  { value: 'custom', label: 'Personalizado', icon: Gift, color: 'bg-pink-500', pontos: 0 }
]

// Helper to get initials from a name
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function PontuacaoAdminPage() {
  const [mentorados, setMentorados] = useState<MentoradoComPontos[]>([])
  const [pontuacoes, setPontuacoes] = useState<PontuacaoMentorado[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [selectedMentorado, setSelectedMentorado] = useState<string>('')

  // Bulk actions state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkMenu, setShowBulkMenu] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    mentorado_id: '',
    tipo_acao: '',
    pontos: 0,
    descricao: '',
    data_acao: new Date().toISOString().split('T')[0]
  })

  // Form state para remoção
  const [removeFormData, setRemoveFormData] = useState({
    mentorado_id: '',
    pontos: 0,
    descricao: '',
    data_acao: new Date().toISOString().split('T')[0]
  })

  const [processingIndicacoes, setProcessingIndicacoes] = useState(false)
  const [indicacoesPendentes, setIndicacoesPendentes] = useState(0)

  useEffect(() => {
    loadData()
    checkIndicacoesPendentes()
  }, [])

  const loadData = async () => {
    await Promise.all([loadMentorados(), loadPontuacoes()])
    setLoading(false)
  }

  const checkIndicacoesPendentes = async () => {
    try {
      const response = await fetch('/api/indicacao-pontos')
      const result = await response.json()
      if (result.success) {
        setIndicacoesPendentes(result.pending_count)
      }
    } catch (error) {
      console.error('Erro ao verificar indicações pendentes:', error)
    }
  }

  const processarIndicacoesPendentes = async () => {
    if (!confirm('Processar todas as indicações pendentes para adicionar pontos automaticamente?')) {
      return
    }

    setProcessingIndicacoes(true)
    try {
      const checkResponse = await fetch('/api/indicacao-pontos')
      const checkResult = await checkResponse.json()

      if (!checkResult.success || !checkResult.pending_leads?.length) {
        alert('Nenhuma indicação pendente encontrada')
        return
      }

      let processados = 0
      let erros = 0

      for (const lead of checkResult.pending_leads) {
        try {
          const processResponse = await fetch('/api/indicacao-pontos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lead_id: lead.lead_id,
              indicado_por_id: lead.indicado_por
            })
          })

          const result = await processResponse.json()
          if (result.success) {
            processados++
          } else {
            console.warn(`Erro ao processar ${lead.lead_nome}:`, result.message)
            if (!result.message?.includes('não encontrado') && !result.message?.includes('já foram atribuídos')) {
              erros++
            }
          }
        } catch (error) {
          console.error(`Erro ao processar lead ${lead.lead_nome}:`, error)
          erros++
        }
      }

      alert(`Processamento concluído!\n✅ ${processados} pontos adicionados\n❌ ${erros} erros\n📋 Total verificado: ${checkResult.pending_leads.length}`)

      await loadData()
      await checkIndicacoesPendentes()

    } catch (error) {
      console.error('Erro no processamento:', error)
      alert('Erro durante o processamento')
    } finally {
      setProcessingIndicacoes(false)
    }
  }

  const loadMentorados = async () => {
    try {
      const { data, error } = await supabase
        .from('mentorados')
        .select('*')
        .order('nome_completo')

      if (error) throw error
      setMentorados(data || [])
    } catch (error) {
      console.error('Erro ao carregar mentorados:', error)
    }
  }

  const loadPontuacoes = async () => {
    try {
      const { data, error } = await supabase
        .from('pontuacao_mentorados')
        .select(`
          *,
          mentorado:mentorados(nome_completo)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setPontuacoes(data || [])
    } catch (error) {
      console.error('Erro ao carregar pontuações:', error)
    }
  }

  const handleAddPontos = async () => {
    try {
      if (!formData.mentorado_id || !formData.tipo_acao || !formData.pontos || !formData.descricao) {
        alert('Preencha todos os campos obrigatórios')
        return
      }

      const response = await fetch('/api/pontuacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          criado_por: 'admin'
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(result.message)
        setShowAddModal(false)
        setFormData({
          mentorado_id: '',
          tipo_acao: '',
          pontos: 0,
          descricao: '',
          data_acao: new Date().toISOString().split('T')[0]
        })
        await loadData()
      } else {
        alert(result.error)
      }
    } catch (error) {
      console.error('Erro ao adicionar pontos:', error)
      alert('Erro ao adicionar pontos')
    }
  }

  const handleRemovePontos = async () => {
    try {
      if (!removeFormData.mentorado_id || !removeFormData.pontos || !removeFormData.descricao) {
        alert('Preencha todos os campos obrigatórios')
        return
      }

      if (removeFormData.pontos <= 0) {
        alert('Quantidade de pontos deve ser maior que zero')
        return
      }

      const response = await fetch('/api/pontuacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorado_id: removeFormData.mentorado_id,
          tipo_acao: 'custom',
          pontos: -removeFormData.pontos,
          descricao: `REMOÇÃO: ${removeFormData.descricao}`,
          data_acao: removeFormData.data_acao,
          criado_por: 'admin'
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(result.message)
        setShowRemoveModal(false)
        setRemoveFormData({
          mentorado_id: '',
          pontos: 0,
          descricao: '',
          data_acao: new Date().toISOString().split('T')[0]
        })
        await loadData()
      } else {
        alert(result.error)
      }
    } catch (error) {
      console.error('Erro ao remover pontos:', error)
      alert('Erro ao remover pontos')
    }
  }

  const handleDeletePontuacao = async (pontuacaoId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta entrada de pontuação?')) {
      return
    }

    try {
      const response = await fetch(`/api/pontuacao?id=${pontuacaoId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        alert(result.message)
        await loadData()
      } else {
        alert(result.error)
      }
    } catch (error) {
      console.error('Erro ao excluir pontuação:', error)
      alert('Erro ao excluir pontuação')
    }
  }

  const handleTipoAcaoChange = (tipo: string) => {
    const tipoConfig = tiposAcao.find(t => t.value === tipo)
    setFormData(prev => ({
      ...prev,
      tipo_acao: tipo,
      pontos: tipoConfig?.pontos || 0,
      descricao: tipoConfig?.label || ''
    }))
  }

  // Bulk action handlers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMentorados.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredMentorados.map(m => m.id)))
    }
  }

  const handleBulkAdd = () => {
    if (selectedIds.size === 0) return
    // Open add modal without a pre-selected mentorado - we'll iterate
    setShowBulkMenu(false)
    const ids = Array.from(selectedIds)
    const firstId = ids[0]
    setFormData(prev => ({ ...prev, mentorado_id: firstId }))
    setShowAddModal(true)
  }

  const handleBulkRemove = () => {
    if (selectedIds.size === 0) return
    setShowBulkMenu(false)
    const ids = Array.from(selectedIds)
    const firstId = ids[0]
    setRemoveFormData(prev => ({ ...prev, mentorado_id: firstId }))
    setShowRemoveModal(true)
  }

  const filteredMentorados = mentorados.filter(m =>
    m.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const topMentorados = mentorados
    .filter(m => m.pontuacao_total && m.pontuacao_total > 0)
    .sort((a, b) => (b.pontuacao_total || 0) - (a.pontuacao_total || 0))
    .slice(0, 5)

  const maxPontos = topMentorados.length > 0 ? (topMentorados[0]?.pontuacao_total || 1) : 1

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getTipoAcaoConfig = (tipo: string) => {
    return tiposAcao.find(t => t.value === tipo) || tiposAcao[0]
  }

  // Medal config for top 5
  const medalConfig = [
    { bg: 'bg-gradient-to-br from-yellow-400 to-amber-600', ring: 'ring-yellow-400/40', medal: '\uD83E\uDD47', shadow: 'shadow-yellow-500/20' },
    { bg: 'bg-gradient-to-br from-gray-300 to-gray-500', ring: 'ring-gray-400/40', medal: '\uD83E\uDD48', shadow: 'shadow-gray-400/20' },
    { bg: 'bg-gradient-to-br from-amber-600 to-amber-800', ring: 'ring-amber-600/40', medal: '\uD83E\uDD49', shadow: 'shadow-amber-600/20' },
    { bg: 'bg-gradient-to-br from-slate-500 to-slate-700', ring: 'ring-slate-500/30', medal: '', shadow: '' },
    { bg: 'bg-gradient-to-br from-slate-500 to-slate-700', ring: 'ring-slate-500/30', medal: '', shadow: '' },
  ]

  // Timeline color for history entries
  const timelineColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500',
    'bg-cyan-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500'
  ]

  if (loading) {
    return (
      <PageLayout title="Gerenciar Pontuação">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando...</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Gerenciar Pontuação">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Sistema de Pontuação</h1>
            <p className="text-gray-400">Gerencie pontos e ranking dos mentorados</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {indicacoesPendentes > 0 && (
              <Button
                onClick={processarIndicacoesPendentes}
                disabled={processingIndicacoes}
                variant="outline"
                className="flex items-center gap-2 border-white/10 text-gray-300 hover:bg-white/5"
              >
                <User className="w-4 h-4" />
                {processingIndicacoes ? 'Processando...' : `Processar ${indicacoesPendentes} Indicações`}
              </Button>
            )}
            <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4" />
              Adicionar Pontos
            </Button>
            <Button
              onClick={() => setShowRemoveModal(true)}
              variant="outline"
              className="flex items-center gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Minus className="w-4 h-4" />
              Remover Pontos
            </Button>
          </div>
        </div>

        {/* Cards de estatísticas - with gradient backgrounds */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative overflow-hidden bg-[#141418] p-6 rounded-xl ring-1 ring-white/[0.06] group hover:ring-blue-500/20 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.07] via-transparent to-transparent pointer-events-none" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-blue-500/[0.04] rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Mentorados</p>
                <p className="text-3xl font-bold text-white tracking-tight">{mentorados.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center ring-1 ring-blue-500/20">
                <User className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-[#141418] p-6 rounded-xl ring-1 ring-white/[0.06] group hover:ring-yellow-500/20 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/[0.07] via-transparent to-transparent pointer-events-none" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-yellow-500/[0.04] rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Com Pontuação</p>
                <p className="text-3xl font-bold text-white tracking-tight">
                  {mentorados.filter(m => m.pontuacao_total && m.pontuacao_total > 0).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-500/15 flex items-center justify-center ring-1 ring-yellow-500/20">
                <Trophy className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-[#141418] p-6 rounded-xl ring-1 ring-white/[0.06] group hover:ring-purple-500/20 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.07] via-transparent to-transparent pointer-events-none" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-purple-500/[0.04] rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Pontos Totais</p>
                <p className="text-3xl font-bold text-white tracking-tight">
                  {mentorados.reduce((sum, m) => sum + (m.pontuacao_total || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center ring-1 ring-purple-500/20">
                <Star className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-[#141418] p-6 rounded-xl ring-1 ring-white/[0.06] group hover:ring-green-500/20 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/[0.07] via-transparent to-transparent pointer-events-none" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-green-500/[0.04] rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Ações Registradas</p>
                <p className="text-3xl font-bold text-white tracking-tight">{pontuacoes.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center ring-1 ring-green-500/20">
                <Award className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Top 5 Ranking - Enhanced */}
        {topMentorados.length > 0 && (
          <div className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center ring-1 ring-yellow-500/20">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Top 5 Ranking</h2>
                <p className="text-xs text-gray-500">Os mentorados com melhor desempenho</p>
              </div>
            </div>
            <div className="space-y-3">
              {topMentorados.map((mentorado, index) => {
                const medal = medalConfig[index] || medalConfig[4]
                const progressPercent = Math.round(((mentorado.pontuacao_total || 0) / maxPontos) * 100)
                const progressBarColor = index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-slate-500'
                return (
                  <div
                    key={mentorado.id}
                    className={`relative flex items-center gap-4 p-4 bg-white/[0.02] rounded-xl ring-1 ring-white/[0.05] hover:ring-white/[0.1] transition-all duration-300 ${index < 3 ? 'hover:shadow-lg ' + medal.shadow : ''}`}
                  >
                    {/* Position medal / number */}
                    <div className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2 ${medal.ring} ${medal.bg} shadow-lg`}>
                      {index < 3 ? (
                        <span className="text-lg leading-none">{medal.medal}</span>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>

                    {/* Avatar with initials */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/[0.03] ring-1 ring-white/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-300">{getInitials(mentorado.nome_completo)}</span>
                    </div>

                    {/* Name + progress bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="font-medium text-white truncate">{mentorado.nome_completo}</p>
                        <div className="flex items-baseline gap-1 ml-3 flex-shrink-0">
                          <span className="text-xl font-bold text-white tabular-nums">{mentorado.pontuacao_total}</span>
                          <span className="text-xs text-gray-500">pts</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${progressBarColor} transition-all duration-700 ease-out`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Busca + Bulk Actions */}
        <div className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Buscar mentorado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#1a1a1e] border-white/[0.06] text-white placeholder-gray-500"
              />
            </div>

            {/* Bulk actions dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowBulkMenu(!showBulkMenu)}
                className={`flex items-center gap-2 border-white/10 text-gray-300 hover:bg-white/5 transition-colors ${selectedIds.size > 0 ? 'border-blue-500/40 text-blue-400' : ''}`}
              >
                <Filter className="w-4 h-4" />
                Ações em massa
                {selectedIds.size > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                    {selectedIds.size}
                  </span>
                )}
              </Button>

              {showBulkMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#1e1e24] rounded-xl ring-1 ring-white/[0.08] shadow-2xl shadow-black/40 z-50 overflow-hidden">
                  <div className="p-1.5">
                    <button
                      onClick={() => { toggleSelectAll(); setShowBulkMenu(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/[0.06] rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4 text-gray-500" />
                      {selectedIds.size === filteredMentorados.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                    <button
                      onClick={handleBulkAdd}
                      disabled={selectedIds.size === 0}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar pontos ({selectedIds.size})
                    </button>
                    <button
                      onClick={handleBulkRemove}
                      disabled={selectedIds.size === 0}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                      Remover pontos ({selectedIds.size})
                    </button>
                    <button
                      onClick={() => { setSelectedIds(new Set()); setShowBulkMenu(false) }}
                      disabled={selectedIds.size === 0}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-400 hover:bg-white/[0.06] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      Limpar seleção
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lista de mentorados - Enhanced */}
          <div className="space-y-1.5">
            {filteredMentorados.map((mentorado) => {
              const isSelected = selectedIds.has(mentorado.id)
              return (
                <div
                  key={mentorado.id}
                  className={`group flex items-center gap-3 p-3.5 rounded-xl ring-1 transition-all duration-200 cursor-default
                    ${isSelected
                      ? 'ring-blue-500/30 bg-blue-500/[0.06]'
                      : 'ring-white/[0.04] hover:ring-white/[0.08] hover:bg-white/[0.03]'
                    }`}
                >
                  {/* Checkbox area */}
                  <button
                    onClick={() => toggleSelect(mentorado.id)}
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200
                      ${isSelected
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-white/20 hover:border-white/40 group-hover:border-white/30'
                      }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Avatar with initials */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-white/10 to-white/[0.03] ring-1 ring-white/10 flex items-center justify-center group-hover:ring-white/20 transition-all duration-200">
                    <span className="text-xs font-semibold text-gray-400 group-hover:text-gray-300 transition-colors">{getInitials(mentorado.nome_completo)}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate text-sm">{mentorado.nome_completo}</p>
                    <p className="text-xs text-gray-500 truncate">{mentorado.email}</p>
                  </div>

                  {/* Point value with animation on hover */}
                  <div className="text-center px-3 group-hover:scale-110 transition-transform duration-200">
                    <p className="font-bold text-lg text-white tabular-nums leading-none">{mentorado.pontuacao_total || 0}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">pontos</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      onClick={() => {
                        setSelectedMentorado(mentorado.id)
                        setFormData(prev => ({ ...prev, mentorado_id: mentorado.id }))
                        setShowAddModal(true)
                      }}
                      size="sm"
                      variant="outline"
                      className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/50 h-8 px-2.5 text-xs transition-all duration-200"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Pontos
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedMentorado(mentorado.id)
                        setRemoveFormData(prev => ({ ...prev, mentorado_id: mentorado.id }))
                        setShowRemoveModal(true)
                      }}
                      size="sm"
                      variant="outline"
                      className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 h-8 px-2.5 text-xs transition-all duration-200"
                    >
                      <Minus className="w-3.5 h-3.5 mr-1" />
                      Pontos
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Histórico recente - Timeline style */}
        {pontuacoes.length > 0 && (
          <div className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center ring-1 ring-indigo-500/20">
                <Calendar className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Histórico Recente</h2>
                <p className="text-xs text-gray-500">Últimas ações registradas no sistema</p>
              </div>
            </div>

            <div className="relative">
              {/* Timeline vertical line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-transparent" />

              <div className="space-y-0">
                {pontuacoes.slice(0, 10).map((pontuacao, idx) => {
                  const isRemoval = pontuacao.pontos < 0 || pontuacao.descricao?.startsWith('REMOÇÃO:')
                  const config = isRemoval ?
                    { icon: Minus, color: 'bg-red-500' } :
                    getTipoAcaoConfig(pontuacao.tipo_acao)
                  const Icon = config.icon
                  const isNegative = pontuacao.pontos < 0
                  const dotColor = isRemoval ? 'bg-red-500' : timelineColors[idx % timelineColors.length]

                  return (
                    <div key={pontuacao.id} className="relative flex items-start gap-4 pb-5 last:pb-0 group">
                      {/* Timeline dot with connector */}
                      <div className="relative flex-shrink-0 z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${dotColor} ring-4 ring-[#141418] shadow-lg transition-transform duration-200 group-hover:scale-110`}>
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Content card */}
                      <div className="flex-1 pt-1">
                        <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/[0.02] ring-1 ring-white/[0.04] group-hover:ring-white/[0.08] group-hover:bg-white/[0.04] transition-all duration-200">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-white text-sm">
                              {pontuacao.mentorado?.nome_completo || 'Mentorado não encontrado'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{pontuacao.descricao}</p>
                            <p className="text-[10px] text-gray-600 mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(pontuacao.data_acao)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className={`px-2.5 py-1 rounded-lg text-sm font-bold tabular-nums ${
                              isNegative
                                ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/20'
                                : 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
                            }`}>
                              {isNegative ? '' : '+'}{pontuacao.pontos}
                            </div>
                            <Button
                              onClick={() => handleDeletePontuacao(pontuacao.id)}
                              size="sm"
                              variant="ghost"
                              className="text-gray-600 hover:text-red-400 hover:bg-red-500/10 p-1.5 h-auto opacity-0 group-hover:opacity-100 transition-all duration-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal para adicionar pontos - Enhanced */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg bg-[#1a1a1e] border-white/[0.06] shadow-2xl shadow-black/60">
          <DialogHeader className="pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/20">
                <Plus className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-white text-lg">Adicionar Pontos</DialogTitle>
                <p className="text-xs text-gray-500 mt-0.5">Preencha os campos abaixo para adicionar pontos</p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-400 mb-2">
                Mentorado
                <span className="text-red-400">*</span>
              </label>
              <Select value={formData.mentorado_id} onValueChange={(value) => setFormData(prev => ({ ...prev, mentorado_id: value }))}>
                <SelectTrigger className={`bg-[#141418] text-white transition-all duration-200 ${
                  formData.mentorado_id
                    ? 'border-emerald-500/30 ring-1 ring-emerald-500/10'
                    : 'border-white/[0.06] hover:border-white/[0.12]'
                }`}>
                  <SelectValue placeholder="Selecione um mentorado" />
                </SelectTrigger>
                <SelectContent>
                  {mentorados.map((mentorado) => (
                    <SelectItem key={mentorado.id} value={mentorado.id}>
                      {mentorado.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-400 mb-2">
                Tipo de Ação
                <span className="text-red-400">*</span>
              </label>
              <Select value={formData.tipo_acao} onValueChange={handleTipoAcaoChange}>
                <SelectTrigger className={`bg-[#141418] text-white transition-all duration-200 ${
                  formData.tipo_acao
                    ? 'border-emerald-500/30 ring-1 ring-emerald-500/10'
                    : 'border-white/[0.06] hover:border-white/[0.12]'
                }`}>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposAcao.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      <div className="flex items-center gap-2">
                        <tipo.icon className="w-4 h-4" />
                        {tipo.label}
                        {tipo.pontos > 0 && <span className="text-xs text-gray-400">({tipo.pontos} pts)</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-400 mb-2">
                  Pontos
                  <span className="text-red-400">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.pontos}
                  onChange={(e) => setFormData(prev => ({ ...prev, pontos: parseInt(e.target.value) || 0 }))}
                  className={`bg-[#141418] text-white transition-all duration-200 ${
                    formData.pontos > 0
                      ? 'border-emerald-500/30 ring-1 ring-emerald-500/10'
                      : 'border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-400 mb-2">
                  Data da Ação
                </label>
                <Input
                  type="date"
                  value={formData.data_acao}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_acao: e.target.value }))}
                  className="bg-[#141418] border-white/[0.06] text-white hover:border-white/[0.12] transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-400 mb-2">
                Descrição
                <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva o motivo dos pontos..."
                rows={3}
                className={`bg-[#141418] text-white placeholder-gray-600 transition-all duration-200 ${
                  formData.descricao.trim()
                    ? 'border-emerald-500/30 ring-1 ring-emerald-500/10'
                    : 'border-white/[0.06] hover:border-white/[0.12]'
                }`}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-white/[0.06] gap-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="border-white/10 text-gray-300 hover:bg-white/5">
              Cancelar
            </Button>
            <Button
              onClick={handleAddPontos}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/30 transition-all duration-200"
              disabled={!formData.mentorado_id || !formData.tipo_acao || !formData.pontos || !formData.descricao.trim()}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Adicionar Pontos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para remover pontos - Enhanced */}
      <Dialog open={showRemoveModal} onOpenChange={setShowRemoveModal}>
        <DialogContent className="sm:max-w-lg bg-[#1a1a1e] border-white/[0.06] shadow-2xl shadow-black/60">
          <DialogHeader className="pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center ring-1 ring-red-500/20">
                <Minus className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-red-400 text-lg">Remover Pontos</DialogTitle>
                <p className="text-xs text-gray-500 mt-0.5">Preencha os campos abaixo para remover pontos</p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-400 mb-2">
                Mentorado
                <span className="text-red-400">*</span>
              </label>
              <Select value={removeFormData.mentorado_id} onValueChange={(value) => setRemoveFormData(prev => ({ ...prev, mentorado_id: value }))}>
                <SelectTrigger className={`bg-[#141418] text-white transition-all duration-200 ${
                  removeFormData.mentorado_id
                    ? 'border-red-500/30 ring-1 ring-red-500/10'
                    : 'border-white/[0.06] hover:border-white/[0.12]'
                }`}>
                  <SelectValue placeholder="Selecione um mentorado" />
                </SelectTrigger>
                <SelectContent>
                  {mentorados.map((mentorado) => (
                    <SelectItem key={mentorado.id} value={mentorado.id}>
                      {mentorado.nome_completo} ({mentorado.pontuacao_total || 0} pts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-400 mb-2">
                  Pontos a Remover
                  <span className="text-red-400">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  value={removeFormData.pontos}
                  onChange={(e) => setRemoveFormData(prev => ({ ...prev, pontos: parseInt(e.target.value) || 0 }))}
                  placeholder="Ex: 5"
                  className={`bg-[#141418] text-white placeholder-gray-600 transition-all duration-200 ${
                    removeFormData.pontos > 0
                      ? 'border-red-500/30 ring-1 ring-red-500/10'
                      : 'border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-400 mb-2">
                  Data da Ação
                </label>
                <Input
                  type="date"
                  value={removeFormData.data_acao}
                  onChange={(e) => setRemoveFormData(prev => ({ ...prev, data_acao: e.target.value }))}
                  className="bg-[#141418] border-white/[0.06] text-white hover:border-white/[0.12] transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-400 mb-2">
                Motivo da Remoção
                <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={removeFormData.descricao}
                onChange={(e) => setRemoveFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva o motivo da remoção dos pontos..."
                rows={3}
                className={`bg-[#141418] text-white placeholder-gray-600 transition-all duration-200 ${
                  removeFormData.descricao.trim()
                    ? 'border-red-500/30 ring-1 ring-red-500/10'
                    : 'border-white/[0.06] hover:border-white/[0.12]'
                }`}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-white/[0.06] gap-2">
            <Button variant="outline" onClick={() => setShowRemoveModal(false)} className="border-white/10 text-gray-300 hover:bg-white/5">
              Cancelar
            </Button>
            <Button
              onClick={handleRemovePontos}
              className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30 transition-all duration-200"
              disabled={!removeFormData.mentorado_id || !removeFormData.pontos || !removeFormData.descricao.trim()}
            >
              <Minus className="w-4 h-4 mr-1.5" />
              Remover Pontos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Click-away handler for bulk menu */}
      {showBulkMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowBulkMenu(false)} />
      )}
    </PageLayout>
  )
}
