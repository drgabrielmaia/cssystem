import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

const ADMIN_ORG_ID = '9c8c0033-15ea-4e33-a55f-28d81a19693b';

async function checkModuleAccess() {
  console.log('🔍 VERIFICANDO SISTEMA DE ACESSO AOS MÓDULOS');
  console.log('='.repeat(60));

  try {
    // 1. Verificar estrutura das tabelas relacionadas ao acesso
    console.log('📚 1. TODOS OS MÓDULOS DA ADMIN ORGANIZATION...');
    const modulesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/video_modules?select=*&organization_id=eq.${ADMIN_ORG_ID}&order=order_index`,
      { headers }
    );

    if (modulesResponse.ok) {
      const modulesData = await modulesResponse.json();
      console.log(`✅ ${modulesData.length} módulos encontrados:`);

      modulesData.forEach((module, index) => {
        console.log(`  ${index + 1}. ${module.title}`);
        console.log(`     🆔 ID: ${module.id}`);
        console.log(`     ✅ Ativo: ${module.is_active ? 'SIM' : 'NÃO'}`);
        console.log(`     🔒 Acesso: ${module.access_type || 'padrão'}`);
      });

      // 2. Verificar se existe tabela de permissões/acessos
      console.log('\\n👥 2. VERIFICANDO TABELA DE ACESSO DE MENTORADOS...');

      // Tentar encontrar tabela de module_access ou similar
      const accessResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/mentorado_module_access?select=*&limit=10`,
        { headers }
      );

      if (accessResponse.ok) {
        const accessData = await accessResponse.json();
        console.log(`✅ Tabela mentorado_module_access existe: ${accessData.length} registros`);

        if (accessData.length > 0) {
          console.log('📋 Primeiros registros:');
          accessData.slice(0, 3).forEach((access, index) => {
            console.log(`  ${index + 1}. Mentorado: ${access.mentorado_id}, Módulo: ${access.module_id}, Ativo: ${access.is_active}`);
          });
        }
      } else if (accessResponse.status === 404) {
        console.log('❌ Tabela mentorado_module_access não existe');
      } else {
        console.log(`⚠️ Erro ao verificar tabela de acesso: ${accessResponse.status}`);
      }

      // 3. Verificar como o frontend carrega os módulos
      console.log('\\n🔍 3. VERIFICANDO COMO MÓDULOS SÃO CARREGADOS...');

      // Simular o que o frontend faz - buscar módulos para um mentorado específico
      const testMentorado = await fetch(
        `${SUPABASE_URL}/rest/v1/mentorados?select=id,nome_completo&organization_id=eq.${ADMIN_ORG_ID}&limit=1`,
        { headers }
      );

      if (testMentorado.ok) {
        const [mentorado] = await testMentorado.json();

        if (mentorado) {
          console.log(`🧪 Testando com mentorado: ${mentorado.nome_completo}`);

          // Ver se existe algum sistema de filtro de acesso
          const modulesForMentorado = await fetch(
            `${SUPABASE_URL}/rest/v1/video_modules?select=*&organization_id=eq.${ADMIN_ORG_ID}&is_active=eq.true`,
            { headers }
          );

          if (modulesForMentorado.ok) {
            const modules = await modulesForMentorado.json();
            console.log(`📊 ${modules.length} módulos ativos carregados para ${mentorado.nome_completo}`);
          }
        }
      }

      // 4. Contar quantos mentorados existem no total
      console.log('\\n👥 4. TOTAL DE MENTORADOS NA ADMIN ORGANIZATION...');
      const totalMentoradosResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/mentorados?select=id&organization_id=eq.${ADMIN_ORG_ID}&excluido=eq.false`,
        { headers }
      );

      if (totalMentoradosResponse.ok) {
        const totalMentorados = await totalMentoradosResponse.json();
        console.log(`✅ ${totalMentorados.length} mentorados ativos na Admin Organization`);
        console.log(`📊 Para desbloquear: ${totalMentorados.length} × ${modulesData.length} = ${totalMentorados.length * modulesData.length} registros de acesso`);

        return { mentorados: totalMentorados, modules: modulesData };
      }

    } else {
      console.log('❌ Erro ao buscar módulos:', modulesResponse.status);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\\n' + '='.repeat(60));
}

// Executar verificação
checkModuleAccess().then(result => {
  if (result) {
    console.log('\\n💡 PRÓXIMO PASSO:');
    console.log('   Criar registros de acesso para todos os mentorados em todos os módulos');
  }
});