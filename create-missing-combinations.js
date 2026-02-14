require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createMissingCombinations() {
  console.log('🚀 CRIANDO TODAS AS COMBINAÇÕES FALTANTES PARA 100% DE COBERTURA\n');
  
  try {
    const orgId = '9c8c0033-15ea-4e33-a55f-28d81a19693b';
    
    // 1. Buscar todos os mentorados e módulos da organização
    const { data: mentorados } = await supabase
      .from('mentorados')
      .select('id, nome_completo')
      .eq('organization_id', orgId)
      .order('id');
    
    const { data: modules } = await supabase
      .from('video_modules')
      .select('id, title')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('id');
    
    console.log(`👥 Mentorados: ${mentorados?.length || 0}`);
    console.log(`📚 Módulos: ${modules?.length || 0}`);
    console.log(`🎯 Combinações esperadas: ${(mentorados?.length || 0) * (modules?.length || 0)}`);
    
    // 2. Buscar todos os acessos existentes
    const { data: existingAccess } = await supabase
      .from('video_access_control')
      .select('mentorado_id, module_id')
      .eq('has_access', true);
    
    console.log(`📋 Acessos existentes: ${existingAccess?.length || 0}`);
    
    // 3. Criar map de acessos existentes
    const existingSet = new Set();
    existingAccess?.forEach(access => {
      existingSet.add(`${access.mentorado_id}-${access.module_id}`);
    });
    
    // 4. Encontrar todas as combinações faltantes
    const missingCombinations = [];
    
    for (const mentorado of mentorados || []) {
      for (const module of modules || []) {
        const key = `${mentorado.id}-${module.id}`;
        if (!existingSet.has(key)) {
          missingCombinations.push({
            mentorado_id: mentorado.id,
            module_id: module.id,
            mentorado_name: mentorado.nome_completo,
            module_name: module.title,
            has_access: true,
            granted_at: new Date().toISOString(),
            granted_by: 'final_100_percent_liberation',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
    }
    
    console.log(`❌ Combinações faltantes encontradas: ${missingCombinations.length}`);
    
    if (missingCombinations.length === 0) {
      console.log('🎉 Todas as combinações já existem!');
      return;
    }
    
    console.log('\n📋 PRIMEIRAS 10 COMBINAÇÕES FALTANTES:');
    missingCombinations.slice(0, 10).forEach((combo, index) => {
      console.log(`${index + 1}. ${combo.mentorado_name} → ${combo.module_name}`);
    });
    
    // 5. Inserir as combinações faltantes em batches
    console.log(`\n🚀 Inserindo ${missingCombinations.length} combinações faltantes...`);
    
    const batchSize = 100;
    let totalInseridos = 0;
    
    for (let i = 0; i < missingCombinations.length; i += batchSize) {
      const batch = missingCombinations.slice(i, i + batchSize);
      
      // Remover campos que não são da tabela
      const insertBatch = batch.map(combo => ({
        mentorado_id: combo.mentorado_id,
        module_id: combo.module_id,
        has_access: combo.has_access,
        granted_at: combo.granted_at,
        granted_by: combo.granted_by,
        created_at: combo.created_at,
        updated_at: combo.updated_at
      }));
      
      const { error: insertError } = await supabase
        .from('video_access_control')
        .upsert(insertBatch, {
          onConflict: 'mentorado_id,module_id',
          ignoreDuplicates: false
        });
      
      if (insertError) {
        console.error(`❌ Erro no batch ${Math.floor(i/batchSize) + 1}:`, insertError);
        return;
      }
      
      totalInseridos += insertBatch.length;
      console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${insertBatch.length} acessos criados`);
    }
    
    console.log(`\n🎉 SUCESSO! ${totalInseridos} novos acessos criados!`);
    
    // 6. Verificação final
    const { data: finalAccess } = await supabase
      .from('video_access_control')
      .select('mentorado_id, module_id')
      .eq('has_access', true);
    
    const finalCount = finalAccess?.length || 0;
    const expectedTotal = (mentorados?.length || 0) * (modules?.length || 0);
    const finalPercentage = (finalCount / expectedTotal * 100).toFixed(2);
    
    console.log('\n🎯 RESULTADO FINAL:');
    console.log(`📊 Total de acessos: ${finalCount}/${expectedTotal}`);
    console.log(`📈 Cobertura: ${finalPercentage}%`);
    
    if (finalPercentage === '100.00') {
      console.log('\n🚀🎉 MISSÃO CUMPRIDA! 100% DE COBERTURA ALCANÇADA! 🎉🚀');
      console.log('✅ TODOS OS MÓDULOS LIBERADOS PARA TODOS OS MENTORADOS!');
      console.log('🔥 ACABOU A LOUCURA DE RESTRIÇÃO! 🔥');
    }
    
    // 7. Verificação por módulo para confirmar
    console.log('\n📊 VERIFICAÇÃO POR MÓDULO:');
    for (const module of modules || []) {
      const { data: moduleAccess } = await supabase
        .from('video_access_control')
        .select('mentorado_id')
        .eq('module_id', module.id)
        .eq('has_access', true);
      
      console.log(`📚 ${module.title}: ${moduleAccess?.length || 0}/${mentorados?.length || 0} mentorados`);
    }
    
  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

createMissingCombinations();