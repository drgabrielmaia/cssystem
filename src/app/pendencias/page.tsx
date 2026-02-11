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
import { whatsappNotifications } from '@/services/whatsapp-notifications'
import { useAuth } from '@/contexts/auth'
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
  Users
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

interface Comissao {
  id: string
  valor_comissao: number
  percentual_comissao: number
  status_pagamento: string
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
  const [mentorados, setMentorados] = useState<MentoradoComDividas[]>([])
  const [comissoesPendentes, setComissoesPendentes] = useState<Comissao[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear())
  const [turmaSelecionada, setTurmaSelecionada] = useState('todas')
  const [mostrarApenasAtrasados, setMostrarApenasAtrasados] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mentoradosDisponiveis, setMentoradosDisponiveis] = useState<any[]>([])

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

  useEffect(() => {
    loadAllData()
  }, [anoSelecionado])

  const loadAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadDividasData(),
        loadMentoradosDisponiveis(),
        loadComissoesPendentes()
      ])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadComissoesPendentes = async () => {
    try {
      // Obter usuário atual e organização
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('Usuário não encontrado para comissões')
        return
      }

      // Buscar organization_id do usuário
      const { data: orgUser, error: orgError } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      console.log('DEBUG Comissões - orgUser:', { orgUser, orgError })

      const organizationId = orgUser?.organization_id

      // Buscar todas as comissões pendentes (tabela não tem organization_id ainda)
      const { data: comissoes, error } = await supabase
        .from('comissoes')
        .select('*')
        .eq('status_pagamento', 'pendente')
        .order('created_at', { ascending: false })

      console.log('DEBUG Comissões:', { comissoes, error, organizationId })

      if (error) throw error

      // Para cada comissão, buscar os dados do lead e mentorado separadamente
      const comissoesComDados = []
      for (const comissao of comissoes || []) {
        const comissaoCompleta = { ...comissao }

        // Buscar dados do lead se existir lead_id
        if (comissao.lead_id) {
          const { data: lead } = await supabase
            .from('leads')
            .select('nome_completo, telefone')
            .eq('id', comissao.lead_id)
            .single()

          comissaoCompleta.leads = lead
        }

        // Buscar dados do mentorado se existir mentorado_id
        if (comissao.mentorado_id) {
          const { data: mentorado } = await supabase
            .from('mentorados')
            .select('nome_completo, email, turma')
            .eq('id', comissao.mentorado_id)
            .single()

          comissaoCompleta.mentorados = mentorado
        }

        comissoesComDados.push(comissaoCompleta)
      }

      setComissoesPendentes(comissoesComDados)
    } catch (error) {
      console.error('Erro ao carregar comissões pendentes:', error)
    }
  }

  const loadMentoradosDisponiveis = async () => {
    try {
      // Obter usuário atual e organização
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Buscar organization_id do usuário
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      const organizationId = orgUser?.organization_id

      const { data } = await supabase
        .from('mentorados')
        .select('id, nome_completo')
        .eq('organization_id', organizationId)
        .order('nome_completo')

      setMentoradosDisponiveis(data || [])
    } catch (error) {
      console.error('Erro ao carregar mentorados:', error)
    }
  }

  const loadDividasData = async () => {
    try {
      // Obter usuário atual e organização
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('Usuário não encontrado para dívidas')
        return
      }

      // Buscar organization_id do usuário
      const { data: orgUser, error: orgError } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      console.log('DEBUG Dívidas - orgUser:', { orgUser, orgError })

      const organizationId = orgUser?.organization_id

      // Buscar todas as dívidas (tabela não tem organization_id ainda)
      const { data: dividasData, error: dividasError } = await supabase
        .from('dividas')
        .select('*')
        .gte('data_vencimento', `${anoSelecionado}-01-01`)
        .lte('data_vencimento', `${anoSelecionado}-12-31`)
        .order('mentorado_nome, data_vencimento')

      // Buscar mentorados - se não tiver organization_id, buscar sem filtro
      let mentoradosQuery = supabase
        .from('mentorados')
        .select('*')
        .order('nome_completo')

      if (organizationId) {
        mentoradosQuery = mentoradosQuery.eq('organization_id', organizationId)
      } else {
        console.log('DEBUG: Buscando mentorados sem filtro de organização')
      }

      const { data: mentoradosData, error: mentoradosError } = await mentoradosQuery

      console.log('DEBUG Dívidas:', {
        dividasData,
        dividasError,
        mentoradosData,
        mentoradosError,
        organizationId,
        anoSelecionado
      })

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
          let mentorado = mentoradosMap.get(divida.mentorado_id)

          if (!mentorado) {
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
        setMentorados(mentoradosArray)
      }
    } catch (error) {
      console.error('Erro ao carregar dívidas:', error)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const calcularDiasRestantes = (dataVencimento: string) => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const vencimento = new Date(dataVencimento + 'T12:00:00')
    vencimento.setHours(0, 0, 0, 0)

    const diffTime = vencimento.getTime() - hoje.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getStatusDivida = (diasRestantes: number) => {
    if (diasRestantes < 0) return { color: 'bg-red-100 text-red-800 border-red-200', label: 'Em Atraso' }
    if (diasRestantes === 0) return { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Vence Hoje' }
    if (diasRestantes <= 3) return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Próximo' }
    return { color: 'bg-green-100 text-green-800 border-green-200', label: 'Em Dia' }
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

  const getTurmasDisponiveis = () => {
    const turmas = new Set(mentorados.map(m => m.turma).filter(Boolean))
    return Array.from(turmas).sort()
  }

  const getMetricas = () => {
    const totalPendente = mentorados.reduce((sum, m) => sum + m.totalPendente, 0)
    const totalComissoes = comissoesPendentes.reduce((sum, c) => sum + (c.valor_comissao || 0), 0)

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

    mentorados.forEach(mentorado => {
      let temAtraso = false
      mentorado.dividas.forEach(divida => {
        if (divida.status === 'pendente') {
          const dataVencimento = new Date(divida.data_vencimento + 'T12:00:00')
          dataVencimento.setHours(0, 0, 0, 0)

          if (dataVencimento < hoje) {
            valorAtrasado += divida.valor
            if (!temAtraso) {
              pessoasEmAtraso++
              temAtraso = true
            }
          }

          if (dataVencimento.toDateString() === hoje.toDateString()) {
            vencimentosHoje += divida.valor
          }

          if (dataVencimento >= inicioSemana && dataVencimento <= fimSemana) {
            vencimentosSemana += divida.valor
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
      emDia: mentorados.filter(m => m.totalPendente === 0).length
    }
  }

  const metricas = getMetricas()
  const turmasDisponiveis = getTurmasDisponiveis()

  const handleNovaDivida = async () => {
    if (!selectedMentorado || !valorDivida || !dataVencimento) {
      alert('Preencha todos os campos')
      return
    }

    try {
      // Obter usuário atual e organização
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Buscar organization_id do usuário
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      const organizationId = orgUser?.organization_id

      const mentoradoSelecionado = mentoradosDisponiveis.find(m => m.id === selectedMentorado)
      const valorNumerico = parseFloat(valorDivida.replace(',', '.'))

      const { error } = await supabase
        .from('dividas')
        .insert({
          mentorado_id: selectedMentorado,
          mentorado_nome: mentoradoSelecionado?.nome_completo,
          valor: valorNumerico,
          data_vencimento: dataVencimento,
          status: 'pendente',
          // organization_id: organizationId // Tabela não tem essa coluna ainda
        })

      if (error) throw error

      await loadDividasData()

      setSelectedMentorado('')
      setValorDivida('')
      setDataVencimento('')
      setIsModalOpen(false)
    } catch (error) {
      console.error('Erro ao salvar dívida:', error)
      alert('Erro ao salvar dívida')
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
      const { error: updateDividaError } = await supabase
        .from('dividas')
        .update({
          status: 'pago',
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

      // ✅ ENVIAR NOTIFICAÇÃO WHATSAPP PARA ADMIN
      try {
        if (organizationId) {
          console.log('📱 Enviando notificação de pagamento para admin...')
          await whatsappNotifications.notifyPendencyPaid({
            organizationId,
            personName: divida.mentorado_nome,
            amount: valorPagoNum,
            description: observacoesPagamento || 'Pendência financeira quitada',
            paymentMethod: 'Sistema'
          })
          console.log('✅ Notificação de pagamento enviada!')
        }
      } catch (notificationError) {
        console.warn('❌ Erro ao enviar notificação de pagamento:', notificationError)
        // Não quebrar o fluxo se a notificação falhar
      }

      await loadDividasData()
      setIsModalPagamentoOpen(false)
      setDividaSelecionada(null)
      setValorPago('')
      setObservacoesPagamento('')

      alert(`✅ Pagamento de R$ ${valorPagoNum.toFixed(2)} registrado com sucesso!`)
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error)
      alert('Erro ao confirmar pagamento')
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando pendências...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <Header
        title={
          <div className="flex items-center space-x-4">
            <span>💰 Pendências Financeiras</span>
            <Select value={anoSelecionado.toString()} onValueChange={(value) => setAnoSelecionado(parseInt(value))}>
              <SelectTrigger className="w-24">
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
            ? `🚨 ${filteredMentorados.length} pessoa(s) em atraso • ${formatCurrency(filteredMentorados.reduce((sum, m) => sum + m.totalPendente, 0))} em atraso`
            : `${filteredMentorados.length} com pendências • ${formatCurrency(metricas.totalPendente)} total pendente`
        }
      />

      <main className="p-6 space-y-6">
        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Pendente</p>
                  <p className="text-2xl font-semibold text-destructive">
                    {formatCurrency(metricas.totalPendente)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {metricas.comPendencias} pessoa(s)
                  </p>
                </div>
                <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Em Atraso</p>
                  <p className="text-2xl font-semibold text-destructive">
                    {formatCurrency(metricas.valorAtrasado)}
                  </p>
                  <p className="text-sm text-destructive mt-1">
                    {metricas.pessoasEmAtraso} pessoa(s)
                  </p>
                </div>
                <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center relative">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  {metricas.pessoasEmAtraso > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse"></div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => setMostrarApenasAtrasados(!mostrarApenasAtrasados)}
              >
                {mostrarApenasAtrasados ? '✅ Mostrando Atrasados' : '🔍 Ver Atrasados'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vence Hoje</p>
                  <p className="text-2xl font-semibold text-primary">
                    {formatCurrency(metricas.vencimentosHoje)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Comissões Pendentes</p>
                  <p className="text-2xl font-semibold text-secondary-foreground">
                    {formatCurrency(metricas.totalComissoes)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {comissoesPendentes.length} pessoa(s)
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Ações */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
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
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Dívida
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Adicionar Nova Dívida</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Mentorado</Label>
                      <Select value={selectedMentorado} onValueChange={setSelectedMentorado}>
                        <SelectTrigger className="mt-1">
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
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Data de Vencimento</Label>
                      <Input
                        type="date"
                        value={dataVencimento}
                        onChange={(e) => setDataVencimento(e.target.value)}
                        className="mt-1"
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
            </div>
          </CardContent>
        </Card>

        {/* Lista de Pendências */}
        <div className="space-y-4">
          {mostrarApenasAtrasados && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
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
                    onClick={() => setMostrarApenasAtrasados(false)}
                    className="text-red-600 hover:bg-red-100"
                  >
                    ✖️ Limpar filtro
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {filteredMentorados.map((mentorado) => {
            const dividasPendentes = mentorado.dividas.filter(d => d.status === 'pendente')
            const gruposPorMes = MESES.reduce((grupos, mes) => {
              grupos[mes.numero] = dividasPendentes.filter(d =>
                new Date(d.data_vencimento).getMonth() + 1 === mes.numero
              )
              return grupos
            }, {} as { [key: number]: Divida[] })

            return (
              <Card key={mentorado.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>
                          {mentorado.nome_completo}
                        </CardTitle>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{mentorado.turma}</span>
                          <span>•</span>
                          <span>{mentorado.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold text-destructive">
                        {formatCurrency(mentorado.totalPendente)}
                      </div>
                      <Badge variant="secondary">
                        {mentorado.totalDividas} dívida(s)
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                {dividasPendentes.length > 0 && (
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {MESES.map((mes) => {
                        const dividasDoMes = gruposPorMes[mes.numero] || []

                        if (dividasDoMes.length === 0) {
                          return (
                            <div key={mes.numero} className="text-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                              <p className="text-xs text-gray-500 font-medium">
                                {mes.abrev}
                              </p>
                              <p className="text-xs text-gray-400">-</p>
                            </div>
                          )
                        }

                        const valorTotal = dividasDoMes.reduce((sum, d) => sum + d.valor, 0)
                        const primeiraData = dividasDoMes[0].data_vencimento
                        const diasRestantes = calcularDiasRestantes(primeiraData)
                        const status = getStatusDivida(diasRestantes)

                        return (
                          <div key={mes.numero} className={`relative text-center p-3 rounded-lg border group ${status.color}`}>
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

                            <p className="text-xs font-medium">
                              {mes.abrev}
                              {dividasDoMes.length > 1 && <span> ({dividasDoMes.length})</span>}
                            </p>

                            <p className="text-sm font-bold mt-1">
                              {formatCurrency(valorTotal)}
                            </p>

                            <p className="text-xs mt-1">
                              📅 {new Date(primeiraData + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </p>

                            <Badge variant="outline" className="text-xs mt-2">
                              {status.label}
                            </Badge>
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
          <Card>
            <CardContent className="p-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'Nenhum mentorado encontrado' : 'Nenhuma pendência cadastrada'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'Tente buscar por outro termo.' : 'As pendências financeiras aparecerão aqui quando forem cadastradas.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Modal de Pagamento */}
        <Dialog open={isModalPagamentoOpen} onOpenChange={setIsModalPagamentoOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Confirmar Pagamento
              </DialogTitle>
            </DialogHeader>
            {dividaSelecionada && (
              <div className="space-y-6">
                <div className="bg-muted p-4 rounded-xl">
                  <h4 className="font-semibold mb-2">Detalhes da Dívida</h4>
                  <p className="text-sm">
                    <span className="font-medium">Mentorado:</span> {dividaSelecionada.mentorado_nome}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Valor Original:</span> {formatCurrency(dividaSelecionada.valor)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Vencimento:</span> {new Date(dividaSelecionada.data_vencimento).toLocaleDateString('pt-BR')}
                  </p>
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
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Observações (opcional)</Label>
                    <Input
                      value={observacoesPagamento}
                      onChange={(e) => setObservacoesPagamento(e.target.value)}
                      placeholder="Adicionar observações sobre o pagamento..."
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setIsModalPagamentoOpen(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmarPagamento}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar
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
              <DialogTitle>Editar Dívida</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {editingDivida && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Editando dívida de: <strong>{editingDivida.mentorado_nome}</strong>
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
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={novaDataVencimento}
                  onChange={(e) => setNovaDataVencimento(e.target.value)}
                  className="mt-1"
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
      </main>
    </div>
  )
}