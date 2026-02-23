// BULK UPDATE HOTSEAT URLs
// Script para atualizar URLs das aulas do Hotseat em massa
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// PANDA_BASE_URL removido - agora armazenamos apenas o código

// CÓDIGOS DO PANDAVIDEO - Mapeamento de título da aula para código do PandaVideo
const HOTSEAT_CODES = {
  "Hotseat 01": "e485f07e-975f-468c-87c3-74610d20a8f5",
  "Hotseat 02": "9ab3f106-0d75-483b-919e-ba3bffded3d2",
  "Hotseat 03": "797d06fe-ceca-4ec5-af02-d4889f351b96",
  "Hotseat 04 - Protocolos I": "a2bb52bb-a2a4-4851-8769-566dd461feb5",
  "Hotseat 05 - Protocolos II": "a0ab5cfd-af72-45a2-83f4-c504f773f378",
  "Hotseat 06 - Avaliando Funis": "c91a5b66-a44a-4486-8ae6-8dd2063e726a",
  "Hotseat 07- Avaliando Protocolos": "b0ff9a22-2ac4-4fc3-af34-2c1777eeb570",
  "Hotseat 08 - Montagem de Protocolos": "a3ceb2a6-cee2-40d6-9c2a-96deb36c106d",
  "Hotseat 09 - Marcos Strider": "1b30d985-d7a0-468b-b73b-655d31eee24f",
  "Hotseat 10 - Direito médico": "945879e5-88b1-446a-895d-d3281f6a9bdb",
  "Hotseat 11 - Tráfego pago 1": "a69507b8-f9b2-437d-94fb-3a41e52e845b",
  "Hotseat 12 - Tráfego pago 2": "eb1f8df4-f013-450b-84ae-5aa8da0a95cf",
  "Hotseat 13 - Avaliando protocolos": "b9c3afaf-71a1-4db8-b9e5-8078276849e2"
}

async function bulkUpdateHotseatUrls() {
  try {
    console.log('🚀 Iniciando atualização em massa das URLs do Hotseat...\n')

    // 1. Buscar todas as aulas do Hotseat
    const { data: hotseatLessons, error } = await supabase
      .from('video_lessons')
      .select('id, title, panda_video_embed_url')
      .ilike('title', '%hotseat%')
      .order('title')

    if (error) {
      console.error('❌ Erro ao buscar aulas:', error)
      return
    }

    if (!hotseatLessons || hotseatLessons.length === 0) {
      console.log('❌ Nenhuma aula do Hotseat encontrada')
      return
    }

    console.log(`📋 Encontradas ${hotseatLessons.length} aulas do Hotseat:`)
    hotseatLessons.forEach(lesson => {
      const hasUrl = lesson.panda_video_embed_url && lesson.panda_video_embed_url.includes('v=')
      const status = hasUrl ? '✅' : '❌'
      console.log(`${status} ${lesson.title}`)
    })

    // 2. Verificar se há códigos para atualizar
    const codesCount = Object.keys(HOTSEAT_CODES).length
    if (codesCount === 0) {
      console.log('\n⚠️ Nenhum código foi adicionado ao script!')
      console.log('📝 Edite o arquivo e adicione os códigos no objeto HOTSEAT_CODES')
      return
    }

    console.log(`\n🔧 Preparando para atualizar ${codesCount} URLs...`)

    // 3. Atualizar URLs
    let updated = 0
    let notFound = 0
    let errors = 0

    for (const [lessonTitle, code] of Object.entries(HOTSEAT_CODES)) {
      try {
        // Encontrar a aula pelo título
        const lesson = hotseatLessons.find(l => 
          l.title.toLowerCase().includes(lessonTitle.toLowerCase()) ||
          lessonTitle.toLowerCase().includes(l.title.toLowerCase())
        )

        if (!lesson) {
          console.log(`⚠️ Aula não encontrada: ${lessonTitle}`)
          notFound++
          continue
        }

        // Atualizar apenas com o código (não a URL completa)
        const cleanCode = code.trim()
        const { error: updateError } = await supabase
          .from('video_lessons')
          .update({ panda_video_embed_url: cleanCode })
          .eq('id', lesson.id)

        if (updateError) {
          console.log(`❌ Erro ao atualizar ${lesson.title}: ${updateError.message}`)
          errors++
        } else {
          console.log(`✅ Atualizado: ${lesson.title}`)
          updated++
        }
      } catch (err) {
        console.log(`❌ Erro ao processar ${lessonTitle}: ${err.message}`)
        errors++
      }
    }

    // 4. Resumo final
    console.log(`\n📊 RESULTADO DA ATUALIZAÇÃO:`)
    console.log(`✅ Atualizadas: ${updated}`)
    console.log(`⚠️ Não encontradas: ${notFound}`)
    console.log(`❌ Erros: ${errors}`)

    // 5. Verificar resultado
    console.log('\n🔍 Verificando resultado final...')
    const { data: finalCheck } = await supabase
      .from('video_lessons')
      .select('title, panda_video_embed_url')
      .ilike('title', '%hotseat%')
      .order('title')

    if (finalCheck) {
      console.log('\n📦 STATUS FINAL DAS AULAS DO HOTSEAT:')
      finalCheck.forEach(lesson => {
        const hasUrl = lesson.panda_video_embed_url && lesson.panda_video_embed_url.includes('v=')
        const status = hasUrl ? '✅ COM URL' : '❌ SEM URL'
        console.log(`${status}: ${lesson.title}`)
      })
    }

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

// Verificar se há códigos antes de executar
console.log('🔍 Verificando configuração...')
const codesCount = Object.keys(HOTSEAT_CODES).length

if (codesCount === 0) {
  console.log('⚠️ ATENÇÃO: Nenhum código configurado!')
  console.log('📝 Edite este arquivo e adicione os códigos do PandaVideo no objeto HOTSEAT_CODES')
  console.log('💡 Exemplo:')
  console.log('const HOTSEAT_CODES = {')
  console.log('  "Hotseat 1": "66216ac3-377b-40b9-b5ca-56c212055fbd",')
  console.log('  "Hotseat 2": "77327bd4-488c-51a0-c6db-67d323066gfe",')
  console.log('}')
  process.exit(0)
}

console.log(`✅ ${codesCount} códigos configurados. Iniciando atualização...\n`)

bulkUpdateHotseatUrls()
  .then(() => {
    console.log('\n🎉 Atualização concluída!')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })