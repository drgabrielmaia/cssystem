require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verificarAnaChristinaEModuloIA() {
  console.log('🔍 VERIFICANDO ANA CHRISTINA E MÓDULO IA PARA TODOS\n');
  
  try {
    const orgId = '9c8c0033-15ea-4e33-a55f-28d81a19693b';
    const iaModuleId = '6dca50ff-76e2-4478-9c6f-b9faeb0400e1';
    
    // 1. Encontrar Ana Christina
    const { data: anaChristina } = await supabase
      .from('mentorados')
      .select('id, nome_completo')
      .eq('organization_id', orgId)
      .ilike('nome_completo', '%Ana Christina Ferreira Costa%')
      .single();
    
    if (!anaChristina) {
      console.log('❌ Ana Christina não encontrada, buscando por partes do nome...');
      
      const { data: anasChristinas } = await supabase
        .from('mentorados')
        .select('id, nome_completo')
        .eq('organization_id', orgId)
        .or('nome_completo.ilike.%Ana Christina%,nome_completo.ilike.%Christina%,nome_completo.ilike.%Ferreira Costa%');
      
      console.log('📋 Possíveis correspondências:');
      anasChristinas?.forEach((m, i) => {
        console.log(`${i + 1}. ${m.nome_completo} (${m.id})`);
      });
      
      if (!anasChristinas || anasChristinas.length === 0) {
        console.log('❌ Nenhuma Ana Christina encontrada');
        return;
      }
    }
    
    const targetMentorado = anaChristina || anasChristinas[0];
    console.log(`🎯 Analisando: ${targetMentorado.nome_completo}`);
    console.log(`🆔 ID: ${targetMentorado.id}\n`);
    
    // 2. Verificar acesso específico da Ana Christina ao módulo IA
    const { data: anaIAAccess } = await supabase
      .from('video_access_control')
      .select('*')
      .eq('mentorado_id', targetMentorado.id)
      .eq('module_id', iaModuleId);
    
    console.log('🤖 MÓDULO IA - Ana Christina:');
    console.log(`   Registros encontrados: ${anaIAAccess?.length || 0}`);
    if (anaIAAccess && anaIAAccess.length > 0) {
      anaIAAccess.forEach(access => {
        console.log(`   - has_access: ${access.has_access}, granted_by: ${access.granted_by}, created_at: ${access.created_at}`);
      });
    } else {
      console.log('   ❌ Ana Christina NÃO tem acesso ao módulo IA!');
    }
    
    // 3. Verificar todos os acessos da Ana Christina
    const { data: anaAllAccess } = await supabase
      .from('video_access_control')
      .select('module_id, has_access')
      .eq('mentorado_id', targetMentorado.id)
      .eq('has_access', true);
    
    console.log(`\n📚 TODOS OS MÓDULOS - Ana Christina: ${anaAllAccess?.length || 0}/7`);
    
    // Buscar nomes dos módulos
    const moduleIds = anaAllAccess?.map(a => a.module_id) || [];
    if (moduleIds.length > 0) {
      const { data: modules } = await supabase
        .from('video_modules')
        .select('id, title')
        .in('id', moduleIds);
      
      console.log('✅ Módulos com acesso:');
      modules?.forEach(module => {
        console.log(`   - ${module.title}`);
      });
    }
    
    // 4. Verificar quantos mentorados NÃO têm acesso ao módulo IA
    console.log('\n🔍 VERIFICANDO TODOS OS MENTORADOS SEM ACESSO AO IA:');
    
    const { data: allMentorados } = await supabase
      .from('mentorados')
      .select('id, nome_completo')
      .eq('organization_id', orgId);
    
    const mentoradosSemIA = [];
    
    for (const mentorado of allMentorados || []) {
      const { data: iaAccess } = await supabase
        .from('video_access_control')
        .select('has_access')
        .eq('mentorado_id', mentorado.id)
        .eq('module_id', iaModuleId)
        .eq('has_access', true)
        .single();
      
      if (!iaAccess) {
        mentoradosSemIA.push(mentorado);
      }
    }
    
    console.log(`❌ ${mentoradosSemIA.length}/${allMentorados?.length || 0} mentorados SEM acesso ao módulo IA:`);
    
    if (mentoradosSemIA.length > 0) {
      console.log('\nPrimeiros 10 sem acesso ao IA:');
      mentoradosSemIA.slice(0, 10).forEach((m, i) => {
        console.log(`${i + 1}. ${m.nome_completo}`);
      });
      
      if (mentoradosSemIA.length > 10) {
        console.log(`... e mais ${mentoradosSemIA.length - 10} mentorados`);
      }
      
      // 5. Corrigir acesso para todos que não têm
      console.log(`\n🚀 CRIANDO ACESSO AO MÓDULO IA PARA ${mentoradosSemIA.length} MENTORADOS:`);
      
      const newAccess = mentoradosSemIA.map(mentorado => ({
        mentorado_id: mentorado.id,
        module_id: iaModuleId,
        has_access: true,
        granted_at: new Date().toISOString(),
        granted_by: 'fix_ana_christina_and_ia_module',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      // Inserir em batches
      const batchSize = 50;
      let totalInseridos = 0;
      
      for (let i = 0; i < newAccess.length; i += batchSize) {
        const batch = newAccess.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('video_access_control')
          .upsert(batch, {
            onConflict: 'mentorado_id,module_id',
            ignoreDuplicates: false
          });
        
        if (insertError) {
          console.error(`❌ Erro no batch ${Math.floor(i/batchSize) + 1}:`, insertError);
        } else {
          totalInseridos += batch.length;
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} acessos criados`);
        }
      }
      
      console.log(`\n🎉 ${totalInseridos} acessos ao módulo IA criados!`);
      
      // 6. Verificação final para Ana Christina
      console.log('\n🔍 VERIFICAÇÃO FINAL - Ana Christina:');
      
      const { data: anaFinalAccess } = await supabase
        .from('video_access_control')
        .select('has_access, granted_by')
        .eq('mentorado_id', targetMentorado.id)
        .eq('module_id', iaModuleId)
        .eq('has_access', true)
        .single();
      
      if (anaFinalAccess) {
        console.log('✅ Ana Christina agora TEM acesso ao módulo IA!');
        console.log(`   Liberado por: ${anaFinalAccess.granted_by}`);
      } else {
        console.log('❌ Ana Christina ainda NÃO tem acesso ao módulo IA');
      }
      
      // Verificar contagem total final
      const { count: totalFinal } = await supabase
        .from('video_access_control')
        .select('*', { count: 'exact', head: true })
        .eq('module_id', iaModuleId)
        .eq('has_access', true);
      
      console.log(`\n📊 TOTAL FINAL - Módulo IA: ${totalFinal}/${allMentorados?.length || 0} mentorados`);
      const percentual = ((totalFinal / (allMentorados?.length || 1)) * 100).toFixed(1);
      console.log(`📈 Cobertura do módulo IA: ${percentual}%`);
      
    } else {
      console.log('✅ Todos os mentorados já têm acesso ao módulo IA!');
    }
    
  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

verificarAnaChristinaEModuloIA();