'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import {
  Search, Star, Building2, Plus, X,
  Wifi, Car, Users, Wind, Zap, Camera, Stethoscope,
  Shield, Accessibility, Bath, Heart,
  Home, Loader2, ArrowLeft,
  CheckCircle2, Award, SlidersHorizontal, Upload, ImagePlus
} from 'lucide-react'
import { useMentoradoAuth } from '@/contexts/mentorado-auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { toast } from 'sonner'
import { isBetaUser } from '@/lib/beta-access'
import { compressImage } from '@/lib/image-compress'

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
  nota_media?: number
  total_avaliacoes?: number
  owner_nome?: string
  motivo_rejeicao?: string
  revisado_em?: string
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

const fixImageUrl = (url: string) => {
  if (!url) return ''
  return url.replace('http://', 'https://')
}

const estadosBrasil = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
]

export default function AirbnbPage() {
  const { mentorado } = useMentoradoAuth()
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [meusAnuncios, setMeusAnuncios] = useState<Clinica[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeView, setActiveView] = useState<'explorar' | 'meus'>('explorar')
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creatingClinica, setCreatingClinica] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [clinicaPhotos, setClinicaPhotos] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(1)

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

  const handlePhotoUpload = async (files: FileList) => {
    setUploadingPhotos(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'
      const token = localStorage.getItem('cs_auth_token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        // Compress image before upload to avoid 413 errors
        const compressed = await compressImage(file)
        const formData = new FormData()
        formData.append('file', compressed)
        const res = await fetch(`${apiUrl}/api/upload`, { method: 'POST', body: formData, headers })
        if (!res.ok) {
          const errText = await res.text()
          console.error(`Upload falhou (${res.status}):`, errText)
          toast.error(`Erro no upload: ${res.status === 413 ? 'Imagem muito grande' : res.status === 401 ? 'Sessao expirada, faca login novamente' : 'Erro no servidor'}`)
          continue
        }
        const result = await res.json()
        if (result.success && result.url) {
          uploaded.push(result.url)
        }
      }
      setClinicaPhotos(prev => [...prev, ...uploaded])
      if (uploaded.length > 0) {
        toast.success(`${uploaded.length} foto(s) enviada(s)!`)
      }
    } catch (err) {
      console.error('Erro no upload:', err)
      toast.error('Erro ao enviar fotos')
    } finally {
      setUploadingPhotos(false)
    }
  }

  const removePhoto = (index: number) => {
    setClinicaPhotos(prev => prev.filter((_, i) => i !== index))
  }

  useEffect(() => {
    if (mentorado) {
      loadClinicas()
      loadMeusAnuncios()
    }
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

  const loadMeusAnuncios = async () => {
    if (!mentorado?.id) return
    try {
      const { data, error } = await supabase
        .from('clinicas')
        .select('*')
        .eq('owner_mentorado_id', mentorado.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setMeusAnuncios(data || [])
    } catch (err) {
      console.error('Error loading meus anuncios:', err)
    }
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 2:
        if (!newClinica.titulo.trim()) {
          toast.error('Preencha o titulo do anuncio')
          return false
        }
        return true
      case 3:
        if (!newClinica.cidade.trim()) {
          toast.error('Preencha a cidade')
          return false
        }
        return true
      case 4:
        if (!newClinica.preco_por_turno || parseFloat(newClinica.preco_por_turno) <= 0) {
          toast.error('Preencha o preco por turno')
          return false
        }
        return true
      default:
        return true
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(s => s + 1)
    }
  }

  const handleCreateClinica = async () => {
    if (!newClinica.titulo.trim() || !newClinica.cidade.trim()) {
      toast.error('Preencha titulo e cidade')
      return
    }
    if (!newClinica.preco_por_turno || parseFloat(newClinica.preco_por_turno) <= 0) {
      toast.error('Preencha o preco por turno')
      return
    }

    try {
      setCreatingClinica(true)
      const insertData: any = {
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
        foto_capa: clinicaPhotos.length > 0 ? clinicaPhotos[0] : null,
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
      }

      // Only send fotos if there are actual photos
      if (clinicaPhotos.length > 0) {
        insertData.fotos = clinicaPhotos
      }

      const { error } = await supabase
        .from('clinicas')
        .insert(insertData)

      if (error) throw error

      toast.success('Clinica enviada para revisao!')
      setShowCreateModal(false)
      setClinicaPhotos([])
      setCurrentStep(1)
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
      toast.error('Erro ao criar clinica: ' + ((err as any)?.message || 'Erro desconhecido'))
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
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="p-8 bg-white border border-gray-200 shadow-lg max-w-md w-full text-center rounded-2xl">
          <Shield className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-gray-500 mb-6">Esta funcionalidade esta em fase beta e disponivel apenas para usuarios selecionados.</p>
          <Link href="/mentorado">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl px-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Portal
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ===== STICKY HEADER / NAVBAR ===== */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[2520px] mx-auto px-4 sm:px-6 md:px-10 xl:px-20">
          {/* Top row: Logo + nav */}
          <div className="flex items-center justify-between h-16">
            {/* Left: back + brand */}
            <div className="flex items-center gap-4">
              <Link
                href="/mentorado"
                className="text-gray-500 hover:text-gray-900 transition-colors p-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Link href="/mentorado/airbnb" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-white" />
                </div>
                <span className="hidden sm:block text-xl font-bold text-emerald-500 tracking-tight">
                  clinicbnb
                </span>
              </Link>
              {/* Tabs */}
              <div className="flex items-center gap-1 ml-6">
                <button
                  onClick={() => setActiveView('explorar')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeView === 'explorar' ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                  Explorar
                </button>
                <button
                  onClick={() => setActiveView('meus')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeView === 'meus' ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                  Meus Anúncios
                  {meusAnuncios.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                      {meusAnuncios.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Right: CTA */}
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold rounded-full px-5 h-10 shadow-md shadow-emerald-500/20 transition-all hover:shadow-lg hover:shadow-emerald-500/30 active:scale-[0.97]"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Anunciar Clinica
            </Button>
          </div>

          {/* Search bar row */}
          <div className="py-3 pb-4">
            <div className="flex items-center gap-3 max-w-3xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por cidade, bairro ou nome da clinica..."
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all shadow-sm hover:shadow-md"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                  >
                    <X className="w-3 h-3 text-gray-600" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-full border text-sm font-medium transition-all shrink-0 ${
                  showFilters || activeFiltersCount > 0
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filtros</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ===== FILTERS PANEL ===== */}
      {showFilters && (
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-[2520px] mx-auto px-4 sm:px-6 md:px-10 xl:px-20 py-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 font-semibold text-sm">Filtros</h3>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-emerald-500 text-sm font-medium hover:text-emerald-600 transition-colors underline underline-offset-2"
                >
                  Limpar todos
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div className="space-y-1.5">
                <Label className="text-gray-500 text-xs font-medium">Cidade</Label>
                <Input
                  value={filterCidade}
                  onChange={(e) => setFilterCidade(e.target.value)}
                  placeholder="Ex: Sao Paulo"
                  className="bg-white border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-300 h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-500 text-xs font-medium">Estado</Label>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger className="bg-white border-gray-200 text-gray-900 rounded-xl h-10">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 rounded-xl">
                    <SelectItem value="all" className="text-gray-700">Todos</SelectItem>
                    {estadosBrasil.map(uf => (
                      <SelectItem key={uf} value={uf} className="text-gray-700">{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-500 text-xs font-medium">Preco min (turno)</Label>
                <Input
                  type="number"
                  value={filterPrecoMin}
                  onChange={(e) => setFilterPrecoMin(e.target.value)}
                  placeholder="R$ 0"
                  className="bg-white border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-300 h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-500 text-xs font-medium">Preco max (turno)</Label>
                <Input
                  type="number"
                  value={filterPrecoMax}
                  onChange={(e) => setFilterPrecoMax(e.target.value)}
                  placeholder="R$ 999"
                  className="bg-white border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-300 h-10"
                />
              </div>
            </div>

            {/* Amenidades filter pills */}
            <div>
              <Label className="text-gray-500 text-xs font-medium mb-3 block">Amenidades</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(amenidadeConfig).map(([key, { icon: Icon, label }]) => (
                  <button
                    key={key}
                    onClick={() => toggleAmenidadeFilter(key)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all border ${
                      filterAmenidades.includes(key)
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MEUS ANÚNCIOS VIEW ===== */}
      {activeView === 'meus' && (
        <div className="max-w-[2520px] mx-auto px-4 sm:px-6 md:px-10 xl:px-20 pt-6 pb-16">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Meus Anúncios</h2>
          {meusAnuncios.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">Você ainda não anunciou nenhuma clínica</p>
              <Button onClick={() => setShowCreateModal(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">
                <Plus className="w-4 h-4 mr-2" /> Anunciar Clínica
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {meusAnuncios.map(anuncio => (
                <div key={anuncio.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{anuncio.titulo}</h3>
                      <p className="text-gray-500 text-sm mt-0.5">
                        {[anuncio.bairro, anuncio.cidade, anuncio.estado].filter(Boolean).join(', ')}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        Criado em {new Date(anuncio.created_at).toLocaleDateString('pt-BR')}
                        {anuncio.revisado_em && ` · Revisado em ${new Date(anuncio.revisado_em).toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                    <div className="ml-4">
                      {anuncio.status === 'ativa' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aprovada
                        </span>
                      )}
                      {anuncio.status === 'em_revisao' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Em Revisão
                        </span>
                      )}
                      {anuncio.status === 'inativa' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                          <X className="w-3.5 h-3.5" /> Rejeitada
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Show rejection reason if rejected */}
                  {anuncio.status === 'inativa' && anuncio.motivo_rejeicao && (
                    <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3">
                      <p className="text-xs text-red-500 font-medium mb-0.5">Motivo da rejeição:</p>
                      <p className="text-sm text-red-700">{anuncio.motivo_rejeicao}</p>
                    </div>
                  )}
                  {/* Pricing info */}
                  <div className="mt-3 flex gap-4 text-sm text-gray-600">
                    {Number(anuncio.preco_por_turno) > 0 && <span>R$ {Number(anuncio.preco_por_turno).toFixed(0)}/turno</span>}
                    {Number(anuncio.preco_por_dia) > 0 && <span>R$ {Number(anuncio.preco_por_dia).toFixed(0)}/dia</span>}
                    {Number(anuncio.preco_por_mes) > 0 && <span>R$ {Number(anuncio.preco_por_mes).toFixed(0)}/mês</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== RESULTS COUNT ===== */}
      {activeView === 'explorar' && <div className="max-w-[2520px] mx-auto px-4 sm:px-6 md:px-10 xl:px-20 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <p className="text-gray-600 text-sm font-medium">
            {loading
              ? 'Carregando clinicas...'
              : `${filteredClinicas.length} clinica${filteredClinicas.length !== 1 ? 's' : ''} encontrada${filteredClinicas.length !== 1 ? 's' : ''}`
            }
          </p>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Limpar filtros
            </button>
          )}
        </div>
      </div>}

      {/* ===== CLINICS GRID ===== */}
      {activeView === 'explorar' && <main className="max-w-[2520px] mx-auto px-4 sm:px-6 md:px-10 xl:px-20 pb-16 pt-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-100 rounded-2xl mb-3" />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-100 rounded-full w-2/3" />
                    <div className="h-4 bg-gray-100 rounded-full w-12" />
                  </div>
                  <div className="h-3 bg-gray-50 rounded-full w-1/2" />
                  <div className="h-3 bg-gray-50 rounded-full w-1/3" />
                  <div className="h-4 bg-gray-100 rounded-full w-2/5 mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredClinicas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center mb-6">
              <Building2 className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-gray-900 font-semibold text-xl mb-2">Nenhuma clinica encontrada</h3>
            <p className="text-gray-500 text-sm text-center max-w-sm mb-8">
              {activeFiltersCount > 0
                ? 'Tente ajustar os filtros para encontrar mais resultados.'
                : 'Seja o primeiro a anunciar sua clinica na plataforma!'}
            </p>
            {activeFiltersCount > 0 ? (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full px-6"
              >
                Limpar filtros
              </Button>
            ) : (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                Anunciar Clinica
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredClinicas.map((clinica) => (
              <Link
                key={clinica.id}
                href={`/mentorado/airbnb/${clinica.id}`}
                className="group block"
              >
                {/* Image container */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-3">
                  {clinica.foto_capa || (clinica.fotos && clinica.fotos.length > 0) ? (
                    <img
                      src={fixImageUrl(clinica.foto_capa || clinica.fotos[0])}
                      alt={clinica.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                      <Building2 className="w-12 h-12 text-gray-300 mb-2" />
                      <span className="text-gray-400 text-xs">Sem foto</span>
                    </div>
                  )}

                  {/* Heart / favorite button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleFavorite(clinica.id)
                    }}
                    className="absolute top-3 right-3 p-2 transition-transform active:scale-90"
                  >
                    <Heart
                      className={`w-6 h-6 drop-shadow-md transition-colors ${
                        favorites.has(clinica.id)
                          ? 'fill-red-500 text-red-500'
                          : 'fill-black/40 text-white stroke-[2]'
                      }`}
                    />
                  </button>

                  {/* Superhost / Verified badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {clinica.destaque && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-white rounded-full text-[11px] font-semibold text-gray-900 shadow-sm">
                        <Award className="w-3 h-3 text-emerald-500" />
                        Superhost
                      </div>
                    )}
                    {clinica.fotos_verificadas && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-white rounded-full text-[11px] font-semibold text-gray-900 shadow-sm">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Verificado
                      </div>
                    )}
                  </div>
                </div>

                {/* Card content */}
                <div className="space-y-1">
                  {/* Row 1: Location + Rating */}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[15px] font-semibold text-gray-900 truncate">
                      {[clinica.cidade, clinica.estado].filter(Boolean).join(', ') || 'Local nao informado'}
                    </h3>
                    {clinica.nota_media && clinica.nota_media > 0 ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className="w-3.5 h-3.5 fill-gray-900 text-gray-900" />
                        <span className="text-sm font-medium text-gray-900">
                          {clinica.nota_media.toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({clinica.total_avaliacoes})
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 shrink-0 font-medium">Novo</span>
                    )}
                  </div>

                  {/* Row 2: Clinic name */}
                  <p className="text-sm text-gray-500 truncate">
                    {clinica.titulo}
                  </p>

                  {/* Row 3: Specialty / amenities preview */}
                  {clinica.especialidades_recomendadas ? (
                    <p className="text-sm text-gray-500 truncate">
                      {clinica.especialidades_recomendadas}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 truncate">
                      {getClinicaAmenidades(clinica).slice(0, 3).map(([, { label }]) => label).join(' - ') || `${clinica.numero_salas || 1} sala${(clinica.numero_salas || 1) > 1 ? 's' : ''}`}
                    </p>
                  )}

                  {/* Row 4: Price */}
                  <p className="text-[15px] text-gray-900 pt-1">
                    <span className="font-semibold">
                      R$ {(clinica.preco_por_turno || 0).toLocaleString('pt-BR')}
                    </span>
                    <span className="font-normal text-gray-500"> / turno</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>}

      {/* ===== CREATE CLINICA MODAL - STEP WIZARD ===== */}
      <Dialog open={showCreateModal} onOpenChange={(open) => { setShowCreateModal(open); if (!open) { setCurrentStep(1); setClinicaPhotos([]); } }}>
        <DialogContent className="sm:max-w-2xl bg-white border-gray-200 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-3 text-xl">
              <div className="p-2.5 rounded-xl bg-emerald-50">
                <Building2 className="w-5 h-5 text-emerald-500" />
              </div>
              Anunciar Minha Clinica
            </DialogTitle>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4, 5].map(step => (
              <button
                key={step}
                onClick={() => setCurrentStep(step)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  currentStep === step
                    ? 'bg-emerald-500 text-white'
                    : currentStep > step
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {currentStep > step ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{step}</span>}
                <span className="hidden sm:inline">
                  {step === 1 ? 'Fotos' : step === 2 ? 'Info' : step === 3 ? 'Local' : step === 4 ? 'Preco' : 'Extras'}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6">
            {/* Step 1: PHOTOS (first!) */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-gray-900 font-semibold mb-1">Fotos da Clinica</h4>
                  <p className="text-gray-500 text-sm mb-4">Adicione fotos para atrair mais mentorados. A primeira foto sera a capa.</p>
                </div>

                {/* Photo grid */}
                <div className="grid grid-cols-3 gap-3">
                  {clinicaPhotos.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                      <img src={fixImageUrl(url)} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                      {i === 0 && (
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                          CAPA
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Upload button */}
                  <label className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                    uploadingPhotos ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50'
                  }`}>
                    {uploadingPhotos ? (
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                    ) : (
                      <>
                        <ImagePlus className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-[11px] text-gray-400 font-medium">Adicionar</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) handlePhotoUpload(e.target.files)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>

                {clinicaPhotos.length === 0 && (
                  <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Camera className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">Nenhuma foto adicionada</p>
                    <p className="text-gray-400 text-xs mt-1">Clinicas com fotos recebem 3x mais interesse</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Basic Info */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-600 text-xs font-medium">Titulo do Anuncio *</Label>
                  <Input
                    value={newClinica.titulo}
                    onChange={(e) => setNewClinica(p => ({ ...p, titulo: e.target.value }))}
                    placeholder="Ex: Consultorio Premium - Centro SP"
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-600 text-xs font-medium">Descricao</Label>
                  <Textarea
                    value={newClinica.descricao}
                    onChange={(e) => setNewClinica(p => ({ ...p, descricao: e.target.value }))}
                    placeholder="Descreva sua clinica, diferenciais, equipamentos..."
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 resize-none min-h-[100px] rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-gray-600 text-xs font-medium">N. Salas</Label>
                    <Input
                      type="number"
                      value={newClinica.numero_salas}
                      onChange={(e) => setNewClinica(p => ({ ...p, numero_salas: e.target.value }))}
                      className="bg-white border-gray-200 text-gray-900 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-600 text-xs font-medium">Area (m2)</Label>
                    <Input
                      type="number"
                      value={newClinica.area_m2}
                      onChange={(e) => setNewClinica(p => ({ ...p, area_m2: e.target.value }))}
                      className="bg-white border-gray-200 text-gray-900 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-300"
                    />
                  </div>
                </div>
                {/* Amenidades */}
                <div>
                  <Label className="text-gray-600 text-xs font-medium mb-2 block">Amenidades</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(amenidadeConfig).map(([key, { icon: Icon, label }]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setNewClinica(p => ({ ...p, [key]: !(p as any)[key] }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                          (newClinica as any)[key]
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                            : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Location */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h4 className="text-gray-900 font-semibold mb-1">Localizacao</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-gray-600 text-xs font-medium">Endereco</Label>
                    <Input
                      value={newClinica.endereco}
                      onChange={(e) => setNewClinica(p => ({ ...p, endereco: e.target.value }))}
                      placeholder="Rua, numero"
                      className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-600 text-xs font-medium">Cidade *</Label>
                    <Input
                      value={newClinica.cidade}
                      onChange={(e) => setNewClinica(p => ({ ...p, cidade: e.target.value }))}
                      placeholder="Sao Paulo"
                      className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-600 text-xs font-medium">Estado</Label>
                    <Select value={newClinica.estado} onValueChange={(v) => setNewClinica(p => ({ ...p, estado: v }))}>
                      <SelectTrigger className="bg-white border-gray-200 text-gray-900 rounded-xl">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 rounded-xl">
                        {estadosBrasil.map(uf => (
                          <SelectItem key={uf} value={uf} className="text-gray-700">{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-600 text-xs font-medium">Bairro</Label>
                    <Input
                      value={newClinica.bairro}
                      onChange={(e) => setNewClinica(p => ({ ...p, bairro: e.target.value }))}
                      className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-600 text-xs font-medium">CEP</Label>
                    <Input
                      value={newClinica.cep}
                      onChange={(e) => setNewClinica(p => ({ ...p, cep: e.target.value }))}
                      className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Pricing */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h4 className="text-gray-900 font-semibold mb-1">Precos</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-1.5">
                    <Label className="text-emerald-700 text-sm font-semibold">Por Turno (R$)</Label>
                    <Input
                      type="number"
                      value={newClinica.preco_por_turno}
                      onChange={(e) => setNewClinica(p => ({ ...p, preco_por_turno: e.target.value }))}
                      placeholder="0,00"
                      className="bg-white border-emerald-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-300 text-lg font-semibold h-12"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-gray-600 text-xs font-medium">Por Dia (R$)</Label>
                      <Input
                        type="number"
                        value={newClinica.preco_por_dia}
                        onChange={(e) => setNewClinica(p => ({ ...p, preco_por_dia: e.target.value }))}
                        placeholder="0,00"
                        className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-300"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-600 text-xs font-medium">Por Mes (R$)</Label>
                      <Input
                        type="number"
                        value={newClinica.preco_por_mes}
                        onChange={(e) => setNewClinica(p => ({ ...p, preco_por_mes: e.target.value }))}
                        placeholder="0,00"
                        className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Extra info */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <h4 className="text-gray-900 font-semibold mb-1">Informacoes Adicionais</h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-gray-600 text-xs font-medium">Especialidades Recomendadas</Label>
                    <Input
                      value={newClinica.especialidades_recomendadas}
                      onChange={(e) => setNewClinica(p => ({ ...p, especialidades_recomendadas: e.target.value }))}
                      placeholder="Dermatologia, Estetica..."
                      className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-600 text-xs font-medium">Horario de Funcionamento</Label>
                    <Input
                      value={newClinica.horario_funcionamento}
                      onChange={(e) => setNewClinica(p => ({ ...p, horario_funcionamento: e.target.value }))}
                      placeholder="Seg-Sex 8h-18h"
                      className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-600 text-xs font-medium">Regras</Label>
                    <Textarea
                      value={newClinica.regras}
                      onChange={(e) => setNewClinica(p => ({ ...p, regras: e.target.value }))}
                      placeholder="Regras de uso do espaco..."
                      className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 resize-none min-h-[80px] rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-300"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal footer with step navigation */}
          <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(s => s - 1)}
                className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-xl h-11 px-6"
              >
                Voltar
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-xl h-11 px-6"
              >
                Cancelar
              </Button>
            )}
            <div className="flex-1" />
            {currentStep < 5 ? (
              <Button
                onClick={nextStep}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl h-11 px-8 font-semibold"
              >
                Proximo
              </Button>
            ) : (
              <Button
                onClick={handleCreateClinica}
                disabled={creatingClinica || !newClinica.titulo.trim() || !newClinica.cidade.trim()}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/20 disabled:opacity-40 rounded-xl h-11 px-8 font-semibold"
              >
                {creatingClinica ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {creatingClinica ? 'Enviando...' : 'Anunciar Clinica'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
