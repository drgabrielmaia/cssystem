import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

const ADMIN_ORG_ID = '9c8c0033-15ea-4e33-a55f-28d81a19693b';

async function simpleRankingTest() {
  console.log('🏆 TESTE SIMPLES DO RANKING');
  console.log('='.repeat(50));

  try {
    // 1. Contar mentorados total
    console.log('👥 1. MENTORADOS NA ADMIN ORG...');
    const mentoradosResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?select=id,nome_completo&excluido=eq.false&organization_id=eq.${ADMIN_ORG_ID}&limit=5`,
      { headers }
    );

    if (mentoradosResponse.ok) {
      const mentorados = await mentoradosResponse.json();
      console.log(`✅ ${mentorados.length} mentorados encontrados`);

      if (mentorados.length > 0) {
        console.log('📋 Amostra:');
        mentorados.forEach((m, idx) => {
          console.log(`  ${idx + 1}. ${m.nome_completo}`);
        });
        console.log('🎯 CONCLUSÃO: Ranking DEVE aparecer (tem mentorados)');
      } else {
        console.log('❌ PROBLEMA: Nenhum mentorado na Admin Organization');
      }
    }

    // 2. Testar view diretamente
    console.log('\\n📊 2. TESTE DA VIEW...');
    const viewResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/view_dashboard_comissoes_mentorado?select=*&limit=3`,
      { headers }
    );

    if (viewResponse.ok) {
      const viewData = await viewResponse.json();
      console.log(`📊 View retorna ${viewData.length} registros`);
    } else {
      console.log(`❌ Erro na view: ${viewResponse.status}`);
    }

    // 3. Verificar estado no localStorage (simulação)
    console.log('\\n🔧 3. POSSÍVEIS CAUSAS DO RANKING NÃO APARECER...');
    console.log('   • showRanking = false (estado do componente)');
    console.log('   • ranking.length = 0 (dados não carregaram)');
    console.log('   • Erro JavaScript no console');
    console.log('   • Usuário autenticado em organização diferente');

    console.log('\\n💡 SOLUÇÕES:');
    console.log('   1. Verificar console do browser (F12)');
    console.log('   2. Fazer logout/login para limpar cache');
    console.log('   3. Verificar se ranking está sendo carregado no Network tab');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\\n' + '='.repeat(50));
}

simpleRankingTest();