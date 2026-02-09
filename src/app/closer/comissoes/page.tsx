'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Download
} from 'lucide-react'
import { CloserAuthProvider, useCloserAuth } from '@/contexts/closer-auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface CloserVenda {
  id: string
  data_venda: string
  valor_venda: number
  tipo_venda: string
  status_venda: string
  comissao_percentual: number
  valor_comissao: number
  status_pagamento: string
  data_pagamento?: string
  observacoes?: string
  fonte_lead?: string
  lead?: {
    nome: string
    email?: string
  }
  mentorado?: {
    nome_completo: string
    email: string
  }
}

interface ComissaoSummary {
  total_vendas: number
  valor_total_vendas: number
  comissao_total: number
  comissao_paga: number
  comissao_pendente: number
  vendas_mes_atual: number
}

function ComissoesPageContent() {
  const { closer, loading: authLoading } = useCloserAuth()
  const [vendas, setVendas] = useState<CloserVenda[]>([])
  const [summary, setSummary] = useState<ComissaoSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('all')

  useEffect(() => {
    if (closer) {
      loadVendas()
    }
  }, [closer])

  const loadVendas = async () => {
    if (!closer) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('closers_vendas')
        .select(`
          *,
          lead:leads!closers_vendas_lead_id_fkey (
            nome,
            email
          ),
          mentorado:mentorados!closers_vendas_mentorado_id_fkey (
            nome_completo,
            email
          )
        `)
        .eq('closer_id', closer.id)
        .order('data_venda', { ascending: false })

      if (error) {
        console.error('Error loading vendas:', error)
      } else {
        const vendasData = data || []
        setVendas(vendasData)
        calculateSummary(vendasData)
      }
    } catch (error) {
      console.error('Error loading vendas:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateSummary = (vendasData: CloserVenda[]) => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const vendasConfirmadas = vendasData.filter(v => v.status_venda === 'confirmada')
    const vendasMesAtual = vendasConfirmadas.filter(v => {
      const dataVenda = new Date(v.data_venda)
      return dataVenda.getMonth() === currentMonth && dataVenda.getFullYear() === currentYear
    })

    const summary: ComissaoSummary = {
      total_vendas: vendasConfirmadas.length,
      valor_total_vendas: vendasConfirmadas.reduce((sum, v) => sum + v.valor_venda, 0),
      comissao_total: vendasConfirmadas.reduce((sum, v) => sum + v.valor_comissao, 0),
      comissao_paga: vendasConfirmadas
        .filter(v => v.status_pagamento === 'pago')
        .reduce((sum, v) => sum + v.valor_comissao, 0),
      comissao_pendente: vendasConfirmadas
        .filter(v => v.status_pagamento !== 'pago')
        .reduce((sum, v) => sum + v.valor_comissao, 0),
      vendas_mes_atual: vendasMesAtual.length
    }

    setSummary(summary)
  }

  const filteredVendas = vendas.filter(venda => {
    if (selectedPeriod === 'all') return true
    
    const dataVenda = new Date(venda.data_venda)
    const now = new Date()
    
    switch (selectedPeriod) {
      case 'month':
        return dataVenda.getMonth() === now.getMonth() && 
               dataVenda.getFullYear() === now.getFullYear()
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        const vendaQuarter = Math.floor(dataVenda.getMonth() / 3)
        return vendaQuarter === quarter && dataVenda.getFullYear() === now.getFullYear()
      case 'year':
        return dataVenda.getFullYear() === now.getFullYear()
      default:
        return true
    }
  })

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pago': return 'bg-green-100 text-green-800'
      case 'processando': return 'bg-blue-100 text-blue-800'
      case 'pendente': return 'bg-yellow-100 text-yellow-800'
      case 'cancelado': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pago': return <CheckCircle className="h-4 w-4" />
      case 'processando': return <Clock className="h-4 w-4" />
      case 'pendente': return <Clock className="h-4 w-4" />
      case 'cancelado': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
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
              <h1 className="text-2xl font-bold text-gray-900">Minhas Comissões</h1>
              <p className="text-sm text-gray-500">Acompanhe suas vendas e comissões</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/closer">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Dashboard
                </Link>
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar Relatório
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Comissão Total</p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {summary.comissao_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {closer.comissao_percentual || 5}% de comissão
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Comissão Paga</p>
                    <p className="text-2xl font-bold text-blue-600">
                      R$ {summary.comissao_paga.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Comissão Pendente</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      R$ {summary.comissao_pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total de Vendas</p>
                    <p className="text-2xl font-bold">{summary.total_vendas}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Valor: R$ {summary.valor_total_vendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Período:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os Períodos</option>
                <option value="month">Este Mês</option>
                <option value="quarter">Este Trimestre</option>
                <option value="year">Este Ano</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Vendas List */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Vendas</CardTitle>
            <CardDescription>
              {filteredVendas.length} de {vendas.length} vendas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredVendas.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma venda encontrada</p>
                <p className="text-sm text-gray-400">Continue trabalhando para gerar comissões!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredVendas.map((venda) => (
                  <div key={venda.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {venda.tipo_venda.charAt(0).toUpperCase() + venda.tipo_venda.slice(1)}
                          </h3>
                          
                          <Badge className={getStatusBadgeColor(venda.status_pagamento)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(venda.status_pagamento)}
                              {venda.status_pagamento.toUpperCase()}
                            </div>
                          </Badge>

                          {venda.status_venda !== 'confirmada' && (
                            <Badge variant="outline" className="bg-gray-100">
                              {venda.status_venda.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        
                        {(venda.lead || venda.mentorado) && (
                          <div className="text-sm text-gray-600 mb-2">
                            <strong>Cliente:</strong> 
                            {venda.lead ? ` ${venda.lead.nome}` : ` ${venda.mentorado?.nome_completo}`}
                            {venda.lead?.email || venda.mentorado?.email ? 
                              ` (${venda.lead?.email || venda.mentorado?.email})` : ''}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="text-gray-500">Data da Venda:</span>
                            <br />
                            <span className="font-medium">
                              {new Date(venda.data_venda).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-gray-500">Valor da Venda:</span>
                            <br />
                            <span className="font-medium text-green-600">
                              R$ {venda.valor_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div>
                            <span className="text-gray-500">Comissão ({venda.comissao_percentual}%):</span>
                            <br />
                            <span className="font-medium text-blue-600">
                              R$ {venda.valor_comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          {venda.data_pagamento && (
                            <div>
                              <span className="text-gray-500">Data do Pagamento:</span>
                              <br />
                              <span className="font-medium">
                                {new Date(venda.data_pagamento).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}
                        </div>

                        {venda.fonte_lead && (
                          <div className="mt-2 text-sm">
                            <span className="text-gray-500">Fonte do Lead: </span>
                            <span className="text-gray-700">{venda.fonte_lead}</span>
                          </div>
                        )}

                        {venda.observacoes && (
                          <div className="mt-2 text-sm text-gray-600 bg-gray-100 p-2 rounded">
                            {venda.observacoes}
                          </div>
                        )}
                      </div>

                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
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

export default function ComissoesPage() {
  return (
    <CloserAuthProvider>
      <ComissoesPageContent />
    </CloserAuthProvider>
  )
}