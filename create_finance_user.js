const { createClient } = require('@supabase/supabase-js')

// Criar usuário financeiro no Supabase Auth
async function createFinanceUser() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  try {
    console.log('🔐 Criando usuário financeiro no Supabase Auth...')

    // Criar usuário
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@medicosderesultado.com.br',
      password: 'Admin123!@#', // Senha temporária - TROCAR DEPOIS
      email_confirm: true,
      user_metadata: {
        role: 'finance_admin',
        nome: 'Admin Financeiro'
      }
    })

    if (authError) {
      console.error('❌ Erro ao criar usuário auth:', authError.message)

      // Se usuário já existe, só continuar
      if (authError.message.includes('User already registered')) {
        console.log('✅ Usuário já existe no auth, continuando...')
      } else {
        throw authError
      }
    } else {
      console.log('✅ Usuário auth criado:', authData.user.email)
    }

    // Verificar/criar registro na tabela usuarios_financeiro
    const { data: existingUser } = await supabase
      .from('usuarios_financeiro')
      .select('*')
      .eq('email', 'admin@medicosderesultado.com.br')
      .single()

    if (!existingUser) {
      const { error: dbError } = await supabase
        .from('usuarios_financeiro')
        .insert({
          nome: 'Admin Financeiro',
          email: 'admin@medicosderesultado.com.br',
          cargo: 'Administrador',
          permissoes: ['full_access', 'reports', 'analytics'],
          ativo: true
        })

      if (dbError) {
        console.error('❌ Erro ao criar registro DB:', dbError.message)
      } else {
        console.log('✅ Registro DB criado')
      }
    } else {
      console.log('✅ Registro DB já existe')
    }

    console.log('')
    console.log('🎉 SETUP FINANCEIRO COMPLETO!')
    console.log('📧 Email: admin@medicosderesultado.com.br')
    console.log('🔑 Senha: Admin123!@# (TROCAR DEPOIS!)')
    console.log('🌐 Acesse: /financeiro/login')

  } catch (error) {
    console.error('💥 Erro geral:', error.message)
  }
}

createFinanceUser()