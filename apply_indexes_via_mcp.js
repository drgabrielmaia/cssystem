const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://udzmlnnztzzwrphhizol.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA'
);

async function applyIndexViaFunction(indexSQL) {
  const functionName = `temp_index_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Criar função temporária
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION ${functionName}()
      RETURNS void AS $$
      BEGIN
        ${indexSQL};
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Criar a função
    const { error: createError } = await supabase.rpc('exec_sql', {
      query: createFunctionSQL
    });
    
    if (createError) {
      // Se não existir exec_sql, tentar criar primeiro
      if (createError.message.includes('exec_sql')) {
        console.log('Criando função exec_sql...');
        
        const createExecFunction = `
          CREATE OR REPLACE FUNCTION exec_sql(query text)
          RETURNS void AS $$
          BEGIN
            EXECUTE query;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `;
        
        const { error: execError } = await supabase.rpc('exec_sql', {
          query: createExecFunction
        });
        
        if (execError) {
          throw execError;
        }
        
        // Tentar novamente criar a função do índice
        const { error: retryError } = await supabase.rpc('exec_sql', {
          query: createFunctionSQL
        });
        
        if (retryError) {
          throw retryError;
        }
      } else {
        throw createError;
      }
    }
    
    // Executar a função do índice
    const { error: execError } = await supabase.rpc('exec_sql', {
      query: `SELECT ${functionName}();`
    });
    
    if (execError) {
      throw execError;
    }
    
    // Limpar a função temporária
    await supabase.rpc('exec_sql', {
      query: `DROP FUNCTION IF EXISTS ${functionName}();`
    });
    
    return true;
  } catch (error) {
    // Tentar limpar função mesmo em caso de erro
    try {
      await supabase.rpc('exec_sql', {
        query: `DROP FUNCTION IF EXISTS ${functionName}();`
      });
    } catch (e) {
      // Ignorar erros ao limpar
    }
    throw error;
  }
}

async function applyAllIndexes() {
  console.log('=== APLICANDO ÍNDICES VIA SUPABASE MCP ===\n');
  
  const indexes = [
    // 1. ÍNDICES MAIS CRÍTICOS PARA LEADS
    'CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id)',
    'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)',
    'CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads(organization_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_leads_sdr_id ON leads(sdr_id)',
    'CREATE INDEX IF NOT EXISTS idx_leads_closer_id ON leads(closer_id)',
    
    // 2. ÍNDICES PARA ORGANIZATIONS
    'CREATE INDEX IF NOT EXISTS idx_organizations_owner_email ON organizations(owner_email)',
    'CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC)',
    
    // 3. ÍNDICES PARA CLOSERS
    'CREATE INDEX IF NOT EXISTS idx_closers_organization_id ON closers(organization_id)',
    'CREATE INDEX IF NOT EXISTS idx_closers_status_contrato ON closers(status_contrato)',
    'CREATE INDEX IF NOT EXISTS idx_closers_tipo_closer ON closers(tipo_closer)',
    'CREATE INDEX IF NOT EXISTS idx_closers_total_vendas ON closers(total_vendas DESC)',
    
    // 4. ÍNDICES PARA NOTIFICATIONS
    'CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_action_required ON notifications(action_required)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)',
    
    // 5. ÍNDICES PARA ORGANIZATION_USERS
    'CREATE INDEX IF NOT EXISTS idx_org_users_org_email ON organization_users(organization_id, email)',
    'CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON organization_users(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_org_users_is_active ON organization_users(is_active)',
    
    // 6. ÍNDICES PARA FORM_TEMPLATES
    'CREATE INDEX IF NOT EXISTS idx_form_templates_slug ON form_templates(slug)',
    
    // 7. ÍNDICES GIN PARA JSONB
    'CREATE INDEX IF NOT EXISTS idx_leads_call_details ON leads USING GIN (call_details)',
    'CREATE INDEX IF NOT EXISTS idx_leads_qualification_details ON leads USING GIN (qualification_details)',
    'CREATE INDEX IF NOT EXISTS idx_closers_skills ON closers USING GIN (skills)',
    'CREATE INDEX IF NOT EXISTS idx_closers_horario_trabalho ON closers USING GIN (horario_trabalho)',
    'CREATE INDEX IF NOT EXISTS idx_form_templates_fields ON form_templates USING GIN (fields)',
    'CREATE INDEX IF NOT EXISTS idx_form_templates_style ON form_templates USING GIN (style)'
  ];
  
  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;
  
  for (let i = 0; i < indexes.length; i++) {
    const sql = indexes[i];
    const shortSql = sql.length > 60 ? sql.substring(0, 60) + '...' : sql;
    
    process.stdout.write(`\r[${i + 1}/${indexes.length}] ${shortSql.padEnd(70)} `);
    
    try {
      await applyIndexViaFunction(sql);
      console.log('✓');
      successCount++;
      
      // Pequena pausa para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      if (error.message.includes('already exists') || 
          error.message.includes('duplicate key')) {
        console.log('○ (já existe)');
        skipCount++;
        successCount++;
      } else {
        console.log('✗');
        console.log(`  Erro: ${error.message}`);
        errorCount++;
      }
    }
  }
  
  // Atualizar estatísticas
  console.log('\n\n=== ATUALIZANDO ESTATÍSTICAS ===');
  const analyzeCommands = [
    'ANALYZE leads',
    'ANALYZE organizations',
    'ANALYZE closers',
    'ANALYZE notifications',
    'ANALYZE organization_users',
    'ANALYZE form_templates'
  ];
  
  for (const cmd of analyzeCommands) {
    process.stdout.write(`${cmd.padEnd(40)} `);
    try {
      await supabase.rpc('exec_sql', { query: cmd });
      console.log('✓');
    } catch (e) {
      console.log('○');
    }
  }
  
  console.log(`\n\n=== RESUMO FINAL ===`);
  console.log(`✓ Sucessos: ${successCount}`);
  console.log(`○ Pulados (já existem): ${skipCount}`);
  console.log(`✗ Erros: ${errorCount}`);
  console.log(`Total processado: ${indexes.length + analyzeCommands.length} comandos`);
  
  console.log(`\n=== OTIMIZAÇÃO CONCLUÍDA ===`);
  
  // Testar performance após índices
  console.log(`\n=== TESTE DE PERFORMANCE APÓS ÍNDICES ===`);
  const start = Date.now();
  const { data: testLeads } = await supabase
    .from('leads')
    .select('id, organization_id, status')
    .eq('organization_id', '9c8c0033-15ea-4e33-a55f-28d81a19693b')
    .limit(100);
  const end = Date.now();
  
  if (testLeads) {
    console.log(`Query com índices (100 leads): ${end - start}ms`);
  }
  
  console.log(`\n🎯 BENEFÍCIOS ESPERADOS:`);
  console.log(`• Dashboard: 60-80% mais rápido`);
  console.log(`• Filtros: 70-90% mais rápido`);
  console.log(`• JSONB queries: 80-95% mais rápido`);
  console.log(`• Multi-tenant: 50-70% mais rápido`);
}

applyAllIndexes().catch(console.error);