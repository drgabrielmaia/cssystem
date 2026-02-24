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
  
  // Form data for additional info
  const [formData, setFormData] = useState({
    cpf: '',
    endereco: ''
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
Assinatura Digital
Assinado em: ${new Date(contract.signature_data.signed_at).toLocaleDateString('pt-BR')}` : `

___________________
${contract.recipient_name}
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

      setSigned(true)
      
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

  if (signed || contract?.status === 'signed') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-green-500">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Contrato Assinado
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-white mb-4">Seu contrato foi assinado com sucesso!</p>
            <p className="text-gray-400 text-sm">
              Você receberá uma cópia por email em breve.
            </p>
          </CardContent>
        </Card>
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
      <div className="max-w-4xl mx-auto px-4">
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
                <Badge className="bg-yellow-900/20 text-yellow-400 border-yellow-400/30">
                  <Clock className="h-3 w-3 mr-1" />
                  Pendente
                </Badge>
                <p className="text-sm text-gray-400 mt-1">
                  Expira em: {new Date(contract.expires_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contract Content */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Contrato</CardTitle>
                <p className="text-gray-400">Leia atentamente antes de assinar</p>
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

          {/* Signing Panel */}
          <div className="space-y-6">
            {/* Recipient Info */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Informações do Contratante</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-gray-400">Nome</Label>
                  <p className="text-white font-medium">{contract.recipient_name}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Email</Label>
                  <p className="text-white">{contract.recipient_email}</p>
                </div>
              </CardContent>
            </Card>

            {/* Additional Info Form */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Informações Adicionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white">CPF</Label>
                  <Input
                    value={formData.cpf}
                    onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">Endereço</Label>
                  <Input
                    value={formData.endereco}
                    onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                    placeholder="Seu endereço completo"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Signature Panel */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center">
                  <PenTool className="h-5 w-5 mr-2" />
                  Assinatura Digital
                </CardTitle>
                <p className="text-gray-400 text-sm">
                  Desenhe sua assinatura no espaço abaixo
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-4">
                  <canvas
                    ref={signatureCanvasRef}
                    width={300}
                    height={150}
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
                    Limpar
                  </Button>
                </div>

                <Separator className="bg-gray-700" />

                <Button
                  onClick={handleSign}
                  disabled={!hasSignature || signing}
                  className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-semibold"
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

                {!hasSignature && (
                  <p className="text-yellow-400 text-sm text-center">
                    Desenhe sua assinatura para continuar
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}