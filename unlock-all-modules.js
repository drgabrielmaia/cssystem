import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

const ADMIN_ORG_ID = '9c8c0033-15ea-4e33-a55f-28d81a19693b';

const CURRENT_MODULES = [
  '6f062c99-c9e2-48ee-a366-bb917d401c33', // Médicos de Resultado – Pocket
  'eab5d09c-b4a7-45ee-885d-2b208c0cc261', // Posicionamento Digital Estratégico e Intencional
  'fddb62e8-6eb0-441d-bf4d-02de807d043c'  // Atrai & Encanta
];

async function unlockAllModules() {
  console.log('🔓 DESBLOQUEANDO TODOS OS MÓDULOS PARA TODOS OS MENTORADOS');
  console.log('='.repeat(70));

  try {
    // 1. Buscar todos os mentorados ativos da Admin Organization
    console.log('👥 1. BUSCANDO TODOS OS MENTORADOS...');
    const mentoradosResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/mentorados?select=id,nome_completo&organization_id=eq.${ADMIN_ORG_ID}&excluido=eq.false&order=nome_completo`,
      { headers }
    );

    if (!mentoradosResponse.ok) {
      console.error('❌ Erro ao buscar mentorados:', mentoradosResponse.status);
      return;
    }

    const mentorados = await mentoradosResponse.json();
    console.log(`✅ ${mentorados.length} mentorados encontrados`);

    // 2. Verificar registros existentes
    console.log('\\n🔍 2. VERIFICANDO REGISTROS EXISTENTES...');
    const existingResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/video_access_control?select=mentorado_id,module_id&mentorado_id=in.(${mentorados.map(m => m.id).join(',')})&module_id=in.(${CURRENT_MODULES.join(',')})`,
      { headers }
    );

    const existingAccess = existingResponse.ok ? await existingResponse.json() : [];
    console.log(`📊 ${existingAccess.length} registros de acesso já existem para os módulos corretos`);

    // 3. Calcular registros necessários
    const totalNeeded = mentorados.length * CURRENT_MODULES.length;
    console.log(`📋 Total de registros necessários: ${totalNeeded}`);
    console.log(`📋 Registros a criar: ${totalNeeded - existingAccess.length}`);

    // 4. Criar mapa de acessos existentes
    const existingMap = new Set();
    existingAccess.forEach(access => {
      existingMap.add(`${access.mentorado_id}:${access.module_id}`);
    });

    // 5. Preparar registros para inserção
    const recordsToInsert = [];
    const now = new Date().toISOString();

    mentorados.forEach(mentorado => {
      CURRENT_MODULES.forEach(moduleId => {
        const key = `${mentorado.id}:${moduleId}`;

        if (!existingMap.has(key)) {
          recordsToInsert.push({
            mentorado_id: mentorado.id,
            module_id: moduleId,
            has_access: true,
            granted_at: now,
            granted_by: 'admin_bulk_unlock',
            created_at: now,
            updated_at: now
          });
        }
      });
    });

    console.log(`\\n📝 ${recordsToInsert.length} novos registros serão criados`);

    if (recordsToInsert.length === 0) {
      console.log('🎉 Todos os mentorados já têm acesso a todos os módulos!');
      return;
    }

    // 6. Inserir em lotes para evitar timeout
    const BATCH_SIZE = 50;
    let inserted = 0;
    let errors = 0;

    console.log('\\n🔄 3. CRIANDO REGISTROS DE ACESSO...');

    for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
      const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
      console.log(`\\n📦 LOTE ${Math.floor(i/BATCH_SIZE) + 1}: Inserindo ${batch.length} registros...`);

      try {
        const insertResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/video_access_control`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(batch)
          }
        );

        if (insertResponse.ok) {
          console.log(`  ✅ ${batch.length} registros inseridos com sucesso`);
          inserted += batch.length;
        } else {
          const errorText = await insertResponse.text();
          console.log(`  ❌ Erro no lote: ${insertResponse.status} - ${errorText}`);
          errors += batch.length;
        }

        // Pausa entre lotes
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.log(`  ❌ Erro no lote: ${error.message}`);
        errors += batch.length;
      }
    }

    console.log('\\n📊 RESULTADO DA OPERAÇÃO:');
    console.log(`✅ Registros inseridos: ${inserted}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📊 Total processado: ${inserted + errors}`);

    // 7. Verificação final
    console.log('\\n🔍 4. VERIFICAÇÃO FINAL...');
    const finalCheckResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/video_access_control?select=*&mentorado_id=in.(${mentorados.map(m => m.id).join(',')})&module_id=in.(${CURRENT_MODULES.join(',')})&has_access=eq.true`,
      { headers }
    );

    if (finalCheckResponse.ok) {
      const finalAccess = await finalCheckResponse.json();
      const mentoradosWithFullAccess = {};

      finalAccess.forEach(access => {
        if (!mentoradosWithFullAccess[access.mentorado_id]) {
          mentoradosWithFullAccess[access.mentorado_id] = 0;
        }
        mentoradosWithFullAccess[access.mentorado_id]++;
      });

      const fullAccessCount = Object.values(mentoradosWithFullAccess).filter(count => count === 3).length;

      console.log(`🎯 RESULTADO FINAL:`);
      console.log(`✅ ${fullAccessCount}/${mentorados.length} mentorados têm acesso completo aos 3 módulos`);

      if (fullAccessCount === mentorados.length) {
        console.log('\\n🎉 SUCESSO TOTAL! Todos os mentorados têm acesso a todos os módulos!');

        console.log('\\n📚 MÓDULOS DESBLOQUEADOS:');
        console.log('  1. ✅ Médicos de Resultado – Pocket');
        console.log('  2. ✅ Posicionamento Digital Estratégico e Intencional');
        console.log('  3. ✅ Atrai & Encanta');

        console.log('\\n👥 BENEFICIÁRIOS:');
        console.log(`  ✅ ${mentorados.length} mentorados ativos`);
        console.log('  ✅ Incluindo Thiago Medina e todos os outros');

      } else {
        console.log(`\\n⚠️  ${mentorados.length - fullAccessCount} mentorados ainda não têm acesso completo`);
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }

  console.log('\\n' + '='.repeat(70));
  console.log('💡 PRÓXIMOS PASSOS:');
  console.log('   1. Todos os mentorados agora têm acesso a todos os módulos');
  console.log('   2. Novos mentorados precisarão ter acesso criado automaticamente');
  console.log('   3. Sistema funcionará normalmente para todos');
}

// Executar desbloqueio
unlockAllModules();