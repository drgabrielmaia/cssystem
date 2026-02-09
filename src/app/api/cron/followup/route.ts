import { NextRequest, NextResponse } from 'next/server'

// CRON job para processar follow-ups automaticamente
// Deve ser chamado a cada 15 minutos pela Vercel Cron ou serviço externo
export async function GET(request: NextRequest) {
  try {
    // Verificar autorização (opcional - para segurança)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 CRON: Iniciando processamento de follow-ups...')

    // Chamar a API de processamento
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/process-followups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Falha no processamento')
    }

    console.log('✅ CRON: Follow-ups processados:', result.stats)

    return NextResponse.json({
      success: true,
      message: 'CRON executado com sucesso',
      timestamp: new Date().toISOString(),
      results: result
    })

  } catch (error) {
    console.error('❌ CRON ERROR:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Para testar manualmente
export async function POST(request: NextRequest) {
  return GET(request)
}