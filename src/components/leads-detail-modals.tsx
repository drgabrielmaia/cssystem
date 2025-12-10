'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import {
  Phone,
  Mail,
  Calendar,
  User,
  DollarSign,
  Clock,
  MapPin,
  Target,
  X,
  Search,
  Filter,
  Download,
  Eye
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Lead {
  id: string
  nome_completo: string
  email?: string
  telefone?: string
  status: string
  data_primeiro_contato: string
  data_venda?: string
  valor_vendido?: number
  valor_arrecadado?: number
  convertido_em?: string
  cidade?: string
  estado?: string
  origem?: string
  observacoes?: string
  call_details?: any
  call_history?: any[]
  qualification_details?: any
  sales_details?: any
  last_interaction_date?: string
  next_followup_date?: string
  lead_score?: number
  tags?: string[]
}

interface DetailModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  status: string | string[]
  leads: Lead[]
}

export function LeadsDetailModal({ isOpen, onClose, title, status, leads: allLeads }: DetailModalProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'nome' | 'data' | 'valor'>('nome')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchLeads()
    }
  }, [isOpen, status])

  const fetchLeads = async () => {
    try {
      setLoading(true)
      let query = supabase.from('leads').select('*')

      if (Array.isArray(status)) {
        query = query.in('status', status)
      } else {
        query = query.eq('status', status)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Erro ao buscar leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'novo': 'bg-blue-500',
      'contactado': 'bg-purple-500',
      'agendado': 'bg-indigo-500',
      'call_agendada': 'bg-orange-500',
      'proposta_enviada': 'bg-amber-500',
      'vendido': 'bg-green-600',
      'perdido': 'bg-red-500',
      'no_show': 'bg-gray-500'
    }
    return colors[status] || 'bg-gray-400'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    } catch {
      return '-'
    }
  }

  const getLeadScore = (lead: Lead) => {
    let score = 0

    // Pontuação por status
    const statusScores: Record<string, number> = {
      'vendido': 100,
      'proposta_enviada': 80,
      'call_agendada': 60,
      'agendado': 40,
      'contactado': 20,
      'novo': 10
    }
    score += statusScores[lead.status] || 0

    // Pontuação por valor vendido
    if (lead.valor_vendido && lead.valor_vendido > 0) {
      score += Math.min(20, lead.valor_vendido / 1000)
    }

    // Pontuação por interação recente
    if (lead.last_interaction_date) {
      const daysSinceLastInteraction = Math.floor(
        (Date.now() - new Date(lead.last_interaction_date).getTime()) / (1000 * 60 * 60 * 24)
      )
      score += Math.max(0, 20 - daysSinceLastInteraction)
    }

    return Math.min(100, Math.round(score))
  }

  const filteredLeads = leads
    .filter(lead =>
      lead.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.telefone?.includes(searchTerm) ||
      lead.cidade?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'nome':
          return a.nome_completo.localeCompare(b.nome_completo)
        case 'data':
          return new Date(b.data_primeiro_contato).getTime() - new Date(a.data_primeiro_contato).getTime()
        case 'valor':
          return (b.valor_vendido || 0) - (a.valor_vendido || 0)
        default:
          return 0
      }
    })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            <p className="text-gray-600 mt-1">
              {leads.length} {leads.length === 1 ? 'lead encontrado' : 'leads encontrados'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome, email, telefone ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="nome">Nome</option>
                <option value="data">Data</option>
                <option value="valor">Valor</option>
              </select>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Carregando leads...</div>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <User className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">Nenhum lead encontrado</h3>
                <p className="text-gray-500">Tente ajustar os filtros de busca</p>
              </div>
            </div>
          ) : (
            <div className="p-6 h-full overflow-y-auto">
              <div className="grid gap-4">
                {filteredLeads.map((lead) => (
                  <Card key={lead.id} className="hover:shadow-md transition-all duration-200 cursor-pointer"
                        onClick={() => setSelectedLead(lead)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                            <User className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800">{lead.nome_completo}</h3>
                            <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                              {lead.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  <span>{lead.email}</span>
                                </div>
                              )}
                              {lead.telefone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{lead.telefone}</span>
                                </div>
                              )}
                              {(lead.cidade || lead.estado) && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{[lead.cidade, lead.estado].filter(Boolean).join(', ')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Lead Score */}
                          <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">Score</div>
                            <div className={`text-sm font-bold px-2 py-1 rounded ${
                              getLeadScore(lead) >= 80 ? 'bg-green-100 text-green-700' :
                              getLeadScore(lead) >= 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {getLeadScore(lead)}
                            </div>
                          </div>

                          {/* Status */}
                          <Badge className={`${getStatusColor(lead.status)} text-white`}>
                            {lead.status.replace('_', ' ').toUpperCase()}
                          </Badge>

                          {/* Valor */}
                          {lead.valor_vendido && lead.valor_vendido > 0 && (
                            <div className="text-right">
                              <div className="text-xs text-gray-500">Valor</div>
                              <div className="font-semibold text-green-600">
                                {formatCurrency(lead.valor_vendido)}
                              </div>
                            </div>
                          )}

                          {/* Data */}
                          <div className="text-right text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(lead.data_primeiro_contato)}</span>
                            </div>
                            {lead.data_venda && (
                              <div className="text-xs text-green-600 mt-1">
                                Vendido: {formatDate(lead.data_venda)}
                              </div>
                            )}
                          </div>

                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Tags */}
                      {lead.tags && lead.tags.length > 0 && (
                        <div className="flex gap-1 mt-3">
                          {lead.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {lead.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{lead.tags.length - 3} mais
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Progress Indicators */}
                      <div className="flex gap-4 mt-3 text-xs text-gray-500">
                        {lead.call_history && lead.call_history.length > 0 && (
                          <span>📞 {lead.call_history.length} calls</span>
                        )}
                        {lead.next_followup_date && (
                          <span>📅 Próximo follow-up: {formatDate(lead.next_followup_date)}</span>
                        )}
                        {lead.origem && (
                          <span>🔗 Origem: {lead.origem}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{selectedLead.nome_completo}</CardTitle>
                  <Badge className={`${getStatusColor(selectedLead.status)} text-white mt-2`}>
                    {selectedLead.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedLead(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informações Básicas */}
              <div>
                <h3 className="font-semibold mb-3">Informações de Contato</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {selectedLead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{selectedLead.email}</span>
                    </div>
                  )}
                  {selectedLead.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{selectedLead.telefone}</span>
                    </div>
                  )}
                  {(selectedLead.cidade || selectedLead.estado) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{[selectedLead.cidade, selectedLead.estado].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-400" />
                    <span>Score: {getLeadScore(selectedLead)}/100</span>
                  </div>
                </div>
              </div>

              {/* Histórico de Vendas */}
              {selectedLead.status === 'vendido' && (
                <div>
                  <h3 className="font-semibold mb-3">Detalhes da Venda</h3>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedLead.valor_vendido && (
                        <div>
                          <span className="text-sm text-gray-600">Valor Vendido</span>
                          <p className="font-semibold text-green-600">
                            {formatCurrency(selectedLead.valor_vendido)}
                          </p>
                        </div>
                      )}
                      {selectedLead.valor_arrecadado && (
                        <div>
                          <span className="text-sm text-gray-600">Valor Arrecadado</span>
                          <p className="font-semibold text-blue-600">
                            {formatCurrency(selectedLead.valor_arrecadado)}
                          </p>
                        </div>
                      )}
                      {selectedLead.data_venda && (
                        <div>
                          <span className="text-sm text-gray-600">Data da Venda</span>
                          <p className="font-semibold">{formatDate(selectedLead.data_venda)}</p>
                        </div>
                      )}
                      {selectedLead.convertido_em && (
                        <div>
                          <span className="text-sm text-gray-600">Produto</span>
                          <p className="font-semibold">{selectedLead.convertido_em}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Histórico de Calls */}
              {selectedLead.call_history && selectedLead.call_history.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Histórico de Calls</h3>
                  <div className="space-y-2">
                    {selectedLead.call_history.map((call: any, index: number) => (
                      <div key={index} className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{call.tipo || 'Call'}</span>
                          <span className="text-sm text-gray-500">
                            {formatDate(call.data)}
                          </span>
                        </div>
                        {call.notas && (
                          <p className="text-sm text-gray-600 mt-1">{call.notas}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observações */}
              {selectedLead.observacoes && (
                <div>
                  <h3 className="font-semibold mb-3">Observações</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">{selectedLead.observacoes}</p>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="font-semibold mb-3">Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm">Lead criado</p>
                      <p className="text-xs text-gray-500">{formatDate(selectedLead.data_primeiro_contato)}</p>
                    </div>
                  </div>
                  {selectedLead.last_interaction_date && (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <div>
                        <p className="text-sm">Última interação</p>
                        <p className="text-xs text-gray-500">{formatDate(selectedLead.last_interaction_date)}</p>
                      </div>
                    </div>
                  )}
                  {selectedLead.data_venda && (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm">Venda realizada</p>
                        <p className="text-xs text-gray-500">{formatDate(selectedLead.data_venda)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}