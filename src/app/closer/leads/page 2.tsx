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
  User,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react'
import { CloserAuthProvider, useCloserAuth } from '@/contexts/closer-auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Lead {
  id: string
  nome: string
  email?: string
  telefone?: string
  status: string
  fonte?: string
  data_criacao: string
  ultima_interacao?: string
  valor_potencial?: number
  observacoes?: string
  closer_id?: string
}

function LeadsPageContent() {
  const { closer, loading: authLoading } = useCloserAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (closer) {
      loadLeads()
    }
  }, [closer])

  const loadLeads = async () => {
    if (!closer) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('closer_id', closer.id)
        .order('data_criacao', { ascending: false })

      if (error) {
        console.error('Error loading leads:', error)
      } else {
        setLeads(data || [])
      }
    } catch (error) {
      console.error('Error loading leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.telefone?.includes(searchTerm)
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'novo': return <AlertCircle className="h-4 w-4 text-blue-500" />
      case 'contatado': return <Phone className="h-4 w-4 text-yellow-500" />
      case 'interessado': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'proposta_enviada': return <Mail className="h-4 w-4 text-purple-500" />
      case 'negociacao': return <DollarSign className="h-4 w-4 text-orange-500" />
      case 'fechado_ganho': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'fechado_perdido': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'novo': return 'bg-blue-100 text-blue-800'
      case 'contatado': return 'bg-yellow-100 text-yellow-800'
      case 'interessado': return 'bg-green-100 text-green-800'
      case 'proposta_enviada': return 'bg-purple-100 text-purple-800'
      case 'negociacao': return 'bg-orange-100 text-orange-800'
      case 'fechado_ganho': return 'bg-green-200 text-green-900'
      case 'fechado_perdido': return 'bg-red-100 text-red-800'
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
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Leads</h1>
              <p className="text-sm text-gray-500">Gerencie seus leads e oportunidades</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/closer">
                  Voltar ao Dashboard
                </Link>
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Atividade
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
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos os Status</option>
                  <option value="novo">Novo</option>
                  <option value="contatado">Contatado</option>
                  <option value="interessado">Interessado</option>
                  <option value="proposta_enviada">Proposta Enviada</option>
                  <option value="negociacao">Negociação</option>
                  <option value="fechado_ganho">Fechado - Ganho</option>
                  <option value="fechado_perdido">Fechado - Perdido</option>
                </select>
                <Button variant="outline">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total de Leads</p>
                  <p className="text-2xl font-bold">{leads.length}</p>
                </div>
                <User className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Novos</p>
                  <p className="text-2xl font-bold">{leads.filter(l => l.status === 'novo').length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Em Negociação</p>
                  <p className="text-2xl font-bold">{leads.filter(l => l.status === 'negociacao').length}</p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Fechados</p>
                  <p className="text-2xl font-bold">{leads.filter(l => l.status.startsWith('fechado')).length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leads List */}
        <Card>
          <CardHeader>
            <CardTitle>Seus Leads</CardTitle>
            <CardDescription>
              {filteredLeads.length} de {leads.length} leads
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum lead encontrado</p>
                <p className="text-sm text-gray-400">Tente ajustar os filtros ou aguarde novos leads</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLeads.map((lead) => (
                  <div key={lead.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{lead.nome}</h3>
                          <Badge className={getStatusBadgeColor(lead.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(lead.status)}
                              {lead.status.replace('_', ' ').toUpperCase()}
                            </div>
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                          {lead.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              {lead.email}
                            </div>
                          )}
                          {lead.telefone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              {lead.telefone}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(lead.data_criacao).toLocaleDateString('pt-BR')}
                          </div>
                        </div>

                        {lead.valor_potencial && (
                          <div className="mt-2 text-sm">
                            <span className="text-gray-500">Valor potencial: </span>
                            <span className="font-medium text-green-600">
                              R$ {lead.valor_potencial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}

                        {lead.observacoes && (
                          <div className="mt-2 text-sm text-gray-600 bg-gray-100 p-2 rounded">
                            {lead.observacoes}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/closer/atividades/nova?lead=${lead.id}`}>
                            <Plus className="h-4 w-4" />
                          </Link>
                        </Button>
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

export default function LeadsPage() {
  return (
    <CloserAuthProvider>
      <LeadsPageContent />
    </CloserAuthProvider>
  )
}