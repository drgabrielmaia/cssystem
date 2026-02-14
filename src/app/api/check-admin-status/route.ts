import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Buscar mentorado por email
    const { data: mentoradoData, error: fetchError } = await supabase
      .from('mentorados')
      .select('*')
      .ilike('email', email)
      .single()

    if (fetchError || !mentoradoData) {
      return NextResponse.json({
        isAdmin: false,
        isOwner: false,
        error: 'Usuário não encontrado'
      }, { status: 404 })
    }

    // Buscar organização para verificar se é owner
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_email', email.toLowerCase())
      .single()

    const isOwner = !orgError && !!orgData
    const isAdmin = isOwner // Por enquanto, consideramos que owners são admins

    return NextResponse.json({
      isAdmin,
      isOwner,
      organization: orgData || null,
      mentorado: mentoradoData
    })

  } catch (error) {
    console.error('Erro na API check-admin-status:', error)
    return NextResponse.json(
      { 
        isAdmin: false,
        isOwner: false,
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}