import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function findThiagoMedina() {
  console.log('🔍 BUSCANDO INFORMAÇÕES DO THIAGO MEDINA');
  console.log('='.repeat(50));

  try {
    // Buscar por email específico
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?select=*&email=eq.thiago.codarin@hotmail.com`,
      { headers }
    );

    if (response.ok) {
      const data = await response.json();

      if (data.length > 0) {
        const thiago = data[0];
        console.log('✅ MENTORADO ENCONTRADO:');
        console.log(`📧 Email: ${thiago.email}`);
        console.log(`👤 Nome: ${thiago.nome_completo}`);
        console.log(`🆔 ID: ${thiago.id}`);
        console.log(`🏢 Organization ID: ${thiago.organization_id}`);
        console.log(`📅 Data de entrada: ${thiago.data_entrada}`);
        console.log(`📊 Estado atual: ${thiago.estado_atual}`);
        console.log(`🔑 Status login: ${thiago.status_login}`);
        console.log(`💰 % Comissão: ${thiago.porcentagem_comissao}%`);
        console.log(`🎓 Turma: ${thiago.turma}`);
        console.log(`❌ Excluído: ${thiago.excluido ? 'SIM' : 'NÃO'}`);
        console.log(`📅 Criado em: ${thiago.created_at}`);

        // Buscar informações da organização
        if (thiago.organization_id) {
          console.log('\n🏢 INFORMAÇÕES DA ORGANIZAÇÃO:');
          try {
            const orgResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/organizations?select=*&id=eq.${thiago.organization_id}`,
              { headers }
            );

            if (orgResponse.ok) {
              const orgData = await orgResponse.json();
              if (orgData.length > 0) {
                const org = orgData[0];
                console.log(`📋 Nome: ${org.name}`);
                console.log(`👤 Owner: ${org.owner_email}`);
                console.log(`📞 Admin Phone: ${org.admin_phone || 'Não informado'}`);
              }
            }
          } catch (orgError) {
            console.log('❌ Erro ao buscar organização:', orgError.message);
          }
        }

        return thiago;

      } else {
        console.log('❌ Mentorado não encontrado com o email: thiago.codarin@hotmail.com');

        // Tentar buscar por nome similar
        console.log('\n🔍 Buscando por nome similar...');
        const nameResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/mentorados?select=*&nome_completo=ilike.*thiago*`,
          { headers }
        );

        if (nameResponse.ok) {
          const nameData = await nameResponse.json();
          if (nameData.length > 0) {
            console.log(`✅ Encontrados ${nameData.length} mentorados com 'Thiago' no nome:`);
            nameData.forEach((mentorado, index) => {
              console.log(`  ${index + 1}. ${mentorado.nome_completo} (${mentorado.email})`);
            });
          } else {
            console.log('❌ Nenhum mentorado encontrado com "Thiago" no nome');
          }
        }
      }

    } else {
      console.log('❌ Erro na busca:', response.status, response.statusText);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\n' + '='.repeat(50));
}

// Executar busca
findThiagoMedina();