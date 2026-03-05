'use client'

import { useState, useEffect, useMemo } from 'react'
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
  // Eventos com ingressos
  valor_ingresso?: number
  is_paid?: boolean
  local_evento?: string
  imagem_capa?: string
  visivel_mentorados?: boolean
  replay_url?: string
  replay_disponivel_ate?: string
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
  call_group: { label: 'Call em Grupo', color: 'bg-blue-500', accent: 'text-blue-400', ring: 'ring-blue-500/20', bgSoft: 'bg-blue-500/10', icon: Phone },
  webinar: { label: 'Webinar', color: 'bg-emerald-500', accent: 'text-emerald-400', ring: 'ring-emerald-500/20', bgSoft: 'bg-emerald-500/10', icon: Video },
  workshop: { label: 'Workshop', color: 'bg-purple-500', accent: 'text-purple-400', ring: 'ring-purple-500/20', bgSoft: 'bg-purple-500/10', icon: Users },
  masterclass: { label: 'Masterclass', color: 'bg-amber-500', accent: 'text-amber-400', ring: 'ring-amber-500/20', bgSoft: 'bg-amber-500/10', icon: Target },
  evento_especial: { label: 'Evento Especial', color: 'bg-rose-500', accent: 'text-rose-400', ring: 'ring-rose-500/20', bgSoft: 'bg-rose-500/10', icon: Calendar }
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

type FilterTab = 'all' | 'call_group' | 'webinar' | 'workshop' | 'masterclass' | 'evento_especial'
type ViewMode = 'list' | 'calendar'

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
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // New event form state
  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    type: 'call_group' as const,
    date_time: '',
    duration_minutes: '60',
    max_participants: '',
    meeting_link: '',
    valor_ingresso: '',
    local_evento: '',
    imagem_capa: '',
    visivel_mentorados: false,
    replay_url: '',
    replay_disponivel_ate: '',
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
      // Load events
      const { data: eventsData, error: eventsError } = await supabase
        .from('group_events')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date_time', { ascending: false })

      if (eventsError) throw eventsError

      if (!eventsData || eventsData.length === 0) {
        setEvents([])
        return
      }

      // Load participant counts per event
      const eventIds = eventsData.map(e => e.id)
      const { data: participantsData } = await supabase
        .from('group_event_participants')
        .select('event_id, attendance_status, conversion_status, conversion_value')
        .in('event_id', eventIds)

      // Aggregate counts per event
      const countsMap: Record<string, { participants: number; attendees: number; conversions: number; conversionValue: number }> = {}
      for (const p of participantsData || []) {
        if (!countsMap[p.event_id]) {
          countsMap[p.event_id] = { participants: 0, attendees: 0, conversions: 0, conversionValue: 0 }
        }
        countsMap[p.event_id].participants++
        if (p.attendance_status === 'attended') countsMap[p.event_id].attendees++
        if (p.conversion_status === 'converted') {
          countsMap[p.event_id].conversions++
          countsMap[p.event_id].conversionValue += Number(p.conversion_value) || 0
        }
      }

      const enrichedEvents = eventsData.map(e => ({
        ...e,
        participant_count: countsMap[e.id]?.participants || 0,
        attendee_count: countsMap[e.id]?.attendees || 0,
        conversion_count: countsMap[e.id]?.conversions || 0,
        conversion_value: countsMap[e.id]?.conversionValue || 0,
      }))

      setEvents(enrichedEvents)
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
          valor_ingresso: newEvent.valor_ingresso ? parseFloat(newEvent.valor_ingresso) : 0,
          is_paid: newEvent.valor_ingresso ? parseFloat(newEvent.valor_ingresso) > 0 : false,
          local_evento: newEvent.local_evento || null,
          imagem_capa: newEvent.imagem_capa || null,
          visivel_mentorados: newEvent.visivel_mentorados,
          replay_url: newEvent.replay_url || null,
          replay_disponivel_ate: newEvent.replay_disponivel_ate || null,
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
        meeting_link: '',
        valor_ingresso: '',
        local_evento: '',
        imagem_capa: '',
        visivel_mentorados: false,
        replay_url: '',
        replay_disponivel_ate: '',
      })
      setShowNewEventModal(false)
    } catch (error) {
      console.error('Error creating event:', error)
      alert(`Erro ao criar evento: ${(error as any)?.message || 'Erro desconhecido'}`)
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

  // Filtered events based on active tab
  const filteredEvents = useMemo(() => {
    if (activeFilter === 'all') return events
    return events.filter(e => e.type === activeFilter)
  }, [events, activeFilter])

  // Calendar data: group events by date
  const calendarData = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfWeek = new Date(year, month, 1).getDay()

    const days: Array<{ date: number; events: GroupEvent[]; isToday: boolean }> = []

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayEvents = filteredEvents.filter(e => {
        const eventDate = new Date(e.date_time)
        return eventDate.toISOString().slice(0, 10) === dateStr
      })
      days.push({
        date: d,
        events: dayEvents,
        isToday: d === now.getDate()
      })
    }

    return { days, firstDayOfWeek, monthName: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }
  }, [filteredEvents])

  // Filter tab counts
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: events.length }
    for (const e of events) {
      counts[e.type] = (counts[e.type] || 0) + 1
    }
    return counts
  }, [events])

  const filterTabs: { key: FilterTab; label: string; icon: React.ElementType }[] = [
    { key: 'all', label: 'Todos', icon: BarChart3 },
    { key: 'call_group', label: 'Calls', icon: Phone },
    { key: 'webinar', label: 'Webinars', icon: Video },
    { key: 'workshop', label: 'Workshops', icon: Users },
    { key: 'masterclass', label: 'Masterclass', icon: Target },
    { key: 'evento_especial', label: 'Especiais', icon: Calendar },
  ]

  // Status rendering
  const getStatusConfig = (status: GroupEvent['status']) => {
    switch (status) {
      case 'live':
        return { label: 'Ao Vivo', dotColor: 'bg-blue-400', textColor: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', animated: true }
      case 'scheduled':
        return { label: 'Agendado', dotColor: 'bg-amber-400', textColor: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', animated: false }
      case 'completed':
        return { label: 'Concluido', dotColor: 'bg-emerald-400', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', animated: false }
      case 'cancelled':
        return { label: 'Cancelado', dotColor: 'bg-red-400', textColor: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', animated: false }
    }
  }

  if (loading) {
    return (
      <PageLayout title="Calls em Grupo e Eventos">
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-white/[0.06] border-t-blue-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Video className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 animate-pulse">Carregando eventos...</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Calls em Grupo e Eventos">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
            Gerencie seus eventos, acompanhe participantes e monitore conversoes em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            className="border-white/[0.06] bg-[#141418] text-gray-400 hover:text-white hover:bg-white/[0.04]"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Atualizar
          </Button>
          <Button
            onClick={() => setShowNewEventModal(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
          >
            <Plus className="h-3.5 w-3.5 mr-2" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
        {/* Total de Eventos */}
        <div className="bg-[#141418] rounded-2xl p-4 ring-1 ring-white/[0.06] hover:ring-white/[0.1] transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">{statistics.total_events}</p>
          <p className="text-xs text-gray-500 mt-1">Total de Eventos</p>
        </div>

        {/* Participantes */}
        <div className="bg-[#141418] rounded-2xl p-4 ring-1 ring-white/[0.06] hover:ring-white/[0.1] transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">{statistics.total_participants}</p>
          <p className="text-xs text-gray-500 mt-1">Participantes</p>
        </div>

        {/* Presentes */}
        <div className="bg-[#141418] rounded-2xl p-4 ring-1 ring-white/[0.06] hover:ring-white/[0.1] transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-cyan-500/10">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">{Number(statistics.attendance_rate || 0).toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">Taxa de Presenca</p>
        </div>

        {/* Conversao */}
        <div className="bg-[#141418] rounded-2xl p-4 ring-1 ring-white/[0.06] hover:ring-white/[0.1] transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <Target className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">{Number(statistics.conversion_rate || 0).toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">Taxa de Conversao</p>
        </div>

        {/* Receita */}
        <div className="bg-[#141418] rounded-2xl p-4 ring-1 ring-white/[0.06] hover:ring-white/[0.1] transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">
            R$ {statistics.total_conversion_value.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-gray-500 mt-1">Receita Total</p>
        </div>

        {/* Ticket Medio */}
        <div className="bg-[#141418] rounded-2xl p-4 ring-1 ring-white/[0.06] hover:ring-white/[0.1] transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <BarChart3 className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">
            R$ {statistics.avg_conversion_value.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-gray-500 mt-1">Ticket Medio</p>
        </div>
      </div>

      {/* ── Filters + View Toggle ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#141418] rounded-xl ring-1 ring-white/[0.06] overflow-x-auto">
          {filterTabs.map((tab) => {
            const TabIcon = tab.icon
            const isActive = activeFilter === tab.key
            const count = filterCounts[tab.key] || 0
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200
                  ${isActive
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                  }
                `}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
                {count > 0 && (
                  <span className={`
                    ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none
                    ${isActive ? 'bg-white/[0.12] text-white' : 'bg-white/[0.04] text-gray-600'}
                  `}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 bg-[#141418] rounded-xl ring-1 ring-white/[0.06] self-start sm:self-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
              ${viewMode === 'list'
                ? 'bg-white/[0.08] text-white'
                : 'text-gray-500 hover:text-gray-300'
              }
            `}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Lista
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
              ${viewMode === 'calendar'
                ? 'bg-white/[0.08] text-white'
                : 'text-gray-500 hover:text-gray-300'
              }
            `}
          >
            <Calendar className="w-3.5 h-3.5" />
            Calendario
          </button>
        </div>
      </div>

      {/* ── Calendar View ── */}
      {viewMode === 'calendar' && (
        <div className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white capitalize">{calendarData.monthName}</h3>
          </div>
          <div className="p-4">
            {/* Week header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(day => (
                <div key={day} className="text-center text-[10px] font-medium text-gray-600 uppercase tracking-wider py-1">
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for offset */}
              {Array.from({ length: calendarData.firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {/* Day cells */}
              {calendarData.days.map(day => (
                <div
                  key={day.date}
                  className={`
                    aspect-square rounded-xl p-1 flex flex-col items-center justify-start relative transition-all duration-200
                    ${day.isToday ? 'ring-1 ring-blue-500/40 bg-blue-500/5' : 'hover:bg-white/[0.02]'}
                    ${day.events.length > 0 ? 'cursor-pointer' : ''}
                  `}
                >
                  <span className={`
                    text-xs font-medium mt-0.5
                    ${day.isToday ? 'text-blue-400' : day.events.length > 0 ? 'text-white' : 'text-gray-600'}
                  `}>
                    {day.date}
                  </span>
                  {day.events.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                      {day.events.slice(0, 3).map((evt, idx) => (
                        <div
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${eventTypes[evt.type].color}`}
                          title={evt.name}
                        />
                      ))}
                      {day.events.length > 3 && (
                        <span className="text-[8px] text-gray-500 leading-none">+{day.events.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Events Table / List View ── */}
      {viewMode === 'list' && (
        <div className="bg-[#141418] rounded-2xl ring-1 ring-white/[0.06] overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-white">Eventos</h3>
              <span className="px-2 py-0.5 rounded-full bg-white/[0.04] text-[10px] font-semibold text-gray-500 tabular-nums">
                {filteredEvents.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-3 px-6 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Evento</th>
                  <th className="text-left py-3 px-6 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="text-left py-3 px-6 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="text-left py-3 px-6 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Participantes</th>
                  <th className="text-left py-3 px-6 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Conversoes</th>
                  <th className="text-left py-3 px-6 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-6 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredEvents.map((event) => {
                  const statusConfig = getStatusConfig(event.status)
                  const TypeIcon = eventTypes[event.type].icon
                  return (
                    <tr
                      key={event.id}
                      className="group hover:bg-white/[0.02] transition-colors duration-150"
                    >
                      {/* Event Name */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${eventTypes[event.type].bgSoft} flex-shrink-0`}>
                            <TypeIcon className={`w-4 h-4 ${eventTypes[event.type].accent}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{event.name}</p>
                            {event.description && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{event.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-4 px-6">
                        <span className={`
                          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium
                          ${eventTypes[event.type].bgSoft} ${eventTypes[event.type].accent}
                        `}>
                          <span className={`w-1.5 h-1.5 rounded-full ${eventTypes[event.type].color}`} />
                          {eventTypes[event.type].label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm text-white">
                            {new Date(event.date_time).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-xs text-gray-500 mt-0.5">
                            {new Date(event.date_time).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            {' '}&middot;{' '}
                            {event.duration_minutes}min
                          </span>
                        </div>
                      </td>

                      {/* Participants */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white tabular-nums">
                              {event.participant_count || 0}
                            </span>
                            <span className="text-xs text-gray-600">inscritos</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500/60 transition-all duration-500"
                                style={{
                                  width: `${event.participant_count ? Math.min(((event.attendee_count || 0) / event.participant_count) * 100, 100) : 0}%`
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-500 tabular-nums">
                              {event.attendee_count || 0} presentes
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Conversions */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-emerald-400 tabular-nums">
                            {event.conversion_count || 0}
                          </span>
                          <span className="text-xs text-gray-500 mt-0.5">
                            R$ {(event.conversion_value || 0).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <span className={`
                          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border
                          ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}
                        `}>
                          <span className="relative flex h-1.5 w-1.5">
                            {statusConfig.animated && (
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusConfig.dotColor} opacity-75`} />
                            )}
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${statusConfig.dotColor}`} />
                          </span>
                          {statusConfig.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openParticipantsModal(event)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"
                          >
                            <Users className="h-3.5 w-3.5" />
                          </Button>
                          {event.meeting_link && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(event.meeting_link, '_blank')}
                              className="h-8 w-8 p-0 text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filteredEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] mb-4">
                  <Video className="h-8 w-8 text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-400">Nenhum evento encontrado</p>
                <p className="text-xs text-gray-600 mt-1 max-w-[240px] text-center">
                  {activeFilter !== 'all'
                    ? 'Tente alterar o filtro ou crie um novo evento'
                    : 'Crie seu primeiro evento para comecar a acompanhar participantes e conversoes'}
                </p>
                <Button
                  onClick={() => setShowNewEventModal(true)}
                  size="sm"
                  className="mt-4 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
                >
                  <Plus className="h-3.5 w-3.5 mr-2" />
                  Criar Evento
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── New Event Modal ── */}
      <Dialog open={showNewEventModal} onOpenChange={setShowNewEventModal}>
        <DialogContent className="sm:max-w-2xl bg-[#141418] border-white/[0.06] backdrop-blur-xl shadow-2xl shadow-black/40">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10">
                <Plus className="w-4 h-4 text-blue-400" />
              </div>
              Criar Novo Evento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs font-medium">Nome do Evento *</Label>
                <Input
                  value={newEvent.name}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Masterclass de Vendas"
                  className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 focus-visible:ring-blue-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs font-medium">Tipo de Evento</Label>
                <Select value={newEvent.type} onValueChange={(value: any) => setNewEvent(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a20] border-white/[0.06]">
                    {Object.entries(eventTypes).map(([key, { label, accent }]) => (
                      <SelectItem key={key} value={key} className="text-white focus:bg-white/[0.06]">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400 text-xs font-medium">Descricao</Label>
              <Textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descricao do evento..."
                className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 resize-none min-h-[80px] focus-visible:ring-blue-500/30"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs font-medium">Data e Hora *</Label>
                <Input
                  type="datetime-local"
                  value={newEvent.date_time}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, date_time: e.target.value }))}
                  className="bg-white/[0.03] border-white/[0.06] text-white focus-visible:ring-blue-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs font-medium">Duracao (min)</Label>
                <Input
                  type="number"
                  value={newEvent.duration_minutes}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, duration_minutes: e.target.value }))}
                  className="bg-white/[0.03] border-white/[0.06] text-white focus-visible:ring-blue-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs font-medium">Max. Participantes</Label>
                <Input
                  type="number"
                  value={newEvent.max_participants}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, max_participants: e.target.value }))}
                  placeholder="Ilimitado"
                  className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 focus-visible:ring-blue-500/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400 text-xs font-medium">Link da Reuniao</Label>
              <Input
                value={newEvent.meeting_link}
                onChange={(e) => setNewEvent(prev => ({ ...prev, meeting_link: e.target.value }))}
                placeholder="https://meet.google.com/..."
                className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 focus-visible:ring-blue-500/30"
              />
            </div>

            {/* Campos para Eventos (nao call_group) */}
            {newEvent.type !== 'call_group' && (
              <div className="space-y-4 p-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
                <p className="text-purple-400 text-xs font-semibold uppercase tracking-wider">Configuracoes do Evento</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs font-medium">Valor do Ingresso (R$)</Label>
                    <Input
                      type="number"
                      value={newEvent.valor_ingresso}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, valor_ingresso: e.target.value }))}
                      placeholder="0,00 = Gratuito"
                      className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 focus-visible:ring-purple-500/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs font-medium">Local do Evento</Label>
                    <Input
                      value={newEvent.local_evento}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, local_evento: e.target.value }))}
                      placeholder="Ex: Hotel XYZ, Sala 5"
                      className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 focus-visible:ring-purple-500/30"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs font-medium">URL da Imagem de Capa</Label>
                  <Input
                    value={newEvent.imagem_capa}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, imagem_capa: e.target.value }))}
                    placeholder="https://..."
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 focus-visible:ring-purple-500/30"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs font-medium">URL do Replay</Label>
                    <Input
                      value={newEvent.replay_url}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, replay_url: e.target.value }))}
                      placeholder="https://..."
                      className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 focus-visible:ring-purple-500/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs font-medium">Replay disponivel ate</Label>
                    <Input
                      type="datetime-local"
                      value={newEvent.replay_disponivel_ate}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, replay_disponivel_ate: e.target.value }))}
                      className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 focus-visible:ring-purple-500/30"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setNewEvent(prev => ({ ...prev, visivel_mentorados: !prev.visivel_mentorados }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      newEvent.visivel_mentorados ? 'bg-purple-500' : 'bg-white/10'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                      newEvent.visivel_mentorados ? 'translate-x-5' : ''
                    }`} />
                  </button>
                  <Label className="text-gray-300 text-sm cursor-pointer" onClick={() => setNewEvent(prev => ({ ...prev, visivel_mentorados: !prev.visivel_mentorados }))}>
                    Visivel para mentorados
                  </Label>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-white/[0.06]">
            <Button
              variant="outline"
              onClick={() => setShowNewEventModal(false)}
              className="flex-1 bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateEvent}
              disabled={!newEvent.name.trim() || !newEvent.date_time}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 disabled:opacity-40 disabled:shadow-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Evento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Participants Modal ── */}
      <Dialog open={showParticipantsModal} onOpenChange={setShowParticipantsModal}>
        <DialogContent className="sm:max-w-4xl bg-[#141418] border-white/[0.06] backdrop-blur-xl shadow-2xl shadow-black/40 max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10">
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <span>Participantes</span>
                {selectedEvent && (
                  <p className="text-xs text-gray-500 font-normal mt-0.5">{selectedEvent.name}</p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 mt-2">
            {/* Summary bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-xs font-medium text-gray-400 tabular-nums">
                  {participants.length} inscritos
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-xs font-medium text-emerald-400 tabular-nums">
                  {participants.filter(p => p.attendance_status === 'attended').length} presentes
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-xs font-medium text-blue-400 tabular-nums">
                  {participants.filter(p => p.conversion_status === 'converted').length} convertidos
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddParticipantModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
              >
                <UserPlus className="h-3.5 w-3.5 mr-2" />
                Adicionar
              </Button>
            </div>

            {/* Participants list */}
            <div className="rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-2.5 px-4 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="text-left py-2.5 px-4 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                    <th className="text-left py-2.5 px-4 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Presenca</th>
                    <th className="text-left py-2.5 px-4 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-right py-2.5 px-4 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {participants.map((participant) => (
                    <tr key={participant.id} className="group hover:bg-white/[0.02] transition-colors duration-150">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 ring-1 ring-white/[0.06] flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-semibold text-white">
                              {participant.participant_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-white">{participant.participant_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          {participant.participant_email && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-gray-600" />
                              {participant.participant_email}
                            </span>
                          )}
                          {participant.participant_phone && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-600" />
                              {participant.participant_phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Select
                          value={participant.attendance_status}
                          onValueChange={(value) => updateAttendanceStatus(participant.id, value)}
                        >
                          <SelectTrigger className="w-32 h-8 bg-white/[0.03] border-white/[0.06] text-white text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a20] border-white/[0.06]">
                            <SelectItem value="registered" className="text-white text-xs focus:bg-white/[0.06]">Inscrito</SelectItem>
                            <SelectItem value="confirmed" className="text-white text-xs focus:bg-white/[0.06]">Confirmado</SelectItem>
                            <SelectItem value="attended" className="text-white text-xs focus:bg-white/[0.06]">Presente</SelectItem>
                            <SelectItem value="no_show" className="text-white text-xs focus:bg-white/[0.06]">Faltou</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          {participant.conversion_status === 'converted' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Convertido
                            </span>
                          ) : participant.conversion_status === 'interested' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Interessado
                            </span>
                          ) : participant.conversion_status === 'qualified' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              Qualificado
                            </span>
                          ) : participant.conversion_status === 'lost' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                              Perdido
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/[0.04] text-gray-500 border border-white/[0.06]">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                              Nao convertido
                            </span>
                          )}
                          {participant.conversion_value && (
                            <p className="text-emerald-400 text-[10px] font-medium mt-1 tabular-nums">
                              R$ {participant.conversion_value.toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {participant.attendance_status === 'attended' &&
                         participant.conversion_status !== 'converted' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedParticipant(participant)
                              setShowConvertModal(true)
                            }}
                            className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg text-xs gap-1.5"
                          >
                            <Target className="h-3 w-3" />
                            Converter
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {participants.length === 0 && (
                <div className="py-12 text-center">
                  <Users className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Nenhum participante registrado</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Participant Modal ── */}
      <Dialog open={showAddParticipantModal} onOpenChange={setShowAddParticipantModal}>
        <DialogContent className="sm:max-w-lg bg-[#141418] border-white/[0.06] backdrop-blur-xl shadow-2xl shadow-black/40">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <UserPlus className="w-4 h-4 text-emerald-400" />
              </div>
              Adicionar Participante
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-gray-400 text-xs font-medium">Nome Completo *</Label>
              <Input
                value={newParticipant.participant_name}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, participant_name: e.target.value }))}
                placeholder="Nome do participante"
                className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 focus-visible:ring-blue-500/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400 text-xs font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                <Input
                  type="email"
                  value={newParticipant.participant_email}
                  onChange={(e) => setNewParticipant(prev => ({ ...prev, participant_email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 pl-9 focus-visible:ring-blue-500/30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400 text-xs font-medium">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                <Input
                  value={newParticipant.participant_phone}
                  onChange={(e) => setNewParticipant(prev => ({ ...prev, participant_phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 pl-9 focus-visible:ring-blue-500/30"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-white/[0.06]">
            <Button
              variant="outline"
              onClick={() => setShowAddParticipantModal(false)}
              className="flex-1 bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddParticipant}
              disabled={!newParticipant.participant_name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 disabled:opacity-40 disabled:shadow-none"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Convert Participant Modal ── */}
      <Dialog open={showConvertModal} onOpenChange={setShowConvertModal}>
        <DialogContent className="sm:max-w-lg bg-[#141418] border-white/[0.06] backdrop-blur-xl shadow-2xl shadow-black/40">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <Target className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span>Converter Participante</span>
                {selectedParticipant && (
                  <p className="text-xs text-gray-500 font-normal mt-0.5">{selectedParticipant.participant_name}</p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-gray-400 text-xs font-medium">Tipo de Conversao</Label>
              <Select value={conversion.conversion_type} onValueChange={(value) => setConversion(prev => ({ ...prev, conversion_type: value }))}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a20] border-white/[0.06]">
                  <SelectItem value="sale" className="text-white focus:bg-white/[0.06]">Venda</SelectItem>
                  <SelectItem value="lead_qualified" className="text-white focus:bg-white/[0.06]">Lead Qualificado</SelectItem>
                  <SelectItem value="follow_up_scheduled" className="text-white focus:bg-white/[0.06]">Follow-up Agendado</SelectItem>
                  <SelectItem value="demo_scheduled" className="text-white focus:bg-white/[0.06]">Demo Agendada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs font-medium">Valor (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                  <Input
                    type="number"
                    value={conversion.conversion_value}
                    onChange={(e) => setConversion(prev => ({ ...prev, conversion_value: e.target.value }))}
                    placeholder="0.00"
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 pl-9 focus-visible:ring-emerald-500/30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs font-medium">Comissao (%)</Label>
                <Input
                  type="number"
                  value={conversion.commission_percentage}
                  onChange={(e) => setConversion(prev => ({ ...prev, commission_percentage: e.target.value }))}
                  className="bg-white/[0.03] border-white/[0.06] text-white focus-visible:ring-emerald-500/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400 text-xs font-medium">Produto/Servico</Label>
              <Input
                value={conversion.product_service}
                onChange={(e) => setConversion(prev => ({ ...prev, product_service: e.target.value }))}
                placeholder="Nome do produto ou servico"
                className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 focus-visible:ring-emerald-500/30"
              />
            </div>

            {/* Conversion preview */}
            {conversion.conversion_value && (
              <div className="p-3 rounded-xl bg-emerald-500/5 ring-1 ring-emerald-500/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Valor da conversao</span>
                  <span className="text-white font-medium tabular-nums">
                    R$ {parseFloat(conversion.conversion_value || '0').toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1.5">
                  <span className="text-gray-400">Comissao ({conversion.commission_percentage}%)</span>
                  <span className="text-emerald-400 font-medium tabular-nums">
                    R$ {(parseFloat(conversion.conversion_value || '0') * parseFloat(conversion.commission_percentage || '0') / 100).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-white/[0.06]">
            <Button
              variant="outline"
              onClick={() => setShowConvertModal(false)}
              className="flex-1 bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConvertParticipant}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Converter
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
