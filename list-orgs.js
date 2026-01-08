// Script para listar todas as organizações
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function listOrganizations() {
  try {
    console.log('📋 Listando todas as organizações...')

    // Listar organizações
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('*')

    if (orgsError) {
      console.error('❌ Erro ao buscar organizações:', orgsError)
      return
    }

    console.log(`\n📊 Encontradas ${organizations.length} organizações:`)

    organizations.forEach((org, index) => {
      console.log(`\n${index + 1}. ${org.name}`)
      console.log(`   ID: ${org.id}`)
      console.log(`   Owner: ${org.owner_email}`)
      console.log(`   Criada em: ${org.created_at}`)
    })

    // Listar todos os usuários das organizações
    console.log('\n👥 Usuários em organizações:')

    const { data: orgUsers, error: usersError } = await supabase
      .from('organization_users')
      .select('*')

    if (usersError) {
      console.error('❌ Erro ao buscar usuários:', usersError)
      return
    }

    const usersByOrg = orgUsers.reduce((acc, user) => {
      if (!acc[user.organization_id]) {
        acc[user.organization_id] = []
      }
      acc[user.organization_id].push(user)
      return acc
    }, {})

    for (const [orgId, users] of Object.entries(usersByOrg)) {
      const org = organizations.find(o => o.id === orgId)
      console.log(`\n🏢 ${org?.name || orgId}:`)
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.role}) ${user.user_id ? '✅' : '⏳ pendente'}`)
      })
    }

    // Verificar especificamente kelly
    const kellyRecords = orgUsers.filter(u => u.email === 'kellybsantoss@icloud.com')
    console.log(`\n👩 Kelly está em ${kellyRecords.length} organizações:`)
    kellyRecords.forEach(record => {
      const org = organizations.find(o => o.id === record.organization_id)
      console.log(`   - ${org?.name} (${record.role}) - Owner: ${org?.owner_email}`)
    })

  } catch (error) {
    console.error('💥 Erro geral:', error)
  }
}

listOrganizations()