'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search, Users, Target, DollarSign, TrendingUp, Calendar,
  Eye, UserCheck, AlertCircle, CheckCircle, Clock, Star
} from 'lucide-react'

interface MentoradoOverview {
  id: string
  nome_completo: string
  email: string
  telefone: string
  status_login: string
  data_entrada: string
  estado_atual: string
  porcentagem_comissao: number

  // Metas
  total_metas: number
  metas_completed: number
  metas_pending: number

  // Comissões
  total_comissoes: number
  comissoes_mes_atual: number

  // Acesso portal
  has_portal_access: boolean
  access_level: string | null

  // Atividade
  last_login: string | null
  checkins_count: number
}

export default function MentoradosOverviewPage() {
  const [mentorados, setMentorados] = useState<MentoradoOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'blocked'>('all')

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      // Buscar mentorados com informações agregadas
      const { data: mentoradosData, error: mentoradosError } = await supabase
        .from('mentorados')
        .select(`
          id,
          nome_completo,
          email,
          telefone,
          status_login,
          data_entrada,
          estado_atual,
          porcentagem_comissao
        `)
        .order('nome_completo')

      if (mentoradosError) throw mentoradosError

      // Buscar metas para cada mentorado
      const { data: metasData, error: metasError } = await supabase
        .from('video_learning_goals')
        .select('mentorado_id, status')

      // Buscar acesso ao portal
      const { data: accessData, error: accessError } = await supabase
        .from('video_access_control')
        .select('mentorado_id, has_access, has_portal_access, access_level')
        .eq('has_access', true)

      // Buscar checkins
      const { data: checkinsData, error: checkinsError } = await supabase
        .from('checkins')
        .select('mentorado_id, id')

      // Processar dados agregados
      const mentoradosComInfo: MentoradoOverview[] = (mentoradosData || []).map(mentorado => {
        const metas = metasData?.filter(m => m.mentorado_id === mentorado.id) || []
        const access = accessData?.find(a => a.mentorado_id === mentorado.id)
        const checkins = checkinsData?.filter(c => c.mentorado_id === mentorado.id) || []

        return {
          ...mentorado,
          // Metas
          total_metas: metas.length,
          metas_completed: metas.filter(m => m.status === 'completed').length,
          metas_pending: metas.filter(m => m.status === 'pending' || m.status === 'in_progress').length,

          // Comissões (mock - integrar depois)
          total_comissoes: 0,
          comissoes_mes_atual: 0,

          // Acesso
          has_portal_access: access?.has_portal_access || access?.has_access || false,
          access_level: access?.access_level || null,

          // Atividade
          last_login: null, // TODO: integrar com logs
          checkins_count: checkins.length
        }
      })

      setMentorados(mentoradosComInfo)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const mentoradosFiltrados = mentorados.filter(mentorado => {
    const matchesSearch = mentorado.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          mentorado.email.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    switch (filterStatus) {
      case 'active': return mentorado.status_login === 'ativo'
      case 'inactive': return mentorado.status_login === 'inativo'
      case 'blocked': return mentorado.status_login === 'bloqueado'
      default: return true
    }
  })

  const stats = {
    total: mentorados.length,
    ativos: mentorados.filter(m => m.status_login === 'ativo').length,
    inativos: mentorados.filter(m => m.status_login === 'inativo').length,
    com_acesso: mentorados.filter(m => m.has_portal_access).length,
    total_metas: mentorados.reduce((sum, m) => sum + m.total_metas, 0),
    metas_completed: mentorados.reduce((sum, m) => sum + m.metas_completed, 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Visão Geral dos Mentorados</h1>
          <p className="text-gray-600 mt-2">
            Dashboard completo com metas, comissões, acesso e atividade
          </p>
        </div>

        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ativos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.ativos}</p>
                </div>
                <UserCheck className="w-6 h-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Com Acesso</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.com_acesso}</p>
                </div>
                <Eye className="w-6 h-6 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Metas</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.total_metas}</p>
                </div>
                <Target className="w-6 h-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Concluídas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.metas_completed}</p>
                </div>
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Taxa Sucesso</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.total_metas > 0 ? Math.round((stats.metas_completed / stats.total_metas) * 100) : 0}%
                  </p>
                </div>
                <TrendingUp className="w-6 h-6 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar mentorado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('all')}
                  
                >
                  Todos
                </Button>
                <Button
                  variant={filterStatus === 'active' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('active')}
                  
                >
                  Ativos
                </Button>
                <Button
                  variant={filterStatus === 'inactive' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('inactive')}
                  
                >
                  Inativos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Mentorados */}
        <Card>
          <CardHeader>
            <CardTitle>Mentorados ({mentoradosFiltrados.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Mentorado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Metas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Portal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Comissão
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Atividade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mentoradosFiltrados.map((mentorado) => (
                    <tr key={mentorado.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {mentorado.nome_completo}
                          </div>
                          <div className="text-sm text-gray-500">
                            {mentorado.email}
                          </div>
                          <div className="text-xs text-gray-400">
                            Entrada: {new Date(mentorado.data_entrada).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            mentorado.status_login === 'ativo' ? 'bg-green-100 text-green-700 border-green-300' :
                            mentorado.status_login === 'bloqueado' ? 'bg-red-100 text-red-700 border-red-300' :
                            'bg-gray-100 text-gray-700 border-gray-300'
                          }
                        >
                          {mentorado.status_login}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          {mentorado.estado_atual}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{mentorado.total_metas}</span>
                            <span className="text-gray-500">total</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span className="text-green-600">✓ {mentorado.metas_completed}</span>
                            <span className="text-orange-600">⏳ {mentorado.metas_pending}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {mentorado.has_portal_access ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-green-600">Ativo</span>
                              {mentorado.access_level && (
                                <Badge variant="outline" >
                                  {mentorado.access_level}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-red-500" />
                              <span className="text-sm text-red-600">Sem acesso</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium">
                            {mentorado.porcentagem_comissao}%
                          </div>
                          <div className="text-xs text-gray-500">
                            R$ {mentorado.comissoes_mes_atual.toLocaleString('pt-BR')} mês
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="flex items-center gap-1 mb-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {mentorado.checkins_count} check-ins
                            </span>
                          </div>
                          {mentorado.last_login && (
                            <div className="text-xs text-gray-400">
                              Último login: {new Date(mentorado.last_login).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <Button
                            
                            variant="outline"
                            onClick={() => {
                              // TODO: implementar visualização detalhada
                              alert(`Ver detalhes de ${mentorado.nome_completo}`)
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Ver
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {mentoradosFiltrados.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    Nenhum mentorado encontrado
                  </h3>
                  <p className="text-gray-500">
                    Ajuste os filtros ou termo de busca
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}