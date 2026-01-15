import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function checkRankingQuery() {
  console.log('🔍 VERIFICANDO CONSULTA DO RANKING');
  console.log('='.repeat(50));

  try {
    // 1. Verificar view atual
    console.log('📊 1. TESTANDO VIEW ATUAL...');
    const viewResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/view_dashboard_comissoes_mentorado?select=*&limit=10`,
      { headers }
    );

    if (viewResponse.ok) {
      const viewData = await viewResponse.json();
      console.log(`✅ View retornou ${viewData.length} registros`);

      if (viewData.length > 0) {
        console.log('📋 Primeiros registros:');
        viewData.slice(0, 3).forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.mentorado_nome} - ${item.total_indicacoes || 0} indicações`);
        });
      } else {
        console.log('❌ View está vazia - sem indicações registradas');
      }
    } else {
      console.log('❌ Erro ao acessar view:', viewResponse.status);
    }

    // 2. Verificar tabela mentorados diretamente
    console.log('\n👥 2. VERIFICANDO TODOS OS MENTORADOS...');
    const mentoradosResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?select=id,nome_completo,email,organization_id&excluido=eq.false&limit=10&order=nome_completo`,
      { headers }
    );

    if (mentoradosResponse.ok) {
      const mentoradosData = await mentoradosResponse.json();
      console.log(`✅ Encontrados ${mentoradosData.length} mentorados ativos`);

      mentoradosData.slice(0, 5).forEach((mentorado, index) => {
        console.log(`  ${index + 1}. ${mentorado.nome_completo} (${mentorado.email})`);
      });
    } else {
      console.log('❌ Erro ao buscar mentorados:', mentoradosResponse.status);
    }

    // 3. Verificar leads com indicação
    console.log('\n🎯 3. VERIFICANDO LEADS COM INDICAÇÃO...');
    const leadsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?select=id,nome_completo,mentorado_indicador_id,status&mentorado_indicador_id=not.is.null&limit=10`,
      { headers }
    );

    if (leadsResponse.ok) {
      const leadsData = await leadsResponse.json();
      console.log(`✅ Encontrados ${leadsData.length} leads com indicação`);

      if (leadsData.length > 0) {
        leadsData.slice(0, 3).forEach((lead, index) => {
          console.log(`  ${index + 1}. ${lead.nome_completo} - Status: ${lead.status} - Indicador: ${lead.mentorado_indicador_id}`);
        });
      } else {
        console.log('❌ Nenhum lead com indicação encontrado');
      }
    } else {
      console.log('❌ Erro ao buscar leads:', leadsResponse.status);
    }

    // 4. Consulta melhorada para incluir todos os mentorados
    console.log('\n🔧 4. TESTANDO CONSULTA MELHORADA...');
    const improvedResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?select=id,nome_completo,email&excluido=eq.false&limit=10&order=nome_completo`,
      { headers }
    );

    if (improvedResponse.ok) {
      const improvedData = await improvedResponse.json();
      console.log(`✅ Consulta melhorada retornou ${improvedData.length} mentorados`);

      // Simular ranking com zeros para quem não tem indicações
      const simulatedRanking = improvedData.map(mentorado => ({
        mentorado_id: mentorado.id,
        nome_completo: mentorado.nome_completo,
        total_indicacoes: 0,
        indicacoes_vendidas: 0,
        total_comissoes: 0,
        valor_medio_comissao: 0
      }));

      console.log('📊 RANKING SIMULADO (todos com 0 indicações):');
      simulatedRanking.slice(0, 5).forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.nome_completo} - ${item.total_indicacoes} indicações`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('💡 CONCLUSÃO:');
  console.log('   Se view_dashboard_comissoes_mentorado estiver vazia,');
  console.log('   o ranking não aparece. Precisamos mostrar todos');
  console.log('   os mentorados mesmo sem indicações!');
}

// Executar verificação
checkRankingQuery();