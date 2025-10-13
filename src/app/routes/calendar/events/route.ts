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
      .select('*')
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

        const message = `🎯 Novo evento cadastrado!

📅 ${createdEvent.title}
📅 Data: ${formattedDate}
⏰ Horário: ${formattedTime}

${createdEvent.description ? `📋 Descrição: ${createdEvent.description}` : ''}`

        // Enviar para API WhatsApp
        await fetch(`${process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://api.medicosderesultado.com.br'}/users/default/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({
            to: '558396910414', // Admin Gabriel
            message: message.trim()
          })
        })

        console.log('📱 Notificação WhatsApp enviada para o admin')
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