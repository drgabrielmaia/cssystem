/**
 * 🤖 Serviço de integração com Gemma3:1b
 * Responsável por comunicação inteligente e tratamento de erros
 */

interface GemmaResponse {
  success: boolean
  content: string
  error?: string
}

interface APIError {
  field: string
  message: string
  suggestedAction: string
}

export const gemmaService = {
  /**
   * Consulta geral para Customer Success
   */
  async customerSuccessQuery(prompt: string): Promise<GemmaResponse> {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemma3:1b',
          prompt: `Você é um assistente especializado em Customer Success. Responda de forma útil, prática e direta.

${prompt}

Resposta:`,
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const data = await response.json()

      return {
        success: true,
        content: data.response || 'Resposta vazia'
      }
    } catch (error) {
      console.error('Erro no Gemma3:1b:', error)
      return {
        success: false,
        content: '',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  },

  /**
   * Análise de dados do cliente
   */
  async analyzeCustomerData(data: any): Promise<GemmaResponse> {
    const prompt = `Como especialista em Customer Success, analise estes dados e forneça insights valiosos:

${JSON.stringify(data, null, 2)}

Forneça uma análise completa incluindo:
- Resumo da situação
- Pontos de atenção
- Oportunidades
- Recomendações práticas

Use emojis e formatação markdown para clareza.`

    return this.customerSuccessQuery(prompt)
  },

  /**
   * Tratamento inteligente de erros de API
   */
  async handleAPIError(error: any, context: string, userInput: string): Promise<string> {
    const errorAnalysis = this.analyzeError(error)

    const prompt = `Um usuário tentou fazer: "${userInput}"

Contexto: ${context}

Erro encontrado: ${JSON.stringify(errorAnalysis, null, 2)}

Como assistente inteligente, responda de forma amigável e útil:
1. Explique o que deu errado de forma simples
2. Peça as informações que faltam de forma natural
3. Dê um exemplo prático de como o usuário deve tentar novamente

Seja conversacional e não técnico.`

    const response = await this.customerSuccessQuery(prompt)

    if (response.success) {
      return response.content
    }

    // Fallback se IA falhar
    return this.generateFallbackErrorMessage(errorAnalysis, userInput)
  },

  /**
   * Processamento inteligente de comandos
   */
  async processSmartCommand(userInput: string, availableAPIs: string[]): Promise<{
    suggestedAPI: string
    parameters: Record<string, any>
    confidenceLevel: number
    needsMoreInfo: boolean
    missingFields: string[]
  }> {
    const prompt = `Analise este comando do usuário e determine qual API usar:

Comando: "${userInput}"

APIs disponíveis:
${availableAPIs.map(api => `- ${api}`).join('\n')}

Analise e responda APENAS com JSON válido no formato:
{
  "suggestedAPI": "nome_da_api",
  "parameters": {"param1": "valor1"},
  "confidenceLevel": 0.9,
  "needsMoreInfo": false,
  "missingFields": ["campo1", "campo2"]
}

Exemplos:
- "Adicione mentorado João" → needsMoreInfo: true, missingFields: ["email"]
- "João Silva deve 5000 de outubro" → needsMoreInfo: false, parameters: {"nome": "João Silva", "valor": 5000, "mes": "outubro"}`

    try {
      const response = await this.customerSuccessQuery(prompt)

      if (response.success) {
        // Tentar extrair JSON da resposta
        const jsonMatch = response.content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        }
      }
    } catch (error) {
      console.error('Erro ao processar comando:', error)
    }

    // Fallback: análise simples
    return this.fallbackCommandAnalysis(userInput, availableAPIs)
  },

  /**
   * Validação inteligente de dados
   */
  async validateData(data: any, dataType: string): Promise<{
    isValid: boolean
    errors: APIError[]
    suggestions: string[]
  }> {
    const prompt = `Valide estes dados para ${dataType}:

${JSON.stringify(data, null, 2)}

Responda APENAS com JSON válido:
{
  "isValid": false,
  "errors": [
    {
      "field": "nome",
      "message": "Nome é obrigatório",
      "suggestedAction": "Poderia me informar o nome completo?"
    }
  ],
  "suggestions": ["Adicione um email válido", "Verifique o formato do telefone"]
}`

    try {
      const response = await this.customerSuccessQuery(prompt)

      if (response.success) {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        }
      }
    } catch (error) {
      console.error('Erro na validação:', error)
    }

    // Fallback
    return this.fallbackValidation(data, dataType)
  },

  /**
   * Análise de erros
   */
  analyzeError(error: any): APIError[] {
    const errors: APIError[] = []

    if (error?.message?.includes('nome_completo')) {
      errors.push({
        field: 'nome_completo',
        message: 'Nome é obrigatório',
        suggestedAction: 'Poderia me informar o nome completo da pessoa?'
      })
    }

    if (error?.message?.includes('email')) {
      errors.push({
        field: 'email',
        message: 'Email é obrigatório ou inválido',
        suggestedAction: 'Preciso de um email válido (exemplo: usuario@email.com)'
      })
    }

    if (error?.message?.includes('valor') || error?.message?.includes('null')) {
      errors.push({
        field: 'valor',
        message: 'Valor é obrigatório',
        suggestedAction: 'Qual é o valor em reais? (ex: 5000)'
      })
    }

    if (errors.length === 0) {
      errors.push({
        field: 'unknown',
        message: 'Erro desconhecido',
        suggestedAction: 'Tente novamente ou forneça mais detalhes'
      })
    }

    return errors
  },

  /**
   * Mensagem de erro fallback
   */
  generateFallbackErrorMessage(errors: APIError[], userInput: string): string {
    if (errors.length === 1) {
      return `${errors[0].suggestedAction}`
    }

    let message = "Preciso de algumas informações adicionais:\n\n"
    errors.forEach((error, index) => {
      message += `${index + 1}. ${error.suggestedAction}\n`
    })

    return message + `\nTente algo como: "Cadastrar João Silva, email joao@email.com, turma 2024-1"`
  },

  /**
   * Análise de comando fallback
   */
  fallbackCommandAnalysis(userInput: string, availableAPIs: string[]) {
    const input = userInput.toLowerCase()

    if (input.includes('mentorado') || input.includes('aluno')) {
      if (input.includes('cadastrar') || input.includes('adicionar')) {
        return {
          suggestedAPI: 'add_mentorado',
          parameters: {},
          confidenceLevel: 0.7,
          needsMoreInfo: true,
          missingFields: ['nome_completo', 'email']
        }
      } else if (input.includes('listar') || input.includes('todos')) {
        return {
          suggestedAPI: 'list_mentorados',
          parameters: {},
          confidenceLevel: 0.8,
          needsMoreInfo: false,
          missingFields: []
        }
      }
    }

    return {
      suggestedAPI: 'general_query',
      parameters: {},
      confidenceLevel: 0.5,
      needsMoreInfo: false,
      missingFields: []
    }
  },

  /**
   * Validação fallback
   */
  fallbackValidation(data: any, dataType: string) {
    const errors: APIError[] = []

    if (dataType === 'mentorado') {
      if (!data.nome_completo) {
        errors.push({
          field: 'nome_completo',
          message: 'Nome é obrigatório',
          suggestedAction: 'Poderia me informar o nome completo?'
        })
      }

      if (!data.email) {
        errors.push({
          field: 'email',
          message: 'Email é obrigatório',
          suggestedAction: 'Preciso de um email válido'
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions: errors.map(e => e.suggestedAction)
    }
  }
}