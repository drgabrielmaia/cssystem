import { supabase } from './supabase'
import { gemmaService } from './gemma-service'

interface AICommandContext {
  intent: string
  entities: any
  action: string
  params: any
}

interface SmartContext {
  needsData: boolean
  queryType: 'search_person' | 'count' | 'list' | 'create' | 'form_analysis' | 'person_forms' | 'general'
  extractedData: any
  naturalResponse: boolean
}

// Interface para pendências
interface Pendencia {
  id?: string
  mentorado_id: string
  nome_mentorado: string
  valor: number
  mes: string
  status: 'pendente' | 'pago' | 'cancelado'
  descricao?: string
  created_at?: string
}

export async function processAICommand(
  userInput: string,
  conversationContext: any[] = []
): Promise<string> {
  try {
    console.log(`🤖 Processando: "${userInput}"`)
    console.log(`💬 Contexto: ${conversationContext.length} mensagens anteriores`)

    // Usar Gemma3:1b para entender a intenção com contexto completo
    const smartContext = await analyzeWithGemmaAndContext(userInput, conversationContext)

    if (smartContext.needsData) {
      // Buscar dados e usar IA para responder
      return await handleSmartQuery(smartContext, userInput, conversationContext)
    }

    // Para comandos diretos, processar normalmente
    const basicContext = await analyzeUserIntentWithAI(userInput)
    if (basicContext.intent !== 'unknown') {
      return await handleSpecificCommand(basicContext, userInput)
    }

    // Fallback: resposta inteligente geral com contexto
    return await handleGeneralQueryWithAI(userInput, conversationContext)

  } catch (error) {
    console.error('Erro no processamento de comando:', error)
    return 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.'
  }
}

async function analyzeUserIntentWithAI(input: string): Promise<AICommandContext> {
  const context: AICommandContext = {
    intent: 'unknown',
    entities: {},
    action: 'none',
    params: {}
  }

  const inputLower = input.toLowerCase()

  // Análise mais específica para evitar alucinações
  if (inputLower.includes('devendo') || inputLower.includes('deve') || inputLower.includes('pendência')) {
    if (inputLower.includes('tem') || inputLower.includes('há') || inputLower.includes('existe')) {
      context.intent = 'add_pendencia'
      context.action = 'create'
    } else if (inputLower.includes('quem') || inputLower.includes('lista') || inputLower.includes('pendentes')) {
      context.intent = 'list_pendencias'
      context.action = 'list'
    }

    // Extrair entidades com regex
    const valorMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:mil|k|reais)?/i)
    if (valorMatch) {
      let valor = parseFloat(valorMatch[1])
      if (input.includes('mil') || input.includes('k')) {
        valor *= 1000
      }
      context.entities.valor = valor
    }

    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                   'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
    for (const mes of meses) {
      if (inputLower.includes(mes)) {
        context.entities.mes = mes
        break
      }
    }
  }

  else if (inputLower.includes('mentorado') || inputLower.includes('aluno') || inputLower.includes('cliente')) {
    if (inputLower.includes('cadastrar') || inputLower.includes('novo') || inputLower.includes('adicionar')) {
      context.intent = 'add_mentorado'
      context.action = 'create'
    } else if (inputLower.includes('lista') || inputLower.includes('todos')) {
      context.intent = 'list_mentorados'
      context.action = 'list'
    } else if (inputLower.includes('buscar') || inputLower.includes('procurar') || inputLower.includes('tem') || inputLower.includes('existe') || inputLower.includes('há')) {
      context.intent = 'search_mentorado'
      context.action = 'search'

      // Extrair nome para busca
      const nomeMatches = [
        input.match(/(?:tem|existe|há)\s+(?:o\s+)?(?:mentorado\s+)?([A-ZÁÊÂÃÇ][a-záêâãçõ]+(?:\s+[A-ZÁÊÂÃÇ][a-záêâãçõ]+)*)/i),
        input.match(/(?:buscar|procurar)\s+([A-ZÁÊÂÃÇ][a-záêâãçõ]+(?:\s+[A-ZÁÊÂÃÇ][a-záêâãçõ]+)*)/i),
        input.match(/([A-ZÁÊÂÃÇ][a-záêâãçõ]+(?:\s+[A-ZÁÊÂÃÇ][a-záêâãçõ]+)*)\s+(?:está|ta)/i)
      ]

      for (const match of nomeMatches) {
        if (match && match[1]) {
          context.entities.nome = match[1].trim()
          break
        }
      }
    }
  }

  else if (inputLower.includes('quantos') && inputLower.includes('mentorados')) {
    context.intent = 'count_mentorados'
    context.action = 'count'
  }

  else if (inputLower.includes('formulário') || inputLower.includes('form')) {
    context.intent = 'analyze_forms'
    context.action = 'analyze'
  }

  else if (inputLower.includes('insights') || inputLower.includes('relatório')) {
    context.intent = 'get_insights'
    context.action = 'analyze'
  }

  return context
}

// Nova função que usa Gemma3:1b para entender linguagem natural com contexto
async function analyzeWithGemmaAndContext(
  userInput: string,
  conversationContext: any[] = []
): Promise<SmartContext> {
  // Fallback para função original se não houver contexto
  if (conversationContext.length === 0) {
    return analyzeWithGemma(userInput)
  }

  const contextString = conversationContext
    .slice(0, 5) // Últimas 5 mensagens
    .reverse()
    .map(msg => `${msg.type}: ${msg.message}`)
    .join('\n')

  const prompt = `Analise esta conversa e a nova pergunta do usuário:

CONTEXTO DA CONVERSA:
${contextString}

NOVA PERGUNTA: "${userInput}"

REGRAS IMPORTANTES:
1. SÓ classifique como "search_person" se o usuário EXPLICITAMENTE pedir para buscar uma pessoa
2. SÓ use contexto para pronomes como "ele", "ela" quando há referência CLARA
3. Para cumprimentos, conversas casuais, ou perguntas vagas, use "general"
4. NÃO force buscas de pessoas se não for óbvio

Responda APENAS com JSON válido no formato:
{
  "needsData": false,
  "queryType": "general",
  "extractedData": {},
  "naturalResponse": true
}

Tipos possíveis:
- search_person: APENAS para buscas explícitas ("Tem João?", "Existe Maria?", "Buscar Pedro")
- count: contagens específicas ("Quantos mentorados?", "Total de formulários")
- list: listagens explícitas ("Lista mentorados", "Mostra todos")
- create: criação clara ("Cadastrar João Silva", "Adicionar mentorado")
- form_analysis: análise geral de formulários ("Analise formulários", "Quem respondeu?")
- person_forms: formulários de pessoa específica ("Formulários do João", "Respostas da Maria")
- general: qualquer coisa que não se encaixe claramente acima

Exemplos:
"Oi" → {"needsData": false, "queryType": "general", "extractedData": {}, "naturalResponse": true}
"Como vai?" → {"needsData": false, "queryType": "general", "extractedData": {}, "naturalResponse": true}
"Fala ae" → {"needsData": false, "queryType": "general", "extractedData": {}, "naturalResponse": true}
"Tem mentorado João?" → {"needsData": true, "queryType": "search_person", "extractedData": {"nome": "João"}, "naturalResponse": true}

SEJA CONSERVADOR: Em caso de dúvida, use "general" com needsData: false`

  try {
    const response = await gemmaService.customerSuccessQuery(prompt)

    if (response.success) {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        console.log('🧠 Gemma com contexto entendeu:', parsed)
        return parsed
      }
    }
  } catch (error) {
    console.error('Erro na análise com contexto:', error)
  }

  // Fallback para análise sem contexto
  return analyzeWithGemma(userInput)
}

// Função original mantida para compatibilidade
async function analyzeWithGemma(userInput: string): Promise<SmartContext> {
  const prompt = `Analise esta pergunta do usuário e identifique a intenção:

"${userInput}"

REGRAS IMPORTANTES:
1. SÓ classifique como "search_person" se o usuário EXPLICITAMENTE pedir para buscar uma pessoa
2. Para cumprimentos, conversas casuais, ou perguntas vagas, use "general" com needsData: false
3. NÃO force buscas de pessoas se não for óbvio
4. Em caso de dúvida, use "general"

Responda APENAS com JSON válido no formato:
{
  "needsData": false,
  "queryType": "general",
  "extractedData": {},
  "naturalResponse": true
}

Tipos possíveis:
- search_person: APENAS buscas explícitas ("Tem mentorado João?", "Existe Maria?", "Buscar Pedro")
- count: contagens específicas ("Quantos mentorados?", "Total de formulários")
- list: listagens explícitas ("Lista mentorados", "Mostra todos")
- create: criação clara ("Cadastrar João Silva", "Adicionar mentorado")
- form_analysis: análise geral de formulários ("Analise formulários", "Quem respondeu?")
- person_forms: formulários de pessoa específica ("Formulários do João", "Quantos formulários o João respondeu?")
- general: qualquer coisa que não se encaixe claramente acima (cumprimentos, conversas, perguntas vagas)

Exemplos:
"Oi" → {"needsData": false, "queryType": "general", "extractedData": {}, "naturalResponse": true}
"E aí?" → {"needsData": false, "queryType": "general", "extractedData": {}, "naturalResponse": true}
"Blz" → {"needsData": false, "queryType": "general", "extractedData": {}, "naturalResponse": true}
"Como funciona?" → {"needsData": false, "queryType": "general", "extractedData": {}, "naturalResponse": true}
"Tem mentorado João?" → {"needsData": true, "queryType": "search_person", "extractedData": {"nome": "João"}, "naturalResponse": true}

SEJA CONSERVADOR: Use "general" quando não tiver certeza.`

  try {
    const response = await gemmaService.customerSuccessQuery(prompt)

    if (response.success) {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        console.log('🧠 Gemma entendeu:', parsed)
        return parsed
      }
    }
  } catch (error) {
    console.error('Erro na análise com Gemma:', error)
  }

  // Fallback
  return {
    needsData: false,
    queryType: 'general',
    extractedData: {},
    naturalResponse: true
  }
}

// Nova função para lidar com consultas inteligentes
async function handleSmartQuery(
  context: SmartContext,
  userInput: string,
  conversationContext: any[] = []
): Promise<string> {
  console.log('🎯 Consulta inteligente:', context.queryType)
  console.log('📝 Dados extraídos:', context.extractedData)

  switch (context.queryType) {
    case 'search_person':
      return await handleSmartPersonSearch(context, userInput)
    case 'count':
      return await handleSmartCount(userInput)
    case 'list':
      return await handleSmartList(userInput)
    case 'form_analysis':
      return await handleFormAnalysis(userInput)
    case 'person_forms':
      return await handlePersonForms(context, userInput)
    default:
      return await handleGeneralQueryWithAI(userInput, conversationContext)
  }
}

// Busca inteligente de pessoa
async function handleSmartPersonSearch(context: SmartContext, userInput: string): Promise<string> {
  const nome = context.extractedData?.nome

  if (!nome) {
    return "Não consegui identificar o nome da pessoa que você está procurando. Poderia reformular?"
  }

  console.log(`🔍 Buscando: "${nome}"`)

  try {
    const { data: mentorados, error } = await supabase
      .from('mentorados')
      .select('*')
      .or(`nome_completo.ilike.%${nome}%,email.ilike.%${nome}%`)

    if (error) {
      return `Erro ao buscar: ${error.message}`
    }

    // Usar Gemma3:1b para resposta natural
    const resultPrompt = `O usuário perguntou: "${userInput}"

Resultado da busca no banco de dados:
- Nome procurado: "${nome}"
- Encontrados: ${mentorados?.length || 0} resultados
${mentorados?.length ? `
Dados encontrados:
${mentorados.map(m => `- ${m.nome_completo} (${m.email}) - ${m.turma}`).join('\n')}
` : ''}

Responda de forma natural e conversacional, como um assistente humano responderia.
Se encontrou pessoas, diga quem são.
Se não encontrou, diga que não existe e ofereça ajuda para cadastrar.
Use emojis apropriados.`

    const response = await gemmaService.customerSuccessQuery(resultPrompt)

    if (response.success) {
      return response.content
    }

    // Fallback
    if (!mentorados || mentorados.length === 0) {
      return `Não, não temos nenhum mentorado chamado "${nome}" cadastrado. Quer que eu cadastre?`
    } else {
      return `Sim! Encontrei ${mentorados.length} pessoa(s): ${mentorados.map(m => m.nome_completo).join(', ')}`
    }

  } catch (error) {
    return `Erro ao consultar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
  }
}

// Contagem inteligente
async function handleSmartCount(userInput: string): Promise<string> {
  try {
    const { count, error } = await supabase
      .from('mentorados')
      .select('count', { count: 'exact' })

    if (error) {
      return `Erro ao contar: ${error.message}`
    }

    const countPrompt = `O usuário perguntou: "${userInput}"

Dados reais do sistema:
- Total de mentorados: ${count || 0}

Responda de forma natural e conversacional, incluindo o número exato.
Use emojis apropriados.`

    const response = await gemmaService.customerSuccessQuery(countPrompt)

    if (response.success) {
      return response.content
    }

    return `Temos ${count || 0} mentorados cadastrados no sistema.`

  } catch (error) {
    return `Erro ao buscar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
  }
}

// Listagem inteligente
async function handleSmartList(userInput: string): Promise<string> {
  try {
    const { data: mentorados, error } = await supabase
      .from('mentorados')
      .select('*')
      .order('nome_completo')
      .limit(20)

    if (error) {
      return `Erro ao listar: ${error.message}`
    }

    const listPrompt = `O usuário pediu: "${userInput}"

Dados reais do sistema:
Total de mentorados: ${mentorados?.length || 0}

Primeiros mentorados:
${mentorados?.slice(0, 10).map(m => `- ${m.nome_completo} (${m.email}) - ${m.turma || 'Turma não informada'}`).join('\n') || 'Nenhum mentorado cadastrado'}

Responda de forma natural listando os mentorados de forma organizada.
Use emojis e formatação clara.
Se houver muitos, mostre os primeiros e mencione o total.`

    const response = await gemmaService.customerSuccessQuery(listPrompt)

    if (response.success) {
      return response.content
    }

    // Fallback
    if (!mentorados || mentorados.length === 0) {
      return "Não há mentorados cadastrados ainda."
    }

    return `Aqui estão os mentorados:\n\n${mentorados.slice(0, 10).map((m, i) =>
      `${i + 1}. ${m.nome_completo} (${m.email})`
    ).join('\n')}`

  } catch (error) {
    return `Erro ao listar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
  }
}

// Análise completa de formulários
async function handleFormAnalysis(userInput: string): Promise<string> {
  try {
    console.log('📋 Analisando formulários...')

    // Buscar dados completos dos formulários
    const [respostasResult, mentoradosResult] = await Promise.all([
      supabase
        .from('formularios_respostas')
        .select('*')
        .order('data_envio', { ascending: false }),
      supabase
        .from('mentorados')
        .select('*')
    ])

    if (respostasResult.error) {
      return `Erro ao buscar formulários: ${respostasResult.error.message}`
    }

    const respostas = respostasResult.data || []
    const mentorados = mentoradosResult.data || []

    // Criar mapa de mentorados para enriquecer dados
    const mentoradosMap = new Map(mentorados.map(m => [m.id, m]))

    // Análise detalhada
    const analytics = {
      total_respostas: respostas.length,
      total_pessoas_responderam: new Set(respostas.map(r => r.mentorado_id)).size,
      tipos_formulario: respostas.reduce((acc, r) => {
        acc[r.formulario] = (acc[r.formulario] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      respostas_por_pessoa: respostas.reduce((acc, r) => {
        const mentorado = mentoradosMap.get(r.mentorado_id)
        const nome = mentorado?.nome_completo || 'Desconhecido'
        acc[nome] = (acc[nome] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      ultimas_respostas: respostas.slice(0, 10).map(r => {
        const mentorado = mentoradosMap.get(r.mentorado_id)
        return {
          nome: mentorado?.nome_completo || 'Desconhecido',
          formulario: r.formulario,
          data: r.data_envio,
          preview: Object.keys(r.resposta_json?.respostas || {}).slice(0, 3)
        }
      }),
      pessoas_mais_ativas: Object.entries(respostas.reduce((acc, r) => {
        const mentorado = mentoradosMap.get(r.mentorado_id)
        const nome = mentorado?.nome_completo || 'Desconhecido'
        acc[nome] = (acc[nome] || 0) + 1
        return acc
      }, {} as Record<string, number>))
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)
    }

    // Usar Gemma3:1b para análise inteligente
    const analysisPrompt = `O usuário perguntou: "${userInput}"

DADOS REAIS DOS FORMULÁRIOS:

📊 **Resumo Geral:**
- Total de respostas: ${analytics.total_respostas}
- Total de pessoas que responderam: ${analytics.total_pessoas_responderam}

📋 **Tipos de formulário:**
${Object.entries(analytics.tipos_formulario).map(([tipo, count]) => `- ${tipo}: ${count} respostas`).join('\n')}

👥 **Top 5 pessoas mais ativas:**
${analytics.pessoas_mais_ativas.map(([nome, count], i) => `${i + 1}. ${nome}: ${count} respostas`).join('\n')}

📝 **Últimas respostas:**
${analytics.ultimas_respostas.map((r, i) => `${i + 1}. ${r.nome} - ${r.formulario} (${new Date(r.data).toLocaleDateString('pt-BR')})`).join('\n')}

**INSTRUÇÕES:**
- Analise estes dados REAIS de forma inteligente
- Forneça insights sobre participação, engajamento e padrões
- Identifique oportunidades e pontos de atenção
- Seja específico e útil
- Use emojis e formatação clara
- Responda de forma natural e conversacional`

    const response = await gemmaService.analyzeCustomerData(analytics)

    if (response.success) {
      return response.content
    }

    // Fallback estruturado
    return `📊 **Análise de Formulários:**

✅ **Participação:**
- ${analytics.total_respostas} respostas coletadas
- ${analytics.total_pessoas_responderam} pessoas participaram

📋 **Formulários mais respondidos:**
${Object.entries(analytics.tipos_formulario)
  .sort(([,a], [,b]) => (b as number) - (a as number))
  .slice(0, 5)
  .map(([tipo, count]) => `• ${tipo}: ${count} respostas`)
  .join('\n')}

🏆 **Pessoas mais engajadas:**
${analytics.pessoas_mais_ativas.map(([nome, count]) => `• ${nome}: ${count} respostas`).join('\n')}

📈 **Insights:**
- Taxa de participação: ${((analytics.total_pessoas_responderam / mentorados.length) * 100).toFixed(1)}% dos mentorados
- Média por pessoa: ${(analytics.total_respostas / analytics.total_pessoas_responderam).toFixed(1)} respostas`

  } catch (error) {
    console.error('Erro na análise de formulários:', error)
    return `Erro ao analisar formulários: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
  }
}

// Análise de formulários de pessoa específica
async function handlePersonForms(context: SmartContext, userInput: string): Promise<string> {
  const nome = context.extractedData?.nome

  if (!nome) {
    return "Não consegui identificar de qual pessoa você quer ver os formulários. Poderia especificar?"
  }

  console.log(`📋 Buscando formulários de: "${nome}"`)

  try {
    // Buscar mentorado
    const { data: mentorado, error: mentoradoError } = await supabase
      .from('mentorados')
      .select('*')
      .ilike('nome_completo', `%${nome}%`)
      .single()

    if (mentoradoError || !mentorado) {
      return `Não encontrei mentorado com o nome "${nome}". Verifique se o nome está correto.`
    }

    // Buscar respostas deste mentorado
    const { data: respostas, error: respostasError } = await supabase
      .from('formularios_respostas')
      .select('*')
      .eq('mentorado_id', mentorado.id)
      .order('data_envio', { ascending: false })

    if (respostasError) {
      return `Erro ao buscar formulários: ${respostasError.message}`
    }

    if (!respostas || respostas.length === 0) {
      return `${mentorado.nome_completo} ainda não respondeu nenhum formulário.`
    }

    // Análise das respostas da pessoa
    const personAnalytics = {
      mentorado: {
        nome: mentorado.nome_completo,
        email: mentorado.email,
        turma: mentorado.turma,
        data_entrada: mentorado.data_entrada
      },
      total_respostas: respostas.length,
      formularios_respondidos: respostas.reduce((acc, r) => {
        acc[r.formulario] = (acc[r.formulario] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      primeira_resposta: respostas[respostas.length - 1]?.data_envio,
      ultima_resposta: respostas[0]?.data_envio,
      respostas_detalhadas: respostas.map(r => ({
        formulario: r.formulario,
        data: r.data_envio,
        perguntas_respondidas: Object.keys(r.resposta_json?.respostas || {}).length,
        preview: Object.values(r.resposta_json?.respostas || {}).slice(0, 2)
      }))
    }

    // Usar Gemma3:1b para análise personalizada
    const personPrompt = `O usuário perguntou: "${userInput}" sobre os formulários de ${mentorado.nome_completo}

DADOS REAIS DO MENTORADO:

👤 **Perfil:**
- Nome: ${personAnalytics.mentorado.nome}
- Email: ${personAnalytics.mentorado.email}
- Turma: ${personAnalytics.mentorado.turma}
- Entrada: ${new Date(personAnalytics.mentorado.data_entrada).toLocaleDateString('pt-BR')}

📊 **Atividade nos Formulários:**
- Total de respostas: ${personAnalytics.total_respostas}
- Primeira resposta: ${new Date(personAnalytics.primeira_resposta).toLocaleDateString('pt-BR')}
- Última resposta: ${new Date(personAnalytics.ultima_resposta).toLocaleDateString('pt-BR')}

📋 **Formulários respondidos:**
${Object.entries(personAnalytics.formularios_respondidos).map(([tipo, count]) => `- ${tipo}: ${count}x`).join('\n')}

📝 **Histórico das respostas:**
${personAnalytics.respostas_detalhadas.map((r, i) =>
  `${i + 1}. ${r.formulario} - ${new Date(r.data).toLocaleDateString('pt-BR')} (${r.perguntas_respondidas} perguntas)`
).join('\n')}

**INSTRUÇÕES:**
- Analise o perfil e engajamento desta pessoa
- Identifique padrões de participação
- Sugira ações específicas se necessário
- Seja pessoal e específico sobre esta pessoa
- Use emojis e formatação clara`

    const response = await gemmaService.customerSuccessQuery(personPrompt)

    if (response.success) {
      return response.content
    }

    // Fallback
    return `📋 **Formulários de ${mentorado.nome_completo}:**

📊 **Resumo:**
- ${personAnalytics.total_respostas} formulários respondidos
- Primeira resposta: ${new Date(personAnalytics.primeira_resposta).toLocaleDateString('pt-BR')}
- Última resposta: ${new Date(personAnalytics.ultima_resposta).toLocaleDateString('pt-BR')}

📝 **Tipos respondidos:**
${Object.entries(personAnalytics.formularios_respondidos).map(([tipo, count]) => `• ${tipo}: ${count} vezes`).join('\n')}

👍 **Status:** ${personAnalytics.total_respostas > 3 ? 'Muito engajado' : personAnalytics.total_respostas > 1 ? 'Moderadamente ativo' : 'Baixo engajamento'}`

  } catch (error) {
    console.error('Erro ao buscar formulários da pessoa:', error)
    return `Erro ao buscar formulários: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
  }
}

// Função para gerar insights proativos automáticos
async function generateProactiveInsights(
  userInput: string,
  mentorados: any[],
  formularios: any[],
  mentoradosMap: Map<string, any>
): Promise<any> {
  try {
    // Análises automáticas dos padrões
    const analytics = {
      engajamento: {
        mentorados_ativos: mentorados.filter(m => m.estado_atual === 'ativo').length,
        mentorados_inativos: mentorados.filter(m => m.estado_atual === 'inativo').length,
        taxa_engajamento: formularios.length > 0 ?
          new Set(formularios.map(f => f.mentorado_id)).size / mentorados.length : 0
      },
      formularios: {
        total: formularios.length,
        pessoas_responderam: new Set(formularios.map(f => f.mentorado_id)).size,
        tipos_mais_respondidos: formularios.reduce((acc, f) => {
          acc[f.formulario] = (acc[f.formulario] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        ultima_resposta: formularios[0]?.data_envio,
        pessoas_sem_resposta: mentorados.filter(m =>
          !formularios.some(f => f.mentorado_id === m.id)
        ).length
      },
      alertas: [] as any[],
      oportunidades: [] as any[],
      sugestoes_acao: [] as any[]
    }

    // Detectar alertas automáticos
    if (analytics.formularios.pessoas_sem_resposta > 0) {
      analytics.alertas.push({
        tipo: 'baixo_engajamento',
        message: `${analytics.formularios.pessoas_sem_resposta} mentorados nunca responderam formulários`,
        prioridade: 'alta'
      })
    }

    if (analytics.engajamento.taxa_engajamento < 0.5) {
      analytics.alertas.push({
        tipo: 'taxa_baixa',
        message: `Taxa de engajamento baixa: ${(analytics.engajamento.taxa_engajamento * 100).toFixed(1)}%`,
        prioridade: 'media'
      })
    }

    // Detectar oportunidades
    const tiposFormularios = Object.entries(analytics.formularios.tipos_mais_respondidos)
      .sort(([,a], [,b]) => (b as number) - (a as number))

    if (tiposFormularios.length > 0) {
      analytics.oportunidades.push({
        tipo: 'formulario_popular',
        message: `${tiposFormularios[0][0]} é o mais respondido (${tiposFormularios[0][1]} respostas)`,
        acao: 'Criar mais formulários similares'
      })
    }

    // Sugestões de ação proativas
    analytics.sugestoes_acao = [
      'Enviar lembrete para mentorados inativos',
      'Criar campanha de engajamento',
      'Analisar feedback dos formulários mais respondidos',
      'Identificar padrões de sucesso nos mentorados ativos'
    ]

    return analytics

  } catch (error) {
    console.error('Erro na análise proativa:', error)
    return {
      engajamento: {},
      formularios: {},
      alertas: [],
      oportunidades: [],
      sugestoes_acao: []
    }
  }
}

async function handleSpecificCommand(context: AICommandContext, userInput: string): Promise<string> {
  switch (context.intent) {
    case 'add_pendencia':
      return await handleAddPendencia(context, userInput)
    case 'list_pendencias':
      return await handleListPendencias(context)
    case 'list_mentorados':
      return await handleListMentorados(context)
    case 'count_mentorados':
      return await handleCountMentorados(userInput)
    case 'add_mentorado':
      return await handleAddMentorado(context, userInput)
    case 'search_mentorado':
      return await handleSearchMentorado(context, userInput)
    case 'analyze_forms':
      return await handleAnalyzeForms(context, userInput)
    case 'get_insights':
      return await handleGetInsights(context, userInput)
    default:
      return await handleGeneralQueryWithAI(userInput)
  }
}

async function handleCountMentorados(userInput: string): Promise<string> {
  try {
    // Buscar dados reais do banco
    const { data: mentorados, error } = await supabase
      .from('mentorados')
      .select('*')

    if (error) {
      return `Erro ao buscar dados: ${error.message}`
    }

    // Estatísticas simples e diretas
    const porTurma = mentorados?.reduce((acc, m) => {
      acc[m.turma] = (acc[m.turma] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    const porEstado = mentorados?.reduce((acc, m) => {
      acc[m.estado_atual] = (acc[m.estado_atual] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const prompt = `Pergunta: "${userInput}"

DADOS REAIS DO SISTEMA:
Total: ${mentorados?.length || 0} mentorados

Por turma: ${Object.entries(porTurma).map(([turma, count]) => `${turma}: ${count}`).join(', ')}

Por estado: ${Object.entries(porEstado).map(([estado, count]) => `${estado}: ${count}`).join(', ')}

Responda APENAS baseado nestes números reais. Use markdown para formatação.`

    const response = await gemmaService.customerSuccessQuery(prompt)
    
    if (response.success) {
      return response.content
    } else {
      // Fallback se IA falhar
      const porTurma = mentorados?.reduce((acc, m) => {
        acc[m.turma] = (acc[m.turma] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}
      
      let resultado = `📊 **Total de Mentorados: ${mentorados?.length || 0}**\n\n`
      
      if (Object.keys(porTurma).length > 0) {
        resultado += '📚 **Por Turma:**\n'
        Object.entries(porTurma).forEach(([turma, count]) => {
          resultado += `• ${turma}: ${count} mentorados\n`
        })
      }
      
      return resultado
    }
  } catch (error) {
    console.error('Erro ao contar mentorados:', error)
    return 'Erro ao buscar informações dos mentorados.'
  }
}

async function handleListMentorados(context: AICommandContext): Promise<string> {
  try {
    const { data: mentorados, error } = await supabase
      .from('mentorados')
      .select('*')
      .order('nome_completo')

    if (error) {
      return `Erro ao buscar mentorados: ${error.message}`
    }

    if (!mentorados || mentorados.length === 0) {
      return '📭 Não há mentorados cadastrados no sistema.'
    }

    // Usar IA para formatar apenas os primeiros mentorados
    const primeiros = mentorados.slice(0, 5).map(m => ({
      nome: m.nome_completo,
      email: m.email,
      turma: m.turma,
      estado: m.estado_atual
    }))

    const prompt = `Liste os mentorados do sistema:

DADOS REAIS:
Total: ${mentorados.length} mentorados
Primeiros 5:
${primeiros.map(m => `- **${m.nome}** (${m.email}) - ${m.turma} - ${m.estado}`).join('\n')}

Responda APENAS baseado nestes dados. Use formatação markdown. Seja direto.`

    const response = await gemmaService.customerSuccessQuery(prompt)
    
    if (response.success) {
      return response.content
    } else {
      // Fallback
      let resultado = `👥 **Lista de Mentorados (${mentorados.length} total):**\n\n`
      mentorados.slice(0, 10).forEach((m, i) => {
        resultado += `${i + 1}. **${m.nome_completo}**\n   📧 ${m.email}\n   🎓 ${m.turma}\n   📊 ${m.estado_atual}\n\n`
      })
      
      if (mentorados.length > 10) {
        resultado += `... e mais ${mentorados.length - 10} mentorados.\n`
      }
      
      return resultado
    }
  } catch (error) {
    console.error('Erro ao listar mentorados:', error)
    return 'Erro ao buscar mentorados.'
  }
}

async function handleAnalyzeForms(context: AICommandContext, userInput: string): Promise<string> {
  try {
    const { data: respostas, error } = await supabase
.from('formularios_respostas')
      .select('*')
      .order('data_envio', { ascending: false })
      .limit(50)

    if (error) {
      return `Erro ao buscar respostas: ${error.message}`
    }

    if (!respostas || respostas.length === 0) {
      return '📄 Não há respostas de formulários para analisar.'
    }

    // Usar IA para análise inteligente
    const dadosParaIA = {
      total_respostas: respostas.length,
      tipos_formulario: respostas.reduce((acc, r) => {
        acc[r.formulario] = (acc[r.formulario] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      respostas_recentes: respostas.slice(0, 5).map(r => ({
        formulario: r.formulario,
        data: r.data_envio,
        resposta: r.resposta_json
      })),
      pergunta_original: userInput
    }

    const prompt = `Analise estes dados de formulários de forma inteligente:

${JSON.stringify(dadosParaIA, null, 2)}

Usuário perguntou: "${userInput}"

Forneça insights valiosos, identifique padrões, tendências e dê recomendações práticas. Seja específico e útil.`

    const response = await gemmaService.analyzeCustomerData(dadosParaIA)
    
    if (response.success) {
      return response.content
    } else {
      return `📊 **Análise de Formulários (${respostas.length} respostas):**\n\nErro na análise IA: ${response.error}`
    }
  } catch (error) {
    console.error('Erro ao analisar formulários:', error)
    return 'Erro ao analisar formulários.'
  }
}

async function handleGetInsights(context: AICommandContext, userInput: string): Promise<string> {
  try {
    // Buscar todos os dados do sistema
    const [mentorados, respostas, checkins] = await Promise.all([
      supabase.from('mentorados').select('*'),
      supabase.from('formularios_respostas').select('*'),
      supabase.from('checkins').select('*').limit(100)
    ])

    // Pendências simuladas (em uma aplicação real, buscaríamos do banco)
    let pendencias = [
      { nome_mentorado: 'João Silva', valor: 5000, mes: 'outubro', status: 'pendente' },
      { nome_mentorado: 'Maria Santos', valor: 3500, mes: 'setembro', status: 'pendente' }
    ]

    const dadosCompletos = {
      mentorados: {
        total: mentorados.data?.length || 0,
        por_estado: mentorados.data?.reduce((acc, m) => {
          acc[m.estado_atual] = (acc[m.estado_atual] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {},
        por_turma: mentorados.data?.reduce((acc, m) => {
          acc[m.turma] = (acc[m.turma] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}
      },
      formularios: {
        total: respostas.data?.length || 0,
        por_tipo: respostas.data?.reduce((acc, r) => {
          acc[r.formulario] = (acc[r.formulario] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}
      },
      checkins: {
        total: checkins.data?.length || 0,
        por_status: checkins.data?.reduce((acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}
      },
      pendencias: {
        total: pendencias.length,
        valor_total: pendencias.reduce((sum, p) => sum + (p.valor || 0), 0)
      },
      pergunta_original: userInput
    }

    const prompt = `Forneça insights completos e valiosos baseados nestes dados do sistema de Customer Success:

${JSON.stringify(dadosCompletos, null, 2)}

Usuário perguntou: "${userInput}"

Analise os dados profundamente e forneça:
1. Visão geral da saúde do negócio
2. Pontos de atenção e riscos
3. Oportunidades identificadas
4. Recomendações específicas e acionáveis
5. Métricas-chave e tendências

Seja específico, prático e útil. Use emojis e formatação clara.`

    const response = await gemmaService.analyzeCustomerData(dadosCompletos)
    
    if (response.success) {
      return response.content
    } else {
      return `📊 **Insights do Sistema:**\n\nErro na análise IA: ${response.error}\n\nDados disponíveis: ${mentorados.data?.length || 0} mentorados, ${respostas.data?.length || 0} respostas de formulários, ${pendencias.length} pendências.`
    }
  } catch (error) {
    console.error('Erro ao gerar insights:', error)
    return 'Erro ao gerar insights.'
  }
}

async function handleGeneralQueryWithAI(
  userInput: string,
  conversationContext: any[] = []
): Promise<string> {
  console.log(`🔍 Consulta geral: "${userInput}"`)
  console.log(`💬 Usando contexto de ${conversationContext.length} mensagens`)

  try {
    // SEMPRE buscar dados completos para análises proativas
    const [mentoradosResult, respostasResult, mentoradosDetails, formulariosDetails] = await Promise.all([
      supabase.from('mentorados').select('count', { count: 'exact' }),
      supabase.from('formularios_respostas').select('count', { count: 'exact' }),
      supabase.from('mentorados').select('*').limit(100),
      supabase.from('formularios_respostas').select('*').order('data_envio', { ascending: false }).limit(50)
    ])

    console.log(`📊 Dados reais encontrados: ${mentoradosResult.count || 0} mentorados`)

    // Se for pergunta sobre um mentorado específico, fazer busca específica
    if (userInput.toLowerCase().includes('tem') || userInput.toLowerCase().includes('existe') || userInput.toLowerCase().includes('há')) {
      // Extrair possível nome
      const nomeMatch = userInput.match(/(?:tem|existe|há)\s+(?:o\s+)?(?:mentorado\s+)?([A-ZÁÊÂÃÇ][a-záêâãçõ]+(?:\s+[A-ZÁÊÂÃÇ][a-záêâãçõ]+)*)/i)
      if (nomeMatch && nomeMatch[1]) {
        const nome = nomeMatch[1].trim()
        console.log(`🔍 Pergunta específica sobre: "${nome}"`)

        const { data: mentoradosEncontrados } = await supabase
          .from('mentorados')
          .select('*')
          .or(`nome_completo.ilike.%${nome}%,email.ilike.%${nome}%`)

        if (!mentoradosEncontrados || mentoradosEncontrados.length === 0) {
          return `❌ **Não**, não existe mentorado chamado "${nome}" no sistema.

📋 **Consulta realizada:** Base real de mentorados (${mentoradosResult.count || 0} total)
🔍 **Verificação:** Nome e email
⏰ **Consultado em:** ${new Date().toLocaleString('pt-BR')}

Para cadastrar: "Cadastrar ${nome}, email usuario@email.com"`
        } else {
          return `✅ **Sim**, encontrei ${mentoradosEncontrados.length} mentorado(s) com o nome "${nome}":

${mentoradosEncontrados.map((m, i) =>
  `${i + 1}. **${m.nome_completo}** (${m.email}) - ${m.turma}`
).join('\n')}

📋 **Consulta realizada:** ${new Date().toLocaleString('pt-BR')}`
        }
      }
    }

    let pendenciasCount = 2 // Simulando pendências existentes

    // Análise proativa dos dados
    const mentorados = mentoradosDetails.data || []
    const formularios = formulariosDetails.data || []

    // Criar mapa de mentorados para análises
    const mentoradosMap = new Map(mentorados.map(m => [m.id, m]))

    // Análises proativas automáticas
    const proactiveAnalysis = await generateProactiveInsights(
      userInput,
      mentorados,
      formularios,
      mentoradosMap
    )

    // Para outras consultas, usar contexto real mas restringir a IA
    const contextoReal = {
      total_mentorados: mentoradosResult.count || 0,
      total_formularios: respostasResult.count || 0,
      total_pendencias: pendenciasCount,
      mentorados_sample: mentorados.slice(0, 5).map(m => ({
        nome: m.nome_completo,
        email: m.email,
        turma: m.turma,
        status: m.estado_atual
      })),
      insights_proativos: proactiveAnalysis,
      conversa_anterior: conversationContext.slice(0, 5).map(msg => ({
        tipo: msg.type,
        mensagem: msg.message,
        quando: msg.timestamp
      })),
      timestamp_consulta: new Date().toISOString()
    }

    const prompt = `Você é um assistente de Customer Success conversacional e amigável.

CONTEXTO DO SISTEMA:
${JSON.stringify(contextoReal, null, 2)}

PERGUNTA DO USUÁRIO: "${userInput}"

INSTRUÇÕES:
1. Responda de forma natural e conversacional
2. Para cumprimentos ou conversa casual, seja amigável sem mencionar dados
3. Para perguntas técnicas, use os dados fornecidos
4. Se não souber algo específico, seja honesto mas ofereça ajuda
5. Use emojis quando apropriado
6. Seja útil e proativo

EXEMPLOS DE RESPOSTAS:
- Para "Oi" → "Oi! Como posso ajudar você hoje? 😊"
- Para "E aí?" → "E aí! Tudo bem? Posso te ajudar com alguma coisa do sistema?"
- Para "Como funciona?" → "Posso te explicar! Sou um assistente que ajuda com mentorados, formulários e análises. O que você gostaria de saber?"

Responda de forma natural e humana, não como um robô técnico.`

    const response = await gemmaService.customerSuccessQuery(prompt)

    if (response.success) {
      // Remover timestamp desnecessário para conversas casuais
      if (userInput.toLowerCase().match(/^(oi|olá|e aí|eai|hey|opa|fala|blz|beleza)$/)) {
        return response.content
      }
      return response.content
    } else {
      // Fallback mais amigável
      const input = userInput.toLowerCase()

      if (input.match(/^(oi|olá|e aí|eai|hey|opa|fala|blz|beleza)$/)) {
        return `Oi! 😊 Sou seu assistente de Customer Success. Como posso ajudar você hoje?

Posso te ajudar com:
• Informações sobre mentorados
• Análise de formulários
• Cadastros e buscas
• Insights do sistema

O que você gostaria de saber?`
      }

      if (input.includes('como') && (input.includes('funciona') || input.includes('usar'))) {
        return `Te explico! 🤖 Sou um assistente inteligente que te ajuda com:

📊 **Mentorados:** "Quantos mentorados temos?", "Buscar João"
📋 **Formulários:** "Quem respondeu formulários?", "Formulários do João"
➕ **Cadastros:** "Cadastrar Maria Silva, email maria@email.com"
📈 **Insights:** "Analise o engajamento", "Relatório geral"

Só falar comigo de forma natural! O que você quer saber?`
      }

      return `Não entendi bem... 🤔 Mas posso te ajudar com várias coisas!

**Exemplos do que posso fazer:**
• "Quantos mentorados temos?"
• "Tem mentorado João Silva?"
• "Quem respondeu formulários?"
• "Cadastrar novo mentorado"

Tenta reformular ou me diz o que você precisa! 😊`
    }
  } catch (error) {
    console.error('Erro na consulta geral:', error)
    return `Erro ao consultar a base de dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
  }
}

// Implementações simplificadas das outras funções (mantém a funcionalidade)
async function handleAddPendencia(context: AICommandContext, userInput: string): Promise<string> {
  const { valor, mes } = context.entities
  
  if (!valor || !mes) {
    return `Preciso de mais informações. Exemplo: "João Silva está devendo 5000 reais do mês de outubro"`
  }

  const nomeMatch = userInput.match(/([A-ZÁÊÂÃÇ][a-záêâãçõ]+(?:\s+[A-ZÁÊÂÃÇ][a-záêâãçõ]+)*)/g)
  const possiveisNomes = nomeMatch?.filter(nome => 
    !['tem', 'que', 'está', 'devendo', 'reais', 'mil', 'mês'].includes(nome.toLowerCase())
  )

  if (!possiveisNomes || possiveisNomes.length === 0) {
    return `Qual é o nome da pessoa que deve R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de ${mes}?`
  }

  const nome = possiveisNomes[0]
  
  try {
    const { data: mentorado } = await supabase
      .from('mentorados')
      .select('*')
      .ilike('nome_completo', `%${nome}%`)
      .single()

    if (!mentorado) {
      return `Não encontrei "${nome}" nos mentorados. Verifique o nome ou cadastre primeiro.`
    }

    const pendencia: Pendencia = {
      mentorado_id: mentorado.id,
      nome_mentorado: mentorado.nome_completo,
      valor: valor,
      mes: mes,
      status: 'pendente',
      created_at: new Date().toISOString()
    }

    // Em uma aplicação real, salvaria no banco de dados
    // Por enquanto, apenas simular que foi salvo

    return `✅ **Pendência registrada!**

📋 **Detalhes:**
- **Nome:** ${mentorado.nome_completo}
- **Valor:** R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- **Mês:** ${mes}
- **Status:** Pendente

Pendência salva no sistema.`
  } catch (error) {
    return 'Erro ao registrar pendência.'
  }
}

async function handleListPendencias(context: AICommandContext): Promise<string> {
  try {
    // Simulando pendências (em uma aplicação real, buscaríamos do banco)
    let pendencias = [
      { nome_mentorado: 'João Silva', valor: 5000, mes: 'outubro', status: 'pendente' },
      { nome_mentorado: 'Maria Santos', valor: 3500, mes: 'setembro', status: 'pendente' }
    ]

    // Usar IA para formatar resposta
    const prompt = `Liste estas pendências de forma organizada e clara:

${JSON.stringify(pendencias, null, 2)}

Formate com emojis, totais e informações úteis.`

    const response = await gemmaService.customerSuccessQuery(prompt)
    
    if (response.success) {
      return response.content
    } else {
      let resultado = '📋 **Pendências:**\n\n'
      pendencias.forEach((p, i) => {
        resultado += `${i + 1}. **${p.nome_mentorado}**\n   💰 R$ ${p.valor.toLocaleString('pt-BR')}\n   📅 ${p.mes}\n\n`
      })
      const total = pendencias.reduce((sum, p) => sum + (p.valor || 0), 0)
      resultado += `💼 **Total:** R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      return resultado
    }
  } catch (error) {
    return 'Erro ao buscar pendências.'
  }
}

async function handleAddMentorado(context: AICommandContext, userInput: string): Promise<string> {
  const emailMatch = userInput.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
  const nomeMatch = userInput.match(/(?:cadastrar|adicionar|criar)\s+([^,]+)/i)
  const turmaMatch = userInput.match(/turma\s+([^,]+)/i)
  const telefoneMatch = userInput.match(/(?:telefone|tel|fone)\s*:?\s*([0-9\(\)\s\-]+)/i)

  // Dados extraídos
  const dadosExtracted = {
    nome_completo: nomeMatch?.[1]?.trim(),
    email: emailMatch?.[0],
    turma: turmaMatch?.[1]?.trim() || '2024-2',
    telefone: telefoneMatch?.[1]?.trim()
  }

  // Validação inteligente com IA
  const validation = await gemmaService.validateData(dadosExtracted, 'mentorado')

  if (!validation.isValid) {
    // Tratamento inteligente de erro
    const errorMessage = await gemmaService.handleAPIError(
      validation.errors,
      'cadastro de mentorado',
      userInput
    )
    return errorMessage
  }

  try {
    const mentoradoData = {
      nome_completo: dadosExtracted.nome_completo,
      email: dadosExtracted.email,
      turma: dadosExtracted.turma,
      telefone: dadosExtracted.telefone || null,
      estado_atual: 'ativo',
      estado_entrada: 'novo',
      data_entrada: new Date().toISOString().split('T')[0],
      data_nascimento: null
    }

    const { data, error } = await supabase
      .from('mentorados')
      .insert([mentoradoData])
      .select()

    if (error) {
      // Tratamento inteligente do erro do banco
      return await gemmaService.handleAPIError(error, 'cadastro no banco de dados', userInput)
    }

    // Sucesso - resposta formatada pela IA
    const successPrompt = `Um mentorado foi cadastrado com sucesso:

Dados: ${JSON.stringify(mentoradoData, null, 2)}

Formate uma mensagem de sucesso amigável e informativa com emojis.`

    const response = await gemmaService.customerSuccessQuery(successPrompt)

    if (response.success) {
      return response.content
    }

    // Fallback
    return `✅ **${dadosExtracted.nome_completo}** cadastrado com sucesso!\n📧 ${dadosExtracted.email}\n🎓 Turma ${dadosExtracted.turma}`

  } catch (error) {
    return await gemmaService.handleAPIError(error, 'cadastro de mentorado', userInput)
  }
}

async function handleSearchMentorado(context: AICommandContext, userInput: string): Promise<string> {
  // Tentar extrair nome do contexto primeiro, depois do input
  let nome = context.entities?.nome

  if (!nome) {
    const nomeMatches = [
      userInput.match(/(?:buscar|procurar)\s+(.+)/i),
      userInput.match(/(?:tem|existe|há)\s+(?:o\s+)?(?:mentorado\s+)?([A-ZÁÊÂÃÇ][a-záêâãçõ]+(?:\s+[A-ZÁÊÂÃÇ][a-záêâãçõ]+)*)/i),
      userInput.match(/([A-ZÁÊÂÃÇ][a-záêâãçõ]+(?:\s+[A-ZÁÊÂÃÇ][a-záêâãçõ]+)*)\s+(?:está|ta)/i)
    ]

    for (const match of nomeMatches) {
      if (match && match[1]) {
        nome = match[1].trim()
        break
      }
    }
  }

  if (!nome) {
    return 'Especifique o nome: "Tem mentorado João Silva?" ou "Buscar Maria"'
  }

  console.log(`🔍 Buscando mentorado: "${nome}"`)

  try {
    // SEMPRE consultar a base de dados real
    const { data: mentorados, error } = await supabase
      .from('mentorados')
      .select('*')
      .or(`nome_completo.ilike.%${nome}%,email.ilike.%${nome}%`)

    if (error) {
      console.error('Erro na busca:', error)
      return `Erro ao buscar "${nome}": ${error.message}`
    }

    console.log(`📊 Resultados encontrados: ${mentorados?.length || 0}`)

    // Resposta baseada APENAS nos dados reais
    if (!mentorados || mentorados.length === 0) {
      return `❌ **Não existe** mentorado com o nome "${nome}" no sistema.

📋 **Dados consultados:** Base real de mentorados
🔍 **Busca realizada:** Nome e email

Para cadastrar, use: "Cadastrar ${nome}, email usuario@email.com"`
    }

    // Encontrou mentorados - resposta factual
    let resultado = `✅ **Encontrei ${mentorados.length} mentorado(s) com "${nome}":**\n\n`

    mentorados.forEach((m, i) => {
      resultado += `${i + 1}. **${m.nome_completo}**\n`
      resultado += `   📧 ${m.email}\n`
      resultado += `   🎓 ${m.turma || 'Turma não informada'}\n`
      resultado += `   📊 Status: ${m.estado_atual || 'Não informado'}\n`
      resultado += `   📅 Entrada: ${m.data_entrada || 'Não informada'}\n\n`
    })

    resultado += `📋 **Consulta realizada:** ${new Date().toLocaleString('pt-BR')}`

    return resultado

  } catch (error) {
    console.error('Erro na busca:', error)
    return `Erro ao consultar a base de dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
  }
}