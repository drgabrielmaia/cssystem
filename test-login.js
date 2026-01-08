const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testLogin() {
  try {
    console.log('🔐 Testando login...')

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'temp2@admin.com',
      password: '123@Admin'
    })

    if (loginError) {
      console.error('❌ Erro no login:', loginError.message)

      // Verificar se usuário existe
      console.log('\n📋 Verificando se usuário existe...')
      const { data: users, error: listError } = await supabase
        .from('auth.users') // Tentar acessar tabela auth
        .select('*')
        .eq('email', 'temp2@admin.com')

      if (listError) {
        console.log('❌ Não consegui verificar usuários (normal com RLS)')
      }

      // Tentar criar novamente
      console.log('\n🔄 Tentando criar usuário novamente...')
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: 'temp2@admin.com',
        password: '123@Admin'
      })

      if (signupError) {
        console.error('❌ Erro no signup:', signupError.message)
      } else {
        console.log('✅ Usuário criado novamente!')
        console.log('👤 User ID:', signupData.user?.id)
        console.log('📧 Confirmed:', signupData.user?.email_confirmed_at ? 'SIM' : 'NÃO')
      }

    } else {
      console.log('✅ Login realizado com sucesso!')
      console.log('👤 User ID:', loginData.user?.id)
      console.log('📧 Email:', loginData.user?.email)
      console.log('📧 Confirmed:', loginData.user?.email_confirmed_at ? 'SIM' : 'NÃO')

      // Verificar organização
      console.log('\n🏢 Verificando organização...')
      const { data: orgUser, error: orgError } = await supabase
        .from('organization_users')
        .select('*')
        .eq('user_id', loginData.user.id)

      if (orgError) {
        console.error('❌ Erro ao buscar organização:', orgError.message)
      } else {
        console.log('✅ Organização encontrada:', orgUser)
      }

      await supabase.auth.signOut()
    }

  } catch (err) {
    console.error('❌ Erro geral:', err.message)
  }
}

testLogin()