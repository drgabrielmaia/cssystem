'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { ArrowLeft, User, Calendar, FileText, BarChart3, Lightbulb, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface FormResponse {
  id: number
  mentorado_id: string
  data_envio: string
  resposta_json: any
  mentorados?: {
    nome_completo: string
    email: string
  }
  analise?: {
    satisfacao: number
    pontos_melhoria: string[]
    recomendacoes: string[]
    resumo: string
  }
}

export default function FormularioDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const tipo = decodeURIComponent(params.tipo as string)

  const [respostas, setRespostas] = useState<FormResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [analisandoId, setAnalisandoId] = useState<number | null>(null)

  useEffect(() => {
    fetchRespostas()
  }, [tipo])

  const fetchRespostas = async () => {
    try {
      console.log('🔍 Buscando respostas para:', tipo)

      const { data, error } = await supabase
        .from('formularios_respostas')
        .select(`
          id,
          mentorado_id,
          data_envio,
          resposta_json,
          mentorados (
            nome_completo,
            email
          )
        `)
        .eq('formulario', tipo)
        .order('data_envio', { ascending: false })

      if (error) {
        console.error('Erro ao buscar respostas:', error)
        return
      }

      console.log('📊 Respostas encontradas:', data?.length || 0)
      console.log('🔍 Primeira resposta (debug):', data?.[0])
      setRespostas(data || [])

    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const analisarResposta = async (resposta: FormResponse) => {
    setAnalisandoId(resposta.id)

    try {
      const response = await fetch('/api/analisar-formulario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tipo_formulario: tipo,
          resposta: resposta.resposta_json,
          mentorado_nome: resposta.mentorados?.nome_completo
        })
      })

      const result = await response.json()

      if (result.success) {
        setRespostas(prev => prev.map(r =>
          r.id === resposta.id
            ? { ...r, analise: result.analise }
            : r
        ))
      } else {
        console.error('Erro na análise:', result.error)
      }

    } catch (error) {
      console.error('Erro ao analisar resposta:', error)
    } finally {
      setAnalisandoId(null)
    }
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

  const renderResposta = (resposta_json: any) => {
    if (typeof resposta_json === 'object' && resposta_json !== null) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(resposta_json).map(([key, value]) => {
            // Formatar a chave para ser mais legível
            const formattedKey = key
              .replace(/_/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase())

            // Formatar o valor baseado no tipo
            let content = null

            if (typeof value === 'boolean') {
              content = (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {value ? 'Sim' : 'Não'}
                </span>
              )
            } else if (Array.isArray(value)) {
              if (value.length === 0) {
                content = <span className="text-gray-400 italic">Nenhum item</span>
              } else if (typeof value[0] === 'object') {
                content = (
                  <div className="space-y-2">
                    {value.map((item, index) => (
                      <div key={index} className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                        {typeof item === 'object' ?
                          Object.entries(item).map(([k, v]) => (
                            <div key={k} className="text-sm">
                              <span className="font-medium text-blue-700">{k}:</span>{' '}
                              <span className="text-blue-900">{String(v)}</span>
                            </div>
                          )) :
                          <span className="text-blue-900">{String(item)}</span>
                        }
                      </div>
                    ))}
                  </div>
                )
              } else {
                content = (
                  <div className="flex flex-wrap gap-1">
                    {value.map((item, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">
                        {String(item)}
                      </span>
                    ))}
                  </div>
                )
              }
            } else if (typeof value === 'object' && value !== null) {
              content = (
                <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg space-y-1">
                  {Object.entries(value).map(([k, v]) => (
                    <div key={k} className="text-sm">
                      <span className="font-medium text-purple-700">{k}:</span>{' '}
                      <span className="text-purple-900">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )
            } else if (typeof value === 'number') {
              content = (
                <span className="inline-flex items-center px-3 py-1 rounded-md bg-orange-100 text-orange-800 font-medium">
                  {value}
                </span>
              )
            } else {
              content = <span className="text-gray-800">{String(value)}</span>
            }

            return (
              <div key={key} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="mb-2">
                  <h4 className="font-medium text-gray-900">{formattedKey}</h4>
                </div>
                <div>{content}</div>
              </div>
            )
          })}
        </div>
      )
    }
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
          {JSON.stringify(resposta_json, null, 2)}
        </pre>
      </div>
    )
  }

  const getSatisfacaoColor = (nivel: number) => {
    if (nivel >= 8) return 'text-green-600'
    if (nivel >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSatisfacaoLabel = (nivel: number) => {
    if (nivel >= 8) return 'Muito Satisfeito'
    if (nivel >= 6) return 'Satisfeito'
    if (nivel >= 4) return 'Neutro'
    return 'Insatisfeito'
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header
          title={`📋 ${getFormularioNome(tipo)}`}
          subtitle="Carregando respostas..."
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Carregando respostas...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title={`📋 ${getFormularioNome(tipo)}`}
        subtitle={`${respostas.length} respostas encontradas`}
      />

      <main className="flex-1 p-6 space-y-6">
        <Button
          onClick={() => router.push('/formularios')}
          variant="outline"
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Formulários
        </Button>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Respostas</p>
                  <p className="text-2xl font-bold">{respostas.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <User className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Mentorados Únicos</p>
                  <p className="text-2xl font-bold">
                    {new Set(respostas.map(r => r.mentorado_id)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Análises Feitas</p>
                  <p className="text-2xl font-bold">
                    {respostas.filter(r => r.analise).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de respostas */}
        <div className="space-y-6">
          {respostas.map((resposta) => (
            <Card key={resposta.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold">
                        {resposta.mentorados?.nome_completo || `Mentorado ${resposta.mentorado_id}`}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {resposta.mentorados?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {new Date(resposta.data_envio).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {/* Resposta */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-blue-600" />
                      Resposta do Formulário
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      {renderResposta(resposta.resposta_json)}
                    </div>
                  </div>

                  {/* Análise da IA */}
                  {resposta.analise ? (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Análise da IA
                      </h4>

                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Nível de Satisfação */}
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-center mb-2">
                            <Star className="h-4 w-4 text-blue-600 mr-1" />
                            <span className="font-medium text-blue-900">Nível de Satisfação</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xl font-bold ${getSatisfacaoColor(resposta.analise.satisfacao)}`}>
                              {resposta.analise.satisfacao}/10
                            </span>
                            <Badge variant="secondary" className={getSatisfacaoColor(resposta.analise.satisfacao)}>
                              {getSatisfacaoLabel(resposta.analise.satisfacao)}
                            </Badge>
                          </div>
                        </div>

                        {/* Resumo */}
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="flex items-center mb-2">
                            <FileText className="h-4 w-4 text-green-600 mr-1" />
                            <span className="font-medium text-green-900">Resumo</span>
                          </div>
                          <p className="text-sm text-green-800">{resposta.analise.resumo}</p>
                        </div>
                      </div>

                      {/* Pontos de Melhoria */}
                      {resposta.analise.pontos_melhoria.length > 0 && (
                        <div className="mt-4 bg-orange-50 p-3 rounded-lg">
                          <div className="flex items-center mb-2">
                            <Lightbulb className="h-4 w-4 text-orange-600 mr-1" />
                            <span className="font-medium text-orange-900">Pontos de Melhoria</span>
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-sm text-orange-800">
                            {resposta.analise.pontos_melhoria.map((ponto, index) => (
                              <li key={index}>{ponto}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recomendações */}
                      {resposta.analise.recomendacoes.length > 0 && (
                        <div className="mt-4 bg-purple-50 p-3 rounded-lg">
                          <div className="flex items-center mb-2">
                            <Star className="h-4 w-4 text-purple-600 mr-1" />
                            <span className="font-medium text-purple-900">Recomendações</span>
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-sm text-purple-800">
                            {resposta.analise.recomendacoes.map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border-t pt-4">
                      <Button
                        onClick={() => analisarResposta(resposta)}
                        disabled={analisandoId === resposta.id}
                        className="w-full"
                      >
                        {analisandoId === resposta.id ? (
                          <>
                            <BarChart3 className="mr-2 h-4 w-4 animate-spin" />
                            Analisando com IA...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Analisar com IA
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {respostas.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma resposta encontrada
              </h3>
              <p className="text-gray-500">
                Não há respostas para este formulário ainda.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}