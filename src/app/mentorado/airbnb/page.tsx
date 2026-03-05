'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Search, MapPin, Star, Building2, Plus, Filter, X,
  Wifi, Car, Users, Wind, Zap, Camera, Stethoscope,
  Shield, Accessibility, Bath, ChevronRight, Heart,
  DollarSign, Clock, Home, Loader2, ImageIcon, ArrowLeft,
  CheckCircle2, Award
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
  updated_at: string
  // Computed
  nota_media?: number
  total_avaliacoes?: number
  owner_nome?: string
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

const estadosBrasil = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
]

export default function AirbnbPage() {
  const { mentorado } = useMentoradoAuth()
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creatingClinica, setCreatingClinica] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // Filters
  const [filterCidade, setFilterCidade] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterPrecoMin, setFilterPrecoMin] = useState('')
  const [filterPrecoMax, setFilterPrecoMax] = useState('')
  const [filterAmenidades, setFilterAmenidades] = useState<string[]>([])

  // New clinica form
  const [newClinica, setNewClinica] = useState({
    titulo: '',
    descricao: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    bairro: '',
    preco_por_turno: '',
    preco_por_dia: '',
    preco_por_mes: '',
    numero_salas: '1',
    area_m2: '',
    especialidades_recomendadas: '',
    horario_funcionamento: '',
    regras: '',
    foto_capa: '',
    // Amenidades
    tem_videomaker: false,
    tem_recepcionista: false,
    tem_estacionamento: false,
    tem_wifi: false,
    tem_ar_condicionado: false,
    tem_sala_espera: false,
    tem_raio_x: false,
    tem_autoclave: false,
    tem_banheiro_privativo: false,
    tem_acessibilidade: false,
  })

  useEffect(() => {
    if (mentorado) loadClinicas()
  }, [mentorado])

  const loadClinicas = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('clinicas')
        .select('*')
        .eq('status', 'ativa')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Load ratings for each clinic
      const clinicasWithRatings = await Promise.all((data || []).map(async (clinica: Clinica) => {
        const { data: avaliacoes } = await supabase
          .from('clinica_avaliacoes')
          .select('nota')
          .eq('clinica_id', clinica.id)

        const { data: ownerData } = await supabase
          .from('mentorados')
          .select('nome_completo')
          .eq('id', clinica.owner_mentorado_id)
          .single()

        const notas = avaliacoes?.map((a: any) => a.nota) || []
        return {
          ...clinica,
          nota_media: notas.length > 0 ? notas.reduce((a: number, b: number) => a + b, 0) / notas.length : 0,
          total_avaliacoes: notas.length,
          owner_nome: ownerData?.nome_completo || 'Proprietario',
        }
      }))

      setClinicas(clinicasWithRatings)
    } catch (err) {
      console.error('Error loading clinicas:', err)
      toast.error('Erro ao carregar clinicas')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClinica = async () => {
    if (!newClinica.titulo.trim() || !newClinica.cidade.trim()) {
      toast.error('Preencha titulo e cidade')
      return
    }

    try {
      setCreatingClinica(true)
      const { error } = await supabase
        .from('clinicas')
        .insert({
          organization_id: '9c8c0033-15ea-4e33-a55f-28d81a19693b',
          owner_mentorado_id: mentorado?.id,
          titulo: newClinica.titulo,
          descricao: newClinica.descricao || null,
          endereco: newClinica.endereco || null,
          cidade: newClinica.cidade,
          estado: newClinica.estado || null,
          cep: newClinica.cep || null,
          bairro: newClinica.bairro || null,
          preco_por_turno: parseFloat(newClinica.preco_por_turno) || 0,
          preco_por_dia: parseFloat(newClinica.preco_por_dia) || 0,
          preco_por_mes: parseFloat(newClinica.preco_por_mes) || 0,
          numero_salas: parseInt(newClinica.numero_salas) || 1,
          area_m2: newClinica.area_m2 ? parseFloat(newClinica.area_m2) : null,
          especialidades_recomendadas: newClinica.especialidades_recomendadas || null,
          horario_funcionamento: newClinica.horario_funcionamento || null,
          regras: newClinica.regras || null,
          foto_capa: newClinica.foto_capa || null,
          fotos: [],
          tem_videomaker: newClinica.tem_videomaker,
          tem_recepcionista: newClinica.tem_recepcionista,
          tem_estacionamento: newClinica.tem_estacionamento,
          tem_wifi: newClinica.tem_wifi,
          tem_ar_condicionado: newClinica.tem_ar_condicionado,
          tem_sala_espera: newClinica.tem_sala_espera,
          tem_raio_x: newClinica.tem_raio_x,
          tem_autoclave: newClinica.tem_autoclave,
          tem_banheiro_privativo: newClinica.tem_banheiro_privativo,
          tem_acessibilidade: newClinica.tem_acessibilidade,
          status: 'em_revisao',
        })

      if (error) throw error

      toast.success('Clinica enviada para revisao!')
      setShowCreateModal(false)
      setNewClinica({
        titulo: '', descricao: '', endereco: '', cidade: '', estado: '', cep: '', bairro: '',
        preco_por_turno: '', preco_por_dia: '', preco_por_mes: '',
        numero_salas: '1', area_m2: '', especialidades_recomendadas: '', horario_funcionamento: '', regras: '', foto_capa: '',
        tem_videomaker: false, tem_recepcionista: false, tem_estacionamento: false,
        tem_wifi: false, tem_ar_condicionado: false, tem_sala_espera: false,
        tem_raio_x: false, tem_autoclave: false, tem_banheiro_privativo: false, tem_acessibilidade: false,
      })
      loadClinicas()
    } catch (err) {
      console.error('Error creating clinica:', err)
      toast.error('Erro ao criar clinica')
    } finally {
      setCreatingClinica(false)
    }
  }

  const toggleAmenidadeFilter = (amenidade: string) => {
    setFilterAmenidades(prev =>
      prev.includes(amenidade)
        ? prev.filter(a => a !== amenidade)
        : [...prev, amenidade]
    )
  }

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredClinicas = useMemo(() => {
    const filtered = clinicas.filter(c => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        if (!c.titulo.toLowerCase().includes(term) &&
            !c.cidade?.toLowerCase().includes(term) &&
            !c.bairro?.toLowerCase().includes(term) &&
            !c.estado?.toLowerCase().includes(term)) {
          return false
        }
      }
      if (filterCidade && c.cidade?.toLowerCase() !== filterCidade.toLowerCase()) return false
      if (filterEstado && c.estado !== filterEstado) return false
      if (filterPrecoMin && c.preco_por_turno < parseFloat(filterPrecoMin)) return false
      if (filterPrecoMax && c.preco_por_turno > parseFloat(filterPrecoMax)) return false
      if (filterAmenidades.length > 0) {
        for (const amenidade of filterAmenidades) {
          if (!(c as any)[amenidade]) return false
        }
      }
      return true
    })
    // Destaque clinics first
    return filtered.sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0))
  }, [clinicas, searchTerm, filterCidade, filterEstado, filterPrecoMin, filterPrecoMax, filterAmenidades])

  const activeFiltersCount = [filterCidade, filterEstado, filterPrecoMin, filterPrecoMax].filter(Boolean).length + filterAmenidades.length

  const clearFilters = () => {
    setFilterCidade('')
    setFilterEstado('')
    setFilterPrecoMin('')
    setFilterPrecoMax('')
    setFilterAmenidades([])
  }

  const getClinicaAmenidades = (clinica: Clinica) => {
    return Object.entries(amenidadeConfig).filter(([key]) => (clinica as any)[key])
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
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-[#0a0a0a] to-orange-900/10" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3" />

        <div className="relative px-4 md:px-8 pt-8 pb-6">
          <Link
            href="/mentorado"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-[28px] md:text-[36px] font-extrabold text-white leading-tight">
                    Airbnb para Medicos
                  </h1>
                  <p className="text-gray-500 text-sm">Encontre a clinica perfeita para atender</p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              <Plus className="w-5 h-5 mr-2" />
              Anunciar Minha Clinica
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mt-6 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cidade, bairro, titulo..."
                className="pl-12 pr-4 py-3 h-12 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-gray-600 rounded-xl focus-visible:ring-amber-500/30 text-[15px]"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-12 px-4 rounded-xl border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.06] ${showFilters ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : ''}`}
            >
              <Filter className="w-5 h-5 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="ml-2 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-5 bg-white/[0.03] border border-white/[0.06] rounded-2xl space-y-5 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Filtros</h3>
                {activeFiltersCount > 0 && (
                  <button onClick={clearFilters} className="text-amber-400 text-xs hover:text-amber-300 transition-colors">
                    Limpar filtros
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold">Cidade</Label>
                  <Input
                    value={filterCidade}
                    onChange={(e) => setFilterCidade(e.target.value)}
                    placeholder="Ex: Sao Paulo"
                    className="bg-white/[0.03] border-white/[0.06] text-white text-sm placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold">Estado</Label>
                  <Select value={filterEstado} onValueChange={setFilterEstado}>
                    <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a20] border-white/[0.06]">
                      <SelectItem value="all" className="text-white focus:bg-white/[0.06]">Todos</SelectItem>
                      {estadosBrasil.map(uf => (
                        <SelectItem key={uf} value={uf} className="text-white focus:bg-white/[0.06]">{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold">Preco min (turno)</Label>
                  <Input
                    type="number"
                    value={filterPrecoMin}
                    onChange={(e) => setFilterPrecoMin(e.target.value)}
                    placeholder="R$ 0"
                    className="bg-white/[0.03] border-white/[0.06] text-white text-sm placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold">Preco max (turno)</Label>
                  <Input
                    type="number"
                    value={filterPrecoMax}
                    onChange={(e) => setFilterPrecoMax(e.target.value)}
                    placeholder="R$ 999"
                    className="bg-white/[0.03] border-white/[0.06] text-white text-sm placeholder:text-gray-600"
                  />
                </div>
              </div>

              {/* Amenidades filter */}
              <div>
                <Label className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold mb-3 block">Amenidades</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(amenidadeConfig).map(([key, { icon: Icon, label }]) => (
                    <button
                      key={key}
                      onClick={() => toggleAmenidadeFilter(key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filterAmenidades.includes(key)
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                          : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="px-4 md:px-8 py-4">
        <p className="text-gray-500 text-sm">
          {loading ? 'Carregando...' : `${filteredClinicas.length} clinica${filteredClinicas.length !== 1 ? 's' : ''} encontrada${filteredClinicas.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Clinics Grid */}
      <div className="px-4 md:px-8 pb-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-[#141414] rounded-2xl overflow-hidden border border-white/5 animate-pulse">
                <div className="aspect-[4/3] bg-white/5" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-white/5 rounded-full w-3/4" />
                  <div className="h-3 bg-white/[0.03] rounded-full w-1/2" />
                  <div className="h-3 bg-white/[0.03] rounded-full w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredClinicas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-white/[0.03] flex items-center justify-center mb-4">
              <Building2 className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Nenhuma clinica encontrada</h3>
            <p className="text-gray-500 text-sm text-center max-w-md mb-6">
              {activeFiltersCount > 0
                ? 'Tente ajustar os filtros para encontrar mais resultados.'
                : 'Seja o primeiro a anunciar sua clinica!'}
            </p>
            {activeFiltersCount > 0 ? (
              <Button variant="outline" onClick={clearFilters} className="border-white/10 text-gray-400 hover:text-white">
                Limpar filtros
              </Button>
            ) : (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Anunciar Clinica
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredClinicas.map((clinica, index) => (
              <Link
                key={clinica.id}
                href={`/mentorado/airbnb/${clinica.id}`}
                className={`group bg-[#141414] rounded-2xl overflow-hidden border transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${
                  clinica.destaque
                    ? 'border-amber-500/30 hover:border-amber-400/50 hover:shadow-amber-500/10 ring-1 ring-amber-500/10'
                    : 'border-white/5 hover:border-white/15 hover:shadow-amber-500/5'
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] bg-gradient-to-br from-amber-900/20 to-orange-900/10 overflow-hidden">
                  {clinica.foto_capa ? (
                    <img
                      src={clinica.foto_capa}
                      alt={clinica.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-12 h-12 text-gray-700" />
                    </div>
                  )}
                  {/* Favorite button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleFavorite(clinica.id)
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-black/60 transition-all"
                  >
                    <Heart className={`w-4 h-4 ${favorites.has(clinica.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                  </button>
                  {/* Status / Destaque / Verified badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {clinica.destaque && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/90 backdrop-blur-md rounded-lg text-[10px] font-semibold text-white uppercase tracking-wider">
                        <Award className="w-3 h-3" />
                        Destaque
                      </div>
                    )}
                    {clinica.fotos_verificadas && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-500/90 backdrop-blur-md rounded-lg text-[10px] font-semibold text-white uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" />
                        Verificado
                      </div>
                    )}
                    {clinica.status === 'em_revisao' && (
                      <div className="px-2.5 py-1 bg-gray-500/90 backdrop-blur-md rounded-lg text-[10px] font-semibold text-white uppercase tracking-wider">
                        Em revisao
                      </div>
                    )}
                  </div>
                  {/* Price overlay */}
                  <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg">
                    <span className="text-white font-bold text-sm">
                      R$ {(clinica.preco_por_turno || 0).toFixed(0)}
                    </span>
                    <span className="text-gray-300 text-xs ml-1">/turno</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-white font-semibold text-[15px] leading-tight line-clamp-1 group-hover:text-amber-300 transition-colors">
                      {clinica.titulo}
                    </h3>
                    {clinica.nota_media && clinica.nota_media > 0 ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-white text-xs font-semibold">{clinica.nota_media.toFixed(1)}</span>
                        <span className="text-gray-600 text-xs">({clinica.total_avaliacoes})</span>
                      </div>
                    ) : (
                      <span className="text-gray-600 text-[10px] uppercase tracking-wider shrink-0">Novo</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-3">
                    <MapPin className="w-3 h-3" />
                    <span>{[clinica.bairro, clinica.cidade, clinica.estado].filter(Boolean).join(', ') || 'Local nao informado'}</span>
                  </div>

                  {/* Amenidades preview */}
                  <div className="flex flex-wrap gap-1.5">
                    {getClinicaAmenidades(clinica).slice(0, 4).map(([key, { icon: Icon, label }]) => (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/[0.04] rounded-md text-gray-500 text-[10px]"
                      >
                        <Icon className="w-2.5 h-2.5" />
                        {label}
                      </span>
                    ))}
                    {getClinicaAmenidades(clinica).length > 4 && (
                      <span className="text-gray-600 text-[10px] px-1">
                        +{getClinicaAmenidades(clinica).length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Clinica Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-3xl bg-[#141418] border-white/[0.06] backdrop-blur-xl shadow-2xl shadow-black/40 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <Building2 className="w-5 h-5 text-amber-400" />
              </div>
              Anunciar Minha Clinica
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Basic Info */}
            <div>
              <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-[10px] font-bold">1</div>
                Informacoes Basicas
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-gray-400 text-xs">Titulo do Anuncio *</Label>
                  <Input
                    value={newClinica.titulo}
                    onChange={(e) => setNewClinica(p => ({ ...p, titulo: e.target.value }))}
                    placeholder="Ex: Consultorio Premium - Centro SP"
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-gray-400 text-xs">Descricao</Label>
                  <Textarea
                    value={newClinica.descricao}
                    onChange={(e) => setNewClinica(p => ({ ...p, descricao: e.target.value }))}
                    placeholder="Descreva sua clinica, diferenciais, equipamentos..."
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 resize-none min-h-[80px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">URL da Foto de Capa</Label>
                  <Input
                    value={newClinica.foto_capa}
                    onChange={(e) => setNewClinica(p => ({ ...p, foto_capa: e.target.value }))}
                    placeholder="https://..."
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-gray-400 text-xs">N. Salas</Label>
                    <Input
                      type="number"
                      value={newClinica.numero_salas}
                      onChange={(e) => setNewClinica(p => ({ ...p, numero_salas: e.target.value }))}
                      className="bg-white/[0.03] border-white/[0.06] text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-400 text-xs">Area (m2)</Label>
                    <Input
                      type="number"
                      value={newClinica.area_m2}
                      onChange={(e) => setNewClinica(p => ({ ...p, area_m2: e.target.value }))}
                      className="bg-white/[0.03] border-white/[0.06] text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-[10px] font-bold">2</div>
                Localizacao
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-gray-400 text-xs">Endereco</Label>
                  <Input
                    value={newClinica.endereco}
                    onChange={(e) => setNewClinica(p => ({ ...p, endereco: e.target.value }))}
                    placeholder="Rua, numero"
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Bairro</Label>
                  <Input
                    value={newClinica.bairro}
                    onChange={(e) => setNewClinica(p => ({ ...p, bairro: e.target.value }))}
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">CEP</Label>
                  <Input
                    value={newClinica.cep}
                    onChange={(e) => setNewClinica(p => ({ ...p, cep: e.target.value }))}
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Cidade *</Label>
                  <Input
                    value={newClinica.cidade}
                    onChange={(e) => setNewClinica(p => ({ ...p, cidade: e.target.value }))}
                    placeholder="Sao Paulo"
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Estado</Label>
                  <Select value={newClinica.estado} onValueChange={(v) => setNewClinica(p => ({ ...p, estado: v }))}>
                    <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a20] border-white/[0.06]">
                      {estadosBrasil.map(uf => (
                        <SelectItem key={uf} value={uf} className="text-white focus:bg-white/[0.06]">{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-[10px] font-bold">3</div>
                Precos
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Por Turno (R$)</Label>
                  <Input
                    type="number"
                    value={newClinica.preco_por_turno}
                    onChange={(e) => setNewClinica(p => ({ ...p, preco_por_turno: e.target.value }))}
                    placeholder="0,00"
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Por Dia (R$)</Label>
                  <Input
                    type="number"
                    value={newClinica.preco_por_dia}
                    onChange={(e) => setNewClinica(p => ({ ...p, preco_por_dia: e.target.value }))}
                    placeholder="0,00"
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Por Mes (R$)</Label>
                  <Input
                    type="number"
                    value={newClinica.preco_por_mes}
                    onChange={(e) => setNewClinica(p => ({ ...p, preco_por_mes: e.target.value }))}
                    placeholder="0,00"
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Amenidades */}
            <div>
              <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-[10px] font-bold">4</div>
                Amenidades
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {Object.entries(amenidadeConfig).map(([key, { icon: Icon, label }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setNewClinica(p => ({ ...p, [key]: !(p as any)[key] }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      (newClinica as any)[key]
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                        : 'bg-white/[0.02] border border-white/[0.06] text-gray-500 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Extra info */}
            <div>
              <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-[10px] font-bold">5</div>
                Informacoes Adicionais
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Especialidades Recomendadas</Label>
                  <Input
                    value={newClinica.especialidades_recomendadas}
                    onChange={(e) => setNewClinica(p => ({ ...p, especialidades_recomendadas: e.target.value }))}
                    placeholder="Dermatologia, Estetica..."
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Horario de Funcionamento</Label>
                  <Input
                    value={newClinica.horario_funcionamento}
                    onChange={(e) => setNewClinica(p => ({ ...p, horario_funcionamento: e.target.value }))}
                    placeholder="Seg-Sex 8h-18h"
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-gray-400 text-xs">Regras</Label>
                  <Textarea
                    value={newClinica.regras}
                    onChange={(e) => setNewClinica(p => ({ ...p, regras: e.target.value }))}
                    placeholder="Regras de uso do espaco..."
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-gray-600 resize-none min-h-[60px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-white/[0.06]">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateClinica}
              disabled={creatingClinica || !newClinica.titulo.trim() || !newClinica.cidade.trim()}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20 disabled:opacity-40"
            >
              {creatingClinica ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {creatingClinica ? 'Enviando...' : 'Anunciar Clinica'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
