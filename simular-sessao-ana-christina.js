require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function simularSessaoAnaChristina() {
  console.log('🎭 SIMULANDO SESSÃO REAL DA ANA CHRISTINA\n');
  
  try {
    // 1. Encontrar Ana Christina
    const { data: anaChristina } = await supabase
      .from('mentorados')
      .select('id, nome_completo, email')
      .eq('nome_completo', 'Ana Christina Ferreira Costa')
      .single();
    
    if (!anaChristina) {
      console.log('❌ Ana Christina não encontrada');
      return;
    }
    
    console.log(`👤 MENTORADO: ${anaChristina.nome_completo}`);
    console.log(`📧 Email: ${anaChristina.email || 'N/A'}`);
    console.log(`🆔 ID: ${anaChristina.id}\n`);
    
    // 2. Reproduzir EXATAMENTE o código da página Netflix (linha 95-114)
    console.log('🔍 STEP 1: Verificar acesso aos módulos (linha 96-100)');
    
    const { data: accessData, error: accessError } = await supabase
      .from('video_access_control')
      .select('module_id')
      .eq('mentorado_id', anaChristina.id)
      .eq('has_access', true);
    
    console.log(`   Query success: ${!accessError}`);
    console.log(`   Query error: ${accessError?.message || 'none'}`);
    console.log(`   Registros retornados: ${accessData?.length || 0}`);
    
    let accessibleModuleIds = []
    
    if (accessError) {
      console.log('🔧 STEP 2: Erro detectado, usando fallback (linha 104-114)');
      
      // Reproduzir o fallback (linha 107-111)
      const { data: allModulesData } = await supabase
        .from('video_modules')
        .select('id')
        .eq('is_active', true);
      
      accessibleModuleIds = allModulesData?.map(m => m.id) || [];
      console.log(`   Fallback modules: ${accessibleModuleIds.length}`);
    } else {
      console.log('✅ STEP 2: Query normal funcionou (linha 113)');
      accessibleModuleIds = accessData?.map(a => a.module_id) || [];
    }
    
    console.log(`🔓 Módulos acessíveis: ${accessibleModuleIds.length}`);
    accessibleModuleIds.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });
    
    // 3. Verificar se lista vazia (linha 118-122)
    if (accessibleModuleIds.length === 0) {
      console.log('❌ RESULTADO: Ana Christina verá "Nenhum módulo acessível"');
      return;
    }
    
    // 4. Carregar módulos (linha 125-130)
    console.log('\n📚 STEP 3: Carregar módulos (linha 125-130)');
    
    const { data: modulesData, error: modulesError } = await supabase
      .from('video_modules')
      .select('*')
      .in('id', accessibleModuleIds)
      .eq('is_active', true)
      .order('order_index', { ascending: true });
    
    console.log(`   Modules query success: ${!modulesError}`);
    console.log(`   Modules query error: ${modulesError?.message || 'none'}`);
    console.log(`   Módulos carregados: ${modulesData?.length || 0}`);
    
    if (modulesData) {
      console.log('   📋 Lista de módulos que Ana Christina verá:');
      modulesData.forEach((module, index) => {
        console.log(`      ${index + 1}. ${module.title} (${module.is_active ? 'ATIVO' : 'INATIVO'})`);
      });
    }
    
    // 5. Carregar aulas (linha 133-140)
    console.log('\n🎬 STEP 4: Carregar aulas (linha 134-140)');
    
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('video_lessons')
      .select('*')
      .in('module_id', accessibleModuleIds)
      .eq('is_active', true)
      .order('order_index', { ascending: true });
    
    console.log(`   Lessons query success: ${!lessonsError}`);
    console.log(`   Lessons query error: ${lessonsError?.message || 'none'}`);
    console.log(`   Aulas carregadas: ${lessonsData?.length || 0}`);
    
    // 6. Processar dados (linha 172-190)
    console.log('\n🔄 STEP 5: Processar módulos com aulas');
    
    const processedModules = modulesData?.map(module => {
      const moduleLessons = lessonsData?.filter(l => l.module_id === module.id) || [];
      console.log(`      📚 ${module.title}: ${moduleLessons.length} aulas`);
      return {
        ...module,
        lessons: moduleLessons
      };
    }) || [];
    
    // 7. RESULTADO FINAL
    console.log('\n🎯 RESULTADO FINAL - O QUE ANA CHRISTINA VÊ:');
    console.log('=' .repeat(60));
    console.log(`📊 Total de módulos: ${processedModules.length}`);
    console.log(`🎬 Total de aulas: ${lessonsData?.length || 0}`);
    
    console.log('\n📋 MÓDULOS VISÍVEIS:');
    if (processedModules.length === 0) {
      console.log('   ❌ NENHUM MÓDULO VISÍVEL - Ana Christina vê página vazia!');
    } else {
      processedModules.forEach((module, index) => {
        const temAulas = module.lessons.length > 0;
        const status = temAulas ? '✅' : '⚠️ (sem aulas)';
        console.log(`   ${index + 1}. ${status} ${module.title} (${module.lessons.length} aulas)`);
      });
      
      // Verificar especificamente o módulo IA
      const moduloIA = processedModules.find(m => m.title === 'IA');
      if (moduloIA) {
        console.log('\n🤖 MÓDULO IA ESPECÍFICO:');
        console.log(`   ✅ Visível: SIM`);
        console.log(`   📝 Título: ${moduloIA.title}`);
        console.log(`   🎬 Aulas: ${moduloIA.lessons.length}`);
        console.log(`   🟢 Status: ${moduloIA.is_active ? 'ATIVO' : 'INATIVO'}`);
      } else {
        console.log('\n🤖 MÓDULO IA:');
        console.log(`   ❌ Não encontrado na lista final!`);
      }
    }
    
    // 8. Verificar possível problema de cache/sessão
    console.log('\n🔍 DIAGNÓSTICO ADICIONAL:');
    
    // Verificar se o contexto de autenticação está correto
    const { data: authCheck } = await supabase
      .from('mentorados')
      .select('id, nome_completo, organization_id, created_at')
      .eq('id', anaChristina.id)
      .single();
    
    console.log('👤 Dados de autenticação:');
    console.log(`   Nome: ${authCheck?.nome_completo}`);
    console.log(`   Org: ${authCheck?.organization_id}`);
    console.log(`   Criado: ${authCheck?.created_at}`);
    
    // Verificar timestamp dos acessos
    const { data: accessTimestamps } = await supabase
      .from('video_access_control')
      .select('module_id, created_at, granted_by')
      .eq('mentorado_id', anaChristina.id)
      .eq('has_access', true)
      .order('created_at', { ascending: false });
    
    console.log('\n🕐 Timestamps dos acessos:');
    accessTimestamps?.forEach(access => {
      console.log(`   - Criado: ${access.created_at} por ${access.granted_by}`);
    });
    
  } catch (error) {
    console.error('💥 Erro na simulação:', error);
  }
}

simularSessaoAnaChristina();