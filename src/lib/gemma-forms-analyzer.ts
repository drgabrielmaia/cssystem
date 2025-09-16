/**
 * 🤖 Gemma3:1b Forms Analyzer
 * Analisador específico para formulários com foco em emoção, riscos, persona e oportunidades
 */

import { gemmaService } from './gemma-service'

export interface FormAnalysisResult {
  emocao: 'positivo' | 'neutro' | 'negativo' | 'critico'
  indicacoes: string[]
  riscos: string[]
  persona: string
  oportunidades: string[]
  situacao_geral: string
  nivel_satisfacao: number
  probabilidade_churn: number
  acoes_imediatas: string[]
}

export class GemmaFormsAnalyzer {
  /**
   * Analisa um formulário completo usando Gemma3:1b
   */
  async analyzeForm(
    respostas: Record<string, any>,
    formularioTipo: string,
    mentoradoInfo?: { nome: string; email: string; turma?: string }
  ): Promise<FormAnalysisResult> {
    
    const prompt = this.buildAnalysisPrompt(respostas, formularioTipo, mentoradoInfo)
    
    try {
      const response = await gemmaService.customerSuccessQuery(prompt)

      if (response.success) {
        return this.parseGemmaResponse(response.content, respostas)
      } else {
        console.warn('Gemma3 falhou, usando fallback inteligente:', response.error)
        return this.intelligentFallback(respostas)
      }
    } catch (error) {
      console.error('Erro na análise Gemma3:', error)
      return this.intelligentFallback(respostas)
    }
  }

  private buildAnalysisPrompt(
    respostas: Record<string, any>,
    formularioTipo: string,
    mentoradoInfo?: any
  ): string {
    // Debug: vamos ver exatamente quais dados estão chegando
    console.log('🔍 DEBUG - Dados recebidos para análise:', {
      formularioTipo,
      respostas,
      keys: Object.keys(respostas)
    });

    const npsScore = respostas.nota_nps || respostas.nps || 0
    const feedback = Object.entries(respostas)
      .filter(([key, value]) => typeof value === 'string' && value.length > 0)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')

    // Debug específico do NPS
    console.log('🎯 DEBUG - NPS encontrado:', {
      nota_nps: respostas.nota_nps,
      nps: respostas.nps,
      npsScore
    });

    return `ANÁLISE CRÍTICA DE FORMULÁRIO - GEMMA3:1b

DADOS DO FORMULÁRIO:
- Tipo: ${formularioTipo}
- NPS: ${npsScore}/10
${mentoradoInfo ? `- Mentorado: ${mentoradoInfo.nome} (${mentoradoInfo.turma || 'N/A'})` : ''}
- Respostas:
${feedback}

ANALISADOR: Você é um especialista em Customer Success. Analise CRITICAMENTE este formulário.

INSTRUÇÕES ESPECÍFICAS:
1. EMOÇÃO: Se NPS ≤ 4 = negativo, se NPS ≥ 8 = positivo, caso contrário neutro. Se menciona problemas graves = critico
2. INDICAÇÕES: 3 ações específicas e práticas
3. RISCOS: Identifique riscos reais de churn, insatisfação ou abandono
4. PERSONA: Perfil do mentorado baseado nas respostas (ex: "Iniciante motivado", "Experiente insatisfeito")  
5. OPORTUNIDADES: Pontos para melhorar a mentoria ou expandir relacionamento

RESPONDA EXATAMENTE NESTE FORMATO:
EMOCAO: [positivo|neutro|negativo|critico]
INDICACOES: [ação1|ação2|ação3]
RISCOS: [risco1|risco2|risco3]
PERSONA: [perfil em 2-3 palavras]
OPORTUNIDADES: [oportunidade1|oportunidade2|oportunidade3]
SITUACAO: [situação atual em uma frase]
SATISFACAO: [0-100]
CHURN: [0-100]
ACOES: [ação_imediata1|ação_imediata2|ação_imediata3]`
  }

  private parseGemmaResponse(content: string, respostas: Record<string, any>): FormAnalysisResult {
    try {
      const npsScore = parseInt(respostas.nota_nps || respostas.nps) || 0

      // Debug do parsing
      console.log('🔧 DEBUG - Parsing Gemma response:', {
        npsScore,
        contentPreview: content.substring(0, 200)
      });

      // Parse usando regex robusta
      const emocaoMatch = content.match(/EMOCAO:\s*(positivo|neutro|negativo|critico)/i)
      const indicacoesMatch = content.match(/INDICACOES:\s*([\s\S]*?)(?:\n(?=RISCOS:)|$)/i)
      const riscosMatch = content.match(/RISCOS:\s*([\s\S]*?)(?:\n(?=PERSONA:)|$)/i)
      const personaMatch = content.match(/PERSONA:\s*([\s\S]*?)(?:\n(?=OPORTUNIDADES:)|$)/i)
      const oportunidadesMatch = content.match(/OPORTUNIDADES:\s*([\s\S]*?)(?:\n(?=SITUACAO:)|$)/i)
      const situacaoMatch = content.match(/SITUACAO:\s*([\s\S]*?)(?:\n(?=SATISFACAO:)|$)/i)
      const satisfacaoMatch = content.match(/SATISFACAO:\s*(\d+)/i)
      const churnMatch = content.match(/CHURN:\s*(\d+)/i)
      const acoesMatch = content.match(/ACOES:\s*([\s\S]*?)$/i)

      const result = {
        emocao: emocaoMatch?.[1]?.toLowerCase() as any || this.inferEmocao(npsScore),
        indicacoes: this.parseList(indicacoesMatch?.[1]) || this.getDefaultIndicacoes(npsScore),
        riscos: this.parseList(riscosMatch?.[1]) || this.getDefaultRiscos(npsScore),
        persona: personaMatch?.[1]?.trim() || this.inferPersona(npsScore, respostas),
        oportunidades: this.parseList(oportunidadesMatch?.[1]) || this.getDefaultOportunidades(npsScore),
        situacao_geral: situacaoMatch?.[1]?.trim() || `Mentorado com NPS ${npsScore}`,
        nivel_satisfacao: satisfacaoMatch ? parseInt(satisfacaoMatch[1]) : this.inferSatisfacao(npsScore),
        probabilidade_churn: churnMatch ? parseInt(churnMatch[1]) : this.inferChurn(npsScore),
        acoes_imediatas: this.parseList(acoesMatch?.[1]) || this.getDefaultAcoes(npsScore)
      }

      console.log('✅ DEBUG - Resultado final da análise:', result);
      return result;

    } catch (error) {
      console.error('Erro ao parsear resposta Gemma:', error)
      return this.intelligentFallback(respostas)
    }
  }

  private parseList(text?: string): string[] {
    if (!text) return []
    return text.split('|')
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .slice(0, 3) // Máximo 3 itens
  }

  private inferEmocao(npsScore: number): 'positivo' | 'neutro' | 'negativo' | 'critico' {
    if (npsScore <= 2) return 'critico'
    if (npsScore <= 4) return 'negativo'
    if (npsScore >= 8) return 'positivo'
    return 'neutro'
  }

  private inferSatisfacao(npsScore: number): number {
    // Converter NPS (1-10) para satisfação (0-100)
    // NPS 10 = 100% satisfação, NPS 1 = 10% satisfação
    const satisfacao = Math.max(0, Math.min(100, npsScore * 10))
    console.log(`📊 DEBUG - Inferindo satisfação: NPS ${npsScore} -> ${satisfacao}%`);
    return satisfacao
  }

  private inferChurn(npsScore: number): number {
    if (npsScore <= 2) return 85
    if (npsScore <= 4) return 70
    if (npsScore <= 6) return 45
    if (npsScore <= 7) return 25
    return 10
  }

  private inferPersona(npsScore: number, respostas: any): string {
    if (npsScore <= 3) return 'Insatisfeito crítico'
    if (npsScore <= 6) return 'Neutro cauteloso'
    if (npsScore >= 9) return 'Promotor entusiasmado'
    return 'Satisfeito moderado'
  }

  private getDefaultIndicacoes(npsScore: number): string[] {
    if (npsScore <= 4) {
      return [
        'Contato urgente para entender problemas',
        'Revisar expectativas e objetivos',
        'Plano de recuperação personalizado'
      ]
    }
    if (npsScore >= 8) {
      return [
        'Documentar pontos positivos',
        'Solicitar depoimento/case',
        'Explorar oportunidades de expansão'
      ]
    }
    return [
      'Acompanhamento próximo',
      'Identificar necessidades específicas',
      'Reforçar valor entregue'
    ]
  }

  private getDefaultRiscos(npsScore: number): string[] {
    if (npsScore <= 4) {
      return [
        'Alto risco de churn',
        'Possível feedback negativo público',
        'Impacto na reputação'
      ]
    }
    return [
      'Potencial estagnação',
      'Concorrência pode atrair',
      'Expectativas crescentes'
    ]
  }

  private getDefaultOportunidades(npsScore: number): string[] {
    if (npsScore >= 8) {
      return [
        'Case de sucesso',
        'Referral para novos clientes',
        'Upsell de serviços adicionais'
      ]
    }
    return [
      'Melhoria na experiência',
      'Personalização do serviço',
      'Maior engajamento'
    ]
  }

  private getDefaultAcoes(npsScore: number): string[] {
    if (npsScore <= 4) {
      return [
        'Ligar em 24h',
        'Agendar reunião 1:1',
        'Criar plano de ação'
      ]
    }
    return [
      'Follow-up em 1 semana',
      'Documentar feedback',
      'Monitorar evolução'
    ]
  }

  private intelligentFallback(respostas: Record<string, any>): FormAnalysisResult {
    const npsScore = parseInt(respostas.nota_nps || respostas.nps) || 5
    
    return {
      emocao: this.inferEmocao(npsScore),
      indicacoes: this.getDefaultIndicacoes(npsScore),
      riscos: this.getDefaultRiscos(npsScore),
      persona: this.inferPersona(npsScore, respostas),
      oportunidades: this.getDefaultOportunidades(npsScore),
      situacao_geral: `Análise baseada em NPS ${npsScore} (Gemma3 indisponível)`,
      nivel_satisfacao: this.inferSatisfacao(npsScore),
      probabilidade_churn: this.inferChurn(npsScore),
      acoes_imediatas: this.getDefaultAcoes(npsScore)
    }
  }
}

export const gemmaFormsAnalyzer = new GemmaFormsAnalyzer()