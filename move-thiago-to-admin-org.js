import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

const THIAGO_ID = '95bcc45f-ec14-4981-8550-3e69b6fcb1f9';
const ADMIN_ORG_ID = '9c8c0033-15ea-4e33-a55f-28d81a19693b'; // Admin Organization que tem os módulos

async function moveThiagoToAdminOrg() {
  console.log('🔄 MOVENDO THIAGO PARA ADMIN ORGANIZATION');
  console.log('='.repeat(50));

  try {
    // 1. Verificar estado atual
    console.log('🔍 1. Estado atual do Thiago...');
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?select=id,nome_completo,email,organization_id&id=eq.${THIAGO_ID}`,
      { headers }
    );

    if (!checkResponse.ok) {
      console.error('❌ Erro ao verificar Thiago:', checkResponse.status);
      return;
    }

    const checkData = await checkResponse.json();
    if (checkData.length === 0) {
      console.error('❌ Thiago não encontrado');
      return;
    }

    const thiago = checkData[0];
    console.log(`📧 Email: ${thiago.email}`);
    console.log(`🏢 Organização atual: ${thiago.organization_id}`);
    console.log(`🎯 Nova organização: ${ADMIN_ORG_ID} (Admin Organization)`);

    // 2. Atualizar organização
    console.log('\n🔄 2. Movendo para Admin Organization...');
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?id=eq.${THIAGO_ID}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          organization_id: ADMIN_ORG_ID
        })
      }
    );

    if (updateResponse.ok) {
      console.log('✅ Organização atualizada com sucesso!');

      // 3. Verificar se a mudança funcionou
      console.log('\n🔍 3. Verificando mudança...');
      const verifyResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/mentorados?select=id,nome_completo,organization_id&id=eq.${THIAGO_ID}`,
        { headers }
      );

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        const updatedThiago = verifyData[0];

        console.log('📋 ESTADO APÓS MUDANÇA:');
        console.log(`✅ Nome: ${updatedThiago.nome_completo}`);
        console.log(`✅ Nova organização: ${updatedThiago.organization_id}`);
        console.log(`✅ Organização correta: ${updatedThiago.organization_id === ADMIN_ORG_ID ? 'SIM' : 'NÃO'}`);

        // 4. Verificar se agora ele verá os módulos
        console.log('\n🎥 4. Verificando acesso aos módulos...');
        const modulesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/video_modules?select=id,title,is_active&organization_id=eq.${updatedThiago.organization_id}&is_active=eq.true&order=order_index`,
          { headers }
        );

        if (modulesResponse.ok) {
          const modulesData = await modulesResponse.json();
          console.log(`✅ ${modulesData.length} módulos ativos disponíveis:`);

          modulesData.forEach((module, index) => {
            console.log(`  ${index + 1}. ${module.title} (${module.id})`);
          });

          if (modulesData.length > 0) {
            console.log('\n🎉 SUCESSO!');
            console.log('🔑 Thiago Medina agora pode ver os módulos!');
            console.log('📱 Ele deve fazer logout e login novamente para ver as mudanças.');
          } else {
            console.log('\n❌ Ainda não há módulos ativos visíveis.');
          }
        }

      }

    } else {
      const errorText = await updateResponse.text();
      console.error('❌ Erro ao atualizar organização:', updateResponse.status, errorText);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('💡 INSTRUÇÕES:');
  console.log('   1. Thiago deve fazer LOGOUT do sistema');
  console.log('   2. Fazer LOGIN novamente');
  console.log('   3. Agora ele verá os módulos da Admin Organization');
}

// Executar mudança
moveThiagoToAdminOrg();