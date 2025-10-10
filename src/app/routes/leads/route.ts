import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, nome_completo, email, telefone, empresa, status')
      .order('nome_completo')

    if (error) {
      console.error('Erro ao buscar leads:', error)
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar leads'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      leads: leads || []
    })

  } catch (error) {
    console.error('Erro no servidor:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}