// VERIFICAR TODAS AS URLs DO SISTEMA
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAllUrls() {
  try {
    console.log('🔍 Verificando TODAS as URLs do sistema...\n')

    // 1. Estatísticas gerais
    const { data: allLessons } = await supabase
      .from('video_lessons')
      .select('id, title, panda_video_embed_url, panda_video_id, is_current')

    if (!allLessons) {
      console.log('❌ Não foi possível carregar as aulas')
      return
    }

    console.log(`📊 TOTAL DE AULAS: ${allLessons.length}`)

    const stats = {
      total: allLessons.length,
      comUrl: allLessons.filter(l => l.panda_video_embed_url && l.panda_video_embed_url.trim() !== '').length,
      semUrl: allLessons.filter(l => !l.panda_video_embed_url || l.panda_video_embed_url.trim() === '').length,
      comId: allLessons.filter(l => l.panda_video_id && l.panda_video_id.trim() !== '').length,
      atuais: allLessons.filter(l => l.is_current === true).length,
      arquivadas: allLessons.filter(l => l.is_current === false).length
    }

    console.log(`✅ Com URL: ${stats.comUrl}`)
    console.log(`❌ Sem URL: ${stats.semUrl}`)
    console.log(`🆔 Com panda_video_id: ${stats.comId}`)
    console.log(`📚 Atuais: ${stats.atuais}`)
    console.log(`📦 Arquivadas: ${stats.arquivadas}`)

    // 2. Mostrar algumas URLs se existirem
    const comUrl = allLessons.filter(l => l.panda_video_embed_url && l.panda_video_embed_url.trim() !== '')
    if (comUrl.length > 0) {
      console.log('\n🔗 EXEMPLOS DE URLs EXISTENTES:')
      comUrl.slice(0, 5).forEach(lesson => {
        console.log(`${lesson.title}: ${lesson.panda_video_embed_url}`)
      })
    }

    // 3. Verificar estrutura da tabela
    console.log('\n🏗️ VERIFICANDO ESTRUTURA DA TABELA...')
    const { data, error } = await supabase.rpc('get_table_info', { table_name: 'video_lessons' })
    
    // Como rpc pode não existir, vamos tentar uma query simples
    const { data: sample } = await supabase
      .from('video_lessons')
      .select('*')
      .limit(1)

    if (sample && sample.length > 0) {
      console.log('Campos disponíveis na tabela:')
      Object.keys(sample[0]).forEach(field => {
        const value = sample[0][field]
        const type = typeof value
        console.log(`  ${field}: ${type} ${value ? `(exemplo: ${String(value).substring(0, 50)}...)` : '(vazio)'}`)
      })
    }

    // 4. Verificar URLs que podem estar em outros formatos
    console.log('\n🔍 BUSCANDO URLs EM OUTROS FORMATOS:')
    const withAnyUrl = allLessons.filter(l => {
      const url = l.panda_video_embed_url || ''
      return url.includes('http') || url.includes('panda') || url.includes('player')
    })
    
    console.log(`URLs com formato suspeito: ${withAnyUrl.length}`)
    if (withAnyUrl.length > 0) {
      withAnyUrl.slice(0, 3).forEach(lesson => {
        console.log(`${lesson.title}: ${lesson.panda_video_embed_url}`)
      })
    }

  } catch (error) {
    console.error('Erro:', error)
  }
}

checkAllUrls()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erro fatal:', error)
    process.exit(1)
  })