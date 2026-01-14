import { NextResponse } from 'next/server'
import { whatsappCoreAPI } from '@/lib/whatsapp-core-api'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phoneNumber, message, sender } = body

    if (!phoneNumber || !message) {
      return NextResponse.json({
        success: false,
        error: 'Número de telefone e mensagem são obrigatórios'
      }, { status: 400 })
    }

    // Enviar via WhatsApp Core API
    try {
      console.log('🔄 Enviando mensagem via WhatsApp API...')
      const response = await whatsappCoreAPI.sendMessage(phoneNumber, message)

      if (response.success && response.data) {
        console.log('✅ Mensagem enviada com sucesso:', response.data)

        return NextResponse.json({
          success: true,
          message: 'Mensagem enviada com sucesso',
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