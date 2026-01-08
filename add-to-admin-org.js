const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function addToAdminOrg() {
  try {
    console.log('🔑 Fazendo login com o novo usuário primeiro...')

    // Fazer login com o usuário criado
    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'gabrielmaia@gmail.com',
      password: 'admin123!'
    })

    if (loginError) {
      console.error('❌ Erro no login:', loginError.message)
      return
    }

    const newUserId = authData.user.id
    console.log(`👤 Usuário logado: ${newUserId}`)

    const adminOrgId = '9c8c0033-15ea-4e33-a55f-28d81a19693b' // ID da Admin Organization

    // Adicionar à organização como owner
    const { data, error } = await supabase
      .from('organization_users')
      .insert({
        organization_id: adminOrgId,
        user_id: newUserId,
        email: 'gabrielmaia@gmail.com',
        role: 'owner'
      })

    if (error) {
      if (error.message.includes('duplicate')) {
        console.log('⚠️  Usuário já está na organização')
      } else {
        console.error('❌ Erro ao adicionar usuário:', error.message)
        return
      }
    } else {
      console.log('✅ Usuário adicionado como owner da Admin Organization!')
    }

    // Verificar se funcionou
    const { data: orgUsers } = await supabase
      .from('organization_users')
      .select('*')
      .eq('organization_id', adminOrgId)

    console.log('\n👥 Usuários na Admin Organization:')
    orgUsers?.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`)
    })

    console.log('\n🎉 Agora você pode fazer login com:')
    console.log('   Email: gabrielmaia@gmail.com')
    console.log('   Senha: admin123!')
    console.log('   E terá acesso aos 114 mentorados da organização!')

    // Fazer logout
    await supabase.auth.signOut()

  } catch (err) {
    console.error('❌ Erro:', err.message)
  }
}

addToAdminOrg()