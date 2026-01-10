-- ===============================================
-- Netflix-style Video Platform Database Setup - CORRIGIDO
-- ===============================================
-- Run this script in your Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/sql/new

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
-- 2. Create module_ratings table for NPS system
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
-- 3. Create goal_checkpoints table
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
-- 4. Create continue_watching table
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
-- 5. Create module_categories table
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
-- 6. Enable Row Level Security (RLS) - CORRIGIDO
-- ===============================================

-- Enable RLS on module_ratings
ALTER TABLE module_ratings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view ratings in their organization" ON module_ratings;
DROP POLICY IF EXISTS "Users can create their own ratings" ON module_ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON module_ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON module_ratings;

-- Create RLS policies for module_ratings
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
    AND organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE email = auth.jwt() ->> 'email'
    )
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

CREATE POLICY "Users can delete their own ratings"
ON module_ratings FOR DELETE
USING (
  mentorado_id IN (
    SELECT id FROM mentorados
    WHERE email = auth.jwt() ->> 'email'
  )
);

-- Enable RLS on goal_checkpoints
ALTER TABLE goal_checkpoints ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view checkpoints in their organization" ON goal_checkpoints;
DROP POLICY IF EXISTS "Managers can create checkpoints" ON goal_checkpoints;
DROP POLICY IF EXISTS "Managers can update checkpoints" ON goal_checkpoints;
DROP POLICY IF EXISTS "Managers can delete checkpoints" ON goal_checkpoints;

-- Create RLS policies for goal_checkpoints
CREATE POLICY "Users can view checkpoints in their organization"
ON goal_checkpoints FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Managers can create checkpoints"
ON goal_checkpoints FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE email = auth.jwt() ->> 'email'
    AND role IN ('owner', 'manager')
  )
);

CREATE POLICY "Managers can update checkpoints"
ON goal_checkpoints FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE email = auth.jwt() ->> 'email'
    AND role IN ('owner', 'manager')
  )
);

CREATE POLICY "Managers can delete checkpoints"
ON goal_checkpoints FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE email = auth.jwt() ->> 'email'
    AND role IN ('owner', 'manager')
  )
);

-- Enable RLS on continue_watching
ALTER TABLE continue_watching ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own continue watching" ON continue_watching;
DROP POLICY IF EXISTS "Users can create their own continue watching" ON continue_watching;
DROP POLICY IF EXISTS "Users can update their own continue watching" ON continue_watching;
DROP POLICY IF EXISTS "Users can delete their own continue watching" ON continue_watching;

-- Create RLS policies for continue_watching
CREATE POLICY "Users can view their own continue watching"
ON continue_watching FOR SELECT
USING (
  mentorado_id IN (
    SELECT id FROM mentorados
    WHERE email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can create their own continue watching"
ON continue_watching FOR INSERT
WITH CHECK (
  mentorado_id IN (
    SELECT id FROM mentorados
    WHERE email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can update their own continue watching"
ON continue_watching FOR UPDATE
USING (
  mentorado_id IN (
    SELECT id FROM mentorados
    WHERE email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "Users can delete their own continue watching"
ON continue_watching FOR DELETE
USING (
  mentorado_id IN (
    SELECT id FROM mentorados
    WHERE email = auth.jwt() ->> 'email'
  )
);

-- Enable RLS on module_categories
ALTER TABLE module_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view categories in their organization" ON module_categories;
DROP POLICY IF EXISTS "Managers can create categories" ON module_categories;
DROP POLICY IF EXISTS "Managers can update categories" ON module_categories;
DROP POLICY IF EXISTS "Managers can delete categories" ON module_categories;

-- Create RLS policies for module_categories
CREATE POLICY "Users can view categories in their organization"
ON module_categories FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE email = auth.jwt() ->> 'email'
  ) OR organization_id IS NULL -- Allow viewing global categories
);

CREATE POLICY "Managers can create categories"
ON module_categories FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE email = auth.jwt() ->> 'email'
    AND role IN ('owner', 'manager')
  )
);

CREATE POLICY "Managers can update categories"
ON module_categories FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE email = auth.jwt() ->> 'email'
    AND role IN ('owner', 'manager')
  )
);

CREATE POLICY "Managers can delete categories"
ON module_categories FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE email = auth.jwt() ->> 'email'
    AND role IN ('owner', 'manager')
  )
);

-- ===============================================
-- 7. Insert sample categories
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
-- 8. Create trigger for auto-updating average ratings
-- ===============================================

-- Create function to update average rating
CREATE OR REPLACE FUNCTION update_module_average_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update average rating for the module
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

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_module_rating_trigger ON module_ratings;

-- Create trigger
CREATE TRIGGER update_module_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON module_ratings
FOR EACH ROW
EXECUTE FUNCTION update_module_average_rating();

-- ===============================================
-- 9. Create recommendation function - CORRIGIDO
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
  WHERE vm.is_active = true  -- Usar is_active ao invés de is_published
  ORDER BY recommendation_score DESC, vm.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 10. Create continue watching view
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
  vl.video_url,
  vl.duration_seconds,
  vl.order_index as lesson_order,
  vm.id as module_id,
  vm.title as module_title,
  vm.cover_image_url,
  vm.description as module_description,
  m.nome_completo as mentorado_name,
  CASE
    WHEN vl.duration_seconds > 0
    THEN ROUND((cw.last_position_seconds::DECIMAL / vl.duration_seconds) * 100, 0)
    ELSE 0
  END as progress_percentage
FROM continue_watching cw
JOIN video_lessons vl ON cw.lesson_id = vl.id
JOIN video_modules vm ON vl.module_id = vm.id
JOIN mentorados m ON cw.mentorado_id = m.id
ORDER BY cw.last_watched_at DESC;

-- ===============================================
-- 11. Create function to track video watch progress
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
  UPDATE video_progress
  SET
    progress_percentage = CASE
      WHEN (
        SELECT duration_seconds
        FROM video_lessons
        WHERE id = p_lesson_id
      ) > 0
      THEN LEAST(
        100,
        ROUND((p_position_seconds::DECIMAL / (
          SELECT duration_seconds
          FROM video_lessons
          WHERE id = p_lesson_id
        )) * 100, 0)
      )
      ELSE 0
    END,
    last_watched_at = NOW(),
    completed = CASE
      WHEN p_position_seconds >= (
        SELECT duration_seconds * 0.95  -- Mark as complete at 95% watched
        FROM video_lessons
        WHERE id = p_lesson_id
      )
      THEN true
      ELSE completed  -- Keep existing value
    END,
    completed_at = CASE
      WHEN p_position_seconds >= (
        SELECT duration_seconds * 0.95
        FROM video_lessons
        WHERE id = p_lesson_id
      ) AND completed = false
      THEN NOW()
      ELSE completed_at  -- Keep existing value
    END
  WHERE mentorado_id = p_mentorado_id
  AND lesson_id = p_lesson_id;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 12. Create updated_at triggers for new tables
-- ===============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each table
DROP TRIGGER IF EXISTS update_module_ratings_updated_at ON module_ratings;
CREATE TRIGGER update_module_ratings_updated_at
BEFORE UPDATE ON module_ratings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goal_checkpoints_updated_at ON goal_checkpoints;
CREATE TRIGGER update_goal_checkpoints_updated_at
BEFORE UPDATE ON goal_checkpoints
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_module_categories_updated_at ON module_categories;
CREATE TRIGGER update_module_categories_updated_at
BEFORE UPDATE ON module_categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- 13. Verification Queries (Run these to verify setup)
-- ===============================================

-- Check if all tables were created
SELECT 'module_ratings' as table_name, COUNT(*) as record_count FROM module_ratings
UNION ALL
SELECT 'goal_checkpoints', COUNT(*) FROM goal_checkpoints
UNION ALL
SELECT 'continue_watching', COUNT(*) FROM continue_watching
UNION ALL
SELECT 'module_categories', COUNT(*) FROM module_categories;

-- Check if columns were added to video_modules
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'video_modules'
AND column_name IN ('cover_image_url', 'preview_video_url', 'featured', 'tags', 'difficulty_level', 'average_rating', 'total_ratings', 'category_id');

-- List all created policies
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('module_ratings', 'goal_checkpoints', 'continue_watching', 'module_categories')
ORDER BY tablename, policyname;