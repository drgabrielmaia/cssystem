'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Header } from '@/components/header'
import { FileText, Users, BarChart3, ArrowRight, Calendar, Search, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface FormularioInfo {
  tipo: string
  total_respostas: number
  ultima_resposta: string | null
  primeira_resposta: string | null
  mentorados_unicos: number
}

export default function FormulariosPage() {
  const [formularios, setFormularios] = useState<FormularioInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('todos')
  const [participantFilter, setParticipantFilter] = useState('todos')
  const router = useRouter()

  useEffect(() => {
    fetchFormularios()
  }, [])

  const fetchFormularios = async () => {
    try {
      console.log('🔍 Buscando formulários...')

      const { data, error } = await supabase
        .from('formularios_respostas')
        .select(`
          formulario,
          data_envio,
          mentorado_id
        `)
        .order('data_envio', { ascending: false })

      if (error) {
        console.error('Erro ao buscar formulários:', error)
        return
      }

      // Agrupar por tipo de formulário
      const grouped = data?.reduce((acc, item) => {
        const tipo = item.formulario

        if (!acc[tipo]) {
          acc[tipo] = {
            tipo,
            respostas: [],
            mentorados: new Set()
          }
        }

        acc[tipo].respostas.push(item.data_envio)
        acc[tipo].mentorados.add(item.mentorado_id)

        return acc
      }, {} as Record<string, any>) || {}

      // Transformar em array com estatísticas
      const formulariosInfo = Object.values(grouped).map((group: any) => ({
        tipo: group.tipo,
        total_respostas: group.respostas.length,
        mentorados_unicos: group.mentorados.size,
        primeira_resposta: group.respostas[group.respostas.length - 1],
        ultima_resposta: group.respostas[0]
      }))

      console.log('📊 Formulários encontrados:', formulariosInfo.length)
      setFormularios(formulariosInfo)

    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFormularioIcon = (tipo: string) => {
    if (tipo.includes('nps')) return '📊'
    if (tipo.includes('vendas')) return '💰'
    if (tipo.includes('marketing')) return '📢'
    return '📋'
  }

  const getFormularioNome = (tipo: string) => {
    const nomes: Record<string, string> = {
      'nps_geral': 'NPS Geral',
      'modulo_iv_vendas': 'Módulo IV - Vendas',
      'modulo_iii_gestao_marketing': 'Módulo III - Gestão e Marketing',
      'formularios_respostas': 'Formulários Gerais'
    }
    return nomes[tipo] || tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getFormularioDescricao = (tipo: string) => {
    const descricoes: Record<string, string> = {
      'nps_geral': 'Pesquisa de satisfação e Net Promoter Score',
      'modulo_iv_vendas': 'Avaliação do módulo de vendas e estratégias comerciais',
      'modulo_iii_gestao_marketing': 'Feedback sobre gestão e marketing digital',
      'formularios_respostas': 'Formulários diversos e feedback geral'
    }
    return descricoes[tipo] || 'Respostas de formulário personalizado'
  }

  // Filtrar formulários
  const filteredFormularios = formularios.filter(formulario => {
    const matchesSearch = searchTerm === '' ||
      getFormularioNome(formulario.tipo).toLowerCase().includes(searchTerm.toLowerCase()) ||
      formulario.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getFormularioDescricao(formulario.tipo).toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDate = dateFilter === 'todos' ||
      (dateFilter === 'recentes' && formulario.ultima_resposta &&
        new Date(formulario.ultima_resposta) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
      (dateFilter === 'mes_passado' && formulario.ultima_resposta &&
        new Date(formulario.ultima_resposta) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))

    const matchesParticipants = participantFilter === 'todos' ||
      (participantFilter === 'poucos' && formulario.mentorados_unicos < 5) ||
      (participantFilter === 'medios' && formulario.mentorados_unicos >= 5 && formulario.mentorados_unicos < 15) ||
      (participantFilter === 'muitos' && formulario.mentorados_unicos >= 15)

    return matchesSearch && matchesDate && matchesParticipants
  })

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header
          title="📋 Formulários"
          subtitle="Gerenciar formulários e análises"
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Carregando formulários...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title="📋 Formulários"
        subtitle={
          filteredFormularios.length === formularios.length
            ? `${formularios.length} tipos de formulários disponíveis`
            : `${filteredFormularios.length} de ${formularios.length} formulários (filtrados)`
        }
      />

      <main className="flex-1 p-6 space-y-6">
        {/* Pesquisa e Filtros */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar formulários por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Botão limpar filtros */}
            {(searchTerm || dateFilter !== 'todos' || participantFilter !== 'todos') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setDateFilter('todos')
                  setParticipantFilter('todos')
                }}
                className="whitespace-nowrap"
              >
                Limpar Filtros
              </Button>
            )}
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-4">
            {/* Filtro por Data */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Data:</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'todos', label: 'Todos' },
                  { key: 'recentes', label: '📅 Últimos 7 dias' },
                  { key: 'mes_passado', label: '📆 Último mês' }
                ].map(date => (
                  <Button
                    key={date.key}
                    variant={dateFilter === date.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateFilter(date.key)}
                    className="text-xs"
                  >
                    {date.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filtro por Participantes */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4"></div>
              <span className="text-sm text-gray-600">Participantes:</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'todos', label: 'Todos' },
                  { key: 'poucos', label: '👥 < 5' },
                  { key: 'medios', label: '👥👥 5-15' },
                  { key: 'muitos', label: '👥👥👥 15+' }
                ].map(participant => (
                  <Button
                    key={participant.key}
                    variant={participantFilter === participant.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setParticipantFilter(participant.key)}
                    className="text-xs"
                  >
                    {participant.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas gerais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tipos de Formulários</p>
                  <p className="text-2xl font-bold">{formularios.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Respostas</p>
                  <p className="text-2xl font-bold">
                    {formularios.reduce((sum, f) => sum + f.total_respostas, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Mentorados Participantes</p>
                  <p className="text-2xl font-bold">
                    {formularios.reduce((sum, f) => sum + f.mentorados_unicos, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Última Resposta</p>
                  <p className="text-sm font-bold">
                    {formularios.length > 0
                      ? new Date(Math.max(...formularios.map(f =>
                          new Date(f.ultima_resposta || 0).getTime()
                        ))).toLocaleDateString('pt-BR')
                      : 'Nenhuma'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de formulários */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFormularios.map((formulario) => (
            <Card key={formulario.tipo} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getFormularioIcon(formulario.tipo)}</span>
                    <span className="text-lg">{getFormularioNome(formulario.tipo)}</span>
                  </div>
                  <Badge variant="secondary">
                    {formulario.total_respostas} respostas
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  {getFormularioDescricao(formulario.tipo)}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Mentorados únicos:</span>
                    <span className="font-medium">{formulario.mentorados_unicos}</span>
                  </div>

                  {formulario.ultima_resposta && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Última resposta:</span>
                      <span className="font-medium">
                        {new Date(formulario.ultima_resposta).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => router.push(`/formularios/${encodeURIComponent(formulario.tipo)}`)}
                  className="w-full"
                  variant="default"
                >
                  Ver Respostas e Análises
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mensagens quando não há resultados */}
        {filteredFormularios.length === 0 && formularios.length > 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum formulário encontrado
              </h3>
              <p className="text-gray-500">
                Tente ajustar os filtros ou termo de pesquisa para encontrar formulários.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchTerm('')
                  setDateFilter('todos')
                  setParticipantFilter('todos')
                }}
              >
                Limpar Filtros
              </Button>
            </CardContent>
          </Card>
        )}

        {filteredFormularios.length === 0 && formularios.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum formulário encontrado
              </h3>
              <p className="text-gray-500">
                Não há formulários respondidos no sistema ainda.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}