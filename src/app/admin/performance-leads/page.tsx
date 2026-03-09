'use client'

import { useState, useMemo, useCallback } from 'react'
import { useStableData } from '@/hooks/use-stable-data'
import { useStableMutation } from '@/hooks/use-stable-mutation'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Search, Users, TrendingUp, DollarSign, Clock, Target, Activity, Brain,
  MessageCircle, Phone, Star, Award, BarChart3, Eye, Plus, RefreshCw,
  ArrowUp, ArrowDown, Minus, CheckCircle, User, Building, Calendar
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  LeadExtendido, LeadInteraction, CreateLeadInteractionData
} from '@/types/commission'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_SEMANA_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const HORAS_RANGE = Array.from({ length: 15 }, (_, i) => i + 8) // 8h-22h

interface LeadDetailed extends LeadExtendido {
  score_bant?: number
  ultima_interacao?: LeadInteraction
  total_interacoes: number
  dias_no_pipeline: number
  probabilidade_real: number
}

interface CloserStats {
  id: string
  nome_completo: string
  tipo_closer: string
  leads_ativos: number
  conversoes_mes: number
  taxa_conversao: number
  atividade_media_dia: number
  valor_pipeline: number
  ultima_atividade: string
}

export default function AdvancedPerformanceLeadsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCloser, setSelectedCloser] = useState<string>('all')
  const [selectedTemperatura, setSelectedTemperatura] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('year')
  const [selectedLead, setSelectedLead] = useState<LeadDetailed | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false)
  const [interactionForm, setInteractionForm] = useState<Partial<CreateLeadInteractionData>>({})
  const [activeTab, setActiveTab] = useState('leads')

  const dateFilter = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    switch (dateRange) {
      case '7_days': { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString() }
      case '30_days': { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString() }
      case '90_days': { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString() }
      case 'month': return new Date(year, month, 1).toISOString()
      case 'quarter': return new Date(year, Math.floor(month / 3) * 3, 1).toISOString()
      case 'semester': return new Date(year, month >= 6 ? 6 : 0, 1).toISOString()
      case 'year': case 'ytd': return new Date(year, 0, 1).toISOString()
      default: return new Date().toISOString()
    }
  }, [dateRange])

  const { data: rawLeads, loading: leadsLoading, refetch: refetchLeads } = useStableData<any>({
    tableName: 'leads',
    select: `*, closer:closer_id(id, nome_completo, tipo_closer), sdr:sdr_id(id, nome_completo, tipo_closer), interactions:lead_interactions(id, tipo_interacao, data_interacao, resultado, interesse_manifestado, qualificacao_budget, qualificacao_autoridade, qualificacao_necessidade, qualificacao_timeline, sentimento_lead, nivel_interesse, probabilidade_fechamento_percebida, resumo), qualification:lead_qualification_details(qualification_score, authority_nivel, budget_confirmado, need_urgencia_score, timeline_meta_implementacao, situacao_atual, empresa_nome)`,
    filters: selectedCloser !== 'all'
      ? { closer_id: selectedCloser, created_at: `gte.${dateFilter}`, status: `not.in.(excluido,vazado)` }
      : { created_at: `gte.${dateFilter}`, status: `not.in.(excluido,vazado)` },
    dependencies: [dateFilter, selectedCloser],
    autoLoad: true,
    debounceMs: 100
  })

  const { data: rawClosers, loading: closersLoading } = useStableData<any>({
    tableName: 'closers',
    select: `id, nome_completo, tipo_closer, leads:leads!inner(id, status, valor_potencial, created_at), interactions:lead_interactions(id, data_interacao)`,
    filters: { status_contrato: 'ativo' },
    dependencies: [],
    autoLoad: true,
    debounceMs: 300
  })

  const leads = useMemo(() => {
    if (!rawLeads?.length) return []
    return rawLeads.map((lead: any) => {
      const interactions = lead.interactions || []
      const qualification = lead.qualification?.[0]
      const diasNoPipeline = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))
      const scoreBant = qualification?.qualification_score || 0
      const ultimaInteracao = interactions.sort((a: any, b: any) => new Date(b.data_interacao).getTime() - new Date(a.data_interacao).getTime())[0]
      let probabilidadeReal = lead.probabilidade_fechamento || 0
      if (ultimaInteracao?.probabilidade_fechamento_percebida) probabilidadeReal = ultimaInteracao.probabilidade_fechamento_percebida
      if (qualification?.qualification_score) probabilidadeReal = Math.max(probabilidadeReal, qualification.qualification_score)
      return { ...lead, total_interacoes: interactions.length, dias_no_pipeline: diasNoPipeline, score_bant: scoreBant, ultima_interacao: ultimaInteracao, probabilidade_real: probabilidadeReal }
    }) as LeadDetailed[]
  }, [rawLeads])

  const closers = useMemo(() => {
    if (!rawClosers?.length) return []
    return rawClosers.map((closer: any) => {
      const cls = (closer.leads || []).filter((l: any) => !['excluido', 'vazado'].includes(l.status))
      const interactions = closer.interactions || []
      const leadsAtivos = cls.filter((l: any) => !['vendido', 'perdido', 'churn', 'cancelado', 'excluido', 'vazado'].includes(l.status)).length
      const conversoesMes = cls.filter((l: any) => l.status === 'vendido' && new Date(l.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length
      const taxaConversao = cls.length > 0 ? (cls.filter((l: any) => l.status === 'vendido').length / cls.length) * 100 : 0
      const valorPipeline = cls.filter((l: any) => !['vendido', 'perdido', 'churn', 'cancelado', 'excluido', 'vazado'].includes(l.status)).reduce((s: number, l: any) => s + (l.valor_potencial || 0), 0)
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
      const int7d = interactions.filter((i: any) => new Date(i.data_interacao) >= weekAgo).length
      const ultimaInt = interactions.sort((a: any, b: any) => new Date(b.data_interacao).getTime() - new Date(a.data_interacao).getTime())[0]
      return { id: closer.id, nome_completo: closer.nome_completo, tipo_closer: closer.tipo_closer, leads_ativos: leadsAtivos, conversoes_mes: conversoesMes, taxa_conversao: taxaConversao, atividade_media_dia: int7d / 7, valor_pipeline: valorPipeline, ultima_atividade: ultimaInt?.data_interacao || 'N/A' }
    }) as CloserStats[]
  }, [rawClosers])

  const stats = useMemo(() => {
    const totalLeads = leads.length
    const leadsQualificados = leads.filter(l => l.score_bant && l.score_bant > 50).length
    const leadsConvertidos = leads.filter(l => l.status === 'vendido').length
    const taxaQualificacao = totalLeads > 0 ? (leadsQualificados / totalLeads) * 100 : 0
    const taxaConversao = totalLeads > 0 ? (leadsConvertidos / totalLeads) * 100 : 0
    const valorPipeline = leads.reduce((s, l) => s + (l.valor_potencial || 0), 0)
    const valorFechado = leads.filter(l => l.status === 'vendido').reduce((s, l) => s + (l.valor_potencial || 0), 0)
    const ticketMedio = leadsConvertidos > 0 ? valorFechado / leadsConvertidos : 0
    const cicloVendasMedio = leads.filter(l => l.status === 'vendido').reduce((s, l) => s + l.dias_no_pipeline, 0) / (leadsConvertidos || 1)
    return { totalLeads, leadsQualificados, leadsConvertidos, taxaQualificacao, taxaConversao, valorPipeline, valorFechado, ticketMedio, cicloVendasMedio }
  }, [leads])

  // ── MÉTRICAS POR HORÁRIO E DIA ──
  const callMetrics = useMemo(() => {
    const vendidos = leads.filter(l => l.status === 'vendido')
    const porHora: Record<number, number> = {}
    const porDia: Record<number, number> = {}
    const heatmap: Record<string, number> = {} // "dia-hora" -> count
    let somaHoras = 0
    let countComHora = 0

    HORAS_RANGE.forEach(h => { porHora[h] = 0 })
    for (let d = 0; d < 7; d++) porDia[d] = 0

    vendidos.forEach(lead => {
      // Hora do fechamento
      const ts = lead.convertido_em || lead.status_updated_at
      if (ts) {
        const date = new Date(ts)
        const hora = date.getHours()
        if (hora >= 8 && hora <= 22) {
          porHora[hora] = (porHora[hora] || 0) + 1
          somaHoras += hora
          countComHora++
        }
        // Heatmap
        const dia = date.getDay()
        const key = `${dia}-${hora}`
        heatmap[key] = (heatmap[key] || 0) + 1
      }

      // Dia da semana (usar data_venda se disponível, senão fallback)
      const dataVenda = lead.data_venda || lead.convertido_em || lead.status_updated_at
      if (dataVenda) {
        const dv = new Date(dataVenda)
        porDia[dv.getDay()] = (porDia[dv.getDay()] || 0) + 1
      }
    })

    const maxHora = Math.max(...Object.values(porHora))
    const maxDia = Math.max(...Object.values(porDia))
    const melhorHora = Object.entries(porHora).sort((a, b) => b[1] - a[1])[0]
    const piorHora = Object.entries(porHora).filter(([_, v]) => v > 0).sort((a, b) => a[1] - b[1])[0]
    const melhorDia = Object.entries(porDia).sort((a, b) => b[1] - a[1])[0]
    const piorDia = Object.entries(porDia).filter(([_, v]) => v > 0).sort((a, b) => a[1] - b[1])[0]
    const horaMedia = countComHora > 0 ? Math.round(somaHoras / countComHora) : 0
    const maxHeatmap = Math.max(...Object.values(heatmap), 1)

    return {
      porHora, porDia, heatmap, maxHora, maxDia, maxHeatmap,
      melhorHora: melhorHora ? { hora: Number(melhorHora[0]), count: melhorHora[1] } : null,
      piorHora: piorHora ? { hora: Number(piorHora[0]), count: piorHora[1] } : null,
      melhorDia: melhorDia ? { dia: Number(melhorDia[0]), count: melhorDia[1] } : null,
      piorDia: piorDia ? { dia: Number(piorDia[0]), count: piorDia[1] } : null,
      horaMedia,
      totalVendidos: vendidos.length,
    }
  }, [leads])

  const loading = leadsLoading || closersLoading

  const { mutate: mutateCreateInteraction } = useStableMutation('lead_interactions', 'insert', {
    onSuccess: async () => { toast.success('Interação registrada!'); setIsInteractionModalOpen(false); setInteractionForm({}); await refetchLeads() },
    onError: () => { toast.error('Erro ao registrar interação') },
    debounceMs: 200
  })

  const handleCreateInteraction = useCallback(async () => {
    if (!selectedLead || !interactionForm.resumo) { toast.error('Preencha os campos obrigatórios'); return }
    await mutateCreateInteraction({ ...interactionForm, lead_id: selectedLead.id, closer_id: selectedLead.closer_id, organization_id: selectedLead.organization_id, data_interacao: new Date().toISOString() })
  }, [selectedLead, interactionForm, mutateCreateInteraction])

  const getTemperaturaColor = useCallback((t?: string) => {
    switch (t) {
      case 'elite': return 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
      case 'quente': return 'bg-red-500/20 text-red-300 border border-red-500/30'
      case 'morno': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
      case 'frio': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
      default: return 'bg-white/[0.05] text-white/40 border border-white/[0.08]'
    }
  }, [])

  const getStatusColor = useCallback((s: string) => {
    switch (s) {
      case 'vendido': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
      case 'perdido': return 'bg-red-500/20 text-red-300 border border-red-500/30'
      case 'churn': return 'bg-white/[0.05] text-white/40 border border-white/[0.08]'
      case 'negociacao': return 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
      case 'proposta_enviada': return 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
      default: return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    }
  }, [])

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const s = searchTerm.length === 0 || lead.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) || lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) || lead.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
      const c = selectedCloser === 'all' || lead.closer_id === selectedCloser
      const t = selectedTemperatura === 'all' || lead.temperatura === selectedTemperatura
      const st = selectedStatus === 'all' || lead.status === selectedStatus
      return s && c && t && st
    })
  }, [leads, searchTerm, selectedCloser, selectedTemperatura, selectedStatus])

  const tabs = [
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'closers', label: 'Closers', icon: Star },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'horarios', label: 'Horários', icon: Clock },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-6 w-6 animate-spin text-white/40" />
          <p className="text-sm text-white/40">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-[#0a0a0c]">
      {/* ── HEADER ── */}
      <div className="sticky top-0 z-30 bg-[#0a0a0c]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1440px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold text-white">Performance</h1>
              <p className="text-[11px] text-white/30">Métricas de vendas e conversão</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-36 h-8 bg-white/[0.04] border-white/[0.08] text-white/60 rounded-lg text-xs [&>svg]:text-white/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1e] border-white/[0.08] text-white">
                  <SelectItem value="7_days">7 dias</SelectItem>
                  <SelectItem value="30_days">30 dias</SelectItem>
                  <SelectItem value="90_days">90 dias</SelectItem>
                  <SelectItem value="month">Mês atual</SelectItem>
                  <SelectItem value="quarter">Trimestre</SelectItem>
                  <SelectItem value="semester">Semestre</SelectItem>
                  <SelectItem value="year">Ano</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedCloser} onValueChange={setSelectedCloser}>
                <SelectTrigger className="w-36 h-8 bg-white/[0.04] border-white/[0.08] text-white/60 rounded-lg text-xs [&>svg]:text-white/30">
                  <SelectValue placeholder="Closer" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1e] border-white/[0.08] text-white">
                  <SelectItem value="all">Todos Closers</SelectItem>
                  {closers.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}
                </SelectContent>
              </Select>
              <button onClick={() => refetchLeads()} className="h-8 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: 'Total Leads', value: stats.totalLeads.toString(), color: 'text-blue-400' },
              { label: 'Qualificados', value: `${stats.leadsQualificados}`, sub: `${stats.taxaQualificacao.toFixed(0)}%`, color: 'text-purple-400' },
              { label: 'Convertidos', value: `${stats.leadsConvertidos}`, sub: `${stats.taxaConversao.toFixed(0)}%`, color: 'text-emerald-400' },
              { label: 'Pipeline', value: `R$ ${(stats.valorPipeline / 1000).toFixed(0)}k`, color: 'text-yellow-400' },
              { label: 'Ticket Médio', value: `R$ ${(stats.ticketMedio / 1000).toFixed(0)}k`, color: 'text-orange-400' },
              { label: 'Ciclo Vendas', value: `${stats.cicloVendasMedio.toFixed(0)}d`, color: 'text-cyan-400' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.04]">
                <p className="text-[10px] text-white/30 uppercase tracking-wider">{kpi.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <p className={`text-lg font-bold ${kpi.color} tabular-nums`}>{kpi.value}</p>
                  {kpi.sub && <p className="text-[10px] text-white/25">{kpi.sub}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 py-5 space-y-5">
        {/* Search + Filters */}
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
            <input
              placeholder="Buscar lead..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/10"
            />
          </div>
          <Select value={selectedTemperatura} onValueChange={setSelectedTemperatura}>
            <SelectTrigger className="w-32 h-9 bg-white/[0.03] border-white/[0.06] text-white/50 rounded-lg text-xs [&>svg]:text-white/25">
              <SelectValue placeholder="Temperatura" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1e] border-white/[0.08] text-white">
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="quente">Quente</SelectItem>
              <SelectItem value="morno">Morno</SelectItem>
              <SelectItem value="frio">Frio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <div className="bg-white/[0.02] rounded-xl border border-white/[0.05] overflow-hidden">
          <div className="flex border-b border-white/[0.05]">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all relative ${
                  activeTab === tab.id ? 'text-white bg-white/[0.04]' : 'text-white/30 hover:text-white/50'
                }`}
              >
                {activeTab === tab.id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-white/40 rounded-full" />}
                <div className="flex items-center justify-center gap-1.5">
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </div>
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* ── LEADS TAB ── */}
            {activeTab === 'leads' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-white/60">{filteredLeads.length} leads</p>
                </div>
                <div className="overflow-x-auto rounded-lg border border-white/[0.04]">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                        <th className="text-left p-3 text-[10px] font-semibold text-white/35 uppercase tracking-widest">Lead</th>
                        <th className="text-left p-3 text-[10px] font-semibold text-white/35 uppercase tracking-widest">Score</th>
                        <th className="text-left p-3 text-[10px] font-semibold text-white/35 uppercase tracking-widest">Closer</th>
                        <th className="text-left p-3 text-[10px] font-semibold text-white/35 uppercase tracking-widest">Atividade</th>
                        <th className="text-left p-3 text-[10px] font-semibold text-white/35 uppercase tracking-widest">Status</th>
                        <th className="text-left p-3 text-[10px] font-semibold text-white/35 uppercase tracking-widest">Valor</th>
                        <th className="text-center p-3 text-[10px] font-semibold text-white/35 uppercase tracking-widest">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map(lead => (
                        <tr key={lead.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="p-3">
                            <p className="text-sm font-medium text-white/80">{lead.nome_completo}</p>
                            <p className="text-[11px] text-white/30">{lead.email}</p>
                            {lead.empresa && <p className="text-[11px] text-white/20 flex items-center gap-1 mt-0.5"><Building className="h-2.5 w-2.5" />{lead.empresa}</p>}
                          </td>
                          <td className="p-3">
                            <Badge className={getTemperaturaColor(lead.temperatura)}>{lead.temperatura || '—'}</Badge>
                            {lead.score_bant ? <p className="text-[11px] text-white/30 mt-1">{lead.score_bant}/100</p> : null}
                          </td>
                          <td className="p-3">
                            {lead.closer && <p className="text-[11px] text-white/50">{lead.closer.nome_completo}</p>}
                            {lead.sdr && <p className="text-[11px] text-white/30">{lead.sdr.nome_completo}</p>}
                          </td>
                          <td className="p-3">
                            <p className="text-[11px] text-white/40">{lead.total_interacoes} interações</p>
                            <p className="text-[11px] text-white/25">{lead.dias_no_pipeline}d pipeline</p>
                          </td>
                          <td className="p-3">
                            <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                            <p className="text-[11px] text-white/25 mt-1">{lead.probabilidade_real}% prob.</p>
                          </td>
                          <td className="p-3">
                            {lead.valor_potencial && <p className="text-sm text-emerald-400/80 font-medium">R$ {lead.valor_potencial.toLocaleString('pt-BR')}</p>}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-0.5">
                              <button onClick={() => { setSelectedLead(lead); setIsDetailModalOpen(true) }} className="p-1.5 rounded-md hover:bg-white/[0.05] text-white/25 hover:text-white/60 transition-all"><Eye className="h-3.5 w-3.5" /></button>
                              <button onClick={() => { setSelectedLead(lead); setInteractionForm({ tipo_interacao: 'ligacao', resultado: 'contato_realizado', resumo: '', nivel_interesse: 3, probabilidade_fechamento_percebida: lead.probabilidade_real }); setIsInteractionModalOpen(true) }} className="p-1.5 rounded-md hover:bg-purple-500/10 text-white/25 hover:text-purple-400 transition-all"><Plus className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredLeads.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-6 w-6 text-white/10 mx-auto mb-2" />
                    <p className="text-xs text-white/25">Nenhum lead encontrado</p>
                  </div>
                )}
              </div>
            )}

            {/* ── CLOSERS TAB ── */}
            {activeTab === 'closers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {closers.map(closer => (
                  <div key={closer.id} className="bg-white/[0.02] rounded-xl border border-white/[0.05] p-4 hover:border-white/[0.1] transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white/80">{closer.nome_completo}</h3>
                      <span className="text-[10px] text-white/25 uppercase">{closer.tipo_closer}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-white/[0.03] rounded-lg p-2.5">
                        <p className="text-[10px] text-white/25 uppercase">Ativos</p>
                        <p className="text-xl font-bold text-blue-400">{closer.leads_ativos}</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg p-2.5">
                        <p className="text-[10px] text-white/25 uppercase">Conversões</p>
                        <p className="text-xl font-bold text-emerald-400">{closer.conversoes_mes}</p>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] text-white/25">Taxa conversão</span>
                        <span className="text-[10px] text-white/40">{closer.taxa_conversao.toFixed(1)}%</span>
                      </div>
                      <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500/60 rounded-full transition-all" style={{ width: `${Math.min(closer.taxa_conversao, 100)}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white/25">Atividade/dia: <span className="text-white/50">{closer.atividade_media_dia.toFixed(1)}</span></span>
                      <span className="text-white/25">Pipeline: <span className="text-white/50">R$ {(closer.valor_pipeline / 1000).toFixed(0)}k</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── ANALYTICS TAB ── */}
            {activeTab === 'analytics' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Funil */}
                  <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] p-5">
                    <h3 className="text-sm font-medium text-white/60 mb-4 flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5 text-purple-400/60" />Funil de Conversão</h3>
                    <div className="space-y-4">
                      {['novo', 'contatado', 'qualificado', 'proposta_enviada', 'vendido'].map((stage, i) => {
                        const count = leads.filter(l => l.status === stage).length
                        const pct = leads.length > 0 ? (count / leads.length) * 100 : 0
                        const colors = ['bg-blue-500/50', 'bg-cyan-500/50', 'bg-purple-500/50', 'bg-orange-500/50', 'bg-emerald-500/50']
                        return (
                          <div key={stage}>
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-white/40 capitalize">{stage.replace('_', ' ')}</span>
                              <span className="text-xs text-white/25">{count} ({pct.toFixed(0)}%)</span>
                            </div>
                            <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                              <div className={`h-full ${colors[i]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Fonte */}
                  <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] p-5">
                    <h3 className="text-sm font-medium text-white/60 mb-4 flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5 text-blue-400/60" />Por Fonte</h3>
                    <div className="space-y-2.5">
                      {Array.from(new Set(leads.map(l => l.origem || 'N/A'))).map(fonte => {
                        const fl = leads.filter(l => (l.origem || 'N/A') === fonte)
                        const pct = leads.length > 0 ? (fl.length / leads.length) * 100 : 0
                        const conv = fl.filter(l => l.status === 'vendido').length
                        const txConv = fl.length > 0 ? (conv / fl.length) * 100 : 0
                        return (
                          <div key={fonte} className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-white/50">{fonte}</span>
                              <span className="text-[10px] text-white/25">{fl.length} leads · {txConv.toFixed(0)}% conv.</span>
                            </div>
                            <div className="h-1 bg-white/[0.03] rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500/40 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] p-4">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider">Valor Fechado</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1">R$ {(stats.valorFechado / 1000).toFixed(0)}k</p>
                  </div>
                  <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] p-4">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider">Ciclo Vendas</p>
                    <p className="text-xl font-bold text-purple-400 mt-1">{stats.cicloVendasMedio.toFixed(0)} dias</p>
                  </div>
                  <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] p-4">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider">Taxa Qualificação</p>
                    <p className="text-xl font-bold text-blue-400 mt-1">{stats.taxaQualificacao.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── HORÁRIOS TAB ── */}
            {activeTab === 'horarios' && (
              <div className="space-y-5">
                {/* Cards resumo */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-emerald-500/[0.06] rounded-xl border border-emerald-500/[0.12] p-4">
                    <p className="text-[10px] text-emerald-400/60 uppercase tracking-wider">Melhor Horário</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">
                      {callMetrics.melhorHora ? `${callMetrics.melhorHora.hora}h` : '—'}
                    </p>
                    <p className="text-[11px] text-white/25 mt-0.5">
                      {callMetrics.melhorHora ? `${callMetrics.melhorHora.count} fechamentos` : 'Sem dados'}
                    </p>
                  </div>
                  <div className="bg-blue-500/[0.06] rounded-xl border border-blue-500/[0.12] p-4">
                    <p className="text-[10px] text-blue-400/60 uppercase tracking-wider">Melhor Dia</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">
                      {callMetrics.melhorDia ? DIAS_SEMANA_FULL[callMetrics.melhorDia.dia] : '—'}
                    </p>
                    <p className="text-[11px] text-white/25 mt-0.5">
                      {callMetrics.melhorDia ? `${callMetrics.melhorDia.count} fechamentos` : 'Sem dados'}
                    </p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-4">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Hora Média</p>
                    <p className="text-2xl font-bold text-white/60 mt-1">
                      {callMetrics.horaMedia > 0 ? `${callMetrics.horaMedia}h` : '—'}
                    </p>
                    <p className="text-[11px] text-white/25 mt-0.5">
                      {callMetrics.totalVendidos} vendas analisadas
                    </p>
                  </div>
                </div>

                {/* Heatmap Dia x Hora */}
                <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] p-5">
                  <h3 className="text-sm font-medium text-white/60 mb-4">Heatmap de Fechamentos</h3>
                  <div className="overflow-x-auto">
                    <div className="min-w-[700px]">
                      {/* Header horas */}
                      <div className="flex items-center mb-1">
                        <div className="w-12 shrink-0" />
                        {HORAS_RANGE.map(h => (
                          <div key={h} className="flex-1 text-center text-[9px] text-white/20">{h}h</div>
                        ))}
                        <div className="w-10 shrink-0 text-center text-[9px] text-white/20">Total</div>
                      </div>
                      {/* Rows: dias */}
                      {[1, 2, 3, 4, 5, 6, 0].map(dia => {
                        const totalDia = callMetrics.porDia[dia] || 0
                        return (
                          <div key={dia} className="flex items-center mb-[2px]">
                            <div className="w-12 shrink-0 text-[10px] text-white/30 pr-2 text-right">{DIAS_SEMANA[dia]}</div>
                            {HORAS_RANGE.map(h => {
                              const count = callMetrics.heatmap[`${dia}-${h}`] || 0
                              const intensity = callMetrics.maxHeatmap > 0 ? count / callMetrics.maxHeatmap : 0
                              return (
                                <div key={h} className="flex-1 px-[1px]">
                                  <div
                                    className="h-7 rounded-[3px] flex items-center justify-center text-[9px] font-medium transition-all cursor-default"
                                    style={{
                                      backgroundColor: count > 0
                                        ? `rgba(16, 185, 129, ${0.1 + intensity * 0.7})`
                                        : 'rgba(255,255,255,0.02)',
                                      color: count > 0 ? `rgba(255,255,255,${0.3 + intensity * 0.6})` : 'transparent'
                                    }}
                                    title={`${DIAS_SEMANA_FULL[dia]} ${h}h: ${count} fechamento(s)`}
                                  >
                                    {count > 0 ? count : ''}
                                  </div>
                                </div>
                              )
                            })}
                            <div className="w-10 shrink-0 text-center text-[10px] text-white/30 font-medium">{totalDia > 0 ? totalDia : ''}</div>
                          </div>
                        )
                      })}
                      {/* Footer totais por hora */}
                      <div className="flex items-center mt-1">
                        <div className="w-12 shrink-0" />
                        {HORAS_RANGE.map(h => {
                          const total = callMetrics.porHora[h] || 0
                          return <div key={h} className="flex-1 text-center text-[9px] text-white/20 font-medium">{total > 0 ? total : ''}</div>
                        })}
                        <div className="w-10 shrink-0" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Distribuição por Hora */}
                  <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] p-5">
                    <h3 className="text-sm font-medium text-white/60 mb-4">Fechamentos por Hora</h3>
                    <div className="space-y-1.5">
                      {HORAS_RANGE.map(h => {
                        const count = callMetrics.porHora[h] || 0
                        const pct = callMetrics.maxHora > 0 ? (count / callMetrics.maxHora) * 100 : 0
                        const isMax = callMetrics.melhorHora?.hora === h
                        return (
                          <div key={h} className="flex items-center gap-2">
                            <span className={`w-8 text-right text-[11px] ${isMax ? 'text-emerald-400 font-medium' : 'text-white/30'}`}>{h}h</span>
                            <div className="flex-1 h-4 bg-white/[0.02] rounded overflow-hidden">
                              <div
                                className={`h-full rounded transition-all ${isMax ? 'bg-emerald-500/50' : 'bg-white/[0.08]'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={`w-6 text-[11px] ${count > 0 ? 'text-white/40' : 'text-white/10'}`}>{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Distribuição por Dia */}
                  <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] p-5">
                    <h3 className="text-sm font-medium text-white/60 mb-4">Fechamentos por Dia</h3>
                    <div className="flex items-end gap-3 h-48 pt-4">
                      {[1, 2, 3, 4, 5, 6, 0].map(dia => {
                        const count = callMetrics.porDia[dia] || 0
                        const pct = callMetrics.maxDia > 0 ? (count / callMetrics.maxDia) * 100 : 0
                        const isMax = callMetrics.melhorDia?.dia === dia
                        return (
                          <div key={dia} className="flex-1 flex flex-col items-center gap-1">
                            <span className={`text-[11px] ${count > 0 ? 'text-white/40' : 'text-white/10'}`}>{count}</span>
                            <div className="w-full bg-white/[0.02] rounded-t overflow-hidden relative" style={{ height: '100%' }}>
                              <div
                                className={`absolute bottom-0 w-full rounded-t transition-all ${isMax ? 'bg-blue-500/50' : 'bg-white/[0.08]'}`}
                                style={{ height: `${Math.max(pct, 2)}%` }}
                              />
                            </div>
                            <span className={`text-[10px] ${isMax ? 'text-blue-400 font-medium' : 'text-white/30'}`}>{DIAS_SEMANA[dia]}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Piores horários */}
                {(callMetrics.piorHora || callMetrics.piorDia) && (
                  <div className="grid grid-cols-2 gap-4">
                    {callMetrics.piorHora && callMetrics.piorHora.hora !== callMetrics.melhorHora?.hora && (
                      <div className="bg-red-500/[0.04] rounded-xl border border-red-500/[0.08] p-4">
                        <p className="text-[10px] text-red-400/50 uppercase tracking-wider">Pior Horário</p>
                        <p className="text-lg font-bold text-red-400/70 mt-1">{callMetrics.piorHora.hora}h</p>
                        <p className="text-[11px] text-white/20">{callMetrics.piorHora.count} fechamento(s)</p>
                      </div>
                    )}
                    {callMetrics.piorDia && callMetrics.piorDia.dia !== callMetrics.melhorDia?.dia && (
                      <div className="bg-red-500/[0.04] rounded-xl border border-red-500/[0.08] p-4">
                        <p className="text-[10px] text-red-400/50 uppercase tracking-wider">Pior Dia</p>
                        <p className="text-lg font-bold text-red-400/70 mt-1">{DIAS_SEMANA_FULL[callMetrics.piorDia.dia]}</p>
                        <p className="text-[11px] text-white/20">{callMetrics.piorDia.count} fechamento(s)</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Lead Detail Modal ── */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-[#111113] border-white/[0.08] text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-base">{selectedLead?.nome_completo}</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/[0.03] rounded-lg border border-white/[0.05] p-4">
                  <h4 className="text-xs font-medium text-white/40 mb-2 flex items-center gap-1.5"><User className="h-3 w-3 text-purple-400/60" />Info</h4>
                  <div className="space-y-1 text-[11px]">
                    <p className="text-white/35"><span className="text-white/50">Email:</span> {selectedLead.email}</p>
                    <p className="text-white/35"><span className="text-white/50">Telefone:</span> {selectedLead.telefone}</p>
                    <p className="text-white/35"><span className="text-white/50">Empresa:</span> {selectedLead.empresa}</p>
                    <p className="text-white/35"><span className="text-white/50">Origem:</span> {selectedLead.origem}</p>
                  </div>
                </div>
                <div className="bg-white/[0.03] rounded-lg border border-white/[0.05] p-4">
                  <h4 className="text-xs font-medium text-white/40 mb-2 flex items-center gap-1.5"><DollarSign className="h-3 w-3 text-emerald-400/60" />Pipeline</h4>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5"><span className="text-white/50">Status:</span><Badge className={getStatusColor(selectedLead.status)}>{selectedLead.status}</Badge></div>
                    <div className="flex items-center gap-1.5"><span className="text-white/50">Temp:</span><Badge className={getTemperaturaColor(selectedLead.temperatura)}>{selectedLead.temperatura}</Badge></div>
                    <p className="text-white/35"><span className="text-white/50">Valor:</span> R$ {selectedLead.valor_potencial?.toLocaleString('pt-BR')}</p>
                    <p className="text-white/35"><span className="text-white/50">Prob:</span> {selectedLead.probabilidade_real}%</p>
                  </div>
                </div>
                <div className="bg-white/[0.03] rounded-lg border border-white/[0.05] p-4">
                  <h4 className="text-xs font-medium text-white/40 mb-2 flex items-center gap-1.5"><Activity className="h-3 w-3 text-blue-400/60" />Atividade</h4>
                  <div className="space-y-1 text-[11px]">
                    <p className="text-white/35"><span className="text-white/50">Interações:</span> {selectedLead.total_interacoes}</p>
                    <p className="text-white/35"><span className="text-white/50">BANT:</span> {selectedLead.score_bant}/100</p>
                    <p className="text-white/35"><span className="text-white/50">Pipeline:</span> {selectedLead.dias_no_pipeline}d</p>
                    <p className="text-white/35"><span className="text-white/50">Closer:</span> {selectedLead.closer?.nome_completo}</p>
                  </div>
                </div>
              </div>

              {selectedLead.interactions?.length > 0 && (
                <div className="bg-white/[0.03] rounded-lg border border-white/[0.05] p-4">
                  <h4 className="text-xs font-medium text-white/40 mb-3 flex items-center gap-1.5"><MessageCircle className="h-3 w-3 text-purple-400/60" />Histórico</h4>
                  <div className="space-y-2">
                    {selectedLead.interactions.slice(0, 5).map((int: any, i: number) => (
                      <div key={i} className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                        <div className="flex justify-between">
                          <p className="text-xs text-white/50 capitalize">{int.tipo_interacao} — {int.resultado}</p>
                          <p className="text-[10px] text-white/20">{new Date(int.data_interacao).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <p className="text-[11px] text-white/30 mt-1">{int.resumo || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Interaction Modal ── */}
      <Dialog open={isInteractionModalOpen} onOpenChange={setIsInteractionModalOpen}>
        <DialogContent className="max-w-lg bg-[#111113] border-white/[0.08] text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-base">Nova Interação — {selectedLead?.nome_completo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/40 text-xs">Tipo</Label>
                <Select value={interactionForm.tipo_interacao} onValueChange={(v: any) => setInteractionForm({ ...interactionForm, tipo_interacao: v })}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white/60 mt-1 rounded-lg text-xs [&>svg]:text-white/30"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a1a1e] border-white/[0.08] text-white">
                    <SelectItem value="ligacao">Ligação</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="reuniao">Reunião</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/40 text-xs">Resultado</Label>
                <Select value={interactionForm.resultado} onValueChange={(v: any) => setInteractionForm({ ...interactionForm, resultado: v })}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white/60 mt-1 rounded-lg text-xs [&>svg]:text-white/30"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a1a1e] border-white/[0.08] text-white">
                    <SelectItem value="contato_realizado">Contato Realizado</SelectItem>
                    <SelectItem value="sem_resposta">Sem Resposta</SelectItem>
                    <SelectItem value="agendamento_feito">Agendamento Feito</SelectItem>
                    <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-white/40 text-xs">Resumo *</Label>
              <Textarea value={interactionForm.resumo || ''} onChange={(e) => setInteractionForm({ ...interactionForm, resumo: e.target.value })} placeholder="Descreva..." rows={2} className="bg-white/[0.04] border-white/[0.08] text-white placeholder-white/15 mt-1 rounded-lg text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/40 text-xs">Interesse (1-5)</Label>
                <Input type="number" min="1" max="5" value={interactionForm.nivel_interesse || 3} onChange={(e) => setInteractionForm({ ...interactionForm, nivel_interesse: parseInt(e.target.value) })} className="bg-white/[0.04] border-white/[0.08] text-white mt-1 rounded-lg text-xs" />
              </div>
              <div>
                <Label className="text-white/40 text-xs">Prob. (%)</Label>
                <Input type="number" min="0" max="100" value={interactionForm.probabilidade_fechamento_percebida || 0} onChange={(e) => setInteractionForm({ ...interactionForm, probabilidade_fechamento_percebida: parseInt(e.target.value) })} className="bg-white/[0.04] border-white/[0.08] text-white mt-1 rounded-lg text-xs" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setIsInteractionModalOpen(false)} className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white text-xs">Cancelar</button>
            <button onClick={handleCreateInteraction} className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/15 transition-all">Registrar</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </ProtectedRoute>
  )
}
