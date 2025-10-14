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
  X
} from 'lucide-react'

interface DespesaMensal {
  id: string
  mentorado_id: string
  nome_completo: string
  agosto: number
  setembro: number
  outubro: number
  novembro: number
  dezembro: number
  janeiro: number
  fevereiro: number
  marco: number
  abril: number
  maio: number
  junho: number
  julho: number
  ano: number
  data_vencimento: string | null
  created_at: string
  updated_at: string
}

interface MentoradoComDespesas {
  id: string
  nome_completo: string
  email: string
  turma: string
  despesas: DespesaMensal | null
  totalPendente: number
  totalMeses: number
}

const MESES = [
  { key: 'agosto', nome_completo: 'Agosto', index: 8 },
  { key: 'setembro', nome_completo: 'Setembro', index: 9 },
  { key: 'outubro', nome_completo: 'Outubro', index: 10 },
  { key: 'novembro', nome_completo: 'Novembro', index: 11 },
  { key: 'dezembro', nome_completo: 'Dezembro', index: 12 },
  { key: 'janeiro', nome_completo: 'Janeiro', index: 1 },
  { key: 'fevereiro', nome_completo: 'Fevereiro', index: 2 },
  { key: 'marco', nome_completo: 'Março', index: 3 },
  { key: 'abril', nome_completo: 'Abril', index: 4 },
  { key: 'maio', nome_completo: 'Maio', index: 5 },
  { key: 'junho', nome_completo: 'Junho', index: 6 },
  { key: 'julho', nome_completo: 'Julho', index: 7 }
]

export default function PendenciasPage() {
  const [mentorados, setMentorados] = useState<MentoradoComDespesas[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mentoradosDisponiveis, setMentoradosDisponiveis] = useState<any[]>([])
  
  // Estados do formulário de nova pendência
  const [selectedMentorado, setSelectedMentorado] = useState('')
  const [selectedMes, setSelectedMes] = useState('')
  const [valorPendencia, setValorPendencia] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')

  useEffect(() => {
    loadPendenciasData()
    loadMentoradosDisponiveis()
  }, [])

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

  const loadPendenciasData = async () => {
    try {
      console.log('🔍 Carregando dados de pendências...')
      
      // Buscar mentorados
      const { data: mentoradosData, error: mentoradosError } = await supabase
        .from('mentorados')
        .select('*')
        .order('nome_completo')
      
      console.log('👥 Mentorados encontrados:', mentoradosData?.length, mentoradosError)

      // Buscar despesas mensais
      const { data: despesasData, error: despesasError } = await supabase
        .from('despesas_mensais')
        .select('*')
      
      console.log('💰 Despesas encontradas:', despesasData?.length, despesasError)
      console.log('📊 Dados das despesas:', despesasData)

      if (mentoradosData) {
        const mentoradosComDespesas: MentoradoComDespesas[] = mentoradosData.map(mentorado => {
          const despesas = despesasData?.find(d => d.nome === mentorado.nome_completo) || null
          
          let totalPendente = 0
          let totalMeses = 0
          
          console.log(`🔍 Processando ${mentorado.nome_completo}:`, { despesas })
          
          if (despesas) {
            MESES.forEach(mes => {
              const valor = despesas[mes.key as keyof DespesaMensal] as number
              if (valor && valor > 0) {
                console.log(`  💰 ${mes.nome_completo}: R$ ${valor}`)
                totalPendente += valor
                totalMeses++
              }
            })
          }

          const resultado = {
            id: mentorado.id,
            nome_completo: mentorado.nome_completo,
            email: mentorado.email,
            turma: mentorado.turma,
            despesas,
            totalPendente,
            totalMeses
          }
          
          console.log(`✅ Resultado ${mentorado.nome_completo}:`, { totalPendente, totalMeses })
          return resultado
        })

        console.log('🏁 Mentorados com despesas processados:', mentoradosComDespesas.filter(m => m.totalPendente > 0).length, 'com pendências')
        setMentorados(mentoradosComDespesas)
      }
    } catch (error) {
      console.error('Erro ao carregar pendências:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMentorados = mentorados.filter(mentorado =>
    // Mostrar apenas mentorados com pendências > 0
    mentorado.totalPendente > 0 &&
    (mentorado.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const getStatusBadge = (totalPendente: number, totalMeses: number) => {
    if (totalPendente === 0) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Sem pendências</Badge>
    } else if (totalMeses === 1) {
      return <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50">1 mês</Badge>
    } else if (totalMeses <= 3) {
      return <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">{totalMeses} meses</Badge>
    } else {
      return <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">{totalMeses} meses</Badge>
    }
  }

  const handleNovaPendencia = async () => {
    if (!selectedMentorado || !selectedMes || !valorPendencia || !dataVencimento) {
      alert('Preencha todos os campos')
      return
    }

    try {
      const mentoradoSelecionado = mentoradosDisponiveis.find(m => m.id === selectedMentorado)
      const valorNumerico = parseFloat(valorPendencia.replace(',', '.'))

      const { error } = await supabase
        .from('despesas_mensais')
        .upsert({
          nome: mentoradoSelecionado?.nome_completo,
          [selectedMes]: valorNumerico,
          data_vencimento: dataVencimento,
          ano: 2025
        }, {
          onConflict: 'nome,ano'
        })

      if (error) throw error

      // Recarregar dados
      await loadPendenciasData()

      // Limpar formulário
      setSelectedMentorado('')
      setSelectedMes('')
      setValorPendencia('')
      setDataVencimento('')
      setIsModalOpen(false)

    } catch (error) {
      console.error('Erro ao salvar pendência:', error)
      alert('Erro ao salvar pendência')
    }
  }

  const removerPendencia = async (nome_completo: string, mes: string) => {
    try {
      const { error } = await supabase
        .from('despesas_mensais')
        .update({ [mes]: 0 })
        .eq('nome', nome_completo)
        .eq('ano', 2025)

      if (error) throw error

      // Recarregar dados
      await loadPendenciasData()
    } catch (error) {
      console.error('Erro ao remover pendência:', error)
      alert('Erro ao remover pendência')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header 
        title="Pendências Financeiras" 
        subtitle={`${mentorados.filter(m => m.totalPendente > 0).length} com pendências • ${formatCurrency(getTotalGeral())} total pendente`} 
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
                  <p className="text-sm font-medium text-gray-600">Média por Pessoa</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(getTotalGeral() / Math.max(mentorados.length, 1))}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar por nome_completo ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Pendência
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Nova Pendência</DialogTitle>
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
                    <Label htmlFor="mes">Mês</Label>
                    <Select value={selectedMes} onValueChange={setSelectedMes}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {MESES.map((mes) => (
                          <SelectItem key={mes.key} value={mes.key}>
                            {mes.nome_completo}
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
                      value={valorPendencia}
                      onChange={(e) => setValorPendencia(e.target.value)}
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
                    <Button onClick={handleNovaPendencia}>
                      Salvar Pendência
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Lista de Pendências */}
        <div className="space-y-4">
          {filteredMentorados.map((mentorado) => (
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
                    {getStatusBadge(mentorado.totalPendente, mentorado.totalMeses)}
                  </div>
                </div>
              </CardHeader>
              
              {mentorado.despesas && mentorado.totalPendente > 0 && (
                <CardContent>
                  <div className="grid grid-cols-6 gap-4">
                    {MESES.map((mes) => {
                      const valor = mentorado.despesas?.[mes.key as keyof DespesaMensal] as number || 0
                      const dataVencimento = mentorado.despesas?.data_vencimento

                      // Calcular data específica para este mês
                      let dataFormatada = ''
                      if (dataVencimento) {
                        // Parsear corretamente evitando problemas de timezone
                        const baseDate = new Date(dataVencimento + 'T12:00:00') // Meio-dia para evitar timezone
                        const diaVencimento = baseDate.getDate()

                        // Criar data para o mês específico
                        const anoAtual = new Date().getFullYear()
                        const mesObj = MESES.find(m => m.key === mes.key)
                        const mesIndex = mesObj ? mesObj.index - 1 : 0 // -1 porque Date usa 0-11

                        // Criar data no meio-dia para evitar problemas de timezone
                        const dataEspecifica = new Date(anoAtual, mesIndex, diaVencimento, 12, 0, 0)

                        dataFormatada = dataEspecifica.toLocaleDateString('pt-BR')
                      }

                      return valor > 0 ? (
                        <div key={mes.key} className="relative text-center p-3 bg-red-50 rounded-lg border border-red-200 group">
                          <button
                            onClick={() => removerPendencia(mentorado.nome_completo, mes.key)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            title="Remover pendência"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <p className="text-xs font-medium text-red-800">{mes.nome_completo}</p>
                          <p className="text-sm font-bold text-red-600">{formatCurrency(valor)}</p>
                          {dataFormatada && (
                            <p className="text-xs text-red-600 mt-1">
                              📅 {dataFormatada}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div key={mes.key} className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">{mes.nome_completo}</p>
                          <p className="text-xs text-gray-400">-</p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
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