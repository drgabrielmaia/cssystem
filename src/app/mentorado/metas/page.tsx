'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { metasService, conquistasService } from '@/lib/video-portal-service'
import {
  Target, Trophy, Plus, CheckCircle, Clock, Star, Heart,
  BookOpen, Zap, Award, ArrowLeft, Calendar, Filter
} from 'lucide-react'
import Link from 'next/link'

interface MetaAluno {
  id: string
  titulo: string
  descricao: string
  prazo: 'curto' | 'medio' | 'longo' | 'grande'
  categoria: string
  prioridade: 'alta' | 'media' | 'baixa'
  status: 'ativo' | 'concluido' | 'pausado'
  created_at: string
  data_conclusao?: string
}

export default function MentoradoMetasPage() {
  const [mentorado, setMentorado] = useState<any>(null)
  const [metas, setMetas] = useState<MetaAluno[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [novaMeta, setNovaMeta] = useState({
    titulo: '',
    descricao: '',
    prazo: 'medio' as 'curto' | 'medio' | 'longo' | 'grande',
    categoria: '',
    prioridade: 'media' as 'alta' | 'media' | 'baixa'
  })

  const categoriasMeta = [
    { value: 'financeira', label: 'Financeira', icon: <Trophy className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'profissional', label: 'Profissional', icon: <Zap className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
    { value: 'pessoal', label: 'Pessoal', icon: <Heart className="h-4 w-4" />, color: 'bg-pink-100 text-pink-800' },
    { value: 'saude', label: 'Saúde', icon: <Award className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
    { value: 'aprendizado', label: 'Aprendizado', icon: <BookOpen className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' }
  ]

  const prazosMeta = [
    { value: 'curto', label: 'Curto Prazo', sublabel: '1-3 meses', color: 'bg-red-100 text-red-800' },
    { value: 'medio', label: 'Médio Prazo', sublabel: '3-6 meses', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'longo', label: 'Longo Prazo', sublabel: '6-12 meses', color: 'bg-blue-100 text-blue-800' },
    { value: 'grande', label: 'Grande Meta', sublabel: '1+ anos', color: 'bg-purple-100 text-purple-800' }
  ]

  useEffect(() => {
    const mentoradoData = localStorage.getItem('mentorado')
    if (mentoradoData) {
      const parsed = JSON.parse(mentoradoData)
      setMentorado(parsed)
      carregarMetas(parsed.id)
    } else {
      window.location.href = '/mentorado'
    }
  }, [])

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
        data_conclusao: meta.resposta_json.data_conclusao
      }))
      setMetas(metasFormatadas)
    } catch (error) {
      console.error('Erro ao carregar metas:', error)
      setMetas([])
    } finally {
      setLoading(false)
    }
  }

  const criarMeta = async () => {
    if (!mentorado || !novaMeta.titulo) return

    setSaving(true)
    try {
      await metasService.criarMeta({
        mentorado_id: mentorado.id,
        titulo: novaMeta.titulo,
        descricao: novaMeta.descricao,
        prazo: novaMeta.prazo,
        status: 'ativo',
        criado_por: 'aluno',
        data_meta: new Date().toISOString()
      })

      await carregarMetas(mentorado.id)
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
          mentorado_id: mentorado.id,
          tipo: 'meta_alcancada',
          titulo: 'Primeira Meta Criada! 🎯',
          descricao: 'Parabéns por criar sua primeira meta!',
          pontos: 15,
          conquistada_em: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Erro ao criar meta:', error)
    } finally {
      setSaving(false)
    }
  }

  const concluirMeta = async (metaId: string) => {
    try {
      await metasService.atualizarMeta(metaId, {
        status: 'concluido',
        data_conclusao: new Date().toISOString()
      })

      // Registrar conquista
      await conquistasService.registrarConquista({
        mentorado_id: mentorado.id,
        tipo: 'meta_alcancada',
        titulo: 'Meta Conquistada! 🏆',
        descricao: 'Parabéns por concluir uma de suas metas!',
        pontos: 25,
        conquistada_em: new Date().toISOString()
      })

      await carregarMetas(mentorado.id)
    } catch (error) {
      console.error('Erro ao concluir meta:', error)
    }
  }

  const metasFiltradas = metas.filter(meta =>
    filtroStatus === 'todos' || meta.status === filtroStatus
  )

  const estatisticas = {
    total: metas.length,
    ativas: metas.filter(m => m.status === 'ativo').length,
    concluidas: metas.filter(m => m.status === 'concluido').length,
    taxaConclusao: metas.length > 0 ? (metas.filter(m => m.status === 'concluido').length / metas.length) * 100 : 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D4AF37] to-[#FFD700] p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/mentorado" className="p-3 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-800" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Minhas Metas</h1>
              <p className="text-slate-700">Defina e acompanhe seus objetivos pessoais</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-slate-800 border-slate-800/20">
            {mentorado?.nome_completo?.split(' ')[0]}
          </Badge>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/90 backdrop-blur-sm border-[#B8860B] shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total</p>
                  <p className="text-3xl font-bold text-slate-800">{estatisticas.total}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#FFD700] rounded-xl flex items-center justify-center">
                  <Target className="h-6 w-6 text-slate-800" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-[#B8860B] shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Ativas</p>
                  <p className="text-3xl font-bold text-slate-800">{estatisticas.ativas}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-[#CD853F] to-[#DEB887] rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-slate-800" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-[#B8860B] shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Concluídas</p>
                  <p className="text-3xl font-bold text-slate-800">{estatisticas.concluidas}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-[#B8860B] shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Taxa de Sucesso</p>
                  <p className="text-3xl font-bold text-slate-800">{estatisticas.taxaConclusao.toFixed(0)}%</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-[#DAA520] to-[#B8860B] rounded-xl flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Criar Nova Meta */}
          <Card className="lg:col-span-1 bg-white/90 backdrop-blur-sm border-[#B8860B] shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-slate-800">
                <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#FFD700] rounded-xl flex items-center justify-center">
                  <Plus className="h-5 w-5 text-slate-800" />
                </div>
                Nova Meta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título da Meta</Label>
                <Input
                  value={novaMeta.titulo}
                  onChange={(e) => setNovaMeta(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ex: Ler 2 livros por mês"
                />
              </div>

              <div>
                <Label>Categoria</Label>
                <Select
                  value={novaMeta.categoria}
                  onValueChange={(value) => setNovaMeta(prev => ({ ...prev, categoria: value }))}
                >
                  <SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {prazosMeta.map(prazo => (
                      <SelectItem key={prazo.value} value={prazo.value}>
                        {prazo.label} ({prazo.sublabel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={novaMeta.descricao}
                  onChange={(e) => setNovaMeta(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva sua meta..."
                  rows={3}
                />
              </div>

              <Button
                onClick={criarMeta}
                disabled={!novaMeta.titulo || !novaMeta.categoria || saving}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {saving ? 'Criando...' : 'Criar Meta'}
              </Button>
            </CardContent>
          </Card>

          {/* Lista de Metas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filtros */}
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      <SelectItem value="ativo">Ativas</SelectItem>
                      <SelectItem value="concluido">Concluídas</SelectItem>
                      <SelectItem value="pausado">Pausadas</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">
                    {metasFiltradas.length} meta(s) encontrada(s)
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Metas */}
            {metasFiltradas.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="text-center py-12">
                  <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    {metas.length === 0 ? 'Crie sua primeira meta' : 'Nenhuma meta encontrada'}
                  </h3>
                  <p className="text-gray-500">
                    {metas.length === 0
                      ? 'Defina objetivos claros para acompanhar seu progresso'
                      : 'Ajuste os filtros para ver suas metas'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {metasFiltradas.map((meta) => {
                  const categoria = categoriasMeta.find(c => c.value === meta.categoria)
                  const prazo = prazosMeta.find(p => p.value === meta.prazo)

                  return (
                    <Card
                      key={meta.id}
                      className={`transition-all hover:shadow-md ${
                        meta.status === 'concluido'
                          ? 'border-green-300 bg-gradient-to-r from-green-50 to-green-100'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold mb-2">{meta.titulo}</h3>
                            <p className="text-gray-600 mb-3">{meta.descricao}</p>

                            <div className="flex items-center gap-2 mb-3">
                              {categoria && (
                                <Badge variant="outline" className={categoria.color}>
                                  {categoria.icon} {categoria.label}
                                </Badge>
                              )}
                              {prazo && (
                                <Badge variant="outline" className={prazo.color}>
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {prazo.label}
                                </Badge>
                              )}
                              <Badge variant={meta.status === 'concluido' ? 'default' : 'secondary'}>
                                {meta.status === 'concluido' ? 'Concluída' : 'Ativa'}
                              </Badge>
                            </div>
                          </div>

                          {meta.status === 'ativo' && (
                            <Button
                              onClick={() => concluirMeta(meta.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Concluir
                            </Button>
                          )}

                          {meta.status === 'concluido' && (
                            <div className="flex items-center gap-2 text-green-600">
                              <Trophy className="h-5 w-5" />
                              <span className="text-sm font-medium">Conquistada!</span>
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-gray-500">
                          Criada em {new Date(meta.created_at).toLocaleDateString('pt-BR')}
                          {meta.data_conclusao && (
                            <> • Concluída em {new Date(meta.data_conclusao).toLocaleDateString('pt-BR')}</>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}