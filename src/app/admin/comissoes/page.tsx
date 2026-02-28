'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useStableData } from '@/hooks/use-stable-data'
import { useStableMutation } from '@/hooks/use-stable-mutation'
import { useAuth } from '@/contexts/auth'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search, DollarSign, Check, X, Edit, Eye, Calendar,
  User, TrendingUp, AlertCircle, Clock, Plus,
  Download, FileText, CreditCard, Users, Key, Loader2
} from 'lucide-react'
import { generateCommissionsPDF, generateCommissionPaymentList, generateAllCommissionsPaymentPDF } from '@/lib/pdf-utils'

// =======================
// Types
// =======================

interface Comissao {
  id: string
  mentorado_id: string | null
  lead_id: string | null
  valor_comissao: number
  percentual_comissao: number | null
  valor_venda: number
  data_venda: string
  data_vencimento: string | null
  data_pagamento: string | null
  observacoes: string | null
  status_pagamento: string
  created_at: string
  updated_at: string
  created_by: string | null
  organization_id: string
  third_party_user_id: string | null
  recipient_type: string | null
  recipient_name: string | null
  recipient_pix_key: string | null
  commission_type: string | null
  payment_id: string | null
  paid_at: string | null
  is_referral: boolean | null
  payment_rule: string | null
  valor_liberado: number | null
  tranche_1_paid: boolean | null
  tranche_2_paid: boolean | null
  mentorados?: {
    nome_completo: string
    email: string
    pix_chave: string | null
    pix_tipo: string | null
  } | null
  leads?: {
    nome_completo: string
    empresa: string
    valor_vendido: number
    valor_arrecadado: number | null
    valor_venda: number | null
    status: string
  } | null
}

interface Mentorado {
  id: string
  nome_completo: string
  email: string
  pix_chave: string | null
  pix_tipo: string | null
}

interface Lead {
  id: string
  nome_completo: string
  valor_venda: number | null
  status: string
}

// =======================
// Helpers
// =======================

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

function getStatusBadge(status: string | null | undefined) {
  switch (status) {
    case 'pago':
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">
          <Check className="w-3 h-3 mr-1" /> Pago
        </Badge>
      )
    case 'cancelado':
      return (
        <Badge className="bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/20">
          <X className="w-3 h-3 mr-1" /> Cancelado
        </Badge>
      )
    default:
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/20">
          <Clock className="w-3 h-3 mr-1" /> Pendente
        </Badge>
      )
  }
}

function getRecipientTypeBadge(type: string | null | undefined) {
  if (type === 'terceiro') {
    return (
      <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10 text-xs">
        Terceiro
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-sky-500/30 text-sky-400 bg-sky-500/10 text-xs">
      Mentorado
    </Badge>
  )
}

function getRecipientName(comissao: Comissao): string {
  if (comissao.recipient_type === 'terceiro') {
    return comissao.recipient_name || 'Terceiro'
  }
  return comissao.mentorados?.nome_completo || comissao.recipient_name || 'N/A'
}

function getLeadName(comissao: Comissao): string {
  return comissao.leads?.nome_completo || '-'
}

// =======================
// Main Component
// =======================

export default function ComissoesPage() {
  const { organizationId, user } = useAuth()

  // -- State --
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [typeFilter, setTypeFilter] = useState<string>('todos')

  // Modal states
  const [showNewCommission, setShowNewCommission] = useState(false)
  const [showEditCommission, setShowEditCommission] = useState(false)
  const [showViewCommission, setShowViewCommission] = useState(false)
  const [showPixManagement, setShowPixManagement] = useState(false)
  const [showStatusUpdate, setShowStatusUpdate] = useState(false)

  // Selected commission for editing/viewing
  const [selectedCommission, setSelectedCommission] = useState<Comissao | null>(null)

  // New commission form
  const [newCommissionType, setNewCommissionType] = useState<'mentorado' | 'terceiro'>('mentorado')
  const [newMentoradoId, setNewMentoradoId] = useState('')
  const [newLeadId, setNewLeadId] = useState('')
  const [newPercentual, setNewPercentual] = useState('')
  const [newValorComissao, setNewValorComissao] = useState('')
  const [newValorVenda, setNewValorVenda] = useState('')
  const [newObservacoes, setNewObservacoes] = useState('')
  const [newRecipientName, setNewRecipientName] = useState('')
  const [newRecipientPix, setNewRecipientPix] = useState('')
  const [newPaymentRule, setNewPaymentRule] = useState<'standard' | 'closer_split'>('standard')

  // Edit commission form
  const [editValorComissao, setEditValorComissao] = useState('')
  const [editPercentual, setEditPercentual] = useState('')
  const [editObservacoes, setEditObservacoes] = useState('')

  // Status update form
  const [newStatus, setNewStatus] = useState('')

  // PIX management form
  const [pixMentoradoId, setPixMentoradoId] = useState('')
  const [pixChave, setPixChave] = useState('')
  const [pixTipo, setPixTipo] = useState('')

  // Loaded resources
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loadingResources, setLoadingResources] = useState(false)
  const [savingCommission, setSavingCommission] = useState(false)
  const [savingPix, setSavingPix] = useState(false)

  // -- Data fetching --
  const {
    data: comissoes,
    loading,
    error,
    refetch,
    isRefetching,
  } = useStableData<Comissao>({
    tableName: 'comissoes',
    select: `*, mentorados:mentorado_id(nome_completo, email, pix_chave, pix_tipo), leads:lead_id(nome_completo, empresa, valor_vendido, valor_arrecadado, valor_venda, status)`,
    filters: organizationId ? { organization_id: organizationId } : {},
    dependencies: [organizationId],
    autoLoad: true,
    debounceMs: 300,
  })

  // -- Mutations --
  const updateMutation = useStableMutation('comissoes', 'update', {
    onSuccess: () => refetch(),
    debounceMs: 0,
  })

  // -- Load mentorados and leads for modal dropdowns --
  const loadResources = useCallback(async () => {
    if (!organizationId) return
    setLoadingResources(true)
    try {
      const [mentoradosRes, leadsRes] = await Promise.all([
        supabase
          .from('mentorados')
          .select('id, nome_completo, email, pix_chave, pix_tipo')
          .eq('organization_id', organizationId),
        supabase
          .from('leads')
          .select('id, nome_completo, valor_venda, status')
          .eq('organization_id', organizationId)
          .in('status', ['fechado_ganho']),
      ])
      setMentorados(mentoradosRes.data || [])
      setLeads(leadsRes.data || [])
    } catch (err) {
      console.error('Erro ao carregar recursos:', err)
    } finally {
      setLoadingResources(false)
    }
  }, [organizationId])

  useEffect(() => {
    if (organizationId) {
      loadResources()
    }
  }, [organizationId, loadResources])

  // -- Filtered commissions --
  const filteredComissoes = useMemo(() => {
    return comissoes.filter((c) => {
      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const recipientName = getRecipientName(c).toLowerCase()
        const leadName = getLeadName(c).toLowerCase()
        const obs = (c.observacoes || '').toLowerCase()
        if (
          !recipientName.includes(term) &&
          !leadName.includes(term) &&
          !obs.includes(term)
        ) {
          return false
        }
      }
      // Status filter
      if (statusFilter !== 'todos' && c.status_pagamento !== statusFilter) {
        return false
      }
      // Type filter
      if (typeFilter !== 'todos') {
        const effectiveType = c.recipient_type || 'mentorado'
        if (effectiveType !== typeFilter) return false
      }
      return true
    })
  }, [comissoes, searchTerm, statusFilter, typeFilter])

  // -- KPI calculations --
  const kpis = useMemo(() => {
    const total = comissoes.reduce((sum, c) => sum + (c.valor_comissao || 0), 0)
    const pago = comissoes
      .filter((c) => c.status_pagamento === 'pago')
      .reduce((sum, c) => sum + (c.valor_comissao || 0), 0)
    const pendente = comissoes
      .filter((c) => c.status_pagamento === 'pendente' || !c.status_pagamento)
      .reduce((sum, c) => sum + (c.valor_comissao || 0), 0)
    const media = comissoes.length > 0 ? total / comissoes.length : 0
    return { total, pago, pendente, media, count: comissoes.length }
  }, [comissoes])

  // =======================
  // Handlers
  // =======================

  // -- Create commission --
  const handleCreateCommission = useCallback(async () => {
    if (!organizationId || !user) return
    setSavingCommission(true)
    try {
      const baseData: Record<string, any> = {
        organization_id: organizationId,
        created_by: user.id,
        status_pagamento: 'pendente',
        data_venda: new Date().toISOString(),
        observacoes: newObservacoes || null,
      }

      if (newCommissionType === 'mentorado') {
        if (!newMentoradoId) {
          alert('Selecione um mentorado.')
          setSavingCommission(false)
          return
        }
        const selectedLead = leads.find((l) => l.id === newLeadId)
        const saleValue = newValorVenda
          ? parseFloat(newValorVenda)
          : selectedLead?.valor_venda || 0
        const pct = parseFloat(newPercentual) || 0
        const comVal = newValorComissao
          ? parseFloat(newValorComissao)
          : (saleValue * pct) / 100

        const mentorado = mentorados.find((m) => m.id === newMentoradoId)

        Object.assign(baseData, {
          mentorado_id: newMentoradoId,
          lead_id: newLeadId || null,
          valor_venda: saleValue,
          percentual_comissao: pct || null,
          valor_comissao: comVal,
          recipient_type: 'mentorado',
          recipient_name: mentorado?.nome_completo || null,
          recipient_pix_key: mentorado?.pix_chave || null,
          commission_type: 'lead',
          payment_rule: newPaymentRule,
          valor_liberado: newPaymentRule === 'closer_split' ? 0 : comVal,
          tranche_1_paid: false,
          tranche_2_paid: false,
        })
      } else {
        // Terceiro
        if (!newRecipientName) {
          alert('Informe o nome do terceiro.')
          setSavingCommission(false)
          return
        }
        const comVal = parseFloat(newValorComissao) || 0
        if (comVal <= 0) {
          alert('Informe o valor da comissao.')
          setSavingCommission(false)
          return
        }
        Object.assign(baseData, {
          mentorado_id: null,
          lead_id: null,
          valor_venda: parseFloat(newValorVenda) || comVal,
          percentual_comissao: null,
          valor_comissao: comVal,
          recipient_type: 'terceiro',
          recipient_name: newRecipientName,
          recipient_pix_key: newRecipientPix || null,
          commission_type: 'third_party',
        })
      }

      const { error: insertError } = await supabase
        .from('comissoes')
        .insert(baseData)

      if (insertError) throw insertError

      // Reset form
      setNewCommissionType('mentorado')
      setNewMentoradoId('')
      setNewLeadId('')
      setNewPercentual('')
      setNewValorComissao('')
      setNewValorVenda('')
      setNewObservacoes('')
      setNewRecipientName('')
      setNewRecipientPix('')
      setNewPaymentRule('standard')
      setShowNewCommission(false)
      refetch()
    } catch (err: any) {
      console.error('Erro ao criar comissao:', err)
      alert('Erro ao criar comissao: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setSavingCommission(false)
    }
  }, [
    organizationId, user, newCommissionType, newMentoradoId, newLeadId,
    newPercentual, newValorComissao, newValorVenda, newObservacoes,
    newRecipientName, newRecipientPix, newPaymentRule, mentorados, leads, refetch,
  ])

  // -- Edit commission --
  const handleEditCommission = useCallback(async () => {
    if (!selectedCommission) return
    try {
      await updateMutation.mutate({
        id: selectedCommission.id,
        valor_comissao: parseFloat(editValorComissao) || selectedCommission.valor_comissao,
        percentual_comissao: editPercentual ? parseFloat(editPercentual) : selectedCommission.percentual_comissao,
        observacoes: editObservacoes,
        updated_at: new Date().toISOString(),
      })
      setShowEditCommission(false)
      setSelectedCommission(null)
    } catch (err: any) {
      console.error('Erro ao editar comissao:', err)
      alert('Erro ao editar comissao.')
    }
  }, [selectedCommission, editValorComissao, editPercentual, editObservacoes, updateMutation])

  // -- Update payment status --
  const handleUpdateStatus = useCallback(async () => {
    if (!selectedCommission || !newStatus) return
    try {
      const updateData: Record<string, any> = {
        id: selectedCommission.id,
        status_pagamento: newStatus,
        updated_at: new Date().toISOString(),
      }
      if (newStatus === 'pago') {
        updateData.paid_at = new Date().toISOString()
        updateData.data_pagamento = new Date().toISOString()
      }
      await updateMutation.mutate(updateData)
      setShowStatusUpdate(false)
      setSelectedCommission(null)
      setNewStatus('')
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err)
    }
  }, [selectedCommission, newStatus, updateMutation])

  // -- Pay tranche (closer_split) --
  const handlePayTranche = useCallback(async (comissao: Comissao, tranche: 1 | 2) => {
    try {
      const halfValue = (comissao.valor_comissao || 0) / 2
      const currentLiberado = comissao.valor_liberado || 0

      if (tranche === 1) {
        await updateMutation.mutate({
          id: comissao.id,
          tranche_1_paid: true,
          valor_liberado: currentLiberado + halfValue,
          updated_at: new Date().toISOString(),
        })
      } else {
        // Tranche 2 - pay remaining and mark as fully paid
        await updateMutation.mutate({
          id: comissao.id,
          tranche_2_paid: true,
          valor_liberado: comissao.valor_comissao || 0,
          status_pagamento: 'pago',
          paid_at: new Date().toISOString(),
          data_pagamento: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    } catch (err: any) {
      console.error('Erro ao pagar parcela:', err)
    }
  }, [updateMutation])

  // -- Mark as paid shortcut --
  const handleMarkPaid = useCallback(async (comissao: Comissao) => {
    try {
      // For closer_split, guide user to use tranche payments
      if (comissao.payment_rule === 'closer_split') {
        if (!comissao.tranche_1_paid) {
          await handlePayTranche(comissao, 1)
        } else if (!comissao.tranche_2_paid) {
          await handlePayTranche(comissao, 2)
        }
        return
      }
      await updateMutation.mutate({
        id: comissao.id,
        status_pagamento: 'pago',
        paid_at: new Date().toISOString(),
        data_pagamento: new Date().toISOString(),
        valor_liberado: comissao.valor_comissao || 0,
        updated_at: new Date().toISOString(),
      })
    } catch (err: any) {
      console.error('Erro ao marcar como pago:', err)
    }
  }, [updateMutation, handlePayTranche])

  // -- Save PIX for mentorado --
  const handleSavePix = useCallback(async () => {
    if (!pixMentoradoId || !pixChave || !pixTipo) {
      alert('Preencha todos os campos.')
      return
    }
    setSavingPix(true)
    try {
      const { error: updateError } = await supabase
        .from('mentorados')
        .update({ pix_chave: pixChave, pix_tipo: pixTipo })
        .eq('id', pixMentoradoId)

      if (updateError) throw updateError

      // Refresh mentorados list
      await loadResources()
      setPixMentoradoId('')
      setPixChave('')
      setPixTipo('')
      setShowPixManagement(false)
      refetch()
    } catch (err: any) {
      console.error('Erro ao salvar PIX:', err)
      alert('Erro ao salvar chave PIX: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setSavingPix(false)
    }
  }, [pixMentoradoId, pixChave, pixTipo, loadResources, refetch])

  // -- Open edit modal --
  const openEditModal = useCallback((comissao: Comissao) => {
    setSelectedCommission(comissao)
    setEditValorComissao(String(comissao.valor_comissao || ''))
    setEditPercentual(String(comissao.percentual_comissao || ''))
    setEditObservacoes(comissao.observacoes || '')
    setShowEditCommission(true)
  }, [])

  // -- Open view modal --
  const openViewModal = useCallback((comissao: Comissao) => {
    setSelectedCommission(comissao)
    setShowViewCommission(true)
  }, [])

  // -- Open status modal --
  const openStatusModal = useCallback((comissao: Comissao) => {
    setSelectedCommission(comissao)
    setNewStatus(comissao.status_pagamento || 'pendente')
    setShowStatusUpdate(true)
  }, [])

  // -- Open PIX modal with mentorado preselected --
  const openPixModal = useCallback((mentorado?: Mentorado) => {
    if (mentorado) {
      setPixMentoradoId(mentorado.id)
      setPixChave(mentorado.pix_chave || '')
      setPixTipo(mentorado.pix_tipo || '')
    } else {
      setPixMentoradoId('')
      setPixChave('')
      setPixTipo('')
    }
    setShowPixManagement(true)
  }, [])

  // -- When lead is selected, auto-fill sale value --
  useEffect(() => {
    if (newLeadId) {
      const lead = leads.find((l) => l.id === newLeadId)
      if (lead?.valor_venda) {
        setNewValorVenda(String(lead.valor_venda))
      }
    }
  }, [newLeadId, leads])

  // -- Auto-calculate commission value when percentage or sale value changes --
  useEffect(() => {
    if (newCommissionType === 'mentorado' && newPercentual && newValorVenda) {
      const pct = parseFloat(newPercentual)
      const venda = parseFloat(newValorVenda)
      if (!isNaN(pct) && !isNaN(venda) && pct > 0 && venda > 0) {
        setNewValorComissao(((venda * pct) / 100).toFixed(2))
      }
    }
  }, [newPercentual, newValorVenda, newCommissionType])

  // =======================
  // PDF Export Handlers
  // =======================

  const handleExportPDF = useCallback(() => {
    const pdfData = filteredComissoes.map((c) => ({
      user_name: getRecipientName(c),
      user_pix_key: c.recipient_pix_key || c.mentorados?.pix_chave || '-',
      amount: c.valor_comissao || 0,
      description: c.observacoes || '',
      status: c.status_pagamento === 'pago' ? 'paid' : c.status_pagamento === 'cancelado' ? 'cancelled' : 'pending',
      created_at: c.created_at,
      paid_at: c.paid_at || undefined,
    }))
    generateCommissionsPDF(pdfData, { status: statusFilter === 'todos' ? 'all' : statusFilter })
  }, [filteredComissoes, statusFilter])

  const handleExportPaymentList = useCallback(() => {
    const pdfData = filteredComissoes
      .filter((c) => c.status_pagamento === 'pendente' || !c.status_pagamento)
      .map((c) => ({
        user_name: getRecipientName(c),
        user_pix_key: c.recipient_pix_key || c.mentorados?.pix_chave || '-',
        amount: c.valor_comissao || 0,
        description: c.observacoes || '',
        status: 'pending' as const,
        created_at: c.created_at,
      }))
    generateCommissionPaymentList(pdfData)
  }, [filteredComissoes])

  const handleExportAllPaymentsPDF = useCallback(() => {
    const items = filteredComissoes
      .filter((c) => c.status_pagamento === 'pendente' || !c.status_pagamento)
      .map((c) => ({
        nome: getRecipientName(c),
        pix_key: c.recipient_pix_key || c.mentorados?.pix_chave || '',
        valor: c.valor_comissao || 0,
        tipo: (c.recipient_type === 'terceiro' ? 'terceiro' : 'mentorado') as 'mentorado' | 'terceiro',
        descricao: c.observacoes || undefined,
      }))
    generateAllCommissionsPaymentPDF(items)
  }, [filteredComissoes])

  // =======================
  // Render
  // =======================

  if (!organizationId) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="text-white/40 text-lg">Carregando organizacao...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ======================= */}
        {/* Header */}
        {/* ======================= */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Comissoes</h1>
            <p className="text-white/40 text-sm mt-1">
              Gerencie comissoes de mentorados e terceiros
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => openPixModal()}
              variant="outline"
              className="border-white/[0.06] bg-[#1a1a1e] text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <Key className="w-4 h-4 mr-2" />
              PIX Mentorados
            </Button>
            <Button
              onClick={() => setShowNewCommission(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Comissao
            </Button>
          </div>
        </div>

        {/* ======================= */}
        {/* KPI Cards */}
        {/* ======================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#1a1a1e] border-white/[0.06]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
                    Total Comissoes
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatCurrency(kpis.total)}
                  </p>
                  <p className="text-xs text-white/30 mt-1">{kpis.count} comissoes</p>
                </div>
                <div className="p-3 rounded-xl bg-sky-500/10">
                  <DollarSign className="w-5 h-5 text-sky-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1e] border-white/[0.06]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
                    Total Pago
                  </p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">
                    {formatCurrency(kpis.pago)}
                  </p>
                  <p className="text-xs text-white/30 mt-1">
                    {comissoes.filter((c) => c.status_pagamento === 'pago').length} pagas
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1e] border-white/[0.06]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
                    Total Pendente
                  </p>
                  <p className="text-2xl font-bold text-amber-400 mt-1">
                    {formatCurrency(kpis.pendente)}
                  </p>
                  <p className="text-xs text-white/30 mt-1">
                    {comissoes.filter((c) => c.status_pagamento === 'pendente' || !c.status_pagamento).length} pendentes
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1e] border-white/[0.06]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
                    Media por Comissao
                  </p>
                  <p className="text-2xl font-bold text-purple-400 mt-1">
                    {formatCurrency(kpis.media)}
                  </p>
                  <p className="text-xs text-white/30 mt-1">valor medio</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ======================= */}
        {/* Filters & Search */}
        {/* ======================= */}
        <Card className="bg-[#1a1a1e] border-white/[0.06]">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {/* Search */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  placeholder="Buscar por nome, lead, observacao..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#0a0a0c] border-white/[0.06] text-white placeholder:text-white/30 focus-visible:ring-white/20"
                />
              </div>

              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px] bg-[#0a0a0c] border-white/[0.06] text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1e] border-white/[0.06]">
                  <SelectItem value="todos" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Todos</SelectItem>
                  <SelectItem value="pendente" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Pendente</SelectItem>
                  <SelectItem value="pago" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Pago</SelectItem>
                  <SelectItem value="cancelado" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              {/* Type filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[160px] bg-[#0a0a0c] border-white/[0.06] text-white">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1e] border-white/[0.06]">
                  <SelectItem value="todos" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Todos</SelectItem>
                  <SelectItem value="mentorado" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Mentorado</SelectItem>
                  <SelectItem value="terceiro" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Terceiro</SelectItem>
                </SelectContent>
              </Select>

              {/* PDF Exports */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  className="border-white/[0.06] bg-[#0a0a0c] text-white/60 hover:bg-white/[0.06] hover:text-white"
                  title="Exportar relatorio PDF"
                >
                  <FileText className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPaymentList}
                  className="border-white/[0.06] bg-[#0a0a0c] text-white/60 hover:bg-white/[0.06] hover:text-white"
                  title="Lista de pagamentos pendentes"
                >
                  <CreditCard className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAllPaymentsPDF}
                  className="border-white/[0.06] bg-[#0a0a0c] text-white/60 hover:bg-white/[0.06] hover:text-white"
                  title="PDF geral de pagamentos"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ======================= */}
        {/* Commission Table */}
        {/* ======================= */}
        <Card className="bg-[#1a1a1e] border-white/[0.06] overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
                <span className="ml-3 text-white/40">Carregando comissoes...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-20 text-red-400">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span>Erro ao carregar: {error}</span>
              </div>
            ) : filteredComissoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/30">
                <DollarSign className="w-10 h-10 mb-3 text-white/20" />
                <p className="text-base">Nenhuma comissao encontrada</p>
                <p className="text-sm mt-1">Crie uma nova comissao para comecar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/40 font-medium text-xs uppercase tracking-wider">
                        Beneficiario
                      </TableHead>
                      <TableHead className="text-white/40 font-medium text-xs uppercase tracking-wider">
                        Tipo
                      </TableHead>
                      <TableHead className="text-white/40 font-medium text-xs uppercase tracking-wider">
                        Lead
                      </TableHead>
                      <TableHead className="text-white/40 font-medium text-xs uppercase tracking-wider text-right">
                        Valor Venda
                      </TableHead>
                      <TableHead className="text-white/40 font-medium text-xs uppercase tracking-wider text-right">
                        Comissao
                      </TableHead>
                      <TableHead className="text-white/40 font-medium text-xs uppercase tracking-wider">
                        Status
                      </TableHead>
                      <TableHead className="text-white/40 font-medium text-xs uppercase tracking-wider">
                        Data
                      </TableHead>
                      <TableHead className="text-white/40 font-medium text-xs uppercase tracking-wider text-right">
                        Acoes
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComissoes.map((comissao) => (
                      <TableRow
                        key={comissao.id}
                        className="border-white/[0.06] hover:bg-white/[0.02] transition-colors"
                      >
                        <TableCell className="text-white font-medium">
                          {getRecipientName(comissao)}
                        </TableCell>
                        <TableCell>{getRecipientTypeBadge(comissao.recipient_type)}</TableCell>
                        <TableCell className="text-white/60">{getLeadName(comissao)}</TableCell>
                        <TableCell className="text-right text-white/60">
                          {formatCurrency(comissao.valor_venda)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-semibold text-white">
                              {formatCurrency(comissao.valor_comissao)}
                            </span>
                            {comissao.payment_rule === 'closer_split' && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-white/30">
                                  Liberado: {formatCurrency(comissao.valor_liberado)}
                                </span>
                                <div className="flex gap-0.5">
                                  <div className={`h-1.5 w-3 rounded-full ${comissao.tranche_1_paid ? 'bg-emerald-500' : 'bg-white/10'}`} title="1a parcela (50%)" />
                                  <div className={`h-1.5 w-3 rounded-full ${comissao.tranche_2_paid ? 'bg-emerald-500' : 'bg-white/10'}`} title="2a parcela (50%)" />
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(comissao.status_pagamento)}</TableCell>
                        <TableCell className="text-white/40 text-sm">
                          {formatDate(comissao.data_venda)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openViewModal(comissao)}
                              className="text-white/40 hover:text-white hover:bg-white/[0.06] h-8 w-8 p-0"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(comissao)}
                              className="text-white/40 hover:text-white hover:bg-white/[0.06] h-8 w-8 p-0"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openStatusModal(comissao)}
                              className="text-white/40 hover:text-white hover:bg-white/[0.06] h-8 w-8 p-0"
                              title="Alterar status"
                            >
                              <AlertCircle className="w-4 h-4" />
                            </Button>
                            {(comissao.status_pagamento === 'pendente' || !comissao.status_pagamento) && (
                              comissao.payment_rule === 'closer_split' ? (
                                <>
                                  {!comissao.tranche_1_paid && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handlePayTranche(comissao, 1)}
                                      className="text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 h-8 px-2 text-[10px] font-medium"
                                      title="Pagar 1a parcela (50%)"
                                    >
                                      50%
                                    </Button>
                                  )}
                                  {comissao.tranche_1_paid && !comissao.tranche_2_paid && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handlePayTranche(comissao, 2)}
                                      className="text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 h-8 px-2 text-[10px] font-medium"
                                      title="Pagar 2a parcela (50%) e finalizar"
                                    >
                                      100%
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkPaid(comissao)}
                                  className="text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 h-8 w-8 p-0"
                                  title="Marcar como pago"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          {/* Table footer with count */}
          {!loading && filteredComissoes.length > 0 && (
            <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
              <p className="text-xs text-white/30">
                Mostrando {filteredComissoes.length} de {comissoes.length} comissoes
              </p>
              {isRefetching && (
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Atualizando...
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ======================= */}
        {/* NEW COMMISSION MODAL */}
        {/* ======================= */}
        <Dialog open={showNewCommission} onOpenChange={setShowNewCommission}>
          <DialogContent className="bg-[#1a1a1e] border-white/[0.06] text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-white">
                Nova Comissao
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Type toggle */}
              <div className="space-y-2">
                <Label className="text-white/60 text-sm">Tipo de Comissao</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCommissionType('mentorado')}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      newCommissionType === 'mentorado'
                        ? 'bg-sky-600 text-white'
                        : 'bg-[#0a0a0c] text-white/40 border border-white/[0.06] hover:text-white/60'
                    }`}
                  >
                    <User className="w-4 h-4 inline mr-2" />
                    De Lead (Mentorado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCommissionType('terceiro')}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      newCommissionType === 'terceiro'
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#0a0a0c] text-white/40 border border-white/[0.06] hover:text-white/60'
                    }`}
                  >
                    <Users className="w-4 h-4 inline mr-2" />
                    Terceiro
                  </button>
                </div>
              </div>

              {newCommissionType === 'mentorado' ? (
                <>
                  {/* Mentorado selection */}
                  <div className="space-y-2">
                    <Label className="text-white/60 text-sm">Mentorado *</Label>
                    <Select value={newMentoradoId} onValueChange={setNewMentoradoId}>
                      <SelectTrigger className="bg-[#0a0a0c] border-white/[0.06] text-white">
                        <SelectValue placeholder="Selecione o mentorado" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1e] border-white/[0.06] max-h-60">
                        {mentorados.map((m) => (
                          <SelectItem
                            key={m.id}
                            value={m.id}
                            className="text-white/70 focus:bg-white/[0.06] focus:text-white"
                          >
                            {m.nome_completo}
                            {m.pix_chave ? ' (PIX configurado)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lead selection */}
                  <div className="space-y-2">
                    <Label className="text-white/60 text-sm">Lead (Venda)</Label>
                    <Select value={newLeadId} onValueChange={setNewLeadId}>
                      <SelectTrigger className="bg-[#0a0a0c] border-white/[0.06] text-white">
                        <SelectValue placeholder="Selecione o lead (opcional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1e] border-white/[0.06] max-h-60">
                        {leads.map((l) => (
                          <SelectItem
                            key={l.id}
                            value={l.id}
                            className="text-white/70 focus:bg-white/[0.06] focus:text-white"
                          >
                            {l.nome_completo} {l.valor_venda ? `- ${formatCurrency(l.valor_venda)}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sale value and percentage */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-white/60 text-sm">Valor da Venda (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newValorVenda}
                        onChange={(e) => setNewValorVenda(e.target.value)}
                        placeholder="0,00"
                        className="bg-[#0a0a0c] border-white/[0.06] text-white placeholder:text-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/60 text-sm">Percentual (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={newPercentual}
                        onChange={(e) => setNewPercentual(e.target.value)}
                        placeholder="10"
                        className="bg-[#0a0a0c] border-white/[0.06] text-white placeholder:text-white/20"
                      />
                    </div>
                  </div>

                  {/* Commission value */}
                  <div className="space-y-2">
                    <Label className="text-white/60 text-sm">
                      Valor da Comissao (R$)
                      <span className="text-white/20 ml-2">auto-calculado ou manual</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newValorComissao}
                      onChange={(e) => setNewValorComissao(e.target.value)}
                      placeholder="0,00"
                      className="bg-[#0a0a0c] border-white/[0.06] text-white placeholder:text-white/20"
                    />
                  </div>

                  {/* Payment Rule */}
                  <div className="space-y-2">
                    <Label className="text-white/60 text-sm">Regra de Pagamento</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewPaymentRule('standard')}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          newPaymentRule === 'standard'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#0a0a0c] text-white/40 border border-white/[0.06] hover:text-white/60'
                        }`}
                      >
                        Padrao (integral)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewPaymentRule('closer_split')}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          newPaymentRule === 'closer_split'
                            ? 'bg-amber-600 text-white'
                            : 'bg-[#0a0a0c] text-white/40 border border-white/[0.06] hover:text-white/60'
                        }`}
                      >
                        Closer/SDR (50/50)
                      </button>
                    </div>
                    {newPaymentRule === 'closer_split' && (
                      <p className="text-[10px] text-amber-400/60 bg-amber-500/5 rounded px-2 py-1.5 border border-amber-500/10">
                        50% da comissao liberado quando cliente pagar &ge; 50% da venda. Restante quando pagar 100%.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Third-party name */}
                  <div className="space-y-2">
                    <Label className="text-white/60 text-sm">Nome do Terceiro *</Label>
                    <Input
                      value={newRecipientName}
                      onChange={(e) => setNewRecipientName(e.target.value)}
                      placeholder="Nome completo"
                      className="bg-[#0a0a0c] border-white/[0.06] text-white placeholder:text-white/20"
                    />
                  </div>

                  {/* PIX key */}
                  <div className="space-y-2">
                    <Label className="text-white/60 text-sm">Chave PIX</Label>
                    <Input
                      value={newRecipientPix}
                      onChange={(e) => setNewRecipientPix(e.target.value)}
                      placeholder="CPF, email, telefone ou chave aleatoria"
                      className="bg-[#0a0a0c] border-white/[0.06] text-white placeholder:text-white/20"
                    />
                  </div>

                  {/* Value */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-white/60 text-sm">Valor da Venda (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newValorVenda}
                        onChange={(e) => setNewValorVenda(e.target.value)}
                        placeholder="0,00"
                        className="bg-[#0a0a0c] border-white/[0.06] text-white placeholder:text-white/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/60 text-sm">Valor da Comissao (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newValorComissao}
                        onChange={(e) => setNewValorComissao(e.target.value)}
                        placeholder="0,00"
                        className="bg-[#0a0a0c] border-white/[0.06] text-white placeholder:text-white/20"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Observations (both types) */}
              <div className="space-y-2">
                <Label className="text-white/60 text-sm">Observacoes</Label>
                <Textarea
                  value={newObservacoes}
                  onChange={(e) => setNewObservacoes(e.target.value)}
                  placeholder="Observacoes sobre a comissao..."
                  rows={3}
                  className="bg-[#0a0a0c] border-white/[0.06] text-white placeholder:text-white/20 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewCommission(false)}
                  className="border-white/[0.06] text-white/60 hover:bg-white/[0.06] hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateCommission}
                  disabled={savingCommission}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {savingCommission ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Comissao
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ======================= */}
        {/* VIEW COMMISSION MODAL */}
        {/* ======================= */}
        <Dialog open={showViewCommission} onOpenChange={setShowViewCommission}>
          <DialogContent className="bg-[#1a1a1e] border-white/[0.06] text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-white">
                Detalhes da Comissao
              </DialogTitle>
            </DialogHeader>

            {selectedCommission && (
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Beneficiario</p>
                    <p className="text-white font-medium mt-1">
                      {getRecipientName(selectedCommission)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Tipo</p>
                    <div className="mt-1">{getRecipientTypeBadge(selectedCommission.recipient_type)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Lead</p>
                    <p className="text-white/70 mt-1">{getLeadName(selectedCommission)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedCommission.status_pagamento)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Valor da Venda</p>
                    <p className="text-white/70 mt-1">{formatCurrency(selectedCommission.valor_venda)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Percentual</p>
                    <p className="text-white/70 mt-1">
                      {selectedCommission.percentual_comissao
                        ? `${selectedCommission.percentual_comissao}%`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Valor Comissao</p>
                    <p className="text-lg font-bold text-emerald-400 mt-1">
                      {formatCurrency(selectedCommission.valor_comissao)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Data da Venda</p>
                    <p className="text-white/70 mt-1">{formatDate(selectedCommission.data_venda)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Chave PIX</p>
                    <p className="text-white/70 mt-1 break-all">
                      {selectedCommission.recipient_pix_key ||
                        selectedCommission.mentorados?.pix_chave ||
                        'Nao informada'}
                    </p>
                  </div>
                  {selectedCommission.paid_at && (
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider">Pago em</p>
                      <p className="text-emerald-400/70 mt-1">{formatDate(selectedCommission.paid_at)}</p>
                    </div>
                  )}
                </div>

                {/* Closer Split Details */}
                {selectedCommission.payment_rule === 'closer_split' && (
                  <div className="bg-[#0a0a0c] rounded-lg p-4 border border-white/[0.06] space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-xs">
                        Regra Closer/SDR
                      </Badge>
                      <span className="text-white/30 text-xs">Pagamento em 2 parcelas</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className={`rounded-lg p-3 border ${selectedCommission.tranche_1_paid ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/[0.06]'}`}>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">1a Parcela (50%)</p>
                        <p className={`text-sm font-bold mt-1 ${selectedCommission.tranche_1_paid ? 'text-emerald-400' : 'text-white/40'}`}>
                          {formatCurrency((selectedCommission.valor_comissao || 0) / 2)}
                        </p>
                        <p className={`text-[10px] mt-1 ${selectedCommission.tranche_1_paid ? 'text-emerald-400/60' : 'text-white/20'}`}>
                          {selectedCommission.tranche_1_paid ? 'Pago' : 'Aguardando cliente pagar >= 50%'}
                        </p>
                      </div>
                      <div className={`rounded-lg p-3 border ${selectedCommission.tranche_2_paid ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/[0.06]'}`}>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">2a Parcela (50%)</p>
                        <p className={`text-sm font-bold mt-1 ${selectedCommission.tranche_2_paid ? 'text-emerald-400' : 'text-white/40'}`}>
                          {formatCurrency((selectedCommission.valor_comissao || 0) / 2)}
                        </p>
                        <p className={`text-[10px] mt-1 ${selectedCommission.tranche_2_paid ? 'text-emerald-400/60' : 'text-white/20'}`}>
                          {selectedCommission.tranche_2_paid ? 'Pago' : 'Aguardando cliente pagar 100%'}
                        </p>
                      </div>
                    </div>

                    {/* Client payment progress */}
                    {selectedCommission.leads && (
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Pagamento do Cliente</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-sky-500 rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, ((selectedCommission.leads.valor_arrecadado || 0) / (selectedCommission.leads.valor_venda || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-white/50">
                            {Math.round(((selectedCommission.leads.valor_arrecadado || 0) / (selectedCommission.leads.valor_venda || 1)) * 100)}%
                          </span>
                        </div>
                        <p className="text-[10px] text-white/30 mt-1">
                          {formatCurrency(selectedCommission.leads.valor_arrecadado)} de {formatCurrency(selectedCommission.leads.valor_venda)}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Total Liberado</p>
                      <p className="text-lg font-bold text-emerald-400">
                        {formatCurrency(selectedCommission.valor_liberado)}
                        <span className="text-white/30 text-xs font-normal ml-2">
                          de {formatCurrency(selectedCommission.valor_comissao)}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {selectedCommission.observacoes && (
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Observacoes</p>
                    <p className="text-white/60 mt-1 text-sm bg-[#0a0a0c] rounded-lg p-3 border border-white/[0.06]">
                      {selectedCommission.observacoes}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowViewCommission(false)}
                    className="border-white/[0.06] text-white/60 hover:bg-white/[0.06] hover:text-white"
                  >
                    Fechar
                  </Button>
                  <Button
                    onClick={() => {
                      setShowViewCommission(false)
                      openEditModal(selectedCommission)
                    }}
                    variant="outline"
                    className="border-white/[0.06] text-white/60 hover:bg-white/[0.06] hover:text-white"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ======================= */}
        {/* EDIT COMMISSION MODAL */}
        {/* ======================= */}
        <Dialog open={showEditCommission} onOpenChange={setShowEditCommission}>
          <DialogContent className="bg-[#1a1a1e] border-white/[0.06] text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-white">
                Editar Comissao
              </DialogTitle>
            </DialogHeader>

            {selectedCommission && (
              <div className="space-y-4 mt-2">
                <div className="bg-[#0a0a0c] rounded-lg p-3 border border-white/[0.06]">
                  <p className="text-xs text-white/40">Beneficiario</p>
                  <p className="text-white font-medium">{getRecipientName(selectedCommission)}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-white/60 text-sm">Valor da Comissao (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editValorComissao}
                      onChange={(e) => setEditValorComissao(e.target.value)}
                      className="bg-[#0a0a0c] border-white/[0.06] text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/60 text-sm">Percentual (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editPercentual}
                      onChange={(e) => setEditPercentual(e.target.value)}
                      className="bg-[#0a0a0c] border-white/[0.06] text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/60 text-sm">Observacoes</Label>
                  <Textarea
                    value={editObservacoes}
                    onChange={(e) => setEditObservacoes(e.target.value)}
                    rows={3}
                    className="bg-[#0a0a0c] border-white/[0.06] text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditCommission(false)}
                    className="border-white/[0.06] text-white/60 hover:bg-white/[0.06] hover:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleEditCommission}
                    disabled={updateMutation.isLoading}
                    className="bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    {updateMutation.isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alteracoes'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ======================= */}
        {/* UPDATE STATUS MODAL */}
        {/* ======================= */}
        <Dialog open={showStatusUpdate} onOpenChange={setShowStatusUpdate}>
          <DialogContent className="bg-[#1a1a1e] border-white/[0.06] text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-white">
                Atualizar Status
              </DialogTitle>
            </DialogHeader>

            {selectedCommission && (
              <div className="space-y-4 mt-2">
                <div className="bg-[#0a0a0c] rounded-lg p-3 border border-white/[0.06]">
                  <p className="text-xs text-white/40">Beneficiario</p>
                  <p className="text-white font-medium">{getRecipientName(selectedCommission)}</p>
                  <p className="text-white/40 text-sm mt-1">
                    {formatCurrency(selectedCommission.valor_comissao)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/60 text-sm">Novo Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="bg-[#0a0a0c] border-white/[0.06] text-white">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1e] border-white/[0.06]">
                      <SelectItem value="pendente" className="text-white/70 focus:bg-white/[0.06] focus:text-white">
                        Pendente
                      </SelectItem>
                      <SelectItem value="pago" className="text-white/70 focus:bg-white/[0.06] focus:text-white">
                        Pago
                      </SelectItem>
                      <SelectItem value="cancelado" className="text-white/70 focus:bg-white/[0.06] focus:text-white">
                        Cancelado
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowStatusUpdate(false)}
                    className="border-white/[0.06] text-white/60 hover:bg-white/[0.06] hover:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleUpdateStatus}
                    disabled={updateMutation.isLoading}
                    className="bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    {updateMutation.isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Atualizando...
                      </>
                    ) : (
                      'Atualizar Status'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ======================= */}
        {/* PIX MANAGEMENT MODAL */}
        {/* ======================= */}
        <Dialog open={showPixManagement} onOpenChange={setShowPixManagement}>
          <DialogContent className="bg-[#1a1a1e] border-white/[0.06] text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                Gerenciar PIX de Mentorados
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Mentorado list with PIX status */}
              <div className="bg-[#0a0a0c] rounded-lg border border-white/[0.06] max-h-48 overflow-y-auto">
                {mentorados.length === 0 ? (
                  <div className="p-4 text-center text-white/30 text-sm">
                    Nenhum mentorado cadastrado
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {mentorados.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
                        onClick={() => {
                          setPixMentoradoId(m.id)
                          setPixChave(m.pix_chave || '')
                          setPixTipo(m.pix_tipo || '')
                        }}
                      >
                        <div>
                          <p className="text-white text-sm font-medium">{m.nome_completo}</p>
                          <p className="text-white/30 text-xs">{m.email}</p>
                        </div>
                        {m.pix_chave ? (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs">
                            PIX: {m.pix_tipo}
                          </Badge>
                        ) : (
                          <Badge className="bg-white/5 text-white/30 border-white/[0.06] text-xs">
                            Sem PIX
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PIX form */}
              <div className="space-y-3 border-t border-white/[0.06] pt-4">
                <div className="space-y-2">
                  <Label className="text-white/60 text-sm">Mentorado</Label>
                  <Select value={pixMentoradoId} onValueChange={(val) => {
                    setPixMentoradoId(val)
                    const m = mentorados.find((x) => x.id === val)
                    if (m) {
                      setPixChave(m.pix_chave || '')
                      setPixTipo(m.pix_tipo || '')
                    }
                  }}>
                    <SelectTrigger className="bg-[#0a0a0c] border-white/[0.06] text-white">
                      <SelectValue placeholder="Selecione o mentorado" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1e] border-white/[0.06] max-h-60">
                      {mentorados.map((m) => (
                        <SelectItem
                          key={m.id}
                          value={m.id}
                          className="text-white/70 focus:bg-white/[0.06] focus:text-white"
                        >
                          {m.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/60 text-sm">Tipo de Chave PIX</Label>
                  <Select value={pixTipo} onValueChange={setPixTipo}>
                    <SelectTrigger className="bg-[#0a0a0c] border-white/[0.06] text-white">
                      <SelectValue placeholder="Tipo da chave" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1e] border-white/[0.06]">
                      <SelectItem value="CPF" className="text-white/70 focus:bg-white/[0.06] focus:text-white">CPF</SelectItem>
                      <SelectItem value="CNPJ" className="text-white/70 focus:bg-white/[0.06] focus:text-white">CNPJ</SelectItem>
                      <SelectItem value="Email" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Email</SelectItem>
                      <SelectItem value="Telefone" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Telefone</SelectItem>
                      <SelectItem value="Aleatoria" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Aleatoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/60 text-sm">Chave PIX</Label>
                  <Input
                    value={pixChave}
                    onChange={(e) => setPixChave(e.target.value)}
                    placeholder="Informe a chave PIX"
                    className="bg-[#0a0a0c] border-white/[0.06] text-white placeholder:text-white/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPixManagement(false)}
                  className="border-white/[0.06] text-white/60 hover:bg-white/[0.06] hover:text-white"
                >
                  Fechar
                </Button>
                <Button
                  onClick={handleSavePix}
                  disabled={savingPix || !pixMentoradoId || !pixChave || !pixTipo}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {savingPix ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Salvar PIX
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
