import { NextRequest, NextResponse } from 'next/server'
import { processAICommand } from '@/lib/ai-command-processor'

export async function POST(request: NextRequest) {
  try {
    const { message, conversationContext = [] } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Mensagem inválida' },
        { status: 400 }
      )
    }

    console.log(`💬 Contexto recebido: ${conversationContext.length} mensagens`)

    const response = await processAICommand(message, conversationContext)

    return NextResponse.json({
      success: true,
      response: response
    })

  } catch (error) {
    console.error('Erro na API do chat:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        response: 'Desculpe, ocorreu um erro ao processar sua mensagem.'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'API do Chat AI está funcionando',
    timestamp: new Date().toISOString()
  })
}