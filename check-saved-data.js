import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function checkSavedData() {
  console.log('🔍 VERIFICANDO ONDE AS ANOTAÇÕES ESTÃO SALVAS...');
  console.log('='.repeat(60));

  try {
    // 1. Verificar tabela lesson_notes
    console.log('\n📝 1. VERIFICANDO TABELA lesson_notes...');
    try {
      const lessonNotesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/lesson_notes?select=*&limit=10&order=created_at.desc`,
        { headers }
      );

      if (lessonNotesResponse.ok) {
        const lessonNotes = await lessonNotesResponse.json();
        console.log(`✅ Encontradas ${lessonNotes.length} anotações em lesson_notes:`);
        lessonNotes.forEach((note, index) => {
          console.log(`  ${index + 1}. "${note.note_text?.substring(0, 50)}..." - ${note.created_at}`);
        });
      } else {
        console.log('❌ Erro ao acessar lesson_notes ou tabela não existe');
      }
    } catch (error) {
      console.log('❌ Erro na tabela lesson_notes:', error.message);
    }

    // 2. Verificar tabela video_form_responses
    console.log('\n📋 2. VERIFICANDO TABELA video_form_responses...');
    try {
      const formResponsesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/video_form_responses?select=*&limit=10&order=created_at.desc`,
        { headers }
      );

      if (formResponsesResponse.ok) {
        const formResponses = await formResponsesResponse.json();
        console.log(`✅ Encontradas ${formResponses.length} respostas em video_form_responses:`);
        formResponses.forEach((response, index) => {
          console.log(`  ${index + 1}. NPS: ${response.nps_score} | Feedback: "${response.feedback_text?.substring(0, 30)}..." - ${response.created_at}`);
        });
      } else {
        console.log('❌ Erro ao acessar video_form_responses ou tabela não existe');
      }
    } catch (error) {
      console.log('❌ Erro na tabela video_form_responses:', error.message);
    }

    // 3. Verificar outras tabelas possíveis
    console.log('\n🔍 3. VERIFICANDO OUTRAS TABELAS RELACIONADAS...');

    const tablesToCheck = [
      'form_submissions',
      'formularios_respostas',
      'nps_respostas'
    ];

    for (const tableName of tablesToCheck) {
      try {
        console.log(`\n  Verificando ${tableName}...`);
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=5`,
          { headers }
        );

        if (response.ok) {
          const data = await response.json();
          console.log(`  ✅ ${tableName}: ${data.length} registros encontrados`);
          if (data.length > 0) {
            const firstRecord = data[0];
            const keys = Object.keys(firstRecord).slice(0, 5); // Primeiras 5 colunas
            console.log(`    Colunas: ${keys.join(', ')}`);
          }
        } else if (response.status === 404) {
          console.log(`  ⚠️ ${tableName}: Tabela não existe`);
        } else {
          console.log(`  ❌ ${tableName}: Erro ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ ${tableName}: Erro ${error.message}`);
      }
    }

    // 4. Verificar templates
    console.log('\n📋 4. VERIFICANDO TEMPLATES...');
    try {
      const templatesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/video_form_templates?select=*&limit=5`,
        { headers }
      );

      if (templatesResponse.ok) {
        const templates = await templatesResponse.json();
        console.log(`✅ Templates encontrados: ${templates.length}`);
        templates.forEach((template, index) => {
          console.log(`  ${index + 1}. ${template.name} (${template.form_type}) - ID: ${template.id}`);
        });
      } else if (templatesResponse.status === 404) {
        console.log('⚠️ Tabela video_form_templates não existe');
      } else {
        console.log('❌ Erro ao acessar video_form_templates');
      }
    } catch (error) {
      console.log('❌ Erro ao verificar templates:', error.message);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 CONCLUSÃO: Verifique as seções acima para ver onde seus dados estão!');
}

// Executar verificação
checkSavedData();