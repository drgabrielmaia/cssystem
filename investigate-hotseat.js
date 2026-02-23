// INVESTIGAR URLs DAS AULAS DO HOTSEAT
// Script para executar as queries diretamente no banco

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function investigateHotseatUrls() {
  try {
    console.log('🔍 Investigando URLs das aulas do Hotseat...\n')

    // 1. Buscar todas as aulas do Hotseat
    console.log('📋 1. TODAS AS AULAS DO HOTSEAT:')
    const { data: allHotseat, error: error1 } = await supabase
      .from('video_lessons')
      .select('id, title, panda_video_embed_url, panda_video_id, is_current, created_at, archived_at')
      .ilike('title', '%hotseat%')
      .order('title')

    if (error1) {
      console.error('Erro:', error1)
      return
    }

    allHotseat.forEach(lesson => {
      const hasUrl = lesson.panda_video_embed_url && lesson.panda_video_embed_url.trim() !== ''
      const hasCode = hasUrl && lesson.panda_video_embed_url.includes('v=')
      const status = !hasUrl ? '❌ URL VAZIA' : !hasCode ? '⚠️ SEM CÓDIGO' : '✅ TEM CÓDIGO'
      
      console.log(`${status} - ${lesson.title}`)
      console.log(`  ID: ${lesson.id}`)
      console.log(`  URL: ${lesson.panda_video_embed_url || 'VAZIA'}`)
      console.log(`  Status: ${lesson.is_current ? 'ATUAL' : 'ARQUIVADA'}`)
      console.log('')
    })

    // 2. URLs problemáticas
    console.log('\n🚨 2. URLS PROBLEMÁTICAS:')
    const problematicas = allHotseat.filter(lesson => {
      const url = lesson.panda_video_embed_url
      return !url || url.trim() === '' || !url.includes('v=')
    })

    console.log(`Encontradas ${problematicas.length} aulas com problemas de URL`)
    problematicas.forEach(lesson => {
      console.log(`- ${lesson.title}: ${lesson.panda_video_embed_url || 'URL VAZIA'}`)
    })

    // 3. Contagem por categoria
    console.log('\n📊 3. RESUMO POR CATEGORIA:')
    const stats = {
      'URL_VAZIA': 0,
      'SEM_CODIGO': 0,
      'URL_OK': 0
    }

    allHotseat.forEach(lesson => {
      const url = lesson.panda_video_embed_url
      if (!url || url.trim() === '') {
        stats.URL_VAZIA++
      } else if (!url.includes('v=')) {
        stats.SEM_CODIGO++
      } else {
        stats.URL_OK++
      }
    })

    Object.entries(stats).forEach(([categoria, quantidade]) => {
      console.log(`${categoria}: ${quantidade} aulas`)
    })

    // 4. Verificar se existe panda_video_id
    console.log('\n🎥 4. VERIFICANDO CAMPO panda_video_id:')
    const comId = allHotseat.filter(l => l.panda_video_id && l.panda_video_id.trim() !== '')
    console.log(`Aulas com panda_video_id preenchido: ${comId.length}`)
    
    if (comId.length > 0) {
      console.log('Exemplos:')
      comId.slice(0, 3).forEach(lesson => {
        console.log(`- ${lesson.title}: ${lesson.panda_video_id}`)
      })
    }

    // 5. Exemplo de URLs funcionais (não-hotseat)
    console.log('\n✅ 5. EXEMPLO DE URL FUNCIONAL (outras aulas):')
    const { data: exemplos } = await supabase
      .from('video_lessons')
      .select('title, panda_video_embed_url')
      .not('panda_video_embed_url', 'is', null)
      .neq('panda_video_embed_url', '')
      .like('panda_video_embed_url', '%v=%')
      .not('title', 'ilike', '%hotseat%')
      .limit(3)

    if (exemplos) {
      exemplos.forEach(lesson => {
        console.log(`${lesson.title}: ${lesson.panda_video_embed_url}`)
      })
    }

  } catch (error) {
    console.error('Erro na investigação:', error)
  }
}

// Executar investigação
investigateHotseatUrls()
  .then(() => {
    console.log('\n✅ Investigação concluída!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Erro fatal:', error)
    process.exit(1)
  })