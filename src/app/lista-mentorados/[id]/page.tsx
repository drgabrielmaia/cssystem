'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase, type Mentorado, type FormularioResposta } from '@/lib/supabase'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  FileText, 
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare,
  Star,
  Eye
} from 'lucide-react'

interface FormularioInfo {
  tipo: string
  nome_completo: string
  data_resposta?: string
  nps?: number
  status: 'completed' | 'pending'
  url?: string
}

export default function MentoradoDetailPage() {
  const params = useParams()
  const [mentorado, setMentorado] = useState<Mentorado | null>(null)
  const [formularios, setFormularios] = useState<FormularioInfo[]>([])
  const [respostasCompletas, setRespostasCompletas] = useState<FormularioResposta[]>([])
  const [loading, setLoading] = useState(true)
  const [showResponses, setShowResponses] = useState(false)
  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMentoradoData() {
      if (!params.id) return

      try {
        // Buscar dados do mentorado
        const { data: mentoradoData, error: mentoradoError } = await supabase
          .from('mentorados')
          .select('*')
          .eq('id', params.id)
          .single()

        if (mentoradoError) throw mentoradoError
        setMentorado(mentoradoData)

        // Buscar formulários respondidos da nova tabela unificada
        const { data: respostasData } = await supabase
          .from('formularios_respostas')
          .select('*')
          .eq('mentorado_id', params.id)

        const baseUrl = window.location.origin

        const formulariosInfo: FormularioInfo[] = [
          {
            tipo: 'nps',
            nome_completo: 'Pesquisa NPS',
            data_resposta: respostasData?.find(r => r.formulario === 'nps')?.data_envio,
            nps: respostasData?.find(r => r.formulario === 'nps')?.resposta_json?.respostas?.nota_nps,
            status: respostasData?.some(r => r.formulario === 'nps') ? 'completed' : 'pending',
            url: `${baseUrl}/formulario/nps?mentorado_id=${params.id}`
          },
          {
            tipo: 'capacitacao',
            nome_completo: 'Módulo Capacitação Técnica',
            data_resposta: respostasData?.find(r => r.formulario === 'capacitacao')?.data_envio,
            nps: respostasData?.find(r => r.formulario === 'capacitacao')?.resposta_json?.respostas?.nota_nps,
            status: respostasData?.some(r => r.formulario === 'capacitacao') ? 'completed' : 'pending',
            url: `${baseUrl}/formulario/capacitacao?mentorado_id=${params.id}`
          },
          {
            tipo: 'digital',
            nome_completo: 'Módulo II - Posicionamento Digital',
            data_resposta: respostasData?.find(r => r.formulario === 'digital')?.data_envio,
            nps: respostasData?.find(r => r.formulario === 'digital')?.resposta_json?.respostas?.nota_nps,
            status: respostasData?.some(r => r.formulario === 'digital') ? 'completed' : 'pending',
            url: `${baseUrl}/formulario/digital?mentorado_id=${params.id}`
          },
          {
            tipo: 'gestao',
            nome_completo: 'Módulo III - Gestão e Marketing',
            data_resposta: respostasData?.find(r => r.formulario === 'gestao')?.data_envio,
            nps: respostasData?.find(r => r.formulario === 'gestao')?.resposta_json?.respostas?.nota_nps,
            status: respostasData?.some(r => r.formulario === 'gestao') ? 'completed' : 'pending',
            url: `${baseUrl}/formulario/gestao?mentorado_id=${params.id}`
          },
          {
            tipo: 'vendas',
            nome_completo: 'Módulo IV - Vendas',
            data_resposta: respostasData?.find(r => r.formulario === 'vendas')?.data_envio,
            nps: respostasData?.find(r => r.formulario === 'vendas')?.resposta_json?.respostas?.nota_nps,
            status: respostasData?.some(r => r.formulario === 'vendas') ? 'completed' : 'pending',
            url: `${baseUrl}/formulario/vendas?mentorado_id=${params.id}`
          }
        ]

        setFormularios(formulariosInfo)
        setRespostasCompletas(respostasData || [])
      } catch (error) {
        console.error('Erro ao carregar dados do mentorado:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMentoradoData()
  }, [params.id])

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || ''
    if (['ativo', 'engajado'].includes(statusLower)) return 'success'
    if (['pausado', 'inseguro'].includes(statusLower)) return 'warning'
    if (['cancelado', 'inativo'].includes(statusLower)) return 'destructive'
    return 'secondary'
  }

  const getFormStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const enviarViaWhatsApp = async (formulario: FormularioInfo) => {
    if (!mentorado) {
      alert('Dados do mentorado não encontrados!')
      return
    }

    // Verificar se tem telefone/WhatsApp
    if (!mentorado.telefone) {
      alert('Este mentorado não possui telefone/WhatsApp cadastrado. Adicione o número primeiro.')
      return
    }

    setEnviandoWhatsapp(formulario.tipo)

    try {
      // Mensagem template personalizada solicitada pelo usuário
      const mensagemTemplate = `Olá! 👋

Estou te enviando um formulário rápido, mas estratégico, que vai me ajudar a entender com mais clareza sua evolução até aqui e os pontos que ainda podemos ajustar para acelerar seus resultados.

Será rápido, mas faz toda diferença pro acompanhamento individual que estou preparando pra você.

👉 Assim que responder, me avisa por aqui.

Link: ${formulario.url}`

      // Limpar o número de telefone para formato WhatsApp
      let numeroWhatsApp = mentorado.telefone.replace(/\D/g, '') // Remove caracteres não numéricos

      // Se não começar com código do país, adicionar 55 (Brasil)
      if (!numeroWhatsApp.startsWith('55')) {
        numeroWhatsApp = '55' + numeroWhatsApp
      }

      // Adicionar @c.us para formato WhatsApp
      numeroWhatsApp = numeroWhatsApp + '@c.us'

      const { whatsappService } = await import('@/lib/whatsapp-core-service')
      const success = await whatsappService.sendMessage(numeroWhatsApp, mensagemTemplate)

      if (success) {
        alert('✅ Formulário enviado via WhatsApp com sucesso!')
      } else {
        alert('❌ Erro ao enviar mensagem via WhatsApp')
      }

    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error)
      alert('❌ Erro ao enviar mensagem via WhatsApp')
    } finally {
      setEnviandoWhatsapp(null)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="Carregando..." />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Carregando dados do mentorado...</div>
        </div>
      </div>
    )
  }

  if (!mentorado) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="Mentorado não encontrado" />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Mentorado não encontrado</div>
        </div>
      </div>
    )
  }

  const formulariosCompletos = formularios.filter(f => f.status === 'completed').length
  const progressoPercentual = (formulariosCompletos / formularios.length) * 100

  return (
    <div className="flex-1 overflow-y-auto">
      <Header 
        title={mentorado.nome_completo} 
        subtitle={`${mentorado.estado_atual} • ${formulariosCompletos}/${formularios.length} formulários completos`}
      />
      
      <main className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Informações Pessoais */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-2xl shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Informações Pessoais</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status atual</span>
                  <Badge variant={getStatusColor(mentorado.estado_atual)}>
                    {mentorado.estado_atual || 'Não definido'}
                  </Badge>
                </div>

                <div>
                  <span className="text-sm text-gray-500">Estado inicial</span>
                  <p className="text-sm text-gray-900">{mentorado.estado_entrada}</p>
                </div>

                <div>
                  <span className="text-sm text-gray-500">Estado Atual</span>
                  <p className="text-sm text-gray-900">{mentorado.estado_atual}</p>
                </div>

                {mentorado.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a href={`mailto:${mentorado.email}`} className="text-sm text-blue-600 hover:underline">
                      {mentorado.email}
                    </a>
                  </div>
                )}

                {mentorado.telefone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a href={`tel:${mentorado.telefone}`} className="text-sm text-blue-600 hover:underline">
                      {mentorado.telefone}
                    </a>
                  </div>
                )}

                {mentorado.data_nascimento && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {new Date(mentorado.data_nascimento).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}

                {mentorado.endereco && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span className="text-sm text-gray-600">{mentorado.endereco}</span>
                  </div>
                )}

                {mentorado.crm && (
                  <div>
                    <span className="text-sm text-gray-500">CRM</span>
                    <p className="text-sm text-gray-900">{mentorado.crm}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <span className="text-sm text-gray-500">Data de entrada</span>
                  <p className="text-sm text-gray-900">
                    {new Date(mentorado.data_entrada).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Progresso Geral */}
            <Card className="rounded-2xl shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle>Progresso Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Formulários completos</span>
                    <span className="text-sm font-medium">{formulariosCompletos}/{formularios.length}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressoPercentual}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{Math.round(progressoPercentual)}% concluído</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulários */}
          <div className="lg:col-span-2">
            <Card className="rounded-2xl shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Formulários de Acompanhamento</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {formularios.map((form, index) => (
                    <div key={form.tipo} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getFormStatusIcon(form.status)}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{form.nome_completo}</h4>
                          {form.data_resposta ? (
                            <p className="text-xs text-gray-500">
                              Respondido em {new Date(form.data_resposta).toLocaleDateString('pt-BR')}
                              {form.nps !== undefined && ` • NPS: ${form.nps}`}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500">Aguardando resposta</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        {form.status === 'completed' ? (
                          <Badge variant="success" className="text-xs">
                            Completo
                          </Badge>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(form.url, '_blank')}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Enviar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => enviarViaWhatsApp(form)}
                              disabled={enviandoWhatsapp === form.tipo || !mentorado?.telefone}
                              className="border-green-500 text-green-600 hover:bg-green-50"
                            >
                              {enviandoWhatsapp === form.tipo ? (
                                <div className="flex items-center space-x-1">
                                  <MessageSquare className="h-3 w-3 animate-spin" />
                                  <span className="text-xs">Enviando...</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <MessageSquare className="h-3 w-3" />
                                  <span className="text-xs">WhatsApp</span>
                                </div>
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {formularios.filter(f => f.status === 'pending').length > 0 && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Próximos Passos</h4>
                    <p className="text-sm text-blue-700">
                      Há {formularios.filter(f => f.status === 'pending').length} formulário(s) pendente(s). 
                      Envie os links para o mentorado preencher.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Visualização de Respostas */}
        {respostasCompletas.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Respostas Detalhadas</h2>
              <Button
                onClick={() => setShowResponses(!showResponses)}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>{showResponses ? 'Ocultar' : 'Ver'} Respostas</span>
              </Button>
            </div>

            {showResponses && (
              <div className="space-y-6">
                {respostasCompletas.map((resposta) => (
                  <Card key={resposta.id} className="rounded-2xl shadow-sm border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="h-5 w-5 text-blue-600" />
                          <span className="capitalize">{resposta.formulario}</span>
                          {resposta.resposta_json?.respostas?.nota_nps && (
                            <div className="flex items-center space-x-1 ml-4">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm font-medium">NPS: {resposta.resposta_json.respostas.nota_nps}/10</span>
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {new Date(resposta.data_envio).toLocaleDateString('pt-BR')}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {resposta.resposta_json?.respostas && Object.entries(resposta.resposta_json.respostas).map(([pergunta, resposta_valor]) => (
                          <div key={pergunta} className="border-b border-gray-100 pb-3 last:border-b-0">
                            <div className="flex flex-col space-y-2">
                              <h4 className="text-sm font-medium text-gray-700 capitalize">
                                {pergunta.replace(/_/g, ' ')}
                              </h4>
                              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                                {typeof resposta_valor === 'string' ? (
                                  resposta_valor.length > 200 ? (
                                    <details>
                                      <summary className="cursor-pointer font-medium text-blue-600">
                                        {resposta_valor.substring(0, 200)}... (clique para ver completo)
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}