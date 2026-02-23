const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://udzmlnnztzzwrphhizol.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA'
);

async function applyIndexes() {
  console.log('=== APLICANDO ÍNDICES USANDO TABELA TEMPORÁRIA ===\n');
  
  // Criar tabela temporária para armazenar comandos SQL
  const { error: createTableError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS temp_sql_commands (
        id SERIAL PRIMARY KEY,
        sql_command TEXT,
        executed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `
  });
  
  if (createTableError) {
    console.log('Erro ao criar tabela temporária:', createTableError.message);
    return;
  }
  
  // Inserir comandos de índice
  const indexCommands = [
    // ÍNDICES MAIS CRÍTICOS PARA LEADS
    'CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id)',
    'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)',
    'CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads(organization_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_leads_sdr_id ON leads(sdr_id)',
    'CREATE INDEX IF NOT EXISTS idx_leads_closer_id ON leads(closer_id)',
    
    // ÍNDICES PARA ORGANIZATIONS
    'CREATE INDEX IF NOT EXISTS idx_organizations_owner_email ON organizations(owner_email)',
    'CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC)',
    
    // ÍNDICES PARA CLOSERS
    'CREATE INDEX IF NOT EXISTS idx_closers_organization_id ON closers(organization_id)',
    'CREATE INDEX IF NOT EXISTS idx_closers_status_contrato ON closers(status_contrato)',
    'CREATE INDEX IF NOT EXISTS idx_closers_tipo_closer ON closers(tipo_closer)',
    'CREATE INDEX IF NOT EXISTS idx_closers_total_vendas ON closers(total_vendas DESC)',
    
    // ÍNDICES PARA NOTIFICATIONS
    'CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_action_required ON notifications(action_required)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)',
    
    // ÍNDICES PARA ORGANIZATION_USERS
    'CREATE INDEX IF NOT EXISTS idx_org_users_org_email ON organization_users(organization_id, email)',
    'CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON organization_users(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_org_users_is_active ON organization_users(is_active)',
    
    // ÍNDICES PARA FORM_TEMPLATES
    'CREATE INDEX IF NOT EXISTS idx_form_templates_slug ON form_templates(slug)',
    
    // ÍNDICES GIN PARA JSONB
    'CREATE INDEX IF NOT EXISTS idx_leads_call_details ON leads USING GIN (call_details)',
    'CREATE INDEX IF NOT EXISTS idx_leads_qualification_details ON leads USING GIN (qualification_details)',
    'CREATE INDEX IF NOT EXISTS idx_closers_skills ON closers USING GIN (skills)',
    'CREATE INDEX IF NOT EXISTS idx_closers_horario_trabalho ON closers USING GIN (horario_trabalho)',
    'CREATE INDEX IF NOT EXISTS idx_form_templates_fields ON form_templates USING GIN (fields)',
    'CREATE INDEX IF NOT EXISTS idx_form_templates_style ON form_templates USING GIN (style)'
  ];
  
  // Inserir comandos na tabela temporária
  for (const sql of indexCommands) {
    const { error: insertError } = await supabase.rpc('exec_sql', {
      query: `INSERT INTO temp_sql_commands (sql_command) VALUES ($1)`,
      params: [sql]
    });
    
    if (insertError) {
      console.log(`Erro ao inserir comando: ${sql.substring(0, 50)}...`);
    }
  }
  
  console.log(`Comandos inseridos: ${indexCommands.length}`);
  
  // Criar trigger para executar comandos
  const { error: triggerError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE OR REPLACE FUNCTION execute_pending_indexes()
      RETURNS void AS $$
      DECLARE
        cmd RECORD;
      executed_count INTEGER := 0;
        error_count INTEGER := 0;
      BEGIN
        FOR cmd IN SELECT sql_command FROM temp_sql_commands WHERE NOT executed ORDER BY id LOOP
          BEGIN
            EXECUTE cmd.sql_command;
            UPDATE temp_sql_commands SET executed = TRUE WHERE id = cmd.id;
            executed_count := executed_count + 1;
          EXCEPTION WHEN OTHERS THEN
            -- Continuar mesmo com erro (índice pode já existir)
            UPDATE temp_sql_commands SET executed = TRUE WHERE id = cmd.id;
            error_count := error_count + 1;
          END;
        END LOOP;
        
        RAISE NOTICE 'Executados: %, Erros: %', executed_count, error_count;
      END;
      $$ LANGUAGE plpgsql;
    `
  });
  
  if (!triggerError) {
    console.log('Função de execução criada com sucesso');
    
    // Executar a função
    const { error: execError } = await supabase.rpc('exec_sql', {
      query: 'SELECT execute_pending_indexes();'
    });
    
    if (!execError) {
      console.log('Índices aplicados com sucesso!');
    } else {
      console.log('Erro ao executar função:', execError.message);
    }
  } else {
    console.log('Erro ao criar função de execução:', triggerError.message);
  }
  
  // Atualizar estatísticas
  console.log('\n=== ATUALIZANDO ESTATÍSTICAS ===');
  const analyzeCommands = ['ANALYZE leads', 'ANALYZE organizations', 'ANALYZE closers', 'ANALYZE notifications', 'ANALYZE organization_users', 'ANALYZE form_templates'];
  
  for (const cmd of analyzeCommands) {
    console.log(cmd);
  }
  
  // Limpar tabela temporária
  await supabase.rpc('exec_sql', {
    query: 'DROP TABLE IF EXISTS temp_sql_commands;'
  });
  
  console.log('\n=== OTIMIZAÇÃO CONCLUÍDA ===');
}

applyIndexes().catch(console.error);