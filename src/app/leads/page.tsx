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
  Activity,
  Users,
  DollarSign,
  TrendingUp,
  FileText,
  Download,
  Search,
  Filter
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
  convertido_em: string | null
  origem_detalhada: string | null
  lead_score: number | null
  temperatura: string | null
  probabilidade_compra: number | null
  valor_estimado: number | null
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
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [origemFilter, setOrigemFilter] = useState('todas')
  const [temperaturaFilter, setTemperaturaFilter] = useState('todas')
  const [periodoFilter, setPeriodoFilter] = useState('todos')

  // Estados para paginação e otimização
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const leadsPerPage = 20 // Mostrar apenas 20 leads por vez

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
    valor_arrecadado: '',
    origem_detalhada: '',
    lead_score: '',
    temperatura: 'frio',
    probabilidade_compra: '',
    valor_estimado: ''
  })

  // Cache das estatísticas para evitar recálculo
  const [statsCache, setStatsCache] = useState<{ [key: string]: LeadStats[] }>({})
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadLeads()
    loadStatsWithCache()
  }, [])

  // Debounce para busca
  useEffect(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }

    const timer = setTimeout(() => {
      if (searchTerm || statusFilter !== 'todos' || origemFilter !== 'todas' || temperaturaFilter !== 'todas' || periodoFilter !== 'todos') {
        loadLeads(1, false) // Recarregar da primeira página quando filtrar
      }
    }, 300)

    setSearchDebounceTimer(timer)

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [searchTerm, statusFilter, origemFilter, temperaturaFilter, periodoFilter])

  const loadLeads = async (page = 1, append = false) => {
    try {
      setLoading(page === 1) // Só mostrar loading na primeira página

      const from = (page - 1) * leadsPerPage
      const to = from + leadsPerPage - 1

      // Construir query com filtros do servidor
      let query = supabase
        .from('leads')
        .select('id, nome_completo, email, telefone, empresa, cargo, status, origem, temperatura, observacoes, valor_vendido, valor_arrecadado, data_primeiro_contato, convertido_em, origem_detalhada, lead_score, probabilidade_compra, valor_estimado, created_at, updated_at', { count: 'exact' })

      // Aplicar filtros de texto
      if (searchTerm) {
        query = query.or(`nome_completo.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,empresa.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`)
      }

      // Aplicar filtros de status
      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter)
      }

      if (origemFilter !== 'todas') {
        query = query.eq('origem', origemFilter)
      }

      if (temperaturaFilter !== 'todas') {
        query = query.eq('temperatura', temperaturaFilter)
      }

      // Aplicar filtro de período
      if (periodoFilter !== 'todos') {
        const now = new Date()
        let startDate = new Date()

        switch (periodoFilter) {
          case 'semana':
            startDate.setDate(now.getDate() - 7)
            break
          case 'mes':
            startDate.setMonth(now.getMonth() - 1)
            break
          case 'ano':
            startDate.setFullYear(now.getFullYear() - 1)
            break
        }

        if (periodoFilter !== 'todos') {
          query = query.gte('data_primeiro_contato', startDate.toISOString())
        }
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      if (append) {
        setLeads(prev => [...prev, ...(data || [])])
      } else {
        setLeads(data || [])
      }

      setTotalCount(count || 0)
      setHasNextPage(data && data.length === leadsPerPage)
      setCurrentPage(page)
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStatsWithCache = async () => {
    const cacheKey = 'stats_general'

    // Verificar cache (válido por 5 minutos)
    if (statsCache[cacheKey]) {
      const cacheTime = parseInt(localStorage.getItem('stats_cache_time') || '0')
      if (Date.now() - cacheTime < 5 * 60 * 1000) {
        setStats(statsCache[cacheKey])
        setLoading(false)
        return
      }
    }

    try {
      const { data, error } = await supabase
        .from('leads_stats')
        .select('*')

      if (error) throw error

      // Salvar no cache
      setStatsCache(prev => ({ ...prev, [cacheKey]: data || [] }))
      localStorage.setItem('stats_cache_time', Date.now().toString())
      setStats(data || [])
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      // Tentar usar cache antigo se disponível
      if (statsCache[cacheKey]) {
        setStats(statsCache[cacheKey])
      }
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
        valor_arrecadado: formData.valor_arrecadado ? parseFloat(formData.valor_arrecadado) : null,
        origem_detalhada: formData.origem_detalhada || null,
        lead_score: formData.lead_score ? parseInt(formData.lead_score) : null,
        temperatura: formData.temperatura,
        probabilidade_compra: formData.probabilidade_compra ? parseInt(formData.probabilidade_compra) : null,
        valor_estimado: formData.valor_estimado ? parseFloat(formData.valor_estimado) : null
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
      await loadStatsWithCache()
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
      valor_arrecadado: '',
      origem_detalhada: '',
      lead_score: '',
      temperatura: 'frio',
      probabilidade_compra: '',
      valor_estimado: ''
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
      valor_arrecadado: lead.valor_arrecadado?.toString() || '',
      origem_detalhada: lead.origem_detalhada || '',
      lead_score: lead.lead_score?.toString() || '',
      temperatura: lead.temperatura || 'frio',
      probabilidade_compra: lead.probabilidade_compra?.toString() || '',
      valor_estimado: lead.valor_estimado?.toString() || ''
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
      await loadStatsWithCache()
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

  // Filtrar leads baseado na pesquisa e filtros
  // Como os filtros agora são aplicados no servidor, usamos leads diretamente
  const filteredLeads = leads

  // Obter listas únicas para filtros
  const statusOptions = ['todos', ...Array.from(new Set(leads.map(l => l.status).filter(Boolean)))]
  const origemOptions = ['todas', ...Array.from(new Set(leads.map(l => l.origem).filter(Boolean)))]
  const temperaturaOptions = ['todas', 'frio', 'morno', 'quente']

  // Função para obter badge de temperatura
  const getTemperaturaBadge = (temperatura: string | null) => {
    const tempConfig = {
      'frio': { label: '❄️ Frio', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      'morno': { label: '🔥 Morno', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      'quente': { label: '🚀 Quente', className: 'bg-red-100 text-red-700 border-red-200' }
    }

    const config = tempConfig[temperatura as keyof typeof tempConfig] || tempConfig.frio
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const exportLeadsToPDF = () => {
    const doc = new jsPDF()

    // Título do documento com estilo Rolex (verde e dourado)
    doc.setFontSize(24)
    doc.setTextColor(22, 101, 52) // Verde escuro
    doc.text('Relatorio de Leads', 14, 25)

    // Linha decorativa dourada
    doc.setDrawColor(212, 175, 55) // Dourado
    doc.setLineWidth(1)
    doc.line(14, 30, 196, 30)

    // Informações gerais
    doc.setFontSize(11)
    doc.setTextColor(60, 60, 60)
    doc.text(`Data de geracao: ${new Date().toLocaleDateString('pt-BR')}`, 14, 42)
    doc.text(`Total de leads: ${leads.length}`, 14, 50)

    // Preparar dados da tabela - APENAS as 4 colunas essenciais
    const tableData = leads.map(lead => [
      lead.nome_completo,
      lead.origem || 'Não informado',
      lead.status,
      lead.observacoes || 'Sem observações'
    ])

    // Gerar tabela com visual verde e dourado
    autoTable(doc, {
      head: [['Lead', 'Origem', 'Status', 'Observacoes']],
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
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} | Sistema de Gestao de Leads`, 14, finalY + 8)

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
        subtitle={
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span>{getTotalLeads()} leads</span>
            <span className="hidden sm:inline">•</span>
            <span>Vendido: {formatCurrency(getTotalVendido())}</span>
            <span className="hidden sm:inline">•</span>
            <span>Arrecadado: {formatCurrency(getTotalArrecadado())}</span>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-semibold">Todos os Leads ({filteredLeads.length})</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
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
            <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-green-50 to-yellow-50 border-2 border-green-200">
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

                {/* Email e Telefone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-green-800 font-semibold">
                      📧 Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="border-2 border-green-200 focus:border-yellow-400 focus:ring-yellow-200 bg-white/70"
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone" className="text-green-800 font-semibold">
                      📞 Telefone
                    </Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                      className="border-2 border-green-200 focus:border-yellow-400 focus:ring-yellow-200 bg-white/70"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                {/* Empresa e Cargo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="empresa" className="text-green-800 font-semibold">
                      🏢 Empresa
                    </Label>
                    <Input
                      id="empresa"
                      value={formData.empresa}
                      onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                      className="border-2 border-green-200 focus:border-yellow-400 focus:ring-yellow-200 bg-white/70"
                      placeholder="Nome da empresa..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cargo" className="text-green-800 font-semibold">
                      👔 Cargo
                    </Label>
                    <Input
                      id="cargo"
                      value={formData.cargo}
                      onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                      className="border-2 border-green-200 focus:border-yellow-400 focus:ring-yellow-200 bg-white/70"
                      placeholder="Cargo/função..."
                    />
                  </div>
                </div>

                {/* Origem e Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                        <SelectItem value="youtube">📺 YouTube</SelectItem>
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

                  <div>
                    <Label htmlFor="temperatura" className="text-sm font-semibold text-green-800 flex items-center gap-2">
                      🌡️ Temperatura
                    </Label>
                    <Select value={formData.temperatura} onValueChange={(value) => setFormData({...formData, temperatura: value})}>
                      <SelectTrigger className="border-2 border-green-200 focus:border-yellow-400 bg-white/70">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-green-200">
                        <SelectItem value="frio">❄️ Frio</SelectItem>
                        <SelectItem value="morno">🔥 Morno</SelectItem>
                        <SelectItem value="quente">🚀 Quente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Valores Financeiros */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valor_vendido" className="text-green-800 font-semibold">
                      💰 Valor Vendido
                    </Label>
                    <Input
                      id="valor_vendido"
                      type="number"
                      step="0.01"
                      value={formData.valor_vendido}
                      onChange={(e) => setFormData({...formData, valor_vendido: e.target.value})}
                      className="border-2 border-green-200 focus:border-yellow-400 focus:ring-yellow-200 bg-white/70"
                      placeholder="Ex: 1500.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valor_arrecadado" className="text-green-800 font-semibold">
                      💵 Valor Arrecadado
                    </Label>
                    <Input
                      id="valor_arrecadado"
                      type="number"
                      step="0.01"
                      value={formData.valor_arrecadado}
                      onChange={(e) => setFormData({...formData, valor_arrecadado: e.target.value})}
                      className="border-2 border-green-200 focus:border-yellow-400 focus:ring-yellow-200 bg-white/70"
                      placeholder="Ex: 750.00"
                    />
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

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-green-200">
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

        {/* Seção de Pesquisa e Filtros */}
        <div className="space-y-4">
          {/* Barra de Pesquisa */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, email, telefone, empresa ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-4">
            {/* Filtro por Status */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Status:</span>
              <div className="flex flex-wrap gap-1">
                {statusOptions.map(status => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className="capitalize text-xs"
                  >
                    {status === 'todos' ? 'Todos' : status.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filtro por Origem */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4"></div>
              <span className="text-sm text-gray-600">Origem:</span>
              <div className="flex flex-wrap gap-1">
                {origemOptions.map(origem => (
                  <Button
                    key={origem}
                    variant={origemFilter === origem ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOrigemFilter(origem || 'todas')}
                    className="capitalize text-xs"
                  >
                    {origem === 'todas' ? 'Todas' : origem}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filtro por Temperatura */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4"></div>
              <span className="text-sm text-gray-600">Temperatura:</span>
              <div className="flex flex-wrap gap-1">
                {temperaturaOptions.map(temp => (
                  <Button
                    key={temp}
                    variant={temperaturaFilter === temp ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTemperaturaFilter(temp)}
                    className="capitalize text-xs"
                  >
                    {temp === 'todas' ? 'Todas' : temp === 'frio' ? '❄️ Frio' : temp === 'morno' ? '🔥 Morno' : '🚀 Quente'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filtro por Período */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4"></div>
              <span className="text-sm text-gray-600">Período:</span>
              <div className="flex flex-wrap gap-1">
                <Button
                  variant={periodoFilter === 'todos' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriodoFilter('todos')}
                  className="text-xs"
                >
                  📅 Todos
                </Button>
                <Button
                  variant={periodoFilter === 'semana' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriodoFilter('semana')}
                  className="text-xs"
                >
                  📆 Última semana
                </Button>
                <Button
                  variant={periodoFilter === 'mes' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriodoFilter('mes')}
                  className="text-xs"
                >
                  📅 Último mês
                </Button>
                <Button
                  variant={periodoFilter === 'ano' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriodoFilter('ano')}
                  className="text-xs"
                >
                  📄 Último ano
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Leads */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-gradient-to-r from-green-100 to-yellow-100">
                  <tr>
                    <th className="text-left p-4 font-semibold text-green-800">👤 Lead</th>
                    <th className="text-left p-4 font-semibold text-green-800">📞 Contato</th>
                    <th className="text-left p-4 font-semibold text-green-800">🏢 Empresa</th>
                    <th className="text-left p-4 font-semibold text-green-800">📍 Origem</th>
                    <th className="text-left p-4 font-semibold text-green-800">🎯 Status</th>
                    <th className="text-right p-4 font-semibold text-green-800">💰 Valores</th>
                    <th className="text-left p-4 font-semibold text-green-800">📝 Observações</th>
                    <th className="text-center p-4 font-semibold text-green-800">⚙️ Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="border-t hover:bg-gradient-to-r hover:from-green-50 hover:to-yellow-50 transition-all duration-200">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-green-800">{lead.nome_completo}</p>
                          <p className="text-xs text-gray-500">{lead.cargo}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center text-xs">
                              <Mail className="w-3 h-3 mr-1 text-gray-400" />
                              <span className="text-gray-700">{lead.email}</span>
                            </div>
                          )}
                          {lead.telefone && (
                            <div className="flex items-center text-xs">
                              <Phone className="w-3 h-3 mr-1 text-gray-400" />
                              <span className="text-gray-700">{lead.telefone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {lead.empresa && (
                          <div className="flex items-center text-sm">
                            <Building className="w-3 h-3 mr-1 text-gray-400" />
                            <span className="text-gray-700">{lead.empresa}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-xs border-green-300 text-green-700 bg-green-50">
                          {lead.origem || 'Não informado'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(lead.status)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-green-600">
                            {lead.valor_vendido ? `Vendido: ${formatCurrency(lead.valor_vendido)}` : '-'}
                          </div>
                          <div className="text-xs text-blue-600">
                            {lead.valor_arrecadado ? `Arrecadado: ${formatCurrency(lead.valor_arrecadado)}` : '-'}
                          </div>
                        </div>
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
                        <div className="flex items-center justify-center space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.location.href = `/leads/${lead.id}`}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            title="Tracking completo do lead"
                          >
                            <Activity className="w-3 h-3" />
                          </Button>
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

              {/* Skeleton Loading */}
              {loading && (
                <div className="space-y-4 p-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex space-x-4">
                      <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Botão Carregar Mais */}
              {hasNextPage && !loading && (
                <div className="p-4 text-center">
                  <Button
                    onClick={() => loadLeads(currentPage + 1, true)}
                    variant="outline"
                    className="w-full"
                  >
                    Carregar Mais ({totalCount - leads.length} restantes)
                  </Button>
                </div>
              )}

              {/* Info de paginação */}
              <div className="p-4 text-sm text-gray-500 text-center border-t">
                Mostrando {leads.length} de {totalCount} leads
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mensagem quando não há leads filtrados */}
        {filteredLeads.length === 0 && leads.length > 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum lead encontrado</h3>
            <p className="text-gray-500">
              Tente ajustar os filtros ou termo de pesquisa para encontrar leads.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('todos')
                setOrigemFilter('todas')
                setTemperaturaFilter('todas')
                setPeriodoFilter('todos')
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        )}

        {/* Mensagem quando não há leads no sistema */}
        {leads.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum lead cadastrado</h3>
            <p className="text-gray-500">
              Comece adicionando seu primeiro lead no sistema.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}