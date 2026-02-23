'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Plus, 
  UserPlus, 
  DollarSign, 
  Download, 
  Eye,
  Check,
  X,
  User,
  CreditCard,
  FileText
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { generateCommissionsPDF, generateCommissionPaymentList } from '@/lib/pdf-utils'

interface ThirdPartyUser {
  id: string
  name: string
  email: string
  pix_key: string
  phone?: string
  notes?: string
  created_at: string
}

interface Commission {
  commission_id: string
  user_name: string
  user_email: string
  user_pix_key: string
  amount: number
  description?: string
  status: 'pending' | 'paid' | 'cancelled'
  created_at: string
  paid_at?: string
}

export default function ThirdPartyCommissionsPage() {
  const { organizationId, user } = useAuth()
  const [thirdPartyUsers, setThirdPartyUsers] = useState<ThirdPartyUser[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showCommissionModal, setShowCommissionModal] = useState(false)

  // Form states
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    pix_key: '',
    phone: '',
    notes: ''
  })

  const [commissionForm, setCommissionForm] = useState({
    third_party_user_id: '',
    amount: '',
    description: ''
  })

  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (organizationId) {
      loadData()
    }
  }, [organizationId, statusFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load third party users
      const { data: users, error: usersError } = await supabase
        .from('third_party_users')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (usersError) throw usersError
      setThirdPartyUsers(users || [])

      // Load commissions
      const { data: commissionsData, error: commissionsError } = await supabase
        .rpc('get_third_party_commissions_report', {
          p_organization_id: organizationId,
          p_status: statusFilter
        })

      if (commissionsError) throw commissionsError
      setCommissions(commissionsData || [])

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      alert('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId) return

    try {
      const { data, error } = await supabase.rpc('create_third_party_user', {
        p_name: userForm.name,
        p_email: userForm.email,
        p_pix_key: userForm.pix_key,
        p_phone: userForm.phone || null,
        p_organization_id: organizationId,
        p_notes: userForm.notes || null
      })

      if (error) throw error

      alert('Usuário terceirizado criado com sucesso!')
      setShowUserModal(false)
      setUserForm({ name: '', email: '', pix_key: '', phone: '', notes: '' })
      loadData()
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      alert('Erro ao criar usuário terceirizado')
    }
  }

  const handleCreateCommission = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId || !user?.email) return

    try {
      const { data, error } = await supabase.rpc('create_third_party_commission', {
        p_third_party_user_id: commissionForm.third_party_user_id,
        p_amount: parseFloat(commissionForm.amount),
        p_organization_id: organizationId,
        p_created_by_email: user.email,
        p_description: commissionForm.description || null
      })

      if (error) throw error

      alert('Comissão criada com sucesso!')
      setShowCommissionModal(false)
      setCommissionForm({ third_party_user_id: '', amount: '', description: '' })
      loadData()
    } catch (error) {
      console.error('Erro ao criar comissão:', error)
      alert('Erro ao criar comissão')
    }
  }

  const handleUpdateStatus = async (commissionId: string, status: string) => {
    if (!organizationId) return

    try {
      const { data, error } = await supabase.rpc('update_commission_status', {
        p_commission_id: commissionId,
        p_status: status,
        p_organization_id: organizationId
      })

      if (error) throw error

      alert(`Comissão ${status === 'paid' ? 'marcada como paga' : 'cancelada'} com sucesso!`)
      loadData()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status da comissão')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-900/20 text-yellow-400 border-yellow-400/30',
      paid: 'bg-green-900/20 text-green-400 border-green-400/30',
      cancelled: 'bg-red-900/20 text-red-400 border-red-400/30'
    }
    
    const labels = {
      pending: 'Pendente',
      paid: 'Pago',
      cancelled: 'Cancelado'
    }

    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    )
  }

  const totalPending = commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.amount, 0)

  const totalPaid = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount, 0)

  const handleExportPDF = (type: 'full' | 'payment') => {
    if (commissions.length === 0) {
      alert('Não há comissões para exportar')
      return
    }

    try {
      if (type === 'full') {
        generateCommissionsPDF(commissions, { 
          status: statusFilter,
          organizationName: 'Customer Success System'
        })
        alert('Relatório completo exportado com sucesso!')
      } else {
        const pendingCommissions = commissions.filter(c => c.status === 'pending')
        if (pendingCommissions.length === 0) {
          alert('Não há comissões pendentes para exportar')
          return
        }
        generateCommissionPaymentList(pendingCommissions, 'Customer Success System')
        alert('Lista de pagamentos exportada com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      alert('Erro ao exportar PDF')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Comissões Terceirizadas</h1>
          <p className="text-gray-400">Gerencie usuários e comissões terceirizadas</p>
        </div>
        
        <div className="flex gap-3">
          <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Criar Usuário Terceirizado</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <Label className="text-white">Nome *</Label>
                  <Input
                    value={userForm.name}
                    onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                <div>
                  <Label className="text-white">Email *</Label>
                  <Input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                <div>
                  <Label className="text-white">Chave PIX *</Label>
                  <Input
                    value={userForm.pix_key}
                    onChange={(e) => setUserForm(prev => ({ ...prev, pix_key: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                <div>
                  <Label className="text-white">Telefone</Label>
                  <Input
                    value={userForm.phone}
                    onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">Observações</Label>
                  <Textarea
                    value={userForm.notes}
                    onChange={(e) => setUserForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowUserModal(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    Criar Usuário
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showCommissionModal} onOpenChange={setShowCommissionModal}>
            <DialogTrigger asChild>
              <Button className="bg-[#D4AF37] hover:bg-[#B8860B]">
                <Plus className="h-4 w-4 mr-2" />
                Nova Comissão
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Criar Comissão</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCommission} className="space-y-4">
                <div>
                  <Label className="text-white">Usuário *</Label>
                  <Select
                    value={commissionForm.third_party_user_id}
                    onValueChange={(value) => setCommissionForm(prev => ({ ...prev, third_party_user_id: value }))}
                    required
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {thirdPartyUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id} className="text-white">
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white">Valor (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={commissionForm.amount}
                    onChange={(e) => setCommissionForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                <div>
                  <Label className="text-white">Descrição</Label>
                  <Textarea
                    value={commissionForm.description}
                    onChange={(e) => setCommissionForm(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Descreva a origem da comissão..."
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowCommissionModal(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-[#D4AF37] hover:bg-[#B8860B]">
                    Criar Comissão
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Usuários Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{thirdPartyUsers.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              Comissões Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">
              R$ {totalPending.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Total Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              R$ {totalPaid.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">
              Total Comissões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{commissions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all" className="text-white">Todas</SelectItem>
              <SelectItem value="pending" className="text-white">Pendentes</SelectItem>
              <SelectItem value="paid" className="text-white">Pagas</SelectItem>
              <SelectItem value="cancelled" className="text-white">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
            onClick={() => handleExportPDF('full')}
          >
            <Download className="h-4 w-4 mr-2" />
            Relatório Completo
          </Button>
          <Button 
            variant="outline" 
            className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
            onClick={() => handleExportPDF('payment')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Lista Pagamentos
          </Button>
        </div>
      </div>

      {/* Commissions Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Usuário</TableHead>
                <TableHead className="text-gray-300">PIX</TableHead>
                <TableHead className="text-gray-300">Valor</TableHead>
                <TableHead className="text-gray-300">Descrição</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-gray-300">Data</TableHead>
                <TableHead className="text-gray-300">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((commission) => (
                <TableRow key={commission.commission_id} className="border-gray-700">
                  <TableCell>
                    <div>
                      <div className="font-medium text-white">{commission.user_name}</div>
                      <div className="text-sm text-gray-400">{commission.user_email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">{commission.user_pix_key}</TableCell>
                  <TableCell className="text-white font-medium">
                    R$ {commission.amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {commission.description || '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(commission.status)}</TableCell>
                  <TableCell className="text-gray-300">
                    {new Date(commission.created_at).toLocaleDateString('pt-BR')}
                    {commission.paid_at && (
                      <div className="text-xs text-green-400">
                        Pago: {new Date(commission.paid_at).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {commission.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(commission.commission_id, 'paid')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(commission.commission_id, 'cancelled')}
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {commissions.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              Nenhuma comissão encontrada
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}