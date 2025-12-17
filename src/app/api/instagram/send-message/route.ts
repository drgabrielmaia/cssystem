import { NextRequest, NextResponse } from 'next/server'
import { instagramAPI } from '@/lib/instagram-api'

// POST - Enviar mensagem via Instagram
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipient, message } = body

    // Validar dados obrigatórios
    if (!recipient || !message) {
      return NextResponse.json({
        success: false,
        error: 'recipient e message são obrigatórios'
      }, { status: 400 })
    }

    console.log('📤 [Instagram API] Enviando mensagem para:', recipient)
    console.log('💬 [Instagram API] Mensagem:', message)

    // Tentar enviar a mensagem
    const result = await instagramAPI.sendDirectMessage(recipient, message)

    if (result.success) {
      console.log('✅ [Instagram API] Mensagem enviada com sucesso!')
      return NextResponse.json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        data: result.data
      })
    } else {
      console.error('❌ [Instagram API] Falha ao enviar mensagem:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error || 'Erro ao enviar mensagem'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ [Instagram API] Erro no envio:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor ao enviar mensagem'
    }, { status: 500 })
  }
}