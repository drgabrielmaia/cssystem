'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/auth'
import { supabase } from '@/lib/supabase'
import {
  Users, Calendar, Clock, ChevronLeft, Phone, Mail, Star,
  Plus, Trash2, Save, X, Edit, Eye, RefreshCw, Loader2,
  CheckCircle, AlertCircle, ArrowLeft
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

// ─── Types ───────────────────────────────────────────────────
interface Closer {
  id: string
  nome_completo: string
  email: string
  telefone?: string
  tipo_closer: string
  status_contrato: string
  ativo: boolean
  meta_mensal?: number
  total_vendas?: number
  conversao_rate?: number
}

interface CloserEvent {
  id: string
  title: string
  start_datetime: string
  end_datetime?: string
  lead_id?: string
  mentorado_id?: string
  call_status?: string
  leads?: { nome_completo: string } | null
  mentorados?: { nome_completo: string } | null
}

interface Availability {
  id: string
  closer_id: string
  day_of_week?: number
  start_time: string
  end_time: string
  is_available: boolean
  specific_date?: string
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEKDAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

// ─── Component ───────────────────────────────────────────────
export default function SDRClosersPage() {
  const { organizationId } = useAuth()
  const [closers, setClosers] = useState<Closer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCloser, setSelectedCloser] = useState<Closer | null>(null)
  const [closerEvents, setCloserEvents] = useState<CloserEvent[]>([])
  const [closerAvailability, setCloserAvailability] = useState<Availability[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
  const [viewWeek, setViewWeek] = useState(new Date())

  // New availability form
  const [newAvail, setNewAvail] = useState({
    day_of_week: '1',
    start_time: '09:00',
    end_time: '18:00',
  })
  const [savingAvail, setSavingAvail] = useState(false)

  // ─── Load closers ────────────────────────────────────────
  useEffect(() => {
    if (organizationId) loadClosers()
  }, [organizationId])

  const loadClosers = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('closers')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('ativo', true)
        .order('nome_completo')
      setClosers(data || [])
    } catch (err) {
      console.error('Erro ao carregar closers:', err)
    } finally {
      setLoading(false)
    }
  }

  // ─── Load closer events & availability ───────────────────
  const selectCloser = async (closer: Closer) => {
    setSelectedCloser(closer)
    setLoadingEvents(true)
    try {
      // Get this week's Monday
      const now = new Date()
      const monday = new Date(now)
      const dow = monday.getDay()
      monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1))
      monday.setHours(0, 0, 0, 0)
      setViewWeek(monday)

      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)

      const [eventsRes, availRes] = await Promise.all([
        supabase
          .from('calendar_events')
          .select('id, title, start_datetime, end_datetime, lead_id, mentorado_id, call_status, leads(nome_completo), mentorados(nome_completo)')
          .eq('closer_id', closer.id)
          .gte('start_datetime', monday.toISOString())
          .lte('start_datetime', sunday.toISOString())
          .order('start_datetime', { ascending: true }),
        supabase
          .from('closer_availability')
          .select('*')
          .eq('closer_id', closer.id)
      ])

      setCloserEvents(eventsRes.data || [])
      setCloserAvailability(availRes.data || [])
    } catch (err) {
      console.error('Erro ao carregar agenda:', err)
    } finally {
      setLoadingEvents(false)
    }
  }

  // ─── Navigate week ───────────────────────────────────────
  const changeWeek = async (dir: number) => {
    if (!selectedCloser) return
    const newMonday = new Date(viewWeek)
    newMonday.setDate(newMonday.getDate() + dir * 7)
    setViewWeek(newMonday)

    const sunday = new Date(newMonday)
    sunday.setDate(newMonday.getDate() + 6)

    setLoadingEvents(true)
    try {
      const { data } = await supabase
        .from('calendar_events')
        .select('id, title, start_datetime, end_datetime, lead_id, mentorado_id, call_status, leads(nome_completo), mentorados(nome_completo)')
        .eq('closer_id', selectedCloser.id)
        .gte('start_datetime', newMonday.toISOString())
        .lte('start_datetime', sunday.toISOString())
        .order('start_datetime', { ascending: true })
      setCloserEvents(data || [])
    } catch {}
    setLoadingEvents(false)
  }

  // ─── Week days array ─────────────────────────────────────
  const weekDays = useMemo(() => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(viewWeek)
      d.setDate(viewWeek.getDate() + i)
      days.push(d)
    }
    return days
  }, [viewWeek])

  // ─── Save new availability ──────────────────────────────
  const saveAvailability = async () => {
    if (!selectedCloser || !organizationId) return
    setSavingAvail(true)
    try {
      const { error } = await supabase.from('closer_availability').insert({
        closer_id: selectedCloser.id,
        day_of_week: parseInt(newAvail.day_of_week),
        start_time: newAvail.start_time,
        end_time: newAvail.end_time,
        is_available: true,
        organization_id: organizationId
      })
      if (error) throw error
      // Reload availability
      const { data } = await supabase
        .from('closer_availability')
        .select('*')
        .eq('closer_id', selectedCloser.id)
      setCloserAvailability(data || [])
      setShowAvailabilityModal(false)
    } catch (err) {
      alert('Erro ao salvar disponibilidade')
    } finally {
      setSavingAvail(false)
    }
  }

  // ─── Delete availability ─────────────────────────────────
  const deleteAvailability = async (id: string) => {
    try {
      await supabase.from('closer_availability').delete().eq('id', id)
      setCloserAvailability(prev => prev.filter(a => a.id !== id))
    } catch {
      alert('Erro ao remover')
    }
  }

  // ─── Reschedule event ────────────────────────────────────
  const [editingEvent, setEditingEvent] = useState<CloserEvent | null>(null)
  const [newDateTime, setNewDateTime] = useState('')
  const [newTime, setNewTime] = useState('')

  const rescheduleEvent = async () => {
    if (!editingEvent || !newDateTime) return
    try {
      const dt = newTime ? `${newDateTime}T${newTime}:00-03:00` : `${newDateTime}T00:00:00-03:00`
      await supabase
        .from('calendar_events')
        .update({ start_datetime: dt })
        .eq('id', editingEvent.id)

      // Reload events
      if (selectedCloser) selectCloser(selectedCloser)
      setEditingEvent(null)
    } catch {
      alert('Erro ao reagendar')
    }
  }

  // ─── Delete event ────────────────────────────────────────
  const deleteEvent = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return
    try {
      await supabase.from('calendar_events').delete().eq('id', id)
      setCloserEvents(prev => prev.filter(e => e.id !== id))
    } catch {
      alert('Erro ao excluir')
    }
  }

  // ─── Format helpers ──────────────────────────────────────
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#059669]" />
      </div>
    )
  }

  // ─── Closer Detail View ──────────────────────────────────
  if (selectedCloser) {
    return (
      <div className="min-h-screen bg-[#FAFBFC]">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <button onClick={() => setSelectedCloser(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{selectedCloser.nome_completo}</h1>
              <p className="text-sm text-gray-500">{selectedCloser.tipo_closer === 'sdr' ? 'SDR' : 'Closer'} &middot; {selectedCloser.email}</p>
            </div>
            <button
              onClick={() => setShowAvailabilityModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Disponibilidade
            </button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {/* Availability Cards */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Disponibilidade Semanal</h2>
            {closerAvailability.length === 0 ? (
              <p className="text-sm text-gray-400 bg-white rounded-xl p-4 border">Nenhuma disponibilidade configurada.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {closerAvailability.map(a => (
                  <div key={a.id} className={`bg-white rounded-xl border p-3 ${a.is_available ? 'border-green-200' : 'border-red-200 opacity-60'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-600">
                        {a.day_of_week !== undefined ? WEEKDAYS_FULL[a.day_of_week] : a.specific_date}
                      </span>
                      <button onClick={() => deleteAvailability(a.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{a.start_time} - {a.end_time}</p>
                    <span className={`text-[10px] font-medium ${a.is_available ? 'text-green-600' : 'text-red-500'}`}>
                      {a.is_available ? 'Disponivel' : 'Indisponivel'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Agenda da Semana</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => changeWeek(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {fmtDate(weekDays[0])} - {fmtDate(weekDays[6])}
              </span>
              <button onClick={() => changeWeek(1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors rotate-180">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Week Grid */}
          {loadingEvents ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <div className="grid grid-cols-7 gap-3">
              {weekDays.map((day, i) => {
                const isToday = day.toDateString() === new Date().toDateString()
                const dayEvents = closerEvents.filter(e => {
                  const ed = new Date(e.start_datetime)
                  return ed.getFullYear() === day.getFullYear() && ed.getMonth() === day.getMonth() && ed.getDate() === day.getDate()
                })
                return (
                  <div key={i} className={`bg-white rounded-xl border min-h-[200px] ${isToday ? 'border-[#059669] ring-1 ring-[#059669]/20' : 'border-gray-100'}`}>
                    <div className={`px-3 py-2 border-b text-center ${isToday ? 'bg-[#059669]/5' : 'bg-gray-50'}`}>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400">{WEEKDAYS[day.getDay()]}</p>
                      <p className={`text-lg font-bold ${isToday ? 'text-[#059669]' : 'text-gray-700'}`}>{day.getDate()}</p>
                    </div>
                    <div className="p-2 space-y-1.5">
                      {dayEvents.length === 0 && (
                        <p className="text-[10px] text-gray-300 text-center py-4">Livre</p>
                      )}
                      {dayEvents.map(ev => {
                        const isLead = !!ev.lead_id
                        return (
                          <div
                            key={ev.id}
                            className={`rounded-lg px-2 py-1.5 text-[11px] cursor-pointer group ${isLead ? 'bg-emerald-50 border border-emerald-100' : 'bg-purple-50 border border-purple-100'}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-700">{fmtTime(ev.start_datetime)}</span>
                              <div className="hidden group-hover:flex gap-0.5">
                                <button onClick={() => { setEditingEvent(ev); setNewDateTime(ev.start_datetime.split('T')[0]); setNewTime(fmtTime(ev.start_datetime)); }} className="p-0.5 hover:bg-white rounded">
                                  <Edit className="w-2.5 h-2.5 text-gray-400" />
                                </button>
                                <button onClick={() => deleteEvent(ev.id)} className="p-0.5 hover:bg-white rounded">
                                  <Trash2 className="w-2.5 h-2.5 text-red-400" />
                                </button>
                              </div>
                            </div>
                            <p className="text-gray-600 truncate">
                              {isLead ? '💰' : '🎯'} {(ev.leads as any)?.nome_completo || (ev.mentorados as any)?.nome_completo || ev.title}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Add Availability Modal */}
        <Dialog open={showAvailabilityModal} onOpenChange={setShowAvailabilityModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Disponibilidade</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Dia da Semana</Label>
                <Select value={newAvail.day_of_week} onValueChange={v => setNewAvail({ ...newAvail, day_of_week: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS_FULL.map((d, i) => (
                      <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Inicio</Label>
                  <Input type="time" value={newAvail.start_time} onChange={e => setNewAvail({ ...newAvail, start_time: e.target.value })} />
                </div>
                <div>
                  <Label>Fim</Label>
                  <Input type="time" value={newAvail.end_time} onChange={e => setNewAvail({ ...newAvail, end_time: e.target.value })} />
                </div>
              </div>
              <button
                onClick={saveAvailability}
                disabled={savingAvail}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {savingAvail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reschedule Modal */}
        <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Reagendar Evento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600">{editingEvent?.title}</p>
              <div>
                <Label>Nova Data</Label>
                <Input type="date" value={newDateTime} onChange={e => setNewDateTime(e.target.value)} />
              </div>
              <div>
                <Label>Novo Horario</Label>
                <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
              </div>
              <button
                onClick={rescheduleEvent}
                className="w-full px-4 py-2.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-medium transition-colors"
              >
                Reagendar
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ─── Closers Cards View ──────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Closers</h1>
          <p className="text-sm text-gray-500">Gerencie a agenda e disponibilidade dos closers</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {closers.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum closer ativo encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {closers.map(closer => (
              <button
                key={closer.id}
                onClick={() => selectCloser(closer)}
                className="bg-white rounded-2xl border border-gray-100 p-5 text-left hover:shadow-lg hover:border-[#059669]/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#059669] to-[#047857] rounded-xl flex items-center justify-center text-white text-lg font-bold">
                    {closer.nome_completo.charAt(0)}
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    closer.tipo_closer === 'sdr' ? 'bg-blue-50 text-blue-600' :
                    closer.tipo_closer === 'closer_senior' ? 'bg-purple-50 text-purple-600' :
                    'bg-emerald-50 text-emerald-600'
                  }`}>
                    {closer.tipo_closer === 'sdr' ? 'SDR' : closer.tipo_closer === 'closer_senior' ? 'Senior' : 'Closer'}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-[#059669] transition-colors">{closer.nome_completo}</h3>
                <p className="text-xs text-gray-400 mb-3">{closer.email}</p>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {closer.total_vendas !== undefined && closer.total_vendas > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      {closer.total_vendas} vendas
                    </span>
                  )}
                  {closer.telefone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {closer.telefone}
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">Clique para ver agenda</span>
                  <Calendar className="w-4 h-4 text-gray-300 group-hover:text-[#059669] transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
