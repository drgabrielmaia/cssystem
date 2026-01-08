const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('🔌 Testing Supabase connection...')

  try {
    // Test connection by trying to fetch from a system table
    const { data, error } = await supabase
      .from('mentorados')
      .select('count', { count: 'exact', head: true })

    if (error) {
      console.log('⚠️  Connection test warning:', error.message)
    } else {
      console.log('✅ Connected to Supabase successfully!')
    }
  } catch (err) {
    console.error('❌ Connection failed:', err)
  }
}

async function executeMultiTenant() {
  console.log('🚀 Executing Multi-Tenant Implementation...\n')

  const operations = []
  const errors = []

  try {
    // Step 1: Test connection first
    await testConnection()

    // Step 2: Create organizations
    console.log('\n📁 Creating organizations...')

    // Create Admin Organization
    const { data: adminOrg, error: adminError } = await supabase
      .from('organizations')
      .upsert([
        {
          name: 'Admin Organization',
          owner_email: 'admin@admin.com'
        }
      ], { onConflict: 'owner_email' })
      .select()
      .single()

    if (adminError && !adminError.message.includes('duplicate')) {
      errors.push(`Admin org: ${adminError.message}`)
    } else {
      operations.push('✅ Admin Organization created/verified')
      console.log('  ✅ Admin Organization created/verified')
    }

    // Create Kelly Organization
    const { data: kellyOrg, error: kellyError } = await supabase
      .from('organizations')
      .upsert([
        {
          name: 'Kelly Organization',
          owner_email: 'kellybsantoss@icloud.com'
        }
      ], { onConflict: 'owner_email' })
      .select()
      .single()

    if (kellyError && !kellyError.message.includes('duplicate')) {
      errors.push(`Kelly org: ${kellyError.message}`)
    } else {
      operations.push('✅ Kelly Organization created/verified')
      console.log('  ✅ Kelly Organization created/verified')
    }

    // Step 3: Check existing data
    console.log('\n📊 Checking existing data...')

    const tables = [
      'mentorados',
      'video_modules',
      'video_lessons',
      'lesson_progress',
      'form_submissions',
      'formularios_respostas',
      'whatsapp_conversations',
      'comissoes'
    ]

    const dataCounts = {}

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (!error) {
          dataCounts[table] = count || 0
          console.log(`  ${table}: ${count || 0} records`)
        }
      } catch (err) {
        // Table might not exist yet
      }
    }

    // Step 4: Check financial tables
    console.log('\n💰 Checking financial tables...')

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
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (!error) {
          console.log(`  ✅ ${table} exists (${count || 0} records)`)
          operations.push(`${table} table verified`)
        } else {
          console.log(`  ⚠️  ${table} needs to be created`)
        }
      } catch (err) {
        console.log(`  ⚠️  ${table} needs to be created`)
      }
    }

    // Step 5: Generate implementation report
    console.log('\n' + '='.repeat(60))
    console.log('📋 IMPLEMENTATION REPORT')
    console.log('='.repeat(60))

    console.log('\n✅ COMPLETED OPERATIONS:')
    operations.forEach(op => console.log('  -', op))

    if (errors.length > 0) {
      console.log('\n⚠️  WARNINGS/ERRORS:')
      errors.forEach(err => console.log('  -', err))
    }

    console.log('\n📊 DATA SUMMARY:')
    Object.entries(dataCounts).forEach(([table, count]) => {
      console.log(`  ${table}: ${count} records`)
    })

    console.log('\n' + '='.repeat(60))
    console.log('🎯 NEXT STEPS:')
    console.log('='.repeat(60))
    console.log('\n1. Execute the SQL script in Supabase Dashboard:')
    console.log('   - Go to: https://supabase.com/dashboard/project/udzmlnnztzzwrphhizol/sql')
    console.log('   - Open the file: multi-tenant-implementation.sql')
    console.log('   - Copy all content and paste in SQL Editor')
    console.log('   - Click "Run" to execute\n')
    console.log('2. After execution, run verification:')
    console.log('   node verify-multi-tenant.js\n')
    console.log('3. Update your application code to handle organization context')
    console.log('4. Test with different organization users')

    // Create a summary file
    const summary = {
      timestamp: new Date().toISOString(),
      supabaseUrl,
      organizations: [
        { name: 'Admin Organization', email: 'admin@admin.com' },
        { name: 'Kelly Organization', email: 'kellybsantoss@icloud.com' }
      ],
      tablesToModify: tables,
      financialTables,
      dataCounts,
      operations,
      errors
    }

    fs.writeFileSync('multi-tenant-summary.json', JSON.stringify(summary, null, 2))
    console.log('\n✅ Summary saved to: multi-tenant-summary.json')

  } catch (error) {
    console.error('❌ Implementation error:', error)
    process.exit(1)
  }
}

// Run the implementation
executeMultiTenant()