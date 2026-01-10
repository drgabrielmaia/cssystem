-- ===============================================
-- Netflix-style Video Platform Database Setup - FINAL CORRIGIDO
-- ===============================================
-- Run this script in your Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/sql/new
--
-- BASEADO NA ESTRUTURA REAL DO SUPABASE:
-- video_lessons: panda_video_embed_url (não video_url)
-- video_lessons: duration_minutes (não duration_seconds)
-- video_progress: NÃO EXISTE - precisa ser criada
-- Várias tabelas precisam ser criadas

-- ===============================================
-- 1. Update video_modules table with new columns
-- ===============================================
ALTER TABLE video_modules
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS preview_video_url TEXT,
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;

-- ===============================================
-- 2. Create video_progress table (NÃO EXISTE)
-- ===============================================
CREATE TABLE IF NOT EXISTS video_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES video_lessons(id) ON DELETE CASCADE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    watch_time_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    organization_id UUID REFERENCES organizations(id),
    UNIQUE(mentorado_id, lesson_id)
);

-- Create indexes for video_progress
CREATE INDEX IF NOT EXISTS idx_video_progress_mentorado_id ON video_progress(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_lesson_id ON video_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_organization_id ON video_progress(organization_id);

-- ===============================================
-- 3. Create module_ratings table for NPS system
-- ===============================================
CREATE TABLE IF NOT EXISTS module_ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    module_id UUID NOT NULL REFERENCES video_modules(id) ON DELETE CASCADE,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 10),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    organization_id UUID REFERENCES organizations(id),
    UNIQUE(module_id, mentorado_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_module_ratings_module_id ON module_ratings(module_id);
CREATE INDEX IF NOT EXISTS idx_module_ratings_mentorado_id ON module_ratings(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_module_ratings_organization_id ON module_ratings(organization_id);

-- ===============================================
-- 4. Create goal_checkpoints table
-- ===============================================
CREATE TABLE IF NOT EXISTS goal_checkpoints (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES video_learning_goals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_value DECIMAL(10,2),
    current_value DECIMAL(10,2) DEFAULT 0,
    target_date DATE,
    completed_date TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT FALSE,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    organization_id UUID REFERENCES organizations(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_goal_checkpoints_goal_id ON goal_checkpoints(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_checkpoints_organization_id ON goal_checkpoints(organization_id);

-- ===============================================
-- 5. Create continue_watching table
-- ===============================================
CREATE TABLE IF NOT EXISTS continue_watching (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mentorado_id UUID NOT NULL REFERENCES mentorados(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES video_lessons(id) ON DELETE CASCADE,
    last_position_seconds INTEGER DEFAULT 0,
    last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    organization_id UUID REFERENCES organizations(id),
    UNIQUE(mentorado_id, lesson_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_continue_watching_mentorado_id ON continue_watching(mentorado_id);
CREATE INDEX IF NOT EXISTS idx_continue_watching_lesson_id ON continue_watching(lesson_id);
CREATE INDEX IF NOT EXISTS idx_continue_watching_last_watched ON continue_watching(last_watched_at DESC);

-- ===============================================
-- 6. Create module_categories table
-- ===============================================
CREATE TABLE IF NOT EXISTS module_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    color VARCHAR(7),
    display_order INTEGER DEFAULT 0,
    organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add category_id to video_modules
ALTER TABLE video_modules
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES module_categories(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_module_categories_organization_id ON module_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_video_modules_category_id ON video_modules(category_id);

-- ===============================================
-- 7. Enable Row Level Security (RLS) - CORRIGIDO
-- ===============================================

-- Enable RLS on video_progress
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
ON video_progress FOR SELECT
USING (
  mentorado_id IN (
    SELECT id FROM mentorados
    WHERE email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can create their own progress"
ON video_progress FOR INSERT
WITH CHECK (
  mentorado_id IN (
    SELECT id FROM mentorados
    WHERE email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can update their own progress"
ON video_progress FOR UPDATE
USING (
  mentorado_id IN (
    SELECT id FROM mentorados
    WHERE email = auth.jwt() ->> 'email'
  )
);

-- Enable RLS on module_ratings
ALTER TABLE module_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ratings in their organization"
ON module_ratings FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can create their own ratings"
ON module_ratings FOR INSERT
WITH CHECK (
  mentorado_id IN (
    SELECT id FROM mentorados
    WHERE email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can update their own ratings"
ON module_ratings FOR UPDATE
USING (
  mentorado_id IN (
    SELECT id FROM mentorados
    WHERE email = auth.jwt() ->> 'email'
  )
);

-- Enable RLS on continue_watching
ALTER TABLE continue_watching ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own continue watching"
ON continue_watching FOR SELECT
USING (
  mentorado_id IN (
    SELECT id FROM mentorados
    WHERE email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can manage their own continue watching"
ON continue_watching FOR ALL
USING (
  mentorado_id IN (
    SELECT id FROM mentorados
    WHERE email = auth.jwt() ->> 'email'
  )
);

-- Enable RLS on module_categories
ALTER TABLE module_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories in their organization"
ON module_categories FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE email = auth.jwt() ->> 'email'
  ) OR organization_id IS NULL -- Allow viewing global categories
);

CREATE POLICY "Managers can manage categories"
ON module_categories FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE email = auth.jwt() ->> 'email'
    AND role IN ('owner', 'manager')
  )
);

-- ===============================================
-- 8. Insert sample categories
-- ===============================================
INSERT INTO module_categories (name, description, color, display_order, organization_id)
VALUES
  ('Fundamentos', 'Conceitos básicos e introdutórios', '#3B82F6', 1, NULL),
  ('Marketing Digital', 'Estratégias de marketing online', '#10B981', 2, NULL),
  ('Vendas', 'Técnicas e processos de vendas', '#F59E0B', 3, NULL),
  ('Gestão', 'Liderança e gestão de equipes', '#8B5CF6', 4, NULL),
  ('Finanças', 'Controle financeiro e investimentos', '#EF4444', 5, NULL),
  ('Desenvolvimento Pessoal', 'Soft skills e crescimento pessoal', '#EC4899', 6, NULL)
ON CONFLICT DO NOTHING;

-- ===============================================
-- 9. Create trigger for auto-updating average ratings
-- ===============================================

CREATE OR REPLACE FUNCTION update_module_average_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE video_modules
  SET
    average_rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM module_ratings
      WHERE module_id = COALESCE(NEW.module_id, OLD.module_id)
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM module_ratings
      WHERE module_id = COALESCE(NEW.module_id, OLD.module_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.module_id, OLD.module_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_module_rating_trigger ON module_ratings;
CREATE TRIGGER update_module_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON module_ratings
FOR EACH ROW
EXECUTE FUNCTION update_module_average_rating();

-- ===============================================
-- 10. Create recommendation function - CORRIGIDO COM ESTRUTURA REAL
-- ===============================================
CREATE OR REPLACE FUNCTION get_video_recommendations(
  p_mentorado_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  module_id UUID,
  title VARCHAR,
  description TEXT,
  cover_image_url TEXT,
  average_rating DECIMAL,
  total_ratings INT,
  category_name VARCHAR,
  difficulty_level TEXT,
  recommendation_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vm.id as module_id,
    vm.title,
    vm.description,
    vm.cover_image_url,
    vm.average_rating,
    vm.total_ratings,
    mc.name as category_name,
    vm.difficulty_level,
    -- Calculate recommendation score based on various factors
    (
      COALESCE(vm.average_rating, 0) * 0.3 +  -- Rating weight: 30%
      CASE
        WHEN vm.featured THEN 2
        ELSE 0
      END +  -- Featured boost
      CASE
        WHEN vm.id NOT IN (
          SELECT DISTINCT vl.module_id
          FROM video_lessons vl
          JOIN video_progress vp ON vp.lesson_id = vl.id
          WHERE vp.mentorado_id = p_mentorado_id
          AND vp.completed = true
        ) THEN 1  -- Not completed boost
        ELSE 0
      END +
      CASE
        WHEN vm.total_ratings > 10 THEN 0.5  -- Popular content boost
        ELSE 0
      END
    )::DECIMAL as recommendation_score
  FROM video_modules vm
  LEFT JOIN module_categories mc ON vm.category_id = mc.id
  WHERE vm.is_active = true
  ORDER BY recommendation_score DESC, vm.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 11. Create continue watching view - CORRIGIDO COM COLUNAS REAIS
-- ===============================================
CREATE OR REPLACE VIEW continue_watching_details AS
SELECT
  cw.id,
  cw.mentorado_id,
  cw.lesson_id,
  cw.last_position_seconds,
  cw.last_watched_at,
  cw.organization_id,
  vl.title as lesson_title,
  vl.panda_video_embed_url,  -- Usar panda_video_embed_url ao invés de video_url
  vl.duration_minutes,       -- Usar duration_minutes ao invés de duration_seconds
  vl.order_index as lesson_order,
  vm.id as module_id,
  vm.title as module_title,
  vm.cover_image_url,
  vm.description as module_description,
  m.nome_completo as mentorado_name,
  CASE
    WHEN vl.duration_minutes > 0
    THEN ROUND((cw.last_position_seconds::DECIMAL / (vl.duration_minutes * 60)) * 100, 0)
    ELSE 0
  END as progress_percentage
FROM continue_watching cw
JOIN video_lessons vl ON cw.lesson_id = vl.id
JOIN video_modules vm ON vl.module_id = vm.id
JOIN mentorados m ON cw.mentorado_id = m.id
ORDER BY cw.last_watched_at DESC;

-- ===============================================
-- 12. Create function to track video watch progress - CORRIGIDO
-- ===============================================
CREATE OR REPLACE FUNCTION update_continue_watching(
  p_mentorado_id UUID,
  p_lesson_id UUID,
  p_position_seconds INTEGER,
  p_organization_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insert or update continue watching record
  INSERT INTO continue_watching (
    mentorado_id,
    lesson_id,
    last_position_seconds,
    last_watched_at,
    organization_id
  )
  VALUES (
    p_mentorado_id,
    p_lesson_id,
    p_position_seconds,
    NOW(),
    p_organization_id
  )
  ON CONFLICT (mentorado_id, lesson_id)
  DO UPDATE SET
    last_position_seconds = EXCLUDED.last_position_seconds,
    last_watched_at = NOW();

  -- Also update video_progress if needed
  INSERT INTO video_progress (
    mentorado_id,
    lesson_id,
    progress_percentage,
    last_watched_at,
    watch_time_seconds,
    organization_id,
    completed,
    completed_at
  )
  VALUES (
    p_mentorado_id,
    p_lesson_id,
    CASE
      WHEN (SELECT duration_minutes FROM video_lessons WHERE id = p_lesson_id) > 0
      THEN LEAST(
        100,
        ROUND((p_position_seconds::DECIMAL / ((SELECT duration_minutes FROM video_lessons WHERE id = p_lesson_id) * 60)) * 100, 0)
      )
      ELSE 0
    END,
    NOW(),
    p_position_seconds,
    p_organization_id,
    CASE
      WHEN p_position_seconds >= ((SELECT duration_minutes FROM video_lessons WHERE id = p_lesson_id) * 60 * 0.95)
      THEN true
      ELSE false
    END,
    CASE
      WHEN p_position_seconds >= ((SELECT duration_minutes FROM video_lessons WHERE id = p_lesson_id) * 60 * 0.95)
      THEN NOW()
      ELSE NULL
    END
  )
  ON CONFLICT (mentorado_id, lesson_id)
  DO UPDATE SET
    progress_percentage = CASE
      WHEN (SELECT duration_minutes FROM video_lessons WHERE id = p_lesson_id) > 0
      THEN LEAST(
        100,
        ROUND((p_position_seconds::DECIMAL / ((SELECT duration_minutes FROM video_lessons WHERE id = p_lesson_id) * 60)) * 100, 0)
      )
      ELSE 0
    END,
    last_watched_at = NOW(),
    watch_time_seconds = GREATEST(video_progress.watch_time_seconds, p_position_seconds),
    completed = CASE
      WHEN p_position_seconds >= ((SELECT duration_minutes FROM video_lessons WHERE id = p_lesson_id) * 60 * 0.95)
      THEN true
      ELSE video_progress.completed
    END,
    completed_at = CASE
      WHEN p_position_seconds >= ((SELECT duration_minutes FROM video_lessons WHERE id = p_lesson_id) * 60 * 0.95)
      AND video_progress.completed = false
      THEN NOW()
      ELSE video_progress.completed_at
    END;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 13. Create updated_at triggers
-- ===============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_video_progress_updated_at ON video_progress;
CREATE TRIGGER update_video_progress_updated_at
BEFORE UPDATE ON video_progress
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_module_ratings_updated_at ON module_ratings;
CREATE TRIGGER update_module_ratings_updated_at
BEFORE UPDATE ON module_ratings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_module_categories_updated_at ON module_categories;
CREATE TRIGGER update_module_categories_updated_at
BEFORE UPDATE ON module_categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- 14. Verification Queries
-- ===============================================

-- Check if all tables were created
SELECT 'video_progress' as table_name, COUNT(*) as record_count FROM video_progress
UNION ALL
SELECT 'module_ratings', COUNT(*) FROM module_ratings
UNION ALL
SELECT 'goal_checkpoints', COUNT(*) FROM goal_checkpoints
UNION ALL
SELECT 'continue_watching', COUNT(*) FROM continue_watching
UNION ALL
SELECT 'module_categories', COUNT(*) FROM module_categories;

-- Check new columns in video_modules
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'video_modules'
AND column_name IN ('cover_image_url', 'preview_video_url', 'featured', 'tags', 'difficulty_level', 'average_rating', 'total_ratings', 'category_id');

-- Test recommendation function
-- SELECT * FROM get_video_recommendations('YOUR_MENTORADO_ID_HERE', 5);