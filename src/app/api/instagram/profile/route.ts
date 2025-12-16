import { NextResponse } from 'next/server'
import { instagramAPI } from '@/lib/instagram-api'

export async function GET() {
  try {
    console.log('🔍 [Instagram API] Iniciando busca do perfil...')
    console.log('📝 [Instagram API] Token disponível:', process.env.INSTAGRAM_ACCESS_TOKEN ? 'Sim' : 'Não')
    console.log('🔑 [Instagram API] Primeiros 20 chars do token:', process.env.INSTAGRAM_ACCESS_TOKEN?.substring(0, 20) + '...')

    const profile = await instagramAPI.getUserProfile()

    console.log('✅ [Instagram API] Perfil carregado com sucesso:', profile)
    return NextResponse.json(profile)
  } catch (error: any) {
    console.error('❌ [Instagram API] Erro completo:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })

    return NextResponse.json(
      {
        error: 'Failed to fetch Instagram profile',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}