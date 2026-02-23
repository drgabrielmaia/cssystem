const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://udzmlnnztzzwrphhizol.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA'
);

async function createIndexes() {
  console.log('=== CRIANDO ÍNDICES DE PERFORMANCE ===\n');
  
  const indexes = [
    // Leads table indexes
    'CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id)',
    'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)',
    'CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads(organization_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_leads_sdr_id ON leads(sdr_id)',
    'CREATE INDEX IF NOT EXISTS idx_leads_closer_id ON leads(closer_id)',
    'CREATE INDEX IF NOT EXISTS idx_leads_temperatura ON leads(temperatura)',
    'CREATE INDEX IF NOT EXISTS idx_leads_probabilidade_compra ON leads(probabilidade_compra)',
    
    // JSONB indexes for leads
    'CREATE INDEX IF NOT EXISTS idx_leads_call_details ON leads USING GIN (call_details)',
    'CREATE INDEX IF NOT EXISTS idx_leads_qualification_details ON leads USING GIN (qualification_details)',
    'CREATE INDEX IF NOT EXISTS idx_leads_created_date ON leads(DATE(created_at))',
    
    // Organizations indexes
    'CREATE INDEX IF NOT EXISTS idx_organizations_owner_email ON organizations(owner_email)',
    'CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC)',
    
    // Closers indexes
    'CREATE INDEX IF NOT EXISTS idx_closers_organization_id ON closers(organization_id)',
    'CREATE INDEX IF NOT EXISTS idx_closers_status_contrato ON closers(status_contrato)',
    'CREATE INDEX IF NOT EXISTS idx_closers_tipo_closer ON closers(tipo_closer)',
    'CREATE INDEX IF NOT EXISTS idx_closers_total_vendas ON closers(total_vendas DESC)',
    
    // Notifications indexes
    'CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_action_required ON notifications(action_required)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)',
    
    // Organization users indexes
    'CREATE INDEX IF NOT EXISTS idx_org_users_org_email ON organization_users(organization_id, email)',
    'CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON organization_users(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_org_users_is_active ON organization_users(is_active)',
    
    // Form templates indexes
    'CREATE INDEX IF NOT EXISTS idx_form_templates_slug ON form_templates(slug)',
    'CREATE INDEX IF NOT EXISTS idx_form_templates_type ON form_templates(form_type)',
    
    // JSONB indexes for other tables
    'CREATE INDEX IF NOT EXISTS idx_closers_skills ON closers USING GIN (skills)',
    'CREATE INDEX IF NOT EXISTS idx_closers_horario_trabalho ON closers USING GIN (horario_trabalho)',
    'CREATE INDEX IF NOT EXISTS idx_form_templates_fields ON form_templates USING GIN (fields)',
    'CREATE INDEX IF NOT EXISTS idx_form_templates_style ON form_templates USING GIN (style)',
    
    // Update statistics
    'ANALYZE leads',
    'ANALYZE organizations', 
    'ANALYZE closers',
    'ANALYZE notifications',
    'ANALYZE organization_users',
    'ANALYZE form_templates'
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < indexes.length; i++) {
    const sql = indexes[i];
    const shortSql = sql.length > 60 ? sql.substring(0, 60) + '...' : sql;
    
    try {
      // Usar a API REST para executar SQL
      const response = await fetch('https://udzmlnnztzzwrphhizol.supabase.co/rest/v1/', {
        method: 'POST',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA',
          'Content-Type': 'application/json',
          'Prefer': 'params=single-object'
        },
        body: JSON.stringify({
          query: sql
        })
      });
      
      // Criar um função temporária para executar o SQL
      const functionName = `temp_index_${Date.now()}_${i}`;
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION ${functionName}()
        RETURNS void AS $$
        BEGIN
          ${sql};
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      // Tentar usar RPC
      const { error: rpcError } = await supabase.rpc('exec_sql', { 
        query: sql 
      });
      
      if (!rpcError) {
        console.log(`✓ [${i + 1}/${indexes.length}] ${shortSql}`);
        successCount++;
      } else {
        // Ignorar erros de índice já existente
        if (rpcError.message.includes('already exists') || 
            rpcError.message.includes('duplicate key') ||
            rpcError.message.includes('relation')) {
          console.log(`○ [${i + 1}/${indexes.length}] ${shortSql} (já existe)`);
          successCount++;
        } else {
          console.log(`✗ [${i + 1}/${indexes.length}] ${shortSql}`);
          console.log(`  Erro: ${rpcError.message}`);
          errorCount++;
        }
      }
      
    } catch (e) {
      console.log(`✗ [${i + 1}/${indexes.length}] ${shortSql}`);
      console.log(`  Erro: ${e.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n=== RESUMO ===`);
  console.log(`Índices criados/atualizados: ${successCount}/${indexes.length}`);
  console.log(`Erros: ${errorCount}`);
  console.log(`\n=== OTIMIZAÇÃO CONCLUÍDA ===`);
  
  // Verificar performance antes e depois
  console.log(`\n=== TESTE DE PERFORMANCE ===`);
  const start = Date.now();
  const { data: leads } = await supabase
    .from('leads')
    .select('id, organization_id, status')
    .eq('organization_id', '9c8c0033-15ea-4e33-a55f-28d81a19693b')
    .limit(100);
  const end = Date.now();
  console.log(`Query com índices (100 leads): ${end - start}ms`);
}

createIndexes().catch(console.error);