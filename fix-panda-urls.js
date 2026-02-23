// CORRIGIR URLs DO PANDAVIDEO
// Transformar códigos simples em URLs completas
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PANDA_BASE_URL = 'https://player-vz-00efd930-2fc.tv.pandavideo.com.br/embed/?v='

async function fixPandaUrls() {
  try {
    console.log('🔧 Corrigindo URLs do PandaVideo...\n')

    // 1. Buscar aulas que têm código mas URL incorreta
    const { data: lessonsWithCodes } = await supabase
      .from('video_lessons')
      .select('id, title, panda_video_embed_url, is_current')
      .not('panda_video_embed_url', 'is', null)
      .neq('panda_video_embed_url', '')

    console.log(`📋 Encontradas ${lessonsWithCodes?.length || 0} aulas com códigos`)

    if (!lessonsWithCodes || lessonsWithCodes.length === 0) {
      console.log('❌ Nenhuma aula com código encontrada')
      return
    }

    // 2. Identificar quais precisam de correção
    const needsFix = lessonsWithCodes.filter(lesson => {
      const url = lesson.panda_video_embed_url
      // Se não contém 'https://' é provavelmente só o código
      return !url.includes('https://')
    })

    console.log(`🔨 ${needsFix.length} aulas precisam de correção:`)
    needsFix.forEach(lesson => {
      console.log(`  ${lesson.title}: ${lesson.panda_video_embed_url}`)
    })

    // 3. Corrigir URLs
    console.log('\n🚀 Iniciando correção...')
    let corrected = 0
    let errors = 0

    for (const lesson of needsFix) {
      try {
        // Este script já converte códigos em URLs, mantém a lógica original
        const code = lesson.panda_video_embed_url.trim()
        const fullUrl = PANDA_BASE_URL + code

        const { error } = await supabase
          .from('video_lessons')
          .update({ panda_video_embed_url: fullUrl })
          .eq('id', lesson.id)

        if (error) {
          console.log(`❌ Erro ao corrigir ${lesson.title}: ${error.message}`)
          errors++
        } else {
          console.log(`✅ Corrigido: ${lesson.title}`)
          corrected++
        }
      } catch (err) {
        console.log(`❌ Erro ao processar ${lesson.title}: ${err.message}`)
        errors++
      }
    }

    console.log(`\n📊 RESULTADO:`)
    console.log(`✅ Corrigidas: ${corrected}`)
    console.log(`❌ Erros: ${errors}`)

    // 4. Verificar resultado
    console.log('\n🔍 Verificando resultado...')
    const { data: updated } = await supabase
      .from('video_lessons')
      .select('title, panda_video_embed_url')
      .like('panda_video_embed_url', 'https://player-vz%')
      .limit(5)

    if (updated && updated.length > 0) {
      console.log('✅ URLs corrigidas:')
      updated.forEach(lesson => {
        console.log(`  ${lesson.title}: ${lesson.panda_video_embed_url.substring(0, 60)}...`)
      })
    }

    // 5. Status das aulas do Hotseat após correção
    console.log('\n📦 STATUS DAS AULAS DO HOTSEAT:')
    const { data: hotseat } = await supabase
      .from('video_lessons')
      .select('title, panda_video_embed_url')
      .ilike('title', '%hotseat%')
      .order('title')

    if (hotseat) {
      hotseat.forEach(lesson => {
        const hasUrl = lesson.panda_video_embed_url && lesson.panda_video_embed_url.includes('https://')
        const status = hasUrl ? '✅ CORRIGIDA' : '❌ AINDA SEM URL'
        console.log(`  ${status}: ${lesson.title}`)
      })
    }

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

fixPandaUrls()
  .then(() => {
    console.log('\n🎉 Correção concluída!')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })