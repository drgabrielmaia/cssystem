'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  DollarSign, 
  ArrowLeft,
  Save,
  AlertCircle,
  User,
  Calendar,
  Tag
} from 'lucide-react'
import { CloserAuthProvider, useCloserAuth } from '@/contexts/closer-auth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Lead {
  id: string
  nome: string
  email?: string
  telefone?: string
}

interface Mentorado {
  id: string
  nome_completo: string
  email: string
}

function VendasPageContent() {
  const { closer, loading: authLoading } = useCloserAuth()
  const router = useRouter()
  
  const [leads, setLeads] = useState<Lead[]>([])
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  
  // Form fields
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [selectedMentoradoId, setSelectedMentoradoId] = useState('')
  const [tipoVenda, setTipoVenda] = useState('mentoria')
  const [valorVenda, setValorVenda] = useState('')
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split('T')[0])
  const [fonteLeadInput, setFonteLeadInput] = useState('')
  const [observacoes, setObservacoes] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (closer) {
      loadLeads()
      loadMentorados()
    }
  }, [closer])

  const loadLeads = async () => {
    if (!closer) return

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, email, telefone')
        .eq('closer_id', closer.id)
        .order('nome', { ascending: true })

      if (error) {
        console.error('Error loading leads:', error)
      } else {
        setLeads(data || [])
      }
    } catch (error) {
      console.error('Error loading leads:', error)
    }
  }

  const loadMentorados = async () => {
    if (!closer) return

    try {
      const { data, error } = await supabase
        .from('mentorados')
        .select('id, nome_completo, email')
        .eq('organization_id', closer.organization_id)
        .order('nome_completo', { ascending: true })

      if (error) {
        console.error('Error loading mentorados:', error)
      } else {
        setMentorados(data || [])
      }
    } catch (error) {
      console.error('Error loading mentorados:', error)
    }
  }

  const calculateComissao = (valor: number) => {
    const percentual = closer?.comissao_percentual || 5
    return (valor * percentual) / 100
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!closer) return

    setLoading(true)
    setError(null)

    try {
      const valor = parseFloat(valorVenda)
      if (isNaN(valor) || valor <= 0) {
        throw new Error('Valor da venda deve ser um número positivo')
      }

      const comissaoPercentual = closer.comissao_percentual || 5
      const valorComissao = calculateComissao(valor)

      const vendaData = {
        closer_id: closer.id,
        organization_id: closer.organization_id,
        lead_id: selectedLeadId || null,
        mentorado_id: selectedMentoradoId || null,
        data_venda: dataVenda,
        valor_venda: valor,
        tipo_venda: tipoVenda,
        status_venda: 'confirmada',
        comissao_percentual: comissaoPercentual,
        valor_comissao: valorComissao,
        status_pagamento: 'pendente',
        observacoes: observacoes || null,
        fonte_lead: fonteLeadInput || null
      }

      const { error: insertError } = await supabase
        .from('closers_vendas')
        .insert([vendaData])

      if (insertError) {
        throw insertError
      }

      // Also create an activity for this sale
      const atividadeData = {
        closer_id: closer.id,
        organization_id: closer.organization_id,
        tipo_atividade: 'proposta',
        lead_id: selectedLeadId || null,
        mentorado_id: selectedMentoradoId || null,
        descricao: `Venda registrada - ${tipoVenda} - R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        resultado: 'venda',
        data_atividade: new Date().toISOString()
      }

      await supabase
        .from('closers_atividades')
        .insert([atividadeData])

      // Redirect to dashboard or sales list
      router.push('/closer?success=venda-registrada')
    } catch (error: any) {
      console.error('Error creating sale:', error)
      setError(error.message || 'Erro ao registrar venda')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !closer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const valorNum = parseFloat(valorVenda) || 0
  const comissaoCalculada = calculateComissao(valorNum)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Registrar Venda</h1>
              <p className="text-sm text-gray-500">Registre uma nova venda realizada</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/closer">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Dados da Venda</CardTitle>
                <CardDescription>
                  Preencha as informações da venda realizada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-600">{error}</span>
                    </div>
                  )}

                  {/* Tipo de Venda */}
                  <div>
                    <Label htmlFor="tipo_venda">Tipo de Venda</Label>
                    <select
                      id="tipo_venda"
                      value={tipoVenda}
                      onChange={(e) => setTipoVenda(e.target.value)}
                      required
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="mentoria">Mentoria</option>
                      <option value="curso">Curso</option>
                      <option value="consultoria">Consultoria</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  {/* Cliente - Lead ou Mentorado */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lead">Lead</Label>
                      <select
                        id="lead"
                        value={selectedLeadId}
                        onChange={(e) => {
                          setSelectedLeadId(e.target.value)
                          if (e.target.value) setSelectedMentoradoId('')
                        }}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione um lead</option>
                        {leads.map((lead) => (
                          <option key={lead.id} value={lead.id}>
                            {lead.nome} {lead.email ? `(${lead.email})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="mentorado">Ou Mentorado Existente</Label>
                      <select
                        id="mentorado"
                        value={selectedMentoradoId}
                        onChange={(e) => {
                          setSelectedMentoradoId(e.target.value)
                          if (e.target.value) setSelectedLeadId('')
                        }}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione um mentorado</option>
                        {mentorados.map((mentorado) => (
                          <option key={mentorado.id} value={mentorado.id}>
                            {mentorado.nome_completo} ({mentorado.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Valor e Data */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="valor_venda">Valor da Venda (R$)</Label>
                      <Input
                        id="valor_venda"
                        type="number"
                        placeholder="0,00"
                        value={valorVenda}
                        onChange={(e) => setValorVenda(e.target.value)}
                        required
                        min="0"
                        step="0.01"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="data_venda">Data da Venda</Label>
                      <Input
                        id="data_venda"
                        type="date"
                        value={dataVenda}
                        onChange={(e) => setDataVenda(e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Fonte do Lead */}
                  <div>
                    <Label htmlFor="fonte_lead">Fonte do Lead</Label>
                    <Input
                      id="fonte_lead"
                      placeholder="Ex: Instagram, WhatsApp, Indicação"
                      value={fonteLeadInput}
                      onChange={(e) => setFonteLeadInput(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {/* Observações */}
                  <div>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      placeholder="Informações adicionais sobre a venda..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button type="submit" disabled={loading} className="flex-1">
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {loading ? 'Registrando...' : 'Registrar Venda'}
                    </Button>
                    
                    <Button type="button" variant="outline" asChild>
                      <Link href="/closer">
                        Cancelar
                      </Link>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div className="space-y-6">
            {/* Commission Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo da Comissão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Valor da Venda:</span>
                    <span className="font-medium">
                      R$ {valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Percentual de Comissão:</span>
                    <span className="font-medium">{closer.comissao_percentual || 5}%</span>
                  </div>
                  
                  <hr />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Sua Comissão:</span>
                    <span className="text-lg font-bold text-green-600">
                      R$ {comissaoCalculada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dicas Importantes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 mt-0.5 text-blue-500" />
                    <span>Selecione o lead ou mentorado relacionado à venda</span>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 mt-0.5 text-green-500" />
                    <span>Informe o valor exato da venda para cálculo correto da comissão</span>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-0.5 text-purple-500" />
                    <span>A data deve corresponder ao fechamento da venda</span>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Tag className="h-4 w-4 mt-0.5 text-orange-500" />
                    <span>Adicione observações para facilitar o acompanhamento</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function VendasPage() {
  return (
    <CloserAuthProvider>
      <VendasPageContent />
    </CloserAuthProvider>
  )
}