'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { supabase } from '@/lib/supabase'
import {
  Trophy,
  Plus,
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
  { value: 'custom', label: 'Personalizado', icon: Gift, color: 'bg-pink-500', pontos: 0 }
]

export default function PontuacaoAdminPage() {
  const [mentorados, setMentorados] = useState<MentoradoComPontos[]>([])
  const [pontuacoes, setPontuacoes] = useState<PontuacaoMentorado[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedMentorado, setSelectedMentorado] = useState<string>('')

  // Form state
  const [formData, setFormData] = useState({
    mentorado_id: '',
    tipo_acao: '',
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
      // Primeiro verificar pendentes
      const checkResponse = await fetch('/api/indicacao-pontos')
      const checkResult = await checkResponse.json()

      if (!checkResult.success || !checkResult.pending_leads?.length) {
        alert('Nenhuma indicação pendente encontrada')
        return
      }

      let processados = 0
      let erros = 0

      // Processar cada lead pendente
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

      // Recarregar dados
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          criado_por: 'admin' // TODO: pegar do contexto de auth
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Gerenciar Pontuação">
      <div className="space-y-6">
        {/* Header com botão de adicionar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sistema de Pontuação</h1>
            <p className="text-gray-600">Gerencie pontos e ranking dos mentorados</p>
          </div>
          <div className="flex items-center gap-2">
            {indicacoesPendentes > 0 && (
              <Button
                onClick={processarIndicacoesPendentes}
                disabled={processingIndicacoes}
                variant="outline"
                className="flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                {processingIndicacoes ? 'Processando...' : `Processar ${indicacoesPendentes} Indicações`}
              </Button>
            )}
            <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Pontos
            </Button>
          </div>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Mentorados</p>
                <p className="text-2xl font-bold text-gray-900">{mentorados.length}</p>
              </div>
              <User className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Com Pontuação</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mentorados.filter(m => m.pontuacao_total && m.pontuacao_total > 0).length}
                </p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pontos Totais</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mentorados.reduce((sum, m) => sum + (m.pontuacao_total || 0), 0)}
                </p>
              </div>
              <Star className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ações Registradas</p>
                <p className="text-2xl font-bold text-gray-900">{pontuacoes.length}</p>
              </div>
              <Award className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Top 5 Ranking */}
        {topMentorados.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Top 5 Ranking
            </h2>
            <div className="space-y-3">
              {topMentorados.map((mentorado, index) => (
                <div key={mentorado.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{mentorado.nome_completo}</p>
                      <p className="text-sm text-gray-600">{mentorado.genero || 'Não informado'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">{mentorado.pontuacao_total}</p>
                    <p className="text-xs text-gray-600">pontos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Busca */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-4 mb-4">
            <Search className="w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar mentorado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Lista de mentorados */}
          <div className="space-y-2">
            {filteredMentorados.map((mentorado) => (
              <div key={mentorado.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{mentorado.nome_completo}</p>
                  <p className="text-sm text-gray-600">{mentorado.email}</p>
                </div>
                <div className="text-center px-4">
                  <p className="font-bold text-lg text-gray-900">{mentorado.pontuacao_total || 0}</p>
                  <p className="text-xs text-gray-600">pontos</p>
                </div>
                <Button
                  onClick={() => {
                    setSelectedMentorado(mentorado.id)
                    setFormData(prev => ({ ...prev, mentorado_id: mentorado.id }))
                    setShowAddModal(true)
                  }}
                  size="sm"
                  variant="outline"
                >
                  + Pontos
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Histórico recente */}
        {pontuacoes.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Histórico Recente</h2>
            <div className="space-y-3">
              {pontuacoes.slice(0, 10).map((pontuacao) => {
                const config = getTipoAcaoConfig(pontuacao.tipo_acao)
                const Icon = config.icon
                return (
                  <div key={pontuacao.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {pontuacao.mentorado?.nome_completo || 'Mentorado não encontrado'}
                        </p>
                        <p className="text-sm text-gray-600">{pontuacao.descricao}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">+{pontuacao.pontos}</p>
                      <p className="text-xs text-gray-600">{formatDate(pontuacao.data_acao)}</p>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Pontos</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mentorado</label>
              <Select value={formData.mentorado_id} onValueChange={(value) => setFormData(prev => ({ ...prev, mentorado_id: value }))}>
                <SelectTrigger>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Ação</label>
              <Select value={formData.tipo_acao} onValueChange={handleTipoAcaoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposAcao.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      <div className="flex items-center gap-2">
                        <tipo.icon className="w-4 h-4" />
                        {tipo.label}
                        {tipo.pontos > 0 && <span className="text-xs text-gray-500">({tipo.pontos} pts)</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pontos</label>
              <Input
                type="number"
                min="0"
                value={formData.pontos}
                onChange={(e) => setFormData(prev => ({ ...prev, pontos: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva o motivo dos pontos..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data da Ação</label>
              <Input
                type="date"
                value={formData.data_acao}
                onChange={(e) => setFormData(prev => ({ ...prev, data_acao: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddPontos}>
              Adicionar Pontos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}