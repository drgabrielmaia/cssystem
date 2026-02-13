#!/usr/bin/env node

/**
 * Test Lead Qualification Form with Scoring
 * Tests the existing lead qualification form functionality
 */

const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function testLeadQualification() {
  console.log('🧪 Testing Lead Qualification Form with Scoring...\n')

  try {
    // Test the lead qualification API endpoint
    const testData = {
      nome_completo: 'Dr. João Silva (Test)',
      email: 'dr.joao.test@example.com',
      telefone: '(11) 98765-4321',
      empresa: 'Clínica São Paulo',
      cargo: 'Médico Cardiologista',
      temperatura: 'quente',
      nivel_interesse: 3, // Convert to integer: baixo=1, medio=2, alto=3
      orcamento_disponivel: 5000,
      decisor_principal: true,
      dor_principal: 'Dificuldade em captar pacientes novos',
      preferred_datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      organization_id: '00000000-0000-0000-0000-000000000001'
    }

    console.log('📤 Sending test lead qualification...')
    console.log('   Name:', testData.nome_completo)
    console.log('   Email:', testData.email)
    console.log('   Temperature:', testData.temperatura)
    console.log('   Interest:', testData.nivel_interesse)
    console.log('   Budget:', testData.orcamento_disponivel)
    console.log('   Decision maker:', testData.decisor_principal)

    const response = await fetch('http://localhost:3000/api/leads/qualification-form', {
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
      console.log('✅ Lead qualification successful!')
      
      if (result.score_result) {
        console.log('\n🎯 Scoring Results:')
        console.log('   Total Score:', result.score_result.total_score)
        console.log('   Scoring Details:', JSON.stringify(result.score_result.details, null, 2))
        console.log('   Config Used:', result.score_result.config_used)
        console.log('   Threshold:', result.score_result.threshold)
      }

      if (result.assignment_result) {
        console.log('\n👤 Assignment Results:')
        console.log('   Closer Assigned:', result.assignment_result.closer_id || 'None')
        console.log('   Assignment Type:', result.assignment_result.assignment_type)
        console.log('   Reason:', result.assignment_result.reason)
      }

      if (result.appointment_result) {
        console.log('\n📅 Appointment Results:')
        console.log('   Scheduled:', result.appointment_result.appointment_scheduled)
        if (result.appointment_result.appointment_scheduled) {
          console.log('   Date:', result.appointment_result.scheduled_date)
          console.log('   Token:', result.appointment_result.appointment_token)
        }
      }

      if (result.lead_id) {
        console.log('\n🔍 Verifying created lead...')
        
        // Wait a bit for processing
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const { data: createdLead, error: leadError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', result.lead_id)
          .single()

        if (leadError) {
          console.log('❌ Error fetching created lead:', leadError.message)
        } else {
          console.log('✅ Lead created successfully:')
          console.log('   Lead ID:', createdLead.id)
          console.log('   Status:', createdLead.status)
          console.log('   Score:', createdLead.lead_score)
          console.log('   Closer:', createdLead.closer_id || 'Not assigned')
          console.log('   Created:', new Date(createdLead.created_at).toLocaleString())
          
          if (createdLead.lead_score_detalhado) {
            console.log('   Score Details:', JSON.stringify(createdLead.lead_score_detalhado, null, 2))
          }
        }
      }
    } else {
      console.log('❌ Lead qualification failed:', result.error)
      if (result.details) {
        console.log('   Details:', result.details)
      }
    }

    // Test scoring configurations
    console.log('\n🎯 Testing scoring configurations...')
    const { data: configs, error: configError } = await supabase
      .from('scoring_configurations')
      .select('*')
      .eq('organization_id', '00000000-0000-0000-0000-000000000001')
      .eq('is_active', true)

    if (configError) {
      console.log('❌ Error fetching scoring configs:', configError.message)
    } else if (configs.length > 0) {
      const config = configs[0]
      console.log('✅ Active scoring configuration found:')
      console.log('   Name:', config.name)
      console.log('   Threshold:', config.low_score_threshold)
      console.log('   Expected Score Calculation:')
      
      let expectedScore = 0
      expectedScore += config.telefone_score // Phone provided
      expectedScore += config.email_score // Email provided
      expectedScore += config.empresa_score // Company provided
      expectedScore += config.cargo_score // Job title provided
      expectedScore += config.temperatura_quente_score // Hot temperature
      expectedScore += config.nivel_interesse_alto_score // High interest
      expectedScore += config.orcamento_disponivel_score // Budget available
      expectedScore += config.decisor_principal_score // Decision maker
      expectedScore += config.dor_principal_score // Pain point provided
      
      console.log('   Expected Total:', expectedScore)
      console.log('   Assignment Type:', expectedScore >= config.low_score_threshold ? 'High Score' : 'Low Score')
    } else {
      console.log('⚠️  No active scoring configuration found')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testLeadQualification()