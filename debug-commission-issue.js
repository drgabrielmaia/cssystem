import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function debugCommissionIssue() {
  console.log('🔍 INVESTIGANDO PROBLEMA DE COMISSÃO');
  console.log('='.repeat(60));

  try {
    // 1. Buscar leads mais recentes (últimos 5)
    console.log('📊 1. LEADS MAIS RECENTES...');
    const leadsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?select=*&order=created_at.desc&limit=5`,
      { headers }
    );

    if (leadsResponse.ok) {
      const leads = await leadsResponse.json();
      console.log(`✅ ${leads.length} leads mais recentes:`);

      leads.forEach((lead, index) => {
        console.log(`\\n  ${index + 1}. ${lead.nome_completo}`);
        console.log(`     📧 Email: ${lead.email}`);
        console.log(`     📊 Status: ${lead.status}`);
        console.log(`     👤 Indicador: ${lead.mentorado_indicador_id || 'Nenhum'}`);
        console.log(`     💰 Valor: ${lead.valor_venda || 'N/A'}`);
        console.log(`     📅 Criado: ${new Date(lead.created_at).toLocaleString('pt-BR')}`);
        console.log(`     🆔 ID: ${lead.id}`);
      });

      // 2. Verificar se há leads vendidos com indicador
      const vendidos = leads.filter(l => l.status === 'vendido' && l.mentorado_indicador_id);
      console.log(`\\n🎯 2. LEADS VENDIDOS COM INDICADOR: ${vendidos.length}`);

      if (vendidos.length > 0) {
        for (const lead of vendidos) {
          console.log(`\\n📋 ANALISANDO LEAD: ${lead.nome_completo}`);

          // Verificar se existe comissão gerada
          const comissaoResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/comissoes?select=*&lead_id=eq.${lead.id}`,
            { headers }
          );

          if (comissaoResponse.ok) {
            const comissoes = await comissaoResponse.json();
            console.log(`   💰 Comissões encontradas: ${comissoes.length}`);

            if (comissoes.length > 0) {
              comissoes.forEach((comissao, idx) => {
                console.log(`     ${idx + 1}. Valor: R$ ${comissao.valor_comissao}, Status: ${comissao.status_comissao}`);
                console.log(`        Mentorado: ${comissao.mentorado_id}`);
                console.log(`        Data: ${new Date(comissao.created_at).toLocaleString('pt-BR')}`);
              });
            } else {
              console.log('   ❌ PROBLEMA: Nenhuma comissão gerada automaticamente!');

              // Verificar detalhes do mentorado indicador
              if (lead.mentorado_indicador_id) {
                const mentoradoResponse = await fetch(
                  `${SUPABASE_URL}/rest/v1/mentorados?select=id,nome_completo,email,porcentagem_comissao&id=eq.${lead.mentorado_indicador_id}`,
                  { headers }
                );

                if (mentoradoResponse.ok) {
                  const [mentorado] = await mentoradoResponse.json();
                  if (mentorado) {
                    console.log(`   👤 Mentorado indicador: ${mentorado.nome_completo}`);
                    console.log(`   💰 % Comissão: ${mentorado.porcentagem_comissao}%`);
                    console.log(`   📧 Email: ${mentorado.email}`);

                    // Calcular comissão que deveria ter sido gerada
                    if (lead.valor_venda && mentorado.porcentagem_comissao) {
                      const comissaoEsperada = (lead.valor_venda * mentorado.porcentagem_comissao) / 100;
                      console.log(`   💡 Comissão esperada: R$ ${comissaoEsperada.toFixed(2)}`);
                    }
                  }
                }
              }
            }
          }
        }
      } else {
        console.log('   ⚠️  Nenhum lead vendido com indicador encontrado nos últimos registros');
      }

      // 3. Verificar triggers/automações
      console.log('\\n🔧 3. VERIFICANDO SISTEMA DE AUTOMAÇÃO...');

      // Verificar se existe algum trigger na tabela leads
      console.log('   📋 Checando se há automação quando lead muda para "vendido"...');

      // Verificar view que alimenta o dashboard
      const viewResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/view_dashboard_comissoes_mentorado?select=*&limit=3`,
        { headers }
      );

      if (viewResponse.ok) {
        const viewData = await viewResponse.json();
        console.log(`   📊 View dashboard tem ${viewData.length} registros`);

        if (viewData.length > 0) {
          console.log('   📋 Amostra da view:');
          viewData.forEach((item, idx) => {
            console.log(`     ${idx + 1}. ${item.total_indicacoes} indicações, R$ ${item.total_comissoes} comissões`);
          });
        }
      }

    } else {
      console.log('❌ Erro ao buscar leads:', leadsResponse.status);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\\n' + '='.repeat(60));
  console.log('💡 DIAGNÓSTICO:');
  console.log('   1. Se não há comissões geradas automaticamente, falta trigger/automação');
  console.log('   2. Sistema pode precisar de trigger no Supabase ou lógica no frontend');
}

// Executar diagnóstico
debugCommissionIssue();