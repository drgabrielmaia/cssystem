'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  CheckCircle,
  Clock,
  XCircle,
  MessageCircle,
  Users,
  Settings,
  Trash2,
  Download
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { sendContractAfterCreation } from '@/lib/contract-whatsapp'

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
  whatsapp_sent_at?: string
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
    recipient_type: 'lead', // 'lead' or 'custom'
    lead_id: '',
    custom_name: '',
    custom_email: '',
    custom_phone: '',
    placeholders: {}
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
      let recipientName, recipientEmail, recipientPhone, leadId

      if (contractForm.recipient_type === 'lead') {
        const selectedLead = leads.find(l => l.id === contractForm.lead_id)
        if (!selectedLead) {
          alert('Selecione um lead')
          return
        }
        recipientName = selectedLead.nome_completo
        recipientEmail = selectedLead.email
        recipientPhone = selectedLead.telefone
        leadId = selectedLead.id
      } else {
        recipientName = contractForm.custom_name
        recipientEmail = contractForm.custom_email
        recipientPhone = contractForm.custom_phone
        leadId = null
      }

      const { data, error } = await supabase.rpc('create_contract_from_template', {
        p_template_id: contractForm.template_id,
        p_recipient_name: recipientName,
        p_recipient_email: recipientEmail,
        p_recipient_phone: recipientPhone,
        p_organization_id: organizationId,
        p_created_by_email: user.email,
        p_lead_id: leadId,
        p_placeholders: contractForm.placeholders
      })

      if (error) throw error

      const contractId = data
      
      // Try to send WhatsApp notification automatically
      if (contractId && recipientPhone) {
        try {
          console.log('📱 Enviando contrato via WhatsApp automaticamente...')
          const whatsappSent = await sendContractAfterCreation(contractId)
          
          if (whatsappSent) {
            alert('Contrato criado e enviado via WhatsApp com sucesso! 📱')
          } else {
            alert('Contrato criado com sucesso! ⚠️ Não foi possível enviar via WhatsApp - você pode copiar o link manualmente.')
          }
        } catch (whatsappError) {
          console.error('Erro no WhatsApp:', whatsappError)
          alert('Contrato criado com sucesso! ⚠️ Erro ao enviar via WhatsApp - você pode copiar o link manualmente.')
        }
      } else {
        alert('Contrato criado com sucesso! ℹ️ Sem telefone cadastrado - envie o link manualmente.')
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
        p_organization_id: organizationId,
        p_created_by_email: user.email
      })

      if (error) throw error

      alert('Template padrão criado com sucesso!')
      loadData()
    } catch (error) {
      console.error('Erro ao criar template padrão:', error)
      alert('Erro ao criar template padrão')
    }
  }

  const resetTemplateForm = () => {
    setTemplateForm({ name: '', content: '' })
    setShowTemplateModal(false)
  }

  const resetContractForm = () => {
    setContractForm({
      template_id: '',
      recipient_type: 'lead',
      lead_id: '',
      custom_name: '',
      custom_email: '',
      custom_phone: '',
      placeholders: {}
    })
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
    const variants = {
      pending: { className: 'bg-yellow-900/20 text-yellow-400 border-yellow-400/30', icon: Clock },
      signed: { className: 'bg-green-900/20 text-green-400 border-green-400/30', icon: CheckCircle },
      expired: { className: 'bg-red-900/20 text-red-400 border-red-400/30', icon: XCircle },
      cancelled: { className: 'bg-gray-900/20 text-gray-400 border-gray-400/30', icon: XCircle }
    }
    
    const labels = {
      pending: 'Pendente',
      signed: 'Assinado',
      expired: 'Expirado',
      cancelled: 'Cancelado'
    }

    const config = variants[status as keyof typeof variants]
    const Icon = config.icon

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {labels[status as keyof typeof labels]}
      </Badge>
    )
  }

  const getSigningUrl = (contractId: string) => {
    return `${window.location.origin}/assinar-contrato/${contractId}`
  }

  const copySigningUrl = (contractId: string) => {
    const url = getSigningUrl(contractId)
    navigator.clipboard.writeText(url)
    alert('Link copiado para a área de transferência!')
  }

  const sendContractWhatsApp = async (contractId: string) => {
    try {
      const success = await sendContractAfterCreation(contractId)
      if (success) {
        alert('✅ Contrato reenviado via WhatsApp com sucesso!')
        loadData() // Refresh to show updated whatsapp_sent_at
      } else {
        alert('❌ Erro ao enviar contrato via WhatsApp. Verifique se o telefone está correto.')
      }
    } catch (error) {
      console.error('Erro ao reenviar contrato:', error)
      alert('❌ Erro ao enviar contrato via WhatsApp')
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
INSTITUTO DE MENTORIA MÉDICA GABRIEL MAIA LTDA
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
Assinado em: ${contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('pt-BR') : 'Data não disponível'}`

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
        alert('Conteúdo do contrato não encontrado')
      }
    } catch (error) {
      console.error('Erro ao carregar contrato:', error)
      alert('Erro ao visualizar contrato')
    }
  }

  const handleDeleteContract = async (contractId: string, contractName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o contrato de "${contractName}"?\nEsta ação não pode ser desfeita.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId)

      if (error) throw error

      alert('Contrato excluído com sucesso!')
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

      alert('Configurações de assinatura salvas com sucesso!')
      loadData()
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      alert('Erro ao salvar configurações')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
      </div>
    )
  }

  // Summary stats
  const totalContracts = contracts.length
  const pendingContracts = contracts.filter(c => c.status === 'pending').length
  const signedContracts = contracts.filter(c => c.status === 'signed').length
  const activeTemplates = templates.filter(t => t.is_active).length

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestão de Contratos</h1>
          <p className="text-gray-400">Gerencie templates e contratos eletrônicos</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Templates Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{activeTemplates}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Contratos Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{pendingContracts}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Contratos Assinados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{signedContracts}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">
              Total Contratos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalContracts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="contracts" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">
            Contratos
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">
            Templates
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white">Todos os status</SelectItem>
                  <SelectItem value="pending" className="text-white">Pendentes</SelectItem>
                  <SelectItem value="signed" className="text-white">Assinados</SelectItem>
                  <SelectItem value="expired" className="text-white">Expirados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Dialog open={showContractModal} onOpenChange={setShowContractModal}>
              <DialogTrigger asChild>
                <Button className="bg-[#D4AF37] hover:bg-[#B8860B]">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Contrato
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">Criar Novo Contrato</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateContract} className="space-y-4">
                  <div>
                    <Label className="text-white">Template *</Label>
                    <Select
                      value={contractForm.template_id}
                      onValueChange={(value) => setContractForm(prev => ({ ...prev, template_id: value }))}
                      required
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Selecione um template" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {templates.filter(t => t.is_active).map((template) => (
                          <SelectItem key={template.id} value={template.id} className="text-white">
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-white">Destinatário</Label>
                    <Select
                      value={contractForm.recipient_type}
                      onValueChange={(value) => setContractForm(prev => ({ ...prev, recipient_type: value }))}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="lead" className="text-white">Lead Existente</SelectItem>
                        <SelectItem value="custom" className="text-white">Pessoa Externa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {contractForm.recipient_type === 'lead' ? (
                    <div>
                      <Label className="text-white">Lead *</Label>
                      <Select
                        value={contractForm.lead_id}
                        onValueChange={(value) => setContractForm(prev => ({ ...prev, lead_id: value }))}
                        required
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue placeholder="Selecione um lead" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {leads.map((lead) => (
                            <SelectItem key={lead.id} value={lead.id} className="text-white">
                              {lead.nome_completo} ({lead.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label className="text-white">Nome Completo *</Label>
                        <Input
                          value={contractForm.custom_name}
                          onChange={(e) => setContractForm(prev => ({ ...prev, custom_name: e.target.value }))}
                          className="bg-gray-800 border-gray-700 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-white">Email *</Label>
                        <Input
                          type="email"
                          value={contractForm.custom_email}
                          onChange={(e) => setContractForm(prev => ({ ...prev, custom_email: e.target.value }))}
                          className="bg-gray-800 border-gray-700 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-white">Telefone</Label>
                        <Input
                          value={contractForm.custom_phone}
                          onChange={(e) => setContractForm(prev => ({ ...prev, custom_phone: e.target.value }))}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowContractModal(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-[#D4AF37] hover:bg-[#B8860B]">
                      Criar Contrato
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Contracts Table */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Destinatário</TableHead>
                    <TableHead className="text-gray-300">Template</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Criado</TableHead>
                    <TableHead className="text-gray-300">Expira</TableHead>
                    <TableHead className="text-gray-300">WhatsApp</TableHead>
                    <TableHead className="text-gray-300">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id} className="border-gray-700">
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">{contract.recipient_name}</div>
                          <div className="text-sm text-gray-400">{contract.recipient_email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{contract.template_name}</TableCell>
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(contract.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(contract.expires_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {contract.whatsapp_sent_at ? (
                          <div className="text-xs">
                            <Badge className="bg-green-900/20 text-green-400 border-green-400/30">
                              <MessageCircle className="h-3 w-3 mr-1" />
                              Enviado
                            </Badge>
                            <p className="text-gray-500 mt-1">
                              {new Date(contract.whatsapp_sent_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        ) : (
                          <Badge className="bg-gray-900/20 text-gray-400 border-gray-400/30">
                            Não enviado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {contract.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => copySigningUrl(contract.id)}
                                className="bg-blue-600 hover:bg-blue-700"
                                title="Copiar link"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => sendContractWhatsApp(contract.id)}
                                className="bg-green-600 hover:bg-green-700"
                                title="Enviar/Reenviar via WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewContract(contract)}
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                            title="Visualizar contrato"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteContract(contract.id, contract.recipient_name)}
                            className="border-red-600 text-red-400 hover:bg-red-700/20"
                            title="Excluir contrato"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {contracts.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Nenhum contrato encontrado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handleCreateDefaultTemplate}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Settings className="h-4 w-4 mr-2" />
              Criar Template Padrão
            </Button>

            <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
              <DialogTrigger asChild>
                <Button className="bg-[#D4AF37] hover:bg-[#B8860B]">
                  <Plus className="h-4 w-4 mr-2" />
                  {editingTemplate ? 'Editar Template' : 'Novo Template'}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    {editingTemplate ? 'Editar Template' : 'Criar Novo Template'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate} className="space-y-4">
                  <div>
                    <Label className="text-white">Nome do Template *</Label>
                    <Input
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-white">Conteúdo do Contrato *</Label>
                    <p className="text-xs text-gray-400 mb-2">
                      Use placeholders como [NOME_COMPLETO], [DATA], [CPF], [ENDERECO] que serão substituídos automaticamente.
                    </p>
                    <Textarea
                      value={templateForm.content}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white min-h-[400px]"
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={resetTemplateForm}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-[#D4AF37] hover:bg-[#B8860B]">
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
              <Card key={template.id} className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white">{template.name}</CardTitle>
                      <p className="text-sm text-gray-400">
                        Criado em {new Date(template.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditTemplate(template)}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-300 max-h-32 overflow-hidden">
                    {template.content.substring(0, 200)}...
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {templates.length === 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="text-center py-8 text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum template encontrado</p>
                <p className="text-sm">Crie seu primeiro template para começar a enviar contratos</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Configurações de Assinatura</CardTitle>
              <p className="text-gray-400">Configure os dados que aparecerão na assinatura dos contratos</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSignatureSettings} className="space-y-4">
                <div>
                  <Label className="text-white">Nome do Responsável *</Label>
                  <Input
                    value={signatureForm.signature_name}
                    onChange={(e) => setSignatureForm(prev => ({ ...prev, signature_name: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Ex: Gabriel Maia"
                    required
                  />
                </div>

                <div>
                  <Label className="text-white">Cargo/Título</Label>
                  <Input
                    value={signatureForm.signature_title}
                    onChange={(e) => setSignatureForm(prev => ({ ...prev, signature_title: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Ex: Diretor Executivo"
                  />
                </div>

                <div>
                  <Label className="text-white">Documento (CPF/CNPJ)</Label>
                  <Input
                    value={signatureForm.signature_document}
                    onChange={(e) => setSignatureForm(prev => ({ ...prev, signature_document: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Ex: CPF: XXX.XXX.XXX-XX"
                  />
                </div>

                {/* Drawn Signature */}
                <div>
                  <Label className="text-white">Assinatura Desenhada da Contratada</Label>
                  <p className="text-gray-400 text-xs mb-2">Desenhe a assinatura que aparecerá nos contratos como contratada</p>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-3 max-w-md">
                    <canvas
                      ref={orgSigCanvasRef}
                      width={360}
                      height={150}
                      className="w-full border rounded bg-white cursor-crosshair"
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
                      <p className="text-gray-400 text-xs mb-1">Assinatura salva:</p>
                      <img src={signatureForm.signature_image} alt="Assinatura" className="h-12 bg-white rounded p-1" />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={orgSigClear}
                    className="mt-2 border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Limpar Assinatura
                  </Button>
                </div>

                <Button type="submit" className="bg-[#D4AF37] hover:bg-[#B8860B]">
                  <Settings className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Preview da Assinatura */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Prévia da Assinatura</CardTitle>
              <p className="text-gray-400">Como aparecerá nos contratos:</p>
            </CardHeader>
            <CardContent>
              <div className="bg-white p-6 rounded-lg">
                <div className="text-center space-y-2">
                  {signatureForm.signature_image && (
                    <img src={signatureForm.signature_image} alt="Assinatura" className="h-14 mx-auto mb-2" />
                  )}
                  <div className="border-b border-gray-300 pb-2 mb-4">
                    <p className="text-gray-900 font-semibold">{signatureForm.signature_name || '[Nome do Responsável]'}</p>
                  </div>
                  {signatureForm.signature_title && (
                    <p className="text-gray-700 text-sm">{signatureForm.signature_title}</p>
                  )}
                  {signatureForm.signature_document && (
                    <p className="text-gray-700 text-sm">{signatureForm.signature_document}</p>
                  )}
                  <p className="text-gray-700 text-sm">INSTITUTO DE MENTORIA MÉDICA GABRIEL MAIA LTDA</p>
                  <p className="text-gray-700 text-xs">CNPJ: 56.267.958/0001-60</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Contract Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-white">
              Visualizar Contrato - {viewingContract?.recipient_name}
            </DialogTitle>
          </DialogHeader>
          
          {viewingContract && (
            <div className="space-y-4">
              {/* Contract Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800 rounded-lg">
                <div>
                  <Label className="text-gray-400">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(viewingContract.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400">Criado em</Label>
                  <p className="text-white mt-1">
                    {new Date(viewingContract.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-400">Expira em</Label>
                  <p className="text-white mt-1">
                    {new Date(viewingContract.expires_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-400">Email</Label>
                  <p className="text-white mt-1">{viewingContract.recipient_email}</p>
                </div>
              </div>

              {/* Contract Content */}
              <div className="max-h-[60vh] overflow-y-auto p-4 bg-white rounded-lg border border-gray-300">
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
                  className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copySigningUrl(viewingContract.id)}
                  className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Link
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowViewModal(false)}
                  className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}