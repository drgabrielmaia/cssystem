'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Users, 
  Plus,
  Filter,
  Search,
  Edit,
  Trash2,
  DollarSign,
  Target,
  TrendingUp,
  UserCheck,
  UserX,
  Download,
  Eye
} from 'lucide-react'
import { useClosers, CloserWithMetrics } from '@/hooks/use-closers'
import { supabase, organizationService } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

export default function AdminClosersPage() {
  const { user } = useAuth()
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const { closers, loading, error, refetch, addCloser, updateCloser, deactivateCloser, reactivateCloser } = useClosers(organizationId || undefined)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedCloser, setSelectedCloser] = useState<CloserWithMetrics | null>(null)
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showPerformanceModal, setShowPerformanceModal] = useState(false)
  const [performanceData, setPerformanceData] = useState<any>(null)
  const [loadingPerformance, setLoadingPerformance] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    cpf: '',
    tipo_closer: 'sdr',
    meta_mensal: 0,
    comissao_percentual: 5,
    password_hash: ''
  })

  useEffect(() => {
    loadOrganization()
  }, [user])

  const loadOrganization = async () => {
    if (!user) return

    try {
      const result = await organizationService.getUserOrganization(user.id)
      if (result && result.organization) {
        setOrganizationId(result.organization.id)
      }
    } catch (error) {
      console.error('Error loading organization:', error)
    }
  }

  const loadCloserPerformance = async (closer: CloserWithMetrics) => {
    setSelectedCloser(closer)
    setLoadingPerformance(true)
    setShowPerformanceModal(true)

    try {
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      const currentYear = currentDate.getFullYear()
      
      // Data range for current month
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString()
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString()

      let performanceMetrics: any = {
        totalLeads: 0,
        leadsConvertidos: 0,
        reunioesAgendadas: 0,
        vendasFechadas: 0,
        valorTotal: 0,
        comissaoTotal: 0,
        taxaConversaoLeads: 0,
        taxaConversaoReunioes: 0,
        mediaTicket: 0,
        atividades: [],
        vendas: []
      }

      if (closer.tipo_closer === 'sdr') {
        // Para SDRs: focar em prospecção e agendamento de reuniões
        
        // Buscar leads atribuídos ao SDR
        const { data: leadsData } = await supabase
          .from('leads')
          .select('*')
          .eq('sdr_id', closer.id)
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth)

        // Buscar reuniões agendadas pelo SDR
        const { data: reunioesData } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('sdr_id', closer.id)
          .gte('start_datetime', startOfMonth)
          .lte('start_datetime', endOfMonth)

        // Buscar atividades do SDR
        const { data: atividadesData } = await supabase
          .from('closer_atividades')
          .select('*')
          .eq('closer_id', closer.id)
          .gte('data_atividade', startOfMonth)
          .lte('data_atividade', endOfMonth)
          .order('data_atividade', { ascending: false })
          .limit(10)

        performanceMetrics.totalLeads = leadsData?.length || 0
        performanceMetrics.reunioesAgendadas = reunioesData?.length || 0
        performanceMetrics.leadsConvertidos = leadsData?.filter(l => l.status === 'reuniao_agendada' || l.status === 'vendido').length || 0
        performanceMetrics.taxaConversaoLeads = performanceMetrics.totalLeads > 0 
          ? (performanceMetrics.leadsConvertidos / performanceMetrics.totalLeads * 100) 
          : 0
        performanceMetrics.taxaConversaoReunioes = performanceMetrics.totalLeads > 0 
          ? (performanceMetrics.reunioesAgendadas / performanceMetrics.totalLeads * 100) 
          : 0
        performanceMetrics.atividades = atividadesData || []

      } else {
        // Para Closers: focar em fechamento de vendas
        
        // Buscar vendas do closer
        const { data: vendasData } = await supabase
          .from('closers_vendas')
          .select('*, leads(*), mentorados(*)')
          .eq('closer_id', closer.id)
          .gte('data_venda', startOfMonth)
          .lte('data_venda', endOfMonth)

        // Buscar leads atribuídos ao closer
        const { data: leadsData } = await supabase
          .from('leads')
          .select('*')
          .eq('closer_id', closer.id)
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth)

        // Buscar atividades do closer
        const { data: atividadesData } = await supabase
          .from('closer_atividades')
          .select('*')
          .eq('closer_id', closer.id)
          .gte('data_atividade', startOfMonth)
          .lte('data_atividade', endOfMonth)
          .order('data_atividade', { ascending: false })
          .limit(10)

        performanceMetrics.totalLeads = leadsData?.length || 0
        performanceMetrics.vendasFechadas = vendasData?.length || 0
        performanceMetrics.valorTotal = vendasData?.reduce((sum, venda) => sum + (venda.valor_venda || 0), 0) || 0
        performanceMetrics.comissaoTotal = vendasData?.reduce((sum, venda) => sum + (venda.valor_comissao || 0), 0) || 0
        performanceMetrics.leadsConvertidos = leadsData?.filter(l => l.status === 'vendido').length || 0
        performanceMetrics.taxaConversaoLeads = performanceMetrics.totalLeads > 0 
          ? (performanceMetrics.leadsConvertidos / performanceMetrics.totalLeads * 100) 
          : 0
        performanceMetrics.mediaTicket = performanceMetrics.vendasFechadas > 0 
          ? (performanceMetrics.valorTotal / performanceMetrics.vendasFechadas) 
          : 0
        performanceMetrics.vendas = vendasData || []
        performanceMetrics.atividades = atividadesData || []
      }

      setPerformanceData(performanceMetrics)
    } catch (error) {
      console.error('Error loading closer performance:', error)
    } finally {
      setLoadingPerformance(false)
    }
  }

  const filteredClosers = closers.filter(closer => {
    const matchesSearch = closer.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         closer.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || closer.tipo_closer === filterType
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && closer.status_contrato === 'ativo') ||
                         (filterStatus === 'inactive' && closer.status_contrato !== 'ativo')
    
    return matchesSearch && matchesType && matchesStatus
  })

  const handleAddCloser = async () => {
    try {
      await addCloser({
        ...formData,
        organization_id: organizationId || undefined,
        status_contrato: 'ativo',
        data_contratacao: new Date().toISOString().split('T')[0]
      } as any)
      
      setShowAddModal(false)
      resetForm()
      alert('Closer adicionado com sucesso!')
    } catch (error: any) {
      alert('Erro ao adicionar closer: ' + error.message)
    }
  }

  const handleEditCloser = async () => {
    if (!selectedCloser) return

    try {
      await updateCloser(selectedCloser.id, formData)
      setShowEditModal(false)
      resetForm()
      alert('Closer atualizado com sucesso!')
    } catch (error: any) {
      alert('Erro ao atualizar closer: ' + error.message)
    }
  }

  const handleToggleStatus = async (closer: CloserWithMetrics) => {
    try {
      if (closer.status_contrato === 'ativo') {
        await deactivateCloser(closer.id, 'Desativado pelo admin')
      } else {
        await reactivateCloser(closer.id)
      }
      refetch()
    } catch (error: any) {
      alert('Erro ao alterar status: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      nome_completo: '',
      email: '',
      telefone: '',
      cpf: '',
      tipo_closer: 'sdr',
      meta_mensal: 0,
      comissao_percentual: 5,
      password_hash: ''
    })
    setSelectedCloser(null)
  }

  const openEditModal = (closer: CloserWithMetrics) => {
    setSelectedCloser(closer)
    setFormData({
      nome_completo: closer.nome_completo,
      email: closer.email,
      telefone: closer.telefone || '',
      cpf: closer.cpf || '',
      tipo_closer: closer.tipo_closer || 'sdr',
      meta_mensal: closer.meta_mensal || 0,
      comissao_percentual: closer.comissao_percentual || 5,
      password_hash: ''
    })
    setShowEditModal(true)
  }

  const openDetailsModal = (closer: CloserWithMetrics) => {
    setSelectedCloser(closer)
    setShowDetailsModal(true)
  }

  const exportToCSV = () => {
    const headers = ['Nome', 'Email', 'Tipo', 'Status', 'Vendas Mês', 'Valor Vendas', 'Taxa Conversão']
    const rows = filteredClosers.map(closer => [
      closer.nome_completo,
      closer.email,
      closer.tipo_closer,
      closer.status_contrato,
      closer.vendas_mes_atual || 0,
      closer.valor_vendas_mes || 0,
      closer.taxa_conversao_mes || 0
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `closers_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Calculate totals
  const totals = filteredClosers.reduce((acc, closer) => ({
    vendas: acc.vendas + (closer.vendas_mes_atual || 0),
    valor: acc.valor + (closer.valor_vendas_mes || 0),
    comissoes: acc.comissoes + (closer.comissao_mes || 0),
    leads: acc.leads + (closer.leads_mes || 0)
  }), { vendas: 0, valor: 0, comissoes: 0, leads: 0 })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gerenciar Closers/SDRs</h1>
        <p className="text-gray-600">Administre sua equipe de vendas e acompanhe o desempenho</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total de Closers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{filteredClosers.length}</div>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {filteredClosers.filter(c => c.status_contrato === 'ativo').length} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Vendas do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{totals.vendas}</div>
              <Target className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              R$ {totals.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Comissões Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                R$ {totals.comissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <DollarSign className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Leads Atendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{totals.leads}</div>
              <TrendingUp className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Taxa média: {filteredClosers.length > 0 
                ? (filteredClosers.reduce((acc, c) => acc + (c.taxa_conversao_mes || 0), 0) / filteredClosers.length).toFixed(1)
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="sdr">SDR</SelectItem>
                <SelectItem value="closer">Closer</SelectItem>
                <SelectItem value="closer_senior">Closer Senior</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Closer
              </Button>
              
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Closers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Vendas/Mês</TableHead>
                <TableHead className="text-right">Valor/Mês</TableHead>
                <TableHead className="text-center">Taxa Conv.</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClosers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    Nenhum closer encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredClosers.map((closer) => (
                  <TableRow key={closer.id}>
                    <TableCell className="font-medium">{closer.nome_completo}</TableCell>
                    <TableCell>{closer.email}</TableCell>
                    <TableCell>
                      <Badge variant={
                        closer.tipo_closer === 'manager' ? 'default' :
                        closer.tipo_closer === 'closer_senior' ? 'secondary' : 'outline'
                      }>
                        {closer.tipo_closer === 'sdr' ? 'SDR' :
                         closer.tipo_closer === 'closer' ? 'Closer' :
                         closer.tipo_closer === 'closer_senior' ? 'Senior' : 'Manager'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={closer.status_contrato === 'ativo' ? 'default' : 'secondary'}>
                        {closer.status_contrato === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{closer.vendas_mes_atual || 0}</TableCell>
                    <TableCell className="text-right">
                      R$ {(closer.valor_vendas_mes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      {(closer.taxa_conversao_mes || 0).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {(closer.comissao_mes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadCloserPerformance(closer)}
                          title="Ver Performance Detalhada"
                        >
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailsModal(closer)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(closer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(closer)}
                        >
                          {closer.status_contrato === 'ativo' ? 
                            <UserX className="h-4 w-4 text-red-500" /> : 
                            <UserCheck className="h-4 w-4 text-green-500" />
                          }
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Closer Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Closer/SDR</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo membro da equipe de vendas
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                value={formData.nome_completo}
                onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                placeholder="João Silva"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="joao@exemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select 
                value={formData.tipo_closer} 
                onValueChange={(value) => setFormData({ ...formData, tipo_closer: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sdr">SDR</SelectItem>
                  <SelectItem value="closer">Closer</SelectItem>
                  <SelectItem value="closer_senior">Closer Senior</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="meta">Meta Mensal (R$)</Label>
              <Input
                id="meta"
                type="number"
                value={formData.meta_mensal}
                onChange={(e) => setFormData({ ...formData, meta_mensal: parseFloat(e.target.value) })}
                placeholder="10000"
              />
            </div>

            <div>
              <Label htmlFor="comissao">Comissão (%)</Label>
              <Input
                id="comissao"
                type="number"
                value={formData.comissao_percentual}
                onChange={(e) => setFormData({ ...formData, comissao_percentual: parseFloat(e.target.value) })}
                placeholder="5"
              />
            </div>

            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={formData.password_hash}
                onChange={(e) => setFormData({ ...formData, password_hash: e.target.value })}
                placeholder="Senha de acesso"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCloser}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Closer Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Closer/SDR</DialogTitle>
            <DialogDescription>
              Atualize os dados do membro da equipe
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome-edit">Nome Completo</Label>
              <Input
                id="nome-edit"
                value={formData.nome_completo}
                onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="email-edit">Email</Label>
              <Input
                id="email-edit"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="telefone-edit">Telefone</Label>
              <Input
                id="telefone-edit"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="tipo-edit">Tipo</Label>
              <Select 
                value={formData.tipo_closer} 
                onValueChange={(value) => setFormData({ ...formData, tipo_closer: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sdr">SDR</SelectItem>
                  <SelectItem value="closer">Closer</SelectItem>
                  <SelectItem value="closer_senior">Closer Senior</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="meta-edit">Meta Mensal (R$)</Label>
              <Input
                id="meta-edit"
                type="number"
                value={formData.meta_mensal}
                onChange={(e) => setFormData({ ...formData, meta_mensal: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="comissao-edit">Comissão (%)</Label>
              <Input
                id="comissao-edit"
                type="number"
                value={formData.comissao_percentual}
                onChange={(e) => setFormData({ ...formData, comissao_percentual: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="senha-edit">Nova Senha (deixe em branco para manter a atual)</Label>
              <Input
                id="senha-edit"
                type="password"
                value={formData.password_hash}
                onChange={(e) => setFormData({ ...formData, password_hash: e.target.value })}
                placeholder="Nova senha (opcional)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditCloser}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Closer</DialogTitle>
          </DialogHeader>
          
          {selectedCloser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Nome</Label>
                  <p className="font-medium">{selectedCloser.nome_completo}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Email</Label>
                  <p className="font-medium">{selectedCloser.email}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Telefone</Label>
                  <p className="font-medium">{selectedCloser.telefone || 'Não informado'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">CPF</Label>
                  <p className="font-medium">{selectedCloser.cpf || 'Não informado'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Tipo</Label>
                  <p className="font-medium">
                    <Badge>{selectedCloser.tipo_closer}</Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <p className="font-medium">
                    <Badge variant={selectedCloser.status_contrato === 'ativo' ? 'default' : 'secondary'}>
                      {selectedCloser.status_contrato}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Data de Contratação</Label>
                  <p className="font-medium">
                    {selectedCloser.data_contratacao 
                      ? new Date(selectedCloser.data_contratacao).toLocaleDateString('pt-BR')
                      : 'Não informado'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Meta Mensal</Label>
                  <p className="font-medium">
                    R$ {(selectedCloser.meta_mensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Desempenho do Mês Atual</h3>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <Label className="text-gray-500">Vendas</Label>
                    <p className="font-bold text-lg">{selectedCloser.vendas_mes_atual || 0}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Valor Total</Label>
                    <p className="font-bold text-lg">
                      R$ {(selectedCloser.valor_vendas_mes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Comissão</Label>
                    <p className="font-bold text-lg">
                      R$ {(selectedCloser.comissao_mes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Leads</Label>
                    <p className="font-bold text-lg">{selectedCloser.leads_mes || 0}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Taxa Conv.</Label>
                    <p className="font-bold text-lg">{(selectedCloser.taxa_conversao_mes || 0).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowDetailsModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Performance Modal */}
      <Dialog open={showPerformanceModal} onOpenChange={setShowPerformanceModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Performance Detalhada - {selectedCloser?.nome_completo}
              <Badge className="ml-2">{selectedCloser?.tipo_closer}</Badge>
            </DialogTitle>
            <DialogDescription>
              {selectedCloser?.tipo_closer === 'sdr' 
                ? 'Métricas de prospecção e agendamento de reuniões'
                : 'Métricas de fechamento e vendas'
              }
            </DialogDescription>
          </DialogHeader>
          
          {loadingPerformance ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Carregando dados de performance...</p>
              </div>
            </div>
          ) : performanceData && (
            <div className="space-y-6">
              {/* Métricas Principais */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {selectedCloser?.tipo_closer === 'sdr' ? (
                  // Métricas para SDR
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-blue-600 font-medium">Leads Prospectados</div>
                      <div className="text-2xl font-bold text-blue-900">{performanceData.totalLeads}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm text-green-600 font-medium">Reuniões Agendadas</div>
                      <div className="text-2xl font-bold text-green-900">{performanceData.reunioesAgendadas}</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-sm text-purple-600 font-medium">Taxa Agendamento</div>
                      <div className="text-2xl font-bold text-purple-900">{performanceData.taxaConversaoReunioes.toFixed(1)}%</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="text-sm text-orange-600 font-medium">Taxa Conversão</div>
                      <div className="text-2xl font-bold text-orange-900">{performanceData.taxaConversaoLeads.toFixed(1)}%</div>
                    </div>
                  </>
                ) : (
                  // Métricas para Closer
                  <>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm text-green-600 font-medium">Vendas Fechadas</div>
                      <div className="text-2xl font-bold text-green-900">{performanceData.vendasFechadas}</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-blue-600 font-medium">Valor Total</div>
                      <div className="text-2xl font-bold text-blue-900">
                        R$ {performanceData.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-sm text-purple-600 font-medium">Ticket Médio</div>
                      <div className="text-2xl font-bold text-purple-900">
                        R$ {performanceData.mediaTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="text-sm text-yellow-600 font-medium">Taxa Conversão</div>
                      <div className="text-2xl font-bold text-yellow-900">{performanceData.taxaConversaoLeads.toFixed(1)}%</div>
                    </div>
                  </>
                )}
              </div>

              {/* Vendas Recentes (só para Closers) */}
              {selectedCloser?.tipo_closer !== 'sdr' && performanceData.vendas?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Vendas do Mês</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Comissão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {performanceData.vendas.slice(0, 5).map((venda: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              {new Date(venda.data_venda).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              {venda.leads?.nome_completo || venda.mentorados?.nome_completo || 'N/A'}
                            </TableCell>
                            <TableCell>{venda.tipo_venda}</TableCell>
                            <TableCell>
                              R$ {(venda.valor_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              R$ {(venda.valor_comissao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Atividades Recentes */}
              {performanceData.atividades?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Atividades Recentes</h3>
                  <div className="space-y-3">
                    {performanceData.atividades.slice(0, 5).map((atividade: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{atividade.tipo_atividade}</div>
                            <div className="text-sm text-gray-600">{atividade.descricao}</div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(atividade.data_atividade).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        {atividade.resultado && (
                          <div className="mt-2">
                            <Badge variant={atividade.resultado === 'venda' ? 'default' : 'secondary'}>
                              {atividade.resultado}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowPerformanceModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}