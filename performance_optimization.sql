-- ===================================
-- 🚀 PERFORMANCE OPTIMIZATION SCRIPT
-- ===================================
-- Execute this in Supabase SQL Editor for immediate performance improvements

-- 1. CREATE ESSENTIAL INDEXES FOR EXISTING TABLES
-- ===================================

-- Mentorados table optimization
CREATE INDEX IF NOT EXISTS idx_mentorados_email ON mentorados(email);
CREATE INDEX IF NOT EXISTS idx_mentorados_status_login ON mentorados(status_login);
CREATE INDEX IF NOT EXISTS idx_mentorados_turma ON mentorados(turma);

-- Formularios_respostas optimization (used for all portal data)
CREATE INDEX IF NOT EXISTS idx_formularios_respostas_mentorado ON formularios_respostas(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_formularios_respostas_formulario ON formularios_respostas(formulario);
CREATE INDEX IF NOT EXISTS idx_formularios_respostas_data ON formularios_respostas(data_resposta);
CREATE INDEX IF NOT EXISTS idx_formularios_respostas_composite ON formularios_respostas(mentorado_id, formulario);

-- Video tables optimization (if they exist)
CREATE INDEX IF NOT EXISTS idx_video_modules_active ON video_modules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_video_lessons_module ON video_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_mentorado ON lesson_progress(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed ON lesson_progress(is_completed);

-- 2. CREATE ANALYTICS VIEWS
-- ===================================

-- Portal usage analytics
CREATE OR REPLACE VIEW view_portal_analytics AS
SELECT
    DATE_TRUNC('day', fr.data_resposta) as data_dia,
    fr.formulario as tipo_formulario,
    COUNT(DISTINCT fr.mentorado_id) as usuarios_ativos,
    COUNT(*) as total_interacoes,
    COUNT(CASE WHEN fr.formulario = 'meta' THEN 1 END) as metas_criadas,
    COUNT(CASE WHEN fr.formulario = 'onboarding' THEN 1 END) as onboarding_steps,
    COUNT(CASE WHEN fr.formulario = 'conquista' THEN 1 END) as conquistas_alcancadas
FROM formularios_respostas fr
WHERE fr.data_resposta >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', fr.data_resposta), fr.formulario
ORDER BY data_dia DESC;

-- Student engagement summary
CREATE OR REPLACE VIEW view_student_engagement AS
SELECT
    m.id,
    m.nome_completo,
    m.email,
    m.turma,
    -- Portal usage
    COUNT(DISTINCT fr.id) as total_portal_actions,
    COUNT(CASE WHEN fr.formulario = 'meta' THEN 1 END) as metas_criadas,
    COUNT(CASE WHEN fr.formulario = 'onboarding' THEN 1 END) as onboarding_completo,
    COUNT(CASE WHEN fr.formulario = 'conquista' THEN 1 END) as conquistas,
    -- Video progress (if tables exist)
    COUNT(DISTINCT lp.lesson_id) FILTER (WHERE lp.is_completed = true) as aulas_completas,
    SUM(lp.watch_time_minutes) as tempo_total_assistido,
    -- Last activity
    MAX(fr.data_resposta) as ultima_atividade_portal,
    MAX(lp.updated_at) as ultima_atividade_video
FROM mentorados m
LEFT JOIN formularios_respostas fr ON m.id = fr.mentorado_id
LEFT JOIN lesson_progress lp ON m.id = lp.mentorado_id
WHERE m.status_login = 'ativo'
GROUP BY m.id, m.nome_completo, m.email, m.turma;

-- Goals dashboard view
CREATE OR REPLACE VIEW view_metas_dashboard AS
SELECT
    (fr.resposta_json->>'titulo') as meta_titulo,
    (fr.resposta_json->>'status') as status,
    (fr.resposta_json->>'prazo') as prazo,
    fr.mentorado_id,
    m.nome_completo,
    m.turma,
    fr.data_resposta as data_criacao,
    CASE
        WHEN (fr.resposta_json->>'status') = 'completed' THEN 'Concluída'
        WHEN (fr.resposta_json->>'prazo')::date < CURRENT_DATE THEN 'Atrasada'
        ELSE 'Em andamento'
    END as situacao
FROM formularios_respostas fr
JOIN mentorados m ON fr.mentorado_id = m.id
WHERE fr.formulario = 'meta'
ORDER BY fr.data_resposta DESC;

-- 3. PERFORMANCE OPTIMIZATION FUNCTIONS
-- ===================================

-- Function to update timestamp on formularios_respostas
CREATE OR REPLACE FUNCTION update_formulario_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating timestamps
DROP TRIGGER IF EXISTS update_formularios_respostas_timestamp ON formularios_respostas;
CREATE TRIGGER update_formularios_respostas_timestamp
    BEFORE UPDATE ON formularios_respostas
    FOR EACH ROW
    EXECUTE FUNCTION update_formulario_timestamp();

-- Function to clean old portal data (optional - run manually)
CREATE OR REPLACE FUNCTION cleanup_old_portal_data(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM formularios_respostas
    WHERE formulario IN ('temp_data', 'draft')
    AND data_resposta < (CURRENT_DATE - INTERVAL '1 day' * days_to_keep);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 4. PORTAL-SPECIFIC OPTIMIZATIONS
-- ===================================

-- Optimize JSON queries for portal data
-- Add GIN index for JSONB operations
CREATE INDEX IF NOT EXISTS idx_formularios_respostas_json_gin ON formularios_respostas USING GIN (resposta_json);

-- Specific indexes for portal queries
CREATE INDEX IF NOT EXISTS idx_formularios_respostas_meta_status
ON formularios_respostas(mentorado_id, (resposta_json->>'status'))
WHERE formulario = 'meta';

CREATE INDEX IF NOT EXISTS idx_formularios_respostas_conquista_tipo
ON formularios_respostas(mentorado_id, (resposta_json->>'tipo'))
WHERE formulario = 'conquista';

-- 5. VACUUM AND ANALYZE
-- ===================================
-- Run these to optimize table statistics and performance

-- Note: These should be run manually in Supabase SQL editor:
-- VACUUM ANALYZE formularios_respostas;
-- VACUUM ANALYZE mentorados;
-- VACUUM ANALYZE lesson_progress;

SELECT 'PERFORMANCE OPTIMIZATION COMPLETED! 🚀' as status,
       'Run VACUUM ANALYZE on main tables for best results' as next_step;