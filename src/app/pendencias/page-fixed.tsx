'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import {
  Search,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  User,
  TrendingUp,
  Download,
  Plus,
  X,
  Edit
} from 'lucide-react'

interface Divida {
  id: string
  mentorado_id: string
  mentorado_nome: string
  valor: number
  data_vencimento: string
  status: 'pendente' | 'pago' | 'atrasado'
  data_pagamento: string | null
  observacoes: string | null
}

interface MentoradoComDividas {
  id: string
  nome_completo: string
  email: string
  turma: string
  dividas: Divida[]
  totalPendente: number
  totalDividas: number
}

const MESES = [
  { numero: 1, nome: 'Janeiro', abrev: 'Jan' },
  { numero: 2, nome: 'Fevereiro', abrev: 'Fev' },
  { numero: 3, nome: 'Março', abrev: 'Mar' },
  { numero: 4, nome: 'Abril', abrev: 'Abr' },
  { numero: 5, nome: 'Maio', abrev: 'Mai' },
  { numero: 6, nome: 'Junho', abrev: 'Jun' },
  { numero: 7, nome: 'Julho', abrev: 'Jul' },
  { numero: 8, nome: 'Agosto', abrev: 'Ago' },
  { numero: 9, nome: 'Setembro', abrev: 'Set' },
  { numero: 10, nome: 'Outubro', abrev: 'Out' },
  { numero: 11, nome: 'Novembro', abrev: 'Nov' },
  { numero: 12, nome: 'Dezembro', abrev: 'Dez' }
]

export default function PendenciasPage() {
  const [mentorados, setMentorados] = useState<MentoradoComDividas[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mentoradosDisponiveis, setMentoradosDisponiveis] = useState<any[]>([])
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear())

  // Estados do formulário de nova dívida
  const [selectedMentorado, setSelectedMentorado] = useState('')
  const [valorDivida, setValorDivida] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')

  // Estados do modal de edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingDivida, setEditingDivida] = useState<Divida | null>(null)
  const [novoValor, setNovoValor] = useState('')
  const [novaDataVencimento, setNovaDataVencimento] = useState('')

  useEffect(() => {
    loadDividasData()
    loadMentoradosDisponiveis()
  }, [anoSelecionado])

  const loadMentoradosDisponiveis = async () => {
    try {
      const { data } = await supabase
        .from('mentorados')
        .select('id, nome_completo')
        .order('nome_completo')

      setMentoradosDisponiveis(data || [])
    } catch (error) {
      console.error('Erro ao carregar mentorados:', error)
    }
  }

  const loadDividasData = async () => {
    try {
      console.log('🔍 Carregando dados de dívidas...')

      // Buscar dívidas do ano selecionado
      const { data: dividasData, error: dividasError } = await supabase
        .from('dividas')
        .select('*')
        .gte('data_vencimento', `${anoSelecionado}-01-01`)
        .lte('data_vencimento', `${anoSelecionado}-12-31`)
        .order('mentorado_nome, data_vencimento')

      console.log('💰 Dívidas encontradas:', dividasData?.length, dividasError)

      // Buscar todos os mentorados
      const { data: mentoradosData, error: mentoradosError } = await supabase
        .from('mentorados')
        .select('*')
        .order('nome_completo')

      if (dividasData && mentoradosData) {
        // Agrupar dívidas por mentorado
        const mentoradosMap = new Map<string, MentoradoComDividas>()

        // Inicializar todos os mentorados
        mentoradosData.forEach(mentorado => {
          mentoradosMap.set(mentorado.id, {
            id: mentorado.id,
            nome_completo: mentorado.nome_completo,
            email: mentorado.email,
            turma: mentorado.turma,
            dividas: [],
            totalPendente: 0,
            totalDividas: 0
          })
        })

        // Adicionar dívidas aos mentorados
        dividasData.forEach(divida => {
          // Buscar mentorado por ID ou nome
          let mentorado = mentoradosMap.get(divida.mentorado_id)

          if (!mentorado) {
            // Buscar por nome se não encontrou por ID
            mentorado = Array.from(mentoradosMap.values()).find(m =>
              m.nome_completo === divida.mentorado_nome
            )
          }

          if (mentorado) {
            mentorado.dividas.push(divida)
            if (divida.status === 'pendente') {
              mentorado.totalPendente += divida.valor
            }
            mentorado.totalDividas++
          }
        })

        const mentoradosArray = Array.from(mentoradosMap.values())
        console.log('🏁 Mentorados processados:', mentoradosArray.length)
        setMentorados(mentoradosArray)
      }
    } catch (error) {
      console.error('Erro ao carregar dívidas:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMentorados = mentorados.filter(mentorado =>
    mentorado.totalPendente > 0 &&
    (searchTerm === '' ||
     mentorado.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
     mentorado.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getTotalGeral = () => {
    return mentorados.reduce((sum, m) => sum + m.totalPendente, 0)
  }

  const calcularDiasRestantes = (dataVencimento: string) => {
    const hoje = new Date()
    const vencimento = new Date(dataVencimento)
    const diffTime = vencimento.getTime() - hoje.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getCorDivida = (diasRestantes: number) => {
    if (diasRestantes <= -7) return 'bg-red-200 border-red-500' // 1 semana ou mais: VERMELHO
    if (diasRestantes < 0) return 'bg-orange-100 border-orange-400' // Atrasado: LARANJA
    if (diasRestantes === 0) return 'bg-orange-100 border-orange-400' // Hoje: LARANJA
    return 'bg-yellow-50 border-yellow-200' // Futuro: AMARELO
  }

  const getCorTexto = (diasRestantes: number) => {
    if (diasRestantes <= -7) return 'text-red-900' // VERMELHO ESCURO
    if (diasRestantes < 0) return 'text-orange-800' // LARANJA ESCURO
    if (diasRestantes === 0) return 'text-orange-800' // LARANJA ESCURO
    return 'text-yellow-800' // AMARELO ESCURO
  }

  const handleNovaDivida = async () => {
    if (!selectedMentorado || !valorDivida || !dataVencimento) {
      alert('Preencha todos os campos')
      return
    }

    try {
      const mentoradoSelecionado = mentoradosDisponiveis.find(m => m.id === selectedMentorado)
      const valorNumerico = parseFloat(valorDivida.replace(',', '.'))

      const { error } = await supabase
        .from('dividas')
        .insert({
          mentorado_id: selectedMentorado,
          mentorado_nome: mentoradoSelecionado?.nome_completo,
          valor: valorNumerico,
          data_vencimento: dataVencimento,
          status: 'pendente'
        })

      if (error) throw error

      await loadDividasData()

      // Limpar formulário
      setSelectedMentorado('')
      setValorDivida('')
      setDataVencimento('')
      setIsModalOpen(false)

    } catch (error) {
      console.error('Erro ao salvar dívida:', error)
      alert('Erro ao salvar dívida')
    }
  }

  const editarDivida = (divida: Divida) => {
    setEditingDivida(divida)
    setNovoValor(divida.valor.toString())
    setNovaDataVencimento(divida.data_vencimento)
    setIsEditModalOpen(true)
  }

  const handleEditarDivida = async () => {
    if (!editingDivida || !novoValor || !novaDataVencimento) {
      alert('Preencha todos os campos')
      return
    }

    try {
      const { error } = await supabase
        .from('dividas')
        .update({
          valor: parseFloat(novoValor.replace(',', '.')),
          data_vencimento: novaDataVencimento
        })
        .eq('id', editingDivida.id)

      if (error) throw error

      await loadDividasData()

      setEditingDivida(null)
      setNovoValor('')
      setNovaDataVencimento('')
      setIsEditModalOpen(false)

    } catch (error) {
      console.error('Erro ao editar dívida:', error)
      alert('Erro ao editar dívida')
    }
  }

  const removerDivida = async (dividaId: string) => {
    if (!confirm('Tem certeza que deseja remover esta dívida?')) return

    try {
      const { error } = await supabase
        .from('dividas')
        .delete()
        .eq('id', dividaId)

      if (error) throw error

      await loadDividasData()
    } catch (error) {
      console.error('Erro ao remover dívida:', error)
      alert('Erro ao remover dívida')
    }
  }

  const marcarComoPago = async (dividaId: string) => {
    try {
      const { error } = await supabase
        .from('dividas')
        .update({
          status: 'pago',
          data_pagamento: new Date().toISOString().split('T')[0]
        })
        .eq('id', dividaId)

      if (error) throw error

      await loadDividasData()
    } catch (error) {
      console.error('Erro ao marcar como pago:', error)
      alert('Erro ao marcar como pago')
    }
  }

  // Agrupar dívidas por mês para exibição
  const agruparDividasPorMes = (dividas: Divida[]) => {
    const grupos: { [mes: number]: Divida[] } = {}

    dividas.forEach(divida => {
      const mes = new Date(divida.data_vencimento).getMonth() + 1
      if (!grupos[mes]) grupos[mes] = []
      grupos[mes].push(divida)
    })

    return grupos
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title={
          <div className="flex items-center space-x-4">
            <span>Pendências Financeiras</span>
            <Select value={anoSelecionado.toString()} onValueChange={(value) => setAnoSelecionado(parseInt(value))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2023, 2024, 2025, 2026].map(ano => (
                  <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        subtitle={`${filteredMentorados.length} com pendências • ${formatCurrency(getTotalGeral())} total pendente`}
      />

      <main className="flex-1 p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Pendente</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(getTotalGeral())}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Com Pendências</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {mentorados.filter(m => m.totalPendente > 0).length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Em Dia</p>
                  <p className="text-2xl font-bold text-green-600">
                    {mentorados.filter(m => m.totalPendente === 0).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Dívidas</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {mentorados.reduce((sum, m) => sum + m.totalDividas, 0)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Busca e Ações */}
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-end space-x-2">
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Dívida
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Nova Dívida</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="mentorado">Mentorado</Label>
                    <Select value={selectedMentorado} onValueChange={setSelectedMentorado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um mentorado" />
                      </SelectTrigger>
                      <SelectContent>
                        {mentoradosDisponiveis.map((mentorado) => (
                          <SelectItem key={mentorado.id} value={mentorado.id}>
                            {mentorado.nome_completo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="valor">Valor</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={valorDivida}
                      onChange={(e) => setValorDivida(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dataVencimento">Data de Vencimento</Label>
                    <Input
                      id="dataVencimento"
                      type="date"
                      value={dataVencimento}
                      onChange={(e) => setDataVencimento(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleNovaDivida}>
                      Salvar Dívida
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Modal de Edição */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Dívida</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Editando dívida de: <strong>{editingDivida?.mentorado_nome}</strong>
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="novoValor">Valor</Label>
                    <Input
                      id="novoValor"
                      type="number"
                      step="0.01"
                      value={novoValor}
                      onChange={(e) => setNovoValor(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="novaDataVencimento">Data de Vencimento</Label>
                    <Input
                      id="novaDataVencimento"
                      type="date"
                      value={novaDataVencimento}
                      onChange={(e) => setNovaDataVencimento(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleEditarDivida}>
                      Atualizar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Lista de Pendências */}
        <div className="space-y-4">
          {filteredMentorados.map((mentorado) => {
            const dividasPendentes = mentorado.dividas.filter(d => d.status === 'pendente')
            const gruposPorMes = agruparDividasPorMes(dividasPendentes)

            return (
              <Card key={mentorado.id} className="rounded-2xl shadow-sm border border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {mentorado.nome_completo}
                        </CardTitle>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{mentorado.turma}</span>
                          <span>•</span>
                          <span>{mentorado.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">
                        {formatCurrency(mentorado.totalPendente)}
                      </div>
                      <Badge variant={mentorado.totalPendente > 0 ? "destructive" : "secondary"}>
                        {mentorado.totalDividas} dívida(s)
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                {dividasPendentes.length > 0 && (
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                      {MESES.map((mes) => {
                        const dividasDoMes = gruposPorMes[mes.numero] || []

                        if (dividasDoMes.length === 0) {
                          return (
                            <div key={mes.numero} className="text-center p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500">
                                <span className="hidden xl:inline">{mes.nome}</span>
                                <span className="xl:hidden">{mes.abrev}</span>
                              </p>
                              <p className="text-xs text-gray-400">-</p>
                            </div>
                          )
                        }

                        // Se há dívidas, mostrar a primeira (ou somar se houver múltiplas)
                        const valorTotal = dividasDoMes.reduce((sum, d) => sum + d.valor, 0)
                        const primeiraData = dividasDoMes[0].data_vencimento
                        const diasRestantes = calcularDiasRestantes(primeiraData)

                        return (
                          <div key={mes.numero} className={`relative text-center p-3 rounded-lg border group ${getCorDivida(diasRestantes)}`}>
                            {/* Indicador visual */}
                            {(diasRestantes <= 0 || diasRestantes <= 3) && (
                              <div className={`absolute -top-1 -left-1 w-3 h-3 rounded-full ${
                                diasRestantes <= -7 ? 'bg-red-600' :
                                diasRestantes < 0 ? 'bg-orange-500' :
                                diasRestantes === 0 ? 'bg-orange-500' :
                                'bg-yellow-500'
                              } animate-pulse`}></div>
                            )}

                            {/* Ações */}
                            <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                              <button
                                onClick={() => editarDivida(dividasDoMes[0])}
                                className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600"
                                title="Editar dívida"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => marcarComoPago(dividasDoMes[0].id)}
                                className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600"
                                title="Marcar como pago"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => removerDivida(dividasDoMes[0].id)}
                                className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                                title="Remover dívida"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>

                            <p className={`text-xs font-medium ${getCorTexto(diasRestantes)}`}>
                              <span className="hidden xl:inline">{mes.nome}</span>
                              <span className="xl:hidden">{mes.abrev}</span>
                              {dividasDoMes.length > 1 && <span> ({dividasDoMes.length})</span>}
                            </p>

                            <p className={`text-sm font-bold ${getCorTexto(diasRestantes)}`}>
                              {formatCurrency(valorTotal)}
                            </p>

                            <p className={`text-xs mt-1 ${getCorTexto(diasRestantes)}`}>
                              📅 {new Date(primeiraData).toLocaleDateString('pt-BR')}
                            </p>

                            {(diasRestantes <= 3) && (
                              <p className={`text-xs font-semibold ${getCorTexto(diasRestantes)}`}>
                                {diasRestantes === 0 ? 'HOJE!' :
                                 diasRestantes < 0 ? `${Math.abs(diasRestantes)}d atraso` :
                                 diasRestantes === 1 ? 'Amanhã' :
                                 `${diasRestantes} dias`
                                }
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>

        {filteredMentorados.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Nenhum mentorado encontrado' : 'Nenhuma pendência cadastrada'}
            </h3>
            <p className="text-sm text-gray-500">
              {searchTerm ? 'Tente buscar por outro termo.' : 'As pendências financeiras aparecerão aqui quando forem cadastradas.'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}