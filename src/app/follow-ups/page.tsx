'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { Plus, Calendar, Clock, User, Phone, Mail, MessageCircle, Handshake, FileText, AlertCircle, CheckCircle, XCircle, Timer, Filter, Search } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Lead {
  id: string
  nome_completo: string
  email: string
  telefone: string
  empresa: string
  status: string
}

interface FollowUp {
  id: string
  lead_id: string
  titulo: string
  descricao: string
  data_agendada: string
  tipo: string
  prioridade: string
  status: string
  resultado: string
  responsavel: string
  notificacao_enviada: boolean
  created_at: string
  updated_at: string
  lead: Lead
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [prioridadeFilter, setPrioridadeFilter] = useState('todas')

  const [formData, setFormData] = useState({
    lead_id: '',
    titulo: '',
    descricao: '',
    data_agendada: '',
    tipo: 'call',
    prioridade: 'media',
    status: 'pendente',
    responsavel: '',
    resultado: ''
  })

  const tipos = [
    { value: 'call', label: 'Ligação', icon: Phone, color: 'text-blue-600' },
    { value: 'email', label: 'Email', icon: Mail, color: 'text-green-600' },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-500' },
    { value: 'meeting', label: 'Reunião', icon: Handshake, color: 'text-purple-600' },
    { value: 'proposal', label: 'Proposta', icon: FileText, color: 'text-orange-600' }
  ]

  const prioridades = [
    { value: 'baixa', label: 'Baixa', color: 'bg-gray-100 text-gray-800' },
    { value: 'media', label: 'Média', color: 'bg-blue-100 text-blue-800' },
    { value: 'alta', label: 'Alta', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgente', label: 'Urgente', color: 'bg-red-100 text-red-800' }
  ]

  const statusOptions = [
    { value: 'pendente', label: 'Pendente', icon: Timer, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'concluido', label: 'Concluído', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
    { value: 'cancelado', label: 'Cancelado', icon: XCircle, color: 'bg-red-100 text-red-800' },
    { value: 'adiado', label: 'Adiado', icon: AlertCircle, color: 'bg-gray-100 text-gray-800' }
  ]

  useEffect(() => {
    fetchFollowUps()
    fetchLeads()
  }, [])

  const fetchFollowUps = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_followups')
        .select(`
          *,
          lead:leads (
            id,
            nome_completo,
            email,
            telefone,
            empresa,
            status
          )
        `)
        .order('data_agendada', { ascending: true })

      if (error) throw error
      setFollowUps(data || [])
    } catch (error) {
      console.error('Erro ao buscar follow-ups:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome_completo, email, telefone, empresa, status')
        .order('nome_completo')

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Erro ao buscar leads:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const data = {
        ...formData,
        data_agendada: new Date(formData.data_agendada).toISOString()
      }

      if (editingFollowUp) {
        const { error } = await supabase
          .from('lead_followups')
          .update(data)
          .eq('id', editingFollowUp.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('lead_followups')
          .insert([data])

        if (error) throw error

        // Enviar notificação se for um novo follow-up
        const lead = leads.find(l => l.id === formData.lead_id)
        if (lead) {
          try {
            await fetch('/api/notify-followup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ followUp: data, lead })
            })
          } catch (notifyError) {
            console.warn('Erro ao enviar notificação:', notifyError)
          }
        }
      }

      fetchFollowUps()
      resetForm()
    } catch (error) {
      console.error('Erro ao salvar follow-up:', error)
      alert('Erro ao salvar follow-up')
    }
  }

  const resetForm = () => {
    setFormData({
      lead_id: '',
      titulo: '',
      descricao: '',
      data_agendada: '',
      tipo: 'call',
      prioridade: 'media',
      status: 'pendente',
      responsavel: '',
      resultado: ''
    })
    setEditingFollowUp(null)
    setIsModalOpen(false)
  }

  const handleEdit = (followUp: FollowUp) => {
    setFormData({
      lead_id: followUp.lead_id,
      titulo: followUp.titulo,
      descricao: followUp.descricao || '',
      data_agendada: followUp.data_agendada.slice(0, 16),
      tipo: followUp.tipo,
      prioridade: followUp.prioridade,
      status: followUp.status,
      responsavel: followUp.responsavel || '',
      resultado: followUp.resultado || ''
    })
    setEditingFollowUp(followUp)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este follow-up?')) return

    try {
      const { error } = await supabase
        .from('lead_followups')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchFollowUps()
    } catch (error) {
      console.error('Erro ao deletar follow-up:', error)
      alert('Erro ao deletar follow-up')
    }
  }

  const filteredFollowUps = followUps.filter(followUp => {
    const searchMatch =
      followUp.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      followUp.lead.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      followUp.responsavel?.toLowerCase().includes(searchTerm.toLowerCase())

    const statusMatch = statusFilter === 'todos' || followUp.status === statusFilter
    const prioridadeMatch = prioridadeFilter === 'todas' || followUp.prioridade === prioridadeFilter

    return searchMatch && statusMatch && prioridadeMatch
  })

  const getTipoIcon = (tipo: string) => {
    const tipoConfig = tipos.find(t => t.value === tipo)
    return tipoConfig ? tipoConfig.icon : FileText
  }

  const getTipoColor = (tipo: string) => {
    const tipoConfig = tipos.find(t => t.value === tipo)
    return tipoConfig ? tipoConfig.color : 'text-gray-600'
  }

  const getPrioridadeColor = (prioridade: string) => {
    const prioridadeConfig = prioridades.find(p => p.value === prioridade)
    return prioridadeConfig ? prioridadeConfig.color : 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: string) => {
    const statusConfig = statusOptions.find(s => s.value === status)
    return statusConfig ? statusConfig.color : 'bg-gray-100 text-gray-800'
  }

  const isOverdue = (dataAgendada: string, status: string) => {
    return new Date(dataAgendada) < new Date() && status === 'pendente'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Follow-ups</h1>
          <p className="mt-2 text-gray-600">Gerencie seus acompanhamentos de leads</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Follow-up
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar follow-ups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {statusOptions.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as prioridades</SelectItem>
                {prioridades.map(prioridade => (
                  <SelectItem key={prioridade.value} value={prioridade.value}>
                    {prioridade.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center text-sm text-gray-500">
              <Filter className="h-4 w-4 mr-2" />
              {filteredFollowUps.length} follow-ups
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Follow-ups */}
      <div className="grid gap-4">
        {filteredFollowUps.map((followUp) => {
          const TipoIcon = getTipoIcon(followUp.tipo)
          const isLate = isOverdue(followUp.data_agendada, followUp.status)

          return (
            <Card key={followUp.id} className={`border-l-4 ${isLate ? 'border-l-red-500 bg-red-50' : 'border-l-blue-500'}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <TipoIcon className={`h-5 w-5 ${getTipoColor(followUp.tipo)}`} />
                      <h3 className="text-lg font-semibold text-gray-900">{followUp.titulo}</h3>
                      <Badge className={getPrioridadeColor(followUp.prioridade)}>
                        {prioridades.find(p => p.value === followUp.prioridade)?.label}
                      </Badge>
                      <Badge className={getStatusColor(followUp.status)}>
                        {statusOptions.find(s => s.value === followUp.status)?.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        <span className="font-medium">{followUp.lead.nome_completo}</span>
                        {followUp.lead.empresa && (
                          <span className="ml-2 text-sm text-gray-500">({followUp.lead.empresa})</span>
                        )}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {format(new Date(followUp.data_agendada), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {isLate && (
                          <Badge variant="destructive" className="ml-2">
                            Atrasado
                          </Badge>
                        )}
                      </div>
                    </div>

                    {followUp.descricao && (
                      <p className="text-gray-600 mb-3">{followUp.descricao}</p>
                    )}

                    {followUp.responsavel && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        Responsável: {followUp.responsavel}
                      </div>
                    )}

                    {followUp.resultado && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-1">Resultado:</h4>
                        <p className="text-gray-600 text-sm">{followUp.resultado}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(followUp)}>
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(followUp.id)}>
                      Deletar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filteredFollowUps.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum follow-up encontrado
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'todos' || prioridadeFilter !== 'todas'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece criando seu primeiro follow-up'
                }
              </p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Follow-up
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Criação/Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFollowUp ? 'Editar Follow-up' : 'Novo Follow-up'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lead_id">Lead *</Label>
                <Select
                  value={formData.lead_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, lead_id: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map(lead => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.nome_completo} {lead.empresa && `(${lead.empresa})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tipos.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex: Ligar para apresentar proposta"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Detalhes sobre este follow-up..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_agendada">Data e Hora *</Label>
                <Input
                  id="data_agendada"
                  type="datetime-local"
                  value={formData.data_agendada}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_agendada: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prioridade">Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, prioridade: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {prioridades.map(prioridade => (
                      <SelectItem key={prioridade.value} value={prioridade.value}>
                        {prioridade.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável</Label>
              <Input
                id="responsavel"
                value={formData.responsavel}
                onChange={(e) => setFormData(prev => ({ ...prev, responsavel: e.target.value }))}
                placeholder="Nome do responsável pelo follow-up"
              />
            </div>

            {formData.status === 'concluido' && (
              <div className="space-y-2">
                <Label htmlFor="resultado">Resultado</Label>
                <Textarea
                  id="resultado"
                  value={formData.resultado}
                  onChange={(e) => setFormData(prev => ({ ...prev, resultado: e.target.value }))}
                  placeholder="Descreva o resultado deste follow-up..."
                  rows={3}
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingFollowUp ? 'Atualizar' : 'Criar'} Follow-up
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}