'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Phone, 
  Mail, 
  Users, 
  Clock, 
  FileText, 
  Calendar,
  Save,
  ArrowLeft,
  AlertCircle
} from 'lucide-react'
import { CloserAuthProvider, useCloserAuth } from '@/contexts/closer-auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Lead {
  id: string
  nome: string
  email?: string
  telefone?: string
}

function NovaAtividadeContent() {
  const { closer, loading: authLoading } = useCloserAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [tipoAtividade, setTipoAtividade] = useState('')
  const [descricao, setDescricao] = useState('')
  const [duracaoMinutos, setDuracaoMinutos] = useState('')
  const [resultado, setResultado] = useState('')
  const [proximaAcao, setProximaAcao] = useState('')
  const [dataProximaAcao, setDataProximaAcao] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (closer) {
      loadLeads()
    }

    const leadParam = searchParams.get('lead')
    if (leadParam) {
      setSelectedLeadId(leadParam)
    }
  }, [closer, searchParams])

  const loadLeads = async () => {
    if (!closer) return

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, email, telefone')
        .eq('closer_id', closer.id)
        .order('nome', { ascending: true })

      if (error) {
        console.error('Error loading leads:', error)
      } else {
        setLeads(data || [])
      }
    } catch (error) {
      console.error('Error loading leads:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!closer) return

    setLoading(true)
    setError(null)

    try {
      const atividadeData = {
        closer_id: closer.id,
        organization_id: closer.organization_id,
        tipo_atividade: tipoAtividade,
        lead_id: selectedLeadId || null,
        descricao,
        duracao_minutos: duracaoMinutos ? parseInt(duracaoMinutos) : null,
        resultado: resultado || null,
        proxima_acao: proximaAcao || null,
        data_proxima_acao: dataProximaAcao || null,
        data_atividade: new Date().toISOString()
      }

      const { error } = await supabase
        .from('closers_atividades')
        .insert([atividadeData])

      if (error) {
        throw error
      }

      // Redirect to activities list or dashboard
      router.push('/closer/atividades')
    } catch (error: any) {
      console.error('Error creating activity:', error)
      setError(error.message || 'Erro ao salvar atividade')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !closer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nova Atividade</h1>
              <p className="text-sm text-gray-500">Registre uma nova interação com lead</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/closer">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Registrar Atividade</CardTitle>
            <CardDescription>
              Preencha os detalhes da atividade realizada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">{error}</span>
                </div>
              )}

              {/* Tipo de Atividade */}
              <div>
                <Label htmlFor="tipo_atividade">Tipo de Atividade</Label>
                <select
                  id="tipo_atividade"
                  value={tipoAtividade}
                  onChange={(e) => setTipoAtividade(e.target.value)}
                  required
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o tipo</option>
                  <option value="ligacao">Ligação</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="reuniao">Reunião</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="proposta">Proposta</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              {/* Lead */}
              <div>
                <Label htmlFor="lead">Lead (Opcional)</Label>
                <select
                  id="lead"
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um lead</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.nome} {lead.email ? `(${lead.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descrição */}
              <div>
                <Label htmlFor="descricao">Descrição da Atividade</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva o que foi realizado, pontos importantes da conversa, próximos passos..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>

              {/* Duração e Resultado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duracao">Duração (minutos)</Label>
                  <Input
                    id="duracao"
                    type="number"
                    placeholder="Ex: 30"
                    value={duracaoMinutos}
                    onChange={(e) => setDuracaoMinutos(e.target.value)}
                    min="1"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="resultado">Resultado</Label>
                  <select
                    id="resultado"
                    value={resultado}
                    onChange={(e) => setResultado(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o resultado</option>
                    <option value="contato_realizado">Contato Realizado</option>
                    <option value="sem_resposta">Sem Resposta</option>
                    <option value="agendamento">Agendamento</option>
                    <option value="venda">Venda</option>
                    <option value="recusa">Recusa</option>
                    <option value="follow_up_necessario">Follow-up Necessário</option>
                  </select>
                </div>
              </div>

              {/* Próxima Ação */}
              <div>
                <Label htmlFor="proxima_acao">Próxima Ação</Label>
                <Input
                  id="proxima_acao"
                  placeholder="Ex: Enviar proposta, agendar reunião, ligar novamente"
                  value={proximaAcao}
                  onChange={(e) => setProximaAcao(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Data da Próxima Ação */}
              <div>
                <Label htmlFor="data_proxima_acao">Data da Próxima Ação</Label>
                <Input
                  id="data_proxima_acao"
                  type="date"
                  value={dataProximaAcao}
                  onChange={(e) => setDataProximaAcao(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Salvando...' : 'Salvar Atividade'}
                </Button>
                
                <Button type="button" variant="outline" asChild>
                  <Link href="/closer">
                    Cancelar
                  </Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function NovaAtividadePageContent() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <NovaAtividadeContent />
    </Suspense>
  )
}

export default function NovaAtividadePage() {
  return (
    <CloserAuthProvider>
      <NovaAtividadePageContent />
    </CloserAuthProvider>
  )
}