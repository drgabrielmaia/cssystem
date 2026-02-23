const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://udzmlnnztzzwrphhizol.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA'
);

async function applyOptimization() {
  console.log('=== APLICANDO OTIMIZAÇÕES DE BANCO DE DADOS ===\n');
  
  const sqlFile = path.join(__dirname, 'sql/database_performance_optimization.sql');
  const sqlContent = fs.readFileSync(sqlFile, 'utf8');
  
  // Dividir o SQL em statements individuais
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
  
  console.log(`Total de statements para executar: ${statements.length}\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Pular statements vazios ou apenas comentários
    if (statement.length < 10) continue;
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement
      });
      
      if (error) {
        // Tentar usar curl para statements que falharam com RPC
        console.log(`Statement ${i + 1}: Tentando via HTTP...`);
        
        const response = await fetch('https://udzmlnnztzzwrphhizol.supabase.co/rest/v1/rpc/exec_sql', {
          method: 'POST',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql: statement })
        });
        
        if (response.ok) {
          console.log(`✓ Statement ${i + 1}: OK`);
          successCount++;
        } else {
          console.log(`✗ Statement ${i + 1}: ERRO - ${response.statusText}`);
          errorCount++;
        }
      } else {
        console.log(`✓ Statement ${i + 1}: OK`);
        successCount++;
      }
    } catch (e) {
      console.log(`✗ Statement ${i + 1}: ERRO - ${e.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n=== RESUMO ===`);
  console.log(`Sucessos: ${successCount}`);
  console.log(`Erros: ${errorCount}`);
  console.log(`\n=== OTIMIZAÇÃO CONCLUÍDA ===`);
}

applyOptimization().catch(console.error);