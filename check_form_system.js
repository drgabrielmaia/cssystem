const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkFormSystem() {
  console.log('🔍 Verificando sistema de formulários...\n')
  
  try {
    // Check form templates table
    const { data: formTemplates, error: templatesError } = await supabase
      .from('form_templates')
      .select('*')
      .limit(5)
    
    if (!templatesError) {
      console.log('✅ form_templates:', formTemplates?.length || 0, 'registros')
      if (formTemplates && formTemplates.length > 0) {
        console.log('📋 Templates existentes:')
        formTemplates.forEach(t => {
          console.log(`  - ${t.name} (${t.slug})`)
        })
      }
    } else {
      console.log('❌ form_templates:', templatesError.message)
    }

    // Check form submissions
    const { data: formSubmissions, error: submissionsError } = await supabase
      .from('form_submissions')
      .select('*')
      .limit(5)
    
    if (!submissionsError) {
      console.log('✅ form_submissions:', formSubmissions?.length || 0, 'registros')
    } else {
      console.log('❌ form_submissions:', submissionsError.message)
    }

    // Check forms table (legacy?)
    const { data: formsData, error: formsError } = await supabase
      .from('forms')
      .select('*')
      .limit(5)
    
    if (!formsError) {
      console.log('✅ forms:', formsData?.length || 0, 'registros')
      if (formsData && formsData.length > 0) {
        console.log('📝 Forms existentes:')
        formsData.forEach(f => {
          console.log(`  - ${f.title || f.name || 'Sem título'} (ID: ${f.id})`)
        })
      }
    } else {
      console.log('❌ forms:', formsError.message)
    }

    // Check form_responses
    const { data: formResponses, error: responsesError } = await supabase
      .from('form_responses')
      .select('*')
      .limit(5)
    
    if (!responsesError) {
      console.log('✅ form_responses:', formResponses?.length || 0, 'registros')
    } else {
      console.log('❌ form_responses:', responsesError.message)
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  }
}

checkFormSystem()