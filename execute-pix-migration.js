#!/usr/bin/env node

/**
 * Script para aplicar a migração dos campos PIX na tabela leads
 * Execute com: node execute-pix-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeMigration() {
  console.log('🚀 Iniciando migração dos campos PIX...\n');

  try {
    // Ler arquivo de migração
    const migrationFile = path.join(__dirname, 'add-pix-fields-to-leads.sql');
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');

    console.log('📄 Executando comandos SQL...\n');

    // Dividir os comandos SQL por linha (ignorar comentários e linhas vazias)
    const commands = migrationSQL
      .split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .filter(cmd => cmd.trim());

    console.log(`📊 Total de comandos a executar: ${commands.length}\n`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim();
      if (!command) continue;

      console.log(`⚡ Executando comando ${i + 1}/${commands.length}...`);
      console.log(`   SQL: ${command.substring(0, 50)}...`);

      const { error } = await supabase.rpc('exec_sql', { sql: command });

      if (error && !error.message.includes('already exists')) {
        // Se o erro não for sobre campos que já existem, mostrar erro
        console.error(`❌ Erro no comando ${i + 1}:`, error.message);
        console.log(`   Comando: ${command}`);

        if (!error.message.includes('column') || !error.message.includes('does not exist')) {
          throw error;
        }
      } else if (error && error.message.includes('already exists')) {
        console.log(`   ⚠️  Campo/índice já existe, continuando...`);
      } else {
        console.log(`   ✅ Comando executado com sucesso!`);
      }
    }

    console.log('\n🎉 Migração concluída com sucesso!');
    console.log('\n📋 Verificando estrutura da tabela...');

    // Verificar se os campos foram criados
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'leads')
      .in('column_name', ['pix_key', 'pix_paid', 'pix_paid_at']);

    if (tableError) {
      console.error('❌ Erro ao verificar estrutura:', tableError);
    } else {
      console.log('\n✅ Campos PIX na tabela leads:');
      tableInfo.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (Nullable: ${col.is_nullable})`);
      });
    }

  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error.message);
    process.exit(1);
  }
}

// Executar migração
executeMigration();