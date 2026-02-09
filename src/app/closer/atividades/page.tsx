'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Filter, 
  Plus, 
  Phone, 
  Mail, 
  Calendar, 
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Activity,
  Users,
  FileText,
  ArrowLeft
} from 'lucide-react'
import { CloserAuthProvider, useCloserAuth } from '@/contexts/closer-auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface CloserActivity {
  id: string
  tipo_atividade: string
  descricao?: string
  duracao_minutos?: number
  resultado?: string
  proxima_acao?: string
  data_proxima_acao?: string
  data_atividade: string
  lead_id?: string
  lead?: {
    nome: string
    email?: string
    telefone?: string
  }
}

function AtividadesPageContent() {
  const { closer, loading: authLoading } = useCloserAuth()
  const [atividades, setAtividades] = useState<CloserActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFilter, setTipoFilter] = useState('all')
  const [resultadoFilter, setResultadoFilter] = useState('all')

  useEffect(() => {
    if (closer) {
      loadAtividades()
    }
  }, [closer])

  const loadAtividades = async () => {
    if (!closer) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('closers_atividades')
        .select(`
          *,
          lead:leads!closers_atividades_lead_id_fkey (
            nome,
            email,
            telefone
          )
        `)
        .eq('closer_id', closer.id)
        .order('data_atividade', { ascending: false })

      if (error) {
        console.error('Error loading activities:', error)
      } else {
        setAtividades(data || [])
      }
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAtividades = atividades.filter(atividade => {
    const matchesSearch = atividade.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         atividade.lead?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         atividade.tipo_atividade.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTipo = tipoFilter === 'all' || atividade.tipo_atividade === tipoFilter
    const matchesResultado = resultadoFilter === 'all' || atividade.resultado === resultadoFilter

    return matchesSearch && matchesTipo && matchesResultado
  })

  const getActivityIcon = (tipo: string) => {
    switch (tipo) {
      case 'ligacao': return <Phone className="h-4 w-4" />
      case 'whatsapp': return <Phone className="h-4 w-4" />
      case 'email': return <Mail className="h-4 w-4" />
      case 'reuniao': return <Users className="h-4 w-4" />
      case 'follow_up': return <Clock className="h-4 w-4" />
      case 'proposta': return <FileText className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getResultIcon = (resultado?: string) => {
    switch (resultado) {
      case 'venda': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'agendamento': return <Calendar className="h-4 w-4 text-blue-500" />
      case 'contato_realizado': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'recusa': return <XCircle className="h-4 w-4 text-red-500" />
      case 'sem_resposta': return <XCircle className="h-4 w-4 text-gray-500" />
      case 'follow_up_necessario': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getResultadoBadgeColor = (resultado?: string) => {
    switch (resultado) {
      case 'venda': return 'bg-green-100 text-green-800'
      case 'agendamento': return 'bg-blue-100 text-blue-800'
      case 'contato_realizado': return 'bg-green-100 text-green-800'
      case 'recusa': return 'bg-red-100 text-red-800'
      case 'sem_resposta': return 'bg-gray-100 text-gray-800'
      case 'follow_up_necessario': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
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
              <h1 className="text-2xl font-bold text-gray-900">Minhas Atividades</h1>
              <p className="text-sm text-gray-500">Histórico completo das suas interações</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/closer">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Dashboard
                </Link>
              </Button>
              <Button asChild>
                <Link href="/closer/atividades/nova">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Atividade
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por descrição, lead ou tipo de atividade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de Atividade</label>
                  <select
                    value={tipoFilter}
                    onChange={(e) => setTipoFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos os Tipos</option>
                    <option value="ligacao">Ligação</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="reuniao">Reunião</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="proposta">Proposta</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Resultado</label>
                  <select
                    value={resultadoFilter}
                    onChange={(e) => setResultadoFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos os Resultados</option>
                    <option value="contato_realizado">Contato Realizado</option>
                    <option value="sem_resposta">Sem Resposta</option>
                    <option value="agendamento">Agendamento</option>
                    <option value="venda">Venda</option>
                    <option value="recusa">Recusa</option>
                    <option value="follow_up_necessario">Follow-up Necessário</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activities Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total de Atividades</p>
                  <p className="text-2xl font-bold">{atividades.length}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Vendas</p>
                  <p className="text-2xl font-bold">{atividades.filter(a => a.resultado === 'venda').length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Agendamentos</p>
                  <p className="text-2xl font-bold">{atividades.filter(a => a.resultado === 'agendamento').length}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Follow-ups</p>
                  <p className="text-2xl font-bold">{atividades.filter(a => a.resultado === 'follow_up_necessario').length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activities List */}
        <Card>
          <CardHeader>
            <CardTitle>Suas Atividades</CardTitle>
            <CardDescription>
              {filteredAtividades.length} de {atividades.length} atividades
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredAtividades.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma atividade encontrada</p>
                <Button className="mt-4" asChild>
                  <Link href="/closer/atividades/nova">
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Nova Atividade
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAtividades.map((atividade) => (
                  <div key={atividade.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            {getActivityIcon(atividade.tipo_atividade)}
                            <span className="font-semibold text-gray-900">
                              {atividade.tipo_atividade.charAt(0).toUpperCase() + atividade.tipo_atividade.slice(1)}
                            </span>
                          </div>
                          
                          {atividade.resultado && (
                            <Badge className={getResultadoBadgeColor(atividade.resultado)}>
                              <div className="flex items-center gap-1">
                                {getResultIcon(atividade.resultado)}
                                {atividade.resultado.replace('_', ' ').toUpperCase()}
                              </div>
                            </Badge>
                          )}
                        </div>
                        
                        {atividade.lead && (
                          <div className="text-sm text-gray-600 mb-2">
                            <strong>Lead:</strong> {atividade.lead.nome}
                            {atividade.lead.email && ` (${atividade.lead.email})`}
                          </div>
                        )}

                        {atividade.descricao && (
                          <div className="text-sm text-gray-700 bg-gray-100 p-3 rounded mb-3">
                            {atividade.descricao}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(atividade.data_atividade).toLocaleString('pt-BR')}
                          </div>
                          
                          {atividade.duracao_minutos && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {atividade.duracao_minutos} minutos
                            </div>
                          )}

                          {atividade.data_proxima_acao && (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Próxima: {new Date(atividade.data_proxima_acao).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>

                        {atividade.proxima_acao && (
                          <div className="mt-2 text-sm">
                            <span className="text-gray-500">Próxima ação: </span>
                            <span className="text-gray-700">{atividade.proxima_acao}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function AtividadesPage() {
  return (
    <CloserAuthProvider>
      <AtividadesPageContent />
    </CloserAuthProvider>
  )
}