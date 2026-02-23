// ENCONTRAR URLS FUNCIONAIS PARA USAR COMO REFERÊNCIA
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function findWorkingUrls() {
  try {
    console.log('🔍 Buscando URLs funcionais...\n')

    // 1. Buscar URLs funcionais
    const { data: workingLessons } = await supabase
      .from('video_lessons')
      .select('title, panda_video_embed_url, panda_video_id')
      .not('panda_video_embed_url', 'is', null)
      .neq('panda_video_embed_url', '')
      .like('panda_video_embed_url', '%v=%')
      .limit(10)

    console.log('✅ URLs FUNCIONAIS ENCONTRADAS:')
    if (workingLessons && workingLessons.length > 0) {
      workingLessons.forEach(lesson => {
        const code = lesson.panda_video_embed_url.match(/v=([^&]*)/)?.[1] || 'SEM_CODIGO'
        console.log(`${lesson.title}: ${code}`)
        console.log(`  URL completa: ${lesson.panda_video_embed_url}`)
        console.log('')
      })
    } else {
      console.log('❌ Nenhuma URL funcional encontrada!')
    }

    // 2. Verificar padrão das URLs
    console.log('\n🔗 PADRÃO DAS URLS:')
    if (workingLessons && workingLessons.length > 0) {
      const exemplo = workingLessons[0].panda_video_embed_url
      const baseUrl = exemplo.split('v=')[0] + 'v='
      console.log(`Base URL: ${baseUrl}`)
      console.log(`Padrão: ${baseUrl}[CODIGO_DA_AULA]`)
    }

    // 3. Buscar todas as organizações para entender estrutura
    const { data: modules } = await supabase
      .from('video_modules')
      .select('title, organization_id')
      .limit(5)

    console.log('\n🏢 ORGANIZAÇÕES:')
    if (modules) {
      const orgs = [...new Set(modules.map(m => m.organization_id))]
      console.log(`Organizações encontradas: ${orgs.join(', ')}`)
    }

  } catch (error) {
    console.error('Erro:', error)
  }
}

findWorkingUrls()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erro fatal:', error)
    process.exit(1)
  })