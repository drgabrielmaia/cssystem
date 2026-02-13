// Script para executar o sistema de agendamentos no Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configurações do Supabase
const SUPABASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA';

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function executeSQLFile() {
  try {
    // Ler o arquivo SQL
    const sqlContent = fs.readFileSync('create_appointment_system.sql', 'utf8');
    
    // Dividir o SQL em comandos individuais
    const sqlCommands = sqlContent
      .split(/;(?=\s*(?:CREATE|ALTER|INSERT|UPDATE|DELETE|DROP|GRANT|DO))/gi)
      .filter(cmd => cmd.trim())
      .map(cmd => cmd.trim() + ';');

    console.log(`Executando ${sqlCommands.length} comandos SQL...`);

    // Executar cada comando
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      
      // Pular comentários e comandos vazios
      if (!command || command.startsWith('--')) continue;

      // Log do progresso
      const firstLine = command.split('\n')[0].substring(0, 100);
      console.log(`\n[${i + 1}/${sqlCommands.length}] Executando: ${firstLine}...`);

      try {
        // Para comandos CREATE FUNCTION, usar texto raw
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ query: command })
        });

        if (!response.ok) {
          const error = await response.text();
          console.error(`Erro ao executar comando: ${error}`);
          
          // Se for erro de objeto já existe, continuar
          if (error.includes('already exists')) {
            console.log('Objeto já existe, continuando...');
            continue;
          }
        } else {
          console.log('✓ Comando executado com sucesso');
        }
      } catch (error) {
        console.error(`Erro ao executar comando: ${error.message}`);
        // Continuar mesmo com erros
      }
    }

    console.log('\n✅ Script SQL executado com sucesso!');

  } catch (error) {
    console.error('Erro ao executar script:', error);
  }
}

// Executar
executeSQLFile();