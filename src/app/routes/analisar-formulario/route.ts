import { NextRequest, NextResponse } from 'next/server'

async function analisarComGemma(tipoFormulario: string, resposta: any, mentoradoNome?: string): Promise<any> {
  try {
    const contexto = `Você é um especialista em Customer Success e análise de satisfação do cliente.

INSTRUÇÃO FUNDAMENTAL: Analise o TOM e CONTEXTO da resposta antes de tudo.

Exemplos de contextos POSITIVOS que indicam ALTA satisfação:
- Expressões como "faturei meio milhão", "vale muito a pena", "merece 10000", "é excelente"
- Tom de brincadeira indicando que o resultado foi ALÉM das expectativas
- Mensagens irônicas ou exageradas que demonstram entusiasmo
- Frases como "nada a melhorar" quando combinadas com elogios

ATENÇÃO: Se a resposta demonstra RESULTADOS CONCRETOS POSITIVOS (ex: faturamento, crescimento), a satisfação deve ser ALTA (8-10).

Analise a seguinte resposta de formulário:

Formulário: ${tipoFormulario}
${mentoradoNome ? `Mentorado: ${mentoradoNome}` : ''}
Resposta: ${JSON.stringify(resposta, null, 2)}

Forneça:
1. Nível de satisfação REAL baseado no TOM da resposta (0-10)
2. Pontos de melhoria (apenas se realmente necessários)
3. Recomendações específicas e relevantes
4. Resumo que reflita o VERDADEIRO sentimento do cliente

IMPORTANTE: Responda APENAS em formato JSON válido completo, sem markdown, sem explicações extras.

EXEMPLO de resposta correta:
{
  "satisfacao": 8,
  "pontos_melhoria": ["Melhorar comunicação"],
  "recomendacoes": ["Fazer follow-up"],
  "resumo": "Cliente satisfeito"
}

Agora analise e retorne SOMENTE o JSON:`

    console.log('🤖 Enviando para Gemma3:1b...')

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        model: 'gemma3:1b',
        prompt: contexto,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9
      }
      })
    })

    if (!response.ok) {
      throw new Error(`Erro na API do Ollama: ${response.status}`)
    }

    const data = await response.json()
    console.log('📝 Resposta bruta do Gemma:', data.response)

    // Tentar extrair JSON da resposta
    let analise
    try {
      // Remove markdown e outros caracteres
      const cleanResponse = data.response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()

      analise = JSON.parse(cleanResponse)

      // VALIDAÇÃO INTELIGENTE: Verificar se a análise da IA faz sentido
      const respostaStr = JSON.stringify(resposta).toLowerCase()

      // Palavras-chave MUITO POSITIVAS que indicam satisfação 9-10
      const muitoPositivo = [
        'faturei', 'milhão', 'vale muito a pena', 'merece 10', 'excelente',
        'perfeito', 'incrível', 'fantástico', 'superou expectativas', 'além das expectativas',
        '10000', 'meio milhão'
      ]

      // Se detectar palavras muito positivas mas IA deu nota baixa, corrigir
      if (muitoPositivo.some(palavra => respostaStr.includes(palavra)) && analise.satisfacao < 9) {
        console.log('🔧 Corrigindo análise da IA - detectado feedback extremamente positivo')
        analise.satisfacao = 10
        analise.pontos_melhoria = ['Cliente extremamente satisfeito - manter o excelente trabalho']
        analise.recomendacoes = [
          'Solicitar depoimento detalhado para case de sucesso',
          'Usar como referência para outros clientes',
          'Manter o acompanhamento para garantir continuidade dos resultados'
        ]
        analise.resumo = 'Cliente demonstra altíssima satisfação com resultados excepcionais. Excelente case de sucesso!'
      }

    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError)
      console.log('📝 Resposta original para debug:', data.response)

      // Fallback: análise inteligente baseada em palavras-chave e contexto
      const respostaStr = JSON.stringify(resposta).toLowerCase()
      let satisfacao = 5

      // Palavras-chave MUITO POSITIVAS (9-10)
      const muitoPositivo = [
        'faturei', 'milhão', 'vale muito a pena', 'merece 10', 'excelente',
        'perfeito', 'incrível', 'fantástico', 'superou expectativas', 'além das expectativas'
      ]

      // Palavras-chave POSITIVAS (7-8)
      const positivo = [
        'muito bom', 'ótimo', 'bom resultado', 'satisfeito', 'recomendo',
        'ajudou muito', 'valeu a pena', 'funcionou bem'
      ]

      // Palavras-chave NEGATIVAS (1-4)
      const negativo = [
        'ruim', 'péssimo', 'não funcionou', 'insatisfeito', 'decepção',
        'não recomendo', 'perda de tempo', 'não valeu'
      ]

      if (muitoPositivo.some(palavra => respostaStr.includes(palavra))) {
        satisfacao = 9
      } else if (positivo.some(palavra => respostaStr.includes(palavra))) {
        satisfacao = 7
      } else if (negativo.some(palavra => respostaStr.includes(palavra))) {
        satisfacao = 3
      }

      // Detectar tom irônico/brincalhão que indica alta satisfação
      if (respostaStr.includes('nada') && (respostaStr.includes('brincadeira') || respostaStr.includes('10000'))) {
        satisfacao = 10
      }

      // Gerar análise contextual baseada na satisfação detectada
      let pontosMelhoria, recomendacoes, resumo

      if (satisfacao >= 9) {
        pontosMelhoria = ['Cliente extremamente satisfeito - manter o excelente trabalho']
        recomendacoes = [
          'Solicitar depoimento detalhado para case de sucesso',
          'Usar como referência para outros clientes',
          'Manter o acompanhamento para garantir continuidade dos resultados'
        ]
        resumo = 'Cliente demonstra altíssima satisfação com resultados excepcionais. Excelente case de sucesso!'
      } else if (satisfacao >= 7) {
        pontosMelhoria = ['Cliente satisfeito - identificar oportunidades de melhoria pontuais']
        recomendacoes = [
          'Realizar follow-up para identificar melhorias específicas',
          'Capitalizar sobre os pontos positivos mencionados'
        ]
        resumo = 'Cliente satisfeito com bons resultados. Oportunidade para aprimoramento contínuo.'
      } else if (satisfacao <= 4) {
        pontosMelhoria = ['Identificar causas específicas da insatisfação', 'Revisar processo e expectativas']
        recomendacoes = [
          'Agendar reunião para entender melhor os problemas',
          'Implementar plano de recuperação da satisfação'
        ]
        resumo = 'Cliente demonstra insatisfação. Ação imediata necessária para recuperar a relação.'
      } else {
        pontosMelhoria = ['Análise detalhada recomendada para melhor compreensão']
        recomendacoes = ['Consultar especialista para análise mais profunda']
        resumo = 'Análise automática realizada. Recomendada revisão manual para insights adicionais.'
      }

      analise = { satisfacao, pontos_melhoria: pontosMelhoria, recomendacoes, resumo }
    }

    // Validar estrutura da análise
    if (!analise.satisfacao || !Array.isArray(analise.pontos_melhoria) || !Array.isArray(analise.recomendacoes)) {
      throw new Error('Estrutura de análise inválida')
    }

    // Garantir que satisfação está entre 0-10
    analise.satisfacao = Math.max(0, Math.min(10, parseInt(analise.satisfacao) || 5))

    return analise

  } catch (error) {
    console.error('Erro na análise com Gemma:', error)

    // Análise de fallback
    return {
      satisfacao: 5,
      pontos_melhoria: ['Erro na análise automática - revisar manualmente'],
      recomendacoes: ['Verificar resposta e fazer análise manual'],
      resumo: 'Análise não pôde ser completada automaticamente'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tipo_formulario, resposta, mentorado_nome } = await request.json()

    if (!tipo_formulario || !resposta) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: tipo_formulario e resposta' },
        { status: 400 }
      )
    }

    console.log('🔍 Analisando formulário:', tipo_formulario)

    const analise = await analisarComGemma(tipo_formulario, resposta, mentorado_nome)

    return NextResponse.json({
      success: true,
      analise
    })

  } catch (error) {
    console.error('Erro na API de análise:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        analise: {
          satisfacao: 5,
          pontos_melhoria: ['Erro no sistema de análise'],
          recomendacoes: ['Tentar novamente ou fazer análise manual'],
          resumo: 'Análise não disponível devido a erro técnico'
        }
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API de análise de formulários está funcionando',
    timestamp: new Date().toISOString()
  })
}