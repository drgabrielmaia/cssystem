'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/ui/page-layout'
import { MetricCard } from '@/components/ui/metric-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus,
  Video,
  Users,
  Calendar,
  TrendingUp,
  DollarSign,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  ExternalLink,
  BarChart3,
  PieChart,
  FileText,
  Phone,
  Mail,
  RefreshCw
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'
import { useRouter } from 'next/navigation'

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
  tags?: string[]
  participant_count?: number
  attendee_count?: number
  conversion_count?: number
  conversion_value?: number
}

interface EventParticipant {
  id: string
  event_id: string
  participant_name: string
  participant_email?: string
  participant_phone?: string
  attendance_status: 'registered' | 'confirmed' | 'attended' | 'no_show' | 'cancelled'
  conversion_status: 'not_converted' | 'interested' | 'qualified' | 'converted' | 'lost'
  conversion_value?: number
  notes?: string
}

interface EventStatistics {
  total_events: number
  total_participants: number
  total_attendees: number
  attendance_rate: number
  total_conversions: number
  conversion_rate: number
  total_conversion_value: number
  avg_conversion_value: number
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

export default function CallsEventosPage() {
  const { user, organizationId } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<GroupEvent[]>([])
  const [statistics, setStatistics] = useState<EventStatistics>({
    total_events: 0,
    total_participants: 0,
    total_attendees: 0,
    attendance_rate: 0,
    total_conversions: 0,
    conversion_rate: 0,
    total_conversion_value: 0,
    avg_conversion_value: 0
  })
  const [selectedEvent, setSelectedEvent] = useState<GroupEvent | null>(null)
  const [participants, setParticipants] = useState<EventParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewEventModal, setShowNewEventModal] = useState(false)
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [showEditEventModal, setShowEditEventModal] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState<EventParticipant | null>(null)
  const [analysisData, setAnalysisData] = useState<any>(null)

  // New event form state
  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    type: 'call_group' as const,
    date_time: '',
    duration_minutes: '60',
    max_participants: '',
    meeting_link: ''
  })

  // Edit event form state
  const [editEvent, setEditEvent] = useState({
    name: '',
    description: '',
    type: 'call_group' as const,
    date_time: '',
    duration_minutes: '60',
    max_participants: '',
    meeting_link: '',
    status: 'scheduled' as const
  })

  // New participant form state
  const [newParticipant, setNewParticipant] = useState({
    participant_name: '',
    participant_email: '',
    participant_phone: ''
  })

  // Conversion form state
  const [conversion, setConversion] = useState({
    conversion_type: 'sale',
    conversion_value: '',
    product_service: '',
    commission_percentage: '10'
  })

  useEffect(() => {
    if (organizationId) {
      loadData()
    }
  }, [organizationId])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadEvents(),
        loadStatistics()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('group_events')
        .select(`
          *,
          participants:group_event_participants(count),
          attendees:group_event_participants!left(count)
        `)
        .eq('organization_id', organizationId)
        .order('date_time', { ascending: false })

      if (error) throw error

      setEvents((data as any) || [])
    } catch (error) {
      console.error('Error loading events:', error)
    }
  }

  const loadStatistics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_event_statistics', {
        p_organization_id: organizationId
      })

      if (error) throw error

      if (data && data[0]) {
        setStatistics(data[0])
      }
    } catch (error) {
      console.error('Error loading statistics:', error)
    }
  }

  const loadEventParticipants = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_event_participants')
        .select('*')
        .eq('event_id', eventId)
        .order('registration_date', { ascending: false })

      if (error) throw error

      setParticipants(data || [])
    } catch (error) {
      console.error('Error loading participants:', error)
    }
  }

  const handleCreateEvent = async () => {
    if (!newEvent.name.trim() || !newEvent.date_time) return

    try {
      const { error } = await supabase
        .from('group_events')
        .insert({
          name: newEvent.name,
          description: newEvent.description || null,
          type: newEvent.type,
          date_time: newEvent.date_time,
          duration_minutes: parseInt(newEvent.duration_minutes) || 60,
          max_participants: newEvent.max_participants ? parseInt(newEvent.max_participants) : null,
          meeting_link: newEvent.meeting_link || null,
          status: 'scheduled',
          created_by_email: user?.email,
          organization_id: organizationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      await loadData()
      setNewEvent({
        name: '',
        description: '',
        type: 'call_group',
        date_time: '',
        duration_minutes: '60',
        max_participants: '',
        meeting_link: ''
      })
      setShowNewEventModal(false)
    } catch (error) {
      console.error('Error creating event:', error)
      alert(`Erro ao criar evento: ${(error as any)?.message || 'Erro desconhecido'}`)
    }
  }

  const handleEditEvent = async () => {
    if (!selectedEvent || !editEvent.name.trim() || !editEvent.date_time) return

    try {
      const { error } = await supabase
        .from('group_events')
        .update({
          name: editEvent.name,
          description: editEvent.description || null,
          type: editEvent.type,
          date_time: editEvent.date_time,
          duration_minutes: parseInt(editEvent.duration_minutes) || 60,
          max_participants: editEvent.max_participants ? parseInt(editEvent.max_participants) : null,
          meeting_link: editEvent.meeting_link || null,
          status: editEvent.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedEvent.id)

      if (error) throw error

      await loadData()
      setShowEditEventModal(false)
      setSelectedEvent(null)
      alert('Evento atualizado com sucesso!')
    } catch (error) {
      console.error('Error updating event:', error)
      alert(`Erro ao atualizar evento: ${(error as any)?.message || 'Erro desconhecido'}`)
    }
  }

  const handleAddParticipant = async () => {
    if (!selectedEvent || !newParticipant.participant_name.trim()) return

    try {
      const { data, error } = await supabase.rpc('add_event_participant', {
        p_event_id: selectedEvent.id,
        p_participant_name: newParticipant.participant_name,
        p_organization_id: organizationId,
        p_participant_email: newParticipant.participant_email || null,
        p_participant_phone: newParticipant.participant_phone || null,
        p_lead_id: null // Para participantes manuais, não temos lead_id
      })

      if (error) throw error

      if (data && data[0]?.success) {
        await loadEventParticipants(selectedEvent.id)
        setNewParticipant({ participant_name: '', participant_email: '', participant_phone: '' })
        setShowAddParticipantModal(false)
        alert('Participante adicionado com sucesso!')
      } else {
        alert(data?.[0]?.message || 'Erro ao adicionar participante')
      }
    } catch (error) {
      console.error('Error adding participant:', error)
      alert(`Erro ao adicionar participante: ${(error as any)?.message || 'Erro desconhecido'}`)
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
        p_attributed_to_email: user?.email,
        p_commission_percentage: parseFloat(conversion.commission_percentage)
      })

      if (error) throw error

      if (data && data[0]?.success) {
        await loadEventParticipants(selectedEvent!.id)
        await loadStatistics()
        setConversion({
          conversion_type: 'sale',
          conversion_value: '',
          product_service: '',
          commission_percentage: '10'
        })
        setShowConvertModal(false)
        setSelectedParticipant(null)
      } else {
        alert(data?.[0]?.message || 'Erro ao converter participante')
      }
    } catch (error) {
      console.error('Error converting participant:', error)
      alert('Erro ao converter participante')
    }
  }

  const updateAttendanceStatus = async (participantId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('group_event_participants')
        .update({ attendance_status: status })
        .eq('id', participantId)

      if (error) throw error

      await loadEventParticipants(selectedEvent!.id)
    } catch (error) {
      console.error('Error updating attendance:', error)
    }
  }

  const openParticipantsModal = (event: GroupEvent) => {
    setSelectedEvent(event)
    loadEventParticipants(event.id)
    setShowParticipantsModal(true)
  }

  const loadEventAnalysis = async () => {
    try {
      const { data, error } = await supabase.rpc('get_detailed_event_analysis', {
        p_organization_id: organizationId
      })

      if (error) throw error

      setAnalysisData(data)
    } catch (error) {
      console.error('Error loading analysis:', error)
    }
  }

  const openAnalysisModal = () => {
    loadEventAnalysis()
    setShowAnalysisModal(true)
  }

  const openEventDetailsModal = (event: GroupEvent) => {
    // Redirecionar para página de administração do evento
    router.push(`/calls-eventos/${event.id}`)
  }

  const openEditEventModal = (event: GroupEvent) => {
    setSelectedEvent(event)
    setEditEvent({
      name: event.name,
      description: event.description || '',
      type: event.type,
      date_time: event.date_time.slice(0, 16), // Format for datetime-local input
      duration_minutes: event.duration_minutes.toString(),
      max_participants: event.max_participants?.toString() || '',
      meeting_link: event.meeting_link || '',
      status: event.status
    })
    setShowEditEventModal(true)
  }

  const handleDeleteEvent = async (event: GroupEvent) => {
    if (!confirm(`Tem certeza que deseja excluir o evento "${event.name}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('group_events')
        .delete()
        .eq('id', event.id)

      if (error) throw error

      // Recarregar eventos
      loadEvents()
      alert('Evento excluído com sucesso!')
    } catch (error) {
      console.error('Erro ao excluir evento:', error)
      alert('Erro ao excluir evento. Tente novamente.')
    }
  }

  if (loading) {
    return (
      <PageLayout title="Calls em Grupo e Eventos">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Calls em Grupo e Eventos">
      {/* Header with Actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-400">
            Gerencie seus eventos, acompanhe participantes e monitore conversões
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={openAnalysisModal} variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Análise Detalhada
          </Button>
          <Button onClick={() => setShowNewEventModal(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total de Eventos"
          value={statistics.total_events.toString()}
          icon={Calendar}
          iconColor="blue"
        />
        <MetricCard
          title="Participantes"
          value={statistics.total_participants.toString()}
          icon={Users}
          iconColor="green"
        />
        <MetricCard
          title="Taxa de Presença"
          value={`${statistics.attendance_rate.toFixed(1)}%`}
          icon={CheckCircle2}
          iconColor="orange"
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${statistics.conversion_rate.toFixed(1)}%`}
          icon={Target}
          iconColor="purple"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <MetricCard
          title="Receita Total"
          value={`R$ ${statistics.total_conversion_value.toLocaleString('pt-BR')}`}
          icon={DollarSign}
          iconColor="green"
        />
        <MetricCard
          title="Ticket Médio"
          value={`R$ ${statistics.avg_conversion_value.toLocaleString('pt-BR')}`}
          icon={BarChart3}
          iconColor="blue"
        />
      </div>

      {/* Events List */}
      <div className="bg-gray-800 rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Eventos Recentes</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left py-3 px-6 text-gray-300 text-sm font-medium">Evento</th>
                <th className="text-left py-3 px-6 text-gray-300 text-sm font-medium">Tipo</th>
                <th className="text-left py-3 px-6 text-gray-300 text-sm font-medium">Data</th>
                <th className="text-left py-3 px-6 text-gray-300 text-sm font-medium">Participantes</th>
                <th className="text-left py-3 px-6 text-gray-300 text-sm font-medium">Conversões</th>
                <th className="text-left py-3 px-6 text-gray-300 text-sm font-medium">Status</th>
                <th className="text-left py-3 px-6 text-gray-300 text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-700 transition-colors border-b border-gray-700">
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-white">{event.name}</p>
                      {event.description && (
                        <p className="text-sm text-gray-400 mt-1">{event.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <Badge className={`${eventTypes[event.type].color} text-white`}>
                      {eventTypes[event.type].label}
                    </Badge>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm">
                      <p className="text-white">
                        {new Date(event.date_time).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-gray-400">
                        {new Date(event.date_time).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm">
                      <p className="text-white">{event.participant_count || 0} inscritos</p>
                      <p className="text-gray-400">{event.attendee_count || 0} presentes</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm">
                      <p className="text-green-400">{event.conversion_count || 0} conversões</p>
                      <p className="text-gray-400">
                        R$ {(event.conversion_value || 0).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
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
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEventDetailsModal(event)}
                        className="text-gray-400 hover:text-gray-300 hover:bg-gray-700/50"
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditEventModal(event)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                        title="Editar evento"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openParticipantsModal(event)}
                        className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                        title="Ver participantes"
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      {event.meeting_link && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(event.meeting_link, '_blank')}
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                          title="Acessar reunião"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteEvent(event)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        title="Excluir evento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {events.length === 0 && (
            <div className="p-8 text-center">
              <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Nenhum evento encontrado</p>
              <p className="text-gray-500 text-sm">Crie seu primeiro evento para começar</p>
            </div>
          )}
        </div>
      </div>

      {/* New Event Modal */}
      <Dialog open={showNewEventModal} onOpenChange={setShowNewEventModal}>
        <DialogContent className="sm:max-w-2xl bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Criar Novo Evento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Nome do Evento *</Label>
                <Input
                  value={newEvent.name}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Masterclass de Vendas"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Tipo de Evento</Label>
                <Select value={newEvent.type} onValueChange={(value: any) => setNewEvent(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {Object.entries(eventTypes).map(([key, { label }]) => (
                      <SelectItem key={key} value={key} className="text-white">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-white">Descrição</Label>
              <Textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do evento..."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-white">Data e Hora *</Label>
                <Input
                  type="datetime-local"
                  value={newEvent.date_time}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, date_time: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Duração (minutos)</Label>
                <Input
                  type="number"
                  value={newEvent.duration_minutes}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, duration_minutes: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Máx. Participantes</Label>
                <Input
                  type="number"
                  value={newEvent.max_participants}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, max_participants: e.target.value }))}
                  placeholder="Ilimitado"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-white">Link da Reunião</Label>
              <Input
                value={newEvent.meeting_link}
                onChange={(e) => setNewEvent(prev => ({ ...prev, meeting_link: e.target.value }))}
                placeholder="https://meet.google.com/..."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowNewEventModal(false)}
              className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateEvent}
              disabled={!newEvent.name.trim() || !newEvent.date_time}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Criar Evento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Participants Modal */}
      <Dialog open={showParticipantsModal} onOpenChange={setShowParticipantsModal}>
        <DialogContent className="sm:max-w-4xl bg-gray-900 border-gray-700 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Participantes - {selectedEvent?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                {participants.length} participantes inscritos
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddParticipantModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Participante
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left py-2 px-4 text-gray-300 text-sm">Nome</th>
                    <th className="text-left py-2 px-4 text-gray-300 text-sm">Contato</th>
                    <th className="text-left py-2 px-4 text-gray-300 text-sm">Presença</th>
                    <th className="text-left py-2 px-4 text-gray-300 text-sm">Status</th>
                    <th className="text-left py-2 px-4 text-gray-300 text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant) => (
                    <tr key={participant.id} className="hover:bg-gray-700 border-b border-gray-700">
                      <td className="py-3 px-4 text-white">{participant.participant_name}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {participant.participant_email && (
                            <p className="text-gray-300">{participant.participant_email}</p>
                          )}
                          {participant.participant_phone && (
                            <p className="text-gray-400">{participant.participant_phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Select
                          value={participant.attendance_status}
                          onValueChange={(value) => updateAttendanceStatus(participant.id, value)}
                        >
                          <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="registered" className="text-white">Inscrito</SelectItem>
                            <SelectItem value="confirmed" className="text-white">Confirmado</SelectItem>
                            <SelectItem value="attended" className="text-white">Presente</SelectItem>
                            <SelectItem value="no_show" className="text-white">Faltou</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4">
                        {participant.attendance_status === 'attended' && 
                         participant.conversion_status !== 'converted' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedParticipant(participant)
                              setShowConvertModal(true)
                            }}
                            className="text-green-400 hover:text-green-300"
                          >
                            <Target className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Participant Modal */}
      <Dialog open={showAddParticipantModal} onOpenChange={setShowAddParticipantModal}>
        <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Adicionar Participante</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-white">Nome Completo *</Label>
              <Input
                value={newParticipant.participant_name}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, participant_name: e.target.value }))}
                placeholder="Nome do participante"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Email</Label>
              <Input
                type="email"
                value={newParticipant.participant_email}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, participant_email: e.target.value }))}
                placeholder="email@exemplo.com"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white">Telefone</Label>
              <Input
                value={newParticipant.participant_phone}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, participant_phone: e.target.value }))}
                placeholder="(11) 99999-9999"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowAddParticipantModal(false)}
              className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAddParticipant}
              disabled={!newParticipant.participant_name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Adicionar
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

      {/* Analysis Modal */}
      <Dialog open={showAnalysisModal} onOpenChange={setShowAnalysisModal}>
        <DialogContent className="sm:max-w-6xl bg-gray-900 border-gray-700 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Análise Detalhada de Eventos</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Performance por Tipo de Evento */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-4">Performance por Tipo de Evento</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(eventTypes).map(([type, { label, color }]) => {
                  const typeEvents = events.filter(e => e.type === type)
                  const totalParticipants = typeEvents.reduce((sum, e) => sum + (e.participant_count || 0), 0)
                  const totalAttendees = typeEvents.reduce((sum, e) => sum + (e.attendee_count || 0), 0)
                  const totalConversions = typeEvents.reduce((sum, e) => sum + (e.conversion_count || 0), 0)
                  const totalRevenue = typeEvents.reduce((sum, e) => sum + (e.conversion_value || 0), 0)
                  const attendanceRate = totalParticipants > 0 ? (totalAttendees / totalParticipants * 100) : 0
                  const conversionRate = totalAttendees > 0 ? (totalConversions / totalAttendees * 100) : 0
                  
                  return (
                    <div key={type} className="bg-gray-700 rounded p-3">
                      <div className={`w-4 h-4 ${color} rounded mb-2`}></div>
                      <h5 className="text-white font-medium text-sm mb-2">{label}</h5>
                      <div className="space-y-1 text-xs">
                        <p className="text-gray-300">{typeEvents.length} eventos</p>
                        <p className="text-gray-300">{totalParticipants} participantes</p>
                        <p className="text-green-400">{attendanceRate.toFixed(1)}% presença</p>
                        <p className="text-blue-400">{conversionRate.toFixed(1)}% conversão</p>
                        <p className="text-yellow-400">R$ {totalRevenue.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Eventos Mais Performáticos */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-4">Top 5 Eventos por Conversão</h4>
              <div className="space-y-3">
                {events
                  .sort((a, b) => (b.conversion_count || 0) - (a.conversion_count || 0))
                  .slice(0, 5)
                  .map((event, index) => {
                    const attendanceRate = event.participant_count > 0 ? ((event.attendee_count || 0) / event.participant_count * 100) : 0
                    const conversionRate = event.attendee_count > 0 ? ((event.conversion_count || 0) / event.attendee_count * 100) : 0
                    
                    return (
                      <div key={event.id} className="flex items-center justify-between bg-gray-700 rounded p-3">
                        <div className="flex items-center space-x-3">
                          <div className="bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-white font-medium">{event.name}</p>
                            <p className="text-gray-400 text-sm">{new Date(event.date_time).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-green-400 font-medium">{event.conversion_count || 0} conversões</p>
                          <p className="text-gray-400 text-sm">{attendanceRate.toFixed(1)}% presença | {conversionRate.toFixed(1)}% conversão</p>
                          <p className="text-yellow-400 text-sm">R$ {(event.conversion_value || 0).toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Timeline de Eventos */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-4">Timeline dos Últimos Eventos</h4>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {events.slice(0, 10).map((event) => (
                  <div key={event.id} className="flex items-start space-x-3">
                    <div className={`w-3 h-3 ${eventTypes[event.type].color} rounded-full mt-1`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-white font-medium">{event.name}</p>
                        <p className="text-gray-400 text-sm">{new Date(event.date_time).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <p className="text-gray-400 text-sm">{eventTypes[event.type].label}</p>
                      <div className="flex items-center space-x-4 mt-1 text-xs">
                        <span className="text-blue-400">{event.participant_count || 0} participantes</span>
                        <span className="text-green-400">{event.attendee_count || 0} presentes</span>
                        <span className="text-yellow-400">{event.conversion_count || 0} conversões</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumo de Performance */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-4">Resumo de Performance</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{statistics.total_events}</p>
                  <p className="text-gray-400 text-sm">Total de Eventos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{statistics.attendance_rate.toFixed(1)}%</p>
                  <p className="text-gray-400 text-sm">Taxa de Presença</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">{statistics.conversion_rate.toFixed(1)}%</p>
                  <p className="text-gray-400 text-sm">Taxa de Conversão</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">R$ {statistics.avg_conversion_value.toLocaleString('pt-BR')}</p>
                  <p className="text-gray-400 text-sm">Ticket Médio</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button 
              onClick={() => setShowAnalysisModal(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Event Modal */}
      <Dialog open={showEditEventModal} onOpenChange={setShowEditEventModal}>
        <DialogContent className="sm:max-w-2xl bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Evento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Nome do Evento *</Label>
                <Input
                  value={editEvent.name}
                  onChange={(e) => setEditEvent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Masterclass de Vendas"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Tipo de Evento</Label>
                <Select value={editEvent.type} onValueChange={(value: any) => setEditEvent(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {Object.entries(eventTypes).map(([key, { label }]) => (
                      <SelectItem key={key} value={key} className="text-white">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-white">Descrição</Label>
              <Textarea
                value={editEvent.description}
                onChange={(e) => setEditEvent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do evento..."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-white">Data e Hora *</Label>
                <Input
                  type="datetime-local"
                  value={editEvent.date_time}
                  onChange={(e) => setEditEvent(prev => ({ ...prev, date_time: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Duração (min)</Label>
                <Input
                  type="number"
                  value={editEvent.duration_minutes}
                  onChange={(e) => setEditEvent(prev => ({ ...prev, duration_minutes: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Máx. Participantes</Label>
                <Input
                  type="number"
                  value={editEvent.max_participants}
                  onChange={(e) => setEditEvent(prev => ({ ...prev, max_participants: e.target.value }))}
                  placeholder="Ilimitado"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Status</Label>
                <Select value={editEvent.status} onValueChange={(value: any) => setEditEvent(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="scheduled" className="text-white">Agendado</SelectItem>
                    <SelectItem value="live" className="text-white">Ao Vivo</SelectItem>
                    <SelectItem value="completed" className="text-white">Concluído</SelectItem>
                    <SelectItem value="cancelled" className="text-white">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-white">Link da Reunião</Label>
              <Input
                value={editEvent.meeting_link}
                onChange={(e) => setEditEvent(prev => ({ ...prev, meeting_link: e.target.value }))}
                placeholder="https://meet.google.com/..."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowEditEventModal(false)}
              className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleEditEvent}
              disabled={!editEvent.name.trim() || !editEvent.date_time}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Atualizar Evento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}