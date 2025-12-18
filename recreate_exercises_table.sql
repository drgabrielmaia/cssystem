-- ===================================
-- 🔥 RECRIAR TABELA DE EXERCÍCIOS
-- ===================================
-- A tabela lesson_exercises existe mas com estrutura errada!
-- Vamos dropar e recriar com a estrutura correta

-- 1. DROPAR a tabela antiga (cuidado - vai perder dados!)
DROP TABLE IF EXISTS lesson_exercises CASCADE;
DROP TABLE IF EXISTS exercise_submissions CASCADE;
DROP TABLE IF EXISTS question_responses CASCADE;

-- 2. RECRIAR com estrutura correta
-- Tabela principal de exercícios
CREATE TABLE lesson_exercises (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES video_lessons(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES video_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    exercise_type VARCHAR(20) NOT NULL CHECK (exercise_type IN ('quiz', 'essay', 'practical', 'reflection')),
    questions JSONB NOT NULL DEFAULT '[]', -- Array de questões em JSON
    passing_score INTEGER DEFAULT 70 CHECK (passing_score >= 0 AND passing_score <= 100),
    time_limit_minutes INTEGER, -- NULL = sem limite
    attempts_allowed INTEGER DEFAULT 3,
    is_required BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255) DEFAULT 'admin'
);

-- Tabela para armazenar respostas dos mentorados
CREATE TABLE exercise_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    exercise_id UUID NOT NULL REFERENCES lesson_exercises(id) ON DELETE CASCADE,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    attempt_number INTEGER DEFAULT 1,
    answers JSONB NOT NULL DEFAULT '{}', -- Respostas em JSON
    score DECIMAL(5,2), -- Nota obtida
    passed BOOLEAN DEFAULT false,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    time_taken_minutes INTEGER,
    feedback_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para tracking de progresso por questão
CREATE TABLE question_responses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    submission_id UUID NOT NULL REFERENCES exercise_submissions(id) ON DELETE CASCADE,
    question_id VARCHAR(255) NOT NULL, -- ID da questão no JSON
    question_type VARCHAR(50) NOT NULL,
    student_answer TEXT,
    correct_answer TEXT,
    is_correct BOOLEAN,
    points_earned DECIMAL(5,2) DEFAULT 0,
    points_possible DECIMAL(5,2) DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_lesson_exercises_lesson ON lesson_exercises(lesson_id);
CREATE INDEX idx_lesson_exercises_module ON lesson_exercises(module_id);
CREATE INDEX idx_lesson_exercises_active ON lesson_exercises(is_active) WHERE is_active = true;
CREATE INDEX idx_exercise_submissions_exercise ON exercise_submissions(exercise_id);
CREATE INDEX idx_exercise_submissions_mentorado ON exercise_submissions(mentorado_id);
CREATE INDEX idx_exercise_submissions_completed ON exercise_submissions(completed_at);
CREATE INDEX idx_question_responses_submission ON question_responses(submission_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lesson_exercises_updated_at
    BEFORE UPDATE ON lesson_exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE lesson_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_responses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para lesson_exercises
CREATE POLICY "Admin can manage exercises" ON lesson_exercises
FOR ALL USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@medicosderesultado.com.br');

CREATE POLICY "Students can view active exercises" ON lesson_exercises
FOR SELECT USING (is_active = true);

-- Políticas RLS para exercise_submissions
CREATE POLICY "Students can manage own submissions" ON exercise_submissions
FOR ALL USING (mentorado_id IN (SELECT id FROM mentorados WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Admin can view all submissions" ON exercise_submissions
FOR SELECT USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@medicosderesultado.com.br');

-- Políticas RLS para question_responses
CREATE POLICY "Students can view own responses" ON question_responses
FOR SELECT USING (submission_id IN (
    SELECT id FROM exercise_submissions
    WHERE mentorado_id IN (SELECT id FROM mentorados WHERE email = auth.jwt() ->> 'email')
));

CREATE POLICY "Admin can view all responses" ON question_responses
FOR SELECT USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@medicosderesultado.com.br');

-- Views úteis para relatórios
CREATE OR REPLACE VIEW exercise_stats AS
SELECT
    le.id as exercise_id,
    le.title as exercise_title,
    le.exercise_type,
    le.passing_score,
    COUNT(DISTINCT es.mentorado_id) as total_attempts,
    COUNT(DISTINCT CASE WHEN es.passed = true THEN es.mentorado_id END) as students_passed,
    AVG(es.score) as average_score,
    AVG(es.time_taken_minutes) as average_time_minutes
FROM lesson_exercises le
LEFT JOIN exercise_submissions es ON le.id = es.exercise_id
WHERE le.is_active = true
GROUP BY le.id, le.title, le.exercise_type, le.passing_score;

-- Comentários das tabelas
COMMENT ON TABLE lesson_exercises IS 'Exercícios vinculados às aulas do portal de vídeos - ESTRUTURA CORRETA';
COMMENT ON TABLE exercise_submissions IS 'Submissões/respostas dos mentorados aos exercícios';
COMMENT ON TABLE question_responses IS 'Respostas individuais por questão para análise detalhada';

SELECT 'TABELAS DE EXERCÍCIOS RECRIADAS COM SUCESSO! 🎓' as status,
       'Estrutura correta implementada - pode usar o admin de exercícios' as resultado;