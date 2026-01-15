import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function checkAndCreateOrganization() {
  try {
    console.log('🔍 Verificando organizações existentes...');

    // Listar todas as organizações
    const listResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/organizations?select=id,name,owner_email`,
      { headers }
    );

    const allOrgs = await listResponse.json();
    console.log('📊 Organizações encontradas:');
    allOrgs.forEach(org => {
      console.log(`  - ${org.name} (${org.owner_email}) - ID: ${org.id}`);
    });

    // Verificar se temp2@admin.com existe
    const temp2Org = allOrgs.find(org => org.owner_email === 'temp2@admin.com');

    if (temp2Org) {
      console.log('✅ Organização temp2@admin.com já existe!');
      console.log(`   ID: ${temp2Org.id}`);
      console.log(`   Nome: ${temp2Org.name}`);
      return temp2Org.id;
    } else {
      console.log('❌ Organização temp2@admin.com não encontrada');
      console.log('➕ Criando nova organização...');

      const createResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/organizations`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: 'Organização Temp2',
            owner_email: 'temp2@admin.com',
            created_at: new Date().toISOString()
          })
        }
      );

      if (createResponse.ok) {
        const newOrg = await createResponse.json();
        console.log('✅ Organização criada com sucesso!');
        console.log(`   ID: ${newOrg[0].id}`);
        console.log(`   Nome: ${newOrg[0].name}`);
        return newOrg[0].id;
      } else {
        const error = await createResponse.text();
        console.error('❌ Erro ao criar organização:', error);
        return null;
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error);
    return null;
  }
}

// Executar verificação
checkAndCreateOrganization().then(orgId => {
  if (orgId) {
    console.log(`\n🎯 Organização pronta! ID: ${orgId}`);
    console.log('📋 Agora você pode executar o script de mentorados:');
    console.log('   node create-mentorados-batch.js');
  } else {
    console.log('\n❌ Não foi possível preparar a organização');
  }
});