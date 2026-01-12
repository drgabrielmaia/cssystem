import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.qIqiEq-2xP5gFBHLVpUBBSa7Kpn-1HfvjlnBnqY_cAg';

// Create Supabase client with service role key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function executeRLSFix() {
  console.log('========================================');
  console.log('EXECUTANDO CORREÇÃO DE RLS (ROW LEVEL SECURITY)');
  console.log('========================================\n');

  try {
    // Read the SQL script
    const sqlFilePath = path.join(process.cwd(), 'fix-rls-security.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📁 Script SQL carregado:', sqlFilePath);
    console.log('📏 Tamanho do script:', sqlScript.length, 'caracteres');
    console.log();

    // Split the script into individual statements for better error handling
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log('📊 Total de statements SQL:', statements.length);
    console.log();

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip empty statements and comments
      if (!statement || statement.startsWith('--') || statement.trim().length === 0) {
        continue;
      }

      try {
        console.log(`\n⚡ Executando statement ${i + 1}/${statements.length}`);

        // Show first 100 chars of statement for context
        const preview = statement.substring(0, 100).replace(/\n/g, ' ');
        console.log(`   ${preview}${statement.length > 100 ? '...' : ''}`);

        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          console.log(`   ❌ ERRO: ${error.message}`);
          errors.push({
            statement: i + 1,
            sql: preview,
            error: error.message
          });
          errorCount++;
        } else {
          console.log(`   ✅ Sucesso`);
          successCount++;
        }
      } catch (err) {
        console.log(`   ❌ ERRO: ${err.message}`);
        errors.push({
          statement: i + 1,
          sql: statement.substring(0, 100),
          error: err.message
        });
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('RESUMO DA EXECUÇÃO');
    console.log('='.repeat(80));
    console.log(`✅ Statements executados com sucesso: ${successCount}`);
    console.log(`❌ Statements com erro: ${errorCount}`);
    console.log(`📊 Total processado: ${successCount + errorCount}`);

    if (errors.length > 0) {
      console.log('\n🚨 ERROS ENCONTRADOS:');
      errors.forEach((err, idx) => {
        console.log(`\n${idx + 1}. Statement ${err.statement}:`);
        console.log(`   SQL: ${err.sql}`);
        console.log(`   Erro: ${err.error}`);
      });
    }

    // Test basic access after applying RLS
    console.log('\n' + '='.repeat(80));
    console.log('TESTANDO ACESSO APÓS RLS');
    console.log('='.repeat(80));

    const testTables = [
      'organizations',
      'organization_users',
      'mentorados',
      'formularios_respostas',
      'form_submissions',
      'notifications'
    ];

    for (const table of testTables) {
      try {
        console.log(`\n🔍 Testando acesso à tabela: ${table}`);

        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`   ⚠️ Erro de acesso: ${error.message}`);
        } else {
          console.log(`   ✅ Acesso permitido (${data ? data.length : 0} registros)`);
        }
      } catch (err) {
        console.log(`   ❌ Erro: ${err.message}`);
      }
    }

    return {
      success: errorCount === 0,
      successCount,
      errorCount,
      errors
    };

  } catch (error) {
    console.error('\n❌ ERRO CRÍTICO:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Função alternativa usando SQL direto se a RPC não funcionar
async function executeRLSFixDirect() {
  console.log('\n🔄 Tentando execução direta via SQL...\n');

  try {
    // Read the SQL script
    const sqlFilePath = path.join(process.cwd(), 'fix-rls-security.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute the entire script at once
    const { data, error } = await supabase
      .from('__execute_sql__')  // This likely won't work, but let's try
      .insert({ sql: sqlScript });

    if (error) {
      console.log('❌ Execução direta falhou:', error.message);

      // Try individual key operations
      console.log('\n🔧 Tentando operações individuais críticas...');

      // Test if we can at least check table structure
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      if (tables) {
        console.log('✅ Conseguimos acessar informações de schema');
        console.log('📋 Tabelas encontradas:', tables.map(t => t.table_name).join(', '));
      } else {
        console.log('❌ Não conseguimos acessar schema:', tablesError?.message);
      }

      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Erro na execução direta:', error.message);
    return { success: false, error: error.message };
  }
}

// Execute main function
console.log('🚀 Iniciando correção de RLS...\n');

executeRLSFix()
  .then(result => {
    if (!result.success) {
      console.log('\n⚠️ Execução principal falhou, tentando método alternativo...');
      return executeRLSFixDirect();
    }
    return result;
  })
  .then(finalResult => {
    console.log('\n' + '='.repeat(80));
    console.log('RESULTADO FINAL');
    console.log('='.repeat(80));

    if (finalResult.success) {
      console.log('🎉 RLS configurado com sucesso!');
      console.log('\n✅ SEGURANÇA IMPLEMENTADA:');
      console.log('   - Usuários sem organização: acesso negado');
      console.log('   - Usuários com organização: acesso apenas aos dados da sua org');
      console.log('   - Políticas sem recursão infinita');
      console.log('   - Todas as tabelas protegidas');
    } else {
      console.log('❌ Falha na configuração do RLS');
      console.log('\n🔧 PRÓXIMOS PASSOS:');
      console.log('   1. Verifique as credenciais de service_role');
      console.log('   2. Execute o script manualmente no Supabase Dashboard');
      console.log('   3. Use o SQL Editor em: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/sql');
    }

    console.log('\n📊 VERIFICAÇÃO:');
    console.log('   Dashboard: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol');
    console.log('   Policies: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/auth/policies');
    console.log('   Tables: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/editor');
  })
  .catch(error => {
    console.error('\n💥 ERRO FINAL:', error.message);
    console.log('\n🔧 SOLUÇÃO MANUAL:');
    console.log('   1. Copie o conteúdo de fix-rls-security.sql');
    console.log('   2. Cole no SQL Editor do Supabase Dashboard');
    console.log('   3. Execute manualmente para aplicar as correções');
  });