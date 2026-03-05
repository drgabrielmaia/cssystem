'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import {
  Calendar, MapPin, Ticket, Clock, Users, ArrowLeft,
  QrCode, Check, Loader2, Play, UserPlus,
  Search, CalendarDays, Tag,
  Shield, CheckCircle2, Timer, Zap
} from 'lucide-react'
import { useMentoradoAuth } from '@/contexts/mentorado-auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import { isBetaUser } from '@/lib/beta-access'

interface EventoVisivel {
  id: string
  name: string
  description?: string
  type: string
  date_time: string
  duration_minutes: number
  max_participants?: number
  meeting_link?: string
  status: string
  valor_ingresso: number
  is_paid: boolean
  local_evento?: string
  imagem_capa?: string
  visivel_mentorados: boolean
  participant_count?: number
  replay_url?: string
  replay_disponivel_ate?: string
}

interface MeuTicket {
  id: string
  event_id: string
  codigo_ticket: string
  status: string
  valor_pago: number
  created_at: string
  usado_em?: string
  evento_nome?: string
  evento_data?: string
  evento_local?: string
}

const eventTypeConfig: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  webinar: {
    label: 'Webinar',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: '📡',
  },
  workshop: {
    label: 'Workshop',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50 border-violet-200',
    icon: '🛠️',
  },
  masterclass: {
    label: 'Masterclass',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    icon: '🎓',
  },
  evento_especial: {
    label: 'Evento Especial',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50 border-rose-200',
    icon: '✨',
  },
}

const categoryFilters = [
  { key: 'todos', label: 'Todos' },
  { key: 'webinar', label: 'Webinar' },
  { key: 'workshop', label: 'Workshop' },
  { key: 'masterclass', label: 'Masterclass' },
  { key: 'evento_especial', label: 'Evento Especial' },
]

export default function EventosPage() {
  const { mentorado } = useMentoradoAuth()
  const [eventos, setEventos] = useState<EventoVisivel[]>([])
  const [meusTickets, setMeusTickets] = useState<MeuTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'eventos' | 'ingressos'>('eventos')

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('todos')

  // Purchase modal
  const [selectedEvento, setSelectedEvento] = useState<EventoVisivel | null>(null)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [purchasing, setPurchasing] = useState(false)

  // QR modal
  const [selectedTicket, setSelectedTicket] = useState<MeuTicket | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)

  // Countdown
  const [, setTick] = useState(0)

  useEffect(() => {
    if (mentorado) loadData()
  }, [mentorado])

  // Refresh countdown every 60s
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load visible events (not call_group, visivel_mentorados = true)
      const { data: eventosData, error: eventosError } = await supabase
        .from('group_events')
        .select('*')
        .eq('visivel_mentorados', true)
        .order('date_time', { ascending: true })

      if (eventosError) throw eventosError

      // Filter out call_group type
      const filtered = (eventosData || []).filter((e: any) => e.type !== 'call_group')
      setEventos(filtered)

      // Load my tickets
      if (mentorado?.id) {
        const { data: ticketsData } = await supabase
          .from('evento_tickets')
          .select('*')
          .eq('mentorado_id', mentorado.id)
          .order('created_at', { ascending: false })

        // Enrich tickets with event data
        const enriched = await Promise.all((ticketsData || []).map(async (t: any) => {
          const { data: evData } = await supabase
            .from('group_events')
            .select('name, date_time, local_evento')
            .eq('id', t.event_id)
            .single()
          return {
            ...t,
            evento_nome: evData?.name || 'Evento',
            evento_data: evData?.date_time,
            evento_local: evData?.local_evento,
          }
        }))
        setMeusTickets(enriched)
      }
    } catch (err) {
      console.error('Error loading eventos:', err)
      toast.error('Erro ao carregar eventos')
    } finally {
      setLoading(false)
    }
  }

  const generateTicketCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = 'TKT-'
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handlePurchase = async () => {
    if (!selectedEvento || !mentorado) return

    try {
      setPurchasing(true)
      const codigoTicket = generateTicketCode()

      const { error } = await supabase
        .from('evento_tickets')
        .insert({
          event_id: selectedEvento.id,
          mentorado_id: mentorado.id,
          organization_id: '9c8c0033-15ea-4e33-a55f-28d81a19693b',
          codigo_ticket: codigoTicket,
          status: 'ativo',
          valor_pago: selectedEvento.valor_ingresso || 0,
          metodo_pagamento: 'plataforma',
        })

      if (error) throw error

      toast.success('Ingresso adquirido com sucesso!')
      setShowPurchaseModal(false)

      // Auto-show QR
      const newTicket: MeuTicket = {
        id: '',
        event_id: selectedEvento.id,
        codigo_ticket: codigoTicket,
        status: 'ativo',
        valor_pago: selectedEvento.valor_ingresso || 0,
        created_at: new Date().toISOString(),
        evento_nome: selectedEvento.name,
        evento_data: selectedEvento.date_time,
        evento_local: selectedEvento.local_evento,
      }
      setSelectedTicket(newTicket)
      setShowQRModal(true)

      loadData()
    } catch (err) {
      console.error('Error purchasing:', err)
      toast.error('Erro ao adquirir ingresso')
    } finally {
      setPurchasing(false)
    }
  }

  const getQRData = (ticket: MeuTicket) => {
    return JSON.stringify({
      ticket_id: ticket.id,
      codigo: ticket.codigo_ticket,
      evento: ticket.evento_nome,
      mentorado: mentorado?.nome_completo,
      data: ticket.evento_data,
    })
  }

  const hasTicketForEvent = (eventId: string) => {
    return meusTickets.some(t => t.event_id === eventId && t.status === 'ativo')
  }

  const isEventPast = (dateTime: string) => {
    return new Date(dateTime) < new Date()
  }

  const getCountdown = (dateTime: string): { text: string; urgent: boolean } => {
    const diff = new Date(dateTime).getTime() - Date.now()
    if (diff < 0) return { text: '', urgent: false }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (days > 0) return { text: `Faltam ${days}d ${hours}h`, urgent: days <= 2 }
    if (hours > 0) return { text: `Comeca em ${hours}h ${mins}min`, urgent: true }
    return { text: `Comeca em ${mins}min!`, urgent: true }
  }

  const handleWaitlist = async (eventoId: string) => {
    if (!mentorado) return
    try {
      // Get current max position
      const { data: existing } = await supabase
        .from('evento_lista_espera')
        .select('posicao')
        .eq('event_id', eventoId)
        .order('posicao', { ascending: false })
        .limit(1)

      const nextPos = (existing && existing.length > 0 ? existing[0].posicao : 0) + 1

      await supabase.from('evento_lista_espera').insert({
        event_id: eventoId,
        mentorado_id: mentorado.id,
        posicao: nextPos,
      })

      toast.success(`Voce entrou na lista de espera! Posicao: ${nextPos}`)
    } catch (err: any) {
      if (err?.message?.includes('duplicate') || err?.message?.includes('unique')) {
        toast.info('Voce ja esta na lista de espera deste evento')
      } else {
        toast.error('Erro ao entrar na lista de espera')
      }
    }
  }

  const formatEventDate = (dateTime: string) => {
    const d = new Date(dateTime)
    return {
      day: d.getDate(),
      month: d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', ''),
      monthLong: d.toLocaleDateString('pt-BR', { month: 'long' }),
      year: d.getFullYear(),
      weekday: d.toLocaleDateString('pt-BR', { weekday: 'long' }),
      time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      full: d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    }
  }

  // Filtered events
  const filteredEventos = useMemo(() => {
    let result = eventos
    if (selectedCategory !== 'todos') {
      result = result.filter(e => e.type === selectedCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.local_evento && e.local_evento.toLowerCase().includes(q))
      )
    }
    return result
  }, [eventos, selectedCategory, searchQuery])

  const upcomingCount = eventos.filter(e => !isEventPast(e.date_time)).length
  const activeTicketsCount = meusTickets.filter(t => t.status === 'ativo').length

  // Beta access check
  if (mentorado && !isBetaUser(mentorado.email)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 bg-white border-gray-200 max-w-md w-full text-center shadow-lg">
          <Shield className="w-16 h-16 mx-auto mb-4 text-amber-500" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-gray-500 mb-6">Esta funcionalidade esta em fase beta e disponivel apenas para usuarios selecionados.</p>
          <Link href="/mentorado">
            <Button className="bg-violet-600 hover:bg-violet-700 text-white font-semibold">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Portal
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ========== HERO SECTION ========== */}
      <div className="relative overflow-hidden bg-white border-b border-gray-100">
        {/* Background gradient decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-rose-50" />
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-gradient-to-bl from-violet-100/50 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-gradient-to-tr from-rose-100/30 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
          {/* Back link */}
          <Link
            href="/mentorado"
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-700 transition-colors mb-6 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>

          {/* Hero content */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-rose-500 flex items-center justify-center shadow-lg shadow-violet-200">
                  <CalendarDays className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Eventos</h1>
                </div>
              </div>
              <p className="text-gray-500 text-base mt-1 max-w-lg">
                Descubra e participe de eventos exclusivos. Workshops, masterclasses e muito mais.
              </p>

              {/* Stats pills */}
              <div className="flex items-center gap-3 mt-4">
                {upcomingCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold border border-violet-100">
                    <Zap className="w-3.5 h-3.5" />
                    {upcomingCount} {upcomingCount === 1 ? 'evento disponivel' : 'eventos disponiveis'}
                  </span>
                )}
                {activeTicketsCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                    <Ticket className="w-3.5 h-3.5" />
                    {activeTicketsCount} {activeTicketsCount === 1 ? 'ingresso ativo' : 'ingressos ativos'}
                  </span>
                )}
              </div>
            </div>

            {/* Search bar */}
            <div className="w-full md:w-80">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar eventos..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex items-center gap-1 mt-8 border-b border-gray-200 -mb-[1px]">
            <button
              onClick={() => setActiveTab('eventos')}
              className={`relative px-5 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'eventos'
                  ? 'text-violet-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Proximos Eventos
              </span>
              {activeTab === 'eventos' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-violet-600 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('ingressos')}
              className={`relative px-5 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'ingressos'
                  ? 'text-violet-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Meus Ingressos
                {activeTicketsCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] inline-flex items-center justify-center font-bold">
                    {activeTicketsCount}
                  </span>
                )}
              </span>
              {activeTab === 'ingressos' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-violet-600 rounded-t-full" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========== MAIN CONTENT ========== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
              <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
            </div>
            <p className="text-gray-500 text-sm font-medium">Carregando eventos...</p>
          </div>
        ) : activeTab === 'eventos' ? (
          <>
            {/* ========== CATEGORY FILTER PILLS ========== */}
            <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide">
              {categoryFilters.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                    selectedCategory === cat.key
                      ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* ========== EVENTS GRID ========== */}
            {filteredEventos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
                  <Calendar className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-gray-800 font-semibold text-lg mb-2">
                  {searchQuery || selectedCategory !== 'todos' ? 'Nenhum evento encontrado' : 'Nenhum evento disponivel'}
                </h3>
                <p className="text-gray-400 text-sm max-w-sm text-center">
                  {searchQuery || selectedCategory !== 'todos'
                    ? 'Tente ajustar os filtros ou buscar por outro termo.'
                    : 'Novos eventos serao publicados em breve. Fique de olho!'}
                </p>
                {(searchQuery || selectedCategory !== 'todos') && (
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('todos') }}
                    className="mt-4 text-violet-600 text-sm font-medium hover:underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEventos.map(evento => {
                  const dateInfo = formatEventDate(evento.date_time)
                  const past = isEventPast(evento.date_time)
                  const hasTicket = hasTicketForEvent(evento.id)
                  const typeInfo = eventTypeConfig[evento.type] || {
                    label: evento.type,
                    color: 'text-gray-600',
                    bgColor: 'bg-gray-50 border-gray-200',
                    icon: '📌',
                  }
                  const countdown = !past ? getCountdown(evento.date_time) : null
                  const isFull = evento.max_participants
                    ? (evento.participant_count || 0) >= evento.max_participants
                    : false
                  const hasReplay =
                    past &&
                    evento.replay_url &&
                    evento.replay_disponivel_ate &&
                    new Date(evento.replay_disponivel_ate) > new Date()

                  return (
                    <div
                      key={evento.id}
                      className={`group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-violet-200 transition-all duration-300 hover:shadow-xl hover:shadow-violet-100/50 ${
                        past && !hasReplay ? 'opacity-70' : ''
                      }`}
                    >
                      {/* ---- Cover Image ---- */}
                      <div className="relative aspect-[16/9] bg-gradient-to-br from-violet-100 to-rose-50 overflow-hidden">
                        {evento.imagem_capa ? (
                          <img
                            src={evento.imagem_capa}
                            alt={evento.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-100 via-purple-50 to-rose-100">
                            <div className="text-center">
                              <span className="text-4xl">{typeInfo.icon}</span>
                            </div>
                          </div>
                        )}

                        {/* Gradient overlay at bottom for readability */}
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />

                        {/* Date badge - Sympla style stacked */}
                        <div className="absolute top-3 left-3 bg-white rounded-xl shadow-lg p-2 text-center min-w-[52px]">
                          <p className="text-[10px] text-violet-600 font-bold uppercase leading-none">{dateInfo.month}</p>
                          <p className="text-2xl font-extrabold text-gray-900 leading-none mt-0.5">{dateInfo.day}</p>
                        </div>

                        {/* Type badge */}
                        <div className="absolute top-3 right-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${typeInfo.bgColor} ${typeInfo.color} backdrop-blur-sm shadow-sm`}>
                            {typeInfo.label}
                          </span>
                        </div>

                        {/* Enrolled badge */}
                        {hasTicket && (
                          <div className="absolute bottom-3 right-3 bg-emerald-500 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            <span className="text-white text-[11px] font-semibold">Inscrito</span>
                          </div>
                        )}

                        {/* Countdown badge */}
                        {countdown && countdown.text && (
                          <div
                            className={`absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-md ${
                              countdown.urgent
                                ? 'bg-red-500 text-white'
                                : 'bg-white/95 text-violet-700'
                            }`}
                          >
                            <Timer className="w-3 h-3" />
                            {countdown.text}
                          </div>
                        )}
                      </div>

                      {/* ---- Card Content ---- */}
                      <div className="p-5">
                        <h3 className="text-gray-900 font-bold text-base leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors mb-2">
                          {evento.name}
                        </h3>

                        {evento.description && (
                          <p className="text-gray-500 text-sm line-clamp-2 mb-4 leading-relaxed">{evento.description}</p>
                        )}

                        {/* Event details */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2.5 text-gray-600 text-sm">
                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <Calendar className="w-3.5 h-3.5 text-gray-500" />
                            </div>
                            <span className="capitalize">{dateInfo.weekday}, {dateInfo.day} de {dateInfo.monthLong}</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-gray-600 text-sm">
                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <Clock className="w-3.5 h-3.5 text-gray-500" />
                            </div>
                            <span>{dateInfo.time} - {evento.duration_minutes}min</span>
                          </div>
                          {evento.local_evento && (
                            <div className="flex items-center gap-2.5 text-gray-600 text-sm">
                              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-3.5 h-3.5 text-gray-500" />
                              </div>
                              <span className="line-clamp-1">{evento.local_evento}</span>
                            </div>
                          )}
                          {evento.max_participants && (
                            <div className="flex items-center gap-2.5 text-sm">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isFull ? 'bg-red-50' : 'bg-gray-100'}`}>
                                <Users className={`w-3.5 h-3.5 ${isFull ? 'text-red-500' : 'text-gray-500'}`} />
                              </div>
                              <span className={isFull ? 'text-red-600 font-medium' : 'text-gray-600'}>
                                {isFull
                                  ? 'Todas as vagas preenchidas'
                                  : `${evento.max_participants - (evento.participant_count || 0)} vagas restantes`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Footer: price + CTA */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div>
                            {evento.is_paid && evento.valor_ingresso > 0 ? (
                              <div>
                                <p className="text-xs text-gray-400 font-medium">A partir de</p>
                                <p className="text-xl font-bold text-gray-900">
                                  R$ {Number(evento.valor_ingresso).toFixed(2).replace('.', ',')}
                                </p>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                                <span className="text-emerald-700 font-semibold text-sm">Gratuito</span>
                              </div>
                            )}
                          </div>

                          {past && hasReplay ? (
                            <Button
                              size="sm"
                              onClick={() => window.open(evento.replay_url!, '_blank')}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl px-4 shadow-md shadow-blue-200"
                            >
                              <Play className="w-4 h-4 mr-1.5" />
                              Assistir Replay
                            </Button>
                          ) : past ? (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium border border-gray-200">
                              Encerrado
                            </span>
                          ) : hasTicket ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                const ticket = meusTickets.find(
                                  t => t.event_id === evento.id && t.status === 'ativo'
                                )
                                if (ticket) {
                                  setSelectedTicket(ticket)
                                  setShowQRModal(true)
                                }
                              }}
                              className="bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 text-sm font-semibold rounded-xl px-4"
                            >
                              <QrCode className="w-4 h-4 mr-1.5" />
                              Ver QR Code
                            </Button>
                          ) : isFull ? (
                            <Button
                              size="sm"
                              onClick={() => handleWaitlist(evento.id)}
                              className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-sm font-semibold rounded-xl px-4"
                            >
                              <UserPlus className="w-4 h-4 mr-1.5" />
                              Lista de Espera
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedEvento(evento)
                                setShowPurchaseModal(true)
                              }}
                              className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl px-5 shadow-md shadow-violet-200"
                            >
                              <Ticket className="w-4 h-4 mr-1.5" />
                              {evento.is_paid ? 'Comprar Ingresso' : 'Inscrever-se'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          /* ========== MY TICKETS TAB ========== */
          meusTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
                <Ticket className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-gray-800 font-semibold text-lg mb-2">Nenhum ingresso</h3>
              <p className="text-gray-400 text-sm mb-6 max-w-sm text-center">
                Voce ainda nao adquiriu nenhum ingresso. Explore nossos eventos e garanta sua vaga!
              </p>
              <Button
                onClick={() => setActiveTab('eventos')}
                className="bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl px-6"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Explorar Eventos
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meusTickets.map(ticket => {
                const dateInfo = ticket.evento_data ? formatEventDate(ticket.evento_data) : null
                const isActive = ticket.status === 'ativo'
                const isUsed = ticket.status === 'usado'

                return (
                  <div
                    key={ticket.id || ticket.codigo_ticket}
                    className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                      isActive
                        ? 'border-violet-200 hover:shadow-lg hover:shadow-violet-100/50'
                        : 'border-gray-200 opacity-75'
                    }`}
                  >
                    {/* Ticket Header with colored strip */}
                    <div className={`relative p-5 border-b ${
                      isActive
                        ? 'bg-gradient-to-r from-violet-50 to-rose-50 border-violet-100'
                        : isUsed
                          ? 'bg-gradient-to-r from-blue-50 to-sky-50 border-blue-100'
                          : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isUsed
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {isActive && <CheckCircle2 className="w-3 h-3" />}
                          {isActive ? 'Ativo' : isUsed ? 'Usado' : 'Cancelado'}
                        </span>
                        <span className="text-gray-400 text-[11px] font-mono bg-gray-100 px-2 py-0.5 rounded">
                          {ticket.codigo_ticket}
                        </span>
                      </div>
                      <h3 className="text-gray-900 font-bold text-base leading-snug">
                        {ticket.evento_nome}
                      </h3>
                    </div>

                    {/* Dashed ticket separator (Sympla style) */}
                    <div className="relative">
                      <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-gray-50 -translate-x-1/2 -translate-y-1/2 border-r border-gray-200" />
                      <div className="absolute right-0 top-0 w-4 h-4 rounded-full bg-gray-50 translate-x-1/2 -translate-y-1/2 border-l border-gray-200" />
                      <div className="border-t border-dashed border-gray-200 mx-6" />
                    </div>

                    {/* Ticket Body */}
                    <div className="p-5 space-y-3">
                      {dateInfo && (
                        <div className="flex items-center gap-2.5 text-gray-600 text-sm">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          </div>
                          <span className="capitalize">{dateInfo.full} as {dateInfo.time}</span>
                        </div>
                      )}
                      {ticket.evento_local && (
                        <div className="flex items-center gap-2.5 text-gray-600 text-sm">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-gray-500" />
                          </div>
                          <span>{ticket.evento_local}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2.5 text-gray-600 text-sm">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Tag className="w-3.5 h-3.5 text-gray-500" />
                        </div>
                        <span>{ticket.valor_pago > 0 ? `R$ ${Number(ticket.valor_pago).toFixed(2).replace('.', ',')}` : 'Gratuito'}</span>
                      </div>

                      {isActive && (
                        <Button
                          onClick={() => {
                            setSelectedTicket(ticket)
                            setShowQRModal(true)
                          }}
                          className="w-full mt-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl shadow-md shadow-violet-200"
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Exibir QR Code
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* ========== PURCHASE MODAL ========== */}
      <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
        <DialogContent className="sm:max-w-md bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-3 text-lg">
              <div className="p-2.5 rounded-xl bg-violet-100">
                <Ticket className="w-5 h-5 text-violet-600" />
              </div>
              {selectedEvento?.is_paid ? 'Comprar Ingresso' : 'Confirmar Inscricao'}
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm mt-1">
              Revise os detalhes do evento antes de confirmar.
            </DialogDescription>
          </DialogHeader>

          {selectedEvento && (
            <div className="space-y-5 mt-2">
              {/* Event summary card */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="text-gray-900 font-bold text-base mb-3">{selectedEvento.name}</h3>
                {selectedEvento.description && (
                  <p className="text-gray-500 text-sm mb-4 line-clamp-3 leading-relaxed">{selectedEvento.description}</p>
                )}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-gray-600 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-gray-100">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <span>{formatEventDate(selectedEvento.date_time).full}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-gray-600 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-gray-100">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <span>{formatEventDate(selectedEvento.date_time).time} - {selectedEvento.duration_minutes}min</span>
                  </div>
                  {selectedEvento.local_evento && (
                    <div className="flex items-center gap-2.5 text-gray-600 text-sm">
                      <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-gray-100">
                        <MapPin className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <span>{selectedEvento.local_evento}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price summary */}
              {selectedEvento.is_paid && selectedEvento.valor_ingresso > 0 && (
                <div className="flex items-center justify-between p-4 bg-violet-50 rounded-xl border border-violet-200">
                  <span className="text-gray-600 text-sm font-medium">Valor do ingresso</span>
                  <span className="text-gray-900 font-bold text-xl">
                    R$ {Number(selectedEvento.valor_ingresso).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setShowPurchaseModal(false)}
                  className="flex-1 border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl font-medium"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold shadow-md shadow-violet-200"
                >
                  {purchasing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {purchasing
                    ? 'Processando...'
                    : selectedEvento.is_paid
                      ? 'Confirmar Compra'
                      : 'Confirmar Inscricao'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== QR CODE MODAL ========== */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-sm bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-3 text-lg">
              <div className="p-2.5 rounded-xl bg-violet-100">
                <QrCode className="w-5 h-5 text-violet-600" />
              </div>
              Seu Ingresso
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm mt-1">
              Apresente este QR Code na entrada do evento.
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-5 mt-2">
              <div className="flex flex-col items-center">
                {/* QR Code Container */}
                <div className="bg-white p-5 rounded-2xl border-2 border-gray-100 shadow-inner mb-4">
                  <QRCodeSVG
                    value={getQRData(selectedTicket)}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                {/* Ticket Code */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-6 py-3 text-center">
                  <p className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold mb-1">
                    Codigo do Ingresso
                  </p>
                  <p className="text-gray-900 font-mono text-lg font-bold tracking-[0.15em]">
                    {selectedTicket.codigo_ticket}
                  </p>
                </div>
              </div>

              {/* Event info summary */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                <p className="text-gray-900 font-bold text-sm">{selectedTicket.evento_nome}</p>
                {selectedTicket.evento_data && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatEventDate(selectedTicket.evento_data).full} as {formatEventDate(selectedTicket.evento_data).time}</span>
                  </div>
                )}
                {selectedTicket.evento_local && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{selectedTicket.evento_local}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-400 text-xs pt-1 border-t border-gray-200">
                  <Users className="w-3 h-3" />
                  <span>Participante: {mentorado?.nome_completo}</span>
                </div>
              </div>

              <p className="text-gray-400 text-xs text-center bg-violet-50 rounded-lg py-2 px-3 border border-violet-100">
                Apresente este QR Code na entrada do evento para validar seu ingresso.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
