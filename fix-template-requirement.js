import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function checkAndCreateTemplates() {
  try {
    console.log('🔍 Verificando templates existentes...');

    // Verificar se a tabela video_form_templates existe
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/video_form_templates?select=id,name,form_type&limit=5`,
      { headers }
    );

    if (checkResponse.status === 404) {
      console.log('❌ Tabela video_form_templates não existe ainda');
      console.log('📋 Execute o SQL video_learning_portal_enhancement.sql primeiro');
      return null;
    }

    const existingTemplates = await checkResponse.json();
    console.log(`📊 Templates encontrados: ${existingTemplates.length}`);

    existingTemplates.forEach(template => {
      console.log(`  - ${template.name} (${template.form_type}) - ID: ${template.id}`);
    });

    // Verificar se existe template para NPS
    let npsTemplate = existingTemplates.find(t => t.form_type === 'nps' || t.name.includes('nps'));

    if (!npsTemplate) {
      console.log('➕ Criando template padrão para NPS...');

      const createNpsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/video_form_templates`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: 'lesson_completion_nps',
            title: 'Avaliação da Aula',
            form_type: 'nps',
            trigger_event: 'lesson_completed',
            questions: [
              {
                "id": "nps_score",
                "type": "nps",
                "question": "De 0 a 10, o quanto você recomendaria esta aula para um colega?",
                "required": true
              },
              {
                "id": "feedback",
                "type": "textarea",
                "question": "Deixe seu feedback sobre a aula (opcional)",
                "required": false
              }
            ],
            is_active: true
          })
        }
      );

      if (createNpsResponse.ok) {
        const newNpsTemplate = await createNpsResponse.json();
        npsTemplate = newNpsTemplate[0];
        console.log('✅ Template NPS criado:', npsTemplate.id);
      } else {
        const error = await createNpsResponse.text();
        console.error('❌ Erro ao criar template NPS:', error);
      }
    }

    // Verificar se existe template para notas
    let notesTemplate = existingTemplates.find(t => t.form_type === 'feedback' || t.name.includes('note'));

    if (!notesTemplate) {
      console.log('➕ Criando template padrão para anotações...');

      const createNotesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/video_form_templates`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: 'lesson_notes',
            title: 'Anotações da Aula',
            form_type: 'feedback',
            trigger_event: 'manual',
            questions: [
              {
                "id": "note_text",
                "type": "textarea",
                "question": "Sua anotação",
                "required": true
              }
            ],
            is_active: true
          })
        }
      );

      if (createNotesResponse.ok) {
        const newNotesTemplate = await createNotesResponse.json();
        notesTemplate = newNotesTemplate[0];
        console.log('✅ Template de anotações criado:', notesTemplate.id);
      } else {
        const error = await createNotesResponse.text();
        console.error('❌ Erro ao criar template de anotações:', error);
      }
    }

    console.log('\n📋 RESUMO DOS TEMPLATES:');
    console.log(`🎯 NPS Template ID: ${npsTemplate?.id || 'Não encontrado'}`);
    console.log(`📝 Notes Template ID: ${notesTemplate?.id || 'Não encontrado'}`);

    return {
      npsTemplateId: npsTemplate?.id,
      notesTemplateId: notesTemplate?.id
    };

  } catch (error) {
    console.error('❌ Erro:', error);
    return null;
  }
}

// Executar verificação
checkAndCreateTemplates().then(result => {
  if (result) {
    console.log('\n🎯 Templates prontos para uso!');
    console.log('📋 Agora você pode atualizar as APIs com os IDs dos templates');
  } else {
    console.log('\n❌ Não foi possível preparar os templates');
  }
});