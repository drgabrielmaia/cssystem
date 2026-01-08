const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTYzNTY3NiwiZXhwIjoyMDQ1MjExNjc2fQ.g6lJLaOQ9CW4PGNJYHMq_xyunTWtMiMGrcdUTD-W7jQ'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function test() {
  console.log('Testing connection to Supabase...\n')
  
  // Test 1: Try to get mentorados
  console.log('1. Testing mentorados table:')
  const { data: mentorados, error: mentoradosError } = await supabase
    .from('mentorados')
    .select('*')
    .limit(2)
    
  if (mentoradosError) {
    console.log('  Error:', mentoradosError.message)
  } else {
    console.log('  Success! Found', mentorados.length, 'records')
    if (mentorados.length > 0) {
      console.log('  Columns:', Object.keys(mentorados[0]))
    }
  }
  
  // Test 2: Try to get vendas  
  console.log('\n2. Testing vendas table:')
  const { data: vendas, error: vendasError } = await supabase
    .from('vendas')
    .select('*')
    .limit(2)
    
  if (vendasError) {
    console.log('  Error:', vendasError.message)
  } else {
    console.log('  Success! Found', vendas.length, 'records')
    if (vendas.length > 0) {
      console.log('  Columns:', Object.keys(vendas[0]))
    }
  }

  // Test 3: Check auth.users
  console.log('\n3. Testing auth.users access:')
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
  
  if (usersError) {
    console.log('  Error:', usersError.message)
  } else {
    console.log('  Success! Found', users.users.length, 'users')
  }
}

test().catch(console.error)
