'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Building2, DollarSign, TrendingUp, Users, Calendar,
  Check, X, Eye, Loader2, Settings, BarChart3,
  MapPin, Star, Clock, Percent, Award, CheckCircle2, ImageIcon
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth'
import { toast } from 'sonner'

interface Clinica {
  id: string
  titulo: string
  cidade?: string
  estado?: string
  owner_mentorado_id: string
  status: string
  preco_por_turno: number
  fotos_verificadas?: boolean
  destaque?: boolean
  created_at: string
  owner_nome?: string
}

interface Reserva {
  id: string
  clinica_id: string
  mentorado_id: string
  data_inicio: string
  data_fim: string
  turno: string
  valor_total: number
  valor_taxa_plataforma: number
  status: string
  created_at: string
  clinica_titulo?: string
  mentorado_nome?: string
}

export default function AdminAirbnbPage() {
  const { user } = useAuth()
  const orgId = '9c8c0033-15ea-4e33-a55f-28d81a19693b'

  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [percentualLucro, setPercentualLucro] = useState(10)
  const [savingConfig, setSavingConfig] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'clinicas' | 'reservas' | 'config'>('overview')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load clinicas
      const { data: clinicasData } = await supabase
        .from('clinicas')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      const clinicasWithOwners = await Promise.all((clinicasData || []).map(async (c: any) => {
        const { data: ownerData } = await supabase
          .from('mentorados')
          .select('nome_completo')
          .eq('id', c.owner_mentorado_id)
          .single()
        return { ...c, owner_nome: ownerData?.nome_completo || 'Desconhecido' }
      }))
      setClinicas(clinicasWithOwners)

      // Load reservas
      const { data: reservasData } = await supabase
        .from('clinica_reservas')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      const reservasEnriched = await Promise.all((reservasData || []).map(async (r: any) => {
        const { data: clinicaData } = await supabase
          .from('clinicas')
          .select('titulo')
          .eq('id', r.clinica_id)
          .single()
        const { data: mentData } = await supabase
          .from('mentorados')
          .select('nome_completo')
          .eq('id', r.mentorado_id)
          .single()
        return {
          ...r,
          clinica_titulo: clinicaData?.titulo || 'Clinica',
          mentorado_nome: mentData?.nome_completo || 'Mentorado',
        }
      }))
      setReservas(reservasEnriched)

      // Load config
      const { data: configData } = await supabase
        .from('airbnb_config')
        .select('percentual_lucro')
        .eq('organization_id', orgId)
        .single()
      if (configData) setPercentualLucro(configData.percentual_lucro)

    } catch (err) {
      console.error('Error loading data:', err)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true)
      const { error } = await supabase
        .from('airbnb_config')
        .update({ percentual_lucro: percentualLucro })
        .eq('organization_id', orgId)

      if (error) throw error
      toast.success('Configuracao salva!')
    } catch (err) {
      console.error('Error saving config:', err)
      toast.error('Erro ao salvar configuracao')
    } finally {
      setSavingConfig(false)
    }
  }

  const handleUpdateClinicaStatus = async (clinicaId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('clinicas')
        .update({ status: newStatus })
        .eq('id', clinicaId)

      if (error) throw error
      toast.success(`Clinica ${newStatus === 'ativa' ? 'aprovada' : newStatus === 'inativa' ? 'desativada' : 'atualizada'}!`)
      loadData()
    } catch (err) {
      console.error('Error updating clinica:', err)
      toast.error('Erro ao atualizar clinica')
    }
  }

  const handleToggleClinicaField = async (clinicaId: string, field: 'fotos_verificadas' | 'destaque', currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('clinicas')
        .update({ [field]: !currentValue })
        .eq('id', clinicaId)

      if (error) throw error
      toast.success(`${field === 'fotos_verificadas' ? 'Fotos verificadas' : 'Destaque'} ${!currentValue ? 'ativado' : 'desativado'}!`)
      loadData()
    } catch (err) {
      console.error('Error toggling field:', err)
      toast.error('Erro ao atualizar')
    }
  }

  const handleUpdateReservaStatus = async (reservaId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('clinica_reservas')
        .update({ status: newStatus })
        .eq('id', reservaId)

      if (error) throw error
      toast.success('Reserva atualizada!')
      loadData()
    } catch (err) {
      console.error('Error updating reserva:', err)
      toast.error('Erro ao atualizar reserva')
    }
  }

  // KPIs
  const totalClinicas = clinicas.length
  const clinicasAtivas = clinicas.filter(c => c.status === 'ativa').length
  const clinicasEmRevisao = clinicas.filter(c => c.status === 'em_revisao').length
  const totalReservas = reservas.length
  const reservasConfirmadas = reservas.filter(r => r.status === 'confirmada').length
  const receitaTotal = reservas.filter(r => r.status !== 'cancelada').reduce((sum, r) => sum + Number(r.valor_total), 0)
  const taxaTotal = reservas.filter(r => r.status !== 'cancelada').reduce((sum, r) => sum + Number(r.valor_taxa_plataforma), 0)

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Title */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold text-white">Airbnb para Medicos</h1>
            <p className="text-gray-500 text-sm">Gestao de clinicas e reservas</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'overview', label: 'Visao Geral', icon: BarChart3 },
            { key: 'clinicas', label: `Clinicas (${totalClinicas})`, icon: Building2 },
            { key: 'reservas', label: `Reservas (${totalReservas})`, icon: Calendar },
            { key: 'config', label: 'Configuracoes', icon: Settings },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#141414] rounded-2xl p-5 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-amber-400" />
                  </div>
                  {clinicasEmRevisao > 0 && (
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                      {clinicasEmRevisao} pendentes
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold text-white">{totalClinicas}</p>
                <p className="text-gray-500 text-xs mt-1">{clinicasAtivas} ativas</p>
              </div>

              <div className="bg-[#141414] rounded-2xl p-5 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{totalReservas}</p>
                <p className="text-gray-500 text-xs mt-1">{reservasConfirmadas} confirmadas</p>
              </div>

              <div className="bg-[#141414] rounded-2xl p-5 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">R$ {receitaTotal.toFixed(2)}</p>
                <p className="text-gray-500 text-xs mt-1">receita total</p>
              </div>

              <div className="bg-[#141414] rounded-2xl p-5 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">R$ {taxaTotal.toFixed(2)}</p>
                <p className="text-gray-500 text-xs mt-1">taxas ({percentualLucro}%)</p>
              </div>
            </div>

            {/* Clinicas pending approval */}
            {clinicasEmRevisao > 0 && (
              <div>
                <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  Clinicas aguardando aprovacao
                </h3>
                <div className="space-y-2">
                  {clinicas.filter(c => c.status === 'em_revisao').map(c => (
                    <div key={c.id} className="bg-[#141414] rounded-xl p-4 border border-amber-500/10 flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium text-sm">{c.titulo}</p>
                        <p className="text-gray-500 text-xs">
                          {c.owner_nome} · {[c.cidade, c.estado].filter(Boolean).join(', ')} · R$ {Number(c.preco_por_turno).toFixed(0)}/turno
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateClinicaStatus(c.id, 'ativa')}
                          className="bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateClinicaStatus(c.id, 'inativa')}
                          className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent reservations */}
            {reservas.length > 0 && (
              <div>
                <h3 className="text-white font-semibold text-sm mb-3">Reservas recentes</h3>
                <div className="space-y-2">
                  {reservas.slice(0, 5).map(r => (
                    <div key={r.id} className="bg-[#141414] rounded-xl p-4 border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium text-sm">{r.clinica_titulo}</p>
                        <p className="text-gray-500 text-xs">
                          {r.mentorado_nome} · {new Date(r.data_inicio).toLocaleDateString('pt-BR')} a {new Date(r.data_fim).toLocaleDateString('pt-BR')}
                          {' · '}R$ {Number(r.valor_total).toFixed(2)}
                        </p>
                      </div>
                      <Badge className={
                        r.status === 'confirmada' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        r.status === 'pendente' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        r.status === 'concluida' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }>
                        {r.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clinicas Tab */}
        {activeTab === 'clinicas' && (
          <div className="space-y-3">
            {clinicas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Building2 className="w-12 h-12 text-gray-600 mb-3" />
                <p className="text-gray-400">Nenhuma clinica cadastrada</p>
              </div>
            ) : (
              clinicas.map(c => (
                <div key={c.id} className="bg-[#141414] rounded-xl p-5 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold text-sm">{c.titulo}</h3>
                        <Badge className={
                          c.status === 'ativa' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          c.status === 'em_revisao' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }>
                          {c.status}
                        </Badge>
                        {c.destaque && (
                          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                            <Award className="w-3 h-3 mr-1" />Destaque
                          </Badge>
                        )}
                        {c.fotos_verificadas && (
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" />Verificado
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs">
                        {c.owner_nome} · {[c.cidade, c.estado].filter(Boolean).join(', ')} · R$ {Number(c.preco_por_turno).toFixed(0)}/turno
                        {' · '}Criada em {new Date(c.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {c.status !== 'ativa' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateClinicaStatus(c.id, 'ativa')}
                          className="bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Ativar
                        </Button>
                      )}
                      {c.status !== 'inativa' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateClinicaStatus(c.id, 'inativa')}
                          className="border-white/10 text-gray-400 hover:text-red-400 text-xs"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Desativar
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Toggle buttons for fotos verificadas and destaque */}
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleToggleClinicaField(c.id, 'fotos_verificadas', !!c.fotos_verificadas)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        c.fotos_verificadas
                          ? 'bg-blue-500/15 border border-blue-500/30 text-blue-400'
                          : 'bg-white/[0.03] border border-white/[0.06] text-gray-500 hover:text-blue-400'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      {c.fotos_verificadas ? 'Fotos Verificadas' : 'Verificar Fotos'}
                    </button>
                    <button
                      onClick={() => handleToggleClinicaField(c.id, 'destaque', !!c.destaque)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        c.destaque
                          ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                          : 'bg-white/[0.03] border border-white/[0.06] text-gray-500 hover:text-amber-400'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      {c.destaque ? 'Em Destaque' : 'Promover Destaque'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Reservas Tab */}
        {activeTab === 'reservas' && (
          <div className="space-y-3">
            {reservas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Calendar className="w-12 h-12 text-gray-600 mb-3" />
                <p className="text-gray-400">Nenhuma reserva registrada</p>
              </div>
            ) : (
              reservas.map(r => (
                <div key={r.id} className="bg-[#141414] rounded-xl p-5 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-white font-semibold text-sm">{r.clinica_titulo}</h3>
                      <p className="text-gray-500 text-xs">
                        Locatario: {r.mentorado_nome}
                      </p>
                    </div>
                    <Badge className={
                      r.status === 'confirmada' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      r.status === 'pendente' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      r.status === 'concluida' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }>
                      {r.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(r.data_inicio).toLocaleDateString('pt-BR')} - {new Date(r.data_fim).toLocaleDateString('pt-BR')}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.turno === 'integral' ? 'Integral' : r.turno === 'manha' ? 'Manha' : 'Tarde'}</span>
                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />R$ {Number(r.valor_total).toFixed(2)} (taxa: R$ {Number(r.valor_taxa_plataforma).toFixed(2)})</span>
                  </div>
                  {r.status === 'pendente' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateReservaStatus(r.id, 'confirmada')}
                        className="bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateReservaStatus(r.id, 'cancelada')}
                        className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
          <div className="max-w-lg space-y-6">
            <div className="bg-[#141414] rounded-2xl p-6 border border-white/5">
              <h3 className="text-white font-semibold text-lg mb-1 flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-400" />
                Percentual de Lucro
              </h3>
              <p className="text-gray-500 text-xs mb-6">
                Define a taxa cobrada sobre cada reserva. Esse valor e adicionado ao custo do aluguel.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={percentualLucro}
                    onChange={(e) => setPercentualLucro(parseFloat(e.target.value) || 0)}
                    className="w-32 bg-white/[0.03] border-white/[0.06] text-white text-lg font-bold text-center"
                  />
                  <span className="text-gray-400 text-lg">%</span>
                </div>

                {/* Slider visual */}
                <div className="relative">
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={0.5}
                    value={percentualLucro}
                    onChange={(e) => setPercentualLucro(parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-amber-500/30"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                    <span>0%</span>
                    <span>15%</span>
                    <span>30%</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                  <p className="text-amber-400 text-xs">
                    Exemplo: Para uma reserva de R$ 500, a taxa sera de R$ {(500 * percentualLucro / 100).toFixed(2)}, totalizando R$ {(500 + 500 * percentualLucro / 100).toFixed(2)} para o locatario.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="mt-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
              >
                {savingConfig ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                {savingConfig ? 'Salvando...' : 'Salvar Configuracao'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
