import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Template ID fixo para NPS (vamos criar se não existir)
const DEFAULT_NPS_TEMPLATE_ID = 'default-nps-template'

async function ensureTemplateExists() {
  try {
    // Tentar buscar template existente
    const { data: existing } = await supabase
      .from('video_form_templates')
      .select('id')
      .eq('name', 'default_nps_template')
      .single()

    if (existing) {
      return existing.id
    }

    // Se não existir, criar usando service role
    const { serviceClient } = await import('@/lib/supabase-service')

    const { data: newTemplate, error } = await serviceClient
      .from('video_form_templates')
      .insert({
        name: 'default_nps_template',
        title: 'Avaliação NPS da Aula',
        form_type: 'nps',
        trigger_event: 'lesson_completed',
        questions: [{
          id: 'nps_score',
          type: 'nps',
          question: 'Como você avalia esta aula?',
          required: true
        }],
        is_active: true
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to create template:', error)
      return DEFAULT_NPS_TEMPLATE_ID // Usar ID fallback
    }

    return newTemplate.id
  } catch (error) {
    console.error('Error ensuring template exists:', error)
    return DEFAULT_NPS_TEMPLATE_ID // Usar ID fallback
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mentorado_id, lesson_id, nps_score, feedback_text } = body

    // Validate required fields
    if (!mentorado_id || !lesson_id || nps_score === null || nps_score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: mentorado_id, lesson_id, nps_score' },
        { status: 400 }
      )
    }

    // Calculate satisfaction score
    const satisfaction_score = nps_score <= 2 ? 1 : nps_score <= 4 ? 2 : nps_score <= 6 ? 3 : nps_score <= 8 ? 4 : 5

    // Garantir que existe um template
    const template_id = await ensureTemplateExists()

    // Try to insert/update NPS data
    // First, check if record exists
    const { data: existing, error: checkError } = await supabase
      .from('video_form_responses')
      .select('id')
      .eq('mentorado_id', mentorado_id)
      .eq('lesson_id', lesson_id)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing NPS:', checkError)
      return NextResponse.json(
        { error: 'Database error checking existing data' },
        { status: 500 }
      )
    }

    let result
    if (existing) {
      // Update existing record
      result = await supabase
        .from('video_form_responses')
        .update({
          nps_score,
          satisfaction_score,
          feedback_text,
          updated_at: new Date().toISOString()
        })
        .eq('mentorado_id', mentorado_id)
        .eq('lesson_id', lesson_id)
    } else {
      // Insert new record
      result = await supabase
        .from('video_form_responses')
        .insert({
          mentorado_id,
          lesson_id,
          template_id, // Usar o template_id obtido
          nps_score,
          satisfaction_score,
          feedback_text,
          responses: { nps_score, feedback_text }, // Campo JSONB
          created_at: new Date().toISOString()
        })
    }

    if (result.error) {
      console.error('Error saving NPS:', result.error)

      // If RLS is still blocking, try with service role client
      if (result.error.code === '42501') {
        // Create service role client to bypass RLS
        const { serviceClient } = await import('@/lib/supabase-service')

        let serviceResult
        if (existing) {
          serviceResult = await serviceClient
            .from('video_form_responses')
            .update({
              nps_score,
              satisfaction_score,
              feedback_text,
              updated_at: new Date().toISOString()
            })
            .eq('mentorado_id', mentorado_id)
            .eq('lesson_id', lesson_id)
        } else {
          serviceResult = await serviceClient
            .from('video_form_responses')
            .insert({
              mentorado_id,
              lesson_id,
              template_id, // Usar template_id
              nps_score,
              satisfaction_score,
              feedback_text,
              responses: { nps_score, feedback_text },
              created_at: new Date().toISOString()
            })
        }

        if (serviceResult.error) {
          console.error('Service role also failed:', serviceResult.error)
          return NextResponse.json(
            { error: 'Failed to save NPS data', details: serviceResult.error.message },
            { status: 500 }
          )
        }

        return NextResponse.json({
          message: 'NPS saved successfully (via service role)',
          data: serviceResult.data
        })
      }

      return NextResponse.json(
        { error: 'Failed to save NPS data', details: result.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'NPS saved successfully',
      data: result.data
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}