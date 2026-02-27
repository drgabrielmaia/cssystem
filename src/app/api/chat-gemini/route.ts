import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'SUA_NOVA_API_KEY_AQUI'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Iniciando request para chat-gemini')
    
    // Verificar se a API key está configurada
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'SUA_NOVA_API_KEY_AQUI') {
      console.error('❌ GEMINI_API_KEY não está configurada')
      return NextResponse.json(
        { error: 'API key do Gemini não está configurada' },
        { status: 500 }
      )
    }

    // Timeout de 60 segundos para perguntas complexas
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: A resposta está demorando mais que o esperado')), 60000)
    )

    const processRequest = async () => {
      const { message, userEmail, context } = await request.json()
      console.log('📝 Dados recebidos:', { userEmail, messageLength: message?.length })

    // Verificar se é o usuário autorizado
    if (userEmail !== 'emersonbljr2802@gmail.com') {
      return NextResponse.json(
        { error: 'Acesso não autorizado. Esta funcionalidade é exclusiva.' },
        { status: 403 }
      )
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Mensagem é obrigatória' },
        { status: 400 }
      )
    }

    // Inicializar o Google AI
    console.log('🔧 Inicializando Google AI')
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    
    // Usar o modelo Gemini 1.5 Flash (modelo estável)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro", // Modelo Gemini Pro (mais estável)
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    })

    // Contexto personalizado para o chat
    const systemPrompt = `Você é Ruixen AI, uma inteligência artificial especializada em marketing médico e estratégias de negócios para profissionais da saúde.

Você está conversando com ${userEmail}, um mentorado especial que tem acesso exclusivo a esta funcionalidade.

INSTRUÇÕES FUNDAMENTAIS:
- Seja mais HUMANA e conversacional em suas respostas
- Use empatia e tom natural, como se fosse um consultor experiente
- SEMPRE seja DIRETA e PRÁTICA, mas com calor humano
- Quando usar texto entre asteriscos (*exemplo*), formate em **negrito**
- Use conhecimento em marketing ideológico para conversar
- Aplique estratégias de TOPO DE FUNIL, MEIO DE FUNIL e FUNDO DE FUNIL
- Você aprendeu com os maiores estrategistas e lançadores para gerar posts e roteiros de qualidade
- Você sabe que um HOOK bom é um HOOK que OBRIGA alguém a parar. Ele OBRIGA.
- Você sabe prender a atenção e criar conteúdo que converte

ESPECIALIDADES:
- Marketing médico e estratégias de crescimento
- Criação de hooks irresistíveis que param o scroll
- Funis de conversão para profissionais da saúde
- Roteiros de vendas e lançamentos
- Posicionamento e autoridade digital
- Copy persuasiva e storytelling

COMPORTAMENTO:
- Tom mais humanizado e empático
- Respostas concisas MAS acolhedoras
- Foco em resultados mensuráveis
- Insights acionáveis imediatos
- Estratégico mas acessível

FORMATAÇÃO:
- Sempre que encontrar texto entre asteriscos simples (*texto*), formate como **texto** (negrito)
- Sempre que encontrar texto entre dois asteriscos (**texto**), formate como ## texto (título)
- Mantenha um tom conversacional e próximo

Responda como um estrategista experiente e humano que domina o mercado médico.`

    // Construir contexto do usuário de forma segura
    let contextPrompt = ''
    if (context) {
      if (context.persona) {
        contextPrompt += `\nPersona do usuário: ${context.persona}`
      }
      if (context.doresDesejos && Array.isArray(context.doresDesejos)) {
        contextPrompt += `\nDores e Desejos do usuário: ${context.doresDesejos.join(', ')}`
      }
      if (context.tipoPost) {
        contextPrompt += `\nTipo de post solicitado: ${context.tipoPost}`
      }
    }

    // Combinar o prompt do sistema com a mensagem do usuário
    const fullPrompt = `${systemPrompt}${contextPrompt}\n\nUsuário: ${message}\n\nRuixen AI:`

      // Gerar resposta
      console.log('💭 Gerando resposta com Gemini...')
      const result = await model.generateContent(fullPrompt)
      const response = result.response
      const aiResponse = response.text()

      console.log('✅ Resposta do Gemini gerada com sucesso, comprimento:', aiResponse?.length)

      return NextResponse.json({
        success: true,
        message: aiResponse,
        model: 'gemini-1.5-flash',
        timestamp: new Date().toISOString()
      })
    }

    // Executar com timeout
    return await Promise.race([processRequest(), timeout])

  } catch (error: any) {
    console.error('❌ Erro na API do Gemini:', error)
    
    // Retornar erro mais específico
    if (error.message.includes('Timeout')) {
      return NextResponse.json(
        { 
          error: 'A pergunta é muito complexa e está demorando para processar. Tente uma versão mais simples.',
          details: error.message 
        },
        { status: 408 } // Request Timeout
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}