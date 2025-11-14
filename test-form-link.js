const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eiflkubcaovljwwdmlnb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZmxrdWJjYW92bGp3d2RtbG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjczNjg5NjksImV4cCI6MjA0Mjk0NDk2OX0.OQumIGJz7MkqOk7vTBgJtQpPU9bZTxHJPNikhyOF3K0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestForm() {
  const { data, error } = await supabase
    .from('form_templates')
    .upsert([
      {
        name: 'Formulário de Teste - Link',
        description: 'Teste para verificar se o link funciona',
        slug: 'teste-link-form',
        form_type: 'lead',
        fields: [
          {
            id: 'field1',
            type: 'text',
            label: 'Nome',
            name: 'nome',
            required: true,
            placeholder: 'Digite seu nome',
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
          }
        ],
        style: {
          primaryColor: '#3b82f6',
          backgroundColor: '#f8fafc',
          textColor: '#1e293b',
          cardColor: '#ffffff',
          borderRadius: '12',
          fontFamily: 'Inter'
        }
      }
    ], { onConflict: 'slug' })
    .select();

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log('Formulário criado:', data);
  console.log('Link do formulário: http://localhost:3001/forms/teste-link-form');
}

createTestForm();