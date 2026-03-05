'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  QrCode, Search, Check, X, Loader2, Calendar,
  Users, Ticket, CheckCircle2, AlertCircle, Camera,
  RefreshCw, ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'

interface Evento {
  id: string
  name: string
  date_time: string
  status: string
  max_participants?: number
}

interface TicketCheckin {
  id: string
  event_id: string
  mentorado_id: string
  codigo_ticket: string
  status: string
  valor_pago: number
  usado_em?: string
  created_at: string
}

export default function CheckInPage() {
  const { user } = useAuth()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [selectedEvento, setSelectedEvento] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [codigoManual, setCodigoManual] = useState('')
  const [processing, setProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null)
  const [recentCheckins, setRecentCheckins] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, usados: 0, pendentes: 0 })
  const [scannerActive, setScannerActive] = useState(false)
  const scannerRef = useRef<any>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadEventos()
  }, [])

  useEffect(() => {
    if (selectedEvento) {
      loadTicketData()
    }
  }, [selectedEvento])

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  const loadEventos = async () => {
    try {
      const { data } = await supabase
        .from('group_events')
        .select('id, name, date_time, status, max_participants')
        .in('status', ['scheduled', 'live'])
        .eq('visivel_mentorados', true)
        .order('date_time', { ascending: true })

      if (data) setEventos(data)
    } catch (err) {
      console.error('Erro ao carregar eventos:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTicketData = async () => {
    if (!selectedEvento) return

    // Stats
    const { data: tickets } = await supabase
      .from('evento_tickets')
      .select('id, status, usado_em, codigo_ticket, mentorado_id')
      .eq('event_id', selectedEvento)

    if (tickets) {
      const total = tickets.length
      const usados = tickets.filter(t => t.status === 'usado').length
      setStats({ total, usados, pendentes: total - usados })
    }

    // Recent check-ins
    const { data: checkins } = await supabase
      .from('evento_tickets')
      .select('*')
      .eq('event_id', selectedEvento)
      .eq('status', 'usado')
      .order('usado_em', { ascending: false })
      .limit(20)

    if (checkins) {
      // Load mentorado names
      const mentoradoIds = [...new Set(checkins.map(c => c.mentorado_id))]
      const names: Record<string, string> = {}
      for (const mid of mentoradoIds) {
        const { data: m } = await supabase
          .from('mentorados')
          .select('nome_completo')
          .eq('id', mid)
          .single()
        if (m) names[mid] = m.nome_completo
      }
      setRecentCheckins(checkins.map(c => ({ ...c, nome: names[c.mentorado_id] || 'Desconhecido' })))
    }
  }

  const processCheckin = async (codigo: string) => {
    if (!codigo.trim() || processing) return
    setProcessing(true)
    setLastResult(null)

    try {
      // Try to parse QR JSON data
      let ticketCode = codigo.trim()
      try {
        const qrData = JSON.parse(codigo)
        if (qrData.codigo) ticketCode = qrData.codigo
      } catch {
        // Not JSON, use as-is
      }

      // Find ticket
      const query = supabase
        .from('evento_tickets')
        .select('*')
        .eq('codigo_ticket', ticketCode)

      if (selectedEvento) {
        query.eq('event_id', selectedEvento)
      }

      const { data: tickets } = await query

      if (!tickets || tickets.length === 0) {
        setLastResult({ type: 'error', message: `Codigo invalido: ${ticketCode}` })
        toast.error('Codigo de ingresso nao encontrado')
        return
      }

      const ticket = tickets[0]

      if (ticket.status === 'usado') {
        const usadoEm = ticket.usado_em ? new Date(ticket.usado_em).toLocaleString('pt-BR') : ''
        setLastResult({ type: 'warning', message: `Ingresso ja utilizado em ${usadoEm}` })
        toast.warning('Este ingresso ja foi utilizado!')
        return
      }

      if (ticket.status === 'cancelado') {
        setLastResult({ type: 'error', message: 'Ingresso cancelado' })
        toast.error('Este ingresso foi cancelado')
        return
      }

      // Mark as used
      await supabase
        .from('evento_tickets')
        .update({ status: 'usado', usado_em: new Date().toISOString() })
        .eq('id', ticket.id)

      // Get mentorado name
      const { data: ment } = await supabase
        .from('mentorados')
        .select('nome_completo')
        .eq('id', ticket.mentorado_id)
        .single()

      const nome = ment?.nome_completo || 'Mentorado'
      setLastResult({ type: 'success', message: `Check-in realizado: ${nome}` })
      toast.success(`Check-in: ${nome}`)

      // Refresh data
      loadTicketData()
    } catch (err) {
      console.error('Erro no check-in:', err)
      setLastResult({ type: 'error', message: 'Erro ao processar check-in' })
      toast.error('Erro ao processar check-in')
    } finally {
      setProcessing(false)
      setCodigoManual('')
    }
  }

  const startScanner = async () => {
    if (scannerRef.current) return
    setScannerActive(true)

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          processCheckin(decodedText)
          stopScanner()
        },
        () => {}
      )
    } catch (err) {
      console.error('Erro ao iniciar scanner:', err)
      toast.error('Nao foi possivel acessar a camera')
      setScannerActive(false)
    }
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().catch(() => {})
      } catch {}
      scannerRef.current = null
    }
    setScannerActive(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <Header />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header />
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <QrCode className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Check-in de Eventos</h1>
            <p className="text-sm text-gray-500">Escaneie o QR code do ingresso ou digite o codigo</p>
          </div>
        </div>

        {/* Event Selection */}
        <Card>
          <CardContent className="p-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Selecione o evento</label>
            <select
              value={selectedEvento}
              onChange={(e) => setSelectedEvento(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">-- Escolha um evento --</option>
              {eventos.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} — {new Date(ev.date_time).toLocaleDateString('pt-BR')}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {selectedEvento && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Ticket className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-500">Total Ingressos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                  <p className="text-2xl font-bold text-emerald-600">{stats.usados}</p>
                  <p className="text-xs text-gray-500">Check-ins</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <AlertCircle className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                  <p className="text-2xl font-bold text-amber-600">{stats.pendentes}</p>
                  <p className="text-xs text-gray-500">Pendentes</p>
                </CardContent>
              </Card>
            </div>

            {/* Scanner + Manual Input */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* QR Scanner */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Scanner QR Code
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div id="qr-reader" ref={scannerContainerRef} className="w-full rounded-lg overflow-hidden mb-3" />
                  {!scannerActive ? (
                    <Button onClick={startScanner} className="w-full bg-emerald-600 hover:bg-emerald-700">
                      <Camera className="w-4 h-4 mr-2" />
                      Abrir Camera
                    </Button>
                  ) : (
                    <Button onClick={stopScanner} variant="outline" className="w-full">
                      <X className="w-4 h-4 mr-2" />
                      Fechar Camera
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Manual Input */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Codigo Manual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Ex: TKT-A1B2C3D4"
                    value={codigoManual}
                    onChange={(e) => setCodigoManual(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') processCheckin(codigoManual)
                    }}
                    className="text-lg font-mono"
                  />
                  <Button
                    onClick={() => processCheckin(codigoManual)}
                    disabled={!codigoManual.trim() || processing}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Validar Ingresso
                  </Button>

                  {/* Result feedback */}
                  {lastResult && (
                    <div className={`p-4 rounded-xl border-2 text-center ${
                      lastResult.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
                      lastResult.type === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-800' :
                      'bg-red-50 border-red-300 text-red-800'
                    }`}>
                      {lastResult.type === 'success' && <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />}
                      {lastResult.type === 'warning' && <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />}
                      {lastResult.type === 'error' && <X className="w-8 h-8 mx-auto mb-2 text-red-500" />}
                      <p className="font-semibold">{lastResult.message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Check-ins */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Check-ins Recentes</CardTitle>
                  <Button variant="ghost" size="sm" onClick={loadTicketData}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentCheckins.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Nenhum check-in realizado ainda</p>
                ) : (
                  <div className="space-y-2">
                    {recentCheckins.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                            <p className="text-xs text-gray-400 font-mono">{c.codigo_ticket}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {c.usado_em ? new Date(c.usado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
