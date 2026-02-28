'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageLayout } from '@/components/ui/page-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowLeft,
  Users,
  UserPlus,
  Target,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  DollarSign,
  Calendar,
  Clock,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  TrendingUp,
  BarChart3,
  Edit,
  Trash2,
  Brain,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'
import { toast } from 'sonner'

interface GroupEvent {
  id: string
  name: string
  description?: string
  type: 'call_group' | 'webinar' | 'workshop' | 'masterclass' | 'evento_especial'
  date_time: string
  duration_minutes: number
  max_participants?: number
  meeting_link?: string
  recording_link?: string
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  created_by_email?: string
}

interface Lead {
  id: string
  nome_completo: string
  email?: string
  telefone?: string
  status: string
  origem?: string
  created_at: string
}

interface EventParticipant {
  id: string
  event_id: string
  participant_name: string
  participant_email?: string
  participant_phone?: string
  lead_id?: string
  attendance_status: 'registered' | 'confirmed' | 'attended' | 'no_show' | 'cancelled'
  conversion_status: 'not_converted' | 'interested' | 'qualified' | 'converted' | 'lost'
  conversion_value?: number
  notes?: string
  registration_date: string
  conversion_date?: string
  leads?: {
    id: string
    nome_completo: string
    email?: string
    telefone?: string
    status: string
  }
}

interface Lead {
  id: string
  nome_completo: string
  email?: string
  telefone?: string
  status: string
}

const eventTypes = {
  call_group: { label: 'Call em Grupo', color: 'bg-blue-500' },
  webinar: { label: 'Webinar', color: 'bg-green-500' },
  workshop: { label: 'Workshop', color: 'bg-purple-500' },
  masterclass: { label: 'Masterclass', color: 'bg-orange-500' },
  evento_especial: { label: 'Evento Especial', color: 'bg-red-500' }
}

const attendanceStatusColors = {
  registered: 'bg-gray-500',
  confirmed: 'bg-blue-500',
  attended: 'bg-green-500',
  no_show: 'bg-red-500',
  cancelled: 'bg-gray-400'
}

const conversionStatusColors = {
  not_converted: 'bg-gray-500',
  interested: 'bg-yellow-500',
  qualified: 'bg-blue-500',
  converted: 'bg-green-500',
  lost: 'bg-red-500'
}

export default function EventDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { organizationId } = useAuth()
  const eventId = params?.id as string

  const [event, setEvent] = useState<GroupEvent | null>(null)
  const [participants, setParticipants] = useState<EventParticipant[]>([])
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAddLeadModal, setShowAddLeadModal] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showEditParticipantModal, setShowEditParticipantModal] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState<EventParticipant | null>(null)

  // Transcription Analyzer State
  const [transcription, setTranscription] = useState('')
  const [transcriptionAnalysis, setTranscriptionAnalysis] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showTranscriptionSection, setShowTranscriptionSection] = useState(false)

  // Form states
  const [selectedLead, setSelectedLead] = useState('')
  
  const [conversion, setConversion] = useState({
    conversion_type: 'sale',
    conversion_value: '',
    product_service: '',
    commission_percentage: '10'
  })

  useEffect(() => {
    if (eventId && organizationId) {
      loadEventDetails()
    }
  }, [eventId, organizationId])

  const loadEventDetails = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadEvent(),
        loadParticipants(),
        loadAvailableLeads()
      ])
    } catch (error) {
      console.error('Error loading event details:', error)
      toast.error('Erro ao carregar detalhes do evento')
    } finally {
      setLoading(false)
    }
  }

  const loadEvent = async () => {
    const { data, error } = await supabase
      .from('group_events')
      .select('*')
      .eq('id', eventId)
      .eq('organization_id', organizationId)
      .single()

    if (error) throw error
    setEvent(data)
  }

  const loadParticipants = async () => {
    const { data, error } = await supabase
      .from('group_event_participants')
      .select(`
        *,
        leads:lead_id(id, nome_completo, email, telefone, status)
      `)
      .eq('event_id', eventId)
      .order('registration_date', { ascending: false })

    if (error) throw error
    setParticipants(data || [])
  }

  const loadAvailableLeads = async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('id, nome_completo, email, telefone, status')
      .eq('organization_id', organizationId)
      .not('status', 'in', ['fechado_ganho', 'fechado_perdido'])
      .order('nome_completo')

    if (error) throw error
    setAvailableLeads(data || [])
  }

  const handleAddLeadToEvent = async () => {
    if (!selectedLead) {
      toast.error('Selecione um lead')
      return
    }

    try {
      const lead = availableLeads.find(l => l.id === selectedLead)
      if (!lead) return

      const { data, error } = await supabase.rpc('add_event_participant', {
        p_event_id: eventId,
        p_participant_name: lead.nome_completo,
        p_organization_id: organizationId,
        p_participant_email: lead.email || null,
        p_participant_phone: lead.telefone || null,
        p_lead_id: lead.id
      })

      if (error) throw error

      if (data?.[0]?.success) {
        toast.success('Lead adicionado ao evento!')
        setSelectedLead('')
        setShowAddLeadModal(false)
        loadParticipants()
        loadAvailableLeads()
      } else {
        toast.error(data?.[0]?.message || 'Erro ao adicionar lead')
      }
    } catch (error) {
      console.error('Error adding lead to event:', error)
      toast.error('Erro ao adicionar lead ao evento')
    }
  }

  const handleConvertParticipant = async () => {
    if (!selectedParticipant) return

    try {
      const { data, error } = await supabase.rpc('convert_event_participant', {
        p_participant_id: selectedParticipant.id,
        p_conversion_type: conversion.conversion_type,
        p_conversion_value: conversion.conversion_value ? parseFloat(conversion.conversion_value) : null,
        p_product_service: conversion.product_service || null,
        p_attributed_to_email: null,
        p_commission_percentage: parseFloat(conversion.commission_percentage)
      })

      if (error) throw error

      if (data?.[0]?.success) {
        toast.success('Participante convertido com sucesso!')
        setConversion({
          conversion_type: 'sale',
          conversion_value: '',
          product_service: '',
          commission_percentage: '10'
        })
        setShowConvertModal(false)
        setSelectedParticipant(null)
        loadParticipants()
      } else {
        toast.error(data?.[0]?.message || 'Erro ao converter participante')
      }
    } catch (error) {
      console.error('Error converting participant:', error)
      toast.error('Erro ao converter participante')
    }
  }

  const handleDeleteParticipant = async (participantId: string) => {
    if (!confirm('Tem certeza que deseja remover este participante do evento?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('group_event_participants')
        .delete()
        .eq('id', participantId)

      if (error) throw error

      toast.success('Participante removido com sucesso!')
      loadParticipants()
    } catch (error) {
      console.error('Error deleting participant:', error)
      toast.error('Erro ao remover participante')
    }
  }

  const handleUpdateParticipant = async () => {
    if (!selectedParticipant) return

    if (!selectedParticipant.participant_name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    try {
      const { error } = await supabase
        .from('group_event_participants')
        .update({
          participant_name: selectedParticipant.participant_name,
          participant_email: selectedParticipant.participant_email || null,
          participant_phone: selectedParticipant.participant_phone || null,
          attendance_status: selectedParticipant.attendance_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedParticipant.id)

      if (error) throw error

      toast.success('Participante atualizado com sucesso!')
      setShowEditParticipantModal(false)
      loadParticipants()
    } catch (error) {
      console.error('Error updating participant:', error)
      toast.error('Erro ao atualizar participante')
    }
  }

  const updateAttendanceStatus = async (participantId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('group_event_participants')
        .update({ attendance_status: status })
        .eq('id', participantId)

      if (error) throw error

      toast.success('Status de presença atualizado!')
      loadParticipants()
    } catch (error) {
      console.error('Error updating attendance:', error)
      toast.error('Erro ao atualizar presença')
    }
  }

  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = 
      participant.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.participant_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.participant_phone?.includes(searchTerm)
    
    const matchesStatus = statusFilter === 'all' || participant.attendance_status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStats = () => {
    const total = participants.length
    const attended = participants.filter(p => p.attendance_status === 'attended').length
    const converted = participants.filter(p => p.conversion_status === 'converted').length
    const totalRevenue = participants
      .filter(p => p.conversion_status === 'converted')
      .reduce((sum, p) => sum + (p.conversion_value || 0), 0)

    return {
      total,
      attended,
      converted,
      attendanceRate: total > 0 ? (attended / total) * 100 : 0,
      conversionRate: total > 0 ? (converted / total) * 100 : 0,
      totalRevenue
    }
  }

  const stats = getStats()

  // ─── Transcription Analyzer ─────────────────────────────────────────────────

  const analyzeTranscription = async () => {
    if (!transcription.trim() || isAnalyzing) return
    setIsAnalyzing(true)
    setTranscriptionAnalysis('')

    try {
      const participantsList = participants.map(p =>
        `${p.participant_name} (${p.attendance_status === 'attended' ? 'presente' : 'ausente'}, conversão: ${p.conversion_status})`
      ).join(', ')

      const systemPrompt = `Você é um ANALISTA COMERCIAL SÊNIOR especializado em calls de venda em grupo, webinars e eventos de fechamento.

Sua missão é analisar a transcrição desta call/evento e extrair TODAS as informações possíveis.

CONTEXTO DO EVENTO:
- Nome: ${event?.name || 'N/A'}
- Tipo: ${event?.type || 'N/A'}
- Data: ${event?.date_time ? new Date(event.date_time).toLocaleString('pt-BR') : 'N/A'}
- Participantes: ${participantsList || 'Nenhum registrado'}

FORMATO DA SUA ANÁLISE (use markdown):

## 🎯 Resumo Executivo
Breve resumo do que aconteceu na call (2-3 frases)

## 🔍 Análise de Cada Participante
Para CADA pessoa mencionada na transcrição:
- **Nome**: (extrair da transcrição)
- **Nível de Interesse**: 🔥 Alto / 🟡 Médio / ❄️ Baixo
- **Dor Principal**: o que mais incomoda essa pessoa
- **Objeções**: quais objeções levantou
- **O que disse de importante**: frases-chave
- **Próximo Passo Recomendado**: o que fazer com esse lead

## ❌ Erros do Apresentador/Closer
Liste EXATAMENTE onde o apresentador errou:
- Momento/contexto do erro
- O que foi dito
- O que deveria ter sido dito
- Impacto na venda

## ✅ Acertos do Apresentador
O que foi feito bem e deve ser replicado

## 📊 Informações Extraídas dos Leads
Para cada lead mencionado, extraia:
- Faturamento/situação financeira mencionada
- Segmento/nicho
- Experiência com mentorias anteriores
- Urgência de decisão
- Forma de pagamento mencionada

## 💡 Recomendações Estratégicas
- O que fazer no follow-up
- Abordagem personalizada para cada lead
- Objeções a rebater
- Timing ideal para próximo contato

REGRAS:
- Seja EXTREMAMENTE detalhista
- Cite trechos da transcrição quando relevante
- Não invente informações que não estão na transcrição
- Responda SEMPRE em português brasileiro`

      const response = await fetch('/api/chat-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Analise esta transcrição de call/evento:\n\n${transcription}`,
          userEmail: 'admin@system.com',
          context: {
            nome: 'Analista de Calls',
            especialidade: 'Sales Analysis',
            tipoPost: 'chat',
            tomComunicacao: 'profissional analítico',
            persona: systemPrompt,
            publicoAlvo: 'gestores comerciais',
            doresDesejos: [],
            problemasAudiencia: '',
            desejoAudiencia: '',
            transformacao: ''
          }
        })
      })

      const data = await response.json()

      if (data.success && data.message) {
        setTranscriptionAnalysis(data.message)
      } else {
        setTranscriptionAnalysis('Erro ao analisar a transcrição. Tente novamente.')
      }
    } catch (error) {
      console.error('Transcription analysis error:', error)
      setTranscriptionAnalysis('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <PageLayout title="Carregando evento...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </PageLayout>
    )
  }

  if (!event) {
    return (
      <PageLayout title="Evento não encontrado">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white">Evento não encontrado</h3>
          <p className="text-gray-400 mt-2">O evento solicitado não existe ou foi removido.</p>
          <Button 
            onClick={() => router.push('/calls-eventos')} 
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos Eventos
          </Button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title={event.name}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => router.push('/calls-eventos')} 
            variant="outline" 
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`${eventTypes[event.type].color} text-white`}>
                {eventTypes[event.type].label}
              </Badge>
              <Badge 
                variant="outline" 
                className={`
                  ${event.status === 'completed' ? 'text-green-400 border-green-400' : 
                    event.status === 'live' ? 'text-blue-400 border-blue-400' :
                    event.status === 'cancelled' ? 'text-red-400 border-red-400' :
                    'text-yellow-400 border-yellow-400'}
                `}
              >
                {event.status === 'scheduled' ? 'Agendado' :
                 event.status === 'live' ? 'Ao Vivo' :
                 event.status === 'completed' ? 'Concluído' : 'Cancelado'}
              </Badge>
            </div>
            <p className="text-gray-400 text-sm">
              {new Date(event.date_time).toLocaleDateString('pt-BR')} às{' '}
              {new Date(event.date_time).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })} • {event.duration_minutes} min
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {event.meeting_link && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(event.meeting_link, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Link da Reunião
            </Button>
          )}
          <Button onClick={loadEventDetails} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <p className="text-gray-300">{event.description}</p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Participantes</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Presentes</p>
              <p className="text-2xl font-bold text-white">{stats.attended}</p>
              <p className="text-xs text-gray-500">{stats.attendanceRate.toFixed(1)}%</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Conversões</p>
              <p className="text-2xl font-bold text-white">{stats.converted}</p>
              <p className="text-xs text-gray-500">{stats.conversionRate.toFixed(1)}%</p>
            </div>
            <Target className="h-8 w-8 text-purple-400" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Receita</p>
              <p className="text-xl font-bold text-white">
                R$ {stats.totalRevenue.toLocaleString('pt-BR')}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Ticket Médio</p>
              <p className="text-xl font-bold text-white">
                R$ {stats.converted > 0 ? (stats.totalRevenue / stats.converted).toLocaleString('pt-BR') : '0'}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar participantes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64 bg-gray-800 border-gray-700 text-white"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all" className="text-white">Todos os Status</SelectItem>
              <SelectItem value="registered" className="text-white">Registrado</SelectItem>
              <SelectItem value="confirmed" className="text-white">Confirmado</SelectItem>
              <SelectItem value="attended" className="text-white">Presente</SelectItem>
              <SelectItem value="no_show" className="text-white">Faltou</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={showAddLeadModal} onOpenChange={setShowAddLeadModal}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Lead
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-gray-800 rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">
            Participantes ({filteredParticipants.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left py-3 px-6 text-gray-300 text-sm font-medium">Nome</th>
                <th className="text-left py-3 px-6 text-gray-300 text-sm font-medium">Contato</th>
                <th className="text-left py-3 px-6 text-gray-300 text-sm font-medium">Lead Vinculado</th>
                <th className="text-left py-3 px-6 text-gray-300 text-sm font-medium">Presença</th>
                <th className="text-left py-3 px-6 text-gray-300 text-sm font-medium">Status Conversão</th>
                <th className="text-left py-3 px-6 text-gray-300 text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.map((participant) => (
                <tr key={participant.id} className="hover:bg-gray-700 transition-colors border-b border-gray-700">
                  <td className="py-4 px-6">
                    <p className="font-medium text-white">{participant.participant_name}</p>
                    <p className="text-xs text-gray-400">
                      Reg: {new Date(participant.registration_date).toLocaleDateString('pt-BR')}
                    </p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm space-y-1">
                      {participant.participant_email && (
                        <div className="flex items-center text-gray-300">
                          <Mail className="h-3 w-3 mr-2" />
                          {participant.participant_email}
                        </div>
                      )}
                      {participant.participant_phone && (
                        <div className="flex items-center text-gray-300">
                          <Phone className="h-3 w-3 mr-2" />
                          {participant.participant_phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {participant.leads ? (
                      <div>
                        <p className="text-white font-medium">{participant.leads.nome_completo}</p>
                        <Badge className="text-xs mt-1 bg-blue-600">
                          Status: {participant.leads.status}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-gray-500">Nenhum lead vinculado</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <Select
                      value={participant.attendance_status}
                      onValueChange={(value) => updateAttendanceStatus(participant.id, value)}
                    >
                      <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="registered" className="text-white">Registrado</SelectItem>
                        <SelectItem value="confirmed" className="text-white">Confirmado</SelectItem>
                        <SelectItem value="attended" className="text-white">Presente</SelectItem>
                        <SelectItem value="no_show" className="text-white">Faltou</SelectItem>
                        <SelectItem value="cancelled" className="text-white">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-4 px-6">
                    <Badge className={`${conversionStatusColors[participant.conversion_status]} text-white text-xs`}>
                      {participant.conversion_status === 'not_converted' ? 'Não convertido' :
                       participant.conversion_status === 'interested' ? 'Interessado' :
                       participant.conversion_status === 'qualified' ? 'Qualificado' :
                       participant.conversion_status === 'converted' ? 'Convertido' : 'Perdido'}
                    </Badge>
                    {participant.conversion_value && (
                      <p className="text-green-400 text-xs mt-1">
                        R$ {participant.conversion_value.toLocaleString('pt-BR')}
                      </p>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {participant.attendance_status === 'attended' && 
                       participant.conversion_status !== 'converted' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedParticipant(participant)
                            setShowConvertModal(true)
                          }}
                          className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                          title="Converter participante"
                        >
                          <Target className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedParticipant(participant)
                          setShowEditParticipantModal(true)
                        }}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                        title="Editar participante"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteParticipant(participant.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        title="Remover participante"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredParticipants.length === 0 && (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Nenhum participante encontrado</p>
              <p className="text-gray-500 text-sm">Adicione participantes para começar</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Transcription Analyzer Section ───────────────────────────────── */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowTranscriptionSection(!showTranscriptionSection)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Analisador de Transcrição IA
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              </h3>
              <p className="text-xs text-gray-400">Cole a transcrição da call para análise completa</p>
            </div>
          </div>
          {showTranscriptionSection ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {showTranscriptionSection && (
          <div className="border-t border-gray-700 p-4 space-y-4">
            {/* Textarea for transcription */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                <FileText className="h-3.5 w-3.5 inline mr-1" />
                Transcrição da Call
              </label>
              <textarea
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                placeholder="Cole aqui a transcrição completa da call em grupo, webinar ou evento..."
                rows={10}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/30 resize-y"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {transcription.length > 0 ? `${transcription.length.toLocaleString()} caracteres` : 'Nenhum texto colado'}
                </span>
                <Button
                  onClick={analyzeTranscription}
                  disabled={!transcription.trim() || isAnalyzing}
                  className="bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white shadow-lg shadow-violet-500/20"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Analisar Transcrição
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Analysis Result */}
            {transcriptionAnalysis && (
              <div className="bg-gray-900 border border-violet-500/20 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-800">
                  <Brain className="h-5 w-5 text-violet-400" />
                  <h4 className="text-sm font-bold text-white">Análise da Transcrição</h4>
                  <span className="text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full ml-auto">
                    IA Sênior
                  </span>
                </div>
                <div className="prose prose-invert prose-sm max-w-none text-gray-300 [&_h2]:text-white [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-white [&_h3]:text-sm [&_strong]:text-violet-300 [&_ul]:space-y-1 [&_li]:text-gray-300 [&_code]:text-emerald-400 [&_code]:bg-gray-800 [&_code]:px-1 [&_code]:rounded">
                  <ReactMarkdown>{transcriptionAnalysis}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      <Dialog open={showAddLeadModal} onOpenChange={setShowAddLeadModal}>
        <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Adicionar Lead ao Evento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-white">Selecionar Lead *</Label>
              <Select value={selectedLead} onValueChange={setSelectedLead}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Escolha um lead..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                  {availableLeads.map(lead => (
                    <SelectItem key={lead.id} value={lead.id} className="text-white">
                      <div>
                        <p className="font-medium">{lead.nome_completo}</p>
                        <p className="text-xs text-gray-400">
                          {lead.email} • Status: {lead.status}
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-2">
                Apenas leads ativos são listados ({availableLeads.length} disponíveis)
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowAddLeadModal(false)}
              className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAddLeadToEvent}
              disabled={!selectedLead}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Adicionar Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Convert Participant Modal */}
      <Dialog open={showConvertModal} onOpenChange={setShowConvertModal}>
        <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Converter Participante: {selectedParticipant?.participant_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-white">Tipo de Conversão</Label>
              <Select value={conversion.conversion_type} onValueChange={(value) => setConversion(prev => ({ ...prev, conversion_type: value }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="sale" className="text-white">Venda</SelectItem>
                  <SelectItem value="lead_qualified" className="text-white">Lead Qualificado</SelectItem>
                  <SelectItem value="follow_up_scheduled" className="text-white">Follow-up Agendado</SelectItem>
                  <SelectItem value="demo_scheduled" className="text-white">Demo Agendada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Valor da Conversão</Label>
                <Input
                  type="number"
                  value={conversion.conversion_value}
                  onChange={(e) => setConversion(prev => ({ ...prev, conversion_value: e.target.value }))}
                  placeholder="0.00"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Comissão (%)</Label>
                <Input
                  type="number"
                  value={conversion.commission_percentage}
                  onChange={(e) => setConversion(prev => ({ ...prev, commission_percentage: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-white">Produto/Serviço</Label>
              <Input
                value={conversion.product_service}
                onChange={(e) => setConversion(prev => ({ ...prev, product_service: e.target.value }))}
                placeholder="Nome do produto ou serviço"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowConvertModal(false)}
              className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConvertParticipant}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Converter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Participant Modal */}
      <Dialog open={showEditParticipantModal} onOpenChange={setShowEditParticipantModal}>
        <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Participante</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-white">Nome *</Label>
              <Input
                type="text"
                value={selectedParticipant?.participant_name || ''}
                onChange={(e) => setSelectedParticipant(prev => 
                  prev ? { ...prev, participant_name: e.target.value } : null
                )}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Nome do participante"
              />
            </div>

            <div>
              <Label className="text-white">Email</Label>
              <Input
                type="email"
                value={selectedParticipant?.participant_email || ''}
                onChange={(e) => setSelectedParticipant(prev => 
                  prev ? { ...prev, participant_email: e.target.value } : null
                )}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <Label className="text-white">Telefone</Label>
              <Input
                type="tel"
                value={selectedParticipant?.participant_phone || ''}
                onChange={(e) => setSelectedParticipant(prev => 
                  prev ? { ...prev, participant_phone: e.target.value } : null
                )}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <Label className="text-white">Status de Presença</Label>
              <Select
                value={selectedParticipant?.attendance_status || 'registered'}
                onValueChange={(value) => setSelectedParticipant(prev => 
                  prev ? { ...prev, attendance_status: value as any } : null
                )}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="registered" className="text-white">Registrado</SelectItem>
                  <SelectItem value="confirmed" className="text-white">Confirmado</SelectItem>
                  <SelectItem value="attended" className="text-white">Presente</SelectItem>
                  <SelectItem value="no_show" className="text-white">Faltou</SelectItem>
                  <SelectItem value="cancelled" className="text-white">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowEditParticipantModal(false)}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateParticipant}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}