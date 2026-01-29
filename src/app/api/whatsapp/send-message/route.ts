import { NextResponse } from 'next/server'
import { multiOrgWhatsAppService } from '@/lib/whatsapp-multi-org-service'
import { whatsappCoreAPI } from '@/lib/whatsapp-core-api'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phoneNumber, message, organizationId, sender, useMultiOrg } = body

    if (!phoneNumber || !message) {
      return NextResponse.json({
        success: false,
        error: 'Número de telefone e mensagem são obrigatórios'
      }, { status: 400 })
    }

    // Se useMultiOrg for true, usar o serviço multi-organização
    if (useMultiOrg && organizationId) {
      try {
        console.log(`🔄 Enviando mensagem via WhatsApp multi-org (${organizationId})...`)
        const success = await multiOrgWhatsAppService.sendMessage(organizationId, phoneNumber, message)

        if (success) {
          return NextResponse.json({
            success: true,
            message: 'Mensagem enviada com sucesso via WhatsApp Web',
            organizationId
          })
        } else {
          throw new Error('Falha ao enviar mensagem via WhatsApp Web')
        }
      } catch (error) {
        console.error('❌ Erro no WhatsApp Web, tentando API externa...', error)
        // Se falhar, tenta a API externa como fallback
      }
    }

    // Enviar via WhatsApp Core API (fallback ou método principal)
    try {
      console.log('🔄 Enviando mensagem via WhatsApp API externa...')
      const response = await whatsappCoreAPI.sendMessage(phoneNumber, message)

      if (response.success && response.data) {
        console.log('✅ Mensagem enviada com sucesso:', response.data)

        return NextResponse.json({
          success: true,
          message: 'Mensagem enviada com sucesso via API externa',
          data: response.data
        })
      } else {
        throw new Error(response.error || 'Erro desconhecido na API')
      }
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error)
      throw error
    }

  } catch (error: any) {
    console.error('❌ Erro ao enviar mensagem WhatsApp:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }, { status: 500 })
  }
}