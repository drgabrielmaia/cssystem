require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRLSPolicies() {
  console.log('🔐 VERIFICANDO POLÍTICAS RLS NA TABELA video_access_control\n');
  
  try {
    // Usar SQL direto para verificar políticas RLS
    const { data: rlsCheck, error: rlsError } = await supabase
      .rpc('exec_sql', {
        sql: `
        -- Verificar se RLS está habilitado
        SELECT 
          schemaname,
          tablename,
          rowsecurity as rls_enabled,
          relacl as table_permissions
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE tablename = 'video_access_control';
        `
      });
    
    if (rlsError) {
      console.log('⚠️ Não foi possível verificar RLS via RPC, tentando outra abordagem...');
      
      // Tentar query direta para comparar service_role vs anon
      console.log('🔍 Testando acessibilidade de registros...');
      
      // Usar service role (deve ver tudo)
      const { data: serviceRoleData, count: serviceRoleCount } = await supabase
        .from('video_access_control')
        .select('*', { count: 'exact' })
        .eq('has_access', true)
        .limit(5);
      
      console.log(`👨‍💼 SERVICE ROLE - Count: ${serviceRoleCount}, Records: ${serviceRoleData?.length || 0}`);
      
      // Verificar alguns IDs específicos
      const { data: sampleRecords } = await supabase
        .from('video_access_control')
        .select('mentorado_id, module_id, has_access, created_at')
        .eq('has_access', true)
        .limit(10);
      
      console.log('\n📋 PRIMEIROS 10 REGISTROS VISÍVEIS:');
      sampleRecords?.forEach((record, index) => {
        console.log(`${index + 1}. ${record.mentorado_id.substring(0,8)}... → ${record.module_id.substring(0,8)}... (${record.has_access})`);
      });
      
      // Tentar buscar registros específicos que deveriam existir
      const { data: mentorados } = await supabase
        .from('mentorados')
        .select('id, nome_completo')
        .eq('organization_id', '9c8c0033-15ea-4e33-a55f-28d81a19693b')
        .limit(5);
      
      const { data: modules } = await supabase
        .from('video_modules')
        .select('id, title')
        .eq('organization_id', '9c8c0033-15ea-4e33-a55f-28d81a19693b')
        .limit(3);
      
      console.log('\n🔍 VERIFICANDO REGISTROS ESPECÍFICOS:');
      for (let i = 0; i < Math.min(3, mentorados?.length || 0); i++) {
        for (let j = 0; j < Math.min(3, modules?.length || 0); j++) {
          const mentorado = mentorados[i];
          const module = modules[j];
          
          const { data: specificRecord } = await supabase
            .from('video_access_control')
            .select('has_access, created_at')
            .eq('mentorado_id', mentorado.id)
            .eq('module_id', module.id);
          
          console.log(`👥 ${mentorado.nome_completo} + 📚 ${module.title}:`);
          console.log(`   Records found: ${specificRecord?.length || 0}`);
          if (specificRecord?.length > 0) {
            specificRecord.forEach(record => {
              console.log(`   - has_access: ${record.has_access}, created: ${record.created_at}`);
            });
          }
        }
      }
      
    } else {
      console.log('📊 RESULTADO RLS:', rlsCheck);
    }
    
    // Verificar se há limitação no SELECT
    console.log('\n🎯 COMPARANDO MÉTODOS DE CONTAGEM:');
    
    // Método 1: COUNT direto
    const { count: countMethod1 } = await supabase
      .from('video_access_control')
      .select('*', { count: 'exact', head: true })
      .eq('has_access', true);
    
    // Método 2: SELECT com count manual
    const { data: selectData } = await supabase
      .from('video_access_control')
      .select('mentorado_id')
      .eq('has_access', true);
    
    // Método 3: SELECT com range específico
    const { data: rangeData1 } = await supabase
      .from('video_access_control')
      .select('mentorado_id')
      .eq('has_access', true)
      .range(0, 999);
    
    const { data: rangeData2 } = await supabase
      .from('video_access_control')
      .select('mentorado_id')
      .eq('has_access', true)
      .range(1000, 1147);
    
    console.log(`📊 COUNT (head): ${countMethod1}`);
    console.log(`📋 SELECT (all): ${selectData?.length || 0}`);
    console.log(`🔢 RANGE (0-999): ${rangeData1?.length || 0}`);
    console.log(`🔢 RANGE (1000-1147): ${rangeData2?.length || 0}`);
    console.log(`🧮 RANGE TOTAL: ${(rangeData1?.length || 0) + (rangeData2?.length || 0)}`);
    
  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

checkRLSPolicies();