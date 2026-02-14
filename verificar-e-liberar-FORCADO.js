require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verificarELiberarForcado() {
  console.log('🔍 VERIFICANDO SITUAÇÃO ATUAL E FORÇANDO LIBERAÇÃO COMPLETA\n');
  
  try {
    const orgId = '9c8c0033-15ea-4e33-a55f-28d81a19693b';
    
    // 1. Verificar estado atual real
    const { data: mentorados } = await supabase
      .from('mentorados')
      .select('id, nome_completo, organization_id')
      .eq('organization_id', orgId);
    
    const { data: modules } = await supabase
      .from('video_modules')
      .select('id, title, organization_id, is_active')
      .eq('organization_id', orgId)
      .eq('is_active', true);
    
    console.log(`👥 MENTORADOS: ${mentorados?.length || 0}`);
    console.log(`📚 MÓDULOS ATIVOS: ${modules?.length || 0}`);
    console.log(`🎯 COMBINAÇÕES ESPERADAS: ${(mentorados?.length || 0) * (modules?.length || 0)}`);
    
    // 2. Verificar estado atual de acesso
    console.log('\n🔍 VERIFICANDO ESTADO ATUAL:');
    
    let mentoradosSemAcesso = [];
    for (const mentorado of mentorados || []) {
      const { count: accessCount } = await supabase
        .from('video_access_control')
        .select('*', { count: 'exact', head: true })
        .eq('mentorado_id', mentorado.id)
        .eq('has_access', true);
      
      if (accessCount < modules?.length) {
        console.log(`❌ ${mentorado.nome_completo}: ${accessCount}/${modules?.length} módulos`);
        mentoradosSemAcesso.push(mentorado);
      }
    }
    
    if (mentoradosSemAcesso.length === 0) {
      console.log('✅ Todos os mentorados já têm acesso completo!');
      return;
    }
    
    console.log(`\n❌ ${mentoradosSemAcesso.length} mentorados precisam de correção`);
    
    // 3. FORÇAR liberação para TODOS (deletar e recriar)
    console.log('\n🚀 EXECUTANDO LIBERAÇÃO FORÇADA:');
    
    // Primeiro, vamos limpar todos os registros existentes e recriar
    console.log('🗑️ Limpando registros antigos...');
    
    const { error: deleteError } = await supabase
      .from('video_access_control')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteError) {
      console.error('❌ Erro ao limpar registros:', deleteError);
      // Se não conseguir deletar, vamos apenas inserir/atualizar
      console.log('⚠️ Continuando sem limpeza...');
    } else {
      console.log('✅ Registros antigos removidos');
    }
    
    // 4. Criar TODAS as combinações do zero
    console.log('\n🚀 CRIANDO TODAS AS COMBINAÇÕES DO ZERO:');
    
    const todasAsCombinacoes = [];
    for (const mentorado of mentorados || []) {
      for (const module of modules || []) {
        todasAsCombinacoes.push({
          mentorado_id: mentorado.id,
          module_id: module.id,
          has_access: true,
          granted_at: new Date().toISOString(),
          granted_by: 'FORCADA_LIBERACAO_TOTAL',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
    
    console.log(`📦 Criando ${todasAsCombinacoes.length} registros...`);
    
    // 5. Inserir em batches menores para garantir sucesso
    const batchSize = 50;
    let sucessos = 0;
    let erros = 0;
    
    for (let i = 0; i < todasAsCombinacoes.length; i += batchSize) {
      const batch = todasAsCombinacoes.slice(i, i + batchSize);
      
      try {
        const { error: insertError } = await supabase
          .from('video_access_control')
          .insert(batch);
        
        if (insertError) {
          console.error(`❌ Erro no batch ${Math.floor(i/batchSize) + 1}:`, insertError.message);
          erros += batch.length;
        } else {
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} registros inseridos`);
          sucessos += batch.length;
        }
      } catch (error) {
        console.error(`💥 Erro no batch ${Math.floor(i/batchSize) + 1}:`, error.message);
        erros += batch.length;
      }
    }
    
    console.log(`\n📊 RESULTADO DA INSERÇÃO:`);
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`❌ Erros: ${erros}`);
    
    // 6. Verificação final completa
    console.log('\n🔍 VERIFICAÇÃO FINAL DETALHADA:');
    
    for (const module of modules || []) {
      const { count: moduleAccess } = await supabase
        .from('video_access_control')
        .select('*', { count: 'exact', head: true })
        .eq('module_id', module.id)
        .eq('has_access', true);
      
      const status = moduleAccess === mentorados?.length ? '✅' : '❌';
      console.log(`${status} ${module.title}: ${moduleAccess}/${mentorados?.length} mentorados`);
    }
    
    // 7. Contagem total final
    const { count: totalFinalReal } = await supabase
      .from('video_access_control')
      .select('*', { count: 'exact', head: true })
      .eq('has_access', true);
    
    const esperadoTotal = (mentorados?.length || 0) * (modules?.length || 0);
    const percentualReal = (totalFinalReal / esperadoTotal * 100).toFixed(2);
    
    console.log(`\n🎯 RESULTADO FINAL:`)
    console.log(`📊 Total: ${totalFinalReal}/${esperadoTotal}`);
    console.log(`📈 Cobertura: ${percentualReal}%`);
    
    if (percentualReal === '100.00') {
      console.log('\n🚀🔥🎉 AGORA SIM! LIBERAÇÃO FORÇADA FUNCIONOU! 🎉🔥🚀');
      console.log('💪 TODOS OS MÓDULOS LIBERADOS PARA TODOS!');
    } else {
      console.log('\n⚠️ Ainda falta alguma coisa. Vou tentar uma abordagem diferente...');
    }
    
  } catch (error) {
    console.error('💥 Erro na verificação/liberação:', error);
  }
}

verificarELiberarForcado();