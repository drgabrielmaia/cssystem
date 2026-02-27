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
    endereco: '',
    telefone: '',
    rg: '',
    profissao: '',
    data_nascimento: ''
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
    setIsDrawing(true)
    const canvas = signatureCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const x = clientX - rect.left
    const y = clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    const canvas = signatureCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const x = clientX - rect.left
    const y = clientY - rect.top

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
    content = content.replace(/\[NOME\]/g, contract.recipient_name)
    content = content.replace(/\[EMAIL\]/g, contract.recipient_email)
    content = content.replace(/\[CPF\]/g, formData.cpf || '[CPF]')
    content = content.replace(/\[RG\]/g, formData.rg || '[RG]')
    content = content.replace(/\[ENDERECO\]/g, formData.endereco || '[ENDEREÇO]')
    content = content.replace(/\[TELEFONE\]/g, formData.telefone || '[TELEFONE]')
    content = content.replace(/\[PROFISSAO\]/g, formData.profissao || '[PROFISSÃO]')
    content = content.replace(/\[DATA_NASCIMENTO\]/g, formData.data_nascimento ? new Date(formData.data_nascimento).toLocaleDateString('pt-BR') : '[DATA DE NASCIMENTO]')
    
    // Create organization signature block
    const orgSignatureBlock = organizationSignature ? `
    
___________________
${organizationSignature.signature_name}
${organizationSignature.signature_title || ''}
${organizationSignature.signature_document || ''}
INSTITUTO DE MENTORIA MÉDICA GABRIEL MAIA LTDA
CNPJ: 56.267.958/0001-60` : `

___________________
Assinatura da Contratada`

    // Create client signature block
    const clientSignatureBlock = contract.signature_data ? `

___________________
${contract.recipient_name}
CPF: ${formData.cpf || contract.signature_data.additional_data?.cpf || '[CPF]'}
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
      const signatureData = {
        signature: signatureBase64,
        signer_name: contract.recipient_name,
        signer_email: contract.recipient_email,
        additional_data: formData,
        signed_at: new Date().toISOString()
      }

      const { data, error } = await supabase.rpc('sign_contract', {
        p_contract_id: contractId,
        p_signature_data: signatureData,
        p_ip_address: null, // Will be set by the database function if needed
        p_user_agent: navigator.userAgent
      })

      if (error) throw error

      // Update contract state with signature data
      setContract(prev => prev ? {
        ...prev,
        signature_data: signatureData,
        status: 'signed'
      } : null)
      
      setSigned(true)
      setCurrentStep(4)
      
      // Try to send WhatsApp confirmation
      try {
        console.log('📱 Enviando confirmação via WhatsApp...')
        const confirmationSent = await sendContractSignedConfirmation(contractId)
        
        if (confirmationSent) {
          alert('🎉 Contrato assinado com sucesso! Uma confirmação foi enviada via WhatsApp.')
        } else {
          alert('🎉 Contrato assinado com sucesso!')
          console.log('⚠️ Não foi possível enviar confirmação via WhatsApp')
        }
      } catch (whatsappError) {
        console.error('Erro ao enviar confirmação WhatsApp:', whatsappError)
        alert('🎉 Contrato assinado com sucesso!')
      }
      
    } catch (error) {
      console.error('Erro ao assinar contrato:', error)
      setError('Erro ao assinar contrato. Tente novamente.')
    } finally {
      setSigning(false)
    }
  }

  // Form validation functions
  const validateStep1 = () => {
    return formData.cpf && formData.endereco && formData.telefone && formData.rg && formData.profissao && formData.data_nascimento
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
                  <div>
                    <Label className="text-white">RG *</Label>
                    <Input
                      value={formData.rg}
                      onChange={(e) => setFormData(prev => ({ ...prev, rg: e.target.value }))}
                      placeholder="00.000.000-0"
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                </div>
                
                {/* Contact & Personal */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-white">Telefone *</Label>
                    <Input
                      value={formData.telefone}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-white">Profissão *</Label>
                    <Input
                      value={formData.profissao}
                      onChange={(e) => setFormData(prev => ({ ...prev, profissao: e.target.value }))}
                      placeholder="Sua profissão"
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-white">Data de Nascimento *</Label>
                    <Input
                      type="date"
                      value={formData.data_nascimento}
                      onChange={(e) => setFormData(prev => ({ ...prev, data_nascimento: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="text-white">Endereço Completo *</Label>
                <Input
                  value={formData.endereco}
                  onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                  placeholder="Rua, número, bairro, cidade, estado, CEP"
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
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
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {getProcessedContractContent()}
                  </div>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Signature Panel */}
                <div className="space-y-4">
                  <Label className="text-white text-lg">Sua Assinatura</Label>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-4">
                    <canvas
                      ref={signatureCanvasRef}
                      width={400}
                      height={200}
                      className="w-full border rounded bg-white cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  
                  <div className="flex gap-2">
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

                {/* Summary Info */}
                <div className="bg-gray-700 p-6 rounded-lg space-y-4">
                  <h3 className="text-white font-semibold text-lg">Resumo dos Dados</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-400">Nome:</span> <span className="text-white">{contract.recipient_name}</span></div>
                    <div><span className="text-gray-400">CPF:</span> <span className="text-white">{formData.cpf}</span></div>
                    <div><span className="text-gray-400">RG:</span> <span className="text-white">{formData.rg}</span></div>
                    <div><span className="text-gray-400">Telefone:</span> <span className="text-white">{formData.telefone}</span></div>
                    <div><span className="text-gray-400">Profissão:</span> <span className="text-white">{formData.profissao}</span></div>
                    <div><span className="text-gray-400">Data Nasc:</span> <span className="text-white">{new Date(formData.data_nascimento).toLocaleDateString('pt-BR')}</span></div>
                    <div><span className="text-gray-400">Endereço:</span> <span className="text-white">{formData.endereco}</span></div>
                  </div>
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
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {getProcessedContractContent()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}