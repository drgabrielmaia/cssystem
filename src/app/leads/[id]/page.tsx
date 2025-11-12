'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  Target,
  TrendingUp,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Star,
  ThermometerSun,
  DollarSign,
  User,
  Building,
  Tag
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Lead {
  id: string
  nome_completo: string
  email: string
  telefone: string
  empresa: string
  status: string
  temperatura: string
  proxima_acao: string
  data_prevista_fechamento: string
  motivo_nao_fechou: string
  dor_principal: string
  orcamento_disponivel: number
  urgencia_compra: string
  nivel_interesse: number
  objetivo_principal: string
  objecoes_principais: string
  responsavel_vendas: string
  created_at: string
}

interface HistoricoItem {
  id: number
  tipo_evento: string
  titulo: string
  descricao: string
  status_anterior: string
  status_novo: string
  temperatura_antes: string
  temperatura_depois: string
  created_at: string
}

interface FollowUp {
  id: number
  titulo: string
  descricao: string
  data_agendada: string
  tipo: string
  prioridade: string
  status: string
}

export default function LeadTrackingPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params?.id as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [leadScore, setLeadScore] = useState(0)

  // Estados para modais/formulários
  const [novoFollowUp, setNovoFollowUp] = useState({
    titulo: '',
    descricao: '',
    data_agendada: '',
    tipo: 'call',
    prioridade: 'media'
  })
  const [editandoFollowUp, setEditandoFollowUp] = useState<FollowUp | null>(null)
  const [novaAnotacao, setNovaAnotacao] = useState('')
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false)
  const [isEditFollowUpModalOpen, setIsEditFollowUpModalOpen] = useState(false)

  useEffect(() => {
    if (leadId) {
      loadLeadData()
    }
  }, [leadId])

  const loadLeadData = async () => {
    try {
      // Carregar dados do lead
      const { data: leadData } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single()

      if (leadData) {
        setLead(leadData)
      }

      // Carregar histórico
      const { data: historicoData } = await supabase
        .from('lead_historico')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })

      setHistorico(historicoData || [])

      // Carregar follow-ups
      const { data: followUpsData } = await supabase
        .from('lead_followups')
        .select('*')
        .eq('lead_id', leadId)
        .order('data_agendada', { ascending: true })

      setFollowUps(followUpsData || [])

      // Calcular score do lead
      const { data: scoreData } = await supabase
        .rpc('calcular_lead_score', { lead_uuid: leadId })

      setLeadScore(scoreData || 0)

    } catch (error) {
      console.error('Erro ao carregar dados do lead:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateLeadField = async (field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ [field]: value })
        .eq('id', leadId)

      if (error) throw error

      setLead(prev => prev ? { ...prev, [field]: value } : null)
      await loadLeadData() // Recarregar para atualizar histórico
    } catch (error) {
      console.error('Erro ao atualizar lead:', error)
    }
  }

  const adicionarFollowUp = async () => {
    try {
      const { error } = await supabase
        .from('lead_followups')
        .insert({
          lead_id: leadId,
          ...novoFollowUp
        })

      if (error) throw error

      // Enviar notificação sobre o novo follow-up
      if (lead) {
        try {
          await fetch('/api/notify-followup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              followUp: {
                ...novoFollowUp,
                lead_id: leadId
              },
              lead: {
                nome_completo: lead.nome_completo,
                empresa: lead.empresa,
                telefone: lead.telefone,
                temperatura: lead.temperatura,
                nivel_interesse: lead.nivel_interesse,
                urgencia_compra: lead.urgencia_compra,
                orcamento_disponivel: lead.orcamento_disponivel,
                responsavel_vendas: lead.responsavel_vendas
              }
            })
          })
        } catch (notifyError) {
          console.error('Erro ao enviar notificação de follow-up:', notifyError)
        }
      }

      setNovoFollowUp({
        titulo: '',
        descricao: '',
        data_agendada: '',
        tipo: 'call',
        prioridade: 'media'
      })
      setIsFollowUpModalOpen(false)
      await loadLeadData()
    } catch (error) {
      console.error('Erro ao adicionar follow-up:', error)
    }
  }

  const editarFollowUp = async () => {
    if (!editandoFollowUp) return

    try {
      const { error } = await supabase
        .from('lead_followups')
        .update({
          titulo: editandoFollowUp.titulo,
          descricao: editandoFollowUp.descricao,
          data_agendada: editandoFollowUp.data_agendada,
          tipo: editandoFollowUp.tipo,
          prioridade: editandoFollowUp.prioridade,
          status: editandoFollowUp.status
        })
        .eq('id', editandoFollowUp.id)

      if (error) throw error

      setEditandoFollowUp(null)
      setIsEditFollowUpModalOpen(false)
      await loadLeadData()
    } catch (error) {
      console.error('Erro ao editar follow-up:', error)
    }
  }

  const excluirFollowUp = async (followUpId: number) => {
    if (!confirm('Tem certeza que deseja excluir este follow-up?')) return

    try {
      const { error } = await supabase
        .from('lead_followups')
        .delete()
        .eq('id', followUpId)

      if (error) throw error

      await loadLeadData()
    } catch (error) {
      console.error('Erro ao excluir follow-up:', error)
    }
  }

  const iniciarEdicaoFollowUp = (followUp: FollowUp) => {
    setEditandoFollowUp({ ...followUp })
    setIsEditFollowUpModalOpen(true)
  }

  const adicionarAnotacao = async () => {
    if (!novaAnotacao.trim()) return

    try {
      // Adicionar ao histórico como nota
      const { error } = await supabase
        .from('lead_historico')
        .insert({
          lead_id: leadId,
          tipo_evento: 'note',
          titulo: 'Nova anotação',
          descricao: novaAnotacao
        })

      if (error) throw error

      setNovaAnotacao('')
      await loadLeadData()
    } catch (error) {
      console.error('Erro ao adicionar anotação:', error)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'novo': 'bg-blue-100 text-blue-700',
      'contactado': 'bg-purple-100 text-purple-700',
      'qualificado': 'bg-indigo-100 text-indigo-700',
      'call_agendada': 'bg-orange-100 text-orange-700',
      'proposta_enviada': 'bg-yellow-100 text-yellow-700',
      'vendido': 'bg-green-100 text-green-700',
      'perdido': 'bg-red-100 text-red-700',
      'no-show': 'bg-gray-100 text-gray-700'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700'
  }

  const getTemperaturaColor = (temperatura: string) => {
    const colors = {
      'frio': 'bg-blue-100 text-blue-700',
      'morno': 'bg-orange-100 text-orange-700',
      'quente': 'bg-red-100 text-red-700'
    }
    return colors[temperatura as keyof typeof colors] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="Carregando..." subtitle="Aguarde..." />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="Lead não encontrado" subtitle="O lead solicitado não foi encontrado" />
        <div className="p-6">
          <Button onClick={() => router.push('/leads')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Leads
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title={`🎯 ${lead.nome_completo}`}
        subtitle={`${lead.empresa || 'Empresa não informada'} • Score: ${leadScore}/100`}
      />

      <div className="p-6 space-y-6">
        {/* Header com ações rápidas */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => router.push('/leads')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <div className="flex gap-2">
            <Badge className={getStatusColor(lead.status)}>
              {lead.status}
            </Badge>
            <Badge className={getTemperaturaColor(lead.temperatura || 'frio')}>
              <ThermometerSun className="h-3 w-3 mr-1" />
              {lead.temperatura || 'frio'}
            </Badge>
            <Badge variant="outline">
              <Star className="h-3 w-3 mr-1" />
              Score: {leadScore}
            </Badge>
          </div>
        </div>

        {/* Informações principais em cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Card de informações básicas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">📊 Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Email</Label>
                <p className="text-sm">{lead.email}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Telefone</Label>
                <p className="text-sm">{lead.telefone}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Empresa</Label>
                <p className="text-sm">{lead.empresa || 'Não informado'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Card de tracking */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">🎯 Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Próxima Ação</Label>
                <Input
                  type="date"
                  value={lead.proxima_acao || ''}
                  onChange={(e) => updateLeadField('proxima_acao', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Previsão Fechamento</Label>
                <Input
                  type="date"
                  value={lead.data_prevista_fechamento || ''}
                  onChange={(e) => updateLeadField('data_prevista_fechamento', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card de qualificação */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">⭐ Qualificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Nível Interesse (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={lead.nivel_interesse || ''}
                  onChange={(e) => updateLeadField('nivel_interesse', parseInt(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Urgência</Label>
                <Select
                  value={lead.urgencia_compra || 'media'}
                  onValueChange={(value) => updateLeadField('urgencia_compra', value)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">🟦 Baixa</SelectItem>
                    <SelectItem value="media">🟨 Média</SelectItem>
                    <SelectItem value="alta">🟧 Alta</SelectItem>
                    <SelectItem value="urgente">🟥 Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Card de financeiro */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">💰 Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Orçamento Disponível</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={lead.orcamento_disponivel || ''}
                  onChange={(e) => updateLeadField('orcamento_disponivel', parseFloat(e.target.value))}
                  placeholder="R$ 0,00"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Responsável Vendas</Label>
                <Input
                  value={lead.responsavel_vendas || ''}
                  onChange={(e) => updateLeadField('responsavel_vendas', e.target.value)}
                  placeholder="Nome do vendedor"
                  className="h-8 text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs principais */}
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="timeline">📅 Timeline</TabsTrigger>
            <TabsTrigger value="followups">⏰ Follow-ups</TabsTrigger>
            <TabsTrigger value="details">📝 Detalhes</TabsTrigger>
            <TabsTrigger value="actions">⚡ Ações</TabsTrigger>
          </TabsList>

          {/* Timeline */}
          <TabsContent value="timeline" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Histórico de Atividades</h3>
              <div className="space-x-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Anotação
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Anotação</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        value={novaAnotacao}
                        onChange={(e) => setNovaAnotacao(e.target.value)}
                        placeholder="Digite sua anotação..."
                        rows={4}
                      />
                      <Button onClick={adicionarAnotacao} className="w-full">
                        Adicionar Anotação
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="space-y-3">
              {historico.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {item.tipo_evento}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm">{item.titulo}</h4>
                        {item.descricao && (
                          <p className="text-sm text-gray-600 mt-1">{item.descricao}</p>
                        )}
                        {item.status_anterior && item.status_novo && (
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getStatusColor(item.status_anterior)} variant="outline">
                              {item.status_anterior}
                            </Badge>
                            <span>→</span>
                            <Badge className={getStatusColor(item.status_novo)}>
                              {item.status_novo}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Follow-ups */}
          <TabsContent value="followups" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Follow-ups Agendados</h3>
              <Dialog open={isFollowUpModalOpen} onOpenChange={setIsFollowUpModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Follow-up
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agendar Follow-up</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={novoFollowUp.titulo}
                        onChange={(e) => setNovoFollowUp(prev => ({ ...prev, titulo: e.target.value }))}
                        placeholder="Ex: Ligar para verificar interesse"
                      />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select
                        value={novoFollowUp.tipo}
                        onValueChange={(value) => setNovoFollowUp(prev => ({ ...prev, tipo: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">📞 Ligação</SelectItem>
                          <SelectItem value="email">📧 Email</SelectItem>
                          <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                          <SelectItem value="meeting">🤝 Reunião</SelectItem>
                          <SelectItem value="proposal">📄 Proposta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Data e Hora</Label>
                      <Input
                        type="datetime-local"
                        value={novoFollowUp.data_agendada}
                        onChange={(e) => setNovoFollowUp(prev => ({ ...prev, data_agendada: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Prioridade</Label>
                      <Select
                        value={novoFollowUp.prioridade}
                        onValueChange={(value) => setNovoFollowUp(prev => ({ ...prev, prioridade: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">🟦 Baixa</SelectItem>
                          <SelectItem value="media">🟨 Média</SelectItem>
                          <SelectItem value="alta">🟧 Alta</SelectItem>
                          <SelectItem value="urgente">🟥 Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={novoFollowUp.descricao}
                        onChange={(e) => setNovoFollowUp(prev => ({ ...prev, descricao: e.target.value }))}
                        placeholder="Detalhes do follow-up..."
                        rows={3}
                      />
                    </div>
                    <Button onClick={adicionarFollowUp} className="w-full">
                      Agendar Follow-up
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Modal de edição de follow-up */}
            <Dialog open={isEditFollowUpModalOpen} onOpenChange={setIsEditFollowUpModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Follow-up</DialogTitle>
                </DialogHeader>
                {editandoFollowUp && (
                  <div className="space-y-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={editandoFollowUp.titulo}
                        onChange={(e) => setEditandoFollowUp(prev => prev ? { ...prev, titulo: e.target.value } : null)}
                        placeholder="Ex: Ligar para verificar interesse"
                      />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select
                        value={editandoFollowUp.tipo}
                        onValueChange={(value) => setEditandoFollowUp(prev => prev ? { ...prev, tipo: value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">📞 Ligação</SelectItem>
                          <SelectItem value="email">📧 Email</SelectItem>
                          <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                          <SelectItem value="meeting">🤝 Reunião</SelectItem>
                          <SelectItem value="proposal">📄 Proposta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Data e Hora</Label>
                      <Input
                        type="datetime-local"
                        value={editandoFollowUp.data_agendada}
                        onChange={(e) => setEditandoFollowUp(prev => prev ? { ...prev, data_agendada: e.target.value } : null)}
                      />
                    </div>
                    <div>
                      <Label>Prioridade</Label>
                      <Select
                        value={editandoFollowUp.prioridade}
                        onValueChange={(value) => setEditandoFollowUp(prev => prev ? { ...prev, prioridade: value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">🟦 Baixa</SelectItem>
                          <SelectItem value="media">🟨 Média</SelectItem>
                          <SelectItem value="alta">🟧 Alta</SelectItem>
                          <SelectItem value="urgente">🟥 Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={editandoFollowUp.status}
                        onValueChange={(value) => setEditandoFollowUp(prev => prev ? { ...prev, status: value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">🟡 Pendente</SelectItem>
                          <SelectItem value="concluido">🟢 Concluído</SelectItem>
                          <SelectItem value="cancelado">🔴 Cancelado</SelectItem>
                          <SelectItem value="adiado">🟠 Adiado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={editandoFollowUp.descricao}
                        onChange={(e) => setEditandoFollowUp(prev => prev ? { ...prev, descricao: e.target.value } : null)}
                        placeholder="Detalhes do follow-up..."
                        rows={3}
                      />
                    </div>
                    <Button onClick={editarFollowUp} className="w-full">
                      Salvar Alterações
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <div className="space-y-3">
              {followUps.map((followUp) => (
                <Card key={followUp.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            className={
                              followUp.prioridade === 'urgente' ? 'bg-red-100 text-red-700' :
                              followUp.prioridade === 'alta' ? 'bg-orange-100 text-orange-700' :
                              followUp.prioridade === 'media' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }
                          >
                            {followUp.prioridade}
                          </Badge>
                          <Badge variant="outline">
                            {followUp.tipo}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {format(new Date(followUp.data_agendada), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                        <h4 className="font-medium">{followUp.titulo}</h4>
                        {followUp.descricao && (
                          <p className="text-sm text-gray-600 mt-1">{followUp.descricao}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => iniciarEdicaoFollowUp(followUp)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => excluirFollowUp(followUp.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Badge
                          className={
                            followUp.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                            followUp.status === 'concluido' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }
                        >
                          {followUp.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Detalhes */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>🎯 Objetivos e Necessidades</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Dor Principal</Label>
                    <Textarea
                      value={lead.dor_principal || ''}
                      onChange={(e) => updateLeadField('dor_principal', e.target.value)}
                      placeholder="Qual o principal problema que o lead quer resolver?"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Objetivo Principal</Label>
                    <Textarea
                      value={lead.objetivo_principal || ''}
                      onChange={(e) => updateLeadField('objetivo_principal', e.target.value)}
                      placeholder="O que o lead quer alcançar?"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>❌ Objeções e Bloqueios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Motivo de Não Fechamento</Label>
                    <Textarea
                      value={lead.motivo_nao_fechou || ''}
                      onChange={(e) => updateLeadField('motivo_nao_fechou', e.target.value)}
                      placeholder="Por que o lead não fechou? Timing, orçamento, autoridade..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Principais Objeções</Label>
                    <Textarea
                      value={lead.objecoes_principais || ''}
                      onChange={(e) => updateLeadField('objecoes_principais', e.target.value)}
                      placeholder="Quais foram as principais objeções apresentadas?"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ações */}
          <TabsContent value="actions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <Phone className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <h3 className="font-medium">Ligar</h3>
                  <p className="text-xs text-gray-500 mt-1">Fazer uma ligação</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <Mail className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <h3 className="font-medium">Enviar Email</h3>
                  <p className="text-xs text-gray-500 mt-1">Compor email</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <h3 className="font-medium">WhatsApp</h3>
                  <p className="text-xs text-gray-500 mt-1">Enviar mensagem</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <h3 className="font-medium">Agendar Reunião</h3>
                  <p className="text-xs text-gray-500 mt-1">Marcar call/meeting</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <Target className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                  <h3 className="font-medium">Enviar Proposta</h3>
                  <p className="text-xs text-gray-500 mt-1">Criar proposta comercial</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-indigo-500" />
                  <h3 className="font-medium">Atualizar Status</h3>
                  <p className="text-xs text-gray-500 mt-1">Mudar status do lead</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}