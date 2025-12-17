const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkNPSTemplate() {
  try {
    // Verificar se o template NPS mentoria existe
    console.log('🔍 Verificando template NPS mentoria...')

    const { data: templates, error: templateError } = await supabase
      .from('form_templates')
      .select('*')
      .eq('slug', 'nps-mentoria')

    if (templateError) {
      console.error('❌ Erro ao buscar template:', templateError)
      return
    }

    if (!templates || templates.length === 0) {
      console.log('❌ Template NPS mentoria não encontrado!')
      console.log('📋 Criando template...')

      // Criar o template
      const templateData = {
        name: 'NPS Mentoria Médicos de Resultado',
        description: 'Pesquisa completa de satisfação da mentoria médica',
        slug: 'nps-mentoria',
        form_type: 'nps',
        fields: [
          {
            id: 'field_1',
            type: 'email',
            label: 'Seu email (usado na mentoria) - opcional',
            name: 'email',
            required: false,
            placeholder: 'seu@email.com'
          },
          {
            id: 'field_2',
            type: 'number',
            label: 'De 0 a 10, o quanto você recomendaria a Mentoria Médicos de Resultado para outro médico que quer sair do SUS/plantão e construir uma clínica ou negócio médico lucrativo?',
            name: 'nota_nps',
            required: true,
            placeholder: 'Digite uma nota de 0 a 10'
          }
        ]
      }

      const { data: newTemplate, error: createError } = await supabase
        .from('form_templates')
        .insert([templateData])
        .select()

      if (createError) {
        console.error('❌ Erro ao criar template:', createError)
        return
      }

      console.log('✅ Template criado:', newTemplate[0])
    } else {
      console.log('✅ Template encontrado:', templates[0])
    }

    // Verificar form_submissions
    console.log('\n🔍 Verificando submissions...')

    const { data: submissions, error: submissionError } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('template_slug', 'nps-mentoria')

    if (submissionError) {
      console.error('❌ Erro ao buscar submissions:', submissionError)
    } else {
      console.log(`📊 Encontradas ${submissions.length} submissions para NPS mentoria`)
      submissions.forEach((sub, i) => {
        console.log(`${i + 1}. ID: ${sub.id}, Data: ${sub.created_at}`)
      })
    }

  } catch (err) {
    console.error('❌ Erro geral:', err.message)
  }
}

checkNPSTemplate()