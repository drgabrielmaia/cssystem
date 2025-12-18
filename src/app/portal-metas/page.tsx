'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { supabase, type Mentorado } from '@/lib/supabase'
import { metasService, conquistasService } from '@/lib/video-portal-service'
import {
  Target, Trophy, Clock, CheckCircle, Pause, Plus, Edit, Trash2,
  Calendar, Star, Zap, Award, Heart, BookOpen, User, TrendingUp,
  AlertCircle, Timer, Filter
} from 'lucide-react'

interface MetaDetalhada {
  id: string
  titulo: string
  descricao: string
  prazo: 'curto' | 'medio' | 'longo' | 'grande'
  categoria: string
  prioridade: 'alta' | 'media' | 'baixa'
  status: 'ativo' | 'concluido' | 'pausado'
  created_at: string
  data_conclusao?: string
  progresso?: number
}

export default function PortalMetasPage() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [selectedMentorado, setSelectedMentorado] = useState<Mentorado | null>(null)
  const [metas, setMetas] = useState<MetaDetalhada[]>([])
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')
  const [filtroPrazo, setFiltroPrazo] = useState<string>('todos')
  const [novaMeta, setNovaMeta] = useState({
    titulo: '',
    descricao: '',
    prazo: 'medio' as 'curto' | 'medio' | 'longo' | 'grande',
    categoria: '',
    prioridade: 'media' as 'alta' | 'media' | 'baixa'
  })
  const [editandoMeta, setEditandoMeta] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const categoriasMeta = [
    { value: 'financeira', label: 'Financeira', icon: <Trophy className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { value: 'profissional', label: 'Profissional', icon: <Zap className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { value: 'pessoal', label: 'Pessoal', icon: <Heart className="h-4 w-4" />, color: 'bg-pink-100 text-pink-800 border-pink-300' },
    { value: 'saude', label: 'Saúde', icon: <Award className="h-4 w-4" />, color: 'bg-green-100 text-green-800 border-green-300' },
    { value: 'relacionamento', label: 'Relacionamentos', icon: <User className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { value: 'aprendizado', label: 'Aprendizado', icon: <BookOpen className="h-4 w-4" />, color: 'bg-orange-100 text-orange-800 border-orange-300' }
  ]

  const prazosMeta = [
    { value: 'curto', label: 'Curto Prazo', sublabel: '1-3 meses', color: 'bg-red-100 text-red-800 border-red-300', icon: <Timer className="h-3 w-3" /> },
    { value: 'medio', label: 'Médio Prazo', sublabel: '3-6 meses', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: <Clock className="h-3 w-3" /> },
    { value: 'longo', label: 'Longo Prazo', sublabel: '6-12 meses', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: <Calendar className="h-3 w-3" /> },
    { value: 'grande', label: 'Grande Meta', sublabel: '1+ anos', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: <Star className="h-3 w-3" /> }
  ]

  const statusMeta = [
    { value: 'ativo', label: 'Ativa', color: 'bg-blue-100 text-blue-800', icon: <TrendingUp className="h-3 w-3" /> },
    { value: 'concluido', label: 'Concluída', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
    { value: 'pausado', label: 'Pausada', color: 'bg-gray-100 text-gray-800', icon: <Pause className="h-3 w-3" /> }
  ]

  useEffect(() => {
    fetchMentorados()
  }, [])

  const fetchMentorados = async () => {
    try {
      const { data, error } = await supabase
        .from('mentorados')
        .select('*')
        .order('nome_completo', { ascending: true })

      if (error) throw error
      setMentorados(data || [])
    } catch (error) {
      console.error('Erro ao buscar mentorados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMentoradoSelect = async (mentoradoId: string) => {
    const mentorado = mentorados.find(m => m.id === mentoradoId)
    setSelectedMentorado(mentorado || null)

    if (mentorado) {
      await carregarMetas(mentoradoId)
    }
  }

  const carregarMetas = async (mentoradoId: string) => {
    try {
      const metasData = await metasService.buscarMetas(mentoradoId)
      const metasFormatadas = metasData.map(meta => ({
        id: meta.id,
        titulo: meta.resposta_json.titulo,
        descricao: meta.resposta_json.descricao,
        prazo: meta.resposta_json.prazo,
        categoria: meta.resposta_json.categoria || 'pessoal',
        prioridade: meta.resposta_json.prioridade || 'media',
        status: meta.resposta_json.status,
        created_at: meta.data_envio,
        data_conclusao: meta.resposta_json.data_conclusao,
        progresso: meta.resposta_json.progresso || 0
      }))
      setMetas(metasFormatadas)
    } catch (error) {
      console.error('Erro ao carregar metas:', error)
      setMetas([])
    }
  }

  const criarMeta = async () => {
    if (!selectedMentorado || !novaMeta.titulo) return

    setSaving(true)
    try {
      await metasService.criarMeta({
        mentorado_id: selectedMentorado.id,
        titulo: novaMeta.titulo,
        descricao: novaMeta.descricao,
        prazo: novaMeta.prazo,
        status: 'ativo',
        criado_por: 'admin',
        data_meta: new Date().toISOString()
      })

      // Recarregar metas
      await carregarMetas(selectedMentorado.id)

      // Limpar formulário
      setNovaMeta({
        titulo: '',
        descricao: '',
        prazo: 'medio',
        categoria: '',
        prioridade: 'media'
      })

      // Registrar conquista se for a primeira meta
      if (metas.length === 0) {
        await conquistasService.registrarConquista({
          mentorado_id: selectedMentorado.id,
          tipo: 'meta_alcancada',
          titulo: 'Primeira Meta Definida!',
          descricao: 'Parabéns por definir sua primeira meta!',
          pontos: 10,
          conquistada_em: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Erro ao criar meta:', error)
    } finally {
      setSaving(false)
    }
  }

  const atualizarStatusMeta = async (metaId: string, novoStatus: 'ativo' | 'concluido' | 'pausado') => {
    try {
      await metasService.atualizarMeta(metaId, {
        status: novoStatus,
        data_conclusao: novoStatus === 'concluido' ? new Date().toISOString() : undefined
      })

      // Registrar conquista se concluiu uma meta
      if (novoStatus === 'concluido' && selectedMentorado) {
        await conquistasService.registrarConquista({
          mentorado_id: selectedMentorado.id,
          tipo: 'meta_alcancada',
          titulo: 'Meta Alcançada! 🎉',
          descricao: 'Parabéns por concluir uma de suas metas!',
          pontos: 25,
          conquistada_em: new Date().toISOString()
        })
      }

      await carregarMetas(selectedMentorado!.id)
    } catch (error) {
      console.error('Erro ao atualizar meta:', error)
    }
  }

  const getMetasFiltradas = () => {
    let metasFiltradas = [...metas]

    if (filtroStatus !== 'todos') {
      metasFiltradas = metasFiltradas.filter(meta => meta.status === filtroStatus)
    }

    if (filtroCategoria !== 'todas') {
      metasFiltradas = metasFiltradas.filter(meta => meta.categoria === filtroCategoria)
    }

    if (filtroPrazo !== 'todos') {
      metasFiltradas = metasFiltradas.filter(meta => meta.prazo === filtroPrazo)
    }

    return metasFiltradas
  }

  const getEstatisticas = () => {
    const total = metas.length
    const ativas = metas.filter(m => m.status === 'ativo').length
    const concluidas = metas.filter(m => m.status === 'concluido').length
    const pausadas = metas.filter(m => m.status === 'pausado').length
    const taxaConclusao = total > 0 ? (concluidas / total) * 100 : 0

    return { total, ativas, concluidas, pausadas, taxaConclusao }
  }

  if (loading) {
    return (
      <PageLayout title="Portal de Metas" subtitle="Sistema avançado de gerenciamento de metas">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    )
  }

  const estatisticas = getEstatisticas()
  const metasFiltradas = getMetasFiltradas()

  return (
    <PageLayout
      title="Portal de Metas"
      subtitle="Gerencie e acompanhe as metas dos mentorados com sistema avançado de tracking"
    >
      <div className="space-y-8">
        {/* Seleção de Mentorado */}
        <Card className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-blue-900">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              Selecionar Mentorado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handleMentoradoSelect}>
              <SelectTrigger className="w-full bg-white border-blue-300 shadow-sm">
                <SelectValue placeholder="Escolha um mentorado para gerenciar suas metas..." />
              </SelectTrigger>
              <SelectContent>
                {mentorados.map((mentorado) => (
                  <SelectItem key={mentorado.id} value={mentorado.id}>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                        <User className="h-3 w-3 text-white" />
                      </div>
                      <span className="font-medium">{mentorado.nome_completo}</span>
                      <Badge variant="outline" className="text-xs">
                        {mentorado.estado_atual}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedMentorado && (
          <>
            {/* Estatísticas das Metas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total de Metas</p>
                      <p className="text-3xl font-bold text-blue-900">{estatisticas.total}</p>
                    </div>
                    <Target className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Concluídas</p>
                      <p className="text-3xl font-bold text-green-900">{estatisticas.concluidas}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Ativas</p>
                      <p className="text-3xl font-bold text-orange-900">{estatisticas.ativas}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Taxa de Sucesso</p>
                      <p className="text-3xl font-bold text-purple-900">{estatisticas.taxaConclusao.toFixed(0)}%</p>
                    </div>
                    <Trophy className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filtros e Nova Meta */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Filtros */}
              <Card className="lg:w-1/3 border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Filter className="h-5 w-5" />
                    Filtros
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="ativo">Ativas</SelectItem>
                        <SelectItem value="concluido">Concluídas</SelectItem>
                        <SelectItem value="pausado">Pausadas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Categoria</Label>
                    <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas</SelectItem>
                        {categoriasMeta.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              {cat.icon} {cat.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Prazo</Label>
                    <Select value={filtroPrazo} onValueChange={setFiltroPrazo}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {prazosMeta.map(prazo => (
                          <SelectItem key={prazo.value} value={prazo.value}>
                            <div className="flex items-center gap-2">
                              {prazo.icon} {prazo.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Nova Meta */}
              <Card className="lg:w-2/3 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <Plus className="h-5 w-5" />
                    Nova Meta para {selectedMentorado.nome_completo}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Título da Meta</Label>
                      <Input
                        value={novaMeta.titulo}
                        onChange={(e) => setNovaMeta(prev => ({ ...prev, titulo: e.target.value }))}
                        placeholder="Ex: Aumentar renda em 30%"
                        className="border-green-300"
                      />
                    </div>

                    <div>
                      <Label>Categoria</Label>
                      <Select
                        value={novaMeta.categoria}
                        onValueChange={(value) => setNovaMeta(prev => ({ ...prev, categoria: value }))}
                      >
                        <SelectTrigger className="border-green-300">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriasMeta.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              <div className="flex items-center gap-2">
                                {cat.icon} {cat.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Prazo</Label>
                      <Select
                        value={novaMeta.prazo}
                        onValueChange={(value: any) => setNovaMeta(prev => ({ ...prev, prazo: value }))}
                      >
                        <SelectTrigger className="border-green-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {prazosMeta.map(prazo => (
                            <SelectItem key={prazo.value} value={prazo.value}>
                              <div className="flex items-center gap-2">
                                {prazo.icon} {prazo.label} ({prazo.sublabel})
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Prioridade</Label>
                      <Select
                        value={novaMeta.prioridade}
                        onValueChange={(value: any) => setNovaMeta(prev => ({ ...prev, prioridade: value }))}
                      >
                        <SelectTrigger className="border-green-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alta">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-3 w-3 text-red-500" /> Alta Prioridade
                            </div>
                          </SelectItem>
                          <SelectItem value="media">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-yellow-500" /> Média Prioridade
                            </div>
                          </SelectItem>
                          <SelectItem value="baixa">
                            <div className="flex items-center gap-2">
                              <Timer className="h-3 w-3 text-green-500" /> Baixa Prioridade
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Descrição Detalhada</Label>
                    <Textarea
                      value={novaMeta.descricao}
                      onChange={(e) => setNovaMeta(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Descreva a meta em detalhes..."
                      rows={3}
                      className="border-green-300"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={criarMeta}
                      disabled={!novaMeta.titulo || !novaMeta.categoria || saving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {saving ? 'Salvando...' : 'Criar Meta'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lista de Metas */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">
                  Metas ({metasFiltradas.length})
                </h3>
                <Badge variant="outline">
                  {filtroStatus !== 'todos' && `Filtro: ${filtroStatus}`}
                </Badge>
              </div>

              {metasFiltradas.length === 0 ? (
                <Card className="border-dashed border-2 border-gray-300">
                  <CardContent className="text-center py-12">
                    <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">
                      Nenhuma meta encontrada
                    </h3>
                    <p className="text-gray-500">
                      {metas.length === 0
                        ? 'Crie a primeira meta para este mentorado'
                        : 'Ajuste os filtros para ver mais metas'
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {metasFiltradas.map((meta) => {
                    const categoria = categoriasMeta.find(c => c.value === meta.categoria)
                    const prazo = prazosMeta.find(p => p.value === meta.prazo)
                    const status = statusMeta.find(s => s.value === meta.status)

                    return (
                      <Card
                        key={meta.id}
                        className={`transition-all duration-200 hover:shadow-lg ${
                          meta.status === 'concluido'
                            ? 'border-green-300 bg-gradient-to-br from-green-50 to-green-100'
                            : meta.status === 'pausado'
                            ? 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100'
                            : 'border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100'
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg font-semibold mb-2">
                                {meta.titulo}
                              </CardTitle>
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                {categoria && (
                                  <Badge variant="outline" className={categoria.color}>
                                    {categoria.icon} {categoria.label}
                                  </Badge>
                                )}
                                {prazo && (
                                  <Badge variant="outline" className={prazo.color}>
                                    {prazo.icon} {prazo.label}
                                  </Badge>
                                )}
                                {status && (
                                  <Badge variant="outline" className={status.color}>
                                    {status.icon} {status.label}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {meta.descricao}
                          </p>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              Criada em {new Date(meta.created_at).toLocaleDateString('pt-BR')}
                            </div>
                            <div className="flex items-center gap-2">
                              {meta.status === 'ativo' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => atualizarStatusMeta(meta.id, 'concluido')}
                                    className="text-green-600 border-green-300 hover:bg-green-50"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Concluir
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => atualizarStatusMeta(meta.id, 'pausado')}
                                    className="text-gray-600 border-gray-300 hover:bg-gray-50"
                                  >
                                    <Pause className="h-3 w-3 mr-1" />
                                    Pausar
                                  </Button>
                                </>
                              )}
                              {meta.status === 'pausado' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => atualizarStatusMeta(meta.id, 'ativo')}
                                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                >
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  Reativar
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  )
}