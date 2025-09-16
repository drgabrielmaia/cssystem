/**
 * Sistema de Análise Inteligente - 100% Local (Zero APIs)
 * Análise avançada de feedback usando NLP básico e machine learning patterns
 */

export interface SentimentAnalysis {
  score: number // -1 a 1
  label: 'muito_negativo' | 'negativo' | 'neutro' | 'positivo' | 'muito_positivo'
  confidence: number // 0 a 1
  emotions: string[]
  urgency: 'baixa' | 'media' | 'alta' | 'critica'
}

export interface ThemeExtraction {
  themes: {
    name: string
    confidence: number
    keywords: string[]
    frequency: number
  }[]
  problems: {
    category: string
    severity: 'baixa' | 'media' | 'alta' | 'critica'
    description: string
    suggestions: string[]
  }[]
  opportunities: {
    area: string
    potential: number
    action: string
  }[]
}

// Dicionários de análise (expandidos e otimizados)
const SENTIMENT_LEXICON = {
  // Muito Positivo (+0.8 a +1.0)
  muito_positivo: {
    palavras: [
      'excelente', 'fantástico', 'perfeito', 'maravilhoso', 'incrível', 'surpreendente',
      'excepcional', 'extraordinário', 'magnífico', 'espetacular', 'sensacional',
      'transformador', 'revolucionário', 'impressionante', 'amo', 'adoro'
    ],
    frases: [
      'superou expectativas', 'mudou minha vida', 'recomendo fortemente',
      'melhor que esperava', 'sem palavras', 'nota mil'
    ],
    peso: 1.0
  },

  // Positivo (+0.3 a +0.7)
  positivo: {
    palavras: [
      'bom', 'ótimo', 'legal', 'gostei', 'satisfeito', 'recomendo', 'útil',
      'eficiente', 'claro', 'fácil', 'prático', 'interessante', 'válido',
      'aproveitei', 'funcionou', 'adequado', 'completo', 'suficiente'
    ],
    frases: [
      'gostei bastante', 'bem explicado', 'muito útil', 'funcionou bem',
      'ficou claro', 'valeu a pena', 'estou satisfeito'
    ],
    peso: 0.6
  },

  // Negativo (-0.3 a -0.7)
  negativo: {
    palavras: [
      'ruim', 'difícil', 'confuso', 'chato', 'cansativo', 'demorado', 'caro',
      'inadequado', 'insuficiente', 'limitado', 'básico', 'superficial',
      'decepcionante', 'falha', 'problema', 'erro', 'bug', 'lento'
    ],
    frases: [
      'não gostei', 'pode melhorar', 'ficou confuso', 'muito difícil',
      'não funcionou', 'faltou algo', 'esperava mais'
    ],
    peso: -0.6
  },

  // Muito Negativo (-0.8 a -1.0)
  muito_negativo: {
    palavras: [
      'péssimo', 'horrível', 'terrível', 'inútil', 'frustrante', 'impossível',
      'desorganizado', 'desastroso', 'prejudicial', 'perda de tempo',
      'enganação', 'mentira', 'furada', 'propaganda', 'odiei'
    ],
    frases: [
      'total perda de tempo', 'não recomendo', 'muito frustrante',
      'completamente inadequado', 'pior que esperava', 'não vale nada'
    ],
    peso: -1.0
  }
}

const EMOTION_PATTERNS = {
  raiva: ['irritado', 'nervoso', 'bravo', 'raiva', 'indignado', 'revoltado'],
  frustração: ['frustrado', 'desanimado', 'cansado', 'desgastante', 'estressante'],
  ansiedade: ['ansioso', 'preocupado', 'inseguro', 'medo', 'incerteza'],
  alegria: ['feliz', 'animado', 'empolgado', 'satisfeito', 'realizado'],
  surpresa: ['surpreso', 'impressionado', 'inesperado', 'surpreendente'],
  confiança: ['confiante', 'seguro', 'determinado', 'motivado', 'capacitado']
}

const THEME_CATEGORIES = {
  'Atendimento e Suporte': {
    keywords: ['atendimento', 'suporte', 'ajuda', 'dúvida', 'resposta', 'contato', 'chat', 'email'],
    weight: 1.0
  },
  'Qualidade do Conteúdo': {
    keywords: ['conteúdo', 'material', 'explicação', 'teoria', 'prática', 'exemplo', 'didático'],
    weight: 0.9
  },
  'Plataforma e Tecnologia': {
    keywords: ['plataforma', 'sistema', 'site', 'app', 'tecnologia', 'bug', 'erro', 'lentidão'],
    weight: 0.8
  },
  'Metodologia de Ensino': {
    keywords: ['metodologia', 'ensino', 'didática', 'pedagogia', 'aula', 'professor'],
    weight: 0.9
  },
  'Organização e Estrutura': {
    keywords: ['organização', 'estrutura', 'cronograma', 'planejamento', 'sequência'],
    weight: 0.7
  },
  'Preço e Valor': {
    keywords: ['preço', 'valor', 'custo', 'investimento', 'caro', 'barato', 'vale', 'pena'],
    weight: 0.8
  },
  'Networking e Comunidade': {
    keywords: ['networking', 'comunidade', 'colegas', 'grupo', 'relacionamento', 'contatos'],
    weight: 0.6
  },
  'Resultados e ROI': {
    keywords: ['resultado', 'retorno', 'lucro', 'faturamento', 'crescimento', 'melhoria'],
    weight: 1.0
  }
}

const PROBLEM_SOLUTIONS = {
  'Atendimento Lento': [
    'Implementar chat automático para dúvidas frequentes',
    'Criar FAQ mais completo e visível',
    'Definir SLA de resposta de até 24h',
    'Treinar equipe para respostas mais ágeis'
  ],
  'Conteúdo Superficial': [
    'Adicionar casos práticos reais',
    'Criar exercícios hands-on',
    'Incluir mais exemplos detalhados',
    'Desenvolver conteúdo avançado opcional'
  ],
  'Plataforma com Problemas': [
    'Realizar auditoria técnica completa',
    'Implementar monitoramento de performance',
    'Criar versão mobile otimizada',
    'Fazer backup e redundância de servidores'
  ],
  'Falta de Organização': [
    'Criar cronograma visual claro',
    'Implementar sistema de progresso',
    'Enviar lembretes automáticos',
    'Reorganizar estrutura de módulos'
  ]
}

/**
 * Análise de Sentimento Avançada
 */
export function analyzeSentiment(text: string): SentimentAnalysis {
  if (!text || text.trim().length === 0) {
    return {
      score: 0,
      label: 'neutro',
      confidence: 0,
      emotions: [],
      urgency: 'baixa'
    }
  }

  const normalizedText = text.toLowerCase()
  let score = 0
  let totalWeight = 0
  const emotions: string[] = []

  // Análise por palavras e frases
  Object.entries(SENTIMENT_LEXICON).forEach(([category, data]) => {
    // Verificar palavras
    data.palavras.forEach(palavra => {
      const regex = new RegExp(`\\b${palavra}\\b`, 'gi')
      const matches = normalizedText.match(regex) || []
      if (matches.length > 0) {
        score += data.peso * matches.length
        totalWeight += matches.length
      }
    })

    // Verificar frases
    data.frases.forEach(frase => {
      if (normalizedText.includes(frase)) {
        score += data.peso * 2 // Frases têm peso dobrado
        totalWeight += 2
      }
    })
  })

  // Detectar emoções
  Object.entries(EMOTION_PATTERNS).forEach(([emotion, patterns]) => {
    const hasEmotion = patterns.some(pattern => 
      normalizedText.includes(pattern.toLowerCase())
    )
    if (hasEmotion) {
      emotions.push(emotion)
    }
  })

  // Calcular score final
  const finalScore = totalWeight > 0 ? Math.max(-1, Math.min(1, score / totalWeight)) : 0
  
  // Determinar label
  let label: SentimentAnalysis['label']
  if (finalScore >= 0.7) label = 'muito_positivo'
  else if (finalScore >= 0.3) label = 'positivo'
  else if (finalScore >= -0.3) label = 'neutro'
  else if (finalScore >= -0.7) label = 'negativo'
  else label = 'muito_negativo'

  // Calcular urgência
  let urgency: SentimentAnalysis['urgency'] = 'baixa'
  if (finalScore <= -0.7 || emotions.includes('raiva')) urgency = 'critica'
  else if (finalScore <= -0.4 || emotions.includes('frustração')) urgency = 'alta'
  else if (finalScore <= -0.1) urgency = 'media'

  // Calcular confiança
  const confidence = Math.min(1, totalWeight / (text.split(' ').length * 0.3))

  return {
    score: finalScore,
    label,
    confidence,
    emotions,
    urgency
  }
}

/**
 * Extração Inteligente de Temas
 */
export function extractThemes(texts: string[]): ThemeExtraction {
  const themes: { [key: string]: { count: number, keywords: Set<string> } } = {}
  const problems: ThemeExtraction['problems'] = []
  const opportunities: ThemeExtraction['opportunities'] = []

  texts.forEach(text => {
    if (!text) return
    
    const normalizedText = text.toLowerCase()
    
    // Detectar temas
    Object.entries(THEME_CATEGORIES).forEach(([themeName, themeData]) => {
      const matchedKeywords = themeData.keywords.filter(keyword => 
        normalizedText.includes(keyword.toLowerCase())
      )
      
      if (matchedKeywords.length > 0) {
        if (!themes[themeName]) {
          themes[themeName] = { count: 0, keywords: new Set() }
        }
        themes[themeName].count += matchedKeywords.length * themeData.weight
        matchedKeywords.forEach(kw => themes[themeName].keywords.add(kw))
      }
    })

    // Detectar problemas específicos
    const sentiment = analyzeSentiment(text)
    if (sentiment.score < -0.3) {
      // Identificar tipo de problema
      if (normalizedText.includes('atendimento') || normalizedText.includes('suporte')) {
        problems.push({
          category: 'Atendimento e Suporte',
          severity: sentiment.urgency as any,
          description: 'Problemas reportados com atendimento ao cliente',
          suggestions: PROBLEM_SOLUTIONS['Atendimento Lento']
        })
      }
      
      if (normalizedText.includes('conteúdo') || normalizedText.includes('material')) {
        problems.push({
          category: 'Qualidade do Conteúdo',
          severity: sentiment.urgency as any,
          description: 'Insatisfação com qualidade do conteúdo',
          suggestions: PROBLEM_SOLUTIONS['Conteúdo Superficial']
        })
      }
    }

    // Detectar oportunidades
    if (sentiment.score > 0.5) {
      Object.entries(THEME_CATEGORIES).forEach(([themeName, themeData]) => {
        const hasTheme = themeData.keywords.some(kw => 
          normalizedText.includes(kw.toLowerCase())
        )
        if (hasTheme) {
          opportunities.push({
            area: themeName,
            potential: sentiment.score,
            action: `Expandir e destacar aspectos positivos em ${themeName}`
          })
        }
      })
    }
  })

  // Converter para formato final
  const finalThemes = Object.entries(themes).map(([name, data]) => ({
    name,
    confidence: Math.min(1, data.count / texts.length),
    keywords: Array.from(data.keywords),
    frequency: data.count
  })).sort((a, b) => b.frequency - a.frequency)

  return {
    themes: finalThemes,
    problems: Array.from(new Map(problems.map(p => [p.category, p])).values()),
    opportunities: Array.from(new Map(opportunities.map(o => [o.area, o])).values())
  }
}

/**
 * Análise Completa de Feedback
 */
/**
 * Análise MEGA AVANÇADA de Resposta Completa
 */
export function analyzeCompleteResponse(response: any) {
  const respostas = response.resposta_json?.respostas || {}
  const allText = Object.values(respostas).filter(val => typeof val === 'string').join(' ')
  
  const sentiment = analyzeSentiment(allText)
  const npsScore = parseInt(respostas.nota_nps) || 0
  
  // Análise de consistência NPS vs Sentiment
  const expectedSentiment = npsScore <= 6 ? 'negativo' : npsScore <= 8 ? 'neutro' : 'positivo'
  const isConsistent = (
    (sentiment.label.includes('negativo') && expectedSentiment === 'negativo') ||
    (sentiment.label === 'neutro' && expectedSentiment === 'neutro') ||
    (sentiment.label.includes('positivo') && expectedSentiment === 'positivo')
  )

  // ANÁLISES AVANÇADAS EXTRAS
  const personaAnalysis = analyzePersona(respostas, sentiment, npsScore)
  const riskScore = calculateRiskScore(sentiment, npsScore, respostas)
  const opportunityScore = calculateOpportunityScore(sentiment, npsScore, respostas)
  const textComplexity = analyzeTextComplexity(allText)
  const emotionalIntelligence = analyzeEmotionalIntelligence(allText)
  const satisfactionPrediction = predictFutureSatisfaction(sentiment, npsScore, respostas)

  return {
    npsScore,
    sentiment,
    isConsistent,
    keyInsights: generateKeyInsights(respostas, sentiment, npsScore),
    actionableItems: generateActionableItems(sentiment, npsScore, respostas),
    // NOVAS ANÁLISES AVANÇADAS
    personaAnalysis,
    riskScore,
    opportunityScore,
    textComplexity,
    emotionalIntelligence,
    satisfactionPrediction,
    communicationStyle: analyzeCommunicationStyle(allText),
    priorityLevel: calculatePriorityLevel(sentiment, npsScore, riskScore)
  }
}

/**
 * NOVA: Análise Avançada de Persona do Cliente
 */
function analyzePersona(respostas: any, sentiment: any, npsScore: number) {
  const allText = Object.values(respostas).join(' ').toLowerCase()
  const scores = {
    analitico: 0,
    dinamico: 0,
    colaborativo: 0,
    conservador: 0,
    inovador: 0,
    pratico: 0
  }
  
  // 1. ANALÍTICO/DETALHISTA - Busca dados, explicações, evidências
  const analiticKeywords = [
    'dados', 'estatística', 'comprovado', 'evidência', 'detalhado', 'explicação',
    'entender', 'análise', 'estudar', 'pesquisar', 'método', 'científico',
    'prova', 'resultado', 'métricas', 'roi', 'investimento', 'retorno'
  ]
  scores.analitico += analiticKeywords.filter(k => allText.includes(k)).length * 2
  if (allText.length > 200) scores.analitico += 3 // Textos longos
  if (allText.includes('porque') || allText.includes('como funciona')) scores.analitico += 4
  
  // 2. DINÂMICO/IMPACIENTE - Quer velocidade, resultados rápidos
  const dinamicoKeywords = [
    'rápido', 'urgente', 'logo', 'já', 'agora', 'imediato', 'direto',
    'prático', 'objetivo', 'foco', 'eficiente', 'otimizar', 'acelerar',
    'sem enrolação', 'vai ao ponto', 'resultado', 'ação'
  ]
  scores.dinamico += dinamicoKeywords.filter(k => allText.includes(k)).length * 2
  if (allText.length < 100) scores.dinamico += 3 // Respostas concisas
  if (allText.includes('perda de tempo') || allText.includes('demorado')) scores.dinamico += 5
  
  // 3. COLABORATIVO/SOCIAL - Valoriza relacionamentos, comunidade
  const colaborativoKeywords = [
    'relacionamento', 'equipe', 'comunidade', 'networking', 'parceria',
    'grupo', 'compartilhar', 'trocar experiência', 'mentoria', 'apoio',
    'conexão', 'amigos', 'colegas', 'social', 'juntos', 'coletivo'
  ]
  scores.colaborativo += colaborativoKeywords.filter(k => allText.includes(k)).length * 2
  if (allText.includes('isolado') || allText.includes('sozinho')) scores.colaborativo += 4
  
  // 4. CONSERVADOR/TRADICIONAL - Prefere métodos estabelecidos
  const conservadorKeywords = [
    'tradicional', 'estabelecido', 'comprovado', 'seguro', 'estável',
    'experiência', 'histórico', 'confiança', 'reputação', 'sólido',
    'consolidado', 'tempo de mercado', 'referência'
  ]
  scores.conservador += conservadorKeywords.filter(k => allText.includes(k)).length * 2
  if (allText.includes('risco') || allText.includes('incerteza')) scores.conservador += 3
  
  // 5. INOVADOR/EARLY ADOPTER - Gosta de novidades, tecnologia
  const inovadorKeywords = [
    'inovador', 'novo', 'moderno', 'tecnologia', 'digital', 'futuro',
    'tendência', 'disruptivo', 'revolucionário', 'diferente', 'único',
    'vanguarda', 'pioneiro', 'beta', 'experimental'
  ]
  scores.inovador += inovadorKeywords.filter(k => allText.includes(k)).length * 2
  if (allText.includes('antiquado') || allText.includes('ultrapassado')) scores.inovador += 4
  
  // 6. PRÁTICO/APLICADO - Foca em implementação real
  const praticoKeywords = [
    'prático', 'aplicar', 'implementar', 'usar', 'real', 'concreto',
    'funciona', 'útil', 'aplicável', 'executar', 'fazer', 'ação',
    'hands-on', 'mão na massa', 'dia a dia', 'rotina'
  ]
  scores.pratico += praticoKeywords.filter(k => allText.includes(k)).length * 2
  if (allText.includes('teórico') || allText.includes('abstrato')) scores.pratico += 3
  
  // Ajustar por NPS e Sentiment
  if (npsScore >= 9) {
    if (sentiment.emotions.includes('alegria')) scores.colaborativo += 3
    if (sentiment.emotions.includes('confiança')) scores.conservador += 2
  }
  if (npsScore <= 6) {
    scores.dinamico += 2 // Pessoas insatisfeitas querem soluções rápidas
    if (sentiment.emotions.includes('frustração')) scores.analitico += 2
  }
  
  // Determinar persona dominante
  const maxScore = Math.max(...Object.values(scores))
  let persona = 'Equilibrado'
  let characteristics = []
  let preferences = []
  let communicationStyle = ''
  
  if (maxScore < 5) {
    persona = 'Perfil Neutro'
    characteristics = ['Comportamento equilibrado', 'Sem preferências marcantes']
    preferences = ['Comunicação padrão', 'Abordagem balanceada']
    communicationStyle = 'Formal e respeitoso'
  } else {
    const dominantTrait = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0]
    
    switch (dominantTrait) {
      case 'analitico':
        persona = 'Analítico/Detalhista'
        characteristics = [
          'Busca evidências e comprovação',
          'Valoriza dados e estatísticas',
          'Toma decisões baseadas em fatos',
          'Questiona metodologias e processos'
        ]
        preferences = [
          'Documentação técnica detalhada',
          'Cases de sucesso com métricas',
          'Demonstrações com dados reais',
          'Tempo para análise e avaliação'
        ]
        communicationStyle = 'Técnico com evidências'
        break
        
      case 'dinamico':
        persona = 'Dinâmico/Impaciente'
        characteristics = [
          'Foca em resultados rápidos',
          'Prefere ação à análise prolongada',
          'Valoriza eficiência e praticidade',
          'Tem senso de urgência elevado'
        ]
        preferences = [
          'Comunicação direta e objetiva',
          'Implementação rápida',
          'Resumos executivos',
          'Soluções plug-and-play'
        ]
        communicationStyle = 'Direto e conciso'
        break
        
      case 'colaborativo':
        persona = 'Colaborativo/Social'
        characteristics = [
          'Valoriza relacionamentos interpessoais',
          'Busca consenso e participação',
          'Aprende melhor em grupo',
          'Influenciado por recomendações sociais'
        ]
        preferences = [
          'Atividades em grupo',
          'Mentoria e networking',
          'Testimoniais de pares',
          'Comunidades e fóruns'
        ]
        communicationStyle = 'Caloroso e pessoal'
        break
        
      case 'conservador':
        persona = 'Conservador/Tradicional'
        characteristics = [
          'Prefere métodos estabelecidos',
          'Busca segurança e estabilidade',
          'Valoriza histórico e reputação',
          'Avesso a riscos desnecessários'
        ]
        preferences = [
          'Referências sólidas do mercado',
          'Implementação gradual',
          'Suporte técnico robusto',
          'Garantias e seguros'
        ]
        communicationStyle = 'Formal e institucional'
        break
        
      case 'inovador':
        persona = 'Inovador/Early Adopter'
        characteristics = [
          'Busca sempre novidades',
          'Gosta de ser pioneiro',
          'Abraça tecnologias emergentes',
          'Influenciador de tendências'
        ]
        preferences = [
          'Funcionalidades exclusivas',
          'Beta testing e previews',
          'Tecnologias de ponta',
          'Reconhecimento como inovador'
        ]
        communicationStyle = 'Moderno e visionário'
        break
        
      case 'pratico':
        persona = 'Prático/Aplicado'
        characteristics = [
          'Foca na aplicação real',
          'Valoriza utilidade imediata',
          'Prefere exemplos concretos',
          'Orientado para execução'
        ]
        preferences = [
          'Tutoriais passo-a-passo',
          'Templates e ferramentas prontas',
          'Casos práticos reais',
          'Implementação hands-on'
        ]
        communicationStyle = 'Prático e aplicado'
        break
    }
  }

  return { 
    persona, 
    characteristics, 
    preferences, 
    communicationStyle,
    scores,
    dominantTrait: Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] || 'neutro'
  }
}

/**
 * NOVA: Cálculo de Score de Risco de Churn (baseado em fatores reais)
 */
function calculateRiskScore(sentiment: any, npsScore: number, respostas: any): number {
  let riskScore = 0
  const reasons: string[] = []
  
  // 1. NPS Score Analysis (peso 35%) - Principal indicador
  if (npsScore <= 4) {
    riskScore += 35
    reasons.push(`NPS crítico (${npsScore}/10) - Cliente extremamente insatisfeito`)
  } else if (npsScore <= 6) {
    riskScore += 25
    reasons.push(`NPS baixo (${npsScore}/10) - Cliente detrator`)
  } else if (npsScore <= 7) {
    riskScore += 10
    reasons.push(`NPS neutro (${npsScore}/10) - Cliente passivo`)
  }
  
  // 2. Sentiment Analysis (peso 25%) - Confirma o NPS
  if (sentiment.label === 'muito_negativo') {
    riskScore += 25
    reasons.push('Sentimento muito negativo nas respostas')
  } else if (sentiment.label === 'negativo') {
    riskScore += 20
    reasons.push('Sentimento negativo nas respostas')
  } else if (sentiment.label === 'neutro' && npsScore <= 7) {
    riskScore += 10
    reasons.push('Neutralidade combinada com NPS baixo')
  }
  
  // 3. Value Perception Issues (peso 20%)
  const allText = Object.values(respostas).join(' ').toLowerCase()
  const valueIssues = [
    'caro', 'preço alto', 'sem valor', 'não vale', 'perda de dinheiro', 'investimento perdido',
    'expectativas não atendidas', 'prometeu mais', 'decepcionado', 'esperava mais'
  ]
  const foundValueIssues = valueIssues.filter(issue => allText.includes(issue))
  if (foundValueIssues.length > 0) {
    riskScore += foundValueIssues.length * 7
    reasons.push(`Percepção de baixo valor: ${foundValueIssues.slice(0, 2).join(', ')}`)
  }
  
  // 4. Experience & Support Issues (peso 15%)
  const experienceIssues = [
    'atendimento ruim', 'suporte demorado', 'não respondem', 'ignorado',
    'difícil de usar', 'complicado', 'confuso', 'perdido', 'sem direção'
  ]
  const foundExperienceIssues = experienceIssues.filter(issue => allText.includes(issue))
  if (foundExperienceIssues.length > 0) {
    riskScore += foundExperienceIssues.length * 5
    reasons.push(`Problemas de experiência: ${foundExperienceIssues.slice(0, 2).join(', ')}`)
  }
  
  // 5. Intent to Leave Signals (peso 5% mas crítico)
  const churnSignals = [
    'cancelar', 'desistir', 'parar', 'sair', 'abandonar', 'não vou continuar',
    'procurando alternativa', 'outros cursos', 'concorrente'
  ]
  const foundChurnSignals = churnSignals.filter(signal => allText.includes(signal))
  if (foundChurnSignals.length > 0) {
    riskScore += 20 // Alto impacto mesmo com peso baixo
    reasons.push(`Sinais claros de intenção de cancelamento: ${foundChurnSignals.join(', ')}`)
  }
  
  // Adicionar as razões como propriedade do resultado (para debug/explicação)
  ;(calculateRiskScore as any).lastReasons = reasons
  
  return Math.min(100, Math.max(0, riskScore))
}

/**
 * NOVA: Score de Oportunidade (Upsell/Cross-sell)
 */
function calculateOpportunityScore(sentiment: any, npsScore: number, respostas: any): number {
  let opportunityScore = 0
  
  // Base do NPS (peso 40%)
  if (npsScore >= 9) opportunityScore += 40
  else if (npsScore >= 7) opportunityScore += 25
  
  // Sentimento (peso 30%)
  if (sentiment.label === 'muito_positivo') opportunityScore += 30
  else if (sentiment.label === 'positivo') opportunityScore += 20
  
  // Indicadores de engajamento (peso 30%)
  const allText = Object.values(respostas).join(' ').toLowerCase()
  const opportunityKeywords = ['mais', 'expandir', 'crescer', 'próximo', 'avançado', 'continuar']
  const foundOpportunities = opportunityKeywords.filter(keyword => allText.includes(keyword))
  opportunityScore += foundOpportunities.length * 10
  
  return Math.min(100, Math.max(0, opportunityScore))
}

/**
 * NOVA: Análise de Complexidade do Texto
 */
function analyzeTextComplexity(text: string) {
  const words = text.split(' ').filter(w => w.length > 0)
  const avgWordLength = words.reduce((acc, word) => acc + word.length, 0) / words.length
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const avgSentenceLength = words.length / sentences.length
  
  let complexity = 'Simples'
  if (avgWordLength > 6 && avgSentenceLength > 15) complexity = 'Complexa'
  else if (avgWordLength > 5 || avgSentenceLength > 12) complexity = 'Moderada'
  
  return {
    complexity,
    avgWordLength: Math.round(avgWordLength * 10) / 10,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    totalWords: words.length,
    totalSentences: sentences.length
  }
}

/**
 * NOVA: Inteligência Emocional do Feedback
 */
function analyzeEmotionalIntelligence(text: string) {
  const emotionalIndicators = {
    autoconhecimento: ['percebo', 'sinto', 'reconheço', 'consciente'],
    autocontrole: ['controlo', 'mantenho', 'equilibrio', 'calma'],
    empatia: ['entendo', 'compreendo', 'vejo o lado', 'perspectiva'],
    habilidadesSociais: ['comunicação', 'relacionamento', 'feedback', 'diálogo']
  }
  
  const textLower = text.toLowerCase()
  const scores = {}
  
  Object.entries(emotionalIndicators).forEach(([trait, keywords]) => {
    const matchCount = keywords.filter(keyword => textLower.includes(keyword)).length
    scores[trait] = Math.min(5, matchCount * 2)
  })
  
  const averageScore = Object.values(scores).reduce((a: number, b: number) => a + b, 0) / 4
  
  return {
    scores,
    averageScore: Math.round(averageScore * 10) / 10,
    level: averageScore >= 3.5 ? 'Alto' : averageScore >= 2 ? 'Médio' : 'Baixo'
  }
}

/**
 * NOVA: Predição de Satisfação Futura
 */
function predictFutureSatisfaction(sentiment: any, npsScore: number, respostas: any) {
  const allText = Object.values(respostas).join(' ').toLowerCase()
  
  let predictionScore = npsScore
  
  // Ajustes baseados no sentimento
  if (sentiment.label === 'muito_positivo') predictionScore += 1
  else if (sentiment.label === 'muito_negativo') predictionScore -= 2
  else if (sentiment.label === 'negativo') predictionScore -= 1
  
  // Indicadores de tendência
  const positiveIndicators = ['melhorando', 'evoluindo', 'crescendo', 'satisfeito']
  const negativeIndicators = ['piorando', 'decepcionado', 'frustrante', 'difícil']
  
  const positives = positiveIndicators.filter(ind => allText.includes(ind)).length
  const negatives = negativeIndicators.filter(ind => allText.includes(ind)).length
  
  predictionScore += positives * 0.5 - negatives * 0.7
  predictionScore = Math.min(10, Math.max(0, predictionScore))
  
  let trend = 'Estável'
  if (predictionScore > npsScore + 0.5) trend = 'Crescente'
  else if (predictionScore < npsScore - 0.5) trend = 'Decrescente'
  
  return {
    predictedNPS: Math.round(predictionScore * 10) / 10,
    trend,
    confidence: Math.min(1, Math.abs(predictionScore - npsScore) < 1 ? 0.9 : 0.6)
  }
}

/**
 * NOVA: Análise Avançada de Estilo de Comunicação
 */
function analyzeCommunicationStyle(text: string) {
  const textLower = text.toLowerCase()
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
  
  const scores = {
    formal: 0,
    informal: 0,
    técnico: 0,
    emocional: 0,
    assertivo: 0,
    colaborativo: 0,
    diplomático: 0,
    direto: 0
  }
  
  // 1. FORMAL - Linguagem protocolar, respeitosa
  const formalPatterns = [
    'senhor', 'senhora', 'prezado', 'caro', 'cordialmente', 'atenciosamente',
    'gostaria', 'poderia', 'solicito', 'venho por meio desta',
    'agradeço', 'desde já', 'conforme', 'mediante', 'outrossim'
  ]
  scores.formal += formalPatterns.filter(p => textLower.includes(p)).length * 3
  if (avgSentenceLength > 80) scores.formal += 2 // Frases longas
  if (textLower.includes('vossa') || textLower.includes('dignou-se')) scores.formal += 5
  
  // 2. INFORMAL - Linguagem casual, descontraída
  const informalPatterns = [
    'cara', 'galera', 'pessoal', 'kkk', 'rs', 'hehe', 'valeu', 'beleza',
    'oi', 'opa', 'eae', 'tmj', 'blz', 'vlw', 'kra', 'mano', 'brother',
    'né', 'tá', 'pô', 'rapaz', 'gente', 'uai'
  ]
  scores.informal += informalPatterns.filter(p => textLower.includes(p)).length * 3
  if (avgSentenceLength < 40) scores.informal += 2 // Frases curtas
  if (textLower.includes('😂') || textLower.includes('😎')) scores.informal += 4
  
  // 3. TÉCNICO - Jargões, terminologia específica
  const técnicoPatterns = [
    'implementar', 'otimizar', 'configurar', 'desenvolver', 'metodologia',
    'framework', 'processo', 'sistema', 'protocolo', 'algoritmo',
    'métricas', 'kpi', 'roi', 'analytics', 'dashboard', 'workflow',
    'benchmark', 'performance', 'efficiency', 'scalability'
  ]
  scores.técnico += técnicoPatterns.filter(p => textLower.includes(p)).length * 2
  if (textLower.includes('backend') || textLower.includes('api')) scores.técnico += 3
  
  // 4. EMOCIONAL - Expressão de sentimentos
  const emocionalPatterns = [
    'sinto', 'senti', 'emocionado', 'emocionada', 'feliz', 'triste', 'ansioso',
    'preocupado', 'animado', 'empolgado', 'frustrado', 'decepcionado',
    'grato', 'satisfeito', 'realizado', 'orgulhoso', 'nervoso', 'tranquilo',
    'coração', 'alma', 'paixão', 'amor', 'ódio', 'medo'
  ]
  scores.emocional += emocionalPatterns.filter(p => textLower.includes(p)).length * 3
  if (textLower.includes('lágrimas') || textLower.includes('chorar')) scores.emocional += 4
  
  // 5. ASSERTIVO - Tom decidido, firme
  const assertivoPatterns = [
    'preciso', 'necessário', 'importante', 'urgente', 'definitivamente',
    'certamente', 'obviamente', 'claramente', 'sem dúvida', 'tenho certeza',
    'deve', 'devemos', 'tem que', 'é fundamental', 'é crucial', 'exijo',
    'determino', 'decido', 'afirmo', 'garanto'
  ]
  scores.assertivo += assertivoPatterns.filter(p => textLower.includes(p)).length * 3
  if (textLower.includes('não aceito') || textLower.includes('inaceitável')) scores.assertivo += 5
  
  // 6. COLABORATIVO - Foco em trabalho em equipe
  const colaborativoPatterns = [
    'juntos', 'equipe', 'parceria', 'apoio', 'colaboração', 'cooperação',
    'vamos', 'podemos', 'nosso', 'nossa', 'compartilhar', 'dividir',
    'ajudar', 'auxiliar', 'contribuir', 'somar', 'unir', 'conectar'
  ]
  scores.colaborativo += colaborativoPatterns.filter(p => textLower.includes(p)).length * 3
  if (textLower.includes('todos juntos') || textLower.includes('mão na massa')) scores.colaborativo += 4
  
  // 7. DIPLOMÁTICO - Evita conflito, mediador
  const diplomáticoPatterns = [
    'talvez', 'possivelmente', 'pode ser', 'acredito que', 'penso que',
    'na minha opinião', 'creio', 'imagino', 'suponho', 'presumo',
    'compreendo', 'entendo', 'respeito', 'considero', 'avalio',
    'seria interessante', 'poderíamos considerar'
  ]
  scores.diplomático += diplomáticoPatterns.filter(p => textLower.includes(p)).length * 2
  if (textLower.includes('todos os lados') || textLower.includes('meio termo')) scores.diplomático += 4
  
  // 8. DIRETO - Va ao ponto, sem rodeios
  const diretoPatterns = [
    'simples', 'direto', 'claro', 'objetivo', 'resumindo', 'em suma',
    'basicamente', 'na real', 'sem enrolação', 'vai ao ponto', 'foco',
    'rápido', 'agora', 'já', 'pare', 'chega', 'basta', 'fim'
  ]
  scores.direto += diretoPatterns.filter(p => textLower.includes(p)).length * 3
  if (avgSentenceLength < 30) scores.direto += 3 // Muito conciso
  if (textLower.includes('sem tempo') || textLower.includes('sem paciência')) scores.direto += 5
  
  // Análise estrutural adicional
  const questionMarks = (text.match(/\?/g) || []).length
  const exclamationMarks = (text.match(/!/g) || []).length
  const capitalWords = (text.match(/[A-Z]{2,}/g) || []).length
  
  if (questionMarks > 2) scores.colaborativo += 2 // Muitas perguntas = engajamento
  if (exclamationMarks > 1) scores.emocional += 2 // Exclamações = emotividade  
  if (capitalWords > 0) scores.assertivo += 3 // CAPS = assertividade
  
  // Determinar estilo dominante
  const maxScore = Math.max(...Object.values(scores))
  const dominantStyle = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] || 'neutro'
  
  let description = ''
  let recommendations = []
  
  switch (dominantStyle) {
    case 'formal':
      description = 'Linguagem protocolar e respeitosa'
      recommendations = [
        'Manter formalidade nas respostas',
        'Usar tratamento respeitoso (Senhor/Senhora)',
        'Estruturar comunicação de forma organizada'
      ]
      break
    case 'informal':
      description = 'Comunicação descontraída e casual'
      recommendations = [
        'Usar linguagem mais próxima e amigável',
        'Incluir elementos de descontração',
        'Ser mais direto e menos formal'
      ]
      break
    case 'técnico':
      description = 'Foco em aspectos técnicos e metodológicos'
      recommendations = [
        'Fornecer detalhes técnicos específicos',
        'Usar terminologia adequada do setor',
        'Apresentar dados e métricas'
      ]
      break
    case 'emocional':
      description = 'Expressa sentimentos e experiências pessoais'
      recommendations = [
        'Demonstrar empatia e compreensão',
        'Reconhecer o aspecto emocional',
        'Personalizar a abordagem'
      ]
      break
    case 'assertivo':
      description = 'Tom decidido e direto nas colocações'
      recommendations = [
        'Ser claro e objetivo nas respostas',
        'Apresentar soluções definidas',
        'Evitar ambiguidades'
      ]
      break
    case 'colaborativo':
      description = 'Busca participação e trabalho em equipe'
      recommendations = [
        'Envolver em atividades de grupo',
        'Propor soluções colaborativas',
        'Destacar benefícios coletivos'
      ]
      break
    case 'diplomático':
      description = 'Evita conflitos e busca consenso'
      recommendations = [
        'Apresentar múltiplas opções',
        'Usar abordagem consultiva',
        'Respeitar diferentes perspectivas'
      ]
      break
    case 'direto':
      description = 'Prefere comunicação objetiva e concisa'
      recommendations = [
        'Ser breve e ir direto ao ponto',
        'Usar bullet points e resumos',
        'Evitar explicações desnecessárias'
      ]
      break
    default:
      description = 'Estilo equilibrado de comunicação'
      recommendations = ['Manter abordagem padrão e respeitosa']
  }
  
  return {
    primaryStyle: dominantStyle,
    description,
    recommendations,
    scores,
    confidence: maxScore > 5 ? 'alta' : maxScore > 2 ? 'média' : 'baixa',
    textMetrics: {
      avgSentenceLength,
      questionMarks,
      exclamationMarks,
      capitalWords,
      totalWords: text.split(/\s+/).length
    }
  }
}

/**
 * NOVA: Nível de Prioridade de Atendimento
 */
function calculatePriorityLevel(sentiment: any, npsScore: number, riskScore: number): string {
  if (riskScore >= 70 || npsScore <= 4) return 'CRÍTICA'
  if (riskScore >= 50 || npsScore <= 6) return 'ALTA'
  if (riskScore >= 30 || npsScore <= 8) return 'MÉDIA'
  return 'BAIXA'
}

function generateKeyInsights(respostas: any, sentiment: SentimentAnalysis, npsScore: number) {
  const insights = []
  
  if (npsScore <= 6 && sentiment.label.includes('positivo')) {
    insights.push('⚠️ Inconsistência: NPS baixo mas sentimento positivo - investigar mais')
  }
  
  if (npsScore >= 9 && sentiment.label.includes('negativo')) {
    insights.push('⚠️ Inconsistência: NPS alto mas sentimento negativo - possível ironia')
  }
  
  if (sentiment.emotions.includes('frustração')) {
    insights.push('😤 Cliente demonstra frustração - prioridade alta para contato')
  }
  
  if (sentiment.emotions.includes('alegria') && npsScore >= 9) {
    insights.push('🎉 Cliente extremamente satisfeito - potencial promotor ativo')
  }

  return insights
}

function generateActionableItems(sentiment: SentimentAnalysis, npsScore: number, respostas: any) {
  const actions = []
  
  if (sentiment.urgency === 'critica') {
    actions.push('🚨 URGENTE: Contato imediato necessário')
  }
  
  if (npsScore <= 6) {
    actions.push('📞 Agendar call de feedback detalhado')
    actions.push('🔍 Investigar pontos de melhoria específicos')
  }
  
  if (npsScore >= 9 && respostas.autoriza_depoimento === 'sim') {
    actions.push('📝 Solicitar depoimento detalhado para marketing')
    actions.push('🤝 Convidar para ser case de sucesso')
  }
  
  if (sentiment.score > 0.5) {
    actions.push('⭐ Potencial para indicações - oferecer programa de afiliados')
  }

  return actions
}