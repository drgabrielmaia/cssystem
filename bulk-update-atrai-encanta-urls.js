// BULK UPDATE URLs DAS AULAS DO MÓDULO ATRAI & ENCANTA
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// PANDA_BASE_URL removido - agora armazenamos apenas o código

// CÓDIGOS DO PANDAVIDEO - Módulo Atrai & Encanta
const ATRAI_ENCANTA_CODES = {
  "Gestão de Alta Performance": "41e6783b-546f-48b0-acb1-025d42c19e11",
  "IA e ferramentas de Gestão": "d163c603-6e2c-47a1-ab8d-cc6ed9877a20",
  "Encantamento Disney": "57dc2880-d400-406f-8112-5769cc777887",
  "jornada do paciente": "4f6d3fb3-37db-491b-9140-112cb50f1bbf",
  "Criação de Processos": "ee49f321-4428-458b-bcca-7aec4bdb857a",
  "Formação de Equipe": "1d80f8c2-395d-42f5-88a1-75ac258a0038",
  "Modelo Disney": "c02c2226-a68c-4549-991c-76e9064e1b07",
  "Alta Performance na gestão": "29a87d52-4b70-4e1e-9b71-c3e3f43c6f3e",
  "Usando a IA na gestão": "bda7939f-742c-4ad4-b682-3c336f08612d",
  "SWOT e 5W2H": "98144ff5-780e-42af-9e22-c47a3f7822e4",
  "Como pagar prestadores de serviços": "3ea602bb-f212-4ea5-917e-cc727bffc9f5",
  "Processos": "fc0258f9-2910-4ada-9140-2cbb6a25da0f",
  "Modelo de encantamento Disney": "8b0fc36a-d168-4fd7-9e0b-7c1e9543faf1",
  "Como estruturar processos": "90bc0431-d9f9-40ad-a771-8649714f4e2f",
  "Prompts para IA na gestão": "e01d3cd5-fc31-4235-9c73-11b4cce40260",
  "5W2H & SWOT": "b53c07c9-a509-4c1c-8490-4c11e08f697d"
}

async function bulkUpdateAtraiEncantaUrls() {
  try {
    console.log('🚀 Iniciando atualização das URLs do módulo Atrai & Encanta...\n')

    // 1. Buscar todas as aulas que fazem match com os títulos do módulo
    const titlePatterns = Object.keys(ATRAI_ENCANTA_CODES)
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

    console.log(`📋 Encontradas ${uniqueLessons.length} aulas do módulo Atrai & Encanta:`)
    uniqueLessons.forEach(lesson => {
      const hasUrl = lesson.panda_video_embed_url && lesson.panda_video_embed_url.includes('v=')
      const status = hasUrl ? '✅' : '❌'
      const currentStatus = lesson.is_current ? 'ATUAL' : 'ARQUIVADA'
      console.log(`${status} ${lesson.title} (${currentStatus})`)
    })

    if (uniqueLessons.length === 0) {
      console.log('❌ Nenhuma aula encontrada para o módulo Atrai & Encanta')
      return
    }

    // 2. Atualizar URLs
    console.log(`\n🔧 Preparando para atualizar URLs...`)
    let updated = 0
    let notFound = 0
    let errors = 0
    let skipped = 0

    for (const lesson of uniqueLessons) {
      try {
        // Encontrar o código correspondente
        const codeEntry = Object.entries(ATRAI_ENCANTA_CODES).find(([title, code]) => 
          lesson.title.toLowerCase().includes(title.toLowerCase()) ||
          title.toLowerCase().includes(lesson.title.toLowerCase())
        )

        if (!codeEntry) {
          console.log(`⚠️ Código não encontrado para: ${lesson.title}`)
          notFound++
          continue
        }

        const [matchedTitle, code] = codeEntry

        // Verificar se já tem URL
        if (lesson.panda_video_embed_url && lesson.panda_video_embed_url.includes('v=')) {
          console.log(`⏭️ Já tem URL: ${lesson.title}`)
          skipped++
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
          console.log(`✅ Atualizado: ${lesson.title} (código: ${matchedTitle})`)
          updated++
        }
      } catch (err) {
        console.log(`❌ Erro ao processar ${lesson.title}: ${err.message}`)
        errors++
      }
    }

    // 3. Resumo final
    console.log(`\n📊 RESULTADO DA ATUALIZAÇÃO:`)
    console.log(`✅ Atualizadas: ${updated}`)
    console.log(`⏭️ Já tinham URL: ${skipped}`)
    console.log(`⚠️ Códigos não encontrados: ${notFound}`)
    console.log(`❌ Erros: ${errors}`)

    // 4. Verificar resultado final
    console.log('\n🔍 Verificando resultado final...')
    
    // Buscar dados atualizados
    const { data: updatedLessons } = await supabase
      .from('video_lessons')
      .select('title, panda_video_embed_url, is_current')
      .in('id', uniqueLessons.map(l => l.id))
      .order('title')

    if (updatedLessons && updatedLessons.length > 0) {
      console.log('\n📦 STATUS FINAL DAS AULAS DO ATRAI & ENCANTA:')
      updatedLessons.forEach(lesson => {
        const hasUrl = lesson.panda_video_embed_url && lesson.panda_video_embed_url.includes('v=')
        const status = hasUrl ? '✅ COM URL' : '❌ SEM URL'
        const currentStatus = lesson.is_current ? 'ATUAL' : 'ARQUIVADA'
        console.log(`${status}: ${lesson.title} (${currentStatus})`)
      })
    }

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

// Verificar configuração e executar
console.log('🔍 Verificando configuração...')
const codesCount = Object.keys(ATRAI_ENCANTA_CODES).length
console.log(`✅ ${codesCount} códigos configurados. Iniciando atualização...\n`)

bulkUpdateAtraiEncantaUrls()
  .then(() => {
    console.log('\n🎉 Atualização concluída!')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })