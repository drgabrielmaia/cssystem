require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixNewStudent() {
  console.log('🆕 ENCONTRANDO E LIBERANDO NOVO MENTORADO\n');
  
  try {
    const orgId = '9c8c0033-15ea-4e33-a55f-28d81a19693b';
    
    // 1. Buscar todos os mentorados
    const { data: allMentorados } = await supabase
      .from('mentorados')
      .select('id, nome_completo, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    
    console.log(`👥 Total de mentorados: ${allMentorados?.length || 0}`);
    
    // 2. Buscar todos os módulos
    const { data: modules } = await supabase
      .from('video_modules')
      .select('id, title')
      .eq('organization_id', orgId)
      .eq('is_active', true);
    
    console.log(`📚 Total de módulos: ${modules?.length || 0}`);
    
    // 3. Encontrar mentorados sem acesso completo
    const mentoradosSemAcesso = [];
    
    for (const mentorado of allMentorados || []) {
      const { count: accessCount } = await supabase
        .from('video_access_control')
        .select('*', { count: 'exact', head: true })
        .eq('mentorado_id', mentorado.id)
        .eq('has_access', true);
      
      if (accessCount < modules?.length) {
        mentoradosSemAcesso.push({
          ...mentorado,
          accessCount: accessCount || 0,
          missingAccess: (modules?.length || 0) - (accessCount || 0)
        });
      }
    }
    
    console.log(`\n❌ Mentorados sem acesso completo: ${mentoradosSemAcesso.length}`);
    
    if (mentoradosSemAcesso.length === 0) {
      console.log('✅ Todos os mentorados já têm acesso completo!');
      return;
    }
    
    // 4. Mostrar mentorados com problemas
    console.log('\n📋 MENTORADOS COM ACESSO INCOMPLETO:');
    mentoradosSemAcesso.forEach((mentorado, index) => {
      console.log(`${index + 1}. ${mentorado.nome_completo}`);
      console.log(`   ID: ${mentorado.id}`);
      console.log(`   Criado: ${mentorado.created_at}`);
      console.log(`   Acessos: ${mentorado.accessCount}/${modules?.length || 0}`);
      console.log(`   Faltando: ${mentorado.missingAccess} módulos`);
      console.log('');
    });
    
    // 5. Corrigir acessos para cada mentorado problemático
    for (const mentorado of mentoradosSemAcesso) {
      console.log(`🔧 Corrigindo acessos para: ${mentorado.nome_completo}`);
      
      // Encontrar quais módulos estão faltando
      const { data: existingAccess } = await supabase
        .from('video_access_control')
        .select('module_id')
        .eq('mentorado_id', mentorado.id)
        .eq('has_access', true);
      
      const existingModules = new Set(existingAccess?.map(a => a.module_id) || []);
      const missingModules = modules?.filter(m => !existingModules.has(m.id)) || [];
      
      console.log(`   Módulos faltantes: ${missingModules.length}`);
      missingModules.forEach(module => {
        console.log(`   - ${module.title}`);
      });
      
      if (missingModules.length > 0) {
        // Criar acessos faltantes
        const newAccess = missingModules.map(module => ({
          mentorado_id: mentorado.id,
          module_id: module.id,
          has_access: true,
          granted_at: new Date().toISOString(),
          granted_by: 'fix_new_student_access',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        const { error: insertError } = await supabase
          .from('video_access_control')
          .upsert(newAccess, {
            onConflict: 'mentorado_id,module_id',
            ignoreDuplicates: false
          });
        
        if (insertError) {
          console.error(`   ❌ Erro ao criar acessos:`, insertError);
        } else {
          console.log(`   ✅ ${newAccess.length} acessos criados!`);
        }
      }
    }
    
    // 6. Verificação final
    console.log('\n🎯 VERIFICAÇÃO FINAL:');
    
    const { count: finalCount } = await supabase
      .from('video_access_control')
      .select('*', { count: 'exact', head: true })
      .eq('has_access', true);
    
    const expectedTotal = (allMentorados?.length || 0) * (modules?.length || 0);
    const finalPercentage = (finalCount / expectedTotal * 100).toFixed(2);
    
    console.log(`📊 Total de acessos: ${finalCount}/${expectedTotal}`);
    console.log(`📈 Cobertura: ${finalPercentage}%`);
    
    if (finalPercentage === '100.00') {
      console.log('\n🚀🎉 AGORA SIM! 100% DE COBERTURA ALCANÇADA! 🎉🚀');
      console.log('✅ TODOS OS MÓDULOS LIBERADOS PARA TODOS OS MENTORADOS!');
      console.log('🔥 ACABOU A LOUCURA DE RESTRIÇÃO! 🔥');
    }
    
  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

fixNewStudent();