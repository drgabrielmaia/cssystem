const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Precisa da service role key
)

async function resetAdminPassword() {
  try {
    console.log('🔐 Resetando senha do admin@admin.com...')

    // Resetar senha do usuário admin@admin.com
    const { data, error } = await supabase.auth.admin.updateUserById(
      'user_id_here', // Vamos buscar primeiro
      {
        password: 'admin123!'
      }
    )

    if (error) {
      console.error('❌ Erro ao resetar senha:', error.message)

      // Se não funcionar, vamos tentar buscar o usuário primeiro
      console.log('📋 Buscando usuários para encontrar admin@admin.com...')

      const { data: users, error: listError } = await supabase.auth.admin.listUsers()

      if (listError) {
        console.error('❌ Erro ao listar usuários:', listError.message)
        return
      }

      const adminUser = users.users.find(u => u.email === 'admin@admin.com')

      if (adminUser) {
        console.log('✅ Usuário admin encontrado:', adminUser.id)

        // Tentar resetar novamente com o ID correto
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          adminUser.id,
          {
            password: 'admin123!'
          }
        )

        if (updateError) {
          console.error('❌ Erro ao atualizar senha:', updateError.message)
        } else {
          console.log('✅ Senha do admin@admin.com resetada para: admin123!')
          console.log('🔑 Use estas credenciais para fazer login:')
          console.log('   Email: admin@admin.com')
          console.log('   Senha: admin123!')
        }
      } else {
        console.log('❌ Usuário admin@admin.com não encontrado')
        console.log('📋 Usuários existentes:')
        users.users.forEach(u => {
          console.log(`   - ${u.email} (${u.id})`)
        })
      }
    } else {
      console.log('✅ Senha resetada com sucesso!')
    }

  } catch (err) {
    console.error('❌ Erro:', err.message)
  }
}

resetAdminPassword()