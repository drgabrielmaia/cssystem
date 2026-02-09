// Script para testar dados de qualificação de médicos
// Execute: node test-doctor-form.js

const testQualificationData = {
  // Dados básicos
  nome_completo: 'Dr. João Silva',
  email: 'joao.silva@gmail.com',
  whatsapp: '(11) 99999-9999',
  
  // Contexto profissional
  principal_fonte_renda: 'consultorio',
  plantoes_por_semana: '1-2',
  tempo_formado: '5-10_anos',
  
  // Realidade financeira
  renda_mensal: '30-60k',
  dependencia_horas: 'menos_metade',
  
  // Dor e insatisfação
  o_que_mais_incomoda: 'Falta de tempo para família e dependência de plantões',
  visao_3_anos: 'Quero ter um consultório próspero e trabalhar menos horas',
  
  // Momento e ambição
  ja_tentou_consultorio: 'sozinho',
  objetivo_principal: 'liberdade',
  
  // Capacidade de investimento
  condicoes_investir: 'sim',
  estilo_decisao: 'analisa',
  
  // Comprometimento
  por_que_agora: 'Estou cansado da correria dos plantões e quero mais qualidade de vida'
}

// Função de scoring (replicada do componente)
function calculateScore(data) {
  let totalScore = 0

  // Contexto Profissional (25 pontos)
  const fonteRendaScores = {
    'consultorio': 25,
    'misto': 20,
    'convenios': 15,
    'plantao': 10,
    'sus': 5
  }
  totalScore += fonteRendaScores[data.principal_fonte_renda] || 0

  // Tempo formado (15 pontos)
  const tempoFormadoScores = {
    '+10_anos': 15,
    '5-10_anos': 12,
    '2-5_anos': 8,
    '<2_anos': 5
  }
  totalScore += tempoFormadoScores[data.tempo_formado] || 0

  // Renda mensal (20 pontos)
  const rendaScores = {
    'acima_60k': 20,
    '30-60k': 15,
    '15-30k': 10,
    'ate_15k': 5
  }
  totalScore += rendaScores[data.renda_mensal] || 0

  // Experiência com consultório (15 pontos)
  const consultorioScores = {
    'ja_tem_algo': 15,
    'curso_mentoria': 12,
    'sozinho': 8,
    'nao': 5
  }
  totalScore += consultorioScores[data.ja_tentou_consultorio] || 0

  // Capacidade de investimento (25 pontos)
  const investimentoScores = {
    'sim': 25,
    'sim_planejamento': 15,
    'nao': 0
  }
  totalScore += investimentoScores[data.condicoes_investir] || 0

  // Determinar temperatura
  let temperature
  if (totalScore >= 80 || data.condicoes_investir === 'sim') {
    temperature = 'quente'
  } else if (totalScore >= 50) {
    temperature = 'morno'
  } else {
    temperature = 'frio'
  }

  return { score: totalScore, temperature }
}

// Testar o scoring
console.log('🏥 TESTE: Sistema de Qualificação para Médicos')
console.log('=' * 50)
console.log()

const result = calculateScore(testQualificationData)

console.log('📊 DADOS DE ENTRADA:')
console.log(`Nome: ${testQualificationData.nome_completo}`)
console.log(`Email: ${testQualificationData.email}`)
console.log(`WhatsApp: ${testQualificationData.whatsapp}`)
console.log()

console.log('💼 CONTEXTO PROFISSIONAL:')
console.log(`Principal fonte de renda: ${testQualificationData.principal_fonte_renda}`)
console.log(`Plantões por semana: ${testQualificationData.plantoes_por_semana}`)
console.log(`Tempo de formado: ${testQualificationData.tempo_formado}`)
console.log()

console.log('💰 REALIDADE FINANCEIRA:')
console.log(`Renda mensal: ${testQualificationData.renda_mensal}`)
console.log(`Dependência de horas: ${testQualificationData.dependencia_horas}`)
console.log()

console.log('🎯 OBJETIVOS E MOTIVAÇÃO:')
console.log(`Já tentou consultório: ${testQualificationData.ja_tentou_consultorio}`)
console.log(`Objetivo principal: ${testQualificationData.objetivo_principal}`)
console.log(`Condições de investir: ${testQualificationData.condicoes_investir}`)
console.log()

console.log('🔥 RESULTADO DA QUALIFICAÇÃO:')
console.log(`Score: ${result.score}/100`)
console.log(`Temperatura: ${result.temperature.toUpperCase()}`)
console.log()

console.log('📋 ESTRUTURA PARA SUPABASE:')
const supabaseData = {
  nome_completo: testQualificationData.nome_completo,
  email: testQualificationData.email,
  whatsapp: testQualificationData.whatsapp,
  origem_conhecimento: 'formulario_medicos',
  situacao_negocio: 'tem_negocio_escalando',
  forma_pagamento: testQualificationData.condicoes_investir === 'sim' ? 'a_vista' : 'vai_conseguir',
  urgencia: 'imediato',
  motivacao_principal: testQualificationData.o_que_mais_incomoda,
  maior_desafio: testQualificationData.visao_3_anos,
  score_total: result.score,
  temperatura: result.temperature,
  psychological_profile: {
    contexto_profissional: {
      principal_fonte_renda: testQualificationData.principal_fonte_renda,
      plantoes_por_semana: testQualificationData.plantoes_por_semana,
      tempo_formado: testQualificationData.tempo_formado
    },
    realidade_financeira: {
      renda_mensal: testQualificationData.renda_mensal,
      dependencia_horas: testQualificationData.dependencia_horas
    },
    momento_ambicao: {
      ja_tentou_consultorio: testQualificationData.ja_tentou_consultorio,
      objetivo_principal: testQualificationData.objetivo_principal
    },
    capacidade_decisao: {
      condicoes_investir: testQualificationData.condicoes_investir,
      estilo_decisao: testQualificationData.estilo_decisao
    },
    comprometimento: {
      por_que_agora: testQualificationData.por_que_agora
    }
  }
}

console.log(JSON.stringify(supabaseData, null, 2))

console.log()
console.log('✅ TESTE CONCLUÍDO!')
console.log(`🎯 Lead ${result.temperature === 'quente' ? 'QUENTE' : result.temperature === 'morno' ? 'MORNO' : 'FRIO'} identificado com score ${result.score}/100`)

if (result.temperature === 'quente') {
  console.log('🚨 AÇÃO IMEDIATA NECESSÁRIA! Contato dentro de 1 hora.')
} else if (result.temperature === 'morno') {
  console.log('📞 Contato em até 24 horas com follow-up personalizado.')
} else {
  console.log('📧 Nutrição via email e WhatsApp para aquecimento.')
}