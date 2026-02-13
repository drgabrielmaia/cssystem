#!/usr/bin/env node

/**
 * Check what views/rules depend on nivel_interesse column
 */

const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDependencies() {
  console.log('🔍 Checking dependencies on nivel_interesse column...\n')

  try {
    // Check if lead_dashboard view exists and what it contains
    const { data: views, error: viewError } = await supabase
      .from('information_schema.views')
      .select('*')
      .like('table_name', '%lead%')

    if (viewError) {
      console.log('ℹ️  Cannot access views info:', viewError.message)
    } else if (views) {
      console.log('✅ Found views with "lead" in name:')
      views.forEach(view => {
        console.log('  -', view.table_name, 'in schema', view.table_schema)
      })
    }

    // Try to check the lead_dashboard view definition
    const { data: leadDashboard, error: dashboardError } = await supabase
      .from('lead_dashboard')
      .select('*')
      .limit(1)

    if (!dashboardError && leadDashboard) {
      console.log('\n✅ lead_dashboard view exists and is accessible')
      console.log('Sample row keys:', Object.keys(leadDashboard[0] || {}))
    } else {
      console.log('\n❌ lead_dashboard view error:', dashboardError?.message)
    }

    // Check current nivel_interesse values and their types
    const { data: sampleLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, nivel_interesse')
      .not('nivel_interesse', 'is', null)
      .limit(10)

    if (!leadsError && sampleLeads) {
      console.log('\n📊 Current nivel_interesse values:')
      sampleLeads.forEach(lead => {
        const value = lead.nivel_interesse
        const type = typeof value
        console.log(`  - ID: ${lead.id.slice(0, 8)}... Value: "${value}" (${type})`)
      })
    }

    console.log('\n💡 Suggested approach:')
    console.log('Since we cannot alter the column type due to view dependency,')
    console.log('we can work with the current TEXT type and handle conversion in API.')
    
  } catch (error) {
    console.error('❌ Check failed:', error.message)
  }
}

checkDependencies()