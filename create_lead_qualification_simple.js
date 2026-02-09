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
  
  const timestamp = Date.now()
  const leadQualificationForm = {
    name: 'Qualificação de Leads Avançada',
    description: 'Sistema completo de qualificação de leads com scoring automático para SDRs',
    slug: 'lead-qualification-sdr',
    form_type: 'lead',
    fields: [
      {
        id: `field_${timestamp}_1`,
        name: 'nome_completo',
        type: 'text',
        label: 'Qual seu nome completo?',
        placeholder: 'Digite seu nome completo',
        required: true,
        mapToLead: 'nome_completo'
      },
      {
        id: `field_${timestamp}_2`,
        name: 'email',
        type: 'email',
        label: 'Qual seu e-mail?',
        placeholder: 'seu@email.com',
        required: true,
        mapToLead: 'email'
      },
      {
        id: `field_${timestamp}_3`,
        name: 'whatsapp',
        type: 'phone',
        label: 'Qual seu WhatsApp?',
        placeholder: '(11) 99999-9999',
        required: true,
        mapToLead: 'telefone'
      },
      {
        id: `field_${timestamp}_4`,
        name: 'origem_conhecimento',
        type: 'select',
        label: 'Como conheceu nosso trabalho?',
        required: true,
        options: [
          { value: 'instagram', label: 'Instagram' },
          { value: 'youtube', label: 'YouTube' },
          { value: 'facebook', label: 'Facebook' },
          { value: 'indicacao_mentorado', label: 'Indicação de mentorado' },
          { value: 'google', label: 'Pesquisa no Google' },
          { value: 'outro', label: 'Outro' }
        ]
      },
      {
        id: `field_${timestamp}_5`,
        name: 'situacao_negocio',
        type: 'select',
        label: 'Qual sua situação atual?',
        required: true,
        options: [
          { value: 'tem_negocio_escalando', label: 'Já tenho um negócio e quero escalar' },
          { value: 'quer_comecar_com_experiencia', label: 'Quero começar, mas já tenho experiência' },
          { value: 'iniciante_total', label: 'Sou iniciante total' }
        ]
      },
      {
        id: `field_${timestamp}_6`,
        name: 'forma_pagamento',
        type: 'select',
        label: 'Em relação ao investimento na mentoria:',
        required: true,
        options: [
          { value: 'a_vista', label: '💰 Posso pagar à vista' },
          { value: 'parcelado', label: '💳 Prefiro parcelar' },
          { value: 'vai_conseguir', label: '🎯 Vou conseguir o dinheiro' },
          { value: 'nao_tem', label: '❌ Não tenho condições agora' }
        ]
      },
      {
        id: `field_${timestamp}_7`,
        name: 'urgencia',
        type: 'select',
        label: 'Quando você quer começar?',
        required: true,
        options: [
          { value: 'imediato', label: '🔥 Agora, é urgente!' },
          { value: 'ate_30_dias', label: '📅 Até 30 dias' },
          { value: 'ate_3_meses', label: '📆 Até 3 meses' },
          { value: 'pesquisando', label: '🔍 Só estou pesquisando' }
        ]
      },
      {
        id: `field_${timestamp}_8`,
        name: 'motivacao_principal',
        type: 'textarea',
        label: 'Qual sua principal motivação para empreender?',
        placeholder: 'Conte-nos o que te motiva...',
        required: false
      }
    ],
    style: {
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
      backgroundColor: '#f8fafc',
      textColor: '#1f2937',
      borderRadius: '12',
      fontFamily: 'Inter'
    }
  }

  try {
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('form_templates')
      .select('id, name')
      .eq('slug', 'lead-qualification-sdr')
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
        .eq('slug', 'lead-qualification-sdr')
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

    console.log('\n📋 FORMULÁRIO DE LEAD QUALIFICATION CRIADO:')
    console.log(`📍 Slug: ${leadQualificationForm.slug}`)
    console.log(`📍 URL: /f/${leadQualificationForm.slug}`)
    console.log(`🎯 Campos: ${leadQualificationForm.fields.length}`)
    console.log(`📊 Pronto para usar com SDRs`)

    console.log('\n🎯 PRÓXIMOS PASSOS:')
    console.log('1. Acesse /form-builder para gerenciar o formulário')
    console.log('2. Configure as integrações com lead_qualifications')
    console.log('3. Configure scoring automático')
    console.log('4. Disponibilize para SDRs acessarem')

  } catch (error) {
    console.error('❌ Erro ao criar formulário:', error)
  }
}

createLeadQualificationForm()