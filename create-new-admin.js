const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function createNewAdmin() {
  try {
    console.log('🔐 Criando novo usuário admin com email que você tem acesso...')

    // Substitua pelo seu email real que você tem acesso
    const newAdminEmail = 'gabrielmaia@gmail.com' // <<<< MUDE AQUI para seu email real
    const newPassword = 'admin123!'

    console.log(`📧 Tentando criar usuário: ${newAdminEmail}`)

    // Criar novo usuário admin
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newAdminEmail,
      password: newPassword,
      options: {
        data: {
          company_name: 'Admin Company'
        }
      }
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  Usuário já existe, tentando fazer login...')

        // Se já existe, tentar fazer login
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: newAdminEmail,
          password: newPassword
        })

        if (signInError) {
          console.log('❌ Login falhou, vamos resetar a senha...')
          console.log('💡 Vá no Supabase Dashboard > Authentication > Users')
          console.log(`💡 Encontre o usuário ${newAdminEmail}`)
          console.log('💡 Clique nos 3 pontinhos > Send reset password email')
          console.log('💡 Ou delete este usuário e rode o script novamente')
        } else {
          console.log('✅ Login realizado com sucesso!')
          console.log(`🔑 Use estas credenciais:`)
          console.log(`   Email: ${newAdminEmail}`)
          console.log(`   Senha: ${newPassword}`)
        }
      } else {
        console.error('❌ Erro ao criar usuário:', authError.message)
      }
    } else {
      console.log('✅ Novo usuário admin criado com sucesso!')
      console.log('📧 Verifique seu email para confirmar a conta (se necessário)')
      console.log(`🔑 Use estas credenciais:`)
      console.log(`   Email: ${newAdminEmail}`)
      console.log(`   Senha: ${newPassword}`)

      // Mostrar informações do usuário
      if (authData.user) {
        console.log(`👤 ID do usuário: ${authData.user.id}`)
        console.log('🏢 Uma organização será criada automaticamente')
      }
    }

    await supabase.auth.signOut()

  } catch (err) {
    console.error('❌ Erro:', err.message)
  }
}

createNewAdmin()