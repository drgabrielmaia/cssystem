#!/usr/bin/env node

/**
 * Test Lead Qualification Form V2
 * Tests the new working lead qualification API
 */

const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function testLeadQualificationV2() {
  console.log('🧪 Testing Lead Qualification Form V2...\n')

  try {
    const testData = {
      nome_completo: 'Dr. Carlos Santos (Test V2)',
      email: 'carlos.test.v2@example.com',
      telefone: '(11) 98765-4321',
      empresa: 'Clínica Moderna',
      cargo: 'Médico Ortopedista',
      temperatura: 'quente',
      nivel_interesse: 3,
      orcamento_disponivel: 12000,
      decisor_principal: true,
      dor_principal: 'Perda de pacientes para concorrência',
      preferred_datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      organization_id: '9c8c0033-15ea-4e33-a55f-28d81a19693b'
    }

    console.log('📤 Sending test lead qualification V2...')
    console.log('   Name:', testData.nome_completo)
    console.log('   Email:', testData.email)
    console.log('   Temperature:', testData.temperatura)
    console.log('   Interest:', testData.nivel_interesse)
    console.log('   Budget:', testData.orcamento_disponivel)
    console.log('   Decision maker:', testData.decisor_principal)
    console.log('   Organization:', testData.organization_id)

    const response = await fetch('http://localhost:3000/api/leads/qualification-form-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })

    const result = await response.json()

    console.log('\n📊 API Response:')
    console.log('   Status:', response.status)
    console.log('   Success:', result.success)

    if (result.success) {
      console.log('✅ Lead qualification V2 successful!')
      console.log('   Lead ID:', result.lead_id)
      
      if (result.score_result) {
        console.log('\n🎯 Scoring Results:')
        console.log('   Total Score:', result.score_result.total_score)
        console.log('   Threshold:', result.score_result.threshold)
        console.log('   Config Used:', result.score_result.config_used)
        console.log('   Score Details:')
        result.score_result.details?.forEach(detail => {
          console.log('     -', detail.field + ':', detail.score)
        })
      }

      if (result.assignment_result) {
        console.log('\n👤 Assignment Results:')
        console.log('   Success:', result.assignment_result.success)
        console.log('   Closer:', result.assignment_result.closer_name || 'None')
        console.log('   Assignment Type:', result.assignment_result.assignment_type || 'None')
        console.log('   Reason:', result.assignment_result.reason)
      }

      if (result.appointment_result) {
        console.log('\n📅 Appointment Results:')
        console.log('   Scheduled:', result.appointment_result.appointment_scheduled)
        if (result.appointment_result.appointment_scheduled) {
          console.log('   Token:', result.appointment_result.appointment_token)
          console.log('   Date:', result.appointment_result.scheduled_date)
          console.log('   🎯 Booking URL: http://localhost:3000/agenda/agendar/' + result.appointment_result.appointment_token)
        }
      }

      // Verify the created lead
      console.log('\n🔍 Verifying created lead...')
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const { data: createdLead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', result.lead_id)
        .single()

      if (leadError) {
        console.log('❌ Error fetching lead:', leadError.message)
      } else {
        console.log('✅ Lead verification:')
        console.log('   Name:', createdLead.nome_completo)
        console.log('   Email:', createdLead.email)
        console.log('   Score:', createdLead.lead_score)
        console.log('   Closer ID:', createdLead.closer_id || 'Not assigned')
        console.log('   Status:', createdLead.status)
        console.log('   Origin:', createdLead.origem)
        console.log('   Created:', new Date(createdLead.created_at).toLocaleString())
      }

    } else {
      console.log('❌ Lead qualification V2 failed:', result.error)
      if (result.details) {
        console.log('   Details:', result.details)
      }
    }

    // Test with low score lead
    console.log('\n🧪 Testing LOW SCORE lead...')
    const lowScoreData = {
      nome_completo: 'João Silva (Low Score Test)',
      email: 'joao.lowscore@example.com',
      telefone: '(11) 99999-9999',
      empresa: null,
      cargo: null,
      temperatura: 'frio',
      nivel_interesse: 1,
      orcamento_disponivel: 0,
      decisor_principal: false,
      dor_principal: null,
      organization_id: '9c8c0033-15ea-4e33-a55f-28d81a19693b'
    }

    const lowScoreResponse = await fetch('http://localhost:3000/api/leads/qualification-form-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(lowScoreData)
    })

    const lowScoreResult = await lowScoreResponse.json()

    if (lowScoreResult.success) {
      console.log('✅ Low score test successful!')
      console.log('   Score:', lowScoreResult.score_result?.total_score)
      console.log('   Assignment:', lowScoreResult.assignment_result?.assignment_type)
      console.log('   Closer:', lowScoreResult.assignment_result?.closer_name)
    } else {
      console.log('❌ Low score test failed:', lowScoreResult.error)
    }

    console.log('\n🎉 Lead Qualification V2 testing completed!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testLeadQualificationV2()