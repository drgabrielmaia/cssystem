'use client'

import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
  FileText,
  Download
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
  valor_vendido: number | null
  valor_arrecadado: number | null
  data_primeiro_contato: string
  created_at: string
  updated_at: string
}

interface LeadStats {
  status: string
  quantidade: number
  valor_total_vendido: number | null
  valor_total_arrecadado: number | null
  valor_medio_vendido: number | null
  valor_medio_arrecadado: number | null
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
    valor_vendido: '',
    valor_arrecadado: ''
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
        valor_vendido: formData.valor_vendido ? parseFloat(formData.valor_vendido) : null,
        valor_arrecadado: formData.valor_arrecadado ? parseFloat(formData.valor_arrecadado) : null
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
      valor_vendido: '',
      valor_arrecadado: ''
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
      valor_vendido: lead.valor_vendido?.toString() || '',
      valor_arrecadado: lead.valor_arrecadado?.toString() || ''
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
      'novo': { label: 'Novo', className: 'bg-blue-500 text-white shadow-md' },
      'contactado': { label: 'Contactado', className: 'bg-purple-500 text-white shadow-md' },
      'qualificado': { label: 'Qualificado', className: 'bg-indigo-500 text-white shadow-md' },
      'call_agendada': { label: 'Call Agendada', className: 'bg-orange-500 text-white shadow-md' },
      'proposta_enviada': { label: 'Proposta Enviada', className: 'bg-amber-500 text-white shadow-md' },
      'vendido': { label: 'Vendido', className: 'bg-green-600 text-white shadow-md' },
      'perdido': { label: 'Perdido', className: 'bg-red-500 text-white shadow-md' },
      'no-show': { label: 'No-show', className: 'bg-yellow-500 text-white shadow-md' }
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

  const getTotalVendido = () => {
    return stats.reduce((total, stat) => total + (stat.valor_total_vendido || 0), 0)
  }

  const getTotalArrecadado = () => {
    return stats.reduce((total, stat) => total + (stat.valor_total_arrecadado || 0), 0)
  }

  const getTotalLeads = () => {
    return stats.reduce((total, stat) => total + stat.quantidade, 0)
  }

  const exportLeadsToPDF = () => {
    const doc = new jsPDF()

    // Título do documento com estilo Rolex (verde e dourado)
    doc.setFontSize(24)
    doc.setTextColor(22, 101, 52) // Verde escuro
    doc.text('📊 Relatório de Leads', 14, 25)

    // Linha decorativa dourada
    doc.setDrawColor(212, 175, 55) // Dourado
    doc.setLineWidth(1)
    doc.line(14, 30, 196, 30)

    // Informações gerais com ícones
    doc.setFontSize(11)
    doc.setTextColor(60, 60, 60)
    doc.text(`📅 Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, 14, 42)
    doc.text(`👥 Total de leads: ${leads.length}`, 14, 50)

    // Preparar dados da tabela - APENAS as 4 colunas essenciais
    const tableData = leads.map(lead => [
      lead.nome_completo,
      lead.origem || 'Não informado',
      lead.status,
      lead.observacoes || 'Sem observações'
    ])

    // Gerar tabela com visual verde e dourado
    autoTable(doc, {
      head: [['👤 Lead', '📍 Origem', '🎯 Status', '📝 Observações']],
      body: tableData,
      startY: 60,
      styles: {
        fontSize: 10,
        cellPadding: 4,
        textColor: [40, 40, 40],
        lineColor: [22, 101, 52],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [22, 101, 52], // Verde escuro
        textColor: [255, 255, 255], // Branco
        fontSize: 11,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [245, 247, 245] // Verde muito claro
      },
      columnStyles: {
        0: {
          cellWidth: 50, // Lead (nome)
          fontStyle: 'bold',
          textColor: [22, 101, 52]
        },
        1: {
          cellWidth: 35, // Origem
          halign: 'center'
        },
        2: {
          cellWidth: 30, // Status
          halign: 'center',
          fontStyle: 'bold'
        },
        3: {
          cellWidth: 70, // Observações
          cellPadding: 3
        }
      },
      margin: { left: 14, right: 14 },
      theme: 'grid'
    })

    // Rodapé elegante
    const finalY = (doc as any).lastAutoTable.finalY + 15
    doc.setDrawColor(212, 175, 55) // Dourado
    doc.line(14, finalY, 196, finalY)

    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} | Sistema de Gestão de Leads`, 14, finalY + 8)

    // Salvar PDF
    doc.save(`leads_relatorio_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="Leads" subtitle="Carregando..." />
        <main className="flex-1 p-6">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map(i => (
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
        subtitle={`${getTotalLeads()} leads • Vendido: ${formatCurrency(getTotalVendido())} • Arrecadado: ${formatCurrency(getTotalArrecadado())}`}
      />

      <main className="flex-1 p-6 space-y-6">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  <p className="text-sm font-medium text-gray-600">Valor Vendido</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(getTotalVendido())}
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
                  <p className="text-sm font-medium text-gray-600">Valor Arrecadado</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(getTotalArrecadado())}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
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
                  <p className="text-sm font-medium text-gray-600">Vendidos</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.find(s => s.status === 'vendido')?.quantidade || 0}
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportLeadsToPDF}>
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Lead
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg bg-gradient-to-br from-green-50 to-yellow-50 border-2 border-green-200">
              <DialogHeader className="text-center pb-6">
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-700 to-yellow-600 bg-clip-text text-transparent">
                  {editingLead ? '✨ Editar Lead' : '🌟 Novo Lead'}
                </DialogTitle>
                <p className="text-sm text-green-600 mt-2">Informações essenciais do prospect</p>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nome Completo */}
                <div className="space-y-2">
                  <Label htmlFor="nome_completo" className="text-green-800 font-semibold">
                    👤 Nome Completo *
                  </Label>
                  <Input
                    id="nome_completo"
                    value={formData.nome_completo}
                    onChange={(e) => setFormData({...formData, nome_completo: e.target.value})}
                    required
                    className="border-2 border-green-200 focus:border-yellow-400 focus:ring-yellow-200 bg-white/70"
                    placeholder="Digite o nome completo..."
                  />
                </div>

                {/* Origem e Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="origem" className="text-green-800 font-semibold">
                      📍 Origem
                    </Label>
                    <Select value={formData.origem} onValueChange={(value) => setFormData({...formData, origem: value})}>
                      <SelectTrigger className="border-2 border-green-200 focus:border-yellow-400 bg-white/70">
                        <SelectValue placeholder="Selecione a origem..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-green-200">
                        <SelectItem value="facebook">📘 Facebook</SelectItem>
                        <SelectItem value="instagram">📸 Instagram</SelectItem>
                        <SelectItem value="google">🔍 Google</SelectItem>
                        <SelectItem value="indicacao">🤝 Indicação</SelectItem>
                        <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                        <SelectItem value="website">🌐 Website</SelectItem>
                        <SelectItem value="outros">📋 Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-green-800 font-semibold">
                      🎯 Status
                    </Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                      <SelectTrigger className="border-2 border-green-200 focus:border-yellow-400 bg-white/70">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-green-200">
                        <SelectItem value="novo">🔵 Novo</SelectItem>
                        <SelectItem value="contactado">🟣 Contactado</SelectItem>
                        <SelectItem value="qualificado">🟦 Qualificado</SelectItem>
                        <SelectItem value="call_agendada">🟠 Call Agendada</SelectItem>
                        <SelectItem value="proposta_enviada">🟡 Proposta Enviada</SelectItem>
                        <SelectItem value="vendido">🟢 Vendido</SelectItem>
                        <SelectItem value="perdido">🔴 Perdido</SelectItem>
                        <SelectItem value="no-show">🟨 No-show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Observações - Destaque especial */}
                <div className="space-y-2">
                  <Label htmlFor="observacoes" className="text-green-800 font-semibold flex items-center gap-2">
                    📝 Observações Importantes
                    <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                      Campo essencial
                    </span>
                  </Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    rows={4}
                    className="border-2 border-green-200 focus:border-yellow-400 focus:ring-yellow-200 bg-white/70 resize-none"
                    placeholder="Adicione observações sobre o lead, contexto da conversa, interesses, objeções, próximos passos..."
                  />
                  <p className="text-xs text-green-600">
                    💡 Dica: Detalhe o máximo possível para um melhor acompanhamento
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-green-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="border-2 border-gray-300 hover:border-red-300 hover:text-red-600"
                  >
                    ❌ Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white font-semibold shadow-lg"
                  >
                    {editingLead ? '✅ Atualizar Lead' : '🚀 Criar Lead'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Lista de Leads */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-green-100 to-yellow-100">
                  <tr>
                    <th className="text-left p-4 font-semibold text-green-800">👤 Lead</th>
                    <th className="text-left p-4 font-semibold text-green-800">📍 Origem</th>
                    <th className="text-left p-4 font-semibold text-green-800">🎯 Status</th>
                    <th className="text-left p-4 font-semibold text-green-800">📝 Observações</th>
                    <th className="text-center p-4 font-semibold text-green-800">⚙️ Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-t hover:bg-gradient-to-r hover:from-green-50 hover:to-yellow-50 transition-all duration-200">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-green-800">{lead.nome_completo}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-xs border-green-300 text-green-700 bg-green-50">
                          {lead.origem || 'Não informado'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(lead.status)}
                      </td>
                      <td className="p-4 max-w-xs">
                        {lead.observacoes ? (
                          <div className="relative group">
                            <p className="text-sm text-gray-700 line-clamp-2 cursor-help">
                              {lead.observacoes}
                            </p>
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 max-w-xs shadow-lg">
                              {lead.observacoes}
                              <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-800"></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Sem observações</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(lead)}
                            className="border-green-300 text-green-700 hover:bg-green-50"
                            title="Editar lead"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(lead.id)}
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            title="Excluir lead"
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