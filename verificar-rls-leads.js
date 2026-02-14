require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function verificarRLSLeads() {
  console.log('🔍 VERIFICANDO RLS DA TABELA LEADS\n');

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verificar se há políticas RLS ativas na tabela leads
    console.log('📋 Verificando políticas RLS da tabela leads...');
    
    const { data: policies, error } = await supabaseAdmin
      .rpc('get_table_policies', { table_name: 'leads' })
      .catch(async () => {
        // Se a função não existir, usar query direta
        const query = `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename = 'leads'
        `;
        
        return await supabaseAdmin.rpc('execute_sql', { query });
      });

    if (error) {
      console.log('❌ Erro ao verificar políticas:', error);
      
      // Tentar uma abordagem mais simples
      console.log('🔄 Tentando verificar de outra forma...');
      
      // Contar leads total como admin
      const { data: totalLeads, error: totalError } = await supabaseAdmin
        .from('leads')
        .select('id, organization_id', { count: 'exact', head: true });

      if (totalError) {
        console.log('❌ Erro ao contar leads:', totalError);
      } else {
        console.log('📊 Total de leads no sistema:', totalLeads?.length || 'count not available');
      }

      // Verificar como usuário normal (sem service role)
      const supabaseNormal = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: normalLeads, error: normalError } = await supabaseNormal
        .from('leads')
        .select('id, organization_id', { count: 'exact', head: true });

      if (normalError) {
        console.log('❌ Erro como usuário normal:', normalError);
      } else {
        console.log('📊 Leads visíveis como usuário anônimo:', normalLeads?.length || 'count not available');
      }

    } else {
      console.log('✅ Políticas RLS encontradas:');
      console.log(policies);
    }

    // Testar se existe uma política que filtra por organization_id
    console.log('\n🔍 Verificando conteúdo da tabela leads...');
    
    const { data: leadsData, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('id, organization_id, nome_completo')
      .limit(10);

    if (leadsError) {
      console.log('❌ Erro ao buscar leads:', leadsError);
    } else {
      console.log('📋 Amostra de leads encontrados:');
      leadsData?.forEach((lead, index) => {
        console.log(`${index + 1}. ${lead.nome_completo} (Org: ${lead.organization_id})`);
      });

      // Verificar quais organizações existem
      const orgIds = [...new Set(leadsData?.map(l => l.organization_id))];
      console.log('\n🏢 Organizações encontradas nos leads:', orgIds);
    }

    console.log('\n💡 RECOMENDAÇÃO:');
    if (policies && policies.length > 0) {
      console.log('✅ RLS está ativo - você precisa modificar as políticas');
      console.log('   Opção 1: Desabilitar RLS na tabela leads');
      console.log('   Opção 2: Modificar políticas para permitir acesso global');
    } else {
      console.log('✅ RLS não parece estar filtrando - problema pode ser no frontend');
    }

  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

verificarRLSLeads();