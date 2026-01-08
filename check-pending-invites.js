// Script para verificar convites pendentes
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPendingInvites() {
  try {
    console.log('🔍 Verificando convites pendentes...')

    // Buscar todos os registros da tabela organization_users
    const { data: allUsers, error: allError } = await supabase
      .from('organization_users')
      .select('*')

    if (allError) {
      console.error('❌ Erro ao buscar usuários:', allError)
      return
    }

    console.log('📊 Total de registros organization_users:', allUsers.length)

    // Filtrar registros com user_id null (convites pendentes)
    const pendingInvites = allUsers.filter(user => user.user_id === null)

    console.log('⏳ Convites pendentes encontrados:', pendingInvites.length)

    if (pendingInvites.length > 0) {
      console.log('\n📋 Detalhes dos convites pendentes:')
      pendingInvites.forEach((invite, index) => {
        console.log(`\n${index + 1}. ID: ${invite.id}`)
        console.log(`   Organization ID: ${invite.organization_id}`)
        console.log(`   Email: ${invite.email || 'N/A'}`)
        console.log(`   Role: ${invite.role}`)
        console.log(`   Created: ${invite.created_at}`)
        console.log(`   User ID: ${invite.user_id} (null = pendente)`)
      })

      console.log('\n🧹 Opções para resolver:')
      console.log('1. Deletar convites antigos/inválidos')
      console.log('2. Associar a usuários existentes')
      console.log('3. Reenviar convites')
    } else {
      console.log('✅ Nenhum convite pendente encontrado!')
    }

    // Mostrar distribuição por organização
    console.log('\n📈 Distribuição por organização:')
    const groupedByOrg = allUsers.reduce((acc, user) => {
      const orgId = user.organization_id
      if (!acc[orgId]) {
        acc[orgId] = { total: 0, pending: 0, active: 0 }
      }
      acc[orgId].total++
      if (user.user_id === null) {
        acc[orgId].pending++
      } else {
        acc[orgId].active++
      }
      return acc
    }, {})

    for (const [orgId, stats] of Object.entries(groupedByOrg)) {
      console.log(`\n   Org ${orgId}:`)
      console.log(`     Total: ${stats.total}`)
      console.log(`     Ativos: ${stats.active}`)
      console.log(`     Pendentes: ${stats.pending}`)
    }

  } catch (error) {
    console.error('💥 Erro:', error)
  }
}

checkPendingInvites()