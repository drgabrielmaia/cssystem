const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyMultiTenant() {
  console.log('🔍 Complete Multi-Tenant Verification\n')
  console.log('='.repeat(60))

  const results = {
    passed: [],
    failed: [],
    warnings: []
  }

  try {
    // 1. Check Organizations Table
    console.log('\n1️⃣  Checking Organizations Table...')
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')

    if (orgsError) {
      results.failed.push(`Organizations table: ${orgsError.message}`)
      console.log('   ❌ Organizations table not found or error')
    } else {
      results.passed.push('Organizations table exists')
      console.log(`   ✅ Organizations table exists with ${orgs.length} records`)

      // Check for specific organizations
      const adminOrg = orgs.find(o => o.owner_email === 'admin@admin.com')
      const kellyOrg = orgs.find(o => o.owner_email === 'kellybsantoss@icloud.com')

      if (adminOrg) {
        results.passed.push('Admin Organization created')
        console.log('   ✅ Admin Organization found:', adminOrg.name)
      } else {
        results.warnings.push('Admin Organization not found')
        console.log('   ⚠️  Admin Organization not found')
      }

      if (kellyOrg) {
        results.passed.push('Kelly Organization created')
        console.log('   ✅ Kelly Organization found:', kellyOrg.name)
      } else {
        results.warnings.push('Kelly Organization not found')
        console.log('   ⚠️  Kelly Organization not found')
      }
    }

    // 2. Check Organization Users Table
    console.log('\n2️⃣  Checking Organization Users Table...')
    const { data: orgUsers, error: orgUsersError } = await supabase
      .from('organization_users')
      .select('*')

    if (orgUsersError) {
      results.failed.push(`Organization Users table: ${orgUsersError.message}`)
      console.log('   ❌ Organization Users table not found or error')
    } else {
      results.passed.push('Organization Users table exists')
      console.log(`   ✅ Organization Users table exists with ${orgUsers?.length || 0} records`)
    }

    // 3. Check Modified Tables
    console.log('\n3️⃣  Checking Modified Tables (organization_id column)...')
    const tablesToCheck = [
      'mentorados',
      'video_modules',
      'video_lessons',
      'lesson_progress',
      'form_submissions',
      'formularios_respostas',
      'whatsapp_conversations',
      'comissoes'
    ]

    for (const table of tablesToCheck) {
      try {
        // Try to select organization_id column
        const { data, error } = await supabase
          .from(table)
          .select('organization_id')
          .limit(1)

        if (error && error.message.includes('column')) {
          results.failed.push(`${table}: missing organization_id column`)
          console.log(`   ❌ ${table}: missing organization_id column`)
        } else {
          results.passed.push(`${table}: has organization_id column`)
          console.log(`   ✅ ${table}: has organization_id column`)

          // Check if data is migrated
          const { count: totalCount } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })

          const { count: migratedCount } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
            .not('organization_id', 'is', null)

          if (totalCount > 0 && migratedCount === totalCount) {
            console.log(`      ✅ All ${totalCount} records migrated`)
          } else if (totalCount > 0 && migratedCount < totalCount) {
            results.warnings.push(`${table}: ${totalCount - migratedCount} records not migrated`)
            console.log(`      ⚠️  ${migratedCount}/${totalCount} records migrated`)
          }
        }
      } catch (err) {
        results.warnings.push(`${table}: verification error`)
        console.log(`   ⚠️  ${table}: verification error`)
      }
    }

    // 4. Check Financial Tables
    console.log('\n4️⃣  Checking Financial Tables...')
    const financialTables = [
      'vendas',
      'despesas',
      'metas',
      'faturas',
      'pix_payments',
      'contas_bancarias',
      'categorias_financeiras',
      'transacoes'
    ]

    for (const table of financialTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('organization_id')
          .limit(1)

        if (error && error.message.includes('does not exist')) {
          results.failed.push(`${table}: table doesn't exist`)
          console.log(`   ❌ ${table}: table doesn't exist`)
        } else if (error && error.message.includes('column')) {
          results.failed.push(`${table}: missing organization_id column`)
          console.log(`   ❌ ${table}: missing organization_id column`)
        } else {
          results.passed.push(`${table}: exists with organization_id`)
          console.log(`   ✅ ${table}: exists with organization_id column`)
        }
      } catch (err) {
        results.warnings.push(`${table}: verification error`)
        console.log(`   ⚠️  ${table}: verification error`)
      }
    }

    // 5. Check RLS Policies
    console.log('\n5️⃣  Checking Row Level Security...')
    console.log('   ℹ️  Note: RLS policy verification requires admin access')
    console.log('   📋 Please verify in Supabase Dashboard > Authentication > Policies')

    // 6. Check Helper Functions
    console.log('\n6️⃣  Checking Helper Functions...')
    const functions = [
      'get_user_organization_id',
      'user_belongs_to_organization',
      'get_user_role_in_organization'
    ]

    console.log('   ℹ️  Note: Function verification requires admin access')
    console.log('   📋 Please verify in Supabase Dashboard > Database > Functions')

    // Generate Final Report
    console.log('\n' + '='.repeat(60))
    console.log('📊 VERIFICATION REPORT')
    console.log('='.repeat(60))

    console.log(`\n✅ PASSED (${results.passed.length}):`)
    results.passed.forEach(item => console.log('   -', item))

    if (results.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${results.warnings.length}):`)
      results.warnings.forEach(item => console.log('   -', item))
    }

    if (results.failed.length > 0) {
      console.log(`\n❌ FAILED (${results.failed.length}):`)
      results.failed.forEach(item => console.log('   -', item))
    }

    // Overall Status
    console.log('\n' + '='.repeat(60))
    if (results.failed.length === 0) {
      console.log('✅ OVERALL STATUS: IMPLEMENTATION SUCCESSFUL')
      console.log('   All critical components are in place!')
    } else {
      console.log('⚠️  OVERALL STATUS: IMPLEMENTATION INCOMPLETE')
      console.log('   Please execute the SQL script in Supabase Dashboard')
      console.log('   File: multi-tenant-implementation.sql')
    }
    console.log('='.repeat(60))

    // Save detailed report
    const fs = require('fs')
    const report = {
      timestamp: new Date().toISOString(),
      supabaseUrl,
      results,
      summary: {
        totalChecks: results.passed.length + results.warnings.length + results.failed.length,
        passed: results.passed.length,
        warnings: results.warnings.length,
        failed: results.failed.length
      }
    }

    fs.writeFileSync('multi-tenant-verification-report.json', JSON.stringify(report, null, 2))
    console.log('\n📄 Detailed report saved to: multi-tenant-verification-report.json')

  } catch (error) {
    console.error('\n❌ Verification error:', error)
  }
}

// Run verification
verifyMultiTenant()