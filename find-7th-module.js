require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findSeventhModule() {
  console.log('🔍 PROCURANDO O 7º MÓDULO FANTASMA\n');
  
  try {
    // Buscar TODOS os módulos (incluindo inativos)
    const { data: allModules } = await supabase
      .from('video_modules')
      .select('id, title, organization_id, is_active, created_at')
      .order('created_at');
    
    console.log(`📚 TOTAL DE MÓDULOS (todos): ${allModules?.length || 0}`);
    
    console.log('\n📋 TODOS OS MÓDULOS:');
    allModules?.forEach((module, index) => {
      console.log(`${index + 1}. ${module.title}`);
      console.log(`   ID: ${module.id}`);
      console.log(`   Org: ${module.organization_id}`);
      console.log(`   Ativo: ${module.is_active}`);
      console.log(`   Criado: ${module.created_at}`);
      console.log('');
    });
    
    // Contar por organização
    const orgCounts = {};
    allModules?.forEach(module => {
      if (!orgCounts[module.organization_id]) {
        orgCounts[module.organization_id] = { total: 0, active: 0 };
      }
      orgCounts[module.organization_id].total++;
      if (module.is_active) {
        orgCounts[module.organization_id].active++;
      }
    });
    
    console.log('🏢 MÓDULOS POR ORGANIZAÇÃO:');
    Object.entries(orgCounts).forEach(([org, counts]) => {
      console.log(`Org ${org}: ${counts.active} ativos / ${counts.total} total`);
    });
    
    // Verificar se há registros de acesso para módulos inativos
    const { data: accessForInactive } = await supabase
      .from('video_access_control')
      .select(`
        mentorado_id, 
        module_id, 
        has_access,
        video_modules(title, is_active)
      `)
      .eq('has_access', true);
    
    const inactiveModuleAccess = accessForInactive?.filter(access => 
      access.video_modules && !access.video_modules.is_active
    ) || [];
    
    console.log(`\n🔍 ACESSOS PARA MÓDULOS INATIVOS: ${inactiveModuleAccess.length}`);
    if (inactiveModuleAccess.length > 0) {
      console.log('Primeiros 3:', inactiveModuleAccess.slice(0, 3));
    }
    
  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

findSeventhModule();