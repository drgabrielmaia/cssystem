'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase, type Mentorado } from '@/lib/supabase'
import {
  User,
  CheckCircle,
  Clock,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  ImageIcon,
  Target,
  AlertCircle,
  TrendingUp,
  X
} from 'lucide-react'

interface CheckinStatus {
  mentorado_id: string
  onboarding_realizado: boolean
  onboarding_agendado: boolean
  onboarding_data?: string
  consultoria_imagem_realizada: boolean
  consultoria_imagem_agendada: boolean
  consultoria_imagem_data?: string
  ultima_atualizacao?: string
}

export default function CheckInsPage() {
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [checkinsStatus, setCheckinsStatus] = useState<CheckinStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const itemsPerPage = 10

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

      // Buscar check-ins para determinar status de onboarding e consultoria
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

  // Filtrar mentorados baseado na busca
  const filteredMentorados = mentorados.filter(mentorado =>
    mentorado.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentorado.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentorado.turma.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Paginação
  const totalPages = Math.ceil(filteredMentorados.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentMentorados = filteredMentorados.slice(startIndex, endIndex)

  // Estatísticas
  const stats = {
    total: mentorados.length,
    onboardingRealizado: checkinsStatus.filter(s => s.onboarding_realizado).length,
    onboardingAgendado: checkinsStatus.filter(s => s.onboarding_agendado && !s.onboarding_realizado).length,
    consultoriaRealizada: checkinsStatus.filter(s => s.consultoria_imagem_realizada).length,
    consultoriaAgendada: checkinsStatus.filter(s => s.consultoria_imagem_agendada && !s.consultoria_imagem_realizada).length,
  }

  const getStatusOnboarding = (mentoradoId: string) => {
    const status = checkinsStatus.find(s => s.mentorado_id === mentoradoId)
    if (!status) return { type: 'pendente', label: 'Pendente' }

    if (status.onboarding_realizado) return { type: 'realizado', label: 'Realizado' }
    if (status.onboarding_agendado) return { type: 'agendado', label: 'Agendado' }
    return { type: 'pendente', label: 'Pendente' }
  }

  const getStatusConsultoria = (mentoradoId: string) => {
    const status = checkinsStatus.find(s => s.mentorado_id === mentoradoId)
    if (!status) return { type: 'pendente', label: 'Pendente' }

    if (status.consultoria_imagem_realizada) return { type: 'realizado', label: 'Realizada' }
    if (status.consultoria_imagem_agendada) return { type: 'agendado', label: 'Agendada' }
    return { type: 'pendente', label: 'Pendente' }
  }

  const marcarOnboarding = async (mentoradoId: string, realizado: boolean) => {
    try {
      const agora = new Date().toISOString()

      if (realizado) {
        // Marcar como realizado
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
        // Marcar como agendado
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
        // Marcar como realizada
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
        // Marcar como agendada
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

  const resetarOnboarding = async (mentoradoId: string) => {
    try {
      const { error } = await supabase
        .from('checkins')
        .delete()
        .eq('mentorado_id', mentoradoId)
        .eq('tipo', 'onboarding')

      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('Erro ao resetar onboarding:', error)
      alert('Erro ao resetar onboarding')
    }
  }

  const resetarConsultoria = async (mentoradoId: string) => {
    try {
      const { error } = await supabase
        .from('checkins')
        .delete()
        .eq('mentorado_id', mentoradoId)
        .eq('tipo', 'consultoria_imagem')

      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('Erro ao resetar consultoria:', error)
      alert('Erro ao resetar consultoria')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="📋 Checkin Onboarding & Consultoria" subtitle="Carregando dados..." />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Organizando informações...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50">
      <Header
        title="📋 Checkin Onboarding & Consultoria"
        subtitle={`${stats.total} mentorados • ${stats.onboardingRealizado} onboardings • ${stats.consultoriaRealizada} consultorias`}
      />

      <main className="flex-1 p-6 space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                </div>
                <User className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Onboarding ✓</p>
                  <p className="text-2xl font-bold text-green-600">{stats.onboardingRealizado}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Onboarding ⏰</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.onboardingAgendado}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Consultoria ✓</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.consultoriaRealizada}</p>
                </div>
                <ImageIcon className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-pink-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Consultoria ⏰</p>
                  <p className="text-2xl font-bold text-pink-600">{stats.consultoriaAgendada}</p>
                </div>
                <Calendar className="h-8 w-8 text-pink-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome, email ou turma..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1) // Reset para primeira página ao buscar
                }}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de Mentorados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>📝 Lista de Mentorados</span>
              <span className="text-sm font-normal text-gray-600">
                Página {currentPage} de {totalPages} • {filteredMentorados.length} mentorados
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentMentorados.map(mentorado => {
                const statusOnboarding = getStatusOnboarding(mentorado.id)
                const statusConsultoria = getStatusConsultoria(mentorado.id)

                return (
                  <Card key={mentorado.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                {mentorado.nome_completo.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-medium text-gray-900 truncate">
                                {mentorado.nome_completo}
                              </h3>
                              <p className="text-sm text-gray-600">{mentorado.email}</p>
                              <p className="text-xs text-gray-500">Turma: {mentorado.turma}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6">
                          {/* Onboarding */}
                          <div className="text-center">
                            <p className="text-xs font-medium text-gray-600 mb-2">Onboarding</p>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={
                                  statusOnboarding.type === 'realizado' ? 'success' :
                                  statusOnboarding.type === 'agendado' ? 'default' : 'warning'
                                }
                                className="text-xs"
                              >
                                {statusOnboarding.label}
                              </Badge>
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant={statusOnboarding.type === 'agendado' ? 'default' : 'outline'}
                                  onClick={() => marcarOnboarding(mentorado.id, false)}
                                  disabled={statusOnboarding.type === 'realizado'}
                                  className="h-6 w-6 p-0"
                                  title="Agendar"
                                >
                                  <Clock className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={statusOnboarding.type === 'realizado' ? 'default' : 'outline'}
                                  onClick={() => marcarOnboarding(mentorado.id, true)}
                                  className="h-6 w-6 p-0"
                                  title="Marcar como realizado"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => resetarOnboarding(mentorado.id)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                  title="Resetar (voltar para pendente)"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Consultoria de Imagem */}
                          <div className="text-center">
                            <p className="text-xs font-medium text-gray-600 mb-2">Consultoria Imagem</p>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={
                                  statusConsultoria.type === 'realizado' ? 'success' :
                                  statusConsultoria.type === 'agendado' ? 'default' : 'warning'
                                }
                                className="text-xs"
                              >
                                {statusConsultoria.label}
                              </Badge>
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant={statusConsultoria.type === 'agendado' ? 'default' : 'outline'}
                                  onClick={() => marcarConsultoria(mentorado.id, false)}
                                  disabled={statusConsultoria.type === 'realizado'}
                                  className="h-6 w-6 p-0"
                                  title="Agendar"
                                >
                                  <Clock className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={statusConsultoria.type === 'realizado' ? 'default' : 'outline'}
                                  onClick={() => marcarConsultoria(mentorado.id, true)}
                                  className="h-6 w-6 p-0"
                                  title="Marcar como realizada"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => resetarConsultoria(mentorado.id)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                  title="Resetar (voltar para pendente)"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
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

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center space-x-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Anterior</span>
                </Button>

                <div className="flex items-center space-x-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page =>
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 2 && page <= currentPage + 2)
                    )
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center space-x-2">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="text-gray-400">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      </div>
                    ))}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center space-x-2"
                >
                  <span>Próxima</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Empty State */}
        {filteredMentorados.length === 0 && (
          <div className="text-center py-12">
            <User className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum mentorado encontrado
            </h3>
            <p className="text-gray-500">
              {searchTerm ? 'Tente buscar com outros termos.' : 'Não há mentorados cadastrados.'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}