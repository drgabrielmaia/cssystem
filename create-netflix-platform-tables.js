const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTYzNTY3NiwiZXhwIjoyMDQ1MjExNjc2fQ.g6lJLaOQ9CW4PGNJYHMq_xyunTWtMiMGrcdUTD-W7jQ'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function executeSQLQuery(query, description) {
  console.log(`\n📦 ${description}...`)
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: query })
    if (error) {
      console.error(`❌ Error: ${error.message}`)
      return false
    }
    console.log(`✅ Success!`)
    return true
  } catch (err) {
    // If exec_sql doesn't exist, try direct query
    console.log('  Trying alternative method...')
    const { error } = await supabase.from('_sql').select().limit(0) // Just to test connection
    if (error && error.message.includes('_sql')) {
      console.log(`⚠️  Note: Direct SQL execution not available. Please run these queries manually in Supabase SQL Editor.`)
      return false
    }
    console.error(`❌ Error: ${err.message}`)
    return false
  }
}

async function createTables() {
  console.log('🚀 Starting Netflix-style Platform Database Setup...\n')
  console.log('===============================================')

  // SQL Queries
  const queries = [
    {
      description: '1. Updating video_modules table with new columns',
      sql: `
        -- Add new columns to video_modules table for Netflix-style features
        ALTER TABLE video_modules
        ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
        ADD COLUMN IF NOT EXISTS preview_video_url TEXT,
        ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS tags TEXT[],
        ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
        ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2),
        ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;
      `
    },
    {
      description: '2. Creating module_ratings table for NPS system',
      sql: `
        -- Create module_ratings table for user feedback
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

        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_module_ratings_module_id ON module_ratings(module_id);
        CREATE INDEX IF NOT EXISTS idx_module_ratings_mentorado_id ON module_ratings(mentorado_id);
        CREATE INDEX IF NOT EXISTS idx_module_ratings_organization_id ON module_ratings(organization_id);
      `
    },
    {
      description: '3. Creating goal_checkpoints table for progress tracking',
      sql: `
        -- Create goal_checkpoints table for milestone tracking
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
      `
    },
    {
      description: '4. Creating continue_watching table',
      sql: `
        -- Create continue_watching table for Netflix-style resume feature
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
      `
    },
    {
      description: '5. Creating module_categories table',
      sql: `
        -- Create module_categories table for content organization
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
      `
    },
    {
      description: '6. Setting up RLS policies for module_ratings',
      sql: `
        -- Enable RLS
        ALTER TABLE module_ratings ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view ratings in their organization" ON module_ratings;
        DROP POLICY IF EXISTS "Users can create their own ratings" ON module_ratings;
        DROP POLICY IF EXISTS "Users can update their own ratings" ON module_ratings;
        DROP POLICY IF EXISTS "Users can delete their own ratings" ON module_ratings;

        -- Create RLS policies
        CREATE POLICY "Users can view ratings in their organization"
        ON module_ratings FOR SELECT
        USING (
          organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can create their own ratings"
        ON module_ratings FOR INSERT
        WITH CHECK (
          mentorado_id IN (
            SELECT id FROM mentorados
            WHERE user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can update their own ratings"
        ON module_ratings FOR UPDATE
        USING (
          mentorado_id IN (
            SELECT id FROM mentorados
            WHERE user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can delete their own ratings"
        ON module_ratings FOR DELETE
        USING (
          mentorado_id IN (
            SELECT id FROM mentorados
            WHERE user_id = auth.uid()
          )
        );
      `
    },
    {
      description: '7. Setting up RLS policies for goal_checkpoints',
      sql: `
        -- Enable RLS
        ALTER TABLE goal_checkpoints ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view checkpoints in their organization" ON goal_checkpoints;
        DROP POLICY IF EXISTS "Managers can create checkpoints" ON goal_checkpoints;
        DROP POLICY IF EXISTS "Managers can update checkpoints" ON goal_checkpoints;
        DROP POLICY IF EXISTS "Managers can delete checkpoints" ON goal_checkpoints;

        -- Create RLS policies
        CREATE POLICY "Users can view checkpoints in their organization"
        ON goal_checkpoints FOR SELECT
        USING (
          organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
          )
        );

        CREATE POLICY "Managers can create checkpoints"
        ON goal_checkpoints FOR INSERT
        WITH CHECK (
          organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'manager')
          )
        );

        CREATE POLICY "Managers can update checkpoints"
        ON goal_checkpoints FOR UPDATE
        USING (
          organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'manager')
          )
        );

        CREATE POLICY "Managers can delete checkpoints"
        ON goal_checkpoints FOR DELETE
        USING (
          organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'manager')
          )
        );
      `
    },
    {
      description: '8. Setting up RLS policies for continue_watching',
      sql: `
        -- Enable RLS
        ALTER TABLE continue_watching ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view their own continue watching" ON continue_watching;
        DROP POLICY IF EXISTS "Users can create their own continue watching" ON continue_watching;
        DROP POLICY IF EXISTS "Users can update their own continue watching" ON continue_watching;
        DROP POLICY IF EXISTS "Users can delete their own continue watching" ON continue_watching;

        -- Create RLS policies
        CREATE POLICY "Users can view their own continue watching"
        ON continue_watching FOR SELECT
        USING (
          mentorado_id IN (
            SELECT id FROM mentorados
            WHERE user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can create their own continue watching"
        ON continue_watching FOR INSERT
        WITH CHECK (
          mentorado_id IN (
            SELECT id FROM mentorados
            WHERE user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can update their own continue watching"
        ON continue_watching FOR UPDATE
        USING (
          mentorado_id IN (
            SELECT id FROM mentorados
            WHERE user_id = auth.uid()
          )
        );

        CREATE POLICY "Users can delete their own continue watching"
        ON continue_watching FOR DELETE
        USING (
          mentorado_id IN (
            SELECT id FROM mentorados
            WHERE user_id = auth.uid()
          )
        );
      `
    },
    {
      description: '9. Setting up RLS policies for module_categories',
      sql: `
        -- Enable RLS
        ALTER TABLE module_categories ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view categories in their organization" ON module_categories;
        DROP POLICY IF EXISTS "Managers can create categories" ON module_categories;
        DROP POLICY IF EXISTS "Managers can update categories" ON module_categories;
        DROP POLICY IF EXISTS "Managers can delete categories" ON module_categories;

        -- Create RLS policies
        CREATE POLICY "Users can view categories in their organization"
        ON module_categories FOR SELECT
        USING (
          organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
          )
        );

        CREATE POLICY "Managers can create categories"
        ON module_categories FOR INSERT
        WITH CHECK (
          organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'manager')
          )
        );

        CREATE POLICY "Managers can update categories"
        ON module_categories FOR UPDATE
        USING (
          organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'manager')
          )
        );

        CREATE POLICY "Managers can delete categories"
        ON module_categories FOR DELETE
        USING (
          organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'manager')
          )
        );
      `
    },
    {
      description: '10. Creating sample data for module_categories',
      sql: `
        -- Insert sample categories (you can customize these)
        INSERT INTO module_categories (name, description, color, display_order, organization_id)
        VALUES
          ('Fundamentos', 'Conceitos básicos e introdutórios', '#3B82F6', 1, NULL),
          ('Marketing Digital', 'Estratégias de marketing online', '#10B981', 2, NULL),
          ('Vendas', 'Técnicas e processos de vendas', '#F59E0B', 3, NULL),
          ('Gestão', 'Liderança e gestão de equipes', '#8B5CF6', 4, NULL),
          ('Finanças', 'Controle financeiro e investimentos', '#EF4444', 5, NULL),
          ('Desenvolvimento Pessoal', 'Soft skills e crescimento pessoal', '#EC4899', 6, NULL)
        ON CONFLICT DO NOTHING;
      `
    },
    {
      description: '11. Creating trigger to update average_rating in video_modules',
      sql: `
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
            )
          WHERE id = COALESCE(NEW.module_id, OLD.module_id);

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Drop trigger if exists
        DROP TRIGGER IF EXISTS update_module_rating_trigger ON module_ratings;

        -- Create trigger
        CREATE TRIGGER update_module_rating_trigger
        AFTER INSERT OR UPDATE OR DELETE ON module_ratings
        FOR EACH ROW
        EXECUTE FUNCTION update_module_average_rating();
      `
    },
    {
      description: '12. Creating function to get personalized recommendations',
      sql: `
        -- Create function for personalized video recommendations
        CREATE OR REPLACE FUNCTION get_video_recommendations(p_mentorado_id UUID, p_limit INT DEFAULT 10)
        RETURNS TABLE (
          module_id UUID,
          title VARCHAR,
          description TEXT,
          cover_image_url TEXT,
          average_rating DECIMAL,
          total_ratings INT,
          category_name VARCHAR,
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
            -- Calculate recommendation score based on various factors
            (
              COALESCE(vm.average_rating, 0) * 0.3 +  -- Rating weight
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
              END
            ) as recommendation_score
          FROM video_modules vm
          LEFT JOIN module_categories mc ON vm.category_id = mc.id
          WHERE vm.is_published = true
          ORDER BY recommendation_score DESC, vm.created_at DESC
          LIMIT p_limit;
        END;
        $$ LANGUAGE plpgsql;
      `
    },
    {
      description: '13. Creating view for continue watching with details',
      sql: `
        -- Create view for continue watching with full details
        CREATE OR REPLACE VIEW continue_watching_details AS
        SELECT
          cw.*,
          vl.title as lesson_title,
          vl.video_url,
          vl.duration_seconds,
          vm.id as module_id,
          vm.title as module_title,
          vm.cover_image_url,
          m.nome as mentorado_name,
          ROUND((cw.last_position_seconds::DECIMAL / NULLIF(vl.duration_seconds, 0)) * 100, 0) as progress_percentage
        FROM continue_watching cw
        JOIN video_lessons vl ON cw.lesson_id = vl.id
        JOIN video_modules vm ON vl.module_id = vm.id
        JOIN mentorados m ON cw.mentorado_id = m.id
        ORDER BY cw.last_watched_at DESC;
      `
    }
  ]

  // Try to execute each query
  let successCount = 0
  let failCount = 0

  for (const query of queries) {
    const success = await executeSQLQuery(query.sql, query.description)
    if (success) successCount++
    else failCount++
  }

  console.log('\n===============================================')
  console.log('📊 Summary:')
  console.log(`   ✅ Successful operations: ${successCount}`)
  console.log(`   ❌ Failed operations: ${failCount}`)

  if (failCount > 0) {
    console.log('\n⚠️  Some operations failed. You may need to run these SQL queries manually in the Supabase SQL Editor.')
    console.log('   Go to: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/sql/new')
  } else {
    console.log('\n🎉 All database operations completed successfully!')
  }

  // Test the new tables
  console.log('\n===============================================')
  console.log('🧪 Testing new tables...\n')

  // Test module_categories
  const { data: categories, error: catError } = await supabase
    .from('module_categories')
    .select('*')
    .limit(3)

  if (catError) {
    console.log('❌ Error fetching module_categories:', catError.message)
  } else {
    console.log(`✅ module_categories table: Found ${categories.length} categories`)
    if (categories.length > 0) {
      console.log('   Sample category:', categories[0].name)
    }
  }

  // Test module_ratings
  const { data: ratings, error: ratError } = await supabase
    .from('module_ratings')
    .select('*')
    .limit(1)

  if (ratError) {
    console.log('❌ Error fetching module_ratings:', ratError.message)
  } else {
    console.log(`✅ module_ratings table: Created successfully (${ratings.length} records)`)
  }

  // Test goal_checkpoints
  const { data: checkpoints, error: checkError } = await supabase
    .from('goal_checkpoints')
    .select('*')
    .limit(1)

  if (checkError) {
    console.log('❌ Error fetching goal_checkpoints:', checkError.message)
  } else {
    console.log(`✅ goal_checkpoints table: Created successfully (${checkpoints.length} records)`)
  }

  // Test continue_watching
  const { data: watching, error: watchError } = await supabase
    .from('continue_watching')
    .select('*')
    .limit(1)

  if (watchError) {
    console.log('❌ Error fetching continue_watching:', watchError.message)
  } else {
    console.log(`✅ continue_watching table: Created successfully (${watching.length} records)`)
  }

  console.log('\n✨ Database setup complete!')
}

// Run the setup
createTables().catch(console.error)