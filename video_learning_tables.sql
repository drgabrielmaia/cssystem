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

-- Índices para performance
CREATE INDEX idx_video_modules_order ON public.video_modules(order_index, is_active);
CREATE INDEX idx_video_lessons_module ON public.video_lessons(module_id, order_index, is_active);
CREATE INDEX idx_lesson_progress_mentorado ON public.lesson_progress(mentorado_id);
CREATE INDEX idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_video_modules_updated_at BEFORE UPDATE ON public.video_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_video_lessons_updated_at BEFORE UPDATE ON public.video_lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE public.video_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para video_modules (apenas admin pode gerenciar)
CREATE POLICY "Admin can manage video modules" ON public.video_modules
FOR ALL USING (auth.role() = 'authenticated');

-- Políticas RLS para video_lessons (apenas admin pode gerenciar)
CREATE POLICY "Admin can manage video lessons" ON public.video_lessons
FOR ALL USING (auth.role() = 'authenticated');

-- Políticas RLS para lesson_progress (mentorados podem ver apenas o próprio progresso)
CREATE POLICY "Mentorados can view own progress" ON public.lesson_progress
FOR SELECT USING (
  mentorado_id IN (
    SELECT id FROM public.mentorados
    WHERE email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Mentorados can update own progress" ON public.lesson_progress
FOR INSERT WITH CHECK (
  mentorado_id IN (
    SELECT id FROM public.mentorados
    WHERE email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Mentorados can update own progress records" ON public.lesson_progress
FOR UPDATE USING (
  mentorado_id IN (
    SELECT id FROM public.mentorados
    WHERE email = auth.jwt() ->> 'email'
  )
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

-- Índices para performance na tabela de controle de acesso
CREATE INDEX idx_video_access_mentorado ON public.video_access_control(mentorado_id);
CREATE INDEX idx_video_access_module ON public.video_access_control(module_id);
CREATE INDEX idx_video_access_active ON public.video_access_control(has_access);

-- Trigger para updated_at na tabela de controle de acesso
CREATE TRIGGER update_video_access_control_updated_at BEFORE UPDATE ON public.video_access_control FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS para video_access_control (apenas admin pode gerenciar)
ALTER TABLE public.video_access_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage video access control" ON public.video_access_control
FOR ALL USING (auth.role() = 'authenticated');

-- Dados iniciais de exemplo
INSERT INTO public.video_modules (title, description, order_index) VALUES
('Módulo 1: Fundamentos', 'Conceitos básicos e introdução', 1),
('Módulo 2: Prática', 'Aplicação prática dos conceitos', 2),
('Módulo 3: Avançado', 'Técnicas avançadas e casos especiais', 3);