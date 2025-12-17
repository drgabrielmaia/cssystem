const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createVideoModules() {
  try {
    console.log('🎥 Criando módulos de vídeo...')

    const modules = [
      {
        title: 'Módulo 1: Fundamentos',
        description: 'Conceitos básicos e introdução à mentoria',
        order_index: 1,
        is_active: true
      },
      {
        title: 'Módulo 2: Prática',
        description: 'Aplicação prática dos conceitos aprendidos',
        order_index: 2,
        is_active: true
      },
      {
        title: 'Módulo 3: Avançado',
        description: 'Técnicas avançadas e casos especiais',
        order_index: 3,
        is_active: true
      }
    ]

    const { data, error } = await supabase
      .from('video_modules')
      .insert(modules)
      .select()

    if (error) {
      console.error('❌ Erro ao criar módulos:', error)
      return
    }

    console.log('✅ Módulos criados com sucesso:')
    data.forEach(m => {
      console.log(`   - ${m.title} (ID: ${m.id})`)
    })

    // Criar algumas aulas de exemplo
    console.log('\n🎬 Criando aulas de exemplo...')

    const lessons = [
      {
        module_id: data[0].id,
        title: 'Introdução à Mentoria',
        description: 'Primeira aula sobre conceitos básicos',
        panda_video_embed_url: 'https://player.pandavideo.com.br/embed/?v=exemplo1',
        panda_video_id: 'exemplo1',
        duration_minutes: 15,
        order_index: 1,
        is_active: true
      },
      {
        module_id: data[0].id,
        title: 'Como Aplicar os Conceitos',
        description: 'Segunda aula sobre aplicação prática',
        panda_video_embed_url: 'https://player.pandavideo.com.br/embed/?v=exemplo2',
        panda_video_id: 'exemplo2',
        duration_minutes: 20,
        order_index: 2,
        is_active: true
      },
      {
        module_id: data[1].id,
        title: 'Estudos de Caso',
        description: 'Análise de casos reais',
        panda_video_embed_url: 'https://player.pandavideo.com.br/embed/?v=exemplo3',
        panda_video_id: 'exemplo3',
        duration_minutes: 25,
        order_index: 1,
        is_active: true
      }
    ]

    const { data: lessonsData, error: lessonsError } = await supabase
      .from('video_lessons')
      .insert(lessons)
      .select()

    if (lessonsError) {
      console.error('❌ Erro ao criar aulas:', lessonsError)
      return
    }

    console.log('✅ Aulas criadas com sucesso:')
    lessonsData.forEach(l => {
      console.log(`   - ${l.title} (${l.duration_minutes}min)`)
    })

    console.log('\n🚀 PLATAFORMA PRONTA!')
    console.log('✅ Use qualquer email de mentorado para testar:')
    console.log('   - ceciliabms@teste.com')
    console.log('   - emerson@teste.com')
    console.log('   - saulosouzasilva16@gmail.com')
    console.log('\n📱 Acesse: https://cs.medicosderesultado.com.br/mentorado')

  } catch (err) {
    console.error('❌ Erro geral:', err.message)
  }
}

createVideoModules()