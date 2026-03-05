'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Calendar, MapPin, Ticket, Clock, Users, ArrowLeft,
  DollarSign, QrCode, Check, Loader2, ChevronRight,
  Star, Sparkles, X, Download, Play, UserPlus
} from 'lucide-react'
import { useMentoradoAuth } from '@/contexts/mentorado-auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import { isBetaUser } from '@/lib/beta-access'
import { Card } from '@/components/ui/card'
import { Shield } from 'lucide-react'

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

const eventTypeLabels: Record<string, { label: string; color: string }> = {
  webinar: { label: 'Webinar', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  workshop: { label: 'Workshop', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  masterclass: { label: 'Masterclass', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  evento_especial: { label: 'Evento Especial', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
}

export default function EventosPage() {
  const { mentorado } = useMentoradoAuth()
  const [eventos, setEventos] = useState<EventoVisivel[]>([])
  const [meusTickets, setMeusTickets] = useState<MeuTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'eventos' | 'ingressos'>('eventos')

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
      time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      full: d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    }
  }

  // Beta access check
  if (mentorado && !isBetaUser(mentorado.email)) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <Card className="p-8 bg-white/5 backdrop-blur-xl border-white/10 max-w-md w-full text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-amber-400/50" />
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-white/50 mb-6">Esta funcionalidade está em fase beta e disponível apenas para usuários selecionados.</p>
          <Link href="/mentorado">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Portal
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-[#0a0a0a] to-pink-900/10" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />

        <div className="relative px-4 md:px-8 pt-8 pb-6">
          <Link
            href="/mentorado"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-[28px] md:text-[36px] font-extrabold text-white leading-tight">Eventos</h1>
              <p className="text-gray-500 text-sm">Participe de eventos exclusivos</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('eventos')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'eventos'
                  ? 'bg-white text-black'
                  : 'bg-white/[0.05] text-gray-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Calendar className="w-4 h-4 inline-block mr-2" />
              Proximos Eventos
            </button>
            <button
              onClick={() => setActiveTab('ingressos')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'ingressos'
                  ? 'bg-white text-black'
                  : 'bg-white/[0.05] text-gray-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <QrCode className="w-4 h-4 inline-block mr-2" />
              Meus Ingressos
              {meusTickets.filter(t => t.status === 'ativo').length > 0 && (
                <span className="ml-2 w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] inline-flex items-center justify-center font-bold">
                  {meusTickets.filter(t => t.status === 'ativo').length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 pb-12 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : activeTab === 'eventos' ? (
          /* Events List */
          eventos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-3xl bg-white/[0.03] flex items-center justify-center mb-4">
                <Calendar className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Nenhum evento disponivel</h3>
              <p className="text-gray-500 text-sm">Novos eventos serao publicados em breve!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {eventos.map((evento, index) => {
                const dateInfo = formatEventDate(evento.date_time)
                const past = isEventPast(evento.date_time)
                const hasTicket = hasTicketForEvent(evento.id)
                const typeInfo = eventTypeLabels[evento.type] || { label: evento.type, color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' }
                const countdown = !past ? getCountdown(evento.date_time) : null
                const isFull = evento.max_participants ? (evento.participant_count || 0) >= evento.max_participants : false
                const hasReplay = past && evento.replay_url && evento.replay_disponivel_ate && new Date(evento.replay_disponivel_ate) > new Date()

                return (
                  <div
                    key={evento.id}
                    className={`group bg-[#141414] rounded-2xl overflow-hidden border border-white/5 hover:border-white/15 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/5 ${past ? 'opacity-60' : ''}`}
                  >
                    {/* Image / Date header */}
                    <div className="relative aspect-[16/9] bg-gradient-to-br from-purple-900/30 to-pink-900/20 overflow-hidden">
                      {evento.imagem_capa ? (
                        <img
                          src={evento.imagem_capa}
                          alt={evento.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-12 h-12 text-purple-700" />
                        </div>
                      )}
                      {/* Date badge */}
                      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md rounded-xl p-2.5 text-center min-w-[56px]">
                        <p className="text-[10px] text-purple-300 font-semibold uppercase">{dateInfo.month}</p>
                        <p className="text-xl font-bold text-white leading-none">{dateInfo.day}</p>
                      </div>
                      {/* Type badge */}
                      <div className="absolute top-3 right-3">
                        <Badge className={`${typeInfo.color} text-[10px]`}>{typeInfo.label}</Badge>
                      </div>
                      {/* Ticket purchased badge */}
                      {hasTicket && (
                        <div className="absolute bottom-3 right-3 bg-green-500/90 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-white" />
                          <span className="text-white text-[10px] font-semibold">Inscrito</span>
                        </div>
                      )}
                      {/* Countdown badge */}
                      {countdown && countdown.text && (
                        <div className={`absolute bottom-3 left-3 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                          countdown.urgent ? 'bg-red-500/90 text-white' : 'bg-black/70 text-purple-300'
                        }`}>
                          {countdown.text}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      <h3 className="text-white font-semibold text-[15px] leading-tight line-clamp-2 group-hover:text-purple-300 transition-colors">
                        {evento.name}
                      </h3>

                      {evento.description && (
                        <p className="text-gray-500 text-xs line-clamp-2">{evento.description}</p>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-gray-400 text-xs">
                          <Clock className="w-3 h-3" />
                          {dateInfo.time} · {evento.duration_minutes}min
                        </div>
                        {evento.local_evento && (
                          <div className="flex items-center gap-2 text-gray-400 text-xs">
                            <MapPin className="w-3 h-3" />
                            {evento.local_evento}
                          </div>
                        )}
                        {evento.max_participants && (
                          <div className={`flex items-center gap-2 text-xs ${isFull ? 'text-red-400' : 'text-gray-400'}`}>
                            <Users className="w-3 h-3" />
                            {isFull ? 'Esgotado' : `${evento.max_participants - (evento.participant_count || 0)} vagas restantes`}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div>
                          {evento.is_paid && evento.valor_ingresso > 0 ? (
                            <span className="text-white font-bold text-lg">
                              R$ {Number(evento.valor_ingresso).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-green-400 font-semibold text-sm">Gratuito</span>
                          )}
                        </div>

                        {past && hasReplay ? (
                          <Button
                            size="sm"
                            onClick={() => window.open(evento.replay_url!, '_blank')}
                            className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white text-xs shadow-lg shadow-blue-500/20"
                          >
                            <Play className="w-3.5 h-3.5 mr-1.5" />
                            Assistir Replay
                          </Button>
                        ) : past ? (
                          <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20 text-[10px]">Encerrado</Badge>
                        ) : hasTicket ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              const ticket = meusTickets.find(t => t.event_id === evento.id && t.status === 'ativo')
                              if (ticket) {
                                setSelectedTicket(ticket)
                                setShowQRModal(true)
                              }
                            }}
                            className="bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-xs"
                          >
                            <QrCode className="w-3.5 h-3.5 mr-1.5" />
                            Ver QR Code
                          </Button>
                        ) : isFull ? (
                          <Button
                            size="sm"
                            onClick={() => handleWaitlist(evento.id)}
                            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs shadow-lg shadow-amber-500/20"
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                            Lista de Espera
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedEvento(evento)
                              setShowPurchaseModal(true)
                            }}
                            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white text-xs shadow-lg shadow-purple-500/20"
                          >
                            <Ticket className="w-3.5 h-3.5 mr-1.5" />
                            {evento.is_paid ? 'Comprar' : 'Inscrever-se'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          /* My Tickets */
          meusTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-3xl bg-white/[0.03] flex items-center justify-center mb-4">
                <Ticket className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Nenhum ingresso</h3>
              <p className="text-gray-500 text-sm mb-6">Voce ainda nao adquiriu nenhum ingresso.</p>
              <Button
                onClick={() => setActiveTab('eventos')}
                className="bg-gradient-to-r from-purple-500 to-pink-600 text-white"
              >
                Ver Eventos
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {meusTickets.map(ticket => {
                const dateInfo = ticket.evento_data ? formatEventDate(ticket.evento_data) : null

                return (
                  <div
                    key={ticket.id || ticket.codigo_ticket}
                    className={`bg-[#141414] rounded-2xl border overflow-hidden ${
                      ticket.status === 'ativo' ? 'border-purple-500/20' : 'border-white/5 opacity-60'
                    }`}
                  >
                    {/* Ticket Header */}
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4 border-b border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={
                          ticket.status === 'ativo' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          ticket.status === 'usado' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }>
                          {ticket.status === 'ativo' ? 'Ativo' : ticket.status === 'usado' ? 'Usado' : 'Cancelado'}
                        </Badge>
                        <span className="text-gray-500 text-[10px] font-mono">{ticket.codigo_ticket}</span>
                      </div>
                      <h3 className="text-white font-semibold text-sm">{ticket.evento_nome}</h3>
                    </div>

                    {/* Ticket Body */}
                    <div className="p-4 space-y-3">
                      {dateInfo && (
                        <div className="flex items-center gap-2 text-gray-400 text-xs">
                          <Calendar className="w-3 h-3" />
                          {dateInfo.full} as {dateInfo.time}
                        </div>
                      )}
                      {ticket.evento_local && (
                        <div className="flex items-center gap-2 text-gray-400 text-xs">
                          <MapPin className="w-3 h-3" />
                          {ticket.evento_local}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <DollarSign className="w-3 h-3" />
                        {ticket.valor_pago > 0 ? `R$ ${Number(ticket.valor_pago).toFixed(2)}` : 'Gratuito'}
                      </div>

                      {ticket.status === 'ativo' && (
                        <Button
                          onClick={() => {
                            setSelectedTicket(ticket)
                            setShowQRModal(true)
                          }}
                          className="w-full bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 mt-2"
                          size="sm"
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

      {/* Purchase Modal */}
      <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
        <DialogContent className="sm:max-w-md bg-[#141418] border-white/[0.06] backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10">
                <Ticket className="w-4 h-4 text-purple-400" />
              </div>
              {selectedEvento?.is_paid ? 'Comprar Ingresso' : 'Confirmar Inscricao'}
            </DialogTitle>
          </DialogHeader>

          {selectedEvento && (
            <div className="space-y-4 mt-2">
              <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                <h3 className="text-white font-semibold mb-2">{selectedEvento.name}</h3>
                {selectedEvento.description && (
                  <p className="text-gray-500 text-xs mb-3 line-clamp-3">{selectedEvento.description}</p>
                )}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <Calendar className="w-3 h-3" />
                    {formatEventDate(selectedEvento.date_time).full}
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <Clock className="w-3 h-3" />
                    {formatEventDate(selectedEvento.date_time).time} · {selectedEvento.duration_minutes}min
                  </div>
                  {selectedEvento.local_evento && (
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <MapPin className="w-3 h-3" />
                      {selectedEvento.local_evento}
                    </div>
                  )}
                </div>
              </div>

              {selectedEvento.is_paid && selectedEvento.valor_ingresso > 0 && (
                <div className="flex items-center justify-between p-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
                  <span className="text-gray-400 text-sm">Valor do ingresso</span>
                  <span className="text-white font-bold text-lg">R$ {Number(selectedEvento.valor_ingresso).toFixed(2)}</span>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPurchaseModal(false)}
                  className="flex-1 bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/20"
                >
                  {purchasing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {purchasing ? 'Processando...' : selectedEvento.is_paid ? 'Confirmar Compra' : 'Confirmar Inscricao'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-sm bg-[#141418] border-white/[0.06] backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10">
                <QrCode className="w-4 h-4 text-purple-400" />
              </div>
              Seu Ingresso
            </DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4 mt-2">
              <div className="flex flex-col items-center">
                {/* QR Code */}
                <div className="bg-white p-4 rounded-2xl mb-4">
                  <QRCodeSVG
                    value={getQRData(selectedTicket)}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                {/* Ticket Code */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-6 py-3 text-center">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-1">Codigo do Ingresso</p>
                  <p className="text-white font-mono text-lg font-bold tracking-widest">{selectedTicket.codigo_ticket}</p>
                </div>
              </div>

              {/* Event info */}
              <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] space-y-2">
                <p className="text-white font-semibold text-sm">{selectedTicket.evento_nome}</p>
                {selectedTicket.evento_data && (
                  <p className="text-gray-400 text-xs">
                    {formatEventDate(selectedTicket.evento_data).full} as {formatEventDate(selectedTicket.evento_data).time}
                  </p>
                )}
                {selectedTicket.evento_local && (
                  <p className="text-gray-400 text-xs flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    {selectedTicket.evento_local}
                  </p>
                )}
                <p className="text-gray-500 text-[11px]">
                  Participante: {mentorado?.nome_completo}
                </p>
              </div>

              <p className="text-gray-600 text-[11px] text-center">
                Apresente este QR Code na entrada do evento
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
