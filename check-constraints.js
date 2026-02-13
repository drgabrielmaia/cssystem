#!/usr/bin/env node

/**
 * Check table constraints and valid values
 */

const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkConstraints() {
  console.log('🔍 Checking table constraints and valid values...\n')

  try {
    // Check existing lead status values
    const { data: statusValues } = await supabase
      .from('leads')
      .select('status')
      .not('status', 'is', null)
      .limit(20)

    if (statusValues) {
      const uniqueStatuses = [...new Set(statusValues.map(l => l.status))]
      console.log('✅ Existing status values in leads table:')
      uniqueStatuses.forEach(status => {
        console.log('  -', status)
      })
    }

    // Check temperatura values
    const { data: tempValues } = await supabase
      .from('leads')
      .select('temperatura')
      .not('temperatura', 'is', null)
      .limit(20)

    if (tempValues) {
      const uniqueTemps = [...new Set(tempValues.map(l => l.temperatura))]
      console.log('\n✅ Existing temperatura values:')
      uniqueTemps.forEach(temp => {
        console.log('  -', temp)
      })
    }

    // Check nivel_interesse values
    const { data: interestValues } = await supabase
      .from('leads')
      .select('nivel_interesse')
      .not('nivel_interesse', 'is', null)
      .limit(20)

    if (interestValues) {
      const uniqueInterests = [...new Set(interestValues.map(l => l.nivel_interesse))]
      console.log('\n✅ Existing nivel_interesse values:')
      uniqueInterests.forEach(interest => {
        console.log('  -', interest)
      })
    }

    // Check origem values
    const { data: origemValues } = await supabase
      .from('leads')
      .select('origem')
      .not('origem', 'is', null)
      .limit(20)

    if (origemValues) {
      const uniqueOrigens = [...new Set(origemValues.map(l => l.origem))]
      console.log('\n✅ Existing origem values:')
      uniqueOrigens.forEach(origem => {
        console.log('  -', origem)
      })
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message)
  }
}

checkConstraints()