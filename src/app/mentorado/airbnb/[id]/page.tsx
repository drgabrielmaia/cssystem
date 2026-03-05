'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowLeft, Star, MapPin, Building2, Calendar, Clock,
  Wifi, Car, Users, Wind, Zap, Camera, Shield, Accessibility,
  Bath, Home, ChevronLeft, ChevronRight, Heart, Share2,
  DollarSign, Loader2, Check, X, MessageSquare, User,
  Send, CheckCircle2, Award, FileText
} from 'lucide-react'
import { useMentoradoAuth } from '@/contexts/mentorado-auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { toast } from 'sonner'
import { isBetaUser } from '@/lib/beta-access'
import { Card } from '@/components/ui/card'

interface Clinica {
  id: string
  organization_id: string
  owner_mentorado_id: string
  titulo: string
  descricao?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  bairro?: string
  preco_por_turno: number
  preco_por_dia: number
  preco_por_mes: number
  tem_videomaker: boolean
  tem_recepcionista: boolean
  tem_estacionamento: boolean
  tem_wifi: boolean
  tem_ar_condicionado: boolean
  tem_sala_espera: boolean
  tem_raio_x: boolean
  tem_autoclave: boolean
  tem_banheiro_privativo: boolean
  tem_acessibilidade: boolean
  numero_salas: number
  area_m2?: number
  especialidades_recomendadas?: string
  horario_funcionamento?: string
  regras?: string
  foto_capa?: string
  fotos: string[]
  fotos_verificadas?: boolean
  destaque?: boolean
  status: string
  created_at: string
}

interface Avaliacao {
  id: string
  nota: number
  comentario?: string
  created_at: string
  mentorado_nome?: string
}

interface Reserva {
  id: string
  data_inicio: string
  data_fim: string
  turno: string
  valor_total: number
  status: string
}

interface ChatMessage {
  id: string
  mensagem: string
  remetente_id: string
  created_at: string
}

const amenidadeConfig: Record<string, { icon: any; label: string }> = {
  tem_videomaker: { icon: Camera, label: 'Videomaker' },
  tem_recepcionista: { icon: Users, label: 'Recepcionista' },
  tem_estacionamento: { icon: Car, label: 'Estacionamento' },
  tem_wifi: { icon: Wifi, label: 'Wi-Fi' },
  tem_ar_condicionado: { icon: Wind, label: 'Ar Condicionado' },
  tem_sala_espera: { icon: Home, label: 'Sala de Espera' },
  tem_raio_x: { icon: Zap, label: 'Raio-X' },
  tem_autoclave: { icon: Shield, label: 'Autoclave' },
  tem_banheiro_privativo: { icon: Bath, label: 'Banheiro Privativo' },
  tem_acessibilidade: { icon: Accessibility, label: 'Acessibilidade' },
}

export default function ClinicaDetailPage() {
  const params = useParams()
  const clinicaId = params.id as string
  const { mentorado } = useMentoradoAuth()

  const [clinica, setClinica] = useState<Clinica | null>(null)
  const [ownerNome, setOwnerNome] = useState('')
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [minhasReservas, setMinhasReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)

  // Booking state
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingDataInicio, setBookingDataInicio] = useState('')
  const [bookingDataFim, setBookingDataFim] = useState('')
  const [bookingTurno, setBookingTurno] = useState('integral')
  const [bookingObs, setBookingObs] = useState('')

  // Review state
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewNota, setReviewNota] = useState(5)
  const [reviewComentario, setReviewComentario] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)

  // Chat state
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [sendingChat, setSendingChat] = useState(false)

  // Availability state
  const [occupiedDates, setOccupiedDates] = useState<Set<string>>(new Set())

  // Contract state
  const [showContractModal, setShowContractModal] = useState(false)
  const [contractAccepted, setContractAccepted] = useState(false)
  const [termosUso, setTermosUso] = useState('')

  // Config
  const [taxaPlataforma, setTaxaPlataforma] = useState(10)

  useEffect(() => {
    if (clinicaId && mentorado) loadAll()
  }, [clinicaId, mentorado])

  const loadAll = async () => {
    try {
      setLoading(true)

      // Load clinica
      const { data: clinicaData, error: clinicaError } = await supabase
        .from('clinicas')
        .select('*')
        .eq('id', clinicaId)
        .single()

      if (clinicaError) throw clinicaError
      setClinica(clinicaData)

      // Load owner name
      if (clinicaData?.owner_mentorado_id) {
        const { data: ownerData } = await supabase
          .from('mentorados')
          .select('nome_completo')
          .eq('id', clinicaData.owner_mentorado_id)
          .single()
        setOwnerNome(ownerData?.nome_completo || 'Proprietario')
      }

      // Load reviews
      const { data: avalData } = await supabase
        .from('clinica_avaliacoes')
        .select('*')
        .eq('clinica_id', clinicaId)
        .order('created_at', { ascending: false })

      const avaliacoesWithNames = await Promise.all((avalData || []).map(async (a: any) => {
        const { data: mData } = await supabase
          .from('mentorados')
          .select('nome_completo')
          .eq('id', a.mentorado_id)
          .single()
        return { ...a, mentorado_nome: mData?.nome_completo || 'Mentorado' }
      }))
      setAvaliacoes(avaliacoesWithNames)

      // Load my reservations
      if (mentorado?.id) {
        const { data: reservasData } = await supabase
          .from('clinica_reservas')
          .select('*')
          .eq('clinica_id', clinicaId)
          .eq('mentorado_id', mentorado.id)
          .order('created_at', { ascending: false })
        setMinhasReservas(reservasData || [])
      }

      // Load platform config + terms
      const { data: configData } = await supabase
        .from('airbnb_config')
        .select('percentual_lucro, termos_uso')
        .eq('organization_id', '9c8c0033-15ea-4e33-a55f-28d81a19693b')
        .single()
      if (configData) {
        setTaxaPlataforma(configData.percentual_lucro)
        if (configData.termos_uso) setTermosUso(configData.termos_uso)
      }

      // Load availability (occupied dates from pending/confirmed reservations)
      const { data: allReservas } = await supabase
        .from('clinica_reservas')
        .select('data_inicio, data_fim, status')
        .eq('clinica_id', clinicaId)
        .in('status', ['pendente', 'confirmada'])

      if (allReservas) {
        const occupied = new Set<string>()
        allReservas.forEach((r: any) => {
          const start = new Date(r.data_inicio)
          const end = new Date(r.data_fim)
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            occupied.add(d.toISOString().split('T')[0])
          }
        })
        setOccupiedDates(occupied)
      }

      // Load chat messages
      if (mentorado?.id && clinicaData) {
        loadChatMessages(clinicaData.owner_mentorado_id)
      }

    } catch (err) {
      console.error('Error loading clinica:', err)
      toast.error('Erro ao carregar dados da clinica')
    } finally {
      setLoading(false)
    }
  }

  const loadChatMessages = async (ownerId?: string) => {
    if (!mentorado?.id) return
    const targetOwner = ownerId || clinica?.owner_mentorado_id
    if (!targetOwner) return

    const { data } = await supabase
      .from('clinica_mensagens')
      .select('*')
      .eq('clinica_id', clinicaId)
      .or(`remetente_id.eq.${mentorado.id},destinatario_id.eq.${mentorado.id}`)
      .order('created_at', { ascending: true })

    if (data) setChatMessages(data)
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !mentorado?.id || !clinica?.owner_mentorado_id || sendingChat) return
    setSendingChat(true)
    try {
      await supabase.from('clinica_mensagens').insert({
        clinica_id: clinicaId,
        remetente_id: mentorado.id,
        destinatario_id: clinica.owner_mentorado_id,
        mensagem: chatInput.trim(),
      })
      setChatInput('')
      loadChatMessages()
    } catch (err) {
      toast.error('Erro ao enviar mensagem')
    } finally {
      setSendingChat(false)
    }
  }

  // Chat polling
  useEffect(() => {
    if (!showChat || !mentorado?.id) return
    const interval = setInterval(() => loadChatMessages(), 10000)
    return () => clearInterval(interval)
  }, [showChat, mentorado?.id])

  // Generate availability calendar (next 30 days)
  const calendarDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    return {
      date: d,
      dateStr,
      occupied: occupiedDates.has(dateStr),
      dayNum: d.getDate(),
      weekday: d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3),
    }
  })

  const calcularValorTotal = () => {
    if (!clinica || !bookingDataInicio || !bookingDataFim) return { subtotal: 0, taxa: 0, total: 0 }
    const start = new Date(bookingDataInicio)
    const end = new Date(bookingDataFim)
    const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)

    let precoBase = 0
    if (bookingTurno === 'integral') {
      precoBase = clinica.preco_por_dia > 0 ? clinica.preco_por_dia : clinica.preco_por_turno * 2
    } else {
      precoBase = clinica.preco_por_turno
    }

    const subtotal = precoBase * diffDays
    const taxa = subtotal * (taxaPlataforma / 100)
    return { subtotal, taxa, total: subtotal + taxa }
  }

  const handleBooking = async () => {
    if (!bookingDataInicio || !bookingDataFim) {
      toast.error('Selecione as datas')
      return
    }

    try {
      setBookingLoading(true)
      const { subtotal, taxa, total } = calcularValorTotal()

      const { error } = await supabase
        .from('clinica_reservas')
        .insert({
          clinica_id: clinicaId,
          mentorado_id: mentorado?.id,
          organization_id: '9c8c0033-15ea-4e33-a55f-28d81a19693b',
          data_inicio: bookingDataInicio,
          data_fim: bookingDataFim,
          turno: bookingTurno,
          valor_total: total,
          valor_taxa_plataforma: taxa,
          percentual_taxa: taxaPlataforma,
          status: 'pendente',
          observacoes: bookingObs || null,
          termos_aceitos: true,
          termos_aceitos_em: new Date().toISOString(),
        })

      if (error) throw error

      toast.success('Reserva enviada! Aguardando confirmacao do proprietario.')
      setShowBookingModal(false)
      setBookingDataInicio('')
      setBookingDataFim('')
      setBookingTurno('integral')
      setBookingObs('')
      loadAll()
    } catch (err) {
      console.error('Error booking:', err)
      toast.error('Erro ao fazer reserva')
    } finally {
      setBookingLoading(false)
    }
  }

  const handleReview = async () => {
    try {
      setReviewLoading(true)
      const { error } = await supabase
        .from('clinica_avaliacoes')
        .insert({
          clinica_id: clinicaId,
          mentorado_id: mentorado?.id,
          nota: reviewNota,
          comentario: reviewComentario || null,
        })

      if (error) throw error

      toast.success('Avaliacao enviada!')
      setShowReviewModal(false)
      setReviewNota(5)
      setReviewComentario('')
      loadAll()
    } catch (err) {
      console.error('Error reviewing:', err)
      toast.error('Erro ao enviar avaliacao')
    } finally {
      setReviewLoading(false)
    }
  }

  const notaMedia = avaliacoes.length > 0
    ? avaliacoes.reduce((sum, a) => sum + a.nota, 0) / avaliacoes.length
    : 0

  const allPhotos = clinica ? [clinica.foto_capa, ...(clinica.fotos || [])].filter(Boolean) as string[] : []

  const amenidadesAtivas = clinica
    ? Object.entries(amenidadeConfig).filter(([key]) => (clinica as any)[key])
    : []

  const isOwner = mentorado?.id === clinica?.owner_mentorado_id

  // Beta access check
  if (mentorado && !isBetaUser(mentorado.email)) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <Card className="p-8 bg-white/5 backdrop-blur-xl border-white/10 max-w-md w-full text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-amber-400/50" />
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-white/50 mb-6">Esta funcionalidade está em fase beta.</p>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-gray-500 text-sm">Carregando clinica...</p>
        </div>
      </div>
    )
  }

  if (!clinica) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <Building2 className="w-12 h-12 text-gray-600" />
        <p className="text-white font-semibold">Clinica nao encontrada</p>
        <Link href="/mentorado/airbnb" className="text-amber-400 text-sm hover:underline">
          Voltar para listagem
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Top Bar */}
      <div className="px-4 md:px-8 py-4 flex items-center justify-between">
        <Link
          href="/mentorado/airbnb"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              toast.success('Link copiado!')
            }}
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            <Share2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Photo Gallery */}
      <div className="px-4 md:px-8 mb-6">
        <div className="relative rounded-2xl overflow-hidden aspect-[21/9] md:aspect-[3/1] bg-gradient-to-br from-amber-900/20 to-orange-900/10">
          {allPhotos.length > 0 ? (
            <>
              <img
                src={allPhotos[currentPhotoIndex]}
                alt={clinica.titulo}
                className="w-full h-full object-cover"
              />
              {allPhotos.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentPhotoIndex(i => (i - 1 + allPhotos.length) % allPhotos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPhotoIndex(i => (i + 1) % allPhotos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {allPhotos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPhotoIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all ${i === currentPhotoIndex ? 'bg-white w-4' : 'bg-white/40'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-20 h-20 text-gray-700" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title & Location */}
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-[24px] md:text-[32px] font-bold text-white">{clinica.titulo}</h1>
                {clinica.destaque && (
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                    <Award className="w-3 h-3 mr-1" />
                    Destaque
                  </Badge>
                )}
                {clinica.fotos_verificadas && (
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Fotos Verificadas
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <MapPin className="w-4 h-4" />
                  {[clinica.bairro, clinica.cidade, clinica.estado].filter(Boolean).join(', ')}
                </div>
                {notaMedia > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="text-white font-semibold">{notaMedia.toFixed(1)}</span>
                    <span className="text-gray-500">({avaliacoes.length} avaliacoes)</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Building2 className="w-4 h-4" />
                  {clinica.numero_salas} sala{clinica.numero_salas > 1 ? 's' : ''}
                  {clinica.area_m2 ? ` · ${clinica.area_m2}m²` : ''}
                </div>
              </div>
            </div>

            {/* Owner */}
            <div className="flex items-center gap-4 p-4 bg-[#141414] rounded-xl border border-white/5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold">
                {ownerNome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{ownerNome}</p>
                <p className="text-gray-500 text-xs">Proprietario</p>
              </div>
              {!isOwner && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowChat(!showChat)}
                  className="border-white/10 text-gray-400 hover:text-white text-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                  Mensagem
                </Button>
              )}
            </div>

            {/* Chat Panel */}
            {showChat && !isOwner && (
              <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <p className="text-white font-semibold text-sm">Chat com {ownerNome}</p>
                  <button onClick={() => setShowChat(false)} className="text-gray-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="h-64 overflow-y-auto p-4 space-y-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-8">Nenhuma mensagem ainda. Envie a primeira!</p>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.remetente_id === mentorado?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                          msg.remetente_id === mentorado?.id
                            ? 'bg-amber-500/20 text-amber-100'
                            : 'bg-white/[0.06] text-gray-300'
                        }`}>
                          <p>{msg.mensagem}</p>
                          <p className="text-[10px] text-gray-500 mt-1">
                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-3 border-t border-white/5 flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Digite sua mensagem..."
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim() || sendingChat}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-3"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Description */}
            {clinica.descricao && (
              <div>
                <h2 className="text-white font-semibold text-lg mb-3">Sobre o espaco</h2>
                <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{clinica.descricao}</p>
              </div>
            )}

            {/* Amenidades */}
            {amenidadesAtivas.length > 0 && (
              <div>
                <h2 className="text-white font-semibold text-lg mb-4">O que este lugar oferece</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {amenidadesAtivas.map(([key, { icon: Icon, label }]) => (
                    <div key={key} className="flex items-center gap-3 p-3 bg-[#141414] rounded-xl border border-white/5">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-amber-400" />
                      </div>
                      <span className="text-gray-300 text-sm">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extra Info */}
            {(clinica.especialidades_recomendadas || clinica.horario_funcionamento || clinica.regras) && (
              <div className="space-y-4">
                {clinica.especialidades_recomendadas && (
                  <div className="p-4 bg-[#141414] rounded-xl border border-white/5">
                    <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mb-1.5">Especialidades Recomendadas</p>
                    <p className="text-gray-300 text-sm">{clinica.especialidades_recomendadas}</p>
                  </div>
                )}
                {clinica.horario_funcionamento && (
                  <div className="p-4 bg-[#141414] rounded-xl border border-white/5">
                    <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mb-1.5">Horario de Funcionamento</p>
                    <p className="text-gray-300 text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      {clinica.horario_funcionamento}
                    </p>
                  </div>
                )}
                {clinica.regras && (
                  <div className="p-4 bg-[#141414] rounded-xl border border-white/5">
                    <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mb-1.5">Regras</p>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{clinica.regras}</p>
                  </div>
                )}
              </div>
            )}

            {/* Reviews */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  {notaMedia > 0 ? `${notaMedia.toFixed(1)} · ${avaliacoes.length} avaliacao${avaliacoes.length !== 1 ? 'es' : ''}` : 'Sem avaliacoes ainda'}
                </h2>
                {!isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReviewModal(true)}
                    className="border-white/10 text-gray-400 hover:text-white text-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                    Avaliar
                  </Button>
                )}
              </div>

              {avaliacoes.length > 0 ? (
                <div className="space-y-3">
                  {avaliacoes.map(a => (
                    <div key={a.id} className="p-4 bg-[#141414] rounded-xl border border-white/5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">
                          {a.mentorado_nome?.charAt(0)?.toUpperCase() || 'M'}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{a.mentorado_nome}</p>
                          <p className="text-gray-600 text-xs">
                            {new Date(a.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 ml-auto">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} className={`w-3.5 h-3.5 ${n <= a.nota ? 'fill-amber-400 text-amber-400' : 'text-gray-700'}`} />
                          ))}
                        </div>
                      </div>
                      {a.comentario && <p className="text-gray-400 text-sm">{a.comentario}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-sm">Nenhuma avaliacao ainda. Seja o primeiro a avaliar!</p>
              )}
            </div>

            {/* My Reservations */}
            {minhasReservas.length > 0 && (
              <div>
                <h2 className="text-white font-semibold text-lg mb-4">Minhas Reservas</h2>
                <div className="space-y-3">
                  {minhasReservas.map(r => (
                    <div key={r.id} className="p-4 bg-[#141414] rounded-xl border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">
                          {new Date(r.data_inicio).toLocaleDateString('pt-BR')} - {new Date(r.data_fim).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          Turno: {r.turno === 'integral' ? 'Integral' : r.turno === 'manha' ? 'Manha' : 'Tarde'}
                          {' · '}R$ {Number(r.valor_total).toFixed(2)}
                        </p>
                      </div>
                      <Badge className={`text-[10px] ${
                        r.status === 'confirmada' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        r.status === 'pendente' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        r.status === 'concluida' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Availability + Booking */}
          <div className="lg:col-span-1 space-y-4">
            {/* Availability Calendar */}
            <div className="p-4 bg-[#141414] rounded-2xl border border-white/5">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                Disponibilidade (30 dias)
              </h3>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => (
                  <div
                    key={day.dateStr}
                    className={`text-center py-1.5 rounded-lg text-xs ${
                      day.occupied
                        ? 'bg-red-500/15 text-red-400 line-through'
                        : 'bg-green-500/10 text-green-400'
                    }`}
                    title={`${day.dateStr} - ${day.occupied ? 'Ocupado' : 'Disponivel'}`}
                  >
                    <p className="text-[9px] text-gray-500">{day.weekday}</p>
                    <p className="font-semibold">{day.dayNum}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500/40 rounded-full" /> Disponivel</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500/40 rounded-full" /> Ocupado</span>
              </div>
            </div>

            {/* Booking Card */}
            <div className="sticky top-6 p-6 bg-[#141414] rounded-2xl border border-white/5 space-y-5">
              {/* Price display */}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[28px] font-bold text-white">
                    R$ {(clinica.preco_por_turno || 0).toFixed(0)}
                  </span>
                  <span className="text-gray-500 text-sm">/turno</span>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                  {clinica.preco_por_dia > 0 && <span>R$ {clinica.preco_por_dia.toFixed(0)}/dia</span>}
                  {clinica.preco_por_mes > 0 && <span>R$ {clinica.preco_por_mes.toFixed(0)}/mes</span>}
                </div>
              </div>

              {!isOwner ? (
                <>
                  {/* Quick booking form */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold">Inicio</Label>
                        <Input
                          type="date"
                          value={bookingDataInicio}
                          onChange={(e) => setBookingDataInicio(e.target.value)}
                          className="bg-white/[0.03] border-white/[0.06] text-white text-sm h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold">Fim</Label>
                        <Input
                          type="date"
                          value={bookingDataFim}
                          onChange={(e) => setBookingDataFim(e.target.value)}
                          className="bg-white/[0.03] border-white/[0.06] text-white text-sm h-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold">Turno</Label>
                      <Select value={bookingTurno} onValueChange={setBookingTurno}>
                        <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a20] border-white/[0.06]">
                          <SelectItem value="manha" className="text-white focus:bg-white/[0.06]">Manha</SelectItem>
                          <SelectItem value="tarde" className="text-white focus:bg-white/[0.06]">Tarde</SelectItem>
                          <SelectItem value="integral" className="text-white focus:bg-white/[0.06]">Integral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Price breakdown */}
                  {bookingDataInicio && bookingDataFim && (
                    <div className="space-y-2 pt-3 border-t border-white/5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Subtotal</span>
                        <span className="text-white">R$ {calcularValorTotal().subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Taxa da plataforma ({taxaPlataforma}%)</span>
                        <span className="text-white">R$ {calcularValorTotal().taxa.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/5">
                        <span className="text-white">Total</span>
                        <span className="text-amber-400">R$ {calcularValorTotal().total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => {
                      if (termosUso) {
                        setContractAccepted(false)
                        setShowContractModal(true)
                      } else {
                        setShowBookingModal(true)
                      }
                    }}
                    disabled={!bookingDataInicio || !bookingDataFim}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-40"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Reservar
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">Voce e o proprietario desta clinica</p>
                </div>
              )}

              <p className="text-gray-600 text-[11px] text-center">
                Voce nao sera cobrado agora. A reserva sera confirmada pelo proprietario.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Confirmation Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="sm:max-w-md bg-[#141418] border-white/[0.06] backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <Calendar className="w-4 h-4 text-amber-400" />
              </div>
              Confirmar Reserva
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] space-y-2">
              <p className="text-white font-semibold text-sm">{clinica.titulo}</p>
              <p className="text-gray-400 text-xs">
                {new Date(bookingDataInicio).toLocaleDateString('pt-BR')} - {new Date(bookingDataFim).toLocaleDateString('pt-BR')}
                {' · '}Turno: {bookingTurno === 'integral' ? 'Integral' : bookingTurno === 'manha' ? 'Manha' : 'Tarde'}
              </p>
              <div className="pt-2 border-t border-white/5 flex justify-between">
                <span className="text-gray-400 text-sm">Total</span>
                <span className="text-amber-400 font-bold">R$ {calcularValorTotal().total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs">Observacoes (opcional)</Label>
              <Textarea
                value={bookingObs}
                onChange={(e) => setBookingObs(e.target.value)}
                placeholder="Alguma observacao para o proprietario..."
                className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 resize-none min-h-[60px]"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowBookingModal(false)}
              className="flex-1 bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBooking}
              disabled={bookingLoading}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
            >
              {bookingLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {bookingLoading ? 'Reservando...' : 'Confirmar Reserva'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="sm:max-w-md bg-[#141418] border-white/[0.06] backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <Star className="w-4 h-4 text-amber-400" />
              </div>
              Avaliar Clinica
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setReviewNota(n)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star className={`w-8 h-8 ${n <= reviewNota ? 'fill-amber-400 text-amber-400' : 'text-gray-700 hover:text-gray-500'}`} />
                </button>
              ))}
            </div>
            <p className="text-gray-400 text-center text-sm">
              {reviewNota === 5 ? 'Excelente!' : reviewNota === 4 ? 'Muito bom!' : reviewNota === 3 ? 'Bom' : reviewNota === 2 ? 'Regular' : 'Ruim'}
            </p>
            <Textarea
              value={reviewComentario}
              onChange={(e) => setReviewComentario(e.target.value)}
              placeholder="Conte sua experiencia (opcional)"
              className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 resize-none min-h-[80px]"
            />
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowReviewModal(false)}
              className="flex-1 bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReview}
              disabled={reviewLoading}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
            >
              {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Star className="w-4 h-4 mr-2" />}
              Enviar Avaliacao
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contract Modal */}
      <Dialog open={showContractModal} onOpenChange={setShowContractModal}>
        <DialogContent className="sm:max-w-lg bg-[#141418] border-white/[0.06] backdrop-blur-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <FileText className="w-4 h-4 text-amber-400" />
              </div>
              Termos e Condicoes
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] max-h-60 overflow-y-auto">
              <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                {termosUso || 'Sem termos configurados.'}
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer p-3 bg-white/[0.02] rounded-xl border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
              <input
                type="checkbox"
                checked={contractAccepted}
                onChange={(e) => setContractAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-gray-300 text-sm">
                Li e aceito os termos e condicoes acima para prosseguir com a reserva.
              </span>
            </label>
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowContractModal(false)}
              className="flex-1 bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setShowContractModal(false)
                setShowBookingModal(true)
              }}
              disabled={!contractAccepted}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white disabled:opacity-40"
            >
              <Check className="w-4 h-4 mr-2" />
              Aceitar e Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
