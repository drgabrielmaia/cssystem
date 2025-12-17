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

      // Processar mudanças (comentários, menções, etc.)
      if (entry.changes) {
        for (const change of entry.changes) {
          console.log(`🔄 [Instagram Webhook] Processando mudança: ${change.field}`)

          switch (change.field) {
            case 'comments':
              await processCommentEvent(change.value)
              break
            case 'live_comments':
              await processLiveCommentEvent(change.value)
              break
            case 'mentions':
              await processMentionEvent(change.value)
              break
            case 'story_insights':
              await processStoryInsightEvent(change.value)
              break
            default:
              console.log(`ℹ️ [Instagram Webhook] Evento não processado: ${change.field}`)
          }
        }
      }

      // Processar mensagens diretas
      if (entry.messaging) {
        for (const messaging of entry.messaging) {
          console.log('📨 [Instagram Webhook] Processando evento de messaging')

          // Diferentes tipos de eventos de messaging
          if (messaging.message) {
            await processMessageEvent(messaging)
          } else if (messaging.message_edit) {
            await processMessageEditEvent(messaging)
          } else if (messaging.message_reactions) {
            await processMessageReactionEvent(messaging)
          } else if (messaging.messaging_handover) {
            await processHandoverEvent(messaging)
          } else if (messaging.messaging_postbacks) {
            await processPostbackEvent(messaging)
          } else if (messaging.messaging_referral) {
            await processReferralEvent(messaging)
          } else if (messaging.messaging_seen) {
            await processSeenEvent(messaging)
          } else if (messaging.standby) {
            await processStandbyEvent(messaging)
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
    const senderId = messagingData.sender.id
    const recipientId = messagingData.recipient.id
    const messageId = message?.mid || `msg_${Date.now()}`
    const conversationId = `${senderId}_${recipientId}`

    // Salvar mensagem recebida no banco
    await supabase.from('instagram_messages').insert({
      message_id: messageId,
      conversation_id: conversationId,
      sender_id: senderId,
      recipient_id: recipientId,
      message_type: message?.attachments ? 'media' : 'text',
      content: message?.text || '',
      media_url: message?.attachments?.[0]?.payload?.url,
      is_incoming: true,
      is_processed: false
    })

    // Atualizar ou criar conversa
    await supabase.from('instagram_conversations').upsert({
      conversation_id: conversationId,
      participant_id: senderId,
      last_message_at: new Date().toISOString(),
      message_count: 1
    }, {
      onConflict: 'conversation_id',
      ignoreDuplicates: false
    })

    if (!message || !message.text) {
      console.log('⚠️ [Instagram Webhook] Mensagem sem texto')
      return
    }

    const messageText = message.text.toLowerCase()

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
          const response = await instagramAPI.sendDirectMessage(senderId, automation.response_message)

          // Salvar resposta enviada no banco
          if (response.success) {
            await supabase.from('instagram_messages').insert({
              message_id: `reply_${Date.now()}`,
              conversation_id: conversationId,
              sender_id: recipientId,
              recipient_id: senderId,
              message_type: 'text',
              content: automation.response_message,
              is_incoming: false,
              automation_rule_id: automation.id
            })
          }

          // Log da automação
          await supabase.from('instagram_automation_logs').insert({
            automation_rule_id: automation.id,
            trigger_keyword: matchedKeyword,
            response_sent: automation.response_message,
            status: response.success ? 'sent' : 'failed',
            error_message: response.success ? null : response.error
          })

          console.log('✅ [Instagram Webhook] Resposta DM enviada com sucesso!')

          // Incrementar contador
          await supabase
            .from('instagram_automations')
            .update({
              responses_sent: automation.responses_sent + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', automation.id)

          // Marcar mensagem como processada
          await supabase
            .from('instagram_messages')
            .update({
              is_processed: true,
              automation_triggered: true,
              automation_rule_id: automation.id
            })
            .eq('message_id', messageId)

        } catch (sendError) {
          console.error('❌ [Instagram Webhook] Erro ao enviar resposta DM:', sendError)

          // Log do erro
          await supabase.from('instagram_automation_logs').insert({
            automation_rule_id: automation.id,
            trigger_keyword: matchedKeyword,
            response_sent: automation.response_message,
            status: 'failed',
            error_message: sendError instanceof Error ? sendError.message : String(sendError)
          })
        }

        break
      }
    }

  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar mensagem:', error)
  }
}

// Processar comentários em live
async function processLiveCommentEvent(commentData: any) {
  try {
    console.log('🔴 [Instagram Webhook] Processando comentário ao vivo:', commentData)
    // Processar da mesma forma que comentários normais
    await processCommentEvent(commentData)
  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar comentário ao vivo:', error)
  }
}

// Processar menções em stories
async function processMentionEvent(mentionData: any) {
  try {
    console.log('🏷️ [Instagram Webhook] Processando menção:', mentionData)

    // Buscar automações para menções
    const { data: automations, error } = await supabase
      .from('instagram_automations')
      .select('*')
      .eq('trigger_type', 'story_mention')
      .eq('is_active', true)

    if (error) {
      console.error('❌ [Instagram Webhook] Erro ao buscar automações de menção:', error)
      return
    }

    // Se tiver automação para menções, responder via DM
    for (const automation of automations || []) {
      try {
        await instagramAPI.sendDirectMessage(mentionData.from?.id, automation.response_message)

        // Incrementar contador
        await supabase
          .from('instagram_automations')
          .update({
            responses_sent: automation.responses_sent + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', automation.id)

        console.log('✅ [Instagram Webhook] Resposta automática enviada para menção')
        break
      } catch (sendError) {
        console.error('❌ [Instagram Webhook] Erro ao responder menção:', sendError)
      }
    }
  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar menção:', error)
  }
}

// Processar insights de stories
async function processStoryInsightEvent(insightData: any) {
  try {
    console.log('📊 [Instagram Webhook] Processando insight de story:', insightData)
    // Salvar insights para análise posterior
    // Implementar conforme necessário
  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar insight:', error)
  }
}

// Processar edição de mensagens
async function processMessageEditEvent(messagingData: any) {
  try {
    console.log('✏️ [Instagram Webhook] Processando edição de mensagem:', messagingData)

    const messageEdit = messagingData.message_edit
    const messageId = messageEdit?.mid

    if (messageId) {
      // Atualizar mensagem no banco
      await supabase
        .from('instagram_messages')
        .update({
          content: messageEdit?.text || '',
          updated_at: new Date().toISOString()
        })
        .eq('message_id', messageId)
    }
  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar edição:', error)
  }
}

// Processar reações em mensagens
async function processMessageReactionEvent(messagingData: any) {
  try {
    console.log('😍 [Instagram Webhook] Processando reação:', messagingData)

    const reaction = messagingData.message_reactions
    console.log('Reação recebida:', reaction?.reaction, 'na mensagem:', reaction?.mid)

    // Implementar lógica conforme necessário
  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar reação:', error)
  }
}

// Processar handover de conversa
async function processHandoverEvent(messagingData: any) {
  try {
    console.log('🤝 [Instagram Webhook] Processando handover:', messagingData)
    // Implementar lógica de transferência de conversa
  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar handover:', error)
  }
}

// Processar postbacks (botões)
async function processPostbackEvent(messagingData: any) {
  try {
    console.log('🔘 [Instagram Webhook] Processando postback:', messagingData)

    const postback = messagingData.messaging_postbacks
    const payload = postback?.payload

    console.log('Postback recebido:', payload)

    // Implementar lógica de botões/ações
  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar postback:', error)
  }
}

// Processar referrals
async function processReferralEvent(messagingData: any) {
  try {
    console.log('🔗 [Instagram Webhook] Processando referral:', messagingData)

    const referral = messagingData.messaging_referral
    console.log('Referral source:', referral?.source)

    // Implementar lógica de referência
  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar referral:', error)
  }
}

// Processar mensagens lidas
async function processSeenEvent(messagingData: any) {
  try {
    console.log('👀 [Instagram Webhook] Mensagem visualizada:', messagingData)

    const seen = messagingData.messaging_seen
    const messageId = seen?.mid

    if (messageId) {
      // Marcar como lida no banco
      await supabase
        .from('instagram_messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('message_id', messageId)
    }
  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar visualização:', error)
  }
}

// Processar standby
async function processStandbyEvent(messagingData: any) {
  try {
    console.log('⏸️ [Instagram Webhook] Processando standby:', messagingData)
    // Implementar lógica de standby conforme necessário
  } catch (error) {
    console.error('❌ [Instagram Webhook] Erro ao processar standby:', error)
  }
}