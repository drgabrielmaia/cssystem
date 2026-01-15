import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function findEmersonOrg() {
  console.log('🔍 ENCONTRANDO ORGANIZAÇÃO DO EMERSON');
  console.log('='.repeat(50));

  try {
    // 1. Buscar Emerson
    console.log('👤 1. Buscando emersonbljr2802@gmail.com...');
    const emersonResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?select=id,nome_completo,email,organization_id&email=eq.emersonbljr2802@gmail.com`,
      { headers }
    );

    if (emersonResponse.ok) {
      const emersonData = await emersonResponse.json();

      if (emersonData.length > 0) {
        const emerson = emersonData[0];
        console.log('✅ EMERSON ENCONTRADO:');
        console.log(`📧 Email: ${emerson.email}`);
        console.log(`👤 Nome: ${emerson.nome_completo}`);
        console.log(`🆔 ID: ${emerson.id}`);
        console.log(`🏢 Organization ID: ${emerson.organization_id}`);

        // 2. Verificar informações da organização
        if (emerson.organization_id) {
          console.log('\n🏢 2. INFORMAÇÕES DA ORGANIZAÇÃO...');
          const orgResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/organizations?select=*&id=eq.${emerson.organization_id}`,
            { headers }
          );

          if (orgResponse.ok) {
            const orgData = await orgResponse.json();
            if (orgData.length > 0) {
              const org = orgData[0];
              console.log(`✅ Organização:`);
              console.log(`   📋 Nome: ${org.name}`);
              console.log(`   👤 Owner: ${org.owner_email}`);
              console.log(`   📞 Admin Phone: ${org.admin_phone || 'N/A'}`);
            }
          }

          // 3. Verificar módulos desta organização
          console.log('\n📚 3. MÓDULOS DESTA ORGANIZAÇÃO...');
          const modulesResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/video_modules?select=id,title,is_active&organization_id=eq.${emerson.organization_id}&order=order_index`,
            { headers }
          );

          if (modulesResponse.ok) {
            const modulesData = await modulesResponse.json();
            console.log(`✅ ${modulesData.length} módulos encontrados:`);

            modulesData.forEach((module, index) => {
              console.log(`  ${index + 1}. ${module.title} (Ativo: ${module.is_active ? 'SIM' : 'NÃO'})`);
            });
          }

          // 4. Verificar quantos mentorados estão nesta organização
          console.log('\n👥 4. OUTROS MENTORADOS NESTA ORGANIZAÇÃO...');
          const mentoradosResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/mentorados?select=nome_completo,email&organization_id=eq.${emerson.organization_id}&excluido=eq.false&limit=15`,
            { headers }
          );

          if (mentoradosResponse.ok) {
            const mentoradosData = await mentoradosResponse.json();
            console.log(`✅ ${mentoradosData.length} mentorados ativos nesta organização:`);

            mentoradosData.forEach((mentorado, index) => {
              console.log(`  ${index + 1}. ${mentorado.nome_completo} (${mentorado.email})`);
            });
          }

          return emerson.organization_id;

        } else {
          console.log('❌ Emerson não tem organization_id');
        }

      } else {
        console.log('❌ Emerson não encontrado com email emersonbljr2802@gmail.com');
      }
    } else {
      console.log('❌ Erro ao buscar Emerson:', emersonResponse.status);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  return null;
}

// Executar busca
findEmersonOrg().then(orgId => {
  if (orgId) {
    console.log(`💡 ORGANIZATION_ID CORRETO: ${orgId}`);
    console.log('   Todos os mentorados devem ter este organization_id');
  }
});