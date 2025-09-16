/**
 * 🤖 API de Análise de Sentimento
 * Endpoints para análise individual e agregada de formulários
 */

import { NextRequest, NextResponse } from 'next/server'
import { sentimentAnalyzer } from '@/lib/sentiment-analyzer'

// Análise individual de um formulário
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    const respostaId = searchParams.get('id')
    const limit = parseInt(searchParams.get('limit') || '100')

    if (action === 'individual' && respostaId) {
      // Análise de um formulário específico
      const analysis = await sentimentAnalyzer.analyzeFormulario(respostaId)
      
      if (!analysis) {
        return NextResponse.json(
          { error: 'Formulário não encontrado' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: analysis,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'aggregated') {
      // Análise agregada de todos os formulários
      const aggregatedAnalysis = await sentimentAnalyzer.analyzeAllFormularios(limit)
      
      return NextResponse.json({
        success: true,
        data: aggregatedAnalysis,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json(
      { error: 'Ação não especificada. Use ?action=individual&id=X ou ?action=aggregated' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Erro na API de sentimento:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// Análise por POST para dados customizados
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    if (action === 'individual' && data?.respostaId) {
      const analysis = await sentimentAnalyzer.analyzeFormulario(data.respostaId)
      
      return NextResponse.json({
        success: true,
        data: analysis
      })
    }

    if (action === 'batch' && Array.isArray(data?.respostaIds)) {
      // Análise em lote
      const analyses = await Promise.all(
        data.respostaIds.map(async (id: string) => {
          try {
            return await sentimentAnalyzer.analyzeFormulario(id)
          } catch (error) {
            console.error(`Erro ao analisar ${id}:`, error)
            return null
          }
        })
      )

      const validAnalyses = analyses.filter(Boolean)

      return NextResponse.json({
        success: true,
        data: validAnalyses,
        processed: validAnalyses.length,
        total: data.respostaIds.length
      })
    }

    return NextResponse.json(
      { error: 'Dados inválidos' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Erro no POST da API de sentimento:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}