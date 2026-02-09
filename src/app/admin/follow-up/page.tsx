'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Plus,
  Clock,
  Play,
  Pause,
  Square as Stop,
  Edit,
  Trash2,
  Eye,
  Copy,
  Settings,
  Calendar,
  MessageCircle,
  Phone,
  Mail,
  Bell,
  Users,
  Target,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ArrowDown,
  Save,
  X,
  Zap
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  LeadFollowupSequence, 
  FollowupStep, 
  LeadFollowupExecution
} from '@/types/commission'

interface SequenceFormData {
  nome_sequencia: string;
  descricao: string;
  ativo: boolean;
  criterios_ativacao: {
    status_lead?: string[];
    temperatura?: string[];
    origem?: string[];
    tempo_sem_resposta_dias?: number;
    valor_minimo?: number;
  };
  pausar_fim_semana: boolean;
  pausar_feriados: boolean;
  horario_envio_inicio: string;
  horario_envio_fim: string;
  steps: FollowupStep[];
}

interface SequenceStats {
  id: string;
  nome_sequencia: string;
  leads_ativos: number;
  leads_completados: number;
  taxa_resposta: number;
  taxa_conversao: number;
  leads_pausados: number;
  proximo_envio?: string;
}

const STEP_TEMPLATES = {
  primeiro_contato: {
    titulo: "Primeiro Contato",
    conteudo: "Olá {{nome}}, vi que você demonstrou interesse em nossos serviços. Gostaria de agendar uma conversa rápida para entender melhor suas necessidades?",
    delay_days: 0,
    delay_hours: 2
  },
  segundo_contato: {
    titulo: "Segundo Contato - Material",
    conteudo: "Oi {{nome}}, enviei uma mensagem anterior mas talvez não tenha chegado. Preparei um material exclusivo que pode te interessar. Posso enviar?",
    delay_days: 2,
    delay_hours: 0
  },
  terceiro_contato: {
    titulo: "Terceiro Contato - Social Proof",
    conteudo: "{{nome}}, queria compartilhar o resultado que obtivemos com {{empresa_similar}}. Acredito que podemos conseguir algo similar para você. Teria 15 minutos para conversarmos?",
    delay_days: 5,
    delay_hours: 0
  },
  ultimo_contato: {
    titulo: "Último Contato",
    conteudo: "{{nome}}, entendo que você deve estar ocupado. Esta será minha última tentativa. Se tiver interesse em conversar sobre {{solucao}}, é só responder. Caso contrário, vou pausar os contatos. Obrigado!",
    delay_days: 7,
    delay_hours: 0
  }
}

export default function FollowUpConfigPage() {
  const [sequences, setSequences] = useState<LeadFollowupSequence[]>([])
  const [sequenceStats, setSequenceStats] = useState<SequenceStats[]>([])
  const [executions, setExecutions] = useState<LeadFollowupExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSequence, setSelectedSequence] = useState<LeadFollowupSequence | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
  
  const [formData, setFormData] = useState<SequenceFormData>({
    nome_sequencia: '',
    descricao: '',
    ativo: true,
    criterios_ativacao: {},
    pausar_fim_semana: true,
    pausar_feriados: true,
    horario_envio_inicio: '09:00',
    horario_envio_fim: '18:00',
    steps: []
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadSequences(),
        loadSequenceStats(),
        loadExecutions()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const loadSequences = async () => {
    const { data, error } = await supabase
      .from('lead_followup_sequences')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading sequences:', error)
      throw error
    }

    setSequences(data || [])
  }

  const loadSequenceStats = async () => {
    // Esta query seria otimizada numa view materializada em produção
    const { data: execData, error } = await supabase
      .from('lead_followup_executions')
      .select(`
        sequence_id,
        status,
        converteu,
        data_resposta,
        lead_followup_sequences!inner(nome_sequencia)
      `)

    if (error) {
      console.error('Error loading sequence stats:', error)
      return
    }

    // Agregar estatísticas
    const statsMap = new Map<string, SequenceStats>()
    
    execData?.forEach(exec => {
      const seqId = exec.sequence_id
      if (!statsMap.has(seqId)) {
        statsMap.set(seqId, {
          id: seqId,
          nome_sequencia: (exec as any).lead_followup_sequences?.nome_sequencia || 'Sequência sem nome',
          leads_ativos: 0,
          leads_completados: 0,
          taxa_resposta: 0,
          taxa_conversao: 0,
          leads_pausados: 0
        })
      }

      const stats = statsMap.get(seqId)!
      
      switch (exec.status) {
        case 'active':
          stats.leads_ativos++
          break
        case 'completed':
          stats.leads_completados++
          break
        case 'paused':
          stats.leads_pausados++
          break
        case 'responded':
          stats.leads_completados++
          break
      }

      if (exec.data_resposta) {
        stats.taxa_resposta++
      }
      if (exec.converteu) {
        stats.taxa_conversao++
      }
    })

    // Calcular percentuais
    const statsArray = Array.from(statsMap.values()).map(stats => {
      const total = stats.leads_ativos + stats.leads_completados + stats.leads_pausados
      return {
        ...stats,
        taxa_resposta: total > 0 ? (stats.taxa_resposta / total) * 100 : 0,
        taxa_conversao: total > 0 ? (stats.taxa_conversao / total) * 100 : 0
      }
    })

    setSequenceStats(statsArray)
  }

  const loadExecutions = async () => {
    const { data, error } = await supabase
      .from('lead_followup_executions')
      .select(`
        *,
        leads!inner(nome_completo, email, temperatura),
        lead_followup_sequences!inner(nome_sequencia)
      `)
      .eq('status', 'active')
      .order('proxima_execucao', { ascending: true })
      .limit(50)

    if (error) {
      console.error('Error loading executions:', error)
      return
    }

    setExecutions(data || [])
  }

  const createSequence = async () => {
    if (!formData.nome_sequencia || formData.steps.length === 0) {
      toast.error('Nome da sequência e pelo menos um step são obrigatórios')
      return
    }

    try {
      const sequenceData = {
        ...formData,
        organization_id: '1', // Substituir pela organização atual
        criterios_ativacao: JSON.stringify(formData.criterios_ativacao),
        steps: JSON.stringify(formData.steps)
      }

      const { error } = await supabase
        .from('lead_followup_sequences')
        .insert(sequenceData)

      if (error) throw error

      toast.success('Sequência criada com sucesso!')
      setIsCreateModalOpen(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Error creating sequence:', error)
      toast.error('Erro ao criar sequência')
    }
  }

  const updateSequence = async () => {
    if (!selectedSequence) return

    try {
      const sequenceData = {
        ...formData,
        criterios_ativacao: JSON.stringify(formData.criterios_ativacao),
        steps: JSON.stringify(formData.steps),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('lead_followup_sequences')
        .update(sequenceData)
        .eq('id', selectedSequence.id)

      if (error) throw error

      toast.success('Sequência atualizada com sucesso!')
      setIsEditModalOpen(false)
      resetForm()
      setSelectedSequence(null)
      loadData()
    } catch (error) {
      console.error('Error updating sequence:', error)
      toast.error('Erro ao atualizar sequência')
    }
  }

  const toggleSequenceActive = async (sequenceId: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('lead_followup_sequences')
        .update({ ativo, updated_at: new Date().toISOString() })
        .eq('id', sequenceId)

      if (error) throw error

      toast.success(`Sequência ${ativo ? 'ativada' : 'desativada'} com sucesso!`)
      loadData()
    } catch (error) {
      console.error('Error toggling sequence:', error)
      toast.error('Erro ao alterar status da sequência')
    }
  }

  const deleteSequence = async (sequenceId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta sequência? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('lead_followup_sequences')
        .delete()
        .eq('id', sequenceId)

      if (error) throw error

      toast.success('Sequência excluída com sucesso!')
      loadData()
    } catch (error) {
      console.error('Error deleting sequence:', error)
      toast.error('Erro ao excluir sequência')
    }
  }

  const duplicateSequence = async (sequence: LeadFollowupSequence) => {
    try {
      const newSequence = {
        ...sequence,
        nome_sequencia: `${sequence.nome_sequencia} (Cópia)`,
        ativo: false,
        leads_atingidos: 0,
        taxa_resposta: 0,
        taxa_conversao: 0
      }
      
      delete (newSequence as any).id
      delete (newSequence as any).created_at
      delete (newSequence as any).updated_at

      const { error } = await supabase
        .from('lead_followup_sequences')
        .insert(newSequence)

      if (error) throw error

      toast.success('Sequência duplicada com sucesso!')
      loadData()
    } catch (error) {
      console.error('Error duplicating sequence:', error)
      toast.error('Erro ao duplicar sequência')
    }
  }

  const addStep = () => {
    const newStep: FollowupStep = {
      step_numero: formData.steps.length + 1,
      delay_days: 1,
      delay_hours: 0,
      tipo_acao: 'email',
      titulo: '',
      conteudo: '',
      template_vars: ['nome', 'empresa']
    }
    setFormData({
      ...formData,
      steps: [...formData.steps, newStep]
    })
  }

  const removeStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, step_numero: i + 1 }))
    setFormData({ ...formData, steps: newSteps })
  }

  const updateStep = (index: number, updatedStep: Partial<FollowupStep>) => {
    const newSteps = formData.steps.map((step, i) => 
      i === index ? { ...step, ...updatedStep } : step
    )
    setFormData({ ...formData, steps: newSteps })
  }

  const applyTemplate = (template: string) => {
    const templateData = STEP_TEMPLATES[template as keyof typeof STEP_TEMPLATES]
    if (!templateData) return

    setFormData({
      ...formData,
      steps: Object.values(STEP_TEMPLATES).map((template, index) => ({
        step_numero: index + 1,
        delay_days: template.delay_days,
        delay_hours: template.delay_hours || 0,
        tipo_acao: 'whatsapp' as const,
        titulo: template.titulo,
        conteudo: template.conteudo,
        template_vars: ['nome', 'empresa_similar', 'solucao']
      }))
    })
    toast.success('Template aplicado com sucesso!')
  }

  const resetForm = () => {
    setFormData({
      nome_sequencia: '',
      descricao: '',
      ativo: true,
      criterios_ativacao: {},
      pausar_fim_semana: true,
      pausar_feriados: true,
      horario_envio_inicio: '09:00',
      horario_envio_fim: '18:00',
      steps: []
    })
  }

  const openEditModal = (sequence: LeadFollowupSequence) => {
    setSelectedSequence(sequence)
    setFormData({
      nome_sequencia: sequence.nome_sequencia,
      descricao: sequence.descricao || '',
      ativo: sequence.ativo,
      criterios_ativacao: sequence.criterios_ativacao || {},
      pausar_fim_semana: sequence.pausar_fim_semana,
      pausar_feriados: sequence.pausar_feriados,
      horario_envio_inicio: sequence.horario_envio_inicio,
      horario_envio_fim: sequence.horario_envio_fim,
      steps: sequence.steps
    })
    setIsEditModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'responded': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatNextExecution = (date: string) => {
    const now = new Date()
    const execDate = new Date(date)
    const diffHours = Math.round((execDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 0) return 'Atrasado'
    if (diffHours < 24) return `Em ${diffHours}h`
    const diffDays = Math.round(diffHours / 24)
    return `Em ${diffDays}d`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Follow-up Automatizado</h1>
          <p className="text-gray-600 mt-1">
            Configure sequências de follow-up personalizadas e acompanhe o desempenho
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Sequência
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="sequences" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sequences">Sequências</TabsTrigger>
          <TabsTrigger value="executions">Execuções Ativas</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="sequences" className="space-y-4">
          {/* Sequences List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sequences.map((sequence) => (
              <Card key={sequence.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{sequence.nome_sequencia}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Switch 
                        checked={sequence.ativo}
                        onCheckedChange={(checked) => toggleSequenceActive(sequence.id, checked)}
                      />
                      <Badge variant={sequence.ativo ? 'default' : 'secondary'}>
                        {sequence.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </div>
                  {sequence.descricao && (
                    <CardDescription>{sequence.descricao}</CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Steps</p>
                      <p className="font-medium">{sequence.steps.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Leads</p>
                      <p className="font-medium">{sequence.leads_atingidos}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Taxa Resposta</p>
                      <p className="font-medium">{sequence.taxa_resposta.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Conversão</p>
                      <p className="font-medium">{sequence.taxa_conversao.toFixed(1)}%</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditModal(sequence)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => duplicateSequence(sequence)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteSequence(sequence.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {sequences.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="text-center py-8">
                  <Zap className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Nenhuma sequência configurada</p>
                  <Button 
                    onClick={() => setIsCreateModalOpen(true)} 
                    className="mt-4"
                    variant="outline"
                  >
                    Criar primeira sequência
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          {/* Active Executions */}
          <Card>
            <CardHeader>
              <CardTitle>Execuções Ativas ({executions.length})</CardTitle>
              <CardDescription>
                Follow-ups que serão executados em breve
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Lead</th>
                      <th className="text-left p-2">Sequência</th>
                      <th className="text-left p-2">Step Atual</th>
                      <th className="text-left p-2">Próxima Execução</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions.map((execution) => (
                      <tr key={execution.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">Lead ID: {execution.lead_id}</p>
                            <p className="text-sm text-gray-500">Status: {execution.status}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="text-sm">Sequence ID: {execution.sequence_id}</p>
                        </td>
                        <td className="p-3">
                          <p className="text-sm">{execution.step_atual + 1}</p>
                        </td>
                        <td className="p-3">
                          {execution.proxima_execucao && (
                            <p className="text-sm">
                              {formatNextExecution(execution.proxima_execucao)}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge className={getStatusColor(execution.status)}>
                            {execution.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {executions.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Nenhuma execução ativa no momento</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sequenceStats.map((stats) => (
              <Card key={stats.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{stats.nome_sequencia}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-gray-600">Leads Ativos</p>
                      <p className="text-2xl font-bold text-green-600">{stats.leads_ativos}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Completados</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.leads_completados}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Taxa de Resposta</span>
                      <span className="font-medium">{stats.taxa_resposta.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(100, stats.taxa_resposta)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Taxa de Conversão</span>
                      <span className="font-medium">{stats.taxa_conversao.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${Math.min(100, stats.taxa_conversao)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Sequence Modal */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false)
          setIsEditModalOpen(false)
          resetForm()
          setSelectedSequence(null)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSequence ? 'Editar' : 'Criar'} Sequência de Follow-up
            </DialogTitle>
            <DialogDescription>
              Configure uma sequência automatizada de contatos para nutrir seus leads
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome da Sequência *</Label>
                  <Input
                    value={formData.nome_sequencia}
                    onChange={(e) => setFormData({...formData, nome_sequencia: e.target.value})}
                    placeholder="Ex: Nurturing Leads Frios"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({...formData, ativo: checked})}
                  />
                  <Label>Sequência ativa</Label>
                </div>
              </div>
              
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  placeholder="Descreva o objetivo desta sequência..."
                  rows={2}
                />
              </div>
            </div>

            {/* Schedule Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Configurações de Horário</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Horário de Início</Label>
                  <Input
                    type="time"
                    value={formData.horario_envio_inicio}
                    onChange={(e) => setFormData({...formData, horario_envio_inicio: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Horário de Fim</Label>
                  <Input
                    type="time"
                    value={formData.horario_envio_fim}
                    onChange={(e) => setFormData({...formData, horario_envio_fim: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.pausar_fim_semana}
                    onCheckedChange={(checked) => setFormData({...formData, pausar_fim_semana: checked})}
                  />
                  <Label>Pausar nos finais de semana</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.pausar_feriados}
                    onCheckedChange={(checked) => setFormData({...formData, pausar_feriados: checked})}
                  />
                  <Label>Pausar nos feriados</Label>
                </div>
              </div>
            </div>

            {/* Templates */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Templates Pré-definidos</h3>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('sequencia_completa')}
                >
                  Sequência Completa (4 steps)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({...formData, steps: []})}
                >
                  Limpar Steps
                </Button>
              </div>
            </div>

            {/* Steps Configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Steps da Sequência</h3>
                <Button type="button" onClick={addStep} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Step
                </Button>
              </div>
              
              <div className="space-y-4">
                {formData.steps.map((step, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Step {step.step_numero}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStep(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Tipo de Ação</Label>
                          <Select
                            value={step.tipo_acao}
                            onValueChange={(value: any) => updateStep(index, { tipo_acao: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="ligacao">Ligação</SelectItem>
                              <SelectItem value="tarefa">Tarefa Manual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Aguardar (Dias)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={step.delay_days}
                            onChange={(e) => updateStep(index, { delay_days: parseInt(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>Aguardar (Horas)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            value={step.delay_hours || 0}
                            onChange={(e) => updateStep(index, { delay_hours: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label>Título do Step</Label>
                        <Input
                          value={step.titulo}
                          onChange={(e) => updateStep(index, { titulo: e.target.value })}
                          placeholder="Ex: Primeiro contato - Introdução"
                        />
                      </div>
                      
                      <div>
                        <Label>Conteúdo da Mensagem</Label>
                        <Textarea
                          value={step.conteudo}
                          onChange={(e) => updateStep(index, { conteudo: e.target.value })}
                          placeholder="Use variáveis como {{nome}}, {{empresa}}, {{valor_potencial}}"
                          rows={3}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
                
                {formData.steps.length === 0 && (
                  <div className="text-center py-8 border border-dashed rounded-lg">
                    <ArrowDown className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">Adicione steps para sua sequência</p>
                    <p className="text-sm text-gray-400">
                      Cada step será executado automaticamente de acordo com o timing configurado
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateModalOpen(false)
                setIsEditModalOpen(false)
                resetForm()
                setSelectedSequence(null)
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={selectedSequence ? updateSequence : createSequence}
              disabled={!formData.nome_sequencia || formData.steps.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              {selectedSequence ? 'Atualizar' : 'Criar'} Sequência
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}