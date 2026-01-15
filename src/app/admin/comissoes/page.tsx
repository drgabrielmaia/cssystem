'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search, DollarSign, Check, X, Edit, Eye, Calendar,
  User, TrendingUp, AlertCircle, Clock
} from 'lucide-react'

interface Comissao {
  id: string
  mentorado_id: string
  lead_id: string
  valor_comissao: number
  valor_venda: number
  data_venda: string
  observacoes: string
  status?: string
  created_at: string
  updated_at: string

  // Joins
  mentorado_nome?: string
  mentorado_email?: string
  lead_nome?: string
  lead_empresa?: string
}

export default function AdminComissoesPage() {
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente' | 'pago' | 'recusado'>('todos')
  const [selectedComissao, setSelectedComissao] = useState<Comissao | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)

  useEffect(() => {
    carregarComissoes()
  }, [])

  const carregarComissoes = async () => {
    try {
      setLoading(true)
      console.log('🔍 Carregando todas as comissões para admin...')

      // Buscar comissões com dados dos mentorados e leads
      const { data: comissoesData, error } = await supabase
        .from('comissoes')
        .select(`
          *,
          mentorados:mentorado_id (
            nome_completo,
            email
          ),
          leads:lead_id (
            nome_completo,
            empresa
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Erro ao buscar comissões:', error)
        return
      }

      // Formatar dados
      const comissoesFormatadas = comissoesData?.map(comissao => ({
        ...comissao,
        mentorado_nome: comissao.mentorados?.nome_completo,
        mentorado_email: comissao.mentorados?.email,
        lead_nome: comissao.leads?.nome_completo,
        lead_empresa: comissao.leads?.empresa,
      })) || []

      setComissoes(comissoesFormatadas)
      console.log('✅ Comissões carregadas:', comissoesFormatadas.length)

    } catch (error) {
      console.error('❌ Erro ao carregar comissões:', error)
    } finally {
      setLoading(false)
    }
  }

  const aprovarComissao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('comissoes')
        .update({
          status: 'pago',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('❌ Erro ao aprovar comissão:', error)
        alert('Erro ao aprovar comissão')
        return
      }

      console.log('✅ Comissão aprovada com sucesso')
      alert('Comissão aprovada e marcada como paga!')
      carregarComissoes()
    } catch (error) {
      console.error('❌ Erro ao aprovar comissão:', error)
      alert('Erro ao aprovar comissão')
    }
  }

  const recusarComissao = async (id: string) => {
    try {
      const motivo = prompt('Motivo da recusa (opcional):')

      const { error } = await supabase
        .from('comissoes')
        .update({
          status: 'recusado',
          observacoes: selectedComissao?.observacoes + (motivo ? ` | RECUSADA: ${motivo}` : ' | RECUSADA'),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('❌ Erro ao recusar comissão:', error)
        alert('Erro ao recusar comissão')
        return
      }

      console.log('✅ Comissão recusada com sucesso')
      alert('Comissão recusada!')
      carregarComissoes()
    } catch (error) {
      console.error('❌ Erro ao recusar comissão:', error)
      alert('Erro ao recusar comissão')
    }
  }

  const editarComissao = async (comissao: Comissao) => {
    try {
      const novoValor = parseFloat(prompt('Novo valor da comissão:', comissao.valor_comissao?.toString()) || '0')
      const novaObservacao = prompt('Observações:', comissao.observacoes || '') || ''

      if (novoValor <= 0) {
        alert('Valor deve ser maior que zero')
        return
      }

      const { error } = await supabase
        .from('comissoes')
        .update({
          valor_comissao: novoValor,
          observacoes: novaObservacao,
          updated_at: new Date().toISOString()
        })
        .eq('id', comissao.id)

      if (error) {
        console.error('❌ Erro ao editar comissão:', error)
        alert('Erro ao editar comissão')
        return
      }

      console.log('✅ Comissão editada com sucesso')
      alert('Comissão editada com sucesso!')
      carregarComissoes()
    } catch (error) {
      console.error('❌ Erro ao editar comissão:', error)
      alert('Erro ao editar comissão')
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pago':
        return <Badge className="bg-green-500 hover:bg-green-600">Pago</Badge>
      case 'recusado':
        return <Badge className="bg-red-500 hover:bg-red-600">Recusado</Badge>
      case 'pendente':
      default:
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const filteredComissoes = comissoes.filter(comissao => {
    const matchesSearch =
      comissao.mentorado_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comissao.lead_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comissao.observacoes?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'todos' || (comissao.status || 'pendente') === filterStatus

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: comissoes.length,
    pendentes: comissoes.filter(c => (c.status || 'pendente') === 'pendente').length,
    pagas: comissoes.filter(c => c.status === 'pago').length,
    recusadas: comissoes.filter(c => c.status === 'recusado').length,
    totalValor: comissoes.reduce((acc, c) => acc + (c.valor_comissao || 0), 0),
    valorPendente: comissoes.filter(c => (c.status || 'pendente') === 'pendente').reduce((acc, c) => acc + (c.valor_comissao || 0), 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestão de Comissões</h1>
              <p className="text-gray-600 mt-1">Gerencie aprovações, recusas e edições de comissões</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Total Comissões</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-gray-600">Pendentes</p>
                    <p className="text-2xl font-bold">{stats.pendentes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">Pagas</p>
                    <p className="text-2xl font-bold">{stats.pagas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Valor Pendente</p>
                    <p className="text-lg font-bold">{formatCurrency(stats.valorPendente)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por mentorado, lead ou observações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="recusado">Recusado</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Comissões Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Comissões ({filteredComissoes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-gray-600">Carregando comissões...</p>
              </div>
            ) : filteredComissoes.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhuma comissão encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Mentorado</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Lead</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Valor Comissão</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Valor Venda</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Data Venda</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComissoes.map((comissao) => (
                      <tr key={comissao.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{comissao.mentorado_nome}</p>
                            <p className="text-sm text-gray-500">{comissao.mentorado_email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{comissao.lead_nome}</p>
                            <p className="text-sm text-gray-500">{comissao.lead_empresa}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-green-600">
                            {formatCurrency(comissao.valor_comissao || 0)}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-gray-900">
                            {formatCurrency(comissao.valor_venda || 0)}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-gray-900">
                            {formatDate(comissao.data_venda)}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(comissao.status)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedComissao(comissao)
                                setShowViewModal(true)
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editarComissao(comissao)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>

                            {(comissao.status || 'pendente') === 'pendente' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600"
                                  onClick={() => aprovarComissao(comissao.id)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>

                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => recusarComissao(comissao.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Visualização */}
        {showViewModal && selectedComissao && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Detalhes da Comissão</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowViewModal(false)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mentorado</label>
                    <p className="text-gray-900">{selectedComissao.mentorado_nome}</p>
                    <p className="text-sm text-gray-500">{selectedComissao.mentorado_email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lead</label>
                    <p className="text-gray-900">{selectedComissao.lead_nome}</p>
                    <p className="text-sm text-gray-500">{selectedComissao.lead_empresa}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Comissão</label>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(selectedComissao.valor_comissao || 0)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Venda</label>
                    <p className="text-lg font-bold">
                      {formatCurrency(selectedComissao.valor_venda || 0)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data da Venda</label>
                    <p className="text-gray-900">{formatDate(selectedComissao.data_venda)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    {getStatusBadge(selectedComissao.status)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded">
                    {selectedComissao.observacoes || 'Nenhuma observação'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                  <div>
                    <span className="font-medium">Criado em:</span> {formatDate(selectedComissao.created_at)}
                  </div>
                  <div>
                    <span className="font-medium">Atualizado em:</span> {formatDate(selectedComissao.updated_at)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}