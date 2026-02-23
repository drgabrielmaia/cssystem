// BULK UPDATE URLs DAS AULAS DE MÉDICOS QUE VENDEM
// Script para atualizar URLs das aulas arquivadas de médicos que vendem
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// PANDA_BASE_URL removido - agora armazenamos apenas o código

// CÓDIGOS DO PANDAVIDEO - Mapeamento de título da aula para código do PandaVideo
const MEDICOS_CODES = {
  "Venda consultiva": "2547e4ff-d4d5-4b09-87e5-4a1b76f3eae3",
  "Script de venda": "b428cccd-170c-47f8-9c57-95d23a3341f3",
  "Protocolos de alto valor": "2485f208-fb24-4430-a3f3-81de20953fa0",
  "Analisando protocolos de alto Valor I": "34e3fb69-264a-470c-809c-85574467ea6f",
  "Scripts de Whatsapp": "c6c3cc69-59c0-4c93-92c1-924a3924807d",
  "Venda Consultiva II": "18c76310-9f8f-4edf-b058-9cee1eb3b208",
  "Montando protocolos de alto valor": "bfc2bd50-ea5e-4709-8037-61b25850b402",
  "SPIN Selling": "1bad9ca5-4062-4ebd-ac21-69dc3065f17c",
  "Gatilhos Mentais": "765b035b-2ef6-4f4b-b6cc-fc4aee8b7150",
  "Objeções": "bc0f0221-6b40-4e39-a5cd-17f9b1d08d18",
  "Crenças limitantes I": "44af3fc6-a4e5-4a2f-a1b5-77244678c2e1",
  "Como fazer dinheiro rápido": "8870578c-05c4-4d7b-8ccc-ded59f3c7c91",
  "Financiamento de Tratamento e alavancagem patrimonial": "fd14b3bf-ccf7-4db2-aacb-aa47debe6537",
  "CRM - Extraindo o máximo do seu tráfego": "989aab8c-d4b5-4d04-b448-0b514b5d9126",
  "Montando protocolos de alto valor": "d57e16cf-85cf-4b63-96cf-491cb39b9769",
  "Crenças limitantes II": "0ef40cd7-48cf-42e0-adf9-fc6b4ba178be",
  "Montando na prática protocolos de alto valor": "e8aeca40-9f92-44b7-a29c-2690c4ba739b",
  "SPIN selling II": "85e64359-9ac0-431e-9980-c3db33ecd103",
  "Venda Consultiva II": "0f148198-c332-4a86-98a6-a54b3d1c178e",
  "Objeções II": "87332005-2973-49fc-b127-031ba6a39107",
  "Gatilhos Mentais II": "89588001-ae3e-4d2a-bf79-93684d6d5248",
  "Estratégias de negociação": "83d45c91-fb2d-41df-bfab-cccd5bd65725"
}

async function bulkUpdateMedicosUrls() {
  try {
    console.log('🚀 Iniciando atualização em massa das URLs de Médicos que Vendem...\n')

    // 1. Buscar todas as aulas arquivadas (que devem incluir as de médicos que vendem)
    const { data: medicosLessons, error } = await supabase
      .from('video_lessons')
      .select('id, title, panda_video_embed_url, is_current')
      .eq('is_current', false) // arquivadas
      .order('title')

    if (error) {
      console.error('❌ Erro ao buscar aulas:', error)
      return
    }

    if (!medicosLessons || medicosLessons.length === 0) {
      console.log('❌ Nenhuma aula arquivada encontrada')
      return
    }

    console.log(`📋 Encontradas ${medicosLessons.length} aulas arquivadas`)

    // 2. Filtrar apenas as que fazem match com os códigos fornecidos
    const lessonsToUpdate = medicosLessons.filter(lesson => {
      return Object.keys(MEDICOS_CODES).some(title => 
        lesson.title.toLowerCase().includes(title.toLowerCase()) ||
        title.toLowerCase().includes(lesson.title.toLowerCase())
      )
    })

    console.log(`🎯 ${lessonsToUpdate.length} aulas de Médicos que Vendem encontradas:`)
    lessonsToUpdate.forEach(lesson => {
      const hasUrl = lesson.panda_video_embed_url && lesson.panda_video_embed_url.includes('v=')
      const status = hasUrl ? '✅' : '❌'
      console.log(`${status} ${lesson.title}`)
    })

    // 3. Atualizar URLs
    console.log(`\n🔧 Preparando para atualizar URLs...`)
    let updated = 0
    let notFound = 0
    let errors = 0
    let skipped = 0

    for (const lesson of lessonsToUpdate) {
      try {
        // Encontrar o código correspondente
        const codeEntry = Object.entries(MEDICOS_CODES).find(([title, code]) => 
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

    // 4. Resumo final
    console.log(`\n📊 RESULTADO DA ATUALIZAÇÃO:`)
    console.log(`✅ Atualizadas: ${updated}`)
    console.log(`⏭️ Já tinham URL: ${skipped}`)
    console.log(`⚠️ Códigos não encontrados: ${notFound}`)
    console.log(`❌ Erros: ${errors}`)

    // 5. Verificar resultado final
    console.log('\n🔍 Verificando resultado final...')
    const finalLessons = medicosLessons.filter(lesson => 
      Object.keys(MEDICOS_CODES).some(title => 
        lesson.title.toLowerCase().includes(title.toLowerCase()) ||
        title.toLowerCase().includes(lesson.title.toLowerCase())
      )
    )

    if (finalLessons.length > 0) {
      console.log('\n📦 STATUS FINAL DAS AULAS DE MÉDICOS QUE VENDEM:')
      
      // Buscar dados atualizados
      const { data: updatedLessons } = await supabase
        .from('video_lessons')
        .select('title, panda_video_embed_url')
        .in('id', finalLessons.map(l => l.id))
        .order('title')

      if (updatedLessons) {
        updatedLessons.forEach(lesson => {
          const hasUrl = lesson.panda_video_embed_url && lesson.panda_video_embed_url.includes('v=')
          const status = hasUrl ? '✅ COM URL' : '❌ SEM URL'
          console.log(`${status}: ${lesson.title}`)
        })
      }
    }

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

// Verificar configuração e executar
console.log('🔍 Verificando configuração...')
const codesCount = Object.keys(MEDICOS_CODES).length
console.log(`✅ ${codesCount} códigos configurados. Iniciando atualização...\n`)

bulkUpdateMedicosUrls()
  .then(() => {
    console.log('\n🎉 Atualização concluída!')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })