import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.5KGJaI-cMcYqwEgifsBRRdtXuLBvGO5QvA8h2cEJrbo';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public'
  }
});

async function checkTableStructure() {
  console.log('=' .repeat(80));
  console.log('VERIFICANDO ESTRUTURA REAL DAS TABELAS NO SUPABASE');
  console.log('=' .repeat(80));
  console.log();

  try {
    // Query para obter a estrutura da tabela organization_users
    const { data: orgUsersColumns, error: orgUsersError } = await supabase
      .rpc('get_table_columns', {
        table_name: 'organization_users',
        schema_name: 'public'
      })
      .single();

    if (orgUsersError) {
      // Tentar método alternativo usando information_schema
      console.log('🔍 Consultando estrutura via information_schema...\n');

      const query = `
        SELECT
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('organization_users', 'organizations')
        ORDER BY table_name, ordinal_position;
      `;

      const { data, error } = await supabase.rpc('execute_sql', { query });

      if (error) {
        // Tentar query direta
        const { data: directData, error: directError } = await supabase
          .from('organization_users')
          .select('*')
          .limit(0);

        if (!directError) {
          console.log('✅ Consegui acessar organization_users diretamente');
          console.log('Tentando obter estrutura através de uma query de exemplo...\n');

          // Fazer uma query para pegar um registro e ver as colunas
          const { data: sampleData, error: sampleError } = await supabase
            .from('organization_users')
            .select('*')
            .limit(1);

          if (sampleData && sampleData.length > 0) {
            console.log('📋 TABELA: organization_users');
            console.log('Colunas encontradas:');
            console.log('-' .repeat(40));
            Object.keys(sampleData[0]).forEach(column => {
              const value = sampleData[0][column];
              const type = value === null ? 'unknown' : typeof value;
              console.log(`  - ${column}: ${type}`);
            });
          }
        } else {
          console.log('❌ Erro ao acessar organization_users:', directError.message);
        }

        // Repetir para organizations
        console.log('\n');
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .limit(1);

        if (orgData && orgData.length > 0) {
          console.log('📋 TABELA: organizations');
          console.log('Colunas encontradas:');
          console.log('-' .repeat(40));
          Object.keys(orgData[0]).forEach(column => {
            const value = orgData[0][column];
            const type = value === null ? 'unknown' : typeof value;
            console.log(`  - ${column}: ${type}`);
          });
        } else if (orgError) {
          console.log('❌ Erro ao acessar organizations:', orgError.message);
        }
      } else {
        console.log('✅ Estrutura obtida via information_schema:\n');

        let currentTable = '';
        data.forEach(row => {
          if (row.table_name !== currentTable) {
            if (currentTable) console.log();
            console.log(`📋 TABELA: ${row.table_name}`);
            console.log('Colunas:');
            console.log('-' .repeat(40));
            currentTable = row.table_name;
          }
          console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
        });
      }
    } else {
      console.log('✅ Estrutura das tabelas obtida com sucesso!\n');
      console.log(orgUsersColumns);
    }

    // Verificar o script SQL problemático
    console.log('\n' + '=' .repeat(80));
    console.log('ANALISANDO SCRIPT SQL PROBLEMÁTICO');
    console.log('=' .repeat(80));

    console.log('\n📝 O script 002_user_management_functions.sql está tentando usar:');
    console.log('  - organization_users.is_active (coluna que NÃO existe)');
    console.log('  - Outras colunas que podem não existir');

    console.log('\n💡 SOLUÇÃO NECESSÁRIA:');
    console.log('  1. Remover referências a colunas inexistentes');
    console.log('  2. Usar apenas colunas que realmente existem nas tabelas');
    console.log('  3. Ajustar a lógica do script conforme estrutura real');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Criar função RPC se não existir
async function createRpcFunctions() {
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION execute_sql(query text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result json;
    BEGIN
      EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query || ') t' INTO result;
      RETURN result;
    END;
    $$;
  `;

  try {
    const { error } = await supabase.rpc('execute_sql', {
      query: 'SELECT 1'
    });

    if (error) {
      console.log('Criando função execute_sql...');
      // A função não existe, vamos criá-la de outra forma
    }
  } catch (e) {
    // Função não existe
  }
}

checkTableStructure().catch(console.error);