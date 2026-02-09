const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createLeadQualificationForm() {
  console.log('🚀 Criando formulário de Lead Qualification...\n')
  
  const leadQualificationForm = {
    name: 'Formulário de Qualificação de Leads',
    description: 'Sistema completo de qualificação de leads com scoring automático',
    slug: 'lead-qualification',
    form_type: 'lead',
    fields: [
      {
        id: 'field_' + Date.now() + '_1',
        name: 'nome_completo',
        type: 'text',
        label: 'Nome completo',
        placeholder: 'Digite seu nome completo',
        required: true,
        mapToLead: 'nome_completo'
      },
      {
        id: 'email',
        type: 'email',
        label: 'E-mail',
        placeholder: 'seu@email.com',
        required: true,
        mapping: 'email',
        validation: {
          pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
        }
      },
      {
        id: 'whatsapp',
        type: 'phone',
        label: 'WhatsApp',
        placeholder: '(11) 99999-9999',
        required: true,
        mapping: 'whatsapp',
        validation: {
          pattern: '^\\(\\d{2}\\)\\s\\d{4,5}-\\d{4}$'
        }
      },
      {
        id: 'origem_conhecimento',
        type: 'select',
        label: 'Como conheceu a mentoria?',
        required: true,
        mapping: 'origem_conhecimento',
        options: [
          { value: 'instagram', label: 'Instagram' },
          { value: 'youtube', label: 'YouTube' },
          { value: 'facebook', label: 'Facebook' },
          { value: 'linkedin', label: 'LinkedIn' },
          { value: 'indicacao_mentorado', label: 'Indicação de mentorado' },
          { value: 'indicacao_amigo', label: 'Indicação de amigo' },
          { value: 'google', label: 'Pesquisa no Google' },
          { value: 'podcast', label: 'Podcast' },
          { value: 'evento', label: 'Evento/Palestra' },
          { value: 'outro', label: 'Outro' }
        ]
      },
      {
        id: 'tempo_seguindo',
        type: 'select',
        label: 'Há quanto tempo nos acompanha?',
        required: false,
        mapping: 'tempo_seguindo',
        options: [
          { value: 'menos_1_mes', label: 'Menos de 1 mês' },
          { value: '1_3_meses', label: '1 a 3 meses' },
          { value: '3_6_meses', label: '3 a 6 meses' },
          { value: '6_meses_1_ano', label: '6 meses a 1 ano' },
          { value: '1_ano_mais', label: 'Mais de 1 ano' }
        ]
      },
      {
        id: 'nome_indicacao',
        type: 'text',
        label: 'Se foi indicado, qual o nome de quem indicou?',
        placeholder: 'Nome da pessoa que indicou',
        required: false,
        mapping: 'nome_indicacao',
        conditional: {
          field: 'origem_conhecimento',
          value: ['indicacao_mentorado', 'indicacao_amigo']
        }
      },
      {
        id: 'situacao_negocio',
        type: 'radio',
        label: 'Qual sua situação atual?',
        required: true,
        mapping: 'situacao_negocio',
        options: [
          { 
            value: 'tem_negocio_escalando', 
            label: 'Já tenho um negócio e quero escalar',
            description: 'Você já possui um negócio funcionando e quer crescer'
          },
          { 
            value: 'quer_comecar_com_experiencia', 
            label: 'Quero começar, mas já tenho experiência',
            description: 'Você tem conhecimento/experiência mas ainda não começou'
          },
          { 
            value: 'iniciante_total', 
            label: 'Sou iniciante total',
            description: 'Você está começando do zero no empreendedorismo'
          }
        ]
      },
      {
        id: 'faturamento_atual',
        type: 'select',
        label: 'Qual seu faturamento mensal atual?',
        required: false,
        mapping: 'faturamento_atual',
        options: [
          { value: '0', label: 'Ainda não faturo' },
          { value: '5000', label: 'Até R$ 5.000' },
          { value: '10000', label: 'R$ 5.001 a R$ 10.000' },
          { value: '30000', label: 'R$ 10.001 a R$ 30.000' },
          { value: '50000', label: 'R$ 30.001 a R$ 50.000' },
          { value: '100000', label: 'R$ 50.001 a R$ 100.000' },
          { value: '200000', label: 'R$ 100.001 a R$ 200.000' },
          { value: '200001', label: 'Mais de R$ 200.000' }
        ]
      },
      {
        id: 'objetivo_faturamento',
        type: 'select',
        label: 'Qual seu objetivo de faturamento mensal?',
        required: true,
        mapping: 'objetivo_faturamento',
        options: [
          { value: '10000', label: 'R$ 10.000' },
          { value: '30000', label: 'R$ 30.000' },
          { value: '50000', label: 'R$ 50.000' },
          { value: '100000', label: 'R$ 100.000' },
          { value: '200000', label: 'R$ 200.000' },
          { value: '500000', label: 'R$ 500.000' },
          { value: '1000000', label: 'R$ 1.000.000' },
          { value: '1000001', label: 'Mais de R$ 1.000.000' }
        ]
      },
      {
        id: 'forma_pagamento',
        type: 'radio',
        label: 'Em relação ao investimento na mentoria:',
        required: true,
        mapping: 'forma_pagamento',
        options: [
          { 
            value: 'a_vista', 
            label: '💰 Posso pagar à vista',
            description: 'Tenho condições de investir o valor total à vista',
            score: 40
          },
          { 
            value: 'parcelado', 
            label: '💳 Prefiro parcelar',
            description: 'Posso parcelar o investimento em algumas vezes',
            score: 25
          },
          { 
            value: 'vai_conseguir', 
            label: '🎯 Vou conseguir o dinheiro',
            description: 'Não tenho agora, mas consigo em breve',
            score: 15
          },
          { 
            value: 'nao_tem', 
            label: '❌ Não tenho condições agora',
            description: 'Não posso investir no momento',
            score: 0
          }
        ]
      },
      {
        id: 'urgencia',
        type: 'radio',
        label: 'Quando você quer começar?',
        required: true,
        mapping: 'urgencia',
        options: [
          { 
            value: 'imediato', 
            label: '🔥 Agora, é urgente!',
            description: 'Preciso começar imediatamente',
            score: 20
          },
          { 
            value: 'ate_30_dias', 
            label: '📅 Até 30 dias',
            description: 'Quero começar em até 1 mês',
            score: 15
          },
          { 
            value: 'ate_3_meses', 
            label: '📆 Até 3 meses',
            description: 'Posso começar em até 3 meses',
            score: 10
          },
          { 
            value: 'pesquisando', 
            label: '🔍 Só estou pesquisando',
            description: 'Ainda estou avaliando as opções',
            score: 0
          }
        ]
      },
      {
        id: 'motivacao_principal',
        type: 'textarea',
        label: 'Qual sua principal motivação para empreender?',
        placeholder: 'Conte-nos o que te motiva a buscar o empreendedorismo...',
        required: false,
        mapping: 'motivacao_principal',
        validation: {
          maxLength: 500
        }
      },
      {
        id: 'investiu_mentoria_antes',
        type: 'radio',
        label: 'Já investiu em mentoria antes?',
        required: true,
        mapping: 'investiu_mentoria_antes',
        options: [
          { value: 'true', label: '✅ Sim, já investi' },
          { value: 'false', label: '❌ Não, seria a primeira vez' }
        ]
      },
      {
        id: 'maior_desafio',
        type: 'textarea',
        label: 'Qual seu maior desafio atual no negócio?',
        placeholder: 'Descreva qual é sua principal dificuldade hoje...',
        required: false,
        mapping: 'maior_desafio',
        validation: {
          maxLength: 500
        }
      }
    ],
    style: {
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
      backgroundColor: '#f8fafc',
      textColor: '#1f2937',
      borderRadius: '12',
      fontFamily: 'Inter',
      customCSS: `
        .form-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .form-title {
          font-size: 2rem;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 0.5rem;
          text-align: center;
        }
        .form-description {
          color: #6b7280;
          text-align: center;
          margin-bottom: 2rem;
          line-height: 1.6;
        }
        .field-group {
          margin-bottom: 1.5rem;
        }
        .field-label {
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          display: block;
        }
        .field-required {
          color: #ef4444;
        }
        .radio-option {
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 0.5rem;
          transition: all 0.2s;
          cursor: pointer;
        }
        .radio-option:hover {
          border-color: #3b82f6;
          background-color: #f8fafc;
        }
        .radio-option.selected {
          border-color: #3b82f6;
          background-color: #eff6ff;
        }
        .option-label {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }
        .option-description {
          font-size: 0.875rem;
          color: #6b7280;
        }
        .submit-button {
          background: linear-gradient(135deg, #3b82f6, #1e40af);
          color: white;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          width: 100%;
          border: none;
          cursor: pointer;
          font-size: 1.1rem;
          margin-top: 2rem;
          transition: transform 0.2s;
        }
        .submit-button:hover {
          transform: translateY(-2px);
        }
      `
    },
    settings: {
      autoScore: true,
      saveToLeadQualifications: true,
      redirectAfterSubmit: '/obrigado-qualificacao',
      emailNotifications: true,
      webhookUrl: null,
      requireConsent: true,
      consentText: 'Autorizo o contato para apresentação da mentoria e envio de materiais educativos.',
      scoringRules: [
        {
          field: 'forma_pagamento',
          type: 'direct_score',
          rules: {
            'a_vista': 40,
            'parcelado': 25, 
            'vai_conseguir': 15,
            'nao_tem': 0
          }
        },
        {
          field: 'urgencia',
          type: 'direct_score',
          rules: {
            'imediato': 20,
            'ate_30_dias': 15,
            'ate_3_meses': 10,
            'pesquisando': 0
          }
        },
        {
          field: 'origem_conhecimento',
          type: 'category_score',
          rules: {
            'indicacao_mentorado': 25,
            'indicacao_amigo': 15,
            'instagram': 10,
            'youtube': 10,
            'linkedin': 10,
            'podcast': 8,
            'facebook': 5,
            'google': 5,
            'evento': 12,
            'outro': 3
          }
        },
        {
          field: 'tempo_seguindo',
          type: 'category_score',
          rules: {
            '1_ano_mais': 20,
            '6_meses_1_ano': 15,
            '3_6_meses': 10,
            '1_3_meses': 5,
            'menos_1_mes': 2
          }
        },
        {
          field: 'situacao_negocio',
          type: 'category_score',
          rules: {
            'tem_negocio_escalando': 15,
            'quer_comecar_com_experiencia': 10,
            'iniciante_total': 5
          }
        }
      ],
      temperatureRules: {
        'quente': 70,    // >= 70 pontos = Lead Quente
        'morno': 40,     // 40-69 pontos = Lead Morno  
        'frio': 0        // < 40 pontos = Lead Frio
      },
      instantHotQualifiers: [
        {
          field: 'forma_pagamento',
          value: 'a_vista'
        },
        {
          conditions: [
            { field: 'origem_conhecimento', value: 'indicacao_mentorado' },
            { field: 'urgencia', value: 'imediato' }
          ],
          operator: 'AND'
        }
      ]
    }
  }

  try {
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('form_templates')
      .select('id, name')
      .eq('slug', 'lead-qualification')
      .single()

    if (existing) {
      console.log('⚠️  Formulário já existe:', existing.name)
      console.log('🔄 Atualizando formulário existente...')
      
      const { data, error } = await supabase
        .from('form_templates')
        .update({
          ...leadQualificationForm,
          updated_at: new Date().toISOString()
        })
        .eq('slug', 'lead-qualification')
        .select()
        .single()

      if (error) throw error
      console.log('✅ Formulário atualizado com sucesso!')
      
    } else {
      console.log('🆕 Criando novo formulário...')
      
      const { data, error } = await supabase
        .from('form_templates')
        .insert(leadQualificationForm)
        .select()
        .single()

      if (error) throw error
      console.log('✅ Formulário criado com sucesso!')
    }

    console.log('\n📋 FORMULÁRIO CRIADO:')
    console.log(`📍 URL: https://seu-dominio.com/f/lead-qualification`)
    console.log(`🎯 Campos: ${leadQualificationForm.fields.length}`)
    console.log(`📊 Sistema de scoring: Automático`)
    console.log(`🔥 Qualificadores instantâneos: ${leadQualificationForm.settings.instantHotQualifiers.length}`)

  } catch (error) {
    console.error('❌ Erro ao criar formulário:', error)
  }
}

createLeadQualificationForm()