import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const url = new URL(request.url)
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')
    const limit = parseInt(url.searchParams.get('limit') || '100')

    console.log('🔍 Buscando eventos do calendário...')

    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        mentorados (
          id,
          nome_completo,
          email,
          telefone
        ),
        leads (
          id,
          nome_completo,
          email,
          telefone,
          empresa,
          status
        )
      `)
      .order('start_datetime', { ascending: true })

    // Filtrar por intervalo de datas se fornecido
    if (startDate) {
      query = query.gte('start_datetime', startDate)
    }
    if (endDate) {
      query = query.lte('start_datetime', endDate)
    }

    query = query.limit(limit)

    const { data, error } = await query

    if (error) {
      console.error('❌ Erro do Supabase:', error)
      throw error
    }

    console.log('✅ Eventos carregados:', data?.length || 0)

    return NextResponse.json({
      success: true,
      events: data || [],
      count: data?.length || 0
    })

  } catch (error) {
    console.error('💥 Erro ao buscar eventos:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      events: [],
      count: 0
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { title, description, start_datetime, end_datetime, all_day, mentorado_id, lead_id } = body

    console.log('📅 Criando novo evento:', { title, start_datetime, end_datetime, mentorado_id, lead_id })

    // Validações
    if (!title?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Título é obrigatório'
      }, { status: 400 })
    }

    if (!start_datetime || !end_datetime) {
      return NextResponse.json({
        success: false,
        error: 'Data/hora de início e fim são obrigatórias'
      }, { status: 400 })
    }

    // Validar que a data de fim é posterior à de início
    if (new Date(end_datetime) <= new Date(start_datetime)) {
      return NextResponse.json({
        success: false,
        error: 'Data/hora de término deve ser posterior à de início'
      }, { status: 400 })
    }

    const eventData = {
      title: title.trim(),
      description: description?.trim() || null,
      start_datetime,
      end_datetime,
      all_day: Boolean(all_day),
      mentorado_id: mentorado_id || null,
      lead_id: lead_id || null
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .insert([eventData])
      .select()

    // Se evento foi criado com sucesso, enviar notificação WhatsApp para o admin
    if (data && data.length > 0) {
      const createdEvent = data[0]
      try {
        // Formatar data e hora para o horário de São Paulo
        const eventDateTime = new Date(createdEvent.start_datetime)
        const formattedDate = eventDateTime.toLocaleDateString('pt-BR', {
          timeZone: 'America/Sao_Paulo'
        })
        const formattedTime = eventDateTime.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo'
        })

        const message = `🎯 NOVO EVENTO CADASTRADO!

📅 ${createdEvent.title}
📅 Data: ${formattedDate}
⏰ Horário: ${formattedTime}

${createdEvent.description ? `📋 Descrição: ${createdEvent.description}\n` : ''}🚀 Evento adicionado à agenda!`

        // Enviar notificação para Admin Organization
        await fetch(`${process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'}/users/9c8c0033-15ea-4e33-a55f-28d81a19693b/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({
            to: '558396910414',
            message: message.trim()
          })
        })

        console.log('📱 Notificação WhatsApp enviada para o admin')

        // Função para normalizar telefone brasileiro
        const normalizePhone = (phone: string): string => {
          if (!phone) return '';

          // Remover todos os caracteres não numéricos
          const cleanPhone = phone.replace(/\D/g, '');

          // Se começar com 55, já está no formato internacional
          if (cleanPhone.startsWith('55')) {
            return cleanPhone;
          }

          // Se tem 11 dígitos (celular), adicionar 55
          if (cleanPhone.length === 11) {
            return `55${cleanPhone}`;
          }

          // Se tem 10 dígitos (fixo), adicionar 55
          if (cleanPhone.length === 10) {
            return `55${cleanPhone}`;
          }

          return cleanPhone;
        };

        // Enviar mensagem de confirmação para Lead/Mentorado
        if (createdEvent.lead_id || createdEvent.mentorado_id) {
          try {
            // Buscar dados do lead ou mentorado para obter telefone
            let recipientPhone = null
            let recipientName = null

            if (createdEvent.lead_id) {
              const { data: leadData } = await supabase
                .from('leads')
                .select('telefone, nome_completo')
                .eq('id', createdEvent.lead_id)
                .single()

              if (leadData && leadData.telefone) {
                recipientPhone = normalizePhone(leadData.telefone)
                recipientName = leadData.nome_completo
                console.log(`📞 Lead phone: ${leadData.telefone} → normalized: ${recipientPhone}`)
              }
            } else if (createdEvent.mentorado_id) {
              const { data: mentoradoData } = await supabase
                .from('mentorados')
                .select('telefone, nome_completo')
                .eq('id', createdEvent.mentorado_id)
                .single()

              if (mentoradoData && mentoradoData.telefone) {
                recipientPhone = normalizePhone(mentoradoData.telefone)
                recipientName = mentoradoData.nome_completo
                console.log(`📞 Mentorado phone: ${mentoradoData.telefone} → normalized: ${recipientPhone}`)
              }
            }

            if (recipientPhone && recipientName) {
              const confirmationMessage = `✅ Confirmado seu agendamento com o Dr. Gabriel Maia!

📅 Data: ${formattedDate}
⏰ Horário: ${formattedTime}
📝 ${createdEvent.title}

Aguardo você! 🙌`

              await fetch(`${process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'}/users/kellybsantoss@icloud.com/send`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                  to: recipientPhone,
                  message: confirmationMessage
                })
              })

              console.log(`📱 Mensagem de confirmação enviada para: ${recipientName} (${recipientPhone})`)
            }
          } catch (confirmationError) {
            console.error('⚠️ Erro ao enviar confirmação para lead/mentorado:', confirmationError)
          }
        }
      } catch (whatsappError) {
        console.error('⚠️ Erro ao enviar notificação WhatsApp:', whatsappError)
        // Não falha a criação do evento se WhatsApp falhar
      }
    }

    if (error) {
      console.error('❌ Erro do Supabase ao criar evento:', error)
      throw error
    }

    console.log('✅ Evento criado com sucesso:', data[0]?.id)

    return NextResponse.json({
      success: true,
      event: data[0],
      message: 'Evento criado com sucesso'
    })

  } catch (error) {
    console.error('💥 Erro ao criar evento:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}