import fetch from 'node-fetch';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

async function getSupabaseSchema() {
  console.log('=' .repeat(80));
  console.log('OBTENDO SCHEMA DO SUPABASE VIA API REST');
  console.log('=' .repeat(80));
  console.log();

  // Tentar obter informações do schema via API
  const headers = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  console.log('🔍 Acessando informações do projeto Supabase...');
  console.log('URL:', SUPABASE_URL);
  console.log();

  // Listar as tabelas mais importantes que sabemos que existem
  const knownTables = [
    'organizations',
    'organization_users',
    'mentorados',
    'formularios_respostas',
    'form_submissions',
    'nps_respostas',
    'modulo_iv_vendas_respostas',
    'modulo_iii_gestao_marketing_respostas',
    'video_modules',
    'video_lessons',
    'lesson_progress',
    'metas',
    'notifications'
  ];

  console.log('📋 TESTANDO ACESSO DIRETO ÀS TABELAS VIA REST API:');
  console.log('-' .repeat(80));

  for (const tableName of knownTables) {
    console.log(`\nTestando: ${tableName}`);

    try {
      // Tentar fazer uma query simples para ver se a tabela existe
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=0`,
        { headers }
      );

      if (response.status === 200) {
        console.log(`  ✅ Tabela existe e está acessível`);

        // Tentar obter os headers que indicam as colunas
        const contentRange = response.headers.get('content-range');
        const preferHeaders = response.headers.get('preference-applied');

        if (contentRange) {
          console.log(`  📊 Content-Range: ${contentRange}`);
        }
      } else if (response.status === 404) {
        console.log(`  ❌ Tabela não encontrada (404)`);
      } else if (response.status === 401) {
        console.log(`  🔒 Sem permissão (401)`);
      } else {
        console.log(`  ⚠️ Status: ${response.status}`);
        const text = await response.text();
        if (text.includes('infinite recursion')) {
          console.log(`  ⚠️ ERRO: Recursão infinita nas políticas RLS`);
        } else if (text) {
          console.log(`  Resposta: ${text.substring(0, 100)}...`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Erro: ${error.message}`);
    }
  }

  console.log('\n' + '=' .repeat(80));
  console.log('INFORMAÇÕES DO PROJETO SUPABASE');
  console.log('=' .repeat(80));

  console.log('\n📌 URL do Projeto:', SUPABASE_URL);
  console.log('📌 Project ID:', 'udzmlnnztzzwrphhizol');

  console.log('\n🔗 Links úteis:');
  console.log('   Dashboard: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol');
  console.log('   Table Editor: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/editor');
  console.log('   SQL Editor: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/sql');
  console.log('   Auth/Policies: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/auth/policies');

  console.log('\n⚠️ PROBLEMA IDENTIFICADO:');
  console.log('   Há um erro de "infinite recursion detected in policy for relation organization_users"');
  console.log('   Isso está impedindo o acesso a várias tabelas.');
  console.log('   As políticas RLS precisam ser corrigidas urgentemente!');

  console.log('\n✅ Análise completa!');
}

getSupabaseSchema().catch(console.error);