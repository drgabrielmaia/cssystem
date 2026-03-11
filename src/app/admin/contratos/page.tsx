'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  FileText,
  Send,
  Eye,
  Edit,
  Copy,
  Check,
  CheckCircle,
  Clock,
  XCircle,
  MessageCircle,
  Users,
  Settings,
  Trash2,
  Download,
  AlertTriangle,
  DollarSign,
  Phone
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { sendContractAfterCreation } from '@/lib/contract-whatsapp'
import { Header } from '@/components/header'

interface ContractTemplate {
  id: string
  name: string
  content: string
  is_active: boolean
  created_at: string
}

interface Contract {
  id: string
  template_name: string
  recipient_name: string
  recipient_email: string
  status: 'pending' | 'signed' | 'expired' | 'cancelled'
  created_at: string
  signed_at?: string
  expires_at: string
  lead_id?: string
  mentorado_id?: string
  whatsapp_sent_at?: string
  valor?: number
  valor_pago?: number
  valor_restante?: number
  forma_negociacao?: string
  data_contrato?: string
  recipient_phone?: string
}

interface Mentorado {
  id: string
  nome_completo: string
  email: string
  telefone?: string
  estado_atual?: string
}

interface Lead {
  id: string
  nome_completo: string
  email: string
  telefone?: string
  status?: string
}

interface SignatureSettings {
  id: string
  organization_id: string
  signature_name: string
  signature_title: string
  signature_document: string
  signature_image_url?: string
}

export default function ContractsPage() {
  const { organizationId, user } = useAuth()
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [mentorados, setMentorados] = useState<Mentorado[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('contracts')

  // Modals
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showContractModal, setShowContractModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null)

  // Forms
  const [templateForm, setTemplateForm] = useState({
    name: '',
    content: ''
  })

  const [contractForm, setContractForm] = useState({
    template_id: '',
    recipient_type: 'mentorado', // 'mentorado', 'lead' or 'custom'
    lead_id: '',
    mentorado_id: '',
    custom_name: '',
    custom_email: '',
    custom_phone: '',
    placeholders: {},
    valor: '',
    valor_pago: '',
    valor_restante: '',
    forma_negociacao: '',
    negociacao_detalhe: '',
    n_parcelas: '',
    data_contrato: new Date().toISOString().split('T')[0]
  })

  const [statusFilter, setStatusFilter] = useState<string>('all')

  // View contract modal
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingContract, setViewingContract] = useState<Contract | null>(null)
  const [contractContent, setContractContent] = useState('')

  // Signature settings
  const [signatureSettings, setSignatureSettings] = useState<SignatureSettings | null>(null)
  const [signatureForm, setSignatureForm] = useState({
    signature_name: '',
    signature_title: '',
    signature_document: '',
    signature_image: '' // base64 drawn signature
  })

  // Financeiro phone
  const [financeiroPhone, setFinanceiroPhone] = useState('')
  const [savingFinanceiro, setSavingFinanceiro] = useState(false)

  // Org signature canvas
  const orgSigCanvasRef = useRef<HTMLCanvasElement>(null)
  const [orgSigDrawing, setOrgSigDrawing] = useState(false)
  const [orgSigHasDrawn, setOrgSigHasDrawn] = useState(false)

  const setupOrgSigCanvas = () => {
    const ctx = orgSigCanvasRef.current?.getContext('2d')
    if (ctx) { ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round' }
  }

  const orgSigStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) e.preventDefault()
    setOrgSigDrawing(true)
    const canvas = orgSigCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY
    const ctx = canvas.getContext('2d')
    if (ctx) { ctx.beginPath(); ctx.moveTo((cx - rect.left) * (canvas.width / rect.width), (cy - rect.top) * (canvas.height / rect.height)) }
  }
  const orgSigDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!orgSigDrawing) return
    if ('touches' in e) e.preventDefault()
    const canvas = orgSigCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const rect = canvas.getBoundingClientRect()
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY
    ctx.lineTo((cx - rect.left) * (canvas.width / rect.width), (cy - rect.top) * (canvas.height / rect.height))
    ctx.stroke()
    setOrgSigHasDrawn(true)
  }
  const orgSigStop = () => { setOrgSigDrawing(false) }
  const orgSigClear = () => {
    const canvas = orgSigCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); setupOrgSigCanvas(); setOrgSigHasDrawn(false) }
    setSignatureForm(prev => ({ ...prev, signature_image: '' }))
  }
  const orgSigCapture = () => {
    const canvas = orgSigCanvasRef.current
    if (!canvas) return ''
    return canvas.toDataURL('image/png')
  }

  useEffect(() => {
    if (organizationId) {
      loadData()
    }
  }, [organizationId, statusFilter])

  // Init org signature canvas when settings tab is shown
  useEffect(() => {
    if (activeTab === 'settings') {
      setTimeout(() => setupOrgSigCanvas(), 100)
    }
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (templatesError) throw templatesError
      setTemplates(templatesData || [])

      // Load contracts
      const { data: contractsData, error: contractsError } = await supabase
        .rpc('get_contracts_dashboard', {
          p_organization_id: organizationId,
          p_status: statusFilter,
          p_limit: 100
        })

      if (contractsError) throw contractsError
      setContracts(contractsData || [])

      // Load leads for contract creation
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, nome_completo, email, telefone, status')
        .eq('organization_id', organizationId)
        .neq('status', 'convertido')
        .order('nome_completo')

      if (leadsError) throw leadsError
      setLeads(leadsData || [])

      // Load mentorados for contract creation
      const { data: mentoradosData, error: mentoradosError } = await supabase
        .from('mentorados')
        .select('id, nome_completo, email, telefone, estado_atual')
        .eq('organization_id', organizationId)
        .order('nome_completo')

      if (!mentoradosError) setMentorados(mentoradosData || [])

      // Load signature settings
      const { data: signatureData, error: signatureError } = await supabase
        .from('organization_signature_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single()

      if (!signatureError && signatureData) {
        setSignatureSettings(signatureData)
        setSignatureForm({
          signature_name: signatureData.signature_name,
          signature_title: signatureData.signature_title || '',
          signature_document: signatureData.signature_document || '',
          signature_image: signatureData.signature_image_url || ''
        })
      }

      // Load financeiro phone
      const { data: orgData } = await supabase
        .from('organizations')
        .select('financeiro_phone')
        .eq('id', organizationId)
        .single()

      if (orgData?.financeiro_phone) {
        setFinanceiroPhone(orgData.financeiro_phone)
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      alert('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId || !user?.email) return

    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .insert({
          name: templateForm.name,
          content: templateForm.content,
          organization_id: organizationId,
          created_by_email: user.email
        })
        .select()

      if (error) throw error

      alert('Template criado com sucesso!')
      setShowTemplateModal(false)
      resetTemplateForm()
      loadData()
    } catch (error) {
      console.error('Erro ao criar template:', error)
      alert('Erro ao criar template')
    }
  }

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTemplate) return

    try {
      const { error } = await supabase
        .from('contract_templates')
        .update({
          name: templateForm.name,
          content: templateForm.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTemplate.id)

      if (error) throw error

      alert('Template atualizado com sucesso!')
      setEditingTemplate(null)
      resetTemplateForm()
      loadData()
    } catch (error) {
      console.error('Erro ao atualizar template:', error)
      alert('Erro ao atualizar template')
    }
  }

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId || !user?.email) return

    try {
      let recipientName, recipientEmail, recipientPhone, leadId, mentoradoId

      if (contractForm.recipient_type === 'mentorado') {
        const selectedMentorado = mentorados.find(m => m.id === contractForm.mentorado_id)
        if (!selectedMentorado) {
          alert('Selecione um mentorado')
          return
        }
        recipientName = selectedMentorado.nome_completo
        recipientEmail = selectedMentorado.email
        recipientPhone = selectedMentorado.telefone
        leadId = null
        mentoradoId = selectedMentorado.id
      } else if (contractForm.recipient_type === 'lead') {
        const selectedLead = leads.find(l => l.id === contractForm.lead_id)
        if (!selectedLead) {
          alert('Selecione um lead')
          return
        }
        recipientName = selectedLead.nome_completo
        recipientEmail = selectedLead.email
        recipientPhone = selectedLead.telefone
        leadId = selectedLead.id
        mentoradoId = null
      } else {
        recipientName = contractForm.custom_name
        recipientEmail = contractForm.custom_email
        recipientPhone = contractForm.custom_phone
        leadId = null
        mentoradoId = null
      }

      const { data, error } = await supabase.rpc('create_contract_from_template', {
        p_template_id: contractForm.template_id,
        p_recipient_name: recipientName,
        p_recipient_email: recipientEmail,
        p_organization_id: organizationId,
        p_lead_id: leadId,
        p_mentorado_id: mentoradoId,
        p_custom_content: null
      })

      if (error) throw error

      const contractId = data

      // Update payment fields
      if (contractId) {
        const valorNum = contractForm.valor ? parseFloat(contractForm.valor) : null
        const valorPagoNum = contractForm.valor_pago ? parseFloat(contractForm.valor_pago) : 0
        const valorRestanteNum = contractForm.valor_restante ? parseFloat(contractForm.valor_restante) : (valorNum ? valorNum - valorPagoNum : 0)

        let formaFinal = contractForm.forma_negociacao || null
        if (contractForm.forma_negociacao === 'negociacao_especial') {
          const nParcelas = parseInt(contractForm.n_parcelas || '0')
          if (nParcelas > 0 && valorRestanteNum > 0) {
            const valorParcela = valorRestanteNum / nParcelas
            const valorParcelaFmt = valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            const detalhe = contractForm.negociacao_detalhe
              ? `${contractForm.negociacao_detalhe} + ${nParcelas}x ${valorParcelaFmt}`
              : `${nParcelas}x ${valorParcelaFmt}`
            formaFinal = `negociacao_especial: ${detalhe}`
          } else if (contractForm.negociacao_detalhe) {
            formaFinal = `negociacao_especial: ${contractForm.negociacao_detalhe}`
          }
        }

        await supabase
          .from('contracts')
          .update({
            valor: valorNum,
            valor_pago: valorPagoNum,
            valor_restante: valorRestanteNum,
            forma_negociacao: formaFinal,
            data_contrato: contractForm.data_contrato || null
          })
          .eq('id', contractId)
      }

      // Send customization link to financial team via WhatsApp
      const effectiveFinPhone = financeiroPhone?.replace(/\D/g, '')
      if (contractId && effectiveFinPhone) {
        try {
          const BAILEYS_API = 'https://api.medicosderesultado.com.br'
          const customizeUrl = `${window.location.origin}/personalizar-contrato/${contractId}`

          const finMsg = `📋 *Novo Contrato Criado*

👤 *Destinatario:* ${recipientName}
📧 Email: ${recipientEmail || 'N/A'}
📱 Telefone: ${recipientPhone || 'N/A'}

🔗 *Personalize o contrato (forma de pagamento, valor, etc):*
${customizeUrl}

Apos personalizar, o sistema enviara automaticamente o link de assinatura para o destinatario.`

          await fetch(`${BAILEYS_API}/users/${organizationId}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: effectiveFinPhone, message: finMsg })
          })
          alert('Contrato criado! Link de personalizacao enviado para o financeiro via WhatsApp.')
        } catch (whatsappError) {
          console.error('Erro no WhatsApp:', whatsappError)
          alert('Contrato criado com sucesso! Erro ao enviar para financeiro - copie o link manualmente.')
        }
      } else if (contractId && recipientPhone) {
        // Fallback: no financial phone configured, send directly to recipient
        try {
          const whatsappSent = await sendContractAfterCreation(contractId)
          if (whatsappSent) {
            alert('Contrato criado e enviado diretamente via WhatsApp (financeiro nao configurado).')
          } else {
            alert('Contrato criado! Nao foi possivel enviar via WhatsApp.')
          }
        } catch (whatsappError) {
          console.error('Erro no WhatsApp:', whatsappError)
          alert('Contrato criado! Erro ao enviar via WhatsApp.')
        }
      } else {
        alert('Contrato criado com sucesso! Envie o link manualmente.')
      }

      setShowContractModal(false)
      resetContractForm()
      loadData()
    } catch (error) {
      console.error('Erro ao criar contrato:', error)
      alert('Erro ao criar contrato')
    }
  }

  const handleCreateDefaultTemplate = async () => {
    if (!organizationId || !user?.email) return

    try {
      const { data, error } = await supabase.rpc('create_default_contract_template', {
        p_organization_id: organizationId
      })

      if (error) throw error

      alert('Template padrao criado com sucesso!')
      loadData()
    } catch (error) {
      console.error('Erro ao criar template padrao:', error)
      alert('Erro ao criar template padrao')
    }
  }

  const resetTemplateForm = () => {
    setTemplateForm({ name: '', content: '' })
    setShowTemplateModal(false)
  }

  const resetContractForm = () => {
    setContractForm({
      template_id: '',
      recipient_type: 'mentorado',
      lead_id: '',
      mentorado_id: '',
      custom_name: '',
      custom_email: '',
      custom_phone: '',
      placeholders: {},
      valor: '',
      valor_pago: '',
      valor_restante: '',
      forma_negociacao: '',
      negociacao_detalhe: '',
    n_parcelas: '',
      data_contrato: new Date().toISOString().split('T')[0]
    })
  }

  const toggleTemplateActive = async (template: ContractTemplate) => {
    try {
      const { error } = await supabase
        .from('contract_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id)

      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Erro ao alterar status do template:', error)
      alert('Erro ao alterar status do template')
    }
  }

  const startEditTemplate = (template: ContractTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name,
      content: template.content
    })
    setShowTemplateModal(true)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: typeof Clock; label: string }> = {
      pending: { className: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock, label: 'Pendente' },
      signed: { className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle, label: 'Assinado' },
      expired: { className: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle, label: 'Expirado' },
      cancelled: { className: 'bg-white/[0.06] text-white/40 border-white/[0.08]', icon: XCircle, label: 'Cancelado' }
    }

    const config = variants[status] || variants.pending
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    )
  }

  const getSigningUrl = (contractId: string) => {
    return `${window.location.origin}/assinar-contrato/${contractId}`
  }

  const copySigningUrl = (contractId: string) => {
    const url = getSigningUrl(contractId)
    navigator.clipboard.writeText(url)
    alert('Link copiado para a area de transferencia!')
  }

  const sendContractWhatsApp = async (contractId: string) => {
    try {
      const success = await sendContractAfterCreation(contractId)
      if (success) {
        alert('Contrato reenviado via WhatsApp com sucesso!')
        loadData() // Refresh to show updated whatsapp_sent_at
      } else {
        alert('Erro ao enviar contrato via WhatsApp. Verifique se o telefone esta correto.')
      }
    } catch (error) {
      console.error('Erro ao reenviar contrato:', error)
      alert('Erro ao enviar contrato via WhatsApp')
    }
  }

  const handleViewContract = async (contract: Contract) => {
    try {
      // Get contract content from database
      const { data, error } = await supabase.rpc('get_contract_content', {
        p_contract_id: contract.id
      })

      if (error) throw error

      if (data && data.length > 0) {
        let content = data[0].content

        // Get organization signature settings to process signatures
        const { data: orgSignature } = await supabase
          .from('organization_signature_settings')
          .select('*')
          .eq('organization_id', organizationId)
          .single()

        // Process signatures in the content
        if (orgSignature) {
          const orgSigImg = orgSignature.signature_image_url
            ? `<img src="${orgSignature.signature_image_url}" alt="Assinatura Contratada" style="max-width:200px;height:60px;margin:10px 0;" />`
            : ''
          const orgSignatureBlock = `
${orgSigImg}
___________________
${orgSignature.signature_name}
${orgSignature.signature_title || ''}
${orgSignature.signature_document || ''}
INSTITUTO DE MENTORIA MEDICA GABRIEL MAIA LTDA
CNPJ: 56.267.958/0001-60`

          content = content.replace(/\[ASSINATURA_CONTRATADA\]/g, orgSignatureBlock)
        }

        // If contract is signed, show signature info (fetch signature_data from contracts table)
        if (contract.status === 'signed') {
          let clientSigImg = ''
          const { data: contractFull } = await supabase
            .from('contracts')
            .select('signature_data')
            .eq('id', contract.id)
            .single()
          if (contractFull?.signature_data?.signature) {
            clientSigImg = `<img src="${contractFull.signature_data.signature}" alt="Assinatura" style="max-width:200px;height:60px;margin:10px 0;" />`
          }
          const clientSignatureBlock = `
${clientSigImg}
___________________
${contract.recipient_name}
Assinatura Digital
Assinado em: ${contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('pt-BR') : 'Data nao disponivel'}`

          content = content.replace(/\[ASSINATURA_CONTRATANTE\]/g, clientSignatureBlock)
          content = content.replace(/\[SIGNATURE\]/g, clientSignatureBlock)
        } else {
          const clientSignatureBlock = `

___________________
${contract.recipient_name}
Assinatura do Contratante`

          content = content.replace(/\[ASSINATURA_CONTRATANTE\]/g, clientSignatureBlock)
          content = content.replace(/\[SIGNATURE\]/g, clientSignatureBlock)
        }

        setContractContent(content)
        setViewingContract(contract)
        setShowViewModal(true)
      } else {
        alert('Conteudo do contrato nao encontrado')
      }
    } catch (error) {
      console.error('Erro ao carregar contrato:', error)
      alert('Erro ao visualizar contrato')
    }
  }

  const handleActivateContract = async (contractId: string, contractName: string) => {
    if (!confirm(`Marcar contrato de "${contractName}" como ATIVO/ASSINADO?`)) return
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'signed', signed_at: new Date().toISOString() })
        .eq('id', contractId)
      if (error) throw error

      // Disparar evento de automacao: contrato assinado
      try {
        const { waV2 } = await import('@/lib/whatsapp-v2-service')
        await waV2.triggerAutomationEvent('contract_signed', { contractId, recipientName: contractName })
      } catch {}

      alert('Contrato ativado com sucesso!')
      loadData()
    } catch (error) {
      console.error('Erro ao ativar contrato:', error)
      alert('Erro ao ativar contrato')
    }
  }

  const handleDeleteContract = async (contractId: string, contractName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o contrato de "${contractName}"?\nEsta acao nao pode ser desfeita.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId)

      if (error) throw error

      alert('Contrato excluido com sucesso!')
      loadData()
    } catch (error) {
      console.error('Erro ao excluir contrato:', error)
      alert('Erro ao excluir contrato')
    }
  }

  const handleSaveSignatureSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId) return

    try {
      const capturedImage = orgSigHasDrawn ? orgSigCapture() : signatureForm.signature_image
      const signatureData = {
        organization_id: organizationId,
        signature_name: signatureForm.signature_name,
        signature_title: signatureForm.signature_title,
        signature_document: signatureForm.signature_document,
        signature_image_url: capturedImage || null
      }

      if (signatureSettings) {
        // Update existing settings
        const { error } = await supabase
          .from('organization_signature_settings')
          .update(signatureData)
          .eq('id', signatureSettings.id)

        if (error) throw error
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('organization_signature_settings')
          .insert([signatureData])
          .select()
          .single()

        if (error) throw error
        setSignatureSettings(data)
      }

      alert('Configuracoes de assinatura salvas com sucesso!')
      loadData()
    } catch (error) {
      console.error('Erro ao salvar configuracoes:', error)
      alert('Erro ao salvar configuracoes')
    }
  }

  const handleSaveFinanceiroPhone = async () => {
    if (!organizationId) return
    setSavingFinanceiro(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ financeiro_phone: financeiroPhone.trim() || null })
        .eq('id', organizationId)

      if (error) throw error
      alert('Telefone do financeiro salvo com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar telefone do financeiro:', error)
      alert('Erro ao salvar telefone do financeiro')
    } finally {
      setSavingFinanceiro(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <Header title="Contratos" subtitle="Gerencie modelos e envie contratos" />
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/10 border-t-white/60"></div>
            <p className="text-sm text-white/40">Carregando contratos...</p>
          </div>
        </div>
      </div>
    )
  }

  // Summary stats
  const totalContracts = contracts.length
  const pendingContracts = contracts.filter(c => c.status === 'pending').length
  const signedContracts = contracts.filter(c => c.status === 'signed').length
  const expiredContracts = contracts.filter(c => c.status === 'expired').length
  const activeTemplates = templates.filter(t => t.is_active).length
  const totalValor = contracts.reduce((sum, c) => sum + (Number(c.valor) || 0), 0)
  const totalPago = contracts.reduce((sum, c) => sum + (Number(c.valor_pago) || 0), 0)
  const totalRestante = contracts.reduce((sum, c) => sum + (Number(c.valor_restante) || 0), 0)

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Header title="Contratos" subtitle="Gerencie modelos e envie contratos" />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Contratos */}
          <div className="bg-[#141418] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/40 text-sm font-medium">Total Contratos</span>
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
                <FileText className="h-4 w-4 text-white/50" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight">{totalContracts}</p>
            <p className="text-xs text-white/30 mt-1">{activeTemplates} templates ativos</p>
          </div>

          {/* Assinados */}
          <div className="bg-[#141418] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/40 text-sm font-medium">Assinados</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-400 tracking-tight">{signedContracts}</p>
            <p className="text-xs text-white/30 mt-1">
              {totalContracts > 0 ? Math.round((signedContracts / totalContracts) * 100) : 0}% do total
            </p>
          </div>

          {/* Pendentes */}
          <div className="bg-[#141418] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/40 text-sm font-medium">Pendentes</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-400 tracking-tight">{pendingContracts}</p>
            <p className="text-xs text-white/30 mt-1">Aguardando assinatura</p>
          </div>

          {/* Financeiro */}
          <div className="bg-[#141418] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/40 text-sm font-medium">Financeiro</span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-white tracking-tight">R$ {formatCurrency(totalPago)}</p>
            <p className="text-xs text-white/30 mt-1">
              {totalRestante > 0 ? `R$ ${formatCurrency(totalRestante)} a receber` : 'Tudo pago'}
            </p>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#141418] border border-white/[0.06] p-1 rounded-xl">
            <TabsTrigger
              value="contracts"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/40 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white transition-all"
            >
              Contratos
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/40 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white transition-all"
            >
              Templates
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/40 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white transition-all"
            >
              Configuracoes
            </TabsTrigger>
          </TabsList>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48 bg-[#111113] border-white/[0.08] text-white rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141418] border-white/[0.08]">
                    <SelectItem value="all" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Todos os status</SelectItem>
                    <SelectItem value="pending" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Pendentes</SelectItem>
                    <SelectItem value="signed" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Assinados</SelectItem>
                    <SelectItem value="expired" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Expirados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Dialog open={showContractModal} onOpenChange={setShowContractModal}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-black hover:bg-white/90 rounded-xl h-10 px-5 font-medium text-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Contrato
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#141418] border border-white/[0.08] max-w-2xl rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-white text-lg font-semibold">Criar Novo Contrato</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateContract} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-white/60 text-sm">Template *</Label>
                      <Select
                        value={contractForm.template_id}
                        onValueChange={(value) => setContractForm(prev => ({ ...prev, template_id: value }))}
                        required
                      >
                        <SelectTrigger className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10">
                          <SelectValue placeholder="Selecione um template" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#141418] border-white/[0.08]">
                          {templates.filter(t => t.is_active).map((template) => (
                            <SelectItem key={template.id} value={template.id} className="text-white/70 focus:bg-white/[0.06] focus:text-white">
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/60 text-sm">Destinatario</Label>
                      <Select
                        value={contractForm.recipient_type}
                        onValueChange={(value) => setContractForm(prev => ({ ...prev, recipient_type: value }))}
                      >
                        <SelectTrigger className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#141418] border-white/[0.08]">
                          <SelectItem value="mentorado" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Mentorado</SelectItem>
                          <SelectItem value="lead" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Lead Existente</SelectItem>
                          <SelectItem value="custom" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Pessoa Externa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {contractForm.recipient_type === 'mentorado' ? (
                      <div className="space-y-2">
                        <Label className="text-white/60 text-sm">Mentorado *</Label>
                        <Select
                          value={contractForm.mentorado_id}
                          onValueChange={(value) => setContractForm(prev => ({ ...prev, mentorado_id: value }))}
                          required
                        >
                          <SelectTrigger className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10">
                            <SelectValue placeholder="Selecione um mentorado" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#141418] border-white/[0.08]">
                            {mentorados.map((m) => (
                              <SelectItem key={m.id} value={m.id} className="text-white/70 focus:bg-white/[0.06] focus:text-white">
                                {m.nome_completo}{m.estado_atual ? ` (${m.estado_atual})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : contractForm.recipient_type === 'lead' ? (
                      <div className="space-y-2">
                        <Label className="text-white/60 text-sm">Lead *</Label>
                        <Select
                          value={contractForm.lead_id}
                          onValueChange={(value) => setContractForm(prev => ({ ...prev, lead_id: value }))}
                          required
                        >
                          <SelectTrigger className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10">
                            <SelectValue placeholder="Selecione um lead" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#141418] border-white/[0.08]">
                            {leads.map((lead) => (
                              <SelectItem key={lead.id} value={lead.id} className="text-white/70 focus:bg-white/[0.06] focus:text-white">
                                {lead.nome_completo} ({lead.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-white/60 text-sm">Nome Completo *</Label>
                          <Input
                            value={contractForm.custom_name}
                            onChange={(e) => setContractForm(prev => ({ ...prev, custom_name: e.target.value }))}
                            className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10 placeholder:text-white/20"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/60 text-sm">Email *</Label>
                          <Input
                            type="email"
                            value={contractForm.custom_email}
                            onChange={(e) => setContractForm(prev => ({ ...prev, custom_email: e.target.value }))}
                            className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10 placeholder:text-white/20"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/60 text-sm">Telefone</Label>
                          <Input
                            value={contractForm.custom_phone}
                            onChange={(e) => setContractForm(prev => ({ ...prev, custom_phone: e.target.value }))}
                            className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10 placeholder:text-white/20"
                          />
                        </div>
                      </div>
                    )}

                    {/* Dados Financeiros */}
                    <div className="border-t border-white/[0.06] pt-4">
                      <h4 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Dados Financeiros
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white/60 text-sm">Data do Contrato</Label>
                          <Input
                            type="date"
                            value={contractForm.data_contrato}
                            onChange={(e) => setContractForm(prev => ({ ...prev, data_contrato: e.target.value }))}
                            className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/60 text-sm">Valor Total (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={contractForm.valor}
                            onChange={(e) => {
                              const valor = e.target.value
                              const valorPago = contractForm.valor_pago ? parseFloat(contractForm.valor_pago) : 0
                              const restante = valor ? (parseFloat(valor) - valorPago).toFixed(2) : ''
                              setContractForm(prev => ({ ...prev, valor, valor_restante: restante }))
                            }}
                            className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10 placeholder:text-white/20"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/60 text-sm">Valor Pago (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={contractForm.valor_pago}
                            onChange={(e) => {
                              const valorPago = e.target.value
                              const valorTotal = contractForm.valor ? parseFloat(contractForm.valor) : 0
                              const restante = valorTotal ? (valorTotal - (valorPago ? parseFloat(valorPago) : 0)).toFixed(2) : ''
                              setContractForm(prev => ({ ...prev, valor_pago: valorPago, valor_restante: restante }))
                            }}
                            className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10 placeholder:text-white/20"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/60 text-sm">Valor Restante (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={contractForm.valor_restante}
                            onChange={(e) => setContractForm(prev => ({ ...prev, valor_restante: e.target.value }))}
                            className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10 placeholder:text-white/20"
                            placeholder="Calculado automaticamente"
                          />
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Label className="text-white/60 text-sm">Forma de Negociacao</Label>
                        <Select
                          value={contractForm.forma_negociacao}
                          onValueChange={(value) => setContractForm(prev => ({ ...prev, forma_negociacao: value }))}
                        >
                          <SelectTrigger className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10">
                            <SelectValue placeholder="Selecione a forma de negociacao" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#141418] border-white/[0.08]">
                            <SelectItem value="a_vista" className="text-white/70 focus:bg-white/[0.06] focus:text-white">A Vista</SelectItem>
                            <SelectItem value="parcelado_cartao" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Parcelado no Cartao</SelectItem>
                            <SelectItem value="boleto" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Boleto</SelectItem>
                            <SelectItem value="pix" className="text-white/70 focus:bg-white/[0.06] focus:text-white">PIX</SelectItem>
                            <SelectItem value="pix_parcelado" className="text-white/70 focus:bg-white/[0.06] focus:text-white">PIX Parcelado</SelectItem>
                            <SelectItem value="negociacao_especial" className="text-white/70 focus:bg-white/[0.06] focus:text-white">Negociacao Especial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {contractForm.forma_negociacao === 'negociacao_especial' && (
                        <div className="mt-3 space-y-3">
                          <div className="space-y-2">
                            <Label className="text-white/60 text-sm">Entrada / Observacao (opcional)</Label>
                            <Input
                              value={contractForm.negociacao_detalhe}
                              onChange={(e) => setContractForm(prev => ({ ...prev, negociacao_detalhe: e.target.value }))}
                              className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10 placeholder:text-white/20"
                              placeholder="Ex: 1 entrada de R$500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white/60 text-sm">Quantidade de Parcelas *</Label>
                            <Input
                              type="number"
                              min="1"
                              value={contractForm.n_parcelas}
                              onChange={(e) => setContractForm(prev => ({ ...prev, n_parcelas: e.target.value }))}
                              className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10 placeholder:text-white/20"
                              placeholder="Ex: 12"
                              required
                            />
                          </div>
                          {contractForm.n_parcelas && contractForm.valor_restante && parseFloat(contractForm.n_parcelas) > 0 && parseFloat(contractForm.valor_restante) > 0 && (
                            <p className="text-sm text-emerald-400">
                              Valor de cada parcela: {(parseFloat(contractForm.valor_restante) / parseFloat(contractForm.n_parcelas)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowContractModal(false)}
                        className="border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white rounded-xl"
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" className="bg-white text-black hover:bg-white/90 rounded-xl font-medium">
                        Criar Contrato
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Contracts Table */}
            <div className="bg-[#141418] border border-white/[0.06] rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider">Destinatario</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider">Valor</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider">Pagamento</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider">Negociacao</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider">Data</TableHead>
                    <TableHead className="text-white/40 text-xs font-medium uppercase tracking-wider">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id} className="border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <TableCell>
                        <div>
                          <div className="font-medium text-white text-sm">{contract.recipient_name}</div>
                          <div className="text-xs text-white/30 mt-0.5">{contract.recipient_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                      <TableCell>
                        {contract.valor ? (
                          <span className="text-white font-medium text-sm">
                            R$ {Number(contract.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-white/20 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contract.valor ? (
                          <div>
                            <div className="text-emerald-400 text-xs font-medium">
                              Pago: R$ {Number(contract.valor_pago || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            {(contract.valor_restante || 0) > 0 && (
                              <div className="text-amber-400 text-xs mt-0.5">
                                Falta: R$ {Number(contract.valor_restante).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-white/20 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-white/50 text-sm">
                        {contract.forma_negociacao ? contract.forma_negociacao.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '-'}
                      </TableCell>
                      <TableCell className="text-white/50 text-sm">
                        {contract.data_contrato
                          ? new Date(contract.data_contrato + 'T00:00:00').toLocaleDateString('pt-BR')
                          : new Date(contract.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          {contract.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleActivateContract(contract.id, contract.recipient_name)}
                                className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/20 transition-colors"
                                title="Ativar contrato"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => copySigningUrl(contract.id)}
                                className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-colors"
                                title="Copiar link"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => sendContractWhatsApp(contract.id)}
                                className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                title="Enviar/Reenviar via WhatsApp"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleViewContract(contract)}
                            className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/50 hover:bg-white/[0.08] hover:text-white/80 transition-colors"
                            title="Visualizar contrato"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteContract(contract.id, contract.recipient_name)}
                            className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Excluir contrato"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {contracts.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-6 w-6 text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm">Nenhum contrato encontrado</p>
                  <p className="text-white/20 text-xs mt-1">Crie um novo contrato para comecar</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={handleCreateDefaultTemplate}
                className="border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white rounded-xl h-10"
              >
                <Settings className="h-4 w-4 mr-2" />
                Criar Template Padrao
              </Button>

              <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-black hover:bg-white/90 rounded-xl h-10 px-5 font-medium text-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {editingTemplate ? 'Editar Template' : 'Novo Template'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#141418] border border-white/[0.08] max-w-4xl rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-white text-lg font-semibold">
                      {editingTemplate ? 'Editar Template' : 'Criar Novo Template'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-white/60 text-sm">Nome do Template *</Label>
                      <Input
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10 placeholder:text-white/20"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/60 text-sm">Conteudo do Contrato *</Label>
                      <p className="text-xs text-white/30">
                        Use placeholders como [NOME_COMPLETO], [DATA], [CPF], [ENDERECO] que serao substituidos automaticamente.
                      </p>
                      <Textarea
                        value={templateForm.content}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                        className="bg-[#111113] border-white/[0.08] text-white min-h-[400px] rounded-xl placeholder:text-white/20"
                        required
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetTemplateForm}
                        className="border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white rounded-xl"
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" className="bg-white text-black hover:bg-white/90 rounded-xl font-medium">
                        {editingTemplate ? 'Atualizar Template' : 'Criar Template'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Templates List */}
            <div className="grid gap-4">
              {templates.map((template) => (
                <div key={template.id} className="bg-[#141418] border border-white/[0.06] rounded-2xl p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-white font-semibold text-base">{template.name}</h3>
                      <p className="text-sm text-white/30 mt-0.5">
                        Criado em {new Date(template.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleTemplateActive(template)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                          template.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-white/[0.04] text-white/30 border-white/[0.06] hover:bg-white/[0.08] hover:text-white/50'
                        }`}
                        title={template.is_active ? 'Clique para desativar' : 'Clique para ativar'}
                      >
                        {template.is_active ? 'Ativo' : 'Inativo'}
                      </button>
                      <button
                        onClick={() => startEditTemplate(template)}
                        className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/50 hover:bg-white/[0.08] hover:text-white/80 transition-colors"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-white/40 leading-relaxed line-clamp-3">
                    {template.content.substring(0, 200)}...
                  </div>
                </div>
              ))}
            </div>

            {templates.length === 0 && (
              <div className="bg-[#141418] border border-white/[0.06] rounded-2xl p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-6 w-6 text-white/20" />
                </div>
                <p className="text-white/40 text-sm">Nenhum template encontrado</p>
                <p className="text-white/20 text-xs mt-1">Crie seu primeiro template para comecar a enviar contratos</p>
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="bg-[#141418] border border-white/[0.06] rounded-2xl p-6">
              <div className="mb-6">
                <h3 className="text-white font-semibold text-base">Configuracoes de Assinatura</h3>
                <p className="text-white/40 text-sm mt-1">Configure os dados que aparecerao na assinatura dos contratos</p>
              </div>
              <form onSubmit={handleSaveSignatureSettings} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-white/60 text-sm">Nome do Responsavel *</Label>
                  <Input
                    value={signatureForm.signature_name}
                    onChange={(e) => setSignatureForm(prev => ({ ...prev, signature_name: e.target.value }))}
                    className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10 placeholder:text-white/20"
                    placeholder="Ex: Gabriel Maia"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/60 text-sm">Cargo/Titulo</Label>
                  <Input
                    value={signatureForm.signature_title}
                    onChange={(e) => setSignatureForm(prev => ({ ...prev, signature_title: e.target.value }))}
                    className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10 placeholder:text-white/20"
                    placeholder="Ex: Diretor Executivo"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/60 text-sm">Documento (CPF/CNPJ)</Label>
                  <Input
                    value={signatureForm.signature_document}
                    onChange={(e) => setSignatureForm(prev => ({ ...prev, signature_document: e.target.value }))}
                    className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10 placeholder:text-white/20"
                    placeholder="Ex: CPF: XXX.XXX.XXX-XX"
                  />
                </div>

                {/* Drawn Signature */}
                <div className="space-y-2">
                  <Label className="text-white/60 text-sm">Assinatura Desenhada da Contratada</Label>
                  <p className="text-white/30 text-xs">Desenhe a assinatura que aparecera nos contratos como contratada</p>
                  <div className="border-2 border-dashed border-white/[0.08] rounded-xl p-3 max-w-md">
                    <canvas
                      ref={orgSigCanvasRef}
                      width={360}
                      height={150}
                      className="w-full border border-white/[0.06] rounded-lg bg-white cursor-crosshair"
                      style={{ touchAction: 'none' }}
                      onMouseDown={orgSigStart}
                      onMouseMove={orgSigDraw}
                      onMouseUp={orgSigStop}
                      onMouseLeave={orgSigStop}
                      onTouchStart={orgSigStart}
                      onTouchMove={orgSigDraw}
                      onTouchEnd={orgSigStop}
                    />
                  </div>
                  {signatureForm.signature_image && !orgSigHasDrawn && (
                    <div className="mt-2">
                      <p className="text-white/30 text-xs mb-1">Assinatura salva:</p>
                      <img src={signatureForm.signature_image} alt="Assinatura" className="h-12 bg-white rounded-lg p-1" />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={orgSigClear}
                    className="mt-2 border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white rounded-lg"
                  >
                    Limpar Assinatura
                  </Button>
                </div>

                <Button type="submit" className="bg-white text-black hover:bg-white/90 rounded-xl font-medium h-10 px-5">
                  <Settings className="h-4 w-4 mr-2" />
                  Salvar Configuracoes
                </Button>
              </form>
            </div>

            {/* Signature Preview */}
            <div className="bg-[#141418] border border-white/[0.06] rounded-2xl p-6">
              <div className="mb-4">
                <h3 className="text-white font-semibold text-base">Previa da Assinatura</h3>
                <p className="text-white/40 text-sm mt-1">Como aparecera nos contratos:</p>
              </div>
              <div className="bg-white p-6 rounded-xl">
                <div className="text-center space-y-2">
                  {signatureForm.signature_image && (
                    <img src={signatureForm.signature_image} alt="Assinatura" className="h-14 mx-auto mb-2" />
                  )}
                  <div className="border-b border-gray-300 pb-2 mb-4">
                    <p className="text-gray-900 font-semibold">{signatureForm.signature_name || '[Nome do Responsavel]'}</p>
                  </div>
                  {signatureForm.signature_title && (
                    <p className="text-gray-700 text-sm">{signatureForm.signature_title}</p>
                  )}
                  {signatureForm.signature_document && (
                    <p className="text-gray-700 text-sm">{signatureForm.signature_document}</p>
                  )}
                  <p className="text-gray-700 text-sm">INSTITUTO DE MENTORIA MEDICA GABRIEL MAIA LTDA</p>
                  <p className="text-gray-700 text-xs">CNPJ: 56.267.958/0001-60</p>
                </div>
              </div>
            </div>

            {/* Financeiro Phone */}
            <div className="bg-[#141418] border border-white/[0.06] rounded-2xl p-6">
              <div className="mb-6">
                <h3 className="text-white font-semibold text-base">Telefone do Financeiro</h3>
                <p className="text-white/40 text-sm mt-1">Numero que recebera os detalhes de pagamento quando um contrato for assinado</p>
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-2">
                  <Label className="text-white/60 text-sm">WhatsApp do Financeiro</Label>
                  <Input
                    value={financeiroPhone}
                    onChange={(e) => setFinanceiroPhone(e.target.value)}
                    className="bg-[#111113] border-white/[0.08] text-white rounded-xl h-10 placeholder:text-white/20"
                    placeholder="Ex: 5511999999999"
                  />
                  <p className="text-white/30 text-xs">Formato: codigo do pais + DDD + numero (ex: 5511999999999)</p>
                </div>
                <Button
                  onClick={handleSaveFinanceiroPhone}
                  disabled={savingFinanceiro}
                  className="bg-white text-black hover:bg-white/90 rounded-xl font-medium h-10 px-5"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  {savingFinanceiro ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* View Contract Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="bg-[#141418] border border-white/[0.08] max-w-4xl max-h-[90vh] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-white text-lg font-semibold">
                Visualizar Contrato - {viewingContract?.recipient_name}
              </DialogTitle>
            </DialogHeader>

            {viewingContract && (
              <div className="space-y-4">
                {/* Contract Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-[#111113] border border-white/[0.06] rounded-xl">
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Status</p>
                    <div className="mt-1">
                      {getStatusBadge(viewingContract.status)}
                    </div>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Criado em</p>
                    <p className="text-white text-sm">
                      {new Date(viewingContract.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Expira em</p>
                    <p className="text-white text-sm">
                      {new Date(viewingContract.expires_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Email</p>
                    <p className="text-white text-sm">{viewingContract.recipient_email}</p>
                  </div>
                </div>

                {/* Contract Content */}
                <div className="max-h-[60vh] overflow-y-auto p-4 bg-white rounded-xl border border-white/[0.06]">
                  <div
                    className="prose max-w-none text-gray-900"
                    dangerouslySetInnerHTML={{ __html: contractContent.replace(/\n/g, '<br>') }}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const w = window.open('', '_blank')
                      if (!w) return
                      w.document.write(`<!DOCTYPE html><html><head><title>Contrato - ${viewingContract.recipient_name}</title><style>body{font-family:Arial,sans-serif;padding:20px;line-height:1.6;max-width:800px;margin:0 auto}@media print{body{margin:0;padding:15px}}</style></head><body><div style="white-space:pre-wrap;font-size:14px;">${contractContent.replace(/\n/g, '<br>')}</div></body></html>`)
                      w.document.close()
                      w.focus()
                      setTimeout(() => w.print(), 500)
                    }}
                    className="border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white rounded-xl"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => copySigningUrl(viewingContract.id)}
                    className="border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white rounded-xl"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowViewModal(false)}
                    className="border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white rounded-xl"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
