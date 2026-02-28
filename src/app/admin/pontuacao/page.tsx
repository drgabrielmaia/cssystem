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

export default function PontuacaoAdminPage() {
  const [mentorados, setMentorados] = useState<MentoradoComPontos[]>([])
  const [pontuacoes, setPontuacoes] = useState<PontuacaoMentorado[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [selectedMentorado, setSelectedMentorado] = useState<string>('')

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

  const filteredMentorados = mentorados.filter(m =>
    m.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const topMentorados = mentorados
    .filter(m => m.pontuacao_total && m.pontuacao_total > 0)
    .sort((a, b) => (b.pontuacao_total || 0) - (a.pontuacao_total || 0))
    .slice(0, 5)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getTipoAcaoConfig = (tipo: string) => {
    return tiposAcao.find(t => t.value === tipo) || tiposAcao[0]
  }

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
          <div className="flex items-center gap-2">
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

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#141418] p-6 rounded-xl ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Mentorados</p>
                <p className="text-2xl font-bold text-white">{mentorados.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#141418] p-6 rounded-xl ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Com Pontuação</p>
                <p className="text-2xl font-bold text-white">
                  {mentorados.filter(m => m.pontuacao_total && m.pontuacao_total > 0).length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#141418] p-6 rounded-xl ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pontos Totais</p>
                <p className="text-2xl font-bold text-white">
                  {mentorados.reduce((sum, m) => sum + (m.pontuacao_total || 0), 0)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <Star className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-[#141418] p-6 rounded-xl ring-1 ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Ações Registradas</p>
                <p className="text-2xl font-bold text-white">{pontuacoes.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center">
                <Award className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Top 5 Ranking */}
        {topMentorados.length > 0 && (
          <div className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Top 5 Ranking
            </h2>
            <div className="space-y-3">
              {topMentorados.map((mentorado, index) => (
                <div key={mentorado.id} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg ring-1 ring-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-amber-600' : 'bg-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-white">{mentorado.nome_completo}</p>
                      <p className="text-sm text-gray-500">{mentorado.genero || 'Não informado'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-white">{mentorado.pontuacao_total}</p>
                    <p className="text-xs text-gray-500">pontos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Busca */}
        <div className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] p-6">
          <div className="flex items-center gap-4 mb-4">
            <Search className="w-5 h-5 text-gray-500" />
            <Input
              placeholder="Buscar mentorado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-[#1a1a1e] border-white/[0.06] text-white placeholder-gray-500"
            />
          </div>

          {/* Lista de mentorados */}
          <div className="space-y-2">
            {filteredMentorados.map((mentorado) => (
              <div key={mentorado.id} className="flex items-center justify-between p-3 rounded-lg ring-1 ring-white/[0.04] hover:bg-white/[0.03] transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-white">{mentorado.nome_completo}</p>
                  <p className="text-sm text-gray-500">{mentorado.email}</p>
                </div>
                <div className="text-center px-4">
                  <p className="font-bold text-lg text-white">{mentorado.pontuacao_total || 0}</p>
                  <p className="text-xs text-gray-500">pontos</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      setSelectedMentorado(mentorado.id)
                      setFormData(prev => ({ ...prev, mentorado_id: mentorado.id }))
                      setShowAddModal(true)
                    }}
                    size="sm"
                    variant="outline"
                    className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                  >
                    + Pontos
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedMentorado(mentorado.id)
                      setRemoveFormData(prev => ({ ...prev, mentorado_id: mentorado.id }))
                      setShowRemoveModal(true)
                    }}
                    size="sm"
                    variant="outline"
                    className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                  >
                    - Pontos
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Histórico recente */}
        {pontuacoes.length > 0 && (
          <div className="bg-[#141418] rounded-xl ring-1 ring-white/[0.06] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Histórico Recente</h2>
            <div className="space-y-3">
              {pontuacoes.slice(0, 10).map((pontuacao) => {
                const isRemoval = pontuacao.pontos < 0 || pontuacao.descricao?.startsWith('REMOÇÃO:')
                const config = isRemoval ?
                  { icon: Minus, color: 'bg-red-500' } :
                  getTipoAcaoConfig(pontuacao.tipo_acao)
                const Icon = config.icon
                const isNegative = pontuacao.pontos < 0
                return (
                  <div key={pontuacao.id} className="flex items-center justify-between p-3 rounded-lg ring-1 ring-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {pontuacao.mentorado?.nome_completo || 'Mentorado não encontrado'}
                        </p>
                        <p className="text-sm text-gray-500">{pontuacao.descricao}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className={`font-bold ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
                          {isNegative ? '' : '+'}{pontuacao.pontos}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(pontuacao.data_acao)}</p>
                      </div>
                      <Button
                        onClick={() => handleDeletePontuacao(pontuacao.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal para adicionar pontos */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md bg-[#1a1a1e] border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="text-white">Adicionar Pontos</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Mentorado</label>
              <Select value={formData.mentorado_id} onValueChange={(value) => setFormData(prev => ({ ...prev, mentorado_id: value }))}>
                <SelectTrigger className="bg-[#141418] border-white/[0.06] text-white">
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
              <label className="block text-sm font-medium text-gray-400 mb-2">Tipo de Ação</label>
              <Select value={formData.tipo_acao} onValueChange={handleTipoAcaoChange}>
                <SelectTrigger className="bg-[#141418] border-white/[0.06] text-white">
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

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Pontos</label>
              <Input
                type="number"
                min="0"
                value={formData.pontos}
                onChange={(e) => setFormData(prev => ({ ...prev, pontos: parseInt(e.target.value) || 0 }))}
                className="bg-[#141418] border-white/[0.06] text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Descrição</label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva o motivo dos pontos..."
                rows={3}
                className="bg-[#141418] border-white/[0.06] text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Data da Ação</label>
              <Input
                type="date"
                value={formData.data_acao}
                onChange={(e) => setFormData(prev => ({ ...prev, data_acao: e.target.value }))}
                className="bg-[#141418] border-white/[0.06] text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="border-white/10 text-gray-300 hover:bg-white/5">
              Cancelar
            </Button>
            <Button onClick={handleAddPontos} className="bg-emerald-600 hover:bg-emerald-700">
              Adicionar Pontos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para remover pontos */}
      <Dialog open={showRemoveModal} onOpenChange={setShowRemoveModal}>
        <DialogContent className="sm:max-w-md bg-[#1a1a1e] border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="text-red-400">Remover Pontos</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Mentorado</label>
              <Select value={removeFormData.mentorado_id} onValueChange={(value) => setRemoveFormData(prev => ({ ...prev, mentorado_id: value }))}>
                <SelectTrigger className="bg-[#141418] border-white/[0.06] text-white">
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

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Quantidade de Pontos a Remover</label>
              <Input
                type="number"
                min="1"
                value={removeFormData.pontos}
                onChange={(e) => setRemoveFormData(prev => ({ ...prev, pontos: parseInt(e.target.value) || 0 }))}
                placeholder="Ex: 5"
                className="bg-[#141418] border-white/[0.06] text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Motivo da Remoção</label>
              <Textarea
                value={removeFormData.descricao}
                onChange={(e) => setRemoveFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva o motivo da remoção dos pontos..."
                rows={3}
                className="bg-[#141418] border-white/[0.06] text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Data da Ação</label>
              <Input
                type="date"
                value={removeFormData.data_acao}
                onChange={(e) => setRemoveFormData(prev => ({ ...prev, data_acao: e.target.value }))}
                className="bg-[#141418] border-white/[0.06] text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveModal(false)} className="border-white/10 text-gray-300 hover:bg-white/5">
              Cancelar
            </Button>
            <Button
              onClick={handleRemovePontos}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remover Pontos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}