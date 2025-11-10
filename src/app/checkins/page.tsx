'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase, type Mentorado } from '@/lib/supabase'
import { AddEventModal } from '@/components/add-event-modal'
import {
  User,
  CheckCircle,
  Clock,
  Calendar,
  Search,
  UserX,
  UserCheck,
  ImageIcon,
  Target,
  AlertTriangle,
  TrendingUp
} from 'lucide-react'

interface CheckinStatus {
  mentorado_id: string
  onboarding_realizado: boolean
  onboarding_agendado: boolean
  onboarding_data?: string
  consultoria_imagem_realizada: boolean
  consultoria_imagem_agendada: boolean
  consultoria_imagem_data?: string
}

type FiltroStatus = 'todos' | 'onboarding_pendente' | 'onboarding_agendado' | 'consultoria_pendente' | 'consultoria_agendado'

export default function CheckInsPage() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [checkinsStatus, setCheckinsStatus] = useState<CheckinStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedMentorado, setSelectedMentorado] = useState<Mentorado | null | undefined>(null)
  const [tipoAgendamento, setTipoAgendamento] = useState<'onboarding' | 'consultoria' | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      console.log('🔍 Carregando dados de checkin...')

      // Buscar todos os mentorados ativos
      const { data: mentoradosData, error: mentoradosError } = await supabase
        .from('mentorados')
        .select('*')
        .neq('estado_atual', 'inativo')
        .order('nome_completo')

      if (mentoradosError) {
        console.error('❌ Erro ao carregar mentorados:', mentoradosError)
        return
      }

      console.log('📊 Mentorados encontrados:', mentoradosData?.length || 0)
      setMentorados(mentoradosData || [])

      // Buscar check-ins para determinar status
      const { data: checkinsData, error: checkinsError } = await supabase
        .from('checkins')
        .select('mentorado_id, tipo, status, data_agendada, created_at')
        .in('tipo', ['onboarding', 'consultoria_imagem'])

      if (checkinsError) {
        console.error('❌ Erro ao carregar check-ins:', checkinsError)
      }

      // Processar status de checkins para cada mentorado
      const statusMap: { [key: string]: CheckinStatus } = {}

      mentoradosData?.forEach(mentorado => {
        statusMap[mentorado.id] = {
          mentorado_id: mentorado.id,
          onboarding_realizado: false,
          onboarding_agendado: false,
          consultoria_imagem_realizada: false,
          consultoria_imagem_agendada: false
        }
      })

      checkinsData?.forEach(checkin => {
        const status = statusMap[checkin.mentorado_id]
        if (!status) return

        if (checkin.tipo === 'onboarding') {
          if (checkin.status === 'realizado') {
            status.onboarding_realizado = true
            status.onboarding_data = checkin.data_agendada
          } else if (checkin.status === 'agendado') {
            status.onboarding_agendado = true
            status.onboarding_data = checkin.data_agendada
          }
        } else if (checkin.tipo === 'consultoria_imagem') {
          if (checkin.status === 'realizado') {
            status.consultoria_imagem_realizada = true
            status.consultoria_imagem_data = checkin.data_agendada
          } else if (checkin.status === 'agendado') {
            status.consultoria_imagem_agendada = true
            status.consultoria_imagem_data = checkin.data_agendada
          }
        }
      })

      setCheckinsStatus(Object.values(statusMap))
      console.log('✅ Dados de checkin processados com sucesso')
    } catch (error) {
      console.error('💥 Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const abrirModalOnboarding = (mentorado: Mentorado) => {
    setSelectedMentorado(mentorado)
    setTipoAgendamento('onboarding')
    setModalOpen(true)
  }

  const marcarOnboarding = async (mentoradoId: string, realizado: boolean) => {
    try {
      const agora = new Date().toISOString()

      if (realizado) {
        const { error } = await supabase
          .from('checkins')
          .upsert({
            mentorado_id: mentoradoId,
            tipo: 'onboarding',
            status: 'realizado',
            data_agendada: agora,
            titulo: 'Onboarding Realizado',
            descricao: 'Onboarding marcado como realizado'
          })

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('checkins')
          .upsert({
            mentorado_id: mentoradoId,
            tipo: 'onboarding',
            status: 'agendado',
            data_agendada: agora,
            titulo: 'Onboarding Agendado',
            descricao: 'Onboarding agendado'
          })

        if (error) throw error
      }

      await loadData()
    } catch (error) {
      console.error('Erro ao atualizar onboarding:', error)
      alert('Erro ao atualizar status do onboarding')
    }
  }

  const marcarConsultoria = async (mentoradoId: string, realizada: boolean) => {
    try {
      const agora = new Date().toISOString()

      if (realizada) {
        const { error } = await supabase
          .from('checkins')
          .upsert({
            mentorado_id: mentoradoId,
            tipo: 'consultoria_imagem',
            status: 'realizado',
            data_agendada: agora,
            titulo: 'Consultoria de Imagem Realizada',
            descricao: 'Consultoria de imagem marcada como realizada'
          })

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('checkins')
          .upsert({
            mentorado_id: mentoradoId,
            tipo: 'consultoria_imagem',
            status: 'agendado',
            data_agendada: agora,
            titulo: 'Consultoria de Imagem Agendada',
            descricao: 'Consultoria de imagem agendada'
          })

        if (error) throw error
      }

      await loadData()
    } catch (error) {
      console.error('Erro ao atualizar consultoria:', error)
      alert('Erro ao atualizar status da consultoria')
    }
  }

  // Filtrar mentorados baseado no status e busca
  const filteredMentorados = mentorados.filter(mentorado => {
    const status = checkinsStatus.find(s => s.mentorado_id === mentorado.id)
    if (!status) return false

    // Filtro por busca
    const matchesSearch = mentorado.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mentorado.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mentorado.turma.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    // Filtro por status
    switch (filtroStatus) {
      case 'onboarding_pendente':
        return !status.onboarding_realizado && !status.onboarding_agendado
      case 'onboarding_agendado':
        return status.onboarding_agendado && !status.onboarding_realizado
      case 'consultoria_pendente':
        return !status.consultoria_imagem_realizada && !status.consultoria_imagem_agendada
      case 'consultoria_agendado':
        return status.consultoria_imagem_agendada && !status.consultoria_imagem_realizada
      default:
        return true
    }
  })

  // Estatísticas para os cards
  const stats = {
    onboardingPendente: checkinsStatus.filter(s => !s.onboarding_realizado && !s.onboarding_agendado).length,
    onboardingAgendado: checkinsStatus.filter(s => s.onboarding_agendado && !s.onboarding_realizado).length,
    consultoriaPendente: checkinsStatus.filter(s => !s.consultoria_imagem_realizada && !s.consultoria_imagem_agendada).length,
    consultoriaAgendado: checkinsStatus.filter(s => s.consultoria_imagem_agendada && !s.consultoria_imagem_realizada).length,
  }

  const getStatusBadge = (status: CheckinStatus, tipo: 'onboarding' | 'consultoria') => {
    if (tipo === 'onboarding') {
      if (status.onboarding_realizado) return { color: 'bg-green-100 text-green-800 border-green-200', label: 'Realizado' }
      if (status.onboarding_agendado) return { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Agendado' }
      return { color: 'bg-red-100 text-red-800 border-red-200', label: 'Pendente' }
    } else {
      if (status.consultoria_imagem_realizada) return { color: 'bg-green-100 text-green-800 border-green-200', label: 'Realizada' }
      if (status.consultoria_imagem_agendada) return { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Agendada' }
      return { color: 'bg-red-100 text-red-800 border-red-200', label: 'Pendente' }
    }
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="📋 Check-ins Onboarding & Consultoria" subtitle="Carregando dados..." />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Organizando informações...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title="📋 Check-ins Onboarding & Consultoria"
        subtitle={`${mentorados.length} mentorados • ${filteredMentorados.length} listados`}
      />

      <main className="flex-1 p-6 space-y-6">
        {/* Cards de Status - 4 principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card
            className="cursor-pointer transition-all hover:shadow-lg border-l-4 border-l-red-500"
            onClick={() => setFiltroStatus('onboarding_pendente')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Onboarding Pendente</p>
                  <p className="text-3xl font-bold text-red-600">{stats.onboardingPendente}</p>
                  <p className="text-xs text-red-500 mt-1">Não fizeram onboarding</p>
                </div>
                <UserX className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:shadow-lg border-l-4 border-l-blue-500"
            onClick={() => setFiltroStatus('onboarding_agendado')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Onboarding Agendado</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.onboardingAgendado}</p>
                  <p className="text-xs text-blue-500 mt-1">Onboarding marcado</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:shadow-lg border-l-4 border-l-orange-500"
            onClick={() => setFiltroStatus('consultoria_pendente')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">Consultoria Pendente</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.consultoriaPendente}</p>
                  <p className="text-xs text-orange-500 mt-1">Não fizeram consultoria</p>
                </div>
                <ImageIcon className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:shadow-lg border-l-4 border-l-purple-500"
            onClick={() => setFiltroStatus('consultoria_agendado')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Consultoria Agendada</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.consultoriaAgendado}</p>
                  <p className="text-xs text-purple-500 mt-1">Consultoria marcada</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Busca */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por nome, email ou turma..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="min-w-[200px]">
                <Select value={filtroStatus} onValueChange={(value: FiltroStatus) => setFiltroStatus(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os mentorados</SelectItem>
                    <SelectItem value="onboarding_pendente">🔴 Onboarding Pendente</SelectItem>
                    <SelectItem value="onboarding_agendado">🔵 Onboarding Agendado</SelectItem>
                    <SelectItem value="consultoria_pendente">🟠 Consultoria Pendente</SelectItem>
                    <SelectItem value="consultoria_agendado">🟣 Consultoria Agendada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filtroStatus !== 'todos' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiltroStatus('todos')}
                >
                  Limpar Filtro
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista Organizada */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>👥 Lista de Mentorados</span>
              <span className="text-sm font-normal text-gray-600">
                {filteredMentorados.length} mentorados listados
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredMentorados.map(mentorado => {
                const status = checkinsStatus.find(s => s.mentorado_id === mentorado.id)
                if (!status) return null

                const badgeOnboarding = getStatusBadge(status, 'onboarding')
                const badgeConsultoria = getStatusBadge(status, 'consultoria')

                return (
                  <Card key={mentorado.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        {/* Info do Mentorado */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                {mentorado.nome_completo.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {mentorado.nome_completo}
                              </h3>
                              <p className="text-sm text-gray-600">{mentorado.email}</p>
                              <p className="text-xs text-gray-500">Turma: {mentorado.turma}</p>
                            </div>
                          </div>
                        </div>

                        {/* Status e Ações */}
                        <div className="flex items-center space-x-6">
                          {/* Onboarding */}
                          <div className="text-center">
                            <p className="text-xs font-medium text-gray-600 mb-2">Onboarding</p>
                            <div className="space-y-2">
                              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${badgeOnboarding.color}`}>
                                {badgeOnboarding.label}
                              </div>
                              <div className="flex space-x-1">
                                {!status.onboarding_realizado && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant={status.onboarding_agendado ? 'default' : 'outline'}
                                      onClick={() => abrirModalOnboarding(mentorado)}
                                      className="h-7 px-2"
                                    >
                                      <Clock className="h-3 w-3 mr-1" />
                                      Agendar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => marcarOnboarding(mentorado.id, true)}
                                      className="h-7 px-2 bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Feito
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Consultoria */}
                          <div className="text-center">
                            <p className="text-xs font-medium text-gray-600 mb-2">Consultoria</p>
                            <div className="space-y-2">
                              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${badgeConsultoria.color}`}>
                                {badgeConsultoria.label}
                              </div>
                              <div className="flex space-x-1">
                                {!status.consultoria_imagem_realizada && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant={status.consultoria_imagem_agendada ? 'default' : 'outline'}
                                      onClick={() => marcarConsultoria(mentorado.id, false)}
                                      className="h-7 px-2"
                                    >
                                      <Clock className="h-3 w-3 mr-1" />
                                      Agendar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => marcarConsultoria(mentorado.id, true)}
                                      className="h-7 px-2 bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Feito
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {filteredMentorados.length === 0 && (
              <div className="text-center py-12">
                <User className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum mentorado encontrado
                </h3>
                <p className="text-gray-500">
                  {searchTerm ? 'Tente buscar com outros termos.' : 'Não há mentorados neste filtro.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal de agendamento */}
      <AddEventModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSelectedMentorado(null)
          setTipoAgendamento(null)
        }}
        onSuccess={() => {
          loadData()
        }}
        selectedMentorado={selectedMentorado}
        tipoEvento={tipoAgendamento}
      />
    </div>
  )
}