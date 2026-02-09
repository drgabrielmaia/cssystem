const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables
const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
const env = {};
lines.forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    env[key] = values.join('=');
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function createMedicalFormTemplate() {
  console.log('🏥 Criando template de formulário médico...');

  const medicalFormTemplate = {
    name: 'Qualificação Médica',
    description: 'Formulário avançado de qualificação para médicos. Avalie seu perfil profissional e receba orientações personalizadas.',
    slug: 'qualificacao-medica',
    form_type: 'lead',
    fields: [
      // 1. Nome completo
      {
        id: '1',
        type: 'text',
        label: 'Qual o seu nome completo?',
        name: 'nome_completo',
        required: true,
        placeholder: 'Dr(a). Seu nome completo',
        mapToLead: 'nome_completo'
      },
      
      // 2. Email
      {
        id: '2', 
        type: 'email',
        label: 'Qual o seu email?',
        name: 'email',
        required: true,
        placeholder: 'seu.email@exemplo.com',
        mapToLead: 'email'
      },
      
      // 3. WhatsApp
      {
        id: '3',
        type: 'text',
        label: 'Qual o seu WhatsApp?',
        name: 'whatsapp',
        required: true,
        placeholder: '(00) 00000-0000',
        mapToLead: 'telefone'
      },

      // 4. Principal fonte de renda
      {
        id: '4',
        type: 'radio',
        label: 'Qual sua principal fonte de renda?',
        name: 'principal_fonte_renda',
        required: true,
        options: [
          'Plantão',
          'SUS',
          'Convênios',
          'Consultório próprio',
          'Misto (várias fontes)'
        ]
      },

      // 5. Tempo de formado
      {
        id: '5',
        type: 'radio',
        label: 'Há quanto tempo você é formado?',
        name: 'tempo_formado',
        required: true,
        options: [
          'Menos de 2 anos',
          'Entre 2 e 5 anos',
          'Entre 5 e 10 anos',
          'Mais de 10 anos'
        ]
      },

      // 6. Renda mensal
      {
        id: '6',
        type: 'radio',
        label: 'Qual sua renda mensal aproximada?',
        name: 'renda_mensal',
        required: true,
        options: [
          'Até R$ 15.000',
          'R$ 15.000 - R$ 30.000',
          'R$ 30.000 - R$ 60.000',
          'Acima de R$ 60.000'
        ]
      },

      // 7. Plantões por semana
      {
        id: '7',
        type: 'radio',
        label: 'Quantos plantões você faz por semana?',
        name: 'plantoes_por_semana',
        required: true,
        options: [
          'Nenhum',
          '1 a 2 plantões',
          '3 a 4 plantões',
          '5 ou mais plantões'
        ]
      },

      // 8. Dependência de horas
      {
        id: '8',
        type: 'radio',
        label: 'Sua renda depende das horas trabalhadas?',
        name: 'dependencia_horas',
        required: true,
        options: [
          'Quase tudo depende das horas',
          'Mais da metade depende',
          'Menos da metade depende',
          'Pouco ou nada depende'
        ]
      },

      // 9. O que mais incomoda
      {
        id: '9',
        type: 'textarea',
        label: 'O que mais te incomoda na sua carreira médica hoje?',
        name: 'o_que_mais_incomoda',
        required: true,
        placeholder: 'Descreva suas principais frustações, desafios ou insatisfações...'
      },

      // 10. Visão 3 anos
      {
        id: '10',
        type: 'textarea',
        label: 'Como você se vê daqui a 3 anos?',
        name: 'visao_3_anos',
        required: true,
        placeholder: 'Descreva sua visão ideal para o futuro da sua carreira...'
      },

      // 11. Já tentou consultório
      {
        id: '11',
        type: 'radio',
        label: 'Já tentou abrir consultório antes?',
        name: 'ja_tentou_consultorio',
        required: true,
        options: [
          'Não, nunca tentei',
          'Sim, tentei sozinho',
          'Sim, com curso/mentoria',
          'Já tenho algo funcionando'
        ]
      },

      // 12. Objetivo principal
      {
        id: '12',
        type: 'radio',
        label: 'Qual seu objetivo principal?',
        name: 'objetivo_principal',
        required: true,
        options: [
          'Ganhar mais dinheiro',
          'Trabalhar menos horas',
          'Ter liberdade e autonomia',
          'Estou confuso sobre meus objetivos'
        ]
      },

      // 13. Condições de investir
      {
        id: '13',
        type: 'radio',
        label: 'Tem condições de investir em mentoria/consultoria?',
        name: 'condicoes_investir',
        required: true,
        options: [
          'Sim, tenho recursos disponíveis',
          'Sim, mas com planejamento',
          'Não tenho condições no momento'
        ]
      },

      // 14. Estilo de decisão
      {
        id: '14',
        type: 'radio',
        label: 'Como você toma decisões?',
        name: 'estilo_decisao',
        required: true,
        options: [
          'Decido rapidamente quando vejo valor',
          'Analiso bem antes de decidir',
          'Costumo travar nas decisões'
        ]
      },

      // 15. Por que agora
      {
        id: '15',
        type: 'textarea',
        label: 'Por que agora é o momento certo para mudar sua situação?',
        name: 'por_que_agora',
        required: true,
        placeholder: 'O que te motivou a buscar uma solução agora? O que mudou?'
      }
    ]
  };

  try {
    // Verificar se template já existe
    const { data: existingTemplate } = await supabase
      .from('form_templates')
      .select('id')
      .eq('slug', 'qualificacao-medica')
      .single();

    if (existingTemplate) {
      console.log('⚠️  Template já existe, atualizando...');
      
      const { data, error } = await supabase
        .from('form_templates')
        .update(medicalFormTemplate)
        .eq('slug', 'qualificacao-medica')
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar template:', error);
        return;
      }

      console.log('✅ Template médico atualizado com sucesso!');
    } else {
      console.log('📋 Criando novo template...');
      
      const { data, error } = await supabase
        .from('form_templates')
        .insert([medicalFormTemplate])
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar template:', error);
        return;
      }

      console.log('✅ Template médico criado com sucesso!');
    }

    console.log('\n🎯 PRONTO!');
    console.log('📋 Agora você pode acessar: /forms/qualificacao-medica');
    console.log('🔥 Cada pergunta será uma etapa separada!');
    console.log('🎯 Total de perguntas:', medicalFormTemplate.fields.length);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

createMedicalFormTemplate().catch(console.error);