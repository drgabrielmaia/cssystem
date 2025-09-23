import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createClient()

    // Fetch mentorados from Supabase
    const { data: mentorados, error } = await supabase
      .from('mentorados')
      .select('id, nome_completo, turma')
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
      nome: m.nome_completo,
      turma: m.turma || 'Sem turma'
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