require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deepAnalysis() {
  console.log('🔍 ANÁLISE PROFUNDA DA INCONSISTÊNCIA DE COBERTURA\n');
  
  try {
    // 1. Verificar estrutura das tabelas
    const { data: mentorados, error: mentError } = await supabase
      .from('mentorados')
      .select('id, nome_completo, organization_id')
      .order('id');
    
    const { data: modules, error: modError } = await supabase
      .from('video_modules')
      .select('id, title, organization_id, is_active')
      .order('id');
    
    if (mentError) {
      console.error('❌ Erro ao buscar mentorados:', mentError);
      return;
    }
    
    if (modError) {
      console.error('❌ Erro ao buscar módulos:', modError);
      return;
    }
    
    console.log('📊 DADOS BASE:');
    console.log(`👥 Total mentorados: ${mentorados?.length || 0}`);
    console.log(`📚 Total módulos: ${modules?.length || 0}`);
    console.log(`🎯 Combinações esperadas: ${(mentorados?.length || 0) * (modules?.length || 0)}`);
    
    // 2. Verificar organização dos dados
    const orgMentorados = {};
    const orgModules = {};
    
    mentorados?.forEach(m => {
      if (!orgMentorados[m.organization_id]) orgMentorados[m.organization_id] = [];
      orgMentorados[m.organization_id].push(m);
    });
    
    modules?.forEach(m => {
      if (!orgModules[m.organization_id]) orgModules[m.organization_id] = [];
      orgModules[m.organization_id].push(m);
    });
    
    console.log('\n🏢 POR ORGANIZAÇÃO:');
    Object.keys(orgMentorados).forEach(org => {
      const mentCount = orgMentorados[org]?.length || 0;
      const modCount = orgModules[org]?.length || 0;
      console.log(`Org ${org}: ${mentCount} mentorados × ${modCount} módulos = ${mentCount * modCount} combinações`);
    });
    
    // 3. Verificar estado atual do video_access_control
    const { data: allAccess, error: accessError } = await supabase
      .from('video_access_control')
      .select('mentorado_id, module_id, has_access')
      .eq('has_access', true);
    
    if (accessError) {
      console.error('❌ Erro ao buscar acessos:', accessError);
      return;
    }
    
    console.log(`\n📋 REGISTROS DE ACESSO ATUAIS: ${allAccess?.length || 0}`);
    
    // 4. Verificar se há registros duplicados ou inconsistentes
    const accessMap = new Map();
    const duplicates = [];
    
    allAccess?.forEach(access => {
      const key = `${access.mentorado_id}-${access.module_id}`;
      if (accessMap.has(key)) {
        duplicates.push(key);
      } else {
        accessMap.set(key, access);
      }
    });
    
    console.log(`🔄 Duplicatas encontradas: ${duplicates.length}`);
    if (duplicates.length > 0) {
      console.log('Primeiras 5 duplicatas:', duplicates.slice(0, 5));
    }
    
    // 5. Verificar mentorados sem nenhum acesso
    const mentoradosComAcesso = new Set(allAccess?.map(a => a.mentorado_id) || []);
    const mentoradosSemAcesso = mentorados?.filter(m => !mentoradosComAcesso.has(m.id)) || [];
    
    console.log(`\n❌ Mentorados SEM NENHUM acesso: ${mentoradosSemAcesso.length}`);
    if (mentoradosSemAcesso.length > 0) {
      console.log('Primeiros 3:', mentoradosSemAcesso.slice(0, 3).map(m => `${m.id} - ${m.nome_completo}`));
    }
    
    // 6. Verificar módulos sem nenhum acesso
    const modulosComAcesso = new Set(allAccess?.map(a => a.module_id) || []);
    const modulosSemAcesso = modules?.filter(m => !modulosComAcesso.has(m.id)) || [];
    
    console.log(`\n📚 Módulos SEM NENHUM acesso: ${modulosSemAcesso.length}`);
    if (modulosSemAcesso.length > 0) {
      console.log('Módulos sem acesso:', modulosSemAcesso.map(m => `${m.id} - ${m.title}`));
    }
    
    // 7. Análise detalhada por módulo
    console.log('\n🔍 ANÁLISE POR MÓDULO:');
    for (const module of modules || []) {
      const { data: moduleAccess } = await supabase
        .from('video_access_control')
        .select('mentorado_id')
        .eq('module_id', module.id)
        .eq('has_access', true);
      
      console.log(`📚 ${module.title}: ${moduleAccess?.length || 0}/164 mentorados`);
    }
    
    // 8. Verificar se há mentorados inativos ou com problemas
    const { data: allMentorados } = await supabase
      .from('mentorados')
      .select('id, nome_completo, organization_id, created_at')
      .order('created_at');
    
    console.log(`\n👥 TOTAL DE MENTORADOS (incluindo inativos): ${allMentorados?.length || 0}`);
    
    // 9. Matrix de acesso - verificar quais combinações estão faltando
    console.log('\n🎯 COMBINAÇÕES FALTANTES:');
    const missingCombinations = [];
    
    for (const mentorado of mentorados || []) {
      for (const module of modules || []) {
        // Só contar se forem da mesma organização
        if (mentorado.organization_id === module.organization_id) {
          const hasAccess = allAccess?.some(a => 
            a.mentorado_id === mentorado.id && a.module_id === module.id
          );
          
          if (!hasAccess) {
            missingCombinations.push({
              mentorado: mentorado.nome_completo,
              module: module.title,
              mentorado_id: mentorado.id,
              module_id: module.id
            });
          }
        }
      }
    }
    
    console.log(`❌ Total combinações faltantes: ${missingCombinations.length}`);
    if (missingCombinations.length > 0) {
      console.log('Primeiras 5 faltantes:');
      missingCombinations.slice(0, 5).forEach(missing => {
        console.log(`  - ${missing.mentorado} → ${missing.module}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Erro na análise:', error);
  }
}

deepAnalysis();