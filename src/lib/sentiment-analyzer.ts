/**
 * 🤖 SISTEMA DE ANÁLISE COM GEMMA3:1B EXCLUSIVAMENTE
 * REMOVEU A IA MERDA ANTIGA - SÓ GEMMA AQUI!
 */

import { gemmaFormsAnalyzer } from './gemma-forms-analyzer'
import { supabase } from './supabase'

export interface SentimentAnalysis {
  sentiment: 'positivo' | 'neutro' | 'negativo'
  confidence: number
  score: number
  emotions: string[]
  keywords: string[]
  riskLevel: 'baixo' | 'medio' | 'alto' | 'critico'
  churnProbability: number
  recommendations: string[]
}

export interface FormularioAnalysis {
  id: string
  mentorado: {
    id: string
    nome: string
    email: string
  }
  formulario: string
  npsScore?: number
  sentiment: SentimentAnalysis
  keyInsights: string[]
  actionItems: string[]
  urgencyLevel: 'baixa' | 'media' | 'alta' | 'critica'
  personalizedMessage: string
  dataAnalise: Date
}

export interface AggregatedAnalysis {
  totalRespostas: number
  sentimentDistribution: {
    positivo: number
    neutro: number
    negativo: number
  }
  npsDistribution: {
    promotores: number
    neutros: number
    detratores: number
  }
  overallSentiment: 'positivo' | 'neutro' | 'negativo'
  generalTrends: string[]
  criticalIssues: string[]
  opportunities: string[]
  recommendations: string[]
  riskMetrics: {
    highRiskCount: number
    averageChurnProbability: number
  }
  dataAnalise: Date
}

class SentimentAnalyzer {
  /**
   * ANÁLISE COM GEMMA3:1B - SEM A IA LIXO ANTIGA!
   */
  async analyzeFormulario(respostaId: string): Promise<FormularioAnalysis | null> {
    try {
      // Buscar resposta com dados do mentorado
      const { data: resposta } = await supabase
        .from('formularios_respostas')
        .select(`
          id,
          formulario,
          resposta_json,
          data_envio,
          mentorado_id,
          mentorados!inner(id, nome_completo, email)
        `)
        .eq('id', respostaId)
        .single()

      if (!resposta) return null

      // Extrair dados do formulário
      const respostas = resposta.resposta_json?.respostas || resposta.resposta_json || {}
      const npsScore = this.extractNpsScore(respostas)

      console.log('🤖 USANDO GEMMA3:1B para análise individual...')

      // USAR GEMMA3:1B DIRETAMENTE
      const gemmaResult = await gemmaFormsAnalyzer.analyzeForm(
        respostas,
        resposta.formulario,
        {
          nome: resposta.mentorados.nome_completo,
          email: resposta.mentorados.email,
          turma: 'N/A'
        }
      )

      // Converter resultado do Gemma para formato esperado
      const sentiment: SentimentAnalysis = {
        sentiment: gemmaResult.emocao === 'critico' ? 'negativo' : gemmaResult.emocao,
        confidence: Math.round((100 - gemmaResult.probabilidade_churn) * 0.8 + 20),
        score: Math.round((gemmaResult.nivel_satisfacao - 50) * 2), // -100 a +100
        emotions: [gemmaResult.emocao, 'análise', 'gemma'],
        keywords: gemmaResult.indicacoes.slice(0, 5),
        riskLevel: gemmaResult.probabilidade_churn >= 70 ? 'critico' : 
                   gemmaResult.probabilidade_churn >= 50 ? 'alto' :
                   gemmaResult.probabilidade_churn >= 30 ? 'medio' : 'baixo',
        churnProbability: gemmaResult.probabilidade_churn,
        recommendations: gemmaResult.acoes_imediatas
      }
      
      return {
        id: resposta.id,
        mentorado: {
          id: resposta.mentorados.id,
          nome: resposta.mentorados.nome_completo,
          email: resposta.mentorados.email
        },
        formulario: resposta.formulario,
        npsScore,
        sentiment,
        keyInsights: gemmaResult.oportunidades,
        actionItems: gemmaResult.acoes_imediatas,
        urgencyLevel: gemmaResult.probabilidade_churn >= 70 ? 'critica' : 
                     gemmaResult.probabilidade_churn >= 50 ? 'alta' : 
                     gemmaResult.probabilidade_churn >= 30 ? 'media' : 'baixa',
        personalizedMessage: `Olá ${resposta.mentorados.nome_completo}! ${gemmaResult.situacao_geral}`,
        dataAnalise: new Date()
      }

    } catch (error) {
      console.error('❌ Erro na análise Gemma3:1b:', error)
      return null
    }
  }

  /**
   * ANÁLISE AGREGADA COM GEMMA3:1B
   */
  async analyzeAllFormularios(limit = 100): Promise<AggregatedAnalysis> {
    try {
      // Buscar todas as respostas recentes
      const { data: respostas } = await supabase
        .from('formularios_respostas')
        .select(`
          id,
          formulario,
          resposta_json,
          data_envio,
          mentorados!inner(nome_completo, email)
        `)
        .order('data_envio', { ascending: false })
        .limit(limit)

      if (!respostas?.length) {
        return this.createEmptyAggregation()
      }

      console.log(`🤖 ANÁLISE AGREGADA COM GEMMA3:1B de ${respostas.length} respostas...`)

      // Processar apenas alguns para análise agregada (economizar tempo)
      const amostra = respostas.slice(0, Math.min(10, respostas.length))
      const analises = []

      for (const resposta of amostra) {
        try {
          const respostasData = resposta.resposta_json?.respostas || resposta.resposta_json || {}
          const gemmaResult = await gemmaFormsAnalyzer.analyzeForm(
            respostasData,
            resposta.formulario,
            {
              nome: resposta.mentorados.nome_completo,
              email: resposta.mentorados.email,
              turma: 'N/A'
            }
          )
          analises.push(gemmaResult)
        } catch (err) {
          console.warn('Erro em análise individual:', err)
        }
      }

      const npsScores = respostas.map(r => this.extractNpsScore(r.resposta_json?.respostas || r.resposta_json)).filter(Boolean)
      
      // Calcular distribuições baseado nas análises do Gemma
      const sentimentCounts = {
        positivo: analises.filter(a => a.emocao === 'positivo').length,
        neutro: analises.filter(a => a.emocao === 'neutro').length,
        negativo: analises.filter(a => a.emocao === 'negativo' || a.emocao === 'critico').length,
      }

      const total = analises.length || 1
      const sentimentDistribution = {
        positivo: Math.round((sentimentCounts.positivo / total) * 100),
        neutro: Math.round((sentimentCounts.neutro / total) * 100),
        negativo: Math.round((sentimentCounts.negativo / total) * 100)
      }

      // Agregar insights
      const allTrends = analises.flatMap(a => a.oportunidades).slice(0, 4)
      const allIssues = analises.flatMap(a => a.riscos).slice(0, 3)
      const allOpportunities = analises.flatMap(a => a.oportunidades).slice(0, 3)
      const allRecommendations = analises.flatMap(a => a.acoes_imediatas).slice(0, 4)

      const averageChurn = analises.length > 0 ? 
        Math.round(analises.reduce((sum, a) => sum + a.probabilidade_churn, 0) / analises.length) : 50

      return {
        totalRespostas: respostas.length,
        sentimentDistribution,
        npsDistribution: this.calculateNpsDistribution(npsScores),
        overallSentiment: sentimentDistribution.positivo > sentimentDistribution.negativo ? 'positivo' :
                         sentimentDistribution.negativo > sentimentDistribution.positivo ? 'negativo' : 'neutro',
        generalTrends: allTrends,
        criticalIssues: allIssues,
        opportunities: allOpportunities,
        recommendations: allRecommendations,
        riskMetrics: {
          highRiskCount: analises.filter(a => a.probabilidade_churn >= 50).length,
          averageChurnProbability: averageChurn
        },
        dataAnalise: new Date()
      }

    } catch (error) {
      console.error('❌ Erro na análise agregada Gemma3:1b:', error)
      return this.createEmptyAggregation()
    }
  }

  private extractNpsScore(respostas: any): number | null {
    if (!respostas) return null
    return respostas.nota_nps || respostas.nps || respostas.satisfacao || null
  }

  private calculateNpsDistribution(npsScores: number[]) {
    const promotores = npsScores.filter(s => s >= 9).length
    const neutros = npsScores.filter(s => s >= 7 && s <= 8).length  
    const detratores = npsScores.filter(s => s <= 6).length
    
    return { promotores, neutros, detratores }
  }

  private createEmptyAggregation(): AggregatedAnalysis {
    return {
      totalRespostas: 0,
      sentimentDistribution: { positivo: 0, neutro: 0, negativo: 0 },
      npsDistribution: { promotores: 0, neutros: 0, detratores: 0 },
      overallSentiment: 'neutro',
      generalTrends: ['🤖 Gemma3:1b aguardando dados para análise'],
      criticalIssues: ['Sem respostas para analisar'],
      opportunities: ['Começar a coletar feedback dos mentorados'],
      recommendations: ['Implementar sistema de feedback', 'Engajar mentorados com Gemma3:1b', 'Definir métricas'],
      riskMetrics: {
        highRiskCount: 0,
        averageChurnProbability: 0
      },
      dataAnalise: new Date()
    }
  }
}

export const sentimentAnalyzer = new SentimentAnalyzer()