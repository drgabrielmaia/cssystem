// Adicionar todos os mentorados no Supabase Auth
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'PRECISA_DA_SERVICE_KEY'

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey === 'PRECISA_DA_SERVICE_KEY') {
  console.log('❌ Precisa da SERVICE ROLE KEY do Supabase')
  console.log('🔍 Vá em: Settings > API > Project API keys > service_role key')
  console.log('🔑 Adicione: SUPABASE_SERVICE_ROLE_KEY=sua_service_key_aqui')
  process.exit(1)
}

// Cliente com permissões administrativas
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Cliente normal para buscar dados
const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function addAllMentoradosToAuth() {
  try {
    console.log('👥 ADICIONANDO MENTORADOS AO SUPABASE AUTH')
    console.log('=' .repeat(60))

    // Buscar todos os mentorados
    const { data: mentorados, error } = await supabase
      .from('mentorados')
      .select('id, nome_completo, email, password_hash, status_login')
      .eq('status_login', 'ativo')
      .order('nome_completo')

    if (error) {
      console.log('❌ Erro ao buscar mentorados:', error)
      return
    }

    console.log(`📊 Total de mentorados ativos: ${mentorados.length}`)
    console.log('')

    const senhaCorreta = 'mentoradoindica'
    let sucessos = 0
    let erros = 0

    for (const mentorado of mentorados) {
      try {
        console.log(`👤 Processando: ${mentorado.nome_completo} (${mentorado.email})`)

        // Verificar se o usuário já existe no auth
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const userExists = existingUsers.users.find(user => user.email === mentorado.email)

        if (userExists) {
          console.log('   ✅ Usuário já existe no Auth')
          sucessos++
          continue
        }

        // Criar usuário no auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: mentorado.email,
          password: senhaCorreta,
          email_confirm: true,
          user_metadata: {
            nome_completo: mentorado.nome_completo,
            mentorado_id: mentorado.id,
            role: 'mentorado'
          }
        })

        if (authError) {
          console.log(`   ❌ Erro ao criar usuário: ${authError.message}`)
          erros++
        } else {
          console.log(`   ✅ Usuário criado com sucesso (ID: ${authUser.user.id})`)
          sucessos++
        }

      } catch (error) {
        console.log(`   ❌ Erro geral: ${error.message}`)
        erros++
      }

      console.log('')
    }

    console.log('📋 RESUMO FINAL:')
    console.log(`   Total processados: ${mentorados.length}`)
    console.log(`   Sucessos: ${sucessos}`)
    console.log(`   Erros: ${erros}`)
    console.log('')

    if (sucessos > 0) {
      console.log('✅ Agora os mentorados podem fazer login com:')
      console.log('   Email: seu email cadastrado')
      console.log('   Senha: mentoradoindica')
    }

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

addAllMentoradosToAuth()