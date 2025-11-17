// Corrigir emails com espaços e adicionar mentorados restantes
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.log('❌ Variáveis de ambiente necessárias não encontradas')
  process.exit(1)
}

// Cliente admin
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Cliente normal
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function fixEmailsAndAddRemaining() {
  try {
    console.log('🔧 CORRIGINDO EMAILS E ADICIONANDO MENTORADOS RESTANTES')
    console.log('=' .repeat(60))

    // Buscar mentorados com emails que têm espaços
    const { data: mentorados, error } = await supabase
      .from('mentorados')
      .select('id, nome_completo, email, status_login')
      .eq('status_login', 'ativo')
      .order('nome_completo')

    if (error) {
      console.log('❌ Erro ao buscar mentorados:', error)
      return
    }

    console.log(`📊 Total de mentorados: ${mentorados.length}`)
    console.log('')

    const emailsComProblemas = []
    const emailsCorrigidos = []

    // Identificar e corrigir emails com espaços
    for (const mentorado of mentorados) {
      const emailOriginal = mentorado.email
      const emailLimpo = emailOriginal.trim()

      if (emailOriginal !== emailLimpo) {
        emailsComProblemas.push({
          id: mentorado.id,
          nome: mentorado.nome_completo,
          emailOriginal,
          emailLimpo
        })
      }
    }

    console.log(`🔍 Encontrados ${emailsComProblemas.length} emails com espaços`)

    if (emailsComProblemas.length > 0) {
      console.log('')
      console.log('📧 Corrigindo emails...')

      for (const problema of emailsComProblemas) {
        try {
          // Atualizar email no banco
          const { error: updateError } = await supabase
            .from('mentorados')
            .update({ email: problema.emailLimpo })
            .eq('id', problema.id)

          if (updateError) {
            console.log(`❌ Erro ao corrigir email de ${problema.nome}: ${updateError.message}`)
          } else {
            console.log(`✅ Email corrigido para ${problema.nome}: "${problema.emailOriginal}" → "${problema.emailLimpo}"`)
            emailsCorrigidos.push(problema)
          }
        } catch (error) {
          console.log(`❌ Erro geral ao corrigir ${problema.nome}: ${error.message}`)
        }
      }
    }

    console.log('')
    console.log('👥 Tentando adicionar mentorados restantes ao Auth...')

    // Buscar usuários já existentes no Auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingEmails = new Set(existingUsers.users.map(user => user.email))

    const senhaCorreta = 'mentoradoindica'
    let sucessos = 0
    let erros = 0

    // Buscar mentorados atualizados
    const { data: mentoradosAtualizados } = await supabase
      .from('mentorados')
      .select('*')
      .eq('status_login', 'ativo')
      .order('nome_completo')

    for (const mentorado of mentoradosAtualizados) {
      // Pular se já existe no Auth
      if (existingEmails.has(mentorado.email)) {
        continue
      }

      try {
        console.log(`👤 Adicionando: ${mentorado.nome_completo} (${mentorado.email})`)

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
          console.log(`   ❌ Erro: ${authError.message}`)
          erros++
        } else {
          console.log(`   ✅ Usuário criado (ID: ${authUser.user.id})`)
          sucessos++
        }

      } catch (error) {
        console.log(`   ❌ Erro geral: ${error.message}`)
        erros++
      }
    }

    console.log('')
    console.log('📋 RESUMO FINAL:')
    console.log(`   Emails corrigidos: ${emailsCorrigidos.length}`)
    console.log(`   Novos usuários criados: ${sucessos}`)
    console.log(`   Erros: ${erros}`)
    console.log('')

    if (sucessos > 0 || emailsCorrigidos.length > 0) {
      console.log('✅ Sistema atualizado!')
    }

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

fixEmailsAndAddRemaining()