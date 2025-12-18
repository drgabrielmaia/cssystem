-- EXECUTE_ESSE_VIDEO.sql
-- SQL para criar tabelas de exercícios e outras necessárias para o sistema de vídeos

-- Tabela de exercícios por aula
CREATE TABLE IF NOT EXISTS lesson_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES video_lessons(id) ON DELETE CASCADE,
    pergunta TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'multipla_escolha' CHECK (tipo IN ('multipla_escolha', 'dissertativa')),
    opcoes JSONB, -- Para múltipla escolha: ["Opção A", "Opção B", "Opção C"]
    resposta_correta TEXT, -- Para múltipla escolha
    ordem INTEGER NOT NULL DEFAULT 1,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de respostas dos mentorados aos exercícios
CREATE TABLE IF NOT EXISTS exercise_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentorado_id UUID REFERENCES mentorados(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES lesson_exercises(id) ON DELETE CASCADE,
    resposta TEXT NOT NULL,
    correto BOOLEAN NOT NULL DEFAULT false,
    respondido_em TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mentorado_id, exercise_id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_lesson_exercises_lesson_id ON lesson_exercises(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_exercises_ordem ON lesson_exercises(ordem);
CREATE INDEX IF NOT EXISTS idx_exercise_responses_mentorado_id ON exercise_responses(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_exercise_responses_exercise_id ON exercise_responses(exercise_id);

-- Inserir alguns exercícios de exemplo
INSERT INTO lesson_exercises (lesson_id, pergunta, tipo, opcoes, resposta_correta, ordem)
SELECT
    id as lesson_id,
    'Qual é o principal objetivo desta aula?' as pergunta,
    'multipla_escolha' as tipo,
    '["Ensinar conceitos básicos", "Apresentar casos práticos", "Desenvolver habilidades", "Todas as anteriores"]'::jsonb as opcoes,
    'Todas as anteriores' as resposta_correta,
    1 as ordem
FROM video_lessons
WHERE NOT EXISTS (SELECT 1 FROM lesson_exercises WHERE lesson_id = video_lessons.id)
LIMIT 5;

-- Inserir exercício dissertativo de exemplo
INSERT INTO lesson_exercises (lesson_id, pergunta, tipo, opcoes, resposta_correta, ordem)
SELECT
    id as lesson_id,
    'Descreva em suas palavras o que você aprendeu nesta aula:' as pergunta,
    'dissertativa' as tipo,
    NULL as opcoes,
    NULL as resposta_correta,
    2 as ordem
FROM video_lessons
WHERE NOT EXISTS (SELECT 1 FROM lesson_exercises WHERE lesson_id = video_lessons.id AND ordem = 2)
LIMIT 3;

-- Dar acesso a todos os mentorados ativos para os módulos existentes
INSERT INTO video_access_control (mentorado_id, module_id, has_access, granted_at)
SELECT
    m.id as mentorado_id,
    vm.id as module_id,
    true as has_access,
    NOW() as granted_at
FROM mentorados m
CROSS JOIN video_modules vm
WHERE m.status_login = 'ativo'
  AND NOT EXISTS (
    SELECT 1 FROM video_access_control vac
    WHERE vac.mentorado_id = m.id AND vac.module_id = vm.id
  );

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers nas novas tabelas
DROP TRIGGER IF EXISTS update_lesson_exercises_updated_at ON lesson_exercises;
CREATE TRIGGER update_lesson_exercises_updated_at
    BEFORE UPDATE ON lesson_exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exercise_responses_updated_at ON exercise_responses;
CREATE TRIGGER update_exercise_responses_updated_at
    BEFORE UPDATE ON exercise_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security) se necessário
ALTER TABLE lesson_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_responses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para exercises (permitir leitura para todos os mentorados autenticados)
CREATE POLICY "Mentorados podem ver exercícios das aulas que têm acesso" ON lesson_exercises
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM video_lessons vl
            JOIN video_modules vm ON vl.module_id = vm.id
            JOIN video_access_control vac ON vm.id = vac.module_id
            WHERE vl.id = lesson_exercises.lesson_id
              AND vac.mentorado_id = auth.uid()::uuid
              AND vac.has_access = true
        )
    );

-- Políticas RLS para respostas de exercícios
CREATE POLICY "Mentorados podem ver suas próprias respostas" ON exercise_responses
    FOR SELECT USING (mentorado_id = auth.uid()::uuid);

CREATE POLICY "Mentorados podem inserir suas próprias respostas" ON exercise_responses
    FOR INSERT WITH CHECK (mentorado_id = auth.uid()::uuid);

CREATE POLICY "Mentorados podem atualizar suas próprias respostas" ON exercise_responses
    FOR UPDATE USING (mentorado_id = auth.uid()::uuid);

-- Permitir acesso anônimo também (para a aplicação funcionar com a chave anon)
CREATE POLICY "Permitir leitura anônima de exercícios" ON lesson_exercises FOR SELECT USING (true);
CREATE POLICY "Permitir operações anônimas em respostas" ON exercise_responses FOR ALL USING (true);

COMMENT ON TABLE lesson_exercises IS 'Exercícios associados às aulas de vídeo';
COMMENT ON TABLE exercise_responses IS 'Respostas dos mentorados aos exercícios';