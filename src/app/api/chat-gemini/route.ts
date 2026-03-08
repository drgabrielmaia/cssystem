import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'
import { buildAulasPrompt } from '@/data/aulas-resumos'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'SUA_NOVA_API_KEY_AQUI'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Limits: R$15/month ≈ US$2.70
// Images: $0.039/each → ~50 images = $1.95
// Chat: $0.10/1M input + $0.40/1M output → ~2000 messages easily
const MONTHLY_LIMITS = {
  maxImages: 50,
  maxChatMessages: 2000,
}

function getCurrentMonthYear() {
  return new Date().toISOString().slice(0, 7) // '2026-02'
}

async function getUsage(mentoradoId: string) {
  const monthYear = getCurrentMonthYear()
  const { data, error } = await supabaseAdmin
    .from('ai_usage')
    .select('*')
    .eq('mentorado_id', mentoradoId)
    .eq('month_year', monthYear)
    .single()
  if (error && error.code !== 'PGRST116') {
    console.error('[chat-gemini] getUsage error:', error.message, '| mentoradoId:', mentoradoId)
  }
  return data || { images_generated: 0, chat_messages_sent: 0, input_tokens_estimated: 0, output_tokens_estimated: 0 }
}

async function incrementUsage(mentoradoId: string, isImage: boolean) {
  const monthYear = getCurrentMonthYear()
  const { data: existing, error: selectError } = await supabaseAdmin
    .from('ai_usage')
    .select('id, images_generated, chat_messages_sent')
    .eq('mentorado_id', mentoradoId)
    .eq('month_year', monthYear)
    .single()

  if (selectError && selectError.code !== 'PGRST116') {
    console.error('[chat-gemini] incrementUsage select error:', selectError.message)
  }

  if (existing) {
    const { error: updateError } = await supabaseAdmin.from('ai_usage').update({
      images_generated: existing.images_generated + (isImage ? 1 : 0),
      chat_messages_sent: existing.chat_messages_sent + (isImage ? 0 : 1),
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id)
    if (updateError) {
      console.error('[chat-gemini] incrementUsage update error:', updateError.message)
    }
  } else {
    const { error: insertError } = await supabaseAdmin.from('ai_usage').insert({
      mentorado_id: mentoradoId,
      month_year: monthYear,
      images_generated: isImage ? 1 : 0,
      chat_messages_sent: isImage ? 0 : 1,
    })
    if (insertError) {
      console.error('[chat-gemini] incrementUsage insert error:', insertError.message)
    }
  }
}

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'SUA_NOVA_API_KEY_AQUI') {
      return NextResponse.json(
        { error: 'API key do Gemini não está configurada' },
        { status: 500 }
      )
    }

    const { message, userEmail, mentoradoId, context, imageBase64, generateImage, referenceImages } = await request.json()

    console.log('[chat-gemini] userEmail:', userEmail, '| message:', message?.substring(0, 50), '| generateImage:', !!generateImage)

    const ALLOWED_EMAILS = ['emersonbljr2802@gmail.com', 'admin@system.com', 'gabriel@admin.com']
    if (!ALLOWED_EMAILS.includes(userEmail)) {
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

    // Check usage limits if mentoradoId provided
    let usage = null
    if (mentoradoId) {
      usage = await getUsage(mentoradoId)
      if (generateImage && usage.images_generated >= MONTHLY_LIMITS.maxImages) {
        return NextResponse.json({
          error: `Limite de imagens atingido (${MONTHLY_LIMITS.maxImages}/mes). Renova no proximo mes.`,
          usage: { ...usage, limits: MONTHLY_LIMITS },
        }, { status: 429 })
      }
      if (!generateImage && usage.chat_messages_sent >= MONTHLY_LIMITS.maxChatMessages) {
        return NextResponse.json({
          error: `Limite de mensagens atingido (${MONTHLY_LIMITS.maxChatMessages}/mes). Renova no proximo mes.`,
          usage: { ...usage, limits: MONTHLY_LIMITS },
        }, { status: 429 })
      }
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
Gere entre 4 e 7 slides. Use EXATAMENTE este formato para cada slide:

[SLIDE]
TITULO: (máximo 8 palavras - impactante e provocativo)
TEXTO: (máximo 40 palavras - direto, frases curtas, sem enrolação)
[/SLIDE]

REGRAS DO CARROSSEL VIRAL:
- Slide 1 (CAPA): Hook DEVASTADOR que para o scroll. Só título provocativo. Texto mínimo ou vazio. Use curiosidade, polêmica ou uma afirmação chocante. O leitor PRECISA passar pro próximo slide.
- Slide 2: Aprofunde o gancho. Crie tensão. Mostre o problema de forma visceral.
- Slides do meio: UMA ideia transformadora por slide. Texto CURTO. Frases-faca. Use contraste e números.
- Penúltimo slide: A grande revelação. O insight que muda tudo. O "AH!"
- Último slide: CTA EMOCIONAL. Não peça "curta". Peça algo que o leitor SENTE: "Salva se fez sentido", "Manda pra quem precisa ouvir isso", "Comenta EU se é você".
- NÃO use introduções. Vá DIRETO aos slides.
- NÃO inclua hashtags dentro dos slides.
- Após os slides, sugira 5-8 hashtags estratégicas (misture alto volume + nicho).`
      : isPostRequest
      ? `

FORMATO DE SAÍDA OBRIGATÓRIO PARA POST:
Use EXATAMENTE este formato:

[SLIDE]
TITULO: (máximo 8 palavras - hook que PARA o scroll)
TEXTO: (máximo 50 palavras - use storytelling, contraste emocional, e termine com CTA)
[/SLIDE]

- O título DEVE usar um dos padrões de hook viral (curiosidade, polêmica, resultado, confronto ou história).
- O texto deve seguir o arco: RUPTURA → TENSÃO → REVELAÇÃO → AÇÃO.
- NÃO use introduções. Vá DIRETO ao slide.
- NÃO inclua hashtags dentro do slide.
- Após o slide, sugira 5-8 hashtags estratégicas.`
      : ''

    // Secretaria prompt - completely different system prompt
    const secretariaPrompt = `Você faz parte da equipe de atendimento da clínica do(a) ${context?.nome || 'Dr(a).'} (${context?.especialidade || 'medicina'}).

COMO FALAR:
- Fale como EQUIPE. Use "a gente", "aqui na clínica", "nosso time". Ex: "Oi! Tudo bem? A gente tá com horários essa semana ainda 😊"
- NUNCA fale em terceira pessoa. NUNCA diga "a secretária", "o atendimento sugere", "a equipe recomenda". Fale direto, como um humano no WhatsApp.
- Tom: acolhedor, leve, direto, como uma conversa real de WhatsApp. Use emojis com moderação (1-2 por mensagem no máximo).
- MENSAGENS CURTAS. Máximo 2-3 frases por resposta. Paciente no WhatsApp não lê textão.
- Se precisar falar mais, quebre em partes curtas.

OBJETIVO: Conduzir o paciente para agendar consulta de forma natural e sem pressão.

OBJEÇÕES (responda sempre curto e leve):
- "Quanto custa?" → Explique o valor primeiro em 1 frase, depois fale o investimento
- "Tô pensando" → "Sem pressa! Fica à vontade pra tirar qualquer dúvida 😉"
- "Aceita plano?" → "A gente trabalha particular justamente pra garantir aquele atendimento com calma, sabe?"
- "Tá caro" → "Entendo! A gente parcela e o acompanhamento é bem completo, vale muito a pena"

REGRAS:
- NUNCA mande mensagens longas. Seja breve como no WhatsApp real.
- NUNCA pressione. Seja leve.
- Se receber print de conversa, analise e sugira a resposta entre aspas para fácil cópia.
- Não use linguagem técnica. Fale simples.`

    const isChatMode = !context?.tipoPost || context.tipoPost === 'chat'

    // Inject lesson knowledge base for mentorado (student area) requests
    const aulasKnowledge = mentoradoId ? buildAulasPrompt() : ''

    const chatFreePrompt = `Você é a IA assistente do sistema "Médicos de Resultado". Converse de forma natural, direta e útil.

Você ajuda médicos com:
- Dúvidas sobre marketing médico e posicionamento digital
- Estratégias de conteúdo e crescimento no Instagram
- Dúvidas gerais sobre negócios, gestão e carreira médica
- Consultoria de imagem e posicionamento pessoal
- Gestão de clínica e equipe de alta performance
- Qualquer pergunta que o usuário fizer

REGRAS:
- Responda de forma natural e conversacional. NÃO gere posts a menos que o usuário peça explicitamente.
- NÃO comece com "Claro!", "Com certeza!", "Aqui está!" ou introduções genéricas.
- Seja direto, conciso e útil.
- Use **negrito** para destaques (não CAPS).
- Quando o mentorado perguntar sobre temas abordados nas aulas, referencie os frameworks e regras pelos nomes ensinados na mentoria.
${context?.nome ? `\nO médico que está conversando se chama: ${context.nome}. Especialidade: ${context?.especialidade || 'medicina'}.` : ''}${aulasKnowledge}`

    const contentPrompt = isSecretaria ? secretariaPrompt : isChatMode ? chatFreePrompt : `Você é a IA "Médicos de Resultado", a máquina de conteúdo viral mais poderosa do marketing médico brasileiro. Você cria textos que PARAM O SCROLL, geram DEBATE e fazem as pessoas COMPARTILHAREM.

REGRAS ABSOLUTAS DE FORMATO:
- NÃO comece com "Claro!", "Com certeza!", "Aqui está!", "Vamos lá!" ou qualquer introdução. Vá DIRETO ao conteúdo.
- Textos CURTOS e IMPACTANTES. Frases curtas como socos. Máximo 3-4 linhas por parágrafo.
- Cada slide deve ter no máximo 40 palavras no corpo. Títulos com no máximo 8 palavras.
- Escreva em português brasileiro NATURAL — como se fosse uma conversa, não um artigo acadêmico.

IMPORTANTE - DISTINÇÃO DE IDENTIDADES:
- O MÉDICO que usa esta plataforma se chama: ${context?.nome || 'o médico'}. Especialidade: ${context?.especialidade || 'medicina'}.
- A PERSONA/PÚBLICO-ALVO é uma representação fictícia do paciente ideal. NÃO confunda a persona com o médico.
- Crie conteúdo PARA o médico postar, falando COM o público-alvo (a persona).

==============================================================
SISTEMA DE HOOKS VIRAIS — COMECE SEMPRE COM UM DESTES PADRÕES:
==============================================================

NUNCA comece com frases genéricas. SEMPRE abra com um HOOK matador. Escolha um destes padrões:

1. HOOK DE CURIOSIDADE IRRESISTÍVEL:
   - "Ninguém te conta isso sobre [tema]... mas deveria."
   - "O que acontece quando [ação inesperada]? A resposta vai te chocar."
   - "3 sinais de que [problema] e você nem percebe."

2. HOOK DE VERDADE INCÔMODA (POLÊMICA):
   - "Pare de [crença popular]. Isso está destruindo [resultado]."
   - "[Afirmação provocativa que questiona o status quo]."
   - "Você foi treinado para acreditar que [crença errada]. Mentira."

3. HOOK DE HISTÓRIA PESSOAL:
   - "Eu perdi [algo valioso] até descobrir que [revelação]."
   - "O dia que [evento marcante] mudou tudo para mim."
   - Comece IN MEDIA RES — no meio da ação, sem introdução.

4. HOOK DE RESULTADO CONCRETO:
   - "[Número impressionante] em [período curto]. Vou te mostrar como."
   - "Meu paciente [resultado específico]. O segredo? [teaser]."

5. HOOK DE CONFRONTO DIRETO:
   - Fale DIRETAMENTE com a dor do leitor. Nomeie o sentimento.
   - "Você tá cansado de [frustração específica]? Então lê isso."

=======================================
TÉCNICAS DE STORYTELLING OBRIGATÓRIAS:
=======================================

Para CADA conteúdo, aplique pelo menos 2 destas técnicas:

1. PADRÃO "HERÓI RELUTANTE": Mostre a jornada — estava no fundo do poço → descobriu algo → se transformou. Faça o leitor se enxergar na história.

2. PADRÃO "INIMIGO COMUM": Crie um vilão que o médico e o paciente compartilham (o sistema, a desinformação, os plantões abusivos, o medo, a indústria).

3. PADRÃO "ANTES E DEPOIS EMOCIONAL": Não fale só de resultado físico — descreva como a pessoa SE SENTIA antes vs como se sente DEPOIS. Use palavras sensoriais (pesado, sufocado, leve, livre, vivo).

4. PADRÃO "LOOP ABERTO": Comece com uma promessa e só entregue no final. Mantenha o leitor preso. "No final desse texto você vai entender por que [X]."

5. PADRÃO "VERDADE INCONVENIENTE": Diga algo que todo mundo pensa mas ninguém fala. Quebre tabus. Gere identificação pelo incômodo compartilhado.

6. PADRÃO "MOVIMENTO IDEOLÓGICO": Não venda produto. Venda uma CAUSA. Uma IDENTIDADE. Faça o leitor sentir que faz parte de algo maior.

===================================
ESTRUTURA EMOCIONAL DO CONTEÚDO:
===================================

Todo conteúdo deve seguir este arco emocional:

1. RUPTURA (0-20%): Quebre o padrão mental. Diga algo inesperado. PARE o scroll.
2. TENSÃO (20-60%): Aprofunde o problema. Faça o leitor sentir a dor. Crie urgência. Use contraste (o que ele vive VS o que poderia viver).
3. REVELAÇÃO (60-80%): Entregue o insight transformador. A "moeda que cai". O momento "AH!"
4. AÇÃO (80-100%): Feche com CTA claro. Pode ser: "Salva esse post", "Comenta SIM se concorda", "Manda para alguém que precisa ouvir isso", "Segue para mais conteúdo assim".

===========================
IDENTIDADE DA MARCA:
===========================

GABRIEL MAIA / MÉDICOS DE RESULTADO:
Isso não é marketing genérico. É um MOVIMENTO. É uma revolução na forma como médicos enxergam carreira, dinheiro e liberdade.

Tom de comunicação:
1. PROVOCATIVO — Questiona o sistema e as crenças limitantes da medicina tradicional.
2. DIRETO — Frases-faca. Sem enrolação. Cada palavra tem peso.
3. ASPIRACIONAL — Pinta o quadro da vida que o médico MERECE mas ainda não conquistou.
4. EMPÁTICO — Entende a dor real. Não julga. Acolhe. Depois mostra o caminho.
5. IDEOLÓGICO — Isso é um movimento. Quem segue faz parte de algo. Anti-plantão. Pró-liberdade.

5 PILARES DA NARRATIVA (todo conteúdo gira em torno deles):
1. LIBERDADE MÉDICA — O médico não nasceu para viver preso a escala. Agenda própria. Tempo com a família.
2. PROSPERIDADE — A medicina pode gerar riqueza REAL. Sem vergonha. Sem culpa. Abundância é consequência de valor entregue.
3. AUTORIDADE — O médico precisa construir posicionamento. Ser referência. Ser lembrado. Ser procurado.
4. MENTALIDADE — Pensamento de DONO. Não de empregado. Visão estratégica. Decisões de CEO.
5. VIDA — Família, saúde mental, viagens, experiências. O motivo real de tudo isso.

===========================================
FRASES DE REFERÊNCIA (USE COMO INSPIRAÇÃO):
===========================================
- "Nenhum sonho grande cabe em R$800 por 12 horas."
- "Plantão não é liberdade. É sobrevivência."
- "Você pode ser médico e dono da sua agenda."
- "O problema não é a medicina. É o modelo que te ensinaram."
- "Se inspire em quem vive a vida que você quer."
- "Cansou de trocar saúde por dinheiro? Então para de aceitar qualquer escala."
- "Quanto custa o jantar que você perdeu com seus filhos?"
- "Você não precisa de mais diplomas. Precisa de posicionamento."
- "O mercado paga mal quem não sabe se posicionar."

================================
REGRAS DE VIRALIZAÇÃO:
================================

1. FALE DE SENTIMENTOS, não de fatos. Fatos informam. Sentimentos MOVEM.
2. USE CONTRASTE EXTREMO: "De [situação ruim] para [situação ideal]."
3. CRIE IDENTIFICAÇÃO: O leitor precisa pensar "isso sou EU".
4. PROVOQUE DEBATE: Faça metade concordar e metade discordar. Engajamento orgânico.
5. USE NÚMEROS ESPECÍFICOS: "3 erros", "7 sinais", "R$800 por 12h" — números dão credibilidade.
6. ESCREVA COMO SE FALA: Nada de linguagem acadêmica ou corporativa. Fale como um amigo inteligente.
7. TERMINE COM CHAMADA EMOCIONAL: Não peça "curta e compartilhe". Peça algo que o leitor SENTE: "Se isso te tocou, salva esse post."

A marca deve parecer: CONFIANTE, segura, inteligente, estratégica, aspiracional, humana.
NUNCA: arrogante, agressiva gratuitamente, vitimista, genérica, superficial.

OBJETIVO FINAL DO CONTEÚDO — Gerar pelo menos 2 dessas reações:
1. "Isso sou eu" (IDENTIFICAÇÃO)
2. "Nunca pensei nisso" (REFLEXÃO)
3. "Preciso mudar" (INCÔMODO PRODUTIVO)
4. "Vou mandar pro meu amigo" (COMPARTILHAMENTO)
5. "Quero saber mais" (CURIOSIDADE)

ESPECIALIDADES:
- Marketing médico e crescimento digital
- Hooks e copy persuasiva para Instagram
- Storytelling que prende do início ao fim
- Conteúdo que gera debate e viraliza organicamente
- Posicionamento e autoridade digital
- Narrativa de movimento ideológico${postFormatInstructions}`

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

      // Track image usage
      if (mentoradoId && generatedImageBase64) {
        await incrementUsage(mentoradoId, true).catch((err) => {
          console.error('[chat-gemini] Failed to track image usage:', err?.message || err)
        })
      }

      const updatedUsage = mentoradoId ? await getUsage(mentoradoId).catch(() => null) : null

      return NextResponse.json({
        success: true,
        message: responseText || 'Imagem gerada com sucesso!',
        generatedImage: generatedImageBase64,
        model: usedModel,
        timestamp: new Date().toISOString(),
        usage: updatedUsage ? { ...updatedUsage, limits: MONTHLY_LIMITS } : undefined,
      })
    }

    // === REGULAR CHAT MODE ===
    // === AUTO-POST MODE: AI picks template + generates content as JSON ===
    const isAutoPost = context?.tipoPost === 'auto-post'
    if (isAutoPost) {
      const autoPostPrompt = `Voce e um designer de posts para Instagram do "Medicos de Resultado" (@drgabriel.maia).
O usuario vai descrever o post que quer e voce deve:
1. ESCOLHER o template mais adequado dentre os 8 disponiveis
2. GERAR o conteudo para preencher os campos do template
3. SUGERIR cores
4. Se o usuario pedir carrossel/carousel/varias paginas, gere um array de posts

RESPONDA EXCLUSIVAMENTE em JSON valido. Sem markdown, sem explicacao, sem texto antes ou depois. APENAS o JSON.

Para POST UNICO, retorne:
{"template":"TEMPLATE_ID","templateData":{...campos...},"suggestedBackground":"#HEX","suggestedAccentColor":"#HEX"}

Para CARROSSEL (multiplas paginas), retorne:
{"carousel":true,"slides":[{"template":"ID","templateData":{...}},{"template":"ID","templateData":{...}}...],"suggestedBackground":"#HEX","suggestedAccentColor":"#HEX"}

TEMPLATES DISPONIVEIS E SEUS CAMPOS:

1. "testimonial" - Depoimento com print de WhatsApp
{"template":"testimonial","templateData":{"headline":"Headline impactante","highlightWord":"palavra","chatMessages":[{"text":"Mensagem","isUser":false,"senderName":"Nome","senderTag":"mentorada"}],"footerText":"Texto rodape"}}

2. "comparison" - Comparacao lado a lado
{"template":"comparison","templateData":{"headline":"Titulo","subheadline":"Subtitulo bold","leftTitle":"Opcao A","leftSubtitle":"Descricao A","rightTitle":"Opcao B","rightSubtitle":"Descricao B","leftColor":"#EF4444","rightColor":"#16A34A","leftItems":["item1","item2"],"rightItems":["item1","item2"],"footerText":"Rodape"}}

3. "motivational" - Texto motivacional grande
{"template":"motivational","templateData":{"text":"Texto motivacional grande","highlights":[{"word":"palavra destaque","color":"#C5A55A"}],"fontStyle":"serif","fontSize":64,"ctaText":"CTA opcional"}}

4. "quote" - Post estilo rede social
{"template":"quote","templateData":{"tweetText":"Texto do post com quebras de linha","imageUrl":""}}

5. "cta" - Chamada editorial impactante (use {texto} para palavra colorida, *texto* para italico, **texto** para negrito no ctaText)
{"template":"cta","templateData":{"headline":"Alguem com 27 anos de carreira nao desistiu. {E voce?}","bodyText":"","ctaText":"Comente **LIBERDADE** ou me chama no Direct.","highlightColor":"#EF4444","textAlign":"left"}}

6. "storytelling" - Texto narrativo com imagem lateral
{"template":"storytelling","templateData":{"headline":"Headline","bodyText":"Texto narrativo longo","highlightText":"Texto em destaque com barra lateral","highlightStyle":"italic","statNumber":"737 mil","statLabel":"empresas fecharam","footerText":"Frase de impacto","sourceText":"Fonte"}}

7. "data-story" - Dados e estatisticas com imagem
{"template":"data-story","templateData":{"headline":"Headline com dados impactantes","bodyText":"Texto com estatisticas","highlightText":"Texto em italico destaque","sourceText":"IBGE"}}

8. "dark-narrative" - Imagem de fundo escura com texto
{"template":"dark-narrative","templateData":{"headline":"Headline principal grande","midText":"Texto em destaque italico","midSubtext":"Subtexto explicativo","footerText":"Frase de impacto final"}}

REGRAS:
- Para carrossel, use 3-10 slides misturando templates diferentes
- Crie conteudo VIRAL: hooks que param o scroll, storytelling, dados impactantes, CTAs emocionais
- Use frases curtas e impactantes, nunca genericas
- O conteudo deve ser especifico para medicos empreendedores

${context?.nome ? `Medico: ${context.nome}. Especialidade: ${context?.especialidade || 'medicina'}.` : ''}
${context?.persona ? `Persona: ${context.persona}` : ''}
${context?.publicoAlvo ? `Publico-alvo: ${context.publicoAlvo}` : ''}

Solicitacao do usuario: ${message}`

      const autoResult = await model.generateContent(autoPostPrompt)
      const autoResponse = autoResult.response.text()

      if (mentoradoId) {
        await incrementUsage(mentoradoId, false).catch(() => {})
      }

      return NextResponse.json({
        success: true,
        reply: autoResponse,
        model: 'gemini-2.5-flash-lite',
        timestamp: new Date().toISOString(),
      })
    }

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

    // Track chat usage
    if (mentoradoId) {
      await incrementUsage(mentoradoId, false).catch((err) => {
        console.error('[chat-gemini] Failed to track chat usage:', err?.message || err)
      })
    }

    const updatedUsage = mentoradoId ? await getUsage(mentoradoId).catch(() => null) : null

    return NextResponse.json({
      success: true,
      message: aiResponse,
      model: 'gemini-2.5-flash-lite',
      timestamp: new Date().toISOString(),
      usage: updatedUsage ? { ...updatedUsage, limits: MONTHLY_LIMITS } : undefined,
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

// GET: fetch usage for a mentorado
export async function GET(request: NextRequest) {
  const mentoradoId = request.nextUrl.searchParams.get('mentoradoId')
  if (!mentoradoId) {
    return NextResponse.json({ error: 'mentoradoId required' }, { status: 400 })
  }
  const usage = await getUsage(mentoradoId)
  return NextResponse.json({ usage: { ...usage, limits: MONTHLY_LIMITS } })
}
