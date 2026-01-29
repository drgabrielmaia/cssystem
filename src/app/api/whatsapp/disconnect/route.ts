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

    console.log(`🔌 Desconectando WhatsApp para organização: ${organizationId}`)

    await multiOrgWhatsAppService.disconnect(organizationId)

    return NextResponse.json({
      success: true,
      message: 'WhatsApp desconectado com sucesso',
      organizationId
    })

  } catch (error) {
    console.error('❌ Erro ao desconectar WhatsApp:', error)

    return NextResponse.json({
      success: false,
      message: 'Erro ao desconectar WhatsApp',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}