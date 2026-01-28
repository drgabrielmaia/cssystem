import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Buscar pontuações de um mentorado
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mentoradoId = searchParams.get('mentorado_id')

    if (!mentoradoId) {
      return NextResponse.json(
        { error: 'ID do mentorado é obrigatório' },
        { status: 400 }
      )
    }

    const { data: pontuacoes, error } = await supabase
      .from('pontuacao_mentorados')
      .select('*')
      .eq('mentorado_id', mentoradoId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar pontuações:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar pontuações' },
        { status: 500 }
      )
    }

    // Calcular total de pontos
    const totalPontos = pontuacoes?.reduce((sum, p) => sum + p.pontos, 0) || 0

    return NextResponse.json({
      success: true,
      pontuacoes: pontuacoes || [],
      total_pontos: totalPontos
    })

  } catch (error) {
    console.error('Erro na API de pontuação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Adicionar pontos para um mentorado
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      mentorado_id,
      tipo_acao,
      pontos,
      descricao,
      data_acao,
      criado_por,
      meta_data
    } = body

    // Validações
    if (!mentorado_id || !tipo_acao || !pontos || !descricao) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: mentorado_id, tipo_acao, pontos, descricao' },
        { status: 400 }
      )
    }

    if (pontos < 0) {
      return NextResponse.json(
        { error: 'Pontos não podem ser negativos' },
        { status: 400 }
      )
    }

    // Verificar se mentorado existe
    const { data: mentorado, error: mentoradoError } = await supabase
      .from('mentorados')
      .select('id, nome_completo')
      .eq('id', mentorado_id)
      .single()

    if (mentoradoError || !mentorado) {
      return NextResponse.json(
        { error: 'Mentorado não encontrado' },
        { status: 404 }
      )
    }

    // Inserir nova pontuação
    const { data: novaPontuacao, error: insertError } = await supabase
      .from('pontuacao_mentorados')
      .insert([{
        mentorado_id,
        tipo_acao,
        pontos,
        descricao,
        data_acao: data_acao || new Date().toISOString(),
        criado_por,
        meta_data
      }])
      .select()

    if (insertError) {
      console.error('Erro ao inserir pontuação:', insertError)
      return NextResponse.json(
        { error: 'Erro ao adicionar pontos' },
        { status: 500 }
      )
    }

    // Atualizar pontuação total do mentorado
    await atualizarPontuacaoTotal(mentorado_id)

    return NextResponse.json({
      success: true,
      message: `${pontos} pontos adicionados para ${mentorado.nome_completo}`,
      pontuacao: novaPontuacao?.[0]
    })

  } catch (error) {
    console.error('Erro ao adicionar pontuação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função auxiliar para atualizar pontuação total
async function atualizarPontuacaoTotal(mentoradoId: string) {
  try {
    // Calcular soma total de pontos
    const { data: pontuacoes, error: pontError } = await supabase
      .from('pontuacao_mentorados')
      .select('pontos')
      .eq('mentorado_id', mentoradoId)

    if (pontError) {
      console.error('Erro ao calcular pontos totais:', pontError)
      return
    }

    const totalPontos = pontuacoes?.reduce((sum, p) => sum + p.pontos, 0) || 0

    // Atualizar tabela mentorados
    const { error: updateError } = await supabase
      .from('mentorados')
      .update({ pontuacao_total: totalPontos })
      .eq('id', mentoradoId)

    if (updateError) {
      console.error('Erro ao atualizar pontuação total:', updateError)
    }

  } catch (error) {
    console.error('Erro ao atualizar pontuação total:', error)
  }
}