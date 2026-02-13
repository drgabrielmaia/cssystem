import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lead_id, closer_id, appointment_type = 'discovery', preferred_date, preferred_time } = body

    console.log('📅 Agendando call para lead:', { lead_id, closer_id, appointment_type })

    // Validar se o lead existe
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, nome_completo, email, telefone, organization_id')
      .eq('id', lead_id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    // Validar se o closer existe
    const { data: closer, error: closerError } = await supabase
      .from('closers')
      .select('id, nome_completo, organization_id')
      .eq('id', closer_id)
      .single()

    if (closerError || !closer) {
      return NextResponse.json({ error: 'Closer não encontrado' }, { status: 404 })
    }

    // Verificar se já existe agendamento ativo para este lead
    const { data: existingAppointment, error: existingError } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('lead_id', lead_id)
      .in('status', ['scheduled', 'rescheduled'])
      .single()

    if (!existingError && existingAppointment) {
      return NextResponse.json({ 
        error: 'Lead já possui agendamento ativo',
        appointment_id: existingAppointment.id
      }, { status: 409 })
    }

    let appointmentDate: string
    let startTime: string
    let endTime: string

    if (preferred_date && preferred_time) {
      // Usar data/hora preferida
      appointmentDate = preferred_date
      startTime = preferred_time
      const endTimeDate = new Date(`1970-01-01T${preferred_time}`)
      endTimeDate.setMinutes(endTimeDate.getMinutes() + 30) // 30 minutos de duração
      endTime = endTimeDate.toTimeString().split(' ')[0].substring(0, 5)
    } else {
      // Buscar próximo slot disponível do closer
      const { data: nextSlot, error: slotError } = await supabase
        .rpc('get_next_available_slot', {
          p_closer_id: closer_id
        })

      if (slotError || !nextSlot) {
        return NextResponse.json({ 
          error: 'Não foi possível encontrar slot disponível',
          details: slotError 
        }, { status: 400 })
      }

      appointmentDate = nextSlot.date
      startTime = nextSlot.start_time
      endTime = nextSlot.end_time
    }

    // Criar o agendamento
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        lead_id,
        closer_id,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        type: appointment_type,
        status: 'scheduled',
        notes: `Agendamento automático para ${appointment_type}`,
        organization_id: lead.organization_id
      })
      .select(`
        *,
        leads!appointments_lead_id_fkey (
          nome_completo,
          email,
          telefone
        ),
        closers!appointments_closer_id_fkey (
          nome_completo,
          email
        )
      `)
      .single()

    if (appointmentError) {
      console.error('❌ Erro ao criar agendamento:', appointmentError)
      return NextResponse.json({ 
        error: 'Erro ao criar agendamento',
        details: appointmentError 
      }, { status: 500 })
    }

    // Atualizar o lead com informações do agendamento
    await supabase
      .from('leads')
      .update({
        status: 'agendado',
        follow_up_status: 'agendado',
        next_followup_date: appointmentDate,
        last_interaction_date: new Date().toISOString()
      })
      .eq('id', lead_id)

    // Log da ação
    await supabase
      .from('lead_history')
      .insert({
        lead_id,
        action: 'appointment_scheduled',
        details: {
          appointment_id: appointment.id,
          appointment_type,
          scheduled_for: `${appointmentDate} ${startTime}`,
          closer_name: closer.nome_completo
        },
        user_id: closer_id,
        organization_id: lead.organization_id
      })

    console.log('✅ Agendamento criado com sucesso:', appointment.id)

    return NextResponse.json({
      success: true,
      appointment,
      message: `Agendamento criado para ${appointmentDate} às ${startTime}`
    })

  } catch (error) {
    console.error('❌ Erro no agendamento:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const closer_id = searchParams.get('closer_id')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!closer_id) {
      return NextResponse.json({ error: 'closer_id é obrigatório' }, { status: 400 })
    }

    // Buscar slots disponíveis para o closer na data especificada
    const { data: availability, error } = await supabase
      .rpc('get_closer_availability', {
        p_closer_id: closer_id,
        p_date: date
      })

    if (error) {
      console.error('❌ Erro ao buscar disponibilidade:', error)
      return NextResponse.json({ 
        error: 'Erro ao buscar disponibilidade',
        details: error 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      date,
      availability: availability || []
    })

  } catch (error) {
    console.error('❌ Erro ao buscar disponibilidade:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}