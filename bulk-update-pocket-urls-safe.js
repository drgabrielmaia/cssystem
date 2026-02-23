// BULK UPDATE URLs DO MÓDULO POCKET - APENAS AULAS SEM URL
// Script para atualizar APENAS aulas que não têm URL
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// PANDA_BASE_URL removido - agora armazenamos apenas o código

// CÓDIGOS DO PANDAVIDEO - Módulo Pocket
const POCKET_CODES = {
  "Obesidade na Prática": "9ce7fb86-d03f-4b64-acdb-77167f047f84",
  "Protocolos Medicina Funcional Integrativa": "ff1462ad-f2ee-4e33-89c5-504db4d01ae2",
  "Reposição hormonal": "538e8373-6ba1-4978-8694-8d87194bb49a",
  "Protocolos injetáveis IM": "21a75298-9726-4896-8145-00d50986d650",
  "Protocolos injetáveis IV": "8ea5a13f-6adc-4b15-aa6c-1a238962db89",
  "Protocolo Lipedema": "48e44a9b-680f-4960-96e4-4647988d4e02",
  "Fenótipos da Obesidade": "cc9680aa-e433-4689-900c-e5336920e3b8",
  "Funcional integrativa na prática": "8b9a674c-c7b5-4d0a-a4ee-9ef23d9f36e2",
  "Hormônios na Prática": "15fbe342-a9d1-47ee-b295-026ab6a09b7f",
  "Implante hormonal - Procedimento prático": "a843181e-a387-4276-8b88-3cc5ce61a86b",
  "Lipedema na prática": "31a04972-60bd-4f26-8ecf-9a61a94a78d4",
  "Intramusculares": "58092b76-e08d-48a4-9c96-460960c7c833",
  "Protocolos Injetáveis Extra - Gordura localizada": "61bd94a8-4ef0-4a7d-8c47-1f57ef71dd20",
  "Otimizando o seu tempo com IA": "623da9a5-2350-44b6-9926-c29761599838",
  "Medicina de precisão": "3831777b-2f69-4c82-92a9-2b1f935724f1",
  "Condutas Funcional Integrativa + Emagrecimento": "50247b9a-ae95-4e8c-bea2-f579c5666d53",
  "Reposição hormonal na prática": "3d7370ca-2645-478b-898e-23b66ef329ff",
  "Intramusculares na prática": "6bc7a6bc-6b8a-42d2-a770-e224b7697ea9",
  "Lipedema": "8be193a9-0de8-42b5-966a-d52a216de7da",
  "Medicina capilar": "a284ea86-dcb6-4410-ab11-b0f4fa049b5a",
  "Procedimento capilar na prática": "fc25faa0-1294-4cbb-a74f-5b8ea3ece5cb"
}

async function bulkUpdatePocketUrlsSafe() {
  try {
    console.log('🚀 Iniciando atualização SEGURA das URLs do módulo Pocket...')
    console.log('⚠️  APENAS aulas SEM URL serão atualizadas\n')

    // 1. Buscar todas as aulas que fazem match com os títulos do módulo
    const titlePatterns = Object.keys(POCKET_CODES)
    let allMatchingLessons = []

    for (const title of titlePatterns) {
      const { data: lessons } = await supabase
        .from('video_lessons')
        .select('id, title, panda_video_embed_url, is_current')
        .ilike('title', `%${title}%`)

      if (lessons && lessons.length > 0) {
        allMatchingLessons.push(...lessons)
      }
    }

    // Remover duplicatas baseado no ID
    const uniqueLessons = allMatchingLessons.filter((lesson, index, self) => 
      index === self.findIndex(l => l.id === lesson.id)
    )

    console.log(`📋 Encontradas ${uniqueLessons.length} aulas do módulo Pocket:`)
    uniqueLessons.forEach(lesson => {
      const hasUrl = lesson.panda_video_embed_url && lesson.panda_video_embed_url.includes('v=')
      const status = hasUrl ? '✅ TEM URL' : '❌ SEM URL'
      const currentStatus = lesson.is_current ? 'ATUAL' : 'ARQUIVADA'
      console.log(`${status}: ${lesson.title} (${currentStatus})`)
    })

    if (uniqueLessons.length === 0) {
      console.log('❌ Nenhuma aula encontrada para o módulo Pocket')
      return
    }

    // 2. FILTRAR APENAS AULAS SEM URL
    const lessonsWithoutUrl = uniqueLessons.filter(lesson => 
      !lesson.panda_video_embed_url || !lesson.panda_video_embed_url.includes('v=')
    )

    console.log(`\n🎯 ${lessonsWithoutUrl.length} aulas SEM URL encontradas para atualizar:`)
    lessonsWithoutUrl.forEach(lesson => {
      console.log(`❌ ${lesson.title}`)
    })

    if (lessonsWithoutUrl.length === 0) {
      console.log('✅ Todas as aulas do Pocket já possuem URLs!')
      return
    }

    // 3. Atualizar APENAS URLs vazias
    console.log(`\n🔧 Atualizando apenas aulas SEM URL...`)
    let updated = 0
    let notFound = 0
    let errors = 0

    for (const lesson of lessonsWithoutUrl) {
      try {
        // Encontrar o código correspondente
        const codeEntry = Object.entries(POCKET_CODES).find(([title, code]) => 
          lesson.title.toLowerCase().includes(title.toLowerCase()) ||
          title.toLowerCase().includes(lesson.title.toLowerCase())
        )

        if (!codeEntry) {
          console.log(`⚠️ Código não encontrado para: ${lesson.title}`)
          notFound++
          continue
        }

        const [matchedTitle, code] = codeEntry

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
          console.log(`✅ Atualizado: ${lesson.title} (código: ${matchedTitle})`)
          updated++
        }
      } catch (err) {
        console.log(`❌ Erro ao processar ${lesson.title}: ${err.message}`)
        errors++
      }
    }

    // 4. Resumo final
    console.log(`\n📊 RESULTADO DA ATUALIZAÇÃO SEGURA:`)
    console.log(`✅ Atualizadas (sem URL): ${updated}`)
    console.log(`⏭️ Preservadas (com URL): ${uniqueLessons.length - lessonsWithoutUrl.length}`)
    console.log(`⚠️ Códigos não encontrados: ${notFound}`)
    console.log(`❌ Erros: ${errors}`)

    // 5. Verificar resultado final
    console.log('\n🔍 Verificando resultado final...')
    
    // Buscar dados atualizados
    const { data: updatedLessons } = await supabase
      .from('video_lessons')
      .select('title, panda_video_embed_url, is_current')
      .in('id', uniqueLessons.map(l => l.id))
      .order('title')

    if (updatedLessons && updatedLessons.length > 0) {
      console.log('\n📦 STATUS FINAL DAS AULAS DO POCKET:')
      updatedLessons.forEach(lesson => {
        const hasUrl = lesson.panda_video_embed_url && lesson.panda_video_embed_url.includes('v=')
        const status = hasUrl ? '✅ COM URL' : '❌ SEM URL'
        const currentStatus = lesson.is_current ? 'ATUAL' : 'ARQUIVADA'
        console.log(`${status}: ${lesson.title} (${currentStatus})`)
      })

      // Estatísticas finais
      const comUrl = updatedLessons.filter(l => l.panda_video_embed_url && l.panda_video_embed_url.includes('v=')).length
      const semUrl = updatedLessons.length - comUrl
      console.log(`\n📈 ESTATÍSTICAS FINAIS:`)
      console.log(`✅ Com URL: ${comUrl}`)
      console.log(`❌ Sem URL: ${semUrl}`)
    }

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

// Verificar configuração e executar
console.log('🔍 Verificando configuração...')
const codesCount = Object.keys(POCKET_CODES).length
console.log(`✅ ${codesCount} códigos configurados`)
console.log('⚠️  MODO SEGURO: Apenas aulas SEM URL serão atualizadas')
console.log('✅ Aulas com URL existente serão PRESERVADAS\n')

bulkUpdatePocketUrlsSafe()
  .then(() => {
    console.log('\n🎉 Atualização SEGURA concluída!')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })