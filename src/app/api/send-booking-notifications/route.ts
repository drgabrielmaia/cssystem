import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// API para enviar notificações de agendamento via WhatsApp
export async function POST(request: NextRequest) {
  try {
    const { booking, submission } = await request.json()

    if (!booking || !submission) {
      return NextResponse.json(
        { error: 'Dados de agendamento ou submissão são obrigatórios' },
        { status: 400 }
      )
    }

    console.log('📅 Enviando notificações de agendamento...')

    // Buscar dados da organização para obter número do admin
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('owner_email, comissao_fixa_indicacao')
      .eq('id', '9c8c0033-15ea-4e33-a55f-28d81a19693b')
      .single()

    if (orgError) {
      console.error('Erro ao buscar organização:', orgError)
    }

    // Formatação da data e horário
    const bookingDate = new Date(booking.scheduled_date).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Mensagem para o cliente
    const clientMessage = `🗓️ *Call de Qualificação Agendada*

Olá, ${booking.contact_name}!

Sua call de qualificação foi agendada com sucesso! ✅

📅 *Data:* ${bookingDate}
🕐 *Horário:* ${booking.scheduled_time}
📋 *Formulário:* ${booking.form_template}

📞 Entraremos em contato com você próximo ao horário agendado.

Se precisar reagendar ou tiver alguma dúvida, responda esta mensagem.

_Equipe Customer Success_`

    // Mensagem para o admin
    const adminMessage = `🔔 *Nova Call Agendada*

📋 *Formulário:* ${booking.form_template}
👤 *Cliente:* ${booking.contact_name}
📞 *Telefone:* ${booking.contact_phone || 'Não informado'}
📧 *Email:* ${booking.contact_email}

📅 *Data:* ${bookingDate}
🕐 *Horário:* ${booking.scheduled_time}

💡 *Origem:* ${submission.source_url || 'Direct'}

_Sistema de Agendamentos_`

    const notifications = []

    // 1. Notificação para o cliente (se tiver telefone)
    if (booking.contact_phone) {
      try {
        const clientPhone = booking.contact_phone.replace(/\D/g, '') // Remove caracteres não numéricos

        const clientNotification = await fetch(`${process.env.ZAPI_BASE_URL || 'https://api.z-api.io'}/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone: `55${clientPhone}`, // Adiciona código do país
            message: clientMessage
          })
        })

        if (clientNotification.ok) {
          notifications.push({ type: 'client', status: 'sent' })
          console.log('✅ Notificação enviada para o cliente')
        } else {
          notifications.push({ type: 'client', status: 'failed' })
          console.log('❌ Falha ao enviar notificação para o cliente')
        }
      } catch (error) {
        console.error('Erro ao enviar para cliente:', error)
        notifications.push({ type: 'client', status: 'error' })
      }
    }

    // 2. Notificação para o admin (número fixo da organização)
    try {
      // Usar número do admin da organização (substitua pelo número real)
      const adminPhone = process.env.ADMIN_PHONE || '5521999991890' // Número exemplo

      const adminNotification = await fetch(`${process.env.ZAPI_BASE_URL || 'https://api.z-api.io'}/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: adminPhone,
          message: adminMessage
        })
      })

      if (adminNotification.ok) {
        notifications.push({ type: 'admin', status: 'sent' })
        console.log('✅ Notificação enviada para o admin')
      } else {
        notifications.push({ type: 'admin', status: 'failed' })
        console.log('❌ Falha ao enviar notificação para o admin')
      }
    } catch (error) {
      console.error('Erro ao enviar para admin:', error)
      notifications.push({ type: 'admin', status: 'error' })
    }

    // 3. Opcional: Salvar log das notificações (se a tabela existir)
    try {
      // Como não temos tabela notification_logs, vamos apenas logar no console
      console.log('📝 Log de notificações:', {
        event_id: booking.id,
        notifications: notifications,
        timestamp: new Date().toISOString()
      })
    } catch (logError) {
      console.warn('Erro ao salvar log de notificações:', logError)
    }

    return NextResponse.json({
      success: true,
      message: 'Notificações processadas',
      notifications: notifications,
      booking: {
        id: booking.id,
        date: bookingDate,
        time: booking.scheduled_time,
        contact: booking.contact_name
      }
    })

  } catch (error) {
    console.error('Erro no envio de notificações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET - Buscar logs de notificações
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')

    let query = supabase
      .from('notification_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (bookingId) {
      query = query.eq('booking_id', bookingId)
    }

    const { data, error } = await query.limit(50)

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar logs' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      logs: data || []
    })

  } catch (error) {
    console.error('Erro ao buscar logs:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}