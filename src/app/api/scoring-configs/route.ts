import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from('scoring_configurations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      organization_id,
      name,
      is_active,
      telefone_score,
      email_score,
      empresa_score,
      cargo_score,
      temperatura_elite_score,
      temperatura_quente_score,
      temperatura_morno_score,
      temperatura_frio_score,
      nivel_interesse_alto_score,
      nivel_interesse_medio_score,
      nivel_interesse_baixo_score,
      orcamento_disponivel_score,
      decisor_principal_score,
      dor_principal_score,
      low_score_threshold,
      low_score_closer_id,
      high_score_closer_id,
      form_title,
      form_description
    } = body

    if (!organization_id || !name) {
      return NextResponse.json({ error: 'Organization ID and name are required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // If setting as active, deactivate other configs first
    if (is_active) {
      await supabase
        .from('scoring_configurations')
        .update({ is_active: false })
        .eq('organization_id', organization_id)
    }

    const { data, error } = await supabase
      .from('scoring_configurations')
      .insert({
        organization_id,
        name,
        is_active: is_active || false,
        telefone_score: telefone_score || 10,
        email_score: email_score || 10,
        empresa_score: empresa_score || 15,
        cargo_score: cargo_score || 15,
        temperatura_elite_score: temperatura_elite_score || 40,
        temperatura_quente_score: temperatura_quente_score || 30,
        temperatura_morno_score: temperatura_morno_score || 20,
        temperatura_frio_score: temperatura_frio_score || 10,
        nivel_interesse_alto_score: nivel_interesse_alto_score || 25,
        nivel_interesse_medio_score: nivel_interesse_medio_score || 15,
        nivel_interesse_baixo_score: nivel_interesse_baixo_score || 5,
        orcamento_disponivel_score: orcamento_disponivel_score || 20,
        decisor_principal_score: decisor_principal_score || 25,
        dor_principal_score: dor_principal_score || 15,
        low_score_threshold: low_score_threshold || 60,
        low_score_closer_id,
        high_score_closer_id,
        form_title: form_title || 'Qualificação de Lead',
        form_description: form_description || 'Preencha os dados para calcular automaticamente o score',
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      organization_id,
      name,
      is_active,
      telefone_score,
      email_score,
      empresa_score,
      cargo_score,
      temperatura_elite_score,
      temperatura_quente_score,
      temperatura_morno_score,
      temperatura_frio_score,
      nivel_interesse_alto_score,
      nivel_interesse_medio_score,
      nivel_interesse_baixo_score,
      orcamento_disponivel_score,
      decisor_principal_score,
      dor_principal_score,
      low_score_threshold,
      low_score_closer_id,
      high_score_closer_id,
      form_title,
      form_description
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // If setting as active, deactivate other configs first
    if (is_active) {
      await supabase
        .from('scoring_configurations')
        .update({ is_active: false })
        .eq('organization_id', organization_id)
    }

    const { data, error } = await supabase
      .from('scoring_configurations')
      .update({
        name,
        is_active,
        telefone_score,
        email_score,
        empresa_score,
        cargo_score,
        temperatura_elite_score,
        temperatura_quente_score,
        temperatura_morno_score,
        temperatura_frio_score,
        nivel_interesse_alto_score,
        nivel_interesse_medio_score,
        nivel_interesse_baixo_score,
        orcamento_disponivel_score,
        decisor_principal_score,
        dor_principal_score,
        low_score_threshold,
        low_score_closer_id,
        high_score_closer_id,
        form_title,
        form_description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}