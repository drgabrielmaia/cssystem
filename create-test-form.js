// Script para criar um formulário de teste
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://svlrqaifkfjtfxjsqfid.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2bHJxYWlma2ZqdGZ4anNxZmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0Mjk4ODMsImV4cCI6MjA0NzAwNTg4M30.nZoywf_2YOVSKyxXX4xOgbOqLzxXd4gdrNBuZcJtEEY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestForm() {
  const testForm = {
    name: 'Formulário de Teste - Debug',
    description: 'Formulário simples para testar console.log',
    slug: 'teste-debug',
    form_type: 'lead',
    fields: [
      {
        id: 'field1',
        type: 'text',
        label: 'Nome Completo',
        name: 'nome_completo',
        required: true,
        placeholder: 'Digite seu nome completo',
        mapToLead: 'nome_completo'
      },
      {
        id: 'field2',
        type: 'email',
        label: 'Email',
        name: 'email',
        required: true,
        placeholder: 'Digite seu email',
        mapToLead: 'email'
      },
      {
        id: 'field3',
        type: 'phone',
        label: 'Telefone',
        name: 'telefone',
        required: false,
        placeholder: 'Digite seu telefone',
        mapToLead: 'telefone'
      }
    ]
  }

  try {
    const { data, error } = await supabase
      .from('form_templates')
      .insert([testForm])
      .select()

    if (error) {
      console.error('Erro ao criar formulário:', error)
    } else {
      console.log('✅ Formulário criado com sucesso!')
      console.log('🔗 URL do formulário: http://localhost:3000/forms/teste-debug')
      console.log('Data:', data)
    }
  } catch (err) {
    console.error('Erro:', err)
  }
}

createTestForm()