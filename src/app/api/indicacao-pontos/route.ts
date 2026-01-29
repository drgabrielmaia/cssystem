import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// API para processar pontos de indicação automaticamente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lead_id, indicado_por_id, force_reprocess } = body

    if (!lead_id) {
      return NextResponse.json(
        { error: 'ID do lead é obrigatório' },
        { status: 400 }
      )
    }

    console.log('🎯 Processando pontos de indicação para lead:', lead_id)

    // 1. Verificar se o lead existe e buscar informações
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      )
    }

    // 2. Verificar se já existe pontuação para esta indicação
    if (!force_reprocess) {
      const { data: existingPoint, error: existingError } = await supabase
        .from('pontuacao_mentorados')
        .select('id')
        .eq('tipo_acao', 'indicacao')
        .eq('meta_data->lead_id', lead_id)
        .single()

      if (existingPoint && !existingError) {
        return NextResponse.json({
          message: 'Pontos já foram atribuídos para esta indicação',
          already_processed: true
        })
      }
    }

    // 3. Determinar quem indicou
    let indicadorId = indicado_por_id

    if (!indicadorId) {
      // Tentar extrair de diferentes campos possíveis
      const possibleFields = [
        lead.indicado_por,
        lead.mentorado_indicador_id,
        lead.source_mentorado_id,
        lead.referral_id,
        lead.quem_indicou
      ]

      for (const field of possibleFields) {
        if (field && typeof field === 'string' && field.trim() !== '') {
          indicadorId = field
          break
        }
      }
    }

    if (!indicadorId) {
      return NextResponse.json({
        message: 'Nenhum indicador identificado para este lead',
        lead: lead.nome_completo,
        processed: false
      })
    }

    // 4. Verificar se o indicador é um mentorado válido
    const { data: indicador, error: indicadorError } = await supabase
      .from('mentorados')
      .select('id, nome_completo')
      .eq('id', indicadorId)
      .single()

    if (indicadorError || !indicador) {
      // Tentar buscar por nome se não encontrou por ID
      const { data: indicadorByName, error: nameError } = await supabase
        .from('mentorados')
        .select('id, nome_completo')
        .ilike('nome_completo', `%${indicadorId}%`)
        .limit(1)
        .single()

      if (nameError || !indicadorByName) {
        return NextResponse.json({
          message: `Indicador '${indicadorId}' não encontrado como mentorado`,
          processed: false
        })
      }

      indicadorId = indicadorByName.id
    }

    // 5. Adicionar ponto pela indicação
    const pontuacaoData = {
      mentorado_id: indicadorId,
      tipo_acao: 'indicacao',
      pontos: 1,
      descricao: `Indicação do lead: ${lead.nome_completo}`,
      data_acao: new Date().toISOString().split('T')[0],
      criado_por: 'sistema_automatico',
      meta_data: {
        lead_id: lead_id,
        lead_nome: lead.nome_completo,
        lead_status: lead.status,
        processed_at: new Date().toISOString()
      }
    }

    const { data: novaPontuacao, error: pontuacaoError } = await supabase
      .from('pontuacao_mentorados')
      .insert([pontuacaoData])
      .select()

    if (pontuacaoError) {
      console.error('Erro ao adicionar pontuação:', pontuacaoError)
      return NextResponse.json(
        { error: 'Erro ao adicionar pontos' },
        { status: 500 }
      )
    }

    // 6. Atualizar pontuação total do mentorado
    const { data: allPoints } = await supabase
      .from('pontuacao_mentorados')
      .select('pontos')
      .eq('mentorado_id', indicadorId)

    const totalPontos = allPoints?.reduce((sum, p) => sum + p.pontos, 0) || 0

    await supabase
      .from('mentorados')
      .update({ pontuacao_total: totalPontos })
      .eq('id', indicadorId)

    return NextResponse.json({
      success: true,
      message: `1 ponto adicionado para ${indicador?.nome_completo || 'mentorado'} pela indicação de ${lead.nome_completo}`,
      pontuacao: novaPontuacao?.[0],
      total_pontos: totalPontos,
      indicador: indicador?.nome_completo,
      lead: lead.nome_completo
    })

  } catch (error) {
    console.error('Erro no processamento de pontos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET - Verificar indicações pendentes de processamento
export async function GET() {
  try {
    console.log('🔍 Verificando indicações pendentes...')

    // Buscar leads que podem ter indicações mas não têm pontos processados
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, nome_completo, status, indicado_por, created_at')
      .not('indicado_por', 'is', null)
      .not('indicado_por', 'eq', '')
      .order('created_at', { ascending: false })
      .limit(50)

    if (leadsError) {
      return NextResponse.json({ error: 'Erro ao buscar leads' }, { status: 500 })
    }

    // Verificar quais não têm pontos processados
    const pendingLeads = []

    for (const lead of leads || []) {
      const { data: existingPoint } = await supabase
        .from('pontuacao_mentorados')
        .select('id')
        .eq('tipo_acao', 'indicacao')
        .eq('meta_data->lead_id', lead.id)
        .single()

      if (!existingPoint) {
        pendingLeads.push({
          lead_id: lead.id,
          lead_nome: lead.nome_completo,
          lead_status: lead.status,
          indicado_por: lead.indicado_por,
          created_at: lead.created_at
        })
      }
    }

    return NextResponse.json({
      success: true,
      pending_count: pendingLeads.length,
      pending_leads: pendingLeads.slice(0, 10), // Mostrar apenas os primeiros 10
      total_leads_checked: leads?.length || 0
    })

  } catch (error) {
    console.error('Erro ao verificar pendências:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}