-- ============================================================================
-- ATUALIZAÇÃO DO BANCO DE DADOS PARA DASHBOARD PERSONALIZÁVEL E MAPA MENTAL
-- ============================================================================

-- 1. Criar tabela de configurações de dashboard por usuário
CREATE TABLE IF NOT EXISTS dashboard_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL, -- referência ao usuário (assumindo que existe uma tabela de users)
    config_name VARCHAR(100) NOT NULL DEFAULT 'Dashboard Principal',
    layout_config JSONB NOT NULL DEFAULT '{}', -- configuração dos widgets, posições, tamanhos
    widgets JSONB NOT NULL DEFAULT '[]', -- lista de widgets ativos
    theme VARCHAR(50) DEFAULT 'light', -- tema (light, dark, auto)
    is_default BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Criar tabela de widgets disponíveis
CREATE TABLE IF NOT EXISTS available_widgets (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- 'stats', 'charts', 'tables', 'custom'
    component_name VARCHAR(200) NOT NULL, -- nome do componente React
    default_config JSONB NOT NULL DEFAULT '{}',
    min_width INTEGER DEFAULT 1,
    min_height INTEGER DEFAULT 1,
    max_width INTEGER DEFAULT 12,
    max_height INTEGER DEFAULT 6,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Inserir widgets padrão
INSERT INTO available_widgets (id, name, description, category, component_name, default_config) VALUES
('total-mentorados', 'Total de Mentorados', 'Mostra o número total de mentorados', 'stats', 'TotalMentoradosWidget', '{"showGraph": true}'),
('idade-media', 'Idade Média', 'Idade média dos mentorados', 'stats', 'IdadeMediaWidget', '{"showDetails": true}'),
('novos-mentorados', 'Novos Mentorados', 'Mentorados cadastrados recentemente', 'stats', 'NovosMentoradosWidget', '{"period": 14}'),
('status-mentorados', 'Status dos Mentorados', 'Distribuição por status', 'charts', 'StatusMentoradosChart', '{"chartType": "pie"}'),
('checkins-recentes', 'Check-ins Recentes', 'Últimos check-ins realizados', 'tables', 'CheckinsRecentesTable', '{"limit": 5}'),
('metas-pendentes', 'Metas Pendentes', 'Metas não concluídas', 'tables', 'MetasPendentesTable', '{"showProgress": true}'),
('leads-pipeline', 'Pipeline de Leads', 'Funil de vendas', 'charts', 'LeadsPipelineChart', '{"showValues": true}'),
('revenue-mensal', 'Receita Mensal', 'Receita do mês atual', 'stats', 'RevenueMensalWidget', '{"showComparison": true}'),
('atividades-hoje', 'Atividades de Hoje', 'Agenda do dia', 'tables', 'AtividadesHojeTable', '{"showTime": true}'),
('performance-mentores', 'Performance dos Mentores', 'Métricas dos mentores', 'charts', 'PerformanceMentoresChart', '{"metric": "satisfaction"}')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- 4. Criar tabela de mapas mentais
CREATE TABLE IF NOT EXISTS mind_maps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL DEFAULT '[]', -- array de nós do mapa mental
    connections JSONB NOT NULL DEFAULT '[]', -- array de conexões entre nós
    legend JSONB NOT NULL DEFAULT '[]', -- legenda personalizada
    settings JSONB NOT NULL DEFAULT '{}', -- configurações do mapa (tema, zoom, etc)
    is_shared BOOLEAN DEFAULT false,
    share_token UUID DEFAULT gen_random_uuid(), -- token para compartilhamento público
    created_by UUID, -- quem criou o mapa mental
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(mentorado_id) -- um mapa mental por mentorado
);

-- 5. Criar tabela de objetivos/metas do mapa mental
CREATE TABLE IF NOT EXISTS mind_map_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mind_map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
    node_id VARCHAR(100) NOT NULL, -- ID do nó no mapa mental
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'goal', 'action', 'milestone', 'challenge'
    status VARCHAR(50) DEFAULT 'planning', -- 'planning', 'active', 'completed', 'paused'
    priority VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    deadline DATE,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    color VARCHAR(7), -- código hexadecimal da cor
    parent_goal_id UUID REFERENCES mind_map_goals(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(mind_map_id, node_id)
);

-- 6. Criar tabela de progresso das metas
CREATE TABLE IF NOT EXISTS goal_progress_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES mind_map_goals(id) ON DELETE CASCADE,
    previous_progress INTEGER NOT NULL,
    new_progress INTEGER NOT NULL,
    notes TEXT,
    logged_by UUID, -- quem fez a atualização
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Atualizar tabela de leads para suportar detalhes das calls
ALTER TABLE leads ADD COLUMN IF NOT EXISTS call_details JSONB DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS call_history JSONB DEFAULT '[]';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualification_details JSONB DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sales_details JSONB DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_interaction_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_followup_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

-- 8. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user_id ON dashboard_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_mentorado_id ON mind_maps(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_share_token ON mind_maps(share_token);
CREATE INDEX IF NOT EXISTS idx_mind_map_goals_mind_map_id ON mind_map_goals(mind_map_id);
CREATE INDEX IF NOT EXISTS idx_mind_map_goals_status ON mind_map_goals(status);
CREATE INDEX IF NOT EXISTS idx_mind_map_goals_deadline ON mind_map_goals(deadline);
CREATE INDEX IF NOT EXISTS idx_goal_progress_logs_goal_id ON goal_progress_logs(goal_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_last_interaction ON leads(last_interaction_date);
CREATE INDEX IF NOT EXISTS idx_leads_next_followup ON leads(next_followup_date);

-- 9. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Criar triggers para atualização automática de updated_at
DO $$
BEGIN
    -- Dashboard configs
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dashboard_configs_updated_at') THEN
        CREATE TRIGGER update_dashboard_configs_updated_at
        BEFORE UPDATE ON dashboard_configs
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Mind maps
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_mind_maps_updated_at') THEN
        CREATE TRIGGER update_mind_maps_updated_at
        BEFORE UPDATE ON mind_maps
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Mind map goals
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_mind_map_goals_updated_at') THEN
        CREATE TRIGGER update_mind_map_goals_updated_at
        BEFORE UPDATE ON mind_map_goals
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 11. Inserir configurações padrão de dashboard (exemplo)
-- Substitua 'USER_ID_AQUI' pelo ID real do usuário
-- INSERT INTO dashboard_configs (user_id, config_name, layout_config, widgets) VALUES
-- ('USER_ID_AQUI', 'Dashboard Principal',
--  '{"cols": 12, "rowHeight": 100, "margin": [10, 10]}',
--  '[
--     {"id": "total-mentorados", "x": 0, "y": 0, "w": 3, "h": 2},
--     {"id": "idade-media", "x": 3, "y": 0, "w": 3, "h": 2},
--     {"id": "novos-mentorados", "x": 6, "y": 0, "w": 3, "h": 2},
--     {"id": "status-mentorados", "x": 9, "y": 0, "w": 3, "h": 2},
--     {"id": "checkins-recentes", "x": 0, "y": 2, "w": 6, "h": 3},
--     {"id": "leads-pipeline", "x": 6, "y": 2, "w": 6, "h": 3}
--   ]'
-- );

-- 12. Criar views úteis
CREATE OR REPLACE VIEW v_mind_maps_with_stats AS
SELECT
    mm.*,
    m.nome_completo as mentorado_nome,
    m.turma,
    m.estado_atual as mentorado_status,
    COUNT(mmg.id) as total_goals,
    COUNT(CASE WHEN mmg.status = 'completed' THEN 1 END) as completed_goals,
    COUNT(CASE WHEN mmg.status = 'active' THEN 1 END) as active_goals,
    COUNT(CASE WHEN mmg.deadline < CURRENT_DATE AND mmg.status != 'completed' THEN 1 END) as overdue_goals,
    ROUND(
        CASE
            WHEN COUNT(mmg.id) > 0 THEN
                (COUNT(CASE WHEN mmg.status = 'completed' THEN 1 END)::DECIMAL / COUNT(mmg.id)) * 100
            ELSE 0
        END, 2
    ) as completion_percentage
FROM mind_maps mm
LEFT JOIN mentorados m ON mm.mentorado_id = m.id
LEFT JOIN mind_map_goals mmg ON mm.id = mmg.mind_map_id
GROUP BY mm.id, m.nome_completo, m.turma, m.estado_atual;

CREATE OR REPLACE VIEW v_dashboard_widget_usage AS
SELECT
    w.id as widget_id,
    w.name as widget_name,
    w.category,
    COUNT(dc.id) as usage_count,
    COUNT(DISTINCT dc.user_id) as unique_users
FROM available_widgets w
LEFT JOIN dashboard_configs dc ON dc.widgets::text LIKE '%' || w.id || '%'
GROUP BY w.id, w.name, w.category
ORDER BY usage_count DESC;

-- 13. Comentários para documentação
COMMENT ON TABLE dashboard_configs IS 'Configurações personalizadas de dashboard por usuário';
COMMENT ON TABLE available_widgets IS 'Widgets disponíveis para uso nos dashboards';
COMMENT ON TABLE mind_maps IS 'Mapas mentais de desenvolvimento dos mentorados';
COMMENT ON TABLE mind_map_goals IS 'Objetivos e metas dentro dos mapas mentais';
COMMENT ON TABLE goal_progress_logs IS 'Histórico de progresso das metas';

-- ============================================================================
-- FIM DA ATUALIZAÇÃO
-- ============================================================================