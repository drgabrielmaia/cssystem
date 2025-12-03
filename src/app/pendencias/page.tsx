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
  Edit,
  Bell,
  Clock,
  ChevronLeft,
  ChevronRight
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

  // Estados do modal de pagamento
  const [isModalPagamentoOpen, setIsModalPagamentoOpen] = useState(false)
  const [dividaSelecionada, setDividaSelecionada] = useState<Divida | null>(null)
  const [valorPago, setValorPago] = useState('')
  const [observacoesPagamento, setObservacoesPagamento] = useState('')

  // Estados do modal de edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingDivida, setEditingDivida] = useState<Divida | null>(null)
  const [novoValor, setNovoValor] = useState('')
  const [novaDataVencimento, setNovaDataVencimento] = useState('')

  // Estados da agenda semanal
  const [weekOffset, setWeekOffset] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)

  // Estado para comissões
  const [comissoesPendentes, setComissoesPendentes] = useState<any[]>([])

  // Estado do filtro de turma
  const [turmaSelecionada, setTurmaSelecionada] = useState('todas')

  // Estado para controlar filtro de atraso
  const [mostrandoApenaAtrasados, setMostrandoApenaAtrasados] = useState(false)

  useEffect(() => {
    loadDividasData()
    loadMentoradosDisponiveis()
    loadComissoesPendentes()
  }, [anoSelecionado])

  const loadComissoesPendentes = async () => {
    try {
      const { data, error } = await supabase
        .from('comissoes')
        .select(`
          *,
          leads!inner(
            nome_completo,
            telefone
          ),
          mentorados!inner(
            nome_completo,
            email,
            turma
          )
        `)
        .eq('status_pagamento', 'pendente')
        .order('created_at', { ascending: false })

      if (error) throw error
      setComissoesPendentes(data || [])
    } catch (error) {
      console.error('Erro ao carregar comissões pendentes:', error)
    }
  }

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

  const filteredMentorados = mentorados.filter(mentorado => {
    // Deve ter pendências
    if (mentorado.totalPendente <= 0) return false

    // Filtro de busca por nome/email
    if (searchTerm !== '' &&
        !mentorado.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !mentorado.email.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }

    // Filtro por turma
    if (turmaSelecionada !== 'todas' && mentorado.turma !== turmaSelecionada) {
      return false
    }

    // Filtro de atraso
    if (mostrandoApenaAtrasados) {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      const temAtraso = mentorado.dividas.some(divida => {
        if (divida.status === 'pendente') {
          const dataVencimento = new Date(divida.data_vencimento + 'T12:00:00')
          dataVencimento.setHours(0, 0, 0, 0)
          return dataVencimento < hoje
        }
        return false
      })

      return temAtraso
    }

    return true
  })

  // Obter lista única de turmas
  const getTurmasDisponiveis = () => {
    const turmas = new Set(mentorados.map(m => m.turma).filter(Boolean))
    return Array.from(turmas).sort()
  }

  const turmasDisponiveis = getTurmasDisponiveis()

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
    hoje.setHours(0, 0, 0, 0) // Zerar horário para comparação apenas por data

    // Criar data de vencimento no timezone local (meio-dia para evitar problemas)
    const vencimento = new Date(dataVencimento + 'T12:00:00')
    vencimento.setHours(0, 0, 0, 0) // Zerar horário para comparação

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

  const abrirModalPagamento = (divida: Divida) => {
    setDividaSelecionada(divida)
    setValorPago(divida.valor.toString())
    setObservacoesPagamento('')
    setIsModalPagamentoOpen(true)
  }

  const confirmarPagamento = async () => {
    if (!dividaSelecionada) return

    try {
      const valorPagoNum = parseFloat(valorPago)
      if (isNaN(valorPagoNum) || valorPagoNum <= 0) {
        alert('Digite um valor válido para o pagamento')
        return
      }

      // 1. Primeiro, buscar os dados da dívida
      const { data: divida, error: dividaError } = await supabase
        .from('dividas')
        .select('*')
        .eq('id', dividaSelecionada.id)
        .single()

      if (dividaError) throw dividaError

      // 2. Buscar o lead relacionado pelo nome do mentorado
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('nome_completo', divida.mentorado_nome)
        .single()

      if (leadError && leadError.code !== 'PGRST116') {
        console.error('Erro ao buscar lead:', leadError)
      }

      // 3. Atualizar status da dívida
      const { error: updateDividaError } = await supabase
        .from('dividas')
        .update({
          status: 'pago',
          data_pagamento: new Date().toISOString().split('T')[0]
        })
        .eq('id', dividaSelecionada.id)

      if (updateDividaError) throw updateDividaError

      // 3.5. Registrar no histórico de pagamentos
      const { error: historicoError } = await supabase
        .from('historico_pagamentos')
        .insert({
          divida_id: dividaSelecionada.id,
          mentorado_nome: divida.mentorado_nome,
          valor_pago: valorPagoNum,
          data_pagamento: new Date().toISOString().split('T')[0],
          observacoes: observacoesPagamento || null,
          lead_id: lead?.id || null
        })

      if (historicoError) {
        console.error('Erro ao registrar histórico:', historicoError)
      }

      // 4. Se encontrou o lead, atualizar o valor arrecadado
      if (lead) {
        const novoValorArrecadado = (lead.valor_arrecadado || 0) + valorPagoNum

        const { error: updateLeadError } = await supabase
          .from('leads')
          .update({
            valor_arrecadado: novoValorArrecadado
          })
          .eq('id', lead.id)

        if (updateLeadError) {
          console.error('Erro ao atualizar valor arrecadado do lead:', updateLeadError)
        } else {
          console.log(`✅ Valor R$ ${valorPagoNum} adicionado ao lead ${lead.nome_completo}. Total arrecadado: R$ ${novoValorArrecadado}`)
        }

        // 5. Registrar na tabela lead_vendas se necessário
        if (lead.valor_vendido && novoValorArrecadado > 0) {
          const { data: vendaExistente } = await supabase
            .from('lead_vendas')
            .select('id, valor_arrecadado')
            .eq('lead_id', lead.id)
            .single()

          if (vendaExistente) {
            await supabase
              .from('lead_vendas')
              .update({
                valor_arrecadado: novoValorArrecadado,
                data_arrecadacao: new Date().toISOString().split('T')[0],
                status_pagamento: novoValorArrecadado >= lead.valor_vendido ? 'pago' : 'parcial'
              })
              .eq('id', vendaExistente.id)
          }
        }
      }

      await loadDividasData()
      setIsModalPagamentoOpen(false)
      setDividaSelecionada(null)
      setValorPago('')
      setObservacoesPagamento('')

      // Mensagem de sucesso
      if (lead) {
        alert(`✅ Pagamento de R$ ${valorPagoNum.toFixed(2)} registrado com sucesso!\nValor adicionado ao lead: ${lead.nome_completo}`)
      } else {
        alert(`✅ Dívida marcada como paga!\n⚠️ Lead não encontrado para somar no valor arrecadado.`)
      }

    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error)
      alert('Erro ao confirmar pagamento: ' + (error as Error).message)
    }
  }

  const marcarComoPago = async (dividaId: string) => {
    try {
      // 1. Primeiro, buscar os dados da dívida
      const { data: divida, error: dividaError } = await supabase
        .from('dividas')
        .select('*')
        .eq('id', dividaId)
        .single()

      if (dividaError) throw dividaError

      if (!divida) {
        alert('Dívida não encontrada')
        return
      }

      // 2. Buscar o lead relacionado ao mentorado (pelo nome ou email)
      // Primeiro tentativa: buscar por nome exato
      let { data: lead } = await supabase
        .from('leads')
        .select('id, nome_completo, email, valor_arrecadado, valor_vendido')
        .eq('nome_completo', divida.mentorado_nome)
        .single()

      // Se não encontrou por nome, tentar buscar por similaridade ou email
      if (!lead) {
        const { data: leadsDisponiveis } = await supabase
          .from('leads')
          .select('id, nome_completo, email, valor_arrecadado, valor_vendido')
          .ilike('nome_completo', `%${divida.mentorado_nome.split(' ')[0]}%`)

        if (leadsDisponiveis && leadsDisponiveis.length > 0) {
          lead = leadsDisponiveis[0] // Pega o primeiro match
        }
      }

      // 3. Marcar a dívida como paga
      const { error: updateDividaError } = await supabase
        .from('dividas')
        .update({
          status: 'pago',
          data_pagamento: new Date().toISOString().split('T')[0]
        })
        .eq('id', dividaId)

      if (updateDividaError) throw updateDividaError

      // 4. Se encontrou o lead, atualizar o valor arrecadado
      if (lead) {
        const novoValorArrecadado = (lead.valor_arrecadado || 0) + divida.valor

        const { error: updateLeadError } = await supabase
          .from('leads')
          .update({
            valor_arrecadado: novoValorArrecadado
          })
          .eq('id', lead.id)

        if (updateLeadError) {
          console.error('Erro ao atualizar valor arrecadado do lead:', updateLeadError)
          // Não bloqueia o processo, só loga o erro
        } else {
          console.log(`✅ Valor R$ ${divida.valor} adicionado ao lead ${lead.nome_completo}. Total arrecadado: R$ ${novoValorArrecadado}`)
        }

        // 5. Registrar na tabela lead_vendas se necessário
        if (lead.valor_vendido && novoValorArrecadado > 0) {
          // Verificar se já existe registro na tabela lead_vendas
          const { data: vendaExistente } = await supabase
            .from('lead_vendas')
            .select('id, valor_arrecadado')
            .eq('lead_id', lead.id)
            .single()

          if (vendaExistente) {
            // Atualizar o registro existente
            await supabase
              .from('lead_vendas')
              .update({
                valor_arrecadado: novoValorArrecadado,
                data_arrecadacao: new Date().toISOString().split('T')[0],
                status_pagamento: novoValorArrecadado >= lead.valor_vendido ? 'pago' : 'parcial'
              })
              .eq('id', vendaExistente.id)
          }
        }
      } else {
        console.warn(`⚠️ Lead não encontrado para o mentorado: ${divida.mentorado_nome}`)
      }

      await loadDividasData()

      // Mensagem de sucesso
      if (lead) {
        alert(`✅ Pagamento de R$ ${divida.valor.toFixed(2)} registrado com sucesso!\nValor adicionado ao lead: ${lead.nome_completo}`)
      } else {
        alert(`✅ Dívida marcada como paga!\n⚠️ Lead não encontrado para somar no valor arrecadado.`)
      }

    } catch (error) {
      console.error('Erro ao marcar como pago:', error)
      alert('Erro ao marcar como pago: ' + (error as Error).message)
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

  // Funções para previsibilidade de recebimento
  const getPrevisibilidadeRecebimento = () => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

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
      mentorado.dividas.forEach(divida => {
        if (divida.status === 'pendente') {
          // Criar data no timezone local
          const dataVencimento = new Date(divida.data_vencimento + 'T12:00:00')
          dataVencimento.setHours(0, 0, 0, 0)

          if (dataVencimento.toDateString() === hoje.toDateString()) {
            recebimentoHoje += divida.valor
          }
          if (dataVencimento >= inicioSemana && dataVencimento <= fimSemana) {
            recebimentoSemana += divida.valor
          }
          if (dataVencimento >= inicioMes && dataVencimento <= fimMes) {
            recebimentoMes += divida.valor
          }
        }
      })
    })

    return { recebimentoHoje, recebimentoSemana, recebimentoMes }
  }

  const getVencimentosHoje = () => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const vencimentosHoje: Array<{nome: string, valor: number, data: string}> = []

    mentorados.forEach(mentorado => {
      mentorado.dividas.forEach(divida => {
        if (divida.status === 'pendente') {
          // Criar data no timezone local
          const dataVencimento = new Date(divida.data_vencimento + 'T12:00:00')
          dataVencimento.setHours(0, 0, 0, 0)

          if (dataVencimento.toDateString() === hoje.toDateString()) {
            vencimentosHoje.push({
              nome: mentorado.nome_completo,
              valor: divida.valor,
              data: divida.data_vencimento
            })
          }
        }
      })
    })

    return vencimentosHoje
  }

  const getVencimentosProximos = () => {
    const hoje = new Date()
    const vencimentos: Array<{nome: string, valor: number, data: string, diasRestantes: number}> = []

    mentorados.forEach(mentorado => {
      mentorado.dividas.forEach(divida => {
        if (divida.status === 'pendente') {
          const diasRestantes = calcularDiasRestantes(divida.data_vencimento)
          if (diasRestantes >= -1 && diasRestantes <= 3) {
            vencimentos.push({
              nome: mentorado.nome_completo,
              valor: divida.valor,
              data: divida.data_vencimento,
              diasRestantes
            })
          }
        }
      })
    })

    return vencimentos.sort((a, b) => a.diasRestantes - b.diasRestantes)
  }

  const getDiasDaSemana = () => {
    const hoje = new Date()
    const diasSemana = []
    const inicioSemana = new Date(hoje)
    inicioSemana.setDate(hoje.getDate() - hoje.getDay() + (weekOffset * 7))

    for (let i = 0; i < 7; i++) {
      const dia = new Date(inicioSemana)
      dia.setDate(inicioSemana.getDate() + i)

      let valorDia = 0
      mentorados.forEach(mentorado => {
        mentorado.dividas.forEach(divida => {
          if (divida.status === 'pendente') {
            // Criar data no timezone local
            const dataVencimento = new Date(divida.data_vencimento + 'T12:00:00')
            dataVencimento.setHours(0, 0, 0, 0)

            if (dataVencimento.toDateString() === dia.toDateString()) {
              valorDia += divida.valor
            }
          }
        })
      })

      diasSemana.push({
        data: dia,
        valor: valorDia,
        isHoje: dia.toDateString() === hoje.toDateString()
      })
    }

    return diasSemana
  }

  const handlePreviousWeek = () => {
    setWeekOffset(weekOffset - 1)
  }

  const handleNextWeek = () => {
    setWeekOffset(weekOffset + 1)
  }

  const handleCurrentWeek = () => {
    setWeekOffset(0)
  }

  const getWeekRangeText = () => {
    const dias = getDiasDaSemana()
    if (dias.length > 0) {
      const inicio = dias[0].data
      const fim = dias[dias.length - 1].data
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

      if (inicio.getMonth() === fim.getMonth()) {
        return `${inicio.getDate()} - ${fim.getDate()} de ${meses[inicio.getMonth()]}`
      } else {
        return `${inicio.getDate()} ${meses[inicio.getMonth()]} - ${fim.getDate()} ${meses[fim.getMonth()]}`
      }
    }
    return ''
  }

  // Calcular valores para exibição
  const vencimentosHoje = getVencimentosHoje()
  const { recebimentoHoje, recebimentoSemana, recebimentoMes } = getPrevisibilidadeRecebimento()
  const diasDaSemana = getDiasDaSemana()
  const vencimentosProximos = getVencimentosProximos()
  const notificacoesCount = vencimentosHoje.length + vencimentosProximos.filter(v => v.diasRestantes > 0).length

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
        subtitle={
          mostrandoApenaAtrasados
            ? `🚨 ${filteredMentorados.length} pessoa(s) em atraso • ${formatCurrency(filteredMentorados.reduce((sum, m) => sum + m.totalPendente, 0))} em atraso`
            : filteredMentorados.length === mentorados.filter(m => m.totalPendente > 0).length
              ? `${mentorados.filter(m => m.totalPendente > 0).length} com pendências • ${formatCurrency(getTotalGeral())} total pendente`
              : `${filteredMentorados.length} de ${mentorados.filter(m => m.totalPendente > 0).length} com pendências (filtrados) • ${formatCurrency(filteredMentorados.reduce((sum, m) => sum + m.totalPendente, 0))} filtrado`
        }
      />

      <main className="flex-1 p-6 space-y-6">
        {/* Previsibilidade de Recebimento e Comissões */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">Comissões Pendentes</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(comissoesPendentes.reduce((sum, c) => sum + (c.valor_comissao || 0), 0))}
                  </p>
                  {comissoesPendentes.length > 0 && (
                    <div className="mt-2 flex items-center text-xs text-orange-600">
                      <User className="h-3 w-3 mr-1" />
                      <span>{comissoesPendentes.length} pessoa{comissoesPendentes.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
                <DollarSign className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
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

        {/* Visualização da Semana - Dívidas e Comissões */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Agenda Semanal - Dívidas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm">📋 Dívidas da Semana</span>
                  <span className="text-xs font-normal text-gray-500">
                    {getWeekRangeText()}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePreviousWeek}
                    title="Semana anterior"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextWeek}
                    title="Próxima semana"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {diasDaSemana.map((dia, index) => (
                  <div
                    key={index}
                    className={`text-center p-2 rounded-md border text-xs ${
                      dia.isHoje
                        ? 'bg-blue-100 border-blue-300'
                        : dia.valor > 0
                          ? 'bg-red-50 border-red-200'
                          : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className={`font-medium ${
                      dia.isHoje ? 'text-blue-700' : 'text-gray-600'
                    }`}>
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][index]}
                    </div>
                    <div className={`text-sm font-bold ${
                      dia.isHoje ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {dia.data.getDate()}
                    </div>
                    {dia.valor > 0 && (
                      <div className="text-xs font-semibold text-red-600 mt-1">
                        {dia.valor > 1000 ? `${(dia.valor / 1000).toFixed(0)}k` : formatCurrency(dia.valor).replace('R$ ', '')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Agenda Semanal - Comissões */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm">💰 Comissões a Pagar</span>
                  <Badge variant="secondary" className="text-xs">
                    {comissoesPendentes.length} pendentes
                  </Badge>
                </div>
                {weekOffset !== 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCurrentWeek}
                    className="text-xs"
                  >
                    Semana Atual
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {comissoesPendentes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma comissão pendente</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {comissoesPendentes.slice(0, 6).map((comissao, index) => (
                    <div key={comissao.id} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-orange-800">
                          {comissao.mentorados?.nome_completo || 'Mentorado'}
                        </div>
                        <div className="text-xs text-orange-600">
                          Lead: {comissao.leads?.nome_completo || 'N/A'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm text-orange-700">
                          {formatCurrency(comissao.valor_comissao || 0)}
                        </div>
                        <div className="text-xs text-orange-500">
                          {comissao.percentual_comissao}%
                        </div>
                      </div>
                    </div>
                  ))}
                  {comissoesPendentes.length > 6 && (
                    <div className="text-center pt-2">
                      <span className="text-xs text-gray-500">+{comissoesPendentes.length - 6} mais</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-orange-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-orange-800">Total a pagar:</span>
                      <span className="text-lg font-bold text-orange-700">
                        {formatCurrency(comissoesPendentes.reduce((sum, c) => sum + (c.valor_comissao || 0), 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards com Pendências em Atraso */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">{/* Card de Pendências em Atraso - destacado */}
          <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Em Atraso</p>
                  <p className="text-2xl font-bold text-red-600">
                    {(() => {
                      const hoje = new Date()
                      hoje.setHours(0, 0, 0, 0)
                      let valorAtraso = 0

                      mentorados.forEach(mentorado => {
                        mentorado.dividas.forEach(divida => {
                          if (divida.status === 'pendente') {
                            const dataVencimento = new Date(divida.data_vencimento + 'T12:00:00')
                            dataVencimento.setHours(0, 0, 0, 0)

                            if (dataVencimento < hoje) {
                              valorAtraso += divida.valor
                            }
                          }
                        })
                      })

                      return formatCurrency(valorAtraso)
                    })()}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {(() => {
                      const hoje = new Date()
                      hoje.setHours(0, 0, 0, 0)
                      let contadorAtraso = 0

                      mentorados.forEach(mentorado => {
                        let temAtraso = false
                        mentorado.dividas.forEach(divida => {
                          if (divida.status === 'pendente') {
                            const dataVencimento = new Date(divida.data_vencimento + 'T12:00:00')
                            dataVencimento.setHours(0, 0, 0, 0)

                            if (dataVencimento < hoje && !temAtraso) {
                              contadorAtraso++
                              temAtraso = true
                            }
                          }
                        })
                      })

                      return `${contadorAtraso} pessoa(s) em atraso`
                    })()}
                  </p>
                </div>
                <div className="relative">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className={`mt-3 w-full ${mostrandoApenaAtrasados
                  ? 'bg-red-100 text-red-800 border-red-400'
                  : 'text-red-700 border-red-300 hover:bg-red-50'
                }`}
                onClick={() => {
                  setMostrandoApenaAtrasados(!mostrandoApenaAtrasados)

                  // Limpar filtros de busca para ver todos os atrasados
                  if (!mostrandoApenaAtrasados) {
                    setSearchTerm('')
                    setTurmaSelecionada('todas')
                  }

                  // Scroll para a seção de lista de pendências
                  setTimeout(() => {
                    document.querySelector('[data-section="pendencias-lista"]')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start'
                    })
                  }, 100)
                }}
              >
                {mostrandoApenaAtrasados ? (
                  <>
                    ✅ Mostrando Atrasados
                  </>
                ) : (
                  <>
                    🔍 Ver Pessoas em Atraso
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
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

        {/* Busca e Filtros */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtro por Turma */}
            <div className="min-w-[180px]">
              <Select value={turmaSelecionada} onValueChange={setTurmaSelecionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as turmas</SelectItem>
                  {turmasDisponiveis.map((turma) => (
                    <SelectItem key={turma} value={turma}>
                      {turma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
        <div className="space-y-4" data-section="pendencias-lista">{mostrandoApenaAtrasados && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">
                    Mostrando apenas pessoas em atraso
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMostrandoApenaAtrasados(false)}
                  className="text-red-600 hover:bg-red-100"
                >
                  ✖️ Limpar filtro
                </Button>
              </div>
            </div>
          )}
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
                      <div className="flex items-center justify-end space-x-2 mb-2">
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
                                onClick={() => abrirModalPagamento(dividasDoMes[0])}
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
                              📅 {new Date(primeiraData + 'T12:00:00').toLocaleDateString('pt-BR')}
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

        {/* Modal de Pagamento */}
        <Dialog open={isModalPagamentoOpen} onOpenChange={setIsModalPagamentoOpen}>
          <DialogContent className="cyber-modal max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                Confirmar Pagamento
              </DialogTitle>
            </DialogHeader>
            {dividaSelecionada && (
              <div className="space-y-6">
                <div className="bg-slate-800/30 p-4 rounded-xl border border-cyan-500/30">
                  <h4 className="text-cyan-300 font-semibold mb-2">Detalhes da Dívida</h4>
                  <p className="text-white">
                    <span className="text-cyan-300">Mentorado:</span> {dividaSelecionada.mentorado_nome}
                  </p>
                  <p className="text-white">
                    <span className="text-cyan-300">Valor Original:</span> R$ {dividaSelecionada.valor.toFixed(2)}
                  </p>
                  <p className="text-white">
                    <span className="text-cyan-300">Vencimento:</span> {new Date(dividaSelecionada.data_vencimento).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-cyan-300">Valor do Pagamento</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorPago}
                      onChange={(e) => setValorPago(e.target.value)}
                      placeholder="0.00"
                      className="neon-input"
                    />
                  </div>

                  <div>
                    <Label className="text-cyan-300">Observações (opcional)</Label>
                    <Input
                      value={observacoesPagamento}
                      onChange={(e) => setObservacoesPagamento(e.target.value)}
                      placeholder="Adicionar observações sobre o pagamento..."
                      className="neon-input"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setIsModalPagamentoOpen(false)}
                    variant="outline"
                    className="flex-1 cyber-button-outline"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmarPagamento}
                    className="flex-1 cyber-button-primary"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}