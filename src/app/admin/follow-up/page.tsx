'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Zap,
  Upload,
  FileText,
  Image as ImageIcon,
  Video,
  TrendingUp,
  Activity,
  Loader2,
  ChevronDown
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'
import { toast } from 'sonner'
import { Header } from '@/components/header'
import {
  LeadFollowupSequence,
  FollowupStep,
  LeadFollowupExecution
} from '@/types/commission'
import { processDueFollowups, startFollowupForLead } from '@/services/followup-executor'

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
    delay_hours: 2,
    delay_minutes: 0,
    tipo_acao: 'whatsapp'
  },
  segundo_contato: {
    titulo: "Segundo Contato - Material",
    conteudo: "Oi {{nome}}, enviei uma mensagem anterior mas talvez não tenha chegado. Preparei um material exclusivo que pode te interessar. Posso enviar?",
    delay_days: 2,
    delay_hours: 0,
    delay_minutes: 0,
    tipo_acao: 'whatsapp'
  },
  terceiro_contato: {
    titulo: "Terceiro Contato - Social Proof",
    conteudo: "{{nome}}, queria compartilhar o resultado que obtivemos com {{empresa_similar}}. Acredito que podemos conseguir algo similar para você. Teria 15 minutos para conversarmos?",
    delay_days: 5,
    delay_hours: 0,
    delay_minutes: 0,
    tipo_acao: 'whatsapp'
  },
  ultimo_contato: {
    titulo: "Ultimo Contato",
    conteudo: "{{nome}}, entendo que você deve estar ocupado. Esta será minha última tentativa. Se tiver interesse em conversar sobre {{solucao}}, é só responder. Caso contrário, vou pausar os contatos. Obrigado!",
    delay_days: 7,
    delay_hours: 0,
    delay_minutes: 0,
    tipo_acao: 'whatsapp'
  },
  follow_up_daily: {
    titulo: "Follow-up Diario",
    conteudo: "Olá {{nome}}! Como está o andamento da nossa proposta? Tem alguma dúvida que posso esclarecer?",
    delay_days: 1,
    delay_hours: 0,
    delay_minutes: 0,
    tipo_acao: 'whatsapp'
  },
  follow_up_3days: {
    titulo: "Follow-up 3 Dias",
    conteudo: "{{nome}}, passaram alguns dias desde nosso último contato. Ainda tem interesse em conhecer nossa solução?",
    delay_days: 3,
    delay_hours: 0,
    delay_minutes: 0,
    tipo_acao: 'whatsapp'
  },
  weekly_check: {
    titulo: "Check Semanal",
    conteudo: "{{nome}}, como foi sua semana? Gostaria de retomar nossa conversa sobre {{solucao}}?",
    delay_days: 7,
    delay_hours: 0,
    delay_minutes: 0,
    tipo_acao: 'whatsapp'
  },
  urgencia_gentle: {
    titulo: "Urgencia Gentil",
    conteudo: "{{nome}}, nossa oferta especial termina em breve. Não queria que você perdesse essa oportunidade. Podemos conversar hoje?",
    delay_days: 1,
    delay_hours: 0,
    delay_minutes: 0,
    tipo_acao: 'whatsapp'
  }
}

export default function FollowUpConfigPage() {
  const { organizationId } = useAuth()
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
    if (organizationId) loadData()
  }, [organizationId])

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
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading sequences:', error)
      throw error
    }

    // Normalizar steps para garantir que sempre é um array
    const normalized = (data || []).map(seq => ({
      ...seq,
      steps: Array.isArray(seq.steps) ? seq.steps : []
    }))
    setSequences(normalized)
  }

  const loadSequenceStats = async () => {
    const { data: execData, error } = await supabase
      .from('lead_followup_executions')
      .select(`
        sequence_id,
        status,
        converteu,
        data_resposta,
        lead_followup_sequences!inner(nome_sequencia)
      `)
      .eq('organization_id', organizationId)

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
      .eq('organization_id', organizationId)
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
      toast.error('Nome da sequencia e pelo menos um step sao obrigatorios')
      return
    }

    try {
      const sequenceData = {
        nome_sequencia: formData.nome_sequencia,
        descricao: formData.descricao,
        ativo: formData.ativo,
        organization_id: organizationId,
        criterios_ativacao: formData.criterios_ativacao,
        steps: formData.steps,
        pausar_fim_semana: formData.pausar_fim_semana,
        pausar_feriados: formData.pausar_feriados,
        horario_envio_inicio: formData.horario_envio_inicio,
        horario_envio_fim: formData.horario_envio_fim,
        timezone: 'America/Sao_Paulo',
        leads_atingidos: 0,
        taxa_resposta: 0,
        taxa_conversao: 0
      }

      const { error } = await supabase
        .from('lead_followup_sequences')
        .insert(sequenceData)

      if (error) throw error

      toast.success('Sequencia criada com sucesso!')
      setIsCreateModalOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      console.error('Error creating sequence:', error)
      toast.error(`Erro ao criar sequência: ${error?.message || error?.details || 'Erro desconhecido'}`)
    }
  }

  const updateSequence = async () => {
    if (!selectedSequence) return

    try {
      const sequenceData = {
        nome_sequencia: formData.nome_sequencia,
        descricao: formData.descricao,
        ativo: formData.ativo,
        criterios_ativacao: formData.criterios_ativacao,
        steps: formData.steps,
        pausar_fim_semana: formData.pausar_fim_semana,
        pausar_feriados: formData.pausar_feriados,
        horario_envio_inicio: formData.horario_envio_inicio,
        horario_envio_fim: formData.horario_envio_fim,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('lead_followup_sequences')
        .update(sequenceData)
        .eq('id', selectedSequence.id)

      if (error) throw error

      toast.success('Sequencia atualizada com sucesso!')
      setIsEditModalOpen(false)
      resetForm()
      setSelectedSequence(null)
      loadData()
    } catch (error) {
      console.error('Error updating sequence:', error)
      toast.error('Erro ao atualizar sequencia')
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

  // Process due follow-ups (execute pending WhatsApp messages)
  const [isProcessing, setIsProcessing] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignSequenceId, setAssignSequenceId] = useState<string | null>(null)
  const [assignLeadSearch, setAssignLeadSearch] = useState('')
  const [assignLeadResults, setAssignLeadResults] = useState<any[]>([])
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null)

  const handleProcessFollowups = async () => {
    if (!organizationId) return
    setIsProcessing(true)
    try {
      const count = await processDueFollowups(organizationId)
      if (count > 0) {
        toast.success(`${count} follow-up(s) processado(s) e enviado(s)!`)
      } else {
        toast.info('Nenhum follow-up pendente no momento')
      }
      loadData()
    } catch (error) {
      console.error('Error processing follow-ups:', error)
      toast.error('Erro ao processar follow-ups')
    } finally {
      setIsProcessing(false)
    }
  }

  const searchLeadsForAssign = async (search: string) => {
    if (!search || search.length < 2) { setAssignLeadResults([]); return }
    const { data } = await supabase
      .from('leads')
      .select('id, nome_completo, email, telefone')
      .eq('organization_id', organizationId)
      .or(`nome_completo.ilike.%${search}%,email.ilike.%${search}%`)
      .limit(10)
    setAssignLeadResults(data || [])
  }

  const handleAssignLead = async (leadId: string) => {
    if (!assignSequenceId || !organizationId) return
    setAssigningLeadId(leadId)
    try {
      const execId = await startFollowupForLead(leadId, assignSequenceId, organizationId)
      if (execId) {
        toast.success('Lead vinculado ao follow-up com sucesso!')
        setAssignModalOpen(false)
        setAssignSequenceId(null)
        setAssignLeadSearch('')
        setAssignLeadResults([])
        loadData()
      } else {
        toast.error('Erro ao vincular lead')
      }
    } catch (error) {
      toast.error('Erro ao vincular lead')
    } finally {
      setAssigningLeadId(null)
    }
  }

  const addStep = () => {
    const newStep: FollowupStep = {
      step_numero: formData.steps.length + 1,
      delay_days: 1,
      delay_hours: 0,
      delay_minutes: 0,
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

  const handleMediaUpload = async (stepIndex: number, file: File) => {
    try {
      const mime = file.type
      let mediaType: 'image' | 'video' | 'document' = 'document'
      if (mime.startsWith('image/')) mediaType = 'image'
      else if (mime.startsWith('video/')) mediaType = 'video'

      const ext = file.name.split('.').pop() || 'bin'
      const path = `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('followup-media')
        .upload(path, file, { contentType: mime, upsert: false })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('followup-media').getPublicUrl(path)

      updateStep(stepIndex, {
        media_url: urlData.publicUrl,
        media_type: mediaType,
        media_filename: file.name,
        media_mimetype: mime,
      })
      toast.success('Mídia anexada com sucesso')
    } catch (err: any) {
      console.error('Erro ao enviar mídia:', err)
      toast.error('Erro ao enviar mídia: ' + (err.message || ''))
    }
  }

  const removeMedia = (stepIndex: number) => {
    updateStep(stepIndex, {
      media_url: undefined,
      media_type: undefined,
      media_filename: undefined,
      media_mimetype: undefined,
    })
  }

  const applyTemplate = (template: string) => {
    const templateData = STEP_TEMPLATES[template as keyof typeof STEP_TEMPLATES]
    if (!templateData) return

    setFormData({
      ...formData,
      steps: Object.values(STEP_TEMPLATES).slice(0, 4).map((template, index) => ({
        step_numero: index + 1,
        delay_days: template.delay_days,
        delay_hours: template.delay_hours || 0,
        delay_minutes: template.delay_minutes || 0,
        tipo_acao: template.tipo_acao as any,
        titulo: template.titulo,
        conteudo: template.conteudo,
        template_vars: ['nome', 'empresa_similar', 'solucao']
      }))
    })
    toast.success('Template aplicado com sucesso!')
  }

  const applyDailyTemplate = () => {
    setFormData({
      ...formData,
      steps: [1, 2, 3, 4, 5].map((day) => ({
        step_numero: day,
        delay_days: day - 1,
        delay_hours: 0,
        delay_minutes: 0,
        tipo_acao: 'whatsapp' as const,
        titulo: `Follow-up Dia ${day}`,
        conteudo: day === 1
          ? "Olá {{nome}}! Obrigado pelo interesse. Como posso ajudar?"
          : `{{nome}}, continuamos aqui para esclarecer qualquer dúvida sobre {{solucao}}. Como posso ajudar hoje?`,
        template_vars: ['nome', 'solucao']
      }))
    })
    toast.success('Template diario aplicado!')
  }

  const apply3DaysTemplate = () => {
    setFormData({
      ...formData,
      steps: [0, 3, 6, 9].map((day, index) => ({
        step_numero: index + 1,
        delay_days: day,
        delay_hours: 0,
        delay_minutes: 0,
        tipo_acao: 'whatsapp' as const,
        titulo: `Follow-up ${day === 0 ? 'Imediato' : `${day} dias`}`,
        conteudo: index === 0
          ? "Olá {{nome}}! Vi seu interesse em {{solucao}}. Posso esclarecer alguma dúvida?"
          : index === 3
          ? "{{nome}}, esta será minha última tentativa. Ainda tem interesse em {{solucao}}?"
          : "Oi {{nome}}, como está? Gostaria de retomar nossa conversa sobre {{solucao}}?",
        template_vars: ['nome', 'solucao']
      }))
    })
    toast.success('Template a cada 3 dias aplicado!')
  }

  const applyWeeklyTemplate = () => {
    setFormData({
      ...formData,
      steps: [0, 7, 14, 21].map((day, index) => ({
        step_numero: index + 1,
        delay_days: day,
        delay_hours: 0,
        delay_minutes: 0,
        tipo_acao: 'whatsapp' as const,
        titulo: `Semana ${Math.floor(day/7) + 1}`,
        conteudo: index === 0
          ? "Olá {{nome}}! Como foi sua semana? Gostaria de conhecer {{solucao}}?"
          : `{{nome}}, como está? Passaram ${day} dias desde nosso último contato. Ainda tem interesse em {{solucao}}?`,
        template_vars: ['nome', 'solucao']
      }))
    })
    toast.success('Template semanal aplicado!')
  }

  const applyUrgencyTemplate = () => {
    setFormData({
      ...formData,
      steps: [0, 1, 2].map((day, index) => ({
        step_numero: index + 1,
        delay_days: day,
        delay_hours: index === 0 ? 2 : 0,
        delay_minutes: 0,
        tipo_acao: 'whatsapp' as const,
        titulo: index === 0 ? 'Contato Imediato' : `Urgencia Dia ${day}`,
        conteudo: index === 0
          ? "{{nome}}, vi seu interesse em {{solucao}}! Nossa oferta especial termina hoje. Podemos conversar AGORA?"
          : index === 1
          ? "{{nome}}, nao queria que voce perdesse! Ultima chance para {{solucao}} com desconto. Podemos falar?"
          : "{{nome}}, oferta encerrada, mas ainda podemos conversar sobre {{solucao}}. Que tal agendar uma call?",
        template_vars: ['nome', 'solucao']
      }))
    })
    toast.success('Template de urgencia aplicado!')
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
      steps: Array.isArray(sequence.steps) ? sequence.steps : []
    })
    setIsEditModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
      case 'paused': return 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20'
      case 'completed': return 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20'
      case 'cancelled': return 'bg-red-500/15 text-red-400 ring-1 ring-red-500/20'
      case 'responded': return 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/20'
      default: return 'bg-white/[0.06] text-white/40 ring-1 ring-white/[0.06]'
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

  // KPI calculations
  const totalSequences = sequences.length
  const activeSequences = sequences.filter(s => s.ativo).length
  const totalLeadsInFollowup = sequenceStats.reduce((sum, s) => sum + s.leads_ativos, 0)
  const avgResponseRate = sequenceStats.length > 0
    ? sequenceStats.reduce((sum, s) => sum + Number(s.taxa_resposta || 0), 0) / sequenceStats.length
    : 0
  const avgConversionRate = sequenceStats.length > 0
    ? sequenceStats.reduce((sum, s) => sum + Number(s.taxa_conversao || 0), 0) / sequenceStats.length
    : 0
  const totalActiveExecutions = executions.length

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 flex items-center justify-center ring-1 ring-blue-500/20">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
          </div>
          <p className="text-white/40 text-sm">Carregando follow-ups...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Header title="Follow-up Automatico" subtitle="Configure sequências de follow-up automatizadas" />

      <div className="p-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Total Sequences */}
          <div className="relative overflow-hidden bg-[#141418] p-5 rounded-2xl ring-1 ring-white/[0.06] group hover:ring-blue-500/20 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.07] via-transparent to-transparent pointer-events-none" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-blue-500/[0.04] rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs text-white/40 mb-1">Total Sequências</p>
                <p className="text-2xl font-bold text-white tracking-tight">{totalSequences}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center ring-1 ring-blue-500/20">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Active Sequences */}
          <div className="relative overflow-hidden bg-[#141418] p-5 rounded-2xl ring-1 ring-white/[0.06] group hover:ring-emerald-500/20 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.07] via-transparent to-transparent pointer-events-none" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-500/[0.04] rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs text-white/40 mb-1">Ativas</p>
                <p className="text-2xl font-bold text-white tracking-tight">{activeSequences}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/20">
                <Play className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Leads in Follow-up */}
          <div className="relative overflow-hidden bg-[#141418] p-5 rounded-2xl ring-1 ring-white/[0.06] group hover:ring-purple-500/20 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.07] via-transparent to-transparent pointer-events-none" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-purple-500/[0.04] rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs text-white/40 mb-1">Leads em Follow-up</p>
                <p className="text-2xl font-bold text-white tracking-tight">{totalLeadsInFollowup}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center ring-1 ring-purple-500/20">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </div>

          {/* Active Executions */}
          <div className="relative overflow-hidden bg-[#141418] p-5 rounded-2xl ring-1 ring-white/[0.06] group hover:ring-amber-500/20 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.07] via-transparent to-transparent pointer-events-none" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-500/[0.04] rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs text-white/40 mb-1">Execuções Ativas</p>
                <p className="text-2xl font-bold text-white tracking-tight">{totalActiveExecutions}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center ring-1 ring-amber-500/20">
                <Activity className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </div>

          {/* Avg Response Rate */}
          <div className="relative overflow-hidden bg-[#141418] p-5 rounded-2xl ring-1 ring-white/[0.06] group hover:ring-cyan-500/20 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.07] via-transparent to-transparent pointer-events-none" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-cyan-500/[0.04] rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs text-white/40 mb-1">Taxa Resposta</p>
                <p className="text-2xl font-bold text-white tracking-tight">{avgResponseRate.toFixed(1)}%</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center ring-1 ring-cyan-500/20">
                <MessageCircle className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
          </div>

          {/* Avg Conversion Rate */}
          <div className="relative overflow-hidden bg-[#141418] p-5 rounded-2xl ring-1 ring-white/[0.06] group hover:ring-rose-500/20 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.07] via-transparent to-transparent pointer-events-none" />
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-rose-500/[0.04] rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs text-white/40 mb-1">Taxa Conversão</p>
                <p className="text-2xl font-bold text-white tracking-tight">{avgConversionRate.toFixed(1)}%</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center ring-1 ring-rose-500/20">
                <TrendingUp className="w-5 h-5 text-rose-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div /> {/* spacer */}
          <div className="flex gap-3">
            <Button
              onClick={handleProcessFollowups}
              disabled={isProcessing}
              variant="outline"
              size="sm"
              className="bg-transparent border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-all duration-200"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              {isProcessing ? 'Processando...' : 'Executar Follow-ups'}
            </Button>
            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
              className="bg-transparent border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white hover:border-white/[0.12] transition-all duration-200"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  className="bg-blue-600 hover:bg-blue-500 text-white border-0 transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Sequência
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sequences" className="w-full">
          <TabsList className="bg-[#141418] border border-white/[0.06] rounded-xl p-1 h-auto">
            <TabsTrigger
              value="sequences"
              className="rounded-lg px-4 py-2.5 text-sm text-white/40 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-none transition-all duration-200"
            >
              Sequências
            </TabsTrigger>
            <TabsTrigger
              value="activate"
              className="rounded-lg px-4 py-2.5 text-sm text-white/40 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-none transition-all duration-200"
            >
              Ativar Follow-up
            </TabsTrigger>
            <TabsTrigger
              value="executions"
              className="rounded-lg px-4 py-2.5 text-sm text-white/40 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-none transition-all duration-200"
            >
              Execuções Ativas
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="rounded-lg px-4 py-2.5 text-sm text-white/40 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-none transition-all duration-200"
            >
              Estatísticas
            </TabsTrigger>
            <TabsTrigger
              value="respostas"
              className="rounded-lg px-4 py-2.5 text-sm text-white/40 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-none transition-all duration-200"
            >
              Respostas
            </TabsTrigger>
          </TabsList>

          {/* =================== SEQUENCES TAB =================== */}
          <TabsContent value="sequences" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sequences.map((sequence) => (
                <div
                  key={sequence.id}
                  className="relative bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] hover:ring-white/[0.12] transition-all duration-300 group"
                >
                  {/* Card Header */}
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-semibold text-white truncate pr-2">
                        {sequence.nome_sequencia}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Switch
                          checked={sequence.ativo}
                          onCheckedChange={(checked) => toggleSequenceActive(sequence.id, checked)}
                        />
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          sequence.ativo
                            ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
                            : 'bg-white/[0.06] text-white/40 ring-1 ring-white/[0.06]'
                        }`}>
                          {sequence.ativo ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    </div>
                    {sequence.descricao && (
                      <p className="text-sm text-white/40 line-clamp-2">{sequence.descricao}</p>
                    )}
                  </div>

                  {/* Card Stats */}
                  <div className="px-5 pb-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/[0.03] rounded-xl p-3">
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-0.5">Steps</p>
                        <p className="text-lg font-semibold text-white">{sequence.steps.length}</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-xl p-3">
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-0.5">Leads</p>
                        <p className="text-lg font-semibold text-white">{sequence.leads_atingidos}</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-xl p-3">
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-0.5">Resposta</p>
                        <p className="text-lg font-semibold text-cyan-400">{Number(sequence.taxa_resposta || 0).toFixed(1)}%</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-xl p-3">
                        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-0.5">Conversão</p>
                        <p className="text-lg font-semibold text-emerald-400">{Number(sequence.taxa_conversao || 0).toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="border-t border-white/[0.06] px-5 py-3 flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(sequence)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setAssignSequenceId(sequence.id); setAssignModalOpen(true) }}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200"
                      title="Vincular Leads"
                    >
                      <Users className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => duplicateSequence(sequence)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                      title="Duplicar"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteSequence(sequence.id)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {sequences.length === 0 && (
                <div className="col-span-full bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] p-12">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
                      <Zap className="h-8 w-8 text-blue-400" />
                    </div>
                    <p className="text-white/60 text-base mb-1">Nenhuma sequência configurada</p>
                    <p className="text-white/30 text-sm mb-6">Crie sua primeira sequência de follow-up automatizado</p>
                    <Button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-500 text-white border-0"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar primeira sequência
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* =================== ACTIVATE TAB =================== */}
          <TabsContent value="activate" className="space-y-4 mt-6">
            <ActivateFollowupTab sequences={sequences} onActivated={loadData} />
          </TabsContent>

          {/* =================== EXECUTIONS TAB =================== */}
          <TabsContent value="executions" className="space-y-4 mt-6">
            <div className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06]">
              {/* Card Header */}
              <div className="p-6 pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center ring-1 ring-amber-500/20">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Execuções Ativas ({executions.length})</h2>
                    <p className="text-sm text-white/40">Follow-ups que serão executados em breve</p>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Lead</th>
                      <th className="text-left p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Sequência</th>
                      <th className="text-left p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Step Atual</th>
                      <th className="text-left p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Próxima Execução</th>
                      <th className="text-left p-4 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions.map((execution) => (
                      <tr key={execution.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-150">
                        <td className="p-4">
                          <div>
                            <p className="font-medium text-white text-sm">Lead ID: {execution.lead_id}</p>
                            <p className="text-xs text-white/30 mt-0.5">Status: {execution.status}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-white/60">Sequence ID: {execution.sequence_id}</p>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 text-sm font-medium ring-1 ring-blue-500/20">
                            {execution.step_atual + 1}
                          </span>
                        </td>
                        <td className="p-4">
                          {execution.proxima_execucao && (
                            <span className="text-sm text-white/60">
                              {formatNextExecution(execution.proxima_execucao)}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                            {execution.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {executions.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/[0.04] flex items-center justify-center ring-1 ring-white/[0.06]">
                    <Clock className="h-7 w-7 text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm">Nenhuma execução ativa no momento</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* =================== STATS TAB =================== */}
          <TabsContent value="stats" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sequenceStats.map((stats) => (
                <div key={stats.id} className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] hover:ring-white/[0.12] transition-all duration-300">
                  <div className="p-6 pb-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center ring-1 ring-blue-500/20">
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                      </div>
                      <h3 className="text-base font-semibold text-white truncate">{stats.nome_sequencia}</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Leads Ativos</p>
                        <p className="text-2xl font-bold text-emerald-400">{stats.leads_ativos}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Completados</p>
                        <p className="text-2xl font-bold text-blue-400">{stats.leads_completados}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-white/40">Taxa de Resposta</span>
                          <span className="font-medium text-white">{Number(stats.taxa_resposta || 0).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-cyan-400 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, stats.taxa_resposta)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-white/40">Taxa de Conversão</span>
                          <span className="font-medium text-white">{Number(stats.taxa_conversao || 0).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-green-400 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, stats.taxa_conversao)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {sequenceStats.length === 0 && (
                <div className="col-span-full bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] p-12">
                  <div className="text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/[0.04] flex items-center justify-center ring-1 ring-white/[0.06]">
                      <BarChart3 className="h-7 w-7 text-white/20" />
                    </div>
                    <p className="text-white/40 text-sm">Nenhuma estatística disponível ainda</p>
                    <p className="text-white/25 text-xs mt-1">As estatísticas aparecerão quando houver execuções registradas</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* =================== RESPOSTAS TAB =================== */}
          <TabsContent value="respostas" className="space-y-4 mt-6">
            <FollowupResponsesTab organizationId={organizationId || ''} />
          </TabsContent>
        </Tabs>

        {/* =================== CREATE/EDIT MODAL =================== */}
        <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
          if (!open) {
            setIsCreateModalOpen(false)
            setIsEditModalOpen(false)
            resetForm()
            setSelectedSequence(null)
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#141418] border border-white/[0.08] text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">
                {selectedSequence ? 'Editar' : 'Criar'} Sequência de Follow-up
              </DialogTitle>
              <DialogDescription className="text-white/40">
                Configure uma sequência automatizada de contatos para nutrir seus leads
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-2">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-white/60">Nome da Sequência *</Label>
                    <Input
                      value={formData.nome_sequencia}
                      onChange={(e) => setFormData({...formData, nome_sequencia: e.target.value})}
                      placeholder="Ex: Nurturing Leads Frios"
                      className="bg-[#111113] border-white/[0.08] text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="flex items-center space-x-3 pt-6">
                    <Switch
                      checked={formData.ativo}
                      onCheckedChange={(checked) => setFormData({...formData, ativo: checked})}
                    />
                    <Label className="text-sm text-white/60">Sequência ativa</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-white/60">Descrição</Label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    placeholder="Descreva o objetivo desta sequência..."
                    rows={2}
                    className="bg-[#111113] border-white/[0.08] text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-blue-500/20 resize-none"
                  />
                </div>
              </div>

              {/* Schedule Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center ring-1 ring-amber-500/20">
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <h3 className="text-base font-semibold text-white">Configurações de Horário</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-white/60">Horário de Início</Label>
                    <Input
                      type="time"
                      value={formData.horario_envio_inicio}
                      onChange={(e) => setFormData({...formData, horario_envio_inicio: e.target.value})}
                      className="bg-[#111113] border-white/[0.08] text-white focus:border-blue-500/50 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-white/60">Horário de Fim</Label>
                    <Input
                      type="time"
                      value={formData.horario_envio_fim}
                      onChange={(e) => setFormData({...formData, horario_envio_fim: e.target.value})}
                      className="bg-[#111113] border-white/[0.08] text-white focus:border-blue-500/50 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.pausar_fim_semana}
                      onCheckedChange={(checked) => setFormData({...formData, pausar_fim_semana: checked})}
                    />
                    <Label className="text-sm text-white/60">Pausar nos finais de semana</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.pausar_feriados}
                      onCheckedChange={(checked) => setFormData({...formData, pausar_feriados: checked})}
                    />
                    <Label className="text-sm text-white/60">Pausar nos feriados</Label>
                  </div>
                </div>
              </div>

              {/* Templates */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center ring-1 ring-purple-500/20">
                    <Zap className="w-4 h-4 text-purple-400" />
                  </div>
                  <h3 className="text-base font-semibold text-white">Templates Pré-definidos</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => applyTemplate('sequencia_completa')}
                    className="text-left p-3 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06] hover:ring-blue-500/30 hover:bg-blue-500/[0.04] transition-all duration-200"
                  >
                    <div className="font-medium text-sm text-white">Sequência Completa</div>
                    <div className="text-xs text-white/30 mt-0.5">4 steps balanceados</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyDailyTemplate()}
                    className="text-left p-3 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06] hover:ring-cyan-500/30 hover:bg-cyan-500/[0.04] transition-all duration-200"
                  >
                    <div className="font-medium text-sm text-white">Follow-up Diário</div>
                    <div className="text-xs text-white/30 mt-0.5">Contato a cada 1 dia</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => apply3DaysTemplate()}
                    className="text-left p-3 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06] hover:ring-amber-500/30 hover:bg-amber-500/[0.04] transition-all duration-200"
                  >
                    <div className="font-medium text-sm text-white">A cada 3 dias</div>
                    <div className="text-xs text-white/30 mt-0.5">Follow-up espaçado</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyWeeklyTemplate()}
                    className="text-left p-3 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06] hover:ring-emerald-500/30 hover:bg-emerald-500/[0.04] transition-all duration-200"
                  >
                    <div className="font-medium text-sm text-white">Semanal</div>
                    <div className="text-xs text-white/30 mt-0.5">1x por semana</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyUrgencyTemplate()}
                    className="text-left p-3 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06] hover:ring-orange-500/30 hover:bg-orange-500/[0.04] transition-all duration-200"
                  >
                    <div className="font-medium text-sm text-white">Urgência</div>
                    <div className="text-xs text-white/30 mt-0.5">Para leads quentes</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({...formData, steps: []})}
                    className="text-left p-3 bg-white/[0.03] rounded-xl ring-1 ring-red-500/20 hover:ring-red-500/40 hover:bg-red-500/[0.04] transition-all duration-200"
                  >
                    <div className="font-medium text-sm text-red-400">Limpar</div>
                    <div className="text-xs text-white/30 mt-0.5">Remover tudo</div>
                  </button>
                </div>
              </div>

              {/* Steps Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center ring-1 ring-blue-500/20">
                      <Settings className="w-4 h-4 text-blue-400" />
                    </div>
                    <h3 className="text-base font-semibold text-white">Steps da Sequência</h3>
                  </div>
                  <Button
                    type="button"
                    onClick={addStep}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-500 text-white border-0"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Step
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.steps.map((step, index) => (
                    <div key={index} className="bg-[#111113] rounded-xl ring-1 ring-white/[0.06] p-5">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-bold ring-1 ring-blue-500/20">
                              {step.step_numero}
                            </span>
                            <h4 className="font-medium text-white text-sm">Step {step.step_numero}</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-white/60">Tipo de Ação</Label>
                            <Select
                              value={step.tipo_acao}
                              onValueChange={(value: any) => updateStep(index, { tipo_acao: value })}
                            >
                              <SelectTrigger className="bg-[#0A0A0A] border-white/[0.08] text-white focus:border-blue-500/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a1a1e] border-white/[0.08]">
                                <SelectItem value="email" className="text-white hover:bg-white/[0.06]">Email</SelectItem>
                                <SelectItem value="whatsapp" className="text-white hover:bg-white/[0.06]">WhatsApp</SelectItem>
                                <SelectItem value="ligacao" className="text-white hover:bg-white/[0.06]">Ligação</SelectItem>
                                <SelectItem value="tarefa" className="text-white hover:bg-white/[0.06]">Tarefa Manual</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm text-white/60">Intervalo de Tempo</Label>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="Dias"
                                  value={step.delay_days}
                                  onChange={(e) => updateStep(index, { delay_days: parseInt(e.target.value) || 0 })}
                                  className="bg-[#0A0A0A] border-white/[0.08] text-white placeholder:text-white/20 focus:border-blue-500/50"
                                />
                                <span className="text-[10px] text-white/30 mt-0.5 block text-center">dias</span>
                              </div>
                              <div className="flex-1">
                                <Input
                                  type="number"
                                  min="0"
                                  max="23"
                                  placeholder="Horas"
                                  value={step.delay_hours || 0}
                                  onChange={(e) => updateStep(index, { delay_hours: parseInt(e.target.value) || 0 })}
                                  className="bg-[#0A0A0A] border-white/[0.08] text-white placeholder:text-white/20 focus:border-blue-500/50"
                                />
                                <span className="text-[10px] text-white/30 mt-0.5 block text-center">horas</span>
                              </div>
                              <div className="flex-1">
                                <Input
                                  type="number"
                                  min="0"
                                  max="59"
                                  placeholder="Min"
                                  value={step.delay_minutes || 0}
                                  onChange={(e) => updateStep(index, { delay_minutes: parseInt(e.target.value) || 0 })}
                                  className="bg-[#0A0A0A] border-white/[0.08] text-white placeholder:text-white/20 focus:border-blue-500/50"
                                />
                                <span className="text-[10px] text-white/30 mt-0.5 block text-center">minutos</span>
                              </div>
                            </div>

                            {/* Quick presets */}
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {[
                                { label: '30min', d: 0, h: 0, m: 30 },
                                { label: '1h', d: 0, h: 1, m: 0 },
                                { label: '2h', d: 0, h: 2, m: 0 },
                                { label: '1 dia', d: 1, h: 0, m: 0 },
                                { label: '3 dias', d: 3, h: 0, m: 0 },
                                { label: '1 semana', d: 7, h: 0, m: 0 },
                              ].map((preset) => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => updateStep(index, { delay_days: preset.d, delay_hours: preset.h, delay_minutes: preset.m })}
                                  className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.04] text-white/50 ring-1 ring-white/[0.06] hover:bg-white/[0.08] hover:text-white hover:ring-white/[0.12] transition-all duration-200"
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>

                            {/* Timing preview */}
                            {(step.delay_days > 0 || (step.delay_hours || 0) > 0 || (step.delay_minutes || 0) > 0) && (
                              <div className="text-xs text-blue-400 mt-1">
                                Executar em: {step.delay_days > 0 ? `${step.delay_days}d ` : ''}
                                {(step.delay_hours || 0) > 0 ? `${step.delay_hours || 0}h ` : ''}
                                {(step.delay_minutes || 0) > 0 ? `${step.delay_minutes || 0}min` : ''}
                                {step.delay_days === 0 && (step.delay_hours || 0) === 0 && (step.delay_minutes || 0) === 0 ? 'Imediatamente' : ''}
                              </div>
                            )}
                            {step.delay_days === 0 && (step.delay_hours || 0) === 0 && (step.delay_minutes || 0) === 0 && (
                              <div className="text-xs text-blue-400 mt-1">
                                Executar: Imediatamente
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm text-white/60">Título do Step</Label>
                          <Input
                            value={step.titulo}
                            onChange={(e) => updateStep(index, { titulo: e.target.value })}
                            placeholder="Ex: Primeiro contato - Introdução"
                            className="bg-[#0A0A0A] border-white/[0.08] text-white placeholder:text-white/20 focus:border-blue-500/50"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm text-white/60">Conteúdo da Mensagem</Label>
                          <Textarea
                            value={step.conteudo}
                            onChange={(e) => updateStep(index, { conteudo: e.target.value })}
                            placeholder="Use variáveis como {{nome}}, {{empresa}}, {{valor_potencial}}"
                            rows={3}
                            className="bg-[#0A0A0A] border-white/[0.08] text-white placeholder:text-white/20 focus:border-blue-500/50 resize-none"
                          />
                        </div>

                        {/* Media (photo/video/document) */}
                        {step.tipo_acao === 'whatsapp' && (
                          <div className="space-y-1.5">
                            <Label className="text-xs text-white/40">Anexar Mídia (opcional)</Label>
                            {step.media_url ? (
                              <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06]">
                                {step.media_type === 'image' ? (
                                  <img src={step.media_url} alt="" className="w-12 h-12 rounded-lg object-cover ring-1 ring-white/[0.1]" />
                                ) : step.media_type === 'video' ? (
                                  <div className="w-12 h-12 rounded-lg bg-blue-500/15 flex items-center justify-center ring-1 ring-blue-500/20">
                                    <Video className="w-5 h-5 text-blue-400" />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-orange-500/15 flex items-center justify-center ring-1 ring-orange-500/20">
                                    <FileText className="w-5 h-5 text-orange-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-white truncate">{step.media_filename}</p>
                                  <p className="text-[10px] text-white/30">{step.media_type}</p>
                                </div>
                                <button
                                  onClick={() => removeMedia(index)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center gap-2 px-3 py-3 border border-dashed border-white/[0.1] rounded-xl cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/[0.03] transition-all duration-200">
                                <Upload className="w-4 h-4 text-white/30" />
                                <span className="text-xs text-white/30">Foto, vídeo ou documento</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*,video/*,.pdf,.doc,.docx"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) handleMediaUpload(index, e.target.files[0])
                                    e.target.value = ''
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {formData.steps.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-white/[0.08] rounded-xl">
                      <ArrowDown className="h-8 w-8 mx-auto text-white/15 mb-2" />
                      <p className="text-white/40 text-sm">Adicione steps para sua sequência</p>
                      <p className="text-white/25 text-xs mt-1">
                        Cada step será executado automaticamente de acordo com o timing configurado
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/[0.06]">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false)
                  setIsEditModalOpen(false)
                  resetForm()
                  setSelectedSequence(null)
                }}
                className="bg-transparent border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={selectedSequence ? updateSequence : createSequence}
                disabled={!formData.nome_sequencia || formData.steps.length === 0}
                className="bg-blue-600 hover:bg-blue-500 text-white border-0 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {selectedSequence ? 'Atualizar' : 'Criar'} Sequência
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* =================== ASSIGN LEADS MODAL =================== */}
        <Dialog open={assignModalOpen} onOpenChange={(open) => {
          if (!open) {
            setAssignModalOpen(false)
            setAssignSequenceId(null)
            setAssignLeadSearch('')
            setAssignLeadResults([])
          }
        }}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-[#141418] border border-white/[0.08] text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-white">Vincular Lead ao Follow-up</DialogTitle>
              <DialogDescription className="text-white/40">
                Busque e selecione um lead para iniciar a sequência de follow-up
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label className="text-sm text-white/60">Buscar Lead</Label>
                <Input
                  value={assignLeadSearch}
                  onChange={(e) => {
                    setAssignLeadSearch(e.target.value)
                    searchLeadsForAssign(e.target.value)
                  }}
                  placeholder="Nome ou email do lead..."
                  className="bg-[#111113] border-white/[0.08] text-white placeholder:text-white/20 focus:border-blue-500/50"
                />
              </div>

              {assignLeadResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {assignLeadResults.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06] hover:ring-emerald-500/20 hover:bg-emerald-500/[0.03] transition-all duration-200"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{lead.nome_completo || 'Sem nome'}</p>
                        <p className="text-xs text-white/30 truncate">{lead.email}</p>
                        {lead.telefone && (
                          <p className="text-xs text-white/20">{lead.telefone}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAssignLead(lead.id)}
                        disabled={assigningLeadId === lead.id}
                        className="ml-3 bg-emerald-600 hover:bg-emerald-500 text-white border-0 text-xs"
                      >
                        {assigningLeadId === lead.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            Vincular
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {assignLeadSearch.length >= 2 && assignLeadResults.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-white/30 text-sm">Nenhum lead encontrado</p>
                </div>
              )}

              {assignLeadSearch.length < 2 && (
                <div className="text-center py-6">
                  <Users className="h-8 w-8 mx-auto text-white/15 mb-2" />
                  <p className="text-white/30 text-sm">Digite pelo menos 2 caracteres para buscar</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

// =================== ACTIVATE FOLLOWUP TAB COMPONENT ===================
function ActivateFollowupTab({ sequences, onActivated }: {
  sequences: LeadFollowupSequence[]
  onActivated: () => void
}) {
  const [leads, setLeads] = useState<any[]>([])
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [selectedSequence, setSelectedSequence] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadLeads()
  }, [])

  const loadLeads = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome_completo, email, telefone, status, temperatura, origem, created_at')
        .in('status', ['novo', 'contatado', 'interessado', 'nao_respondeu'])
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
      toast.error('Erro ao carregar leads')
    } finally {
      setLoading(false)
    }
  }

  const filteredLeads = leads.filter(lead =>
    lead.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.telefone?.includes(searchTerm)
  )

  const toggleLead = (leadId: string) => {
    const newSelection = new Set(selectedLeads)
    if (newSelection.has(leadId)) {
      newSelection.delete(leadId)
    } else {
      newSelection.add(leadId)
    }
    setSelectedLeads(newSelection)
  }

  const activateFollowup = async () => {
    if (!selectedSequence || selectedLeads.size === 0) {
      toast.error('Selecione uma sequência e pelo menos um lead')
      return
    }

    setLoading(true)
    try {
      const sequence = sequences.find(s => s.id === selectedSequence)
      if (!sequence) throw new Error('Sequência não encontrada')

      const executions = Array.from(selectedLeads).map(leadId => ({
        lead_id: leadId,
        sequence_id: selectedSequence,
        organization_id: sequence.organization_id,
        status: 'active',
        step_atual: 0,
        proxima_execucao: new Date().toISOString(),
        total_touchpoints: 0,
        steps_executados: [],
        respostas_recebidas: []
      }))

      const { error } = await supabase
        .from('lead_followup_executions')
        .insert(executions)

      if (error) throw error

      toast.success(`Follow-up ativado para ${selectedLeads.size} leads!`)
      setSelectedLeads(new Set())
      setSelectedSequence('')
      onActivated()

      // Disparar processamento imediato na API
      try {
        const apiUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'
        fetch(`${apiUrl}/process-followups`, { method: 'POST' }).catch(() => {})
      } catch (_) {}
    } catch (error) {
      console.error('Erro ao ativar follow-up:', error)
      toast.error('Erro ao ativar follow-up')
    } finally {
      setLoading(false)
    }
  }

  const getLeadStatusColor = (status: string) => {
    switch (status) {
      case 'novo': return 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
      case 'contatado': return 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20'
      case 'interessado': return 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/20'
      default: return 'bg-white/[0.06] text-white/40 ring-1 ring-white/[0.06]'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Ativar Follow-up Automático</h2>
          <p className="text-sm text-white/40 mt-1">Selecione leads e aplique uma sequência de follow-up</p>
        </div>
        <Button
          onClick={loadLeads}
          variant="outline"
          disabled={loading}
          className="bg-transparent border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white hover:border-white/[0.12] transition-all duration-200"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Controls Card */}
      <div className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label className="text-sm text-white/60">Sequência de Follow-up</Label>
            <Select value={selectedSequence} onValueChange={setSelectedSequence}>
              <SelectTrigger className="bg-[#111113] border-white/[0.08] text-white focus:border-blue-500/50">
                <SelectValue placeholder="Escolha uma sequência..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1e] border-white/[0.08]">
                {sequences.filter(s => s.ativo).map(sequence => (
                  <SelectItem key={sequence.id} value={sequence.id} className="text-white hover:bg-white/[0.06]">
                    {sequence.nome_sequencia} ({sequence.steps.length} steps)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-white/60">Pesquisar Leads</Label>
            <Input
              placeholder="Nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#111113] border-white/[0.08] text-white placeholder:text-white/20 focus:border-blue-500/50 w-full"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-white/40">
            <span className="text-white font-medium">{selectedLeads.size}</span> de {filteredLeads.length} leads selecionados
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedLeads(new Set(filteredLeads.map(l => l.id)))}
              className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] text-white/50 ring-1 ring-white/[0.06] hover:bg-white/[0.08] hover:text-white hover:ring-white/[0.12] transition-all duration-200"
            >
              Selecionar Todos
            </button>
            <button
              onClick={() => setSelectedLeads(new Set())}
              className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] text-white/50 ring-1 ring-white/[0.06] hover:bg-white/[0.08] hover:text-white hover:ring-white/[0.12] transition-all duration-200"
            >
              Limpar Seleção
            </button>
          </div>
        </div>

        <Button
          onClick={activateFollowup}
          disabled={loading || !selectedSequence || selectedLeads.size === 0}
          className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Play className="h-4 w-4 mr-2" />
          Ativar Follow-up para {selectedLeads.size} leads
        </Button>
      </div>

      {/* Leads List Card */}
      <div className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06]">
        <div className="p-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center ring-1 ring-purple-500/20">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Leads Disponíveis ({filteredLeads.length})</h3>
              <p className="text-xs text-white/30">Clique para selecionar os leads desejados</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-400 mr-3" />
              <span className="text-white/40 text-sm">Carregando leads...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
              {filteredLeads.map(lead => (
                <div
                  key={lead.id}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all duration-200 ring-1 ${
                    selectedLeads.has(lead.id)
                      ? 'ring-blue-500/40 bg-blue-500/[0.08]'
                      : 'ring-white/[0.06] bg-white/[0.02] hover:ring-white/[0.12] hover:bg-white/[0.04]'
                  }`}
                  onClick={() => toggleLead(lead.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{lead.nome_completo}</p>
                      <p className="text-xs text-white/30 truncate mt-0.5">{lead.email}</p>
                      <p className="text-xs text-white/30 truncate">{lead.telefone}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getLeadStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                      <p className="text-[10px] text-white/20 mt-1">{lead.origem}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredLeads.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/[0.04] flex items-center justify-center ring-1 ring-white/[0.06]">
                <Users className="h-7 w-7 text-white/20" />
              </div>
              <p className="text-white/40 text-sm">Nenhum lead encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =================== FOLLOWUP RESPONSES TAB COMPONENT ===================
function FollowupResponsesTab({ organizationId }: { organizationId: string }) {
  const [responseExecutions, setResponseExecutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null)

  useEffect(() => {
    if (organizationId) loadResponses()
  }, [organizationId])

  const loadResponses = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('lead_followup_executions')
        .select(`
          *,
          leads!inner(nome_completo, email, telefone),
          lead_followup_sequences!inner(nome_sequencia, steps)
        `)
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setResponseExecutions(data || [])
    } catch (error) {
      console.error('Erro ao carregar respostas:', error)
      toast.error('Erro ao carregar respostas')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-400 mr-3" />
        <span className="text-white/40 text-sm">Carregando respostas...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center ring-1 ring-purple-500/20">
            <MessageCircle className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Respostas dos Follow-ups</h2>
            <p className="text-sm text-white/40">Veja as respostas recebidas de cada lead por mensagem enviada</p>
          </div>
        </div>
        <Button
          onClick={loadResponses}
          variant="outline"
          size="sm"
          className="bg-transparent border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white hover:border-white/[0.12] transition-all duration-200"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {responseExecutions.length === 0 ? (
        <div className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] p-12">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/[0.04] flex items-center justify-center ring-1 ring-white/[0.06]">
              <MessageCircle className="h-7 w-7 text-white/20" />
            </div>
            <p className="text-white/40 text-sm">Nenhuma execução de follow-up encontrada</p>
            <p className="text-white/25 text-xs mt-1">As respostas aparecerão aqui quando leads responderem aos follow-ups</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {responseExecutions.map((exec) => {
            const lead = exec.leads as any
            const sequence = exec.lead_followup_sequences as any
            const steps = sequence?.steps || []
            const stepsExecutados = exec.steps_executados || []
            const respostas = exec.respostas_recebidas || []
            const isExpanded = expandedExecution === exec.id

            return (
              <div
                key={exec.id}
                className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] overflow-hidden hover:ring-white/[0.12] transition-all duration-300"
              >
                {/* Header */}
                <button
                  onClick={() => setExpandedExecution(isExpanded ? null : exec.id)}
                  className="w-full p-5 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center ring-1 ring-blue-500/20 flex-shrink-0">
                      <Target className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{lead?.nome_completo || 'Lead sem nome'}</p>
                      <p className="text-xs text-white/30 truncate">{sequence?.nome_sequencia || 'Sequência'} • {lead?.telefone}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-white/30">Step {exec.step_atual}/{steps.length}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          exec.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20' :
                          exec.status === 'completed' ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20' :
                          exec.status === 'responded' ? 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/20' :
                          'bg-white/[0.06] text-white/40 ring-1 ring-white/[0.06]'
                        }`}>
                          {exec.status}
                        </span>
                      </div>
                      {respostas.length > 0 && (
                        <div className="w-7 h-7 rounded-full bg-purple-500/15 flex items-center justify-center ring-1 ring-purple-500/20">
                          <span className="text-xs font-bold text-purple-400">{respostas.length}</span>
                        </div>
                      )}
                      <ChevronDown className={`w-4 h-4 text-white/30 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] p-5 space-y-4">
                    {/* Steps Executados */}
                    <div className="space-y-2">
                      <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Mensagens Enviadas</p>
                      {stepsExecutados.length === 0 ? (
                        <p className="text-xs text-white/25 italic">Nenhuma mensagem enviada ainda</p>
                      ) : (
                        <div className="space-y-2">
                          {stepsExecutados.map((stepExec: any, idx: number) => {
                            const stepData = steps[stepExec.step] || {}
                            const stepResposta = respostas.find((r: any) => r.step === stepExec.step || r.step_index === idx)

                            return (
                              <div key={idx} className="bg-[#111113] rounded-xl p-4 ring-1 ring-white/[0.04]">
                                <div className="flex items-start gap-3">
                                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center ring-1 ring-blue-500/20 flex-shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-blue-400">{idx + 1}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm font-medium text-white">{stepExec.titulo || stepData.titulo || `Step ${idx + 1}`}</p>
                                      <span className="text-[10px] text-white/25">{formatDate(stepExec.executed_at || stepExec.executado_em)}</span>
                                    </div>
                                    <p className="text-xs text-white/40 mt-1 line-clamp-2">{stepData.conteudo || ''}</p>
                                    {stepData.media_type && (
                                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-[10px] bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/15">
                                        {stepData.media_type === 'video' ? <Video className="w-3 h-3" /> :
                                         stepData.media_type === 'image' ? <ImageIcon className="w-3 h-3" /> :
                                         <FileText className="w-3 h-3" />}
                                        {stepData.media_type}
                                      </span>
                                    )}

                                    {/* Resposta do lead para este step */}
                                    {stepResposta ? (
                                      <div className="mt-3 p-3 rounded-lg bg-purple-500/[0.06] ring-1 ring-purple-500/15">
                                        <div className="flex items-center gap-2 mb-1">
                                          <MessageCircle className="w-3 h-3 text-purple-400" />
                                          <span className="text-[10px] text-purple-400 font-medium uppercase tracking-wider">Resposta do Lead</span>
                                          <span className="text-[10px] text-white/20 ml-auto">{formatDate(stepResposta.received_at || stepResposta.data)}</span>
                                        </div>
                                        <p className="text-sm text-white/80">{stepResposta.mensagem || stepResposta.content || stepResposta.texto || '-'}</p>
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-white/20 mt-2 italic">Sem resposta</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Respostas Gerais (if any not linked to specific steps) */}
                    {respostas.length > 0 && stepsExecutados.length === 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Todas as Respostas</p>
                        {respostas.map((resp: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-lg bg-purple-500/[0.06] ring-1 ring-purple-500/15">
                            <div className="flex items-center gap-2 mb-1">
                              <MessageCircle className="w-3 h-3 text-purple-400" />
                              <span className="text-[10px] text-purple-400 font-medium">Resposta {idx + 1}</span>
                              <span className="text-[10px] text-white/20 ml-auto">{formatDate(resp.received_at || resp.data)}</span>
                            </div>
                            <p className="text-sm text-white/80">{resp.mensagem || resp.content || resp.texto || '-'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
