/**
 * 🤖 API de Análise de Formulários com Gemma3:1b
 * Endpoint especializado para análise completa de formulários
 */

import { NextRequest, NextResponse } from 'next/server'
import { gemmaFormsAnalyzer } from '@/lib/gemma-forms-analyzer'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { respostaId, formularioId, respostas, mentoradoId } = body

    if (!respostaId && !respostas) {
      return NextResponse.json(
        { error: 'É necessário fornecer respostaId ou respostas' },
        { status: 400 }
      )
    }

    let dadosAnalise = respostas
    let mentoradoInfo = null

    // Se foi passado apenas o ID, buscar os dados
    if (respostaId && !respostas) {
      const { data: respostaData, error } = await supabase
        .from('formularios_respostas')
        .select('resposta_json, formulario, mentorado_id')
        .eq('id', respostaId)
        .single()

      if (error || !respostaData) {
        return NextResponse.json(
          { error: 'Resposta não encontrada' },
          { status: 404 }
        )
      }

      dadosAnalise = respostaData.resposta_json?.respostas || {}
      formularioId = respostaData.formulario
      mentoradoId = respostaData.mentorado_id
    }

    // Buscar dados do mentorado se disponível
    if (mentoradoId) {
      const { data: mentorado } = await supabase
        .from('mentorados')
        .select('nome_completo, email, turma')
        .eq('id', mentoradoId)
        .single()

      if (mentorado) {
        mentoradoInfo = {
          nome: mentorado.nome_completo,
          email: mentorado.email,
          turma: mentorado.turma
        }
      }
    }

    // Executar análise com Gemma3:1b
    console.log('🤖 Iniciando análise com Gemma3:1b...')
    const startTime = Date.now()
    
    const analysis = await gemmaFormsAnalyzer.analyzeForm(
      dadosAnalise,
      formularioId || 'unknown',
      mentoradoInfo
    )

    const responseTime = Date.now() - startTime
    console.log(`✅ Análise concluída em ${responseTime}ms`)

    // Salvar análise no banco (opcional)
    if (respostaId) {
      try {
        await supabase
          .from('formularios_analises')
          .upsert({
            resposta_id: respostaId,
            analise_json: analysis,
            data_analise: new Date().toISOString(),
            modelo_ia: 'gemma3:1b',
            tempo_resposta: responseTime
          })
      } catch (saveError) {
        console.warn('Aviso: Não foi possível salvar análise no banco:', saveError)
      }
    }

    return NextResponse.json({
      success: true,
      data: analysis,
      metadata: {
        modelo: 'gemma3:1b',
        tempoResposta: responseTime,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Erro na análise de formulário:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno na análise',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const respostaId = searchParams.get('respostaId')

    if (!respostaId) {
      return NextResponse.json(
        { error: 'respostaId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar dados da resposta diretamente e analisar
    const { data: respostaData, error } = await supabase
      .from('formularios_respostas')
      .select('resposta_json, formulario, mentorado_id')
      .eq('id', respostaId)
      .single()

    if (error || !respostaData) {
      return NextResponse.json(
        { error: 'Resposta não encontrada' },
        { status: 404 }
      )
    }

    const dadosAnalise = respostaData.resposta_json?.respostas || {}
    let mentoradoInfo = null

    // Buscar dados do mentorado
    if (respostaData.mentorado_id) {
      const { data: mentorado } = await supabase
        .from('mentorados')
        .select('nome_completo, email, turma')
        .eq('id', respostaData.mentorado_id)
        .single()

      if (mentorado) {
        mentoradoInfo = {
          nome: mentorado.nome_completo,
          email: mentorado.email,
          turma: mentorado.turma
        }
      }
    }

    // Executar análise com Gemma3:1b
    console.log('🤖 Executando análise via GET...')
    const startTime = Date.now()
    
    const analysis = await gemmaFormsAnalyzer.analyzeForm(
      dadosAnalise,
      respostaData.formulario || 'unknown',
      mentoradoInfo
    )

    const responseTime = Date.now() - startTime
    console.log(`✅ Análise GET concluída em ${responseTime}ms`)

    return NextResponse.json({
      success: true,
      data: analysis,
      metadata: {
        modelo: 'gemma3:1b',
        tempoResposta: responseTime,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Erro ao buscar análise:', error)
    return NextResponse.json(
      { 
        error: 'Erro ao buscar análise',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}