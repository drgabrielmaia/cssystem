// BULK UPDATE URLs DAS AULAS DO MÓDULO DIGITAL/BRANDING
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// PANDA_BASE_URL removido - agora armazenamos apenas o código

// CÓDIGOS DO PANDAVIDEO - Módulo Digital/Branding/Posicionamento
const DIGITAL_BRANDING_CODES = {
  "Consultoria de imagem e estilo": "308b1466-637a-4488-9c1b-005e0e989f2e",
  "Construindo o seu branding": "5c969968-93cd-4e67-8e6f-114b3c1efa17",
  "Posicionamento Digital": "44168dd9-60d4-48a1-991f-c2be1f677e68",
  "Estratégias Digitais I": "9a838b4c-9e03-44f9-a94c-96a1ca1bc9dd",
  "Estratégias Digitais II": "e86dabd4-6197-47b8-af4a-d26d2f63c10d",
  "Otimize o seu tempo e $ com IA": "08e2fb81-ade5-4cca-87fd-0dd05f8d1769",
  "Criando a sua marca pessoal": "47205b12-003f-46bc-8d47-3961b696c717",
  "Oratória no digital": "58e119c3-d99f-4de7-a271-25de8f0f8bf9",
  "Montando um instagram estratégico e intencional": "ba146035-450c-48c8-9c2e-05d97b46f58b",
  "Posicionamento Digital Estratégico": "ee27181d-0b54-4b22-ad13-fffd0fa32507",
  "Montando o seu Funil de conteúdo": "f69fe2d8-5f9d-439f-b0aa-f9209f1a9c9d",
  "Posicionamento digital pt.1": "b14be558-39a2-4148-8d11-11369dca4e59",
  "Posicionamento digital pt.2": "1f3bd9bd-a920-4f7e-8010-7bd0ce8c6753",
  "Tiktok": "c7630e19-94df-4ef6-8bc2-5e2ac34590d0",
  "Análise de perfil": "6e891a3f-c85a-4050-bbef-61ff9950bd5c",
  "Youtube": "fa318322-1e67-4849-95c0-75e1913117d6",
  "Oratória pro digital": "3aba6cf9-9beb-47d2-808c-9cb96f3c1aa5",
  "Funil de conteúdo I": "4b7f8e4b-280e-4839-a076-352253b7053b",
  "Funil de conteúdo II": "96836f99-5599-450e-b095-d9a0e1f662e3",
  "Funil de manychat": "2c7a327a-bb50-4276-988d-4e66a7b1fb49"
}

async function bulkUpdateDigitalBrandingUrls() {
  try {
    console.log('🚀 Iniciando atualização das URLs do módulo Digital/Branding...\n')

    // 1. Buscar todas as aulas que fazem match com os títulos do módulo
    const titlePatterns = Object.keys(DIGITAL_BRANDING_CODES)
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

    console.log(`📋 Encontradas ${uniqueLessons.length} aulas do módulo Digital/Branding:`)
    uniqueLessons.forEach(lesson => {
      const hasUrl = lesson.panda_video_embed_url && lesson.panda_video_embed_url.includes('v=')
      const status = hasUrl ? '✅' : '❌'
      const currentStatus = lesson.is_current ? 'ATUAL' : 'ARQUIVADA'
      console.log(`${status} ${lesson.title} (${currentStatus})`)
    })

    if (uniqueLessons.length === 0) {
      console.log('❌ Nenhuma aula encontrada para o módulo Digital/Branding')
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
        const codeEntry = Object.entries(DIGITAL_BRANDING_CODES).find(([title, code]) => 
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
      console.log('\n📦 STATUS FINAL DAS AULAS DO DIGITAL/BRANDING:')
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
const codesCount = Object.keys(DIGITAL_BRANDING_CODES).length
console.log(`✅ ${codesCount} códigos configurados. Iniciando atualização...\n`)

bulkUpdateDigitalBrandingUrls()
  .then(() => {
    console.log('\n🎉 Atualização concluída!')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })