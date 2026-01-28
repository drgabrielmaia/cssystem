import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const genero = searchParams.get('genero') // 'masculino', 'feminino' ou null para todos
    const limit = parseInt(searchParams.get('limit') || '50')

    // Buscar mentorados com pontuação
    let query = supabase
      .from('mentorados')
      .select(`
        id,
        nome_completo,
        genero,
        especialidade,
        pontuacao_total
      `)
      .not('pontuacao_total', 'is', null)
      .order('pontuacao_total', { ascending: false })

    if (genero) {
      query = query.eq('genero', genero)
    }

    if (limit > 0) {
      query = query.limit(limit)
    }

    const { data: mentorados, error } = await query

    if (error) {
      console.error('Erro ao buscar ranking:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar ranking' },
        { status: 500 }
      )
    }

    // Buscar contagem de indicações para retrocompatibilidade
    const { data: indicacoes, error: indicacoesError } = await supabase
      .from('pontuacao_mentorados')
      .select('mentorado_id, pontos')
      .eq('tipo_acao', 'indicacao')

    if (indicacoesError) {
      console.warn('Aviso ao buscar indicações:', indicacoesError)
    }

    // Processar dados para ranking
    const ranking = mentorados?.map((mentorado, index) => {
      // Calcular total de indicações
      const indicacoesMentorado = indicacoes?.filter(
        ind => ind.mentorado_id === mentorado.id
      ) || []

      const totalIndicacoes = indicacoesMentorado.reduce(
        (sum, ind) => sum + (ind.pontos || 1), 0
      ) // Assumir 1 indicação = 1 ponto

      return {
        mentorado_id: mentorado.id,
        nome_completo: mentorado.nome_completo,
        pontuacao_total: mentorado.pontuacao_total || 0,
        total_indicacoes: totalIndicacoes,
        genero: mentorado.genero || 'nao_informado',
        especialidade: mentorado.especialidade,
        posicao: index + 1
      }
    }) || []

    // Separar por gênero se necessário
    let rankingMasculino = ranking.filter(r => r.genero === 'masculino')
    let rankingFeminino = ranking.filter(r => r.genero === 'feminino')

    // Reposicionar dentro de cada categoria
    rankingMasculino = rankingMasculino.map((r, index) => ({ ...r, posicao: index + 1 }))
    rankingFeminino = rankingFeminino.map((r, index) => ({ ...r, posicao: index + 1 }))

    return NextResponse.json({
      success: true,
      ranking: {
        geral: ranking,
        masculino: rankingMasculino,
        feminino: rankingFeminino
      },
      stats: {
        total_mentorados: ranking.length,
        total_masculino: rankingMasculino.length,
        total_feminino: rankingFeminino.length,
        total_pontos: ranking.reduce((sum, r) => sum + r.pontuacao_total, 0)
      }
    })

  } catch (error) {
    console.error('Erro na API de ranking:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}