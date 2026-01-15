import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function findCorrectOrg() {
  console.log('🔍 ENCONTRANDO ORGANIZAÇÃO CORRETA COM MÓDULOS');
  console.log('='.repeat(50));

  try {
    // 1. Verificar organização 9c8c0033-15ea-4e33-a55f-28d81a19693b
    const orgId = '9c8c0033-15ea-4e33-a55f-28d81a19693b';

    console.log('🏢 1. VERIFICANDO ORGANIZAÇÃO COM MÓDULOS...');
    const orgResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/organizations?select=*&id=eq.${orgId}`,
      { headers }
    );

    if (orgResponse.ok) {
      const orgData = await orgResponse.json();
      if (orgData.length > 0) {
        const org = orgData[0];
        console.log(`✅ Organização encontrada:`);
        console.log(`   📋 Nome: ${org.name}`);
        console.log(`   👤 Owner: ${org.owner_email}`);
        console.log(`   🆔 ID: ${org.id}`);

        // Verificar módulos dessa organização
        console.log('\n📚 2. MÓDULOS DESTA ORGANIZAÇÃO...');
        const modulesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/video_modules?select=*&organization_id=eq.${orgId}&order=order_index`,
          { headers }
        );

        if (modulesResponse.ok) {
          const modulesData = await modulesResponse.json();
          console.log(`✅ ${modulesData.length} módulos encontrados:`);

          for (const module of modulesData) {
            console.log(`\n  📖 ${module.title}`);
            console.log(`     🆔 ID: ${module.id}`);
            console.log(`     ✅ Ativo: ${module.is_active ? 'SIM' : 'NÃO'}`);
            console.log(`     📊 Ordem: ${module.order_index}`);

            // Verificar aulas do módulo
            const lessonsResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/video_lessons?select=*&module_id=eq.${module.id}&order=order_index`,
              { headers }
            );

            if (lessonsResponse.ok) {
              const lessonsData = await lessonsResponse.json();
              console.log(`     🎥 Aulas: ${lessonsData.length}`);

              lessonsData.slice(0, 3).forEach((lesson, index) => {
                console.log(`        ${index + 1}. ${lesson.title} (Ativo: ${lesson.is_active ? 'SIM' : 'NÃO'})`);
              });

              if (lessonsData.length > 3) {
                console.log(`        ... e mais ${lessonsData.length - 3} aulas`);
              }
            }
          }
        }

        // Verificar quantos mentorados estão nesta organização
        console.log('\n👥 3. MENTORADOS NESTA ORGANIZAÇÃO...');
        const mentoradosResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/mentorados?select=nome_completo,email&organization_id=eq.${orgId}&excluido=eq.false&limit=10`,
          { headers }
        );

        if (mentoradosResponse.ok) {
          const mentoradosData = await mentoradosResponse.json();
          console.log(`✅ ${mentoradosData.length} mentorados ativos nesta organização:`);

          mentoradosData.forEach((mentorado, index) => {
            console.log(`  ${index + 1}. ${mentorado.nome_completo} (${mentorado.email})`);
          });
        }

      } else {
        console.log('❌ Organização não encontrada');
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('💡 CONCLUSÃO:');
  console.log('   Preciso mover o Thiago para a organização que tem os módulos');
  console.log('   OU criar os módulos na organização temp2');
}

// Executar verificação
findCorrectOrg();