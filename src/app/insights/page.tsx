'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useDateFilters } from '@/hooks/useDateFilters'
import { DateFilters } from '@/components/date-filters'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Star,
  Users,
  MessageSquare,
  Calendar,
  Target,
  ArrowUp,
  ArrowDown,
  Filter,
  Download
} from 'lucide-react'

interface MetricaFormulario {
  id: string
  nome: string
  tipo: string
  periodo: string
  totalRespostas: number
  npsScore?: number
  satisfacaoMedia?: number
  tendencia: 'up' | 'down' | 'stable'
  variacao: number
}

interface RespostaDetalhada {
  id: string
  mentorado: string
  nota: number
  comentario: string
  data: string
  formulario: string
}

export default function InsightsPage() {
  const [metricas, setMetricas] = useState<MetricaFormulario[]>([])
  const [respostasDetalhadas, setRespostasDetalhadas] = useState<RespostaDetalhada[]>([])
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const dateFilters = useDateFilters()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInsights()
  }, [filtroTipo, dateFilters.filtroTempo, dateFilters.dataInicio, dateFilters.dataFim])

  const loadInsights = async () => {
    try {
      const metricas: MetricaFormulario[] = []
      const respostasDetalhadas: RespostaDetalhada[] = []

      // Usar filtros de data do nosso sistema avançado
      const dateFilter = dateFilters.getDateFilter()
      const dataInicio = dateFilter?.start ? new Date(dateFilter.start) : null

      // 1. Carregar métricas NPS
      try {
        const { data: npsData } = await supabase
          .from('nps_respostas')
          .select(`
            id,
            nota_nps,
            o_que_surpreendeu_positivamente,
            depoimento,
            data_resposta,
            mentorados!inner(nome_completo)
          `)
          .gte('data_resposta', dataInicio ? dataInicio.toISOString() : new Date('1900-01-01').toISOString())

        if (npsData && npsData.length > 0) {
          const npsScore = npsData.reduce((sum, item) => sum + item.nota_nps, 0) / npsData.length
          metricas.push({
            id: 'nps',
            nome: 'NPS Geral',
            tipo: 'nps',
            periodo: dataInicio ? `Período filtrado` : 'Todos os dados',
            totalRespostas: npsData.length,
            npsScore: Math.round(npsScore * 10) / 10,
            tendencia: npsScore >= 7 ? 'up' : npsScore >= 5 ? 'stable' : 'down',
            variacao: Math.round((npsScore - 7) * 10)
          })

          // Adicionar respostas detalhadas do NPS
          npsData.forEach(item => {
            respostasDetalhadas.push({
              id: item.id,
              mentorado: (item.mentorados as any)?.nome_completo || 'Nome não encontrado',
              nota: item.nota_nps,
              comentario: item.depoimento || item.o_que_surpreendeu_positivamente || 'Sem comentário',
              data: new Date(item.data_resposta).toLocaleDateString('pt-BR'),
              formulario: 'NPS Geral'
            })
          })
        }
      } catch (error) {
        console.log('Erro ao carregar NPS:', error)
      }

      // 2. Carregar métricas dos módulos específicos
      const modulosTables = [
        { nome: 'Módulo IV - Vendas', tabela: 'modulo_iv_vendas_respostas', campo_nps: 'nps', campo_data: 'data_resposta' },
        { nome: 'Módulo III - Marketing', tabela: 'modulo_iii_gestao_marketing_respostas', campo_nps: 'nps', campo_data: 'data_resposta' }
      ]

      for (const modulo of modulosTables) {
        try {
          const { data: moduloData } = await supabase
            .from(modulo.tabela)
            .select(`
              id,
              ${modulo.campo_nps},
              ${modulo.campo_data},
              mentorados!inner(nome_completo)
            `)
            .gte(modulo.campo_data, dataInicio ? dataInicio.toISOString() : new Date('1900-01-01').toISOString())

          if (moduloData && moduloData.length > 0) {
            const npsScore = moduloData.reduce((sum, item) => sum + ((item as any)[modulo.campo_nps] || 0), 0) / moduloData.length
            metricas.push({
              id: modulo.tabela,
              nome: modulo.nome,
              tipo: 'modulo',
              periodo: dataInicio ? `Período filtrado` : 'Todos os dados',
              totalRespostas: moduloData.length,
              satisfacaoMedia: Math.round(npsScore * 10) / 10,
              tendencia: npsScore >= 7 ? 'up' : npsScore >= 5 ? 'stable' : 'down',
              variacao: Math.round((npsScore - 7) * 10)
            })

            // Adicionar respostas detalhadas do módulo
            moduloData.forEach(item => {
              respostasDetalhadas.push({
                id: (item as any).id,
                mentorado: ((item as any).mentorados as any)?.nome_completo || 'Nome não encontrado',
                nota: (item as any)[modulo.campo_nps] || 0,
                comentario: 'Resposta do módulo',
                data: new Date((item as any)[modulo.campo_data]).toLocaleDateString('pt-BR'),
                formulario: modulo.nome
              })
            })
          }
        } catch (error) {
          console.log(`Erro ao carregar ${modulo.nome}:`, error)
        }
      }

      // 3. Carregar dados da tabela genérica se não tiver dados específicos
      if (metricas.length === 0) {
        try {
          const { data: genericData } = await supabase
            .from('formularios_respostas')
            .select(`
              id,
              formulario,
              resposta_json,
              data_envio,
              mentorados!inner(nome_completo)
            `)
            .gte('data_envio', dataInicio ? dataInicio.toISOString() : new Date('1900-01-01').toISOString())

          if (genericData && genericData.length > 0) {
            // Agrupar por tipo de formulário
            const formularioGroups = genericData.reduce((groups, item) => {
              const key = item.formulario
              if (!groups[key]) groups[key] = []
              groups[key].push(item)
              return groups
            }, {} as Record<string, any[]>)

            Object.entries(formularioGroups).forEach(([formulario, respostas]) => {
              const npsValues = respostas.map(r => {
                const nps = r.resposta_json?.respostas?.nps || r.resposta_json?.respostas?.nota_nps || 0
                return typeof nps === 'number' ? nps : 0
              }).filter(n => n > 0)

              if (npsValues.length > 0) {
                const npsScore = npsValues.reduce((sum, val) => sum + val, 0) / npsValues.length
                metricas.push({
                  id: formulario,
                  nome: formulario.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  tipo: 'formulario',
                  periodo: dataInicio ? `Período filtrado` : 'Todos os dados',
                  totalRespostas: respostas.length,
                  satisfacaoMedia: Math.round(npsScore * 10) / 10,
                  tendencia: npsScore >= 7 ? 'up' : npsScore >= 5 ? 'stable' : 'down',
                  variacao: Math.round((npsScore - 7) * 10)
                })

                // Adicionar respostas detalhadas
                respostas.forEach(item => {
                  const nps = item.resposta_json?.respostas?.nps || item.resposta_json?.respostas?.nota_nps || 0
                  const comentario = item.resposta_json?.respostas?.depoimento || 
                                   item.resposta_json?.respostas?.o_que_surpreendeu_positivamente || 
                                   'Sem comentário'
                  
                  respostasDetalhadas.push({
                    id: (item as any).id,
                    mentorado: ((item as any).mentorados as any)?.nome_completo || 'Nome não encontrado',
                    nota: nps,
                    comentario: comentario,
                    data: new Date(item.data_envio).toLocaleDateString('pt-BR'),
                    formulario: formulario.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                  })
                })
              }
            })
          }
        } catch (error) {
          console.log('Erro ao carregar dados genéricos:', error)
        }
      }

      // Ordenar respostas por data
      respostasDetalhadas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

      setMetricas(metricas)
      setRespostasDetalhadas(respostasDetalhadas)
    } catch (error) {
      console.error('Erro ao carregar insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const getOverallStats = () => {
    const totalRespostas = metricas.reduce((sum, m) => sum + m.totalRespostas, 0)
    const npsGeral = metricas.find(m => m.tipo === 'nps')?.npsScore || 0
    const satisfacaoGeral = metricas
      .filter(m => m.satisfacaoMedia)
      .reduce((sum, m, _, arr) => sum + (m.satisfacaoMedia || 0) / arr.length, 0)
    
    const feedbacksPositivos = respostasDetalhadas.filter(r => r.nota >= 8).length
    const percentualPositivo = (feedbacksPositivos / respostasDetalhadas.length) * 100

    return {
      totalRespostas,
      npsGeral,
      satisfacaoGeral: Math.round(satisfacaoGeral * 10) / 10,
      percentualPositivo: Math.round(percentualPositivo)
    }
  }

  const getTendenciaIcon = (tendencia: string, variacao: number) => {
    if (tendencia === 'up') {
      return <ArrowUp className="h-4 w-4 text-green-500" />
    } else if (tendencia === 'down') {
      return <ArrowDown className="h-4 w-4 text-red-500" />
    }
    return <div className="h-4 w-4" />
  }

  const getNPSColor = (score: number) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getNotaColor = (nota: number) => {
    if (nota >= 9) return 'bg-green-100 text-green-700 border-green-300'
    if (nota >= 7) return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    return 'bg-red-100 text-red-700 border-red-300'
  }

  const stats = getOverallStats()

  return (
    <div className="flex-1 overflow-y-auto">
      <Header 
        title="Insights & Resultados" 
        subtitle={`${stats.totalRespostas} respostas analisadas • NPS ${stats.npsGeral} • ${stats.percentualPositivo}% satisfação`} 
      />
      
      <main className="flex-1 p-6 space-y-6">
        {/* Stats Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">NPS Geral</p>
                  <p className={`text-2xl font-bold ${getNPSColor(stats.npsGeral)}`}>
                    {stats.npsGeral}
                  </p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Satisfação Média</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.satisfacaoGeral}/10
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Respostas</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.totalRespostas}
                  </p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Feedbacks Positivos</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.percentualPositivo}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="nps">NPS</SelectItem>
              <SelectItem value="satisfacao">Satisfação</SelectItem>
              <SelectItem value="feedback">Feedback</SelectItem>
            </SelectContent>
          </Select>

          <DateFilters
            filtroTempo={dateFilters.filtroTempo}
            dataInicio={dateFilters.dataInicio}
            dataFim={dateFilters.dataFim}
            setFiltroTempo={dateFilters.setFiltroTempo}
            setDataInicio={dateFilters.setDataInicio}
            setDataFim={dateFilters.setDataFim}
            resetFilters={dateFilters.resetFilters}
          />

          <Button variant="outline" className="ml-auto">
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>

        {/* Métricas por Formulário */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Métricas por Formulário</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {metricas.map((metrica) => (
              <Card key={metrica.id} className="rounded-2xl shadow-sm border border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {metrica.nome}
                      </CardTitle>
                      <p className="text-sm text-gray-500">{metrica.periodo}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {metrica.tipo.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Respostas</span>
                      <span className="font-medium">{metrica.totalRespostas}</span>
                    </div>
                    
                    {metrica.npsScore && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">NPS Score</span>
                        <div className="flex items-center space-x-2">
                          <span className={`font-bold ${getNPSColor(metrica.npsScore)}`}>
                            {metrica.npsScore}
                          </span>
                          {getTendenciaIcon(metrica.tendencia, metrica.variacao)}
                          <span className={`text-xs ${metrica.tendencia === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {metrica.variacao > 0 ? '+' : ''}{metrica.variacao}%
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {metrica.satisfacaoMedia && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Satisfação</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-green-600">
                            {metrica.satisfacaoMedia}/10
                          </span>
                          {getTendenciaIcon(metrica.tendencia, metrica.variacao)}
                          <span className={`text-xs ${metrica.tendencia === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {metrica.variacao > 0 ? '+' : ''}{metrica.variacao}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Respostas Recentes */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Respostas Recentes</h2>
          <div className="space-y-3">
            {respostasDetalhadas.slice(0, 6).map((resposta) => (
              <Card key={resposta.id} className="rounded-xl border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">{resposta.mentorado}</span>
                          <Badge className={`text-xs ${getNotaColor(resposta.nota)}`}>
                            {resposta.nota}/10
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{resposta.comentario}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{resposta.formulario}</span>
                          <span>•</span>
                          <span>{new Date(resposta.data).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Gráfico de Tendências (Placeholder) */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Tendência de Satisfação (Últimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Gráfico de tendências será implementado</p>
                <p className="text-sm">Conectar com biblioteca de charts (Chart.js, Recharts, etc.)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}