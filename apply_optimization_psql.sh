#!/bin/bash

# Database connection details
DB_HOST="udzmlnnztzzwrphhizol.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA"

echo "=== APLICANDO OTIMIZAÇÕES DE PERFORMANCE ==="
echo ""

# Try using psql with the Supabase connection string
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
-- ============================================================================
-- DATABASE PERFORMANCE OPTIMIZATION
-- ============================================================================

-- 1. ÍNDICES PARA TABELA LEADS
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_sdr_id ON leads(sdr_id);
CREATE INDEX IF NOT EXISTS idx_leads_closer_id ON leads(closer_id);
CREATE INDEX IF NOT EXISTS idx_leads_temperatura ON leads(temperatura);
CREATE INDEX IF NOT EXISTS idx_leads_probabilidade_compra ON leads(probabilidade_compra);

-- JSONB indexes
CREATE INDEX IF NOT EXISTS idx_leads_call_details ON leads USING GIN (call_details);
CREATE INDEX IF NOT EXISTS idx_leads_qualification_details ON leads USING GIN (qualification_details);
CREATE INDEX IF NOT EXISTS idx_leads_created_date ON leads(DATE(created_at));

-- 2. ÍNDICES PARA TABELA ORGANIZATIONS
CREATE INDEX IF NOT EXISTS idx_organizations_owner_email ON organizations(owner_email);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);

-- 3. ÍNDICES PARA TABELA CLOSERS
CREATE INDEX IF NOT EXISTS idx_closers_organization_id ON closers(organization_id);
CREATE INDEX IF NOT EXISTS idx_closers_status_contrato ON closers(status_contrato);
CREATE INDEX IF NOT EXISTS idx_closers_tipo_closer ON closers(tipo_closer);
CREATE INDEX IF NOT EXISTS idx_closers_total_vendas ON closers(total_vendas DESC);

-- 4. ÍNDICES PARA TABELA NOTIFICATIONS
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_action_required ON notifications(action_required);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 5. ÍNDICES PARA TABELA ORGANIZATION_USERS
CREATE INDEX IF NOT EXISTS idx_org_users_org_email ON organization_users(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON organization_users(user_id);
CREATE INDEX IF NOT EXISTS idx_org_users_is_active ON organization_users(is_active);

-- 6. ÍNDICES PARA TABELA FORM_TEMPLATES
CREATE INDEX IF NOT EXISTS idx_form_templates_slug ON form_templates(slug);
CREATE INDEX IF NOT EXISTS idx_form_templates_type ON form_templates(form_type);

-- 7. JSONB indexes for other tables
CREATE INDEX IF NOT EXISTS idx_closers_skills ON closers USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_closers_horario_trabalho ON closers USING GIN (horario_trabalho);
CREATE INDEX IF NOT EXISTS idx_form_templates_fields ON form_templates USING GIN (fields);
CREATE INDEX IF NOT EXISTS idx_form_templates_style ON form_templates USING GIN (style);

-- 8. ATUALIZAR ESTATÍSTICAS
ANALYZE leads;
ANALYZE organizations;
ANALYZE closers;
ANALYZE notifications;
ANALYZE organization_users;
ANALYZE form_templates;

-- 9. VERIFICAR ÍNDICES CRIADOS
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

EOF

echo ""
echo "=== OTIMIZAÇÃO CONCLUÍDA ==="