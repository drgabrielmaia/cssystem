-- ============================================================================
-- DATABASE PERFORMANCE OPTIMIZATION SCRIPT
-- Criado via Supabase MCP Analysis
-- Data: 2026-02-23
-- ============================================================================
-- Este script adiciona índices estratégicos para melhorar a performance
-- das queries mais frequentes no sistema
-- ============================================================================

-- ============================================================================
-- 1. ÍNDICES PARA TABELA LEADS (813 registros - mais crítica)
-- ============================================================================

-- Índice para filtros por organização (muito usado em multi-tenant)
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);

-- Índice para filtros por status (queries frequentes de dashboard)
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Índice composto para organização + status (otimiza dashboard principal)
CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads(organization_id, status);

-- Índice para ordenação por data de criação (listagens recentes)
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Índice para leads atribuídos a SDR
CREATE INDEX IF NOT EXISTS idx_leads_sdr_id ON leads(sdr_id);

-- Índice para leads atribuídos a Closer
CREATE INDEX IF NOT EXISTS idx_leads_closer_id ON leads(closer_id);

-- Índice para leads por temperatura (frio/morno/quente)
CREATE INDEX IF NOT EXISTS idx_leads_temperatura ON leads(temperatura);

-- Índice para leads por probabilidade de compra
CREATE INDEX IF NOT EXISTS idx_leads_probabilidade_compra ON leads(probabilidade_compra);

-- Índice GIN para campos JSONB (buscas em call_details, qualification_details)
CREATE INDEX IF NOT EXISTS idx_leads_call_details ON leads USING GIN (call_details);
CREATE INDEX IF NOT EXISTS idx_leads_qualification_details ON leads USING GIN (qualification_details);

-- Índice para filtros de data (relatórios por período)
CREATE INDEX IF NOT EXISTS idx_leads_created_date ON leads(DATE(created_at));

-- ============================================================================
-- 2. ÍNDICES PARA TABELA ORGANIZATIONS (4 registros)
-- ============================================================================

-- Índice para busca por email do owner
CREATE INDEX IF NOT EXISTS idx_organizations_owner_email ON organizations(owner_email);

-- Índice para ordenação por data de criação
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);

-- ============================================================================
-- 3. ÍNDICES PARA TABELA CLOSERS (4 registros)
-- ============================================================================

-- Índice para filtros por organização
CREATE INDEX IF NOT EXISTS idx_closers_organization_id ON closers(organization_id);

-- Índice para filtros por status de contrato
CREATE INDEX IF NOT EXISTS idx_closers_status_contrato ON closers(status_contrato);

-- Índice para filtros por tipo de closer
CREATE INDEX IF NOT EXISTS idx_closers_tipo_closer ON closers(tipo_closer);

-- Índice para ordenação por total de vendas (ranking)
CREATE INDEX IF NOT EXISTS idx_closers_total_vendas ON closers(total_vendas DESC);

-- ============================================================================
-- 4. ÍNDICES PARA TABELA NOTIFICATIONS
-- ============================================================================

-- Índice para filtros por organização
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);

-- Índice para filtros por usuário (read status)
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Índice para ações requeridas
CREATE INDEX IF NOT EXISTS idx_notifications_action_required ON notifications(action_required);

-- Índice para ordenação por data (notificações recentes)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- 5. ÍNDICES PARA TABELA ORGANIZATION_USERS
-- ============================================================================

-- Índice composto para autenticação rápida
CREATE INDEX IF NOT EXISTS idx_org_users_org_email ON organization_users(organization_id, email);

-- Índice para busca por user_id
CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON organization_users(user_id);

-- Índice para usuários ativos
CREATE INDEX IF NOT EXISTS idx_org_users_is_active ON organization_users(is_active);

-- ============================================================================
-- 6. ÍNDICES PARA TABELA FORM_TEMPLATES
-- ============================================================================

-- Índice para busca por slug (URLs)
CREATE INDEX IF NOT EXISTS idx_form_templates_slug ON form_templates(slug);

-- Índice para filtros por tipo de formulário
CREATE INDEX IF NOT EXISTS idx_form_templates_type ON form_templates(form_type);

-- ============================================================================
-- 7. ÍNDICES GIN para campos JSONB em outras tabelas (se existirem)
-- ============================================================================

-- Índice para JSON fields em closers (skills, horario_trabalho)
CREATE INDEX IF NOT EXISTS idx_closers_skills ON closers USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_closers_horario_trabalho ON closers USING GIN (horario_trabalho);

-- Índice para JSON fields em form_templates (fields, style)
CREATE INDEX IF NOT EXISTS idx_form_templates_fields ON form_templates USING GIN (fields);
CREATE INDEX IF NOT EXISTS idx_form_templates_style ON form_templates USING GIN (style);

-- ============================================================================
-- 8. FUNÇÕES DE OTIMIZAÇÃO
-- ============================================================================

-- Função para analisar performance de tabelas
CREATE OR REPLACE FUNCTION analyze_table_performance(table_name text)
RETURNS TABLE(
    table_name text,
    row_count bigint,
    table_size text,
    index_count bigint,
    seq_scan bigint,
    idx_scan bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::text,
        COALESCE(c.reltuples::bigint, 0),
        pg_size_pretty(pg_total_relation_size(t.table_name::regclass)),
        (SELECT COUNT(*) FROM pg_indexes WHERE tablename = t.table_name),
        COALESCE(s.seq_scan, 0),
        COALESCE(s.idx_scan, 0)
    FROM 
        information_schema.tables t
    LEFT JOIN 
        pg_class c ON c.relname = t.table_name
    LEFT JOIN 
        pg_stat_user_tables s ON s.relname = t.table_name
    WHERE 
        t.table_name = analyze_table_performance.table_name
        AND t.table_schema = 'public';
END;
$$ LANGUAGE plpgsql;

-- Função para verificar índices usados vs não usados
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
    index_name text,
    table_name text,
    index_size text,
    idx_scan bigint,
    idx_tup_read bigint,
    idx_tup_fetch bigint,
    usage_status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.indexrelname::text as index_name,
        i.relname::text as table_name,
        pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size,
        i.idx_scan,
        i.idx_tup_read,
        i.idx_tup_fetch,
        CASE 
            WHEN i.idx_scan = 0 THEN 'UNUSED'
            WHEN i.idx_scan < 10 THEN 'LOW_USAGE'
            ELSE 'ACTIVE'
        END as usage_status
    FROM 
        pg_stat_user_indexes i
    WHERE 
        i.schemaname = 'public'
    ORDER BY 
        i.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Função para sugerir índices baseada em queries frequentes
CREATE OR REPLACE FUNCTION suggest_indexes()
RETURNS TABLE(
    table_name text,
    column_name text,
    suggestion text,
    priority text
) AS $$
BEGIN
    -- Sugestões baseadas na análise do schema
    RETURN QUERY
    SELECT 
        'leads'::text,
        'status, organization_id'::text,
        'Compoound index for dashboard filters'::text,
        'HIGH'::text
    
    UNION ALL
    
    SELECT 
        'leads'::text,
        'created_at'::text,
        'Index for time-based queries and sorting'::text,
        'HIGH'::text
    
    UNION ALL
    
    SELECT 
        'leads'::text,
        'temperatura, probabilidade_compra'::text,
        'Index for lead scoring filters'::text,
        'MEDIUM'::text;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. VIEWS PARA MONITORAMENTO
-- ============================================================================

-- View para monitoramento geral de performance
CREATE OR REPLACE VIEW v_database_performance AS
SELECT 
    'leads' as table_name,
    (SELECT COUNT(*) FROM leads) as row_count,
    pg_size_pretty(pg_total_relation_size('leads'::regclass)) as table_size,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'leads') as index_count
UNION ALL
SELECT 
    'organizations',
    (SELECT COUNT(*) FROM organizations),
    pg_size_pretty(pg_total_relation_size('organizations'::regclass)),
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'organizations')
UNION ALL
SELECT 
    'closers',
    (SELECT COUNT(*) FROM closers),
    pg_size_pretty(pg_total_relation_size('closers'::regclass)),
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'closers');

-- ============================================================================
-- 10. ESTATÍSTICAS DO BANCO DE DADOS
-- ============================================================================

-- Atualizar estatísticas para garantir que o planejador de queries
-- tenha informações atualizadas
ANALYZE leads;
ANALYZE organizations;
ANALYZE closers;
ANALYZE notifications;
ANALYZE organization_users;
ANALYZE form_templates;

-- ============================================================================
-- RELATÓRIO DE OTIMIZAÇÃO
-- ============================================================================

-- Exibir resumo das otimizações aplicadas
DO $$
DECLARE
    v_leads_count bigint;
    v_leads_indexes bigint;
    v_total_indexes bigint;
BEGIN
    SELECT COUNT(*) INTO v_leads_count FROM leads;
    SELECT COUNT(*) INTO v_leads_indexes FROM pg_indexes WHERE tablename = 'leads';
    SELECT COUNT(*) INTO v_total_indexes FROM pg_indexes WHERE schemaname = 'public';
    
    RAISE NOTICE '=== OTIMIZAÇÃO DE PERFORMANCE CONCLUÍDA ===';
    RAISE NOTICE 'Total de leads: %', v_leads_count;
    RAISE NOTICE 'Índices criados para leads: %', v_leads_indexes;
    RAISE NOTICE 'Total de índices no banco: %', v_total_indexes;
    RAISE NOTICE '';
    RAISE NOTICE 'Próximos passos recomendados:';
    RAISE NOTICE '1. Monitorar queries com EXPLAIN ANALYZE';
    RAISE NOTICE '2. Usar analyze_index_usage() para verificar índices não utilizados';
    RAISE NOTICE '3. Considerar particionamento se leads ultrapassar 100.000 registros';
    RAISE NOTICE '4. Revisar índices não usados periodicamente';
END $$;