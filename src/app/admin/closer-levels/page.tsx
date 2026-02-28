'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Trophy,
  Users,
  Target,
  TrendingUp,
  DollarSign,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Shield,
  Award
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'
import { toast } from 'sonner'

interface CloserLevel {
  id: string
  organization_id: string
  nome_nivel: string
  ordem: number
  meta_faturado: number
  meta_arrecadado: number
  porcentagem_minima: number
  comissao_percentual: number
  descricao: string | null
  cor: string
  ativo: boolean
  created_at: string
  updated_at: string
}

interface CloserWithLevel {
  id: string
  nome_completo: string
  email: string
  tipo_closer: string
  status_contrato: string
  ativo: boolean
  closer_level_id: string | null
  meta_mensal: number
  total_vendas: number
  conversao_rate: number
  closer_level?: CloserLevel | null
}

interface LevelFormData {
  nome_nivel: string
  ordem: number
  meta_faturado: number
  meta_arrecadado: number
  porcentagem_minima: number
  comissao_percentual: number
  descricao: string
  cor: string
  ativo: boolean
}

const DEFAULT_LEVELS = [
  { nome_nivel: 'Trainee', ordem: 1, meta_faturado: 10000, meta_arrecadado: 5000, porcentagem_minima: 5, comissao_percentual: 3, cor: '#6B7280', descricao: 'Nivel inicial para novos closers em treinamento' },
  { nome_nivel: 'Junior', ordem: 2, meta_faturado: 30000, meta_arrecadado: 15000, porcentagem_minima: 10, comissao_percentual: 5, cor: '#3B82F6', descricao: 'Closer com experiencia basica e primeiros resultados' },
  { nome_nivel: 'Pleno', ordem: 3, meta_faturado: 60000, meta_arrecadado: 35000, porcentagem_minima: 15, comissao_percentual: 8, cor: '#8B5CF6', descricao: 'Closer experiente com resultados consistentes' },
  { nome_nivel: 'Senior', ordem: 4, meta_faturado: 100000, meta_arrecadado: 60000, porcentagem_minima: 20, comissao_percentual: 12, cor: '#F59E0B', descricao: 'Top performer com resultados excepcionais' },
]

const LEVEL_COLORS = [
  { value: '#6B7280', label: 'Cinza' },
  { value: '#3B82F6', label: 'Azul' },
  { value: '#8B5CF6', label: 'Roxo' },
  { value: '#F59E0B', label: 'Amarelo' },
  { value: '#10B981', label: 'Verde' },
  { value: '#EF4444', label: 'Vermelho' },
  { value: '#EC4899', label: 'Rosa' },
  { value: '#D4AF37', label: 'Dourado' },
]

export default function CloserLevelsPage() {
  const { organizationId } = useAuth()
  const [levels, setLevels] = useState<CloserLevel[]>([])
  const [closers, setClosers] = useState<CloserWithLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLevel, setEditingLevel] = useState<CloserLevel | null>(null)
  const [formData, setFormData] = useState<LevelFormData>({
    nome_nivel: '',
    ordem: 1,
    meta_faturado: 0,
    meta_arrecadado: 0,
    porcentagem_minima: 0,
    comissao_percentual: 0,
    descricao: '',
    cor: '#6B7280',
    ativo: true
  })

  const loadData = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      await Promise.all([loadLevels(), loadClosers()])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    if (organizationId) loadData()
  }, [organizationId, loadData])

  const loadLevels = async () => {
    const { data, error } = await supabase
      .from('closer_levels')
      .select('*')
      .eq('organization_id', organizationId)
      .order('ordem', { ascending: true })

    if (error) {
      console.error('Error loading levels:', error)
      throw error
    }
    setLevels(data || [])
  }

  const loadClosers = async () => {
    const { data, error } = await supabase
      .from('closers')
      .select(`
        id,
        nome_completo,
        email,
        tipo_closer,
        status_contrato,
        ativo,
        closer_level_id,
        meta_mensal,
        total_vendas,
        conversao_rate,
        closer_levels(*)
      `)
      .eq('organization_id', organizationId)
      .order('nome_completo', { ascending: true })

    if (error) {
      console.error('Error loading closers:', error)
      throw error
    }

    const mapped = (data || []).map((c: any) => ({
      ...c,
      closer_level: c.closer_levels || null
    }))
    setClosers(mapped)
  }

  const createDefaultLevels = async () => {
    if (!organizationId) return

    try {
      const levelsToInsert = DEFAULT_LEVELS.map(level => ({
        ...level,
        organization_id: organizationId,
        ativo: true
      }))

      const { error } = await supabase
        .from('closer_levels')
        .insert(levelsToInsert)

      if (error) throw error

      toast.success('Niveis padrao criados com sucesso!')
      loadData()
    } catch (error) {
      console.error('Error creating default levels:', error)
      toast.error('Erro ao criar niveis padrao')
    }
  }

  const saveLevel = async () => {
    if (!formData.nome_nivel) {
      toast.error('Nome do nivel e obrigatorio')
      return
    }

    try {
      if (editingLevel) {
        const { error } = await supabase
          .from('closer_levels')
          .update({
            nome_nivel: formData.nome_nivel,
            ordem: formData.ordem,
            meta_faturado: formData.meta_faturado,
            meta_arrecadado: formData.meta_arrecadado,
            porcentagem_minima: formData.porcentagem_minima,
            comissao_percentual: formData.comissao_percentual,
            descricao: formData.descricao || null,
            cor: formData.cor,
            ativo: formData.ativo,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLevel.id)

        if (error) throw error
        toast.success('Nivel atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('closer_levels')
          .insert({
            organization_id: organizationId,
            nome_nivel: formData.nome_nivel,
            ordem: formData.ordem,
            meta_faturado: formData.meta_faturado,
            meta_arrecadado: formData.meta_arrecadado,
            porcentagem_minima: formData.porcentagem_minima,
            comissao_percentual: formData.comissao_percentual,
            descricao: formData.descricao || null,
            cor: formData.cor,
            ativo: formData.ativo
          })

        if (error) throw error
        toast.success('Nivel criado com sucesso!')
      }

      setIsModalOpen(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Error saving level:', error)
      toast.error('Erro ao salvar nivel')
    }
  }

  const deleteLevel = async (levelId: string) => {
    if (!confirm('Tem certeza que deseja excluir este nivel? Closers vinculados perderao o nivel.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('closer_levels')
        .delete()
        .eq('id', levelId)

      if (error) throw error

      toast.success('Nivel excluido com sucesso!')
      loadData()
    } catch (error) {
      console.error('Error deleting level:', error)
      toast.error('Erro ao excluir nivel')
    }
  }

  const assignLevel = async (closerId: string, levelId: string | null) => {
    try {
      const { error } = await supabase
        .from('closers')
        .update({
          closer_level_id: levelId === 'none' ? null : levelId,
          updated_at: new Date().toISOString()
        })
        .eq('id', closerId)

      if (error) throw error

      toast.success('Nivel do closer atualizado!')
      loadData()
    } catch (error) {
      console.error('Error assigning level:', error)
      toast.error('Erro ao atualizar nivel do closer')
    }
  }

  const openEditModal = (level: CloserLevel) => {
    setEditingLevel(level)
    setFormData({
      nome_nivel: level.nome_nivel,
      ordem: level.ordem,
      meta_faturado: level.meta_faturado,
      meta_arrecadado: level.meta_arrecadado,
      porcentagem_minima: level.porcentagem_minima,
      comissao_percentual: level.comissao_percentual,
      descricao: level.descricao || '',
      cor: level.cor,
      ativo: level.ativo
    })
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    resetForm()
    setEditingLevel(null)
    setFormData(prev => ({
      ...prev,
      ordem: levels.length + 1
    }))
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setEditingLevel(null)
    setFormData({
      nome_nivel: '',
      ordem: 1,
      meta_faturado: 0,
      meta_arrecadado: 0,
      porcentagem_minima: 0,
      comissao_percentual: 0,
      descricao: '',
      cor: '#6B7280',
      ativo: true
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const getClosersInLevel = (levelId: string) => {
    return closers.filter(c => c.closer_level_id === levelId)
  }

  const getClosersWithoutLevel = () => {
    return closers.filter(c => !c.closer_level_id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-[#0A0A0A]">
        <RefreshCw className="h-8 w-8 animate-spin text-[#D4AF37]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Trophy className="h-8 w-8 text-[#D4AF37]" />
              Niveis de Closers
            </h1>
            <p className="text-gray-400 mt-1">
              Configure niveis de performance e metas para cada categoria de closer
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-300 hover:bg-[#1A1A1A] hover:text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button
              onClick={openCreateModal}
              className="bg-[#D4AF37] hover:bg-[#C4A030] text-black font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Nivel
            </Button>
          </div>
        </div>

        <Tabs defaultValue="levels" className="w-full">
          <TabsList className="bg-[#1A1A1A] border border-gray-800">
            <TabsTrigger value="levels" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">
              Configurar Niveis
            </TabsTrigger>
            <TabsTrigger value="closers" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">
              Closers & Atribuicao
            </TabsTrigger>
          </TabsList>

          {/* Tab: Level Configuration */}
          <TabsContent value="levels" className="space-y-6">
            {levels.length === 0 ? (
              <Card className="bg-[#1A1A1A] border-gray-800">
                <CardContent className="text-center py-12">
                  <Trophy className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">
                    Nenhum nivel configurado
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Crie niveis de performance para categorizar seus closers
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={createDefaultLevels}
                      className="bg-[#D4AF37] hover:bg-[#C4A030] text-black font-semibold"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Criar Niveis Padrao (Trainee a Senior)
                    </Button>
                    <Button
                      onClick={openCreateModal}
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-[#1A1A1A]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Manualmente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {levels.map((level) => {
                  const closersInLevel = getClosersInLevel(level.id)
                  return (
                    <Card
                      key={level.id}
                      className="bg-[#1A1A1A] border-gray-800 relative overflow-hidden"
                    >
                      {/* Color bar top */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ backgroundColor: level.cor }}
                      />

                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: level.cor }}
                            />
                            <CardTitle className="text-lg text-white">
                              {level.nome_nivel}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-1">
                            {!level.ativo && (
                              <Badge variant="secondary" className="bg-gray-700 text-gray-400 text-xs">
                                Inativo
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className="border-gray-600 text-gray-400 text-xs"
                            >
                              Ordem {level.ordem}
                            </Badge>
                          </div>
                        </div>
                        {level.descricao && (
                          <CardDescription className="text-gray-500 text-sm mt-1">
                            {level.descricao}
                          </CardDescription>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Meta Faturado */}
                        <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-gray-400">Meta Faturado</span>
                          </div>
                          <span className="text-sm font-semibold text-green-400">
                            {formatCurrency(level.meta_faturado)}
                          </span>
                        </div>

                        {/* Meta Arrecadado */}
                        <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-gray-400">Meta Arrecadado</span>
                          </div>
                          <span className="text-sm font-semibold text-blue-400">
                            {formatCurrency(level.meta_arrecadado)}
                          </span>
                        </div>

                        {/* Porcentagem Minima */}
                        <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-purple-500" />
                            <span className="text-sm text-gray-400">% Minima</span>
                          </div>
                          <span className="text-sm font-semibold text-purple-400">
                            {level.porcentagem_minima}%
                          </span>
                        </div>

                        {/* Comissao */}
                        <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-[#D4AF37]" />
                            <span className="text-sm text-gray-400">Comissao</span>
                          </div>
                          <span className="text-sm font-semibold text-[#D4AF37]">
                            {level.comissao_percentual}%
                          </span>
                        </div>

                        <Separator className="bg-gray-800" />

                        {/* Closers count */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Users className="h-4 w-4" />
                            <span>{closersInLevel.length} closer{closersInLevel.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-gray-700 text-gray-300 hover:bg-[#0A0A0A] hover:text-white"
                            onClick={() => openEditModal(level)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-900 text-red-400 hover:bg-red-950 hover:text-red-300"
                            onClick={() => deleteLevel(level.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab: Closers & Assignment */}
          <TabsContent value="closers" className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-[#1A1A1A] border-gray-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-[#D4AF37]" />
                    <div>
                      <p className="text-sm text-gray-400">Total Closers</p>
                      <p className="text-2xl font-bold text-white">{closers.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#1A1A1A] border-gray-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-400">Com Nivel</p>
                      <p className="text-2xl font-bold text-white">
                        {closers.filter(c => c.closer_level_id).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#1A1A1A] border-gray-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Shield className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="text-sm text-gray-400">Sem Nivel</p>
                      <p className="text-2xl font-bold text-white">
                        {getClosersWithoutLevel().length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#1A1A1A] border-gray-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Target className="h-8 w-8 text-purple-500" />
                    <div>
                      <p className="text-sm text-gray-400">Niveis Configurados</p>
                      <p className="text-2xl font-bold text-white">{levels.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Closers list */}
            <Card className="bg-[#1A1A1A] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#D4AF37]" />
                  Closers e Niveis Atribuidos
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Atribua niveis de performance para cada closer da equipe
                </CardDescription>
              </CardHeader>
              <CardContent>
                {closers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-500">Nenhum closer cadastrado</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left p-3 text-gray-400 text-sm font-medium">Closer</th>
                          <th className="text-left p-3 text-gray-400 text-sm font-medium">Tipo</th>
                          <th className="text-left p-3 text-gray-400 text-sm font-medium">Nivel Atual</th>
                          <th className="text-left p-3 text-gray-400 text-sm font-medium">Meta Mensal</th>
                          <th className="text-left p-3 text-gray-400 text-sm font-medium">Vendas</th>
                          <th className="text-left p-3 text-gray-400 text-sm font-medium">Conversao</th>
                          <th className="text-left p-3 text-gray-400 text-sm font-medium">Status</th>
                          <th className="text-left p-3 text-gray-400 text-sm font-medium">Atribuir Nivel</th>
                        </tr>
                      </thead>
                      <tbody>
                        {closers.map((closer) => {
                          const currentLevel = levels.find(l => l.id === closer.closer_level_id)
                          return (
                            <tr
                              key={closer.id}
                              className="border-b border-gray-800/50 hover:bg-[#0A0A0A]/50 transition-colors"
                            >
                              <td className="p-3">
                                <div>
                                  <p className="font-medium text-white">{closer.nome_completo}</p>
                                  <p className="text-xs text-gray-500">{closer.email}</p>
                                </div>
                              </td>
                              <td className="p-3">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    closer.tipo_closer === 'closer'
                                      ? 'border-blue-600 text-blue-400'
                                      : closer.tipo_closer === 'sdr'
                                      ? 'border-green-600 text-green-400'
                                      : 'border-gray-600 text-gray-400'
                                  }`}
                                >
                                  {closer.tipo_closer?.toUpperCase() || 'N/A'}
                                </Badge>
                              </td>
                              <td className="p-3">
                                {currentLevel ? (
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-2.5 h-2.5 rounded-full"
                                      style={{ backgroundColor: currentLevel.cor }}
                                    />
                                    <span className="text-sm text-white font-medium">
                                      {currentLevel.nome_nivel}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-600">Sem nivel</span>
                                )}
                              </td>
                              <td className="p-3">
                                <span className="text-sm text-gray-300">
                                  {formatCurrency(closer.meta_mensal || 0)}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="text-sm text-gray-300">
                                  {closer.total_vendas || 0}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="text-sm text-gray-300">
                                  {(closer.conversao_rate || 0).toFixed(1)}%
                                </span>
                              </td>
                              <td className="p-3">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    closer.ativo !== false
                                      ? 'border-green-600 text-green-400'
                                      : 'border-red-600 text-red-400'
                                  }`}
                                >
                                  {closer.ativo !== false ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <Select
                                  value={closer.closer_level_id || 'none'}
                                  onValueChange={(value) => assignLevel(closer.id, value)}
                                >
                                  <SelectTrigger className="w-40 bg-[#0A0A0A] border-gray-700 text-gray-300 text-sm">
                                    <SelectValue placeholder="Selecionar..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#1A1A1A] border-gray-700">
                                    <SelectItem value="none" className="text-gray-400">
                                      Sem nivel
                                    </SelectItem>
                                    {levels.filter(l => l.ativo).map((level) => (
                                      <SelectItem
                                        key={level.id}
                                        value={level.id}
                                        className="text-gray-300"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: level.cor }}
                                          />
                                          {level.nome_nivel}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Level breakdown */}
            {levels.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {levels.map((level) => {
                  const closersInLevel = getClosersInLevel(level.id)
                  return (
                    <Card key={level.id} className="bg-[#1A1A1A] border-gray-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: level.cor }}
                          />
                          <span className="text-white">{level.nome_nivel}</span>
                          <Badge variant="secondary" className="ml-auto bg-gray-800 text-gray-300 text-xs">
                            {closersInLevel.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {closersInLevel.length === 0 ? (
                          <p className="text-xs text-gray-600">Nenhum closer neste nivel</p>
                        ) : (
                          <div className="space-y-2">
                            {closersInLevel.map((c) => (
                              <div
                                key={c.id}
                                className="flex items-center justify-between p-2 bg-[#0A0A0A] rounded-lg text-sm"
                              >
                                <span className="text-gray-300 truncate">{c.nome_completo}</span>
                                <span className="text-gray-500 text-xs">{c.tipo_closer?.toUpperCase()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}

                {/* Without level card */}
                {getClosersWithoutLevel().length > 0 && (
                  <Card className="bg-[#1A1A1A] border-gray-800 border-dashed">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-600" />
                        <span className="text-gray-400">Sem Nivel</span>
                        <Badge variant="secondary" className="ml-auto bg-gray-800 text-gray-300 text-xs">
                          {getClosersWithoutLevel().length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {getClosersWithoutLevel().map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between p-2 bg-[#0A0A0A] rounded-lg text-sm"
                          >
                            <span className="text-gray-400 truncate">{c.nome_completo}</span>
                            <span className="text-gray-600 text-xs">{c.tipo_closer?.toUpperCase()}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create/Edit Level Modal */}
        <Dialog open={isModalOpen} onOpenChange={(open) => {
          if (!open) {
            setIsModalOpen(false)
            resetForm()
          }
        }}>
          <DialogContent className="max-w-lg bg-[#1A1A1A] border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingLevel ? 'Editar' : 'Criar'} Nivel
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Configure as metas e parametros do nivel de performance
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Nome e Ordem */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Nome do Nivel *</Label>
                  <Input
                    value={formData.nome_nivel}
                    onChange={(e) => setFormData({ ...formData, nome_nivel: e.target.value })}
                    placeholder="Ex: Trainee, Junior..."
                    className="bg-[#0A0A0A] border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Ordem</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.ordem}
                    onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 1 })}
                    className="bg-[#0A0A0A] border-gray-700 text-white"
                  />
                </div>
              </div>

              {/* Descricao */}
              <div>
                <Label className="text-gray-300">Descricao</Label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descricao do nivel..."
                  className="bg-[#0A0A0A] border-gray-700 text-white"
                />
              </div>

              {/* Cor */}
              <div>
                <Label className="text-gray-300">Cor do Nivel</Label>
                <div className="flex gap-2 mt-1">
                  {LEVEL_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setFormData({ ...formData, cor: color.value })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.cor === color.value
                          ? 'border-white scale-110'
                          : 'border-gray-700 hover:border-gray-500'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              <Separator className="bg-gray-800" />

              {/* Metas */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-[#D4AF37]">Metas do Nivel</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Meta Faturado (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.meta_faturado}
                      onChange={(e) => setFormData({ ...formData, meta_faturado: parseFloat(e.target.value) || 0 })}
                      className="bg-[#0A0A0A] border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Meta Arrecadado (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.meta_arrecadado}
                      onChange={(e) => setFormData({ ...formData, meta_arrecadado: parseFloat(e.target.value) || 0 })}
                      className="bg-[#0A0A0A] border-gray-700 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Porcentagem Minima (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formData.porcentagem_minima}
                      onChange={(e) => setFormData({ ...formData, porcentagem_minima: parseFloat(e.target.value) || 0 })}
                      className="bg-[#0A0A0A] border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Comissao (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formData.comissao_percentual}
                      onChange={(e) => setFormData({ ...formData, comissao_percentual: parseFloat(e.target.value) || 0 })}
                      className="bg-[#0A0A0A] border-gray-700 text-white"
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-gray-800" />

              {/* Ativo */}
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
                <Label className="text-gray-300">Nivel ativo</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-[#0A0A0A]"
                onClick={() => {
                  setIsModalOpen(false)
                  resetForm()
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={saveLevel}
                disabled={!formData.nome_nivel}
                className="bg-[#D4AF37] hover:bg-[#C4A030] text-black font-semibold"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingLevel ? 'Atualizar' : 'Criar'} Nivel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
