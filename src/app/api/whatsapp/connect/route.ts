import { NextRequest, NextResponse } from 'next/server'
import { multiOrgWhatsAppService } from '@/lib/whatsapp-multi-org-service'

export async function POST(request: NextRequest) {
  try {
    console.log(`📡 [DEBUG-API] POST /api/whatsapp/connect chamado`);
    const body = await request.json()
    const { organizationId } = body
    console.log(`📊 [DEBUG-API] Body recebido:`, { organizationId });

    if (!organizationId) {
      console.log(`❌ [DEBUG-API] organizationId não fornecido`);
      return NextResponse.json({
        success: false,
        message: 'organizationId é obrigatório'
      }, { status: 400 })
    }

    console.log(`🚀 [DEBUG-API] Conectando WhatsApp para organização: ${organizationId}`)

    await multiOrgWhatsAppService.connect(organizationId)
    console.log(`✅ [DEBUG-API] multiOrgWhatsAppService.connect() completado para org: ${organizationId}`);

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
    console.log(`📡 [DEBUG-API] GET /api/whatsapp/connect chamado`);
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    console.log(`📊 [DEBUG-API] organizationId extraído:`, organizationId);

    if (!organizationId) {
      console.log(`❌ [DEBUG-API] organizationId não fornecido no GET`);
      return NextResponse.json({
        success: false,
        message: 'organizationId é obrigatório'
      }, { status: 400 })
    }

    console.log(`🔍 [DEBUG-API] Buscando status para org: ${organizationId}`);
    const status = multiOrgWhatsAppService.getConnectionStatus(organizationId)
    const qrCode = multiOrgWhatsAppService.getQRCode(organizationId)
    console.log(`📊 [DEBUG-API] Status obtido:`, { status, hasQrCode: !!qrCode });

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