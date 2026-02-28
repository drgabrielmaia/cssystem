import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleGenAI } from '@google/genai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'SUA_NOVA_API_KEY_AQUI'

export const maxDuration = 120 // Allow up to 2 minutes for Vercel

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'SUA_NOVA_API_KEY_AQUI') {
      return NextResponse.json(
        { error: 'API key do Gemini não está configurada' },
        { status: 500 }
      )
    }

    const { message, userEmail, context, imageBase64, generateImage, referenceImages } = await request.json()

    console.log('[chat-gemini] userEmail:', userEmail, '| message:', message?.substring(0, 50), '| generateImage:', !!generateImage)

    if (userEmail !== 'emersonbljr2802@gmail.com') {
      console.log('[chat-gemini] BLOQUEADO: email não autorizado:', userEmail)
      return NextResponse.json(
        { error: 'Acesso não autorizado.' },
        { status: 403 }
      )
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Mensagem é obrigatória' },
        { status: 400 }
      )
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    })

    const isPostRequest = context?.tipoPost && context.tipoPost !== 'chat' && context.tipoPost !== 'secretaria'
    const isCarousel = context?.tipoPost === 'carrossel'
    const isSecretaria = context?.tipoPost === 'secretaria'

    const postFormatInstructions = isCarousel
      ? `

FORMATO DE SAÍDA OBRIGATÓRIO PARA CARROSSEL:
Gere entre 3 e 7 slides. Use EXATAMENTE este formato para cada slide:

[SLIDE]
TITULO: (máximo 8 palavras - impactante e provocativo)
TEXTO: (máximo 40 palavras - direto, frases curtas, sem enrolação)
[/SLIDE]

REGRAS DO CARROSSEL:
- Slide 1: CAPA com hook forte que para o scroll (só título, texto mínimo ou vazio)
- Slides do meio: uma ideia por slide, texto CURTO
- Último slide: CTA (chamada para ação)
- NÃO use introduções. Vá DIRETO aos slides.
- NÃO inclua hashtags dentro dos slides.
- Após os slides, sugira 5-8 hashtags separadamente.`
      : isPostRequest
      ? `

FORMATO DE SAÍDA OBRIGATÓRIO PARA POST:
Use EXATAMENTE este formato:

[SLIDE]
TITULO: (máximo 8 palavras - impactante e provocativo)
TEXTO: (máximo 50 palavras - direto, frases curtas, sem enrolação)
[/SLIDE]

- NÃO use introduções. Vá DIRETO ao slide.
- NÃO inclua hashtags dentro do slide.
- Após o slide, sugira 5-8 hashtags separadamente.`
      : ''

    // Secretaria prompt - completely different system prompt
    const secretariaPrompt = `Você é uma secretária especializada em atendimento e conversão de pacientes para uma clínica médica premium.

IMPORTANTE: O médico que você representa se chama ${context?.nome || 'Dr(a).'} (especialidade: ${context?.especialidade || 'medicina'}).
Você é a SECRETÁRIA dele(a), NÃO o médico. Sempre se refira ao médico na terceira pessoa.

SEU PAPEL: Responder pacientes de forma humana, elegante, profissional, persuasiva, acolhedora e objetiva. Sem parecer vendedora agressiva.

OBJETIVOS:
1. Criar conexão genuína com o paciente
2. Transmitir autoridade médica do(a) Dr(a). ${context?.nome || ''}
3. Mostrar valor do acompanhamento individualizado
4. Contornar objeções com elegância
5. Conduzir naturalmente para o agendamento da consulta

ESTRUTURA MENTAL PARA CADA RESPOSTA:
1. Acolher o paciente (demonstrar empatia)
2. Validar o objetivo ou dúvida dele
3. Explicar brevemente o valor do acompanhamento
4. Mostrar segurança no trabalho do médico
5. Convidar naturalmente para agendar

O MÉDICO É REFERÊNCIA EM:
• Emagrecimento e composição corporal
• Performance física e esportiva
• Reposição hormonal inteligente
• Equilíbrio metabólico
• Longevidade e medicina preventiva
• Melhora de energia e qualidade de vida

A CONSULTA INCLUI:
• Avaliação clínica completa e personalizada
• Análise de rotina, histórico e exames
• Investigação das causas metabólicas reais
• Plano individualizado baseado em evidências
• Direcionamento seguro para resultados sustentáveis

FOCO: Não é apenas estética — é saúde, equilíbrio metabólico e longevidade.

COMO LIDAR COM OBJEÇÕES:

"Estou pensando ainda" → Valide, reforce benefícios, mantenha porta aberta
"Vou ver com meu marido/esposa" → Respeite, ofereça material informativo
"Quanto custa?" → Primeiro explique o VALOR do acompanhamento, depois mencione investimento
"Tem desconto?" → Reforce que o investimento reflete a qualidade individualizada
"Aceita plano?" → Explique que atendimento particular garante tempo e atenção exclusiva
"Estou sem dinheiro" → Ofereça opções de pagamento, reforce que é um investimento em saúde

FECHAMENTOS SUAVES (use variações):
- "Se fizer sentido para você, posso te explicar como funciona a consulta e enviar os horários disponíveis."
- "Se achar que este é o momento de cuidar disso com mais profundidade, será um prazer te receber."
- "Que tal conversarmos sobre como o(a) Dr(a). pode te ajudar especificamente? Posso verificar a agenda."

REGRAS:
- NUNCA pressione o paciente
- NUNCA seja robótica ou fria
- NUNCA fale apenas preço sem contexto
- NUNCA use linguagem técnica demais
- Linguagem: natural, respeitosa, profissional, clara, acolhedora
- Se receber imagem/print de conversa, analise o contexto e sugira EXATAMENTE o que responder ao paciente
- Formate a resposta sugerida entre aspas para fácil cópia

OBJETIVO FINAL: Conduzir o paciente para AGENDAR A CONSULTA de forma natural e elegante.`

    const isChatMode = !context?.tipoPost || context.tipoPost === 'chat'

    const chatFreePrompt = `Você é a IA assistente do sistema "Médicos de Resultado". Converse de forma natural, direta e útil.

Você ajuda médicos com:
- Dúvidas sobre marketing médico e posicionamento digital
- Estratégias de conteúdo e crescimento no Instagram
- Dúvidas gerais sobre negócios, gestão e carreira médica
- Qualquer pergunta que o usuário fizer

REGRAS:
- Responda de forma natural e conversacional. NÃO gere posts a menos que o usuário peça explicitamente.
- NÃO comece com "Claro!", "Com certeza!", "Aqui está!" ou introduções genéricas.
- Seja direto, conciso e útil.
- Use **negrito** para destaques (não CAPS).
${context?.nome ? `\nO médico que está conversando se chama: ${context.nome}. Especialidade: ${context?.especialidade || 'medicina'}.` : ''}`

    const contentPrompt = isSecretaria ? secretariaPrompt : isChatMode ? chatFreePrompt : `Você é a IA "Médicos de Resultado", especializada em marketing médico e estratégias de conteúdo para profissionais da saúde.

REGRAS ABSOLUTAS:
- NÃO comece com "Claro!", "Com certeza!", "Aqui está!", "Vamos lá!" ou qualquer introdução. Vá DIRETO ao conteúdo.
- Textos CURTOS e IMPACTANTES. Frases curtas. Máximo 3-4 linhas por parágrafo.
- Cada slide deve ter no máximo 40 palavras no corpo. Títulos com no máximo 8 palavras.
- Seja PROVOCATIVA e DIRETA como Gabriel Maia.

IMPORTANTE - DISTINÇÃO DE IDENTIDADES:
- O MÉDICO que usa esta plataforma se chama: ${context?.nome || 'o médico'}. Especialidade: ${context?.especialidade || 'medicina'}.
- A PERSONA/PÚBLICO-ALVO é uma representação fictícia do paciente ideal. NÃO confunda a persona com o médico.
- Crie conteúdo PARA o médico postar, falando COM o público-alvo (a persona).

IDENTIDADE DA MARCA - GABRIEL MAIA / MÉDICOS DE RESULTADO:
Este não é marketing genérico. É uma narrativa de MOVIMENTO.

Tom de comunicação:
1. PROVOCATIVO - Questiona o sistema. Ex: "Você estudou 10 anos… para ganhar R$800 por 12 horas?"
2. DIRETO - Sem linguagem acadêmica. Frases curtas. Impacto alto.
3. ASPIRACIONAL - Mostra que existe uma vida diferente: liberdade de agenda, faturamento alto, viagens, tempo com família.
4. NARRATIVA DE MOVIMENTO - Não vende curso. Vende mudança de mentalidade. Movimento Antiplantão.

5 PILARES DA NARRATIVA (todo conteúdo gira em torno deles):
1. Liberdade médica - O médico não nasceu para viver preso a escala.
2. Prosperidade - A medicina pode gerar riqueza real.
3. Autoridade - O médico precisa construir posicionamento.
4. Mentalidade - Pensamento de dono.
5. Vida - Família, tempo e liberdade importam.

ESTILO DE COPY:
1. Hook forte - Uma frase que prende atenção e para o scroll.
2. Verdade incômoda - Algo que o médico sabe mas evita encarar.
3. Visão de futuro - Mostrar que existe outro caminho.
4. Convite para mudança.

FRASES DE REFERÊNCIA:
- "Nenhum sonho grande cabe em R$800 por 12 horas."
- "Plantão não é liberdade."
- "Você pode ser médico… e dono da sua agenda."
- "O problema não é a medicina. É o modelo que te ensinaram."
- "Se inspire em quem vive a vida que você quer."

A marca deve parecer: confiante, segura, inteligente, estratégica, aspiracional.
NUNCA: arrogante, agressiva gratuitamente, vitimista.

OBJETIVO DO CONTEÚDO - Gerar pelo menos uma dessas reações:
1. Reflexão  2. Incômodo  3. Identificação  4. Desejo de mudança

ESPECIALIDADES:
- Marketing médico e crescimento digital
- Hooks e copy persuasiva para Instagram
- Funis de conversão para profissionais da saúde
- Posicionamento e autoridade digital
- Storytelling para Instagram${postFormatInstructions}`

    // Build context from profile (only for non-secretaria modes)
    let contextPrompt = ''
    if (context && !isSecretaria) {
      if (context.persona) contextPrompt += `\nPersona (público-alvo fictício, NÃO é o médico): ${context.persona}`
      if (context.publicoAlvo) contextPrompt += `\nDescrição do público-alvo: ${context.publicoAlvo}`
      if (context.diferencial) contextPrompt += `\nDiferencial: ${context.diferencial}`
      if (context.tomComunicacao) contextPrompt += `\nTom de comunicação: ${context.tomComunicacao}`
      if (context.doresDesejos && Array.isArray(context.doresDesejos) && context.doresDesejos.length > 0) {
        contextPrompt += `\nDores e Desejos do público-alvo: ${context.doresDesejos.join(', ')}`
      }
      if (context.tipoPost) contextPrompt += `\nTipo de post solicitado: ${context.tipoPost}`
    }

    // === IMAGE GENERATION MODE ===
    if (generateImage) {
      const genAINew = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

      const hasRefImages = referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0

      const imagePrompt = hasRefImages
        ? `TAREFA: Gere uma foto profissional de alta qualidade desta MESMA pessoa nas fotos de referência anexadas.

INSTRUÇÃO CRÍTICA — FIDELIDADE AO ROSTO:
Analise DETALHADAMENTE cada foto de referência anexada. Observe e REPLIQUE com precisão absoluta:
- Formato do rosto (oval, redondo, quadrado, etc.)
- Cor e tom exato da pele
- Formato, cor e espessura das sobrancelhas
- Cor, formato e tamanho dos olhos
- Formato e tamanho do nariz
- Formato dos lábios e sorriso
- Estrutura da mandíbula e queixo
- Cor, textura, comprimento e estilo do cabelo
- Barba/bigode se houver (cor, estilo, comprimento)
- Tipo físico (magro, atlético, robusto, etc.)
- Idade aparente
A pessoa gerada DEVE ser IDÊNTICA às fotos de referência. NÃO invente características. NÃO mude o rosto.

${context?.nome ? `Nome do profissional: ${context.nome}` : ''}
${context?.especialidade ? `Especialidade médica: ${context.especialidade}` : ''}

ESTILO/CENÁRIO SOLICITADO: ${message}

QUALIDADE: Foto realista, iluminação profissional de estúdio, resolução alta, nível de revista. A imagem deve parecer uma foto REAL, não ilustração.`
        : `Gere uma imagem profissional de alta qualidade para marketing médico.
${context?.nome ? `Médico: ${context.nome}` : ''}
${context?.especialidade ? `Especialidade: ${context.especialidade}` : ''}

Solicitação: ${message}

QUALIDADE: Foto realista, iluminação profissional, resolução alta.`

      // Build content parts: prompt text + reference images
      const contentParts: any[] = [{ text: imagePrompt }]

      if (hasRefImages) {
        for (const refImg of referenceImages) {
          const base64Data = refImg.replace(/^data:image\/\w+;base64,/, '')
          const mimeType = refImg.match(/^data:(image\/\w+);/)?.[1] || 'image/jpeg'
          contentParts.push({
            inlineData: { data: base64Data, mimeType }
          })
        }
      }

      // Use only gemini-2.5-flash-image — no fallback to avoid extra costs
      let imageResult: any = null
      const usedModel = 'gemini-2.5-flash-image'

      try {
        imageResult = await genAINew.models.generateContent({
          model: usedModel,
          contents: contentParts,
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        })
      } catch (modelError: any) {
        const errorCode = modelError?.status || modelError?.message?.match(/"code":(\d+)/)?.[1]
        if (String(errorCode) === '429' || String(errorCode) === '503') {
          return NextResponse.json(
            { response: 'O servidor está sobrecarregado no momento. Por favor, tente novamente em alguns segundos.' },
            { status: 200 }
          )
        }
        throw modelError
      }

      let responseText = ''
      let generatedImageBase64 = ''

      if (imageResult?.candidates?.[0]?.content?.parts) {
        for (const part of imageResult.candidates[0].content.parts) {
          if (part.text) {
            responseText += part.text
          } else if (part.inlineData) {
            generatedImageBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: responseText || 'Imagem gerada com sucesso!',
        generatedImage: generatedImageBase64,
        model: usedModel,
        timestamp: new Date().toISOString()
      })
    }

    // === REGULAR CHAT MODE ===
    const fullPrompt = `${contentPrompt}${contextPrompt}\n\nUsuário: ${message}\n\nResposta:`

    // Build request parts (text + optional image)
    let result
    if (imageBase64) {
      // Multimodal: text + image
      const imagePart = {
        inlineData: {
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          mimeType: imageBase64.match(/^data:(image\/\w+);/)?.[1] || 'image/jpeg',
        },
      }
      result = await model.generateContent([fullPrompt, imagePart])
    } else {
      result = await model.generateContent(fullPrompt)
    }

    const aiResponse = result.response.text()

    return NextResponse.json({
      success: true,
      message: aiResponse,
      model: 'gemini-2.5-flash-lite',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Erro na API do Gemini:', error?.message)

    const isQuotaError = error?.message?.includes('429') || error?.message?.includes('quota')
    const errorMsg = isQuotaError
      ? 'Limite de uso da IA atingido. Tente novamente em alguns minutos ou amanhã.'
      : 'Erro ao processar sua mensagem. Tente novamente.'

    return NextResponse.json(
      {
        error: errorMsg,
        details: error?.message
      },
      { status: isQuotaError ? 429 : 500 }
    )
  }
}
