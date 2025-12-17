import { NextRequest, NextResponse } from 'next/server'
import { instagramAPI } from '@/lib/instagram-api'

// GET - Buscar ID de usuário por username
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json({
        success: false,
        error: 'Username é obrigatório'
      }, { status: 400 })
    }

    console.log('🔍 [Instagram API] Buscando ID para:', username)

    // Método 1: Tentar buscar o perfil do usuário atual para obter informações
    try {
      const profile = await instagramAPI.getUserProfile()
      console.log('👤 [Instagram API] Perfil atual:', profile)
    } catch (error) {
      console.error('❌ [Instagram API] Erro ao obter perfil:', error)
    }

    // Método 2: Tentar diferentes endpoints para buscar usuários
    const searchMethods = [
      `/users/search?q=${username}`,
      `/${username}?fields=id,username`,
      `/search?q=${username}&type=user`
    ]

    for (const endpoint of searchMethods) {
      try {
        console.log(`🔍 [Instagram API] Tentando endpoint: ${endpoint}`)
        const result = await instagramAPI.request(endpoint)
        console.log(`✅ [Instagram API] Resultado para ${endpoint}:`, result)

        if (result && result.id) {
          return NextResponse.json({
            success: true,
            userId: result.id,
            username: result.username || username,
            data: result
          })
        }
      } catch (error: any) {
        console.error(`❌ [Instagram API] Erro no endpoint ${endpoint}:`, error.message)
      }
    }

    // Se não encontrou, retornar erro informativo
    return NextResponse.json({
      success: false,
      error: `Não foi possível encontrar o ID do usuário '${username}'. Isso pode ser devido a limitações do token de acesso ou o usuário pode não existir.`,
      suggestion: 'Para enviar mensagens no Instagram, você precisa do ID numérico do usuário, que geralmente é obtido através de conversas existentes ou webhooks.'
    }, { status: 404 })

  } catch (error) {
    console.error('❌ [Instagram API] Erro na busca:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno ao buscar usuário'
    }, { status: 500 })
  }
}