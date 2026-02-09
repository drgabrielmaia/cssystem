'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  XCircle,
  Edit,
  Trash2,
  Eye,
  UserX,
  Download,
  RefreshCw,
  Building,
  Star,
  Users
} from 'lucide-react'
import { CloserAuthProvider, useCloserAuth } from '@/contexts/closer-auth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface Lead {
  id: string
  nome_completo: string
  email?: string
  telefone?: string
  empresa?: string
  cargo?: string
  status: string
  temperatura?: string
  prioridade?: string
  origem?: string
  observacoes?: string
  valor_potencial?: number
  data_primeiro_contato: string
  next_followup_date?: string
  closer_id?: string
  sdr_id?: string
  lead_score?: number
  created_at: string
  updated_at: string
  organization_id: string
  closers?: {
    id: string
    nome_completo: string
  }
  sdrs?: {
    id: string
    nome_completo: string
  }
}

interface Closer {
  id: string
  nome_completo: string
  email: string
  tipo_closer: string
  status_contrato: string
}

interface SDR {
  id: string
  nome_completo: string
  email: string
  ativo: boolean
}

const STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo', color: 'bg-blue-500' },
  { value: 'contatado', label: 'Contatado', color: 'bg-yellow-500' },
  { value: 'qualificado', label: 'Qualificado', color: 'bg-purple-500' },
  { value: 'interessado', label: 'Interessado', color: 'bg-green-500' },
  { value: 'proposta_enviada', label: 'Proposta Enviada', color: 'bg-orange-500' },
  { value: 'negociacao', label: 'Negociação', color: 'bg-indigo-500' },
  { value: 'fechado_ganho', label: 'Fechado - Ganho', color: 'bg-green-600' },
  { value: 'fechado_perdido', label: 'Fechado - Perdido', color: 'bg-red-500' },
  { value: 'nurturing', label: 'Nutrição', color: 'bg-teal-500' }
]

const TEMPERATURA_OPTIONS = [
  { value: 'frio', label: 'Frio', color: 'bg-blue-400' },
  { value: 'morno', label: 'Morno', color: 'bg-yellow-400' },
  { value: 'quente', label: 'Quente', color: 'bg-red-400' }
]

const PRIORIDADE_OPTIONS = [
  { value: 'baixa', label: 'Baixa', color: 'bg-gray-400' },
  { value: 'media', label: 'Média', color: 'bg-yellow-500' },
  { value: 'alta', label: 'Alta', color: 'bg-red-500' }
]

function LeadsPageContent() {
  const { closer, loading: authLoading } = useCloserAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [closers, setClosers] = useState<Closer[]>([])
  const [sdrs, setSdrs] = useState<SDR[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [closerFilter, setCloserFilter] = useState('all')
  const [showMyLeadsOnly, setShowMyLeadsOnly] = useState(false)
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    empresa: '',
    cargo: '',
    status: 'novo',
    temperatura: 'frio',
    prioridade: 'media',
    origem: '',
    observacoes: '',
    valor_potencial: '',
    next_followup_date: '',
    closer_id: '',
    sdr_id: ''
  })

  useEffect(() => {
    if (closer) {
      loadLeads()
      loadClosers()
      loadSdrs()
    }
  }, [closer, showMyLeadsOnly, showUnassignedOnly])

  const loadLeads = async () => {
    if (!closer) return

    try {
      setLoading(true)

      let query = supabase
        .from('leads')
        .select(`
          *,
          closers:closer_id(id, nome_completo),
          sdrs:sdr_id(id, nome_completo)
        `)
        .eq('organization_id', closer.organization_id)
        .order('created_at', { ascending: false })

      // Se showMyLeadsOnly estiver ativo, filtra só os leads do closer atual
      if (showMyLeadsOnly) {
        query = query.eq('closer_id', closer.id)
      }
      
      // Se showUnassignedOnly estiver ativo, filtra só leads sem SDR atribuído
      if (showUnassignedOnly) {
        query = query.is('sdr_id', null)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading leads:', error)
        toast.error('Erro ao carregar leads')
      } else {
        setLeads(data || [])
      }
    } catch (error) {
      console.error('Error loading leads:', error)
      toast.error('Erro ao carregar leads')
    } finally {
      setLoading(false)
    }
  }

  const loadClosers = async () => {
    if (!closer) return

    try {
      const { data, error } = await supabase
        .from('closers')
        .select('id, nome_completo, email, tipo_closer, status_contrato')
        .eq('organization_id', closer.organization_id)
        .eq('status_contrato', 'ativo')

      if (error) {
        console.error('Error loading closers:', error)
      } else {
        setClosers(data || [])
      }
    } catch (error) {
      console.error('Error loading closers:', error)
    }
  }

  const loadSdrs = async () => {
    if (!closer) return

    try {
      const { data, error } = await supabase
        .from('sdrs')
        .select('id, nome_completo, email, ativo')
        .eq('organization_id', closer.organization_id)
        .eq('ativo', true)

      if (error) {
        console.error('Error loading SDRs:', error)
      } else {
        setSdrs(data || [])
      }
    } catch (error) {
      console.error('Error loading SDRs:', error)
    }
  }

  const handleCreateLead = async () => {
    if (!closer || !formData.nome_completo) {
      toast.error('Nome completo é obrigatório')
      return
    }

    try {
      const leadData = {
        ...formData,
        valor_potencial: formData.valor_potencial ? parseFloat(formData.valor_potencial) : null,
        organization_id: closer.organization_id,
        data_primeiro_contato: new Date().toISOString(),
        lead_score: Math.floor(Math.random() * 100),
        closer_id: formData.closer_id || null,
        sdr_id: formData.sdr_id || null
      }

      const { error } = await supabase
        .from('leads')
        .insert(leadData)

      if (error) throw error

      toast.success('Lead criado com sucesso!')
      setIsCreateModalOpen(false)
      resetForm()
      loadLeads()
    } catch (error) {
      console.error('Error creating lead:', error)
      toast.error('Erro ao criar lead')
    }
  }

  const handleUpdateLead = async () => {
    if (!selectedLead || !formData.nome_completo) {
      toast.error('Nome completo é obrigatório')
      return
    }

    try {
      const leadData = {
        ...formData,
        valor_potencial: formData.valor_potencial ? parseFloat(formData.valor_potencial) : null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('leads')
        .update(leadData)
        .eq('id', selectedLead.id)

      if (error) throw error

      toast.success('Lead atualizado com sucesso!')
      setIsEditModalOpen(false)
      resetForm()
      setSelectedLead(null)
      loadLeads()
    } catch (error) {
      console.error('Error updating lead:', error)
      toast.error('Erro ao atualizar lead')
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId)

      if (error) throw error

      toast.success('Lead excluído com sucesso!')
      loadLeads()
    } catch (error) {
      console.error('Error deleting lead:', error)
      toast.error('Erro ao excluir lead')
    }
  }

  const handleQuickStatusUpdate = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)

      if (error) throw error

      toast.success('Status atualizado!')
      loadLeads()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  const handleAssignCloser = async (leadId: string, closerId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          closer_id: closerId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)

      if (error) throw error

      toast.success('Lead atribuído com sucesso!')
      loadLeads()
    } catch (error) {
      console.error('Error assigning closer:', error)
      toast.error('Erro ao atribuir closer')
    }
  }

  const handleAssignSdr = async (leadId: string, sdrId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          sdr_id: sdrId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)

      if (error) throw error

      toast.success('SDR atribuído com sucesso!')
      loadLeads()
    } catch (error) {
      console.error('Error assigning SDR:', error)
      toast.error('Erro ao atribuir SDR')
    }
  }

  const resetForm = () => {
    setFormData({
      nome_completo: '',
      email: '',
      telefone: '',
      empresa: '',
      cargo: '',
      status: 'novo',
      temperatura: 'frio',
      prioridade: 'media',
      origem: '',
      observacoes: '',
      valor_potencial: '',
      next_followup_date: '',
      closer_id: '',
      sdr_id: ''
    })
  }

  const openEditModal = (lead: Lead) => {
    setSelectedLead(lead)
    setFormData({
      nome_completo: lead.nome_completo || '',
      email: lead.email || '',
      telefone: lead.telefone || '',
      empresa: lead.empresa || '',
      cargo: lead.cargo || '',
      status: lead.status || 'novo',
      temperatura: lead.temperatura || 'frio',
      prioridade: lead.prioridade || 'media',
      origem: lead.origem || '',
      observacoes: lead.observacoes || '',
      valor_potencial: lead.valor_potencial?.toString() || '',
      next_followup_date: lead.next_followup_date?.split('T')[0] || '',
      closer_id: lead.closer_id || '',
      sdr_id: lead.sdr_id || ''
    })
    setIsEditModalOpen(true)
  }

  const openViewModal = (lead: Lead) => {
    setSelectedLead(lead)
    setIsViewModalOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status)
    return statusOption ? (
      <Badge className={`${statusOption.color} text-white`}>
        {statusOption.label}
      </Badge>
    ) : (
      <Badge variant="secondary">{status}</Badge>
    )
  }

  const getTemperaturaBadge = (temperatura?: string) => {
    if (!temperatura) return null
    const tempOption = TEMPERATURA_OPTIONS.find(t => t.value === temperatura)
    return tempOption ? (
      <Badge className={`${tempOption.color} text-white text-xs`}>
        {tempOption.label}
      </Badge>
    ) : null
  }

  const getPrioridadeBadge = (prioridade?: string) => {
    if (!prioridade) return null
    const prioOption = PRIORIDADE_OPTIONS.find(p => p.value === prioridade)
    return prioOption ? (
      <Badge className={`${prioOption.color} text-white text-xs`}>
        {prioOption.label}
      </Badge>
    ) : null
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.telefone?.includes(searchTerm) ||
      lead.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    const matchesCloser = closerFilter === 'all' || 
                         (closerFilter === 'unassigned' && !lead.closer_id) ||
                         lead.closer_id === closerFilter

    return matchesSearch && matchesStatus && matchesCloser
  })

  const exportToCSV = () => {
    const csvHeaders = [
      'Nome Completo', 'Email', 'Telefone', 'Empresa', 'Cargo', 
      'Status', 'Temperatura', 'Prioridade', 'Valor Potencial', 
      'Closer', 'Data Criação'
    ]

    const csvData = filteredLeads.map(lead => [
      lead.nome_completo,
      lead.email || '',
      lead.telefone || '',
      lead.empresa || '',
      lead.cargo || '',
      lead.status,
      lead.temperatura || '',
      lead.prioridade || '',
      lead.valor_potencial || '',
      lead.closers?.nome_completo || 'Não atribuído',
      new Date(lead.created_at).toLocaleDateString('pt-BR')
    ])

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `leads_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Leads</h1>
          <p className="text-gray-600 mt-1">
            Bem-vindo, {closer?.nome_completo}! Gerencie seus leads aqui.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={loadLeads} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Lead
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Convertidos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {leads.filter(l => l.status === 'fechado_ganho').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Em Andamento</p>
                <p className="text-2xl font-bold text-gray-900">
                  {leads.filter(l => !['fechado_ganho', 'fechado_perdido'].includes(l.status)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-gray-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Meus Leads</p>
                <p className="text-2xl font-bold text-gray-900">
                  {leads.filter(l => l.closer_id === closer?.id).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Buscar por nome, email, telefone ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={closerFilter} onValueChange={setCloserFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Closer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Closers</SelectItem>
                <SelectItem value="unassigned">Não Atribuídos</SelectItem>
                {closers.map(closer => (
                  <SelectItem key={closer.id} value={closer.id}>
                    {closer.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={showMyLeadsOnly ? "default" : "outline"}
              onClick={() => setShowMyLeadsOnly(!showMyLeadsOnly)}
            >
              <User className="h-4 w-4 mr-2" />
              {showMyLeadsOnly ? 'Todos os Leads' : 'Apenas Meus Leads'}
            </Button>

            <Button
              variant={showUnassignedOnly ? "default" : "outline"}
              onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
            >
              <UserX className="h-4 w-4 mr-2" />
              {showUnassignedOnly ? 'Todos os Leads' : 'Leads Sem SDR'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Leads ({filteredLeads.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Nome</th>
                  <th className="text-left p-2">Contato</th>
                  <th className="text-left p-2">Empresa</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Temperatura</th>
                  <th className="text-left p-2">SDR</th>
                  <th className="text-left p-2">Closer</th>
                  <th className="text-left p-2">Valor</th>
                  <th className="text-center p-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{lead.nome_completo}</p>
                        {lead.cargo && (
                          <p className="text-sm text-gray-500">{lead.cargo}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        {lead.email && (
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-1" />
                            {lead.email}
                          </div>
                        )}
                        {lead.telefone && (
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1" />
                            {lead.telefone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {lead.empresa && (
                        <div className="flex items-center text-sm">
                          <Building className="h-3 w-3 mr-1" />
                          {lead.empresa}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <Select
                        value={lead.status}
                        onValueChange={(value) => handleQuickStatusUpdate(lead.id, value)}
                      >
                        <SelectTrigger className="w-36 h-8">
                          <SelectValue>
                            {getStatusBadge(lead.status)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(status => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {getTemperaturaBadge(lead.temperatura)}
                        {getPrioridadeBadge(lead.prioridade)}
                      </div>
                    </td>
                    <td className="p-3">
                      <Select
                        value={lead.sdr_id || 'unassigned'}
                        onValueChange={(value) => 
                          handleAssignSdr(lead.id, value === 'unassigned' ? '' : value)
                        }
                      >
                        <SelectTrigger className="w-36 h-8">
                          <SelectValue>
                            {lead.sdrs?.nome_completo || 'Não atribuído'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Não atribuído</SelectItem>
                          {sdrs.map(sdr => (
                            <SelectItem key={sdr.id} value={sdr.id}>
                              {sdr.nome_completo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <Select
                        value={lead.closer_id || 'unassigned'}
                        onValueChange={(value) => 
                          handleAssignCloser(lead.id, value === 'unassigned' ? '' : value)
                        }
                      >
                        <SelectTrigger className="w-36 h-8">
                          <SelectValue>
                            {lead.closers?.nome_completo || 'Não atribuído'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Não atribuído</SelectItem>
                          {closers.map(closer => (
                            <SelectItem key={closer.id} value={closer.id}>
                              {closer.nome_completo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      {lead.valor_potencial && (
                        <div className="flex items-center text-sm">
                          <DollarSign className="h-3 w-3 mr-1 text-green-600" />
                          R$ {lead.valor_potencial.toLocaleString('pt-BR')}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openViewModal(lead)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(lead)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteLead(lead.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLeads.length === 0 && (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Nenhum lead encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Criar Lead */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Lead</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome Completo *</Label>
              <Input
                value={formData.nome_completo}
                onChange={(e) => setFormData({...formData, nome_completo: e.target.value})}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Email"
                type="email"
              />
            </div>
            <div>
              <Label>SDR</Label>
              <Select value={formData.sdr_id} onValueChange={(value) => setFormData({...formData, sdr_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar SDR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Não atribuído</SelectItem>
                  {sdrs.map(sdr => (
                    <SelectItem key={sdr.id} value={sdr.id}>
                      {sdr.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Closer</Label>
              <Select value={formData.closer_id} onValueChange={(value) => setFormData({...formData, closer_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar Closer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Não atribuído</SelectItem>
                  {closers.map(closer => (
                    <SelectItem key={closer.id} value={closer.id}>
                      {closer.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateLead}>
              Criar Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CloserLeadsPage() {
  return (
    <CloserAuthProvider>
      <LeadsPageContent />
    </CloserAuthProvider>
  )
}