const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testLocalVideoAdmin() {
  try {
    console.log('🧪 TESTE LOCAL: Admin Vídeos\n')

    // Simular exatamente as queries que o código faz
    console.log('1️⃣ Testando loadModules...')

    const { data: modulesData, error: modulesError } = await supabase
      .from('video_modules')
      .select('*')
      .order('order_index', { ascending: true })

    if (modulesError) {
      console.log('❌ Erro módulos:', modulesError)
      return
    }

    console.log(`✅ ${modulesData?.length || 0} módulos base encontrados`)

    // Teste da contagem de aulas
    if (modulesData && modulesData.length > 0) {
      console.log('\n2️⃣ Testando contagem de aulas...')

      for (const module of modulesData) {
        const { count } = await supabase
          .from('video_lessons')
          .select('id', { count: 'exact' })
          .eq('module_id', module.id)

        console.log(`   - ${module.title}: ${count || 0} aulas`)
      }
    }

    console.log('\n3️⃣ Testando loadLessons...')

    const { data: lessonsData, error: lessonsError } = await supabase
      .from('video_lessons')
      .select('*')
      .order('order_index', { ascending: true })

    if (lessonsError) {
      console.log('❌ Erro aulas:', lessonsError)
    } else {
      console.log(`✅ ${lessonsData?.length || 0} aulas encontradas`)
    }

    console.log('\n4️⃣ Testando loadStats...')

    const [modulesResult, lessonsResult, studentsResult, progressResult] = await Promise.all([
      supabase.from('video_modules').select('id', { count: 'exact' }),
      supabase.from('video_lessons').select('id', { count: 'exact' }),
      supabase.from('mentorados').select('id', { count: 'exact' }).eq('excluido', false),
      supabase.from('lesson_progress').select('is_completed', { count: 'exact' })
    ])

    console.log(`✅ Stats:`)
    console.log(`   - Módulos: ${modulesResult.count || 0}`)
    console.log(`   - Aulas: ${lessonsResult.count || 0}`)
    console.log(`   - Mentorados: ${studentsResult.count || 0}`)
    console.log(`   - Progresso: ${progressResult.count || 0}`)

    // Se não tem dados, inserir dados de teste
    if ((modulesResult.count || 0) === 0) {
      console.log('\n🔧 NENHUM DADO ENCONTRADO!')
      console.log('\n📋 Execute no Supabase SQL Editor:')

      const insertSQL = `
-- Inserir módulos de teste
INSERT INTO video_modules (title, description, order_index, is_active) VALUES
('Módulo 1: Fundamentos', 'Conceitos básicos da mentoria', 1, true),
('Módulo 2: Prática', 'Aplicação prática dos conceitos', 2, true),
('Módulo 3: Avançado', 'Técnicas avançadas', 3, true);

-- Inserir aulas de teste
INSERT INTO video_lessons (module_id, title, description, panda_video_embed_url, duration_minutes, order_index, is_active)
SELECT
  m.id,
  'Aula ' || m.order_index || '.1: Introdução',
  'Primeira aula do módulo ' || m.title,
  'https://player.pandavideo.com.br/embed/?v=exemplo' || m.order_index,
  15,
  1,
  true
FROM video_modules m;
`

      console.log(insertSQL)
      console.log('\n🚀 Depois disso, a página deve funcionar!')
    }

  } catch (err) {
    console.error('❌ Erro:', err)
  }
}

testLocalVideoAdmin()