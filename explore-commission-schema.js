const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase credentials not found!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function exploreCommissionSchema() {
  console.log('🔍 Exploring Database Schema for Commission Split System\n')
  console.log('=' .repeat(60))
  
  try {
    // 1. Explore comissoes table
    console.log('\n📊 TABLE: comissoes')
    console.log('-'.repeat(40))
    const { data: comissoes, error: comissoesError } = await supabase
      .from('comissoes')
      .select('*')
      .limit(1)
    
    if (!comissoesError && comissoes) {
      if (comissoes.length > 0) {
        console.log('Columns found:')
        const columns = Object.keys(comissoes[0])
        columns.forEach(col => {
          const value = comissoes[0][col]
          const type = value === null ? 'null' : typeof value
          const sample = value === null ? 'NULL' : 
                        typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : 
                        String(value).substring(0, 50)
          console.log(`  - ${col}: ${type} (sample: ${sample})`)
        })
        console.log('\nFull sample record:')
        console.log(JSON.stringify(comissoes[0], null, 2))
      } else {
        console.log('Table exists but no records found')
      }
    } else {
      console.log(`Error accessing comissoes: ${comissoesError?.message}`)
    }

    // 2. Explore leads table
    console.log('\n📊 TABLE: leads')
    console.log('-'.repeat(40))
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .limit(1)
    
    if (!leadsError && leads) {
      if (leads.length > 0) {
        console.log('Columns found:')
        const columns = Object.keys(leads[0])
        columns.forEach(col => {
          const value = leads[0][col]
          const type = value === null ? 'null' : typeof value
          const sample = value === null ? 'NULL' : 
                        typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : 
                        String(value).substring(0, 50)
          console.log(`  - ${col}: ${type} (sample: ${sample})`)
        })
        
        // Check specifically for financial columns
        console.log('\n💰 Financial columns in leads:')
        const financialCols = columns.filter(col => 
          col.includes('valor') || col.includes('comiss') || col.includes('pag') || 
          col.includes('arrec') || col.includes('vend')
        )
        financialCols.forEach(col => {
          console.log(`  - ${col}: ${typeof leads[0][col]} = ${leads[0][col]}`)
        })
      } else {
        console.log('Table exists but no records found')
      }
    } else {
      console.log(`Error accessing leads: ${leadsError?.message}`)
    }

    // 3. Explore mentorados table
    console.log('\n📊 TABLE: mentorados')
    console.log('-'.repeat(40))
    const { data: mentorados, error: mentoradosError } = await supabase
      .from('mentorados')
      .select('*')
      .limit(1)
    
    if (!mentoradosError && mentorados) {
      if (mentorados.length > 0) {
        console.log('Columns found:')
        const columns = Object.keys(mentorados[0])
        columns.forEach(col => {
          const value = mentorados[0][col]
          const type = value === null ? 'null' : typeof value
          const sample = value === null ? 'NULL' : 
                        typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : 
                        String(value).substring(0, 50)
          console.log(`  - ${col}: ${type} (sample: ${sample})`)
        })
      } else {
        console.log('Table exists but no records found')
      }
    } else {
      console.log(`Error accessing mentorados: ${mentoradosError?.message}`)
    }

    // 4. Check relationships between tables
    console.log('\n🔗 RELATIONSHIPS')
    console.log('-'.repeat(40))
    
    // Check if comissoes references leads
    const { data: comissoesWithLeads, error: relError1 } = await supabase
      .from('comissoes')
      .select(`
        *,
        leads (
          id,
          nome,
          valor_vendido,
          valor_arrecadado
        )
      `)
      .limit(1)
    
    if (!relError1 && comissoesWithLeads && comissoesWithLeads.length > 0) {
      console.log('✅ comissoes -> leads relationship found')
      console.log('Sample join:', JSON.stringify(comissoesWithLeads[0], null, 2))
    } else {
      console.log('❌ No direct comissoes -> leads relationship found')
    }

    // Check if comissoes references mentorados
    const { data: comissoesWithMentorados, error: relError2 } = await supabase
      .from('comissoes')
      .select(`
        *,
        mentorados (
          id,
          nome,
          email
        )
      `)
      .limit(1)
    
    if (!relError2 && comissoesWithMentorados && comissoesWithMentorados.length > 0) {
      console.log('✅ comissoes -> mentorados relationship found')
    } else {
      console.log('❌ No direct comissoes -> mentorados relationship found')
    }

    // 5. Check for existing payment tracking columns
    console.log('\n💳 PAYMENT TRACKING ANALYSIS')
    console.log('-'.repeat(40))
    
    // Get a few commission records to analyze payment patterns
    const { data: commissionSamples, error: sampleError } = await supabase
      .from('comissoes')
      .select('*')
      .limit(5)
    
    if (!sampleError && commissionSamples && commissionSamples.length > 0) {
      const cols = Object.keys(commissionSamples[0])
      console.log('Payment-related columns in comissoes:')
      const paymentCols = cols.filter(col => 
        col.includes('pag') || col.includes('paid') || col.includes('status') || 
        col.includes('payment') || col.includes('split') || col.includes('parcela')
      )
      if (paymentCols.length > 0) {
        paymentCols.forEach(col => {
          const uniqueValues = [...new Set(commissionSamples.map(c => c[col]))]
          console.log(`  - ${col}: ${uniqueValues.join(', ')}`)
        })
      } else {
        console.log('  No existing payment tracking columns found')
      }
    }

    // 6. Check for existing triggers or functions
    console.log('\n⚙️ DATABASE FUNCTIONS & TRIGGERS')
    console.log('-'.repeat(40))
    
    // Try to check for functions related to commissions
    const { data: functions, error: funcError } = await supabase.rpc('get_functions_list').catch(() => null)
    
    if (functions) {
      console.log('Functions found:', functions)
    } else {
      console.log('Could not retrieve functions list (may require additional permissions)')
    }

    console.log('\n✅ Schema exploration complete!')
    console.log('=' .repeat(60))

  } catch (error) {
    console.error('❌ Error during schema exploration:', error)
  }
}

exploreCommissionSchema()