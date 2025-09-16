/**
 * Analisador de Feedback usando Gemma3 - Versão Melhorada
 */

import { gemmaService } from './gemma-service'

export interface GemmaFeedbackAnalysis {
  sentiment: 'positivo' | 'neutro' | 'negativo'
  sentimentScore: number // 0-100
  riskLevel: 'baixo' | 'medio' | 'alto' | 'critico'
  churnRisk: number // 0-100
  npsCategory: 'detrator' | 'neutro' | 'promotor'
  keyInsights: string[]
  actionableItems: string[]
  opportunities: string[]
  priorityLevel: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  personalizedMessage: string
}

export async function analyzeFormResponse(resposta: any): Promise<GemmaFeedbackAnalysis> {
  try {
    // Extrair dados da resposta
    const npsScore = extractNpsScore(resposta)
    const textResponses = extractTextResponses(resposta)
    const formularioTipo = resposta.formulario || 'generico'

    // Criar prompt detalhado para análise
    const prompt = `Analise esta resposta de formulário de mentoria médica:

DADOS:
- Formulário: ${formularioTipo}
- NPS: ${npsScore || 'N/A'}
- Respostas: ${JSON.stringify(textResponses, null, 2)}

ANÁLISE NECESSÁRIA:
1. **Sentimento**: positivo, neutro ou negativo
2. **Risco de Churn**: 0-100 (%)
3. **3 Insights principais** sobre o mentorado
4. **3 Ações específicas** para o Customer Success
5. **Oportunidades** identificadas
6. **Prioridade** (BAIXA/MEDIA/ALTA/CRITICA)

Responda no formato:
**Sentimento:** [positivo/neutro/negativo]
**Risco:** [0-100]%
**Insights:**
- [insight 1]
- [insight 2] 
- [insight 3]
**Ações:**
- [ação 1]
- [ação 2]
- [ação 3]
**Oportunidades:**
- [oportunidade 1]
**Prioridade:** [BAIXA/MEDIA/ALTA/CRITICA]
**Mensagem:** [mensagem personalizada para o mentorado]`

    const response = await gemmaService.analyzeFeedback(prompt, npsScore)

    if (response.success) {
      return parseGemmaResponse(response.content, npsScore)
    } else {
      // Fallback para análise básica
      return createFallbackAnalysis(npsScore, textResponses)
    }
  } catch (error) {
    console.error('Erro na análise Gemma:', error)
    return createFallbackAnalysis(0, [])
  }
}

function extractNpsScore(resposta: any): number | null {
  const responses = resposta.resposta_json?.respostas || resposta.resposta_json || {}
  
  // Tentar diferentes campos de NPS
  if (responses.nota_nps) return parseInt(responses.nota_nps)
  if (responses.nps) return parseInt(responses.nps)
  if (responses.satisfacao) return parseInt(responses.satisfacao)
  
  return null
}

function extractTextResponses(resposta: any): string[] {
  const responses = resposta.resposta_json?.respostas || resposta.resposta_json || {}
  const textResponses: string[] = []
  
  Object.entries(responses).forEach(([key, value]) => {
    if (typeof value === 'string' && value.length > 10 && !key.includes('nps') && !key.includes('nota')) {
      textResponses.push(value)
    }
  })
  
  return textResponses
}

function parseGemmaResponse(content: string, npsScore: number | null): GemmaFeedbackAnalysis {
  try {
    // Extrair dados usando regex
    const sentimentMatch = content.match(/\*\*Sentimento:\*\*\s*(positivo|neutro|negativo)/i)
    const riskMatch = content.match(/\*\*Risco:\*\*\s*(\d+)%?/i)
    const priorityMatch = content.match(/\*\*Prioridade:\*\*\s*(BAIXA|MEDIA|ALTA|CRITICA)/i)
    
    // Extrair insights
    const insightsSection = content.match(/\*\*Insights:\*\*([\s\S]*?)\*\*Ações:\*\*/i)
    const insights = insightsSection ? 
      insightsSection[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : 
      []

    // Extrair ações
    const actionsSection = content.match(/\*\*Ações:\*\*([\s\S]*?)\*\*Oportunidades:\*\*/i)
    const actions = actionsSection ? 
      actionsSection[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : 
      []

    // Extrair oportunidades
    const opportunitiesSection = content.match(/\*\*Oportunidades:\*\*([\s\S]*?)\*\*Prioridade:\*\*/i)
    const opportunities = opportunitiesSection ? 
      opportunitiesSection[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : 
      []

    // Extrair mensagem
    const messageMatch = content.match(/\*\*Mensagem:\*\*\s*(.*)/i)

    const sentiment = sentimentMatch ? sentimentMatch[1].toLowerCase() as 'positivo' | 'neutro' | 'negativo' : 'neutro'
    const churnRisk = riskMatch ? parseInt(riskMatch[1]) : 50
    const priority = priorityMatch ? priorityMatch[1] as 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA' : 'MEDIA'

    return {
      sentiment,
      sentimentScore: sentiment === 'positivo' ? 80 : sentiment === 'negativo' ? 20 : 50,
      riskLevel: churnRisk > 70 ? 'critico' : churnRisk > 50 ? 'alto' : churnRisk > 30 ? 'medio' : 'baixo',
      churnRisk,
      npsCategory: npsScore ? (npsScore >= 9 ? 'promotor' : npsScore >= 7 ? 'neutro' : 'detrator') : 'neutro',
      keyInsights: insights.slice(0, 3),
      actionableItems: actions.slice(0, 3),
      opportunities: opportunities.slice(0, 2),
      priorityLevel: priority,
      personalizedMessage: messageMatch ? messageMatch[1].trim() : 'Continue acompanhando o progresso do mentorado.'
    }
  } catch (error) {
    console.error('Erro ao parsear resposta Gemma:', error)
    return createFallbackAnalysis(npsScore, [])
  }
}

function createFallbackAnalysis(npsScore: number | null, textResponses: string[]): GemmaFeedbackAnalysis {
  const churnRisk = npsScore ? (npsScore >= 7 ? 20 : npsScore >= 5 ? 60 : 80) : 50
  
  return {
    sentiment: npsScore ? (npsScore >= 7 ? 'positivo' : npsScore >= 5 ? 'neutro' : 'negativo') : 'neutro',
    sentimentScore: npsScore ? npsScore * 10 : 50,
    riskLevel: churnRisk > 60 ? 'alto' : churnRisk > 40 ? 'medio' : 'baixo',
    churnRisk,
    npsCategory: npsScore ? (npsScore >= 9 ? 'promotor' : npsScore >= 7 ? 'neutro' : 'detrator') : 'neutro',
    keyInsights: [
      'Análise baseada apenas em NPS',
      textResponses.length > 0 ? 'Mentorado forneceu feedback textual' : 'Sem feedback textual detalhado',
      'Necessário acompanhamento personalizado'
    ],
    actionableItems: [
      'Agendar conversa individual',
      'Verificar progresso nos objetivos',
      'Solicitar feedback mais detalhado'
    ],
    opportunities: [
      'Melhorar experiência do mentorado'
    ],
    priorityLevel: churnRisk > 60 ? 'ALTA' : 'MEDIA',
    personalizedMessage: 'Acompanhar de perto o desenvolvimento do mentorado.'
  }
}