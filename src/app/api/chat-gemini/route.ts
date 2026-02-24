import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'SUA_NOVA_API_KEY_AQUI'

export async function POST(request: NextRequest) {
  try {
    const { message, userEmail } = await request.json()

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
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    
    // Usar o modelo Gemma 3 27B
    const model = genAI.getGenerativeModel({ 
      model: "gemma-3-27b-it", // Modelo Gemma 3 27B
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
- SEMPRE seja CURTA, OBJETIVA e DIRETA em suas respostas
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
- Respostas concisas e práticas
- Foco em resultados mensuráveis
- Insights acionáveis imediatos
- Tom estratégico e assertivo

Responda como um estrategista experiente que domina o mercado médico.`

    // Combinar o prompt do sistema com a mensagem do usuário
    const fullPrompt = `${systemPrompt}\n\nUsuário: ${message}\n\nRuixen AI:`

    // Gerar resposta
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const aiResponse = response.text()

    console.log('✅ Resposta do Gemini gerada com sucesso')

    return NextResponse.json({
      success: true,
      message: aiResponse,
      model: 'gemma-3-27b-it',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Erro na API do Gemini:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}