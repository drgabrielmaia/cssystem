import { NextRequest, NextResponse } from 'next/server'
import { whatsappService } from '@/lib/whatsapp-service'

export async function POST(request: NextRequest) {
  try {
    console.log('🔌 Recebida solicitação para desconectar todos os WhatsApps')

    // Verificar se o serviço está ativo
    const isConnected = whatsappService.isClientReady()

    if (!isConnected) {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp já estava desconectado',
        status: 'already_disconnected'
      })
    }

    // Desconectar e destruir o cliente
    await whatsappService.destroy()

    console.log('✅ WhatsApp desconectado com sucesso')

    return NextResponse.json({
      success: true,
      message: 'Todos os WhatsApps foram desconectados com sucesso',
      status: 'disconnected',
      timestamp: new Date().toISOString()
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

export async function GET(request: NextRequest) {
  try {
    const isConnected = whatsappService.isClientReady()

    return NextResponse.json({
      connected: isConnected,
      status: isConnected ? 'connected' : 'disconnected',
      message: isConnected ? 'WhatsApp está conectado' : 'WhatsApp está desconectado'
    })

  } catch (error) {
    console.error('❌ Erro ao verificar status WhatsApp:', error)

    return NextResponse.json({
      connected: false,
      status: 'error',
      message: 'Erro ao verificar status',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}