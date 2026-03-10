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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
        name: level.nome_nivel,
        color: level.cor,
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

  // Helper: get initials from name
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  // Helper: compute progress toward next level for a closer
  const getCloserProgress = (closer: CloserWithLevel) => {
    const currentLevel = levels.find(l => l.id === closer.closer_level_id)
    if (!currentLevel) {
      // No level - show progress toward first level
      const firstLevel = levels[0]
      if (!firstLevel) return null
      const progress = firstLevel.meta_faturado > 0
        ? Math.min(100, Math.round(((closer.meta_mensal || 0) / firstLevel.meta_faturado) * 100))
        : 0
      return { progress, nextLevel: firstLevel, currentLevel: null }
    }
    const nextLevel = levels.find(l => l.ordem === currentLevel.ordem + 1)
    if (!nextLevel) return { progress: 100, nextLevel: null, currentLevel }
    const progress = nextLevel.meta_faturado > 0
      ? Math.min(100, Math.round(((closer.meta_mensal || 0) / nextLevel.meta_faturado) * 100))
      : 0
    return { progress, nextLevel, currentLevel }
  }

  // ---- LOADING STATE ----
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          {/* Animated pulsing trophy */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#D4AF37]/20 animate-ping" style={{ animationDuration: '1.5s' }} />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
              <Trophy className="h-9 w-9 text-[#D4AF37] animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-white font-semibold text-lg">Carregando niveis</p>
            <p className="text-gray-500 text-sm">Preparando dados de performance...</p>
          </div>
          {/* Animated bar */}
          <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#C4A030] rounded-full animate-pulse"
              style={{ width: '60%', animation: 'shimmer 1.5s ease-in-out infinite alternate' }}
            />
          </div>
        </div>
        <style>{`
          @keyframes shimmer {
            0% { width: 20%; opacity: 0.5; }
            100% { width: 80%; opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  // ---- MAX VALUES (for comparison bar charts) ----
  const maxFaturado = Math.max(...levels.map(l => l.meta_faturado), 1)
  const maxArrecadado = Math.max(...levels.map(l => l.meta_arrecadado), 1)
  const maxComissao = Math.max(...levels.map(l => l.comissao_percentual), 1)

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
                  <Trophy className="h-5 w-5 text-black" />
                </div>
                Niveis de Closers
              </h1>
              <p className="text-gray-400 mt-1 ml-[52px]">
                Configure niveis de performance e metas para cada categoria de closer
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={loadData}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-[#1A1A1A] hover:text-white hover:border-gray-600 transition-all duration-200"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button
                onClick={openCreateModal}
                className="bg-[#D4AF37] hover:bg-[#C4A030] text-black font-semibold shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/30 transition-all duration-200"
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

            {/* ============================================= */}
            {/* Tab: Level Configuration                      */}
            {/* ============================================= */}
            <TabsContent value="levels" className="space-y-8">
              {levels.length === 0 ? (
                /* ---- EMPTY STATE ---- */
                <Card className="bg-[#1A1A1A] border-gray-800 border-dashed">
                  <CardContent className="text-center py-16">
                    <div className="relative inline-block mb-6">
                      <div className="absolute inset-0 rounded-full bg-[#D4AF37]/10 blur-xl scale-150" />
                      <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border-2 border-dashed border-gray-700 flex items-center justify-center">
                        <Trophy className="h-10 w-10 text-gray-600" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-200 mb-2">
                      Nenhum nivel configurado
                    </h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                      Crie niveis de performance para categorizar e motivar seus closers com metas claras e comissoes progressivas.
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button
                        onClick={createDefaultLevels}
                        className="bg-[#D4AF37] hover:bg-[#C4A030] text-black font-semibold shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/30 transition-all duration-200 px-6 py-5"
                      >
                        <Trophy className="h-4 w-4 mr-2" />
                        Criar Niveis Padrao (Trainee a Senior)
                      </Button>
                      <Button
                        onClick={openCreateModal}
                        variant="outline"
                        className="border-gray-700 text-gray-300 hover:bg-[#1A1A1A] hover:border-gray-600 transition-all duration-200 px-6 py-5"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Manualmente
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* ---- LEVEL CARDS ---- */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {levels.map((level) => {
                      const closersInLevel = getClosersInLevel(level.id)
                      return (
                        <Tooltip key={level.id}>
                          <TooltipTrigger asChild>
                            <Card
                              className="bg-[#1A1A1A] border-gray-800 relative overflow-hidden group hover:border-gray-700 transition-all duration-300 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-1 cursor-default"
                            >
                              {/* Thick color bar top */}
                              <div
                                className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 group-hover:h-2"
                                style={{ backgroundColor: level.cor }}
                              />
                              {/* Subtle glow on hover */}
                              <div
                                className="absolute top-0 left-0 right-0 h-24 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                style={{
                                  background: `linear-gradient(180deg, ${level.cor}10 0%, transparent 100%)`
                                }}
                              />

                              <CardHeader className="pb-3 relative">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg transition-transform duration-300 group-hover:scale-110"
                                      style={{
                                        backgroundColor: level.cor + '25',
                                        border: `2px solid ${level.cor}50`,
                                        color: level.cor
                                      }}
                                    >
                                      {level.ordem}
                                    </div>
                                    <div>
                                      <CardTitle className="text-xl font-bold text-white tracking-tight">
                                        {level.nome_nivel}
                                      </CardTitle>
                                      <span className="text-xs text-gray-500">Nivel {level.ordem}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {!level.ativo && (
                                      <Badge variant="secondary" className="bg-red-950/50 text-red-400 border border-red-900/50 text-[10px] px-2">
                                        Inativo
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {level.descricao && (
                                  <CardDescription className="text-gray-500 text-sm mt-2 leading-relaxed">
                                    {level.descricao}
                                  </CardDescription>
                                )}
                              </CardHeader>

                              <CardContent className="space-y-3 relative">
                                {/* Meta Faturado */}
                                <div className="flex items-center justify-between p-3 bg-[#0A0A0A]/80 rounded-lg border border-gray-800/50 group-hover:border-gray-700/50 transition-colors">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-md bg-green-500/10 flex items-center justify-center">
                                      <DollarSign className="h-3.5 w-3.5 text-green-500" />
                                    </div>
                                    <span className="text-xs text-gray-400">Meta Faturado</span>
                                  </div>
                                  <span className="text-sm font-bold text-green-400 tabular-nums">
                                    {formatCurrency(level.meta_faturado)}
                                  </span>
                                </div>

                                {/* Meta Arrecadado */}
                                <div className="flex items-center justify-between p-3 bg-[#0A0A0A]/80 rounded-lg border border-gray-800/50 group-hover:border-gray-700/50 transition-colors">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center">
                                      <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                                    </div>
                                    <span className="text-xs text-gray-400">Meta Arrecadado</span>
                                  </div>
                                  <span className="text-sm font-bold text-blue-400 tabular-nums">
                                    {formatCurrency(level.meta_arrecadado)}
                                  </span>
                                </div>

                                {/* Porcentagem Minima & Comissao - side by side */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex flex-col items-center p-3 bg-[#0A0A0A]/80 rounded-lg border border-gray-800/50 group-hover:border-gray-700/50 transition-colors">
                                    <Target className="h-3.5 w-3.5 text-purple-500 mb-1" />
                                    <span className="text-lg font-bold text-purple-400">{level.porcentagem_minima}%</span>
                                    <span className="text-[10px] text-gray-500">% Minima</span>
                                  </div>
                                  <div className="flex flex-col items-center p-3 bg-[#0A0A0A]/80 rounded-lg border border-gray-800/50 group-hover:border-gray-700/50 transition-colors">
                                    <Award className="h-3.5 w-3.5 text-[#D4AF37] mb-1" />
                                    <span className="text-lg font-bold text-[#D4AF37]">{level.comissao_percentual}%</span>
                                    <span className="text-[10px] text-gray-500">Comissao</span>
                                  </div>
                                </div>

                                <Separator className="bg-gray-800/60" />

                                {/* Closers count with mini avatars */}
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2 text-gray-400">
                                    <Users className="h-4 w-4" />
                                    <span>{closersInLevel.length} closer{closersInLevel.length !== 1 ? 's' : ''}</span>
                                  </div>
                                  {closersInLevel.length > 0 && (
                                    <div className="flex -space-x-2">
                                      {closersInLevel.slice(0, 3).map((c) => (
                                        <div
                                          key={c.id}
                                          className="w-6 h-6 rounded-full border-2 border-[#1A1A1A] text-[9px] font-bold flex items-center justify-center"
                                          style={{ backgroundColor: level.cor + '40', color: level.cor }}
                                        >
                                          {getInitials(c.nome_completo)}
                                        </div>
                                      ))}
                                      {closersInLevel.length > 3 && (
                                        <div className="w-6 h-6 rounded-full border-2 border-[#1A1A1A] bg-gray-800 text-[9px] font-bold flex items-center justify-center text-gray-400">
                                          +{closersInLevel.length - 3}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-600 transition-all duration-200"
                                    onClick={() => openEditModal(level)}
                                  >
                                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-900/50 text-red-400 hover:bg-red-950/50 hover:text-red-300 hover:border-red-800 transition-all duration-200"
                                    onClick={() => deleteLevel(level.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            className="bg-[#1A1A1A] border-gray-700 text-white p-4 max-w-xs"
                          >
                            <div className="space-y-2">
                              <p className="font-semibold text-sm" style={{ color: level.cor }}>{level.nome_nivel} - Resumo Rapido</p>
                              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                                <span className="text-gray-400">Closers:</span>
                                <span className="text-white font-medium">{closersInLevel.length}</span>
                                <span className="text-gray-400">Faturado:</span>
                                <span className="text-green-400 font-medium">{formatCurrency(level.meta_faturado)}</span>
                                <span className="text-gray-400">Arrecadado:</span>
                                <span className="text-blue-400 font-medium">{formatCurrency(level.meta_arrecadado)}</span>
                                <span className="text-gray-400">Comissao:</span>
                                <span className="text-[#D4AF37] font-medium">{level.comissao_percentual}%</span>
                                <span className="text-gray-400">% Minima:</span>
                                <span className="text-purple-400 font-medium">{level.porcentagem_minima}%</span>
                                <span className="text-gray-400">Status:</span>
                                <span className={level.ativo ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                                  {level.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>

                  {/* ============================================= */}
                  {/* LEVEL PROGRESSION PIPELINE                    */}
                  {/* ============================================= */}
                  {levels.length >= 2 && (
                    <Card className="bg-[#1A1A1A] border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2 text-base">
                          <TrendingUp className="h-5 w-5 text-[#D4AF37]" />
                          Progressao de Niveis
                        </CardTitle>
                        <CardDescription className="text-gray-500">
                          Pipeline de evolucao dos closers entre os niveis
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="relative flex items-center justify-between py-4">
                          {/* Connecting line */}
                          <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-gray-800 z-0" />
                          <div
                            className="absolute left-8 top-1/2 -translate-y-1/2 h-0.5 z-0"
                            style={{
                              background: `linear-gradient(90deg, ${levels[0]?.cor || '#6B7280'}, ${levels[levels.length - 1]?.cor || '#D4AF37'})`,
                              right: '32px',
                              opacity: 0.4
                            }}
                          />

                          {levels.map((level, index) => {
                            const closersInLevel = getClosersInLevel(level.id)
                            const isLast = index === levels.length - 1
                            return (
                              <div key={level.id} className="relative z-10 flex flex-col items-center gap-3 flex-1">
                                {/* Node */}
                                <div
                                  className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg border-[3px] shadow-lg transition-transform duration-300 hover:scale-110"
                                  style={{
                                    backgroundColor: level.cor + '20',
                                    borderColor: level.cor,
                                    color: level.cor,
                                    boxShadow: `0 0 20px ${level.cor}30`
                                  }}
                                >
                                  {level.ordem}
                                </div>
                                {/* Label */}
                                <div className="text-center">
                                  <p className="font-semibold text-white text-sm">{level.nome_nivel}</p>
                                  <p className="text-[11px] text-gray-500 mt-0.5">{closersInLevel.length} closer{closersInLevel.length !== 1 ? 's' : ''}</p>
                                  <p className="text-[11px] mt-0.5 font-medium" style={{ color: level.cor }}>
                                    {level.comissao_percentual}% comissao
                                  </p>
                                </div>
                                {/* Arrow (except last) */}
                                {!isLast && (
                                  <div className="absolute right-0 top-[28px] translate-x-1/2 z-20 hidden md:block">
                                    <ArrowUp className="h-4 w-4 text-gray-600 rotate-90" />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Mini bar chart under pipeline */}
                        <div className="mt-6 pt-4 border-t border-gray-800/60">
                          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${levels.length}, 1fr)` }}>
                            {levels.map((level) => {
                              const faturadoPct = (level.meta_faturado / maxFaturado) * 100
                              const arrecadadoPct = (level.meta_arrecadado / maxArrecadado) * 100
                              return (
                                <div key={level.id} className="space-y-2">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2 h-2 rounded-full bg-green-500" />
                                      <span className="text-[10px] text-gray-500">Faturado</span>
                                    </div>
                                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-700"
                                        style={{ width: `${faturadoPct}%` }}
                                      />
                                    </div>
                                    <p className="text-[10px] text-gray-500 tabular-nums">{formatCurrency(level.meta_faturado)}</p>
                                  </div>
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                                      <span className="text-[10px] text-gray-500">Arrecadado</span>
                                    </div>
                                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-700"
                                        style={{ width: `${arrecadadoPct}%` }}
                                      />
                                    </div>
                                    <p className="text-[10px] text-gray-500 tabular-nums">{formatCurrency(level.meta_arrecadado)}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* ============================================= */}
                  {/* COMPARISON VIEW - Side by Side                */}
                  {/* ============================================= */}
                  {levels.length >= 2 && (
                    <Card className="bg-[#1A1A1A] border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2 text-base">
                          <Target className="h-5 w-5 text-[#D4AF37]" />
                          Comparativo de Niveis
                        </CardTitle>
                        <CardDescription className="text-gray-500">
                          Veja todas as metas e beneficios lado a lado
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr>
                                <th className="text-left p-3 text-gray-500 text-xs font-medium uppercase tracking-wider border-b border-gray-800">
                                  Metrica
                                </th>
                                {levels.map((level) => (
                                  <th key={level.id} className="text-center p-3 border-b border-gray-800 min-w-[140px]">
                                    <div className="flex flex-col items-center gap-1.5">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: level.cor }}
                                      />
                                      <span className="text-sm font-semibold text-white">{level.nome_nivel}</span>
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {/* Meta Faturado */}
                              <tr className="border-b border-gray-800/40">
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <DollarSign className="h-3.5 w-3.5 text-green-500" />
                                    <span className="text-sm text-gray-400">Meta Faturado</span>
                                  </div>
                                </td>
                                {levels.map((level) => (
                                  <td key={level.id} className="p-3 text-center">
                                    <span className="text-sm font-semibold text-green-400 tabular-nums">{formatCurrency(level.meta_faturado)}</span>
                                  </td>
                                ))}
                              </tr>
                              {/* Meta Arrecadado */}
                              <tr className="border-b border-gray-800/40">
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                                    <span className="text-sm text-gray-400">Meta Arrecadado</span>
                                  </div>
                                </td>
                                {levels.map((level) => (
                                  <td key={level.id} className="p-3 text-center">
                                    <span className="text-sm font-semibold text-blue-400 tabular-nums">{formatCurrency(level.meta_arrecadado)}</span>
                                  </td>
                                ))}
                              </tr>
                              {/* Porcentagem Minima */}
                              <tr className="border-b border-gray-800/40">
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <Target className="h-3.5 w-3.5 text-purple-500" />
                                    <span className="text-sm text-gray-400">% Minima</span>
                                  </div>
                                </td>
                                {levels.map((level) => (
                                  <td key={level.id} className="p-3 text-center">
                                    <span className="text-sm font-semibold text-purple-400">{level.porcentagem_minima}%</span>
                                  </td>
                                ))}
                              </tr>
                              {/* Comissao */}
                              <tr className="border-b border-gray-800/40">
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <Award className="h-3.5 w-3.5 text-[#D4AF37]" />
                                    <span className="text-sm text-gray-400">Comissao</span>
                                  </div>
                                </td>
                                {levels.map((level) => (
                                  <td key={level.id} className="p-3 text-center">
                                    <span className="text-sm font-bold text-[#D4AF37]">{level.comissao_percentual}%</span>
                                  </td>
                                ))}
                              </tr>
                              {/* Closers */}
                              <tr className="border-b border-gray-800/40">
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-3.5 w-3.5 text-gray-400" />
                                    <span className="text-sm text-gray-400">Closers</span>
                                  </div>
                                </td>
                                {levels.map((level) => {
                                  const count = getClosersInLevel(level.id).length
                                  return (
                                    <td key={level.id} className="p-3 text-center">
                                      <span className="text-sm font-semibold text-white">{count}</span>
                                    </td>
                                  )
                                })}
                              </tr>
                              {/* Status */}
                              <tr>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-3.5 w-3.5 text-gray-400" />
                                    <span className="text-sm text-gray-400">Status</span>
                                  </div>
                                </td>
                                {levels.map((level) => (
                                  <td key={level.id} className="p-3 text-center">
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] ${
                                        level.ativo
                                          ? 'border-green-800 text-green-400 bg-green-950/30'
                                          : 'border-red-800 text-red-400 bg-red-950/30'
                                      }`}
                                    >
                                      {level.ativo ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                  </td>
                                ))}
                              </tr>
                              {/* Visual bar - Comissao comparison */}
                              <tr>
                                <td className="p-3 pt-4">
                                  <span className="text-xs text-gray-600">Comparativo Visual</span>
                                </td>
                                {levels.map((level) => {
                                  const pct = (level.comissao_percentual / maxComissao) * 100
                                  return (
                                    <td key={level.id} className="p-3 pt-4">
                                      <div className="flex flex-col items-center gap-1">
                                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                          <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${pct}%`, backgroundColor: level.cor }}
                                          />
                                        </div>
                                      </div>
                                    </td>
                                  )
                                })}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            {/* ============================================= */}
            {/* Tab: Closers & Assignment                     */}
            {/* ============================================= */}
            <TabsContent value="closers" className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-[#1A1A1A] border-gray-800 hover:border-gray-700 transition-all duration-200 group">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                        <Users className="h-6 w-6 text-[#D4AF37]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total Closers</p>
                        <p className="text-3xl font-bold text-white mt-0.5">{closers.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-[#1A1A1A] border-gray-800 hover:border-gray-700 transition-all duration-200 group">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                        <Trophy className="h-6 w-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Com Nivel</p>
                        <p className="text-3xl font-bold text-white mt-0.5">
                          {closers.filter(c => c.closer_level_id).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-[#1A1A1A] border-gray-800 hover:border-gray-700 transition-all duration-200 group">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                        <Shield className="h-6 w-6 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Sem Nivel</p>
                        <p className="text-3xl font-bold text-white mt-0.5">
                          {getClosersWithoutLevel().length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-[#1A1A1A] border-gray-800 hover:border-gray-700 transition-all duration-200 group">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                        <Target className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Niveis Config.</p>
                        <p className="text-3xl font-bold text-white mt-0.5">{levels.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Closers table */}
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
                    /* Empty state for closers */
                    <div className="text-center py-16">
                      <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 rounded-full bg-gray-700/10 blur-xl scale-150" />
                        <div className="relative w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border-2 border-dashed border-gray-800 flex items-center justify-center">
                          <Users className="h-9 w-9 text-gray-700" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-300 mb-1">Nenhum closer cadastrado</h3>
                      <p className="text-gray-600 text-sm max-w-sm mx-auto">
                        Cadastre closers na sua equipe para poder atribuir niveis de performance.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="text-left p-3 text-gray-500 text-xs font-medium uppercase tracking-wider">Closer</th>
                            <th className="text-left p-3 text-gray-500 text-xs font-medium uppercase tracking-wider">Tipo</th>
                            <th className="text-left p-3 text-gray-500 text-xs font-medium uppercase tracking-wider">Nivel Atual</th>
                            <th className="text-left p-3 text-gray-500 text-xs font-medium uppercase tracking-wider">Meta Mensal</th>
                            <th className="text-left p-3 text-gray-500 text-xs font-medium uppercase tracking-wider">Progresso</th>
                            <th className="text-left p-3 text-gray-500 text-xs font-medium uppercase tracking-wider">Vendas</th>
                            <th className="text-left p-3 text-gray-500 text-xs font-medium uppercase tracking-wider">Conversao</th>
                            <th className="text-left p-3 text-gray-500 text-xs font-medium uppercase tracking-wider">Status</th>
                            <th className="text-left p-3 text-gray-500 text-xs font-medium uppercase tracking-wider">Atribuir Nivel</th>
                          </tr>
                        </thead>
                        <tbody>
                          {closers.map((closer) => {
                            const currentLevel = levels.find(l => l.id === closer.closer_level_id)
                            const progressData = getCloserProgress(closer)
                            return (
                              <tr
                                key={closer.id}
                                className="border-b border-gray-800/30 hover:bg-[#0F0F0F] transition-colors duration-150 group/row"
                              >
                                {/* Name + Avatar */}
                                <td className="p-3">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-transform duration-200 group-hover/row:scale-105"
                                      style={{
                                        backgroundColor: currentLevel ? currentLevel.cor + '25' : '#374151',
                                        color: currentLevel ? currentLevel.cor : '#9CA3AF',
                                        border: `1.5px solid ${currentLevel ? currentLevel.cor + '50' : '#4B5563'}`
                                      }}
                                    >
                                      {getInitials(closer.nome_completo)}
                                    </div>
                                    <div>
                                      <p className="font-medium text-white text-sm">{closer.nome_completo}</p>
                                      <p className="text-[11px] text-gray-600">{closer.email}</p>
                                    </div>
                                  </div>
                                </td>
                                {/* Tipo */}
                                <td className="p-3">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-semibold ${
                                      closer.tipo_closer === 'closer'
                                        ? 'border-blue-800 text-blue-400 bg-blue-950/30'
                                        : closer.tipo_closer === 'sdr'
                                        ? 'border-green-800 text-green-400 bg-green-950/30'
                                        : 'border-gray-700 text-gray-400 bg-gray-800/30'
                                    }`}
                                  >
                                    {closer.tipo_closer?.toUpperCase() || 'N/A'}
                                  </Badge>
                                </td>
                                {/* Nivel Atual */}
                                <td className="p-3">
                                  {currentLevel ? (
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 ring-offset-[#1A1A1A]"
                                        style={{ backgroundColor: currentLevel.cor, ringColor: currentLevel.cor + '50' }}
                                      />
                                      <span className="text-sm text-white font-medium">
                                        {currentLevel.nome_nivel}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-600 italic">Sem nivel</span>
                                  )}
                                </td>
                                {/* Meta Mensal */}
                                <td className="p-3">
                                  <span className="text-sm text-gray-300 tabular-nums font-medium">
                                    {formatCurrency(closer.meta_mensal || 0)}
                                  </span>
                                </td>
                                {/* Progress toward next level */}
                                <td className="p-3">
                                  {progressData && progressData.nextLevel ? (
                                    <div className="w-28">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] text-gray-500 truncate max-w-[80px]">
                                          {progressData.nextLevel.nome_nivel}
                                        </span>
                                        <span className="text-[10px] font-semibold text-gray-400">{progressData.progress}%</span>
                                      </div>
                                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                          className="h-full rounded-full transition-all duration-500"
                                          style={{
                                            width: `${progressData.progress}%`,
                                            backgroundColor: progressData.nextLevel.cor
                                          }}
                                        />
                                      </div>
                                    </div>
                                  ) : progressData && progressData.progress === 100 ? (
                                    <Badge variant="outline" className="border-[#D4AF37]/50 text-[#D4AF37] bg-[#D4AF37]/10 text-[10px]">
                                      Nivel Maximo
                                    </Badge>
                                  ) : (
                                    <span className="text-[10px] text-gray-600">--</span>
                                  )}
                                </td>
                                {/* Vendas */}
                                <td className="p-3">
                                  <span className="text-sm text-gray-300 tabular-nums font-medium">
                                    {closer.total_vendas || 0}
                                  </span>
                                </td>
                                {/* Conversao */}
                                <td className="p-3">
                                  <span className={`text-sm tabular-nums font-medium ${
                                    (Number(closer.conversao_rate) || 0) >= 20 ? 'text-green-400' :
                                    (Number(closer.conversao_rate) || 0) >= 10 ? 'text-yellow-400' :
                                    'text-gray-400'
                                  }`}>
                                    {(Number(closer.conversao_rate) || 0).toFixed(1)}%
                                  </span>
                                </td>
                                {/* Status */}
                                <td className="p-3">
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                      closer.ativo !== false ? 'bg-green-500' : 'bg-red-500'
                                    }`} />
                                    <span className={`text-xs font-medium ${
                                      closer.ativo !== false ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      {closer.ativo !== false ? 'Ativo' : 'Inativo'}
                                    </span>
                                  </div>
                                </td>
                                {/* Assign Level */}
                                <td className="p-3">
                                  <Select
                                    value={closer.closer_level_id || 'none'}
                                    onValueChange={(value) => assignLevel(closer.id, value)}
                                  >
                                    <SelectTrigger className="w-40 bg-[#0A0A0A] border-gray-700 text-gray-300 text-sm hover:border-gray-600 transition-colors">
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
                      <Card key={level.id} className="bg-[#1A1A1A] border-gray-800 hover:border-gray-700 transition-all duration-200">
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
                            <p className="text-xs text-gray-600 py-2 text-center italic">Nenhum closer neste nivel</p>
                          ) : (
                            <div className="space-y-2">
                              {closersInLevel.map((c) => (
                                <div
                                  key={c.id}
                                  className="flex items-center gap-2.5 p-2 bg-[#0A0A0A] rounded-lg text-sm hover:bg-[#0F0F0F] transition-colors"
                                >
                                  <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                                    style={{
                                      backgroundColor: level.cor + '20',
                                      color: level.cor,
                                      border: `1px solid ${level.cor}40`
                                    }}
                                  >
                                    {getInitials(c.nome_completo)}
                                  </div>
                                  <span className="text-gray-300 truncate flex-1">{c.nome_completo}</span>
                                  <span className="text-gray-600 text-[10px] shrink-0">{c.tipo_closer?.toUpperCase()}</span>
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
                    <Card className="bg-[#1A1A1A] border-gray-800 border-dashed hover:border-gray-700 transition-all duration-200">
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
                              className="flex items-center gap-2.5 p-2 bg-[#0A0A0A] rounded-lg text-sm hover:bg-[#0F0F0F] transition-colors"
                            >
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-gray-800 text-gray-500 border border-gray-700">
                                {getInitials(c.nome_completo)}
                              </div>
                              <span className="text-gray-400 truncate flex-1">{c.nome_completo}</span>
                              <span className="text-gray-600 text-[10px] shrink-0">{c.tipo_closer?.toUpperCase()}</span>
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

          {/* ============================================= */}
          {/* Create/Edit Level Modal                       */}
          {/* ============================================= */}
          <Dialog open={isModalOpen} onOpenChange={(open) => {
            if (!open) {
              setIsModalOpen(false)
              resetForm()
            }
          }}>
            <DialogContent className="max-w-lg bg-[#1A1A1A] border-gray-800 text-white overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: formData.cor + '20',
                      border: `2px solid ${formData.cor}40`
                    }}
                  >
                    {editingLevel ? (
                      <Edit className="h-4 w-4" style={{ color: formData.cor }} />
                    ) : (
                      <Plus className="h-4 w-4" style={{ color: formData.cor }} />
                    )}
                  </div>
                  <div>
                    <DialogTitle className="text-white text-lg">
                      {editingLevel ? 'Editar' : 'Criar'} Nivel
                    </DialogTitle>
                    <DialogDescription className="text-gray-500 text-sm">
                      Configure as metas e parametros do nivel de performance
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                {/* ---- Section: Identidade ---- */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-4 rounded-full bg-[#D4AF37]" />
                    <h4 className="text-sm font-semibold text-white">Identidade do Nivel</h4>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-gray-400 text-xs uppercase tracking-wider">Nome do Nivel <span className="text-red-400">*</span></Label>
                      <Input
                        value={formData.nome_nivel}
                        onChange={(e) => setFormData({ ...formData, nome_nivel: e.target.value })}
                        placeholder="Ex: Trainee, Junior..."
                        className={`bg-[#0A0A0A] border-gray-700 text-white focus:border-[#D4AF37] focus:ring-[#D4AF37]/20 transition-colors ${
                          !formData.nome_nivel ? 'border-gray-700' : 'border-gray-600'
                        }`}
                      />
                      {!formData.nome_nivel && (
                        <p className="text-[10px] text-gray-600">Campo obrigatorio</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs uppercase tracking-wider">Ordem</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.ordem}
                        onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 1 })}
                        className="bg-[#0A0A0A] border-gray-700 text-white focus:border-[#D4AF37] focus:ring-[#D4AF37]/20 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-gray-400 text-xs uppercase tracking-wider">Descricao</Label>
                    <Input
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Descricao do nivel..."
                      className="bg-[#0A0A0A] border-gray-700 text-white focus:border-[#D4AF37] focus:ring-[#D4AF37]/20 transition-colors"
                    />
                  </div>

                  {/* Color picker */}
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs uppercase tracking-wider">Cor do Nivel</Label>
                    <div className="flex gap-2.5">
                      {LEVEL_COLORS.map((color) => (
                        <Tooltip key={color.value}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setFormData({ ...formData, cor: color.value })}
                              className={`w-9 h-9 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                                formData.cor === color.value
                                  ? 'border-white scale-110 shadow-lg'
                                  : 'border-gray-700 hover:border-gray-500'
                              }`}
                              style={{ backgroundColor: color.value }}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="bg-[#0A0A0A] border-gray-700 text-xs">
                            {color.label}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator className="bg-gray-800/60" />

                {/* ---- Section: Metas ---- */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-4 rounded-full bg-green-500" />
                    <h4 className="text-sm font-semibold text-white">Metas Financeiras</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign className="h-3 w-3 text-green-500" />
                        Meta Faturado (R$)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="1000"
                        value={formData.meta_faturado}
                        onChange={(e) => setFormData({ ...formData, meta_faturado: parseFloat(e.target.value) || 0 })}
                        className="bg-[#0A0A0A] border-gray-700 text-white focus:border-green-500/50 focus:ring-green-500/20 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="h-3 w-3 text-blue-500" />
                        Meta Arrecadado (R$)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="1000"
                        value={formData.meta_arrecadado}
                        onChange={(e) => setFormData({ ...formData, meta_arrecadado: parseFloat(e.target.value) || 0 })}
                        className="bg-[#0A0A0A] border-gray-700 text-white focus:border-blue-500/50 focus:ring-blue-500/20 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="bg-gray-800/60" />

                {/* ---- Section: Performance ---- */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-4 rounded-full bg-purple-500" />
                    <h4 className="text-sm font-semibold text-white">Performance & Comissao</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="h-3 w-3 text-purple-500" />
                        Porcentagem Minima (%)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={formData.porcentagem_minima}
                        onChange={(e) => setFormData({ ...formData, porcentagem_minima: parseFloat(e.target.value) || 0 })}
                        className="bg-[#0A0A0A] border-gray-700 text-white focus:border-purple-500/50 focus:ring-purple-500/20 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="h-3 w-3 text-[#D4AF37]" />
                        Comissao (%)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={formData.comissao_percentual}
                        onChange={(e) => setFormData({ ...formData, comissao_percentual: parseFloat(e.target.value) || 0 })}
                        className="bg-[#0A0A0A] border-gray-700 text-white focus:border-[#D4AF37]/50 focus:ring-[#D4AF37]/20 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Visual preview of comissao */}
                  {formData.comissao_percentual > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-lg border border-gray-800">
                      <Award className="h-4 w-4 text-[#D4AF37] shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Preview da comissao</span>
                          <span className="text-xs font-bold text-[#D4AF37]">{formData.comissao_percentual}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#D4AF37] to-[#C4A030] rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(formData.comissao_percentual * 4, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="bg-gray-800/60" />

                {/* ---- Ativo Switch ---- */}
                <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-gray-800">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <Label className="text-gray-300 text-sm">Nivel ativo</Label>
                  </div>
                  <Switch
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-800/60">
                <Button
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-[#0A0A0A] hover:text-white hover:border-gray-600 transition-all duration-200"
                  onClick={() => {
                    setIsModalOpen(false)
                    resetForm()
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={saveLevel}
                  disabled={!formData.nome_nivel}
                  className="bg-[#D4AF37] hover:bg-[#C4A030] text-black font-semibold shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/30 disabled:opacity-40 disabled:shadow-none transition-all duration-200"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingLevel ? 'Atualizar' : 'Criar'} Nivel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </TooltipProvider>
  )
}
