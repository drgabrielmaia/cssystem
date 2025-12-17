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

    console.log('📱 [Instagram Webhook v24.0] Evento recebido:', JSON.stringify(body, null, 2))

    // Verificar se é um evento válido do Instagram
    if (!body.object) {
      console.log('⚠️ [Instagram Webhook] Objeto não encontrado')
      return NextResponse.json({ success: false }, { status: 400 })
    }

    // Instagram v24.0 pode usar 'instagram' ou 'page'
    if (body.object !== 'instagram' && body.object !== 'page') {
      console.log('⚠️ [Instagram Webhook] Evento não é do Instagram. Object:', body.object)
      return NextResponse.json({ success: false }, { status: 400 })
    }

    // Processar cada entrada
    if (!body.entry || !Array.isArray(body.entry)) {
      console.log('⚠️ [Instagram Webhook] Entry não encontrado ou inválido')
      return NextResponse.json({ success: true }, { status: 200 })
    }

    for (const entry of body.entry) {
      console.log('🔄 [Instagram Webhook v24.0] Processando entrada:', entry.id || 'sem_id')

      // 1. Mensagens diretas (DMs)
      if (entry.messaging && Array.isArray(entry.messaging)) {
        for (const messagingEvent of entry.messaging) {
          console.log('📨 [Instagram Webhook] Evento de mensagem:', {
            sender: messagingEvent.sender?.id,
            recipient: messagingEvent.recipient?.id,
            hasMessage: !!messagingEvent.message,
            hasRead: !!messagingEvent.read
          })

          if (messagingEvent.message && messagingEvent.message.text) {
            console.log('📨 [Instagram Webhook] Mensagem com texto recebida!')
            await processDirectMessage(messagingEvent)
          }

          if (messagingEvent.read) {
            console.log('👀 [Instagram Webhook] Mensagem lida!')
          }
        }
      }

      // 2. Interações no feed (v24.0)
      if (entry.changes && Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          console.log('🔄 [Instagram Webhook] Change detectado:', change.field)

          if (change.field === 'comments' && change.value) {
            console.log('💬 [Instagram Webhook] Comentário no post!')
            await processComment(change.value)
          }

          if (change.field === 'mentions' && change.value) {
            console.log('🏷️ [Instagram Webhook] Menção em story!')
            await processMention(change.value)
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar evento:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Processar mensagem direta (DM)
async function processDirectMessage(messagingEvent: any) {
  try {
    const message = messagingEvent.message
    const senderId = messagingEvent.sender.id

    // Verificar se tem texto (pode ser emoji ou figurinha)
    if (!message.text) {
      console.log('⚠️ [Instagram Webhook] Mensagem sem texto (emoji/figurinha)')
      return
    }

    const messageText = message.text.toLowerCase()
    console.log('📝 [Instagram Webhook] Texto:', messageText)

    // Buscar automações ativas para DM
    const { data: automations, error } = await supabase
      .from('instagram_automations')
      .select('*')
      .eq('trigger_type', 'dm_keyword')
      .eq('is_active', true)

    if (error) {
      console.error('❌ [Instagram Webhook] Erro ao buscar automações:', error)
      return
    }

    // Verificar se alguma palavra-chave foi encontrada
    for (const automation of automations || []) {
      const keywords = automation.keywords || []
      const matchedKeyword = keywords.find((keyword: string) =>
        messageText.includes(keyword.toLowerCase())
      )

      if (matchedKeyword) {
        console.log(`🎯 [Instagram Webhook] Palavra-chave encontrada: "${matchedKeyword}"`)

        try {
          // Responder à mensagem
          await sendInstagramMessage(senderId, automation.response_message)

          // Incrementar contador
          await supabase
            .from('instagram_automations')
            .update({
              responses_sent: automation.responses_sent + 1
            })
            .eq('id', automation.id)

          console.log('✅ [Instagram Webhook] Resposta enviada!')
          break

        } catch (sendError) {
          console.error('❌ [Instagram Webhook] Erro ao enviar resposta:', sendError)
        }
      }
    }

  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar mensagem:', error)
  }
}

// Processar comentário em post
async function processComment(commentData: any) {
  try {
    const commentText = commentData.text?.toLowerCase() || ''
    const fromUser = commentData.from

    console.log('💬 [Instagram Webhook] Comentário:', commentText)

    // Buscar automações ativas para comentários
    const { data: automations, error } = await supabase
      .from('instagram_automations')
      .select('*')
      .eq('trigger_type', 'comment_keyword')
      .eq('is_active', true)

    if (error || !automations?.length) return

    // Verificar palavra-chave
    for (const automation of automations) {
      const keywords = automation.keywords || []
      const matchedKeyword = keywords.find((keyword: string) =>
        commentText.includes(keyword.toLowerCase())
      )

      if (matchedKeyword) {
        console.log(`🎯 [Instagram Webhook] Palavra-chave no comentário: "${matchedKeyword}"`)

        try {
          // Enviar DM para quem comentou
          await sendInstagramMessage(fromUser.id, automation.response_message)

          // Incrementar contador
          await supabase
            .from('instagram_automations')
            .update({
              responses_sent: automation.responses_sent + 1
            })
            .eq('id', automation.id)

          console.log('✅ [Instagram Webhook] DM enviado para quem comentou!')
          break

        } catch (sendError) {
          console.error('❌ [Instagram Webhook] Erro ao responder comentário:', sendError)
        }
      }
    }

  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar comentário:', error)
  }
}

// Processar menção em story
async function processMention(mentionData: any) {
  try {
    console.log('🏷️ [Instagram Webhook] Menção recebida:', mentionData)

    // Buscar automação para menções
    const { data: automations, error } = await supabase
      .from('instagram_automations')
      .select('*')
      .eq('trigger_type', 'story_mention')
      .eq('is_active', true)

    if (error || !automations?.length) return

    const automation = automations[0] // Primeira automação ativa

    try {
      // Enviar DM para quem mencionou
      await sendInstagramMessage(mentionData.from?.id, automation.response_message)

      // Incrementar contador
      await supabase
        .from('instagram_automations')
        .update({
          responses_sent: automation.responses_sent + 1
        })
        .eq('id', automation.id)

      console.log('✅ [Instagram Webhook] Resposta automática para menção enviada!')

    } catch (sendError) {
      console.error('❌ [Instagram Webhook] Erro ao responder menção:', sendError)
    }

  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar menção:', error)
  }
}

// Função para enviar mensagem do Instagram
async function sendInstagramMessage(recipientId: string, text: string) {
  try {
    const PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN

    if (!PAGE_ACCESS_TOKEN) {
      throw new Error('Instagram access token not found')
    }

    const response = await fetch(`https://graph.facebook.com/v24.0/me/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: text },
        access_token: PAGE_ACCESS_TOKEN
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Instagram API Error: ${error.error?.message || response.statusText}`)
    }

    const result = await response.json()
    console.log('✅ [Instagram API] Mensagem enviada:', result)

  } catch (error) {
    console.error('❌ [Instagram API] Erro ao enviar mensagem:', error)
    throw error
  }
}

// Arquivo limpo - funções antigas removidas