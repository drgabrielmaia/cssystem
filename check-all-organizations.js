import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

const CORRECT_ORG_ID = '9c8c0033-15ea-4e33-a55f-28d81a19693b'; // Admin Organization

async function checkAllOrganizations() {
  console.log('🔍 VERIFICANDO TODOS OS MENTORADOS E SUAS ORGANIZAÇÕES');
  console.log('='.repeat(60));

  try {
    // 1. Buscar todos os mentorados ativos
    console.log('👥 1. BUSCANDO TODOS OS MENTORADOS ATIVOS...');
    const mentoradosResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?select=id,nome_completo,email,organization_id&excluido=eq.false&order=nome_completo`,
      { headers }
    );

    if (mentoradosResponse.ok) {
      const mentoradosData = await mentoradosResponse.json();
      console.log(`✅ ${mentoradosData.length} mentorados ativos encontrados`);

      // Agrupar por organização
      const orgGroups = {};
      const wrongOrgMentorados = [];

      mentoradosData.forEach(mentorado => {
        const orgId = mentorado.organization_id || 'null';

        if (!orgGroups[orgId]) {
          orgGroups[orgId] = [];
        }
        orgGroups[orgId].push(mentorado);

        // Marcar os que estão na organização errada
        if (mentorado.organization_id !== CORRECT_ORG_ID) {
          wrongOrgMentorados.push(mentorado);
        }
      });

      console.log('\\n📊 2. DISTRIBUIÇÃO POR ORGANIZAÇÃO:');
      Object.keys(orgGroups).forEach(orgId => {
        const count = orgGroups[orgId].length;
        const isCorrect = orgId === CORRECT_ORG_ID;

        console.log(`\\n🏢 ${orgId === 'null' ? 'SEM ORGANIZAÇÃO' : orgId}:`);
        console.log(`   📊 ${count} mentorados ${isCorrect ? '✅ (CORRETO)' : '❌ (ERRADO)'}`);

        orgGroups[orgId].slice(0, 5).forEach((mentorado, index) => {
          console.log(`   ${index + 1}. ${mentorado.nome_completo} (${mentorado.email})`);
        });

        if (orgGroups[orgId].length > 5) {
          console.log(`   ... e mais ${orgGroups[orgId].length - 5} mentorados`);
        }
      });

      // 3. Lista dos que precisam ser movidos
      if (wrongOrgMentorados.length > 0) {
        console.log(`\\n❌ 3. MENTORADOS QUE PRECISAM SER MOVIDOS (${wrongOrgMentorados.length}):`);;
        wrongOrgMentorados.forEach((mentorado, index) => {
          console.log(`  ${index + 1}. ${mentorado.nome_completo} (${mentorado.email})`);
          console.log(`     De: ${mentorado.organization_id || 'null'} → Para: ${CORRECT_ORG_ID}`);
        });

        return wrongOrgMentorados;
      } else {
        console.log('\\n✅ 3. TODOS OS MENTORADOS ESTÃO NA ORGANIZAÇÃO CORRETA!');
        return [];
      }

    } else {
      console.log('❌ Erro ao buscar mentorados:', mentoradosResponse.status);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\\n' + '='.repeat(60));
  return [];
}

// Executar verificação
checkAllOrganizations().then(wrongOrgMentorados => {
  if (wrongOrgMentorados.length > 0) {
    console.log(`\\n🔧 PRÓXIMO PASSO: Mover ${wrongOrgMentorados.length} mentorados para a Admin Organization`);
  } else {
    console.log('\\n🎉 TODOS OS MENTORADOS JÁ ESTÃO NA ORGANIZAÇÃO CORRETA!');
  }
});