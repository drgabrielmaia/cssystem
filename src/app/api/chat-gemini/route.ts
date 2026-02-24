import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = 'AIzaSyDp8hHQyc_1XP6Gl0b9qJ5dxUl8aPTmjdc'

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
      model: "gemma-27b-it", // Modelo Gemma 3 27B
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    })

    // Contexto personalizado para o chat
    const systemPrompt = `Você é Ruixen AI, uma inteligência artificial especializada em ajudar profissionais da área médica e de negócios. 

Você está conversando com ${userEmail}, um mentorado especial que tem acesso exclusivo a esta funcionalidade.

Características do seu comportamento:
- Seja prestativo, inteligente e direto
- Foque em soluções práticas e estratégicas
- Use conhecimento em medicina, negócios e crescimento profissional
- Seja empático mas mantenha profissionalismo
- Ofereça insights valiosos e acionáveis
- Quando apropriado, faça perguntas para entender melhor o contexto

Responda de forma natural e conversacional, como um mentor experiente.`

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
      model: 'gemma-27b-it',
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