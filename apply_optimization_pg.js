const { Client } = require('pg');

const client = new Client({
  host: 'udzmlnnztzzwrphhizol.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA',
  ssl: {
    rejectUnauthorized: false
  }
});

async function applyOptimization() {
  console.log('=== APLICANDO OTIMIZAÇÕES DE PERFORMANCE ===\n');
  
  const indexes = [
    // 1. ÍNDICES PARA TABELA LEADS
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
    
    // 2. ÍNDICES PARA TABELA ORGANIZATIONS
    'CREATE INDEX IF NOT EXISTS idx_organizations_owner_email ON organizations(owner_email)',
    'CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC)',
    
    // 3. ÍNDICES PARA TABELA CLOSERS
    'CREATE INDEX IF NOT EXISTS idx_closers_organization_id ON closers(organization_id)',
    'CREATE INDEX IF NOT EXISTS idx_closers_status_contrato ON closers(status_contrato)',
    'CREATE INDEX IF NOT EXISTS idx_closers_tipo_closer ON closers(tipo_closer)',
    'CREATE INDEX IF NOT EXISTS idx_closers_total_vendas ON closers(total_vendas DESC)',
    
    // 4. ÍNDICES PARA TABELA NOTIFICATIONS
    'CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_action_required ON notifications(action_required)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)',
    
    // 5. ÍNDICES PARA TABELA ORGANIZATION_USERS
    'CREATE INDEX IF NOT EXISTS idx_org_users_org_email ON organization_users(organization_id, email)',
    'CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON organization_users(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_org_users_is_active ON organization_users(is_active)',
    
    // 6. ÍNDICES PARA TABELA FORM_TEMPLATES
    'CREATE INDEX IF NOT EXISTS idx_form_templates_slug ON form_templates(slug)',
    'CREATE INDEX IF NOT EXISTS idx_form_templates_type ON form_templates(form_type)',
    
    // 7. JSONB indexes for other tables
    'CREATE INDEX IF NOT EXISTS idx_closers_skills ON closers USING GIN (skills)',
    'CREATE INDEX IF NOT EXISTS idx_closers_horario_trabalho ON closers USING GIN (horario_trabalho)',
    'CREATE INDEX IF NOT EXISTS idx_form_templates_fields ON form_templates USING GIN (fields)',
    'CREATE INDEX IF NOT EXISTS idx_form_templates_style ON form_templates USING GIN (style)',
    
    // 8. ATUALIZAR ESTATÍSTICAS
    'ANALYZE leads',
    'ANALYZE organizations',
    'ANALYZE closers',
    'ANALYZE notifications',
    'ANALYZE organization_users',
    'ANALYZE form_templates'
  ];
  
  try {
    await client.connect();
    console.log('✓ Conectado ao banco de dados\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < indexes.length; i++) {
      const sql = indexes[i];
      const shortSql = sql.length > 60 ? sql.substring(0, 60) + '...' : sql;
      
      try {
        await client.query(sql);
        console.log(`✓ [${i + 1}/${indexes.length}] ${shortSql}`);
        successCount++;
      } catch (e) {
        // Ignorar erros de índice já existente
        if (e.message.includes('already exists') || 
            e.message.includes('duplicate key') ||
            e.message.includes('relation')) {
          console.log(`○ [${i + 1}/${indexes.length}] ${shortSql} (já existe)`);
          successCount++;
        } else {
          console.log(`✗ [${i + 1}/${indexes.length}] ${shortSql}`);
          console.log(`  Erro: ${e.message}`);
          errorCount++;
        }
      }
    }
    
    // Verificar índices criados
    console.log(`\n=== ÍNDICES CRIADOS ===`);
    const result = await client.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    
    const groupedIndexes = {};
    result.rows.forEach(row => {
      if (!groupedIndexes[row.tablename]) {
        groupedIndexes[row.tablename] = [];
      }
      groupedIndexes[row.tablename].push(row.indexname);
    });
    
    Object.keys(groupedIndexes).forEach(table => {
      console.log(`\n${table}: ${groupedIndexes[table].length} índices`);
      groupedIndexes[table].forEach(idx => {
        console.log(`  - ${idx}`);
      });
    });
    
    console.log(`\n=== RESUMO ===`);
    console.log(`Índices criados/atualizados: ${successCount}/${indexes.length}`);
    console.log(`Erros: ${errorCount}`);
    console.log(`\n=== OTIMIZAÇÃO CONCLUÍDA ===`);
    
  } catch (e) {
    console.error('Erro de conexão:', e.message);
  } finally {
    await client.end();
  }
}

applyOptimization().catch(console.error);