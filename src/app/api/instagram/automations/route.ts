import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET - Listar automações
export async function GET(request: NextRequest) {
  try {
    const { data: automations, error } = await supabase
      .from('instagram_automations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: automations
    })
  } catch (error) {
    console.error('❌ [Instagram API] Erro ao buscar automações:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar automações'
    }, { status: 500 })
  }
}

// POST - Criar nova automação
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, trigger_type, keywords, response_message, is_active = true } = body

    // Validar dados obrigatórios
    if (!trigger_type || !response_message) {
      return NextResponse.json({
        success: false,
        error: 'trigger_type e response_message são obrigatórios'
      }, { status: 400 })
    }

    // Criar automação
    const automationData = {
      name: name || `Automação ${trigger_type}`,
      trigger_type,
      keywords: Array.isArray(keywords) ? keywords : keywords ? keywords.split(',').map((k: string) => k.trim()) : [],
      response_message,
      is_active,
      responses_sent: 0
    }

    const { data, error } = await supabase
      .from('instagram_automations')
      .insert(automationData)
      .select()
      .single()

    if (error) throw error

    console.log('✅ [Instagram API] Automação criada:', data.id)

    return NextResponse.json({
      success: true,
      data: data
    })
  } catch (error) {
    console.error('❌ [Instagram API] Erro ao criar automação:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro ao criar automação'
    }, { status: 500 })
  }
}