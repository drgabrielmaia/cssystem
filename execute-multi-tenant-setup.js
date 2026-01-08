const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// ATENÇÃO: Este script precisa ser executado com credenciais de SERVICE_ROLE
// As credenciais ANON não têm permissão para criar triggers e modificar auth.users

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Você precisa adicionar esta chave

if (!supabaseServiceKey) {
  console.error('❌ ERRO: SUPABASE_SERVICE_KEY não encontrada no .env.local');
  console.log('\n📝 Para executar este script, você precisa:');
  console.log('1. Ir ao painel do Supabase');
  console.log('2. Settings > API');
  console.log('3. Copiar a chave "service_role" (secret)');
  console.log('4. Adicionar no .env.local: SUPABASE_SERVICE_KEY=sua_chave_aqui');
  console.log('\n⚠️  ALTERNATIVA: Execute o SQL diretamente no Supabase SQL Editor');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQLFile(filePath) {
  try {
    console.log(`📄 Lendo arquivo SQL: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');

    // Dividir o SQL em comandos individuais (por ponto e vírgula)
    // Mas preservar ponto e vírgula dentro de funções
    const commands = [];
    let currentCommand = '';
    let inFunction = false;
    let dollarQuoteTag = null;

    const lines = sql.split('\n');
    for (const line of lines) {
      // Detectar início/fim de dollar quotes ($$)
      const dollarMatch = line.match(/\$([A-Za-z_]*)\$/g);
      if (dollarMatch) {
        dollarMatch.forEach(tag => {
          if (!dollarQuoteTag) {
            dollarQuoteTag = tag;
            inFunction = true;
          } else if (tag === dollarQuoteTag) {
            dollarQuoteTag = null;
            inFunction = false;
          }
        });
      }

      currentCommand += line + '\n';

      // Se não estamos dentro de uma função e a linha termina com ;
      if (!inFunction && line.trim().endsWith(';')) {
        const trimmed = currentCommand.trim();
        if (trimmed && !trimmed.startsWith('--')) {
          commands.push(trimmed);
        }
        currentCommand = '';
      }
    }

    // Adicionar último comando se houver
    if (currentCommand.trim()) {
      commands.push(currentCommand.trim());
    }

    console.log(`\n🚀 Executando ${commands.length} comandos SQL...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];

      // Pular comentários e comandos vazios
      if (!command || command.startsWith('--')) continue;

      // Extrair primeira linha para log
      const firstLine = command.split('\n')[0].substring(0, 80);
      process.stdout.write(`[${i + 1}/${commands.length}] ${firstLine}...`);

      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: command
        });

        if (error) {
          // Alguns erros são esperados (ex: DROP IF EXISTS em algo que não existe)
          if (error.message.includes('already exists') ||
              error.message.includes('does not exist') && command.includes('IF EXISTS')) {
            console.log(' ⚠️  (ignorado)');
            successCount++;
          } else {
            console.log(` ❌\n   Erro: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log(' ✅');
          successCount++;
        }
      } catch (err) {
        console.log(` ❌\n   Erro: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Comandos executados com sucesso: ${successCount}`);
    if (errorCount > 0) {
      console.log(`❌ Comandos com erro: ${errorCount}`);
    }
    console.log('='.repeat(50));

    return { successCount, errorCount };

  } catch (error) {
    console.error('❌ Erro ao executar SQL:', error);
    throw error;
  }
}

async function createExecSQLFunction() {
  console.log('🔧 Criando função auxiliar exec_sql...\n');

  const createFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  const { error } = await supabase.rpc('query', { sql: createFunction });

  if (error && !error.message.includes('already exists')) {
    console.log('⚠️  Não foi possível criar função exec_sql');
    console.log('   Você precisará executar o SQL diretamente no Supabase\n');
    return false;
  }

  console.log('✅ Função exec_sql pronta\n');
  return true;
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 SETUP MULTI-TENANT - SUPABASE');
  console.log('='.repeat(60));
  console.log();

  // Verificar se conseguimos criar a função auxiliar
  const canExecute = await createExecSQLFunction();

  if (!canExecute) {
    console.log('\n' + '⚠️ '.repeat(20));
    console.log('\n🔴 ATENÇÃO: Não foi possível executar automaticamente.');
    console.log('\n📋 INSTRUÇÕES MANUAIS:');
    console.log('1. Abra o Supabase Dashboard');
    console.log('2. Vá para SQL Editor');
    console.log('3. Cole o conteúdo do arquivo:');
    console.log(`   ${path.join(__dirname, 'sql', '001_multi_tenant_complete_setup.sql')}`);
    console.log('4. Execute o SQL');
    console.log('\n' + '⚠️ '.repeat(20));
    return;
  }

  // Executar o arquivo SQL principal
  const sqlFile = path.join(__dirname, 'sql', '001_multi_tenant_complete_setup.sql');

  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ Arquivo SQL não encontrado: ${sqlFile}`);
    process.exit(1);
  }

  try {
    await executeSQLFile(sqlFile);

    console.log('\n✅ Setup multi-tenant concluído!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Verificar o funcionamento com verify-multi-tenant-status.js');
    console.log('2. Testar criação de novo usuário');
    console.log('3. Verificar isolamento de dados entre organizações');

  } catch (error) {
    console.error('\n❌ Erro durante o setup:', error);
    console.log('\n💡 Tente executar o SQL manualmente no Supabase Dashboard');
  }
}

// Executar se não estiver sendo importado
if (require.main === module) {
  main();
}