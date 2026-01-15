import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

const THIAGO_ORG_ID = 'f9cf9d0e-ed74-4367-94f7-226ffc2f3273';
const THIAGO_ID = '95bcc45f-ec14-4981-8550-3e69b6fcb1f9';

async function checkThiagoModules() {
  console.log('🔍 VERIFICANDO MÓDULOS DO THIAGO MEDINA');
  console.log('='.repeat(50));

  try {
    // 1. Verificar módulos da organização temp2
    console.log('📚 1. MÓDULOS DA ORGANIZAÇÃO TEMP2...');
    const modulesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/video_modules?select=*&organization_id=eq.${THIAGO_ORG_ID}&order=order_index`,
      { headers }
    );

    if (modulesResponse.ok) {
      const modulesData = await modulesResponse.json();
      console.log(`✅ Encontrados ${modulesData.length} módulos na organização temp2`);

      if (modulesData.length > 0) {
        modulesData.forEach((module, index) => {
          console.log(`  ${index + 1}. ${module.title} (ID: ${module.id})`);
          console.log(`     - Ativo: ${module.is_active ? 'SIM' : 'NÃO'}`);
          console.log(`     - Ordem: ${module.order_index}`);
        });

        // 2. Verificar aulas dos módulos
        console.log('\n🎥 2. VERIFICANDO AULAS DOS MÓDULOS...');
        for (const module of modulesData) {
          const lessonsResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/video_lessons?select=*&module_id=eq.${module.id}&order=order_index`,
            { headers }
          );

          if (lessonsResponse.ok) {
            const lessonsData = await lessonsResponse.json();
            console.log(`\n📖 Módulo: ${module.title}`);
            console.log(`   └─ ${lessonsData.length} aulas encontradas`);

            lessonsData.forEach((lesson, index) => {
              console.log(`      ${index + 1}. ${lesson.title}`);
              console.log(`         - Ativo: ${lesson.is_active ? 'SIM' : 'NÃO'}`);
              console.log(`         - Duração: ${lesson.duration || 'N/A'}`);
              console.log(`         - URL: ${lesson.video_url ? 'Presente' : 'Ausente'}`);
            });
          }
        }

      } else {
        console.log('❌ Nenhum módulo encontrado na organização temp2');
      }
    } else {
      console.log('❌ Erro ao buscar módulos:', modulesResponse.status);
    }

    // 3. Verificar progresso do Thiago
    console.log('\n📊 3. VERIFICANDO PROGRESSO DO THIAGO...');
    const progressResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/lesson_progress?select=*&mentorado_id=eq.${THIAGO_ID}`,
      { headers }
    );

    if (progressResponse.ok) {
      const progressData = await progressResponse.json();
      console.log(`✅ ${progressData.length} registros de progresso do Thiago`);

      progressData.forEach((progress, index) => {
        console.log(`  ${index + 1}. Aula ID: ${progress.lesson_id}`);
        console.log(`     - Completa: ${progress.completed ? 'SIM' : 'NÃO'}`);
        console.log(`     - Progresso: ${progress.progress_percentage}%`);
        console.log(`     - Tempo assistido: ${progress.watch_time || 0}s`);
      });
    } else {
      console.log('❌ Erro ao buscar progresso:', progressResponse.status);
    }

    // 4. Verificar todas as organizações com módulos
    console.log('\n🌍 4. VERIFICANDO TODAS AS ORGANIZAÇÕES COM MÓDULOS...');
    const allModulesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/video_modules?select=organization_id,title,id&limit=20`,
      { headers }
    );

    if (allModulesResponse.ok) {
      const allModules = await allModulesResponse.json();
      const orgGroups = {};

      allModules.forEach(module => {
        if (!orgGroups[module.organization_id]) {
          orgGroups[module.organization_id] = [];
        }
        orgGroups[module.organization_id].push(module);
      });

      console.log('📋 Organizações com módulos:');
      Object.keys(orgGroups).forEach(orgId => {
        console.log(`  🏢 ${orgId}:`);
        orgGroups[orgId].forEach(module => {
          console.log(`     - ${module.title} (${module.id})`);
        });
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('💡 DIAGNÓSTICO:');
  console.log('   Se não houver módulos na org temp2, Thiago não verá nada');
  console.log('   Se houver módulos mas aulas inativas, também não aparecerá');
}

// Executar verificação
checkThiagoModules();