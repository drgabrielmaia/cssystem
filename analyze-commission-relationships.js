const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase credentials not found!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function analyzeCommissionRelationships() {
  console.log('🔍 Analyzing Commission System Relationships\n')
  console.log('=' .repeat(60))
  
  try {
    // 1. Check if comissoes references leads via lead_id
    console.log('\n📊 ANALYZING COMISSOES -> LEADS RELATIONSHIP')
    console.log('-'.repeat(40))
    
    const { data: commissionWithLead, error: clError } = await supabase
      .from('comissoes')
      .select('id, lead_id, valor_venda, valor_comissao, status_pagamento')
      .not('lead_id', 'is', null)
      .limit(3)
    
    if (!clError && commissionWithLead && commissionWithLead.length > 0) {
      console.log('Found commissions with lead_id:')
      for (const comm of commissionWithLead) {
        // Try to fetch the corresponding lead
        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .select('id, nome_completo, valor_vendido, valor_arrecadado, data_venda, status')
          .eq('id', comm.lead_id)
          .single()
        
        if (!leadError && lead) {
          console.log(`\nCommission ${comm.id}:`)
          console.log(`  - Lead ID: ${comm.lead_id}`)
          console.log(`  - Lead Name: ${lead.nome_completo}`)
          console.log(`  - Commission Amount: R$ ${comm.valor_comissao}`)
          console.log(`  - Payment Status: ${comm.status_pagamento}`)
          console.log(`  - Lead valor_vendido: ${lead.valor_vendido || 'NULL'}`)
          console.log(`  - Lead valor_arrecadado: ${lead.valor_arrecadado || 'NULL'}`)
          console.log(`  - Lead status: ${lead.status}`)
        } else {
          console.log(`\nCommission ${comm.id}: Lead ${comm.lead_id} not found or error`)
        }
      }
    } else {
      console.log('No commissions with lead_id found')
    }

    // 2. Check if leads reference commissions
    console.log('\n📊 ANALYZING LEADS -> COMISSOES RELATIONSHIP')
    console.log('-'.repeat(40))
    
    const { data: leadsWithCommission, error: lcError } = await supabase
      .from('leads')
      .select('id, nome_completo, comissao_id, possui_comissao, valor_vendido, valor_arrecadado, status')
      .or('possui_comissao.eq.true,comissao_id.not.is.null')
      .limit(3)
    
    if (!lcError && leadsWithCommission) {
      if (leadsWithCommission.length > 0) {
        console.log('Found leads with commission references:')
        leadsWithCommission.forEach(lead => {
          console.log(`\nLead: ${lead.nome_completo}`)
          console.log(`  - comissao_id: ${lead.comissao_id || 'NULL'}`)
          console.log(`  - possui_comissao: ${lead.possui_comissao}`)
          console.log(`  - valor_vendido: ${lead.valor_vendido || 'NULL'}`)
          console.log(`  - valor_arrecadado: ${lead.valor_arrecadado || 'NULL'}`)
          console.log(`  - status: ${lead.status}`)
        })
      } else {
        console.log('No leads with commission references found')
      }
    }

    // 3. Check mentorado -> commission relationship
    console.log('\n📊 ANALYZING MENTORADOS -> COMISSOES RELATIONSHIP')
    console.log('-'.repeat(40))
    
    const { data: commissionWithMentorado, error: cmError } = await supabase
      .from('comissoes')
      .select('id, mentorado_id, valor_comissao, status_pagamento')
      .not('mentorado_id', 'is', null)
      .limit(3)
    
    if (!cmError && commissionWithMentorado && commissionWithMentorado.length > 0) {
      console.log('Found commissions with mentorado_id:')
      for (const comm of commissionWithMentorado) {
        const { data: mentorado, error: mentError } = await supabase
          .from('mentorados')
          .select('id, nome_completo, porcentagem_comissao, lead_id')
          .eq('id', comm.mentorado_id)
          .single()
        
        if (!mentError && mentorado) {
          console.log(`\nCommission ${comm.id}:`)
          console.log(`  - Mentorado: ${mentorado.nome_completo}`)
          console.log(`  - Mentorado commission %: ${mentorado.porcentagem_comissao}%`)
          console.log(`  - Commission Amount: R$ ${comm.valor_comissao}`)
          console.log(`  - Payment Status: ${comm.status_pagamento}`)
          console.log(`  - Mentorado's lead_id: ${mentorado.lead_id || 'NULL'}`)
        }
      }
    }

    // 4. Analyze payment status values
    console.log('\n💳 PAYMENT STATUS ANALYSIS')
    console.log('-'.repeat(40))
    
    const { data: statusCount, error: scError } = await supabase
      .from('comissoes')
      .select('status_pagamento')
    
    if (!scError && statusCount) {
      const statusMap = {}
      statusCount.forEach(row => {
        const status = row.status_pagamento || 'NULL'
        statusMap[status] = (statusMap[status] || 0) + 1
      })
      
      console.log('Payment status distribution:')
      Object.entries(statusMap).forEach(([status, count]) => {
        console.log(`  - ${status}: ${count} records`)
      })
    }

    // 5. Check for any partial payment tracking
    console.log('\n🔍 CHECKING FOR PARTIAL PAYMENT TRACKING')
    console.log('-'.repeat(40))
    
    const { data: sampleCommissions, error: scmError } = await supabase
      .from('comissoes')
      .select('*')
      .limit(10)
    
    if (!scmError && sampleCommissions && sampleCommissions.length > 0) {
      const columns = Object.keys(sampleCommissions[0])
      const partialPaymentCols = columns.filter(col => 
        col.includes('parcial') || 
        col.includes('split') || 
        col.includes('primeira') || 
        col.includes('segunda') ||
        col.includes('parcela') ||
        col.includes('parte')
      )
      
      if (partialPaymentCols.length > 0) {
        console.log('Found potential partial payment columns:')
        partialPaymentCols.forEach(col => {
          console.log(`  - ${col}`)
        })
      } else {
        console.log('No existing partial payment tracking columns found')
        console.log('Will need to add columns for split payment tracking')
      }
    }

    // 6. Analyze typical commission flow
    console.log('\n📈 COMMISSION FLOW ANALYSIS')
    console.log('-'.repeat(40))
    
    const { data: recentSales, error: rsError } = await supabase
      .from('comissoes')
      .select('*, leads!inner(valor_vendido, valor_arrecadado, status)')
      .eq('leads.id', supabase.raw('comissoes.lead_id'))
      .limit(5)
      .order('created_at', { ascending: false })
    
    if (!rsError && recentSales) {
      console.log(`Found ${recentSales.length} recent commissions with lead data`)
      if (recentSales.length > 0) {
        console.log('\nSample commission with lead financial data:')
        const sample = recentSales[0]
        console.log(`  - Commission value: R$ ${sample.valor_comissao}`)
        console.log(`  - Payment status: ${sample.status_pagamento}`)
        console.log(`  - Lead sold value: ${sample.leads?.valor_vendido || 'NULL'}`)
        console.log(`  - Lead collected value: ${sample.leads?.valor_arrecadado || 'NULL'}`)
      }
    } else {
      // Try alternative approach if join didn't work
      console.log('Could not join tables directly, trying manual correlation...')
      
      const { data: commission, error: cError } = await supabase
        .from('comissoes')
        .select('*')
        .not('lead_id', 'is', null)
        .limit(1)
        .single()
      
      if (!cError && commission) {
        const { data: lead, error: lError } = await supabase
          .from('leads')
          .select('valor_vendido, valor_arrecadado, status')
          .eq('id', commission.lead_id)
          .single()
        
        if (!lError && lead) {
          console.log('\nManual correlation successful:')
          console.log(`  - Commission: R$ ${commission.valor_comissao}`)
          console.log(`  - Status: ${commission.status_pagamento}`)
          console.log(`  - Lead valor_vendido: ${lead.valor_vendido || 'NULL'}`)
          console.log(`  - Lead valor_arrecadado: ${lead.valor_arrecadado || 'NULL'}`)
        }
      }
    }

    console.log('\n✅ Analysis complete!')
    console.log('=' .repeat(60))

  } catch (error) {
    console.error('❌ Error during analysis:', error)
  }
}

analyzeCommissionRelationships()