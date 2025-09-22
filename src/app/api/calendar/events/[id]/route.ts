import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

type Params = { params: Promise<{ id: string }> }

export async function GET(
  request: NextRequest,
  segmentData: Params
) {
  const params = await segmentData.params
  try {
    const { id } = params
    const supabase = createClient()

    console.log('🔍 Buscando evento:', id)

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ Erro do Supabase:', error)
      throw error
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'Evento não encontrado'
      }, { status: 404 })
    }

    console.log('✅ Evento encontrado:', data.title)

    return NextResponse.json({
      success: true,
      event: data
    })

  } catch (error) {
    console.error('💥 Erro ao buscar evento:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  segmentData: Params
) {
  const params = await segmentData.params
  try {
    const { id } = params
    const supabase = createClient()
    const body = await request.json()
    const { title, description, start_datetime, end_datetime, all_day, mentorado_id } = body

    console.log('📅 Atualizando evento:', id, { title, start_datetime, end_datetime })

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
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .update(eventData)
      .eq('id', id)
      .select()

    if (error) {
      console.error('❌ Erro do Supabase ao atualizar evento:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Evento não encontrado'
      }, { status: 404 })
    }

    console.log('✅ Evento atualizado com sucesso:', data[0]?.id)

    return NextResponse.json({
      success: true,
      event: data[0],
      message: 'Evento atualizado com sucesso'
    })

  } catch (error) {
    console.error('💥 Erro ao atualizar evento:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  segmentData: Params
) {
  const params = await segmentData.params
  try {
    const { id } = params
    const supabase = createClient()

    console.log('🗑️ Excluindo evento:', id)

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ Erro do Supabase ao excluir evento:', error)
      throw error
    }

    console.log('✅ Evento excluído com sucesso:', id)

    return NextResponse.json({
      success: true,
      message: 'Evento excluído com sucesso'
    })

  } catch (error) {
    console.error('💥 Erro ao excluir evento:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}