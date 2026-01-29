import { NextRequest, NextResponse } from 'next/server'
import { multiOrgWhatsAppService } from '@/lib/whatsapp-multi-org-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId } = body

    if (!organizationId) {
      return NextResponse.json({
        success: false,
        message: 'organizationId é obrigatório'
      }, { status: 400 })
    }

    console.log(`🚀 Conectando WhatsApp para organização: ${organizationId}`)

    await multiOrgWhatsAppService.connect(organizationId)

    return NextResponse.json({
      success: true,
      message: 'Conexão WhatsApp iniciada',
      organizationId
    })

  } catch (error) {
    console.error('❌ Erro ao conectar WhatsApp:', error)

    return NextResponse.json({
      success: false,
      message: 'Erro ao conectar WhatsApp',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

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

    const status = multiOrgWhatsAppService.getConnectionStatus(organizationId)
    const qrCode = multiOrgWhatsAppService.getQRCode(organizationId)

    return NextResponse.json({
      organizationId,
      ...status,
      qrCode
    })

  } catch (error) {
    console.error('❌ Erro ao verificar status WhatsApp:', error)

    return NextResponse.json({
      success: false,
      message: 'Erro ao verificar status WhatsApp',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}