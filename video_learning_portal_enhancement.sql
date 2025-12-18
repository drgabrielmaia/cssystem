-- ===================================
-- 🎥 VIDEO LEARNING PORTAL ENHANCEMENT
-- ===================================
-- Complete SQL schema for video learning portal enhancement
-- Includes forms, goals, onboarding, notes, achievements, and admin integration
-- Execute this script in Supabase SQL Editor

-- 🔧 Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================
-- 📋 FORMS SYSTEM
-- ===================================

-- Form templates/configurations
CREATE TABLE IF NOT EXISTS video_form_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    form_type VARCHAR(50) NOT NULL CHECK (form_type IN ('lesson_completion', 'module_completion', 'nps', 'feedback', 'custom')),
    trigger_event VARCHAR(50) NOT NULL CHECK (trigger_event IN ('lesson_completed', 'module_completed', 'manual', 'scheduled')),
    questions JSONB NOT NULL, -- Array of question objects with type, options, required, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form responses
CREATE TABLE IF NOT EXISTS video_form_responses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES video_form_templates(id) ON DELETE CASCADE,
    lesson_id UUID, -- FK para video_lessons(id) - adicionar depois que tabela existir
    module_id UUID, -- FK para video_modules(id) - adicionar depois que tabela existir
    responses JSONB NOT NULL, -- Object with questionId: response pairs
    nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
    satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
    feedback_text TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 🎯 ENHANCED GOALS SYSTEM
-- ===================================

-- Goal categories
CREATE TABLE IF NOT EXISTS goal_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color_hex VARCHAR(7), -- For UI color coding
    icon VARCHAR(50), -- Icon name for UI
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced goals with categories and time frames
CREATE TABLE IF NOT EXISTS video_learning_goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    category_id UUID REFERENCES goal_categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('short_term', 'medium_term', 'long_term', 'big_term')),
    time_frame_days INTEGER, -- Expected days to complete
    target_value DECIMAL(15,2), -- Numeric target if applicable
    current_value DECIMAL(15,2) DEFAULT 0,
    unit VARCHAR(50), -- e.g., "lessons", "hours", "points", "currency"
    priority_level VARCHAR(10) CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'paused', 'cancelled')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    due_date DATE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by_admin BOOLEAN DEFAULT false,
    admin_notes TEXT,
    student_notes TEXT,
    related_modules UUID[], -- Array of module IDs
    related_lessons UUID[], -- Array of lesson IDs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal milestones/checkpoints
CREATE TABLE IF NOT EXISTS goal_milestones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES video_learning_goals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_value DECIMAL(15,2),
    achieved_value DECIMAL(15,2) DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 🚀 ONBOARDING SYSTEM WITH MINDMAP
-- ===================================

-- Onboarding steps/phases
CREATE TABLE IF NOT EXISTS onboarding_steps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    step_name VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    step_type VARCHAR(50) NOT NULL CHECK (step_type IN ('welcome', 'profile_setup', 'goal_setting', 'mindmap', 'content_intro', 'completion')),
    content_data JSONB, -- Flexible content structure
    required_fields JSONB, -- Array of required form fields
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual student onboarding progress
CREATE TABLE IF NOT EXISTS student_onboarding (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES onboarding_steps(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    step_data JSONB, -- Data collected during this step
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mentorado_id, step_id)
);

-- Mindmap data for students
CREATE TABLE IF NOT EXISTS student_mindmap (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    mindmap_data JSONB NOT NULL, -- Complete mindmap structure with nodes, connections, etc.
    current_version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_during_onboarding BOOLEAN DEFAULT true,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 📝 REAL-TIME NOTES SYSTEM
-- ===================================

-- Timestamped notes during video lessons
CREATE TABLE IF NOT EXISTS lesson_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL, -- FK para video_lessons(id) - adicionar depois que tabela existir
    note_text TEXT NOT NULL,
    timestamp_seconds INTEGER NOT NULL, -- Position in video where note was taken
    note_type VARCHAR(20) DEFAULT 'text' CHECK (note_type IN ('text', 'highlight', 'question', 'important', 'bookmark')),
    is_private BOOLEAN DEFAULT true, -- Whether note is private to student or visible to admin
    tags TEXT[], -- Array of tags for categorization
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note categories/tags for organization
CREATE TABLE IF NOT EXISTS note_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color_hex VARCHAR(7),
    icon VARCHAR(50),
    is_system BOOLEAN DEFAULT false, -- System-generated vs user-created
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 🏆 ACHIEVEMENT/MOTIVATIONAL SYSTEM
-- ===================================

-- Achievement definitions
CREATE TABLE IF NOT EXISTS achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    achievement_type VARCHAR(50) NOT NULL CHECK (achievement_type IN ('lesson_completion', 'module_completion', 'streak', 'engagement', 'goal_achievement', 'special')),
    criteria JSONB NOT NULL, -- Conditions for earning the achievement
    points_value INTEGER DEFAULT 0,
    badge_icon VARCHAR(255),
    badge_color VARCHAR(7),
    rarity_level VARCHAR(20) CHECK (rarity_level IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student achievements earned
CREATE TABLE IF NOT EXISTS student_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    progress_data JSONB, -- Additional data about how achievement was earned
    is_featured BOOLEAN DEFAULT false, -- Whether to feature prominently in UI
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mentorado_id, achievement_id)
);

-- Student points/score system
CREATE TABLE IF NOT EXISTS student_points (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE UNIQUE,
    total_points INTEGER DEFAULT 0,
    level_number INTEGER DEFAULT 1,
    points_to_next_level INTEGER DEFAULT 100,
    streak_days INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Point transactions/history
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    points_change INTEGER NOT NULL, -- Can be positive or negative
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('lesson_completed', 'module_completed', 'achievement_earned', 'goal_completed', 'daily_login', 'admin_adjustment')),
    reference_id UUID, -- ID of related lesson, module, achievement, etc.
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================
-- 📊 ADMIN DASHBOARD INTEGRATION
-- ===================================

-- Student engagement metrics
CREATE TABLE IF NOT EXISTS student_engagement_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    date_tracked DATE NOT NULL DEFAULT CURRENT_DATE,
    lessons_watched INTEGER DEFAULT 0,
    total_watch_time_minutes INTEGER DEFAULT 0,
    notes_created INTEGER DEFAULT 0,
    forms_completed INTEGER DEFAULT 0,
    goals_updated INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    login_count INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mentorado_id, date_tracked)
);

-- System analytics aggregated data
CREATE TABLE IF NOT EXISTS video_analytics_summary (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    summary_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_active_students INTEGER DEFAULT 0,
    total_lessons_watched INTEGER DEFAULT 0,
    total_watch_time_minutes INTEGER DEFAULT 0,
    average_completion_rate DECIMAL(5,2) DEFAULT 0,
    total_forms_submitted INTEGER DEFAULT 0,
    average_nps_score DECIMAL(3,2),
    total_goals_created INTEGER DEFAULT 0,
    total_goals_completed INTEGER DEFAULT 0,
    total_achievements_earned INTEGER DEFAULT 0,
    total_notes_created INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(summary_date)
);

-- ===================================
-- 📈 INDEXES FOR PERFORMANCE
-- ===================================

-- Form system indexes
CREATE INDEX IF NOT EXISTS idx_video_form_templates_type ON video_form_templates(form_type, is_active);
CREATE INDEX IF NOT EXISTS idx_video_form_responses_mentorado ON video_form_responses(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_video_form_responses_lesson ON video_form_responses(lesson_id);
CREATE INDEX IF NOT EXISTS idx_video_form_responses_module ON video_form_responses(module_id);
CREATE INDEX IF NOT EXISTS idx_video_form_responses_submitted ON video_form_responses(submitted_at);

-- Goals system indexes
CREATE INDEX IF NOT EXISTS idx_goal_categories_active ON goal_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_video_learning_goals_mentorado ON video_learning_goals(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_video_learning_goals_status ON video_learning_goals(status);
CREATE INDEX IF NOT EXISTS idx_video_learning_goals_type ON video_learning_goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_video_learning_goals_due ON video_learning_goals(due_date);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal ON goal_milestones(goal_id);

-- Onboarding indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_order ON onboarding_steps(order_index, is_active);
CREATE INDEX IF NOT EXISTS idx_student_onboarding_mentorado ON student_onboarding(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_student_onboarding_status ON student_onboarding(status);
CREATE INDEX IF NOT EXISTS idx_student_mindmap_mentorado ON student_mindmap(mentorado_id, is_active);

-- Notes system indexes
CREATE INDEX IF NOT EXISTS idx_lesson_notes_mentorado ON lesson_notes(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_lesson ON lesson_notes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_timestamp ON lesson_notes(timestamp_seconds);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_type ON lesson_notes(note_type);

-- Achievement system indexes
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(achievement_type, is_active);
CREATE INDEX IF NOT EXISTS idx_student_achievements_mentorado ON student_achievements(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_earned ON student_achievements(earned_at);
CREATE INDEX IF NOT EXISTS idx_student_points_mentorado ON student_points(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_mentorado ON point_transactions(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(transaction_type);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_student_engagement_mentorado ON student_engagement_metrics(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_student_engagement_date ON student_engagement_metrics(date_tracked);
CREATE INDEX IF NOT EXISTS idx_video_analytics_date ON video_analytics_summary(summary_date);

-- ===================================
-- 🔄 TRIGGERS FOR UPDATED_AT
-- ===================================

-- Create update function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update triggers for all tables with updated_at
DROP TRIGGER IF EXISTS update_video_form_templates_updated_at ON video_form_templates;
CREATE TRIGGER update_video_form_templates_updated_at BEFORE UPDATE ON video_form_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_video_learning_goals_updated_at ON video_learning_goals;
CREATE TRIGGER update_video_learning_goals_updated_at BEFORE UPDATE ON video_learning_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goal_milestones_updated_at ON goal_milestones;
CREATE TRIGGER update_goal_milestones_updated_at BEFORE UPDATE ON goal_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_onboarding_steps_updated_at ON onboarding_steps;
CREATE TRIGGER update_onboarding_steps_updated_at BEFORE UPDATE ON onboarding_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_onboarding_updated_at ON student_onboarding;
CREATE TRIGGER update_student_onboarding_updated_at BEFORE UPDATE ON student_onboarding
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_mindmap_updated_at ON student_mindmap;
CREATE TRIGGER update_student_mindmap_updated_at BEFORE UPDATE ON student_mindmap
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lesson_notes_updated_at ON lesson_notes;
CREATE TRIGGER update_lesson_notes_updated_at BEFORE UPDATE ON lesson_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_achievements_updated_at ON achievements;
CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON achievements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_points_updated_at ON student_points;
CREATE TRIGGER update_student_points_updated_at BEFORE UPDATE ON student_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- 📊 USEFUL VIEWS FOR ADMIN DASHBOARD
-- ===================================

-- Complete student progress overview
CREATE OR REPLACE VIEW view_student_complete_overview AS
SELECT
    m.id,
    m.nome_completo,
    m.email,
    m.estado_atual,
    m.data_entrada,
    -- Video progress
    COUNT(DISTINCT lp.lesson_id) as lessons_completed,
    SUM(lp.watch_time_minutes) as total_watch_time,
    -- Forms and feedback
    COUNT(DISTINCT vfr.id) as forms_completed,
    AVG(vfr.nps_score) as avg_nps_score,
    AVG(vfr.satisfaction_score) as avg_satisfaction,
    -- Goals
    COUNT(DISTINCT vlg.id) as total_goals,
    COUNT(DISTINCT CASE WHEN vlg.status = 'completed' THEN vlg.id END) as completed_goals,
    -- Achievements and points
    COALESCE(sp.total_points, 0) as total_points,
    COALESCE(sp.level_number, 1) as current_level,
    COALESCE(sp.streak_days, 0) as current_streak,
    COUNT(DISTINCT sa.id) as achievements_earned,
    -- Notes and engagement
    COUNT(DISTINCT ln.id) as notes_created,
    -- Onboarding
    COUNT(DISTINCT CASE WHEN so.status = 'completed' THEN so.id END) as onboarding_steps_completed,
    COUNT(DISTINCT os.id) as total_onboarding_steps
FROM mentorados m
LEFT JOIN lesson_progress lp ON m.id = lp.mentorado_id AND lp.is_completed = true
LEFT JOIN video_form_responses vfr ON m.id = vfr.mentorado_id
LEFT JOIN video_learning_goals vlg ON m.id = vlg.mentorado_id
LEFT JOIN student_points sp ON m.id = sp.mentorado_id
LEFT JOIN student_achievements sa ON m.id = sa.mentorado_id
LEFT JOIN lesson_notes ln ON m.id = ln.mentorado_id
LEFT JOIN student_onboarding so ON m.id = so.mentorado_id
LEFT JOIN onboarding_steps os ON os.is_active = true
GROUP BY m.id, m.nome_completo, m.email, m.estado_atual, m.data_entrada, sp.total_points, sp.level_number, sp.streak_days;

-- Goals dashboard view
CREATE OR REPLACE VIEW view_goals_dashboard AS
SELECT
    gc.name as category_name,
    vlg.goal_type,
    COUNT(*) as total_goals,
    COUNT(CASE WHEN vlg.status = 'completed' THEN 1 END) as completed_goals,
    COUNT(CASE WHEN vlg.status = 'in_progress' THEN 1 END) as in_progress_goals,
    COUNT(CASE WHEN vlg.status = 'pending' THEN 1 END) as pending_goals,
    AVG(vlg.progress_percentage) as avg_progress,
    COUNT(CASE WHEN vlg.due_date < CURRENT_DATE AND vlg.status != 'completed' THEN 1 END) as overdue_goals
FROM video_learning_goals vlg
LEFT JOIN goal_categories gc ON vlg.category_id = gc.id
GROUP BY gc.name, vlg.goal_type;

-- Engagement metrics view
CREATE OR REPLACE VIEW view_engagement_overview AS
SELECT
    sem.date_tracked,
    COUNT(DISTINCT sem.mentorado_id) as active_students,
    SUM(sem.lessons_watched) as total_lessons_watched,
    SUM(sem.total_watch_time_minutes) as total_watch_time,
    SUM(sem.notes_created) as total_notes_created,
    SUM(sem.forms_completed) as total_forms_completed,
    SUM(sem.points_earned) as total_points_earned,
    AVG(sem.lessons_watched) as avg_lessons_per_student,
    AVG(sem.total_watch_time_minutes) as avg_watch_time_per_student
FROM student_engagement_metrics sem
WHERE sem.date_tracked >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY sem.date_tracked
ORDER BY sem.date_tracked DESC;

-- ===================================
-- 🎯 SAMPLE DATA INSERTION
-- ===================================

-- Insert goal categories
INSERT INTO goal_categories (name, description, color_hex, icon) VALUES
('Aprendizado', 'Metas relacionadas ao progresso educacional', '#3B82F6', 'book'),
('Carreira', 'Objetivos de desenvolvimento profissional', '#10B981', 'briefcase'),
('Financeiro', 'Metas financeiras e de investimento', '#F59E0B', 'dollar-sign'),
('Pessoal', 'Desenvolvimento pessoal e bem-estar', '#EF4444', 'heart'),
('Técnico', 'Habilidades técnicas específicas', '#8B5CF6', 'code'),
('Networking', 'Construção de rede profissional', '#F97316', 'users');

-- Insert basic form templates
INSERT INTO video_form_templates (name, title, form_type, trigger_event, questions) VALUES
(
    'lesson_completion_nps',
    'Avaliação da Aula',
    'lesson_completion',
    'lesson_completed',
    '[
        {
            "id": "nps_score",
            "type": "nps",
            "question": "De 0 a 10, o quanto você recomendaria esta aula para um colega?",
            "required": true
        },
        {
            "id": "understanding_level",
            "type": "scale",
            "question": "Como você avalia seu entendimento do conteúdo?",
            "scale": {"min": 1, "max": 5, "labels": {"1": "Muito baixo", "5": "Excelente"}},
            "required": true
        },
        {
            "id": "feedback",
            "type": "textarea",
            "question": "Deixe seu feedback sobre a aula (opcional)",
            "required": false
        }
    ]'::jsonb
),
(
    'module_completion_feedback',
    'Feedback do Módulo',
    'module_completion',
    'module_completed',
    '[
        {
            "id": "overall_satisfaction",
            "type": "scale",
            "question": "Qual sua satisfação geral com este módulo?",
            "scale": {"min": 1, "max": 5, "labels": {"1": "Muito insatisfeito", "5": "Muito satisfeito"}},
            "required": true
        },
        {
            "id": "difficulty_level",
            "type": "radio",
            "question": "Como você avalia o nível de dificuldade?",
            "options": ["Muito fácil", "Fácil", "Adequado", "Difícil", "Muito difícil"],
            "required": true
        },
        {
            "id": "improvements",
            "type": "textarea",
            "question": "Que melhorias você sugere para este módulo?",
            "required": false
        }
    ]'::jsonb
);

-- Insert onboarding steps
INSERT INTO onboarding_steps (step_name, title, description, step_type, order_index) VALUES
('welcome', 'Bem-vindo!', 'Introdução ao portal de aprendizagem', 'welcome', 1),
('profile_setup', 'Complete seu Perfil', 'Finalize as informações do seu perfil', 'profile_setup', 2),
('goal_setting', 'Defina suas Metas', 'Configure seus objetivos de aprendizagem', 'goal_setting', 3),
('mindmap_creation', 'Crie seu Mapa Mental', 'Mapeie seus conhecimentos e objetivos', 'mindmap', 4),
('content_introduction', 'Conheça o Conteúdo', 'Explore os módulos disponíveis', 'content_intro', 5),
('onboarding_complete', 'Pronto para Começar!', 'Finalização do processo de integração', 'completion', 6);

-- Insert basic achievements
INSERT INTO achievements (name, description, achievement_type, criteria, points_value, rarity_level) VALUES
(
    'Primeira Aula',
    'Complete sua primeira aula',
    'lesson_completion',
    '{"lessons_completed": 1}'::jsonb,
    10,
    'common'
),
(
    'Módulo Completo',
    'Complete seu primeiro módulo',
    'module_completion',
    '{"modules_completed": 1}'::jsonb,
    50,
    'uncommon'
),
(
    'Semana Dedicada',
    'Assista aulas por 7 dias consecutivos',
    'streak',
    '{"consecutive_days": 7}'::jsonb,
    100,
    'rare'
),
(
    'Anotador Expert',
    'Crie 50 anotações durante as aulas',
    'engagement',
    '{"notes_created": 50}'::jsonb,
    75,
    'uncommon'
),
(
    'Meta Alcançada',
    'Complete sua primeira meta',
    'goal_achievement',
    '{"goals_completed": 1}'::jsonb,
    30,
    'common'
);

-- Insert note categories
INSERT INTO note_categories (name, description, color_hex, icon, is_system) VALUES
('Importante', 'Informações cruciais para lembrar', '#EF4444', 'alert-circle', true),
('Dúvida', 'Pontos que precisam de esclarecimento', '#F59E0B', 'help-circle', true),
('Exemplo', 'Casos práticos e exemplos', '#10B981', 'lightbulb', true),
('Revisão', 'Conteúdo para revisar depois', '#8B5CF6', 'bookmark', true),
('Aplicação', 'Como aplicar o conhecimento', '#3B82F6', 'tool', true);

-- ===================================
-- 🔐 ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================

-- Enable RLS on all tables
ALTER TABLE video_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_learning_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_mindmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_analytics_summary ENABLE ROW LEVEL SECURITY;

-- Admin-only policies (forms, achievements, categories, etc.)
CREATE POLICY "Admin can manage form templates" ON video_form_templates FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@medicosderesultado.com.br');
CREATE POLICY "Admin can manage goal categories" ON goal_categories FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@medicosderesultado.com.br');
CREATE POLICY "Admin can manage onboarding steps" ON onboarding_steps FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@medicosderesultado.com.br');
CREATE POLICY "Admin can manage achievements" ON achievements FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@medicosderesultado.com.br');
CREATE POLICY "Admin can manage note categories" ON note_categories FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@medicosderesultado.com.br');
CREATE POLICY "Admin can view analytics" ON video_analytics_summary FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@medicosderesultado.com.br');

-- Student-specific policies
CREATE POLICY "Students can view own form responses" ON video_form_responses
FOR SELECT USING (mentorado_id IN (SELECT id FROM mentorados WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Students can create form responses" ON video_form_responses
FOR INSERT WITH CHECK (mentorado_id IN (SELECT id FROM mentorados WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Students can manage own goals" ON video_learning_goals
FOR ALL USING (mentorado_id IN (SELECT id FROM mentorados WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Students can manage own goal milestones" ON goal_milestones
FOR ALL USING (goal_id IN (SELECT id FROM video_learning_goals WHERE mentorado_id IN (SELECT id FROM mentorados WHERE email = auth.jwt() ->> 'email')));

CREATE POLICY "Students can view own onboarding" ON student_onboarding
FOR ALL USING (mentorado_id IN (SELECT id FROM mentorados WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Students can manage own mindmap" ON student_mindmap
FOR ALL USING (mentorado_id IN (SELECT id FROM mentorados WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Students can manage own notes" ON lesson_notes
FOR ALL USING (mentorado_id IN (SELECT id FROM mentorados WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Students can view own achievements" ON student_achievements
FOR SELECT USING (mentorado_id IN (SELECT id FROM mentorados WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Students can view own points" ON student_points
FOR SELECT USING (mentorado_id IN (SELECT id FROM mentorados WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Students can view own point transactions" ON point_transactions
FOR SELECT USING (mentorado_id IN (SELECT id FROM mentorados WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Students can view own engagement metrics" ON student_engagement_metrics
FOR SELECT USING (mentorado_id IN (SELECT id FROM mentorados WHERE email = auth.jwt() ->> 'email'));

-- ===================================
-- 🔄 UTILITY FUNCTIONS
-- ===================================

-- Function to calculate student level based on points
CREATE OR REPLACE FUNCTION calculate_student_level(points INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Level calculation: every 100 points = 1 level
    RETURN GREATEST(1, (points / 100) + 1);
END;
$$ LANGUAGE plpgsql;

-- Function to update student points and level
CREATE OR REPLACE FUNCTION update_student_points_and_level(student_id UUID, points_to_add INTEGER, transaction_type VARCHAR, reference_id UUID DEFAULT NULL, description TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    current_points INTEGER := 0;
    new_level INTEGER;
BEGIN
    -- Insert or update student points
    INSERT INTO student_points (mentorado_id, total_points)
    VALUES (student_id, points_to_add)
    ON CONFLICT (mentorado_id)
    DO UPDATE SET
        total_points = student_points.total_points + points_to_add,
        updated_at = NOW()
    RETURNING total_points INTO current_points;

    -- Calculate new level
    new_level := calculate_student_level(current_points);

    -- Update level
    UPDATE student_points
    SET
        level_number = new_level,
        points_to_next_level = ((new_level * 100) - current_points)
    WHERE mentorado_id = student_id;

    -- Record transaction
    INSERT INTO point_transactions (mentorado_id, points_change, transaction_type, reference_id, description)
    VALUES (student_id, points_to_add, transaction_type, reference_id, description);
END;
$$ LANGUAGE plpgsql;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(student_id UUID)
RETURNS VOID AS $$
DECLARE
    achievement_record RECORD;
    student_data RECORD;
BEGIN
    -- Get student progress data
    SELECT
        COUNT(DISTINCT lp.lesson_id) as lessons_completed,
        COUNT(DISTINCT CASE WHEN lp.is_completed THEN lp.lesson_id END) as lessons_finished,
        COUNT(DISTINCT ln.id) as notes_created,
        COUNT(DISTINCT vlg.id) as goals_completed
    INTO student_data
    FROM mentorados m
    LEFT JOIN lesson_progress lp ON m.id = lp.mentorado_id
    LEFT JOIN lesson_notes ln ON m.id = ln.mentorado_id
    LEFT JOIN video_learning_goals vlg ON m.id = vlg.mentorado_id AND vlg.status = 'completed'
    WHERE m.id = student_id;

    -- Check each achievement
    FOR achievement_record IN SELECT * FROM achievements WHERE is_active = true LOOP
        -- Check if student already has this achievement
        IF NOT EXISTS (SELECT 1 FROM student_achievements WHERE mentorado_id = student_id AND achievement_id = achievement_record.id) THEN
            -- Check criteria based on achievement type
            CASE achievement_record.achievement_type
                WHEN 'lesson_completion' THEN
                    IF student_data.lessons_completed >= (achievement_record.criteria->>'lessons_completed')::INTEGER THEN
                        INSERT INTO student_achievements (mentorado_id, achievement_id) VALUES (student_id, achievement_record.id);
                        PERFORM update_student_points_and_level(student_id, achievement_record.points_value, 'achievement_earned', achievement_record.id, 'Conquista: ' || achievement_record.name);
                    END IF;
                WHEN 'engagement' THEN
                    IF student_data.notes_created >= (achievement_record.criteria->>'notes_created')::INTEGER THEN
                        INSERT INTO student_achievements (mentorado_id, achievement_id) VALUES (student_id, achievement_record.id);
                        PERFORM update_student_points_and_level(student_id, achievement_record.points_value, 'achievement_earned', achievement_record.id, 'Conquista: ' || achievement_record.name);
                    END IF;
                WHEN 'goal_achievement' THEN
                    IF student_data.goals_completed >= (achievement_record.criteria->>'goals_completed')::INTEGER THEN
                        INSERT INTO student_achievements (mentorado_id, achievement_id) VALUES (student_id, achievement_record.id);
                        PERFORM update_student_points_and_level(student_id, achievement_record.points_value, 'achievement_earned', achievement_record.id, 'Conquista: ' || achievement_record.name);
                    END IF;
            END CASE;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- ✅ VERIFICATION AND COMMENTS
-- ===================================

-- Add table comments for documentation
COMMENT ON TABLE video_form_templates IS 'Templates for forms triggered by lesson/module completion';
COMMENT ON TABLE video_form_responses IS 'Student responses to forms with NPS and feedback data';
COMMENT ON TABLE goal_categories IS 'Categories for organizing student goals';
COMMENT ON TABLE video_learning_goals IS 'Student goals with categories and time frames';
COMMENT ON TABLE goal_milestones IS 'Milestones/checkpoints for larger goals';
COMMENT ON TABLE onboarding_steps IS 'Defined steps in the student onboarding process';
COMMENT ON TABLE student_onboarding IS 'Individual student progress through onboarding';
COMMENT ON TABLE student_mindmap IS 'Student mindmap data for learning visualization';
COMMENT ON TABLE lesson_notes IS 'Timestamped notes during video lessons';
COMMENT ON TABLE note_categories IS 'Categories for organizing student notes';
COMMENT ON TABLE achievements IS 'Available achievements for student motivation';
COMMENT ON TABLE student_achievements IS 'Achievements earned by students';
COMMENT ON TABLE student_points IS 'Point/level system for student gamification';
COMMENT ON TABLE point_transactions IS 'History of point changes for students';
COMMENT ON TABLE student_engagement_metrics IS 'Daily engagement metrics per student';
COMMENT ON TABLE video_analytics_summary IS 'Aggregated analytics for admin dashboard';

-- ===================================
-- 🔗 FOREIGN KEYS A SEREM ADICIONADAS DEPOIS
-- ===================================
-- Execute estes comandos DEPOIS que as tabelas video_lessons e video_modules existirem:
--
-- ALTER TABLE video_form_responses
-- ADD CONSTRAINT fk_video_form_responses_lesson
-- FOREIGN KEY (lesson_id) REFERENCES video_lessons(id) ON DELETE SET NULL;
--
-- ALTER TABLE video_form_responses
-- ADD CONSTRAINT fk_video_form_responses_module
-- FOREIGN KEY (module_id) REFERENCES video_modules(id) ON DELETE SET NULL;
--
-- ALTER TABLE lesson_notes
-- ADD CONSTRAINT fk_lesson_notes_lesson
-- FOREIGN KEY (lesson_id) REFERENCES video_lessons(id) ON DELETE CASCADE;

SELECT 'VIDEO LEARNING PORTAL ENHANCEMENT SCHEMA COMPLETED! 🎉' as status,
       'Lembre-se de adicionar as Foreign Keys depois que video_lessons e video_modules existirem' as important_note;