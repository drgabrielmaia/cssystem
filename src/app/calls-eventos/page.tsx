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
  const [selectedParticipant, setSelectedParticipant] = useState<EventParticipant | null>(null)

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
          attendees:group_event_participants!inner(count, attendance_status.eq.attended),
          conversions:group_event_participants!inner(count, conversion_status.eq.converted, conversion_value)
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
          ...newEvent,
          duration_minutes: parseInt(newEvent.duration_minutes),
          max_participants: newEvent.max_participants ? parseInt(newEvent.max_participants) : null,
          created_by_email: user?.email,
          organization_id: organizationId
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
      alert('Erro ao criar evento')
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
        p_participant_phone: newParticipant.participant_phone || null
      })

      if (error) throw error

      if (data && data[0]?.success) {
        await loadEventParticipants(selectedEvent.id)
        setNewParticipant({ participant_name: '', participant_email: '', participant_phone: '' })
        setShowAddParticipantModal(false)
      } else {
        alert(data?.[0]?.message || 'Erro ao adicionar participante')
      }
    } catch (error) {
      console.error('Error adding participant:', error)
      alert('Erro ao adicionar participante')
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
                        onClick={() => openParticipantsModal(event)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      {event.meeting_link && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(event.meeting_link, '_blank')}
                          className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
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
    </PageLayout>
  )
}