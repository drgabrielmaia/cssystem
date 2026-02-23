// Aplicar índices usando a API REST do Supabase
// Criando funções temporárias para executar os índices

const BASE_URL = 'https://udzmlnnztzzwrphhizol.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA';

async function executeSQL(sql) {
  try {
    const response = await fetch(`${BASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
}

async function createTempFunctionAndExecute(sql) {
  const functionName = `temp_func_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Criar função temporária
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION ${functionName}()
      RETURNS void AS $$
      BEGIN
        ${sql};
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await executeSQL(createFunctionSQL);
    
    // Executar função
    const executeFunctionSQL = `SELECT ${functionName}();`;
    await executeSQL(executeFunctionSQL);
    
    // Limpar função
    const dropFunctionSQL = `DROP FUNCTION IF EXISTS ${functionName}();`;
    await executeSQL(dropFunctionSQL);
    
    return true;
  } catch (error) {
    // Tentar limpar função mesmo em caso de erro
    try {
      const dropFunctionSQL = `DROP FUNCTION IF EXISTS ${functionName}();`;
      await executeSQL(dropFunctionSQL);
    } catch (e) {
      // Ignorar erros ao limpar
    }
    throw error;
  }
}

async function applyIndexes() {
  console.log('=== APLICANDO ÍNDICES DE PERFORMANCE VIA REST API ===\n');
  
  const indexes = [
    // ÍNDICES PARA TABELA LEADS
    'CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id)',
    'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)',
    'CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads(organization_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_leads_sdr_id ON leads(sdr_id)',
    'CREATE INDEX IF NOT EXISTS idx_leads_closer_id ON leads(closer_id)',
    'CREATE INDEX IF NOT EXISTS idx_leads_temperatura ON leads(temperatura)',
    'CREATE INDEX IF NOT EXISTS idx_leads_probabilidade_compra ON leads(probabilidade_compra)',
    'CREATE INDEX IF NOT EXISTS idx_leads_call_details ON leads USING GIN (call_details)',
    'CREATE INDEX IF NOT EXISTS idx_leads_qualification_details ON leads USING GIN (qualification_details)',
    'CREATE INDEX IF NOT EXISTS idx_leads_created_date ON leads(DATE(created_at))',
    
    // ÍNDICES PARA TABELA ORGANIZATIONS
    'CREATE INDEX IF NOT EXISTS idx_organizations_owner_email ON organizations(owner_email)',
    'CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC)',
    
    // ÍNDICES PARA TABELA CLOSERS
    'CREATE INDEX IF NOT EXISTS idx_closers_organization_id ON closers(organization_id)',
    'CREATE INDEX IF NOT EXISTS idx_closers_status_contrato ON closers(status_contrato)',
    'CREATE INDEX IF NOT EXISTS idx_closers_tipo_closer ON closers(tipo_closer)',
    'CREATE INDEX IF NOT EXISTS idx_closers_total_vendas ON closers(total_vendas DESC)',
    'CREATE INDEX IF NOT EXISTS idx_closers_skills ON closers USING GIN (skills)',
    'CREATE INDEX IF NOT EXISTS idx_closers_horario_trabalho ON closers USING GIN (horario_trabalho)',
    
    // ÍNDICES PARA TABELA NOTIFICATIONS
    'CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_action_required ON notifications(action_required)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)',
    
    // ÍNDICES PARA TABELA ORGANIZATION_USERS
    'CREATE INDEX IF NOT EXISTS idx_org_users_org_email ON organization_users(organization_id, email)',
    'CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON organization_users(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_org_users_is_active ON organization_users(is_active)',
    
    // ÍNDICES PARA TABELA FORM_TEMPLATES
    'CREATE INDEX IF NOT EXISTS idx_form_templates_slug ON form_templates(slug)',
    'CREATE INDEX IF NOT EXISTS idx_form_templates_type ON form_templates(form_type)',
    'CREATE INDEX IF NOT EXISTS idx_form_templates_fields ON form_templates USING GIN (fields)',
    'CREATE INDEX IF NOT EXISTS idx_form_templates_style ON form_templates USING GIN (style)',
    
    // ATUALIZAR ESTATÍSTICAS
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
      // Tentar executar SQL diretamente
      await createTempFunctionAndExecute(sql);
      console.log(`✓ [${i + 1}/${indexes.length}] ${shortSql}`);
      successCount++;
    } catch (error) {
      // Verificar se é um erro de índice já existente
      if (error.message.includes('already exists') || 
          error.message.includes('duplicate key')) {
        console.log(`○ [${i + 1}/${indexes.length}] ${shortSql} (já existe)`);
        successCount++;
      } else {
        console.log(`✗ [${i + 1}/${indexes.length}] ${shortSql}`);
        console.log(`  Erro: ${error.message}`);
        errorCount++;
      }
    }
    
    // Pequena pausa para não sobrecarregar a API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n=== RESUMO ===`);
  console.log(`Índices criados/atualizados: ${successCount}/${indexes.length}`);
  console.log(`Erros: ${errorCount}`);
  console.log(`\n=== OTIMIZAÇÃO CONCLUÍDA ===`);
  
  console.log(`\n=== PRÓXIMOS PASSOS ===`);
  console.log('1. Monitorar performance das queries');
  console.log('2. Verificar uso dos índices com pg_stat_user_indexes');
  console.log('3. Considerar particionamento se leads > 100.000 registros');
  console.log('4. Revisar índices não utilizados periodicamente');
}

applyIndexes().catch(console.error);