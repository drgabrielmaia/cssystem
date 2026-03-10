'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  PenTool,
  Download,
  Clock
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { sendContractSignedConfirmation } from '@/lib/contract-whatsapp'

interface ContractForSigning {
  id: string
  recipient_name: string
  recipient_email: string
  filled_content: string
  status: string
  expires_at: string
  created_at: string
  signature_data?: any
  organization_id?: string
  lead_id?: string
}

export default function ContractSigningPage() {
  const params = useParams()
  const contractId = params.contractId as string
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null)
  
  const [contract, setContract] = useState<ContractForSigning | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [error, setError] = useState('')
  const [organizationSignature, setOrganizationSignature] = useState<any>(null)
  
  // Signature state
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1) // 1: Info, 2: Review, 3: Sign, 4: Complete
  
  // Form data for additional info
  const [formData, setFormData] = useState({
    cpf: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: ''
  })

  useEffect(() => {
    if (contractId) {
      loadContract()
    }
  }, [contractId])

  const loadContract = async () => {
    setLoading(true)
    setError('')
    
    try {
      const { data, error } = await supabase.rpc('get_contract_for_signing', {
        p_contract_id: contractId
      })

      if (error) throw error
      
      if (data && data.length > 0) {
        const contractData = data[0]
        setContract(contractData)
        
        // Define o step inicial baseado no status do contrato
        if (contractData.status === 'signed') {
          setCurrentStep(4) // Contrato já assinado, mostrar resultado final
          setSigned(true)
        } else {
          setCurrentStep(1) // Contrato pendente, começar do step 1
        }
        
        // Load organization signature settings
        if (contractData.organization_id) {
          const { data: orgSignature } = await supabase
            .from('organization_signature_settings')
            .select('*')
            .eq('organization_id', contractData.organization_id)
            .single()
          
          if (orgSignature) {
            setOrganizationSignature(orgSignature)
          }
        }
      } else {
        setError('Contrato não encontrado ou expirado')
      }
    } catch (error) {
      console.error('Erro ao carregar contrato:', error)
      setError('Erro ao carregar contrato')
    } finally {
      setLoading(false)
    }
  }

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) e.preventDefault()
    setIsDrawing(true)
    const canvas = signatureCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const x = (clientX - rect.left) * (canvas.width / rect.width)
    const y = (clientY - rect.top) * (canvas.height / rect.height)

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    if ('touches' in e) e.preventDefault()

    const canvas = signatureCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const x = (clientX - rect.left) * (canvas.width / rect.width)
    const y = (clientY - rect.top) * (canvas.height / rect.height)

    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setupCanvas()
      setHasSignature(false)
    }
  }

  const setupCanvas = () => {
    const canvas = signatureCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }

  const getSignatureData = () => {
    const canvas = signatureCanvasRef.current
    if (!canvas) return null
    
    return canvas.toDataURL('image/png')
  }

  const getProcessedContractContent = () => {
    if (!contract) return ''
    
    let content = contract.filled_content
    
    // Replace user data placeholders
    const enderecoCompleto = `${formData.rua}${formData.numero ? ', ' + formData.numero : ''}${formData.bairro ? ', ' + formData.bairro : ''}, ${formData.cidade}, ${formData.estado}, CEP: ${formData.cep}`
    
    content = content.replace(/\[NOME\]/g, contract.recipient_name)
    content = content.replace(/\[EMAIL\]/g, contract.recipient_email)
    content = content.replace(/\[CPF\]/g, formData.cpf || '[CPF]')
    content = content.replace(/\[ENDERECO_COMPLETO\]/g, enderecoCompleto || '[ENDERECO_COMPLETO]')
    content = content.replace(/\[ENDERECO\]/g, enderecoCompleto || '[ENDEREÇO]')
    
    // Remove unused placeholders
    content = content.replace(/\[RG\]/g, '')
    content = content.replace(/\[TELEFONE\]/g, '')
    content = content.replace(/\[PROFISSAO\]/g, '')
    content = content.replace(/\[DATA_NASCIMENTO\]/g, '')
    
    // Create organization signature block
    const orgSigImage = organizationSignature?.signature_image_url ? `[ASSINATURA_ORG_IMAGEM]` : ''
    const orgSignatureBlock = organizationSignature ? `

${orgSigImage}
___________________
${organizationSignature.signature_name}
${organizationSignature.signature_title || ''}
${organizationSignature.signature_document || ''}
INSTITUTO DE MENTORIA MÉDICA GABRIEL MAIA LTDA
CNPJ: 56.267.958/0001-60` : `

___________________
Assinatura da Contratada`

    // Create client signature block with actual signature image
    const clientSignatureBlock = contract.signature_data ? `

[ASSINATURA_IMAGEM]
___________________
${contract.recipient_name}
CPF: ${contract.signature_data.additional_data?.cpf || formData.cpf || '[CPF]'}
Assinatura Digital
Assinado em: ${new Date(contract.signature_data.signed_at).toLocaleDateString('pt-BR')}` : `

___________________
${contract.recipient_name}
CPF: ${formData.cpf || '[CPF]'}
Assinatura do Contratante`

    // Replace signature placeholders
    content = content.replace(/\[ASSINATURA_CONTRATADA\]/g, orgSignatureBlock)
    content = content.replace(/\[ASSINATURA_CONTRATANTE\]/g, clientSignatureBlock)
    content = content.replace(/\[SIGNATURE\]/g, clientSignatureBlock)
    
    return content
  }

  const handleSign = async () => {
    if (!contract || !hasSignature) return

    setSigning(true)
    setError('')

    try {
      const signatureBase64 = getSignatureData()
      const enderecoCompleto = `${formData.rua}${formData.numero ? ', ' + formData.numero : ''}${formData.bairro ? ', ' + formData.bairro : ''}, ${formData.cidade}, ${formData.estado}, CEP: ${formData.cep}`
      
      const signatureData = {
        signature: signatureBase64,
        signer_name: contract.recipient_name,
        signer_email: contract.recipient_email,
        additional_data: {
          ...formData,
          endereco_completo: enderecoCompleto
        },
        signed_at: new Date().toISOString()
      }

      console.log('Enviando dados para assinatura:', { contractId, signatureData })

      // Tentar primeiro com a função simplificada
      let { data, error } = await supabase.rpc('sign_contract_simple', {
        p_contract_id: contractId,
        p_signature_data: signatureData
      })

      // Se der erro, tentar com a função original
      if (error) {
        console.log('Tentando função original:', error.message)
        const result = await supabase.rpc('sign_contract', {
          p_contract_id: contractId,
          p_signature_data: signatureData,
          p_ip_address: null,
          p_user_agent: navigator.userAgent
        })
        data = result.data
        error = result.error
      }

      if (error) {
        console.error('Erro detalhado da função SQL:', error)
        throw new Error(error.message || 'Erro ao executar função de assinatura')
      }

      // Update contract state with signature data
      setContract(prev => prev ? {
        ...prev,
        signature_data: signatureData,
        status: 'signed'
      } : null)

      setSigned(true)
      setCurrentStep(4)

      // Auto-convert lead to mentorado
      if (contract.lead_id && contract.organization_id) {
        try {
          console.log('Converting lead to mentorado:', contract.lead_id)
          const enderecoStr = `${formData.rua}${formData.numero ? ', ' + formData.numero : ''}${formData.bairro ? ', ' + formData.bairro : ''}, ${formData.cidade}, ${formData.estado}, CEP: ${formData.cep}`

          // Buscar dados adicionais do lead (telefone, empresa, etc)
          const { data: leadData } = await supabase
            .from('leads')
            .select('telefone, empresa')
            .eq('id', contract.lead_id)
            .single()

          // Senha padrão para mentorados (via env var)
          const defaultPassword = process.env.NEXT_PUBLIC_DEFAULT_MENTORADO_PWD || ''
          const mentoradoPhone = leadData?.telefone || contract.recipient_phone || null

          // Create mentorado from lead + contract data
          const { data: newMentorado, error: mentoradoError } = await supabase
            .from('mentorados')
            .insert({
              nome_completo: contract.recipient_name,
              email: contract.recipient_email,
              telefone: mentoradoPhone,
              cpf: formData.cpf,
              endereco: enderecoStr,
              lead_id: contract.lead_id,
              organization_id: contract.organization_id,
              password_hash: defaultPassword,
              status_login: 'ativo',
              data_entrada: new Date().toISOString().split('T')[0],
              data_inicio_mentoria: new Date().toISOString().split('T')[0],
            })
            .select('id')
            .single()

          if (mentoradoError) {
            console.error('Erro ao criar mentorado:', mentoradoError)
          } else if (newMentorado) {
            console.log('Mentorado criado:', newMentorado.id)

            // Update lead status to 'convertido'
            await supabase
              .from('leads')
              .update({ status: 'convertido' })
              .eq('id', contract.lead_id)

            // Grant access to ALL modules of this organization
            const { data: modules } = await supabase
              .from('video_modules')
              .select('id')
              .eq('organization_id', contract.organization_id)
              .eq('is_active', true)

            if (modules && modules.length > 0) {
              const accessRows = modules.map((m: any) => ({
                mentorado_id: newMentorado.id,
                module_id: m.id,
                has_access: true,
                granted_by: 'contract-auto',
              }))
              await supabase.from('video_access_control').insert(accessRows)
              console.log(`Acesso liberado a ${modules.length} modulos`)
            }

            // Enviar instruções de acesso via WhatsApp (boas-vindas)
            const BAILEYS_API = 'https://api.medicosderesultado.com.br'
            if (mentoradoPhone) {
              try {
                const loginMessage = `Que otimo, *${contract.recipient_name}*! Seu contrato foi assinado com sucesso! 🎉

Obrigado por assinar o contrato! Agora voce ja tem acesso completo a nossa plataforma. Seguem suas credenciais:

🌐 *Acesse aqui:* cs.medicosderesultado.com.br/mentorado
📧 *Email:* ${contract.recipient_email}
🔒 *Senha:* ${defaultPassword}

Se tiver qualquer duvida sobre a plataforma, e so me chamar aqui! Estou a disposicao. 😊`

                const phone = mentoradoPhone.replace(/\D/g, '')
                await fetch(`${BAILEYS_API}/users/${contract.organization_id}/send`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ to: phone, message: loginMessage })
                })
                console.log('📱 Instruções de acesso enviadas via WhatsApp')
              } catch (whatsappErr) {
                console.error('Erro ao enviar instruções via WhatsApp:', whatsappErr)
              }
            }

            // Enviar mensagem para o financeiro com detalhes do contrato
            try {
              const { data: orgData } = await supabase
                .from('organizations')
                .select('financeiro_phone, name')
                .eq('id', contract.organization_id)
                .single()

              // Buscar dados financeiros do contrato
              const { data: contractDetails } = await supabase
                .from('contracts')
                .select('valor, valor_pago, valor_restante, forma_negociacao, data_contrato')
                .eq('id', contractId)
                .single()

              if (orgData?.financeiro_phone) {
                const finPhone = orgData.financeiro_phone.replace(/\D/g, '')
                const valor = contractDetails?.valor ? `R$ ${Number(contractDetails.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado'
                const valorPago = contractDetails?.valor_pago ? `R$ ${Number(contractDetails.valor_pago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'
                const valorRestante = contractDetails?.valor_restante ? `R$ ${Number(contractDetails.valor_restante).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : valor
                const formaNeg = contractDetails?.forma_negociacao || 'Não definida'

                const financeiroMsg = `📋 *NOVO CONTRATO ASSINADO*

👤 *Contratante:* ${contract.recipient_name}
📧 Email: ${contract.recipient_email}
📱 Telefone: ${mentoradoPhone || 'Não informado'}

💰 *Detalhes Financeiros:*
📌 Valor Total: ${valor}
✅ Valor Pago (entrada): ${valorPago}
⏳ Valor Restante: ${valorRestante}
💳 Forma de Negociação: ${formaNeg}

📅 Data do Contrato: ${contractDetails?.data_contrato ? new Date(contractDetails.data_contrato + 'T00:00:00').toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}

⚠️ *Ação necessária:* Verificar forma de pagamento e acompanhar parcelas.`

                await fetch(`${BAILEYS_API}/users/${contract.organization_id}/send`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ to: finPhone, message: financeiroMsg })
                })
                console.log('💰 Mensagem enviada para o financeiro:', finPhone)
              } else {
                console.warn('⚠️ Telefone do financeiro não configurado para esta organização')
              }
            } catch (finErr) {
              console.error('Erro ao enviar msg para financeiro:', finErr)
            }
          }
        } catch (convError) {
          console.error('Erro na conversao lead->mentorado:', convError)
        }
      }

      alert('🎉 Contrato assinado com sucesso! Suas credenciais de acesso foram enviadas via WhatsApp.')
      
    } catch (error) {
      console.error('Erro ao assinar contrato:', error)
      setError('Erro ao assinar contrato. Tente novamente.')
    } finally {
      setSigning(false)
    }
  }

  // Form validation functions
  const validateStep1 = () => {
    return formData.cpf && formData.rua && formData.cidade && formData.estado && formData.cep
  }

  const goToNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
    } else if (currentStep === 2) {
      setCurrentStep(3)
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 1 && currentStep < 4) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderContractHTML = () => {
    return getProcessedContractContent()
      .replace(/\[ASSINATURA_IMAGEM\]/g,
        contract?.signature_data?.signature
          ? `<img src="${contract.signature_data.signature}" alt="Assinatura Contratante" style="max-width: 200px; height: 60px; margin: 10px 0;" />`
          : ''
      )
      .replace(/\[ASSINATURA_ORG_IMAGEM\]/g,
        organizationSignature?.signature_image_url
          ? `<img src="${organizationSignature.signature_image_url}" alt="Assinatura Contratada" style="max-width: 200px; height: 60px; margin: 10px 0;" />`
          : ''
      )
  }

  const downloadContractPDF = () => {
    if (!contract) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const contractContent = renderContractHTML()

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Contrato - ${contract.recipient_name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
            }
            .signature-img {
              max-width: 200px;
              height: 60px;
              margin: 10px 0;
            }
            @media print {
              body { margin: 0; padding: 15px; }
            }
          </style>
        </head>
        <body>
          <div style="white-space: pre-wrap; font-size: 14px;">
            ${contractContent}
          </div>
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    
    // Wait for images to load, then print
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  useEffect(() => {
    if (signatureCanvasRef.current) {
      setupCanvas()
    }
  }, [contract])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37] mx-auto mb-4"></div>
          <p className="text-white">Carregando contrato...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-red-500">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Helper function to render step indicator
  const renderStepIndicator = () => {
    const steps = [
      { number: 1, title: 'Informações', description: 'Dados pessoais' },
      { number: 2, title: 'Revisão', description: 'Verificar contrato' },
      { number: 3, title: 'Assinatura', description: 'Assinar digitalmente' },
      { number: 4, title: 'Concluído', description: 'Contrato finalizado' }
    ]

    return (
      <div className="flex items-center justify-center space-x-4 mb-8">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full border-2 
              ${currentStep >= step.number 
                ? 'bg-[#D4AF37] border-[#D4AF37] text-black' 
                : 'bg-gray-800 border-gray-600 text-gray-400'
              }
            `}>
              {currentStep > step.number ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                step.number
              )}
            </div>
            <div className="ml-2 text-center">
              <p className={`text-sm font-medium ${currentStep >= step.number ? 'text-[#D4AF37]' : 'text-gray-400'}`}>
                {step.title}
              </p>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 h-px mx-4 ${currentStep > step.number ? 'bg-[#D4AF37]' : 'bg-gray-600'}`} />
            )}
          </div>
        ))}
      </div>
    )
  }

  if (!contract) return null

  const isExpired = new Date(contract.expires_at) < new Date()

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-red-500">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Contrato Expirado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white">Este contrato expirou e não pode mais ser assinado.</p>
            <p className="text-gray-400 text-sm mt-2">
              Entre em contato para solicitar um novo contrato.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <Card className="mb-6 bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 bg-[#D4AF37] rounded-lg">
                  <FileText className="h-6 w-6 text-black" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Assinatura de Contrato</h1>
                  <p className="text-gray-400">Customer Success System</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={`${currentStep === 4 ? 'bg-green-900/20 text-green-400 border-green-400/30' : 'bg-yellow-900/20 text-yellow-400 border-yellow-400/30'}`}>
                  {currentStep === 4 ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                  {currentStep === 4 ? 'Assinado' : 'Pendente'}
                </Badge>
                <p className="text-sm text-gray-400 mt-1">
                  Expira em: {new Date(contract.expires_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step 1: Information Collection */}
        {currentStep === 1 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">Informações Pessoais</CardTitle>
              <p className="text-gray-400">
                Preencha seus dados para personalizar o contrato
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-white">Nome Completo</Label>
                    <Input
                      value={contract.recipient_name}
                      disabled
                      className="bg-gray-700 border-gray-600 text-gray-300"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Email</Label>
                    <Input
                      value={contract.recipient_email}
                      disabled
                      className="bg-gray-700 border-gray-600 text-gray-300"
                    />
                  </div>
                </div>
                
                {/* Required Fields */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-white">CPF *</Label>
                    <Input
                      value={formData.cpf}
                      onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                      placeholder="000.000.000-00"
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="space-y-4">
                <h3 className="text-white text-lg font-semibold">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-white">Rua/Avenida *</Label>
                    <Input
                      value={formData.rua}
                      onChange={(e) => setFormData(prev => ({ ...prev, rua: e.target.value }))}
                      placeholder="Nome da rua ou avenida"
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-white">Número</Label>
                    <Input
                      value={formData.numero}
                      onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                      placeholder="123"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Bairro</Label>
                    <Input
                      value={formData.bairro}
                      onChange={(e) => setFormData(prev => ({ ...prev, bairro: e.target.value }))}
                      placeholder="Nome do bairro"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Cidade *</Label>
                    <Input
                      value={formData.cidade}
                      onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                      placeholder="Nome da cidade"
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-white">Estado *</Label>
                    <Input
                      value={formData.estado}
                      onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                      placeholder="SP"
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-white">CEP *</Label>
                    <Input
                      value={formData.cep}
                      onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
                      placeholder="00000-000"
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={goToNextStep}
                  disabled={!validateStep1()}
                  className="bg-[#D4AF37] hover:bg-[#B8860B] text-black font-semibold px-8"
                >
                  Continuar
                  <Download className="h-4 w-4 ml-2 rotate-180" />
                </Button>
              </div>

              {!validateStep1() && (
                <p className="text-yellow-400 text-sm text-center">
                  Preencha todos os campos obrigatórios (*) para continuar
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Contract Review */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-xl">Revisão do Contrato</CardTitle>
                <p className="text-gray-400">
                  Verifique se todas as informações estão corretas antes de prosseguir
                </p>
              </CardHeader>
              <CardContent>
                <div className="bg-white p-6 rounded-lg text-black max-h-96 overflow-y-auto">
                  <div
                    className="whitespace-pre-wrap text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderContractHTML() }}
                  />
                </div>
                
                <div className="flex justify-between pt-6">
                  <Button
                    onClick={goToPreviousStep}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={goToNextStep}
                    className="bg-[#D4AF37] hover:bg-[#B8860B] text-black font-semibold px-8"
                  >
                    Concordo e Prosseguir
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Signature */}
        {currentStep === 3 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center">
                <PenTool className="h-6 w-6 mr-2" />
                Assinatura Digital
              </CardTitle>
              <p className="text-gray-400">
                Desenhe sua assinatura para finalizar o contrato
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Info — first */}
              <div className="bg-gray-700 p-5 rounded-lg">
                <h3 className="text-white font-semibold text-lg mb-3">Resumo dos Dados</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-400">Nome:</span> <span className="text-white">{contract.recipient_name}</span></div>
                  <div><span className="text-gray-400">Email:</span> <span className="text-white">{contract.recipient_email}</span></div>
                  <div><span className="text-gray-400">CPF:</span> <span className="text-white">{formData.cpf}</span></div>
                  <div className="sm:col-span-2"><span className="text-gray-400">Endereço:</span> <span className="text-white">{`${formData.rua}${formData.numero ? ', ' + formData.numero : ''}${formData.bairro ? ', ' + formData.bairro : ''}, ${formData.cidade}, ${formData.estado}, CEP: ${formData.cep}`}</span></div>
                </div>
              </div>

              {/* Signature Panel — below info */}
              <div className="space-y-4">
                <Label className="text-white text-lg">Sua Assinatura</Label>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 max-w-lg mx-auto">
                  <canvas
                    ref={signatureCanvasRef}
                    width={400}
                    height={200}
                    className="w-full border rounded bg-white cursor-crosshair"
                    style={{ touchAction: 'none' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSignature}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Limpar Assinatura
                  </Button>
                </div>
              </div>

              <Separator className="bg-gray-700" />

              <div className="flex justify-between pt-4">
                <Button
                  onClick={goToPreviousStep}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Voltar para Revisão
                </Button>
                
                <Button
                  onClick={handleSign}
                  disabled={!hasSignature || signing}
                  className="bg-[#D4AF37] hover:bg-[#B8860B] text-black font-semibold px-8"
                >
                  {signing ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                      Assinando...
                    </div>
                  ) : (
                    <>
                      <PenTool className="h-4 w-4 mr-2" />
                      Assinar Contrato
                    </>
                  )}
                </Button>
              </div>

              {!hasSignature && (
                <p className="text-yellow-400 text-sm text-center">
                  Desenhe sua assinatura no campo acima para continuar
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Completion */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <Card className="bg-gray-800 border-green-500">
              <CardHeader>
                <CardTitle className="text-green-400 flex items-center text-2xl">
                  <CheckCircle className="h-8 w-8 mr-3" />
                  Contrato Assinado com Sucesso!
                </CardTitle>
                <p className="text-gray-400">
                  Seu contrato foi processado e assinado digitalmente
                </p>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-white">
                  Obrigado por completar a assinatura do contrato.
                </p>
                <p className="text-gray-400 text-sm">
                  Você receberá uma cópia por email em breve.
                </p>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-white text-sm">
                    <strong>Assinado em:</strong> {contract.signature_data?.signed_at ? new Date(contract.signature_data.signed_at).toLocaleString('pt-BR') : 'Agora'}
                  </p>
                </div>
                
                <Button
                  onClick={downloadContractPDF}
                  className="bg-[#D4AF37] hover:bg-[#B8860B] text-black font-semibold px-8"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Contrato em PDF
                </Button>
              </CardContent>
            </Card>

            {/* Final Contract Display */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Contrato Final</CardTitle>
                <p className="text-gray-400">Documento completo com assinatura</p>
              </CardHeader>
              <CardContent>
                <div className="bg-white p-6 rounded-lg text-black">
                  <div
                    className="whitespace-pre-wrap text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderContractHTML() }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}