require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testeConsultaNetflix() {
  console.log('🧪 TESTANDO CONSULTA EXATA DA PÁGINA NETFLIX\n');
  
  try {
    // Pegar um mentorado aleatório para testar
    const { data: mentoradosTeste } = await supabase
      .from('mentorados')
      .select('id, nome_completo')
      .eq('organization_id', '9c8c0033-15ea-4e33-a55f-28d81a19693b')
      .limit(3);
    
    if (!mentoradosTeste || mentoradosTeste.length === 0) {
      console.log('❌ Nenhum mentorado encontrado para teste');
      return;
    }
    
    console.log('👥 Testando com os mentorados:');
    mentoradosTeste.forEach((m, i) => {
      console.log(`${i + 1}. ${m.nome_completo} (${m.id})`);
    });
    console.log('');
    
    for (const mentorado of mentoradosTeste) {
      console.log(`\n🔍 TESTANDO: ${mentorado.nome_completo}`);
      console.log('=' .repeat(50));
      
      // Reproduzir exatamente a consulta da página Netflix (linha 96-100)
      const { data: accessData, error: accessError } = await supabase
        .from('video_access_control')
        .select('module_id')
        .eq('mentorado_id', mentorado.id)
        .eq('has_access', true);
      
      console.log(`📊 Query de acesso:`);
      console.log(`   Success: ${!accessError}`);
      console.log(`   Error: ${accessError?.message || 'none'}`);
      console.log(`   Registros retornados: ${accessData?.length || 0}`);
      
      if (accessData && accessData.length > 0) {
        console.log('✅ IDs dos módulos acessíveis:');
        accessData.forEach((access, index) => {
          console.log(`   ${index + 1}. ${access.module_id}`);
        });
        
        const accessibleModuleIds = accessData.map(a => a.module_id);
        
        // Testar consulta de módulos (linha 125-130)
        const { data: modulesData, error: modulesError } = await supabase
          .from('video_modules')
          .select('*')
          .in('id', accessibleModuleIds)
          .eq('is_active', true)
          .order('order_index', { ascending: true });
        
        console.log(`\n📚 Query de módulos:`);
        console.log(`   Success: ${!modulesError}`);
        console.log(`   Error: ${modulesError?.message || 'none'}`);
        console.log(`   Módulos retornados: ${modulesData?.length || 0}`);
        
        if (modulesData) {
          modulesData.forEach((module, index) => {
            console.log(`   ${index + 1}. ${module.title}`);
          });
        }
        
        // Testar consulta de aulas (linha 134-140)
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('video_lessons')
          .select('*')
          .in('module_id', accessibleModuleIds)
          .eq('is_active', true)
          .order('order_index', { ascending: true });
        
        console.log(`\n🎬 Query de aulas:`);
        console.log(`   Success: ${!lessonsError}`);
        console.log(`   Error: ${lessonsError?.message || 'none'}`);
        console.log(`   Aulas retornadas: ${lessonsData?.length || 0}`);
        
        // Contar aulas por módulo
        if (lessonsData && modulesData) {
          console.log(`\n📖 Aulas por módulo:`);
          modulesData.forEach((module) => {
            const moduleLessons = lessonsData.filter(l => l.module_id === module.id);
            console.log(`   📚 ${module.title}: ${moduleLessons.length} aulas`);
          });
        }
        
      } else {
        console.log('❌ Nenhum acesso encontrado - mentorado verá 0 módulos');
        
        // Verificar se existem registros para este mentorado
        const { count: totalRecords } = await supabase
          .from('video_access_control')
          .select('*', { count: 'exact', head: true })
          .eq('mentorado_id', mentorado.id);
        
        console.log(`   Total de registros na tabela: ${totalRecords || 0}`);
        
        if (totalRecords === 0) {
          console.log('⚠️ PROBLEMA: Mentorado não tem nenhum registro de acesso!');
        }
      }
    }
    
    // Resumo final
    console.log('\n' + '=' .repeat(70));
    console.log('🎯 RESUMO DO TESTE');
    console.log('=' .repeat(70));
    
    for (const mentorado of mentoradosTeste) {
      const { data: accessData } = await supabase
        .from('video_access_control')
        .select('module_id')
        .eq('mentorado_id', mentorado.id)
        .eq('has_access', true);
      
      const modulosBloqueados = (accessData?.length || 0) < 7;
      const status = modulosBloqueados ? '❌ BLOQUEADO' : '✅ LIBERADO';
      
      console.log(`${status} ${mentorado.nome_completo}: ${accessData?.length || 0}/7 módulos`);
    }
    
  } catch (error) {
    console.error('💥 Erro no teste:', error);
  }
}

testeConsultaNetflix();