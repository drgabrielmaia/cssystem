
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyImplementation() {
  console.log('🔍 Verifying Multi-Tenant Implementation...\n')

  try {
    // Check organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')

    if (orgsError) {
      console.log('❌ Error fetching organizations:', orgsError.message)
    } else {
      console.log('✅ Organizations table exists')
      console.log('   Found', orgs.length, 'organizations:')
      orgs.forEach(org => {
        console.log('   -', org.name, '(' + org.owner_email + ')')
      })
    }

    // Check modified tables
    const tablesToCheck = [
      'mentorados',
      'video_modules',
      'video_lessons',
      'vendas',
      'despesas',
      'metas',
      'contas_bancarias',
      'categorias_financeiras',
      'transacoes'
    ]

    console.log('\n📊 Checking table modifications:')
    for (const table of tablesToCheck) {
      const { data, error, count } = await supabase
        .from(table)
        .select('organization_id', { count: 'exact', head: true })

      if (error) {
        console.log('  ❌', table + ':', error.message)
      } else {
        console.log('  ✅', table + ': has organization_id column')
      }
    }

    // Check data migration
    console.log('\n📈 Data migration summary:')
    const adminOrg = orgs?.find(o => o.owner_email === 'admin@admin.com')

    if (adminOrg) {
      for (const table of ['mentorados', 'video_modules', 'video_lessons']) {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', adminOrg.id)

        console.log('  -', table + ':', count || 0, 'records in Admin org')
      }
    }

    console.log('\n✅ Verification complete!')

  } catch (error) {
    console.error('❌ Verification error:', error)
  }
}

verifyImplementation()
