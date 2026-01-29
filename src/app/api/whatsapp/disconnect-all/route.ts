import { NextRequest, NextResponse } from 'next/server'
import { multiOrgWhatsAppService } from '@/lib/whatsapp-multi-org-service'

export async function POST(request: NextRequest) {
  try {
    console.log('🔌 Recebida solicitação para desconectar todos os WhatsApps')

    // Desconectar todas as organizações
    await multiOrgWhatsAppService.disconnectAll()

    console.log('✅ Todos os WhatsApps foram desconectados com sucesso')

    return NextResponse.json({
      success: true,
      message: 'Todos os WhatsApps foram desconectados com sucesso',
      status: 'disconnected',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erro ao desconectar WhatsApps:', error)

    return NextResponse.json({
      success: false,
      message: 'Erro ao desconectar WhatsApps',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const connections = multiOrgWhatsAppService.getAllConnections()

    const totalConnected = connections.filter(c => c.isReady).length
    const totalConnecting = connections.filter(c => c.isConnecting).length

    return NextResponse.json({
      connections,
      totalConnected,
      totalConnecting,
      totalConnections: connections.length,
      message: `${totalConnected} conexões ativas, ${totalConnecting} conectando`
    })

  } catch (error) {
    console.error('❌ Erro ao verificar status WhatsApps:', error)

    return NextResponse.json({
      connections: [],
      totalConnected: 0,
      totalConnecting: 0,
      totalConnections: 0,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}