import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin permissions
    const { data: orgUser, error: orgError } = await supabase
      .from('organization_users')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgUser || !['admin', 'owner'].includes(orgUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch mentorados from same organization only
    const { data: mentorados, error } = await supabase
      .from('mentorados')
      .select('id, nome_completo, email, telefone, estado_atual')
      .eq('organization_id', orgUser.organization_id)
      .order('nome_completo', { ascending: true })

    if (error) {
      console.error('Erro ao buscar mentorados:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        mentorados: []
      }, { status: 500 })
    }

    // Format data for the frontend
    const formattedMentorados = mentorados?.map(m => ({
      id: m.id,
      nome_completo: m.nome_completo,
      email: m.email,
      telefone: m.telefone,
      estado_atual: m.estado_atual
    })) || []

    return NextResponse.json({
      success: true,
      mentorados: formattedMentorados,
      source: 'supabase'
    })

  } catch (error) {
    console.error('Erro na API mentorados:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      mentorados: []
    }, { status: 500 })
  }
}