#!/usr/bin/env node

/**
 * Check available organizations
 */

const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkOrganizations() {
  console.log('🏢 Checking available organizations...\n')

  try {
    // Check organizations table
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(5)

    if (orgError) {
      console.log('❌ Error fetching organizations:', orgError.message)
    } else {
      console.log('✅ Available organizations:')
      orgs.forEach(org => {
        console.log('  -', org.id, ':', org.nome || org.name || 'Unnamed')
      })
    }

    // Also check what organization_id values exist in leads table
    const { data: leadOrgs, error: leadOrgError } = await supabase
      .from('leads')
      .select('organization_id')
      .not('organization_id', 'is', null)
      .limit(5)

    if (leadOrgError) {
      console.log('❌ Error fetching lead organizations:', leadOrgError.message)
    } else {
      console.log('\n📋 Organization IDs in leads table:')
      const uniqueIds = [...new Set(leadOrgs.map(l => l.organization_id))]
      uniqueIds.forEach(id => {
        console.log('  -', id)
      })
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message)
  }
}

checkOrganizations()