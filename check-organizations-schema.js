import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function checkOrganizationsSchema() {
  console.log('🔍 VERIFICANDO ESQUEMA DA TABELA ORGANIZATIONS');
  console.log('='.repeat(60));

  try {
    // Buscar uma organização para ver a estrutura
    const orgsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/organizations?select=*&limit=1`,
      { headers }
    );

    if (orgsResponse.ok) {
      const organizations = await orgsResponse.json();

      if (organizations.length > 0) {
        const org = organizations[0];
        console.log('✅ ESTRUTURA DA TABELA ORGANIZATIONS:');
        Object.keys(org).forEach(key => {
          const value = org[key];
          const type = value === null ? 'null' : typeof value;
          console.log(`   • ${key}: ${type} (exemplo: ${value})`);
        });

        // Verificar se existe o campo comissao_fixa_indicacao
        if ('comissao_fixa_indicacao' in org) {
          console.log('\n✅ Campo comissao_fixa_indicacao EXISTE!');
          console.log(`   Valor atual: R$ ${org.comissao_fixa_indicacao}`);
        } else {
          console.log('\n❌ Campo comissao_fixa_indicacao NÃO EXISTE!');
          console.log('   📝 Precisa executar a migração SQL');
        }

        // Listar todas as organizações
        console.log('\n📋 TODAS AS ORGANIZAÇÕES:');
        const allOrgsResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/organizations?select=*`,
          { headers }
        );

        if (allOrgsResponse.ok) {
          const allOrgs = await allOrgsResponse.json();
          allOrgs.forEach((orgItem, index) => {
            console.log(`\n  ${index + 1}. ${orgItem.nome || 'Sem nome'}`);
            console.log(`     🆔 ID: ${orgItem.id}`);
            if ('comissao_fixa_indicacao' in orgItem) {
              console.log(`     💰 Comissão Fixa: R$ ${orgItem.comissao_fixa_indicacao}`);
            }
          });
        }
      } else {
        console.log('❌ Nenhuma organização encontrada');
      }
    } else {
      console.log('❌ Erro ao acessar tabela organizations:', orgsResponse.status);
      const errorText = await orgsResponse.text();
      console.log('Detalhes:', errorText);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\n' + '='.repeat(60));
}

// Executar verificação
checkOrganizationsSchema();