'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useStableData } from '@/hooks/use-stable-data'
import { useStableMutation } from '@/hooks/use-stable-mutation'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { supabase } from '@/lib/supabase'
import { whatsappNotifications } from '@/services/whatsapp-notifications'
import { useAuth } from '@/contexts/auth'
import { toast } from 'sonner'
import {
  Search,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  User,
  Plus,
  X,
  Edit,
  Users,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Wallet
} from 'lucide-react'

interface Divida {
  id: string
  mentorado_id: string
  mentorado_nome: string
  valor: number
  valor_total?: number
  valor_pago?: number
  valor_restante?: number
  data_vencimento: string
  status: 'pendente' | 'pago' | 'atrasado'
  data_pagamento: string | null
  observacoes: string | null
}

// Normaliza data para YYYY-MM-DD (remove timezone/time se vier ISO completo)
function normalizeDate(d: string | null | undefined): string {
  if (!d) return ''
  const s = String(d).trim()
  if (!s) return ''
  // Se já é YYYY-MM-DD, retorna direto
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // Se é ISO com T, pega só a parte da data
  if (s.includes('T')) return s.split('T')[0]
  // Tenta extrair YYYY-MM-DD de qualquer formato
  const match = s.match(/(\d{4}-\d{2}-\d{2})/)
  if (match) return match[1]
  return s
}

// Formata data segura para exibição (nunca retorna "Invalid Date")
function safeFormatDate(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  const normalized = normalizeDate(d)
  if (!normalized) return '-'
  const date = new Date(normalized + 'T12:00:00')
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('pt-BR', opts || { day: '2-digit', month: '2-digit', year: 'numeric' })
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

interface Comissao {
  id: string
  valor: number
  percentual: number
  status: string
  leads: any
  mentorados: any
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
  const { organizationId } = useAuth()

  // Estados locais simples
  const [searchTerm, setSearchTerm] = useState('')
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear())
  const [turmaSelecionada, setTurmaSelecionada] = useState('todas')
  const [mostrarApenasAtrasados, setMostrarApenasAtrasados] = useState(false)
  const [mostrarApenasVenceHoje, setMostrarApenasVenceHoje] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  // Estados do formulário de nova dívida
  const [selectedMentorado, setSelectedMentorado] = useState('')
  const [valorDivida, setValorDivida] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')

  // Estados do modal de pagamento
  const [isModalPagamentoOpen, setIsModalPagamentoOpen] = useState(false)
  const [dividaSelecionada, setDividaSelecionada] = useState<Divida | null>(null)
  const [valorPago, setValorPago] = useState('')
  const [observacoesPagamento, setObservacoesPagamento] = useState('')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Estados do modal de edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingDivida, setEditingDivida] = useState<Divida | null>(null)
  const [novoValor, setNovoValor] = useState('')
  const [novaDataVencimento, setNovaDataVencimento] = useState('')

  // Filtros otimizados
  const dividasFilters = useMemo(() => ({
    ano: anoSelecionado
  }), [anoSelecionado])

  // Estados para carregamento manual
  const [rawDividas, setRawDividas] = useState<any[]>([])
  const [dividasLoading, setDividasLoading] = useState(true)
  const [isRefetchingDividas, setIsRefetchingDividas] = useState(false)

  // Função para carregar dívidas
  const refetchDividas = useCallback(async () => {
    if (!organizationId) return

    setIsRefetchingDividas(true)
    try {
      const { data, error } = await supabase
        .from('dividas')
        .select('*')
        .eq('organization_id', organizationId)

      if (error) throw error

      // Normalizar dados: mapear valor_total/valor_restante → valor, e datas
      // IMPORTANTE: usar Number() pois PostgreSQL pode retornar strings para NUMERIC/DECIMAL
      const normalized = (data || []).map((d: any) => ({
        ...d,
        valor: Number(d.valor ?? d.valor_total ?? 0) || 0,
        valor_total: Number(d.valor_total ?? d.valor ?? 0) || 0,
        valor_pago: Number(d.valor_pago ?? 0) || 0,
        valor_restante: Number(d.valor_restante ?? d.valor_total ?? d.valor ?? 0) || 0,
        data_vencimento: normalizeDate(d.data_vencimento),
        data_pagamento: d.data_pagamento ? normalizeDate(d.data_pagamento) : null,
      }))

      setRawDividas(normalized)
    } catch (error) {
      console.error('Erro ao carregar dívidas:', error)
    } finally {
      setIsRefetchingDividas(false)
      setDividasLoading(false)
    }
  }, [organizationId])

  // Estados para mentorados
  const [mentoradosDisponiveis, setMentoradosDisponiveis] = useState<any[]>([])
  const [mentoradosLoading, setMentoradosLoading] = useState(true)

  // Função para carregar mentorados
  const refetchMentorados = useCallback(async () => {
    if (!organizationId) return

    try {
      const { data, error } = await supabase
        .from('mentorados')
        .select('id, nome_completo')
        .eq('organization_id', organizationId)

      if (error) throw error
      setMentoradosDisponiveis(data || [])
    } catch (error) {
      console.error('Erro ao carregar mentorados:', error)
    } finally {
      setMentoradosLoading(false)
    }
  }, [organizationId])

  // Estados para comissões
  const [comissoesPendentes, setComissoesPendentes] = useState<Comissao[]>([])
  const [comissoesLoading, setComissoesLoading] = useState(true)

  // Função para carregar comissões
  const refetchComissoes = useCallback(async () => {
    if (!organizationId) return

    try {
      const { data, error } = await supabase
        .from('comissoes')
        .select(`
          *,
          leads:lead_id(nome_completo, email),
          mentorados:mentorado_id(nome_completo, email)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'pendente')

      if (error) throw error
      setComissoesPendentes(data || [])
    } catch (error) {
      console.error('Erro ao carregar comissões:', error)
    } finally {
      setComissoesLoading(false)
    }
  }, [organizationId])

  // useEffect para carregar dados automaticamente
  useEffect(() => {
    if (organizationId) {
      refetchDividas()
      refetchMentorados()
      refetchComissoes()
    }
  }, [organizationId, refetchDividas, refetchMentorados, refetchComissoes])

  // Hooks de mutação otimizados
  const createDivida = useStableMutation('dividas', 'insert', {
    onSuccess: () => {
      refetchDividas()
      setIsModalOpen(false)
      setSelectedMentorado('')
      setValorDivida('')
      setDataVencimento('')
      toast.success('Divida criada com sucesso!')
    },
    debounceMs: 100
  })

  const updateDivida = useStableMutation('dividas', 'update', {
    onSuccess: () => {
      refetchDividas()
      setIsEditModalOpen(false)
      setEditingDivida(null)
      toast.success('Divida atualizada com sucesso!')
    },
    debounceMs: 100
  })

  // Estados derivados otimizados
  const loading = dividasLoading || mentoradosLoading || comissoesLoading
  const isLoadingOperations = createDivida.isLoading || updateDivida.isLoading || isRefetchingDividas

  // Processamento otimizado de dados com memoização
  const mentorados = useMemo(() => {
    if (!rawDividas || !mentoradosDisponiveis) return []

    // Filtrar dívidas por ano de forma otimizada
    const dividasDoAno = rawDividas.filter((divida: any) => {
      if (!divida.data_vencimento) return false
      const dateStr = normalizeDate(divida.data_vencimento)
      const ano = new Date(dateStr + 'T12:00:00').getFullYear()
      return ano === anoSelecionado
    })

    // Criar map de mentorados para lookup O(1)
    const mentoradosMap = new Map()
    mentoradosDisponiveis.forEach((mentorado: any) => {
      mentoradosMap.set(mentorado.id, {
        id: mentorado.id,
        nome_completo: mentorado.nome_completo,
        email: mentorado.email || '',
        turma: mentorado.turma || '',
        dividas: [],
        totalPendente: 0,
        totalDividas: 0
      })
    })

    // Agrupar dívidas por mentorado de forma eficiente
    dividasDoAno.forEach((divida: any) => {
      let mentorado = mentoradosMap.get(divida.mentorado_id)

      // Fallback: buscar por nome se não encontrar por ID
      if (!mentorado) {
        for (const [id, m] of Array.from(mentoradosMap.entries())) {
          if ((m as any).nome_completo === divida.mentorado_nome) {
            mentorado = m
            break
          }
        }
      }

      if (mentorado) {
        mentorado.dividas.push(divida)
        if (divida.status === 'pendente' || divida.status === 'atrasado') {
          mentorado.totalPendente += Number(divida.valor_restante ?? divida.valor ?? 0) || 0
        }
        mentorado.totalDividas++
      }
    })

    return Array.from(mentoradosMap.values())
  }, [rawDividas, mentoradosDisponiveis, anoSelecionado])

  // Funções otimizadas
  const handleNovaDivida = useCallback(async () => {
    if (!selectedMentorado || !valorDivida || !dataVencimento) {
      toast.error('Preencha todos os campos')
      return
    }

    const mentoradoSelecionado = mentoradosDisponiveis?.find(m => m.id === selectedMentorado)
    const valorNumerico = parseFloat(valorDivida.replace(',', '.'))

    await createDivida.mutate({
      mentorado_id: selectedMentorado,
      mentorado_nome: mentoradoSelecionado?.nome_completo,
      valor_total: valorNumerico,
      valor_pago: 0,
      valor_restante: valorNumerico,
      data_vencimento: dataVencimento,
      status: 'pendente',
      organization_id: organizationId,
    })
  }, [selectedMentorado, valorDivida, dataVencimento, mentoradosDisponiveis, createDivida])

  const handleEditarDivida = useCallback(async () => {
    if (!editingDivida || !novoValor || !novaDataVencimento) {
      toast.error('Preencha todos os campos')
      return
    }

    const novoValorNum = parseFloat(novoValor.replace(',', '.'))
    await updateDivida.mutate({
      id: editingDivida.id,
      valor_total: novoValorNum,
      valor_restante: novoValorNum - (editingDivida.valor_pago || 0),
      data_vencimento: novaDataVencimento
    })
  }, [editingDivida, novoValor, novaDataVencimento, updateDivida])

  const removerDivida = useCallback(async (dividaId: string) => {
    if (!confirm('Tem certeza que deseja remover esta divida?')) return

    try {
      const { error } = await supabase
        .from('dividas')
        .delete()
        .eq('id', dividaId)

      if (error) {
        console.error('Erro ao excluir divida:', error)
        toast.error('Erro ao excluir divida: ' + error.message)
        return
      }

      toast.success('Divida excluida com sucesso!')
      refetchDividas()
    } catch (error) {
      console.error('Erro geral ao excluir:', error)
      toast.error('Erro ao excluir divida')
    }
  }, [refetchDividas])

  const toggleCardExpanded = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value) || 0)
  }

  const calcularDiasRestantes = (dataVencimento: string) => {
    const normalized = normalizeDate(dataVencimento)
    if (!normalized) return 0

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const vencimento = new Date(normalized + 'T12:00:00')
    if (isNaN(vencimento.getTime())) return 0
    vencimento.setHours(0, 0, 0, 0)

    const diffTime = vencimento.getTime() - hoje.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getStatusDivida = (diasRestantes: number) => {
    if (diasRestantes < 0) return { color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Em Atraso', dot: 'bg-red-400' }
    if (diasRestantes === 0) return { color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: 'Vence Hoje', dot: 'bg-orange-400' }
    if (diasRestantes <= 3) return { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Proximo', dot: 'bg-yellow-400' }
    return { color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Em Dia', dot: 'bg-green-400' }
  }

  const getStatusCellColor = (diasRestantes: number) => {
    if (diasRestantes < 0) return 'from-red-500/5 to-red-500/10 border-red-500/20 hover:border-red-500/40'
    if (diasRestantes === 0) return 'from-orange-500/5 to-orange-500/10 border-orange-500/20 hover:border-orange-500/40'
    if (diasRestantes <= 3) return 'from-yellow-500/5 to-yellow-500/10 border-yellow-500/20 hover:border-yellow-500/40'
    return 'from-green-500/5 to-green-500/10 border-green-500/20 hover:border-green-500/40'
  }

  const filteredMentorados = mentorados.filter(mentorado => {
    if (mentorado.totalPendente <= 0) return false

    if (searchTerm && !mentorado.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !mentorado.email.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }

    if (turmaSelecionada !== 'todas' && mentorado.turma !== turmaSelecionada) {
      return false
    }

    if (mostrarApenasAtrasados) {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      const temAtraso = mentorado.dividas.some((divida: any) => {
        if (divida.status === 'pendente' || divida.status === 'atrasado') {
          const dvStr = normalizeDate(divida.data_vencimento)
          if (!dvStr) return false
          const dataVencimento = new Date(dvStr + 'T12:00:00')
          if (isNaN(dataVencimento.getTime())) return false
          dataVencimento.setHours(0, 0, 0, 0)
          return dataVencimento < hoje
        }
        return false
      })

      return temAtraso
    }

    if (mostrarApenasVenceHoje) {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      const temVencimentoHoje = mentorado.dividas.some((divida: any) => {
        if (divida.status === 'pendente') {
          const dvStr = normalizeDate(divida.data_vencimento)
          if (!dvStr) return false
          const dataVencimento = new Date(dvStr + 'T12:00:00')
          if (isNaN(dataVencimento.getTime())) return false
          dataVencimento.setHours(0, 0, 0, 0)
          return dataVencimento.toDateString() === hoje.toDateString()
        }
        return false
      })

      return temVencimentoHoje
    }

    return true
  })

  const getTurmasDisponiveis = () => {
    const turmas = new Set(mentorados.map(m => m.turma).filter(Boolean))
    return Array.from(turmas).sort()
  }

  const getMetricas = () => {
    const totalPendente = mentorados.reduce((sum, m) => sum + m.totalPendente, 0)
    const totalComissoes = comissoesPendentes.reduce((sum, c) => sum + (c.valor || 0), 0)

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    let valorAtrasado = 0
    let pessoasEmAtraso = 0
    let vencimentosHoje = 0
    let vencimentosSemana = 0

    const inicioSemana = new Date(hoje)
    inicioSemana.setDate(hoje.getDate() - hoje.getDay())
    const fimSemana = new Date(inicioSemana)
    fimSemana.setDate(inicioSemana.getDate() + 6)

    // Projected income time boundaries
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    fimMes.setHours(0, 0, 0, 0)

    const inicioProximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
    inicioProximoMes.setHours(0, 0, 0, 0)
    const fimProximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0)
    fimProximoMes.setHours(0, 0, 0, 0)

    const quarterMonth = Math.floor(hoje.getMonth() / 3) * 3
    const fimTrimestre = new Date(hoje.getFullYear(), quarterMonth + 3, 0)
    fimTrimestre.setHours(0, 0, 0, 0)

    const semesterMonth = Math.floor(hoje.getMonth() / 6) * 6
    const fimSemestre = new Date(hoje.getFullYear(), semesterMonth + 6, 0)
    fimSemestre.setHours(0, 0, 0, 0)

    let previsaoHoje = 0
    let previsaoSemana = 0
    let previsaoMes = 0
    let previsaoProximoMes = 0
    let previsaoTrimestre = 0
    let previsaoSemestre = 0

    mentorados.forEach(mentorado => {
      let temAtraso = false
      mentorado.dividas.forEach((divida: any) => {
        if (divida.status === 'pendente' || divida.status === 'atrasado') {
          const dvStr = normalizeDate(divida.data_vencimento)
          if (!dvStr) return
          const dataVencimento = new Date(dvStr + 'T12:00:00')
          if (isNaN(dataVencimento.getTime())) return
          dataVencimento.setHours(0, 0, 0, 0)
          const val = Number(divida.valor_restante ?? divida.valor ?? 0) || 0

          if (dataVencimento < hoje) {
            valorAtrasado += val
            if (!temAtraso) {
              pessoasEmAtraso++
              temAtraso = true
            }
          }

          if (dataVencimento.toDateString() === hoje.toDateString()) {
            vencimentosHoje += val
            previsaoHoje += val
          }

          if (dataVencimento >= inicioSemana && dataVencimento <= fimSemana) {
            vencimentosSemana += val
          }

          if (dataVencimento >= hoje && dataVencimento <= fimSemana) {
            previsaoSemana += val
          }

          if (dataVencimento >= hoje && dataVencimento <= fimMes) {
            previsaoMes += val
          }

          if (dataVencimento >= inicioProximoMes && dataVencimento <= fimProximoMes) {
            previsaoProximoMes += val
          }

          if (dataVencimento >= hoje && dataVencimento <= fimTrimestre) {
            previsaoTrimestre += val
          }

          if (dataVencimento >= hoje && dataVencimento <= fimSemestre) {
            previsaoSemestre += val
          }
        }
      })
    })

    return {
      totalPendente,
      totalComissoes,
      valorAtrasado,
      pessoasEmAtraso,
      vencimentosHoje,
      vencimentosSemana,
      comPendencias: mentorados.filter(m => m.totalPendente > 0).length,
      emDia: mentorados.filter(m => m.totalPendente === 0).length,
      previsaoHoje,
      previsaoSemana,
      previsaoMes,
      previsaoProximoMes,
      previsaoTrimestre,
      previsaoSemestre
    }
  }

  const metricas = getMetricas()
  const turmasDisponiveis = getTurmasDisponiveis()


  const abrirModalPagamento = (divida: Divida) => {
    setDividaSelecionada(divida)
    setValorPago((divida.valor_restante ?? divida.valor ?? 0).toString())
    setObservacoesPagamento('')
    setIsModalPagamentoOpen(true)
  }

  const confirmarPagamento = async () => {
    if (!dividaSelecionada) return

    setIsProcessingPayment(true)
    try {
      const valorPagoNum = parseFloat(valorPago)
      if (isNaN(valorPagoNum) || valorPagoNum <= 0) {
        toast.error('Digite um valor valido para o pagamento')
        setIsProcessingPayment(false)
        return
      }

      // Buscar dados da dívida
      const { data: divida, error: dividaError } = await supabase
        .from('dividas')
        .select('*')
        .eq('id', dividaSelecionada.id)
        .single()

      if (dividaError) throw dividaError

      // Buscar lead relacionado
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('nome_completo', divida.mentorado_nome)
        .single()

      // Atualizar status da dívida
      const novoValorPago = Number(divida.valor_pago || 0) + valorPagoNum
      const novoValorRestante = Math.max(0, Number(divida.valor_total || divida.valor || 0) - novoValorPago)
      const novoStatus = novoValorRestante <= 0 ? 'pago' : 'pendente'

      const { error: updateDividaError } = await supabase
        .from('dividas')
        .update({
          status: novoStatus,
          valor_pago: novoValorPago,
          valor_restante: novoValorRestante,
          data_pagamento: new Date().toISOString().split('T')[0]
        })
        .eq('id', dividaSelecionada.id)

      if (updateDividaError) throw updateDividaError

      // Registrar no histórico
      await supabase
        .from('historico_pagamentos')
        .insert({
          divida_id: dividaSelecionada.id,
          mentorado_nome: divida.mentorado_nome,
          valor_pago: valorPagoNum,
          data_pagamento: new Date().toISOString().split('T')[0],
          observacoes: observacoesPagamento || null,
          lead_id: lead?.id || null
        })

      // Se encontrou lead, atualizar valor arrecadado
      if (lead) {
        const novoValorArrecadado = (lead.valor_arrecadado || 0) + valorPagoNum

        await supabase
          .from('leads')
          .update({
            valor_arrecadado: novoValorArrecadado
          })
          .eq('id', lead.id)
      }

      // Enviar notificação WhatsApp para admin
      try {
        if (organizationId) {
          await whatsappNotifications.notifyPendencyPaid({
            organizationId,
            personName: divida.mentorado_nome,
            amount: valorPagoNum,
            description: observacoesPagamento || 'Pendencia financeira quitada',
            paymentMethod: 'Sistema'
          })
        }
      } catch (notificationError) {
        console.warn('Erro ao enviar notificacao:', notificationError)
      }

      refetchDividas()
      setIsModalPagamentoOpen(false)
      setDividaSelecionada(null)
      setValorPago('')
      setObservacoesPagamento('')

      toast.success(`Pagamento de R$ ${(valorPagoNum ?? 0).toFixed(2)} registrado com sucesso!`)
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error)
      toast.error('Erro ao confirmar pagamento')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const editarDivida = (divida: Divida) => {
    setEditingDivida(divida)
    setNovoValor((divida.valor_total ?? divida.valor ?? 0).toString())
    setNovaDataVencimento(normalizeDate(divida.data_vencimento))
    setIsEditModalOpen(true)
  }



  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background min-h-screen">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-muted border-b-primary/60 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
            <DollarSign className="absolute inset-0 m-auto w-5 h-5 text-primary/60" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">Carregando pendencias...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <Header
        title={
          <div className="flex items-center space-x-4">
            <span>Pendencias Financeiras</span>
            <Select value={anoSelecionado.toString()} onValueChange={(value) => setAnoSelecionado(parseInt(value))}>
              <SelectTrigger className="w-24 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 50 }, (_, i) => 2020 + i).map(ano => (
                  <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        subtitle={
          mostrarApenasAtrasados
            ? `${filteredMentorados.length} pessoa(s) em atraso - ${formatCurrency(filteredMentorados.reduce((sum, m) => sum + m.totalPendente, 0))} em atraso`
            : `${filteredMentorados.length} com pendencias - ${formatCurrency(metricas.totalPendente)} total pendente`
        }
      />

      <main className="p-4 md:p-6 space-y-5 md:space-y-6">
        {/* Métricas Principais - Gradient Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Total Pendente */}
          <div className="relative overflow-hidden rounded-2xl p-4 md:p-5 bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/10 hover:shadow-red-500/20 transition-all duration-300 hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
              <div className="w-full h-full rounded-full bg-white transform translate-x-6 -translate-y-6" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-1.5 md:p-2 bg-white/20 rounded-lg">
                  <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <span className="text-[10px] md:text-xs font-semibold text-white/80 uppercase tracking-wider">Total</span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-white mb-1">{formatCurrency(metricas.totalPendente)}</p>
              <p className="text-white/70 text-[11px] md:text-xs">{metricas.comPendencias} pessoa(s)</p>
            </div>
          </div>

          {/* Em Atraso */}
          <div className="relative overflow-hidden rounded-2xl p-4 md:p-5 bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
            onClick={() => {
              setMostrarApenasAtrasados(!mostrarApenasAtrasados)
              if (!mostrarApenasAtrasados) setMostrarApenasVenceHoje(false)
            }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
              <div className="w-full h-full rounded-full bg-white transform translate-x-6 -translate-y-6" />
            </div>
            {metricas.pessoasEmAtraso > 0 && (
              <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
            )}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-1.5 md:p-2 bg-white/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <span className="text-[10px] md:text-xs font-semibold text-white/80 uppercase tracking-wider">Atraso</span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-white mb-1">{formatCurrency(metricas.valorAtrasado)}</p>
              <p className="text-white/70 text-[11px] md:text-xs">
                {metricas.pessoasEmAtraso} pessoa(s)
                {mostrarApenasAtrasados && <span className="ml-1 font-semibold">(filtro ativo)</span>}
              </p>
            </div>
          </div>

          {/* Vence Hoje */}
          <div className="relative overflow-hidden rounded-2xl p-4 md:p-5 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
            onClick={() => {
              setMostrarApenasVenceHoje(!mostrarApenasVenceHoje)
              if (!mostrarApenasVenceHoje) setMostrarApenasAtrasados(false)
            }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
              <div className="w-full h-full rounded-full bg-white transform translate-x-6 -translate-y-6" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-1.5 md:p-2 bg-white/20 rounded-lg">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <span className="text-[10px] md:text-xs font-semibold text-white/80 uppercase tracking-wider">Hoje</span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-white mb-1">{formatCurrency(metricas.vencimentosHoje)}</p>
              <p className="text-white/70 text-[11px] md:text-xs">
                vence hoje
                {mostrarApenasVenceHoje && <span className="ml-1 font-semibold">(filtro ativo)</span>}
              </p>
            </div>
          </div>

          {/* Comissões Pendentes */}
          <div className="relative overflow-hidden rounded-2xl p-4 md:p-5 bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
              <div className="w-full h-full rounded-full bg-white transform translate-x-6 -translate-y-6" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-1.5 md:p-2 bg-white/20 rounded-lg">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <span className="text-[10px] md:text-xs font-semibold text-white/80 uppercase tracking-wider">Comissoes</span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-white mb-1">{formatCurrency(metricas.totalComissoes)}</p>
              <p className="text-white/70 text-[11px] md:text-xs">{comissoesPendentes.length} pessoa(s)</p>
            </div>
          </div>
        </div>

        {/* Previsao de Receita - Improved */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <div className="p-1.5 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              </div>
              Previsao de Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
              {[
                { label: 'Hoje', value: metricas.previsaoHoje, gradient: 'from-blue-500/10 to-blue-600/5', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200/50 dark:border-blue-500/20' },
                { label: 'Esta Semana', value: metricas.previsaoSemana, gradient: 'from-indigo-500/10 to-indigo-600/5', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200/50 dark:border-indigo-500/20' },
                { label: 'Este Mes', value: metricas.previsaoMes, gradient: 'from-purple-500/10 to-purple-600/5', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200/50 dark:border-purple-500/20' },
                { label: 'Proximo Mes', value: metricas.previsaoProximoMes, gradient: 'from-violet-500/10 to-violet-600/5', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200/50 dark:border-violet-500/20' },
                { label: 'Trimestre', value: metricas.previsaoTrimestre, gradient: 'from-green-500/10 to-green-600/5', text: 'text-green-700 dark:text-green-400', border: 'border-green-200/50 dark:border-green-500/20' },
                { label: 'Semestre', value: metricas.previsaoSemestre, gradient: 'from-emerald-500/10 to-emerald-600/5', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200/50 dark:border-emerald-500/20' },
              ].map((item, i) => (
                <div key={item.label} className={`text-center p-3 md:p-4 bg-gradient-to-br ${item.gradient} rounded-xl border ${item.border} transition-all duration-300 hover:scale-[1.02]`}>
                  <p className={`text-[10px] md:text-xs font-semibold ${item.text} uppercase tracking-wide mb-1`}>{item.label}</p>
                  <p className={`text-sm md:text-lg font-bold ${item.text}`}>
                    {formatCurrency(item.value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filtros e Acoes */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={turmaSelecionada} onValueChange={setTurmaSelecionada}>
                  <SelectTrigger className="w-full sm:w-48">
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

              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button className="shrink-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Divida
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Adicionar Nova Divida</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Mentorado</Label>
                      <Select value={selectedMentorado} onValueChange={setSelectedMentorado}>
                        <SelectTrigger className="mt-1.5">
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
                      <Label>Valor</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={valorDivida}
                        onChange={(e) => setValorDivida(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Data de Vencimento</Label>
                      <Input
                        type="date"
                        value={dataVencimento}
                        onChange={(e) => setDataVencimento(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleNovaDivida} disabled={createDivida.isLoading}>
                        {createDivida.isLoading ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                        ) : 'Salvar Divida'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Active Filter Alerts */}
        {mostrarApenasAtrasados && (
          <div className="flex items-center justify-between p-3 md:p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="font-medium text-red-600 dark:text-red-400 text-sm">
                Mostrando apenas pessoas em atraso
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setMostrarApenasAtrasados(false)} className="text-red-500 hover:bg-red-500/10 h-7 px-2">
              Limpar
            </Button>
          </div>
        )}

        {mostrarApenasVenceHoje && (
          <div className="flex items-center justify-between p-3 md:p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-blue-600 dark:text-blue-400 text-sm">
                Mostrando apenas dividas que vencem hoje
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setMostrarApenasVenceHoje(false)} className="text-blue-500 hover:bg-blue-500/10 h-7 px-2">
              Limpar
            </Button>
          </div>
        )}

        {/* Lista de Pendências */}
        <TooltipProvider delayDuration={200}>
          <div className="space-y-3 md:space-y-4">
            {filteredMentorados.map((mentorado) => {
              const dividasPendentes = mentorado.dividas.filter((d: any) => d.status === 'pendente' || d.status === 'atrasado')
              const isExpanded = expandedCards.has(mentorado.id)
              const gruposPorMes = MESES.reduce((grupos, mes) => {
                grupos[mes.numero] = dividasPendentes.filter((d: any) => {
                  const dvStr = normalizeDate(d.data_vencimento)
                  if (!dvStr) return false
                  const dt = new Date(dvStr + 'T12:00:00')
                  if (isNaN(dt.getTime())) return false
                  return dt.getMonth() + 1 === mes.numero
                })
                return grupos
              }, {} as { [key: number]: Divida[] })

              // Count months with debts
              const mesesComDivida = MESES.filter(m => (gruposPorMes[m.numero] || []).length > 0)

              return (
                <Card key={mentorado.id} className="border-0 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                  <CardHeader
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleCardExpanded(mentorado.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-sm md:text-base">
                            {mentorado.nome_completo}
                          </CardTitle>
                          <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground flex-wrap">
                            {mentorado.turma && <span>{mentorado.turma}</span>}
                            {mentorado.turma && mentorado.email && <span className="hidden sm:inline">-</span>}
                            <span className="hidden sm:inline truncate max-w-[200px]">{mentorado.email}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-lg md:text-2xl font-bold text-destructive">
                            {formatCurrency(mentorado.totalPendente)}
                          </div>
                          <div className="flex items-center gap-1.5 justify-end">
                            <Badge variant="secondary" className="text-[10px] md:text-xs">
                              {mentorado.totalDividas} divida(s)
                            </Badge>
                          </div>
                        </div>
                        <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  {dividasPendentes.length > 0 && (isExpanded || mesesComDivida.length <= 6) && (
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                        {MESES.map((mes) => {
                          const dividasDoMes = gruposPorMes[mes.numero] || []

                          if (dividasDoMes.length === 0) {
                            return (
                              <div key={mes.numero} className="text-center p-2.5 md:p-3 bg-muted/30 rounded-xl border border-transparent">
                                <p className="text-[11px] md:text-xs text-muted-foreground font-medium">
                                  {mes.abrev}
                                </p>
                                <p className="text-[11px] md:text-xs text-muted-foreground/50 mt-0.5">-</p>
                              </div>
                            )
                          }

                          const valorTotal = dividasDoMes.reduce((sum, d) => sum + (d.valor_restante ?? d.valor ?? 0), 0)
                          const primeiraData = normalizeDate(dividasDoMes[0].data_vencimento)
                          const diasRestantes = calcularDiasRestantes(primeiraData)
                          const status = getStatusDivida(diasRestantes)
                          const cellColor = getStatusCellColor(diasRestantes)

                          return (
                            <div key={mes.numero} className={`relative text-center p-2.5 md:p-3 rounded-xl border bg-gradient-to-br ${cellColor} group transition-all duration-300`}>
                              {/* Status dot indicator */}
                              <div className={`absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full ${status.dot}`} />

                              {/* Action buttons - visible on mobile, hover on desktop */}
                              <div className="flex justify-center gap-1 mb-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); editarDivida(dividasDoMes[0]) }}
                                      className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center transition-colors"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">Editar</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); abrirModalPagamento(dividasDoMes[0]) }}
                                      className="w-6 h-6 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center justify-center transition-colors"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">Pagar</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removerDivida(dividasDoMes[0].id) }}
                                      className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">Remover</TooltipContent>
                                </Tooltip>
                              </div>

                              <p className="text-[11px] md:text-xs font-semibold">
                                {mes.abrev}
                                {dividasDoMes.length > 1 && <span className="text-muted-foreground"> ({dividasDoMes.length})</span>}
                              </p>

                              <p className="text-xs md:text-sm font-bold mt-0.5">
                                {formatCurrency(valorTotal)}
                              </p>

                              <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                                {safeFormatDate(primeiraData, { day: '2-digit', month: '2-digit' })}
                              </p>

                              <Badge variant="outline" className={`text-[9px] md:text-[10px] mt-1.5 ${status.color} border-current px-1.5 py-0`}>
                                {status.label}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  )}

                  {/* Collapsed summary for cards with many months */}
                  {dividasPendentes.length > 0 && !isExpanded && mesesComDivida.length > 6 && (
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{mesesComDivida.length} meses com pendencias</span>
                        <span>-</span>
                        <span>Clique para expandir</span>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        </TooltipProvider>

        {filteredMentorados.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-base md:text-lg font-semibold mb-2">
                {searchTerm ? 'Nenhum mentorado encontrado' : 'Nenhuma pendencia cadastrada'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {searchTerm ? 'Tente buscar por outro termo.' : 'As pendencias financeiras aparecerão aqui quando forem cadastradas.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Modal de Pagamento */}
        <Dialog open={isModalPagamentoOpen} onOpenChange={setIsModalPagamentoOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-1.5 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                Confirmar Pagamento
              </DialogTitle>
            </DialogHeader>
            {dividaSelecionada && (
              <div className="space-y-5">
                <div className="bg-muted/50 p-4 rounded-xl space-y-2">
                  <h4 className="font-semibold text-sm mb-3">Detalhes da Divida</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Mentorado</span>
                      <p className="font-medium">{dividaSelecionada.mentorado_nome}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Valor Original</span>
                      <p className="font-medium">{formatCurrency(dividaSelecionada.valor_total ?? dividaSelecionada.valor ?? 0)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Vencimento</span>
                      <p className="font-medium">{safeFormatDate(dividaSelecionada.data_vencimento)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Valor do Pagamento</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorPago}
                      onChange={(e) => setValorPago(e.target.value)}
                      placeholder="0.00"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label>Observacoes (opcional)</Label>
                    <Input
                      value={observacoesPagamento}
                      onChange={(e) => setObservacoesPagamento(e.target.value)}
                      placeholder="Adicionar observacoes..."
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => setIsModalPagamentoOpen(false)}
                    variant="outline"
                    className="flex-1"
                    disabled={isProcessingPayment}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmarPagamento}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4 mr-2" />Confirmar</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Edição */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                  <Edit className="h-4 w-4 text-blue-600" />
                </div>
                Editar Divida
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {editingDivida && (
                <div className="bg-muted/50 p-3 rounded-xl">
                  <p className="text-sm text-muted-foreground">
                    Editando divida de: <strong>{editingDivida.mentorado_nome}</strong>
                  </p>
                </div>
              )}
              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={novaDataVencimento}
                  onChange={(e) => setNovaDataVencimento(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleEditarDivida} disabled={updateDivida.isLoading}>
                  {updateDivida.isLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Atualizando...</>
                  ) : 'Atualizar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
