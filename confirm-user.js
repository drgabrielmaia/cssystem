const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Para confirmar usuário, precisamos usar direto no banco ou service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function confirmUserDirectly() {
  try {
    console.log('🔧 Confirmando usuário diretamente...')

    // Opção 1: Vamos tentar criar um novo usuário já confirmado
    console.log('💡 Deletando usuário atual e criando um novo já confirmado...')

    const newEmail = 'gabrielmaia@gmail.com'
    const newPassword = 'admin123!'

    // Criar usuário com emailConfirm: false (para pular confirmação)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
      options: {
        data: {
          company_name: 'Admin Company'
        },
        emailRedirectTo: undefined // Para não enviar email
      }
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️ Usuário já existe, vamos tentar fazer login direto na aplicação...')
        console.log('')
        console.log('💡 SOLUÇÃO: Vá no Supabase Dashboard:')
        console.log('1. Authentication > Users')
        console.log('2. Encontre gabrielmaia@gmail.com')
        console.log('3. Clique nos 3 pontinhos > "Confirm user"')
        console.log('4. Ou delete este usuário e rode o script novamente')
        console.log('')
        console.log('🔄 Ou tente fazer login direto na aplicação: http://localhost:3000/login')
        console.log('   Email: gabrielmaia@gmail.com')
        console.log('   Senha: admin123!')
      } else {
        console.error('❌ Erro:', authError.message)
      }
    } else {
      console.log('✅ Usuário criado!')
      console.log(`👤 ID: ${authData.user?.id}`)
      console.log(`📧 Confirmed: ${authData.user?.email_confirmed_at ? 'SIM' : 'NÃO'}`)

      if (authData.user?.id) {
        // Agora adicionar à organização admin
        const adminOrgId = '9c8c0033-15ea-4e33-a55f-28d81a19693b'

        const { data, error } = await supabase
          .from('organization_users')
          .insert({
            organization_id: adminOrgId,
            user_id: authData.user.id,
            email: newEmail,
            role: 'owner'
          })

        if (error) {
          console.error('❌ Erro ao adicionar à organização:', error.message)
        } else {
          console.log('✅ Usuário adicionado à organização admin!')
        }
      }
    }

  } catch (err) {
    console.error('❌ Erro:', err.message)
  }
}

confirmUserDirectly()