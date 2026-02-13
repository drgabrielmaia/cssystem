import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      nome_completo,
      email,
      telefone,
      empresa,
      cargo,
      temperatura,
      nivel_interesse,
      orcamento_disponivel,
      decisor_principal,
      dor_principal,
      preferred_datetime,
      primary_closer_id,
      organization_id
    } = body

    // Validate required fields
    if (!nome_completo || !email || !telefone) {
      return NextResponse.json(
        { success: false, error: 'Nome, email e telefone são obrigatórios' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Call the database function to process the form
    const { data, error } = await supabase
      .rpc('process_lead_form_with_scheduling', {
        p_nome_completo: nome_completo,
        p_email: email,
        p_telefone: telefone,
        p_empresa: empresa || null,
        p_cargo: cargo || null,
        p_temperatura: temperatura || 'morno',
        p_nivel_interesse: (() => {
          // Convert to integer regardless of input type
          if (typeof nivel_interesse === 'number') return nivel_interesse
          if (typeof nivel_interesse === 'string') {
            if (nivel_interesse === 'alto' || nivel_interesse === 'high') return 3
            if (nivel_interesse === 'medio' || nivel_interesse === 'medium') return 2
            if (nivel_interesse === 'baixo' || nivel_interesse === 'low') return 1
            const parsed = parseInt(nivel_interesse)
            if (!isNaN(parsed) && parsed >= 1 && parsed <= 3) return parsed
          }
          return 2 // Default to medium
        })(),
        p_orcamento_disponivel: orcamento_disponivel || 0,
        p_decisor_principal: decisor_principal || false,
        p_dor_principal: dor_principal || null,
        p_preferred_datetime: preferred_datetime || null,
        p_primary_closer_id: primary_closer_id || null,
        p_organization_id: organization_id
      })

    if (error) {
      console.error('Error processing lead form:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao processar formulário',
          details: error.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}