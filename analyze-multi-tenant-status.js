const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function analyzeMultiTenantStatus() {
  console.log('=== ANÁLISE COMPLETA DO SISTEMA MULTI-TENANT ===\n');

  try {
    // 1. Verificar estrutura de auth.users e organizações
    console.log('1. ESTRUTURA DE ORGANIZAÇÕES:');
    console.log('-------------------------------');

    // Verificar tabela organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .limit(5);

    if (orgsError) {
      console.log('❌ Erro ao acessar organizations:', orgsError.message);
    } else {
      console.log(`✅ Tabela organizations existe - ${orgs?.length || 0} registros encontrados`);
    }

    // Verificar tabela organization_users
    const { data: orgUsers, error: orgUsersError } = await supabase
      .from('organization_users')
      .select('*')
      .limit(5);

    if (orgUsersError) {
      console.log('❌ Erro ao acessar organization_users:', orgUsersError.message);
    } else {
      console.log(`✅ Tabela organization_users existe - ${orgUsers?.length || 0} registros encontrados`);
    }

    // 2. Verificar tabelas que precisam de organization_id
    console.log('\n2. TABELAS QUE PRECISAM DE MULTI-TENANT:');
    console.log('------------------------------------------');

    const tablesToCheck = [
      'leads',
      'mentorados',
      'metas',
      'formularios_respostas',
      'form_submissions',
      'video_modules',
      'video_lessons',
      'lesson_progress',
      'vendidos',
      'financial_transactions',
      'financial_categories',
      'despesas_mensais',
      'instagram_automations',
      'instagram_funnels',
      'instagram_funnel_steps',
      'instagram_leads',
      'instagram_webhooks',
      'whatsapp_auto_messages',
      'whatsapp_flows',
      'events'
    ];

    for (const table of tablesToCheck) {
      const { data, error } = await supabase
        .from(table)
        .select('organization_id')
        .limit(1);

      if (error) {
        if (error.message.includes('column "organization_id" does not exist')) {
          console.log(`❌ ${table}: Sem coluna organization_id`);
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`⚠️  ${table}: Tabela não existe`);
        } else {
          console.log(`❌ ${table}: Erro - ${error.message}`);
        }
      } else {
        console.log(`✅ ${table}: Tem organization_id`);
      }
    }

    // 3. Verificar RLS (Row Level Security)
    console.log('\n3. STATUS DO RLS (Row Level Security):');
    console.log('---------------------------------------');

    // Testar acesso a dados sem autenticação
    const { data: leadsTest, error: leadsError } = await supabase
      .from('leads')
      .select('id')
      .limit(1);

    if (leadsError && leadsError.message.includes('Row Level Security')) {
      console.log('✅ RLS está ATIVO em leads');
    } else if (!leadsError) {
      console.log('⚠️  RLS pode estar DESATIVADO em leads (conseguiu acessar sem auth)');
    } else {
      console.log('❓ Status RLS em leads incerto:', leadsError.message);
    }

    // 4. Verificar triggers existentes
    console.log('\n4. ANÁLISE DE TRIGGERS:');
    console.log('------------------------');
    console.log('⚠️  Não é possível verificar triggers via cliente anônimo');
    console.log('   Será necessário criar via SQL direto no Supabase');

    // 5. Verificar usuários existentes
    console.log('\n5. USUÁRIOS E ORGANIZAÇÕES EXISTENTES:');
    console.log('----------------------------------------');

    const { data: orgCount } = await supabase
      .from('organizations')
      .select('id', { count: 'exact' });

    const { data: userCount } = await supabase
      .from('organization_users')
      .select('id', { count: 'exact' });

    console.log(`📊 Total de organizações: ${orgCount?.length || 0}`);
    console.log(`👥 Total de usuários vinculados: ${userCount?.length || 0}`);

    // 6. Recomendações
    console.log('\n=== RECOMENDAÇÕES ===');
    console.log('---------------------');
    console.log('1. Criar trigger para auto-criação de organização ao cadastrar usuário');
    console.log('2. Adicionar organization_id em todas as tabelas listadas como faltantes');
    console.log('3. Implementar RLS em todas as tabelas para isolamento por organização');
    console.log('4. Criar função para owners/managers criarem usuários');
    console.log('5. Verificar e corrigir políticas RLS existentes');

  } catch (error) {
    console.error('Erro na análise:', error);
  }
}

analyzeMultiTenantStatus();