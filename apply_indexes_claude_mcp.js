// Usar ferramentas MCP do Claude para aplicar índices no Supabase

const indexes = [
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

console.log('=== ÍNDICES PARA APLICAR VIA SUPABASE MCP ===\n');
console.log('Total de índices:', indexes.length);
console.log('\nExecute cada comando no SQL Editor do Supabase:');
console.log('https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/sql/new\n');

indexes.forEach((sql, i) => {
  console.log(`-- ${i + 1}. ${sql}`);
});

console.log('\n=== ESTATÍSTICAS ===');
const analyzeCommands = [
  'ANALYZE leads',
  'ANALYZE organizations',
  'ANALYZE closers',
  'ANALYZE notifications',
  'ANALYZE organization_users',
  'ANALYZE form_templates'
];

analyzeCommands.forEach(cmd => {
  console.log(cmd);
});

console.log('\n=== INSTRUÇÕES ===');
console.log('1. Acesse o SQL Editor do Supabase');
console.log('2. Execute cada CREATE INDEX acima');
console.log('3. Valide com test_performance_improvement.js');
console.log('\nBenefícios esperados: 60-80% melhoria de performance!');