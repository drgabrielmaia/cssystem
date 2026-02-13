'use client'

import { useState, useCallback, useMemo } from 'react'
import { useStableData } from '@/hooks/use-stable-data'
import { useStableMutation } from '@/hooks/use-stable-mutation'
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
  percentual_comissao?: number
  valor_venda: number
  data_venda: string
  observacoes: string
  status_pagamento?: string  // Mudança: era status, mas na DB é status_pagamento
  created_at: string
  updated_at: string

  // Joins
  mentorados?: {
    nome_completo: string
    email: string
  }
  leads?: {
    nome_completo: string
    empresa: string | null
  }
  mentorado_nome?: string
  mentorado_email?: string
  lead_nome?: string
  lead_empresa?: string
}

export default function AdminComissoesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente' | 'pago' | 'recusado' | 'cancelado'>('todos')
  const [selectedComissao, setSelectedComissao] = useState<Comissao | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [editForm, setEditForm] = useState({
    valor_comissao: 0,
    percentual_comissao: 5,
    observacoes: ''
  })
  const [showGlobalConfigModal, setShowGlobalConfigModal] = useState(false)

  // Use stable hook for commissions data
  const {
    data: rawComissoes,
    loading: comissoesLoading,
    error: comissoesError,
    refetch: refetchComissoes
  } = useStableData<any>({
    tableName: 'comissoes',
    select: `
      *,
      mentorados:mentorado_id (
        nome_completo,
        email
      ),
      leads:lead_id (
        nome_completo,
        empresa,
        valor_vendido,
        valor_arrecadado,
        status
      )
    `,
    dependencies: [],
    autoLoad: true,
    debounceMs: 300
  })

  // Memoized commissions transformation
  const comissoes = useMemo(() => {
    if (!rawComissoes?.length) return []
    
    return rawComissoes.map(comissao => ({
      ...comissao,
      mentorado_nome: comissao.mentorados?.nome_completo,
      mentorado_email: comissao.mentorados?.email,
      lead_nome: comissao.leads?.nome_completo,
      lead_empresa: comissao.leads?.empresa,
    })) as Comissao[]
  }, [rawComissoes])

  // Stable mutations for commission operations
  const { mutate: mutateUpdateComissao, isLoading: isUpdatingComissao, error: updateError } = useStableMutation(
    'comissoes',
    'update',
    {
      onSuccess: async () => {
        await refetchComissoes()
      },
      debounceMs: 150
    }
  )

  const aprovarComissao = useCallback(async (id: string) => {
    try {
      await mutateUpdateComissao({
        id,
        status_pagamento: 'pago',
        updated_at: new Date().toISOString()
      })
      
      console.log('✅ Comissão aprovada com sucesso')
      alert('Comissão aprovada e marcada como paga!')
    } catch (error) {
      console.error('❌ Erro ao aprovar comissão:', error)
      alert('Erro ao aprovar comissão')
    }
  }, [mutateUpdateComissao])

  const recusarComissao = useCallback(async (id: string) => {
    try {
      const motivo = prompt('Motivo da recusa (opcional):')
      const comissao = comissoes.find(c => c.id === id)

      await mutateUpdateComissao({
        id,
        status_pagamento: 'recusado',
        observacoes: (comissao?.observacoes || '') + (motivo ? ` | RECUSADA: ${motivo}` : ' | RECUSADA'),
        updated_at: new Date().toISOString()
      })

      console.log('✅ Comissão recusada com sucesso')
      alert('Comissão recusada!')
    } catch (error) {
      console.error('❌ Erro ao recusar comissão:', error)
      alert('Erro ao recusar comissão')
    }
  }, [mutateUpdateComissao, comissoes])

  const abrirModalEditar = useCallback((comissao: Comissao) => {
    console.log('✏️ Abrindo modal de edição para comissão:', comissao.id)
    setSelectedComissao(comissao)
    setEditForm({
      valor_comissao: comissao.valor_comissao || 0,
      percentual_comissao: comissao.percentual_comissao || 5,
      observacoes: comissao.observacoes || ''
    })
    setShowEditModal(true)
  }, [])

  const calcularValorPorPercentual = useCallback((percentual: number, valorVenda: number) => {
    return (valorVenda * percentual) / 100
  }, [])

  const salvarEdicaoComissao = useCallback(async () => {
    if (!selectedComissao) return
    
    console.log('🔄 Iniciando edição de comissão...')
    
    try {
      await mutateUpdateComissao({
        id: selectedComissao.id,
        valor_comissao: editForm.valor_comissao,
        percentual_comissao: editForm.percentual_comissao,
        observacoes: editForm.observacoes,
        updated_at: new Date().toISOString()
      })

      console.log('✅ Comissão editada com sucesso')
      alert('Comissão editada com sucesso!')
      setShowEditModal(false)
    } catch (error) {
      console.error('❌ Erro ao editar comissão:', error)
      alert('Erro ao editar comissão')
    }
  }, [selectedComissao, editForm, mutateUpdateComissao])

  const definirTodosCom5Porcento = useCallback(async () => {
    if (!confirm('Isso irá definir TODAS as comissões pendentes para 5%. Continuar?')) {
      return
    }

    try {
      // Buscar apenas comissões pendentes dos dados já carregados
      const comissoesPendentes = comissoes.filter(c => (c.status_pagamento || 'pendente') === 'pendente')
      
      // Atualizar cada comissão com 5% do valor de venda
      for (const comissao of comissoesPendentes) {
        const novoValor = calcularValorPorPercentual(5, comissao.valor_venda)
        
        await mutateUpdateComissao({
          id: comissao.id,
          valor_comissao: novoValor,
          percentual_comissao: 5,
          updated_at: new Date().toISOString()
        })
      }

      alert(`✅ ${comissoesPendentes.length} comissões atualizadas para 5%!`)
      setShowGlobalConfigModal(false)

    } catch (error) {
      console.error('❌ Erro ao atualizar comissões:', error)
      alert('Erro ao atualizar comissões')
    }
  }, [comissoes, calcularValorPorPercentual, mutateUpdateComissao])

  const corrigirComissoesZeradas = useCallback(async () => {
    const comissoesZeradas = comissoes.filter(c => 
      (c.status_pagamento || 'pendente') === 'pendente' && 
      (c.valor_comissao || 0) === 0
    ).length

    if (!confirm(`Padronizar TODAS as comissões para R$ 2.000,00 fixo (remove percentual)?\n\n⚠️ Isso afetará TODAS as comissões, não só as zeradas.`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/fix-commissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (response.ok) {
        alert(`✅ ${result.corrigidas || 0} comissões padronizadas para R$ 2.000,00!\n\n${result.observacao || 'Todas agora são comissões fixas.'}`)
        await refetchComissoes() // Use stable refetch instead
      } else {
        throw new Error(result.error || 'Erro na padronização')
      }

    } catch (error: any) {
      console.error('❌ Erro ao corrigir comissões:', error)
      alert(`❌ Erro: ${error.message}`)
    }
  }, [comissoes, refetchComissoes])

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pago':
        return <Badge className="bg-green-500 hover:bg-green-600">Pago</Badge>
      case 'recusado':
        return <Badge className="bg-red-500 hover:bg-red-600">Recusado</Badge>
      case 'cancelado':
        return <Badge className="bg-gray-500 hover:bg-gray-600">Cancelado</Badge>
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

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }, [])

  // Memoized filtered commissions
  const filteredComissoes = useMemo(() => {
    return comissoes.filter(comissao => {
      const matchesSearch = searchTerm.length === 0 || 
        comissao.mentorado_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comissao.lead_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comissao.observacoes?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = filterStatus === 'todos' || (comissao.status_pagamento || 'pendente') === filterStatus

      return matchesSearch && matchesStatus
    })
  }, [comissoes, searchTerm, filterStatus])

  // Memoized statistics calculation
  const stats = useMemo(() => ({
    total: comissoes.length,
    pendentes: comissoes.filter(c => (c.status_pagamento || 'pendente') === 'pendente').length,
    pagas: comissoes.filter(c => c.status_pagamento === 'pago').length,
    recusadas: comissoes.filter(c => c.status_pagamento === 'recusado').length,
    canceladas: comissoes.filter(c => c.status_pagamento === 'cancelado').length,
    totalValor: comissoes.reduce((acc, c) => acc + (c.valor_comissao || 0), 0),
    valorPendente: comissoes.filter(c => (c.status_pagamento || 'pendente') === 'pendente').reduce((acc, c) => acc + (c.valor_comissao || 0), 0),
    comissoesZeradas: comissoes.filter(c => (c.status_pagamento || 'pendente') === 'pendente' && (c.valor_comissao || 0) === 0).length
  }), [comissoes])

  // Combined loading state
  const loading = comissoesLoading || isUpdatingComissao

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
            <Button
              onClick={() => setShowGlobalConfigModal(true)}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Configurar Comissões
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  <X className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Canceladas</p>
                    <p className="text-2xl font-bold">{stats.canceladas}</p>
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

          {/* Alerta para comissões zeradas */}
          {stats.comissoesZeradas > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                    <div>
                      <p className="font-semibold text-red-700">
                        ⚠️ {stats.comissoesZeradas} comissões com valor zerado encontradas
                      </p>
                      <p className="text-sm text-red-600">
                        Estas comissões deveriam ter R$ 2.000,00 cada. Total perdido: R$ {(stats.comissoesZeradas * 2000).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={corrigirComissoesZeradas}
                    className="bg-red-500 hover:bg-red-600 text-white"
                    disabled={loading}
                  >
                    {loading ? 'Corrigindo...' : 'Corrigir Agora'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
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
                <option value="cancelado">Cancelado</option>
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
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Percentual</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Valor Venda</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Data Venda</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComissoes.map((comissao) => (
                      <tr
                        key={comissao.id}
                        className={`border-b transition-colors ${
                          (comissao.valor_comissao || 0) === 0 && (comissao.status_pagamento || 'pendente') === 'pendente'
                            ? 'bg-red-50 hover:bg-red-100 border-red-200'
                            : 'hover:bg-gray-50'
                        }`}
                      >
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
                          <div className="flex items-center space-x-2">
                            <p className={`font-bold ${
                              (comissao.valor_comissao || 0) === 0 && (comissao.status_pagamento || 'pendente') === 'pendente'
                                ? 'text-red-600'
                                : 'text-green-600'
                            }`}>
                              {formatCurrency(comissao.valor_comissao || 0)}
                            </p>
                            {(comissao.valor_comissao || 0) === 0 && (comissao.status_pagamento || 'pendente') === 'pendente' && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                ZERADA
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-blue-600">
                            {(comissao.percentual_comissao || 5)}%
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
                          {getStatusBadge(comissao.status_pagamento)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                console.log('👁️ Clicou no olhinho para comissão:', comissao.id)
                                setSelectedComissao(comissao)
                                setShowViewModal(true)
                                console.log('👁️ Modal de visualização aberto')
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirModalEditar(comissao)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>

                            {(comissao.status_pagamento || 'pendente') === 'pendente' && (
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Comissão</label>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(selectedComissao.valor_comissao || 0)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percentual</label>
                    <p className="text-lg font-bold text-blue-600">
                      {(selectedComissao.percentual_comissao || 5)}%
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
                    {getStatusBadge(selectedComissao.status_pagamento)}
                  </div>
                </div>

                {/* Progresso do Cliente */}
                {selectedComissao.leads && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-blue-700 mb-3">Status do Pagamento do Cliente</label>
                    
                    {(() => {
                      const valorVendido = selectedComissao.leads.valor_vendido || 0
                      const valorArrecadado = selectedComissao.leads.valor_arrecadado || 0
                      const progresso = valorVendido > 0 ? Math.min((valorArrecadado / valorVendido) * 100, 100) : 0
                      const clienteQuitou = progresso >= 100
                      
                      return (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Progresso:</span>
                            <span className="text-xl font-bold text-blue-600">{progresso.toFixed(1)}%</span>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all duration-300 ${
                                clienteQuitou ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-blue-600 to-blue-400'
                              }`}
                              style={{ width: `${progresso}%` }}
                            />
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">Já recebido:</span>
                              <div className="font-medium text-green-600">
                                {formatCurrency(valorArrecadado)}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">Total vendido:</span>
                              <div className="font-medium">
                                {formatCurrency(valorVendido)}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">Falta receber:</span>
                              <div className="font-medium text-orange-600">
                                {formatCurrency(valorVendido - valorArrecadado)}
                              </div>
                            </div>
                          </div>
                          
                          <div className={`text-center text-sm p-2 rounded ${
                            clienteQuitou 
                              ? 'bg-green-100 text-green-700 border border-green-200' 
                              : 'bg-orange-100 text-orange-700 border border-orange-200'
                          }`}>
                            {clienteQuitou 
                              ? '🎉 Cliente quitou! Comissão pode ser liberada' 
                              : '⏳ Aguardando cliente quitar para liberar 2ª parte'
                            }
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

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

        {/* Modal de Edição */}
        {showEditModal && selectedComissao && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Editar Comissão</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mentorado: {selectedComissao.mentorado_nome}
                  </label>
                  <label className="block text-sm text-gray-500 mb-3">
                    Valor da venda: {formatCurrency(selectedComissao.valor_venda || 0)}
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Percentual de Comissão
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={editForm.percentual_comissao}
                    onChange={(e) => {
                      const percentual = parseFloat(e.target.value) || 0
                      const novoValor = calcularValorPorPercentual(percentual, selectedComissao.valor_venda || 0)
                      setEditForm({
                        ...editForm,
                        percentual_comissao: percentual,
                        valor_comissao: novoValor
                      })
                    }}
                    className="mb-2"
                  />
                  <p className="text-xs text-gray-500">
                    Valor calculado: {formatCurrency(editForm.valor_comissao)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor da Comissão (R$)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.valor_comissao}
                    onChange={(e) => {
                      const valor = parseFloat(e.target.value) || 0
                      const percentual = selectedComissao.valor_venda ? (valor / selectedComissao.valor_venda) * 100 : 0
                      setEditForm({
                        ...editForm,
                        valor_comissao: valor,
                        percentual_comissao: Math.round(percentual * 100) / 100
                      })
                    }}
                    className="mb-2"
                  />
                  <p className="text-xs text-gray-500">
                    Percentual calculado: {editForm.percentual_comissao.toFixed(2)}%
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <Input
                    value={editForm.observacoes}
                    onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                    placeholder="Observações adicionais..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    onClick={salvarEdicaoComissao}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    Salvar
                  </Button>
                  <Button
                    onClick={() => setShowEditModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Configuração Global */}
        {showGlobalConfigModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Configurar Comissões</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGlobalConfigModal(false)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Definir Padrão Global</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Esta ação irá configurar todas as comissões pendentes para 5% do valor de venda.
                  </p>
                  <div className="text-sm text-gray-600">
                    <p>• Comissões pendentes: <strong>{stats.pendentes}</strong></p>
                    <p>• Comissões zeradas: <strong>{stats.comissoesZeradas}</strong></p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={definirTodosCom5Porcento}
                    className="flex-1 bg-blue-500 hover:bg-blue-600"
                    disabled={loading}
                  >
                    {loading ? 'Processando...' : 'Definir Todos com 5%'}
                  </Button>
                  <Button
                    onClick={() => setShowGlobalConfigModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}