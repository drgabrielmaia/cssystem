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
  Bell,
  Clock,
  ChevronLeft,
  ChevronRight
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
  const [showNotifications, setShowNotifications] = useState(false)

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
    mentorado.totalPendente > 0 &&
    (searchTerm === '' ||
     mentorado.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
     mentorado.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getVencimentosProximos = () => {
    const hoje = new Date()
    const proximosDias = new Date()
    proximosDias.setDate(hoje.getDate() + 3)

    const vencimentos: Array<{nome: string, valor: number, mes: string, data: Date, diasRestantes: number}> = []

    mentorados.forEach(mentorado => {
      if (mentorado.despesas?.data_vencimento) {
        const dataVencimento = new Date(mentorado.despesas.data_vencimento + 'T12:00:00')
        const diaVencimento = dataVencimento.getDate()

        MESES.forEach(mes => {
          const valor = mentorado.despesas?.[mes.key as keyof DespesaMensal] as number || 0
          if (valor > 0) {
            const dataEspecifica = new Date(hoje.getFullYear(), mes.index - 1, diaVencimento)

            const diffTime = dataEspecifica.getTime() - hoje.getTime()
            const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            if (diasRestantes >= -1 && diasRestantes <= 3) {
              vencimentos.push({
                nome: mentorado.nome_completo,
                valor,
                mes: mes.nome_completo,
                data: dataEspecifica,
                diasRestantes
              })
            }
          }
        })
      }
    })

    return vencimentos.sort((a, b) => a.diasRestantes - b.diasRestantes)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getTotalGeral = () => {
    return mentorados.reduce((sum, m) => sum + m.totalPendente, 0)
  }

  const getPrevisibilidadeRecebimento = () => {
    const hoje = new Date()
    const inicioSemana = new Date(hoje)
    inicioSemana.setDate(hoje.getDate() - hoje.getDay())
    const fimSemana = new Date(inicioSemana)
    fimSemana.setDate(inicioSemana.getDate() + 6)

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)

    let recebimentoHoje = 0
    let recebimentoSemana = 0
    let recebimentoMes = 0

    mentorados.forEach(mentorado => {
      if (mentorado.despesas?.data_vencimento) {
        const dataVencimento = new Date(mentorado.despesas.data_vencimento + 'T12:00:00')
        const diaVencimento = dataVencimento.getDate()

        MESES.forEach(mes => {
          const valor = mentorado.despesas?.[mes.key as keyof DespesaMensal] as number || 0
          if (valor > 0) {
            const dataEspecifica = new Date(hoje.getFullYear(), mes.index - 1, diaVencimento)

            if (dataEspecifica.toDateString() === hoje.toDateString()) {
              recebimentoHoje += valor
            }
            if (dataEspecifica >= inicioSemana && dataEspecifica <= fimSemana) {
              recebimentoSemana += valor
            }
            if (dataEspecifica >= inicioMes && dataEspecifica <= fimMes) {
              recebimentoMes += valor
            }
          }
        })
      }
    })

    return { recebimentoHoje, recebimentoSemana, recebimentoMes }
  }

  const getVencimentosHoje = () => {
    const hoje = new Date()
    const vencimentosHoje: Array<{nome: string, valor: number, mes: string}> = []

    mentorados.forEach(mentorado => {
      if (mentorado.despesas?.data_vencimento) {
        const dataVencimento = new Date(mentorado.despesas.data_vencimento + 'T12:00:00')
        const diaVencimento = dataVencimento.getDate()

        MESES.forEach(mes => {
          const valor = mentorado.despesas?.[mes.key as keyof DespesaMensal] as number || 0
          if (valor > 0) {
            const dataEspecifica = new Date(hoje.getFullYear(), mes.index - 1, diaVencimento)

            if (dataEspecifica.toDateString() === hoje.toDateString()) {
              vencimentosHoje.push({
                nome: mentorado.nome_completo,
                valor,
                mes: mes.nome_completo
              })
            }
          }
        })
      }
    })

    return vencimentosHoje
  }

  const getDiasDaSemana = () => {
    const hoje = new Date()
    const diasSemana = []
    const inicioSemana = new Date(hoje)
    inicioSemana.setDate(hoje.getDate() - hoje.getDay())

    for (let i = 0; i < 7; i++) {
      const dia = new Date(inicioSemana)
      dia.setDate(inicioSemana.getDate() + i)

      let valorDia = 0
      mentorados.forEach(mentorado => {
        if (mentorado.despesas?.data_vencimento) {
          const dataVencimento = new Date(mentorado.despesas.data_vencimento + 'T12:00:00')
          const diaVencimento = dataVencimento.getDate()

          MESES.forEach(mes => {
            const valor = mentorado.despesas?.[mes.key as keyof DespesaMensal] as number || 0
            if (valor > 0) {
              const dataEspecifica = new Date(hoje.getFullYear(), mes.index - 1, diaVencimento)

              if (dataEspecifica.toDateString() === dia.toDateString()) {
                valorDia += valor
              }
            }
          })
        }
      })

      diasSemana.push({
        data: dia,
        valor: valorDia,
        isHoje: dia.toDateString() === hoje.toDateString()
      })
    }

    return diasSemana
  }

  const vencimentosHoje = getVencimentosHoje()
  const { recebimentoHoje, recebimentoSemana, recebimentoMes } = getPrevisibilidadeRecebimento()
  const diasDaSemana = getDiasDaSemana()
  const vencimentosProximos = getVencimentosProximos()
  const notificacoesCount = vencimentosHoje.length + vencimentosProximos.filter(v => v.diasRestantes > 0).length

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
        subtitle={
          filteredMentorados.length === mentorados.filter(m => m.totalPendente > 0).length
            ? `${mentorados.filter(m => m.totalPendente > 0).length} com pendências • ${formatCurrency(getTotalGeral())} total pendente`
            : `${filteredMentorados.length} de ${mentorados.filter(m => m.totalPendente > 0).length} com pendências (filtrados) • ${formatCurrency(filteredMentorados.reduce((sum, m) => sum + m.totalPendente, 0))} filtrado`
        }
      />
      
      <main className="flex-1 p-6 space-y-6">
        {/* Previsibilidade de Recebimento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Recebimento Hoje</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(recebimentoHoje)}
                  </p>
                  {vencimentosHoje.length > 0 && (
                    <div className="mt-2 flex items-center text-xs text-green-600">
                      <Bell className="h-3 w-3 mr-1" />
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full">
                        {vencimentosHoje.length}
                      </span>
                    </div>
                  )}
                </div>
                <Calendar className="h-8 w-8 text-green-500" />
              </div>
              {vencimentosHoje.length > 0 && (
                <div className="mt-3 space-y-1">
                  {vencimentosHoje.slice(0, 2).map((venc, index) => (
                    <div key={index} className="text-xs text-green-700 flex justify-between">
                      <span className="truncate">{venc.nome}</span>
                      <span>{formatCurrency(venc.valor)}</span>
                    </div>
                  ))}
                  {vencimentosHoje.length > 2 && (
                    <div className="text-xs text-green-600">+{vencimentosHoje.length - 2} mais</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Recebimento Semana</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(recebimentoSemana)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Recebimento Mês</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(recebimentoMes)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visualização da Semana */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Agenda da Semana</span>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {diasDaSemana.map((dia, index) => (
                <div
                  key={index}
                  className={`text-center p-3 rounded-lg border transition-all ${
                    dia.isHoje
                      ? 'bg-blue-100 border-blue-300 shadow-md'
                      : dia.valor > 0
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className={`text-xs font-medium ${
                    dia.isHoje ? 'text-blue-700' : 'text-gray-600'
                  }`}>
                    {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'][index]}
                  </div>
                  <div className={`text-lg font-bold ${
                    dia.isHoje ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {dia.data.getDate()}
                  </div>
                  {dia.valor > 0 && (
                    <div className="text-xs font-semibold text-green-600 mt-1">
                      {formatCurrency(dia.valor)}
                    </div>
                  )}
                  {dia.isHoje && (
                    <div className="mt-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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

        {/* Notificações de Vencimentos */}
        {(vencimentosHoje.length > 0 || vencimentosProximos.length > 0) && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Bell className="h-5 w-5 text-orange-600" />
                    {notificacoesCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {notificacoesCount}
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-orange-800">Notificações de Vencimento</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="text-orange-600 hover:text-orange-700"
                >
                  {showNotifications ? 'Ocultar' : 'Ver Todas'}
                </Button>
              </div>
            </CardHeader>
            {showNotifications && (
              <CardContent>
                <div className="space-y-3">
                  {vencimentosHoje.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-red-700 mb-2 flex items-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                        Vencimentos Hoje ({vencimentosHoje.length})
                      </h4>
                      <div className="space-y-2">
                        {vencimentosHoje.map((venc, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-red-100 rounded-lg">
                            <div>
                              <span className="font-medium text-red-800">{venc.nome}</span>
                              <span className="text-sm text-red-600 ml-2">({venc.mes})</span>
                            </div>
                            <span className="font-bold text-red-700">{formatCurrency(venc.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {vencimentosProximos.filter(v => v.diasRestantes > 0).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-orange-700 mb-2 flex items-center">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                        Próximos Vencimentos
                      </h4>
                      <div className="space-y-2">
                        {vencimentosProximos.filter(v => v.diasRestantes > 0).map((venc, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-orange-100 rounded-lg">
                            <div>
                              <span className="font-medium text-orange-800">{venc.nome}</span>
                              <span className="text-sm text-orange-600 ml-2">({venc.mes})</span>
                              <span className="text-xs text-orange-500 ml-2">
                                {venc.diasRestantes === 1 ? 'amanhã' : `em ${venc.diasRestantes} dias`}
                              </span>
                            </div>
                            <span className="font-bold text-orange-700">{formatCurrency(venc.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {vencimentosProximos.filter(v => v.diasRestantes < 0).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-red-700 mb-2 flex items-center">
                        <div className="w-2 h-2 bg-red-600 rounded-full mr-2"></div>
                        Vencimentos em Atraso
                      </h4>
                      <div className="space-y-2">
                        {vencimentosProximos.filter(v => v.diasRestantes < 0).map((venc, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-red-200 rounded-lg">
                            <div>
                              <span className="font-medium text-red-900">{venc.nome}</span>
                              <span className="text-sm text-red-700 ml-2">({venc.mes})</span>
                              <span className="text-xs text-red-600 ml-2">
                                {Math.abs(venc.diasRestantes)} dia(s) em atraso
                              </span>
                            </div>
                            <span className="font-bold text-red-800">{formatCurrency(venc.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Busca */}
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

        {/* Ações */}
        <div className="flex items-center justify-end space-x-2">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className={notificacoesCount > 0 ? 'text-red-600 border-red-300' : ''}
            >
              <Bell className="h-4 w-4 mr-2" />
              Notificações
              {notificacoesCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notificacoesCount}
                </div>
              )}
            </Button>
          </div>
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
                    <div className="flex items-center justify-end space-x-2 mb-2">
                      {/* Indicador de notificações para este mentorado */}
                      {(() => {
                        const temVencimentoHoje = vencimentosHoje.some(v => v.nome === mentorado.nome_completo)
                        const temVencimentoProximo = vencimentosProximos.some(v => v.nome === mentorado.nome_completo && v.diasRestantes > 0)
                        const temAtraso = vencimentosProximos.some(v => v.nome === mentorado.nome_completo && v.diasRestantes < 0)

                        if (temVencimentoHoje) {
                          return (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                              <span className="text-xs font-semibold text-red-600">HOJE</span>
                            </div>
                          )
                        } else if (temAtraso) {
                          return (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                              <span className="text-xs font-semibold text-red-700">ATRASO</span>
                            </div>
                          )
                        } else if (temVencimentoProximo) {
                          return (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                              <span className="text-xs font-semibold text-orange-600">PRÓXIMO</span>
                            </div>
                          )
                        }
                        return null
                      })()}
                    </div>
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

                      // Verificar se é vencimento próximo
                      const hoje = new Date()
                      const mesObj = MESES.find(m => m.key === mes.key)
                      let isVencimentoProximo = false
                      let diasRestantes = 0

                      if (dataVencimento && mesObj) {
                        const baseDate = new Date(dataVencimento + 'T12:00:00')
                        const diaVencimento = baseDate.getDate()
                        const dataEspecifica = new Date(hoje.getFullYear(), mesObj.index - 1, diaVencimento)

                        const diffTime = dataEspecifica.getTime() - hoje.getTime()
                        diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                        isVencimentoProximo = diasRestantes >= -1 && diasRestantes <= 3
                      }

                      return valor > 0 ? (
                        <div key={mes.key} className={`relative text-center p-3 rounded-lg border group ${
                          diasRestantes === 0 ? 'bg-red-100 border-red-300' :
                          diasRestantes < 0 ? 'bg-red-200 border-red-400' :
                          isVencimentoProximo ? 'bg-orange-50 border-orange-200' :
                          'bg-red-50 border-red-200'
                        }`}>
                          {/* Indicador visual para vencimentos */}
                          {isVencimentoProximo && (
                            <div className={`absolute -top-1 -left-1 w-3 h-3 rounded-full ${
                              diasRestantes === 0 ? 'bg-red-500' :
                              diasRestantes < 0 ? 'bg-red-600' :
                              'bg-orange-500'
                            } animate-pulse`}></div>
                          )}

                          <button
                            onClick={() => removerPendencia(mentorado.nome_completo, mes.key)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            title="Remover pendência"
                          >
                            <X className="w-3 h-3" />
                          </button>

                          <p className={`text-xs font-medium ${
                            diasRestantes === 0 ? 'text-red-900' :
                            diasRestantes < 0 ? 'text-red-900' :
                            isVencimentoProximo ? 'text-orange-800' :
                            'text-red-800'
                          }`}>{mes.nome_completo}</p>

                          <p className={`text-sm font-bold ${
                            diasRestantes === 0 ? 'text-red-700' :
                            diasRestantes < 0 ? 'text-red-800' :
                            isVencimentoProximo ? 'text-orange-600' :
                            'text-red-600'
                          }`}>{formatCurrency(valor)}</p>

                          {dataFormatada && (
                            <div>
                              <p className={`text-xs mt-1 ${
                                diasRestantes === 0 ? 'text-red-700' :
                                diasRestantes < 0 ? 'text-red-800' :
                                isVencimentoProximo ? 'text-orange-600' :
                                'text-red-600'
                              }`}>
                                📅 {dataFormatada}
                              </p>
                              {isVencimentoProximo && (
                                <p className={`text-xs font-semibold ${
                                  diasRestantes === 0 ? 'text-red-700' :
                                  diasRestantes < 0 ? 'text-red-800' :
                                  'text-orange-600'
                                }`}>
                                  {diasRestantes === 0 ? 'HOJE!' :
                                   diasRestantes < 0 ? `${Math.abs(diasRestantes)}d atraso` :
                                   diasRestantes === 1 ? 'Amanhã' :
                                   `${diasRestantes} dias`
                                  }
                                </p>
                              )}
                            </div>
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