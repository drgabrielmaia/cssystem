require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugCountDiscrepancy() {
  console.log('🕵️ DEBUGGING: DISCREPÂNCIA ENTRE CONTAGENS\n');
  
  try {
    const orgId = '9c8c0033-15ea-4e33-a55f-28d81a19693b';
    
    // 1. Contagem total direta
    const { count: totalCount } = await supabase
      .from('video_access_control')
      .select('*', { count: 'exact', head: true })
      .eq('has_access', true);
    
    console.log(`📊 CONTAGEM TOTAL DIRETA: ${totalCount}`);
    
    // 2. Contagem via SELECT
    const { data: allAccess } = await supabase
      .from('video_access_control')
      .select('mentorado_id, module_id, has_access')
      .eq('has_access', true);
    
    console.log(`📋 CONTAGEM VIA SELECT: ${allAccess?.length || 0}`);
    
    // 3. Verificar se há registros com has_access = false
    const { count: falseCount } = await supabase
      .from('video_access_control')
      .select('*', { count: 'exact', head: true })
      .eq('has_access', false);
    
    console.log(`❌ Registros com has_access = false: ${falseCount || 0}`);
    
    // 4. Contagem total de registros (true + false)
    const { count: allCount } = await supabase
      .from('video_access_control')
      .select('*', { count: 'exact', head: true });
    
    console.log(`🔢 TOTAL DE REGISTROS NA TABELA: ${allCount}`);
    
    // 5. Verificar duplicatas com diferente has_access
    const { data: duplicateCheck } = await supabase
      .from('video_access_control')
      .select('mentorado_id, module_id, has_access, created_at')
      .order('mentorado_id, module_id, created_at');
    
    const duplicateMap = new Map();
    const realDuplicates = [];
    
    duplicateCheck?.forEach(record => {
      const key = `${record.mentorado_id}-${record.module_id}`;
      if (duplicateMap.has(key)) {
        realDuplicates.push({
          key,
          existing: duplicateMap.get(key),
          current: record
        });
      } else {
        duplicateMap.set(key, record);
      }
    });
    
    console.log(`\n🔄 DUPLICATAS REAIS ENCONTRADAS: ${realDuplicates.length}`);
    if (realDuplicates.length > 0) {
      console.log('Primeiras 3 duplicatas:');
      realDuplicates.slice(0, 3).forEach((dup, index) => {
        console.log(`${index + 1}. Key: ${dup.key}`);
        console.log(`   Existente: has_access=${dup.existing.has_access}, created_at=${dup.existing.created_at}`);
        console.log(`   Atual: has_access=${dup.current.has_access}, created_at=${dup.current.created_at}`);
      });
    }
    
    // 6. Contagem única por combinação mentorado-módulo
    const uniqueCombinations = new Set();
    allAccess?.forEach(record => {
      uniqueCombinations.add(`${record.mentorado_id}-${record.module_id}`);
    });
    
    console.log(`\n🎯 COMBINAÇÕES ÚNICAS (has_access=true): ${uniqueCombinations.size}`);
    
    // 7. Verificar módulos e mentorados válidos
    const { data: mentorados } = await supabase
      .from('mentorados')
      .select('id')
      .eq('organization_id', orgId);
    
    const { data: modules } = await supabase
      .from('video_modules')
      .select('id')
      .eq('organization_id', orgId)
      .eq('is_active', true);
    
    console.log(`👥 Mentorados válidos: ${mentorados?.length || 0}`);
    console.log(`📚 Módulos válidos: ${modules?.length || 0}`);
    console.log(`🎯 Esperado: ${(mentorados?.length || 0) * (modules?.length || 0)}`);
    
    // 8. Verificar se há registros órfãos (mentorados ou módulos inexistentes)
    const validMentoradoIds = new Set(mentorados?.map(m => m.id) || []);
    const validModuleIds = new Set(modules?.map(m => m.id) || []);
    
    const orphanRecords = allAccess?.filter(record => 
      !validMentoradoIds.has(record.mentorado_id) || 
      !validModuleIds.has(record.module_id)
    ) || [];
    
    console.log(`👻 Registros órfãos: ${orphanRecords.length}`);
    if (orphanRecords.length > 0) {
      console.log('Primeiros 3 órfãos:', orphanRecords.slice(0, 3));
    }
    
    // 9. Contagem final corrigida (só registros válidos)
    const validRecords = allAccess?.filter(record => 
      validMentoradoIds.has(record.mentorado_id) && 
      validModuleIds.has(record.module_id)
    ) || [];
    
    console.log(`\n✅ REGISTROS VÁLIDOS: ${validRecords.length}`);
    const percentage = (validRecords.length / ((mentorados?.length || 0) * (modules?.length || 0)) * 100).toFixed(2);
    console.log(`📈 COBERTURA REAL: ${percentage}%`);
    
  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

debugCountDiscrepancy();