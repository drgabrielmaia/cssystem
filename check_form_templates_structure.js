const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkFormTemplatesStructure() {
  console.log('🔍 Verificando estrutura da tabela form_templates...\n')
  
  try {
    // Get a sample record to see the structure
    const { data: templates, error } = await supabase
      .from('form_templates')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Erro:', error)
      return
    }

    if (templates && templates.length > 0) {
      console.log('📋 Estrutura da tabela form_templates:')
      const template = templates[0]
      Object.keys(template).forEach(key => {
        console.log(`  - ${key}: ${typeof template[key]} ${Array.isArray(template[key]) ? '(array)' : ''}`)
      })
      
      console.log('\n📝 Exemplo de campos:')
      if (template.fields && Array.isArray(template.fields) && template.fields.length > 0) {
        const field = template.fields[0]
        console.log('Primeiro campo:', JSON.stringify(field, null, 2))
      }
    } else {
      console.log('⚠️ Nenhum template encontrado')
    }

    // Get all templates
    const { data: allTemplates } = await supabase
      .from('form_templates')
      .select('id, name, slug, fields')
    
    console.log('\n📋 Templates existentes:')
    allTemplates?.forEach(t => {
      console.log(`  - ${t.name} (${t.slug}) - ${t.fields?.length || 0} campos`)
    })

  } catch (error) {
    console.error('❌ Erro:', error)
  }
}

checkFormTemplatesStructure()