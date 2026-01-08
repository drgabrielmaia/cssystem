const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function fixTempPassword() {
  try {
    console.log('🔧 Criando usuário com senha forte...')

    // Deletar usuário antigo se existir e criar novo com senha forte
    const tempEmail = 'temp2@admin.com' // Mudando email para evitar conflito
    const strongPassword = '123@Admin'

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: tempEmail,
      password: strongPassword
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️ Usuário já existe, tentando login...')

        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: tempEmail,
          password: strongPassword
        })

        if (!loginError && loginData.user) {
          console.log('✅ Login realizado!')
          await addToAdminOrg(loginData.user.id, tempEmail)
        } else {
          console.log('❌ Login falhou, delete o usuário no dashboard e rode novamente')
        }
      } else {
        console.error('❌ Erro:', authError.message)
      }
    } else if (authData.user) {
      console.log('✅ Usuário criado com senha forte!')
      await addToAdminOrg(authData.user.id, tempEmail)
    }

  } catch (err) {
    console.error('❌ Erro:', err.message)
  }
}

async function addToAdminOrg(userId, email) {
  const adminOrgId = '9c8c0033-15ea-4e33-a55f-28d81a19693b'

  const { data, error } = await supabase
    .from('organization_users')
    .insert({
      organization_id: adminOrgId,
      user_id: userId,
      email: email,
      role: 'owner'
    })

  if (error) {
    console.error('❌ Erro ao adicionar à organização:', error.message)
  } else {
    console.log('✅ Usuário adicionado à organização admin!')
    console.log('')
    console.log('🎯 CREDENCIAIS CORRETAS:')
    console.log(`   Email: ${email}`)
    console.log(`   Senha: 123@Admin`)
    console.log('   Organização: Admin Organization (114 mentorados)')
    console.log('')
    console.log('👉 Acesse: http://localhost:3000/login')
  }

  await supabase.auth.signOut()
}

fixTempPassword()