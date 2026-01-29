import { NextRequest, NextResponse } from 'next/server'
import { multiOrgWhatsAppService } from '@/lib/whatsapp-multi-org-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({
        success: false,
        message: 'organizationId é obrigatório'
      }, { status: 400 })
    }

    const qrCode = multiOrgWhatsAppService.getQRCode(organizationId)
    const status = multiOrgWhatsAppService.getConnectionStatus(organizationId)

    if (!qrCode && !status.isReady) {
      return NextResponse.json({
        success: false,
        message: 'QR Code não disponível. Inicie a conexão primeiro.',
        organizationId,
        status
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      organizationId,
      qrCode,
      status
    })

  } catch (error) {
    console.error('❌ Erro ao obter QR Code:', error)

    return NextResponse.json({
      success: false,
      message: 'Erro ao obter QR Code',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}