'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import {
  Plus,
  User,
  Phone,
  Mail,
  Building,
  Target,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Users,
  DollarSign,
  TrendingUp,
  FileText
} from 'lucide-react'

interface Lead {
  id: string
  nome_completo: string
  email: string | null
  telefone: string | null
  empresa: string | null
  cargo: string | null
  origem: string | null
  status: string
  observacoes: string | null
  valor_potencial: number | null
  data_primeiro_contato: string
  created_at: string
  updated_at: string
}

interface LeadStats {
  status: string
  quantidade: number
  valor_total_potencial: number | null
  valor_medio: number | null
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<LeadStats[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)

  // Estados do formulário
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    empresa: '',
    cargo: '',
    origem: '',
    status: 'novo',
    observacoes: '',
    valor_potencial: ''
  })

  useEffect(() => {
    loadLeads()
    loadStats()
  }, [])

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
    }
  }

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('leads_stats')
        .select('*')

      if (error) throw error
      setStats(data || [])
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const leadData = {
        ...formData,
        valor_potencial: formData.valor_potencial ? parseFloat(formData.valor_potencial) : null
      }

      if (editingLead) {
        const { error } = await supabase
          .from('leads')
          .update(leadData)
          .eq('id', editingLead.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('leads')
          .insert([leadData])

        if (error) throw error
      }

      await loadLeads()
      await loadStats()
      resetForm()
      setIsModalOpen(false)

    } catch (error) {
      console.error('Erro ao salvar lead:', error)
      alert('Erro ao salvar lead')
    }
  }

  const resetForm = () => {
    setFormData({
      nome_completo: '',
      email: '',
      telefone: '',
      empresa: '',
      cargo: '',
      origem: '',
      status: 'novo',
      observacoes: '',
      valor_potencial: ''
    })
    setEditingLead(null)
  }

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead)
    setFormData({
      nome_completo: lead.nome_completo,
      email: lead.email || '',
      telefone: lead.telefone || '',
      empresa: lead.empresa || '',
      cargo: lead.cargo || '',
      origem: lead.origem || '',
      status: lead.status,
      observacoes: lead.observacoes || '',
      valor_potencial: lead.valor_potencial?.toString() || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadLeads()
      await loadStats()
    } catch (error) {
      console.error('Erro ao excluir lead:', error)
      alert('Erro ao excluir lead')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'novo': { label: 'Novo', className: 'bg-blue-100 text-blue-800' },
      'contactado': { label: 'Contactado', className: 'bg-yellow-100 text-yellow-800' },
      'qualificado': { label: 'Qualificado', className: 'bg-purple-100 text-purple-800' },
      'call_agendada': { label: 'Call Agendada', className: 'bg-orange-100 text-orange-800' },
      'proposta_enviada': { label: 'Proposta Enviada', className: 'bg-indigo-100 text-indigo-800' },
      'cliente': { label: 'Cliente', className: 'bg-green-100 text-green-800' },
      'perdido': { label: 'Perdido', className: 'bg-red-100 text-red-800' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.novo
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getTotalValue = () => {
    return stats.reduce((total, stat) => total + (stat.valor_total_potencial || 0), 0)
  }

  const getTotalLeads = () => {
    return stats.reduce((total, stat) => total + stat.quantidade, 0)
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="Leads" subtitle="Carregando..." />
        <main className="flex-1 p-6">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title="Leads"
        subtitle={`${getTotalLeads()} leads • Potencial: ${formatCurrency(getTotalValue())}`}
      />

      <main className="flex-1 p-6 space-y-6">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Leads</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {getTotalLeads()}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Valor Potencial</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(getTotalValue())}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Calls Agendadas</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.find(s => s.status === 'call_agendada')?.quantidade || 0}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Clientes</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.find(s => s.status === 'cliente')?.quantidade || 0}
                  </p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botão para Novo Lead */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Todos os Leads</h2>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingLead ? 'Editar Lead' : 'Novo Lead'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome_completo">Nome Completo *</Label>
                    <Input
                      id="nome_completo"
                      value={formData.nome_completo}
                      onChange={(e) => setFormData({...formData, nome_completo: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="empresa">Empresa</Label>
                    <Input
                      id="empresa"
                      value={formData.empresa}
                      onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cargo">Cargo</Label>
                    <Input
                      id="cargo"
                      value={formData.cargo}
                      onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="origem">Origem</Label>
                    <Select value={formData.origem} onValueChange={(value) => setFormData({...formData, origem: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="indicacao">Indicação</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novo">Novo</SelectItem>
                        <SelectItem value="contactado">Contactado</SelectItem>
                        <SelectItem value="qualificado">Qualificado</SelectItem>
                        <SelectItem value="call_agendada">Call Agendada</SelectItem>
                        <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                        <SelectItem value="cliente">Cliente</SelectItem>
                        <SelectItem value="perdido">Perdido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="valor_potencial">Valor Potencial (R$)</Label>
                  <Input
                    id="valor_potencial"
                    type="number"
                    step="0.01"
                    value={formData.valor_potencial}
                    onChange={(e) => setFormData({...formData, valor_potencial: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingLead ? 'Atualizar' : 'Criar'} Lead
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Leads */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4">Lead</th>
                    <th className="text-left p-4">Contato</th>
                    <th className="text-left p-4">Empresa</th>
                    <th className="text-left p-4">Origem</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-right p-4">Valor Potencial</th>
                    <th className="text-center p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-t hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{lead.nome_completo}</p>
                          <p className="text-xs text-gray-500">{lead.cargo}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center text-xs">
                              <Mail className="w-3 h-3 mr-1" />
                              {lead.email}
                            </div>
                          )}
                          {lead.telefone && (
                            <div className="flex items-center text-xs">
                              <Phone className="w-3 h-3 mr-1" />
                              {lead.telefone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {lead.empresa && (
                          <div className="flex items-center text-sm">
                            <Building className="w-3 h-3 mr-1" />
                            {lead.empresa}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-xs">
                          {lead.origem}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(lead.status)}
                      </td>
                      <td className="p-4 text-right font-medium">
                        {formatCurrency(lead.valor_potencial)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(lead)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(lead.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}