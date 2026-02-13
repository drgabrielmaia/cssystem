#!/usr/bin/env node

/**
 * Test scoring system directly without the broken function
 */

const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function testScoringDirect() {
  console.log('🎯 Testing scoring system directly...\n')

  try {
    // 1. Check scoring configurations
    console.log('📋 Checking scoring configurations...')
    const { data: configs, error: configError } = await supabase
      .from('scoring_configurations')
      .select('*')
      .eq('is_active', true)

    if (configError) {
      console.log('❌ Error fetching configs:', configError.message)
      return
    }

    if (!configs || configs.length === 0) {
      console.log('⚠️  No active scoring configurations found')
      
      // Create a default config
      console.log('🔧 Creating default scoring configuration...')
      const defaultConfig = {
        name: 'Configuração Padrão',
        organization_id: '00000000-0000-0000-0000-000000000001',
        is_active: true,
        telefone_score: 10,
        email_score: 10,
        empresa_score: 15,
        cargo_score: 10,
        temperatura_quente_score: 20,
        temperatura_morno_score: 10,
        temperatura_frio_score: 0,
        nivel_interesse_alto_score: 15,
        nivel_interesse_medio_score: 10,
        nivel_interesse_baixo_score: 5,
        orcamento_disponivel_score: 10,
        decisor_principal_score: 10,
        dor_principal_score: 10,
        low_score_threshold: 60,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: newConfig, error: createError } = await supabase
        .from('scoring_configurations')
        .insert([defaultConfig])
        .select()
        .single()

      if (createError) {
        console.log('❌ Error creating config:', createError.message)
        return
      }

      console.log('✅ Default configuration created:', newConfig.name)
      configs.push(newConfig)
    } else {
      console.log('✅ Found', configs.length, 'active configurations')
      configs.forEach(config => {
        console.log('  -', config.name, '(threshold:', config.low_score_threshold + ')')
      })
    }

    // 2. Create a test lead manually
    console.log('\n📝 Creating test lead manually...')
    const testLead = {
      nome_completo: 'Dr. Maria Silva (Test Direct)',
      email: 'maria.test@example.com',
      telefone: '(11) 99887-7654',
      empresa: 'Clínica Test',
      cargo: 'Médica',
      temperatura: 'quente',
      nivel_interesse: '3', // Store as text to match current schema
      orcamento_disponivel: 8000,
      decisor_principal: true,
      dor_principal: 'Dificuldade em organizar agenda',
      organization_id: '00000000-0000-0000-0000-000000000001',
      origem: 'teste_direto',
      status: 'novo',
      data_primeiro_contato: new Date().toISOString()
    }

    const { data: createdLead, error: leadError } = await supabase
      .from('leads')
      .insert([testLead])
      .select()
      .single()

    if (leadError) {
      console.log('❌ Error creating lead:', leadError.message)
      return
    }

    console.log('✅ Test lead created:', createdLead.nome_completo)
    console.log('   ID:', createdLead.id)

    // 3. Try to calculate score manually using available functions
    console.log('\n🧮 Calculating score manually...')
    
    // First check what functions are available
    const { data: functions, error: funcError } = await supabase
      .rpc('list_functions')
      .select()

    if (funcError) {
      console.log('ℹ️  Cannot list functions (normal):', funcError.message)
    }

    // Try to call calculate_lead_score directly
    const { data: scoreResult, error: scoreError } = await supabase
      .rpc('calculate_lead_score', { lead_id: createdLead.id })

    if (scoreError) {
      console.log('❌ Direct scoring failed:', scoreError.message)
      
      // Manual calculation based on configuration
      const config = configs[0]
      let manualScore = 0
      
      console.log('\n🔢 Manual score calculation:')
      console.log('   Base scores from config:', config.name)
      
      if (createdLead.telefone) {
        manualScore += config.telefone_score
        console.log('   + Telefone:', config.telefone_score)
      }
      if (createdLead.email) {
        manualScore += config.email_score
        console.log('   + Email:', config.email_score)
      }
      if (createdLead.empresa) {
        manualScore += config.empresa_score
        console.log('   + Empresa:', config.empresa_score)
      }
      if (createdLead.cargo) {
        manualScore += config.cargo_score
        console.log('   + Cargo:', config.cargo_score)
      }
      if (createdLead.temperatura === 'quente') {
        manualScore += config.temperatura_quente_score
        console.log('   + Temperatura quente:', config.temperatura_quente_score)
      }
      if (createdLead.nivel_interesse === '3') {
        manualScore += config.nivel_interesse_alto_score
        console.log('   + Interesse alto:', config.nivel_interesse_alto_score)
      }
      if (createdLead.orcamento_disponivel > 0) {
        manualScore += config.orcamento_disponivel_score
        console.log('   + Orçamento disponível:', config.orcamento_disponivel_score)
      }
      if (createdLead.decisor_principal) {
        manualScore += config.decisor_principal_score
        console.log('   + Decisor principal:', config.decisor_principal_score)
      }
      if (createdLead.dor_principal) {
        manualScore += config.dor_principal_score
        console.log('   + Dor principal:', config.dor_principal_score)
      }
      
      console.log('\n🎯 Total manual score:', manualScore)
      console.log('   Threshold:', config.low_score_threshold)
      console.log('   Result:', manualScore >= config.low_score_threshold ? 'HIGH SCORE' : 'LOW SCORE')

      // Update lead with calculated score
      const { error: updateError } = await supabase
        .from('leads')
        .update({ lead_score: manualScore })
        .eq('id', createdLead.id)

      if (updateError) {
        console.log('⚠️  Could not update lead score:', updateError.message)
      } else {
        console.log('✅ Lead score updated')
      }

    } else {
      console.log('✅ Direct scoring succeeded:', scoreResult)
    }

    // 4. Check closers available for assignment
    console.log('\n👥 Checking available closers...')
    const { data: closers, error: closerError } = await supabase
      .from('closers')
      .select('*')
      .eq('ativo', true)
      .eq('organization_id', '00000000-0000-0000-0000-000000000001')

    if (closerError) {
      console.log('❌ Error fetching closers:', closerError.message)
    } else if (!closers || closers.length === 0) {
      console.log('⚠️  No active closers found')
      
      // Create default closers
      console.log('🔧 Creating default closers...')
      const defaultClosers = [
        {
          nome: 'Paulo Guimarães',
          email: 'paulo@example.com',
          telefone: '(11) 99999-0001',
          especialidade: 'vendas_baixo_score',
          ativo: true,
          organization_id: '00000000-0000-0000-0000-000000000001'
        },
        {
          nome: 'Closer Principal',
          email: 'principal@example.com',
          telefone: '(11) 99999-0002',
          especialidade: 'vendas_alto_score',
          ativo: true,
          organization_id: '00000000-0000-0000-0000-000000000001'
        }
      ]

      const { data: createdClosers, error: closerCreateError } = await supabase
        .from('closers')
        .insert(defaultClosers)
        .select()

      if (closerCreateError) {
        console.log('❌ Error creating closers:', closerCreateError.message)
      } else {
        console.log('✅ Created', createdClosers.length, 'default closers')
        createdClosers.forEach(closer => {
          console.log('  -', closer.nome, '(' + closer.especialidade + ')')
        })
      }
    } else {
      console.log('✅ Found', closers.length, 'active closers')
      closers.forEach(closer => {
        console.log('  -', closer.nome, '(' + closer.especialidade + ')')
      })
    }

    console.log('\n✅ Direct scoring test completed!')
    console.log('🎯 Next step: Test form submission with these configurations')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testScoringDirect()