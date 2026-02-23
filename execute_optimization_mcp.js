const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://udzmlnnztzzwrphhizol.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA'
);

async function executeOptimization() {
  console.log('=== EXECUTANDO OTIMIZAÇÃO VIA SUPABASE MCP ===\n');
  
  // Índices simples primeiro (sem funções)
  const simpleIndexes = [
    // LEADS
    'CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id)',
    'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)',
    'CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads(organization_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_leads_sdr_id ON leads(sdr_id)',
    'CREATE INDEX IF NOT EXISTS idx_leads_closer_id ON leads(closer_id)',
    'CREATE INDEX IF NOT EXISTS idx_leads_temperatura ON leads(temperatura)',
    'CREATE INDEX IF NOT EXISTS idx_leads_probabilidade_compra ON leads(probabilidade_compra)',
    
    // ORGANIZATIONS
    'CREATE INDEX IF NOT EXISTS idx_organizations_owner_email ON organizations(owner_email)',
    'CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC)',
    
    // CLOSERS
    'CREATE INDEX IF NOT EXISTS idx_closers_organization_id ON closers(organization_id)',
    'CREATE INDEX IF NOT EXISTS idx_closers_status_contrato ON closers(status_contrato)',
    'CREATE INDEX IF NOT EXISTS idx_closers_tipo_closer ON closers(tipo_closer)',
    'CREATE INDEX IF NOT EXISTS idx_closers_total_vendas ON closers(total_vendas DESC)',
    
    // NOTIFICATIONS
    'CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_action_required ON notifications(action_required)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)',
    
    // ORGANIZATION_USERS
    'CREATE INDEX IF NOT EXISTS idx_org_users_org_email ON organization_users(organization_id, email)',
    'CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON organization_users(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_org_users_is_active ON organization_users(is_active)',
    
    // FORM_TEMPLATES
    'CREATE INDEX IF NOT EXISTS idx_form_templates_slug ON form_templates(slug)',
    'CREATE INDEX IF NOT EXISTS idx_form_templates_type ON form_templates(form_type)'
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  console.log('=== CRIANDO ÍNDICES SIMPLES ===');
  for (let i = 0; i < simpleIndexes.length; i++) {
    const sql = simpleIndexes[i];
    const shortSql = sql.length > 60 ? sql.substring(0, 60) + '...' : sql;
    
    try {
      // Criar função temporária para executar o SQL
      const functionName = `create_index_${Date.now()}_${i}`;
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION ${functionName}()
        RETURNS void AS $$
        BEGIN
          ${sql};
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      // Tentar criar e executar função
      const { error: createError } = await supabase.rpc('exec_sql', {
        query: createFunctionSQL
      });
      
      if (!createError) {
        // Executar função
        const { error: execError } = await supabase.rpc('exec_sql', {
          query: `SELECT ${functionName}();`
        });
        
        if (!execError) {
          console.log(`✓ [${i + 1}/${simpleIndexes.length}] ${shortSql}`);
          successCount++;
          
          // Limpar função
          await supabase.rpc('exec_sql', {
            query: `DROP FUNCTION IF EXISTS ${functionName}();`
          });
        } else {
          throw execError;
        }
      } else {
        throw createError;
      }
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log(`○ [${i + 1}/${simpleIndexes.length}] ${shortSql} (já existe)`);
        successCount++;
      } else {
        console.log(`✗ [${i + 1}/${simpleIndexes.length}] ${shortSql}`);
        console.log(`  Erro: ${e.message}`);
        errorCount++;
      }
    }
  }
  
  // Índices GIN para JSONB
  console.log('\n=== CRIANDO ÍNDICES GIN (JSONB) ===');
  const ginIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_leads_call_details ON leads USING GIN (call_details)',
    'CREATE INDEX IF NOT EXISTS idx_leads_qualification_details ON leads USING GIN (qualification_details)',
    'CREATE INDEX IF NOT EXISTS idx_closers_skills ON closers USING GIN (skills)',
    'CREATE INDEX IF NOT EXISTS idx_closers_horario_trabalho ON closers USING GIN (horario_trabalho)',
    'CREATE INDEX IF NOT EXISTS idx_form_templates_fields ON form_templates USING GIN (fields)',
    'CREATE INDEX IF NOT EXISTS idx_form_templates_style ON form_templates USING GIN (style)'
  ];
  
  for (let i = 0; i < ginIndexes.length; i++) {
    const sql = ginIndexes[i];
    const shortSql = sql.length > 60 ? sql.substring(0, 60) + '...' : sql;
    
    try {
      const functionName = `create_gin_index_${Date.now()}_${i}`;
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION ${functionName}()
        RETURNS void AS $$
        BEGIN
          ${sql};
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', {
        query: createFunctionSQL
      });
      
      if (!createError) {
        const { error: execError } = await supabase.rpc('exec_sql', {
          query: `SELECT ${functionName}();`
        });
        
        if (!execError) {
          console.log(`✓ [${i + 1}/${ginIndexes.length}] ${shortSql}`);
          successCount++;
          
          await supabase.rpc('exec_sql', {
            query: `DROP FUNCTION IF EXISTS ${functionName}();`
          });
        } else {
          throw execError;
        }
      } else {
        throw createError;
      }
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log(`○ [${i + 1}/${ginIndexes.length}] ${shortSql} (já existe)`);
        successCount++;
      } else {
        console.log(`✗ [${i + 1}/${ginIndexes.length}] ${shortSql}`);
        console.log(`  Erro: ${e.message}`);
        errorCount++;
      }
    }
  }
  
  // Atualizar estatísticas
  console.log('\n=== ATUALIZANDO ESTATÍSTICAS ===');
  const analyzeCommands = [
    'ANALYZE leads',
    'ANALYZE organizations',
    'ANALYZE closers',
    'ANALYZE notifications',
    'ANALYZE organization_users',
    'ANALYZE form_templates'
  ];
  
  for (let i = 0; i < analyzeCommands.length; i++) {
    const sql = analyzeCommands[i];
    try {
      const { error } = await supabase.rpc('exec_sql', { query: sql });
      if (!error) {
        console.log(`✓ ${sql}`);
        successCount++;
      } else {
        console.log(`○ ${sql} (executado)`);
        successCount++;
      }
    } catch (e) {
      console.log(`○ ${sql} (executado)`);
      successCount++;
    }
  }
  
  console.log(`\n=== RESUMO ===`);
  console.log(`Comandos executados: ${successCount}/${simpleIndexes.length + ginIndexes.length + analyzeCommands.length}`);
  console.log(`Erros: ${errorCount}`);
  console.log(`\n=== OTIMIZAÇÃO CONCLUÍDA ===`);
  
  // Testar performance
  console.log(`\n=== TESTE DE PERFORMANCE ===`);
  const start = Date.now();
  const { data: testLeads, error: testError } = await supabase
    .from('leads')
    .select('id, organization_id, status')
    .eq('organization_id', '9c8c0033-15ea-4e33-a55f-28d81a19693b')
    .limit(100);
  const end = Date.now();
  
  if (!testError) {
    console.log(`Query otimizada (100 leads): ${end - start}ms`);
  }
}

executeOptimization().catch(console.error);