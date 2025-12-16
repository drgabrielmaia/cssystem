import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { instagramAPI } from '@/lib/instagram-api'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Verificação do webhook (Instagram exige isso)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Token de verificação do webhook (você define no Instagram Developer)
  const WEBHOOK_VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'webhook_verify_token_123'

  console.log('🔍 [Instagram Webhook] Verificação recebida:', { mode, token, challenge })

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ [Instagram Webhook] Webhook verificado com sucesso!')
    return new NextResponse(challenge, { status: 200 })
  } else {
    console.log('❌ [Instagram Webhook] Verificação falhou!')
    return new NextResponse('Forbidden', { status: 403 })
  }
}

// Receber eventos do Instagram
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('📱 [Instagram Webhook] Evento recebido:', JSON.stringify(body, null, 2))

    // Verificar se é um evento válido
    if (!body.object || body.object !== 'instagram') {
      console.log('⚠️ [Instagram Webhook] Evento não é do Instagram')
      return NextResponse.json({ success: false }, { status: 400 })
    }

    // Processar cada entrada
    for (const entry of body.entry || []) {
      console.log('🔄 [Instagram Webhook] Processando entrada:', entry.id)

      // Processar comentários
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'comments') {
            await processCommentEvent(change.value)
          }
        }
      }

      // Processar mensagens
      if (entry.messaging) {
        for (const messaging of entry.messaging) {
          await processMessageEvent(messaging)
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar evento:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

async function processCommentEvent(commentData: any) {
  try {
    console.log('💬 [Instagram Webhook] Processando comentário:', commentData)

    const commentText = commentData.text?.toLowerCase() || ''
    const commentId = commentData.id
    const fromUser = commentData.from

    // Buscar automações ativas para comentários
    const { data: automations, error } = await supabase
      .from('instagram_automations')
      .select('*')
      .eq('trigger_type', 'comment_keyword')
      .eq('is_active', true)

    if (error) {
      console.error('❌ [Instagram Webhook] Erro ao buscar automações:', error)
      return
    }

    // Verificar se alguma palavra-chave foi encontrada
    for (const automation of automations || []) {
      const keywords = automation.keywords || []
      const matchedKeyword = keywords.find((keyword: string) =>
        commentText.includes(keyword.toLowerCase())
      )

      if (matchedKeyword) {
        console.log(`🎯 [Instagram Webhook] Palavra-chave encontrada: "${matchedKeyword}"`)

        // Responder ao comentário
        try {
          // Não é possível responder diretamente a comentários via API
          // Então vamos enviar DM para o usuário
          await instagramAPI.sendDirectMessage(fromUser.id, automation.response_message)

          console.log('✅ [Instagram Webhook] DM enviado com sucesso!')

          // Incrementar contador de respostas
          await supabase
            .from('instagram_automations')
            .update({
              responses_sent: automation.responses_sent + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', automation.id)

          console.log('📈 [Instagram Webhook] Contador de respostas atualizado')

        } catch (sendError) {
          console.error('❌ [Instagram Webhook] Erro ao enviar resposta:', sendError)
        }

        break // Parar na primeira palavra-chave encontrada
      }
    }

  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar comentário:', error)
  }
}

async function processMessageEvent(messagingData: any) {
  try {
    console.log('📩 [Instagram Webhook] Processando mensagem:', messagingData)

    const message = messagingData.message
    if (!message || !message.text) {
      console.log('⚠️ [Instagram Webhook] Mensagem sem texto')
      return
    }

    const messageText = message.text.toLowerCase()
    const senderId = messagingData.sender.id

    // Buscar automações ativas para DM
    const { data: automations, error } = await supabase
      .from('instagram_automations')
      .select('*')
      .eq('trigger_type', 'dm_keyword')
      .eq('is_active', true)

    if (error) {
      console.error('❌ [Instagram Webhook] Erro ao buscar automações DM:', error)
      return
    }

    // Verificar se alguma palavra-chave foi encontrada
    for (const automation of automations || []) {
      const keywords = automation.keywords || []
      const matchedKeyword = keywords.find((keyword: string) =>
        messageText.includes(keyword.toLowerCase())
      )

      if (matchedKeyword) {
        console.log(`🎯 [Instagram Webhook] Palavra-chave DM encontrada: "${matchedKeyword}"`)

        try {
          // Responder à mensagem
          await instagramAPI.sendDirectMessage(senderId, automation.response_message)

          console.log('✅ [Instagram Webhook] Resposta DM enviada com sucesso!')

          // Incrementar contador
          await supabase
            .from('instagram_automations')
            .update({
              responses_sent: automation.responses_sent + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', automation.id)

        } catch (sendError) {
          console.error('❌ [Instagram Webhook] Erro ao enviar resposta DM:', sendError)
        }

        break
      }
    }

  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar mensagem:', error)
  }
}