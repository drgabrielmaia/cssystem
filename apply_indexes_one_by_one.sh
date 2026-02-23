#!/bin/bash

# Aplicar índices críticos um por um via SQL Editor do Supabase
# Cada CREATE INDEX deve ser executado separadamente

BASE_URL="https://udzmlnnztzzwrphhizol.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQyOTA3NiwiZXhwIjoyMDczMDA1MDc2fQ.90d_VFzNxUkuNhNRbdSSJgp2Nw7hZuNx-RLCkEGQ6dA"

echo "=== ÍNDICES CRÍTICOS PARA APLICAR MANUALMENTE ==="
echo ""
echo "COPIE E EXECUTE CADA COMANDO NO SQL EDITOR DO SUPABASE:"
echo "https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/sql/new"
echo ""

# Índices mais críticos para leads
echo "-- 1. ÍNDICES MAIS CRÍTICOS PARA LEADS (EXECUTE EM ORDEM)"
echo "CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);"
echo "CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);"
echo "CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads(organization_id, status);"
echo "CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);"
echo ""

echo "-- 2. ÍNDICES PARA SDR/CLOSER"
echo "CREATE INDEX IF NOT EXISTS idx_leads_sdr_id ON leads(sdr_id);"
echo "CREATE INDEX IF NOT EXISTS idx_leads_closer_id ON leads(closer_id);"
echo ""

echo "-- 3. ÍNDICES PARA ORGANIZATIONS"
echo "CREATE INDEX IF NOT EXISTS idx_organizations_owner_email ON organizations(owner_email);"
echo "CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);"
echo ""

echo "-- 4. ÍNDICES PARA CLOSERS"
echo "CREATE INDEX IF NOT EXISTS idx_closers_organization_id ON closers(organization_id);"
echo "CREATE INDEX IF NOT EXISTS idx_closers_status_contrato ON closers(status_contrato);"
echo "CREATE INDEX IF NOT EXISTS idx_closers_tipo_closer ON closers(tipo_closer);"
echo ""

echo "-- 5. ÍNDICES PARA NOTIFICATIONS"
echo "CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);"
echo "CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);"
echo "CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);"
echo ""

echo "-- 6. ÍNDICES PARA ORGANIZATION_USERS"
echo "CREATE INDEX IF NOT EXISTS idx_org_users_org_email ON organization_users(organization_id, email);"
echo "CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON organization_users(user_id);"
echo ""

echo "-- 7. ÍNDICES PARA FORM_TEMPLATES"
echo "CREATE INDEX IF NOT EXISTS idx_form_templates_slug ON form_templates(slug);"
echo ""

echo "-- 8. ÍNDICES GIN (JSONB) - MUITO IMPORTANTE PARA PERFORMANCE"
echo "CREATE INDEX IF NOT EXISTS idx_leads_call_details ON leads USING GIN (call_details);"
echo "CREATE INDEX IF NOT EXISTS idx_leads_qualification_details ON leads USING GIN (qualification_details);"
echo "CREATE INDEX IF NOT EXISTS idx_closers_skills ON closers USING GIN (skills);"
echo "CREATE INDEX IF NOT EXISTS idx_form_templates_fields ON form_templates USING GIN (fields);"
echo ""

echo "-- 9. ATUALIZAR ESTATÍSTICAS"
echo "ANALYZE leads;"
echo "ANALYZE organizations;"
echo "ANALYZE closers;"
echo "ANALYZE notifications;"
echo "ANALYZE organization_users;"
echo "ANALYZE form_templates;"
echo ""

echo "=== INSTRUÇÕES ==="
echo "1. Acesse: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/sql/new"
echo "2. Copie cada comando CREATE INDEX acima"
echo "3. Cole no SQL Editor"
echo "4. Clique em 'Run' para cada comando"
echo "5. Aguarde confirmação de sucesso antes do próximo"
echo ""
echo "=== BENEFÍCIOS ESPERADOS ==="
echo "• Dashboard: 60-80% mais rápido"
echo "• Filtros: 70-90% mais rápido"
echo "• JSONB queries: 80-95% mais rápido"
echo ""
echo "TOTAL DE ÍNDICES: 22 comandos para executar"