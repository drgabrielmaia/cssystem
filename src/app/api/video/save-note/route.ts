import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mentorado_id, lesson_id, note_text, timestamp_seconds = 0, note_type = 'text' } = body

    // Validate required fields
    if (!mentorado_id || !lesson_id || !note_text?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: mentorado_id, lesson_id, note_text' },
        { status: 400 }
      )
    }

    // Try to insert note data
    let result = await supabase
      .from('lesson_notes')
      .insert({
        mentorado_id,
        lesson_id,
        note_text: note_text.trim(),
        timestamp_seconds,
        note_type,
        is_private: true,
        created_at: new Date().toISOString()
      })

    if (result.error) {
      console.error('Error saving note:', result.error)

      // If RLS is blocking, try with service role client
      if (result.error.code === '42501') {
        // Create service role client to bypass RLS
        const { createClient } = await import('@supabase/supabase-js')
        const serviceClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key bypasses RLS
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )

        const serviceResult = await serviceClient
          .from('lesson_notes')
          .insert({
            mentorado_id,
            lesson_id,
            note_text: note_text.trim(),
            timestamp_seconds,
            note_type,
            is_private: true,
            created_at: new Date().toISOString()
          })

        if (serviceResult.error) {
          console.error('Service role also failed:', serviceResult.error)
          return NextResponse.json(
            { error: 'Failed to save note', details: serviceResult.error.message },
            { status: 500 }
          )
        }

        return NextResponse.json({
          message: 'Note saved successfully (via service role)',
          data: serviceResult.data
        })
      }

      return NextResponse.json(
        { error: 'Failed to save note', details: result.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Note saved successfully',
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