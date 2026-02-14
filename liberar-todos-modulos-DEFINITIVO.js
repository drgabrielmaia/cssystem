require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function liberarTodosModulosDefinitivo() {
  console.log('🚀🔥 LIBERANDO TODOS OS MÓDULOS PARA TODOS OS MENTORADOS - COMANDO DEFINITIVO 🔥🚀\n');
  
  try {
    const orgId = '9c8c0033-15ea-4e33-a55f-28d81a19693b';
    
    // 1. Buscar TODOS os mentorados (sem filtro)
    const { data: todosMentorados } = await supabase
      .from('mentorados')
      .select('id, nome_completo, organization_id')
      .eq('organization_id', orgId);
    
    // 2. Buscar TODOS os módulos ativos
    const { data: todosModulos } = await supabase
      .from('video_modules')
      .select('id, title, organization_id')
      .eq('organization_id', orgId)
      .eq('is_active', true);
    
    console.log(`👥 TOTAL DE MENTORADOS: ${todosMentorados?.length || 0}`);
    console.log(`📚 TOTAL DE MÓDULOS: ${todosModulos?.length || 0}`);
    console.log(`🎯 COMBINAÇÕES A CRIAR: ${(todosMentorados?.length || 0) * (todosModulos?.length || 0)}`);
    
    // 3. Criar TODAS as combinações possíveis (forçar 100%)
    const todasCombinacoes = [];
    
    for (const mentorado of todosMentorados || []) {
      for (const modulo of todosModulos || []) {
        todasCombinacoes.push({
          mentorado_id: mentorado.id,
          module_id: modulo.id,
          has_access: true,
          granted_at: new Date().toISOString(),
          granted_by: 'LIBERACAO_TOTAL_DEFINITIVA',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
    
    console.log(`\n🚀 CRIANDO ${todasCombinacoes.length} REGISTROS DE ACESSO...`);
    
    // 4. Inserir em batches grandes para ser mais rápido
    const batchSize = 200;
    let totalInseridos = 0;
    let totalAtualizados = 0;
    
    for (let i = 0; i < todasCombinacoes.length; i += batchSize) {
      const batch = todasCombinacoes.slice(i, i + batchSize);
      
      const { error: upsertError, count } = await supabase
        .from('video_access_control')
        .upsert(batch, {
          onConflict: 'mentorado_id,module_id',
          ignoreDuplicates: false,
          count: 'exact'
        });
      
      if (upsertError) {
        console.error(`❌ Erro no batch ${Math.floor(i/batchSize) + 1}:`, upsertError);
        continue;
      }
      
      totalInseridos += batch.length;
      console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} acessos processados`);
    }
    
    console.log(`\n🎉 PROCESSAMENTO CONCLUÍDO!`);
    console.log(`📊 Total processado: ${totalInseridos} registros`);
    
    // 5. Verificação final DEFINITIVA
    console.log('\n🔍 VERIFICAÇÃO FINAL DEFINITIVA:');
    
    const { count: totalFinal } = await supabase
      .from('video_access_control')
      .select('*', { count: 'exact', head: true })
      .eq('has_access', true);
    
    const esperado = (todosMentorados?.length || 0) * (todosModulos?.length || 0);
    const percentualFinal = (totalFinal / esperado * 100).toFixed(2);
    
    console.log(`📊 TOTAL FINAL: ${totalFinal}/${esperado}`);
    console.log(`📈 COBERTURA FINAL: ${percentualFinal}%`);
    
    // 6. Verificar cada módulo individualmente
    console.log('\n📋 STATUS POR MÓDULO:');
    for (const modulo of todosModulos || []) {
      const { count: moduloCount } = await supabase
        .from('video_access_control')
        .select('*', { count: 'exact', head: true })
        .eq('module_id', modulo.id)
        .eq('has_access', true);
      
      const status = moduloCount === todosMentorados?.length ? '✅ 100%' : `❌ ${moduloCount}/${todosMentorados?.length}`;
      console.log(`📚 ${modulo.title}: ${status}`);
    }
    
    // 7. Status final dramático
    if (percentualFinal === '100.00') {
      console.log('\n🚀🔥🎉 MISSÃO CUMPRIDA COM SUCESSO TOTAL! 🎉🔥🚀');
      console.log('💪 TODOS OS MENTORADOS LIBERADOS!');
      console.log('💪 TODOS OS MÓDULOS ATIVADOS!'); 
      console.log('💪 100% DE COBERTURA GARANTIDA!');
      console.log('💪 ZERO RESTRIÇÕES!');
      console.log('🔥 ACABOU A LOUCURA DE UMA VEZ POR TODAS! 🔥');
    } else {
      console.log('\n⚠️ Ainda não chegamos em 100%. Verificando o que falta...');
    }
    
  } catch (error) {
    console.error('💥 Erro na liberação definitiva:', error);
  }
}

liberarTodosModulosDefinitivo();