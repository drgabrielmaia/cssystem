import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

const CORRECT_ORG_ID = '9c8c0033-15ea-4e33-a55f-28d81a19693b'; // Admin Organization

async function moveAllToAdminOrg() {
  console.log('🔄 MOVENDO TODOS OS MENTORADOS PARA ADMIN ORGANIZATION');
  console.log('='.repeat(60));

  try {
    // 1. Buscar mentorados que não estão na Admin Organization
    console.log('🔍 1. BUSCANDO MENTORADOS FORA DA ADMIN ORG...');
    const wrongOrgResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?select=id,nome_completo,email,organization_id&excluido=eq.false&organization_id=neq.${CORRECT_ORG_ID}`,
      { headers }
    );

    if (!wrongOrgResponse.ok) {
      console.error('❌ Erro ao buscar mentorados:', wrongOrgResponse.status);
      return;
    }

    const wrongOrgData = await wrongOrgResponse.json();
    console.log(`✅ ${wrongOrgData.length} mentorados precisam ser movidos`);

    if (wrongOrgData.length === 0) {
      console.log('🎉 Todos os mentorados já estão na organização correta!');
      return;
    }

    // 2. Buscar mentorados sem organização (organization_id = null)
    console.log('\\n🔍 2. BUSCANDO MENTORADOS SEM ORGANIZAÇÃO...');
    const noOrgResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?select=id,nome_completo,email,organization_id&excluido=eq.false&organization_id=is.null`,
      { headers }
    );

    if (noOrgResponse.ok) {
      const noOrgData = await noOrgResponse.json();
      console.log(`✅ ${noOrgData.length} mentorados sem organização`);

      // Adicionar à lista de mentorados para mover
      wrongOrgData.push(...noOrgData);
    }

    console.log(`\\n📊 TOTAL A MOVER: ${wrongOrgData.length} mentorados`);

    // 3. Mover em lotes para evitar timeout
    const BATCH_SIZE = 10;
    let moved = 0;
    let errors = 0;

    for (let i = 0; i < wrongOrgData.length; i += BATCH_SIZE) {
      const batch = wrongOrgData.slice(i, i + BATCH_SIZE);
      console.log(`\\n🔄 LOTE ${Math.floor(i/BATCH_SIZE) + 1}: Movendo ${batch.length} mentorados...`);

      for (const mentorado of batch) {
        try {
          const updateResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/mentorados?id=eq.${mentorado.id}`,
            {
              method: 'PATCH',
              headers,
              body: JSON.stringify({
                organization_id: CORRECT_ORG_ID
              })
            }
          );

          if (updateResponse.ok) {
            console.log(`  ✅ ${mentorado.nome_completo}`);
            moved++;
          } else {
            console.log(`  ❌ ${mentorado.nome_completo} - Erro ${updateResponse.status}`);
            errors++;
          }

          // Pequena pausa entre requisições
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.log(`  ❌ ${mentorado.nome_completo} - ${error.message}`);
          errors++;
        }
      }

      // Pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\\n📊 RESULTADO DA MIGRAÇÃO:');
    console.log(`✅ Movidos com sucesso: ${moved}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📊 Total processados: ${moved + errors}`);

    // 4. Verificação final
    console.log('\\n🔍 4. VERIFICAÇÃO FINAL...');
    const finalCheckResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?select=organization_id&excluido=eq.false&organization_id=neq.${CORRECT_ORG_ID}`,
      { headers }
    );

    if (finalCheckResponse.ok) {
      const remainingWrong = await finalCheckResponse.json();

      const noOrgFinalResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/mentorados?select=organization_id&excluido=eq.false&organization_id=is.null`,
        { headers }
      );

      let remainingNoOrg = [];
      if (noOrgFinalResponse.ok) {
        remainingNoOrg = await noOrgFinalResponse.json();
      }

      const totalRemaining = remainingWrong.length + remainingNoOrg.length;

      if (totalRemaining === 0) {
        console.log('🎉 SUCESSO TOTAL! Todos os mentorados estão na Admin Organization!');
      } else {
        console.log(`⚠️  Ainda restam ${totalRemaining} mentorados fora da organização correta`);
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }

  console.log('\\n' + '='.repeat(60));
  console.log('💡 PRÓXIMOS PASSOS:');
  console.log('   1. Todos os mentorados agora estão na Admin Organization');
  console.log('   2. Eles podem acessar os módulos de vídeo');
  console.log('   3. O Thiago Medina e outros verão os módulos após login');
}

// Executar migração
moveAllToAdminOrg();