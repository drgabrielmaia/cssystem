// FIX BONUS MODULE LESSON - Aprenda tráfego pago do zero
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PANDA_BASE_URL = 'https://player-vz-00efd930-2fc.tv.pandavideo.com.br/embed/?v='
const TRAFEGO_CODE = 'c6c3cc69-59c0-4c93-92c1-924a3924807d'

async function fixBonusTrafegoUrl() {
  try {
    console.log('🚀 Corrigindo URL da aula "Aprenda tráfego pago do zero"...\n')

    // 1. Buscar a aula específica
    const { data: lesson, error } = await supabase
      .from('video_lessons')
      .select('id, title, panda_video_embed_url, is_current')
      .ilike('title', '%aprenda tráfego pago do zero%')
      .single()

    if (error) {
      console.error('❌ Erro ao buscar aula:', error)
      return
    }

    if (!lesson) {
      console.log('❌ Aula "Aprenda tráfego pago do zero" não encontrada')
      return
    }

    console.log(`📋 Aula encontrada: ${lesson.title}`)
    console.log(`ID: ${lesson.id}`)
    console.log(`Status: ${lesson.is_current ? 'ATUAL' : 'ARQUIVADA'}`)
    console.log(`URL atual: ${lesson.panda_video_embed_url || 'VAZIA'}`)

    // 2. Verificar se já tem URL
    if (lesson.panda_video_embed_url && lesson.panda_video_embed_url.includes('v=')) {
      console.log('⚠️ Aula já possui URL. Deseja substituir? Continuando...')
    }

    // 3. Atualizar URL
    const fullUrl = PANDA_BASE_URL + TRAFEGO_CODE
    console.log(`\n🔧 Atualizando para: ${fullUrl}`)

    const { error: updateError } = await supabase
      .from('video_lessons')
      .update({ panda_video_embed_url: fullUrl })
      .eq('id', lesson.id)

    if (updateError) {
      console.error('❌ Erro ao atualizar URL:', updateError)
      return
    }

    console.log('✅ URL atualizada com sucesso!')

    // 4. Verificar resultado
    const { data: updatedLesson } = await supabase
      .from('video_lessons')
      .select('title, panda_video_embed_url')
      .eq('id', lesson.id)
      .single()

    if (updatedLesson) {
      console.log('\n🔍 VERIFICAÇÃO FINAL:')
      console.log(`Título: ${updatedLesson.title}`)
      console.log(`URL: ${updatedLesson.panda_video_embed_url}`)
      console.log('✅ Aula do módulo bônus corrigida!')
    }

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

fixBonusTrafegoUrl()
  .then(() => {
    console.log('\n🎉 Correção concluída!')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })