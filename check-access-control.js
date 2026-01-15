import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

const ADMIN_ORG_ID = '9c8c0033-15ea-4e33-a55f-28d81a19693b';

async function checkAccessControl() {
  console.log('🔍 VERIFICANDO TABELA video_access_control');
  console.log('='.repeat(60));

  try {
    // 1. Verificar se a tabela video_access_control existe
    console.log('📊 1. VERIFICANDO TABELA video_access_control...');
    const accessResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/video_access_control?select=*&limit=10`,
      { headers }
    );

    if (accessResponse.ok) {
      const accessData = await accessResponse.json();
      console.log(`✅ Tabela video_access_control existe: ${accessData.length} registros encontrados`);

      if (accessData.length > 0) {
        console.log('📋 Estrutura da tabela:');
        const sample = accessData[0];
        Object.keys(sample).forEach(key => {
          console.log(`   • ${key}: ${sample[key]}`);
        });

        console.log('\\n📊 Primeiros registros:');
        accessData.slice(0, 5).forEach((record, index) => {
          console.log(`  ${index + 1}. Mentorado: ${record.mentorado_id?.substring(0, 8)}..., Módulo: ${record.module_id?.substring(0, 8)}..., Acesso: ${record.has_access}`);
        });
      } else {
        console.log('❌ Tabela existe mas está vazia');
      }

      // 2. Contar total de registros
      console.log('\\n📊 2. ESTATÍSTICAS DE ACESSO...');
      const totalResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/video_access_control?select=*`,
        { headers }
      );

      if (totalResponse.ok) {
        const allAccess = await totalResponse.json();
        console.log(`📈 Total de registros: ${allAccess.length}`);

        const withAccess = allAccess.filter(a => a.has_access === true).length;
        const withoutAccess = allAccess.filter(a => a.has_access === false).length;

        console.log(`✅ Com acesso: ${withAccess}`);
        console.log(`❌ Sem acesso: ${withoutAccess}`);

        // Agrupar por mentorado
        const byMentorado = {};
        allAccess.forEach(record => {
          if (!byMentorado[record.mentorado_id]) {
            byMentorado[record.mentorado_id] = { total: 0, withAccess: 0 };
          }
          byMentorado[record.mentorado_id].total++;
          if (record.has_access) {
            byMentorado[record.mentorado_id].withAccess++;
          }
        });

        const mentoradosWithFullAccess = Object.values(byMentorado).filter(m => m.withAccess === 3).length;
        const mentoradosWithPartialAccess = Object.values(byMentorado).filter(m => m.withAccess > 0 && m.withAccess < 3).length;
        const mentoradosWithNoAccess = Object.values(byMentorado).filter(m => m.withAccess === 0).length;

        console.log(`\\n👥 DISTRIBUIÇÃO DE ACESSO:`);
        console.log(`🟢 Acesso total (3 módulos): ${mentoradosWithFullAccess} mentorados`);
        console.log(`🟡 Acesso parcial: ${mentoradosWithPartialAccess} mentorados`);
        console.log(`🔴 Sem acesso: ${mentoradosWithNoAccess} mentorados`);
      }

      // 3. Verificar módulos disponíveis
      console.log('\\n📚 3. MÓDULOS DISPONÍVEIS...');
      const modulesResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/video_modules?select=id,title&organization_id=eq.${ADMIN_ORG_ID}&is_active=eq.true&order=order_index`,
        { headers }
      );

      if (modulesResponse.ok) {
        const modules = await modulesResponse.json();
        console.log(`✅ ${modules.length} módulos ativos:`);
        modules.forEach((module, index) => {
          console.log(`  ${index + 1}. ${module.title} (${module.id})`);
        });

        return { modules, totalMentorados: 134 }; // Sabemos que tem 134 mentorados
      }

    } else if (accessResponse.status === 404) {
      console.log('❌ Tabela video_access_control não existe');
    } else {
      console.log(`⚠️ Erro ao verificar tabela: ${accessResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\\n' + '='.repeat(60));
}

// Executar verificação
checkAccessControl().then(result => {
  if (result) {
    console.log('\\n💡 PRÓXIMO PASSO:');
    console.log(`   Garantir que todos os ${result.totalMentorados} mentorados tenham acesso aos ${result.modules.length} módulos`);
    console.log(`   Total de registros necessários: ${result.totalMentorados * result.modules.length}`);
  }
});