-- ===============================================
-- RESET COMPLETO: Dropar e recriar todas as tabelas de vídeo
-- ===============================================

-- Dropar tabelas na ordem correta (dependências primeiro)
DROP TABLE IF EXISTS public.video_access_control CASCADE;
DROP TABLE IF EXISTS public.lesson_progress CASCADE;
DROP TABLE IF EXISTS public.video_lessons CASCADE;
DROP TABLE IF EXISTS public.video_modules CASCADE;

-- Dropar função se existir
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ===============================================
-- RECRIAR TUDO DO ZERO
-- ===============================================

-- Função para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Tabela para módulos de vídeo
CREATE TABLE public.video_modules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title varchar(255) NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  thumbnail_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela para aulas/lições
CREATE TABLE public.video_lessons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid REFERENCES public.video_modules(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  description text,
  panda_video_embed_url text NOT NULL,
  panda_video_id varchar(255),
  duration_minutes integer DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela para progresso das aulas
CREATE TABLE public.lesson_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorado_id uuid REFERENCES public.mentorados(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.video_lessons(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  watch_time_minutes integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(mentorado_id, lesson_id)
);

-- Tabela para controle de acesso aos módulos
CREATE TABLE public.video_access_control (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorado_id uuid REFERENCES public.mentorados(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.video_modules(id) ON DELETE CASCADE,
  has_access boolean DEFAULT true,
  granted_at timestamptz DEFAULT now(),
  granted_by varchar(255),
  revoked_at timestamptz,
  revoked_by varchar(255),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(mentorado_id, module_id)
);

-- Índices para performance
CREATE INDEX idx_video_modules_order ON public.video_modules(order_index, is_active);
CREATE INDEX idx_video_lessons_module ON public.video_lessons(module_id, order_index, is_active);
CREATE INDEX idx_lesson_progress_mentorado ON public.lesson_progress(mentorado_id);
CREATE INDEX idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);
CREATE INDEX idx_video_access_mentorado ON public.video_access_control(mentorado_id);
CREATE INDEX idx_video_access_module ON public.video_access_control(module_id);
CREATE INDEX idx_video_access_active ON public.video_access_control(has_access);

-- Triggers para updated_at
CREATE TRIGGER update_video_modules_updated_at BEFORE UPDATE ON public.video_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_video_lessons_updated_at BEFORE UPDATE ON public.video_lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_video_access_control_updated_at BEFORE UPDATE ON public.video_access_control FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - DESABILITADO para facilitar inserção inicial
ALTER TABLE public.video_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_access_control ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permissivas para authenticated users)
CREATE POLICY "Allow all for authenticated users" ON public.video_modules FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.video_lessons FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.lesson_progress FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.video_access_control FOR ALL TO authenticated USING (true);

-- Dados iniciais de exemplo
INSERT INTO public.video_modules (title, description, order_index, is_active) VALUES
('Módulo 1: Fundamentos', 'Conceitos básicos da mentoria médica', 1, true),
('Módulo 2: Prática Clínica', 'Aplicação prática no consultório', 2, true),
('Módulo 3: Negócios Médicos', 'Gestão e empreendedorismo médico', 3, true);

-- Inserir aulas de exemplo para cada módulo
INSERT INTO public.video_lessons (module_id, title, description, panda_video_embed_url, panda_video_id, duration_minutes, order_index, is_active)
SELECT
  m.id,
  'Aula ' || m.order_index || '.1: Introdução',
  'Primeira aula do módulo ' || m.title,
  'https://player.pandavideo.com.br/embed/?v=exemplo' || m.order_index,
  'exemplo' || m.order_index,
  15 + (m.order_index * 5), -- 20, 25, 30 minutos
  1,
  true
FROM public.video_modules m;

-- Inserir segunda aula para cada módulo
INSERT INTO public.video_lessons (module_id, title, description, panda_video_embed_url, panda_video_id, duration_minutes, order_index, is_active)
SELECT
  m.id,
  'Aula ' || m.order_index || '.2: Aprofundamento',
  'Segunda aula do módulo ' || m.title,
  'https://player.pandavideo.com.br/embed/?v=exemplo' || m.order_index || 'b',
  'exemplo' || m.order_index || 'b',
  20 + (m.order_index * 5), -- 25, 30, 35 minutos
  2,
  true
FROM public.video_modules m;

-- Verificação final
SELECT
  'Módulos criados' as tipo,
  count(*) as total
FROM public.video_modules

UNION ALL

SELECT
  'Aulas criadas' as tipo,
  count(*) as total
FROM public.video_lessons

UNION ALL

SELECT
  'Tabelas de progresso' as tipo,
  count(*) as total
FROM public.lesson_progress

UNION ALL

SELECT
  'Controles de acesso' as tipo,
  count(*) as total
FROM public.video_access_control;