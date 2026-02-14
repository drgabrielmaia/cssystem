require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixIAModuleOrganization() {
  console.log('🔧 CONSERTANDO ORGANIZAÇÃO DO MÓDULO IA\n');
  
  try {
    const correctOrgId = '9c8c0033-15ea-4e33-a55f-28d81a19693b';
    const iaModuleId = '6dca50ff-76e2-4478-9c6f-b9faeb0400e1';
    
    console.log(`📚 Atualizando módulo IA (${iaModuleId})`);
    console.log(`🏢 De organization_id: null → ${correctOrgId}`);
    
    // 1. Atualizar o módulo IA para ter a organização correta
    const { error: updateError } = await supabase
      .from('video_modules')
      .update({ organization_id: correctOrgId })
      .eq('id', iaModuleId);
    
    if (updateError) {
      console.error('❌ Erro ao atualizar módulo IA:', updateError);
      return;
    }
    
    console.log('✅ Módulo IA atualizado com sucesso!');
    
    // 2. Verificar estado atual
    const { data: iaModule } = await supabase
      .from('video_modules')
      .select('id, title, organization_id, is_active')
      .eq('id', iaModuleId)
      .single();
    
    console.log('\n📋 ESTADO ATUAL DO MÓDULO IA:');
    console.log(`   Título: ${iaModule?.title}`);
    console.log(`   Organização: ${iaModule?.organization_id}`);
    console.log(`   Ativo: ${iaModule?.is_active}`);
    
    // 3. Verificar acessos existentes para o módulo IA
    const { data: existingIAAccess } = await supabase
      .from('video_access_control')
      .select('mentorado_id, has_access')
      .eq('module_id', iaModuleId)
      .eq('has_access', true);
    
    console.log(`\n🔍 Acessos existentes para IA: ${existingIAAccess?.length || 0}/164`);
    
    // 4. Se necessário, criar acessos faltantes para o módulo IA
    if ((existingIAAccess?.length || 0) < 164) {
      console.log('\n🚀 Criando acessos faltantes para o módulo IA...');
      
      // Buscar todos os mentorados da organização
      const { data: mentorados } = await supabase
        .from('mentorados')
        .select('id')
        .eq('organization_id', correctOrgId);
      
      // Criar set dos mentorados que já têm acesso
      const existingAccessSet = new Set(existingIAAccess?.map(a => a.mentorado_id) || []);
      
      // Filtrar mentorados que não têm acesso
      const mentoradosParaLiberar = mentorados?.filter(m => !existingAccessSet.has(m.id)) || [];
      
      if (mentoradosParaLiberar.length > 0) {
        console.log(`👥 Criando acesso para ${mentoradosParaLiberar.length} mentorados...`);
        
        const accessRecords = mentoradosParaLiberar.map(mentorado => ({
          mentorado_id: mentorado.id,
          module_id: iaModuleId,
          has_access: true,
          granted_at: new Date().toISOString(),
          granted_by: 'fix_organization_id',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        const { error: insertError } = await supabase
          .from('video_access_control')
          .upsert(accessRecords, {
            onConflict: 'mentorado_id,module_id',
            ignoreDuplicates: false
          });
        
        if (insertError) {
          console.error('❌ Erro ao criar acessos:', insertError);
        } else {
          console.log(`✅ ${accessRecords.length} acessos criados para o módulo IA!`);
        }
      }
    }
    
    // 5. Verificar estado final
    console.log('\n🎯 VERIFICAÇÃO FINAL:');
    
    const { data: finalStats } = await supabase
      .from('video_access_control')
      .select('mentorado_id')
      .eq('module_id', iaModuleId)
      .eq('has_access', true);
    
    console.log(`📊 Acessos finais para IA: ${finalStats?.length || 0}/164`);
    
    // 6. Calcular nova cobertura total
    const { data: allAccess } = await supabase
      .from('video_access_control')
      .select('mentorado_id, module_id')
      .eq('has_access', true);
    
    console.log(`\n🎉 COBERTURA TOTAL: ${allAccess?.length || 0}/1148`);
    const percentage = ((allAccess?.length || 0) / 1148 * 100).toFixed(2);
    console.log(`📈 Percentual: ${percentage}%`);
    
  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

fixIAModuleOrganization();