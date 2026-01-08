const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function debugUserOrg() {
  try {
    // Fazer login
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'temp2@admin.com',
      password: '123@Admin'
    })

    if (loginError) {
      console.error('❌ Erro no login:', loginError.message)
      return
    }

    const userId = loginData.user.id
    console.log('✅ Login realizado')
    console.log('👤 User ID:', userId)

    // 1. VERIFICAR VINCULAÇÃO À ORGANIZAÇÃO
    console.log('\n🏢 VERIFICANDO ORGANIZAÇÃO...')

    const { data: orgUsers, error: orgError } = await supabase
      .from('organization_users')
      .select('*')
      .eq('user_id', userId)

    console.log('📋 organization_users para este usuário:')
    console.log('Error:', orgError?.message || 'Nenhum')
    console.log('Data:', orgUsers)

    if (orgUsers && orgUsers.length > 0) {
      const orgId = orgUsers[0].organization_id
      console.log('🎯 Organization ID:', orgId)

      // Verificar organização
      const { data: org, error: orgDetailError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      console.log('\n🏢 Detalhes da organização:')
      console.log('Error:', orgDetailError?.message || 'Nenhum')
      console.log('Data:', org)

      // 2. VERIFICAR DADOS NA ORGANIZAÇÃO
      console.log('\n📊 VERIFICANDO DADOS DA ORGANIZAÇÃO...')

      // Mentorados
      const { data: mentorados, error: mentoradosError } = await supabase
        .from('mentorados')
        .select('*')
        .eq('organization_id', orgId)

      console.log('👥 Mentorados na organização:')
      console.log('Error:', mentoradosError?.message || 'Nenhum')
      console.log('Count:', mentorados?.length || 0)

      // Dívidas
      const { data: dividas, error: dividasError } = await supabase
        .from('dividas')
        .select('*')

      console.log('\n💰 Todas as dívidas (sem filtro):')
      console.log('Error:', dividasError?.message || 'Nenhum')
      console.log('Count:', dividas?.length || 0)

      // Comissões
      const { data: comissoes, error: comissoesError } = await supabase
        .from('comissoes')
        .select('*')
        .eq('status_pagamento', 'pendente')

      console.log('\n💼 Comissões pendentes:')
      console.log('Error:', comissoesError?.message || 'Nenhum')
      console.log('Count:', comissoes?.length || 0)

    } else {
      console.log('❌ Usuário não está vinculado a nenhuma organização!')

      // Ver todas as organizations
      const { data: allOrgs } = await supabase
        .from('organizations')
        .select('*')

      console.log('\n📋 Todas as organizações:')
      allOrgs?.forEach(org => {
        console.log(`   - ${org.name} (${org.owner_email}) - ID: ${org.id}`)
      })

      // Ver todos os organization_users
      const { data: allOrgUsers } = await supabase
        .from('organization_users')
        .select('*')

      console.log('\n📋 Todos os organization_users:')
      allOrgUsers?.forEach(user => {
        console.log(`   - ${user.email} (${user.role}) - Org: ${user.organization_id} - User: ${user.user_id}`)
      })
    }

    await supabase.auth.signOut()

  } catch (err) {
    console.error('❌ Erro:', err.message)
  }
}

debugUserOrg()