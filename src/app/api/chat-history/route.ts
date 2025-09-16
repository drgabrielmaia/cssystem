import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Usar client do servidor para as APIs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')

    // Buscar histórico de conversas
    const { data: conversations, error } = await supabase
      .from('chat_history')
      .select('*')
      .order('timestamp', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Erro ao buscar histórico:', error)
      return NextResponse.json({ conversations: [] })
    }

    return NextResponse.json({
      success: true,
      conversations: conversations || []
    })

  } catch (error) {
    console.error('Erro na API de histórico:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, type, response } = await request.json()

    if (!message || !type) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    // Salvar mensagem no histórico
    const { data, error } = await supabase
      .from('chat_history')
      .insert([{
        message,
        type, // 'user' ou 'assistant'
        response: type === 'assistant' ? response : null,
        timestamp: new Date().toISOString(),
        session_id: 'default', // Pode ser expandido para múltiplas sessões
        metadata: {
          gemma_model: 'gemma3:1b',
          timestamp_formatted: new Date().toLocaleString('pt-BR')
        }
      }])
      .select()

    if (error) {
      console.error('Erro ao salvar no histórico:', error)
      return NextResponse.json(
        { error: 'Erro ao salvar mensagem' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      saved: data?.[0] || null
    })

  } catch (error) {
    console.error('Erro ao salvar histórico:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    // Limpar histórico
    const { error } = await supabase
      .from('chat_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (error) {
      console.error('Erro ao limpar histórico:', error)
      return NextResponse.json(
        { error: 'Erro ao limpar histórico' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Histórico limpo com sucesso'
    })

  } catch (error) {
    console.error('Erro ao limpar histórico:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}