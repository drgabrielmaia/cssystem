'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase, type FormularioResposta } from '@/lib/supabase'
import { analyzeCompleteResponse } from '@/lib/intelligent-analyzer'
import { gemmaFormsAnalyzer as gemmaAnalyzer } from '@/lib/gemma-forms-analyzer'
import { 
  Search, 
  MessageSquare, 
  User, 
  Calendar, 
  Star,
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Eye,
  Filter,
  Download
} from 'lucide-react'

interface RespostaComAnalise extends FormularioResposta {
  mentorado_nome: string
  mentorado_email: string
  mentorado_turma: string
  analysis?: ReturnType<typeof analyzeCompleteResponse>
  gptAnalysis?: any
}

export default function RespostasPage() {
  const [respostas, setRespostas] = useState<RespostaComAnalise[]>([])
  const [filteredRespostas, setFilteredRespostas] = useState<RespostaComAnalise[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFormulario, setSelectedFormulario] = useState<string>('todos')
  const [selectedSentiment, setSelectedSentiment] = useState<string>('todos')
  const [showAnalysis, setShowAnalysis] = useState(false)

  useEffect(() => {
    loadRespostas()
  }, [])

  useEffect(() => {
    filterRespostas()
  }, [searchTerm, selectedFormulario, selectedSentiment, respostas])

  const loadRespostas = async () => {
    try {
      const todasRespostas: RespostaComAnalise[] = []

      // Carregar respostas da tabela genérica
      const { data: respostasGenericas } = await supabase
        .from('formularios_respostas')
        .select(`
          *,
          mentorados!inner(nome_completo, email, turma)
        `)
        .order('data_envio', { ascending: false })

      // NOVO: Carregar respostas da tabela form_submissions (formulários novos)
      const { data: formSubmissions } = await supabase
        .from('form_submissions')
        .select(`
          *,
          form_templates!inner(name, form_type),
          mentorados(id, nome_completo, email, turma)
        `)
        .order('created_at', { ascending: false })

      if (respostasGenericas) {
        const formatadas = respostasGenericas.map(resposta => ({
          ...resposta,
          mentorado_nome: resposta.mentorados?.nome_completo || 'Nome não encontrado',
          mentorado_email: resposta.mentorados?.email || '',
          mentorado_turma: resposta.mentorados?.turma || '',
          analysis: analyzeCompleteResponse(resposta)
        }))
        todasRespostas.push(...formatadas)
      }

      // Processar form_submissions
      if (formSubmissions) {
        for (const submission of formSubmissions) {
          try {
            let mentoradoInfo = null

            // Primeiro, verificar se já tem mentorado_id direto (formulários NPS/Survey)
            if (submission.mentorado_id && submission.mentorados) {
              mentoradoInfo = {
                id: submission.mentorados.id,
                nome_completo: submission.mentorados.nome_completo,
                email: submission.mentorados.email,
                turma: submission.mentorados.turma
              }
            }
            // Senão, buscar através do lead_id (formulários de lead)
            else if (submission.lead_id) {
              const { data: lead } = await supabase
                .from('leads')
                .select(`
                  id,
                  mentorados!inner(id, nome_completo, email, turma)
                `)
                .eq('id', submission.lead_id)
                .single()

              if (lead?.mentorados) {
                mentoradoInfo = {
                  id: lead.mentorados.id,
                  nome_completo: lead.mentorados.nome_completo,
                  email: lead.mentorados.email,
                  turma: lead.mentorados.turma
                }
              }
            }

            // Criar formatado mesmo sem mentorado identificado
            const formatado = {
              id: submission.id,
              mentorado_id: mentoradoInfo?.id || null,
              formulario: submission.template_slug || submission.form_templates?.name || 'formulario_personalizado',
              resposta_json: submission.submission_data,
              data_envio: submission.created_at,
              mentorado_nome: mentoradoInfo?.nome_completo ||
                               submission.submission_data?.email ||
                               'Respondente anônimo',
              mentorado_email: mentoradoInfo?.email ||
                              submission.submission_data?.email ||
                              'Email não informado',
              mentorado_turma: mentoradoInfo?.turma || 'Não identificado',
              analysis: analyzeCompleteResponse({
                formulario: submission.template_slug || 'custom',
                resposta_json: submission.submission_data
              })
            }
            todasRespostas.push(formatado)
          } catch (error) {
            console.warn('Erro ao processar submission:', submission.id, error)
          }
        }
      }

      // Carregar respostas NPS
      const { data: respostasNPS } = await supabase
        .from('nps_respostas')
        .select(`
          *,
          mentorados!inner(nome_completo, email, turma)
        `)
        .order('data_resposta', { ascending: false })

      if (respostasNPS) {
        const formatadas = respostasNPS.map(resposta => ({
          id: resposta.id,
          mentorado_id: resposta.mentorado_id,
          formulario: 'nps_geral',
          resposta_json: {
            respostas: {
              nota_nps: resposta.nota_nps,
              o_que_surpreendeu_positivamente: resposta.o_que_surpreendeu_positivamente,
              autoriza_depoimento: resposta.autoriza_depoimento,
              depoimento: resposta.depoimento,
              o_que_faltou_para_9_10: resposta.o_que_faltou_para_9_10,
              pode_contatar: resposta.pode_contatar
            }
          },
          data_envio: resposta.data_resposta,
          mentorado_nome: resposta.mentorados?.nome_completo || 'Nome não encontrado',
          mentorado_email: resposta.mentorados?.email || '',
          mentorado_turma: resposta.mentorados?.turma || '',
          analysis: analyzeCompleteResponse({
            formulario: 'nps_geral',
            resposta_json: { respostas: { nota_nps: resposta.nota_nps } }
          })
        }))
        todasRespostas.push(...formatadas)
      }

      // Carregar respostas do Módulo IV - Vendas
      const { data: respostasVendas } = await supabase
        .from('modulo_iv_vendas_respostas')
        .select(`
          *,
          mentorados!inner(nome_completo, email, turma)
        `)
        .order('data_resposta', { ascending: false })

      if (respostasVendas) {
        const formatadas = respostasVendas.map(resposta => ({
          id: resposta.id,
          mentorado_id: resposta.mentorado_id,
          formulario: 'modulo_iv_vendas',
          resposta_json: {
            respostas: {
              qualificacao_pacientes: resposta.qualificacao_pacientes,
              spin_selling: resposta.spin_selling,
              venda_consultiva: resposta.venda_consultiva,
              taxa_fechamento: resposta.taxa_fechamento,
              feedback_preco: resposta.feedback_preco,
              nps: resposta.nps
            }
          },
          data_envio: resposta.data_resposta,
          mentorado_nome: resposta.mentorados?.nome_completo || 'Nome não encontrado',
          mentorado_email: resposta.mentorados?.email || '',
          mentorado_turma: resposta.mentorados?.turma || '',
          analysis: analyzeCompleteResponse({
            formulario: 'modulo_iv_vendas',
            resposta_json: { respostas: { nps: resposta.nps } }
          })
        }))
        todasRespostas.push(...formatadas)
      }

      // Carregar respostas do Módulo III - Marketing
      const { data: respostasMarketing } = await supabase
        .from('modulo_iii_gestao_marketing_respostas')
        .select(`
          *,
          mentorados!inner(nome_completo, email, turma)
        `)
        .order('data_resposta', { ascending: false })

      if (respostasMarketing) {
        const formatadas = respostasMarketing.map(resposta => ({
          id: resposta.id,
          mentorado_id: resposta.mentorado_id,
          formulario: 'modulo_iii_gestao_marketing',
          resposta_json: {
            respostas: {
              jornada_paciente: resposta.jornada_paciente,
              modelo_disney: resposta.modelo_disney,
              neuromarketing: resposta.neuromarketing,
              reduzir_noshow: resposta.reduzir_noshow,
              estruturar_processos: resposta.estruturar_processos,
              feedback_operacao: resposta.feedback_operacao,
              nps: resposta.nps
            }
          },
          data_envio: resposta.data_resposta,
          mentorado_nome: resposta.mentorados?.nome_completo || 'Nome não encontrado',
          mentorado_email: resposta.mentorados?.email || '',
          mentorado_turma: resposta.mentorados?.turma || '',
          analysis: analyzeCompleteResponse({
            formulario: 'modulo_iii_gestao_marketing',
            resposta_json: { respostas: { nps: resposta.nps } }
          })
        }))
        todasRespostas.push(...formatadas)
      }

      // Ordenar todas as respostas por data
      todasRespostas.sort((a, b) => new Date(b.data_envio).getTime() - new Date(a.data_envio).getTime())
      
      setRespostas(todasRespostas)
    } catch (error) {
      console.error('Erro ao carregar respostas:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterRespostas = () => {
    let filtered = respostas

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(resposta =>
        resposta.mentorado_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resposta.mentorado_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resposta.formulario.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro por formulário
    if (selectedFormulario !== 'todos') {
      filtered = filtered.filter(resposta => resposta.formulario === selectedFormulario)
    }

    // Filtro por sentimento
    if (selectedSentiment !== 'todos') {
      filtered = filtered.filter(resposta => 
        resposta.analysis?.sentiment.label === selectedSentiment
      )
    }

    setFilteredRespostas(filtered)
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'muito_positivo': return 'text-emerald-600 bg-emerald-100 border-emerald-300'
      case 'positivo': return 'text-green-600 bg-green-100 border-green-300'
      case 'neutro': return 'text-yellow-600 bg-yellow-100 border-yellow-300'
      case 'negativo': return 'text-orange-600 bg-orange-100 border-orange-300'
      case 'muito_negativo': return 'text-red-600 bg-red-100 border-red-300'
      default: return 'text-gray-600 bg-gray-100 border-gray-300'
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'muito_positivo': return '😍'
      case 'positivo': return '😊'
      case 'neutro': return '😐'
      case 'negativo': return '😕'
      case 'muito_negativo': return '😞'
      default: return '❓'
    }
  }

  const exportarRespostas = () => {
    const csvContent = [
      ['Mentorado', 'Email', 'Turma', 'Formulário', 'Data', 'NPS', 'Sentimento', 'Risco', 'Oportunidade', 'Persona'],
      ...filteredRespostas.map(resposta => [
        resposta.mentorado_nome,
        resposta.mentorado_email,
        resposta.mentorado_turma,
        resposta.formulario,
        new Date(resposta.data_envio).toLocaleDateString('pt-BR'),
        resposta.analysis?.npsScore || '',
        resposta.analysis?.sentiment.label || '',
        `${resposta.analysis?.riskScore || 0}%`,
        `${resposta.analysis?.opportunityScore || 0}%`,
        resposta.analysis?.personaAnalysis.persona || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `respostas_formularios_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="📋 Respostas dos Formulários" subtitle="Carregando respostas..." />
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 animate-spin text-purple-600" />
            <span className="text-purple-600">Analisando respostas com IA...</span>
          </div>
        </div>
      </div>
    )
  }

  const formularios = Array.from(new Set(respostas.map(r => r.formulario)))
  const sentiments = Array.from(new Set(respostas.map(r => r.analysis?.sentiment.label).filter(Boolean)))

  return (
    <div className="flex-1 overflow-y-auto">
      <Header 
        title="📋 Todas as Respostas dos Formulários" 
        subtitle={`${filteredRespostas.length} respostas encontradas • Análise completa com IA`}
      />
      
      <main className="flex-1 p-6 space-y-6">
        {/* Filtros e Controles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filtros e Análise</span>
              </span>
              <div className="flex space-x-2">
                <Button
                  onClick={() => setShowAnalysis(!showAnalysis)}
                  variant="outline"
                  size="sm"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {showAnalysis ? 'Ocultar' : 'Mostrar'} IA
                </Button>
                <Button
                  onClick={exportarRespostas}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filtro por Formulário */}
              <select
                value={selectedFormulario}
                onChange={(e) => setSelectedFormulario(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="todos">Todos os formulários</option>
                {formularios.map(form => (
                  <option key={form} value={form} className="capitalize">
                    {form}
                  </option>
                ))}
              </select>

              {/* Filtro por Sentimento */}
              <select
                value={selectedSentiment}
                onChange={(e) => setSelectedSentiment(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="todos">Todos os sentimentos</option>
                {sentiments.map(sentiment => (
                  <option key={sentiment} value={sentiment}>
                    {getSentimentIcon(sentiment!)} {sentiment?.replace('_', ' ')}
                  </option>
                ))}
              </select>

              {/* Status */}
              <div className="flex items-center justify-center bg-blue-50 rounded-lg p-2">
                <span className="text-sm font-medium text-blue-700">
                  {filteredRespostas.length} resultado{filteredRespostas.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Respostas */}
        <div className="space-y-4">
          {filteredRespostas.map((resposta) => (
            <Card key={resposta.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{resposta.mentorado_nome}</CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span>{resposta.mentorado_turma}</span>
                        <span>•</span>
                        <span>{resposta.mentorado_email}</span>
                        <span>•</span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(resposta.data_envio).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="capitalize">
                      {resposta.formulario}
                    </Badge>
                    {resposta.analysis?.npsScore && (
                      <Badge className="bg-blue-100 text-blue-800">
                        <Star className="h-3 w-3 mr-1" />
                        NPS {resposta.analysis.npsScore}
                      </Badge>
                    )}
                    {resposta.analysis?.sentiment && (
                      <Badge className={getSentimentColor(resposta.analysis.sentiment.label)}>
                        {getSentimentIcon(resposta.analysis.sentiment.label)} {resposta.analysis.sentiment.label.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Análise de IA */}
                {showAnalysis && resposta.analysis && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-800 mb-3 flex items-center">
                      <Brain className="h-4 w-4 mr-2" />
                      Análise Inteligente
                    </h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{resposta.analysis.riskScore}%</div>
                        <div className="text-xs text-red-700">Risco</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{resposta.analysis.opportunityScore}%</div>
                        <div className="text-xs text-green-700">Oportunidade</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-purple-600">{resposta.analysis.personaAnalysis.persona}</div>
                        <div className="text-xs text-purple-700">Persona</div>
                      </div>
                      <div className="text-center">
                        <Badge className={`text-xs ${
                          resposta.analysis.priorityLevel === 'CRÍTICA' ? 'bg-red-100 text-red-800' :
                          resposta.analysis.priorityLevel === 'ALTA' ? 'bg-orange-100 text-orange-800' :
                          resposta.analysis.priorityLevel === 'MÉDIA' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {resposta.analysis.priorityLevel}
                        </Badge>
                      </div>
                    </div>

                    {resposta.analysis.keyInsights.length > 0 && (
                      <div className="space-y-1">
                        {resposta.analysis.keyInsights.slice(0, 2).map((insight, idx) => (
                          <p key={idx} className="text-sm text-purple-700 bg-purple-100 rounded px-2 py-1">
                            💡 {insight}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Respostas do Formulário */}
                <div className="space-y-3">
                  {resposta.resposta_json?.respostas && Object.entries(resposta.resposta_json.respostas).map(([pergunta, resposta_valor]) => (
                    <div key={pergunta} className="border-b border-gray-100 pb-3 last:border-b-0">
                      <div className="flex flex-col space-y-2">
                        <h5 className="text-sm font-medium text-gray-700 capitalize">
                          {pergunta.replace(/_/g, ' ')}
                        </h5>
                        <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                          {typeof resposta_valor === 'string' ? (
                            resposta_valor.length > 150 ? (
                              <details>
                                <summary className="cursor-pointer font-medium text-blue-600">
                                  {resposta_valor.substring(0, 150)}... (clique para ver completo)
                                </summary>
                                <div className="mt-2 whitespace-pre-wrap">{resposta_valor}</div>
                              </details>
                            ) : (
                              <div className="whitespace-pre-wrap">{resposta_valor}</div>
                            )
                          ) : Array.isArray(resposta_valor) ? (
                            <ul className="list-disc list-inside space-y-1">
                              {resposta_valor.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <span>{String(resposta_valor)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ações Recomendadas */}
                {showAnalysis && resposta.analysis?.actionableItems && resposta.analysis.actionableItems.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <h5 className="text-sm font-medium text-blue-800 mb-2">⚡ Ações Recomendadas:</h5>
                    <div className="space-y-1">
                      {resposta.analysis.actionableItems.slice(0, 3).map((action, idx) => (
                        <p key={idx} className="text-sm text-blue-700">
                          • {action}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredRespostas.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma resposta encontrada
            </h3>
            <p className="text-gray-500">
              Tente ajustar os filtros ou aguarde novos formulários serem respondidos.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}